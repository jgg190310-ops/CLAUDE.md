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
  // o ntfy guarda 12 h: o cartão do bar é publicado de novo de tempos em tempos (e quem já viu guarda por 30 dias)
  const REPUBLICAR = 30 * 60000;
  const CACHE = 'drink-bares';
  const VALE_CACHE = 30 * DIA;
  // a foto vai em pedaços (cada mensagem do ntfy tem limite)
  const FOTO_PARTE = 3000;
  const FOTO_MAX = 60000;
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
  // novo: veio agora do QR (o app abre direto na página do bar)
  function guardarAqui(b, novo = false) { try { localStorage.setItem(GUARDADO, JSON.stringify({ ...b, novo, ate: Date.now() + VALE_AQUI })); } catch (x) { /* sem espaço */ } }
  function novoDoQr() {
    const b = aqui();
    if (!b || !b.novo) return null;
    guardarAqui({ ...b, novo: undefined }, false);
    return b;
  }
  function esquecerAqui() { try { localStorage.removeItem(GUARDADO); } catch (x) { /* ok */ } }
  function aqui() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch (x) { b = null; }
    if (!b || !b.id || !b.lugar || !(b.ate > Date.now())) { if (b) esquecerAqui(); return null; }
    return b;
  }
  function lerQrTexto(txt) {
    let u;
    try { u = new URL(String(txt || '').trim()); } catch (x) { return null; }
    const id = u.searchParams.get('bar');
    if (id) { const b = lerLink(id, u.hash.slice(1)); return b ? { bar: b } : { invalido: true }; }
    const ev = u.searchParams.get('evento');
    if (ev) return { evento: { id: ev, hash: u.hash.slice(1) } };
    return null;
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

  /* ---------- a vitrine: os bares do Drink (abertos ou não), com a foto ---------- */
  // o cartão é o que o bar já mostra na fachada: nome, endereço, ponto, benefício, até que horas abre hoje e a foto
  function limparVitrine(m) {
    if (!m || m.v !== 1 || m.tipo !== 'bar' || typeof m.id !== 'string' || !ID.test(m.id)) return null;
    const t = numero(m.t) ? m.t : 0;
    if (m.removido === true) return { id: m.id, t, removido: true };
    if (m.fechado === true) return { id: m.id, t, fechado: true };
    if (!numero(m.lat) || !numero(m.lon) || !S.naGrandeBH(m)) return null;
    return {
      id: m.id, t, nome: texto(m.nome, 60) || 'Bar', endereco: texto(m.endereco, 80), bairro: texto(m.bairro, 40), lat: m.lat, lon: m.lon,
      beneficio: BENEFICIOS.some((b) => b[0] === m.beneficio) ? m.beneficio : 'nenhum', fecha: /^\d{2}:\d{2}$/.test(String(m.fecha)) ? m.fecha : '',
      ate: numero(m.ate) && m.ate > 0 ? Math.min(m.ate, t + 14 * HORA) : 0,
      voltas: numero(m.voltas) && m.voltas > 0 ? Math.min(Math.round(m.voltas), 999) : 0,
      foto: typeof m.foto === 'string' && /^[\w-]{6,16}$/.test(m.foto) ? m.foto : '',
    };
  }
  function limparFotoParte(m) {
    if (!m || m.v !== 1 || m.tipo !== 'bar-foto' || typeof m.id !== 'string' || !ID.test(m.id)) return null;
    const i = Number(m.i);
    const n = Number(m.n);
    if (typeof m.f !== 'string' || !/^[\w-]{6,16}$/.test(m.f) || !Number.isInteger(i) || !Number.isInteger(n) || n < 1 || n > 24 || i < 0 || i >= n) return null;
    if (typeof m.parte !== 'string' || m.parte.length > FOTO_PARTE || !/^[A-Za-z0-9+/=]*$/.test(m.parte)) return null;
    return { id: m.id, f: m.f, i, n, parte: m.parte };
  }
  // os bares que este celular já viu ficam guardados por 30 dias (o ntfy só guarda 12 h)
  function lerCache() {
    try { const c = JSON.parse(localStorage.getItem(CACHE) || '{}'); return c && c.bares && typeof c.bares === 'object' ? c.bares : {}; } catch (x) { return {}; }
  }
  function gravarCache(bares) { try { localStorage.setItem(CACHE, JSON.stringify({ v: 1, bares })); } catch (x) { /* sem espaço: fica só na memória */ } }
  // a vitrine; cada bar traz se está aberto agora (até a hora de fechar que ele mesmo deu). Ao vivo (uma conexão
  // aberta) só enquanto a tela mostra os bares: ligar(true/false). Fora disso, ler() busca uma vez, sem ficar ouvindo,
  // e receber() aceita as mensagens de uma conexão que já está aberta para outra coisa (os pedidos do motorista).
  function ouvirVitrine(aoMudar) {
    const bares = {};
    const agora0 = Date.now();
    Object.entries(lerCache()).forEach(([id, b]) => { if (ID.test(id) && b && b.nome && b.visto > agora0 - VALE_CACHE) bares[id] = b; });
    let fim = false;
    let avisoT = 0;
    let gravarT = 0;
    const lista = () => { const agora = Date.now(); return Object.values(bares).filter((b) => b.nome).map((b) => ({ ...b, aberto: b.ate > agora })); };
    const mudou = () => {
      clearTimeout(avisoT);
      avisoT = setTimeout(() => { if (!fim) aoMudar(lista()); }, 60);
      clearTimeout(gravarT);
      gravarT = setTimeout(() => {
        const out = {};
        Object.keys(bares).filter((id) => bares[id].nome).sort((a, b) => bares[b].visto - bares[a].visto).slice(0, 40).forEach((id) => { out[id] = bares[id]; });
        gravarCache(out);
      }, 800);
    };
    // a foto de um bar vem do canal dela, só quando é nova (no máximo uma busca a cada 5 min por bar)
    const buscando = new Map();
    async function buscarFoto(id, f, tentativa = 0) {
      if (fim || (!tentativa && Date.now() - (buscando.get(id) || 0) < 5 * 60000)) return;
      buscando.set(id, Date.now());
      let lidas = [];
      try { lidas = await R.canal.ler(R.topico.barFoto(id), '12h'); } catch (e) { buscando.delete(id); return; }
      const arr = [];
      let n = 0;
      lidas.forEach(({ corpo }) => {
        const p = limparFotoParte(corpo);
        if (!p || p.id !== id || p.f !== f) return;
        n = p.n;
        arr[p.i] = p.parte;
      });
      // a foto ainda chegando (o cartão vem antes dos pedaços): tenta de novo daqui a pouco
      if (!n || arr.filter((x) => typeof x === 'string').length < n) {
        if (tentativa < 4) setTimeout(() => buscarFoto(id, f, tentativa + 1), 3000 * (tentativa + 1));
        return;
      }
      const b64 = arr.slice(0, n).join('');
      const b = bares[id];
      if (!b || !b64.startsWith('/9j/') || b64.length > FOTO_MAX) return;
      b.fotoDados = `data:image/jpeg;base64,${b64}`;
      b.fotoId = f;
      mudou();
    }
    const fotoEmDia = (b) => !b.foto || (b.fotoDados && b.fotoId === b.foto);
    Object.values(bares).forEach((b) => { if (!fotoEmDia(b)) buscarFoto(b.id, b.foto); });
    let ultimo = null;
    function receber(env, m) {
      if (m && m.id) ultimo = m.id;
      const x = limparVitrine(env);
      if (!x) return;
      const atual = bares[x.id];
      if (atual && atual.t > x.t) return;
      if (x.removido) { delete bares[x.id]; mudou(); return; }
      if (x.fechado) { if (atual) { atual.ate = 0; atual.t = x.t; mudou(); } return; }
      bares[x.id] = { ...(atual || {}), ...x, visto: Date.now() };
      if (!fotoEmDia(bares[x.id])) buscarFoto(x.id, x.foto);
      mudou();
    }
    let sub = null;
    let lendo = null;
    function ler() {
      if (fim || sub) return Promise.resolve();
      if (!lendo) {
        lendo = R.canal.ler(R.topico.bares(), '12h')
          .then((lidas) => { if (!fim) lidas.forEach(({ corpo, m }) => receber(corpo, m)); }, () => { /* sem rede: fica o que já tinha */ })
          .then(() => { lendo = null; });
      }
      return lendo;
    }
    // ao vivo, continuando de onde a última leitura parou
    function ligar(sim) {
      if (fim) return;
      if (sim && !sub) sub = R.canal.assinar([R.topico.bares()], receber, { desde: ultimo || '12h' });
      if (!sim && sub) { sub.fechar(); sub = null; }
    }
    const relogio = setInterval(() => { if (!fim) aoMudar(lista()); }, 60000);
    setTimeout(() => { if (!fim) aoMudar(lista()); }, 0);
    return { fechar() { ligar(false); fim = true; clearInterval(relogio); }, agora: lista, ligar, ler, receber: (env, m) => { if (!fim) receber(env, m); } };
  }
  // a foto do bar: recortada em 3 × 2, pequena o bastante para ir em pedaços pelo ntfy
  async function reduzirFoto(arquivo) {
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('foto')); i.src = url; });
      const W = 480;
      const H = 320;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const x = c.getContext('2d');
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      let q = 0.74;
      let d = c.toDataURL('image/jpeg', q);
      while (d.length > FOTO_MAX - 4000 && q > 0.35) { q -= 0.08; d = c.toDataURL('image/jpeg', q); }
      if (!d.startsWith('data:image/jpeg;base64,/9j/')) throw new Error('foto');
      return d;
    } finally { URL.revokeObjectURL(url); }
  }
  const idDaFoto = async (d) => (await R.resumo(d)).replace(/[^\w-]/g, '').slice(0, 12);
  const ateTxt = (b) => (b.ate > Date.now() ? `aberto até ${hhmm(new Date(b.ate))}` : 'fechado agora');
  const voltasTxt = (n) => (n ? `${n} ${n === 1 ? 'volta' : 'voltas'} de Drink hoje` : 'nenhuma volta de Drink ainda hoje');
  // como chegar: o app de mapas do celular (o Drink só leva de volta; quem vai é você, no seu carro)
  const comoChegar = (b) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;

  /* ---------- o painel do bar (na aba Bares, de quem tem um bar) ---------- */
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
      if (sim && b && Date.now() - Math.max(publicadoEm, b.vitrineEm || 0) > REPUBLICAR) publicarVitrine(b);
    }
    // o app aberto (em qualquer tela) mantém o bar na vitrine: o ntfy só guarda 12 h
    function manter() {
      const b = meu();
      if (b && Date.now() - Math.max(publicadoEm, b.vitrineEm || 0) > 2 * HORA) publicarVitrine(b);
    }

    /* ---------- a vitrine do bar ---------- */
    function publicarVitrine(b, fotoNova = false) {
      publicadoEm = Date.now();
      b.vitrineEm = publicadoEm;
      R.fila.mandar(R.topico.bares(), {
        v: 1, tipo: 'bar', id: b.id, t: Date.now(), nome: b.nome, endereco: b.lugar.nome !== b.nome ? b.lugar.nome : '', bairro: b.lugar.bairro || '',
        lat: cinco(b.lugar.lat), lon: cinco(b.lugar.lon), beneficio: b.beneficio, fecha: b.fecha, ate: aberto(b) ? b.aberto.ate : 0,
        voltas: daNoite(b).length, foto: b.fotoId || '',
      }, { validade: 2 * HORA });
      // a foto vai no canal dela quando é nova e, depois, a cada 10 h (o ntfy guarda 12 h)
      if (b.foto && b.fotoId && (fotoNova || !b.fotoEm || Date.now() - b.fotoEm > 10 * HORA)) {
        b.fotoEm = Date.now();
        const dados = b.foto.split(',')[1] || '';
        const n = Math.ceil(dados.length / FOTO_PARTE);
        for (let i = 0; i < n; i += 1) {
          R.fila.mandar(R.topico.barFoto(b.id), { v: 1, tipo: 'bar-foto', id: b.id, f: b.fotoId, i, n, parte: dados.slice(i * FOTO_PARTE, (i + 1) * FOTO_PARTE) }, { validade: 2 * HORA });
        }
      }
      op.salvar();
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
      clearTimeout(republicar);
      publicarVitrine(b);
      pagina();
      op.avisar('O bar saiu do mapa por hoje. Ele continua na aba Bares, como fechado, e o QR continua valendo.');
    }

    /* ---------- o cartão na aba Bares ---------- */
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
      rascunho = { lugar: null, beneficio: 'agua', foto: '' };
      q('#rp-barn-nome').value = '';
      q('#rp-barn-foto-in').value = '';
      q('#rp-barn-fecha').value = '02:00';
      q('#rp-barn-erro').hidden = true;
      op.ir('bar-novo');
    }
    function lugarEscolhido(l) {
      if (!rascunho) return;
      rascunho.lugar = { nome: texto(l.nome, 80) || 'Bar', bairro: texto(l.bairro, 40), lat: l.lat, lon: l.lon };
      // um lugar com nome (da busca) já preenche o nome do bar; o endereço do GPS ou do ponto no mapa, não
      if (!l.gps && !l.noMapa && !q('#rp-barn-nome').value.trim() && l.nome) q('#rp-barn-nome').value = texto(l.nome, 60);
      q('#rp-barn-erro').hidden = true;
    }
    function desenharForm() {
      if (!rascunho) { novo(); return; }
      $$('[data-bar-ben]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.barBen === rascunho.beneficio)));
      const l = rascunho.lugar;
      q('#rp-barn-onde b').textContent = l ? l.nome : 'Escolher o endereço';
      q('#rp-barn-onde small').textContent = l ? (l.bairro || 'Belo Horizonte') : 'É de lá que o Drink busca os clientes';
      q('#rp-barn-onde').classList.toggle('ok', Boolean(l));
      desenharFoto(q('#rp-barn-foto'), rascunho.foto, 'Pôr a foto do bar', 'A fachada ou o salão: é ela que aparece na aba Bares');
    }
    // o botão da foto: a foto escolhida ou o convite para pôr uma
    function desenharFoto(caixa, foto, titulo, sub) {
      caixa.classList.toggle('tem', Boolean(foto));
      caixa.querySelector('.bar-foto-ver').innerHTML = foto ? `<img src="${foto}" alt="">` : '<svg aria-hidden="true"><use href="#i-camera"/></svg>';
      caixa.querySelector('b').textContent = foto ? 'Trocar a foto' : titulo;
      caixa.querySelector('small').textContent = foto ? 'A foto que aparece na aba Bares' : sub;
    }
    async function lerFoto(input, aoTer) {
      const f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { op.avisar('Escolhe uma foto (JPG ou PNG).'); return; }
      try { aoTer(await reduzirFoto(f)); } catch (e) { op.avisar('Não deu para ler essa foto. Tenta outra.'); }
    }
    function erroForm(txt, campo) {
      const p = q('#rp-barn-erro');
      p.textContent = txt;
      p.hidden = false;
      if (campo) campo.focus();
    }
    async function criarBar() {
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
        criado: Date.now(), voltas: [], aberto: null, foto: r.foto || '', fotoId: '',
      };
      if (u.bar.foto) u.bar.fotoId = await idDaFoto(u.bar.foto);
      // já entra na aba Bares de todo mundo (como fechado, até abrir hoje)
      publicarVitrine(u.bar, Boolean(u.bar.foto));
      rascunho = null;
      op.ir('bar');
      op.avisar('Bar cadastrado. Ele já aparece na aba Bares. Imprime o QR e cola nas mesas.');
    }

    /* ---------- a página do bar ---------- */
    function pagina() {
      const b = meu();
      if (!b) { op.ir('bares'); return; }
      const ab = aberto(b);
      desenharFoto(q('#rp-barp-foto'), b.foto, 'Pôr a foto do bar', 'Sem foto, o bar aparece só com o nome na aba Bares');
      const ben = beneficioTxt(b.beneficio);
      q('#rp-barp-t').textContent = b.nome;
      q('#rp-barp-onde').textContent = [b.lugar.nome !== b.nome ? b.lugar.nome : '', b.lugar.bairro].filter(Boolean).join(' · ') || 'Belo Horizonte';
      const chip = q('#rp-barp-sit');
      chip.textContent = ab ? `Aberto até ${hhmm(new Date(b.aberto.ate))}` : 'Fechado';
      chip.className = `ev-sit ${ab ? 'ev-sit-agora' : 'ev-sit-acabou'}`;
      q('#rp-barp-estado').textContent = ab
        ? 'Aberto na aba Bares e no mapa de quem pede e de quem dirige. Os motoristas sabem que tem volta saindo daqui.'
        : `Na aba Bares como fechado. Toca em abrir quando o bar abrir: ele fica aberto e no mapa do Drink até as ${b.fecha}.`;
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
      R.fila.mandar(R.topico.bares(), { v: 1, tipo: 'bar', id: b.id, t: Date.now(), removido: true }, { validade: 2 * HORA });
      const u = eu();
      delete u.bar;
      op.salvar();
      op.ir('bares');
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
        lista: () => op.ir('bares'),
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
    q('#rp-barn-foto-in').addEventListener('change', (ev) => lerFoto(ev.target, (d) => { if (rascunho) { rascunho.foto = d; desenharForm(); } }));
    q('#rp-barp-foto-in').addEventListener('change', (ev) => lerFoto(ev.target, async (d) => {
      const b = meu();
      if (!b) return;
      b.foto = d;
      b.fotoId = await idDaFoto(d);
      publicarVitrine(b, true);
      pagina();
      op.avisar('Foto trocada. Ela já vai para a aba Bares.');
    }));
    q('#rp-barc-form').addEventListener('submit', (ev) => { ev.preventDefault(); seguirChamada(); });
    q('#rp-barc-form').addEventListener('input', (ev) => {
      q('#rp-barc-erro').hidden = true;
      if (ev.target.id === 'rp-barc-placa') q('#rp-barc-previa').innerHTML = CARROS.placa.previa(ev.target.value);
    });

    return { cartao, desenharForm, pagina, desenharChamada, novo, lugarEscolhido, mostrar, manter, meu };
  }

  /* ---------- a aba Bares, de quem pede ---------- */
  // a lista dos bares (com a foto), a página de cada um com "Solicite o seu Drink" e a câmera para o QR da mesa
  function criarAba(op) {
    const raiz = op.raiz;
    const q = (s) => $(s, raiz);
    const LEITOR = window.Drink.leitor;
    let lista = [];
    let filtro = '';
    let visto = null;
    let peloQr = false;
    let leitor = null;
    let abrindo = 0;
    const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const situacao = (b) => (b.aberto ? `Aberto até ${hhmm(new Date(b.ate))}` : 'Fechado agora');
    // o bar que veio do QR (com a chave) vira um cartão como os da vitrine
    const doLink = (b) => ({ id: b.id, nome: b.nome, endereco: b.lugar.nome !== b.nome ? b.lugar.nome : '', bairro: b.lugar.bairro, lat: b.lugar.lat, lon: b.lugar.lon, beneficio: b.beneficio, ate: 0, voltas: 0 });

    function receber(l) {
      lista = l;
      if (op.atual() === 'bares') desenhar();
      if (visto) {
        const n = lista.find((b) => b.id === visto.id);
        if (n) { visto = { ...visto, ...n }; if (op.atual() === 'bar-ver') pagina(); }
      }
    }
    function ordenados() {
      const ref = op.pos() || S.BH;
      const f = norm(filtro.trim());
      return lista.map((b) => ({ ...b, m: S.distancia(ref, b) }))
        .filter((b) => !f || norm(`${b.nome} ${b.bairro} ${b.endereco}`).includes(f))
        .sort((a, b) => (Number(b.aberto) - Number(a.aberto)) || a.m - b.m);
    }
    function capa(b, classe) {
      return b.fotoDados
        ? `<img class="${classe}" src="${b.fotoDados}" alt="Foto do ${esc(b.nome)}">`
        : `<span class="${classe} bs-sem-foto" aria-hidden="true"><svg><use href="#i-copo"/></svg></span>`;
    }
    function desenhar() {
      const l = ordenados();
      const abertos = l.filter((b) => b.aberto).length;
      q('#rp-bs-n').textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'bar parceiro' : 'bares parceiros'}${abertos ? ` · ${abertos} ${abertos === 1 ? 'aberto' : 'abertos'} agora` : ''}` : 'Bares parceiros';
      q('#rp-bs-lista').innerHTML = l.map((b) => `<li><button type="button" class="bs-cartao" data-rp-bar-ver="${esc(b.id)}">${capa(b, 'bs-foto')}<span class="bs-txt"><b>${esc(b.nome)}</b><small>${esc([b.bairro, S.textoKm(b.m / 1000)].filter(Boolean).join(' · '))}</small><em class="bs-sit${b.aberto ? ' aberto' : ''}">${esc(situacao(b))}</em></span></button></li>`).join('');
      const vazio = q('#rp-bs-vazio');
      vazio.hidden = l.length > 0;
      vazio.textContent = filtro.trim()
        ? 'Nenhum bar parceiro com esse nome. Se você está no bar, aponte a câmera para o QR Code da mesa.'
        : 'Os bares parceiros aparecem aqui assim que se cadastram. Num bar com o QR do Drink na mesa, aponte a câmera: ele aparece na hora.';
    }
    function abrirBar(b, qr = false) {
      visto = b;
      peloQr = qr;
      op.ir('bar-ver');
    }
    function abrirId(id) { const b = lista.find((x) => x.id === id); if (b) abrirBar(b); }
    // o link do QR (pela câmera do app ou pela câmera do celular): acha o bar na hora
    function abrirDoLink(b) {
      const n = lista.find((x) => x.id === b.id);
      abrirBar({ ...doLink(b), ...(n || {}) }, true);
    }
    function pagina() {
      const b = visto;
      if (!b) { op.ir('bares'); return; }
      const ref = op.pos();
      q('#rp-bv-capa').innerHTML = capa(b, 'bv-foto');
      q('#rp-bv-t').textContent = b.nome;
      q('#rp-bv-onde').textContent = [b.endereco, b.bairro, ref ? `a ${S.textoKm(S.distancia(ref, b) / 1000)} de você` : ''].filter(Boolean).join(' · ') || 'Belo Horizonte';
      const chip = q('#rp-bv-sit');
      chip.textContent = situacao(b);
      chip.classList.toggle('aberto', Boolean(b.aberto));
      q('#rp-bv-achou').hidden = !peloQr;
      if (peloQr) q('#rp-bv-achou').textContent = `Achamos pelo QR: você está no ${b.nome}. O Drink busca você na porta.`;
      q('#rp-bv-ben').textContent = beneficioTxt(b.beneficio) || 'Sem benefício';
      q('#rp-bv-voltas').textContent = voltasTxt(b.voltas || 0).replace(/^n/, 'N');
      q('#rp-bv-ir').href = comoChegar(b);
    }

    /* a câmera para o QR da mesa */
    async function abrirCamera() {
      const minha = ++abrindo;
      op.ir('bar-camera');
      const txt = q('#rp-bq-txt');
      q('#rp-bq').classList.remove('sem-camera');
      txt.textContent = 'Abrindo a câmera…';
      if (!LEITOR.temCamera()) { semCamera('Esse navegador não deixa o app usar a câmera. Abra a câmera do celular e aponte para o QR da mesa: o link abre o Drink no bar certo.'); return; }
      try {
        const l = await LEITOR.iniciar(q('#rp-bq-video'), lido);
        if (minha !== abrindo || op.atual() !== 'bar-camera') { l.parar(); return; }
        leitor = l;
        txt.textContent = 'Aponte para o QR Code da mesa. O Drink acha o bar na hora.';
      } catch (e) {
        if (minha !== abrindo) return;
        semCamera(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
          ? 'O celular não deixou o Drink usar a câmera. Libere a câmera nas configurações do navegador, ou abra a câmera do celular e aponte para o QR: o link abre o Drink no bar certo.'
          : 'Não deu para abrir a câmera aqui. Abra a câmera do celular e aponte para o QR da mesa: o link abre o Drink no bar certo.');
      }
    }
    function semCamera(msg) {
      q('#rp-bq').classList.add('sem-camera');
      q('#rp-bq-txt').textContent = msg;
    }
    function fecharCamera() {
      abrindo += 1;
      if (leitor) { leitor.parar(); leitor = null; }
    }
    function lido(txt) {
      const r = lerQrTexto(txt);
      if (r && r.bar) {
        fecharCamera();
        guardarAqui(r.bar, false);
        if (navigator.vibrate) navigator.vibrate(60);
        abrirDoLink(r.bar);
        return;
      }
      if (r && r.evento) { fecharCamera(); op.evento(r.evento); return; }
      q('#rp-bq-txt').textContent = r && r.invalido
        ? 'Esse QR do Drink veio com defeito. Peça para o bar imprimir de novo.'
        : 'Esse QR não é de um bar do Drink. Procure o QR com o copo do Drink na mesa.';
    }
    // a câmera desliga ao sair da tela dela
    function mostrar(nome) { if (nome !== 'bar-camera') fecharCamera(); }
    // os bares do Drink que batem com o que a pessoa digita na busca de endereço (eles vêm primeiro)
    function buscar(texto) {
      const f = norm(texto.trim());
      if (f.length < 2) return [];
      return ordenados().filter((b) => norm(`${b.nome} ${b.endereco}`).includes(f)).slice(0, 4);
    }

    raiz.addEventListener('click', (ev) => {
      const bt = ev.target.closest('button');
      if (!bt || !raiz.contains(bt) || bt.disabled) return;
      if (bt.dataset.rpBarVer) { abrirId(bt.dataset.rpBarVer); return; }
      const acoes = {
        'bar-camera': abrirCamera,
        'bq-fechar': () => { fecharCamera(); op.ir('bares'); },
        'bar-solicitar': () => { if (visto) op.solicitar(visto); },
      };
      if (bt.dataset.rp && acoes[bt.dataset.rp]) acoes[bt.dataset.rp]();
    });
    q('#rp-bs-busca').addEventListener('input', (ev) => { filtro = ev.target.value; desenhar(); });

    return { receber, desenhar, pagina, abrirId, abrirDoLink, mostrar, buscar, visto: () => visto };
  }

  window.Drink.bares = {
    BENEFICIOS, PERTO_DO_BAR, beneficioTxt, fechamento, linkBar, lerLink, guardarAqui, esquecerAqui, aqui, saiDoBar, novoCupom,
    topico, mandar, abrir, avisarVolta, limparVolta, limparVitrine, ouvirVitrine, ateTxt, voltasTxt, comoChegar, criar, criarAba,
    lerQrTexto, novoDoQr, reduzirFoto,
  };
}());
