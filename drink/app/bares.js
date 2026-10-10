/* Drink — bares parceiros. O dono cadastra o bar no app e recebe um QR para o balcão e as mesas: quem lê já pede a
   volta com o embarque na porta do bar, e o bar vê quantas voltas saíram dali (e confere o benefício de quem volta de
   Drink pelo código do recibo). Na hora de fechar, o garçom ou o caixa chama o Drink pelo cliente, do celular do bar.
   Os bares abertos aparecem no mapa de quem pede e de quem dirige.
   Sem servidor no meio: o QR leva tudo no próprio link; as voltas passam pelo ntfy cifradas com a chave do bar, que
   só existe no QR; e a vitrine dos bares abertos é aberta, com o que o bar já mostra na fachada. */
(function () {
  'use strict';

  const { $, $$, esc, hhmm } = window.Drink.util;
  const S = window.Drink.servicos;
  const R = window.Drink.rede;
  const PIX = window.Drink.pix;
  const CARROS = window.Drink.carros;

  const HORA = 3600000;
  const DIA = 24 * HORA;
  const GUARDADO = 'drink-bar-aqui';
  // quem leu o QR está no bar a noite toda
  const VALE_AQUI = 8 * HORA;
  // a volta conta para o bar se o embarque for na porta dele
  const PERTO_DO_BAR = 250;
  // o ntfy guarda 12 h: a vitrine de um bar aberto é publicada de novo de tempos em tempos
  const REPUBLICAR = 30 * 60000;
  const BENEFICIOS = [
    ['agua', 'Uma água de cortesia'],
    ['desconto', '10% na próxima conta'],
    ['petisco', 'Um petisco de cortesia na próxima visita'],
    ['nenhum', 'Sem benefício'],
  ];
  const beneficioTxt = (k) => (k && k !== 'nenhum' ? ((BENEFICIOS.find((b) => b[0] === k) || [])[1] || '') : '');
  const ID = /^[\w-]{16}$/;
  const CHAVE = /^[\w-]{43}$/;
  const numero = (n) => typeof n === 'number' && Number.isFinite(n);
  const texto = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const cinco = (x) => Math.round(x * 1e5) / 1e5;
  const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

  /* ---------- até que horas o bar fica no mapa hoje ---------- */
  // "fecha às 02:00": se a hora já passou hoje (abriu às 19h, fecha às 2h), é no dia seguinte
  function fechamento(fecha, agora = Date.now()) {
    const [h, m] = String(fecha || '02:00').split(':').map(Number);
    const d = new Date(agora);
    d.setHours(Number.isFinite(h) ? h : 2, Number.isFinite(m) ? m : 0, 0, 0);
    let t = d.getTime();
    if (t <= agora) t += DIA;
    return Math.min(t, agora + 14 * HORA);
  }
  // a noite de um bar passa da meia-noite: "hoje" é desde o meio-dia
  function inicioDaNoite(agora = Date.now()) {
    const d = new Date(agora);
    d.setHours(12, 0, 0, 0);
    let t = d.getTime();
    if (t > agora) t -= DIA;
    return t;
  }

  /* ---------- o QR do balcão: tudo vai no link ---------- */
  // a parte depois do # nunca sai do celular: nem o site do Drink vê a chave do bar
  function paraB64(txt) {
    let s = '';
    new TextEncoder().encode(txt).forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deB64(b) {
    const s = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
  }
  function linkBar(b) {
    // curto de propósito: quanto menor o link, maiores os quadradinhos do QR, mais fácil de ler no balcão escuro
    const dados = [3, b.id, b.chave, b.nome, b.lugar.nome, b.lugar.bairro || '', cinco(b.lugar.lat), cinco(b.lugar.lon), b.beneficio || 'nenhum'];
    const u = new URL('./', location.href);
    u.search = `?bar=${b.id}`;
    u.hash = paraB64(JSON.stringify(dados));
    return u.toString();
  }
  // o link chega de qualquer lugar: só vale o que tem a forma certa
  function lerLink(id, hash) {
    let d;
    try { d = JSON.parse(deB64(String(hash || ''))); } catch (x) { return null; }
    if (!Array.isArray(d) || d[0] !== 3 || d.length < 9) return null;
    const [, i, k, nome, lugar, bairro, lat, lon, ben] = d;
    if (i !== id || typeof i !== 'string' || !ID.test(i) || typeof k !== 'string' || !CHAVE.test(k)) return null;
    if (!numero(lat) || !numero(lon) || !S.naGrandeBH({ lat, lon })) return null;
    const n = texto(nome, 60) || 'Bar';
    return {
      id: i, chave: k, nome: n,
      lugar: { nome: texto(lugar, 80) || n, bairro: texto(bairro, 40), lat, lon },
      beneficio: BENEFICIOS.some((b) => b[0] === ben) ? ben : 'nenhum',
    };
  }
  // quem leu o QR: o bar fica guardado no aparelho a noite toda
  function guardarAqui(b) { try { localStorage.setItem(GUARDADO, JSON.stringify({ ...b, ate: Date.now() + VALE_AQUI })); } catch (x) { /* sem espaço */ } }
  function esquecerAqui() { try { localStorage.removeItem(GUARDADO); } catch (x) { /* ok */ } }
  function aqui() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch (x) { b = null; }
    if (!b || !b.id || !b.lugar || !(b.ate > Date.now())) { if (b) esquecerAqui(); return null; }
    return b;
  }
  const saiDoBar = (b, embarque) => Boolean(b && embarque && S.distancia(embarque, b.lugar) <= PERTO_DO_BAR);
  // o código do benefício, no recibo: o bar confere na lista dele
  const novoCupom = () => String(1000 + Math.floor(Math.random() * 9000));

  /* ---------- o canal do bar ---------- */
  const topico = (id) => R.topico.bar(id);
  async function mandar(b, obj) {
    const env = { v: 1, ...(await R.cifrar(b.chave, obj)) };
    R.fila.mandar(topico(b.id), env, { validade: 12 * HORA });
  }
  async function abrir(b, env) {
    if (!env || env.v !== 1 || typeof env.iv !== 'string' || typeof env.ct !== 'string') return null;
    try { return await R.decifrar(b.chave, env); } catch (x) { return null; }
  }
  // a volta que saiu do bar: o celular de quem pediu avisa quando o carro sai (só o primeiro nome e o bairro)
  function avisarVolta(b, v) {
    return mandar(b, { tipo: 'volta', corrida: v.corrida, t: Date.now(), cliente: primeiro(v.cliente), para: v.para, cupom: v.cupom, peloBar: Boolean(v.peloBar) }).catch(() => {});
  }
  function limparVolta(m) {
    if (!m || m.tipo !== 'volta' || typeof m.corrida !== 'string' || !/^[\w-]{16,32}$/.test(m.corrida)) return null;
    return {
      corrida: m.corrida, t: numero(m.t) ? m.t : Date.now(), cliente: texto(m.cliente, 30) || 'Cliente', para: texto(m.para, 40),
      cupom: /^\d{4}$/.test(String(m.cupom)) ? String(m.cupom) : '', peloBar: m.peloBar === true,
    };
  }

  /* ---------- a vitrine: os bares abertos agora ---------- */
  function limparVitrine(m) {
    if (!m || m.v !== 1 || m.tipo !== 'bar' || typeof m.id !== 'string' || !ID.test(m.id)) return null;
    const t = numero(m.t) ? m.t : 0;
    if (m.fechado === true) return { id: m.id, t, fechado: true };
    if (!numero(m.lat) || !numero(m.lon) || !S.naGrandeBH(m) || !numero(m.ate)) return null;
    return {
      id: m.id, t, nome: texto(m.nome, 60) || 'Bar', bairro: texto(m.bairro, 40), lat: m.lat, lon: m.lon,
      beneficio: BENEFICIOS.some((b) => b[0] === m.beneficio) ? m.beneficio : 'nenhum',
      ate: Math.min(m.ate, t + 14 * HORA), voltas: numero(m.voltas) && m.voltas > 0 ? Math.min(Math.round(m.voltas), 999) : 0,
    };
  }
  // a última palavra de cada bar é a que vale (abriu, contou mais uma volta, fechou)
  function juntar(lista, agora = Date.now()) {
    const porId = new Map();
    lista.forEach((x) => { if (x && (!porId.has(x.id) || porId.get(x.id).t <= x.t)) porId.set(x.id, x); });
    return [...porId.values()].filter((x) => !x.fechado && x.ate > agora);
  }
  // ouve a vitrine ao vivo; quem passou da hora de fechar sai sozinho
  function ouvirVitrine(aoMudar) {
    const vistos = [];
    let fim = false;
    let ultimo = '';
    const avisar = () => {
      if (fim) return;
      const lista = juntar(vistos);
      const chave = lista.map((x) => `${x.id}:${x.t}`).join();
      if (chave === ultimo) return;
      ultimo = chave;
      aoMudar(lista);
    };
    const sub = R.canal.assinar([R.topico.bares()], (env) => {
      const x = limparVitrine(env);
      if (!x) return;
      vistos.push(x);
      if (vistos.length > 400) vistos.splice(0, vistos.length - 400);
      avisar();
    }, { desde: '12h' });
    const relogio = setInterval(avisar, 60000);
    return { fechar() { fim = true; clearInterval(relogio); if (sub) sub.fechar(); }, agora: () => juntar(vistos) };
  }
  const ateTxt = (b) => `aberto até ${hhmm(new Date(b.ate))}`;
  const voltasTxt = (n) => (n ? `${n} ${n === 1 ? 'volta' : 'voltas'} de Drink hoje` : 'nenhuma volta de Drink ainda hoje');
  // como chegar: o app de mapas do celular (o Drink só leva de volta; quem vai é você, no seu carro)
  const comoChegar = (b) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;

  /* ---------- o painel do bar (na aba Eventos, de quem tem um bar) ---------- */
  function criar(op) {
    const raiz = op.raiz;
    const q = (s) => $(s, raiz);
    const eu = op.eu;
    let rascunho = null;
    let chamada = null;
    let ouvindo = null;
    let ouvindoId = '';
    let visivel = false;
    let apagarArmado = 0;
    let publicadoEm = 0;
    let republicar = 0;
    let redesenho = 0;

    const meu = () => { const u = eu(); return u && u.bar && u.bar.id ? u.bar : null; };
    const aberto = (b) => Boolean(b && b.aberto && b.aberto.ate > Date.now());
    const daNoite = (b) => b.voltas.filter((v) => v.t >= inicioDaNoite());
    const daSemana = (b) => b.voltas.filter((v) => v.t >= Date.now() - 7 * DIA);

    /* ouvir as voltas do bar enquanto o painel está na tela (o ntfy guarda 12 h) */
    function ouvirCanal() {
      const b = visivel ? meu() : null;
      const id = b ? b.id : '';
      if (id === ouvindoId) return;
      if (ouvindo) { ouvindo.fechar(); ouvindo = null; }
      ouvindoId = id;
      if (!b) return;
      ouvindo = R.canal.assinar([topico(b.id)], async (env) => {
        const atualBar = meu();
        if (!atualBar || atualBar.id !== b.id) return;
        const v = limparVolta(await abrir(atualBar, env));
        if (!v || atualBar.voltas.some((x) => x.corrida === v.corrida)) return;
        atualBar.voltas.push(v);
        atualBar.voltas.sort((x, y) => x.t - y.t);
        if (atualBar.voltas.length > 500) atualBar.voltas = atualBar.voltas.slice(-500);
        op.salvar();
        if (aberto(atualBar)) agendarVitrine();
        clearTimeout(redesenho);
        redesenho = setTimeout(() => {
          if (op.atual() === 'bar') pagina();
          else if (op.atual() === 'eventos') cartao();
        }, 80);
      }, { desde: '12h' });
    }
    function mostrar(sim) {
      visivel = sim;
      ouvirCanal();
      const b = meu();
      if (sim && aberto(b) && Date.now() - publicadoEm > REPUBLICAR) publicarVitrine(b);
    }

    /* ---------- a vitrine do bar ---------- */
    function publicarVitrine(b) {
      publicadoEm = Date.now();
      R.fila.mandar(R.topico.bares(), {
        v: 1, tipo: 'bar', id: b.id, t: Date.now(), nome: b.nome, bairro: b.lugar.bairro || '',
        lat: cinco(b.lugar.lat), lon: cinco(b.lugar.lon), beneficio: b.beneficio, ate: b.aberto.ate, voltas: daNoite(b).length,
      }, { validade: 2 * HORA });
    }
    function agendarVitrine() {
      clearTimeout(republicar);
      republicar = setTimeout(() => { const b = meu(); if (aberto(b)) publicarVitrine(b); }, 15000);
    }
    function abrirHoje() {
      const b = meu();
      if (!b) return;
      b.aberto = { desde: Date.now(), ate: fechamento(b.fecha) };
      op.salvar();
      publicarVitrine(b);
      pagina();
      op.avisar(`Pronto: o ${b.nome} está no mapa do Drink até ${hhmm(new Date(b.aberto.ate))}.`);
    }
    function fecharHoje() {
      const b = meu();
      if (!b) return;
      b.aberto = null;
      op.salvar();
      clearTimeout(republicar);
      R.fila.mandar(R.topico.bares(), { v: 1, tipo: 'bar', id: b.id, t: Date.now(), fechado: true }, { validade: 2 * HORA });
      pagina();
      op.avisar('O bar saiu do mapa por hoje. O QR continua valendo.');
    }

    /* ---------- o cartão na aba Eventos ---------- */
    function cartao() {
      const b = meu();
      q('#rp-bar-cartao-t').textContent = b ? b.nome : 'Tem um bar?';
      q('#rp-bar-cartao-sub').textContent = b
        ? (aberto(b) ? `No mapa até ${hhmm(new Date(b.aberto.ate))} · ${voltasTxt(daNoite(b).length)}` : `Fora do mapa hoje · ${voltasTxt(daNoite(b).length)}`)
        : 'QR no balcão, o seu bar no mapa do Drink e a volta do cliente chamada por você.';
      q('#rp-bar-cartao-acao').textContent = b ? 'Abrir' : 'Cadastrar';
      q('#rp-bar-cartao').classList.toggle('tem', Boolean(b));
      ouvirCanal();
    }

    /* ---------- cadastrar o bar ---------- */
    function novo() {
      rascunho = { lugar: null, beneficio: 'agua' };
      q('#rp-barn-nome').value = '';
      q('#rp-barn-fecha').value = '02:00';
      q('#rp-barn-erro').hidden = true;
      op.ir('bar-novo');
    }
    function lugarEscolhido(l) {
      if (!rascunho) return;
      rascunho.lugar = { nome: texto(l.nome, 80) || 'Bar', bairro: texto(l.bairro, 40), lat: l.lat, lon: l.lon };
      if (!q('#rp-barn-nome').value.trim() && l.nome) q('#rp-barn-nome').value = texto(l.nome, 60);
      q('#rp-barn-erro').hidden = true;
    }
    function desenharForm() {
      if (!rascunho) { novo(); return; }
      $$('[data-bar-ben]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.barBen === rascunho.beneficio)));
      const l = rascunho.lugar;
      q('#rp-barn-onde b').textContent = l ? l.nome : 'Escolher o endereço';
      q('#rp-barn-onde small').textContent = l ? (l.bairro || 'Belo Horizonte') : 'É de lá que o Drink busca os clientes';
      q('#rp-barn-onde').classList.toggle('ok', Boolean(l));
    }
    function erroForm(txt, campo) {
      const p = q('#rp-barn-erro');
      p.textContent = txt;
      p.hidden = false;
      if (campo) campo.focus();
    }
    function criarBar() {
      const r = rascunho;
      if (!r) return;
      const nome = texto(q('#rp-barn-nome').value, 60);
      const fecha = q('#rp-barn-fecha').value;
      if (nome.length < 2) { erroForm('Coloca o nome do bar, do jeito que está na fachada.', q('#rp-barn-nome')); return; }
      if (!r.lugar) { erroForm('Escolhe o endereço do bar: é de lá que o Drink busca os clientes.', q('#rp-barn-onde')); return; }
      if (!S.naGrandeBH(r.lugar)) { erroForm('Por enquanto o Drink só roda na Grande BH. Escolhe um endereço por aqui.', q('#rp-barn-onde')); return; }
      if (!/^\d{2}:\d{2}$/.test(fecha)) { erroForm('Coloca a hora que o bar costuma fechar.', q('#rp-barn-fecha')); return; }
      const u = eu();
      u.bar = {
        id: R.idAleatorio(12), chave: R.novaChave(), nome, lugar: { ...r.lugar }, beneficio: r.beneficio, fecha,
        criado: Date.now(), voltas: [], aberto: null,
      };
      op.salvar();
      rascunho = null;
      op.ir('bar');
      op.avisar('Bar cadastrado. Imprime o QR e cola no balcão e nas mesas.');
    }

    /* ---------- a página do bar ---------- */
    function pagina() {
      const b = meu();
      if (!b) { op.ir('eventos'); return; }
      const ab = aberto(b);
      const ben = beneficioTxt(b.beneficio);
      q('#rp-barp-t').textContent = b.nome;
      q('#rp-barp-onde').textContent = [b.lugar.nome !== b.nome ? b.lugar.nome : '', b.lugar.bairro].filter(Boolean).join(' · ') || 'Belo Horizonte';
      const chip = q('#rp-barp-sit');
      chip.textContent = ab ? `No mapa até ${hhmm(new Date(b.aberto.ate))}` : 'Fora do mapa';
      chip.className = `ev-sit ${ab ? 'ev-sit-agora' : 'ev-sit-acabou'}`;
      q('#rp-barp-estado').textContent = ab
        ? 'Quem pede e quem dirige vê o bar no mapa do Drink. Os motoristas sabem que tem volta saindo daqui.'
        : `Toca em abrir quando o bar abrir: ele aparece no mapa do Drink até as ${b.fecha}.`;
      q('[data-bar="abrir-hoje"]').hidden = ab;
      q('[data-bar="abrir-hoje"]').textContent = `Abrir hoje, até as ${b.fecha}`;
      q('[data-bar="fechar-hoje"]').hidden = !ab;
      q('#rp-barp-noite').textContent = String(daNoite(b).length);
      q('#rp-barp-semana').textContent = String(daSemana(b).length);
      q('#rp-barp-total').textContent = String(b.voltas.length);
      q('#rp-barp-cartao-nome').textContent = b.nome;
      q('#rp-barp-qr').innerHTML = PIX.qrSvg(linkBar(b), `QR code do ${b.nome}`);
      q('#rp-barp-qr-sub').textContent = `Aponta a câmera do celular. O Drink busca você aqui e leva você e o seu carro pra casa.${ben ? ` Voltando de Drink: ${ben.charAt(0).toLowerCase()}${ben.slice(1)}.` : ''}`;
      q('#rp-barp-ben').textContent = ben
        ? `${ben}. Quem volta de Drink mostra o código do recibo; ele aparece aqui, na lista da noite.`
        : 'Sem benefício para quem volta de Drink. Dá para mudar apagando e cadastrando o bar de novo.';
      const noite = daNoite(b).slice().reverse();
      q('#rp-barp-vazio').hidden = noite.length > 0;
      q('#rp-barp-voltas').innerHTML = noite.map((v) => `<li><span><b>${esc(v.cliente)}</b>${v.peloBar ? ' <em class="bar-tag">chamado pelo bar</em>' : ''}<small>${esc(hhmm(new Date(v.t)))}${v.para ? ` · para ${esc(v.para)}` : ''}</small></span>${v.cupom ? `<code aria-label="Código ${esc(v.cupom.split('').join(' '))}">${esc(v.cupom)}</code>` : ''}</li>`).join('');
      q('[data-bar="apagar"]').textContent = apagarArmado > Date.now() ? 'Toca de novo para apagar' : 'Apagar o bar deste aparelho';
      ouvirCanal();
    }
    function abrirPagina() {
      apagarArmado = 0;
      op.ir(meu() ? 'bar' : 'bar-novo');
      if (!meu()) novo();
    }
    function apagar() {
      const b = meu();
      if (!b) return;
      if (apagarArmado < Date.now()) {
        apagarArmado = Date.now() + 4000;
        pagina();
        setTimeout(() => { if (op.atual() === 'bar') pagina(); }, 4100);
        return;
      }
      if (aberto(b)) R.fila.mandar(R.topico.bares(), { v: 1, tipo: 'bar', id: b.id, t: Date.now(), fechado: true }, { validade: 2 * HORA });
      const u = eu();
      delete u.bar;
      op.salvar();
      op.ir('eventos');
      op.avisar('Bar apagado deste aparelho. O QR antigo para de contar as voltas aqui.');
    }
    function compartilhar() {
      const b = meu();
      if (!b) return;
      const url = linkBar(b);
      const txt = `${b.nome}: bebeu? Volta de Drink. O motorista busca você aqui e leva você e o seu carro pra casa.`;
      if (navigator.share) navigator.share({ title: b.nome, text: txt, url }).catch(() => {});
      else op.copiar(`${txt} ${url}`, 'Link do QR copiado.');
    }
    function imprimir() {
      document.body.classList.add('imprimindo-convite');
      const tirar = () => { document.body.classList.remove('imprimindo-convite'); window.removeEventListener('afterprint', tirar); };
      window.addEventListener('afterprint', tirar);
      window.print();
      setTimeout(tirar, 60000);
    }

    /* ---------- chamar um Drink para um cliente ---------- */
    function novaChamada() {
      chamada = { cambio: 'automático' };
      ['#rp-barc-nome', '#rp-barc-modelo', '#rp-barc-placa'].forEach((s) => { q(s).value = ''; });
      q('#rp-barc-cor').value = '';
      q('#rp-barc-erro').hidden = true;
      q('#rp-barc-previa').innerHTML = '';
      op.ir('bar-chamar');
    }
    function desenharChamada() {
      if (!chamada) { novaChamada(); return; }
      $$('[data-barc-cambio]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.barcCambio === chamada.cambio)));
      const b = meu();
      q('#rp-barc-sub').textContent = b
        ? `O Drink busca o cliente no ${b.nome} e leva ele e o carro dele pra casa. Ele paga direto para o motorista, pelo QR no celular do Drink.`
        : '';
    }
    function erroChamada(txt, campo) {
      const p = q('#rp-barc-erro');
      p.textContent = txt;
      p.hidden = false;
      if (campo) campo.focus();
    }
    function seguirChamada() {
      const b = meu();
      if (!b || !chamada) return;
      const nome = texto(q('#rp-barc-nome').value, 30);
      const modelo = texto(q('#rp-barc-modelo').value, 30);
      const cor = q('#rp-barc-cor').value;
      if (nome.length < 2) { erroChamada('Coloca o nome do cliente: é assim que o motorista chama ele.', q('#rp-barc-nome')); return; }
      if (modelo.length < 2) { erroChamada('Qual é o carro do cliente? Modelo, como Onix ou HB20.', q('#rp-barc-modelo')); return; }
      if (!CARROS.CORES.some(([c]) => c === cor)) { erroChamada('Escolhe a cor do carro.', q('#rp-barc-cor')); return; }
      const pl = CARROS.placa.conferir(q('#rp-barc-placa').value);
      if (pl.erro) { erroChamada(pl.erro, q('#rp-barc-placa')); return; }
      op.chamarPeloBar({
        bar: { id: b.id, chave: b.chave, nome: b.nome, lugar: { ...b.lugar }, beneficio: b.beneficio },
        cliente: nome.split(' ').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(' '),
        carro: { modelo: modelo[0].toUpperCase() + modelo.slice(1), cor, placa: pl.placa, cambio: chamada.cambio },
      });
      chamada = null;
    }

    /* ---------- toques ---------- */
    raiz.addEventListener('click', (ev) => {
      const bt = ev.target.closest('button');
      if (!bt || !raiz.contains(bt) || bt.disabled) return;
      const ds = bt.dataset;
      if (ds.barBen && rascunho) { rascunho.beneficio = ds.barBen; desenharForm(); return; }
      if (ds.barcCambio && chamada) { chamada.cambio = ds.barcCambio; desenharChamada(); return; }
      const acoes = {
        cartao: abrirPagina,
        lista: () => op.ir('eventos'),
        pagina: () => op.ir('bar'),
        onde: () => op.buscarLugar(),
        'abrir-hoje': abrirHoje,
        'fechar-hoje': fecharHoje,
        compartilhar,
        copiar: () => { const b = meu(); if (b) op.copiar(linkBar(b), 'Link do QR copiado.'); },
        imprimir,
        chamar: novaChamada,
        apagar,
      };
      if (ds.bar && acoes[ds.bar]) acoes[ds.bar]();
    });
    q('#rp-barn-form').addEventListener('submit', (ev) => { ev.preventDefault(); criarBar(); });
    q('#rp-barn-form').addEventListener('input', () => { q('#rp-barn-erro').hidden = true; });
    q('#rp-barc-form').addEventListener('submit', (ev) => { ev.preventDefault(); seguirChamada(); });
    q('#rp-barc-form').addEventListener('input', (ev) => {
      q('#rp-barc-erro').hidden = true;
      if (ev.target.id === 'rp-barc-placa') q('#rp-barc-previa').innerHTML = CARROS.placa.previa(ev.target.value);
    });

    return { cartao, desenharForm, pagina, desenharChamada, novo, lugarEscolhido, mostrar, meu };
  }

  window.Drink.bares = {
    BENEFICIOS, PERTO_DO_BAR, beneficioTxt, fechamento, linkBar, lerLink, guardarAqui, esquecerAqui, aqui, saiDoBar, novoCupom,
    topico, mandar, abrir, avisarVolta, limparVolta, limparVitrine, juntar, ouvirVitrine, ateTxt, voltasTxt, comoChegar, criar,
  };
}());
