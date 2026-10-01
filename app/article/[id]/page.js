import { Header } from '../../../components/layout';
import { ArticleActions, SaveButton, ReadingProgress } from '../../../components/interactive';
import { ArticleRow, SafeImage } from '../../../components/cards';
import { getArticle } from '../../../lib/data';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  try {
    const { article } = await getArticle(params.id);
    return {
      title: article.headline,
      description: article.body.slice(0, 155),
      openGraph: {
        title: article.headline,
        description: article.body.slice(0, 155),
        images: [{ url: article.image }],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: article.headline,
        images: [article.image],
      },
      alternates: { canonical: `/article/${params.id}` },
    };
  } catch {
    return { title: 'Article not found' };
  }
}

function estimateReadTime(body) {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function ArticlePage({ params }) {
  let data;
  try {
    data = await getArticle(params.id);
  } catch {
    notFound();
  }

  const { article, related } = data;
  const url = `https://herald.ng/article/${article._id}`;
  const readMins = estimateReadTime(article.body);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    image: [article.image],
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
    author: [{ '@type': 'Organization', name: 'Herald' }],
  };

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative w-full aspect-[4/3] bg-rule">
        <SafeImage src={article.image} fill priority sizes="100vw" className="object-cover" />
      </div>

      <article className="px-4 pt-6">
        <span className="inline-block text-accent-dark text-xs font-bold uppercase tracking-wide mb-2">
          {article.category}
        </span>
        <h1 className="font-serif text-3xl leading-tight font-semibold text-ink mb-3">
          {article.headline}
        </h1>

        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal text-xs font-bold shrink-0">
            {article.source?.charAt(0).toUpperCase()}
          </span>
          <div className="text-sm">
            <span className="font-medium text-teal">{article.source}</span>
            <span className="text-ink-soft">
              {' · '}
              {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {readMins} min read
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-y border-rule">
          <ArticleActions
            articleId={article._id}
            initialLikes={article.likes}
            initialShares={article.shares}
            title={article.headline}
            url={url}
          />
          <SaveButton articleId={article._id} />
        </div>

        <div className="prose prose-lg max-w-none pt-6 font-serif text-ink leading-relaxed whitespace-pre-line">
          {article.body}
        </div>
      </article>

      {related?.length > 0 && (
        <section className="mt-10">
          <h2 className="px-4 font-serif text-xl font-semibold text-ink mb-2">You may like</h2>
          {related.map((r) => (
            <ArticleRow key={r._id} article={r} />
          ))}
        </section>
      )}
    </main>
  );
}
