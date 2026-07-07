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

export const collections = { daily, weekly };
