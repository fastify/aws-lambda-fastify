'use strict'

const isCompressedDefault = (res) => {
  const contentEncoding = res.headers['content-encoding'] || res.headers['Content-Encoding']
  return contentEncoding && contentEncoding !== 'identity'
}

const customBinaryCheck = (options, res) => {
  const enforceBase64 = typeof options.enforceBase64 === 'function' ? options.enforceBase64 : isCompressedDefault
  return enforceBase64(res) === true
}

module.exports = (app, options) => {
  options = options || {}
  options.binaryMimeTypes = options.binaryMimeTypes || []
  options.serializeLambdaArguments = options.serializeLambdaArguments !== undefined ? options.serializeLambdaArguments : false
  options.decorateRequest = options.decorateRequest !== undefined ? options.decorateRequest : true
  options.retainStage = options.retainStage !== undefined ? options.retainStage : false
  options.pathParameterUsedAsPath = options.pathParameterUsedAsPath !== undefined ? options.pathParameterUsedAsPath : false
  options.parseCommaSeparatedQueryParams = options.parseCommaSeparatedQueryParams !== undefined ? options.parseCommaSeparatedQueryParams : true
  options.payloadAsStream = options.payloadAsStream !== undefined ? options.payloadAsStream : false
  options.albMultiValueHeaders = options.albMultiValueHeaders !== undefined ? options.albMultiValueHeaders : false
  let currentAwsArguments = {}
  if (options.decorateRequest) {
    options.decorationPropertyName = options.decorationPropertyName || 'awsLambda'
    app.decorateRequest(options.decorationPropertyName, {
      getter: () => ({
        get event () {
          return currentAwsArguments.event
        },
        get context () {
          return currentAwsArguments.context
        }
      })
    })
  }
  return function (event, context) {
    const callback = arguments[2] // https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/issues/137
    currentAwsArguments.event = event
    currentAwsArguments.context = context
    if (options.callbackWaitsForEmptyEventLoop !== undefined) {
      context.callbackWaitsForEmptyEventLoop = options.callbackWaitsForEmptyEventLoop
    }
    // event.body = event.body || '' // do not magically default body to ''

    const method = event.httpMethod || (event.requestContext && event.requestContext.http ? event.requestContext.http.method : undefined)
    let url = (options.pathParameterUsedAsPath && event.pathParameters && event.pathParameters[options.pathParameterUsedAsPath] && `/${event.pathParameters[options.pathParameterUsedAsPath]}`) || event.path || event.rawPath || '/' // seen rawPath for HTTP-API
    // NOTE: if used directly via API Gateway domain and /stage
    if (!options.retainStage && event.requestContext && event.requestContext.stage &&
        event.requestContext.resourcePath && (url).indexOf(`/${event.requestContext.stage}/`) === 0 &&
        event.requestContext.resourcePath.indexOf(`/${event.requestContext.stage}/`) !== 0) {
      url = url.substring(event.requestContext.stage.length + 1)
    }
    const query = {}
    const parsedCommaSeparatedQuery = {}
    if (event.requestContext && event.requestContext.elb) {
      if (event.multiValueQueryStringParameters) {
        Object.keys(event.multiValueQueryStringParameters).forEach((q) => {
          query[decodeURIComponent(q)] = event.multiValueQueryStringParameters[q].map((val) => decodeURIComponent(val))
        })
      } else if (event.queryStringParameters) {
        Object.keys(event.queryStringParameters).forEach((q) => {
          query[decodeURIComponent(q)] = decodeURIComponent(event.queryStringParameters[q])
          if (options.parseCommaSeparatedQueryParams && event.version === '2.0' && typeof query[decodeURIComponent(q)] === 'string' && query[decodeURIComponent(q)].indexOf(',') > 0) {
            parsedCommaSeparatedQuery[decodeURIComponent(q)] = query[decodeURIComponent(q)].split(',')
          }
        })
      }
    } else {
      if (event.queryStringParameters && options.parseCommaSeparatedQueryParams && event.version === '2.0') {
        Object.keys(event.queryStringParameters).forEach((k) => {
          if (typeof event.queryStringParameters[k] === 'string' && event.queryStringParameters[k].indexOf(',') > 0) {
            parsedCommaSeparatedQuery[decodeURIComponent(k)] = event.queryStringParameters[k].split(',')
          }
        })
      }
      Object.assign(query, event.multiValueQueryStringParameters || event.queryStringParameters, parsedCommaSeparatedQuery)
    }
    const headers = Object.assign({}, event.headers)
    if (event.multiValueHeaders) {
      Object.keys(event.multiValueHeaders).forEach((h) => {
        if (event.multiValueHeaders[h].length > 1) {
          headers[h] = event.multiValueHeaders[h]
        } else if (event.multiValueHeaders[h].length === 1 && options.albMultiValueHeaders) {
          headers[h] = event.multiValueHeaders[h][0]
        }
      })
    }
    const payload = event.body !== null && event.body !== undefined ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8') : event.body
    // NOTE: API Gateway is not setting Content-Length header on requests even when they have a body
    if (event.body && !headers['Content-Length'] && !headers['content-length']) headers['content-length'] = Buffer.byteLength(payload)

    if (options.serializeLambdaArguments) {
      event.body = undefined // remove body from event only when setting request headers
      headers['x-apigateway-event'] = encodeURIComponent(JSON.stringify(event))
      if (context) headers['x-apigateway-context'] = encodeURIComponent(JSON.stringify(context))
    }

    if (event.requestContext && event.requestContext.requestId) {
      headers['x-request-id'] = headers['x-request-id'] || event.requestContext.requestId
    }

    // API gateway v2 cookies: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
    if (event.cookies && event.cookies.length) {
      headers.cookie = event.cookies.join(';')
    }

    let remoteAddress
    if (event.requestContext) {
      if (event.requestContext.http && event.requestContext.http.sourceIp) {
        remoteAddress = event.requestContext.http.sourceIp
      } else if (event.requestContext.identity && event.requestContext.identity.sourceIp) {
        remoteAddress = event.requestContext.identity.sourceIp
      }
    }

    const prom = new Promise((resolve) => {
      app.inject({ method, url, query, payload, headers, remoteAddress, payloadAsStream: options.payloadAsStream }, (err, res) => {
        currentAwsArguments = {}
        if (err) {
          console.error(err)
          if (!options.payloadAsStream) {
            return resolve({
              statusCode: 500,
              body: '',
              headers: {}
            })
          }
          const stream = res && res.stream()
          return resolve({
            meta: {
              statusCode: 500,
              headers: {}
            },
            // fix issue with Lambda where streaming repsonses always require a body to be present
            stream: stream && stream.readableLength > 0 ? stream : require('node:stream').Readable.from('')
          })
        }
        // chunked transfer not currently supported by API Gateway
        if (headers['transfer-encoding'] === 'chunked') delete headers['transfer-encoding']
        if (headers['Transfer-Encoding'] === 'chunked') delete headers['Transfer-Encoding']

        let multiValueHeaders
        let cookies
        Object.keys(res.headers).forEach((h) => {
          const isSetCookie = h.toLowerCase() === 'set-cookie'
          const isArraycookie = Array.isArray(res.headers[h])
          if (isArraycookie) {
            if (isSetCookie) {
              multiValueHeaders = multiValueHeaders || {}
              multiValueHeaders[h] = res.headers[h]
            } else res.headers[h] = res.headers[h].join(',')
          } else if (typeof res.headers[h] !== 'undefined' && typeof res.headers[h] !== 'string') {
            // NOTE: API Gateway (i.e. HttpApi) validates all headers to be a string
            res.headers[h] = res.headers[h].toString()
          }
          if (isSetCookie) {
            cookies = isArraycookie ? res.headers[h] : [res.headers[h]]
            if (event.version === '2.0' || isArraycookie) delete res.headers[h]
          }
        })

        const contentType = (res.headers['content-type'] || res.headers['Content-Type'] || '').split(';', 1)[0]
        const isBase64Encoded = options.binaryMimeTypes.indexOf(contentType) > -1 || customBinaryCheck(options, res)

        const ret = {
          statusCode: res.statusCode,
          headers: res.headers,
          isBase64Encoded
        }

        if (cookies && event.version === '2.0') ret.cookies = cookies
        if (multiValueHeaders && (!event.version || event.version === '1.0')) ret.multiValueHeaders = multiValueHeaders
        if (options.albMultiValueHeaders) {
          if (!ret.multiValueHeaders) ret.multiValueHeaders = {}
          Object.entries(ret.headers).forEach(([key, value]) => {
            ret.multiValueHeaders[key] = [value]
          })
        }

        if (!options.payloadAsStream) {
          ret.body = isBase64Encoded ? res.rawPayload.toString('base64') : res.payload
          return resolve(ret)
        }

        const stream = res.stream()
        resolve({
          meta: ret,
          // fix issue with Lambda where streaming repsonses always require a body to be present
          stream: stream && stream.readableLength > 0 ? stream : require('node:stream').Readable.from('')
        })
      })
    })
    if (!callback) return prom
    prom.then((ret) => callback(null, ret)).catch(callback)
    return prom
  }
}
module.exports.default = module.exports
module.exports.awsLambdaFastify = module.exports
