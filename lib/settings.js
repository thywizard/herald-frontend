import { useState, useEffect } from 'react';

// App preferences, stored on this device (no login). One JSON blob in
// localStorage; every setting has a default so a missing/blocked store just
// means "defaults". Changing a setting broadcasts an event so every open
// component (and the page chrome) updates immediately.
const KEY = 'herald_settings';

export const DEFAULT_SETTINGS = {
  aiOverview: true, // show the AI Overview on the Search "All" tab
  heraldInSearch: true, // show Herald's own articles at the top of search results
  saveRecents: true, // remember recent searches on this device
  showComments: true, // show the comments section under articles
  readingBar: true, // thin progress bar while reading an article
  dataSaver: false, // skip loading list/feed images
  saveChats: true, // keep Herald AI chat history on this device
};

export function getSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function applyDocumentSettings(s = getSettings()) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.saver = s.dataSaver ? 'on' : 'off';
}

export function setSetting(name, value) {
  const next = { ...getSettings(), [name]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore — the in-memory event below still updates this session
  }
  applyDocumentSettings(next);
  window.dispatchEvent(new CustomEvent('herald-settings', { detail: next }));
  return next;
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  applyDocumentSettings({ ...DEFAULT_SETTINGS });
  window.dispatchEvent(new CustomEvent('herald-settings', { detail: { ...DEFAULT_SETTINGS } }));
}

// React hook. Starts from defaults (so server and first client render match),
// then loads the saved values and stays in sync.
export function useSettings() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setReady(true);
    const onChange = (e) => setSettings(e.detail || getSettings());
    window.addEventListener('herald-settings', onChange);
    return () => window.removeEventListener('herald-settings', onChange);
  }, []);

  return { settings, ready };
}
