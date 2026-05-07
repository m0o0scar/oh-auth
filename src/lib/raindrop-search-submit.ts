const GOOGLE_SEARCH_BASE = 'https://www.google.com/search';
const GOOGLE_AI_SEARCH_BASE = 'https://www.google.com/search?udm=50&aep=11';
const GOOGLE_AI_PREFIX = '/gai';
const ABSOLUTE_WEB_URL_PATTERN = /^https?:\/\//i;

function buildGoogleSearchHref(base: string, query: string) {
  return `${base}&q=${encodeURIComponent(query)}`;
}

export function buildBookmarkSearchSubmitHref(input: string) {
  const query = input.trim();
  if (!query) {
    return null;
  }

  if (query === GOOGLE_AI_PREFIX) {
    return null;
  }

  if (ABSOLUTE_WEB_URL_PATTERN.test(query)) {
    return query;
  }

  if (query.startsWith(`${GOOGLE_AI_PREFIX} `)) {
    const googleAiQuery = query.slice(GOOGLE_AI_PREFIX.length).trim();
    if (!googleAiQuery) {
      return null;
    }

    return buildGoogleSearchHref(GOOGLE_AI_SEARCH_BASE, googleAiQuery);
  }

  return `${GOOGLE_SEARCH_BASE}?q=${encodeURIComponent(query)}`;
}
