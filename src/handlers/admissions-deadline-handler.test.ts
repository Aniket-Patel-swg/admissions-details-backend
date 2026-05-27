import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { admissionsDeadline } from './admissions-deadline-handler.js';

describe('admissionsDeadline', () => {
  it('returns the 2026 deadlines dataset', async () => {
    const res = await admissionsDeadline({} as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('application/json');
    const body = JSON.parse(res.body) as {
      year: number;
      count: number;
      rows: unknown[];
    };
    expect(body.year).toBe(2026);
    expect(body.count).toBeGreaterThan(0);
    expect(body.rows.length).toBe(body.count);
  });
});

