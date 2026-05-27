import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Route-style entry: maps API Gateway events to responses (thin handler layer). */
export const hello = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const name = event.queryStringParameters?.name ?? 'Stranger';
  return json(200, { message: `Hello ${name}, from JS!` });
};
