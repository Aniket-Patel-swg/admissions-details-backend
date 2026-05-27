import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/ddu/btech-admissions.service.js', () => ({
  DDU_BTECH_CATEGORIES: ['acpc', 'management', 'jee'],
  getDduBtechAdmissionCategory: vi.fn(),
  normalizeDduCategoryParam: vi.fn(),
}));

import type { APIGatewayProxyEvent } from 'aws-lambda';

import type { DduBtechAdmissionPayload } from '../../types/ddu/btech-admissions.types.js';
import { admissionsDduBtechCategory } from './admissions-handler.js';
import {
  getDduBtechAdmissionCategory,
  normalizeDduCategoryParam,
} from '../../services/ddu/btech-admissions.service.js';

function eventWithCategory(category: string | undefined): APIGatewayProxyEvent {
  return {
    pathParameters: category === undefined ? null : { category },
  } as APIGatewayProxyEvent;
}

describe('admissionsDduBtechCategory', () => {
  beforeEach(() => {
    vi.mocked(getDduBtechAdmissionCategory).mockReset();
    vi.mocked(normalizeDduCategoryParam).mockReset();
    vi.mocked(normalizeDduCategoryParam).mockImplementation((raw) => {
      if (raw === 'management') return 'management';
      if (raw === 'jee') return 'jee';
      if (raw === 'acpc') return 'acpc';
      return null;
    });
  });

  it('returns 400 when category invalid', async () => {
    const res = await admissionsDduBtechCategory(eventWithCategory('unknown'));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).validCategories).toEqual(['acpc', 'management', 'jee']);
    expect(getDduBtechAdmissionCategory).not.toHaveBeenCalled();
  });

  it('returns 200 when service succeeds', async () => {
    const payload: DduBtechAdmissionPayload = {
      university: 'ddu',
      programme: 'btech',
      category: 'management',
      sourceUrl: 'https://www.ddu.ac.in/Admission2026-FoT.php',
      notes: null,
      links: [],
    };
    vi.mocked(getDduBtechAdmissionCategory).mockResolvedValue(payload);
    const res = await admissionsDduBtechCategory(eventWithCategory('management'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getDduBtechAdmissionCategory).mockResolvedValue(null);
    const res = await admissionsDduBtechCategory(eventWithCategory('jee'));
    expect(res.statusCode).toBe(502);
  });
});
