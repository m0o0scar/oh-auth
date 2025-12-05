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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>Secret encrypt</li>
          </ul>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-4">
            <div className="space-y-2">
              <p className="badge badge-primary">/secret/encrypt</p>
              <h1 className="card-title text-2xl">Protect a URL with a password</h1>
              <p className="text-base-content/70">
                Enter a URL and password to generate an encrypted secret. We redirect you
                to the decrypt page with that secret.
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

            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-semibold">URL to protect</span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Accepts query param &quot;url&quot;
                  </span>
                </div>
                <input
                  type="url"
                  className="input input-bordered"
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
                  <span className="label-text font-semibold">Password</span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Accepts query param &quot;password&quot;
                  </span>
                </div>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  required
                />
              </label>

              <div className="card-actions justify-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'encrypting'}
                >
                  {status === 'encrypting' ? 'Encrypting...' : 'Encrypt and redirect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

