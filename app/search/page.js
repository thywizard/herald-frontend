'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from '../../components/layout';
import { ArticleRow } from '../../components/cards';
import {
  searchWeb,
  searchAnswer,
  warmSearch,
  searchArticles,
  getFeed,
  getRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
} from '../../lib/data';
import { useSettings, getSettings } from '../../lib/settings';
import { SparkleIcon } from '../../components/layout';

const TABS = [
  { id: 'general', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'herald', label: 'Herald' },
];

const QUICK_SEARCHES = [
  'Nigeria news today',
  'Naira exchange rate',
  'Weather in Lagos',
  'Premier League scores',
  'Latest tech news',
  'Fuel price in Nigeria',
];

// Turns bare "[2]" citation markers in the AI answer into markdown links
// pointing at #result-2, so tapping a citation jumps straight to that
// source card instead of being dead text. Skips anything already a
// markdown link (e.g. "[click here](...)").
function linkifyCitations(text) {
  if (!text) return text;
  return text.replace(/\[(\d+)\](?!\()/g, (match, n) => `[${match}](#result-${n})`);
}

function CitationLink({ href, children }) {
  if (href?.startsWith('#result-')) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById(href.slice(1));
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-accent/15');
          setTimeout(() => el.classList.remove('bg-accent/15'), 1200);
        }}
        className="inline-flex items-center justify-center min-w-[1.1em] px-1 rounded bg-accent/25 text-accent-dark text-[11px] font-semibold no-underline align-super"
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal underline underline-offset-2">
      {children}
    </a>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return null;
  }
}

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SearchIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function EmptyState({ failed, query, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-rule/40 flex items-center justify-center mb-4">
        <SearchIcon size={28} className="text-ink-soft" />
      </div>
      {failed ? (
        <>
          <p className="text-ink font-medium text-sm mb-1">Couldn't reach search right now</p>
          <p className="text-ink-soft text-sm max-w-xs mb-4">The search engine may still be waking up — it sleeps when nobody has used it for a while.</p>
          {onRetry && (
            <button onClick={onRetry} className="px-5 py-2 rounded-full bg-ink text-paper text-sm font-semibold">
              Try again
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-ink font-medium text-sm mb-1">No results found for "{query}"</p>
          <p className="text-ink-soft text-sm max-w-xs">Try searching with different keywords.</p>
        </>
      )}
    </div>
  );
}

function ResultSkeleton({ warming }) {
  return (
    <div className="py-6 space-y-5">
      {warming && (
        <p className="text-xs text-ink-soft text-center -mb-1">Waking up the search engine — this only happens after a quiet spell…</p>
      )}
      <div className="h-16 bg-rule/40 rounded-xl animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex gap-3">
          <div className="w-5 h-5 bg-rule rounded-full shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="h-3 w-32 bg-rule rounded mb-2" />
            <div className="h-4 w-full bg-rule rounded mb-1.5" />
            <div className="h-3 w-5/6 bg-rule rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WebResult({ r, index }) {
  return (
    <a
      id={index ? `result-${index}` : undefined}
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 py-3.5 border-b border-rule group scroll-mt-28 rounded-lg transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={faviconFor(r.url)} alt="" width={18} height={18} className="w-[18px] h-[18px] rounded mt-0.5 shrink-0" onError={(e) => (e.target.style.visibility = 'hidden')} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-teal font-medium mb-0.5 truncate">{r.url}</p>
        <h2 className="text-base font-medium text-ink group-hover:underline underline-offset-2 leading-snug mb-1">{r.title}</h2>
        {r.snippet && <p className="text-sm text-ink-soft line-clamp-2">{r.snippet}</p>}
        {formatDate(r.published) && <p className="text-xs text-ink-soft mt-1">{formatDate(r.published)}</p>}
      </div>
      {r.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.thumbnail} alt="" loading="lazy" className="w-20 h-20 rounded-lg object-cover bg-rule shrink-0" onError={(e) => (e.target.style.display = 'none')} />
      )}
    </a>
  );
}

function ImageGrid({ results }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-3">
      {results
        .filter((r) => r.thumbnail || r.image)
        .map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-square rounded-xl overflow-hidden bg-rule"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.thumbnail || r.image}
              alt={r.title || ''}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => (e.target.parentElement.style.display = 'none')}
            />
            <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[11px] leading-tight text-white bg-gradient-to-t from-black/70 to-transparent truncate">
              {hostOf(r.url)}
            </span>
          </a>
        ))}
    </div>
  );
}

function VideoList({ results }) {
  return (
    <div>
      {results.map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 py-3.5 border-b border-rule group">
          <div className="relative w-36 shrink-0 aspect-video rounded-lg overflow-hidden bg-rule">
            {r.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = 'none')} />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M7 4v16l13-8z" /></svg>
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink group-hover:underline underline-offset-2 leading-snug line-clamp-2 mb-1">{r.title}</h2>
            <p className="text-xs text-teal truncate">{hostOf(r.url)}</p>
            <p className="text-xs text-ink-soft mt-0.5">{[r.length, formatDate(r.published)].filter(Boolean).join(' · ')}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function KnowledgePanel({ box }) {
  if (!box?.title) return null;
  return (
    <div className="mb-5 border border-rule rounded-2xl p-4 flex gap-3">
      {box.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={box.image} alt="" className="w-20 h-20 rounded-xl object-cover bg-rule shrink-0" onError={(e) => (e.target.style.display = 'none')} />
      )}
      <div className="min-w-0">
        <h2 className="font-serif text-lg font-semibold text-ink leading-tight mb-1">{box.title}</h2>
        {box.content && <p className="text-sm text-ink-soft line-clamp-4">{box.content}</p>}
        {box.url && /^https?:/.test(box.url) && (
          <a href={box.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-xs font-medium text-teal">
            {hostOf(box.url)} ↗
          </a>
        )}
      </div>
    </div>
  );
}


// Google-style "AI Overview": a short answer with tappable [n] citations,
// collapsed behind "Show more" when long, then sources, a follow-up box and a
// jump into Herald AI for the full conversation. Fills in on its own once the
// answer arrives (results above it never wait for it).
function AIOverview({ state, query, onAsk, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  const [followUp, setFollowUp] = useState('');

  useEffect(() => {
    setExpanded(false);
    setFollowUp('');
  }, [query]);

  if (state.status === 'none') return null;

  if (state.status === 'error') {
    return (
      <div className="mb-5 rounded-2xl border border-rule bg-rule/20 px-4 py-3 flex items-center gap-3">
        <SparkleIcon size={18} className="text-ink-soft shrink-0" />
        <p className="flex-1 text-sm text-ink-soft">AI Overview isn't available right now.</p>
        <button onClick={onRetry} className="text-xs font-semibold text-accent-dark shrink-0">Try again</button>
      </div>
    );
  }

  const header = (
    <div className="flex items-center gap-2 mb-3">
      <SparkleIcon size={18} className="text-accent-dark" />
      <span className="text-[15px] font-semibold text-ink">AI Overview</span>
    </div>
  );

  if (state.status === 'loading') {
    return (
      <div className="mb-5 rounded-2xl border border-rule bg-rule/20 p-4">
        {header}
        <div className="space-y-2 animate-pulse">
          <div className="h-3.5 bg-rule rounded w-full" />
          <div className="h-3.5 bg-rule rounded w-11/12" />
          <div className="h-3.5 bg-rule rounded w-4/5" />
          <div className="h-3.5 bg-rule rounded w-2/3" />
        </div>
      </div>
    );
  }

  const long = state.answer.length > 260;
  const collapsed = long && !expanded;

  return (
    <div className="mb-5 rounded-2xl border border-rule bg-gradient-to-b from-accent/10 to-transparent p-4">
      {header}

      <div className={`relative ${collapsed ? 'max-h-40 overflow-hidden' : ''}`}>
        <div className="md-body text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: CitationLink }}>
            {linkifyCitations(state.answer)}
          </ReactMarkdown>
        </div>
        {collapsed && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper via-paper/80 to-transparent pointer-events-none" />
        )}
      </div>

      {long && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-3 py-2.5 rounded-full border border-accent/40 text-sm font-medium text-accent-dark flex items-center justify-center gap-1.5 active:bg-accent/10"
        >
          {expanded ? 'Show less' : 'Show more'}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={expanded ? 'rotate-180' : ''}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}

      {(expanded || !long) && (
        <div className="mt-4 space-y-3">
          {state.sources?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-1.5">Sources</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                {state.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 max-w-[11rem] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-rule bg-paper text-xs text-ink"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faviconFor(src.url)} alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-sm" onError={(e) => (e.target.style.display = 'none')} />
                    <span className="truncate">{hostOf(src.url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAsk(followUp.trim());
            }}
            className="flex items-center gap-2 rounded-full border border-rule bg-paper pl-4 pr-1.5 py-1.5"
          >
            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a follow-up"
              className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Ask Herald AI"
              className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
            </button>
          </form>

          <button
            onClick={() => onAsk('')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-ink text-paper text-sm font-semibold"
          >
            <SparkleIcon size={15} />
            Continue in Herald AI
          </button>
          <p className="text-[11px] text-ink-soft text-center">AI responses may include mistakes. Check the sources.</p>
        </div>
      )}
    </div>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxRef = useRef(null);
  const searchIdRef = useRef(0);

  const [query, setQuery] = useState(''); // what's in the input box
  const [activeQuery, setActiveQuery] = useState(''); // the query actually searched
  const [tab, setTab] = useState('general');
  const [cache, setCache] = useState({}); // results per tab for the active query
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed, setFailed] = useState(false); // couldn't reach the server — distinct from "0 results"
  const [warming, setWarming] = useState(false); // engine is cold-starting; auto-retrying
  const [overview, setOverview] = useState({ status: 'none' }); // AI Overview: none | loading | done
  const { settings } = useSettings();


  const [recent, setRecent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    warmSearch();
    setRecent(getRecentSearches());
    getFeed(1)
      .then((list) => setTrending((list || []).slice(0, 5)))
      .catch(() => setTrending([]));
  }, []);

  // Deep-link support: /search?q=... (e.g. from the home search bar) runs
  // the search immediately instead of landing on an empty page.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q?.trim()) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live suggestions as you type — matches Herald's own article headlines.
  useEffect(() => {
    const q = query.trim();
    if (!q || searched) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchArticles(q)
        .then((data) => setSuggestions((data || []).slice(0, 5)))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, searched]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Fetch web results, retrying quietly when the engine is cold-starting. The
  // backend flags that case as `degraded` (every source empty because of an
  // error) — distinct from a query that genuinely has no results — so the
  // first search of a session no longer shows a false "no results".
  async function fetchWebWithRetry(q, tabId, myId) {
    let last;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        last = await searchWeb(q, tabId);
        if (!last.degraded) return last;
      } catch (err) {
        if (attempt === 2) throw err;
      }
      if (myId !== searchIdRef.current) return last;
      setWarming(true);
      await new Promise((r) => setTimeout(r, attempt === 0 ? 3000 : 6000));
    }
    return last;
  }

  async function loadTab(q, tabId, existing) {
    if (existing[tabId]) return; // already fetched for this query
    const myId = searchIdRef.current;
    setLoading(true);
    setFailed(false);
    setWarming(false);
    try {
      let value;
      if (tabId === 'herald') {
        value = { articles: (await searchArticles(q)) || [] };
      } else {
        const wantHerald = tabId === 'general' && getSettings().heraldInSearch;
        const [web, herald] = await Promise.all([
          fetchWebWithRetry(q, tabId, myId),
          wantHerald ? searchArticles(q).catch(() => []) : Promise.resolve([]),
        ]);
        value = { ...web, heraldTop: (herald || []).slice(0, 3) };
        if (web?.degraded) throw new Error('degraded');
      }
      if (myId !== searchIdRef.current) return; // a newer search started meanwhile
      setCache((c) => ({ ...c, [tabId]: value }));
      if (tabId === 'general') {
        if (getSettings().saveRecents) {
          recordRecentSearch(q);
          setRecent(getRecentSearches());
        }
        // The AI Overview loads on its own so results never wait for it.
        if (getSettings().aiOverview && value.results?.length > 0) {
          loadOverview(q, myId);
        }
      }
    } catch {
      if (myId === searchIdRef.current) setFailed(true);
    } finally {
      if (myId === searchIdRef.current) {
        setLoading(false);
        setWarming(false);
      }
    }
  }

  // Fetches the AI Overview on its own. One quiet retry (the answer service
  // can be waking up too); if it still fails, say so with a Try again button
  // instead of silently showing nothing.
  async function loadOverview(q, myId) {
    setOverview({ status: 'loading' });
    let a = await searchAnswer(q);
    if (!a.answer && myId === searchIdRef.current) {
      await new Promise((r) => setTimeout(r, 2500));
      if (myId !== searchIdRef.current) return;
      a = await searchAnswer(q);
    }
    if (myId !== searchIdRef.current) return;
    setOverview(a.answer ? { status: 'done', answer: a.answer, sources: a.sources || [] } : { status: 'error' });
  }

  function askHeraldAI(followUp) {
    const q = activeQuery || query;
    const params = new URLSearchParams({ q: followUp || q });
    if (followUp) params.set('ctx', q);
    router.push(`/ai?${params.toString()}`);
  }

  function runSearch(q, tabId = 'general') {
    searchIdRef.current += 1;
    setActiveQuery(q);
    setSearched(true);
    setDropdownOpen(false);
    setTab(tabId);
    setCache({});
    setOverview({ status: 'none' });
    loadTab(q, tabId, {});
  }

  function switchTab(tabId) {
    if (tabId === tab) return;
    setTab(tabId);
    loadTab(activeQuery, tabId, cache);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    runSearch(q);
  }

  function pickSuggestion(q) {
    setQuery(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    runSearch(q);
  }

  function startOver() {
    searchIdRef.current += 1;
    setQuery('');
    setActiveQuery('');
    setSearched(false);
    setCache({});
    setOverview({ status: 'none' });
    setFailed(false);
    setLoading(false);
    router.replace('/search');
  }

  const recentPool = settings.saveRecents ? recent : [];
  const recentMatches = query.trim()
    ? recentPool.filter((r) => r.toLowerCase().includes(query.trim().toLowerCase()))
    : recentPool;
  const showDropdown = dropdownOpen && !searched && (recentMatches.length > 0 || suggestions.length > 0);

  const data = cache[tab];
  const results = data?.results || [];
  const articles = data?.articles || [];
  const hasAnything = tab === 'herald' ? articles.length > 0 : results.length > 0;

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-4 pb-2 relative" ref={boxRef}>
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              setDropdownOpen(true);
              warmSearch();
            }}
            placeholder="Search the web"
            className="w-full pl-11 pr-20 py-3.5 bg-paper border border-rule text-ink placeholder:text-ink-soft rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          />
          {searched ? (
            <button
              type="button"
              onClick={startOver}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-ink-soft"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-ink text-paper rounded-full text-xs font-semibold disabled:opacity-50"
            >
              {loading ? '...' : 'Search'}
            </button>
          )}
        </form>

        {showDropdown && (
          <div className="absolute inset-x-4 mt-2 bg-paper border border-rule rounded-xl shadow-lg overflow-hidden z-40 max-h-[60vh] overflow-y-auto">
            {recentMatches.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Recent</p>
                {recentMatches.map((r) => (
                  <div key={r} className="flex items-center group">
                    <button onClick={() => pickSuggestion(r)} className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-rule/30">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-soft shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                      <span className="text-sm text-ink truncate">{r}</span>
                    </button>
                    <button
                      onClick={() => {
                        removeRecentSearch(r);
                        setRecent(getRecentSearches());
                      }}
                      aria-label={`Remove "${r}" from recent searches`}
                      className="w-9 h-9 shrink-0 flex items-center justify-center text-ink-soft"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {suggestions.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">From Herald</p>
                {suggestions.map((s) => (
                  <button key={s._id} onClick={() => pickSuggestion(s.headline)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-rule/30">
                    <SearchIcon size={16} className="text-ink-soft shrink-0" />
                    <span className="text-sm text-ink truncate">{s.headline}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs — only once a search has run */}
      {searched && (
        <div className="sticky top-14 z-20 bg-paper border-b border-rule">
          <div className="flex gap-1 px-3 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`shrink-0 px-3.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={tab === 'images' && searched ? 'px-3' : 'px-4'}>
        {loading && <ResultSkeleton warming={warming} />}

        {!loading && searched && !hasAnything && (
          <EmptyState failed={failed} query={activeQuery} onRetry={failed ? () => runSearch(activeQuery, tab) : undefined} />
        )}
        {!loading && searched && !hasAnything && !failed && tab === 'herald' && (
          <div className="text-center -mt-8 pb-10">
            <p className="text-ink-soft text-sm mb-3">Herald hasn't published a story on this yet.</p>
            <button onClick={() => switchTab('general')} className="px-5 py-2 rounded-full bg-ink text-paper text-sm font-semibold">
              Search the web instead
            </button>
          </div>
        )}

        {/* Landing state: something to do before you've typed anything */}
        {!loading && !searched && (
          <div className="pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-2">Try searching</p>
            <div className="flex flex-wrap gap-2 mb-7">
              {QUICK_SEARCHES.map((q) => (
                <button
                  key={q}
                  onClick={() => pickSuggestion(q)}
                  className="px-3.5 py-2 rounded-full border border-rule text-sm text-ink hover:bg-rule/30"
                >
                  {q}
                </button>
              ))}
            </div>

            {trending.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-1">Trending on Herald</p>
                <div className="-mx-4">
                  {trending.map((a, i) => (
                    <Link key={a._id} href={`/article/${a._id}`} className="flex items-start gap-3 px-4 py-3 border-b border-rule">
                      <span className="w-5 text-ink-soft font-serif text-lg leading-6 shrink-0">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink leading-snug line-clamp-2">{a.headline}</span>
                        <span className="block text-xs text-ink-soft mt-0.5">{a.source}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ALL */}
        {!loading && tab === 'general' && hasAnything && (
          <>
            <div className="pt-4" />
            <KnowledgePanel box={data.infobox} />

            {/* Old backends return the answer inline; new ones fill it in separately. */}
            <AIOverview
              state={overview.status !== 'none' ? overview : data.answer ? { status: 'done', answer: data.answer, sources: results.slice(0, 5) } : overview}
              query={activeQuery}
              onAsk={askHeraldAI}
              onRetry={() => loadOverview(activeQuery, searchIdRef.current)}
            />

            {results.map((r, i) => (
              <WebResult key={i} r={r} index={i + 1} />
            ))}

            {data.suggestions?.length > 0 && (
              <div className="py-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-2">Related searches</p>
                <div className="flex flex-wrap gap-2">
                  {data.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => pickSuggestion(s)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-rule/40 text-sm text-ink hover:bg-rule/70"
                    >
                      <SearchIcon size={13} className="text-ink-soft" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {data.heraldTop?.length > 0 && (
              <div className="pt-2 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-1">From Herald</p>
                <div className="-mx-4">
                  {data.heraldTop.map((a) => (
                    <ArticleRow key={a._id} article={a} />
                  ))}
                </div>
              </div>
            )}

          </>
        )}

        {/* NEWS */}
        {!loading && tab === 'news' && hasAnything && results.map((r, i) => <WebResult key={i} r={r} />)}

        {/* IMAGES */}
        {!loading && tab === 'images' && hasAnything && <ImageGrid results={results} />}

        {/* VIDEOS */}
        {!loading && tab === 'videos' && hasAnything && <VideoList results={results} />}

        {/* HERALD (own articles) */}
        {!loading && tab === 'herald' && hasAnything && (
          <div className="-mx-4">
            {articles.map((a) => (
              <ArticleRow key={a._id} article={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
