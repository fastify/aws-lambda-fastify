import fastify, { type LightMyRequestResponse } from "fastify";
import awsLambdaFastify, {
  type PromiseHandler,
  type CallbackHandler,
  type LambdaFastifyOptions,
  type LambdaResponse,
  type LambdaResponseStreamed,
} from ".";
import { expect } from "tstyche";

const app = fastify();

const lambdaCtx = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "func",
  functionVersion: "2",
  invokedFunctionArn: "arn",
  memoryLimitInMB: "666",
  awsRequestId: "1337",
  logGroupName: "Log",
  logStreamName: "stream",
  getRemainingTimeInMillis: () => 1,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// --- Callback handler ---
const proxyCallback: CallbackHandler<unknown, unknown> = awsLambdaFastify(app);
expect(proxyCallback({}, lambdaCtx, (err, res) => {})).type.toBe<void>();

// --- Promise handler ---

// Generic type passed
const proxyPromise: PromiseHandler<unknown, Record<string, string>> = awsLambdaFastify(app);

expect(awsLambdaFastify(app)).type.toBe<PromiseHandler<unknown>>();
expect(proxyPromise({}, lambdaCtx)).type.toBe<Promise<Record<string, string>>>();
expect(awsLambdaFastify(app, {})).type.toBe<PromiseHandler<unknown, LambdaResponse>>();

expect(
  awsLambdaFastify<unknown, {}, boolean>(app)
).type.toBe<PromiseHandler<unknown, boolean>>();

// Default type
const proxyDefault = awsLambdaFastify(app);
expect(proxyDefault({}, lambdaCtx)).type.toBe<Promise<LambdaResponse>>();

// Streamed default type
const proxyStreamed = awsLambdaFastify(app, { payloadAsStream: true });
expect(proxyStreamed({}, lambdaCtx)).type.toBe<Promise<LambdaResponseStreamed>>();

expect({ binaryMimeTypes: ["foo", "bar"] }).type.toBeAssignableTo<LambdaFastifyOptions>();
expect({ callbackWaitsForEmptyEventLoop: true }).type.toBeAssignableTo<LambdaFastifyOptions>();
expect({ serializeLambdaArguments: true }).type.toBeAssignableTo<LambdaFastifyOptions>();

expect({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: true,
}).type.toBeAssignableTo<LambdaFastifyOptions>();

expect({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
}).type.toBeAssignableTo<LambdaFastifyOptions>();

expect({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
  enforceBase64: (response: LightMyRequestResponse) => {
      expect(response).type.toBe<LightMyRequestResponse>();
      return false;
  },
}).type.toBeAssignableTo<LambdaFastifyOptions>();

expect({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
  enforceBase64: (response: LightMyRequestResponse) => {
      expect(response).type.toBe<LightMyRequestResponse>();
      return false;
  },
  retainStage: true,
}).type.toBeAssignableTo<LambdaFastifyOptions>();

expect({
  disableBase64Encoding: true,
}).type.toBeAssignableTo<LambdaFastifyOptions>();

// @ts-expect-error!
awsLambdaFastify();

// @ts-expect-error!
awsLambdaFastify(app, { neh: "definition" });
expect(
  awsLambdaFastify(app, { neh: 'definition' } as any)
).type.not.toBeAssignableTo<LambdaFastifyOptions>();