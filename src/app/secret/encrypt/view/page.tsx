'use client';

import type { FormEvent } from 'react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { encryptUrlSecret } from '@/lib/secret';

type EncryptStatus = 'idle' | 'encrypting';

function EncryptPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [url, setUrl] = useState(() => searchParams.get('url') ?? '');
  const [password, setPassword] = useState(
    () => searchParams.get('password') ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<EncryptStatus>('idle');
  const autoHandledRef = useRef(false);
  const hasInputs = url.trim().length > 0 && password.trim().length > 0;
  const statusBadgeClass =
    status === 'encrypting'
      ? 'badge-info'
      : hasInputs
      ? 'badge-success'
      : 'badge-ghost';
  const statusLabel =
    status === 'encrypting'
      ? 'Encrypting'
      : hasInputs
      ? 'Ready to encrypt'
      : 'Add URL & password';

  const handleEncrypt = useCallback(
    async (providedUrl?: string, providedPassword?: string): Promise<void> => {
      const targetUrl = (providedUrl ?? url).trim();
      const targetPassword = (providedPassword ?? password).trim();

      if (!targetUrl || !targetPassword) {
        setError('Both URL and password are required.');
        return;
      }

      setStatus('encrypting');
      setError(null);

      try {
        const secret = await encryptUrlSecret(targetUrl, targetPassword);
        router.replace(`/secret/decrypt?secret=${encodeURIComponent(secret)}`);
      } catch (err) {
        console.error('[secret] Failed to encrypt URL', err);
        setError('Failed to encrypt. Please try again.');
        autoHandledRef.current = false;
      } finally {
        setStatus('idle');
      }
    },
    [password, router, url],
  );

  useEffect(() => {
    const queryUrl = searchParams.get('url');
    const queryPassword = searchParams.get('password');
    if (!autoHandledRef.current && queryUrl && queryPassword) {
      autoHandledRef.current = true;
      void handleEncrypt(queryUrl, queryPassword);
    }
  }, [handleEncrypt, searchParams]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleEncrypt();
  }

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="mb-6 flex items-center gap-2 text-sm text-base-content/70">
          <Link href="/" className="link-hover link">
            ← Home
          </Link>
          <span className="text-base-content/50">/secret/encrypt</span>
        </div>

        <div className="space-y-5 rounded-2xl border border-base-300/70 bg-base-100/90 p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary">Encrypt</span>
                <span className={`badge ${statusBadgeClass}`}>
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Lock a link with a password
              </h1>
              <p className="max-w-2xl text-base-content/70">
                Paste a URL, add a password, and we&apos;ll redirect you to the
                decrypt page with the secret ready to share.
              </p>
            </div>
            <div className="rounded-lg bg-base-200/70 px-3 py-2 text-xs font-semibold text-base-content/80">
              Client-side only
            </div>
          </div>

          {status === 'encrypting' ? (
            <div className="alert alert-info">
              <span>Encrypting and redirecting...</span>
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text text-sm font-semibold">
                    URL to protect
                  </span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Query: url
                  </span>
                </div>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  placeholder="https://example.com/private"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError(null);
                  }}
                  required
                />
              </label>

              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text text-sm font-semibold">
                    Password
                  </span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Query: password
                  </span>
                </div>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-base-content/70">
                We never send your URL or password to a server.
              </p>
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={status === 'encrypting'}
              >
                {status === 'encrypting'
                  ? 'Encrypting...'
                  : 'Encrypt & continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function EncryptPageFallback() {
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="flex min-h-screen items-center justify-center">
        <span
          className="loading loading-spinner loading-lg text-primary"
          aria-label="Loading"
        />
      </div>
    </main>
  );
}

export default function EncryptPage() {
  return (
    <Suspense fallback={<EncryptPageFallback />}>
      <EncryptPageContent />
    </Suspense>
  );
}
