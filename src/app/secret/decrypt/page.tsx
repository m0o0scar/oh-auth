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
      <div className="bg-gradient-to-br from-primary/5 via-base-200 to-secondary/10">
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
          <div className="breadcrumbs text-sm">
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>Secret decrypt</li>
            </ul>
          </div>

          <div className="card border border-base-300/70 bg-base-100/80 shadow">
            <div className="card-body gap-4 md:flex md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-primary">/secret/decrypt</span>
                  <span className={`badge ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>
                <h1 className="card-title text-3xl">Decrypt a protected URL</h1>
                <p className="max-w-2xl text-base-content/70">
                  Paste the encrypted secret and the password used during
                  encryption to reveal the original destination.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-box border border-base-300/70 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                <p className="font-semibold text-base-content">Runs locally</p>
                <p className="leading-relaxed">
                  AES-GCM decryption happens in your browser; nothing is sent to
                  a server.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr,1.15fr]">
            <section className="card border border-base-300/70 bg-base-100/95 shadow-xl">
              <div className="card-body space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="badge badge-outline badge-primary">
                    Input
                  </span>
                  <p className="text-sm text-base-content/70">
                    We keep the encrypted secret out of view by default. Toggle
                    if you need to edit.
                  </p>
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
                        className="btn btn-success btn-sm"
                        href={resolvedUrl}
                        target="_self"
                        rel="noreferrer"
                      >
                        Open URL
                      </a>
                    </div>
                  </div>
                ) : null}

                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-base-content">
                            Encrypted secret
                          </span>
                          <span className="text-xs text-base-content/60">
                            Accepts query param &quot;secret&quot;
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
                          className="textarea textarea-bordered min-h-32 grow font-mono"
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
                        <div className="grow rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                          <div className="flex h-full items-center">
                            {secret
                              ? 'Secret loaded from the URL. Click “Edit secret” to view or replace.'
                              : 'Secret hidden. Click “Paste secret” to provide one.'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-base-content">
                            Password
                          </span>
                          <span className="text-xs text-base-content/60">
                            Only you know this
                          </span>
                        </div>
                      </div>
                      <label className="input input-bordered flex items-center gap-2">
                        <span className="badge badge-outline badge-sm text-xs">
                          PW
                        </span>
                        <input
                          type="password"
                          className="grow"
                          placeholder="Enter password used to encrypt"
                          value={password}
                          ref={passwordInputRef}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setError(null);
                          }}
                          required
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-base-content/70">
                      For safety, avoid keeping the secret visible after pasting
                      unless you need to edit it.
                    </p>
                    <div className="card-actions justify-end">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={status === 'decrypting'}
                      >
                        {status === 'decrypting' ? 'Decrypting...' : 'Decrypt'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            <section className="card border border-base-300/70 bg-base-100 shadow">
              <div className="card-body space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="badge badge-outline badge-primary">
                    Guide
                  </span>
                  <span className="text-base-content">
                    Decrypt in three steps
                  </span>
                </div>
                <ol className="space-y-3 text-sm leading-relaxed text-base-content/80">
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">1</span>
                    <div>
                      <p className="font-semibold text-base-content">
                        Paste or pass the secret
                      </p>
                      <p>
                        Use the textarea or provide the <code>secret</code>{' '}
                        query param.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">2</span>
                    <div>
                      <p className="font-semibold text-base-content">
                        Enter the shared password
                      </p>
                      <p>It must match the one used during encryption.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">3</span>
                    <div>
                      <p className="font-semibold text-base-content">
                        Reveal and follow the URL
                      </p>
                      <p>We render the decrypted URL for you to open safely.</p>
                    </div>
                  </li>
                </ol>
                <div className="divider">Tips</div>
                <ul className="space-y-2 text-sm text-base-content/70">
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>
                      Secrets remain client-side; refresh to clear state.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>Keep the password out of the URL when sharing.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>
                      Longer passwords increase resistance to guessing.
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
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
