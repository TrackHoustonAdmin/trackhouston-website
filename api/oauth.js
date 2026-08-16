// GitHub OAuth entry point for the /admin CMS (Sveltia/Decap handshake).
// Requires env vars on Vercel: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GITHUB_CLIENT_ID is not configured in Vercel environment variables.');
    return;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `https://${host}/api/callback`;
  const state = Math.random().toString(36).slice(2);
  const url =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&scope=repo' +
    `&state=${state}`;
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, url);
}
