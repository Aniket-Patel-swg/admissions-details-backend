import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { GUJARAT_PRIVATE_BTECH_DEADLINES_2026 } from '../data/gujarat-private-btech-deadlines-2026.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /admissions-deadline — Gujarat private B.Tech deadlines dataset (2026). */
export const admissionsDeadline = async (
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  return json(200, {
    year: 2026,
    count: GUJARAT_PRIVATE_BTECH_DEADLINES_2026.length,
    rows: GUJARAT_PRIVATE_BTECH_DEADLINES_2026,
  });
};

