'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout';
import { ArticleRow } from '../../components/cards';
import { getSavedIds, getArticle } from '../../lib/data';

export default function SavedPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getSavedIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) => getArticle(id).then((data) => data.article).catch(() => null))
    ).then((results) => {
      setArticles(results.filter(Boolean).reverse());
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <h1 className="px-4 pt-5 pb-2 font-serif text-2xl font-semibold text-ink">Saved</h1>
      {loading && <p className="text-center text-ink-soft py-16">Loading...</p>}
      {!loading && articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">Articles you save will show up here.</p>
      )}
      <div>
        {articles.map((article) => (
          <ArticleRow key={article._id} article={article} />
        ))}
      </div>
    </main>
  );
}
