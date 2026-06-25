/**
 * Whoop OAuth Token Exchange — Cloudflare Worker
 * Recebe o code do browser e troca por token com a Whoop no servidor.
 * Deploy: https://workers.cloudflare.com (gratuito)
 */

const WHOOP_TOKEN = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Cole aqui suas credenciais depois do deploy (ou use Secrets no painel)
const CLIENT_ID     = 'COLE_SEU_CLIENT_ID_AQUI';
const CLIENT_SECRET = 'COLE_SEU_CLIENT_SECRET_AQUI';

const ALLOWED_ORIGINS = [
  'https://jgg190310-ops.github.io',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'method_not_allowed' }), 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'invalid_json' }), 400, origin);
    }

    const { code, redirect_uri, code_verifier } = body;
    if (!code || !redirect_uri || !code_verifier) {
      return corsResponse(JSON.stringify({ error: 'missing_params' }), 400, origin);
    }

    // Troca o code pelo token na Whoop — feito no servidor, sem CORS
    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri,
      code_verifier,
    });

    const whoopRes = await fetch(WHOOP_TOKEN, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
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
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
    },
  });
}
