/* Painel do Drink — a equipe entra com e-mail e senha (Supabase Auth), confere os documentos dos motoristas,
   aprova ou recusa (com o motivo que o motorista lê no app) e acompanha os relatos dos passageiros.
   O banco só mostra tudo isso para os e-mails da tabela admins (veja drink/servidor/supabase.sql). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // onde está o servidor: config-servidor.js (ou o ajuste dos testes, no mesmo lugar que o app usa)
  let conf = window.DRINK_SERVIDOR || {};
  try { const s = JSON.parse(localStorage.getItem('drink-servicos') || '{}'); if (s.supabase && s.supabase.url) conf = s.supabase; } catch (e) { /* sem ajuste */ }
  const raiz = String(conf.url || '').replace(/\/$/, '');

  let sessao = null;
  try { sessao = JSON.parse(sessionStorage.getItem('drink-painel') || 'null'); } catch (e) { sessao = null; }
  if (sessao && sessao.ate < Date.now()) sessao = null;
  let cadastros = [];
  let relatos = [];
  let filtro = 'em_analise';
  let recusando = null;

  function toast(txt) {
    const t = $('#pn-toast');
    t.textContent = txt;
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { t.hidden = true; }, 4000);
  }
  async function api(caminho, { method = 'GET', body, cab = {} } = {}) {
    const r = await fetch(`${raiz}${caminho}`, {
      method,
      headers: { apikey: conf.chave, Authorization: `Bearer ${sessao ? sessao.token : conf.chave}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...cab },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401 || r.status === 403) { sair('A sessão acabou. Entre de novo.'); throw new Error('sessão'); }
    if (!r.ok) throw new Error(`erro ${r.status}`);
    return r.status === 204 ? null : r.json();
  }

  /* ---------- entrar e sair ---------- */
  function mostrar() {
    $('#pn-sem-servidor').hidden = Boolean(raiz && conf.chave);
    $('#pn-login').hidden = !raiz || !conf.chave || Boolean(sessao);
    $('#pn-painel').hidden = !sessao;
    $('#pn-quem').hidden = !sessao;
    if (sessao) { $('#pn-email').textContent = sessao.email; carregar(); }
  }
  $('#pn-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#pn-login-email').value.trim().toLowerCase();
    const senha = $('#pn-login-senha').value;
    const erro = $('#pn-login-erro');
    erro.hidden = true;
    if (!email || !senha) { erro.textContent = 'Preencha o e-mail e a senha.'; erro.hidden = false; return; }
    const bt = $('#pn-login-bt');
    bt.disabled = true;
    try {
      const r = await fetch(`${raiz}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: conf.chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.access_token) { erro.textContent = 'E-mail ou senha não conferem.'; erro.hidden = false; return; }
      sessao = { token: j.access_token, email: (j.user && j.user.email) || email, ate: Date.now() + (Number(j.expires_in) || 3600) * 1000 - 60000 };
      sessionStorage.setItem('drink-painel', JSON.stringify(sessao));
      $('#pn-login-senha').value = '';
      mostrar();
    } catch (er) {
      erro.textContent = 'Não deu para falar com o servidor. Confere a internet.';
      erro.hidden = false;
    } finally {
      bt.disabled = false;
    }
  });
  function sair(msg) {
    sessao = null;
    sessionStorage.removeItem('drink-painel');
    mostrar();
    if (msg) toast(msg);
  }
  $('#pn-sair').addEventListener('click', () => sair());

  /* ---------- carregar ---------- */
  async function carregar() {
    try {
      [cadastros, relatos] = await Promise.all([
        api('/rest/v1/motoristas_cadastro?select=*&order=criado.desc'),
        api('/rest/v1/relatos?select=*&order=criado.desc'),
      ]);
    } catch (e) {
      if (sessao) toast('Não deu para carregar. Tenta de novo daqui a pouco.');
      return;
    }
    desenhar();
  }

  /* ---------- conferências automáticas ---------- */
  const hoje = () => new Date().toISOString().slice(0, 10);
  function anosDesde(data) {
    if (!data) return 0;
    const d = new Date(`${data}T12:00:00`);
    const a = new Date();
    let n = a.getFullYear() - d.getFullYear();
    if (a.getMonth() < d.getMonth() || (a.getMonth() === d.getMonth() && a.getDate() < d.getDate())) n -= 1;
    return n;
  }
  function cpfValido(c) {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i += 1) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '');
  const cpfFmt = (c) => String(c || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const celFmt = (c) => String(c || '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  function conferencias(m) {
    const idade = anosDesde(m.nascimento);
    const cnhAnos = anosDesde(m.cnh_primeira);
    return [
      [idade >= 21, `${idade} anos`],
      [cnhAnos >= 2, `CNH há ${cnhAnos} ${cnhAnos === 1 ? 'ano' : 'anos'}`],
      [m.cnh_validade >= hoje(), m.cnh_validade >= hoje() ? 'CNH válida' : 'CNH vencida'],
      [cpfValido(m.cpf), cpfValido(m.cpf) ? 'CPF válido' : 'CPF inválido'],
      [Boolean(m.antecedentes), m.antecedentes ? 'Certidão anexada' : 'Sem certidão'],
    ];
  }

  /* ---------- desenhar ---------- */
  function desenhar() {
    const conta = (e) => cadastros.filter((m) => m.estado === e).length;
    ['em_analise', 'aprovado', 'recusado'].forEach((e) => { $(`#pn-f-${e}`).textContent = `(${conta(e)})`; });
    $('#pn-n-mot').textContent = conta('em_analise') || '';
    $('#pn-n-rel').textContent = relatos.filter((r) => !r.resolvido).length || '';
    $$('.pn-filtros [data-filtro]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filtro === filtro)));
    const lista = cadastros.filter((m) => m.estado === filtro);
    $('#pn-lista-mot').innerHTML = lista.length ? lista.map(cartao).join('') : `<li class="pn-vazio">${{ em_analise: 'Nenhum cadastro esperando análise.', aprovado: 'Nenhum motorista aprovado ainda.', recusado: 'Nenhum cadastro recusado.' }[filtro]}</li>`;
    $('#pn-lista-rel').innerHTML = relatos.length ? relatos.map((r) => `<li class="pn-rel${r.resolvido ? ' resolvido' : ''}">
        <h2>${esc(r.motivo)}</h2><p>${esc(r.texto)}</p>
        <small>${esc(new Date(r.criado).toLocaleString('pt-BR'))}${r.volta ? ` · ${esc(r.volta)}` : ''}${r.celular ? ` · ${esc(celFmt(r.celular))}` : ''}${r.corrida ? ` · volta ${esc(r.corrida)}` : ''}</small>
        <div class="pn-bts">${r.resolvido ? '<span>Resolvido</span>' : `<button type="button" class="pn-botao pn-botao-2" data-resolver="${esc(r.id)}">Marcar como resolvido</button>`}</div></li>`).join('')
      : '<li class="pn-vazio">Nenhum relato até agora.</li>';
    $$('#pn-lista-mot [data-selfie]').forEach(carregarSelfie);
  }
  function cartao(m) {
    const ck = conferencias(m).map(([ok, t]) => `<li class="${ok ? 'ok' : 'nao'}">${ok ? '✓' : '✕'} ${esc(t)}</li>`).join('');
    const est = { em_analise: 'Em análise', aprovado: 'Aprovado', recusado: 'Recusado' }[m.estado] || m.estado;
    const dados = [
      ['Celular', celFmt(m.celular)], ['E-mail', m.email || '—'], ['CPF', cpfFmt(m.cpf)], ['Nascimento', dataBR(m.nascimento)],
      ['CNH', `${m.cnh_numero} · categoria ${m.cnh_categoria}`], ['Validade da CNH', dataBR(m.cnh_validade)], ['1ª habilitação', dataBR(m.cnh_primeira)],
      ['Veículo', m.veiculo_desc || m.veiculo], ['Chave Pix', m.pix_chave ? `${m.pix_tipo || ''} ${m.pix_chave}`.trim() : '—'],
      ['Enviado em', new Date(m.criado).toLocaleString('pt-BR')],
    ].map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('');
    const rev = m.revisado_em ? `<p class="pn-sub">Revisado em ${esc(new Date(m.revisado_em).toLocaleString('pt-BR'))}${m.revisado_por ? ` por ${esc(m.revisado_por)}` : ''}</p>` : '';
    return `<li class="pn-mot" data-id="${esc(m.id)}">
      <div class="pn-mot-cab"><img data-selfie="${esc(m.selfie)}" alt="Selfie de ${esc(m.nome)}"><div><h2>${esc(m.nome)}</h2><p>${esc(m.veiculo_desc || m.veiculo)}</p></div><span class="pn-estado ${esc(m.estado)}">${esc(est)}</span></div>
      <ul class="pn-checks" aria-label="Conferências automáticas">${ck}</ul>
      <dl class="pn-dados">${dados}</dl>
      ${m.motivo ? `<p class="pn-motivo"><b>Motivo:</b> ${esc(m.motivo)}</p>` : ''}${rev}
      <div class="pn-docs" id="docs-${esc(m.id)}" hidden></div>
      <div class="pn-bts">
        <button type="button" class="pn-botao pn-botao-2" data-docs="${esc(m.id)}">Ver CNH e certidão</button>
        ${m.estado !== 'aprovado' ? `<button type="button" class="pn-botao" data-aprovar="${esc(m.id)}">Aprovar</button>` : ''}
        ${m.estado !== 'recusado' ? `<button type="button" class="pn-link" data-recusar="${esc(m.id)}">Recusar</button>` : ''}
      </div></li>`;
  }

  /* ---------- documentos: links assinados que valem 10 minutos ---------- */
  async function assinar(caminho) {
    const j = await api(`/storage/v1/object/sign/documentos/${caminho.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: { expiresIn: 600 } });
    const u = j.signedURL || j.signedUrl;
    return u.startsWith('http') ? u : `${raiz}/storage/v1${u.startsWith('/') ? '' : '/'}${u}`;
  }
  async function carregarSelfie(img) {
    const c = img.dataset.selfie;
    img.removeAttribute('data-selfie');
    try { img.src = await assinar(c); } catch (e) { /* fica sem foto */ }
  }
  async function verDocs(id) {
    const m = cadastros.find((x) => x.id === id);
    const box = $(`#docs-${CSS.escape(id)}`);
    if (!m || !box) return;
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<p class="pn-sub">Carregando…</p>';
    const itens = [['Selfie', m.selfie], ['Foto da CNH', m.cnh_foto], ['Certidão de antecedentes', m.antecedentes]].filter(([, c]) => c);
    const partes = await Promise.all(itens.map(async ([nome, c]) => {
      try {
        const url = await assinar(c);
        return /\.pdf$/i.test(c)
          ? `<figure><figcaption>${esc(nome)}</figcaption><a class="pn-botao pn-botao-2" href="${esc(url)}" target="_blank" rel="noopener">Abrir o PDF</a></figure>`
          : `<figure><a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(nome)} de ${esc(m.nome)}"></a><figcaption>${esc(nome)}</figcaption></figure>`;
      } catch (e) { return `<figure><figcaption>${esc(nome)}: não carregou</figcaption></figure>`; }
    }));
    box.innerHTML = partes.join('');
  }

  /* ---------- aprovar e recusar ---------- */
  async function revisar(id, estado, motivo) {
    const r = await api(`/rest/v1/motoristas_cadastro?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', cab: { Prefer: 'return=representation' },
      body: { estado, motivo: motivo || null, revisado_em: new Date().toISOString(), revisado_por: sessao.email },
    });
    if (!Array.isArray(r) || !r.length) throw new Error('sem permissão');
    const i = cadastros.findIndex((m) => m.id === id);
    if (i >= 0) cadastros[i] = r[0];
    desenhar();
  }
  async function aprovar(id) {
    const m = cadastros.find((x) => x.id === id);
    try { await revisar(id, 'aprovado'); toast(`Cadastro de ${m ? m.nome : 'motorista'} aprovado. O app libera o online na próxima conferência.`); } catch (e) {
      if (sessao) toast('Não deu para aprovar. O seu e-mail está na lista da equipe (tabela admins)?');
    }
  }
  function abrirRecusa(id) {
    recusando = id;
    $('#pn-rec-motivo').value = '';
    $('#pn-rec-erro').hidden = true;
    $('#pn-recusar').showModal();
    $('#pn-rec-motivo').focus();
  }
  $('#pn-rec-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-motivo]');
    if (b) $('#pn-rec-motivo').value = b.dataset.motivo;
  });
  $('#pn-rec-cancelar').addEventListener('click', () => $('#pn-recusar').close());
  $('#pn-recusar-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivo = $('#pn-rec-motivo').value.replace(/\s+/g, ' ').trim();
    if (motivo.length < 8) { $('#pn-rec-erro').textContent = 'Escreva o motivo: o motorista precisa saber o que corrigir.'; $('#pn-rec-erro').hidden = false; return; }
    try { await revisar(recusando, 'recusado', motivo.slice(0, 300)); $('#pn-recusar').close(); toast('Cadastro recusado. O motorista vê o motivo no app.'); } catch (er) {
      $('#pn-rec-erro').textContent = 'Não deu para recusar agora. Tenta de novo.';
      $('#pn-rec-erro').hidden = false;
    }
  });
  async function resolver(id) {
    try {
      const r = await api(`/rest/v1/relatos?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', cab: { Prefer: 'return=representation' }, body: { resolvido: true } });
      const i = relatos.findIndex((x) => x.id === id);
      if (i >= 0 && Array.isArray(r) && r[0]) relatos[i] = r[0];
      desenhar();
    } catch (e) { if (sessao) toast('Não deu para marcar agora.'); }
  }

  /* ---------- toques ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.aba) {
      $$('.pn-abas [data-aba]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      $('#pn-mot').hidden = b.dataset.aba !== 'mot';
      $('#pn-rel').hidden = b.dataset.aba !== 'rel';
    } else if (b.dataset.filtro) { filtro = b.dataset.filtro; desenhar(); }
    else if (b.dataset.docs) verDocs(b.dataset.docs);
    else if (b.dataset.aprovar) aprovar(b.dataset.aprovar);
    else if (b.dataset.recusar) abrirRecusa(b.dataset.recusar);
    else if (b.dataset.resolver) resolver(b.dataset.resolver);
  });
  // a lista se atualiza sozinha a cada minuto (cadastros novos chegando)
  setInterval(() => { if (sessao && !$('#pn-recusar').open) carregar(); }, 60000);
  mostrar();
}());
