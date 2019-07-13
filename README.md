# Introduction

[![travis](https://img.shields.io/travis/adrai/aws-lambda-fastify.svg)](https://travis-ci.org/adrai/aws-lambda-fastify) [![npm](https://img.shields.io/npm/v/aws-lambda-fastify.svg)](https://npmjs.org/package/aws-lambda-fastify)

Inspired by the AWSLABS [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) library tailor made for the [Fastify](https://www.fastify.io/) web framework.

**No use of internal sockets, makes use of Fastify's [inject](https://www.fastify.io/docs/latest/Testing/#testing-with-http-injection) function.**

**Seems faster** *(as the name implies)* **than aws-serverless-express and aws-serverless-fastify ;-)**

## Installation

```bash
$ npm install aws-lambda-fastify
```

## Example

### lambda.js

```js
const awsLambdaFastify = require('aws-lambda-fastify')
const app = require('./app');

const proxy = awsLambdaFastify(app)
// or
// const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/octet-stream'] })

exports.handler = proxy;
// or
// exports.handler = (event, context, callback) => proxy(event, context, callback);
// or
// exports.handler = (event, context) => proxy(event, context);
// or
// exports.handler = async (event, context) => proxy(event, context);
```

### app.js

```js
const fastify = require('fastify');

const app = fastify();
app.get('/', (request, reply) => reply.send({ hello: 'world' }));

if (require.main !== module) {
  // called directly i.e. "node app"
  app.listen(3000, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
} else {
  // required as a module => executed on aws lambda
  module.exports = app;
}
```

When executed in your lambda function we don't need to listen to a specific port,
so we just export the `app` in this case.
The [`lambda.js`](https://github.com/adrai/aws-lambda-fastify#lambdajs) file will use this export.

When you execute your Fastify application like always,
i.e. `node app.js` *(the detection for this could be `require.main === module`)*,
you can normally listen to your port, so you can still run your Fastify function locally.

### Hint

The original lambda event and context are passed via headers and can be used like this:

```js
app.get('/', (request, reply) => {
  const event = JSON.parse(decodeURIComponent(request.headers['x-apigateway-event']))
  const context = JSON.parse(decodeURIComponent(request.headers['x-apigateway-context']))});
  // ...
})
```

## Some basic performance metrics

**aws-lambda-fastify** x **13,992 ops/sec** ±5.68% (78 runs sampled)

**aws-serverless-express** x **2,140 ops/sec** ±6.36% (70 runs sampled)

**aws-serverless-fastify** x **2,487 ops/sec** ±1.57% (77 runs sampled)

Fastest is **aws-lambda-fastify**

#### Considerations

 - For apps that may not see traffic for several minutes at a time, you could see [cold starts](https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/)
 - Stateless only
 - API Gateway has a timeout of 29 seconds, and Lambda has a maximum execution time of 15 minutes.
