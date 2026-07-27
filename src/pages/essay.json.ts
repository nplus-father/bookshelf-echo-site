import { getCollection } from 'astro:content';
import { byNewest, excerptOf, siteUrl } from '../lib/essay';

/**
 * Machine-readable latest essay (news-echo), consumed by nplus-backend's
 * AiRadarDailyPushJob. The output keys (date/title/pageUrl/newsTitle/newsUrl/
 * excerpt/books) are a stable contract; only the source changed — provenance now
 * comes from structured frontmatter (EssayRenderer) instead of a prose parse.
 * Days without an essay are legal (寧缺勿濫): the payload then has date: null.
 *
 * pageUrl 以前在這裡硬編一份 https://nplus.wiki/bookshelf-echo-site。網址現在
 * 只有 astro.config 一個來源（site + base），這一頁跟著它走。
 */
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
