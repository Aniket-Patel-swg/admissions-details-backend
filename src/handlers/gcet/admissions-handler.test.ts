import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/gcet/admission-details.service.js', () => ({
  getGcetAdmissionDetails: vi.fn(),
}));

import type { GcetAdmissionDetailsResponse } from '../../types/gcet/admissions.types.js';
import { admissionsGcetDetails } from './admissions-handler.js';
import { getGcetAdmissionDetails } from '../../services/gcet/admission-details.service.js';

describe('admissionsGcetDetails', () => {
  beforeEach(() => {
    vi.mocked(getGcetAdmissionDetails).mockReset();
  });

  it('returns 200 when service succeeds', async () => {
    const payload = { institute: 'GCET' } as unknown as GcetAdmissionDetailsResponse;
    vi.mocked(getGcetAdmissionDetails).mockResolvedValue(payload);
    const res = await admissionsGcetDetails();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getGcetAdmissionDetails).mockResolvedValue(null);
    const res = await admissionsGcetDetails();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Could not load or parse GCET admission details' });
  });
});
