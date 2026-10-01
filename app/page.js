import { Header, BreakingBar, CategoryTabs, Footer } from '../components/layout';
import { LeadStory } from '../components/cards';
import { InfiniteFeed } from '../components/interactive';
import { getFeed } from '../lib/data';

export default async function HomePage() {
  const articles = await getFeed(1);
  const [lead, ...rest] = articles;

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <BreakingBar items={articles.slice(0, 5)} />
      <CategoryTabs />

      {lead && <LeadStory article={lead} />}

      <InfiniteFeed type="home" initialArticles={rest} />

      {articles.length === 0 && (
        <p className="text-center text-ink-soft py-16">
          Nothing published yet — check back soon.
        </p>
      )}

      <Footer />
    </main>
  );
}
