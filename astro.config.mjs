// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.trackhouston.org',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap({ filter: (page) => {
    const path = new URL(page).pathname.replace(/\/$/, '');
    return !['/coaches','/athletes','/alumni','/roster','/gold-room','/hall-of-champions','/results/division-history'].some((p) => path === p || path.startsWith(p + '/'));
  } })],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // sharp is the default; kept explicit for clarity
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
