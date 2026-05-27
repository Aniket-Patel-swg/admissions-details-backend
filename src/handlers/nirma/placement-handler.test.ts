import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/nirma/placement-reports.service.js', () => ({
  getNirmaPlacementReports: vi.fn(),
}));
vi.mock('../../services/nirma/placement-statistics.service.js', () => ({
  getNirmaPlacementStats: vi.fn(),
}));

import type {
  NirmaBtechPlacementStatsPayload,
  NirmaPlacementReportsPayload,
} from '../../types/nirma/placement.types.js';
import { placementsNirmaBtechStatistics, placementsNirmaReports } from './placement-handler.js';
import { getNirmaPlacementReports } from '../../services/nirma/placement-reports.service.js';
import { getNirmaPlacementStats } from '../../services/nirma/placement-statistics.service.js';

describe('placementsNirmaReports', () => {
  beforeEach(() => {
    vi.mocked(getNirmaPlacementReports).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const payload: NirmaPlacementReportsPayload = {
      college: 'nirma',
      institute: 'management',
      page: 'placement_reports',
      data: [],
    };
    vi.mocked(getNirmaPlacementReports).mockResolvedValue(payload);
    const res = await placementsNirmaReports();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getNirmaPlacementReports).mockResolvedValue(null);
    const res = await placementsNirmaReports();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse Nirma management placement reports page',
    });
  });
});

describe('placementsNirmaBtechStatistics', () => {
  beforeEach(() => {
    vi.mocked(getNirmaPlacementStats).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const payload: NirmaBtechPlacementStatsPayload = {
      college: 'nirma',
      institute: 'technology',
      page: 'btech_placement_statistics',
      marquee_text: null,
      sections: { current_year: null, year_wise: null },
    };
    vi.mocked(getNirmaPlacementStats).mockResolvedValue(payload);
    const res = await placementsNirmaBtechStatistics();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getNirmaPlacementStats).mockResolvedValue(null);
    const res = await placementsNirmaBtechStatistics();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse Nirma technology placement statistics page',
    });
  });
});
