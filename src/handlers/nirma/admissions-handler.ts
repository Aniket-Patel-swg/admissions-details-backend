import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  getNirmaBtechSection,
  NIRMA_BTECH_SECTION_KEYS,
  normalizeNirmaBtechSectionParam,
} from '../../services/nirma/btech-admissions.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /admissions/nirma/btech/{section} */
export const admissionsNirmaBtechSection = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const section = normalizeNirmaBtechSectionParam(event.pathParameters?.section);
  if (!section) {
    return json(400, {
      error: 'Invalid or missing section',
      validSections: NIRMA_BTECH_SECTION_KEYS,
    });
  }

  const data = await getNirmaBtechSection(section);
  if (!data) {
    return json(502, { error: 'Could not load or parse Nirma B.Tech admissions page' });
  }
  return json(200, data);
};
