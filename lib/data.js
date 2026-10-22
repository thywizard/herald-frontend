const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Render's free tier spins the backend down after idle time, so the very
// first request after a while can fail outright (timeout / connection
// refused) rather than just being slow. One silent retry after a short
// pause turns that into a brief extra wait instead of a hard error for
// what's really just the server waking back up.
async function fetchJSON(path, { retry = true } = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`API request failed: ${path} (${res.status})`);
    return res.json();
  } catch (err) {
    if (retry) {
      await new Promise((r) => setTimeout(r, 2500));
      return fetchJSON(path, { retry: false });
    }
    throw err;
  }
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

export function listArticles(key, { status, page = 1, q, origin } = {}) {
  const params = new URLSearchParams({ page });
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  if (origin) params.set('origin', origin);
  return adminFetch(`/api/admin/articles?${params}`, key);
}

export function getAdminArticle(key, id) {
  return adminFetch(`/api/admin/articles/${id}`, key);
}

// AI writing helper in the editor. action: headlines | summary | keypoint | proofread | expand
export function aiAssist(key, action, { headline, body }) {
  return adminFetch('/api/admin/ai-assist', key, { method: 'POST', body: JSON.stringify({ action, headline, body }) });
}

export function getAdminComments(key) {
  return adminFetch('/api/admin/comments', key);
}

export function deleteAdminComment(key, id) {
  return adminFetch(`/api/admin/comments/${id}`, key, { method: 'DELETE' });
}

export function broadcastPush(key, { title, articleId, priority }) {
  return adminFetch('/api/admin/push-broadcast', key, {
    method: 'POST',
    body: JSON.stringify({ title, articleId, priority }),
  });
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

// Admin-only: are VAPID keys set, how many devices are actually subscribed in
// the database, and send a test notification to all of them.
export function getPushStatus(key) {
  return adminFetch('/api/admin/push-status', key);
}

// Really calls the AI models and reports what happened (key / model-name /
// rate-limit problems appear verbatim). Admin only.
export function getAiCheck(key) {
  return adminFetch('/api/admin/ai-check', key);
}

export function sendTestPush(key) {
  return adminFetch('/api/admin/push-test', key, { method: 'POST' });
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
const IMG_TOKEN = /\[\[img:\s*([^\]\s]+)\s*\]\]/g;

// ---- Web search (the Search tab) — separate from searchArticles() above,
// which only searches Herald's own published articles. This hits the
// aggregator backed by SearXNG + Brave + Google CSE. (fetchJSON already
// retries once on failure — see its comment — which covers Render cold starts.)
// category: 'general' | 'news' | 'images' | 'videos'
export function searchWeb(query, category = 'general') {
  return fetchJSON(`/api/search/web?q=${encodeURIComponent(query)}&category=${category}`);
}

// The AI Overview is fetched separately from the results so results show up
// right away and the overview fills in when ready. Resolves to
// { answer: string|null, sources: [{title, url}] }; never throws.
export async function searchAnswer(query) {
  try {
    const res = await fetch(`${API_URL}/api/search/answer?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { answer: null, sources: [] };
    return await res.json();
  } catch {
    return { answer: null, sources: [] };
  }
}

// Fire-and-forget: wakes the backend and the (sleepy, free-tier) search
// engine behind it. Called when the app opens and when the search box is
// focused, so the first real search doesn't hit a cold server.
let lastWarmAt = 0;
export function warmSearch() {
  if (typeof window === 'undefined' || Date.now() - lastWarmAt < 3 * 60 * 1000) return;
  lastWarmAt = Date.now();
  fetch(`${API_URL}/api/search/warm`, { cache: 'no-store' }).catch(() => {});
}

// ---- Recent searches (localStorage, no login) ----

const RECENT_SEARCHES_KEY = 'herald_recent_searches';
const RECENT_SEARCHES_MAX = 12;

export function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  } catch {
    return [];
  }
}

export function recordRecentSearch(query) {
  if (typeof window === 'undefined' || !query?.trim()) return;
  const q = query.trim();
  const existing = getRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase());
  existing.unshift(q);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(existing.slice(0, RECENT_SEARCHES_MAX)));
  } catch {
    // ignore
  }
}

export function removeRecentSearch(query) {
  if (typeof window === 'undefined') return;
  const next = getRecentSearches().filter((x) => x !== query);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ---- Herald AI chat sessions (localStorage, no login) ----
// Each session: { id, title, messages: [{role, content, attachments}], updatedAt }
// A session only gets saved to the list once it has at least one message,
// so starting "New chat" and not sending anything doesn't clutter history.

const CHAT_SESSIONS_KEY = 'herald_ai_sessions';
const CHAT_SESSIONS_MAX = 50;

export function getChatSessions() {
  if (typeof window === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY)) || [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getChatSession(id) {
  return getChatSessions().find((s) => s.id === id) || null;
}

export function saveChatSession(session) {
  if (typeof window === 'undefined' || !session?.id) return;
  const list = getChatSessions().filter((s) => s.id !== session.id);
  list.unshift({ ...session, updatedAt: Date.now() });
  try {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(list.slice(0, CHAT_SESSIONS_MAX)));
  } catch {
    // ignore
  }
}

export function deleteChatSession(id) {
  if (typeof window === 'undefined') return;
  const list = getChatSessions().filter((s) => s.id !== id);
  try {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// ---- Comments ----
// No login in Herald, so a comment's display name is picked per-comment,
// not tied to an account — we just remember the last name used, as a
// convenience, so it doesn't have to be retyped every time.

export function getComments(articleId) {
  return fetchJSON(`/api/comments/${articleId}`);
}

export async function postComment(articleId, { name, text }) {
  const res = await fetch(`${API_URL}/api/comments/${articleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not post comment');
  return data;
}

const COMMENT_NAME_KEY = 'herald_comment_name';

export function getSavedCommentName() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(COMMENT_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCommentName(name) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMMENT_NAME_KEY, name);
  } catch {
    // ignore
  }
}

// ---- Herald AI chat ----
// Returns { reply, attachments } — attachments are structured results from
// tools the AI used (web search, Herald article search, a like action),
// rendered as rich cards under the chat bubble rather than left as text.
export async function heraldAIChat(messages) {
  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Herald AI request failed');
  return { reply: data.reply, attachments: data.attachments || [] };
}

// The "sweet part" of an article: a clean lead of about `max` characters,
// ending on a sentence boundary where possible. Image tokens are stripped.
// Used for share text and social-preview descriptions.
export function articleLead(body, max = 220) {
  const clean = String(body || '')
    .replace(/\[\[img:[^\]]*\]\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return cut.replace(/\s+\S*$/, '') + '…';
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

// ---- Offline reading (Cache Storage) ----
// Saving an article doesn't just bookmark it — it also caches the
// rendered page (and lead image) in the browser, so it still opens with
// no data connection, not just a title you can't read. The service
// worker's fetch handler falls back to this cache whenever the network
// request fails. Unsaving removes it.
const OFFLINE_CACHE = 'herald-offline-v1';

export async function cacheArticleOffline(id, imageUrl) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.add(`/article/${id}`);
    if (imageUrl) {
      try {
        await cache.add(imageUrl);
      } catch {
        // a cross-origin image with no CORS headers can't be cached this
        // way — the page itself still works offline, just without the photo
      }
    }
  } catch {
    // best-effort: saving still works locally even if offline caching fails
  }
}

export async function uncacheArticleOffline(id) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(`/article/${id}`);
  } catch {
    // ignore
  }
}

// Streaming version of heraldAIChat: the reply arrives word-by-word.
//   onDelta(text)        – a piece of the reply
//   onAttachment(obj)    – a rich card from a tool (web results, …)
//   onStatus(text)       – "Searching the web…" while a tool runs
// Resolves when the reply is complete. If the streaming endpoint isn't
// available (older backend / unsupported browser) it quietly falls back to
// the one-shot /chat endpoint so chat still works.
export async function streamHeraldAI(messages, { onDelta, onAttachment, onStatus, signal } = {}) {
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${API_URL}/api/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal,
      });
      break;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt === 1) throw new Error("Couldn't reach Herald AI — the server may be waking up. Try again in a few seconds.");
      await new Promise((r) => setTimeout(r, 2500)); // Render cold start: one retry
    }
  }

  if (!res.ok || !res.body) {
    const { reply, attachments } = await heraldAIChat(messages);
    attachments.forEach((a) => onAttachment?.(a));
    onDelta?.(reply);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (event.type === 'delta') onDelta?.(event.text);
      else if (event.type === 'attachment') onAttachment?.(event.data);
      else if (event.type === 'status') onStatus?.(event.text);
      else if (event.type === 'error') throw new Error(event.message || 'Herald AI request failed');
    }
  }
}
