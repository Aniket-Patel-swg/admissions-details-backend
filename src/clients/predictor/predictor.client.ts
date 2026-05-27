import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import type {
  CollegePredictRequest,
  CollegePredictResponse,
  PercentilePredictRequest,
  PercentilePredictResponse,
} from '../../types/predictor/predictor.types.js';

/** Max time we wait on the upstream ECR Lambda before giving up (cold-start safe). */
const DEFAULT_TIMEOUT_MS = 25_000;

function requireEnv(name: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val.replace(/\/+$/, '');
}

/** POSTs to the percentile predictor ECR Lambda's `/predict` route. */
export async function callPercentilePredictor(
  body: PercentilePredictRequest,
): Promise<PercentilePredictResponse> {
  const baseUrl = requireEnv('PERCENTILE_PREDICTOR_URL');
  const { data } = await axios.post<PercentilePredictResponse>(
    `${baseUrl}/predict`,
    body,
    withOutboundOptions({
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    }),
  );
  return data;
}

/** POSTs to the college predictor ECR Lambda's `/predict` route. */
export async function callCollegePredictor(
  body: CollegePredictRequest,
): Promise<CollegePredictResponse> {
  const baseUrl = requireEnv('COLLEGE_PREDICTOR_URL');
  const { data } = await axios.post<CollegePredictResponse>(
    `${baseUrl}/predict`,
    body,
    withOutboundOptions({
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    }),
  );
  return data;
}
