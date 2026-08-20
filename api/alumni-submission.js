// Tally webhook → GitHub pull request for alumni submissions.
//
// Flow: Tally form (tally.so/r/QKNjAg) fires this webhook on each submission.
// The function verifies the webhook signature, downloads + resizes the photo,
// and opens a pull request on TrackHoustonAdmin/trackhouston-website adding the
// athlete to src/data/alumni.json and the headshot to public/alumni/.
// Merging the PR = approving the submission (Vercel then deploys it live).
//
// Required env vars on Vercel:
//   ALUMNI_GITHUB_TOKEN  — fine-grained PAT, this repo only, Contents + Pull requests read/write
//   TALLY_SIGNING_SECRET — from the Tally webhook settings
//
// NOTE: the submitter's contact email is intentionally NOT written anywhere in
// the (public) repository or PR — it stays in Tally's submissions dashboard.

import crypto from 'node:crypto';
import sharp from 'sharp';

export const config = { api: { bodyParser: false } };

const OWNER = 'TrackHoustonAdmin';
const REPO = 'trackhouston-website';
const BASE = 'main';

const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function gh(token, path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }
  const token = process.env.ALUMNI_GITHUB_TOKEN;
  const secret = process.env.TALLY_SIGNING_SECRET;
  if (!token || !secret) {
    res.status(500).send('ALUMNI_GITHUB_TOKEN / TALLY_SIGNING_SECRET not configured');
    return;
  }

  try {
    const raw = await readRawBody(req);

    // --- verify Tally signature (HMAC-SHA256 of raw body, base64) ---
    const signature = req.headers['tally-signature'] || '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('base64');
    const sigBuf = Buffer.from(String(signature));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).send('bad signature');
      return;
    }

    const payload = JSON.parse(raw.toString('utf8'));
    const fields = payload?.data?.fields ?? [];
    const val = (labelPart) =>
      fields.find((f) => (f.label || '').toLowerCase().includes(labelPart))?.value;

    const name = String(val('name') ?? '').trim();
    const college = String(val('college') ?? '').trim();
    const classYear = String(val('class year') ?? '').trim();
    let events = val('events');
    // dropdown value may be an option id array + options list — resolve to text
    const eventsField = fields.find((f) => (f.label || '').toLowerCase().includes('events'));
    if (Array.isArray(events) && eventsField?.options) {
      events = eventsField.options
        .filter((o) => events.includes(o.id))
        .map((o) => o.text)
        .join(', ');
    }
    events = String(events ?? '').trim() || 'Track & Field';
    const photoInfo = fields.find((f) => f.type === 'FILE_UPLOAD')?.value?.[0];

    if (!name || !college) {
      res.status(422).send('missing name/college');
      return;
    }

    const slug = slugOf(name);
    const stamp = Date.now().toString(36);
    const branch = `alumni/${slug}-${stamp}`;

    // --- current main SHA + create branch ---
    const ref = await gh(token, `/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`);
    await gh(token, `/repos/${OWNER}/${REPO}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
    });

    // --- photo: download from Tally, resize to site convention, commit ---
    let photoNote = 'No photo submitted.';
    if (photoInfo?.url) {
      const imgRes = await fetch(photoInfo.url);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const jpeg = await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        await gh(token, `/repos/${OWNER}/${REPO}/contents/public/alumni/${slug}.jpg`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `Alumni photo: ${name}`,
            content: jpeg.toString('base64'),
            branch,
          }),
        });
        photoNote = `Headshot added as \`public/alumni/${slug}.jpg\` (processed to site format).`;
      } else {
        photoNote = 'Photo download failed — grab it from the Tally submission.';
      }
    }

    // --- alumni.json: insert athlete under the school (create school if new) ---
    const fileMeta = await gh(
      token,
      `/repos/${OWNER}/${REPO}/contents/src/data/alumni.json?ref=${branch}`
    );
    const alumni = JSON.parse(Buffer.from(fileMeta.content, 'base64').toString('utf8'));
    const schoolEntry = alumni.rollCall.find(
      (s) => s.school.toLowerCase() === college.toLowerCase()
    );
    const athlete = { name, detail: events };
    if (schoolEntry) {
      schoolEntry.athletes.push(athlete);
    } else {
      alumni.rollCall.push({ school: college, athletes: [athlete] });
      alumni.rollCall.sort((a, b) => a.school.localeCompare(b.school));
    }
    await gh(token, `/repos/${OWNER}/${REPO}/contents/src/data/alumni.json`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Alumni submission: ${name} (${college})`,
        content: Buffer.from(JSON.stringify(alumni, null, 2) + '\n').toString('base64'),
        sha: fileMeta.sha,
        branch,
      }),
    });

    // --- open the PR (this is the approval page) ---
    const pr = await gh(token, `/repos/${OWNER}/${REPO}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Alumni submission: ${name} (${college})`,
        head: branch,
        base: BASE,
        body: [
          `New alumni submission from the website form.`,
          ``,
          `| | |`,
          `|---|---|`,
          `| **Name** | ${name} |`,
          `| **College** | ${college} |`,
          `| **Events** | ${events} |`,
          `| **Class year** | ${classYear || '—'} |`,
          ``,
          photoNote,
          ``,
          `**Merge this pull request to approve** — the site redeploys automatically. ` +
            `Close it to reject. The submitter's contact email is in the ` +
            `[Tally dashboard](https://tally.so/forms/QKNjAg/submissions) (kept out of the public repo).`,
        ].join('\n'),
      }),
    });

    res.status(200).json({ ok: true, pr: pr.html_url });
  } catch (err) {
    console.error('alumni-submission error:', err);
    res.status(500).send('internal error');
  }
}
