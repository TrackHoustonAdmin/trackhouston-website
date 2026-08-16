// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.trackhouston.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap({ filter: (page) => !['/coaches','/athletes','/alumni','/roster'].some((p) => new URL(page).pathname.replace(/\/$/, '') === p) })],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // sharp is the default; kept explicit for clarity
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
