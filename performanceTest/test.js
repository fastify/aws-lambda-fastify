const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()

const fastify = require('fastify')
const event = {
  httpMethod: 'GET',
  path: '/test',
  headers: {},
  queryStringParameters: ''
}

// aws-lambda-fastify stuff:
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

suite
  .add('aws-lambda-fastify', (deferred) => {
    proxy(event, {}, () => deferred.resolve())
  }, { defer: true })

  .add('aws-serverless-express', (deferred) => {
    appAwsServerlessExpress.ready(() => {
      awsServerlessExpress.proxy(server, event, {}, 'CALLBACK', () => deferred.resolve())
    })
  }, { defer: true })

  .add('aws-serverless-fastify', (deferred) => {
    proxyAwsServerlessFastify(appAwsServerlessFastify, event, {}).then(() => deferred.resolve())
  }, { defer: true })

  .on('cycle', (event) => {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
    process.exit(0)
  })
  .run({ async: true })
