'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout';
import { ArticleRow } from '../../components/cards';
import { getHistoryIds, getArticle, clearHistory } from '../../lib/data';

export default function HistoryPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getHistoryIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    // History is already stored newest-first, so preserve that order.
    Promise.all(ids.map((id) => getArticle(id).then((data) => data.article).catch(() => null))).then((results) => {
      setArticles(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  function handleClear() {
    if (!confirm('Clear your reading history?')) return;
    clearHistory();
    setArticles([]);
  }

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-ink">History</h1>
        {articles.length > 0 && (
          <button onClick={handleClear} className="text-sm font-medium text-red-600">
            Clear
          </button>
        )}
      </div>
      {loading && <p className="text-center text-ink-soft py-16">Loading...</p>}
      {!loading && articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">Articles you read will show up here.</p>
      )}
      <div>
        {articles.map((article) => (
          <ArticleRow key={article._id} article={article} />
        ))}
      </div>
    </main>
  );
}
