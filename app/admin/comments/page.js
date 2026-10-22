'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdmin, PageHeader, Ico, Spinner, useToast, timeAgo } from '../../../components/studio';
import { getAdminComments, deleteAdminComment } from '../../../lib/data';

export default function CommentsPage() {
  const { key, role } = useAdmin();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, show] = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getAdminComments(key)
      .then(setComments)
      .catch(() => show('Could not load comments'))
      .finally(() => setLoading(false));
  }, [key, show]);

  useEffect(() => {
    if (role === 'admin') load();
    else setLoading(false);
  }, [role, load]);

  async function remove(c) {
    if (!confirm(`Delete this comment by ${c.name}?`)) return;
    try {
      await deleteAdminComment(key, c._id);
      setComments((list) => list.filter((x) => x._id !== c._id));
      show('Comment deleted');
    } catch {
      show('Could not delete');
    }
  }

  if (role !== 'admin') return <p className="text-center text-ink-soft py-20 text-sm">Admins only.</p>;

  return (
    <div>
      <PageHeader title="Comments" sub="Newest first — delete anything that doesn't belong" />
      {loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {!loading && comments.length === 0 && <p className="text-center text-ink-soft py-16 text-sm">No comments yet.</p>}
      <div>
        {comments.map((c) => (
          <div key={c._id} className="px-4 py-3.5 border-t border-rule">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink-soft"> · {timeAgo(c.createdAt)}</span>
                </p>
                <p className="text-sm text-ink whitespace-pre-line break-words mt-0.5">{c.text}</p>
                {c.article && (
                  <Link href={`/article/${c.article._id}`} target="_blank" className="block text-xs text-accent-dark mt-1.5 line-clamp-1">
                    on: {c.article.headline}
                  </Link>
                )}
              </div>
              <button onClick={() => remove(c)} aria-label="Delete comment" className="w-8 h-8 shrink-0 rounded-full border border-red-300 text-red-600 flex items-center justify-center">
                <Ico name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {toast}
    </div>
  );
}
