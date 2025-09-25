# Introduction

[![CI](https://github.com/fastify/aws-lambda-fastify/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/aws-lambda-fastify/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/aws-lambda.svg?style=flat)](https://www.npmjs.com/package/@fastify/aws-lambda)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

Inspired by the AWSLABS [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) library tailor made for the [Fastify](https://fastify.dev/) web framework.

**No use of internal sockets, makes use of Fastify's [inject](https://fastify.dev/docs/latest/Guides/Testing/#testing-with-http-injection) function.**

**Seems [faster](https://github.com/fastify/aws-lambda-fastify#%EF%B8%8Fsome-basic-performance-metrics)** *(as the name implies)* **than [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) and [aws-serverless-fastify](https://github.com/benMain/aws-serverless-fastify) 😉**

## 👨🏻‍💻Installation

```bash
$ npm i @fastify/aws-lambda
```

## Options

**@fastify/aws-lambda** can take options by passing them with : `awsLambdaFastify(app, options)`

| property                       | description                                                                                                                                | default value                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| binaryMimeTypes                | Array of binary MimeTypes to handle                                                                                                        | `[]`                               |
| enforceBase64                  | Function that receives the response and returns a boolean indicating if the response content is binary or not and should be base64-encoded | `undefined`                        |
| serializeLambdaArguments       | Activate the serialization of lambda Event and Context in http header `x-apigateway-event` `x-apigateway-context`                          | `false` *(was `true` for <v2.0.0)* |
| decorateRequest                | Decorates the fastify request with the lambda Event and Context `request.awsLambda.event` `request.awsLambda.context`                      | `true`                             |
| decorationPropertyName         | The default property name for request decoration                                                                                           | `awsLambda`                        |
| callbackWaitsForEmptyEventLoop | See: [Official Documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html#nodejs-prog-model-context-properties)       | `undefined`                        |
| retainStage                    | Retain the stage part of the API Gateway URL                                                                                               | `false`                            |
| pathParameterUsedAsPath        | Use a defined pathParameter as path (i.e. `'proxy'`)                                                                                       | `false`                            |
| parseCommaSeparatedQueryParams | Parse querystring with commas into an array of values. Affects the behavior of the querystring parser with commas while using [Payload Format Version 2.0](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format)                                                                                                                       | `true`                             |
| payloadAsStream                |  If set to true the response is a stream and can be used with `awslambda.streamifyResponse`                                                | `false`                            |
| albMultiValueHeaders           |  Set to true if using ALB with multi value headers attribute                                                                               | `false`                            |
## 📖Example

### lambda.js

```js
const awsLambdaFastify = require('@fastify/aws-lambda')
const app = require('./app')

const proxy = awsLambdaFastify(app)
// or
// const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/octet-stream'], serializeLambdaArguments: false /* default is true */ })

exports.handler = proxy
// or
// exports.handler = (event, context, callback) => proxy(event, context, callback)
// or
// exports.handler = (event, context) => proxy(event, context)
// or
// exports.handler = async (event, context) => proxy(event, context)
```

### app.js

```js
const fastify = require('fastify')

const app = fastify()
app.get('/', (request, reply) => reply.send({ hello: 'world' }))

if (require.main === module) {
  // called directly i.e. "node app"
  app.listen({ port: 3000 }, (err) => {
    if (err) console.error(err)
    console.log('server listening on 3000')
  })
} else {
  // required as a module => executed on aws lambda
  module.exports = app
}
```

When executed in your lambda function we don't need to listen to a specific port,
so we just export the `app` in this case.
The [`lambda.js`](https://github.com/fastify/aws-lambda-fastify#lambdajs) file will use this export.

When you execute your Fastify application like always,
i.e. `node app.js` *(the detection for this could be `require.main === module`)*,
you can normally listen to your port, so you can still run your Fastify function locally.

## Usage with NestJS

### main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import awsLambdaFastify, { PromiseHandler } from '@fastify/aws-lambda';
import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { Context, APIGatewayProxyEvent } from 'aws-lambda';
import { Logger } from '@nestjs/common';

interface NestApp {
  app: NestFastifyApplication;
  instance: FastifyInstance;
}

let cachedNestApp;

async function bootstrapServer(): Promise {

  const serverOptions: FastifyServerOptions = {
      logger: (process.env.LOGGER || '0') == '1',
  };
  const instance: FastifyInstance = fastify(serverOptions);
  const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(instance),
      {
          logger: !process.env.AWS_EXECUTION_ENV ? new Logger() : console,
      },
  );

  const CORS_OPTIONS = {
      origin: '*',
      allowedHeaders: '*',
      exposedHeaders: '*',
      credentials: false,
      methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE'],
  };

  app.register(require('fastify-cors'), CORS_OPTIONS);

  app.setGlobalPrefix(process.env.API_PREFIX);

  await app.init();

  return {
      app,
      instance
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<PromiseHandler> => {
    if (!cachedNestApp) {
      const nestApp = await bootstrap();
      cachedNestApp = awsLambdaFastify(nestApp.instance, {
        decorateRequest: true,
      });
    }

  return cachedNestApp(event, context);
};
```

Notice we are caching the initialized app. In a lambda environment, the handler will be called on each new request. Anything outside the handler may be cached between calls, which lasts as long as AWS has kept the same lambda execution environment up for your function. By storing the initialized app as a variable, we can minimize the cold-start time of our app since it will be constructed once per execution environment spin up.

## Usage with NestJS/GraphQL
In addition to the above, when using NestJS with GraphQL in a lambda environment, you will need to copy your `schema.gql` into your `dist` folder rather than relying on the `autoSchemaFile` option since this tries to write to `/src` directory inside a running lambda function and you are only allowed to write to `/tmp` directory. You can modify your build script in your `package.json` to acheive this:

```js
    "build": "nest build && yarn copyschema",
    "copyschema": "cp src/schema.gql dist/schema.gql"
```

You will also need to modify your `app.module.ts` file:

### app.module.ts
```typescript
@Module({
  imports: [
    GraphQLModule.forRootAsync<MercuriusDriverConfig>({
      imports: [XYZModule],
      useFactory: () => {
        const schemaModuleOptions: Partial<GqlModuleOptions> = {};

        if (process.env.NODE_ENV !== 'production' || process.env.IS_OFFLINE) {
          schemaModuleOptions.autoSchemaFile = join(
            process.cwd(),
            'src/schema.gql',
          );
        } else {
          schemaModuleOptions.typePaths = ['dist/*.gql'];
        }

        return {
          graphiql: true,
          context: (req: any) => ({
            XYZLoader: createXYZLoader(XYZService),
            headers: req.headers,
          }),
          ...schemaModuleOptions,
        };
      },
      driver: MercuriusDriver,
    }),
    XYZModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
```

### 📣Hint

#### Lambda arguments

The original lambda event and context are passed via Fastify request and can be used like this:

```js
app.get('/', (request, reply) => {
  const event = request.awsLambda.event
  const context = request.awsLambda.context
  // ...
})
```
*If you do not like it, you can disable this by setting the `decorateRequest` option to `false`.*


Alternatively the original lambda event and context are passed via headers and can be used like this, if setting the `serializeLambdaArguments` option to `true`:

```js
app.get('/', (request, reply) => {
  const event = JSON.parse(decodeURIComponent(request.headers['x-apigateway-event']))
  const context = JSON.parse(decodeURIComponent(request.headers['x-apigateway-context']))
  // ...
})
```

#### Lower cold start latency

Since [AWS Lambda now enables the use of ECMAScript (ES) modules](https://aws.amazon.com/blogs/compute/using-node-js-es-modules-and-top-level-await-in-aws-lambda/) in Node.js 14 runtimes, you could lower the cold start latency when used with [Provisioned Concurrency](https://aws.amazon.com/blogs/compute/new-for-aws-lambda-predictable-start-up-times-with-provisioned-concurrency/) thanks to the top-level await functionality.

We can use this by calling the [`fastify.ready()`](https://fastify.dev/docs/latest/Reference/Server/#ready) function outside of the Lambda handler function, like this:

```js
import awsLambdaFastify from '@fastify/aws-lambda'
import app from './app.js'
export const handler = awsLambdaFastify(app)
await app.ready() // needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
```

*[Here](https://github.com/fastify/aws-lambda-fastify/issues/89) you can find the approriate issue discussing this feature.*


#### Support for response streaming (`payloadAsStream`)

```js
import awsLambdaFastify from '@fastify/aws-lambda'
import { promisify } from 'node:util'
import stream from 'node:stream'
import app from './app.js'

const pipeline = promisify(stream.pipeline)
const proxy = awsLambdaFastify(app, { payloadAsStream: true })
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  const { meta, stream } = await proxy(event, context)
  responseStream = awslambda.HttpResponseStream.from(responseStream, meta)
  await pipeline(stream, responseStream)
})
await app.ready() // https://github.com/fastify/aws-lambda-fastify/issues/89
```

*[Here](https://github.com/fastify/aws-lambda-fastify/issues/154) you can find the approriate issue discussing this feature.*


## ⚡️Some basic performance metrics

**@fastify/aws-lambda (decorateRequest : false)** x **56,892 ops/sec** ±3.73% (79 runs sampled)

**@fastify/aws-lambda** x **56,571 ops/sec** ±3.52% (82 runs sampled)

**@fastify/aws-lambda (serializeLambdaArguments : true)** x **56,499 ops/sec** ±3.56% (76 runs sampled)

**[serverless-http](https://github.com/dougmoscrop/serverless-http)** x **45,867 ops/sec** ±4.42% (83 runs sampled)

**[aws-serverless-fastify](https://github.com/benMain/aws-serverless-fastify)** x **17,937 ops/sec** ±1.83% (86 runs sampled)

**[aws-serverless-express](https://github.com/awslabs/aws-serverless-express)** x **16,647 ops/sec** ±2.88% (87 runs sampled)

Fastest is **@fastify/aws-lambda (decorateRequest : false), @fastify/aws-lambda**

#### ⚠️Considerations

 - For apps that may not see traffic for several minutes at a time, you could see [cold starts](https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/)
 - Stateless only
 - API Gateway has a timeout of 29 seconds, and Lambda has a maximum execution time of 15 minutes. (Using Application Load Balancer has no timeout limit, so the lambda maximum execution time is relevant)
 - If you are using another web framework beside Fastify (i.e. Connect, Express, Koa, Restana, Sails, Hapi, Restify) or want to use a more generic serverless proxy framework, have a look at: [serverless-http](https://github.com/dougmoscrop/serverless-http) or [serverless-adapter](https://github.com/H4ad/serverless-adapter)


#### 🎖Who is using it?

<a href="https://locize.com" target="_blank" rel="nofollow">
  <img style="max-height: 80px;" src="https://raw.githubusercontent.com/fastify/aws-lambda-fastify/main/images/logos/locize.png" alt="locize is using @fastify/aws-lambda"/>
</a>

---
<small>The logos displayed in this page are property of the respective organisations and they are
not distributed under the same license as @fastify/aws-lambda (MIT).</small>
