import { NextRequest, NextResponse } from 'next/server';
import {
  describeMissingEnv,
  exchangeCodeForTokens,
  getProviderConfig,
  loadProviderEnv,
} from '@/lib/oauth';

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

type ResolvedParams = {
  provider?: string;
};

type ParsedState = {
  extensionId?: string;
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

function resolveProviderId(request: NextRequest, params?: ResolvedParams) {
  const fromParams = params?.provider;
  if (fromParams) return fromParams;
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  return segments[1] ?? undefined; // /auth/{provider}/callback
}

function renderCardPage(
  title: string,
  message: string,
  options: {
    status?: number;
    providerId?: string;
    outcome?: ProviderOutcome;
    showHomeLink?: boolean;
    script?: string;
  } = {},
) {
  const {
    status = 200,
    providerId,
    outcome = 'unknown',
    showHomeLink = false,
    script,
  } = options;
  const imageSrc = getProviderResultImage(providerId, outcome);
  const homeLink = showHomeLink
    ? '<p class="home"><a href="/">Return home</a></p>'
    : '';
  const scriptTag = script ? `<script>${script}</script>` : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
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
      <div class="message">${message}</div>
      ${homeLink}
    </div>
    ${scriptTag}
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const providerId = resolveProviderId(request, params);
  const provider = providerId ? getProviderConfig(providerId) : null;

  if (!provider) {
    const isDev = process.env.NODE_ENV !== 'production';
    return renderCardPage(
      'Provider not supported',
      `Unsupported provider "${providerId ?? 'undefined'}".`,
      {
        status: 404,
        showHomeLink: isDev,
        providerId,
        outcome: 'unknown',
      },
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
    return renderCardPage(
      'Missing credentials',
      `Missing credentials: ${describeMissingEnv(envResult.missing)}.`,
      {
        status: 500,
        showHomeLink: isDev,
        providerId,
        outcome: 'failure',
      },
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
    return renderCardPage(
      'Authorization failed',
      `Provider returned an error: ${providerError}`,
      {
        status: 400,
        showHomeLink: isDev,
        providerId,
        outcome: 'failure',
      },
    );
  }

  if (!code) {
    console.error(`[callback] Missing authorization code for ${provider.id}`);
    const isDev = process.env.NODE_ENV !== 'production';
    return renderCardPage(
      'Missing authorization code',
      'Authorization code was not provided.',
      {
        status: 400,
        showHomeLink: isDev,
        providerId,
        outcome: 'failure',
      },
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
      return renderCardPage('Token exchange failed', message, {
        status: tokenStatus ?? 400,
        showHomeLink: isDev,
        providerId,
        outcome: 'failure',
      });
    }

    const extensionId = state.extensionId;
    if (!extensionId) {
      return renderCardPage(
        'Authentication complete',
        'You can close this page now.',
        { providerId, outcome: 'success' },
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

    return renderCardPage(
      'Authentication complete',
      'Authentication complete. You can close this page now.<span id="status"></span>',
      { script, providerId, outcome: 'success' },
    );
  } catch (error) {
    console.error(`[callback] Token exchange failed for ${provider.id}`, error);
    const isDev = process.env.NODE_ENV !== 'production';
    return renderCardPage(
      'Token exchange failed',
      'An error occurred while exchanging the authorization code for tokens.',
      {
        status: 500,
        showHomeLink: isDev,
        providerId,
        outcome: 'failure',
      },
    );
  }
}
