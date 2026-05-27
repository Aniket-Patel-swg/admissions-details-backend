import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/bvm/placement-details.service.js', () => ({
  getBvmPlacementDetails: vi.fn(),
}));

import { placementsBvmPlacementDetails } from './placement-handler.js';
import { getBvmPlacementDetails } from '../../services/bvm/placement-details.service.js';

describe('placementsBvmPlacementDetails', () => {
  beforeEach(() => {
    vi.mocked(getBvmPlacementDetails).mockReset();
  });

  it('returns 200 with data when service succeeds', async () => {
    const payload = { college: 'bvm' as const, page: 'placement_details' as const, data: [] };
    vi.mocked(getBvmPlacementDetails).mockResolvedValue(payload);
    const res = await placementsBvmPlacementDetails();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(payload);
  });

  it('returns 502 when service returns null', async () => {
    vi.mocked(getBvmPlacementDetails).mockResolvedValue(null);
    const res = await placementsBvmPlacementDetails();
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Could not load or parse BVM placement details page',
    });
  });
});
