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

type ParsedState = {
  extensionId?: string;
};

function parseState(state: string | null): ParsedState {
  if (!state) return {};
  try {
    const parsed = JSON.parse(state);
    if (parsed && typeof parsed === 'object' && 'extensionId' in parsed) {
      const extensionId = (parsed as Record<string, unknown>).extensionId;
      if (typeof extensionId === 'string' && extensionId.trim().length > 0) {
        return { extensionId };
      }
    }
  } catch (error) {
    console.error('[callback] Failed to parse state', error);
  }
  return {};
}

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
  options?: { status?: number; showHomeLink?: boolean; script?: string },
) {
  const showHomeLink = options?.showHomeLink ?? false;
  const homeLink = showHomeLink
    ? '<p style="margin-top:16px;"><a href="/" style="color:#2563eb;">Return home</a></p>'
    : '';
  const script = options?.script ? `<script>${options.script}</script>` : '';

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
    ${script}
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
  const stateParam = searchParams.get('state');
  const state = parseState(stateParam);

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

    const tokenObject =
      tokens && typeof tokens === 'object'
        ? (tokens as Record<string, unknown>)
        : null;
    const tokenStatus =
      tokenObject && typeof tokenObject.status === 'number'
        ? tokenObject.status
        : null;
    const tokenErrorMessage =
      tokenObject && typeof tokenObject.errorMessage === 'string'
        ? tokenObject.errorMessage
        : tokenObject && typeof tokenObject.error === 'string'
        ? (tokenObject.error as string)
        : null;
    const tokenFailed =
      (tokenObject && tokenObject.result === false) ||
      (tokenStatus !== null && tokenStatus >= 400);

    if (tokenFailed || tokenErrorMessage) {
      const message =
        tokenErrorMessage ??
        'The provider returned an error while exchanging the code for tokens.';
      console.error(
        `[callback] Token exchange returned an error payload for ${provider.id}`,
        tokens,
      );
      const isDev = process.env.NODE_ENV !== 'production';
      return renderPage('Token exchange failed', message, {
        status: tokenStatus ?? 400,
        showHomeLink: isDev,
      });
    }

    const extensionId = state.extensionId;
    if (!extensionId) {
      return renderPage(
        'Authentication complete',
        'Tokens received and logged to the server console. You can close this page now.',
      );
    }

    const tokenPayload =
      tokens && typeof tokens === 'object'
        ? {
            access_token: (tokens as Record<string, unknown>).access_token,
            refresh_token: (tokens as Record<string, unknown>).refresh_token,
            expires_in: (tokens as Record<string, unknown>).expires_in,
          }
        : {};

    const script = `
      (() => {
        const payload = ${JSON.stringify({
          type: 'oauth_success',
          provider: provider.id,
          tokens: tokenPayload,
        })};
        const extensionId = ${JSON.stringify(extensionId)};
        const statusEl = document.getElementById('status');
        if (!window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          if (statusEl) statusEl.textContent = 'Chrome runtime not available. Please ensure the extension is installed and this page was opened from it.';
          return;
        }
        chrome.runtime.sendMessage(extensionId, payload, {});
      })();
    `;

    return renderPage(
      'Authentication complete',
      'Authentication complete. You can close this page now.<span id="status"></span>',
      { script },
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
