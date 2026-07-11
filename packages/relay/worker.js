/**
 * Crit relay — the only server in the system, and it stores nothing.
 *
 * Exists solely because a static widget can't hold the GitHub App client
 * secret. Two routes:
 *
 *   GET /authorize?origin=<page origin>
 *       302 → github.com/login/oauth/authorize (state carries the origin)
 *
 *   GET /callback?code&state
 *       exchanges code+secret for a user access token, returns a tiny HTML
 *       page that postMessages { crit:'auth', token, expiresIn } to the
 *       opener at the original origin, then closes itself.
 *
 * Secrets (set via `wrangler secret put`):
 *   CLIENT_ID     — the GitHub App's client ID
 *   CLIENT_SECRET — the GitHub App's client secret
 *
 * No logging, no storage, no cookies. Token refresh is deliberately out of
 * scope for v0 — the widget re-prompts when the token expires.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/authorize') return authorize(url, env);
    if (url.pathname === '/callback') return callback(url, env);
    if (url.pathname === '/') {
      return new Response('crit relay — see https://github.com/hvelaayutham/crit', {
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};

function authorize(url, env) {
  const origin = url.searchParams.get('origin') || '';
  if (!/^https?:\/\/[\w.:[\]-]+$/.test(origin)) {
    return html(page('Invalid origin parameter.'), 400);
  }
  const state = btoa(JSON.stringify({ o: origin, n: crypto.randomUUID() }))
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.searchParams.set('client_id', env.CLIENT_ID);
  gh.searchParams.set('redirect_uri', `${url.origin}/callback`);
  gh.searchParams.set('state', state);
  return Response.redirect(gh.toString(), 302);
}

async function callback(url, env) {
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state') || '';
  let origin = null;
  try {
    origin = JSON.parse(atob(stateRaw.replaceAll('-', '+').replaceAll('_', '/'))).o;
  } catch {
    /* fall through */
  }
  if (!code || !origin || !/^https?:\/\//.test(origin)) {
    return html(page('Sign-in failed: malformed callback. Close this window and retry.'), 400);
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (!data.access_token) {
    return html(
      deliver(origin, { crit: 'auth', error: data.error || 'exchange-failed' }) +
        page('Sign-in failed. Close this window and retry.'),
      200,
    );
  }

  const payload = {
    crit: 'auth',
    token: data.access_token,
    // GitHub App user tokens report expires_in when expiration is enabled.
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 8 * 3600,
  };
  return html(deliver(origin, payload) + page('Signed in — this window will close.'));
}

/** Script that hands the payload to the opener at exactly one origin. */
function deliver(origin, payload) {
  return `<script>
try {
  if (window.opener) window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(origin)});
} catch (e) {}
setTimeout(function () { window.close(); }, 300);
</script>`;
}

function page(msg) {
  return `<!doctype html><meta charset="utf-8"><title>Crit</title>
<body style="font:14px/1.5 system-ui;display:grid;place-items:center;height:100vh;margin:0;color:#16181c">
<p>${msg}</p></body>`;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    },
  });
}
