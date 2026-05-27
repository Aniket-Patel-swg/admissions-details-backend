import type { Request, RequestHandler, Response } from 'express';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

const stubContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'admissions-backend-apis',
  functionVersion: '$LATEST',
  invokedFunctionArn: '',
  memoryLimitInMB: '1024',
  awsRequestId: '',
  logGroupName: '',
  logStreamName: '',
  getRemainingTimeInMillis: () => 30_000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
};

function toQueryStringParameters(
  query: Request['query'],
): APIGatewayProxyEventQueryStringParameters | null {
  const out: Record<string, string> = {};
  let any = false;
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue;
    out[k] = Array.isArray(v) ? String(v[v.length - 1]) : String(v);
    any = true;
  }
  return any ? out : null;
}

function toPathParameters(
  params: Request['params'],
): APIGatewayProxyEventPathParameters | null {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return null;
  return Object.fromEntries(entries.map(([k, v]) => [k, String(v)]));
}

function toHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    out[k] = Array.isArray(v) ? v.join(',') : v;
  }
  return out;
}

function toBody(req: Request): { body: string | null; isBase64Encoded: boolean } {
  if (Buffer.isBuffer(req.body)) {
    return { body: req.body.toString('base64'), isBase64Encoded: true };
  }
  if (typeof req.body === 'string') {
    return { body: req.body.length === 0 ? null : req.body, isBase64Encoded: false };
  }
  if (req.body == null || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
    return { body: null, isBase64Encoded: false };
  }
  return { body: JSON.stringify(req.body), isBase64Encoded: false };
}

function buildEvent(req: Request): APIGatewayProxyEvent {
  const { body, isBase64Encoded } = toBody(req);
  return {
    httpMethod: req.method,
    path: req.path,
    resource: req.route?.path ?? req.path,
    body,
    isBase64Encoded,
    headers: toHeaders(req),
    multiValueHeaders: {},
    queryStringParameters: toQueryStringParameters(req.query),
    multiValueQueryStringParameters: null,
    pathParameters: toPathParameters(req.params),
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
  };
}

function sendResult(res: Response, result: APIGatewayProxyResult): void {
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, String(v));
    }
  }
  if (result.multiValueHeaders) {
    for (const [k, vals] of Object.entries(result.multiValueHeaders)) {
      res.setHeader(k, vals.map(String));
    }
  }
  res.status(result.statusCode);
  if (result.body == null) {
    res.end();
    return;
  }
  if (result.isBase64Encoded) {
    res.end(Buffer.from(result.body, 'base64'));
    return;
  }
  res.send(result.body);
}

/**
 * Wraps an existing AWS Lambda handler so it can be mounted as an Express route handler.
 * Lets us reuse all 16 APIGatewayProxyHandler functions verbatim behind a single HTTP server.
 */
export function lambdaToExpress(handler: APIGatewayProxyHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      const event = buildEvent(req);
      const result = await handler(event, stubContext, () => undefined);
      if (!result) {
        res.status(204).end();
        return;
      }
      sendResult(res, result);
    } catch (err) {
      next(err);
    }
  };
}
