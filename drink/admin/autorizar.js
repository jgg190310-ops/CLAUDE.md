/* Painel do Drink — autorizar motoristas sem o servidor.
   A chave privada do Drink fica só neste aparelho. Com ela, o painel assina a chave pública que o motorista mandou
   (no link "Pedir autorização" do app), com o nome, o celular e até quando vale. O app do motorista só fica online
   com essa assinatura, e o do passageiro confere a mesma assinatura a cada aceite. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const sub = window.crypto && window.crypto.subtle;
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const ASS = { name: 'ECDSA', hash: 'SHA-256' };
  const GUARDADA = 'drink-painel-chave';
  const pub = window.DRINK_AUTORIZACAO || {};

  const b64u = {
    de(bytes) { let s = ''; new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    para(str) { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(s + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)); },
  };
  const txt = (s) => new TextEncoder().encode(s);
  const soDigitos = (s) => String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');

  function toast(t) {
    const el = $('#pn-toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function erro(sel, t) { const e = $(sel); e.textContent = t || ''; e.hidden = !t; }

  /* ---------- a chave ---------- */
  let privada = null;
  async function importar(jwk) {
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) throw new Error('formato');
    // só vale a chave do Drink: a parte pública tem de ser a que está no app
    if (jwk.x !== pub.x || jwk.y !== pub.y) throw new Error('outra');
    return sub.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, ALG, false, ['sign']);
  }
  async function carregar() {
    try {
      const g = JSON.parse(localStorage.getItem(GUARDADA) || 'null');
      if (g) privada = await importar(g);
    } catch (e) { privada = null; }
    mostrar();
  }
  function mostrar() {
    $('#az-sem-chave').hidden = Boolean(privada);
    $('#az-autorizar').hidden = !privada;
    $('#az-bloquear').hidden = !privada;
    if (privada) { lerPedidoDoLink(); carregarBloqueados(); }
  }

  /* ---------- bloquear (antes do prazo) ---------- */
  // quem este aparelho autorizou fica numa lista, para bloquear com um toque; a lista publicada é o arquivo
  // drink/app/bloqueados.json, que os apps leem da rede
  const HIST = 'drink-painel-autorizados';
  const historico = () => { try { const l = JSON.parse(localStorage.getItem(HIST) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  function lembrar(a) {
    const l = historico().filter((x) => x.pub !== a.pub);
    l.unshift(a);
    try { localStorage.setItem(HIST, JSON.stringify(l.slice(0, 200))); } catch (e) { /* ok */ }
    desenharLista();
  }
  let publicados = null; // a lista que está no ar
  let bloqueio = [];     // a lista com as mudanças daqui
  async function carregarBloqueados() {
    if (publicados) return;
    try {
      const r = await fetch(new URL('../app/bloqueados.json', location.href).href, { cache: 'no-cache' });
      const j = r.ok ? await r.json() : null;
      publicados = Array.isArray(j && j.bloqueados) ? j.bloqueados.filter((x) => x && typeof x.p === 'string') : [];
    } catch (e) { publicados = []; }
    bloqueio = publicados.map((x) => ({ ...x }));
    desenharLista();
  }
  const bloqueado = (pub) => bloqueio.some((x) => x.p === pub);
  function desenharLista() {
    const ul = $('#az-lista');
    if (!ul) return;
    const vistos = new Set();
    const itens = [...historico(), ...bloqueio.filter((x) => !historico().some((h) => h.pub === x.p)).map((x) => ({ nome: x.n || 'Motorista', cel: '', pub: x.p, ate: 0 }))]
      .filter((a) => !vistos.has(a.pub) && vistos.add(a.pub));
    ul.innerHTML = '';
    itens.forEach((a) => {
      const li = document.createElement('li');
      const b = bloqueado(a.pub);
      li.className = b ? 'bloq' : '';
      const info = document.createElement('div');
      const nome = document.createElement('b');
      nome.textContent = a.nome;
      const det = document.createElement('small');
      det.textContent = b ? 'Bloqueado' : [a.cel, a.ate ? `até ${new Date(a.ate).toLocaleDateString('pt-BR')}` : ''].filter(Boolean).join(' · ');
      info.append(nome, det);
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.textContent = b ? 'Desbloquear' : 'Bloquear';
      bt.setAttribute('aria-label', `${b ? 'Desbloquear' : 'Bloquear'} ${a.nome}`);
      bt.addEventListener('click', () => trocarBloqueio(a.pub, a.nome));
      li.append(info, bt);
      ul.append(li);
    });
  }
  function trocarBloqueio(pub, nome) {
    if (bloqueado(pub)) bloqueio = bloqueio.filter((x) => x.p !== pub);
    else bloqueio.push({ p: pub, n: String(nome || 'Motorista').slice(0, 40), t: new Date().toISOString().slice(0, 10) });
    desenharLista();
    mostrarPublicar();
  }
  function mostrarPublicar() {
    const mudou = JSON.stringify((publicados || []).map((x) => x.p).sort()) !== JSON.stringify(bloqueio.map((x) => x.p).sort());
    $('#az-publicar').hidden = !mudou;
    $('#az-pub-json').value = `${JSON.stringify({ v: 1, bloqueados: bloqueio }, null, 2)}\n`;
    if (mudou) $('#az-pub-t').focus();
  }
  function bloquearPeloLink() {
    erro('#az-bl-erro', '');
    const bruto = $('#az-bl-link').value.trim().replace(/^.*#credencial=/, '');
    const [dados] = bruto.split('.');
    let d = null;
    try { d = JSON.parse(new TextDecoder().decode(b64u.para(dados))); } catch (e) { d = null; }
    if (!d || typeof d.p !== 'string') { erro('#az-bl-erro', 'Cole o link da autorização (o que tem #credencial=).'); return; }
    if (bloqueado(d.p)) { erro('#az-bl-erro', `${d.n || 'Esse motorista'} já está na lista de bloqueados.`); return; }
    trocarBloqueio(d.p, d.n);
    $('#az-bl-link').value = '';
    toast(`${d.n || 'Motorista'} bloqueado. Falta publicar a lista.`);
  }
  async function guardar(texto) {
    erro('#az-chave-erro', '');
    let jwk;
    try { jwk = JSON.parse(String(texto).trim()); } catch (e) { erro('#az-chave-erro', 'Isso não parece o arquivo da chave. Abra o chave-do-drink.json de novo.'); return; }
    try {
      privada = await importar(jwk);
      try { localStorage.setItem(GUARDADA, JSON.stringify({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d })); } catch (e) { toast('Este navegador não guardou: a chave vale só enquanto a página estiver aberta.'); }
      $('#az-colar').value = '';
      mostrar();
      toast('Chave guardada neste aparelho.');
    } catch (e) {
      erro('#az-chave-erro', e && e.message === 'outra' ? 'Essa chave não é a do Drink que está no app.' : 'Não deu para ler a chave. Confira se colou o arquivo inteiro.');
    }
  }

  /* ---------- o pedido do motorista ---------- */
  function lerPedido(bruto) {
    const cod = String(bruto || '').trim().replace(/^.*#autorizar=/, '');
    try {
      const d = JSON.parse(new TextDecoder().decode(b64u.para(cod)));
      if (d && d.v === 1 && typeof d.p === 'string' && b64u.para(d.p).length === 65) return d;
    } catch (e) { /* não é um pedido */ }
    return null;
  }
  function preencher(d) {
    if (!d) return;
    if (!$('#az-nome').value) $('#az-nome').value = String(d.n || '').split(/\s+/).slice(0, 2).join(' ');
    if (!$('#az-cel').value && d.c) $('#az-cel').value = d.c;
  }
  function lerPedidoDoLink() {
    if (!location.hash.startsWith('#autorizar=')) return;
    $('#az-pedido').value = location.href;
    preencher(lerPedido(location.hash));
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ }
  }

  /* ---------- autorizar ---------- */
  async function autorizar(ev) {
    ev.preventDefault();
    erro('#az-erro', '');
    const d = lerPedido($('#az-pedido').value);
    const nome = $('#az-nome').value.trim();
    const cel = soDigitos($('#az-cel').value);
    const dias = Number((document.querySelector('input[name="az-dias"]:checked') || {}).value) || 180;
    if (!d) { erro('#az-erro', 'Cole o link que o motorista mandou (o do "Pedir autorização").'); $('#az-pedido').focus(); return; }
    if (nome.length < 2) { erro('#az-erro', 'Coloque o nome do motorista.'); $('#az-nome').focus(); return; }
    if (!/^[1-9][1-9]9\d{8}$/.test(cel)) { erro('#az-erro', 'Coloque o celular com DDD e o 9 na frente.'); $('#az-cel').focus(); return; }
    if (d.c && soDigitos(d.c) !== cel) { erro('#az-erro', `O pedido veio do celular ${d.c}. Confira o número.`); $('#az-cel').focus(); return; }
    const ate = Date.now() + dias * 86400000;
    const dados = b64u.de(txt(JSON.stringify({ v: 1, p: d.p, n: nome, c: cel, a: ate })));
    const ass = b64u.de(await sub.sign(ASS, privada, txt(dados)));
    const link = `${new URL('../app/', location.href).href}#credencial=${dados}.${ass}`;
    $('#az-link').value = link;
    lembrar({ nome, cel, pub: d.p, ate, t: Date.now() });
    const quando = new Date(ate).toLocaleDateString('pt-BR');
    $('#az-pronto-sub').textContent = `${nome} pode dirigir pelo Drink até ${quando}. Mande o link para ele: é só tocar e o app guarda a autorização.`;
    $('#az-whats').href = `https://wa.me/55${cel}?text=${encodeURIComponent(`Pronto, ${nome.split(' ')[0]}! Você está autorizado no Drink até ${quando}. Toca neste link (se usa o app instalado, copia e cola no app): ${link}`)}`;
    $('#az-form').hidden = true;
    $('#az-pronto').hidden = false;
    $('#az-pronto-t').focus();
  }

  $('#az-guardar').addEventListener('click', () => guardar($('#az-colar').value));
  $('#az-arquivo').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) guardar(await f.text());
    e.target.value = '';
  });
  $('#az-pedido').addEventListener('input', () => preencher(lerPedido($('#az-pedido').value)));
  $('#az-form').addEventListener('submit', autorizar);
  $('#az-copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#az-link').value); toast('Link copiado.'); } catch (e) { $('#az-link').select(); toast('Selecionei o link: copie e mande para o motorista.'); }
  });
  $('#az-outro').addEventListener('click', () => {
    $('#az-form').reset();
    $('#az-form').hidden = false;
    $('#az-pronto').hidden = true;
    $('#az-pedido').focus();
  });
  $('#az-esquecer').addEventListener('click', () => {
    try { localStorage.removeItem(GUARDADA); } catch (e) { /* ok */ }
    privada = null;
    mostrar();
    toast('A chave saiu deste aparelho.');
  });
  window.addEventListener('hashchange', () => { if (privada) lerPedidoDoLink(); });
  $('#az-bl-ok').addEventListener('click', bloquearPeloLink);
  $('#az-pub-copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#az-pub-json').value); toast('Lista copiada. Agora abra no GitHub e cole.'); } catch (e) { $('#az-pub-json').select(); toast('Selecionei a lista: copie e cole no GitHub.'); }
  });

  if (!sub || !pub.x) {
    $('#az-sem-chave').hidden = false;
    $('#az-sem-t').textContent = 'Este navegador não consegue autorizar';
    $('#az-sem-chave').querySelectorAll('label, button').forEach((el) => { el.hidden = true; });
    return;
  }
  carregar();
})();
