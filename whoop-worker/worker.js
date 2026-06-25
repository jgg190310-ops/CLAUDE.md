/**
 * Whoop OAuth + API proxy — Cloudflare Worker
 * - POST /        → troca o code por token (server-side, sem CORS)
 * - GET  /api/... → proxy de qualquer chamada à API Whoop (host + path)
 *
 * Como o app envia o path completo (ex: /api/developer/v2/recovery), este
 * Worker NÃO precisa saber a versão da API — se a Whoop mudar de v2 p/ v3,
 * basta mudar o path no app, sem redeploy aqui.
 */
const WHOOP_HOST  = 'https://api.prod.whoop.com';
const WHOOP_TOKEN = WHOOP_HOST + '/oauth/oauth2/token';
const CLIENT_ID     = '4594da3c-0e0d-4e4e-9a91-2140c54e9214';
const CLIENT_SECRET = 'a95b599bb414c30e4d766cbb5a16149afdd5104a5d5571b944ca6cebf655428e';
const ALLOWED_ORIGINS = ['https://jgg190310-ops.github.io'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return corsResponse(null, 204, origin);

    const url = new URL(request.url);

    // Proxy da API Whoop: /api/<path> → https://api.prod.whoop.com/<path>
    if (url.pathname.startsWith('/api/')) {
      const apiPath = url.pathname.replace('/api', '');
      const auth = request.headers.get('Authorization') || '';
      const whoopRes = await fetch(WHOOP_HOST + apiPath + url.search, {
        headers: { Authorization: auth },
      });
      const data = await whoopRes.text();
      return corsResponse(data, whoopRes.status, origin);
    }

    if (request.method !== 'POST') return corsResponse(JSON.stringify({error:'method_not_allowed'}), 405, origin);
    let body;
    try { body = await request.json(); } catch { return corsResponse(JSON.stringify({error:'invalid_json'}), 400, origin); }

    // Refresh token: POST /refresh
    if (url.pathname === '/refresh') {
      const { refresh_token } = body;
      if (!refresh_token) return corsResponse(JSON.stringify({error:'missing_refresh_token'}), 400, origin);
      const params = new URLSearchParams({
        grant_type: 'refresh_token', refresh_token,
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      });
      const whoopRes = await fetch(WHOOP_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await whoopRes.json();
      return corsResponse(JSON.stringify(data), whoopRes.status, origin);
    }

    // Troca de token: POST /
    const { code, redirect_uri, code_verifier } = body;
    if (!code || !redirect_uri || !code_verifier) return corsResponse(JSON.stringify({error:'missing_params'}), 400, origin);
    const params = new URLSearchParams({
      grant_type: 'authorization_code', code,
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri, code_verifier,
    });
    const whoopRes = await fetch(WHOOP_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await whoopRes.json();
    return corsResponse(JSON.stringify(data), whoopRes.status, origin);
  },
};

function corsResponse(body, status, origin) {
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
