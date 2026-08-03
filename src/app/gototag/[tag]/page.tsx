'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ensureValidRaindropTokens,
  getRaindropAuthHref,
  fetchRaindropJson,
} from '@/lib/raindrop-client';
import type { RaindropSearchResponse } from '@/lib/raindrop-api';

export default function GoToTagPage() {
  const params = useParams();
  const tag = params.tag as string;
  const [status, setStatus] = useState<'checking' | 'searching' | 'not-found' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function processRedirect() {
      try {
        const tokens = await ensureValidRaindropTokens();
        if (cancelled) return;

        if (!tokens) {
          const currentPath = window.location.pathname + window.location.search;
          window.location.replace(getRaindropAuthHref(currentPath));
          return;
        }

        setStatus('searching');

        // Search for the tag, Raindrop search uses #tag for tags
        // Be sure to encode the query properly
        const query = `#${tag}`;
        const response = await fetchRaindropJson<RaindropSearchResponse>(
          `/api/raindrop/search?q=${encodeURIComponent(query)}`,
          tokens
        );
        if (cancelled) return;

        if (response.items && response.items.length > 0) {
          const firstItem = response.items[0];
          const url = new URL(firstItem.link);
          const currentSearch = new URLSearchParams(window.location.search);

          currentSearch.forEach((value, key) => {
            url.searchParams.set(key, value);
          });

          window.location.replace(url.toString());
        } else {
          setStatus('not-found');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setStatus('error');
        }
      }
    }

    processRedirect();

    return () => {
      cancelled = true;
    };
  }, [tag]);

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <p className="text-xl">Checking authentication...</p>
      </div>
    );
  }

  if (status === 'searching') {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <p className="text-xl">Searching for tag <strong>#{tag}</strong>...</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Not Found</h1>
          <p className="text-xl">No Raindrop item found with tag <strong>#{tag}</strong>.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <div className="text-center text-red-600">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}
