import axios from 'axios';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  PredictorValidationError,
  predictCollege,
  predictPercentile,
} from '../../services/predictor/predictor.service.js';

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

/** POST /predict-percentile — proxies to the percentile predictor ECR Lambda. */
export const predictPercentileHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseJsonBody(event);
    const result = await predictPercentile(body);
    return json(200, result);
  } catch (err) {
    return errorResponse(err, 'Percentile');
  }
};

/** POST /predict-college — proxies to the college predictor ECR Lambda. */
export const predictCollegeHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseJsonBody(event);
    const result = await predictCollege(body);
    return json(200, result);
  } catch (err) {
    return errorResponse(err, 'College');
  }
};
