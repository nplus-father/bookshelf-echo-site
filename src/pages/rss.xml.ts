import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byNewest, excerptOf, siteRoot } from '../lib/essay';

const base = import.meta.env.BASE_URL;

export async function GET() {
  const essays = (await getCollection('essays')).sort(byNewest);
  return rss({
    title: 'Bookshelf Echo',
    description: '每天用書櫃回應一則新聞——有共鳴才寫',
    site: siteRoot(),
    trailingSlash: true,
    items: essays.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      link: `${base}essays/${e.id}/`,
      description: essayDescription(e),
    })),
    customData: '<language>zh-Hant</language>',
  });
}

function essayDescription(e: Awaited<ReturnType<typeof getCollection<'essays'>>>[number]): string {
  const parts: string[] = [];
  if (e.data.news?.title) parts.push(`回應：${e.data.news.title}`);
  const books = (e.data.books ?? []).map((b) => b.title).filter(Boolean);
  if (books.length) parts.push(`引用：${books.join('、')}`);
  const excerpt = excerptOf(e.body ?? '', 160);
  if (excerpt) parts.push(excerpt);
  return parts.join(' — ');
}
