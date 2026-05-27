import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/daiict/btech-all-india-admissions.service.js', () => ({
  getDaiictBtechSection: vi.fn(),
  listDaiictSectionKeys: vi.fn(),
  normalizeDaiictCategoryParam: vi.fn(),
  normalizeDaiictSectionParam: vi.fn(),
  DAIICT_BTECH_CATEGORIES: ['all_india', 'nri', 'gujarat'],
}));

import { admissionsDaiictSection } from './admissions-handler.js';
import type { DaiictBtechSectionPayload } from '../../types/daiict/btech-all-india.types.js';
import {
  DAIICT_BTECH_CATEGORIES,
  getDaiictBtechSection,
  listDaiictSectionKeys,
  normalizeDaiictCategoryParam,
  normalizeDaiictSectionParam,
} from '../../services/daiict/btech-all-india-admissions.service.js';

describe('admissionsDaiictSection', () => {
  beforeEach(() => {
    vi.mocked(normalizeDaiictCategoryParam).mockReset();
    vi.mocked(normalizeDaiictSectionParam).mockReset();
    vi.mocked(listDaiictSectionKeys).mockReset();
    vi.mocked(getDaiictBtechSection).mockReset();
  });

  it('returns 400 when category is invalid', async () => {
    vi.mocked(normalizeDaiictCategoryParam).mockReturnValue(null);
    const event = {
      pathParameters: { category: 'x', section: 'intake' },
    } as unknown as APIGatewayProxyEvent;
    const res = await admissionsDaiictSection(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Invalid or missing category',
      validCategories: DAIICT_BTECH_CATEGORIES,
    });
  });

  it('returns 400 when section is invalid for the given category', async () => {
    vi.mocked(normalizeDaiictCategoryParam).mockReturnValue('gujarat');
    vi.mocked(normalizeDaiictSectionParam).mockReturnValue(null);
    vi.mocked(listDaiictSectionKeys).mockReturnValue(['intake', 'fee_structure']);
    const event = {
      pathParameters: { category: 'gujarat', section: 'selection_criteria' },
    } as unknown as APIGatewayProxyEvent;
    const res = await admissionsDaiictSection(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Invalid or missing section for the given category',
      category: 'gujarat',
      validSections: ['intake', 'fee_structure'],
    });
  });

  it('returns 200 when category + section resolve and data loads', async () => {
    const payload = {
      university: 'daiict',
      programme: 'btech',
      category: 'all_india',
      section: 'intake',
      data: {},
    } as unknown as DaiictBtechSectionPayload;
    vi.mocked(normalizeDaiictCategoryParam).mockReturnValue('all_india');
    vi.mocked(normalizeDaiictSectionParam).mockReturnValue('intake');
    vi.mocked(getDaiictBtechSection).mockResolvedValue(payload);
    const event = {
      pathParameters: { category: 'all_india', section: 'intake' },
    } as unknown as APIGatewayProxyEvent;
    const res = await admissionsDaiictSection(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
    expect(getDaiictBtechSection).toHaveBeenCalledWith('all_india', 'intake');
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(normalizeDaiictCategoryParam).mockReturnValue('nri');
    vi.mocked(normalizeDaiictSectionParam).mockReturnValue('intake');
    vi.mocked(getDaiictBtechSection).mockResolvedValue(null);
    const event = {
      pathParameters: { category: 'nri', section: 'intake' },
    } as unknown as APIGatewayProxyEvent;
    const res = await admissionsDaiictSection(event);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse DAIICT B.Tech nri admissions page',
    });
  });
});
