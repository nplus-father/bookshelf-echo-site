// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 正式網址是自訂網域 https://nplus.wiki/bookshelf-echo-site/；
// nplus-father.github.io 只會 301 轉過來。canonical、sitemap、RSS 全都從這裡的
// `site` 推出來，所以它必須是讀者真正打到的位址，而不是背後的 Pages 主機名。
export default defineConfig({
  site: 'https://nplus.wiki',
  base: '/bookshelf-echo-site/',
  integrations: [sitemap()],
});
