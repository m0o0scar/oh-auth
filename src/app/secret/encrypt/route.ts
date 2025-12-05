import { NextRequest, NextResponse } from 'next/server';
import { encryptUrlSecret } from '@/lib/secret';

type EncryptRequestBody = {
  url?: unknown;
  password?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function buildDecryptUrl(secret: string, request: NextRequest): string {
  const url = new URL(request.url);
  url.pathname = '/secret/decrypt';
  url.search = '';
  url.searchParams.set('secret', secret);
  return url.toString();
}

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/secret/encrypt/view';
  return NextResponse.rewrite(url);
}

export async function POST(request: NextRequest) {
  let body: EncryptRequestBody;

  try {
    body = await request.json();
  } catch (error) {
    console.error(
      '[secret] Failed to parse JSON body for POST /secret/encrypt',
      error,
    );
    return jsonError('Invalid JSON payload. Expected url and password fields.');
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const password =
    typeof body.password === 'string' ? body.password.trim() : '';
  const missingFields = [];
  if (!url) missingFields.push('url');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    const suffix = missingFields.join(' and ');
    const plural = missingFields.length > 1 ? 's' : '';
    return jsonError(`Missing required field${plural}: ${suffix}.`);
  }

  try {
    const secret = await encryptUrlSecret(url, password);
    const decryptUrl = buildDecryptUrl(secret, request);
    return NextResponse.json({ url: decryptUrl });
  } catch (error) {
    console.error(
      '[secret] Failed to encrypt URL via POST /secret/encrypt',
      error,
    );
    return jsonError('Failed to encrypt URL with the provided password.', 500);
  }
}
