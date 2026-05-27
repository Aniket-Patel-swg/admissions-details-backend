import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/predictor/marks-predictor.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../services/predictor/marks-predictor.service.js')
  >('../../services/predictor/marks-predictor.service.js');
  return {
    ...actual,
    predictMarks: vi.fn(),
    suggestMarks: vi.fn(),
    meritWiseCollege: vi.fn(),
  };
});

import {
  meritWiseCollegeHandler,
  predictMarksHandler,
  suggestMarksHandler,
} from './marks-predictor-handler.js';
import {
  meritWiseCollege,
  predictMarks,
  suggestMarks,
} from '../../services/predictor/marks-predictor.service.js';
import { PredictorValidationError } from '../../services/predictor/predictor.service.js';

const event = (body: unknown): APIGatewayProxyEvent =>
  ({ body: body == null ? null : JSON.stringify(body) }) as APIGatewayProxyEvent;

describe('predictMarksHandler', () => {
  beforeEach(() => {
    vi.mocked(predictMarks).mockReset();
  });

  it('returns 200 with the upstream response', async () => {
    const upstream = {
      user_marks: 92.5,
      user_branch: 'COMPUTER ENGINEERING',
      user_category: 'OPEN',
      count: 0,
      predictions: [],
    };
    vi.mocked(predictMarks).mockResolvedValue(upstream);

    const res = await predictMarksHandler(
      event({
        user_marks: 92.5,
        user_branch: 'COMPUTER ENGINEERING',
        user_category: 'OPEN',
      }),
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });

  it('returns 400 on invalid JSON body', async () => {
    const res = await predictMarksHandler({ body: '{not-json' } as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 when the service raises a validation error', async () => {
    vi.mocked(predictMarks).mockRejectedValue(
      new PredictorValidationError('`user_marks` must be a number between 0 and 100'),
    );
    const res = await predictMarksHandler(event({ user_branch: 'X', user_category: 'OPEN' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: '`user_marks` must be a number between 0 and 100',
    });
  });
});

describe('suggestMarksHandler', () => {
  beforeEach(() => {
    vi.mocked(suggestMarks).mockReset();
  });

  it('returns 200 with the upstream response', async () => {
    const upstream = {
      user_marks: 85,
      user_category: 'OPEN',
      count: 0,
      suggestions: [],
    };
    vi.mocked(suggestMarks).mockResolvedValue(upstream);

    const res = await suggestMarksHandler(event({ user_marks: 85, user_category: 'OPEN' }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });

  it('returns 400 when the service raises a validation error', async () => {
    vi.mocked(suggestMarks).mockRejectedValue(
      new PredictorValidationError('`user_category` is required'),
    );
    const res = await suggestMarksHandler(event({ user_marks: 85 }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: '`user_category` is required' });
  });
});

describe('meritWiseCollegeHandler', () => {
  beforeEach(() => {
    vi.mocked(meritWiseCollege).mockReset();
  });

  it('returns 200 with the upstream response', async () => {
    const upstream = {
      user_category: 'OPEN',
      page: 1,
      page_size: 50,
      total: 0,
      total_pages: 0,
      count: 0,
      colleges: [],
    };
    vi.mocked(meritWiseCollege).mockResolvedValue(upstream);

    const res = await meritWiseCollegeHandler(
      event({ user_category: 'OPEN', page: 1, page_size: 50 }),
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });

  it('accepts an empty body and proxies the default request', async () => {
    const upstream = {
      page: 1,
      page_size: 50,
      total: 0,
      total_pages: 0,
      count: 0,
      colleges: [],
    };
    vi.mocked(meritWiseCollege).mockResolvedValue(upstream);

    const res = await meritWiseCollegeHandler(event(null));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(upstream);
  });
});
