const BOOK_HOST = 'https://nplus.wiki';

export const bookSiteUrl = (slug: string): string => `${BOOK_HOST}/${slug}/`;
export const bookCoverUrl = (slug: string): string => `${BOOK_HOST}/${slug}/cover.png`;

export const chapterUrl = (chapterId: string): string | null => {
  const sep = chapterId.indexOf(':');
  if (sep < 0) return null;
  const slug = chapterId.slice(0, sep);
  let path = chapterId.slice(sep + 1).replace(/_index\.md$/, '').replace(/\.md$/, '/');
  if (!path.endsWith('/')) path += '/';
  return `${BOOK_HOST}/${slug}/${path}`;
};

export type EssayBook = {
  title: string;
  chapter?: string;
  slug?: string;
  chapter_id?: string;
};
