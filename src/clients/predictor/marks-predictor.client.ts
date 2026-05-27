import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import type {
  MarksPredictRequest,
  MarksPredictResponse,
  MarksSuggestRequest,
  MarksSuggestResponse,
  MeritWiseCollegeRequest,
  MeritWiseCollegeResponse,
} from '../../types/predictor/marks-predictor.types.js';

const DEFAULT_TIMEOUT_MS = 25_000;

function requireEnv(name: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val.replace(/\/+$/, '');
}

/** POSTs to the marks predictor ECR Lambda's `/predict` route. */
export async function callMarksPredictor(
  body: MarksPredictRequest,
): Promise<MarksPredictResponse> {
  const baseUrl = requireEnv('MARKS_PREDICTOR_URL');
  const { data } = await axios.post<MarksPredictResponse>(
    `${baseUrl}/predict`,
    body,
    withOutboundOptions({
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    }),
  );
  return data;
}

/** POSTs to the marks predictor ECR Lambda's `/suggest` route. */
export async function callMarksSuggester(
  body: MarksSuggestRequest,
): Promise<MarksSuggestResponse> {
  const baseUrl = requireEnv('MARKS_PREDICTOR_URL');
  const { data } = await axios.post<MarksSuggestResponse>(
    `${baseUrl}/suggest`,
    body,
    withOutboundOptions({
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    }),
  );
  return data;
}

/** POSTs to the marks predictor ECR Lambda's `/merit-wise-college` route. */
export async function callMeritWiseCollege(
  body: MeritWiseCollegeRequest,
): Promise<MeritWiseCollegeResponse> {
  const baseUrl = requireEnv('MARKS_PREDICTOR_URL');
  const { data } = await axios.post<MeritWiseCollegeResponse>(
    `${baseUrl}/merit-wise-college`,
    body,
    withOutboundOptions({
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    }),
  );
  return data;
}
