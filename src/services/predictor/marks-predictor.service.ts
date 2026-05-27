import {
  callMarksPredictor,
  callMarksSuggester,
  callMeritWiseCollege,
} from '../../clients/predictor/marks-predictor.client.js';
import type {
  MarksPredictRequest,
  MarksPredictResponse,
  MarksSuggestRequest,
  MarksSuggestResponse,
  MeritWiseCollegeRequest,
  MeritWiseCollegeResponse,
} from '../../types/predictor/marks-predictor.types.js';
import { PredictorValidationError } from './predictor.service.js';

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asPositiveInt(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n === null) return null;
  const i = Math.floor(n);
  return i >= 1 ? i : null;
}

/** Validate & normalise the marks predict request, then forward to the predictor Lambda. */
export async function predictMarks(rawBody: unknown): Promise<MarksPredictResponse> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new PredictorValidationError('Request body must be a JSON object');
  }
  const body = rawBody as Record<string, unknown>;

  const user_marks = asFiniteNumber(body.user_marks);
  if (user_marks === null || user_marks < 0 || user_marks > 100) {
    throw new PredictorValidationError('`user_marks` must be a number between 0 and 100');
  }
  const user_branch = typeof body.user_branch === 'string' ? body.user_branch.trim() : '';
  if (!user_branch) {
    throw new PredictorValidationError('`user_branch` is required');
  }
  const user_category = typeof body.user_category === 'string' ? body.user_category.trim() : '';
  if (!user_category) {
    throw new PredictorValidationError('`user_category` is required');
  }

  const top_n_raw = asPositiveInt(body.top_n);
  const top_n = top_n_raw !== null ? Math.min(top_n_raw, 500) : undefined;

  const payload: MarksPredictRequest = {
    user_marks,
    user_branch,
    user_category,
    ...(top_n !== undefined ? { top_n } : {}),
  };
  return callMarksPredictor(payload);
}

/** Validate & normalise the marks suggest request, then forward to the predictor Lambda. */
export async function suggestMarks(rawBody: unknown): Promise<MarksSuggestResponse> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new PredictorValidationError('Request body must be a JSON object');
  }
  const body = rawBody as Record<string, unknown>;

  const user_marks = asFiniteNumber(body.user_marks);
  if (user_marks === null || user_marks < 0 || user_marks > 100) {
    throw new PredictorValidationError('`user_marks` must be a number between 0 and 100');
  }
  const user_category = typeof body.user_category === 'string' ? body.user_category.trim() : '';
  if (!user_category) {
    throw new PredictorValidationError('`user_category` is required');
  }

  const top_n_raw = asPositiveInt(body.top_n);
  const top_n = top_n_raw !== null ? Math.min(top_n_raw, 200) : undefined;

  const payload: MarksSuggestRequest = {
    user_marks,
    user_category,
    ...(top_n !== undefined ? { top_n } : {}),
  };
  return callMarksSuggester(payload);
}

/** Validate & normalise the merit-wise-college request, then forward to the predictor Lambda. */
export async function meritWiseCollege(
  rawBody: unknown,
): Promise<MeritWiseCollegeResponse> {
  // Body is optional for this endpoint; null/empty defaults to first page, all categories.
  const body =
    rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};

  let user_category: string | undefined;
  if (body.user_category != null) {
    if (typeof body.user_category !== 'string' || !body.user_category.trim()) {
      throw new PredictorValidationError('`user_category` must be a non-empty string when provided');
    }
    user_category = body.user_category.trim();
  }

  const page_raw = asPositiveInt(body.page);
  const page_size_raw = asPositiveInt(body.page_size);
  const page = page_raw ?? 1;
  const page_size = page_size_raw !== null ? Math.min(page_size_raw, 200) : 50;

  const payload: MeritWiseCollegeRequest = {
    ...(user_category !== undefined ? { user_category } : {}),
    page,
    page_size,
  };
  return callMeritWiseCollege(payload);
}
