import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { hello } from './httpHandler.js';

describe('hello', () => {
  it('returns default greeting when name is omitted', async () => {
    const event = {} as APIGatewayProxyEvent;
    const res = await hello(event);
    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ message: 'Hello Stranger, from JS!' });
  });

  it('uses query name when provided', async () => {
    const event = {
      queryStringParameters: { name: 'Ada' },
    } as unknown as APIGatewayProxyEvent;
    const res = await hello(event);
    expect(JSON.parse(res.body)).toEqual({ message: 'Hello Ada, from JS!' });
  });
});
