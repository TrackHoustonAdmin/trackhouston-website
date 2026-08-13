# Track Houston — Website

Redesign of trackhouston.com for Track Houston Youth Track Club.
Astro + Tailwind CSS, fully static, deploy-ready for **Vercel**.

## Quick start

```bash
npm install
npm run dev      # local dev at localhost:4321
npm run build    # production build → dist/
```

## Deploying to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel: **Add New Project** → import the repo. Vercel auto-detects Astro
   (build command `astro build`, output `dist`). No adapter needed — the site is static.
3. `vercel.json` in the repo root carries the **301 redirects for every legacy
   `.html` URL** from the old Weebly site, plus long-cache headers for assets.
4. Point the `trackhouston.com` / `www.trackhouston.com` DNS at Vercel when ready.

## Where to edit content (no code required)

All frequently-updated content lives in data files — pages read from them:

| File | Contains |
|---|---|
| `src/data/locations.json` | Practice sites, addresses, days/times, site coaches |
| `src/data/coaches.json` | Leadership, XC coaches, age-division head coaches |
| `src/data/schedule.json` | Meet schedules (XC + T&F seasons) |
| `src/data/results.json` | Medal counts, records, honors, homepage ticker |
| `src/data/athletes.json` | Spotlights, current champions, college roster |
| `src/data/sponsors.json` | Sponsorship tiers, vendor info, partners |
| `src/data/site.json` | Registration links/status, socials, stats, address |
| `src/content/news/*.md` | News posts (one markdown file per post) |

Photos live in `src/assets/photos/` — Astro generates responsive WebP automatically.

## Updating the team roster

The `/roster` page reads `src/data/roster.json`. To refresh it from a new
registration export:

```bash
node scripts/build-roster.mjs path/to/export.csv "Spring 2027 Track & Field"
```

**PRIVACY:** the registration export contains addresses, birthdates, medical and
insurance data. The script publishes ONLY name, age division and practice site.
Never commit the CSV itself — `.gitignore` blocks all `.csv` files as a guard.

## Changing the registration link or status

Update **one file**: `src/data/site.json` →
`registration.trackFieldUrl` / `registration.crossCountryUrl` (and the
`status`/`note` copy). Every CTA on the site flows through `/register` and the
`CTAButton` component, so nothing else changes.

## Placeholders that need real content

Search the codebase for `[TO CONFIRM` — currently:

- Season fees (`src/pages/register.astro`)
- Forms & policies documents (`src/pages/parents.astro`)

Historical results (2006–2023 JO archives, records PDF) are flagged on
`/results` as "archive being migrated" — add them to `src/data/results.json`
as they're digitized.

## Structure

- `src/layouts/Layout.astro` — SEO meta, OG tags, JSON-LD, fonts, scroll/count-up scripts
- `src/components/` — Nav, Footer, CTAButton, PageHero, SectionHeading, StatBlock,
  LocationCard, MeetRow, CoachCard, NewsCard, Ticker, Wordmark
- `src/pages/` — one file per route
- `src/styles/global.css` — Tailwind theme tokens (Track Houston red `#d31e2b`,
  ink, chalk), display type rules, motion (respects `prefers-reduced-motion`)

Accessibility: semantic HTML, skip link, visible focus states, keyboard-friendly
mobile nav, alt text on all photography, WCAG-conscious contrast.
