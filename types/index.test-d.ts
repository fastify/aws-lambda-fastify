import fastify, {LightMyRequestResponse} from "fastify";
import awsLambdaFastify, {
  PromiseHandler,
  CallbackHandler,
  LambdaFastifyOptions,
  LambdaResponse,
  LambdaResponseStreamed,
} from "..";

import { expectType, expectError, expectAssignable } from "tsd";

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

// Callback handler
const proxyCallback: CallbackHandler<unknown, unknown> = awsLambdaFastify(app);
expectType<void>(proxyCallback({}, lambdaCtx, (err, res) => {}));

// Promise handler

// Generic type passed
const proxyPromise: PromiseHandler<unknown, Record<string, string>> =
  awsLambdaFastify(app);
expectType<PromiseHandler<unknown>>(awsLambdaFastify(app));
expectType<Promise<Record<string, string>>>(proxyPromise({}, lambdaCtx));
expectType<PromiseHandler<unknown, LambdaResponse>>(awsLambdaFastify(app, {}));
expectType<PromiseHandler<unknown, boolean>>(
  awsLambdaFastify<unknown, {}, boolean>(app)
);

// Default type
const proxyDefault = awsLambdaFastify(app);
expectType<Promise<LambdaResponse>>(proxyDefault({}, lambdaCtx));

// Streamed default type
const proxyStreamed = awsLambdaFastify(app, { payloadAsStream: true });
expectType<Promise<LambdaResponseStreamed>>(proxyStreamed({}, lambdaCtx));

expectAssignable<LambdaFastifyOptions>({ binaryMimeTypes: ["foo", "bar"] });
expectAssignable<LambdaFastifyOptions>({
  callbackWaitsForEmptyEventLoop: true,
});
expectAssignable<LambdaFastifyOptions>({
  serializeLambdaArguments: true,
});
expectAssignable<LambdaFastifyOptions>({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: true,
});
expectAssignable<LambdaFastifyOptions>({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
});
expectAssignable<LambdaFastifyOptions>({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
  enforceBase64: (response) => {
      expectType<LightMyRequestResponse>(response);
      return false;
  },
});
expectAssignable<LambdaFastifyOptions>({
  binaryMimeTypes: ["foo", "bar"],
  callbackWaitsForEmptyEventLoop: true,
  serializeLambdaArguments: false,
  decorateRequest: true,
  decorationPropertyName: "myAWSstuff",
  enforceBase64: (response) => {
      expectType<LightMyRequestResponse>(response);
      return false;
  },
  retainStage: true,
});

expectError(awsLambdaFastify());
expectError(awsLambdaFastify(app, { neh: "definition" }));
