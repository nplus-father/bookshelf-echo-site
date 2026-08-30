import type { CollectionEntry } from 'astro:content';

export const siteUrl = (): string => siteRoot().replace(/\/$/, '');

export const siteRoot = (): string => new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href;

export const byNewest = (
  a: CollectionEntry<'essays'>,
  b: CollectionEntry<'essays'>,
): number => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);

export function excerptOf(body: string, limit = 200): string | null {
  const prose = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>\-*|`]/.test(l));
  return prose.length ? prose.join(' ').slice(0, limit) : null;
}
