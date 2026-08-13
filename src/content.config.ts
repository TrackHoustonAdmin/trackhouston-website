import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['Championships', 'Club News', 'Athletes', 'Registration']),
    excerpt: z.string(),
    featured: z.boolean().default(false),
  }),
});

const history = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/history' }),
  schema: z.object({
    year: z.coerce.number(),
    title: z.string(),
    sections: z.number(),
  }),
});

export const collections = { news, history };
