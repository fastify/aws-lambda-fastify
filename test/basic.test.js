const { promisify } = require('util')
const { test } = require('tap')
const fastify = require('fastify')
const fs = require('fs')
const awsLambdaFastify = require('../index')

test('GET', async (t) => {
  t.plan(15)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22queryStringParameters%22%3A%22%22%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app)
  const ret = await proxy({
    httpMethod: 'GET',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa'
    },
    queryStringParameters: ''
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '17')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.equal(ret.headers['Set-cookie'], 'qwerty=one')
  t.equal(ret.headers['sEt-cookie'], 'qwerty=two')
})

test('GET with base64 encoding response', async (t) => {
  t.plan(15)

  const readFileAsync = promisify(fs.readFile)
  const fileBuffer = await readFileAsync(__filename)
  const app = fastify()
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send(fileBuffer)
  })
  const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/octet-stream'] })
  const ret = await proxy({
    httpMethod: 'GET',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'Content-Type': 'application/json'
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, fileBuffer.toString('base64'))
  t.equal(ret.isBase64Encoded, true)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/octet-stream')
  t.ok(ret.headers['content-length'])
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.equal(ret.headers['Set-cookie'], 'qwerty=one')
  t.equal(ret.headers['sEt-cookie'], 'qwerty=two')
})

test('POST', async (t) => {
  t.plan(18)

  const app = fastify()
  app.post('/test', async (request, reply) => {
    t.equal(request.headers['content-type'], 'application/json')
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], 14)
    t.equal(request.body.greet, 'hi')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.header('X-Custom-Header', ['ciao', 'salve'])
    reply.send({ hello: 'world2' })
  })
  const proxy = awsLambdaFastify(app)
  const ret = await proxy({
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'Content-Type': 'application/json'
    },
    body: '{"greet":"hi"}'
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world2"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '18')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.equal(ret.headers['Set-cookie'], 'qwerty=one')
  t.equal(ret.headers['sEt-cookie'], 'qwerty=two')
  t.equal(ret.headers['x-custom-header'], 'ciao,salve')
})

test('POST with base64 encoding', async (t) => {
  t.plan(17)

  const app = fastify()
  app.post('/test', async (request, reply) => {
    t.equal(request.headers['content-type'], 'application/json')
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%2C%22isBase64Encoded%22%3Atrue%2C%22requestContext%22%3A%7B%22requestId%22%3A%22my-req-id%22%7D%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], 15)
    t.equal(request.body.greet, 'hi')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world2' })
  })
  const proxy = awsLambdaFastify(app)
  const ret = await proxy({
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'Content-Type': 'application/json'
    },
    body: 'eyJncmVldCI6ICJoaSJ9',
    isBase64Encoded: true,
    requestContext: { requestId: 'my-req-id' }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world2"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '18')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.equal(ret.headers['Set-cookie'], 'qwerty=one')
  t.equal(ret.headers['sEt-cookie'], 'qwerty=two')
})
