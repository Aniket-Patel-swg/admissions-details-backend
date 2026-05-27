import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/au/admissions.service.js', () => ({
  getAuAdmissionCalendar: vi.fn(),
  getAuUgFees: vi.fn(),
}));

import type {
  AdmissionCalendarResponse,
  UgFeesResponse,
} from '../../types/au/admissions.types.js';
import { admissionsAuCalendar, admissionsAuUgFees } from './admissions-handler.js';
import { getAuAdmissionCalendar, getAuUgFees } from '../../services/au/admissions.service.js';

describe('admissionsAuCalendar', () => {
  beforeEach(() => {
    vi.mocked(getAuAdmissionCalendar).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const calendar: AdmissionCalendarResponse = {
      entries: [],
      notes: [],
      admission_url: 'https://example.test/',
    };
    vi.mocked(getAuAdmissionCalendar).mockResolvedValue(calendar);
    const res = await admissionsAuCalendar();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(calendar);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getAuAdmissionCalendar).mockResolvedValue(null);
    const res = await admissionsAuCalendar();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Could not load or parse AU admission calendar' });
  });
});

describe('admissionsAuUgFees', () => {
  beforeEach(() => {
    vi.mocked(getAuUgFees).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const fees: UgFeesResponse = {
      title: 'UG',
      currency: 'INR',
      fees: [],
      notes: [],
    };
    vi.mocked(getAuUgFees).mockResolvedValue(fees);
    const res = await admissionsAuUgFees();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(fees);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getAuUgFees).mockResolvedValue(null);
    const res = await admissionsAuUgFees();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Could not load or parse AU UG fees structure' });
  });
});
