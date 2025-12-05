'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { decryptUrlSecret } from '@/lib/secret';

type DecryptStatus = 'idle' | 'decrypting';

function DecryptPageContent() {
  const searchParams = useSearchParams();
  const [secret, setSecret] = useState(() => searchParams.get('secret') ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<DecryptStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [showSecretInput, setShowSecretInput] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const param = searchParams.get('secret');
    if (param && param !== secret) {
      setSecret(param);
      setError(null);
      setResolvedUrl(null);
    }
  }, [searchParams, secret]);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const missingSecret = secret.trim().length === 0;
  const secretInputOpen = missingSecret || showSecretInput;
  const statusBadgeClass =
    status === 'decrypting'
      ? 'badge-warning'
      : missingSecret
      ? 'badge-ghost'
      : 'badge-success';
  const statusLabel =
    status === 'decrypting'
      ? 'Decrypting'
      : missingSecret
      ? 'Awaiting secret'
      : 'Ready to decrypt';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (missingSecret) {
      setError('A secret is required before decryption can begin.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required to decrypt the secret.');
      return;
    }

    setStatus('decrypting');
    setError(null);
    setResolvedUrl(null);

    try {
      const url = await decryptUrlSecret(secret.trim(), password.trim());
      setResolvedUrl(url);
    } catch (err) {
      console.error('[secret] Failed to decrypt secret', err);
      setError('Incorrect password or invalid secret.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="mb-6 flex items-center gap-2 text-sm text-base-content/70">
          <Link href="/" className="link-hover link">
            ← Home
          </Link>
          <span className="text-base-content/50">/secret/decrypt</span>
        </div>

        <div className="space-y-5 rounded-2xl border border-base-300/70 bg-base-100/90 p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary">Decrypt</span>
                <span className={`badge ${statusBadgeClass}`}>
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Unlock a protected URL
              </h1>
              <p className="max-w-2xl text-base-content/70">
                Enter the secret and password to reveal the original
                destination.
              </p>
            </div>
            <div className="rounded-lg bg-base-200/70 px-3 py-2 text-xs font-semibold text-base-content/80">
              Stays on your device
            </div>
          </div>

          {missingSecret ? (
            <div className="alert alert-warning">
              <span>
                A <code>secret</code> query parameter is required before
                decryption can begin.
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : null}

          {resolvedUrl ? (
            <div className="alert alert-success">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-base-content">
                    Decryption successful
                  </p>
                  <a
                    className="link link-primary break-all"
                    href={resolvedUrl}
                    target="_self"
                    rel="noreferrer"
                  >
                    {resolvedUrl}
                  </a>
                </div>
                <a
                  className="btn btn-success btn-sm sm:btn-md"
                  href={resolvedUrl}
                  target="_self"
                  rel="noreferrer"
                >
                  Open URL
                </a>
              </div>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-base-content">
                    Encrypted secret
                  </span>
                  <span className="text-xs text-base-content/60">
                    Query: secret
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setShowSecretInput((prev) => !prev);
                  }}
                >
                  {secretInputOpen
                    ? 'Hide secret'
                    : secret
                    ? 'Edit secret'
                    : 'Paste secret'}
                </button>
              </div>

              {secretInputOpen ? (
                <textarea
                  className="textarea textarea-bordered min-h-32 w-full font-mono"
                  placeholder="Paste the secret from /secret/encrypt"
                  value={secret}
                  onChange={(event) => {
                    setSecret(event.target.value);
                    setError(null);
                    setResolvedUrl(null);
                  }}
                  required
                />
              ) : (
                <div className="rounded-lg border border-dashed border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                  {secret
                    ? 'Secret loaded from the URL. Tap “Edit secret” to view or replace.'
                    : 'Secret hidden. Tap “Paste secret” to provide one.'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-base-content">
                Password
              </span>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Enter password used to encrypt"
                value={password}
                ref={passwordInputRef}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-base-content/70">
                Nothing leaves your browser. Share the password separately from
                the secret.
              </p>
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={status === 'decrypting'}
              >
                {status === 'decrypting' ? 'Decrypting...' : 'Decrypt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function DecryptPageFallback() {
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

export default function DecryptPage() {
  return (
    <Suspense fallback={<DecryptPageFallback />}>
      <DecryptPageContent />
    </Suspense>
  );
}
