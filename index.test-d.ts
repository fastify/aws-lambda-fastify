import fastify, { FastifyInstance } from "fastify";
import awsLambdaFastify, { PromiseHandler, LambdaFastifyOptions } from ".";
import { expectType, expectError, expectAssignable } from "tsd";

const app = fastify();

expectType<PromiseHandler<unknown, unknown>>(awsLambdaFastify(app));
expectType<PromiseHandler<unknown, unknown>>(awsLambdaFastify(app, {}));
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
expectType<PromiseHandler<unknown, boolean>>(
  awsLambdaFastify<unknown, boolean>(app)
);
expectError(awsLambdaFastify());
expectError(awsLambdaFastify(app, { neh: "definition" }));
