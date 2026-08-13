/**
 * Rebuilds src/data/roster.json from a registration export CSV.
 *
 * Usage:  node scripts/build-roster.mjs path/to/export.csv "Spring 2027 Track & Field"
 *
 * PRIVACY: The export CSV contains addresses, birthdates, medical and insurance
 * information. NEVER commit the CSV itself (.gitignore blocks export*.csv).
 * This script extracts ONLY: athlete name, age division, practice site.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , csvPath, seasonLabel] = process.argv;
if (!csvPath) {
  console.error('Usage: node scripts/build-roster.mjs <export.csv> ["Season label"]');
  process.exit(1);
}

// Minimal CSV parser handling quoted fields with commas.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const DIV = {
  '8U_Girls': '8U Girls', '8U_Boys': '8U Boys',
  '9_10_Girls': '9-10 Girls', '9_10_Boys': '9-10 Boys',
  '11_12_Girls': '11-12 Girls', '11_12_Boys': '11-12 Boys',
  '13_14_Girls': '13-14 Girls', '13_14_Boys': '13-14 Boys',
  '15_16_Girls': '15-16 Girls', '15_16_Boys': '15-16 Boys',
  '17_18_Girls': '17-18 Girls', '17_18_Boys': '17-18 Boys',
};
const SITE = {
  Missouri_City: 'Missouri City', 'Conroe-Spring': 'Conroe / Spring',
  Inner_Loop: 'Inner Loop',
};
const ORDER = ['8U Girls', '8U Boys', '9-10 Girls', '9-10 Boys', '11-12 Girls', '11-12 Boys',
  '13-14 Girls', '13-14 Boys', '15-16 Girls', '15-16 Boys', '17-18 Girls', '17-18 Boys'];

const [header, ...rows] = parseCSV(readFileSync(csvPath, 'utf8'));
const col = (name) => header.indexOf(name);
const iFirst = col('First Name'), iLast = col('Last Name'), iStatus = col('Status1'),
  iDiv = col('Division'), iSite = col('Practice Site');

const seen = new Set();
const athletes = [];
for (const r of rows) {
  if ((r[iStatus] || '').trim() !== 'Active') continue;
  const name = `${(r[iFirst] || '').trim()} ${(r[iLast] || '').trim()}`.trim();
  if (!name) continue;
  const division = DIV[r[iDiv]] ?? r[iDiv];
  const site = SITE[r[iSite]] ?? (r[iSite] || '').replace(/_/g, ' ');
  const key = `${name.toLowerCase()}|${division}|${site}`;
  if (seen.has(key)) continue;
  seen.add(key);
  athletes.push({ name, division, site });
}

const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);
function lastName(name) {
  const parts = name.split(/\s+/).filter((p) => !SUFFIXES.has(p.toLowerCase().replace(/,/g, '')));
  return (parts[parts.length - 1] || name).toLowerCase();
}
athletes.sort((a, b) =>
  ORDER.indexOf(a.division) - ORDER.indexOf(b.division) ||
  lastName(a.name).localeCompare(lastName(b.name)) ||
  a.name.localeCompare(b.name)
);

const out = {
  season: seasonLabel || 'Spring 2026 Track & Field',
  updated: `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
  divisionsOrder: ORDER,
  sites: [...new Set(athletes.map((a) => a.site))].sort(),
  athletes,
};
writeFileSync(new URL('../src/data/roster.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`roster.json written: ${athletes.length} athletes, ${out.sites.length} sites`);
