/**
 * Essay 的共用讀取邏輯：排序、摘錄、站內網址。
 *
 * 這些以前散在 essay.json.ts 裡，RSS 出現後就成了兩份會各自漂移的副本——
 * 摘錄規則改一邊，LINE 推播和訂閱看到的第一句話就會不一樣。
 */
import type { CollectionEntry } from 'astro:content';

/** 站台正規網址（含 base，無尾斜線），由 astro.config 的 site + base 推出。 */
export const siteUrl = (): string => siteRoot().replace(/\/$/, '');

/** 同上但保留尾斜線——當成 URL 基底用時，少了它會把 base 段吃掉。 */
export const siteRoot = (): string => new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href;

/** 最新的在前。日期相同時（不該發生）以 id 收斂，避免順序不穩定。 */
export const byNewest = (
  a: CollectionEntry<'essays'>,
  b: CollectionEntry<'essays'>,
): number => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);

/** First ~200 chars of essay prose — skip headings, quotes, lists and rules. */
export function excerptOf(body: string, limit = 200): string | null {
  const prose = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>\-*|`]/.test(l));
  return prose.length ? prose.join(' ').slice(0, limit) : null;
}
