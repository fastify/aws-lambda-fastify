module.exports = (app, options) => (event, context, callback) => {
  options = options || {}
  options.binaryMimeTypes = options.binaryMimeTypes || []
  if (options.callbackWaitsForEmptyEventLoop !== undefined) {
    context.callbackWaitsForEmptyEventLoop = options.callbackWaitsForEmptyEventLoop
  }
  event.body = event.body || ''

  const method = event.httpMethod
  const url = event.path
  const query = event.multiValueQueryStringParameters || event.queryStringParameters || {}
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

  delete event.body
  headers['x-apigateway-event'] = encodeURIComponent(JSON.stringify(event))
  if (context) headers['x-apigateway-context'] = encodeURIComponent(JSON.stringify(context))

  if (event.requestContext && event.requestContext.requestId) {
    headers['x-request-id'] = headers['x-request-id'] || event.requestContext.requestId
  }

  const prom = new Promise((resolve, reject) => {
    app.inject({ method, url, query, payload, headers }, (err, res) => {
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
      Object.keys(res.headers).forEach((h) => {
        if (Array.isArray(res.headers[h])) {
          if (h.toLowerCase() === 'set-cookie') {
            multiValueHeaders = multiValueHeaders || {}
            multiValueHeaders[h] = res.headers[h]
            delete res.headers[h]
          } else res.headers[h] = res.headers[h].join(',')
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
      if (multiValueHeaders) ret.multiValueHeaders = multiValueHeaders
      resolve(ret)
    })
  })
  if (!callback) return prom
  prom.then((ret) => callback(null, ret)).catch(callback)
}
