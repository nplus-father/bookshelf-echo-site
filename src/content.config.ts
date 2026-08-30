import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

const essays = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/essays' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.string().optional(),
    model: z.string().optional(),
    news: z
      .object({
        title: z.string(),
        url: z.string(),
        source: z.string().optional(),
        summary: z.string().optional(),
        category: z.string().optional(),
      })
      .optional(),
    books: z
      .array(
        z.object({
          title: z.string(),
          chapter: z.string().optional(),
          slug: z.string().optional(),
          chapter_id: z.string().optional(),
          category: z.string().optional(),
          author: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

export const collections = { daily, weekly, essays };
