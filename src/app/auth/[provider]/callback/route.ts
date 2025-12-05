import { NextRequest, NextResponse } from 'next/server';
import {
  describeMissingEnv,
  exchangeCodeForTokens,
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
  return segments[1] ?? undefined; // /auth/{provider}/callback
}

function renderPage(
  title: string,
  body: string,
  options?: { status?: number; showHomeLink?: boolean },
) {
  const showHomeLink = options?.showHomeLink ?? false;
  const homeLink = showHomeLink
    ? '<p style="margin-top:16px;"><a href="/" style="color:#2563eb;">Return home</a></p>'
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
      .card { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px -10px rgba(15, 23, 42, 0.25); }
      h1 { margin-top: 0; margin-bottom: 12px; font-size: 24px; }
      p { margin: 0; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${body}</p>
      ${homeLink}
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status: options?.status ?? 200,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const providerId = resolveProviderId(request, params);
  const provider = providerId ? getProviderConfig(providerId) : null;

  if (!provider) {
    const isDev = process.env.NODE_ENV !== 'production';
    return renderPage(
      'Provider not supported',
      `Unsupported provider "${providerId ?? 'undefined'}".`,
      { status: 404, showHomeLink: isDev },
    );
  }

  const envResult = loadProviderEnv(provider.id);

  if (!envResult.ok) {
    console.error(
      `[callback] Missing credentials for ${provider.id}: ${describeMissingEnv(
        envResult.missing,
      )}`,
    );
    const isDev = process.env.NODE_ENV !== 'production';
    return renderPage(
      'Missing credentials',
      `Missing credentials: ${describeMissingEnv(envResult.missing)}.`,
      { status: 500, showHomeLink: isDev },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const providerError = searchParams.get('error');
  const code = searchParams.get('code');

  if (providerError) {
    console.error(
      `[callback] Provider returned an error for ${provider.id}: ${providerError}`,
    );
    const isDev = process.env.NODE_ENV !== 'production';
    return renderPage(
      'Authorization failed',
      `Provider returned an error: ${providerError}`,
      { status: 400, showHomeLink: isDev },
    );
  }

  if (!code) {
    console.error(`[callback] Missing authorization code for ${provider.id}`);
    const isDev = process.env.NODE_ENV !== 'production';
    return renderPage(
      'Missing authorization code',
      'Authorization code was not provided.',
      { status: 400, showHomeLink: isDev },
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(provider, envResult.env, code);
    console.log(`[callback] Tokens received for ${provider.id}`, tokens);

    return renderPage(
      'Authentication complete',
      'Tokens received and logged to the server console. You can close this page now.',
    );
  } catch (error) {
    console.error(`[callback] Token exchange failed for ${provider.id}`, error);
    const isDev = process.env.NODE_ENV !== 'production';
    return renderPage(
      'Token exchange failed',
      'An error occurred while exchanging the authorization code for tokens.',
      { status: 500, showHomeLink: isDev },
    );
  }
}
