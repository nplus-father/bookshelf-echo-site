import { getCollection } from 'astro:content';
import { parseDigest } from '../lib/digest';

const SITE = 'https://nplus.wiki/bookshelf-echo-site';

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
