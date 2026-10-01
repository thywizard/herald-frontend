'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { likeArticle, shareArticle, isSaved, toggleSaved, getFeed, getCategoryFeed, whoAmI } from '../lib/data';
import { ArticleRow, ArticleRowSkeleton } from './cards';

export function ArticleActions({ articleId, initialLikes, initialShares, title, url }) {
  const [likes, setLikes] = useState(initialLikes);
  const [shares, setShares] = useState(initialShares);
  const [liked, setLiked] = useState(false);

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setLikes((n) => n + 1);
    try {
      await likeArticle(articleId);
    } catch {
      setLiked(false);
      setLikes((n) => n - 1);
    }
  }

  async function handleShare() {
    const shareData = { title, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied');
      }
      setShares((n) => n + 1);
      shareArticle(articleId).catch(() => {});
    } catch {
      // user cancelled share sheet
    }
  }

  return (
    <div className="flex items-center gap-6">
      <button
        onClick={handleLike}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          liked ? 'text-accent-dark' : 'text-ink-soft hover:text-ink'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        {likes}
      </button>
      <button onClick={handleShare} className="flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
        {shares}
      </button>
    </div>
  );
}

export function SaveButton({ articleId }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(articleId));
  }, [articleId]);

  return (
    <button
      onClick={() => setSaved(toggleSaved(articleId))}
      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
        saved ? 'text-accent-dark' : 'text-ink-soft hover:text-ink'
      }`}
      aria-label={saved ? 'Remove from saved' : 'Save article'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}

// Floating back-to-top button — appears after scrolling past one screen
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-30 w-11 h-11 rounded-full bg-ink text-paper shadow-lg flex items-center justify-center"
      aria-label="Back to top"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

// Custom "Install Herald" prompt — captures the browser's native install
// event so we can show our own button instead of relying only on the
// passive OS banner (Android/Chrome only; iOS has no equivalent event).
export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  async function install() {
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return (
    <div className="fixed bottom-20 inset-x-4 z-30 bg-ink text-paper rounded-xl p-3 flex items-center justify-between shadow-lg">
      <span className="text-sm font-medium">Install Herald for quick access</span>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <button onClick={() => setDismissed(true)} className="text-xs text-paper/60">Not now</button>
        <button onClick={install} className="text-xs font-semibold bg-accent text-ink px-3 py-1.5 rounded-full">
          Install
        </button>
      </div>
    </div>
  );
}

// --- Admin auth context ---
// AdminGate wraps the whole /admin section (via app/admin/layout.js) and
// provides { key, role } to every nested page through useAdmin(), so the
// password prompt only ever happens once per session instead of per-page.
const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

// Reading progress bar — fixed thin bar under the header, fills as the
// reader scrolls through the article body.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-14 inset-x-0 z-30 h-0.5 bg-rule">
      <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function AdminGate({ children }) {
  const [key, setKey] = useState(null);
  const [role, setRole] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('herald_admin_key');
    if (stored) {
      whoAmI(stored)
        .then((data) => {
          setKey(stored);
          setRole(data.role);
        })
        .catch(() => sessionStorage.removeItem('herald_admin_key'))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await whoAmI(input);
      sessionStorage.setItem('herald_admin_key', input);
      setKey(input);
      setRole(data.role);
    } catch {
      setError('Incorrect password');
    }
  }

  function logout() {
    sessionStorage.removeItem('herald_admin_key');
    setKey(null);
    setRole(null);
  }

  if (checking) return null;

  if (!key) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#15181F" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-paper">Herald</h1>
            <p className="text-paper/50 text-sm mt-1">Admin & Editor Access</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-paper rounded-2xl p-6 shadow-xl">
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Password</label>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full px-4 py-3 border border-rule rounded-lg text-ink mb-3 focus:outline-none focus:border-ink"
            />
            {error && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </p>
            )}
            <button type="submit" className="w-full py-3 bg-ink text-paper rounded-lg text-sm font-semibold">
              Sign In
            </button>
          </form>

          <p className="text-center text-paper/30 text-xs mt-6">Not publicly accessible — authorized staff only</p>
        </div>
      </div>
    );
  }

  return <AdminContext.Provider value={{ key, role, logout }}>{children}</AdminContext.Provider>;
}

// Infinite scroll feed — takes the first page (fetched server-side for fast
// initial load/SEO) and loads more pages automatically as the user scrolls.
export function InfiniteFeed({ type, param, initialArticles }) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialArticles.length === 0);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, done]);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const next = type === 'category' ? await getCategoryFeed(param, nextPage) : await getFeed(nextPage);
      if (!next || next.length === 0) {
        setDone(true);
      } else {
        setArticles((prev) => [...prev, ...next]);
        setPage(nextPage);
      }
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {articles.map((a) => (
        <ArticleRow key={a._id} article={a} />
      ))}
      {!done && <div ref={sentinelRef} className="h-4" />}
      {loading && (
        <>
          <ArticleRowSkeleton />
          <ArticleRowSkeleton />
          <ArticleRowSkeleton />
        </>
      )}
      {done && articles.length > 0 && (
        <p className="text-center text-ink-soft py-6 text-sm">You've reached the end.</p>
      )}
    </>
  );
}
