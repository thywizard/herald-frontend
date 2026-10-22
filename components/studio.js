'use client';

// Herald Studio — the admin/editor app. Its own installable PWA (own icon,
// name, manifest scope /admin) so it can never be mistaken for the reader
// app. This file holds the sign-in gate, the app chrome (top bar + bottom
// navigation) and the small UI pieces shared by every Studio screen.

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { whoAmI } from '../lib/data';

const KEY_STORE = 'herald_admin_key';

const AdminContext = createContext(null);

// { key, role, logout, canInstall, install }
export function useAdmin() {
  return useContext(AdminContext);
}

// ---------- tiny icon set ----------
const ICONS = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>,
  articles: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
  write: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  ai: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15Z" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  comments: <><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  logs: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" /></>,
  share: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
};

export function Ico({ name, size = 20, className = '', strokeWidth = 1.9, fill = 'none' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

// ---------- brand ----------
export function StudioMark({ size = 32 }) {
  return (
    <span
      className="flex items-center justify-center rounded-[10px] text-white shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#4338CA,#7C3AED)' }}
    >
      <Ico name="write" size={size * 0.56} strokeWidth={2.2} />
    </span>
  );
}

// ---------- shared UI ----------
export function Card({ children, className = '' }) {
  return <div className={`bg-paper border border-rule rounded-2xl ${className}`}>{children}</div>;
}

export function PageHeader({ title, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 pt-5 pb-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold text-ink leading-tight">{title}</h1>
        {sub && <p className="text-xs text-ink-soft mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ icon, label, value, tone }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2 text-ink-soft mb-1.5">
        {icon && <Ico name={icon} size={15} />}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${tone === 'accent' ? 'text-accent-dark' : 'text-ink'}`}>{value}</p>
    </Card>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? 'bg-ink text-paper' : 'bg-rule/50 text-ink-soft'
      }`}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin ${className}`} />;
}

// Small bottom toast. const [toast, show] = useToast(); render {toast}; show('Saved').
export function useToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  const node = msg ? (
    <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <span className="px-4 py-2.5 rounded-full bg-[#14152B] text-white text-xs font-medium shadow-xl max-w-full">{msg}</span>
    </div>
  ) : null;
  return [node, show];
}

export function timeAgo(dateString) {
  if (!dateString) return 'never';
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------- sign-in ----------
function readStoredKey() {
  try {
    return localStorage.getItem(KEY_STORE) || sessionStorage.getItem(KEY_STORE) || null;
  } catch {
    return null;
  }
}

function clearStoredKey() {
  try {
    localStorage.removeItem(KEY_STORE);
    sessionStorage.removeItem(KEY_STORE);
  } catch {
    // ignore
  }
}

function StudioGate({ children }) {
  const [key, setKey] = useState(null);
  const [role, setRole] = useState(null);
  const [input, setInput] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setInstallEvent(e);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    const stored = readStoredKey();
    if (!stored) {
      setChecking(false);
      return;
    }
    whoAmI(stored)
      .then((data) => {
        setKey(stored);
        setRole(data.role);
      })
      .catch((err) => {
        // Only forget the password if the server actually rejected it — a
        // sleeping server (network error) must not sign anyone out.
        if (err.message === 'UNAUTHORIZED') clearStoredKey();
        else {
          setKey(stored);
          setRole('admin'); // provisional; real role is re-checked by pages that need it
          whoAmI(stored).then((d) => setRole(d.role)).catch(() => {});
        }
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await whoAmI(input);
      try {
        (remember ? localStorage : sessionStorage).setItem(KEY_STORE, input);
      } catch {
        // ignore
      }
      setKey(input);
      setRole(data.role);
    } catch (err) {
      setError(err.message === 'UNAUTHORIZED' ? 'Incorrect password' : "Couldn't reach the server — it may be waking up. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearStoredKey();
    setKey(null);
    setRole(null);
    setInput('');
  }

  async function install() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F1020] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!key) {
    return (
      <div className="min-h-screen bg-[#0F1020] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <StudioMark size={64} />
            <h1 className="font-serif text-3xl font-semibold text-white mt-4">Herald Studio</h1>
            <p className="text-white/50 text-sm mt-1">Admin &amp; editor access</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-paper rounded-2xl p-6 shadow-xl">
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Password</label>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full px-4 py-3 border border-rule bg-paper rounded-lg text-ink mb-3 focus:outline-none focus:border-accent"
            />
            <label className="flex items-center gap-2 text-xs text-ink-soft mb-4 select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#4F46E5]" />
              Keep me signed in on this device
            </label>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy || !input}
              className="w-full py-3 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-white/30 text-xs mt-6">Not publicly accessible — authorized staff only</p>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ key, role, logout, canInstall: !!installEvent, install }}>
      {children}
    </AdminContext.Provider>
  );
}

// ---------- chrome ----------
const NAV = [
  { href: '/admin', label: 'Home', icon: 'home', adminOnly: true, exact: true },
  { href: '/admin/articles', label: 'Articles', icon: 'articles' },
  { href: '/admin/add', label: 'Write', icon: 'write', primary: true },
  { href: '/admin/ai', label: 'AI Desk', icon: 'ai', adminOnly: true },
  { href: '/admin/more', label: 'More', icon: 'more' },
];

function StudioChrome({ children }) {
  const { role } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => !n.adminOnly || role === 'admin');

  // Editors have no Home/AI Desk — send them to Articles instead of an empty page.
  useEffect(() => {
    if (role === 'editor' && (pathname === '/admin' || pathname === '/admin/ai')) router.replace('/admin/articles');
  }, [role, pathname, router]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 h-12 bg-[#14152B] text-white flex items-center justify-between px-4">
        <Link href={role === 'admin' ? '/admin' : '/admin/articles'} className="flex items-center gap-2.5">
          <StudioMark size={26} />
          <span className="font-serif text-[17px] font-semibold tracking-tight">Studio</span>
        </Link>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 capitalize">{role}</span>
      </header>

      <main className="pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-rule flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + '/');
          // "More" also owns the pages that hang off it
          const moreActive = item.href === '/admin/more' && ['/admin/comments', '/admin/push', '/admin/logs'].some((p) => pathname?.startsWith(p));
          const on = active || moreActive;
          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex items-center justify-center" aria-label={item.label}>
                <span className="w-12 h-12 -mt-4 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Ico name="write" size={22} strokeWidth={2.2} />
                </span>
              </Link>
            );
          }
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-0.5">
              <span className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${on ? 'bg-accent/15 text-accent-dark' : 'text-ink-soft'}`}>
                <Ico name={item.icon} size={21} strokeWidth={on ? 2.3 : 1.8} />
              </span>
              <span className={`text-[10px] ${on ? 'font-semibold text-ink' : 'font-medium text-ink-soft'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function StudioShell({ children }) {
  return (
    <div className="studio">
      <StudioGate>
        <StudioChrome>{children}</StudioChrome>
      </StudioGate>
    </div>
  );
}
