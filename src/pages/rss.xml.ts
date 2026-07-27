import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byNewest, excerptOf, siteRoot } from '../lib/essay';

/**
 * 每日一篇的站台卻沒有訂閱管道，只有給 nplus-backend 的 essay.json——那是機器
 * 的介面，不是讀者的。這條 feed 是讀者端的入口。
 *
 * link 給的是含 base 的站內路徑，@astrojs/rss 會用 astro.config 的 site 補成
 * 絕對網址（nplus.wiki，不是會 301 的 github.io）。
 */
const base = import.meta.env.BASE_URL;

export async function GET() {
  const essays = (await getCollection('essays')).sort(byNewest);
  return rss({
    title: 'Bookshelf Echo',
    description: '每天用書櫃回應一則新聞——有共鳴才寫',
    // 站台掛在 base 底下，channel 的 link 要指到 /bookshelf-echo-site/ 而不是
    // 網域根目錄（那裡是別的站）。
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

/**
 * 摘要行帶上這篇回應的新聞與引用的書：feed 讀者往往只看得到這一段，而這個站
 * 的賣點正是「新聞 × 書」的配對，不是文章的第一句話。
 */
function essayDescription(e: Awaited<ReturnType<typeof getCollection<'essays'>>>[number]): string {
  const parts: string[] = [];
  if (e.data.news?.title) parts.push(`回應：${e.data.news.title}`);
  const books = (e.data.books ?? []).map((b) => b.title).filter(Boolean);
  if (books.length) parts.push(`引用：${books.join('、')}`);
  const excerpt = excerptOf(e.body ?? '', 160);
  if (excerpt) parts.push(excerpt);
  return parts.join(' — ');
}
