import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBackupPinnedSearchResults,
  fetchBackupPinnedSearchResultsWithDebug,
  readBearerAccessToken,
} from '@/lib/raindrop-api';

export async function GET(request: NextRequest) {
  const accessToken = readBearerAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
  }

  try {
    if (request.nextUrl.searchParams.get('debug') === '1') {
      const payload = await fetchBackupPinnedSearchResultsWithDebug(accessToken);
      return NextResponse.json(payload);
    }

    const results = await fetchBackupPinnedSearchResults(accessToken);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[api/raindrop/pinned-results] Failed to load pinned results', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load pinned Raindrop results',
      },
      { status: 500 },
    );
  }
}
