const should = require('should')
const fastify = require('fastify')
const fs = require('fs')
const awsLambdaFastify = require('../index')

describe('basic', () => {
  describe('GET', () => {
    it('should work as expected', async () => {
      const app = fastify()
      app.get('/test', async (request, reply) => {
        should(request.headers).have.property('x-my-header', 'wuuusaaa')
        should(request.headers).have.property('x-apigateway-event', '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%7D%2C%22queryStringParameters%22%3A%22%22%7D')
        should(request.headers).have.property('user-agent', 'lightMyRequest')
        should(request.headers).have.property('host', 'localhost:80')
        should(request.headers).have.property('content-length', '0')
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
      should(ret).have.property('statusCode', 200)
      should(ret).have.property('body', '{"hello":"world"}')
      should(ret).have.property('isBase64Encoded', false)
      should(ret).have.property('headers')
      should(ret.headers).have.property('content-type', 'application/json; charset=utf-8')
      should(ret.headers).have.property('content-length', '17')
      should(ret.headers).have.property('date')
      should(ret.headers).have.property('connection', 'keep-alive')
      should(ret.headers).have.property('Set-cookie', 'qwerty=one')
      should(ret.headers).have.property('sEt-cookie', 'qwerty=two')
    })
  })

  describe('GET with base64 encoding response', () => {
    let fileBuffer
    before((done) => {
      fs.readFile(__filename, (err, fb) => {
        fileBuffer = fb
        done(err)
      })
    })
    it('should work as expected', async () => {
      const app = fastify()
      app.get('/test', async (request, reply) => {
        should(request.headers).have.property('x-my-header', 'wuuusaaa')
        should(request.headers).have.property('x-apigateway-event', '%7B%22httpMethod%22%3A%22GET%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D')
        should(request.headers).have.property('user-agent', 'lightMyRequest')
        should(request.headers).have.property('host', 'localhost:80')
        should(request.headers).have.property('content-length', '0')
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
      should(ret).have.property('statusCode', 200)
      should(ret).have.property('body', fileBuffer.toString('base64'))
      should(ret).have.property('isBase64Encoded', true)
      should(ret).have.property('headers')
      should(ret.headers).have.property('content-type', 'application/octet-stream')
      should(ret.headers).have.property('content-length')
      should(ret.headers).have.property('date')
      should(ret.headers).have.property('connection', 'keep-alive')
      should(ret.headers).have.property('Set-cookie', 'qwerty=one')
      should(ret.headers).have.property('sEt-cookie', 'qwerty=two')
    })
  })

  describe('POST', () => {
    it('should work as expected', async () => {
      const app = fastify()
      app.post('/test', async (request, reply) => {
        should(request.headers).have.property('content-type', 'application/json')
        should(request.headers).have.property('x-my-header', 'wuuusaaa')
        should(request.headers).have.property('x-apigateway-event', '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%7D')
        should(request.headers).have.property('user-agent', 'lightMyRequest')
        should(request.headers).have.property('host', 'localhost:80')
        should(request.headers).have.property('content-length', 14)
        should(request.body).have.property('greet', 'hi')
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
        body: '{"greet":"hi"}'
      })
      should(ret).have.property('statusCode', 200)
      should(ret).have.property('body', '{"hello":"world2"}')
      should(ret).have.property('isBase64Encoded', false)
      should(ret).have.property('headers')
      should(ret.headers).have.property('content-type', 'application/json; charset=utf-8')
      should(ret.headers).have.property('content-length', '18')
      should(ret.headers).have.property('date')
      should(ret.headers).have.property('connection', 'keep-alive')
      should(ret.headers).have.property('Set-cookie', 'qwerty=one')
      should(ret.headers).have.property('sEt-cookie', 'qwerty=two')
    })
  })

  describe('POST with base64 encoding', () => {
    it('should work as expected', async () => {
      const app = fastify()
      app.post('/test', async (request, reply) => {
        should(request.headers).have.property('content-type', 'application/json')
        should(request.headers).have.property('x-my-header', 'wuuusaaa')
        should(request.headers).have.property('x-apigateway-event', '%7B%22httpMethod%22%3A%22POST%22%2C%22path%22%3A%22%2Ftest%22%2C%22headers%22%3A%7B%22X-My-Header%22%3A%22wuuusaaa%22%2C%22Content-Type%22%3A%22application%2Fjson%22%7D%2C%22isBase64Encoded%22%3Atrue%7D')
        should(request.headers).have.property('user-agent', 'lightMyRequest')
        should(request.headers).have.property('host', 'localhost:80')
        should(request.headers).have.property('content-length', 15)
        should(request.body).have.property('greet', 'hi')
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
        isBase64Encoded: true
      })
      should(ret).have.property('statusCode', 200)
      should(ret).have.property('body', '{"hello":"world2"}')
      should(ret).have.property('isBase64Encoded', false)
      should(ret).have.property('headers')
      should(ret.headers).have.property('content-type', 'application/json; charset=utf-8')
      should(ret.headers).have.property('content-length', '18')
      should(ret.headers).have.property('date')
      should(ret.headers).have.property('connection', 'keep-alive')
      should(ret.headers).have.property('Set-cookie', 'qwerty=one')
      should(ret.headers).have.property('sEt-cookie', 'qwerty=two')
    })
  })
})
