const { test } = require('tap')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')
const multipart = require('@fastify/multipart')

test('should parse the multipart form-data successfully given raw multipart form data', async (t) => {
  t.plan(8)

  const app = fastify()
  const evt = {
    version: '2.0',
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryDP6Z1qHQSzB6Pf8c'
    },
    body: ['------WebKitFormBoundaryDP6Z1qHQSzB6Pf8c',
      'Content-Disposition: form-data; name="uploadFile1"; filename="test.txt"',
      'Content-Type: text/plain',
      '',
      'Hello World!',
      '------WebKitFormBoundaryDP6Z1qHQSzB6Pf8c--'
    ].join('\r\n'),
    isBase64Encoded: false
  }

  app.register(multipart, { attachFieldsToBody: true })
  app.post('/test', async (request, reply) => {
    t.equal(request.body.uploadFile1.fieldname, 'uploadFile1')
    t.equal(request.body.uploadFile1.filename, 'test.txt')
    t.equal(request.body.uploadFile1.encoding, '7bit')
    t.equal(request.body.uploadFile1.mimetype, 'text/plain')
    t.equal(Buffer.from(request.body.uploadFile1._buf).toString('utf-8'), 'Hello World!')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy(evt)
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
})

test('should parse the multipart form-data successfully given base64 encoded form data', async (t) => {
  t.plan(8)

  const app = fastify()
  const evt = {
    version: '2.0',
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryDP6Z1qHQSzB6Pf8c'
    },
    body: `LS0tLS0tV2ViS2l0Rm9ybUJvdW5kYXJ5RFA2WjFxSFFTekI2UGY4Yw0KQ29udGVudC1EaXNwb3NpdGlvbjogZm9ybS1kYXRhOyBuYW1lPSJ1cGxvYWRGaWxlMSI7IGZpb
      GVuYW1lPSJ0ZXN0LnR4dCINCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbg0KDQpIZWxsbyBXb3JsZCENCi0tLS0tLVdlYktpdEZvcm1Cb3VuZGFyeURQNloxcUhRU3pCNl
      BmOGMNCkNvbnRlbnQtRGlzcG9zaXRpb246IGZvcm0tZGF0YTsgbmFtZT0idXBsb2FkRmlsZTIiOyBmaWxlbmFtZT0iIg0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9
      vY3RldC1zdHJlYW0NCg0KDQotLS0tLS1XZWJLaXRGb3JtQm91bmRhcnlEUDZaMXFIUVN6QjZQZjhjLS0NCg==`,
    isBase64Encoded: true
  }

  app.register(multipart, { attachFieldsToBody: true })
  app.post('/test', async (request, reply) => {
    t.equal(request.body.uploadFile1.fieldname, 'uploadFile1')
    t.equal(request.body.uploadFile1.filename, 'test.txt')
    t.equal(request.body.uploadFile1.encoding, '7bit')
    t.equal(request.body.uploadFile1.mimetype, 'text/plain')
    t.equal(Buffer.from(request.body.uploadFile1._buf).toString('utf-8'), 'Hello World!')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy(evt)
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
})

test('should parse the multipart form-data successfully given utf8 encoded form data', async (t) => {
  t.plan(7)

  const app = fastify()
  const evt = {
    version: '2.0',
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'content-type': 'multipart/form-data; boundary=xYzZY'
    },
    body: '--xYzZY\r\nContent-Disposition: form-data; name="html"\r\n\r\n<p>Hello World</p>\r\n--xYzZY--\r\n',
    isBase64Encoded: false
  }

  app.register(multipart, { attachFieldsToBody: true })
  app.post('/test', async (request, reply) => {
    console.log(request.body)
    t.equal(request.body.html.fieldname, 'html')
    t.equal(request.body.html.encoding, '7bit')
    t.equal(request.body.html.mimetype, 'text/plain')
    t.equal(request.body.html.value, '<p>Hello World</p>')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy(evt)
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
})
