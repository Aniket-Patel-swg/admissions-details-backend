import type { APIGatewayProxyResult } from 'aws-lambda';

import { getLdceUgPrograms } from '../../services/ldce/ug-programs.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const admissionsLdceUgPrograms = async (): Promise<APIGatewayProxyResult> => {
  const data = await getLdceUgPrograms();
  if (!data) {
    return json(502, { error: 'Could not load or parse LDCE undergraduate programs / intake' });
  }
  return json(200, data);
};
