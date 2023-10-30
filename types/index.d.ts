import { Context } from "aws-lambda";
import { FastifyInstance, LightMyRequestResponse } from "fastify";

type AwsLambdaFastify = typeof awsLambdaFastify

declare namespace awsLambdaFastify {
  export interface LambdaFastifyOptions {
    binaryMimeTypes?: string[];
    callbackWaitsForEmptyEventLoop?: boolean;
    serializeLambdaArguments?: boolean;
    decorateRequest?: boolean;
    decorationPropertyName?: string;
    enforceBase64?: (response: LightMyRequestResponse) => boolean;
    retainStage?: boolean;
    /**
     * usually set to 'proxy', if used
     */
    pathParameterUsedAsPath?: string;
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
  
  export const awsLambdaFastify: AwsLambdaFastify
  export { awsLambdaFastify as default }
}

declare function awsLambdaFastify<TEvent, TResult = awsLambdaFastify.LambdaResponse>(
  app: FastifyInstance,
  options?: awsLambdaFastify.LambdaFastifyOptions
): awsLambdaFastify.PromiseHandler<TEvent, TResult>;

declare function awsLambdaFastify<TEvent, TResult = awsLambdaFastify.LambdaResponse>(
  app: FastifyInstance,
  options?: awsLambdaFastify.LambdaFastifyOptions
): awsLambdaFastify.CallbackHandler<TEvent, TResult>;

export = awsLambdaFastify
