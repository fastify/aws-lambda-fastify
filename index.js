module.exports = (app, options) => {
  options = options || {}
  options.binaryMimeTypes = options.binaryMimeTypes || []
  options.serializeLambdaArguments = options.serializeLambdaArguments !== undefined ? options.serializeLambdaArguments : false
  options.decorateRequest = options.decorateRequest !== undefined ? options.decorateRequest : true
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
  return (event, context, callback) => {
    currentAwsArguments.event = event
    currentAwsArguments.context = context
    if (options.callbackWaitsForEmptyEventLoop !== undefined) {
      context.callbackWaitsForEmptyEventLoop = options.callbackWaitsForEmptyEventLoop
    }
    event.body = event.body || ''

    const method = event.httpMethod || (event.requestContext && event.requestContext.http ? event.requestContext.http.method : undefined)
    let url = event.path || event.rawPath || '/' // seen rawPath for HTTP-API
    // NOTE: if used directly via API Gateway domain and /stage
    if (event.requestContext && event.requestContext.stage && event.requestContext.resourcePath &&
        (url).indexOf(`/${event.requestContext.stage}/`) === 0 &&
        event.requestContext.resourcePath.indexOf(`/${event.requestContext.stage}/`) !== 0) {
      url = url.substring(event.requestContext.stage.length + 1)
    }
    const query = {}
    if (event.requestContext && event.requestContext.elb) {
      if (event.multiValueQueryStringParameters) {
        Object.keys(event.multiValueQueryStringParameters).forEach((q) => {
          query[decodeURIComponent(q)] = event.multiValueQueryStringParameters[q].map((val) => decodeURIComponent(val))
        })
      } else if (event.queryStringParameters) {
        Object.keys(event.queryStringParameters).forEach((q) => {
          query[decodeURIComponent(q)] = decodeURIComponent(event.queryStringParameters[q])
        })
      }
    } else {
      Object.assign(query, event.multiValueQueryStringParameters || event.queryStringParameters)
    }
    const headers = Object.assign({}, event.headers)
    if (event.multiValueHeaders) {
      Object.keys(event.multiValueHeaders).forEach((h) => {
        if (event.multiValueHeaders[h].length > 1) {
          headers[h] = event.multiValueHeaders[h]
        }
      })
    }
    const payload = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
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
      headers['cookie'] = event.cookies.join(';')
    }

    const prom = new Promise((resolve) => {
      app.inject({ method, url, query, payload, headers }, (err, res) => {
        currentAwsArguments = {}
        if (err) {
          console.error(err)
          return resolve({
            statusCode: 500,
            body: '',
            headers: {}
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

        const contentType = (res.headers['content-type'] || res.headers['Content-Type'] || '').split(';')[0]
        const isBase64Encoded = options.binaryMimeTypes.indexOf(contentType) > -1

        const ret = {
          statusCode: res.statusCode,
          body: isBase64Encoded ? res.rawPayload.toString('base64') : res.payload,
          headers: res.headers,
          isBase64Encoded
        }

        if (cookies && event.version === '2.0') ret.cookies = cookies
        if (multiValueHeaders && (!event.version || event.version === '1.0')) ret.multiValueHeaders = multiValueHeaders
        resolve(ret)
      })
    })
    if (!callback) return prom
    prom.then((ret) => callback(null, ret)).catch(callback)
    return prom
  }
}
