import { getCollection } from 'astro:content';

// Served at nplus.wiki (org Pages custom domain); keep deep links on that host.
const SITE = 'https://nplus.wiki/bookshelf-echo-site';

type EssayBook = { title: string; chapter: string | null };

/**
 * Machine-readable latest essay (news-echo), consumed by nplus-backend's
 * AiRadarDailyPushJob — same public-JSON contract style as daily.json.
 * Parses the markdown bookshelf-echo's EssayRenderer emits; that format is owned by
 * us, so the line-based parse is stable. Days without an essay are legal
 * (寧缺勿濫): the payload then has date: null.
 */
export async function GET() {
  const essays = await getCollection('essays');
  const latest = [...essays].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())[0];
  const payload = latest
    ? {
        date: latest.data.date.toISOString().slice(0, 10),
        title: latest.data.title,
        pageUrl: `${SITE}/essays/${latest.id}/`,
        ...parseEssay(latest.body ?? ''),
      }
    : { date: null, title: null, pageUrl: null, newsTitle: null, newsUrl: null, excerpt: null, books: [] };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function parseEssay(body: string): {
  newsTitle: string | null;
  newsUrl: string | null;
  excerpt: string | null;
  books: EssayBook[];
} {
  let newsTitle: string | null = null;
  let newsUrl: string | null = null;
  const books: EssayBook[] = [];
  const bodyParagraphs: string[] = [];
  let inBookList = false;

  for (const line of body.split('\n')) {
    const news = line.match(/^> 回應新聞：\[(.+)\]\((\S+)\)/);
    if (news) {
      newsTitle = news[1];
      newsUrl = news[2];
      continue;
    }
    if (line.startsWith('本文書目')) {
      inBookList = true;
      continue;
    }
    if (inBookList) {
      const b = line.match(/^- 《(.+?)》(?:｜(.+))?$/);
      if (b) books.push({ title: b[1], chapter: b[2] ?? null });
      continue;
    }
    // Excerpt source: plain prose lines of the essay body — skip headings,
    // quotes, list items and rules so the teaser reads as a sentence.
    const t = line.trim();
    if (t && !/^[#>\-*|`]/.test(t)) bodyParagraphs.push(t);
  }

  const excerpt = bodyParagraphs.length ? bodyParagraphs.join(' ').slice(0, 200) : null;
  return { newsTitle, newsUrl, excerpt, books };
}
