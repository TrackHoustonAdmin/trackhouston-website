// GitHub OAuth callback for the /admin CMS. Exchanges the code for a token,
// then hands it to the CMS window using the standard Decap/Sveltia postMessage
// handshake. Requires GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET env vars.
export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) {
    res.status(400).send('Missing code or server OAuth configuration.');
    return;
  }
  let token = null;
  let error = null;
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await r.json();
    if (data.access_token) token = data.access_token;
    else error = data.error_description || data.error || 'No token returned';
  } catch (e) {
    error = String(e);
  }
  const status = token ? 'success' : 'error';
  const payload = token ? { token, provider: 'github' } : { error };
  const html = `<!doctype html><html><body><script>
    (function () {
      function send(e) {
        window.opener.postMessage(
          'authorization:github:${status}:' + ${JSON.stringify(JSON.stringify(payload))},
          e.origin
        );
        window.removeEventListener('message', send, false);
      }
      window.addEventListener('message', send, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script>
  <p>Signing you in… you can close this window if it doesn't close itself.</p>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
