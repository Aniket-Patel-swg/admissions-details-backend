import type { APIGatewayProxyResult } from 'aws-lambda';

import { getAdmissionDetails, getAllAdmissionPrograms } from '../../services/pdeu/admissions.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const admissionsPdeuAllIndia = async (): Promise<APIGatewayProxyResult> => {
  const data = await getAdmissionDetails('All India');
  if (!data) {
    return json(502, { error: 'Could not load or parse PDEU admission dates' });
  }
  return json(200, data);
};

export const admissionsPdeuPrograms = async (): Promise<APIGatewayProxyResult> => {
  const programs = await getAllAdmissionPrograms();
  if (!programs) {
    return json(502, { error: 'Could not load or parse PDEU admissions page' });
  }
  return json(200, { programs });
};
