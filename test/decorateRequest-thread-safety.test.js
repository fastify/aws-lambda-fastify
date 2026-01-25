// test/concurrency.test.js
const test = require('node:test')
const assert = require('node:assert')
const Fastify = require('fastify')
const awsLambdaFastify = require('../index') // adjust path as needed

// Build a handler with decorateRequest enabled.
// Returns { handler, app } so the test can close the Fastify instance.
function buildHandler () {
  const app = Fastify()
  // handler deliberately waits a bit (with jitter) to create overlap
  app.get('/', async (req, reply) => {
    await new Promise(resolve => setTimeout(resolve, 20 + Math.floor(Math.random() * 60)))
    reply.send({
      event: req.awsLambda?.event,
      context: req.awsLambda?.context
    })
  })

  // awsLambdaFastify returns the lambda wrapper function
  const handler = awsLambdaFastify(app, { decorateRequest: true, serializeLambdaArguments: false })
  return { handler, app }
}

test('decorateRequest concurrency isolation — concurrent requests must not leak event/context', async (t) => {
  const { handler, app } = buildHandler()

  try {
    // number of concurrent invocations to stress the race
    const N = 80

    // prepare N distinct events/contexts
    const inputs = new Array(N).fill(null).map((_, i) => {
      return {
        event: { httpMethod: 'GET', path: '/', i },
        context: { requestId: `ctx-${i}` }
      }
    })

    // start all requests concurrently
    const promises = inputs.map(({ event, context }) => handler(event, context))
    const results = await Promise.all(promises)

    // parse each response body and assert correct mapping
    results.forEach((res, i) => {
      // awsLambdaFastify may return body as string (JSON) or already parsed object
      const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body

      assert.ok(body, `response body missing for request ${i}`)

      // check event and context are present and matched to the original input
      assert.strictEqual(
        body.context && body.context.requestId,
        inputs[i].context.requestId,
        `mismatched context.requestId for req ${i}: expected ${inputs[i].context.requestId} got ${body.context && body.context.requestId}`
      )

      // optional: check event.i matches
      assert.strictEqual(
        body.event && body.event.i,
        inputs[i].event.i,
        `mismatched event.i for req ${i}`
      )
    })
  } finally {
    // ensure Fastify cleans up
    await app.close()
  }
})
