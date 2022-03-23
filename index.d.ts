import { Context } from "aws-lambda";
import { FastifyInstance } from "fastify";

export interface LambdaFastifyOptions {
  binaryMimeTypes?: string[];
  callbackWaitsForEmptyEventLoop?: boolean;
  serializeLambdaArguments?: boolean;
  decorateRequest?: boolean;
  decorationPropertyName?: string;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
  cookies?: string[]
}

export type PromiseHandler<TEvent = any, TResult = LambdaResponse> = (
  event: TEvent,
  context: Context
) => Promise<TResult>;

export type CallbackHandler<TEvent = any, TResult = LambdaResponse> = (
  event: TEvent,
  context: Context,
  callback: (err?: Error, result?: TResult) => void
) => void;

export default function awsLambdaFastify<TEvent, TResult = LambdaResponse>(
  app: FastifyInstance,
  options?: LambdaFastifyOptions
): PromiseHandler<TEvent, TResult>;

export default function awsLambdaFastify<TEvent, TResult = LambdaResponse>(
  app: FastifyInstance,
  options?: LambdaFastifyOptions
): CallbackHandler<TEvent, TResult>;
