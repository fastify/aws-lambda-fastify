import {Context} from 'aws-lambda'
import {FastifyInstance} from 'fastify'

interface LambdaFastifyOptions {
  binaryMimeTypes?: string[];
  callbackWaitsForEmptyEventLoop?: boolean;
}

type PromiseHandler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
) => Promise<TResult>;
declare function awsLambdaFastify<TEvent, TResult>(app: FastifyInstance, options?: LambdaFastifyOptions): PromiseHandler<TEvent, TResult>;
export = awsLambdaFastify;
