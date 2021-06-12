import { Context } from "aws-lambda";
import { FastifyInstance } from "fastify";

export interface LambdaFastifyOptions {
  binaryMimeTypes?: string[];
  callbackWaitsForEmptyEventLoop?: boolean;
  serializeLambdaArguments?: boolean;
}

export type PromiseHandler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: Context
) => Promise<TResult>;

export default function awsLambdaFastify<TEvent, TResult>(
  app: FastifyInstance,
  options?: LambdaFastifyOptions
): PromiseHandler<TEvent, TResult>;
