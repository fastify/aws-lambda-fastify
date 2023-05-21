'use strict'

const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()

const fastify = require('fastify')
const event = {
  httpMethod: 'GET',
  path: '/test',
  headers: {},
  requestContext: { requestId: 'requestId' },
  queryStringParameters: ''
}

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

// middy
const middy = require('@middy/core')
const middyHandler = middy().handler(() => {})

// middy w/ router
const middyHttpRouter = require('@middy/http-router')
const middyRouterHandler = middy().handler(
  middyHttpRouter([
    {
      method: 'GET',
      path: '/test',
      handler: () => {}
    }
  ])
)
suite
  .add(
    'aws-serverless-express',
    (deferred) => {
      appAwsServerlessExpress.ready(() => {
        awsServerlessExpress.proxy(server, event, {}, 'CALLBACK', () =>
          deferred.resolve()
        )
      })
    },
    { defer: true }
  )

  .add(
    'aws-serverless-fastify',
    (deferred) => {
      proxyAwsServerlessFastify(appAwsServerlessFastify, event, {}).then(() =>
        deferred.resolve()
      )
    },
    { defer: true }
  )

  .add(
    '@middy/core',
    async () => {
      await middyHandler(event)
    },
    { defer: false }
  )
  .add(
    '@middy/core + @middy/http-router',
    async () => {
      await middyRouterHandler(event)
    },
    { defer: false }
  )

  .add(
    'serverless-http',
    (deferred) => {
      serverlessHttpProxy(event, {}).then(() => deferred.resolve())
    },
    { defer: true }
  )

  .add(
    'aws-lambda-fastify',
    (deferred) => {
      proxy(event, {}, () => deferred.resolve())
    },
    { defer: true }
  )

  .add(
    'aws-lambda-fastify (serializeLambdaArguments : true)',
    (deferred) => {
      proxy(event, { serializeLambdaArguments: true }, () => deferred.resolve())
    },
    { defer: true }
  )

  .add(
    'aws-lambda-fastify (decorateRequest : false)',
    (deferred) => {
      proxy(event, { decorateRequest: false }, () => deferred.resolve())
    },
    { defer: true }
  )

  .on('cycle', (event) => {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
    process.exit(0) // eslint-disable-line no-process-exit
  })
  .run({ async: true })
