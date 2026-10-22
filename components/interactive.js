'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  likeArticle,
  shareArticle,
  isSaved,
  toggleSaved,
  getFeed,
  getCategoryFeed,
  recordHistory,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  searchArticles,
  cacheArticleOffline,
  uncacheArticleOffline,
  getComments,
  postComment,
  getSavedCommentName,
  saveCommentName,
  warmSearch,
} from '../lib/data';
import { ArticleRow, ArticleRowSkeleton, SafeImage } from './cards';
import { useSettings, applyDocumentSettings } from '../lib/settings';

// Share targets for browsers without the native share sheet (desktop).
const SHARE_TARGETS = [
  { id: 'whatsapp', label: 'WhatsApp', href: ({ text, url }) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  { id: 'x', label: 'X (Twitter)', href: ({ title, url }) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  { id: 'facebook', label: 'Facebook', href: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { id: 'telegram', label: 'Telegram', href: ({ text, url }) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
];

function ShareSheet({ open, onClose, payload, onShared, onCopy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-paper rounded-t-3xl sm:rounded-3xl border border-rule p-4 pb-6">
        <div className="w-10 h-1 rounded-full bg-rule mx-auto mb-4" />
        <p className="font-serif text-lg font-semibold text-ink mb-1">Share this story</p>
        <p className="text-xs text-ink-soft line-clamp-2 mb-4">{payload.title}</p>
        <div className="grid grid-cols-2 gap-2">
          {SHARE_TARGETS.map((t) => (
            <a
              key={t.id}
              href={t.href(payload)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onShared();
                onClose();
              }}
              className="px-3 py-3 rounded-xl border border-rule text-sm font-medium text-ink text-center hover:bg-rule/30"
            >
              {t.label}
            </a>
          ))}
        </div>
        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full mt-2 px-3 py-3 rounded-xl bg-ink text-paper text-sm font-semibold"
        >
          Copy link &amp; summary
        </button>
      </div>
    </div>
  );
}

export function ArticleActions({ articleId, initialLikes, initialShares, title, lead }) {
  const [likes, setLikes] = useState(initialLikes);
  const [shares, setShares] = useState(initialShares);
  const [liked, setLiked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState('');

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

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  // The link is built from wherever the app is actually running (so it is
  // always the real address, never a placeholder domain), and the share text
  // carries the story's "sweet part" so a pasted link comes with a reason to
  // tap it: headline, a short lead, then "Read more on Herald".
  function buildPayload() {
    const url = `${window.location.origin}/article/${articleId}`;
    const text = `${title}\n\n${lead ? `${lead}\n\n` : ''}Read more on Herald:`;
    return { title, text, url };
  }

  function countShare() {
    setShares((n) => n + 1);
    shareArticle(articleId).catch(() => {});
  }

  async function copyShare() {
    const { text, url } = buildPayload();
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      showToast('Link & summary copied');
      countShare();
    } catch {
      showToast('Could not copy — long-press the address bar instead');
    }
  }

  async function handleShare() {
    const payload = buildPayload();
    if (navigator.share) {
      try {
        await navigator.share(payload);
        countShare();
      } catch {
        // user cancelled the share sheet
      }
    } else {
      setSheetOpen(true);
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

      <ShareSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        payload={sheetOpen ? buildPayload() : { title }}
        onShared={countShare}
        onCopy={copyShare}
      />
      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-ink text-paper text-xs font-medium shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
}

export function SaveButton({ articleId, image }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(articleId));
  }, [articleId]);

  function handleToggle() {
    const next = toggleSaved(articleId);
    setSaved(next);
    // Fire-and-forget: cache (or drop) the offline copy. Saving still
    // works instantly off localStorage even if this fails or is slow.
    if (next) cacheArticleOffline(articleId, image);
    else uncacheArticleOffline(articleId);
  }

  return (
    <button
      onClick={handleToggle}
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

function timeAgo(dateStr) {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Comments under an article. No login in Herald, so each commenter just
// types whatever display name they want shown on their comment (we
// remember the last one used on this device so it isn't retyped).
export function CommentsSection({ articleId }) {
  const { settings } = useSettings();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(getSavedCommentName());
    getComments(articleId)
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [articleId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    const t = text.trim();
    if (!n || !t || posting) return;
    setPosting(true);
    setError('');
    try {
      const created = await postComment(articleId, { name: n, text: t });
      saveCommentName(n);
      setComments((c) => [created, ...c]);
      setText('');
    } catch (err) {
      setError(err.message || 'Could not post your comment. Try again.');
    } finally {
      setPosting(false);
    }
  }

  if (!settings.showComments) return null;

  return (
    <section className="px-4 mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink mb-3">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </h2>

      <form onSubmit={handleSubmit} className="bg-rule/25 border border-rule rounded-2xl p-3 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name (shown on your comment)"
          className="w-full px-3 py-2 mb-2 bg-paper border border-rule text-ink placeholder:text-ink-soft rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 bg-paper border border-rule text-ink placeholder:text-ink-soft rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={posting || !name.trim() || !text.trim()}
            className="px-4 py-2 bg-ink text-paper rounded-full text-xs font-semibold disabled:opacity-40"
          >
            {posting ? 'Posting...' : 'Post comment'}
          </button>
        </div>
      </form>

      {loading && <p className="text-ink-soft text-sm">Loading comments...</p>}
      {!loading && comments.length === 0 && (
        <p className="text-ink-soft text-sm">No comments yet — be the first to share your thoughts.</p>
      )}
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c._id} className="flex gap-3">
            <span className="w-8 h-8 shrink-0 rounded-full bg-teal/10 text-teal text-xs font-bold flex items-center justify-center">
              {c.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-ink-soft text-xs"> · {timeAgo(c.createdAt)}</span>
              </p>
              <p className="text-sm text-ink whitespace-pre-line break-words">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Floating back-to-top button. It used to sit on screen permanently once you
// had scrolled a screen down, covering buttons like "Post comment". Now it
// behaves like the browser's own: it appears only while you scroll UP, and
// tucks itself away after a couple of seconds (or as soon as you scroll
// down), so it never parks on top of the content you're trying to tap.
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let lastY = window.scrollY;
    let timer;
    function onScroll() {
      const y = window.scrollY;
      if (y < 500) {
        setVisible(false);
      } else if (y < lastY - 6) {
        setVisible(true);
        clearTimeout(timer);
        timer = setTimeout(() => setVisible(false), 2500);
      } else if (y > lastY + 6) {
        setVisible(false);
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  // The AI chat is a fixed-height app screen with its own inner scroll, and
  // Studio (/admin) is a separate app — neither wants this button.
  if (!visible || pathname === '/ai' || pathname?.startsWith('/admin')) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-ink/85 text-paper shadow-lg flex items-center justify-center backdrop-blur"
      aria-label="Back to top"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
  const pathname = usePathname();

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Studio (/admin) is its own installable app with its own prompt.
  if (!promptEvent || dismissed || pathname?.startsWith('/admin')) return null;

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
// Shared on/off switch. The knob is pinned with `left-0` and moved by an
// explicit translate — without `left-0` an absolutely positioned knob starts
// from its static (centered) position, which is why the old switches showed
// the knob on the wrong side and pushed it right off the track when on.
export function Toggle({ checked, onChange, disabled, activeClass = 'bg-accent', label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-12 h-7 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? activeClass : 'bg-ink-soft/30'
      }`}
    >
      <span
        className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Wake the backend + search engine now, while the person is still looking
    // at the feed, so their first search isn't hitting a cold server.
    warmSearch();
    applyDocumentSettings();
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => syncPushSubscription())
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });
  }, []);
  return null;
}

const PUSH_OFF_KEY = 'herald_push_off';

// The toggle in Settings reads the BROWSER's subscription, so it can show
// "on" even when the backend never received it (e.g. the first subscribe
// call failed while the server was asleep). Nothing is ever sent to a device
// the backend doesn't know about — so on every app load, quietly re-register
// whatever subscription the browser holds. It's an upsert, so repeating it
// is harmless. Skipped if the person turned notifications off themselves.
async function syncPushSubscription() {
  try {
    if (typeof Notification === 'undefined' || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem(PUSH_OFF_KEY)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await subscribeToPush(existing.toJSON());
    else await doPushSubscribe();
  } catch {
    // best-effort; the Settings toggle can still be used manually
  }
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

// Shared by the auto-prompt and the Settings toggle: subscribes this
// browser via PushManager with our VAPID key and registers it with the
// backend. Assumes Notification permission has already been granted.
async function doPushSubscribe() {
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await getVapidPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await subscribeToPush(sub.toJSON());
  return sub;
}

const AUTO_PUSH_KEY = 'herald_push_auto_prompted';

// Push is meant to be on by default, not a toggle someone has to find —
// but browsers only ever show the native permission prompt in response to
// a real user gesture (a silent/automatic grant isn't possible). So this
// quietly waits for the very first tap anywhere in the app and fires the
// prompt right then, once, so most people never see an "enable" step at
// all. If they deny it, nothing happens again — they can still turn it on
// later from Settings. Rendered once near the root of the app.
export function AutoPushPrompt() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return; // Studio isn't the reader app
    let active = true;

    try {
      if (localStorage.getItem(AUTO_PUSH_KEY)) return;
    } catch {
      return;
    }
    if (Notification.permission !== 'default') return;

    async function handler() {
      try {
        localStorage.setItem(AUTO_PUSH_KEY, '1');
      } catch {
        // ignore
      }
      document.removeEventListener('click', handler);
      if (!active) return;
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') await doPushSubscribe();
      } catch {
        // silent — the user can still enable it later from Settings
      }
    }

    document.addEventListener('click', handler, { once: true });
    return () => {
      active = false;
      document.removeEventListener('click', handler);
    };
  }, []);
  return null;
}

// Push notification toggle — lives in Settings. On by default via
// AutoPushPrompt above; this row is for checking status and turning it
// off/back on by hand. Browsers with no Push API support (notably iOS
// Safari outside an installed PWA) show an explanatory message instead of
// a broken toggle.
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
      await doPushSubscribe();
      try { localStorage.removeItem(PUSH_OFF_KEY); } catch {}
      setSubscribed(true);
    } catch (err) {
      const msg = /fetch/i.test(err.message)
        ? "Couldn't reach the server — it may just be waking up. Try the switch again in a few seconds."
        : 'Could not enable notifications: ' + err.message;
      setError(msg);
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
      try { localStorage.setItem(PUSH_OFF_KEY, '1'); } catch {}
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
        <Toggle checked={subscribed} disabled={busy} onChange={subscribed ? disable : enable} label="Push notifications" />
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

// Reading progress bar — fixed thin bar under the header, fills as the
// reader scrolls through the article body.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const { settings } = useSettings();

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

  if (!settings.readingBar) return null;

  return (
    <div className="fixed top-14 inset-x-0 z-30 h-0.5 bg-rule">
      <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
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
