import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/secret/encrypt/route';

function buildRequest(body: unknown) {
  return new NextRequest('https://example.test/secret/encrypt', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /secret/encrypt', () => {
  it('returns decrypt URL when url and password are provided', async () => {
    const response = await POST(
      buildRequest({
        url: 'https://example.com/private',
        password: 'super-secret',
      }),
    );

    assert.equal(response.status, 200);
    const payload = (await response.json()) as { url?: string };

    assert.ok(payload.url, 'response includes url');
    const parsed = new URL(payload.url);
    assert.equal(parsed.pathname, '/secret/decrypt');
    const secret = parsed.searchParams.get('secret');
    assert.ok(secret && secret.length > 0, 'secret is present in query');
  });

  it('returns 400 when url is missing', async () => {
    const response = await POST(buildRequest({ password: 'pw' }));
    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: string };
    assert.ok(payload.error?.toLowerCase().includes('url'));
  });

  it('returns 400 when password is missing', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }));
    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: string };
    assert.ok(payload.error?.toLowerCase().includes('password'));
  });
});
