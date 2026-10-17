'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import {
  likeArticle,
  shareArticle,
  isSaved,
  toggleSaved,
  getFeed,
  getCategoryFeed,
  whoAmI,
  recordHistory,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  searchArticles,
} from '../lib/data';
import { ArticleRow, ArticleRowSkeleton, SafeImage } from './cards';

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

// Silently records an article visit to local reading history. Dropped
// into the article page with no visible UI of its own.
export function RecordHistory({ articleId }) {
  useEffect(() => {
    recordHistory(articleId);
  }, [articleId]);
  return null;
}

// Registers the service worker once, on every page (via app/layout.js) —
// needed for push notifications to work at all, and harmless otherwise.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);
  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Push notification opt-in toggle — lives in Settings. Handles the full
// flow: request permission -> subscribe via the browser's PushManager with
// our VAPID public key -> send the subscription to the backend. Browsers
// with no Push API support (notably iOS Safari outside an installed PWA)
// show an explanatory message instead of a broken toggle.
export function PushSettingsRow() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function enable() {
    setBusy(true);
    setError('');
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notifications were blocked — enable them in your browser settings to turn this on.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribeToPush(sub.toJSON());
      setSubscribed(true);
    } catch (err) {
      setError('Could not enable notifications: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div>
        <span className="text-ink font-medium block">Push notifications</span>
        <span className="text-ink-soft text-xs">Not supported in this browser — try Chrome on Android, or install Herald as an app.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-ink font-medium block">Push notifications</span>
          <span className="text-ink-soft text-xs">Breaking news straight to your device</span>
        </div>
        <button
          disabled={busy}
          onClick={subscribed ? disable : enable}
          className={`w-12 h-7 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${subscribed ? 'bg-accent' : 'bg-rule'}`}
          aria-pressed={subscribed}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-paper transition-transform ${subscribed ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {permission === 'denied' && (
        <p className="text-xs text-red-600 mt-2">
          Notifications are blocked for this site. Enable them from your browser's site settings to turn this on.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

// Live search bar shown at the top of Home — searches Herald's own
// articles as you type (debounced) and shows a results dropdown, rather
// than depending on an external Google CSE being configured.
export function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchArticles(query.trim())
        .then((data) => {
          setResults(data.slice(0, 6));
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={boxRef} className="relative px-4 py-3">
      <form onSubmit={handleSubmit} className="relative">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search Herald..."
          className="w-full pl-10 pr-4 py-2.5 bg-rule/40 text-ink placeholder:text-ink-soft rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </form>

      {open && (
        <div className="absolute inset-x-4 mt-2 bg-paper border border-rule rounded-xl shadow-lg overflow-hidden z-40 max-h-[70vh] overflow-y-auto">
          {loading && <p className="text-center text-ink-soft text-sm py-4">Searching...</p>}
          {!loading && results.length === 0 && (
            <p className="text-center text-ink-soft text-sm py-4">No results for "{query}"</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r._id}
                onClick={() => {
                  setOpen(false);
                  router.push(`/article/${r._id}`);
                }}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-rule/30 border-b border-rule last:border-0"
              >
                <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-rule">
                  <SafeImage src={r.image} fill sizes="48px" className="object-cover" />
                </div>
                <span className="text-sm text-ink line-clamp-2">{r.headline}</span>
              </button>
            ))}
        </div>
      )}
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
