import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizationUrl,
  describeMissingEnv,
  getProviderConfig,
  loadProviderEnv,
} from '@/lib/oauth';

type RouteParams = {
  params?: {
    provider?: string;
  };
};

function resolveProviderId(
  request: NextRequest,
  params?: RouteParams['params'],
) {
  const fromParams = params?.provider;
  if (fromParams) return fromParams;
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  return segments[1] ?? undefined; // /auth/{provider}
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const providerId = resolveProviderId(request, params);
  const provider = providerId ? getProviderConfig(providerId) : null;

  if (!provider) {
    return NextResponse.json(
      { error: `Unsupported provider "${providerId ?? 'undefined'}"` },
      { status: 404 },
    );
  }

  const envResult = loadProviderEnv(provider.id);

  if (!envResult.ok) {
    console.error(
      `[auth] Missing credentials for ${provider.id}: ${describeMissingEnv(
        envResult.missing,
      )}`,
    );
    return NextResponse.json(
      {
        error: `Missing credentials: ${describeMissingEnv(envResult.missing)}`,
      },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const authUrl = buildAuthorizationUrl(
    provider,
    envResult.env,
    state,
    request,
  );

  return NextResponse.redirect(authUrl);
}
