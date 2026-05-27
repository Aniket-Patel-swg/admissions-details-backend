import axios from 'axios';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { PredictorValidationError } from '../../services/predictor/predictor.service.js';
import {
  meritWiseCollege,
  predictMarks,
  suggestMarks,
} from '../../services/predictor/marks-predictor.service.js';

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function parseJsonBody(event: APIGatewayProxyEvent): unknown {
  if (event.body == null) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
  if (!raw.trim()) return null;
  return JSON.parse(raw) as unknown;
}

function errorResponse(error: unknown, upstream: string): APIGatewayProxyResult {
  if (error instanceof SyntaxError) {
    return json(400, { error: 'Invalid JSON body' });
  }
  if (error instanceof PredictorValidationError) {
    return json(400, { error: error.message });
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const upstreamBody = error.response?.data;
    if (status && status >= 400 && status < 500) {
      return json(status, { error: 'Upstream rejected request', details: upstreamBody });
    }
    console.error(`${upstream} predictor call failed:`, error.message, upstreamBody ?? '');
    return json(502, { error: `${upstream} predictor unavailable` });
  }
  console.error(`${upstream} predictor unexpected error:`, error);
  return json(500, { error: 'Internal server error' });
}

/** POST /predict-marks — proxies to the marks predictor ECR Lambda's /predict route. */
export const predictMarksHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseJsonBody(event);
    const result = await predictMarks(body);
    return json(200, result);
  } catch (err) {
    return errorResponse(err, 'Marks');
  }
};

/** POST /suggest-marks — proxies to the marks predictor ECR Lambda's /suggest route. */
export const suggestMarksHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseJsonBody(event);
    const result = await suggestMarks(body);
    return json(200, result);
  } catch (err) {
    return errorResponse(err, 'Marks');
  }
};

/** POST /merit-wise-college — proxies to the marks predictor ECR Lambda's /merit-wise-college route. */
export const meritWiseCollegeHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseJsonBody(event);
    const result = await meritWiseCollege(body);
    return json(200, result);
  } catch (err) {
    return errorResponse(err, 'Marks');
  }
};
