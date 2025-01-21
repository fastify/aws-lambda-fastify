'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')

describe('ALB Tests', async () => {
  it('GET request', async () => {
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
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.awsLambda.event, event)
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('Set-Cookie', 'qwerty=two')
      reply.send({ hello: 'world' })
    })

    const proxy = awsLambdaFastify(app, {
      callbackWaitsForEmptyEventLoop: null
    })
    const context = {}

    const ret = await new Promise((resolve, reject) => {
      proxy(event, context, (err, result) => {
        if (err) reject(err)
        resolve(result)
      })
    })

    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"hello":"world"}')
    assert.equal(ret.isBase64Encoded, false)
    assert.ok(ret.headers)
    assert.equal(
      ret.headers['content-type'],
      'application/json; charset=utf-8'
    )
    assert.equal(ret.headers['content-length'], '17')
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.deepStrictEqual(ret.cookies, ['qwerty=one', 'qwerty=two'])
  })

  it('GET Broken', async () => {
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
      set callbackWaitsForEmptyEventLoop (v) {
        callbackWaitsForEmptyEventLoop = !!v
      },
      get callbackWaitsForEmptyEventLoop () {
        return callbackWaitsForEmptyEventLoop
      }
    }

    const app = fastify()
    app.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal('x-custom-multi-bad' in request.headers, false)
      assert.equal('x-custom-multi-gut' in request.headers, true)
      assert.equal(request.awsLambda.event, event)
      assert.equal(request.awsLambda.context, context)
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('Set-Cookie', 'qwerty=two')
      reply.header('x-Non-String', Date.now())
      reply.removeHeader('content-type')
      reply.send(undefined)
    })

    let callbackWaitsForEmptyEventCalls = 0
    const proxy = awsLambdaFastify(app, {
      get callbackWaitsForEmptyEventLoop () {
        return ++callbackWaitsForEmptyEventCalls
      }
    })

    const ret = await new Promise((resolve, reject) => {
      proxy(event, context, (err, result) => {
        if (err) reject(err)
        resolve(result)
      })
    })

    assert.equal(callbackWaitsForEmptyEventCalls, 2)
    assert.equal(callbackWaitsForEmptyEventLoop, true)
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '')
    assert.equal(ret.isBase64Encoded, false)
    assert.ok(ret.headers)
    assert.equal(ret.headers['content-type'], undefined)
    assert.equal(ret.headers['content-length'], '0')
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.deepStrictEqual(ret.multiValueHeaders['set-cookie'], [
      'qwerty=one',
      'qwerty=two'
    ])
  })

  it('GET stub inject', async () => {
    const event = {
      requestContext: {},
      rawPath: '/test',
      queryStringParameters: ''
    }

    const app = fastify()
    app.inject = (_, cb) => {
      cb(new Error('Stub Injection'))
    }

    const proxy = awsLambdaFastify(app)
    const ret = await proxy(event)

    assert.deepStrictEqual(ret.headers, {})
    assert.deepStrictEqual(ret.statusCode, 500)
    assert.deepStrictEqual(ret.body, '')
  })

  it('GET stub inject with callback', async () => {
    const event = {
      requestContext: {},
      rawPath: '/test',
      queryStringParameters: ''
    }

    const app = fastify()
    app.inject = (_, cb) => {
      cb(new Error('Stub Injection'))
    }

    const proxy = awsLambdaFastify(app)

    const ret = proxy(event, null, function callback (err, ret) {
      // eslint-disable-next-line no-undef
      if (err) return reject(err)

      assert.deepStrictEqual(ret.headers, {})
      assert.deepStrictEqual(ret.statusCode, 500)
      assert.deepStrictEqual(ret.body, '')
    })
    assert.equal(typeof ret.then, 'function')
  })

  it('GET with encoded query values', async () => {
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"q$":"foo?bar"}')
  })

  it('GET with encoded multi-value query', async () => {
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"q$":["foo@bar","foo?bar"]}')
  })
})
