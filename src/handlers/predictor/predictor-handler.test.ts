import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/predictor/predictor.service.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/predictor/predictor.service.js')>(
    '../../services/predictor/predictor.service.js',
  );
  return {
    ...actual,
    predictPercentile: vi.fn(),
    predictCollege: vi.fn(),
  };
});

import { predictCollegeHandler, predictPercentileHandler } from './predictor-handler.js';
import {
  PredictorValidationError,
  predictCollege,
  predictPercentile,
} from '../../services/predictor/predictor.service.js';

const event = (body: unknown): APIGatewayProxyEvent =>
  ({ body: body == null ? null : JSON.stringify(body) }) as APIGatewayProxyEvent;

describe('predictPercentileHandler', () => {
  beforeEach(() => {
    vi.mocked(predictPercentile).mockReset();
  });

  it('returns 200 with the upstream response', async () => {
    const upstream = {
      input_marks_by_board: { gujcet: 95 },
      boards: { gujcet: { predicted_percentile: 99.2, input_marks: 95 } },
    };
    vi.mocked(predictPercentile).mockResolvedValue(upstream);

    const res = await predictPercentileHandler(event({ boards: ['gujcet'], gujcet_marks: 95 }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });

  it('returns 400 on invalid JSON body', async () => {
    const res = await predictPercentileHandler({ body: '{not-json' } as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 when the service raises a validation error', async () => {
    vi.mocked(predictPercentile).mockRejectedValue(
      new PredictorValidationError('`boards` must be a non-empty array'),
    );
    const res = await predictPercentileHandler(event({ boards: [] }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: '`boards` must be a non-empty array' });
  });
});

describe('predictCollegeHandler', () => {
  beforeEach(() => {
    vi.mocked(predictCollege).mockReset();
  });

  it('returns 200 with the upstream response', async () => {
    const upstream = {
      user_rank: 8500,
      user_branch: 'COMPUTER ENGINEERING',
      user_category: 'OPEN',
      count: 0,
      predictions: [],
    };
    vi.mocked(predictCollege).mockResolvedValue(upstream);

    const res = await predictCollegeHandler(
      event({
        user_rank: 8500,
        user_branch: 'COMPUTER ENGINEERING',
        user_category: 'OPEN',
      }),
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });

  it('returns 400 when the service raises a validation error', async () => {
    vi.mocked(predictCollege).mockRejectedValue(
      new PredictorValidationError('`user_rank` must be a positive number'),
    );
    const res = await predictCollegeHandler(event({ user_branch: 'X', user_category: 'OPEN' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: '`user_rank` must be a positive number' });
  });
});
