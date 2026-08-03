'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const awsLambdaFastify = require('../index')

// Regression tests for GHSA-m93c-jj3f-68ph: a client must not be able to forge the
// lambda event/context by sending the reserved headers itself.
const forgedEvent = encodeURIComponent(JSON.stringify({
  requestContext: { authorizer: { jwt: { claims: { sub: 'attacker', role: 'admin' } } } }
}))

const genuineEvent = (headers) => ({
  httpMethod: 'GET',
  path: '/admin',
  headers,
  requestContext: { authorizer: { jwt: { claims: { sub: 'victim', role: 'user' } } } }
})

describe('reserved headers cannot be spoofed', () => {
  it('forged x-apigateway-event does not override the real event', async () => {
    const app = fastify()
    app.get('/admin', async (request) => request.awsLambda.event.requestContext.authorizer.jwt.claims)

    const proxy = awsLambdaFastify(app)
    const ret = await proxy(genuineEvent({
      'x-apigateway-event': forgedEvent,
      'X-APIGATEWAY-CONTEXT': encodeURIComponent(JSON.stringify({ awsRequestId: 'forged' }))
    }))

    assert.equal(ret.statusCode, 200)
    assert.deepEqual(JSON.parse(ret.body), { sub: 'victim', role: 'user' })
  })

  it('reserved headers are stripped before reaching the app', async () => {
    const app = fastify()
    app.get('/admin', async (request) => ({
      event: request.headers['x-apigateway-event'] || null,
      context: request.headers['x-apigateway-context'] || null,
      token: request.headers['x-aws-lambda-fastify-request'] || null
    }))

    const proxy = awsLambdaFastify(app, { decorateRequest: false })
    const ret = await proxy(genuineEvent({
      'X-APIGATEWAY-EVENT': forgedEvent,
      'x-apigateway-context': encodeURIComponent(JSON.stringify({ awsRequestId: 'forged' })),
      'x-aws-lambda-fastify-request': 'forged-token'
    }))

    assert.equal(ret.statusCode, 200)
    assert.deepEqual(JSON.parse(ret.body), { event: null, context: null, token: null })
  })

  it('forged x-apigateway-event does not override the real event when serialized', async () => {
    const app = fastify()
    app.get('/admin', async (request) => ({
      decorated: request.awsLambda.event.requestContext.authorizer.jwt.claims,
      serialized: JSON.parse(decodeURIComponent(request.headers['x-apigateway-event'])).requestContext.authorizer.jwt.claims
    }))

    const proxy = awsLambdaFastify(app, { serializeLambdaArguments: true })
    const ret = await proxy(genuineEvent({ 'x-apigateway-event': forgedEvent }))

    assert.equal(ret.statusCode, 200)
    assert.deepEqual(JSON.parse(ret.body), {
      decorated: { sub: 'victim', role: 'user' },
      serialized: { sub: 'victim', role: 'user' }
    })
  })
})
