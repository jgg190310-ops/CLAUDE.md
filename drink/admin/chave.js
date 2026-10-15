/* Painel do Drink — a chave do Drink guardada neste aparelho (a mesma de autorizar.html), para assinar a autorização
   do motorista na hora de aprovar o cadastro. Sem a chave aqui, a aprovação sai sem ela (autoriza pelo link). */
(function () {
  'use strict';
  const sub = window.crypto && window.crypto.subtle;
  const pub = window.DRINK_AUTORIZACAO || {};
  const b64u = (bytes) => { let s = ''; new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const txt = (s) => new TextEncoder().encode(s);
  async function privada() {
    try {
      const g = JSON.parse(localStorage.getItem('drink-painel-chave') || 'null');
      if (!g || !sub || g.x !== pub.x || g.y !== pub.y) return null;
      return await sub.importKey('jwk', { kty: 'EC', crv: 'P-256', x: g.x, y: g.y, d: g.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    } catch (e) { return null; }
  }
  // a autorização para a chave do celular do motorista: o mesmo formato de autorizar.html
  async function assinar({ chavePub, nome, celular, dias = 180 }) {
    const k = await privada();
    if (!k || typeof chavePub !== 'string') return null;
    const curto = String(nome || '').trim().split(/\s+/).slice(0, 2).join(' ').slice(0, 40);
    const dados = b64u(txt(JSON.stringify({ v: 1, p: chavePub, n: curto, c: String(celular || '').replace(/\D/g, ''), a: Date.now() + dias * 86400000 })));
    const ass = b64u(await sub.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, txt(dados)));
    return `${dados}.${ass}`;
  }
  window.DrinkChave = { assinar, temChave: async () => Boolean(await privada()) };
})();
