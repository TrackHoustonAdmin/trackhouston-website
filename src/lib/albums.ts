import fs from 'node:fs';
import path from 'node:path';

// Albums are folders under public/gallery/<slug>/{full,thumb}/.
// Drop a new album folder in and it appears on the site automatically.
const GALLERY_DIR = path.resolve('public/gallery');

export interface Album {
  slug: string;
  title: string;
  year: string | null;
  count: number;
  cover: string | null; // /gallery/<slug>/thumb/<file>
}

function titleOf(slug: string): string {
  let t = slug.replace(/---/g, ' — ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  t = t
    .replace(/\bUsatf\b/g, 'USATF')
    .replace(/\bAau\b/g, 'AAU')
    .replace(/\bUsa\b/g, 'USA')
    .replace(/\bXc\b/g, 'XC')
    .replace(/\bXii\b/g, 'XII')
    .replace(/\bTx\b/g, 'TX')
    .replace(/\bNc\b/g, 'NC')
    .replace(/\bCa\b/g, 'CA')
    .replace(/\bKa\b/g, 'KS')
    .replace(/\bKs\b/g, 'KS')
    .replace(/\bFl\b/g, 'FL')
    .replace(/\bMd\b/g, 'MD')
    .replace(/\bIl\b/g, 'IL')
    .replace(/\bIn\b(?=$|\s*$)/g, 'IN')
    .replace(/\bMi\b/g, 'MI')
    .replace(/\bLa\b(?=$|\s)/g, 'LA')
    .replace(/\bOr\b(?=$|\s*$)/g, 'OR')
    .replace(/\bTn\b/g, 'TN')
    .replace(/Junior Olympic/gi, 'Junior Olympic');
  return t;
}

export function getAlbums(): Album[] {
  if (!fs.existsSync(GALLERY_DIR)) return [];
  const slugs = fs
    .readdirSync(GALLERY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const albums: Album[] = [];
  for (const slug of slugs) {
    const thumbDir = path.join(GALLERY_DIR, slug, 'thumb');
    if (!fs.existsSync(thumbDir)) continue;
    const files = fs
      .readdirSync(thumbDir)
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .sort();
    if (files.length < 3) continue;
    const year = (slug.match(/^(\d{4})/) || [])[1] ?? null;
    albums.push({
      slug,
      title: titleOf(slug),
      year,
      count: files.length,
      cover: `/gallery/${slug}/thumb/${files[0]}`,
    });
  }
  // newest year first, then title
  albums.sort((a, b) => (b.year ?? '').localeCompare(a.year ?? '') || a.title.localeCompare(b.title));
  return albums;
}

export function getAlbumImages(slug: string): { thumb: string; full: string; name: string }[] {
  const thumbDir = path.join(GALLERY_DIR, slug, 'thumb');
  const fullDir = path.join(GALLERY_DIR, slug, 'full');
  if (!fs.existsSync(thumbDir)) return [];
  return fs
    .readdirSync(thumbDir)
    .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .sort()
    .map((f) => ({
      name: f,
      thumb: `/gallery/${slug}/thumb/${f}`,
      full: fs.existsSync(path.join(fullDir, f)) ? `/gallery/${slug}/full/${f}` : `/gallery/${slug}/thumb/${f}`,
    }));
}
