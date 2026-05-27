import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/nirma/btech-admissions.service.js', () => ({
  getNirmaBtechSection: vi.fn(),
  NIRMA_BTECH_SECTION_KEYS: ['intake', 'fee_structure'],
  normalizeNirmaBtechSectionParam: vi.fn(),
}));

import { admissionsNirmaBtechSection } from './admissions-handler.js';
import type { NirmaBtechSectionPayload } from '../../types/nirma/btech.types.js';
import {
  getNirmaBtechSection,
  NIRMA_BTECH_SECTION_KEYS,
  normalizeNirmaBtechSectionParam,
} from '../../services/nirma/btech-admissions.service.js';

describe('admissionsNirmaBtechSection', () => {
  beforeEach(() => {
    vi.mocked(normalizeNirmaBtechSectionParam).mockReset();
    vi.mocked(getNirmaBtechSection).mockReset();
  });

  it('returns 400 when section is invalid', async () => {
    vi.mocked(normalizeNirmaBtechSectionParam).mockReturnValue(null);
    const event = { pathParameters: { section: 'bad' } } as unknown as APIGatewayProxyEvent;
    const res = await admissionsNirmaBtechSection(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Invalid or missing section',
      validSections: NIRMA_BTECH_SECTION_KEYS,
    });
  });

  it('returns 200 when section resolves and data loads', async () => {
    const payload = {
      university: 'nirma',
      programme: 'btech',
      section: 'intake',
      data: { intake: [] },
    } as unknown as NirmaBtechSectionPayload;
    vi.mocked(normalizeNirmaBtechSectionParam).mockReturnValue('intake');
    vi.mocked(getNirmaBtechSection).mockResolvedValue(payload);
    const event = { pathParameters: { section: 'intake' } } as unknown as APIGatewayProxyEvent;
    const res = await admissionsNirmaBtechSection(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
    expect(getNirmaBtechSection).toHaveBeenCalledWith('intake');
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(normalizeNirmaBtechSectionParam).mockReturnValue('intake');
    vi.mocked(getNirmaBtechSection).mockResolvedValue(null);
    const event = { pathParameters: { section: 'intake' } } as unknown as APIGatewayProxyEvent;
    const res = await admissionsNirmaBtechSection(event);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse Nirma B.Tech admissions page',
    });
  });
});
