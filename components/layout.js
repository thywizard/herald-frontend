'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '../lib/data';

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-rule">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight text-ink">
          Herald
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/search" aria-label="Search" className="text-ink-soft hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <Link href="/settings" aria-label="Settings" className="text-ink-soft hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="px-4 py-6 border-t border-rule mt-6">
      <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
        <Link href="/about" className="hover:text-ink">About</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-ink">Terms of Use</Link>
      </div>
      <p className="text-xs text-ink-soft mt-3">© {new Date().getFullYear()} Herald</p>
    </footer>
  );
}

export function CategoryTabs({ active }) {
  return (
    <div className="sticky top-14 z-20 bg-paper flex items-center gap-2 px-4 py-3 overflow-x-auto snap-x snap-mandatory no-scrollbar border-b border-rule">
      <Link
        href="/"
        className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
          !active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-rule/50'
        }`}
      >
        Top
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`/category/${cat}`}
          className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
            active === cat ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-rule/50'
          }`}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}

export function BreakingBar({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-accent text-ink">
      <div className="flex items-center h-10 px-4 gap-3 overflow-x-auto no-scrollbar">
        <span className="shrink-0 font-sans text-xs font-bold uppercase tracking-wide">
          Breaking
        </span>
        <div className="flex items-center gap-6 whitespace-nowrap">
          {items.map((item, i) => (
            <Link
              key={item._id}
              href={`/article/${item._id}`}
              className="text-sm font-medium hover:underline underline-offset-2"
            >
              {item.headline}
              {i < items.length - 1 && <span className="ml-6 text-ink/30">•</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/', label: 'News', icon: 'home' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/saved', label: 'Saved', icon: 'bookmark' },
  { href: '/settings', label: 'Me', icon: 'user' },
];

function NavIcon({ name, active }) {
  const stroke = active ? 'currentColor' : 'currentColor';
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: active ? 2.4 : 1.8 };
  if (name === 'home') return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
  if (name === 'bookmark') return <svg {...common}><path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
  return null;
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-rule flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${active ? 'text-ink' : 'text-ink-soft'}`}
          >
            <NavIcon name={item.icon} active={active} />
            <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
