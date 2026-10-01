'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../../../components/interactive';
import { SafeImage } from '../../../components/cards';
import { listArticles, deleteArticle, unpublishArticle, publishArticle, togglePin } from '../../../lib/data';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Pending', value: 'pending' },
  { label: 'Unpublished', value: 'unpublished' },
];

export default function ArticlesPage() {
  const { key, role } = useAdmin();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listArticles(key, { status: status || undefined })
      .then((data) => {
        setArticles(data.articles);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [key, status]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Delete this article permanently?')) return;
    await deleteArticle(key, id);
    load();
  }
  async function handleUnpublish(id) { await unpublishArticle(key, id); load(); }
  async function handlePublish(id) { await publishArticle(key, id); load(); }
  async function handlePin(id) { await togglePin(key, id); load(); }

  return (
    <div>
      <div className="sticky top-[88px] bg-paper border-b border-rule px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-serif text-lg font-semibold text-ink">{total} articles</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${status === f.value ? 'bg-ink text-paper' : 'bg-rule/50 text-ink-soft'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-center text-ink-soft py-16">Loading...</p>}

      <div>
        {articles.map((a) => (
          <div key={a._id} className="flex gap-3 px-4 py-3 border-b border-rule">
            <div className="relative w-16 h-16 shrink-0 bg-rule overflow-hidden">
              <SafeImage src={a.image} sizes="64px" fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-soft mb-0.5">
                {a.source} · {a.category} · {a.status} · {a.views || 0} views
                {a.isPinned && <span className="text-accent-dark font-semibold"> · PINNED</span>}
              </p>
              <p className="text-sm font-medium text-ink line-clamp-2 mb-1.5">{a.headline}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {role === 'admin' && (
                  <button onClick={() => handlePin(a._id)} className="text-teal underline">
                    {a.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {a.status === 'published' ? (
                  role === 'admin' && (
                    <button onClick={() => handleUnpublish(a._id)} className="text-ink-soft underline">Unpublish</button>
                  )
                ) : (
                  <button onClick={() => handlePublish(a._id)} className="text-teal underline">Publish</button>
                )}
                {role === 'admin' && (
                  <button onClick={() => handleDelete(a._id)} className="text-red-600 underline">Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">No articles match this filter.</p>
      )}
    </div>
  );
}
