'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAdmin, Chip, Ico, Spinner, useToast } from '../../../components/studio';
import { SafeImage } from '../../../components/cards';
import { listArticles, deleteArticle, unpublishArticle, publishArticle, togglePin, notifyArticle } from '../../../lib/data';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Pending', value: 'pending' },
  { label: 'Unpublished', value: 'unpublished' },
];
const ORIGIN_FILTERS = [
  { label: 'Any source', value: '' },
  { label: 'AI', value: 'ai' },
  { label: 'Editors', value: 'editor' },
  { label: 'Admin', value: 'admin' },
];

const STATUS_STYLE = {
  published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  unpublished: 'bg-rule text-ink-soft',
};

export default function ArticlesPage() {
  const { key, role } = useAdmin();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [origin, setOrigin] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, show] = useToast();
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    (pageNum = 1, append = false) => {
      const myReq = ++reqRef.current;
      setLoading(true);
      listArticles(key, { status: status || undefined, origin: origin || undefined, q: debouncedQ || undefined, page: pageNum })
        .then((data) => {
          if (myReq !== reqRef.current) return;
          setArticles((prev) => (append ? [...prev, ...data.articles] : data.articles));
          setTotal(data.total);
          setPage(pageNum);
        })
        .catch(() => show('Could not load articles'))
        .finally(() => myReq === reqRef.current && setLoading(false));
    },
    [key, status, origin, debouncedQ, show]
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  async function act(id, fn, okMsg) {
    setBusyId(id);
    try {
      await fn();
      show(okMsg);
      load(1, false);
    } catch (err) {
      show('Failed: ' + err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(a) {
    if (!confirm(`Delete "${a.headline}" permanently?`)) return;
    act(a._id, () => deleteArticle(key, a._id), 'Deleted');
  }

  async function handleNotify(a) {
    if (!confirm('Send a push notification for this article to everyone subscribed?')) return;
    setBusyId(a._id);
    try {
      const { push } = await notifyArticle(key, a._id);
      show(push ? `Sent to ${push.sent} device(s)` : 'Notification sent');
    } catch {
      show('Failed to send notification');
    } finally {
      setBusyId(null);
    }
  }

  const btn = 'px-2.5 py-1 rounded-full text-[11px] font-medium border border-rule text-ink-soft active:bg-rule/40 disabled:opacity-40';

  return (
    <div>
      <div className="sticky top-12 z-20 bg-paper/95 backdrop-blur border-b border-rule px-4 pt-3 pb-2.5">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="font-serif text-xl font-semibold text-ink">Articles</h1>
          <span className="text-xs text-ink-soft">{total} total</span>
        </div>
        <div className="relative mb-2.5">
          <Ico name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headlines…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-rule/40 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} active={status === f.value} onClick={() => setStatus(f.value)}>{f.label}</Chip>
          ))}
          <span className="w-px bg-rule mx-0.5 shrink-0" />
          {ORIGIN_FILTERS.map((f) => (
            <Chip key={f.value} active={origin === f.value} onClick={() => setOrigin(f.value)}>{f.label}</Chip>
          ))}
        </div>
      </div>

      <div>
        {articles.map((a) => (
          <div key={a._id} className="flex gap-3 px-4 py-3.5 border-b border-rule">
            <div className="relative w-[72px] h-[72px] shrink-0 bg-rule overflow-hidden rounded-xl">
              <SafeImage src={a.image} sizes="72px" fill className="object-cover" priority />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLE[a.status] || STATUS_STYLE.unpublished}`}>
                  {a.status}
                </span>
                {a.isPinned && <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent/15 text-accent-dark">Pinned</span>}
                <span className="text-[11px] text-ink-soft">
                  {a.source} · {a.category} · {a.origin} · {a.views || 0} views
                </span>
              </div>
              <p className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-2">{a.headline}</p>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/admin/add?edit=${a._id}`} className={`${btn} !text-accent-dark !border-accent/40`}>Edit</Link>
                {a.status === 'published' && (
                  <Link href={`/article/${a._id}`} target="_blank" className={btn}>View</Link>
                )}
                {role === 'admin' && (
                  <button disabled={busyId === a._id} onClick={() => act(a._id, () => togglePin(key, a._id), a.isPinned ? 'Unpinned' : 'Pinned')} className={btn}>
                    {a.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {a.status === 'published' ? (
                  role === 'admin' && (
                    <button disabled={busyId === a._id} onClick={() => act(a._id, () => unpublishArticle(key, a._id), 'Unpublished')} className={btn}>Unpublish</button>
                  )
                ) : (
                  <button disabled={busyId === a._id} onClick={() => act(a._id, () => publishArticle(key, a._id), 'Published')} className={`${btn} !text-emerald-700 !border-emerald-500/40`}>Publish</button>
                )}
                {role === 'admin' && a.status === 'published' && (
                  <button disabled={busyId === a._id} onClick={() => handleNotify(a)} className={btn}>Notify</button>
                )}
                {role === 'admin' && (
                  <button disabled={busyId === a._id} onClick={() => handleDelete(a)} className={`${btn} !text-red-600 !border-red-300`}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}

      {!loading && articles.length === 0 && (
        <p className="text-center text-ink-soft py-16 text-sm">No articles match these filters.</p>
      )}

      {!loading && articles.length < total && (
        <div className="flex justify-center py-5">
          <button onClick={() => load(page + 1, true)} className="px-5 py-2 rounded-full border border-rule text-sm font-medium text-ink">
            Load more ({total - articles.length} left)
          </button>
        </div>
      )}
      {toast}
    </div>
  );
}
