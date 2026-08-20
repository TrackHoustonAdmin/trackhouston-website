import fs from 'node:fs';
import path from 'node:path';
import coaches from '../data/coaches.json';
import profiles from '../data/coach-profiles.json';

export const slugOf = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface CoachPerson {
  name: string;
  slug: string;
  roles: string[];
  email?: string;
  photo: string | null;
  credentials: string[];
  registered: boolean;
  bio: string;
}

const PHOTO_DIR = path.resolve('public/coaches');
const photoOf = (slug: string): string | null => {
  if (!fs.existsSync(PHOTO_DIR)) return null;
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.join(PHOTO_DIR, `${slug}.${ext}`))) return `/coaches/${slug}.${ext}`;
  }
  return null;
};

/** Every person in coaches.json, merged with their profile (bio/credentials) and photo. */
export function getCoachPeople(): CoachPerson[] {
  const map = new Map<string, CoachPerson>();
  const add = (name: string, role: string, email?: string) => {
    const slug = slugOf(name);
    if (!map.has(slug)) {
      const prof = (profiles as Record<string, { bio?: string; credentials?: string[]; registered?: boolean }>)[slug] ?? {};
      map.set(slug, {
        name,
        slug,
        roles: [],
        email,
        photo: photoOf(slug),
        credentials: prof.credentials ?? [],
        registered: prof.registered ?? false,
        bio: prof.bio ?? '',
      });
    }
    const p = map.get(slug)!;
    if (!p.roles.includes(role)) p.roles.push(role);
    if (!p.email && email) p.email = email;
  };
  for (const p of coaches.leadership) add(p.name, p.role, p.email);
  for (const p of coaches.crossCountry) add(p.name, (p as any).role ?? 'Cross Country Head Coach', (p as any).email);
  for (const d of coaches.ageDivisions) {
    for (const c of d.coaches ?? []) add(c.name, `Head Coach — ${d.division}`, (c as any).email);
  }
  return [...map.values()];
}
