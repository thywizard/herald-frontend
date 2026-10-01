import { Header } from '../../../components/layout';
import { ArticleRow } from '../../../components/cards';
import { getSourceArticles } from '../../../lib/data';

export async function generateMetadata({ params }) {
  return { title: decodeURIComponent(params.name) };
}

export default async function SourcePage({ params }) {
  const name = decodeURIComponent(params.name);
  const articles = await getSourceArticles(name);

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-5 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-ink">{name}</h1>
        <p className="text-sm text-ink-soft mt-1">{articles.length} articles</p>
      </div>
      <div>
        {articles.map((article) => (
          <ArticleRow key={article._id} article={article} />
        ))}
      </div>
      {articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">No articles found from this source.</p>
      )}
    </main>
  );
}
