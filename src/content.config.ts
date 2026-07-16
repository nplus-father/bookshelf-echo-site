import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The pipeline writes markdown into content/daily and content/weekly.
// Astro 5 Content Layer globs them straight from those directories.
const daily = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/daily' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    itemCount: z.number().optional(),
  }),
});

const weekly = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/weekly' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    itemCount: z.number().optional(),
    highlightCount: z.number().optional(),
  }),
});

// news-echo：每日一篇書櫃評析（可缺席——「有共鳴才寫」是合法輸出）。
const essays = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/essays' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.string().optional(),
  }),
});

export const collections = { daily, weekly, essays };
