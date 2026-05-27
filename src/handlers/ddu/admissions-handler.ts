import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  DDU_BTECH_CATEGORIES,
  getDduBtechAdmissionCategory,
  normalizeDduCategoryParam,
} from '../../services/ddu/btech-admissions.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /admissions/ddu/btech/{category} — category: acpc | management | jee */
export const admissionsDduBtechCategory = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const category = normalizeDduCategoryParam(event.pathParameters?.category);
  if (!category) {
    return json(400, {
      error: 'Invalid or missing category',
      validCategories: DDU_BTECH_CATEGORIES,
    });
  }

  const data = await getDduBtechAdmissionCategory(category);
  if (!data) {
    return json(502, {
      error: 'Could not load or parse DDU Faculty of Technology B.Tech. admissions page',
    });
  }
  return json(200, data);
};
