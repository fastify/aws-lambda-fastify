'use strict'

const { test } = require('tap')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')

test('GET', async (t) => new Promise((resolve, reject) => {
  t.plan(14)

  const app = fastify()
  const event = {
    version: '2.0',
    requestContext: { http: { method: 'GET' } },
    rawPath: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'transfer-encoding': 'chunked',
      'Transfer-Encoding': 'chunked',
      'Content-Type': 'application/json'
    },
    queryStringParameters: ''
  }
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal(request.awsLambda.event, event)
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.send({ hello: 'world' })
  })

  const proxy = awsLambdaFastify(app, { callbackWaitsForEmptyEventLoop: null })
  const context = {}
  proxy(event, context, function callback (err, ret) {
    if (err) return reject(err)

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

    resolve()
  })
}))

test('GET Broken', async (t) => new Promise((resolve, reject) => {
  t.plan(19)

  const event = {
    requestContext: { http: { method: 'GET' } },
    rawPath: '/test',
    headers: {
      'X-My-Header': 'wuuusaaa',
      'transfer-encoding': 'chunked',
      'Transfer-Encoding': 'chunked'
    },
    multiValueHeaders: {
      'x-custom-multi-bad': ['100'],
      'x-custom-multi-gut': ['100', '200']
    },
    queryStringParameters: ''
  }
  let callbackWaitsForEmptyEventLoop = false
  const context = {
    set callbackWaitsForEmptyEventLoop (v) { callbackWaitsForEmptyEventLoop = !!v },
    get callbackWaitsForEmptyEventLoop () { return callbackWaitsForEmptyEventLoop }
  }

  const app = fastify()
  app.get('/test', async (request, reply) => {
    t.equal(request.headers['x-my-header'], 'wuuusaaa')
    t.equal('x-custom-multi-bad' in request.headers, false)
    t.equal('x-custom-multi-gut' in request.headers, true)
    t.equal(request.awsLambda.event, event)
    t.equal(request.awsLambda.context, context)
    t.equal(request.headers['user-agent'], 'lightMyRequest')
    t.equal(request.headers.host, 'localhost:80')
    t.equal(request.headers['content-length'], '0')
    reply.header('Set-Cookie', 'qwerty=one')
    reply.header('Set-Cookie', 'qwerty=two')
    reply.header('x-Non-String', Date.now())
    reply.removeHeader('content-type')

    reply.send(undefined)
  })

  let callbackWaitsForEmptyEventCalls = 0
  const proxy = awsLambdaFastify(app, { get callbackWaitsForEmptyEventLoop () { return ++callbackWaitsForEmptyEventCalls } })

  proxy(event, context, function callback (err, ret) {
    if (err) return reject(err)

    t.equal(callbackWaitsForEmptyEventCalls, 2)
    t.equal(callbackWaitsForEmptyEventLoop, true)
    t.equal(ret.statusCode, 200)
    t.equal(ret.body, '')
    t.equal(ret.isBase64Encoded, false)
    t.ok(ret.headers)
    t.equal(ret.headers['content-type'], undefined)
    t.equal(ret.headers['content-length'], '0')
    t.ok(ret.headers.date)
    t.equal(ret.headers.connection, 'keep-alive')
    t.same(ret.multiValueHeaders['set-cookie'], ['qwerty=one', 'qwerty=two'])

    resolve()
  })
}))

test('GET stub inject', async (t) => {
  t.plan(3)

  const event = {
    requestContext: { },
    rawPath: '/test',
    queryStringParameters: ''
  }

  const app = fastify()
  app.inject = (_, cb) => { cb(new Error('Stub Injection')) }

  const proxy = awsLambdaFastify(app)

  const ret = await proxy(event)

  t.same(ret.headers, {})
  t.same(ret.statusCode, 500)
  t.same(ret.body, '')
})

test('GET stub inject', (t) => new Promise((resolve, reject) => {
  t.plan(4)

  const event = {
    requestContext: { },
    rawPath: '/test',
    queryStringParameters: ''
  }

  const app = fastify()
  app.inject = (_, cb) => { cb(new Error('Stub Injection')) }

  const proxy = awsLambdaFastify(app)

  const ret = proxy(event, null, function callback (err, ret) {
    if (err) return reject(err)

    t.same(ret.headers, {})
    t.same(ret.statusCode, 500)
    t.same(ret.body, '')
    resolve()
  })
  t.type(ret.then, 'function')
}))

test('GET with encoded query values', async (t) => {
  t.plan(2)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    reply.send(request.query)
  })
  const proxy = awsLambdaFastify(app)

  const ret = await proxy({
    requestContext: { elb: { targetGroupArn: 'xxx' } },
    httpMethod: 'GET',
    path: '/test',
    queryStringParameters: {
      'q%24': 'foo%3Fbar'
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"q$":"foo?bar"}')
})

test('GET with encoded multi-value query', async (t) => {
  t.plan(2)

  const app = fastify()
  app.get('/test', async (request, reply) => {
    reply.send(request.query)
  })
  const proxy = awsLambdaFastify(app)

  const ret = await proxy({
    requestContext: { elb: { targetGroupArn: 'xxx' } },
    httpMethod: 'GET',
    path: '/test',
    queryStringParameters: {
      'q%24': 'foo%3Fbar'
    },
    multiValueQueryStringParameters: {
      'q%24': ['foo%40bar', 'foo%3Fbar']
    }
  })
  t.equal(ret.statusCode, 200)
  t.equal(ret.body, '{"q$":["foo@bar","foo?bar"]}')
})
