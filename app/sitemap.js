import { getFeed } from '../lib/data';

export default async function sitemap() {
  const base = 'https://herald.ng';
  let articles = [];
  try {
    articles = await getFeed(1);
  } catch {
    articles = [];
  }

  const articleEntries = articles.map((a) => ({
    url: `${base}/article/${a._id}`,
    lastModified: a.updatedAt,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    ...articleEntries,
  ];
}
