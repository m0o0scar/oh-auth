'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { decryptUrlSecret } from '@/lib/secret';

type DecryptStatus = 'idle' | 'decrypting';

export default function DecryptPage() {
  const searchParams = useSearchParams();
  const [secret, setSecret] = useState(() => searchParams.get('secret') ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<DecryptStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get('secret');
    if (param && param !== secret) {
      setSecret(param);
      setError(null);
      setResolvedUrl(null);
    }
  }, [searchParams, secret]);

  const missingSecret = secret.trim().length === 0;

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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>Secret decrypt</li>
          </ul>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-4">
            <div className="space-y-2">
              <p className="badge badge-primary">/secret/decrypt</p>
              <h1 className="card-title text-2xl">Decrypt a protected URL</h1>
              <p className="text-base-content/70">
                Paste the encrypted secret and the password used during
                encryption to reveal the original URL.
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
              <div className="alert alert-success flex flex-col gap-2">
                <span>Decryption successful.</span>
                <a
                  className="link link-primary break-all"
                  href={resolvedUrl}
                  target="_self"
                  rel="noreferrer"
                >
                  {resolvedUrl}
                </a>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-semibold">
                    Encrypted secret
                  </span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Accepts query param &quot;secret&quot;
                  </span>
                </div>
                <textarea
                  className="textarea textarea-bordered min-h-28"
                  placeholder="Paste the secret from /secret/encrypt"
                  value={secret}
                  onChange={(event) => {
                    setSecret(event.target.value);
                    setError(null);
                    setResolvedUrl(null);
                  }}
                  required
                />
              </label>

              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-semibold">Password</span>
                </div>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder="Enter password used to encrypt"
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
                  disabled={status === 'decrypting'}
                >
                  {status === 'decrypting' ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
