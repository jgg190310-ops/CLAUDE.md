/**
 * Rumo · ponte com a Pluggy (Open Finance) — Cloudflare Worker
 *
 * O app Rumo chama este servidor, e ele chama a Pluggy com as suas chaves.
 * As chaves ficam guardadas como "secrets" na Cloudflare, nunca aqui no código
 * (este repositório é público).
 *
 * Secrets (Cloudflare → o worker → Settings → Variables and Secrets):
 *   PLUGGY_CLIENT_ID      o Client ID da sua aplicação na Pluggy
 *   PLUGGY_CLIENT_SECRET  o Client Secret da sua aplicação na Pluggy
 *   RUMO_CHAVE            uma senha só sua; o app manda ela em toda chamada
 *
 * Caminhos (todos POST, com o header x-rumo-chave):
 *   /ping           confere a senha e as chaves da Pluggy
 *   /connect-token  token de uso único para abrir o botão "Conectar banco"
 *   /sync           { itens: [itemId...], desde: "AAAA-MM-DD" } → contas e lançamentos
 *
 * Só lê dados: não existe caminho para Pix, pagamento ou transferência.
 */
const PLUGGY = 'https://api.pluggy.ai';
const ORIGENS = ['https://jgg190310-ops.github.io'];

class Falha extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

let cacheChave = { valor: null, ate: 0 };
async function chavePluggy(env) {
  if (cacheChave.valor && Date.now() < cacheChave.ate) return cacheChave.valor;
  if (!env.PLUGGY_CLIENT_ID || !env.PLUGGY_CLIENT_SECRET) throw new Falha(500, 'Faltam o PLUGGY_CLIENT_ID e o PLUGGY_CLIENT_SECRET no servidor.');
  const r = await fetch(PLUGGY + '/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Falha(502, 'A Pluggy recusou o Client ID ou o Client Secret. Confira as chaves no servidor.');
  const j = await r.json();
  cacheChave = { valor: j.apiKey, ate: Date.now() + 100 * 60 * 1000 }; // a chave vale 2 h; renova antes
  return j.apiKey;
}

async function pluggy(env, caminho, opcoes = {}) {
  const k = await chavePluggy(env);
  const r = await fetch(PLUGGY + caminho, {
    ...opcoes,
    headers: { 'X-API-KEY': k, 'content-type': 'application/json', ...(opcoes.headers || {}) },
  });
  const txt = await r.text();
  let j = {};
  try { j = JSON.parse(txt); } catch (e) { j = {}; }
  if (!r.ok) throw new Falha(r.status === 404 ? 404 : 502, j.message || `A Pluggy respondeu com erro ${r.status}.`);
  return j;
}

async function transacoes(env, contaId, desde) {
  const out = [];
  let pagina = 1, total = 1;
  do {
    const q = new URLSearchParams({ accountId: contaId, pageSize: '500', page: String(pagina) });
    if (desde) q.set('from', desde);
    const t = await pluggy(env, '/transactions?' + q);
    for (const x of t.results || []) {
      out.push({
        id: x.id,
        data: String(x.date || '').slice(0, 10),
        desc: x.description || x.descriptionRaw || '',
        valor: Number(x.amount) || 0,
        tipo: x.type || '',
        cat: x.category || '',
        status: x.status || '',
      });
    }
    total = t.totalPages || 1;
    pagina++;
  } while (pagina <= total && pagina <= 10);
  return out;
}

async function sync(env, corpo) {
  const itens = (Array.isArray(corpo.itens) ? corpo.itens : [])
    .filter(x => typeof x === 'string' && /^[\w-]{8,64}$/.test(x)).slice(0, 10);
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(corpo.desde || '') ? corpo.desde : null;
  const resposta = { itens: [] };
  for (const id of itens) {
    try {
      const item = await pluggy(env, '/items/' + id);
      const contas = await pluggy(env, '/accounts?itemId=' + id);
      const cs = [];
      for (const a of contas.results || []) {
        cs.push({
          id: a.id,
          nome: a.marketingName || a.name || '',
          tipo: a.type || '',          // BANK ou CREDIT
          subtipo: a.subtype || '',    // CHECKING_ACCOUNT, SAVINGS_ACCOUNT, CREDIT_CARD
          saldo: typeof a.balance === 'number' ? a.balance : null,
          txs: await transacoes(env, a.id, desde),
        });
      }
      const problema = ['LOGIN_ERROR', 'OUTDATED', 'WAITING_USER_INPUT'].includes(item.status)
        ? (item.error?.message || 'A autorização precisa ser renovada no app do banco.') : '';
      resposta.itens.push({
        id,
        banco: item.connector?.name || '',
        status: item.status || '',
        atualizado: item.lastUpdatedAt || item.updatedAt || null,
        erro: problema,
        contas: cs,
      });
    } catch (e) {
      resposta.itens.push({ id, erro: e.status === 404 ? 'Essa conexão não existe mais na Pluggy.' : e.message, contas: [] });
    }
  }
  return resposta;
}

function iguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const origem = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-rumo-chave',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const json = (dados, status = 200) => new Response(JSON.stringify(dados), {
      status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (!env.RUMO_CHAVE) return json({ erro: 'Falta a RUMO_CHAVE no servidor.' }, 500);
      if (!iguais(req.headers.get('x-rumo-chave') || '', env.RUMO_CHAVE)) return json({ erro: 'Senha do servidor errada.' }, 401);
      if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);
      const caminho = new URL(req.url).pathname.replace(/\/+$/, '');
      const corpo = await req.json().catch(() => ({}));

      if (caminho === '/ping') { await chavePluggy(env); return json({ ok: true }); }
      if (caminho === '/connect-token') {
        const j = await pluggy(env, '/connect_token', { method: 'POST', body: JSON.stringify(corpo.itemId ? { itemId: corpo.itemId } : {}) });
        return json({ accessToken: j.accessToken });
      }
      if (caminho === '/sync') return json(await sync(env, corpo));
      return json({ erro: 'Caminho desconhecido.' }, 404);
    } catch (e) {
      return json({ erro: e.message || 'Erro no servidor.' }, e.status || 500);
    }
  },
};
