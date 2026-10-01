import { Header, CategoryTabs } from '../../../components/layout';
import { InfiniteFeed } from '../../../components/interactive';
import { getCategoryFeed, CATEGORIES } from '../../../lib/data';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  return { title: `${params.slug.charAt(0).toUpperCase()}${params.slug.slice(1)}` };
}

export default async function CategoryPage({ params }) {
  if (!CATEGORIES.includes(params.slug)) notFound();
  const articles = await getCategoryFeed(params.slug);

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <CategoryTabs active={params.slug} />
      <h1 className="sr-only">{params.slug}</h1>

      <InfiniteFeed type="category" param={params.slug} initialArticles={articles} />

      {articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">Nothing in this category yet — check back soon.</p>
      )}
    </main>
  );
}
