'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const { Readable } = require('node:stream')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')
const { accumulate } = require('./utils')

describe('Basic Stream Tests', () => {
  it('GET a normal response as stream', async () => {
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

    const proxy = awsLambdaFastify(app, { payloadAsStream: true })

    const { meta, stream } = await proxy(evt)

    assert.equal(meta.statusCode, 200, 'Status code should be 200')

    const data = await accumulate(stream)
    assert.equal(data.toString(), '{"hello":"world"}', 'Response body should match')

    assert.equal(meta.isBase64Encoded, undefined, 'isBase64Encoded should not be set')
    assert.ok(meta.headers, 'Headers should be defined')
    assert.equal(
      meta.headers['content-type'],
      'application/json; charset=utf-8',
      'Content-Type should match'
    )
    assert.equal(
      meta.headers['content-length'],
      '17',
      'Content-Length should match'
    )
    assert.ok(meta.headers.date, 'Date header should be defined')
    assert.equal(
      meta.headers.connection,
      'keep-alive',
      'Connection header should match'
    )
    assert.deepEqual(
      meta.cookies,
      ['qwerty=one', 'qwerty=two'],
      'Cookies should match'
    )
  })

  it('GET a streamed response as stream', async () => {
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
      reply.header('content-type', 'application/json; charset=utf-8')
      return reply.send(Readable.from(JSON.stringify({ hello: 'world' })))
    })

    const proxy = awsLambdaFastify(app, { payloadAsStream: true })

    const { meta, stream } = await proxy(evt)

    assert.equal(meta.statusCode, 200, 'Status code should be 200')

    const data = await accumulate(stream)
    assert.equal(data.toString(), '{"hello":"world"}', 'Response body should match')

    assert.equal(meta.isBase64Encoded, undefined, 'isBase64Encoded should not be set')
    assert.ok(meta.headers, 'Headers should be defined')
    assert.equal(
      meta.headers['content-type'],
      'application/json; charset=utf-8',
      'Content-Type should match'
    )
    assert.equal(
      meta.headers['content-length'],
      undefined,
      'Content-Length should not be present'
    )
    assert.ok(meta.headers.date, 'Date header should be defined')
    assert.equal(
      meta.headers.connection,
      'keep-alive',
      'Connection header should match'
    )
    assert.deepEqual(
      meta.cookies,
      ['qwerty=one', 'qwerty=two'],
      'Cookies should match'
    )
  })

  it('GET a streamed response as stream with disableBase64Encoding false', async () => {
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

    app.get('/test', async (_request, reply) => {
      reply.header('content-type', 'application/json; charset=utf-8')
      return reply.send(Readable.from(JSON.stringify({ hello: 'world' })))
    })

    const proxy = awsLambdaFastify(app, { payloadAsStream: true, disableBase64Encoding: false })

    const { meta } = await proxy(evt)

    assert.equal(meta.isBase64Encoded, false)
  })
})
