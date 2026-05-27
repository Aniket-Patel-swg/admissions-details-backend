import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/ldce/ug-programs.service.js', () => ({
  getLdceUgPrograms: vi.fn(),
}));

import type { LdceUgProgramsResponse } from '../../types/ldce/ug-programs.types.js';
import { admissionsLdceUgPrograms } from './admissions-handler.js';
import { getLdceUgPrograms } from '../../services/ldce/ug-programs.service.js';

describe('admissionsLdceUgPrograms', () => {
  beforeEach(() => {
    vi.mocked(getLdceUgPrograms).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const payload: LdceUgProgramsResponse = {
      sourceUrl: 'https://ldce.ac.in/admissions/ug-programs',
      infoItems: [],
      programs: [
        {
          serial: 1,
          name: 'Test',
          courseUrl: null,
          periodYears: 4,
          intake: 10,
        },
      ],
      totalIntake: 10,
    };
    vi.mocked(getLdceUgPrograms).mockResolvedValue(payload);
    const res = await admissionsLdceUgPrograms();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getLdceUgPrograms).mockResolvedValue(null);
    const res = await admissionsLdceUgPrograms();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse LDCE undergraduate programs / intake',
    });
  });
});
