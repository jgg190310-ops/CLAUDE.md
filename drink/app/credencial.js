/* Drink — a autorização do motorista, sem servidor.
   O motorista tem um par de chaves só dele, criado no celular. Ele manda a parte pública para o Drink (pelo WhatsApp,
   num link); no painel, o Drink assina "esta chave é do motorista Fulano, celular tal, até tal dia" e devolve outro
   link. Essa assinatura é a credencial: o app só deixa ficar online com ela, e o passageiro confere, a cada aceite, que
   a credencial é do Drink e que quem aceitou tem a chave de dentro dela (assina o id da corrida). Copiar a credencial
   de outro motorista não adianta: falta a chave privada, que nunca sai do celular dele. */
(function () {
  'use strict';
  const cfg = window.DRINK_AUTORIZACAO || {};
  const sub = window.crypto && window.crypto.subtle;
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const ASS = { name: 'ECDSA', hash: 'SHA-256' };
  const PAR = 'drink-mot-chaves';
  const txt = (s) => new TextEncoder().encode(s);

  const b64u = {
    de(bytes) {
      let s = '';
      new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); });
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    para(str) {
      const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(s + '==='.slice((s.length + 3) % 4));
      return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    },
  };
  const textoB64 = (o) => b64u.de(txt(JSON.stringify(o)));
  const lerB64 = (s) => JSON.parse(new TextDecoder().decode(b64u.para(s)));

  const ligada = () => Boolean(cfg.x && cfg.y && sub);
  let chaveDrink = null;
  function drink() {
    if (!chaveDrink) chaveDrink = sub.importKey('jwk', { kty: 'EC', crv: 'P-256', x: cfg.x, y: cfg.y, ext: true }, ALG, false, ['verify']);
    return chaveDrink;
  }
  const soDigitos = (s) => String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');

  // os motoristas que o Drink bloqueou antes do prazo (drink/app/bloqueados.json, publicado pelo painel). Lido da rede a
  // cada 5 min; sem internet, vale a última lista que chegou
  const BLOQ = 'drink-bloqueados';
  let bloq = null;
  async function bloqueados() {
    if (bloq && Date.now() - bloq.t < 5 * 60000) return bloq.lista;
    let lista = null;
    try {
      const r = await fetch(new URL('bloqueados.json', document.baseURI || location.href).href, { cache: 'no-cache' });
      if (r.ok) {
        const j = await r.json();
        lista = Array.isArray(j && j.bloqueados) ? j.bloqueados.map((x) => (x && typeof x.p === 'string' ? x.p : '')).filter(Boolean) : [];
        try { localStorage.setItem(BLOQ, JSON.stringify(lista)); } catch (e) { /* ok */ }
      }
    } catch (e) { /* sem rede */ }
    if (!lista) { try { lista = JSON.parse(localStorage.getItem(BLOQ) || '[]'); } catch (e) { lista = []; } }
    bloq = { t: Date.now(), lista: Array.isArray(lista) ? lista : [] };
    return bloq.lista;
  }

  // a credencial: "dados.assinatura", os dados em base64 (v, p = chave pública do motorista, n = nome, c = celular,
  // a = até quando vale, em ms). Devolve os dados se a assinatura é do Drink e ainda vale; senão, null
  async function conferir(cred) {
    if (!ligada() || typeof cred !== 'string' || cred.length > 2000) return null;
    const [dados, ass] = cred.split('.');
    if (!dados || !ass) return null;
    try {
      const ok = await sub.verify(ASS, await drink(), b64u.para(ass), txt(dados));
      if (!ok) return null;
      const d = lerB64(dados);
      if (!d || d.v !== 1 || typeof d.p !== 'string' || !(Number(d.a) > Date.now())) return null;
      if ((await bloqueados()).includes(d.p)) return null;
      return { pub: d.p, nome: String(d.n || '').slice(0, 40), celular: soDigitos(d.c), ate: Number(d.a) };
    } catch (e) { return null; }
  }

  // o par de chaves do motorista: criado uma vez, guardado no aparelho
  let par = null;
  async function meuPar() {
    if (par) return par;
    try {
      const g = JSON.parse(localStorage.getItem(PAR) || 'null');
      if (g && g.priv && g.pub) {
        par = { priv: await sub.importKey('jwk', g.priv, ALG, false, ['sign']), pub: g.pub };
        return par;
      }
    } catch (e) { /* refaz */ }
    const novo = await sub.generateKey(ALG, true, ['sign', 'verify']);
    const pub = b64u.de(await sub.exportKey('raw', novo.publicKey));
    const priv = await sub.exportKey('jwk', novo.privateKey);
    try { localStorage.setItem(PAR, JSON.stringify({ priv, pub })); } catch (e) { /* sem espaço: vale nesta visita */ }
    par = { priv: novo.privateKey, pub };
    return par;
  }

  const minhaPub = async () => (await meuPar()).pub;
  // o pedido de autorização: o que o motorista manda para o Drink (o painel lê e assina)
  async function pedido(u) {
    const p = await meuPar();
    return textoB64({ v: 1, p: p.pub, n: [u.nome, u.sobrenome].filter(Boolean).join(' ').slice(0, 60), c: soDigitos(u.celular) });
  }
  function linkDoPainel(cod) {
    const base = new URL('../admin/autorizar.html', location.href);
    base.hash = `autorizar=${cod}`;
    return base.href;
  }

  // a credencial que chegou pelo link: só vale se é do Drink, é da chave deste celular e do número da conta
  async function aceitarCredencial(cred, u) {
    const d = await conferir(cred);
    if (!d) return { erro: 'Essa autorização não vale: venceu ou foi bloqueada pelo Drink. Fala com o Drink.' };
    const p = await meuPar();
    if (d.pub !== p.pub) return { erro: 'Essa autorização foi feita para outro celular. Pede para o Drink de novo, por este aparelho.' };
    if (d.celular && soDigitos(u.celular) && d.celular !== soDigitos(u.celular)) return { erro: 'Essa autorização é de outro número de celular.' };
    return { ok: true, dados: d };
  }

  // a prova de cada aceite: o motorista assina o id da corrida e a chave da corrida com a chave dele
  const frase = (id, k) => `drink-aceite|${id}|${k}`;
  async function provar(id, k) {
    const p = await meuPar();
    return b64u.de(await sub.sign(ASS, p.priv, txt(frase(id, k))));
  }
  // o passageiro confere: a credencial é do Drink, e quem aceitou tem a chave de dentro dela
  async function conferirAceite(cred, prova, id, k) {
    const d = await conferir(cred);
    if (!d || typeof prova !== 'string') return null;
    try {
      const pub = await sub.importKey('raw', b64u.para(d.pub), ALG, false, ['verify']);
      return (await sub.verify(ASS, pub, b64u.para(prova), txt(frase(id, k)))) ? d : null;
    } catch (e) { return null; }
  }

  // "Rafael Souza" -> "Rafael S.", como o app mostra os nomes
  function nomeCurto(n) {
    const p = String(n || '').trim().split(/\s+/).filter(Boolean);
    return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : (p[0] || 'Motorista');
  }

  window.Drink = window.Drink || {};
  window.Drink.credencial = { ligada, conferir, pedido, linkDoPainel, aceitarCredencial, provar, conferirAceite, nomeCurto, minhaPub, b64u };
})();
