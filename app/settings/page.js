'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/layout';
import { getSavedIds } from '../../lib/data';

const FONT_SCALES = [
  { label: 'Small', value: '93.75%' },
  { label: 'Default', value: '100%' },
  { label: 'Large', value: '112.5%' },
];

function Row({ children }) {
  return <div className="px-4 py-4 border-b border-rule">{children}</div>;
}

export default function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [fontScale, setFontScale] = useState('100%');
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setFontScale(localStorage.getItem('herald_font_scale') || '100%');
    setSavedCount(getSavedIds().length);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('herald_theme', next ? 'dark' : 'light');
  }

  function setScale(value) {
    setFontScale(value);
    document.documentElement.style.fontSize = value;
    localStorage.setItem('herald_font_scale', value);
  }

  function clearSaved() {
    if (!confirm(`Remove all ${savedCount} saved articles?`)) return;
    localStorage.removeItem('herald_saved_articles');
    setSavedCount(0);
  }

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <h1 className="px-4 pt-5 pb-2 font-serif text-2xl font-semibold text-ink">Settings</h1>

      <Row>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-ink font-medium block">Dark mode</span>
            <span className="text-ink-soft text-xs">Easier on the eyes at night</span>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${dark ? 'bg-accent' : 'bg-rule'}`}
            aria-pressed={dark}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-paper transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </Row>

      <Row>
        <span className="text-ink font-medium block mb-3">Text size</span>
        <div className="flex gap-2">
          {FONT_SCALES.map((f) => (
            <button
              key={f.value}
              onClick={() => setScale(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${fontScale === f.value ? 'bg-ink text-paper' : 'bg-rule/50 text-ink-soft'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Row>

      <Row>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-ink font-medium block">Saved articles</span>
            <span className="text-ink-soft text-xs">{savedCount} saved on this device</span>
          </div>
          {savedCount > 0 && (
            <button onClick={clearSaved} className="text-red-600 text-sm font-medium">
              Clear all
            </button>
          )}
        </div>
      </Row>

      <Row>
        <Link href="/saved" className="text-ink font-medium">View saved articles →</Link>
      </Row>

      <Row>
        <Link href="/about" className="text-ink font-medium block mb-2">About Herald →</Link>
        <Link href="/privacy" className="text-ink font-medium block mb-2">Privacy Policy →</Link>
        <Link href="/terms" className="text-ink font-medium block">Terms of Use →</Link>
      </Row>
    </main>
  );
}
