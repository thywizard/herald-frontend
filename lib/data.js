const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchJSON(path) {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API request failed: ${path} (${res.status})`);
  return res.json();
}

// ---- Public reads ----

export function getFeed(page = 1) {
  return fetchJSON(`/api/articles?page=${page}`);
}

export function getCategoryFeed(category, page = 1) {
  return fetchJSON(`/api/articles/category/${category}?page=${page}`);
}

export function getArticle(id) {
  return fetchJSON(`/api/articles/${id}`);
}

export function searchArticles(query) {
  return fetchJSON(`/api/articles/search?q=${encodeURIComponent(query)}`);
}

export function getSourceArticles(source) {
  return fetchJSON(`/api/articles/source/${encodeURIComponent(source)}`);
}

export async function likeArticle(id) {
  const res = await fetch(`${API_URL}/api/articles/${id}/like`, { method: 'POST' });
  return res.json();
}

export async function shareArticle(id) {
  const res = await fetch(`${API_URL}/api/articles/${id}/share`, { method: 'POST' });
  return res.json();
}

export const CATEGORIES = [
  'politics',
  'sports',
  'business',
  'entertainment',
  'world',
  'technology',
  'lifestyle',
  'opinion',
];

// ---- Admin (all require the admin key) ----

async function adminFetch(path, key, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key, ...options.headers },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export function listArticles(key, { status, page = 1 } = {}) {
  const params = new URLSearchParams({ page });
  if (status) params.set('status', status);
  return adminFetch(`/api/admin/articles?${params}`, key);
}

export function updateArticle(key, id, updates) {
  return adminFetch(`/api/admin/articles/${id}`, key, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteArticle(key, id) {
  return adminFetch(`/api/admin/articles/${id}`, key, { method: 'DELETE' });
}

export function unpublishArticle(key, id) {
  return adminFetch(`/api/admin/articles/${id}/unpublish`, key, { method: 'PATCH' });
}

export function publishArticle(key, id) {
  return adminFetch(`/api/admin/articles/${id}/publish`, key, { method: 'PATCH' });
}

export function togglePin(key, id) {
  return adminFetch(`/api/admin/articles/${id}/pin`, key, { method: 'PATCH' });
}

export function createArticle(key, data) {
  return adminFetch('/api/admin/articles', key, { method: 'POST', body: JSON.stringify(data) });
}

export async function uploadImage(key, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_URL}/api/admin/upload-image`, {
    method: 'POST',
    headers: { 'x-admin-key': key }, // no Content-Type — browser sets the multipart boundary itself
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export function whoAmI(key) {
  return adminFetch('/api/admin/whoami', key);
}

export function runIngestNow(source = 'manual') {
  return fetch(`${API_URL}/api/admin/run-ingest?source=${source}`, { method: 'POST' }).then((r) => r.json());
}

export function getStats(key) {
  return adminFetch('/api/admin/stats', key);
}

export function getIngestLogs(key) {
  return adminFetch('/api/admin/ingest-logs', key);
}

// Send a push notification for an already-published article (admin only).
export function notifyArticle(key, id, priority = 'normal') {
  return adminFetch(`/api/admin/articles/${id}/notify`, key, {
    method: 'POST',
    body: JSON.stringify({ priority }),
  });
}

// ---- Push notifications (Web Push + VAPID, no login) ----

export function getVapidPublicKey() {
  return fetchJSON('/api/push/vapid-public-key');
}

export async function subscribeToPush(subscription) {
  const res = await fetch(`${API_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  if (!res.ok) throw new Error('Subscribe failed');
  return res.json();
}

export async function unsubscribeFromPush(endpoint) {
  const res = await fetch(`${API_URL}/api/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  return res.json();
}

// ---- In-article image placement ----
// Admins can drop an uploaded image anywhere inside the body text as a
// token: [[img:https://...url...]]. This parses the body into an ordered
// list of text/image segments so the article page can render real
// in-article images at the exact spot the admin placed them, instead of
// only ever showing one lead image.
const IMG_TOKEN = /\[\[img:([^\]]+)\]\]/g;

// ---- Web search (the Search tab) — separate from searchArticles() above,
// which only searches Herald's own published articles. This hits the
// aggregator backed by SearXNG + Brave + Google CSE.
export function searchWeb(query) {
  return fetchJSON(`/api/search/web?q=${encodeURIComponent(query)}`);
}

// ---- Herald AI chat ----
export async function heraldAIChat(messages) {
  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Herald AI request failed');
  return data.reply;
}

export function parseArticleBody(body) {
  if (!body) return [];
  const segments = [];
  let lastIndex = 0;
  let match;
  IMG_TOKEN.lastIndex = 0;
  while ((match = IMG_TOKEN.exec(body)) !== null) {
    const text = body.slice(lastIndex, match.index).trim();
    if (text) segments.push({ type: 'text', value: text });
    segments.push({ type: 'image', url: match[1] });
    lastIndex = IMG_TOKEN.lastIndex;
  }
  const rest = body.slice(lastIndex).trim();
  if (rest) segments.push({ type: 'text', value: rest });
  return segments;
}

// ---- Saved articles (localStorage, no login) ----

const SAVED_KEY = 'herald_saved_articles';

export function getSavedIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
  } catch {
    return [];
  }
}

export function isSaved(id) {
  return getSavedIds().includes(id);
}

export function toggleSaved(id) {
  const ids = getSavedIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next.includes(id);
}

// ---- Reading history (localStorage, no login) ----

const HISTORY_KEY = 'herald_reading_history';
const HISTORY_MAX = 100;

export function getHistoryIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function recordHistory(id) {
  if (typeof window === 'undefined' || !id) return;
  const ids = getHistoryIds().filter((x) => x !== id);
  ids.unshift(id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(ids.slice(0, HISTORY_MAX)));
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
