'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')
const fs = require('node:fs')
const { promisify } = require('node:util')

const readFileAsync = promisify(fs.readFile)
describe('Basic Tests', () => {
  it('GET', async () => {
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
      assert.equal(
        request.headers['x-my-header'],
        'wuuusaaa',
        'Header "X-My-Header" should match'
      )
      assert.equal(
        request.headers.cookie,
        'foo=bar',
        'Cookie header should match'
      )
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22version%22%3A%222.0%22%2C%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22cookies%22%3A%5B%22foo%3Dbar%22%5D%2C%22queryStringParameters%22%3A%22%22%7D',
        'x-apigateway-event header should match'
      )
      assert.deepEqual(
        request.awsLambda.event,
        evt,
        'Lambda event object should match'
      )
      assert.equal(
        request.headers['user-agent'],
        'lightMyRequest',
        'User-agent header should match'
      )
      assert.equal(
        request.headers.host,
        'localhost:80',
        'Host header should match'
      )

      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('Set-Cookie', 'qwerty=two')
      reply.send({ hello: 'world' })
    })

    const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })

    const ret = await proxy(evt)

    assert.equal(ret.statusCode, 200, 'Status code should be 200')
    assert.equal(ret.body, '{"hello":"world"}', 'Response body should match')
    assert.equal(ret.isBase64Encoded, false, 'isBase64Encoded should be false')
    assert.ok(ret.headers, 'Headers should be defined')
    assert.equal(
      ret.headers['content-type'],
      'application/json; charset=utf-8',
      'Content-Type should match'
    )
    assert.equal(
      ret.headers['content-length'],
      '17',
      'Content-Length should match'
    )
    assert.ok(ret.headers.date, 'Date header should be defined')
    assert.equal(
      ret.headers.connection,
      'keep-alive',
      'Connection header should match'
    )
    assert.deepEqual(
      ret.cookies,
      ['qwerty=one', 'qwerty=two'],
      'Cookies should match'
    )
  })

  it('GET with base64 encoding', async () => {
    const fileBuffer = await readFileAsync(__filename)
    const app = fastify()

    app.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.send(fileBuffer)
    })

    const proxy = awsLambdaFastify(app, {
      binaryMimeTypes: ['application/octet-stream'],
      serializeLambdaArguments: true
    })

    const ret = await proxy({
      httpMethod: 'GET',
      path: '/test',
      headers: {
        'X-My-Header': 'wuuusaaa',
        'Content-Type': 'application/json'
      }
    })

    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, fileBuffer.toString('base64'))
    assert.equal(ret.isBase64Encoded, true)
    assert.ok(ret.headers)
    assert.equal(ret.headers['content-type'], 'application/octet-stream')
    assert.ok(ret.headers['content-length'])
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.equal(ret.multiValueHeaders, undefined)
    assert.equal(ret.headers['set-cookie'], 'qwerty=one')
  })

  it('GET with base64 encoding disabled', async () => {
    const fileBuffer = await readFileAsync(__filename)
    const app = fastify()

    app.get('/test', async (_request, reply) => {
      reply.send(fileBuffer)
    })

    const proxy = awsLambdaFastify(app, {
      binaryMimeTypes: ['application/octet-stream'],
      serializeLambdaArequestrguments: true,
      disableBase64Encoding: true
    })

    const ret = await proxy({
      httpMethod: 'GET',
      path: '/test',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, fileBuffer.toString())
    assert.equal(ret.isBase64Encoded, undefined)
    assert.ok(ret.headers)
    assert.equal(ret.headers['content-type'], 'application/octet-stream')
    assert.ok(ret.headers['content-length'])
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.equal(ret.multiValueHeaders, undefined)
  })

  it('GET with content-encoding response', async () => {
    const app1 = fastify()
    const fileBuffer = await readFileAsync(__filename)
    app1.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('content-encoding', 'br')
      reply.send(fileBuffer)
    })

    const proxy1 = awsLambdaFastify(app1, {
      binaryMimeTypes: [],
      serializeLambdaArguments: true
    })
    const ret1 = await proxy1({
      httpMethod: 'GET',
      path: '/test',
      headers: {
        'X-My-Header': 'wuuusaaa',
        'Content-Type': 'application/json'
      }
    })

    assert.equal(ret1.statusCode, 200)
    assert.equal(ret1.body, fileBuffer.toString('base64'))
    assert.equal(ret1.isBase64Encoded, true)
    assert.ok(ret1.headers)
    assert.equal(ret1.headers['content-type'], 'application/octet-stream')
    assert.ok(ret1.headers['content-length'])
    assert.ok(ret1.headers.date)
    assert.equal(ret1.headers.connection, 'keep-alive')
    assert.equal(ret1.multiValueHeaders, undefined)
    assert.equal(ret1.headers['set-cookie'], 'qwerty=one')
    assert.equal(ret1.headers['content-encoding'], 'br')
  })

  it('GET with custom binary check response', async () => {
    const app2 = fastify()
    const fileBuffer = await readFileAsync(__filename)
    app2.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('X-Base64-Encoded', '1')
      reply.send(fileBuffer)
    })

    const proxy2 = awsLambdaFastify(app2, {
      binaryMimeTypes: [],
      serializeLambdaArguments: true,
      enforceBase64: (response) => response.headers['x-base64-encoded'] === '1'
    })
    const ret2 = await proxy2({
      httpMethod: 'GET',
      path: '/test',
      headers: {
        'X-My-Header': 'wuuusaaa',
        'Content-Type': 'application/json'
      }
    })

    assert.equal(ret2.statusCode, 200)
    assert.equal(ret2.body, fileBuffer.toString('base64'))
    assert.equal(ret2.isBase64Encoded, true)
    assert.ok(ret2.headers)
    assert.equal(ret2.headers['content-type'], 'application/octet-stream')
    assert.ok(ret2.headers['content-length'])
    assert.ok(ret2.headers.date)
    assert.equal(ret2.headers.connection, 'keep-alive')
    assert.equal(ret2.multiValueHeaders, undefined)
    assert.equal(ret2.headers['set-cookie'], 'qwerty=one')
    assert.equal(ret2.headers['x-base64-encoded'], '1')
  })

  it('GET with multi-value query params', async () => {
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

    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"foo":["qux","bar"]}')
  })

  it('GET with multi-value query params (queryStringParameters)', async () => {
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"foo":["qux","bar"]}')
  })

  it('GET with multi-value query params (queryStringParameters) with parseCommaSeparatedQueryParams disabled', async () => {
    const app = fastify()
    app.get('/test', async (request, reply) => {
      reply.send(request.query)
    })
    const proxy = awsLambdaFastify(app, {
      parseCommaSeparatedQueryParams: false
    })

    const ret = await proxy({
      version: '2.0',
      httpMethod: 'GET',
      path: '/test',
      queryStringParameters: {
        foo: 'qux,bar'
      }
    })
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"foo":"qux,bar"}')
  })

  it('GET Retains queryStringParameters in original awsLambda onRequest hook when parseCommaSeparatedQueryParams is enabled by default', async () => {
    const app = fastify()
    app.get('/test', async (request, reply) => {
      assert.deepStrictEqual(request.awsLambda.event.queryStringParameters, {
        foo: 'qux,bar'
      })
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
    assert.equal(ret.statusCode, 200)
  })

  it('GET Retains queryStringParameters in original awsLambda onRequest hook when parseCommaSeparatedQueryParams is disabled', async () => {
    const app = fastify()
    app.get('/test', async (request, reply) => {
      assert.deepStrictEqual(request.awsLambda.event.queryStringParameters, {
        foo: 'qux,bar'
      })
      reply.send(request.query)
    })
    const proxy = awsLambdaFastify(app, {
      parseCommaSeparatedQueryParams: false
    })

    const ret = await proxy({
      version: '2.0',
      httpMethod: 'GET',
      path: '/test',
      queryStringParameters: {
        foo: 'qux,bar'
      }
    })
    assert.equal(ret.statusCode, 200)
  })

  it('GET with double encoded query value', async () => {
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"foo":["foo%40bar","foo%3Fbar"]}')
  })

  it('POST', async () => {
    const app = fastify()
    app.post('/test', async (request, reply) => {
      assert.equal(request.headers['content-type'], 'application/json')
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.headers['content-length'], '14')
      assert.equal(request.body.greet, 'hi')
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"hello":"world2"}')
    assert.equal(ret.isBase64Encoded, false)
    assert.ok(ret.headers)
    assert.equal(
      ret.headers['content-type'],
      'application/json; charset=utf-8'
    )
    assert.equal(ret.headers['content-length'], '18')
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.deepStrictEqual(ret.multiValueHeaders['set-cookie'], [
      'qwerty=one',
      'qwerty=two'
    ])
    assert.equal(ret.headers['set-cookie'], undefined)
    assert.equal(ret.headers['x-custom-header'], 'ciao,salve')
  })

  it('POST with base64 encoding', async () => {
    const app = fastify()
    app.post('/test', async (request, reply) => {
      assert.equal(request.headers['content-type'], 'application/json')
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%2C%22x-multi%22%3A%22just-the-first%22%7D%2C%22multiValueHeaders%22%3A%7B%22x-multi%22%3A%5B%22just-the-first%22%2C%22and-the-second%22%5D%7D%2C%22isBase64Encoded%22%3Atrue%2C%22requestContext%22%3A%7B%22requestId%22%3A%22my-req-id%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.deepStrictEqual(
        request.headers['x-multi'],
        'just-the-first,and-the-second'
      )
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.headers['content-length'], '15')
      assert.equal(request.body.greet, 'hi')
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"hello":"world2"}')
    assert.equal(ret.isBase64Encoded, false)
    assert.ok(ret.headers)
    assert.equal(
      ret.headers['content-type'],
      'application/json; charset=utf-8'
    )
    assert.equal(ret.headers['content-length'], '18')
    assert.ok(ret.headers.date)
    assert.equal(ret.headers.connection, 'keep-alive')
    assert.deepStrictEqual(ret.multiValueHeaders['set-cookie'], [
      'qwerty=one',
      'qwerty=two'
    ])
  })

  it('subpath', async () => {
    const app = fastify()
    app.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Fdev%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22requestContext%22%3A%7B%22resourcePath%22%3A%22%2Ftest%22%2C%22stage%22%3A%22dev%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
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
    assert.deepStrictEqual(ret.multiValueHeaders['set-cookie'], [
      'qwerty=one',
      'qwerty=two'
    ])
  })

  it('subpath retain stage', async () => {
    const app = fastify()
    app.get('/dev/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(
        request.headers['x-apigateway-event'],
        '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Fdev%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22requestContext%22%3A%7B%22resourcePath%22%3A%22%2Ftest%22%2C%22stage%22%3A%22dev%22%7D%7D'
      )
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('Set-Cookie', 'qwerty=two')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app, {
      retainStage: true,
      serializeLambdaArguments: true
    })
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
    assert.equal(ret.statusCode, 200)
    assert.equal(ret.body, '{"hello":"world"}')
  })

  it('serializeLambdaArguments = false', async () => {
    const app = fastify()
    app.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers['x-apigateway-event'], undefined)
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
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
    assert.deepStrictEqual(ret.multiValueHeaders['set-cookie'], [
      'qwerty=one',
      'qwerty=two'
    ])
  })

  it('with existing onRequest hook', async () => {
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
      assert.equal(request.awsLambda.event, evt)
    })
    app.get('/test', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers.cookie, 'foo=bar')
      assert.equal(request.awsLambda.event, evt)
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      reply.header('Set-Cookie', 'qwerty=one')
      reply.header('Set-Cookie', 'qwerty=two')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app)
    const ret = await proxy(evt)
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

  it('proxy in pathParameters with http api', async () => {
    const app = fastify()
    const evt = {
      version: '2.0',
      routeKey: 'GET /prod/{proxy+}',
      rawPath: '/prod/projects',
      rawQueryString: 't=1698604776681',
      requestContext: {
        http: {
          method: 'GET',
          path: '/prod/projects'
        }
      },
      headers: {
        'X-My-Header': 'wuuusaaa'
      },
      queryStringParameters: {
        t: '1698604776681'
      },
      pathParameters: {
        proxy: 'projects'
      }
    }
    app.get('/prod/projects', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.query.t, '1698604776681')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app)
    const ret = await proxy(evt)
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
  })

  it('proxy in pathParameters with http api (pathParameterUsedAsPath = "proxy")', async () => {
    const app = fastify()
    const evt = {
      version: '2.0',
      routeKey: 'GET /prod/{proxy+}',
      rawPath: '/prod/projects',
      rawQueryString: 't=1698604776681',
      requestContext: {
        http: {
          method: 'GET',
          path: '/prod/projects'
        }
      },
      headers: {
        'X-My-Header': 'wuuusaaa'
      },
      queryStringParameters: {
        t: '1698604776681'
      },
      pathParameters: {
        proxy: 'projects'
      }
    }
    app.get('/projects', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.query.t, '1698604776681')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app, { pathParameterUsedAsPath: 'proxy' })
    const ret = await proxy(evt)
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
  })

  it('proxy in pathParameters with rest api', async () => {
    const app = fastify()
    const evt = {
      resource: '/area/project',
      path: '/area/projects',
      rawPath: '/prod/projects',
      httpMethod: 'GET',
      headers: {
        'X-My-Header': 'wuuusaaa'
      },
      multiValueHeaders: {
        'X-My-Header': ['wuuusaaa']
      },
      queryStringParameters: {
        t: '1698604776681'
      },
      multiValueQueryStringParameters: {
        t: ['1698604776681']
      },
      pathParameters: {
        proxy: 'projects'
      },
      stageVariables: null,
      requestContext: {
        resourcePath: '/area/{proxy+}',
        httpMethod: 'GET',
        path: '/dev/area/projects',
        stage: 'dev'
      }
    }
    app.get('/area/projects', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.query.t, '1698604776681')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app)
    const ret = await proxy(evt)
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
  })

  it('proxy in pathParameters with rest api (pathParameterUsedAsPath = "proxy")', async () => {
    const app = fastify()
    const evt = {
      resource: '/area/project',
      path: '/area/projects',
      rawPath: '/prod/projects',
      httpMethod: 'GET',
      headers: {
        'X-My-Header': 'wuuusaaa'
      },
      multiValueHeaders: {
        'X-My-Header': ['wuuusaaa']
      },
      queryStringParameters: {
        t: '1698604776681'
      },
      multiValueQueryStringParameters: {
        t: ['1698604776681']
      },
      pathParameters: {
        proxy: 'projects'
      },
      stageVariables: null,
      requestContext: {
        resourcePath: '/area/{proxy+}',
        httpMethod: 'GET',
        path: '/dev/area/projects',
        stage: 'dev'
      }
    }
    app.get('/projects', async (request, reply) => {
      assert.equal(request.headers['x-my-header'], 'wuuusaaa')
      assert.equal(request.headers['user-agent'], 'lightMyRequest')
      assert.equal(request.headers.host, 'localhost:80')
      assert.equal(request.query.t, '1698604776681')
      reply.send({ hello: 'world' })
    })
    const proxy = awsLambdaFastify(app, { pathParameterUsedAsPath: 'proxy' })
    const ret = await proxy(evt)
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
  })
})
