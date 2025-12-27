import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { buildAuthorizationUrl, getProviderConfig } from '@/lib/oauth';

describe('buildAuthorizationUrl', () => {
  it('throws an error for unsupported scopes', () => {
    const provider = getProviderConfig('google');
    const env = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/auth/google/callback',
    };
    const state = 'test-state';
    const request = new NextRequest(
      'http://localhost:3000/auth/google?scope=https://www.googleapis.com/auth/calendar',
    );

    assert.throws(
      () => buildAuthorizationUrl(provider!, env, state, request),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'Unsupported scope(s) requested: https://www.googleapis.com/auth/calendar. Supported scopes are: openid, email, profile',
        );
        return true;
      },
    );
  });

  it('builds the authorization URL with valid scopes', () => {
    const provider = getProviderConfig('google');
    const env = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/auth/google/callback',
    };
    const state = 'test-state';
    const request = new NextRequest(
      'http://localhost:3000/auth/google?scope=openid%20profile',
    );

    const authUrl = buildAuthorizationUrl(provider!, env, state, request);
    const url = new URL(authUrl);

    assert.strictEqual(url.searchParams.get('scope'), 'openid profile');
  });
});
