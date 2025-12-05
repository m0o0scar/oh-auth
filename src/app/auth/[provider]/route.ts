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

type ProviderOutcome = 'success' | 'failure' | 'unknown';

function getProviderResultImage(
  providerId: string | undefined,
  outcome: ProviderOutcome,
) {
  if (!providerId) return '/img/provider-not-found.png';
  const base = providerId.toLowerCase();
  if (outcome === 'success') {
    if (base === 'google') return '/img/provider-google-success.png';
    if (base === 'raindrop') return '/img/provider-raindrop-success.png';
  }
  if (outcome === 'failure') {
    if (base === 'google') return '/img/provider-google-fail.png';
    if (base === 'raindrop') return '/img/provider-raindrop-fail.png';
  }
  return '/img/provider-not-found.png';
}

function renderCardPage(
  title: string,
  message: string,
  options: {
    status?: number;
    providerId?: string;
    outcome?: ProviderOutcome;
    showHomeLink?: boolean;
  } = {},
) {
  const {
    status = 200,
    providerId,
    outcome = 'unknown',
    showHomeLink = false,
  } = options;
  const imageSrc = getProviderResultImage(providerId, outcome);
  const homeLink = showHomeLink
    ? '<p class="home"><a href="/">Return home</a></p>'
    : '';
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: #0f172a;
        padding: 24px;
      }
      .card {
        width: min(720px, 100%);
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 32px 28px;
        box-shadow: 0 24px 60px -25px rgba(15, 23, 42, 0.45);
        text-align: center;
      }
      h1 {
        margin: 0 0 20px;
        font-size: 26px;
        color: #0f172a;
      }
      .image-wrap {
        display: flex;
        justify-content: center;
        margin: 12px 0 20px;
      }
      .image-wrap img {
        max-width: 420px;
        width: 100%;
        height: auto;
        border-radius: 12px;
      }
      .message {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        color: #334155;
      }
      .home {
        margin-top: 18px;
        font-size: 14px;
      }
      .home a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 600;
      }
      .home a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <div class="image-wrap">
        <img src="${imageSrc}" alt="${title}" />
      </div>
      <p class="message">${message}</p>
      ${homeLink}
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

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
  const isDev = process.env.NODE_ENV !== 'production';

  if (!provider) {
    return renderCardPage(
      'Provider not supported',
      `Unsupported provider "${providerId ?? 'undefined'}".`,
      { status: 404, providerId, outcome: 'unknown', showHomeLink: isDev },
    );
  }

  const envResult = loadProviderEnv(provider.id);

  if (!envResult.ok) {
    console.error(
      `[auth] Missing credentials for ${provider.id}: ${describeMissingEnv(
        envResult.missing,
      )}`,
    );
    return renderCardPage(
      'Missing credentials',
      `Missing credentials: ${describeMissingEnv(envResult.missing)}.`,
      { status: 500, providerId, outcome: 'failure', showHomeLink: isDev },
    );
  }

  const providedState = request.nextUrl.searchParams.get('state');
  const state = providedState ?? crypto.randomUUID();
  const authUrl = buildAuthorizationUrl(
    provider,
    envResult.env,
    state,
    request,
  );

  return NextResponse.redirect(authUrl);
}
