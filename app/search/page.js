'use client';

import { useState } from 'react';
import { Header } from '../../components/layout';
import { searchWeb } from '../../lib/data';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchWeb(q);
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-ink mb-3">Search the web</h1>
        <form onSubmit={handleSubmit} className="relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything..."
            className="w-full pl-10 pr-20 py-3 bg-rule/40 text-ink placeholder:text-ink-soft rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-ink text-paper rounded-full text-xs font-semibold disabled:opacity-50"
          >
            {loading ? '...' : 'Go'}
          </button>
        </form>
      </div>

      <div className="px-4">
        {loading && (
          <div className="py-10 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 w-24 bg-rule rounded mb-2" />
                <div className="h-4 w-full bg-rule rounded mb-1.5" />
                <div className="h-3 w-5/6 bg-rule rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-center text-ink-soft text-sm py-16">
            No results — or web search isn't configured on the backend yet.
          </p>
        )}

        {!loading && !searched && (
          <p className="text-center text-ink-soft text-sm py-16">
            Search the open web from inside Herald — results open in a new tab.
          </p>
        )}

        {!loading &&
          results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3.5 border-b border-rule group"
            >
              <p className="text-xs text-teal font-medium mb-0.5 truncate">{r.url}</p>
              <h2 className="text-base font-medium text-ink group-hover:underline underline-offset-2 leading-snug mb-1">
                {r.title}
              </h2>
              {r.snippet && <p className="text-sm text-ink-soft line-clamp-2">{r.snippet}</p>}
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">
                {r.source}
              </span>
            </a>
          ))}
      </div>
    </main>
  );
}
