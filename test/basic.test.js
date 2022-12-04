'use strict'

const { promisify } = require('util')
const { test } = require('tap')
const fastify = require('fastify')
const fs = require('fs')
const awsLambdaFastify = require('../index')

test('GET', async (t) => {
  t.plan(16)

  const app = fastify()
  const evt = {
    version: '2.0',
    httpMethod: 'GET',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa'
    },
    cookies: ['foo=bar'],
    queryStringParameters: ''
  }
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['cookie'], 'foo=bar')
    t.equal(request.headers['x-apigateway-event'], '%7B%22version%22%3A%222.0%22%2C%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22cookies%22%3A%5B%22foo%3Dbar%22%5D%2C%22queryStringParameters%22%3A%22%22%7D')
    t.equal(request.awsLambda.event, evt)
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy(evt)
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '17')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  // t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
  t.same(ret.cookies, ['qwerty=one', 'qwerty=two'])
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
    // reply.header('Set-Cookie', 'qwerty=two')
    reply.send(fileBuffer)
  })
  const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/octet-stream'], serializeLambdaArguments: true })
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
  t.same(ret.multiValueHeaders, undefined)
  t.equal(ret.headers['set-cookie'], 'qwerty=one')
})

test('GET with content-encoding response', async (t) => {
  t.plan(16)

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
    reply.header('content-encoding', 'br')
    reply.send(fileBuffer)
  })
  const proxy = awsLambdaFastify(app, { binaryMimeTypes: [], serializeLambdaArguments: true })
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
  t.same(ret.multiValueHeaders, undefined)
  t.equal(ret.headers['set-cookie'], 'qwerty=one')
  t.equal(ret.headers['content-encoding'], 'br')
})

test('GET with custom binary check response', async (t) => {
  t.plan(16)

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
    reply.header('X-Base64-Encoded', '1')
    reply.send(fileBuffer)
  })
  const proxy = awsLambdaFastify(app, {
    binaryMimeTypes: [],
    serializeLambdaArguments: true,
    enforceBase64: (response) => response.headers['x-base64-encoded'] === '1'
  })
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
  t.same(ret.multiValueHeaders, undefined)
  t.equal(ret.headers['set-cookie'], 'qwerty=one')
  t.equal(ret.headers['x-base64-encoded'], '1')
})

test('GET with multi-value query params', async (t) => {
  t.plan(2)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    reply.send(request.query)
  })
  const proxy = awsLambdaFastify(app)

  const ret = await proxy({
    httpMethod: 'GET',
    path: '/test',
    queryStringParameters: {
      foo: 'bar'
    },
    multiValueQueryStringParameters: {
      foo: ['qux', 'bar']
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"foo":["qux","bar"]}')
})

test('GET with multi-value query params (queryStringParameters)', async (t) => {
  t.plan(2)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    reply.send(request.query)
  })
  const proxy = awsLambdaFastify(app)

  const ret = await proxy({
    version: '2.0',
    httpMethod: 'GET',
    path: '/test',
    queryStringParameters: {
      foo: 'qux,bar'
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"foo":["qux","bar"]}')
})

test('GET with double encoded query value', async (t) => {
  t.plan(2)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    reply.send(request.query)
  })
  const proxy = awsLambdaFastify(app)

  const ret = await proxy({
    httpMethod: 'GET',
    path: '/test',
    queryStringParameters: {
      foo: 'foo%3Fbar'
    },
    multiValueQueryStringParameters: {
      foo: ['foo%40bar', 'foo%3Fbar']
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"foo":["foo%40bar","foo%3Fbar"]}')
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
    t.equal(request.headers['content-length'], '14')
    t.equal(request.body.greet, 'hi')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.header('X-Custom-Header', ['ciao', 'salve'])
    reply.send({ hello: 'world2' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
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
  t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
  t.equal(ret.headers['set-cookie'], undefined)
  t.equal(ret.headers['x-custom-header'], 'ciao,salve')
})

test('POST with base64 encoding', async (t) => {
  t.plan(17)

  const app = fastify()
  app.post('/test', async (request, reply) => {
    t.equal(request.headers['content-type'], 'application/json')
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%2C%22x-multi%22%3A%22just-the-first%22%7D%2C%22multiValueHeaders%22%3A%7B%22x-multi%22%3A%5B%22just-the-first%22%2C%22and-the-second%22%5D%7D%2C%22isBase64Encoded%22%3Atrue%2C%22requestContext%22%3A%7B%22requestId%22%3A%22my-req-id%22%7D%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.same(request.headers['x-multi'], 'just-the-first,and-the-second')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '15')
    t.equal(request.body.greet, 'hi')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world2' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy({
    httpMethod: 'POST',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'Content-Type': 'application/json',
      'x-multi': 'just-the-first'
    },
    multiValueHeaders: {
      'x-multi': ['just-the-first', 'and-the-second']
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
  t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
})

test('subpath', async (t) => {
  t.plan(14)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Fdev%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22requestContext%22%3A%7B%22resourcePath%22%3A%22%2Ftest%22%2C%22stage%22%3A%22dev%22%7D%7D')
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
  const ret = await proxy({
    httpMethod: 'GET',
    path: '/dev/test',
    headers: {
      'X-My-Header': 'wuuusaaa'
    },
    requestContext: {
      resourcePath: '/test',
      stage: 'dev'
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '17')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
})

test('serializeLambdaArguments = false', async (t) => {
  t.plan(14)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['x-apigateway-event'], undefined)
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
    path: '/dev/test',
    headers: {
      'X-My-Header': 'wuuusaaa'
    },
    requestContext: {
      resourcePath: '/test',
      stage: 'dev'
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '17')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
})

test('with existing onRequest hook', async (t) => {
  t.plan(16)

  const app = fastify()
  const evt = {
    version: '2.0',
    httpMethod: 'GET',
    path: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa'
    },
    cookies: ['foo=bar'],
    queryStringParameters: ''
  }
  app.addHook('onRequest', async (request) => {
    t.equal(request.awsLambda.event, evt)
  })
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.headers['cookie'], 'foo=bar')
    t.equal(request.awsLambda.event, evt)
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world' })
  })
  const proxy = awsLambdaFastify(app)
  const ret = await proxy(evt)
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"hello":"world"}')
  t.equal(ret.isBase64Encoded, false)
  t.ok(ret.headers)
  t.equal(ret.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(ret.headers['content-length'], '17')
  t.ok(ret.headers.date)
  t.equal(ret.headers.connection, 'keep-alive')
  // t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])
  t.same(ret.cookies, ['qwerty=one', 'qwerty=two'])
})
