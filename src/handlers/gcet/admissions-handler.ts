import type { APIGatewayProxyResult } from 'aws-lambda';

import { getGcetAdmissionDetails } from '../../services/gcet/admission-details.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const admissionsGcetDetails = async (): Promise<APIGatewayProxyResult> => {
  const data = await getGcetAdmissionDetails();
  if (!data) {
    return json(502, { error: 'Could not load or parse GCET admission details' });
  }
  return json(200, data);
};
