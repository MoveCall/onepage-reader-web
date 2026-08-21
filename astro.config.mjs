// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site: https://movecall.github.io/onepage-reader-web/
  // Rename the repo? change `base` below to '/<new-repo-name>/' and rebuild — that's the only spot.
  site: 'https://movecall.github.io',
  base: '/onepage-reader-web/',
  integrations: [sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', zh: 'zh' } } })],
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    worker: {
      format: 'es',
    },
    resolve: {
      alias: [{ find: /^esptool-js$/, replacement: 'esptool-js/bundle.js' }],
    },
  },
});
