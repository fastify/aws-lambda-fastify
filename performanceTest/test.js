'use strict'

const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()

const fastify = require('fastify')
const createEvent = () => ({
  httpMethod: 'GET',
  rawPath: '/test',
  path: '/test',
  headers: {},
  multiValueHeaders: {},
  requestContext: { requestId: 'requestId', http: { method: 'GET' }, identity: { sourceIp: '0.0.0.0' } },
  queryStringParameters: null,
  multiValueQueryStringParameters: null
})

// @fastify/aws-lambda stuff:
const awsLambdaFastify = require('../index')
const appAwsLambdaFastify = fastify()
appAwsLambdaFastify.get('/test', async () => ({ hello: 'world' }))
const proxy = awsLambdaFastify(appAwsLambdaFastify)

// aws-serverless-express stuff:
const awsServerlessExpress = require('aws-serverless-express')
let server
const serverFactory = (handler) => {
  server = awsServerlessExpress.createServer(handler)
  return server
}
const appAwsServerlessExpress = fastify({ serverFactory })
appAwsServerlessExpress.get('/test', async () => ({ hello: 'world' }))

// aws-serverless-fastify stuff:
const proxyAwsServerlessFastify = require('aws-serverless-fastify').proxy
const appAwsServerlessFastify = fastify()
appAwsServerlessFastify.get('/test', async () => ({ hello: 'world' }))

// serverless-http stuff:
const serverlessHttp = require('serverless-http')
const appServerlessHttp = fastify()
appServerlessHttp.get('/test', async () => ({ hello: 'world' }))
const serverlessHttpProxy = serverlessHttp(appServerlessHttp)

// @h4ad/serverless-adapter stuff:
const serverlessAdapter = require('@h4ad/serverless-adapter')
const { DefaultHandler } = require('@h4ad/serverless-adapter/lib/handlers/default')
const { PromiseResolver } = require('@h4ad/serverless-adapter/lib/resolvers/promise')
const { FastifyFramework } = require('@h4ad/serverless-adapter/lib/frameworks/fastify')
const { ApiGatewayV1Adapter } = require('@h4ad/serverless-adapter/lib/adapters/aws')
const appServerlessAdapter = fastify()
appServerlessAdapter.get('/test', async () => ({ hello: 'world' }))
const serverlessAdapterProxy = serverlessAdapter.ServerlessAdapter.new(appServerlessAdapter)
  .setFramework(new FastifyFramework())
  .setHandler(new DefaultHandler())
  .setResolver(new PromiseResolver())
  .addAdapter(new ApiGatewayV1Adapter())
  .build()

suite
  .add('aws-serverless-express', (deferred) => {
    appAwsServerlessExpress.ready(() => {
      awsServerlessExpress.proxy(server, createEvent(), {}, 'CALLBACK', () => deferred.resolve())
    })
  }, { defer: true })

  .add('aws-serverless-fastify', (deferred) => {
    proxyAwsServerlessFastify(appAwsServerlessFastify, createEvent(), {}).then(() => deferred.resolve())
  }, { defer: true })

  .add('serverless-http', (deferred) => {
    serverlessHttpProxy(createEvent(), {}).then(() => deferred.resolve())
  }, { defer: true })

  .add('@h4ad/serverless-adapter', (deferred) => {
    serverlessAdapterProxy(createEvent(), {}).then(() => deferred.resolve())
  }, { defer: true })

  .add('aws-lambda-fastify', (deferred) => {
    proxy(createEvent(), {}, () => deferred.resolve())
  }, { defer: true })

  .add('aws-lambda-fastify (serializeLambdaArguments : true)', (deferred) => {
    proxy(createEvent(), { serializeLambdaArguments: true }, () => deferred.resolve())
  }, { defer: true })

  .add('aws-lambda-fastify (decorateRequest : false)', (deferred) => {
    proxy(createEvent(), { decorateRequest: false }, () => deferred.resolve())
  }, { defer: true })

  .on('cycle', (event) => {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
    process.exit(0)
  })
  .run({ async: true })
