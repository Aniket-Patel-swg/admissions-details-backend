import type { APIGatewayProxyResult } from 'aws-lambda';

import { getBvmPlacementDetails } from '../../services/bvm/placement-details.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** GET /placements/bvm/placement-details */
export const placementsBvmPlacementDetails = async (): Promise<APIGatewayProxyResult> => {
  const data = await getBvmPlacementDetails();
  if (!data) {
    return json(502, { error: 'Could not load or parse BVM placement details page' });
  }
  return json(200, data);
};
