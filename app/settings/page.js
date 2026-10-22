'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/layout';
import { PushSettingsRow, Toggle } from '../../components/interactive';
import { getSavedIds, getRecentSearches, getChatSessions } from '../../lib/data';
import { useSettings, setSetting, resetSettings } from '../../lib/settings';
import { isInstalledApp } from '../../lib/installed';

const FONT_SCALES = [
  { label: 'Small', value: '93.75%' },
  { label: 'Default', value: '100%' },
  { label: 'Large', value: '112.5%' },
];

function Card({ children }) {
  return (
    <div className="mx-4 mb-4 bg-paper border border-rule rounded-2xl overflow-hidden shadow-sm">
      {children}
    </div>
  );
}

function Row({ children, last }) {
  return <div className={`px-4 py-4 ${last ? '' : 'border-b border-rule'}`}>{children}</div>;
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft shrink-0">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function RowIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'bookmark') return <svg {...common}><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" /></svg>;
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
  if (name === 'info') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 16v-5" /><path d="M12 8h.01" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /></svg>;
  if (name === 'download') return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>;
  if (name === 'file') return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
  return null;
}

// A tappable nav row: leading monochrome icon, label, trailing chevron —
// replaces the old plain "Label →" link style across Settings.
function NavLinkRow({ href, icon, label, sub, last }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3.5 active:bg-rule/30 transition-colors ${last ? '' : 'border-b border-rule'}`}>
      <span className="w-8 h-8 shrink-0 rounded-full bg-rule/40 flex items-center justify-center text-ink-soft">
        <RowIcon name={icon} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-ink font-medium block truncate">{label}</span>
        {sub && <span className="text-ink-soft text-xs">{sub}</span>}
      </span>
      <Chevron />
    </Link>
  );
}

// A labelled on/off row backed by the shared settings store.
function SettingToggle({ name, settings, label, sub, last }) {
  return (
    <Row last={last}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-ink font-medium block">{label}</span>
          {sub && <span className="text-ink-soft text-xs">{sub}</span>}
        </div>
        <Toggle checked={!!settings[name]} onChange={() => setSetting(name, !settings[name])} label={label} />
      </div>
    </Row>
  );
}

// A row with a button for one-off actions (clear history, free up storage…).
function ActionRow({ label, sub, button, onClick, danger, last }) {
  return (
    <Row last={last}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-ink font-medium block">{label}</span>
          {sub && <span className="text-ink-soft text-xs">{sub}</span>}
        </div>
        <button
          onClick={onClick}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
            danger ? 'border-red-300 text-red-600' : 'border-rule text-ink'
          } active:bg-rule/40`}
        >
          {button}
        </button>
      </div>
    </Row>
  );
}

function SectionTitle({ children }) {
  return <h2 className="px-5 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{children}</h2>;
}

export default function SettingsPage() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isInstalledApp()), []);
  const [dark, setDark] = useState(false);
  const [fontScale, setFontScale] = useState('100%');
  const [savedCount, setSavedCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [note, setNote] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setFontScale(localStorage.getItem('herald_font_scale') || '100%');
    setSavedCount(getSavedIds().length);
    setRecentCount(getRecentSearches().length);
    setChatCount(getChatSessions().length);
  }, []);

  function flash(msg) {
    setNote(msg);
    setTimeout(() => setNote(''), 2200);
  }

  function clearRecents() {
    try { localStorage.removeItem('herald_recent_searches'); } catch {}
    setRecentCount(0);
    flash('Recent searches cleared');
  }

  function clearChats() {
    if (!confirm('Delete all Herald AI chats on this device?')) return;
    try { localStorage.removeItem('herald_ai_sessions'); } catch {}
    setChatCount(0);
    flash('Chat history cleared');
  }

  async function clearOffline() {
    try {
      await caches.delete('herald-offline-v1');
      flash('Offline copies removed');
    } catch {
      flash('Nothing to remove');
    }
  }

  function resetAll() {
    if (!confirm('Reset all settings to their defaults?')) return;
    resetSettings();
    flash('Settings reset');
  }

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

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <h1 className="px-4 pt-5 pb-3 font-serif text-2xl font-semibold text-ink">Me</h1>

      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <Row>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-ink font-medium block">Dark mode</span>
              <span className="text-ink-soft text-xs">Easier on the eyes at night</span>
            </div>
            {/* Teal, not the orange accent — orange reads as a warning/alert
                color against the dark background; teal reads as "night". */}
            <Toggle checked={dark} onChange={toggleDark} activeClass="bg-teal" label="Dark mode" />
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

        <SettingToggle name="dataSaver" settings={settings} label="Data saver" sub="Don't load images in news lists" last />
      </Card>

      <SectionTitle>Search &amp; Herald AI</SectionTitle>
      <Card>
        <SettingToggle name="aiOverview" settings={settings} label="AI Overview in search" sub="A short AI answer at the top of search results" />
        <SettingToggle name="heraldInSearch" settings={settings} label="Herald stories in search" sub="Show matching Herald articles above web results" />
        <SettingToggle name="saveRecents" settings={settings} label="Remember recent searches" sub="Stored only on this device" />
        <ActionRow
          label="Clear recent searches"
          sub={`${recentCount} saved`}
          button="Clear"
          onClick={clearRecents}
        />
        <SettingToggle name="saveChats" settings={settings} label="Save Herald AI chats" sub="Keep your chat history on this device" />
        <ActionRow
          label="Clear AI chat history"
          sub={`${chatCount} chat${chatCount === 1 ? '' : 's'} saved`}
          button="Clear"
          danger
          onClick={clearChats}
          last
        />
      </Card>

      <SectionTitle>Reading &amp; notifications</SectionTitle>
      <Card>
        <SettingToggle name="showComments" settings={settings} label="Show comments" sub="Hide the comments section under articles" />
        <SettingToggle name="readingBar" settings={settings} label="Reading progress bar" sub="A thin bar that fills as you read" />
        <Row last>
          <PushSettingsRow />
        </Row>
      </Card>

      <SectionTitle>Your library</SectionTitle>
      <Card>
        <NavLinkRow href="/saved" icon="bookmark" label="Saved articles" sub={`${savedCount} saved on this device`} />
        <NavLinkRow href="/history" icon="clock" label="Reading history" last />
      </Card>

      <SectionTitle>Storage</SectionTitle>
      <Card>
        <ActionRow label="Offline copies" sub="Saved articles kept for reading without internet" button="Free up" onClick={clearOffline} />
        <ActionRow label="Reset all settings" sub="Back to Herald's defaults" button="Reset" danger onClick={resetAll} last />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        {!inApp && <NavLinkRow href="/download" icon="download" label="Get the Android app" sub="Install Herald as a real app" />}
        <NavLinkRow href="/about" icon="info" label="About Herald" />
        <NavLinkRow href="/privacy" icon="shield" label="Privacy Policy" />
        <NavLinkRow href="/terms" icon="file" label="Terms of Use" last />
      </Card>

      {note && (
        <div className="fixed bottom-24 inset-x-0 z-40 flex justify-center pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-ink text-paper text-xs font-medium shadow-lg">{note}</span>
        </div>
      )}
    </main>
  );
}
