import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nplus.wiki',
  base: '/bookshelf-echo-site/',
  integrations: [sitemap()],
});
