import { getCollection } from 'astro:content';
import { byNewest, excerptOf, siteUrl } from '../lib/essay';

export async function GET() {
  const essays = await getCollection('essays');
  const latest = [...essays].sort(byNewest)[0];
  const site = siteUrl();
  const payload = latest
    ? {
        date: latest.data.date.toISOString().slice(0, 10),
        title: latest.data.title,
        pageUrl: `${site}/essays/${latest.id}/`,
        newsTitle: latest.data.news?.title ?? null,
        newsUrl: latest.data.news?.url ?? null,
        excerpt: excerptOf(latest.body ?? ''),
        books: (latest.data.books ?? []).map((b) => ({ title: b.title, chapter: b.chapter ?? null })),
      }
    : { date: null, title: null, pageUrl: null, newsTitle: null, newsUrl: null, excerpt: null, books: [] };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
