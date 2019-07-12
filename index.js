module.exports = (app, options) => (event, context, callback) => {
  options = options || {}
  options.binaryMimeTypes = options.binaryMimeTypes || []
  event.body = event.body || ''

  const method = event.httpMethod
  const url = event.path
  const query = event.queryStringParameters || {}
  const headers = Object.assign({}, event.headers)
  const payload = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
  // NOTE: API Gateway is not setting Content-Length header on requests even when they have a body
  if (event.body && !headers['Content-Length'] && !headers['content-length']) headers['content-length'] = Buffer.byteLength(payload)

  delete event.body
  headers['x-apigateway-event'] = encodeURIComponent(JSON.stringify(event))
  if (context) headers['x-apigateway-context'] = encodeURIComponent(JSON.stringify(context))

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

      // HACK: modifies header casing to get around API Gateway's limitation of not allowing multiple
      // headers with the same name, as discussed on the AWS Forum https://forums.aws.amazon.com/message.jspa?messageID=725953#725953
      Object.keys(res.headers).forEach((h) => {
        if (Array.isArray(res.headers[h])) {
          if (h.toLowerCase() === 'set-cookie') {
            res.headers[h].forEach((value, i) => { res.headers[require('binary-case')(h, i + 1)] = value })
            delete res.headers[h]
          } else res.headers[h] = res.headers[h].join(',')
        }
      })

      const contentType = (res.headers['content-type'] || res.headers['Content-Type'] || '').split(';')[0]
      const isBase64Encoded = options.binaryMimeTypes.indexOf(contentType) > -1

      resolve({
        statusCode: res.statusCode,
        body: isBase64Encoded ? res.rawPayload.toString('base64') : res.payload,
        headers: res.headers,
        isBase64Encoded
      })
    })
  })
  if (!callback) return prom
  prom.then((ret) => callback(null, ret)).catch(callback)
}
