'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { encryptUrlSecret } from '@/lib/secret';

type EncryptStatus = 'idle' | 'encrypting';

export default function EncryptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [url, setUrl] = useState(() => searchParams.get('url') ?? '');
  const [password, setPassword] = useState(() => searchParams.get('password') ?? '');
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
    status === 'encrypting' ? 'Encrypting' : hasInputs ? 'Ready to encrypt' : 'Add URL & password';

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
      <div className="bg-gradient-to-br from-primary/5 via-base-200 to-secondary/10">
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
          <div className="breadcrumbs text-sm">
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>Secret encrypt</li>
            </ul>
          </div>

          <div className="card border border-base-300/70 bg-base-100/80 shadow">
            <div className="card-body gap-4 md:flex md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-primary">/secret/encrypt</span>
                  <span className={`badge ${statusBadgeClass}`}>{statusLabel}</span>
                </div>
                <h1 className="card-title text-3xl">Protect a URL with a password</h1>
                <p className="max-w-2xl text-base-content/70">
                  Enter a URL and password to generate an encrypted secret. You will be redirected
                  to the decrypt page with that secret ready to share.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-box border border-base-300/70 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                <p className="font-semibold text-base-content">Redirect-first flow</p>
                <p className="leading-relaxed">
                  After encryption we immediately send you to <code>/secret/decrypt</code> with the
                  secret prefilled.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr,1.15fr]">
            <section className="card border border-base-300/70 bg-base-100 shadow">
              <div className="card-body space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="badge badge-outline badge-primary">Guide</span>
                  <span className="text-base-content">Create & share safely</span>
                </div>
                <ol className="space-y-3 text-sm leading-relaxed text-base-content/80">
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">1</span>
                    <div>
                      <p className="font-semibold text-base-content">Provide the URL</p>
                      <p>Only the exact string you submit will be encrypted.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">2</span>
                    <div>
                      <p className="font-semibold text-base-content">Pick a strong password</p>
                      <p>Use a phrase you can share outside the URL.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="badge badge-sm badge-primary">3</span>
                    <div>
                      <p className="font-semibold text-base-content">Share the secret</p>
                      <p>We redirect with the encrypted secret so you can copy it immediately.</p>
                    </div>
                  </li>
                </ol>
                <div className="divider">Automation</div>
                <ul className="space-y-2 text-sm text-base-content/70">
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>
                      Prefill with <code>?url=</code> and <code>?password=</code> to auto-encrypt.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>Avoid sharing the password in the URL when possible.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="badge badge-ghost badge-sm">•</span>
                    <span>Regenerate a new secret if the link was exposed.</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="card border border-base-300/70 bg-base-100/95 shadow-xl">
              <div className="card-body space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="badge badge-outline badge-primary">Input</span>
                  <p className="text-sm text-base-content/70">
                    We never send your URL or password to a server. Encryption runs locally.
                  </p>
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

                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control w-full">
                      <div className="label">
                        <span className="label-text font-semibold">URL to protect</span>
                        <span className="label-text-alt text-xs text-base-content/60">
                          Accepts query param &quot;url&quot;
                        </span>
                      </div>
                      <label className="input input-bordered flex items-center gap-2">
                        <span className="badge badge-outline badge-sm text-xs">URL</span>
                        <input
                          type="url"
                          className="grow"
                          placeholder="https://example.com/private"
                          value={url}
                          onChange={(event) => {
                            setUrl(event.target.value);
                            setError(null);
                          }}
                          required
                        />
                      </label>
                    </label>

                    <label className="form-control w-full">
                      <div className="label">
                        <span className="label-text font-semibold">Password</span>
                        <span className="label-text-alt text-xs text-base-content/60">
                          Accepts query param &quot;password&quot;
                        </span>
                      </div>
                      <label className="input input-bordered flex items-center gap-2">
                        <span className="badge badge-outline badge-sm text-xs">Secret</span>
                        <input
                          type="password"
                          className="grow"
                          placeholder="Enter password"
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setError(null);
                          }}
                          required
                        />
                      </label>
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-base-content/70">
                      Tip: share the password separately from the URL for better security.
                    </p>
                    <div className="card-actions justify-end">
                      <button type="submit" className="btn btn-primary" disabled={status === 'encrypting'}>
                        {status === 'encrypting' ? 'Encrypting...' : 'Encrypt and redirect'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

