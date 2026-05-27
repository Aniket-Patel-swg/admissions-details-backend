import type { APIGatewayProxyResult } from 'aws-lambda';

import { getNirmaPlacementReports } from '../../services/nirma/placement-reports.service.js';
import { getNirmaPlacementStats } from '../../services/nirma/placement-statistics.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /placements/nirma/reports */
export const placementsNirmaReports = async (): Promise<APIGatewayProxyResult> => {
  const data = await getNirmaPlacementReports();
  if (!data) {
    return json(502, { error: 'Could not load or parse Nirma management placement reports page' });
  }
  return json(200, data);
};

/** GET /placements/nirma/btech-statistics */
export const placementsNirmaBtechStatistics = async (): Promise<APIGatewayProxyResult> => {
  const data = await getNirmaPlacementStats();
  if (!data) {
    return json(502, { error: 'Could not load or parse Nirma technology placement statistics page' });
  }
  return json(200, data);
};
