import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/pdeu/admissions.service.js', () => ({
  getAdmissionDetails: vi.fn(),
  getAllAdmissionPrograms: vi.fn(),
}));

import { admissionsPdeuAllIndia, admissionsPdeuPrograms } from './admissions-handler.js';
import {
  getAdmissionDetails,
  getAllAdmissionPrograms,
} from '../../services/pdeu/admissions.service.js';

describe('admissionsPdeuAllIndia', () => {
  beforeEach(() => {
    vi.mocked(getAdmissionDetails).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const row = { category: 'All India', startDate: '1', lastDate: '2' };
    vi.mocked(getAdmissionDetails).mockResolvedValue(row);
    const res = await admissionsPdeuAllIndia();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(row);
    expect(getAdmissionDetails).toHaveBeenCalledWith('All India');
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getAdmissionDetails).mockResolvedValue(null);
    const res = await admissionsPdeuAllIndia();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Could not load or parse PDEU admission dates' });
  });
});

describe('admissionsPdeuPrograms', () => {
  beforeEach(() => {
    vi.mocked(getAllAdmissionPrograms).mockReset();
  });

  it('returns 200 with programs when service succeeds', async () => {
    const programs = [
      { category: 'A', startDate: null, lastDate: null },
      { category: 'B', startDate: null, lastDate: null },
    ];
    vi.mocked(getAllAdmissionPrograms).mockResolvedValue(programs);
    const res = await admissionsPdeuPrograms();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ programs });
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getAllAdmissionPrograms).mockResolvedValue(null);
    const res = await admissionsPdeuPrograms();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Could not load or parse PDEU admissions page' });
  });
});
