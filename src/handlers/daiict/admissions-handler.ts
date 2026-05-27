import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  DAIICT_BTECH_CATEGORIES,
  getDaiictBtechSection,
  listDaiictSectionKeys,
  normalizeDaiictCategoryParam,
  normalizeDaiictSectionParam,
} from '../../services/daiict/btech-all-india-admissions.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /admissions/daiict/{category}/{section} */
export const admissionsDaiictSection = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const category = normalizeDaiictCategoryParam(event.pathParameters?.category);
  if (!category) {
    return json(400, {
      error: 'Invalid or missing category',
      validCategories: DAIICT_BTECH_CATEGORIES,
    });
  }

  const section = normalizeDaiictSectionParam(event.pathParameters?.section, category);
  if (!section) {
    return json(400, {
      error: 'Invalid or missing section for the given category',
      category,
      validSections: listDaiictSectionKeys(category),
    });
  }

  const data = await getDaiictBtechSection(category, section);
  if (!data) {
    return json(502, {
      error: `Could not load or parse DAIICT B.Tech ${category} admissions page`,
    });
  }
  return json(200, data);
};

/** @deprecated kept so existing /admissions/daiict/all_india/{section} routes still work. */
export const admissionsDaiictAllIndiaSection = admissionsDaiictSection;
