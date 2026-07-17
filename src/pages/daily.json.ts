import { getCollection } from 'astro:content';

// Served at nplus.wiki (org Pages custom domain); keep deep links on that host.
const SITE = 'https://nplus.wiki/bookshelf-echo-site';

type Highlight = {
  title: string;
  url: string;
  summaryZh: string | null;
  summaryEn: string | null;
  score: number | null;
  category: string | null;
  source: string | null;
};

type AlsoSeen = { title: string; url: string };

/**
 * Machine-readable latest daily digest, consumed by nplus-backend's
 * AiRadarDailyPushJob (same public-JSON contract style as
 * nplus.wiki/goal-tracker/progress.json). Parses the markdown the pipeline's
 * DigestRenderer emits — that format is owned by us, so the line-based parse
 * is stable; unknown lines are ignored rather than failing the build.
 */
export async function GET() {
  const daily = await getCollection('daily');
  const latest = [...daily].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())[0];
  const payload = latest
    ? {
        date: latest.data.date.toISOString().slice(0, 10),
        itemCount: latest.data.itemCount ?? null,
        pageUrl: `${SITE}/daily/${latest.id}/`,
        ...parseDigest(latest.body ?? ''),
      }
    : { date: null, itemCount: null, pageUrl: null, highlights: [], alsoSeen: [] };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function parseDigest(body: string): { highlights: Highlight[]; alsoSeen: AlsoSeen[] } {
  const highlights: Highlight[] = [];
  const alsoSeen: AlsoSeen[] = [];
  let section: 'highlights' | 'also' | null = null;
  let current: { title: string; url: string; bullets: string[] } | null = null;

  const finalize = () => {
    if (!current) return;
    const meta = current.bullets[2]?.match(/^score (\d)\/5 · (\S+) · via (\S+)/);
    highlights.push({
      title: current.title,
      url: current.url,
      summaryZh: current.bullets[0] ?? null,
      summaryEn: current.bullets[1] ?? null,
      score: meta ? Number(meta[1]) : null,
      category: meta?.[2] ?? null,
      source: meta?.[3] ?? null,
    });
    current = null;
  };

  for (const line of body.split('\n')) {
    if (line.startsWith('## ')) {
      finalize();
      section = line.startsWith('## Highlights')
        ? 'highlights'
        : line.startsWith('## Also seen')
          ? 'also'
          : null;
      continue;
    }
    if (section === 'highlights') {
      const h = line.match(/^### \[(.+)\]\((\S+)\)\s*$/);
      if (h) {
        finalize();
        current = { title: h[1], url: h[2], bullets: [] };
        continue;
      }
      if (current && line.startsWith('- ')) current.bullets.push(line.slice(2));
    } else if (section === 'also') {
      const m = line.match(/^- \[(.+?)\]\((\S+?)\)/);
      if (m) alsoSeen.push({ title: m[1], url: m[2] });
    }
  }
  finalize();
  return { highlights, alsoSeen };
}
