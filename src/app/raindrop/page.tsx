'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { Nunito } from 'next/font/google';
import type {
  RaindropPinnedResultsResponse,
  RaindropSearchResponse,
  RaindropSessionDetailsResponse,
  RaindropSessionTab,
  RaindropSessionTreeNode,
  RaindropSessionWindow,
  RaindropSessionsResponse,
} from '@/lib/raindrop-api';
import {
  clearStoredRaindropTokens,
  ensureValidRaindropTokens,
  fetchRaindropJson,
  getRaindropAuthHref,
} from '@/lib/raindrop-client';
import {
  clearRaindropWorkspaceCache,
  loadCachedRaindropPinnedResults,
  saveCachedRaindropPinnedResults,
} from '@/lib/raindrop-workspace-cache';
import {
  areStoredProviderTokensEqual,
  type StoredProviderTokens,
} from '@/lib/raindrop-web-auth';
import {
  getPinnedResultColor,
  getPinnedResultIcon,
  toPinnedRaindropResult,
  type PinnedRaindropResult,
} from '@/lib/raindrop-pins';
import { getCycledSearchResultIndex } from '@/lib/raindrop-search-navigation';
import { buildBookmarkSearchSubmitHref } from '@/lib/raindrop-search-submit';
import styles from './page.module.css';

type AuthState = 'checking' | 'redirecting' | 'ready' | 'error';
const RAINDROP_ICON_HREF = '/img/provider-raindrop-icon.png';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

type SearchResult =
  | {
      type: 'raindrop';
      data: RaindropSearchResponse['items'][number];
    }
  | {
      type: 'raindrop-collection';
      data: RaindropSearchResponse['collections'][number];
    };

function formatTimestamp(value?: string) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getCollectionHref(collectionId: number) {
  return `https://app.raindrop.io/my/${collectionId}`;
}

function createHeadIconLink(rel: string, href: string) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  link.type = 'image/png';
  return link;
}

function buildSearchResults(response: RaindropSearchResponse | null) {
  if (!response) {
    return [];
  }

  return [
    ...response.items.map(
      (item) =>
        ({
          type: 'raindrop',
          data: item,
        }) satisfies SearchResult,
    ),
    ...response.collections.map(
      (collection) =>
        ({
          type: 'raindrop-collection',
          data: collection,
        }) satisfies SearchResult,
    ),
  ];
}

function getSearchResultHref(result: SearchResult) {
  if (result.type === 'raindrop') {
    return result.data.link;
  }

  return getCollectionHref(result.data._id);
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function SearchResultRow({
  icon,
  href,
  title,
  subtitle,
  badges,
  selected = false,
  resultId,
  resultRef,
  onClick,
}: {
  icon: string;
  href: string;
  title: string;
  subtitle: string;
  badges: ReactNode;
  selected?: boolean;
  resultId?: string;
  resultRef?: (node: HTMLAnchorElement | null) => void;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <div
      className={`${styles.resultCard} ${selected ? styles.resultCardSelected : ''}`}
    >
      <a
        id={resultId}
        ref={resultRef}
        href={href}
        rel="noreferrer"
        className={styles.resultLink}
        role="option"
        aria-selected={selected}
        onClick={onClick}
      >
        <div className={styles.resultTopRow}>
          <span className={styles.resultLeadingIcon}>{icon}</span>
          <span className={styles.resultTitle}>{title}</span>
          <div className={styles.resultBadges}>{badges}</div>
        </div>
        <p className={styles.resultSubtitle}>{subtitle}</p>
      </a>
    </div>
  );
}

function SearchResults({
  results,
  query,
  searching,
  error,
  selectedIndex,
  getResultRef,
  onResultClick,
}: {
  results: SearchResult[];
  query: string;
  searching: boolean;
  error: string | null;
  selectedIndex: number | null;
  getResultRef: (index: number) => (node: HTMLAnchorElement | null) => void;
  onResultClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  if (query.trim().length < 3) {
    return null;
  }

  if (searching) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-base-300/80 px-4 py-7 text-sm text-base-content/70">
        <span className="loading loading-spinner loading-sm" />
        Searching Raindrop...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-6 text-sm text-error">
        {error}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300/80 px-4 py-7 text-center text-sm text-base-content/60">
        No results found.
      </div>
    );
  }

  return (
    <div className={styles.resultsList} role="listbox" id="raindrop-search-results">
      {results.map((result, index) => {
        const href = getSearchResultHref(result);
        const selected = index === selectedIndex;

        if (result.type === 'raindrop') {
          return (
            <SearchResultRow
              key={`item-${result.data._id}`}
              icon="💧"
              href={href}
              title={result.data.title || result.data.link}
              subtitle={result.data.link}
              selected={selected}
              resultId={`raindrop-search-result-${index}`}
              resultRef={getResultRef(index)}
              badges={
                result.data.collectionTitle ? (
                  <span className="badge badge-sm badge-ghost">
                    {result.data.collectionTitle}
                  </span>
                ) : null
              }
              onClick={onResultClick}
            />
          );
        }

        return (
          <SearchResultRow
            key={`collection-${result.data._id}`}
            href={href}
            icon="📥"
            title={result.data.title}
            subtitle="Open collection in Raindrop"
            selected={selected}
            resultId={`raindrop-search-result-${index}`}
            resultRef={getResultRef(index)}
            badges={
              <>
                {typeof result.data.count === 'number' ? (
                  <span className="badge badge-sm badge-ghost">
                    {result.data.count}
                  </span>
                ) : null}
                {result.data.parentCollectionTitle ? (
                  <span className="badge badge-sm badge-ghost">
                    {result.data.parentCollectionTitle}
                  </span>
                ) : null}
              </>
            }
            onClick={onResultClick}
          />
        );
      })}
    </div>
  );
}

function PinnedResults({
  results,
  loading,
  error,
}: {
  results: PinnedRaindropResult[];
  loading: boolean;
  error: string | null;
}) {
  let content: ReactNode;

  if (loading && results.length === 0) {
    content = (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-base-300/80 px-4 py-7 text-sm text-base-content/70">
        <span className="loading loading-spinner loading-sm" />
        Loading pinned results...
      </div>
    );
  } else if (error && results.length === 0) {
    content = (
      <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-6 text-sm text-error">
        {error}
      </div>
    );
  } else if (results.length === 0) {
    content = (
      <div className="rounded-2xl border border-dashed border-base-300/80 px-4 py-7 text-center text-sm text-base-content/60">
        No pinned results found in Raindrop backup.
      </div>
    );
  } else {
    content = (
      <div className={styles.pinnedTags}>
        {results.map((result, index) => {
          const colors = getPinnedResultColor(result.href);

          return (
            <a
              key={result.key}
              href={result.href}
              rel="noreferrer"
              className={styles.pinnedTag}
              style={
                {
                  '--pinned-tag-bg': colors.bg,
                  '--pinned-tag-text': colors.text,
                } as CSSProperties
              }
              title={result.title}
            >
              <span className={styles.pinnedTagIndex}>{index + 1}</span>
              <span className={styles.pinnedTagIcon}>{getPinnedResultIcon(result.type)}</span>
              <span className={styles.pinnedTagTitle}>{result.title}</span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.pinnedSection}>
      {content}
      {results.length > 0 && error ? (
        <div className="mt-3 rounded-2xl border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function getSessionSubtitle(session: RaindropSessionsResponse['sessions'][number]) {
  const timestamp = session.lastAction ?? session.lastUpdate;
  if (!timestamp) {
    return 'Last activity unknown';
  }

  const formatted = formatTimestamp(timestamp);
  return formatted === 'Unknown'
    ? 'Last activity unknown'
    : `Last synced ${formatted}`;
}

function getTabGroupColorStyle(color: string): CSSProperties {
  const colors: Record<string, string> = {
    grey: '#9ca3af',
    blue: '#3b82f6',
    red: '#ef4444',
    yellow: '#eab308',
    green: '#22c55e',
    pink: '#ec4899',
    purple: '#a855f7',
    cyan: '#06b6d4',
    orange: '#f97316',
  };

  return {
    '--session-group-color': colors[color] ?? colors.grey,
  } as CSSProperties;
}

function CollectionFallbackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function SessionCollectionIcon({
  cover,
  title,
}: {
  cover?: string;
  title: string;
}) {
  if (cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt=""
        className={styles.sessionCover}
        aria-hidden="true"
        title={title}
      />
    );
  }

  return <CollectionFallbackIcon />;
}

function SessionTabRow({
  tab,
}: {
  tab: RaindropSessionTab | Extract<RaindropSessionTreeNode, { type: 'tab' }>;
}) {
  return (
    <a href={tab.url} rel="noreferrer" className={styles.sessionTabRow}>
      <span className={styles.sessionTabFavicon} aria-hidden="true" />
      <span className={styles.sessionTabTitle}>
        {tab.title || 'Untitled'}
      </span>
    </a>
  );
}

function SessionGroupNode({
  group,
}: {
  group: Extract<RaindropSessionTreeNode, { type: 'group' }>;
}) {
  return (
    <div className={styles.sessionGroupNode}>
      <div
        className={styles.sessionGroupHeader}
        style={getTabGroupColorStyle(group.color)}
      >
        <span className={styles.sessionGroupColor} aria-hidden="true" />
        <span className={styles.sessionGroupTitle}>{group.title || 'Group'}</span>
      </div>
      <div className={styles.sessionGroupTabs}>
        {group.tabs.map((tab) => (
          <SessionTabRow key={`${tab.id ?? tab.url}-${tab.index}`} tab={tab} />
        ))}
      </div>
    </div>
  );
}

function SessionWindowTree({
  windowEntry,
  index,
}: {
  windowEntry: RaindropSessionWindow;
  index: number;
}) {
  return (
    <div className={styles.sessionWindow}>
      <div className={styles.sessionWindowHeader}>Window {index + 1}</div>
      <div className={styles.sessionWindowTree}>
        {windowEntry.tree.map((node) =>
          node.type === 'group' ? (
            <SessionGroupNode key={`group-${node.id}`} group={node} />
          ) : (
            <SessionTabRow key={`tab-${node.id ?? node.url}`} tab={node} />
          ),
        )}
      </div>
    </div>
  );
}

function SessionDetails({
  details,
  loading,
  error,
}: {
  details?: RaindropSessionDetailsResponse;
  loading: boolean;
  error?: string | null;
}) {
  if (loading && !details) {
    return (
      <div className={styles.sessionDetailsState}>
        <span className="loading loading-spinner loading-xs" />
        Loading tabs...
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className={`${styles.sessionDetailsState} ${styles.sessionDetailsError}`}>
        {error}
      </div>
    );
  }

  const windows = Array.isArray(details?.windows) ? details.windows : [];
  if (windows.length === 0) {
    return (
      <div className={styles.sessionDetailsState}>
        No open tabs in this session.
      </div>
    );
  }

  return (
    <div className={styles.sessionDetails}>
      {windows.map((windowEntry, index) => (
        <SessionWindowTree
          key={windowEntry.id}
          windowEntry={windowEntry}
          index={index}
        />
      ))}
      {loading || error ? (
        <div
          className={`${styles.sessionDetailsState} ${
            error ? styles.sessionDetailsError : ''
          }`}
        >
          {error ? error : 'Refreshing tabs...'}
        </div>
      ) : null}
    </div>
  );
}

function SessionsList({
  sessions,
  loading,
  error,
  expandedSessionIds,
  detailsById,
  detailsLoadingById,
  detailsErrorById,
  onToggleSession,
}: {
  sessions: RaindropSessionsResponse['sessions'];
  loading: boolean;
  error: string | null;
  expandedSessionIds: Set<number>;
  detailsById: Record<string, RaindropSessionDetailsResponse | undefined>;
  detailsLoadingById: Record<string, boolean | undefined>;
  detailsErrorById: Record<string, string | null | undefined>;
  onToggleSession: (sessionId: number) => void;
}) {
  let content: ReactNode;

  if (loading && sessions.length === 0) {
    content = (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-base-300/80 px-4 py-7 text-sm text-base-content/70">
        <span className="loading loading-spinner loading-sm" />
        Loading sessions...
      </div>
    );
  } else if (error && sessions.length === 0) {
    content = (
      <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-6 text-sm text-error">
        {error}
      </div>
    );
  } else if (sessions.length === 0) {
    content = (
      <div className="rounded-2xl border border-dashed border-base-300/80 px-4 py-7 text-center text-sm text-base-content/60">
        No synced browser sessions found in Raindrop.
      </div>
    );
  } else {
    content = (
      <div className={styles.sessionsList}>
        {sessions.map((session) => {
          const expanded = expandedSessionIds.has(session.id);
          const sessionKey = String(session.id);

          return (
            <div key={session.id} className={styles.sessionItem}>
              <button
                type="button"
                className={styles.sessionCard}
                title={session.title}
                aria-expanded={expanded}
                aria-controls={`session-details-${session.id}`}
                onClick={() => onToggleSession(session.id)}
              >
                <span className={styles.sessionIcon} aria-hidden="true">
                  <SessionCollectionIcon
                    cover={session.cover}
                    title={session.title}
                  />
                </span>
                <span className={styles.sessionBody}>
                  <span className={styles.sessionTitle}>{session.title}</span>
                  <span className={styles.sessionSubtitle}>
                    {getSessionSubtitle(session)}
                  </span>
                </span>
                <span
                  className={`${styles.sessionChevron} ${
                    expanded ? styles.sessionChevronExpanded : ''
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              <a
                href={session.href}
                rel="noreferrer"
                className={styles.sessionOpenLink}
                aria-label={`Open ${session.title} in Raindrop`}
                title="Open collection in Raindrop"
              >
                ↗
              </a>
              {expanded ? (
                <div
                  id={`session-details-${session.id}`}
                  className={styles.sessionDetailsWrap}
                >
                  <SessionDetails
                    details={detailsById[sessionKey]}
                    loading={Boolean(detailsLoadingById[sessionKey])}
                    error={detailsErrorById[sessionKey]}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className={styles.sessionsSection} aria-labelledby="sessions-heading">
      <div className={styles.sectionHeader}>
        <h2 id="sessions-heading" className={styles.sectionTitle}>
          Sessions
        </h2>
      </div>
      {content}
      {sessions.length > 0 && (loading || error) ? (
        <div
          className={`mt-3 rounded-2xl px-3 py-2 text-xs ${
            error
              ? 'border border-error/20 bg-error/5 text-error'
              : 'border border-base-300/80 bg-base-100/70 text-base-content/55'
          }`}
        >
          {error ? error : 'Refreshing sessions...'}
        </div>
      ) : null}
    </section>
  );
}

export default function RaindropPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<StoredProviderTokens | null>(null);
  const [query, setQuery] = useState('');
  const [searchResponse, setSearchResponse] =
    useState<RaindropSearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number | null>(
    null,
  );
  const [pinnedResults, setPinnedResults] = useState<PinnedRaindropResult[]>(() =>
    loadCachedRaindropPinnedResults().map(toPinnedRaindropResult),
  );
  const [pinnedResultsLoading, setPinnedResultsLoading] = useState(false);
  const [pinnedResultsError, setPinnedResultsError] = useState<string | null>(
    null,
  );
  const [sessions, setSessions] = useState<RaindropSessionsResponse['sessions']>(
    [],
  );
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [sessionDetailsById, setSessionDetailsById] = useState<
    Record<string, RaindropSessionDetailsResponse | undefined>
  >({});
  const [sessionDetailsLoadingById, setSessionDetailsLoadingById] = useState<
    Record<string, boolean | undefined>
  >({});
  const [sessionDetailsErrorById, setSessionDetailsErrorById] = useState<
    Record<string, string | null | undefined>
  >({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const searchResults = useMemo(
    () => buildSearchResults(searchResponse),
    [searchResponse],
  );
  const showSearchResults = query.trim().length >= 3;

  function syncResolvedTokens(nextTokens: StoredProviderTokens) {
    setTokens((current) =>
      areStoredProviderTokensEqual(current, nextTokens) ? current : nextTokens,
    );
    setAuthError(null);
    setAuthState('ready');
  }

  async function resolveTokens() {
    try {
      const nextTokens = await ensureValidRaindropTokens();
      if (!nextTokens) {
        setAuthState('redirecting');
        window.location.replace(getRaindropAuthHref('/raindrop'));
        return null;
      }

      syncResolvedTokens(nextTokens);
      return nextTokens;
    } catch (error) {
      setAuthState('error');
      setAuthError(
        error instanceof Error ? error.message : 'Failed to validate login',
      );
      return null;
    }
  }

  async function loadPinnedResults() {
    setPinnedResultsLoading(true);
    setPinnedResultsError(null);

    try {
      const nextTokens = await resolveTokens();
      if (!nextTokens) {
        return;
      }

      const response = await fetchRaindropJson<RaindropPinnedResultsResponse>(
        '/api/raindrop/pinned-results',
        nextTokens,
      );
      saveCachedRaindropPinnedResults(response.results);
      setPinnedResults(response.results.map(toPinnedRaindropResult));
    } catch (error) {
      setPinnedResultsError(
        error instanceof Error
          ? error.message
          : 'Failed to load pinned results',
      );
    } finally {
      setPinnedResultsLoading(false);
    }
  }

  async function loadSessions() {
    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const nextTokens = await resolveTokens();
      if (!nextTokens) {
        return;
      }

      const response = await fetchRaindropJson<RaindropSessionsResponse>(
        '/api/raindrop/sessions',
        nextTokens,
      );
      setSessions(response.sessions);
      setExpandedSessionIds((current) => {
        const validIds = new Set(response.sessions.map((session) => session.id));
        return new Set(Array.from(current).filter((id) => validIds.has(id)));
      });
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : 'Failed to load sessions',
      );
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadSessionDetails(sessionId: number) {
    const sessionKey = String(sessionId);
    setSessionDetailsLoadingById((current) => ({
      ...current,
      [sessionKey]: true,
    }));
    setSessionDetailsErrorById((current) => ({
      ...current,
      [sessionKey]: null,
    }));

    try {
      const nextTokens = await resolveTokens();
      if (!nextTokens) {
        return;
      }

      const details = await fetchRaindropJson<RaindropSessionDetailsResponse>(
        `/api/raindrop/sessions/${sessionId}`,
        nextTokens,
      );
      setSessionDetailsById((current) => ({
        ...current,
        [sessionKey]: details,
      }));
    } catch (error) {
      setSessionDetailsErrorById((current) => ({
        ...current,
        [sessionKey]:
          error instanceof Error ? error.message : 'Failed to load session tabs',
      }));
    } finally {
      setSessionDetailsLoadingById((current) => ({
        ...current,
        [sessionKey]: false,
      }));
    }
  }

  function handleToggleSession(sessionId: number) {
    const sessionKey = String(sessionId);
    const isExpanded = expandedSessionIds.has(sessionId);

    setExpandedSessionIds((current) => {
      const next = new Set(current);
      if (isExpanded) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });

    if (
      !isExpanded &&
      !sessionDetailsById[sessionKey] &&
      !sessionDetailsLoadingById[sessionKey]
    ) {
      void loadSessionDetails(sessionId);
    }
  }

  function handleReconnect() {
    clearStoredRaindropTokens();
    clearRaindropWorkspaceCache();
    setAuthState('redirecting');
    window.location.replace(getRaindropAuthHref('/raindrop'));
  }

  function handleLogout() {
    clearStoredRaindropTokens();
    clearRaindropWorkspaceCache();
    setTokens(null);
    setSearchResponse(null);
    setPinnedResults([]);
    setPinnedResultsLoading(false);
    setPinnedResultsError(null);
    setSessions([]);
    setSessionsLoading(false);
    setSessionsError(null);
    setExpandedSessionIds(new Set());
    setSessionDetailsById({});
    setSessionDetailsLoadingById({});
    setSessionDetailsErrorById({});
    window.location.replace('/');
  }

  useEffect(() => {
    const selector =
      'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';
    const expectedHref = new URL(
      RAINDROP_ICON_HREF,
      window.location.origin,
    ).href;
    const desiredRels = ['icon', 'shortcut icon', 'apple-touch-icon'] as const;
    const previousIcons = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>(selector),
    ).map((node) => node.cloneNode(true) as HTMLLinkElement);
    let syncing = false;

    const syncIcons = () => {
      if (syncing) {
        return;
      }

      syncing = true;
      try {
        document.head
          .querySelectorAll<HTMLLinkElement>(selector)
          .forEach((node) => {
            if (node.href !== expectedHref || !desiredRels.includes(node.rel as (typeof desiredRels)[number])) {
              node.remove();
            }
          });

        desiredRels.forEach((rel) => {
          const existing = document.head.querySelector<HTMLLinkElement>(
            `link[rel="${rel}"][href="${expectedHref}"]`,
          );
          if (!existing) {
            document.head.appendChild(createHeadIconLink(rel, expectedHref));
          }
        });
      } finally {
        syncing = false;
      }
    };

    const observer = new MutationObserver(() => {
      syncIcons();
    });

    syncIcons();
    observer.observe(document.head, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ['href', 'rel'],
    });

    return () => {
      observer.disconnect();
      document.head.querySelectorAll(selector).forEach((node) => node.remove());
      previousIcons.forEach((node) => document.head.appendChild(node));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextTokens = await ensureValidRaindropTokens();
        if (cancelled) {
          return;
        }

        if (!nextTokens) {
          setAuthState('redirecting');
          window.location.replace(getRaindropAuthHref('/raindrop'));
          return;
        }

        syncResolvedTokens(nextTokens);
      } catch (error) {
        if (!cancelled) {
          setAuthState('error');
          setAuthError(
            error instanceof Error
              ? error.message
              : 'Failed to validate login',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState !== 'ready' || !tokens) {
      return;
    }

    void loadPinnedResults();
    void loadSessions();
    // Trigger workspace loading whenever we reach a ready authenticated state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, tokens]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSearchResponse(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setSearchError(null);

        try {
          const nextTokens = await ensureValidRaindropTokens();
          if (nextTokens) {
            syncResolvedTokens(nextTokens);
          } else {
            setAuthState('redirecting');
            window.location.replace(getRaindropAuthHref('/raindrop'));
            return;
          }

          if (!nextTokens || cancelled) {
            return;
          }

          const response = await fetchRaindropJson<RaindropSearchResponse>(
            `/api/raindrop/search?q=${encodeURIComponent(query.trim())}`,
            nextTokens,
          );

          if (!cancelled) {
            setSearchResponse(response);
          }
        } catch (error) {
          if (!cancelled) {
            setSearchError(
              error instanceof Error ? error.message : 'Failed to search',
            );
          }
        } finally {
          if (!cancelled) {
            setSearching(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    setSelectedSearchIndex(null);
  }, [query]);

  useEffect(() => {
    if (!showSearchResults || searching || searchError || searchResults.length === 0) {
      setSelectedSearchIndex(null);
      return;
    }

    setSelectedSearchIndex((current) => {
      if (current === null || current < 0 || current >= searchResults.length) {
        return null;
      }

      return current;
    });
  }, [searchError, searchResults.length, searching, showSearchResults]);

  useEffect(() => {
    if (selectedSearchIndex === null) {
      return;
    }

    searchResultRefs.current[selectedSearchIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [selectedSearchIndex]);

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!showSearchResults || searching || searchError || searchResults.length === 0) {
      if (event.key === 'Enter') {
        const submitHref = buildBookmarkSearchSubmitHref(query);
        if (submitHref) {
          event.preventDefault();
          window.location.assign(submitHref);
        }
      }

      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedSearchIndex((current) =>
        getCycledSearchResultIndex(
          current,
          event.key === 'ArrowDown' ? 'next' : 'previous',
          searchResults.length,
        ),
      );
      return;
    }

    if (event.key === 'Enter' && selectedSearchIndex !== null) {
      const selectedResult = searchResults[selectedSearchIndex];
      if (!selectedResult) {
        return;
      }

      event.preventDefault();
      window.location.assign(getSearchResultHref(selectedResult));
      return;
    }

    if (event.key === 'Enter') {
      const submitHref = buildBookmarkSearchSubmitHref(query);
      if (submitHref) {
        event.preventDefault();
        window.location.assign(submitHref);
      }
    }
  }

  if (authState === 'checking' || authState === 'redirecting') {
    return (
      <main className={`${nunito.className} ${styles.page}`}>
        <div className={styles.stateLayout}>
          <div className={`${styles.card} ${styles.stateCard}`}>
            <div className={styles.brand}>
              <Image
                src="/img/provider-raindrop-icon.png"
                alt="Raindrop"
                width={32}
                height={32}
                className={styles.brandIcon}
              />
              <span>Raindrop</span>
            </div>
            <h1 className={styles.stateTitle}>Connecting to Raindrop</h1>
            <p className={styles.stateMessage}>
              {authState === 'checking'
                ? 'Checking your saved Raindrop login.'
                : 'Redirecting you to Raindrop OAuth.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="loading loading-spinner loading-md" />
              <span className="text-sm text-base-content/60">
                Please wait...
              </span>
            </div>
            <div className={styles.stateActions}>
              <a href={getRaindropAuthHref('/raindrop')} className="btn btn-primary">
                Continue manually
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (authState === 'error') {
    return (
      <main className={`${nunito.className} ${styles.page}`}>
        <div className={styles.stateLayout}>
          <div className={`${styles.card} ${styles.stateCard}`}>
            <div className={styles.brand}>
              <Image
                src="/img/provider-raindrop-icon.png"
                alt="Raindrop"
                width={32}
                height={32}
                className={styles.brandIcon}
              />
              <span>Raindrop</span>
            </div>
            <h1 className={styles.stateTitle}>Could not validate login</h1>
            <p className={styles.stateMessage}>
              {authError ?? 'The stored Raindrop login could not be used.'}
            </p>
            <div className={styles.stateActions}>
              <button className="btn btn-primary" onClick={handleReconnect}>
                Reconnect Raindrop
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  clearStoredRaindropTokens();
                  setAuthError(null);
                  setAuthState('checking');
                  void (async () => {
                    const nextTokens = await resolveTokens();
                    if (nextTokens) {
                      await Promise.all([loadPinnedResults(), loadSessions()]);
                    }
                  })();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${nunito.className} ${styles.page}`}>
      <div className={styles.shell}>
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <Image
                src="/img/provider-raindrop-icon.png"
                alt="Raindrop"
                width={32}
                height={32}
                className={styles.brandIcon}
              />
              <span>Raindrop</span>
            </div>
            <div className={styles.headerActions}>
              <button className="btn btn-sm btn-outline" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </header>

          <div className={styles.statusRow}>
            {tokens
              ? `Signed in. Token expires ${formatTimestamp(
                  new Date(tokens.expiresAt).toISOString(),
                )}.`
              : ''}
          </div>

          <section className={styles.main}>
            <article
              className={`${styles.card} ${styles.searchCard}`}
              aria-labelledby="bookmarks-search-heading"
            >
              <h1 id="bookmarks-search-heading" className="sr-only">
                Bookmarks Search
              </h1>
              <div className="space-y-3">
                <label className={styles.softInput}>
                  <span className={styles.searchIcon} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="M16 16L21 21" />
                    </svg>
                  </span>
                  <span className={styles.softInputFieldWrap}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      autoFocus
                      inputMode="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls={showSearchResults ? 'raindrop-search-results' : undefined}
                      aria-expanded={showSearchResults}
                      aria-activedescendant={
                        selectedSearchIndex !== null
                          ? `raindrop-search-result-${selectedSearchIndex}`
                          : undefined
                      }
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={handleSearchInputKeyDown}
                      placeholder="Search bookmarks..."
                      className={styles.softInputField}
                    />
                  </span>
                  {query ? (
                    <button
                      type="button"
                      className={styles.clearSearchButton}
                      aria-label="Clear search"
                      title="Clear search"
                      onClick={() => setQuery('')}
                    >
                      ✕
                    </button>
                  ) : null}
                </label>

                {showSearchResults ? (
                  <div className={styles.scrollArea}>
                    <SearchResults
                      results={searchResults}
                      query={query}
                      searching={searching}
                      error={searchError}
                      selectedIndex={selectedSearchIndex}
                      getResultRef={(index) => (node) => {
                        searchResultRefs.current[index] = node;
                      }}
                      onResultClick={(event) => {
                        if (!isPlainLeftClick(event)) {
                          return;
                        }

                        setQuery('');
                        searchInputRef.current?.blur();
                      }}
                    />
                  </div>
                ) : (
                  <div className={styles.workspaceSections}>
                    <PinnedResults
                      results={pinnedResults}
                      loading={pinnedResultsLoading}
                      error={pinnedResultsError}
                    />
                    <SessionsList
                      sessions={sessions}
                      loading={sessionsLoading}
                      error={sessionsError}
                      expandedSessionIds={expandedSessionIds}
                      detailsById={sessionDetailsById}
                      detailsLoadingById={sessionDetailsLoadingById}
                      detailsErrorById={sessionDetailsErrorById}
                      onToggleSession={handleToggleSession}
                    />
                  </div>
                )}
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
