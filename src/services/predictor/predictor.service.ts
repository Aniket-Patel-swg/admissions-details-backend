import {
  callCollegePredictor,
  callPercentilePredictor,
} from '../../clients/predictor/predictor.client.js';
import type {
  CollegePredictRequest,
  CollegePredictResponse,
  PercentileBoardId,
  PercentilePredictRequest,
  PercentilePredictResponse,
} from '../../types/predictor/predictor.types.js';

const SUPPORTED_BOARDS: ReadonlySet<PercentileBoardId> = new Set([
  'gujcet',
  'cbse',
  'gseb',
  'isce',
]);

export class PredictorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PredictorValidationError';
  }
}

function asPositiveFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Validate & normalise the percentile request, then forward it to the predictor Lambda. */
export async function predictPercentile(
  rawBody: unknown,
): Promise<PercentilePredictResponse> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new PredictorValidationError('Request body must be a JSON object');
  }

  const body = rawBody as Record<string, unknown>;
  const boards = body.boards;
  if (!Array.isArray(boards) || boards.length === 0) {
    throw new PredictorValidationError('`boards` must be a non-empty array');
  }

  const unique: PercentileBoardId[] = [];
  for (const b of boards) {
    if (typeof b !== 'string' || !SUPPORTED_BOARDS.has(b as PercentileBoardId)) {
      throw new PredictorValidationError(
        `Unknown board '${String(b)}'. Supported: ${[...SUPPORTED_BOARDS].join(', ')}`,
      );
    }
    if (!unique.includes(b as PercentileBoardId)) unique.push(b as PercentileBoardId);
  }

  const payload: PercentilePredictRequest & Record<string, unknown> = { boards: unique };
  for (const board of unique) {
    const aliasKey = board === 'gujcet' ? 'guject_marks' : null;
    const marks =
      asPositiveFiniteNumber(body[`${board}_marks`]) ??
      (aliasKey ? asPositiveFiniteNumber(body[aliasKey]) : null);
    if (marks === null) {
      throw new PredictorValidationError(
        `Field '${board}_marks' is required (numeric) when board '${board}' is listed`,
      );
    }
    payload[`${board}_marks`] = marks;
  }

  return callPercentilePredictor(payload);
}

/** Validate & normalise the college request, then forward it to the predictor Lambda. */
export async function predictCollege(rawBody: unknown): Promise<CollegePredictResponse> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new PredictorValidationError('Request body must be a JSON object');
  }
  const body = rawBody as Record<string, unknown>;

  const user_rank = asPositiveFiniteNumber(body.user_rank);
  if (user_rank === null || user_rank <= 0) {
    throw new PredictorValidationError('`user_rank` must be a positive number');
  }
  const user_branch = typeof body.user_branch === 'string' ? body.user_branch.trim() : '';
  if (!user_branch) {
    throw new PredictorValidationError('`user_branch` is required');
  }
  const user_category = typeof body.user_category === 'string' ? body.user_category.trim() : '';
  if (!user_category) {
    throw new PredictorValidationError('`user_category` is required');
  }

  const top_n_raw = asPositiveFiniteNumber(body.top_n);
  const top_n =
    top_n_raw !== null ? Math.min(Math.max(Math.floor(top_n_raw), 1), 500) : undefined;

  const payload: CollegePredictRequest = {
    user_rank,
    user_branch,
    user_category,
    ...(top_n !== undefined ? { top_n } : {}),
  };

  return callCollegePredictor(payload);
}
