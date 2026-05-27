import type { APIGatewayProxyResult } from 'aws-lambda';

import { getAuAdmissionCalendar, getAuUgFees } from '../../services/au/admissions.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const admissionsAuCalendar = async (): Promise<APIGatewayProxyResult> => {
  const data = await getAuAdmissionCalendar();
  if (!data) {
    return json(502, { error: 'Could not load or parse AU admission calendar' });
  }
  return json(200, data);
};

export const admissionsAuUgFees = async (): Promise<APIGatewayProxyResult> => {
  const data = await getAuUgFees();
  if (!data) {
    return json(502, { error: 'Could not load or parse AU UG fees structure' });
  }
  return json(200, data);
};
