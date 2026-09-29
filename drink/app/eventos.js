/* Drink — eventos, para quem organiza. Casamento, formatura, festa da empresa, bar ou casa de show: o organizador
   cria o evento no app e recebe um QR code para as mesas ou o convite. O convidado escaneia e pede a volta com o
   embarque já no lugar do evento; se o evento paga, ele não paga nada (ou só o que passar do teto de cada volta).
   O motorista manda a conta de cada volta para o evento, e quem organiza acerta com cada Drink pelo Pix.
   Não tem servidor no meio: o convite leva tudo no próprio link, e as contas passam pelo ntfy cifradas com a
   chave do evento, que só existe no link. */
(function () {
  'use strict';

  const { $, $$, brl, brl0, esc, hhmm } = window.Drink.util;
  const S = window.Drink.servicos;
  const R = window.Drink.rede;
  const PIX = window.Drink.pix;

  // taxa: parte dos convidados que foi de carro e vai precisar de um Drink (a mesma conta do site)
  const TIPOS = {
    casamento: { nome: 'Casamento', taxa: 0.35 },
    formatura: { nome: 'Formatura', taxa: 0.3 },
    empresa: { nome: 'Festa de empresa', taxa: 0.3 },
    bar: { nome: 'Bar ou restaurante', taxa: 0.25 },
    show: { nome: 'Casa de show', taxa: 0.2 },
  };
  const TETOS = [60, 80, 100, 150];
  const GUARDADO = 'drink-convite';
  const HORA = 3600000;
  // a volta só sai por conta do evento se o embarque for no lugar do evento
  const PERTO_DO_EVENTO = 400;
  const redondo = (v) => Math.round(v * 100) / 100;
  const numero = (n) => typeof n === 'number' && Number.isFinite(n);
  const texto = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const dois = (n) => String(n).padStart(2, '0');
  const ID = /^[\w-]{16}$/;
  const CHAVE = /^[\w-]{43}$/;

  // como no site: uns 2,2 convidados por carro, e cada Drink faz 3 voltas por noite
  function estimar(tipo, convidados) {
    const taxa = (TIPOS[tipo] || TIPOS.casamento).taxa;
    const carros = Math.max(1, Math.round((convidados * taxa) / 2.2));
    return { carros, drinks: Math.ceil(carros / 3) };
  }

  /* ---------- quando o evento vale ---------- */
  // do começo até 3 h depois do fim (os últimos convidados ainda voltando); o fim pode cair no dia seguinte
  function momento(data, hora) {
    const [a, m, d] = String(data).split('-').map(Number);
    const [h, mi] = String(hora).split(':').map(Number);
    return new Date(a, m - 1, d, h, mi).getTime();
  }
  function janela(e) {
    const ini = momento(e.data, e.inicio);
    let fim = momento(e.data, e.fim);
    if (fim <= ini) fim += 24 * HORA;
    return { ini, fim, ate: fim + 3 * HORA };
  }
  function situacao(e, agora = Date.now()) {
    const j = janela(e);
    if (!Number.isFinite(j.ini)) return 'acabou';
    if (agora < j.ini) return 'antes';
    if (agora <= j.fim) return 'agora';
    return agora <= j.ate ? 'saindo' : 'acabou';
  }
  const semPonto = (s) => s.replace(/\./g, '');
  function diaTxt(t) {
    return semPonto(new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }));
  }
  const quandoTxt = (e) => `${diaTxt(janela(e).ini)} · ${e.inicio} às ${e.fim}`;
  function rotulo(e, agora = Date.now()) {
    const sit = situacao(e, agora);
    if (sit === 'agora') return 'Acontecendo agora';
    if (sit === 'saindo') return 'Os últimos voltando';
    if (sit === 'acabou') return 'Acabou';
    const ini = new Date(janela(e).ini);
    const hoje = new Date(agora);
    const dias = Math.round((new Date(ini.getFullYear(), ini.getMonth(), ini.getDate()) - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / (24 * HORA));
    if (dias <= 0) return `Hoje, às ${e.inicio}`;
    if (dias === 1) return `Amanhã, às ${e.inicio}`;
    return `Em ${dias} dias`;
  }

  /* ---------- o convite: tudo vai no link ---------- */
  // a parte depois do # nunca sai do celular: nem o site do Drink vê a chave do evento
  function paraB64(txt) {
    let s = '';
    new TextEncoder().encode(txt).forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deB64(b) {
    const s = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
  }
  const cinco = (x) => Math.round(x * 1e5) / 1e5;
  function linkConvite(e) {
    const paga = e.paga === 'evento';
    // curto de propósito: quanto menor o link, maiores os quadradinhos do QR, mais fácil de ler na mesa
    const dados = [2, e.id, e.chave, e.nome, e.tipo, e.data, e.inicio, e.fim, e.lugar.nome, e.lugar.bairro || '',
      cinco(e.lugar.lat), cinco(e.lugar.lon), paga ? e.teto : 0, paga ? e.voltas : 0];
    const u = new URL('./', location.href);
    u.search = `?evento=${e.id}`;
    u.hash = paraB64(JSON.stringify(dados));
    return u.toString();
  }
  // o link chega de qualquer lugar: só vale o que tem a forma certa
  function lerConvite(id, hash) {
    let d;
    try { d = JSON.parse(deB64(String(hash || ''))); } catch (x) { return null; }
    if (!Array.isArray(d) || d[0] !== 2 || d.length < 14) return null;
    const [, i, k, nome, tipo, data, inicio, fim, lugar, bairro, lat, lon, teto, voltas] = d;
    const hora = (h) => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h);
    if (i !== id || typeof i !== 'string' || !ID.test(i) || typeof k !== 'string' || !CHAVE.test(k)) return null;
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !hora(inicio) || !hora(fim)) return null;
    if (!numero(lat) || !numero(lon) || !S.naGrandeBH({ lat, lon })) return null;
    const pagaEvento = numero(teto) && teto > 0 && numero(voltas) && voltas >= 1;
    const e = {
      id: i, chave: k, nome: texto(nome, 60) || 'Evento', tipo: TIPOS[tipo] ? tipo : 'casamento',
      data, inicio, fim,
      lugar: { nome: texto(lugar, 80) || 'Local do evento', bairro: texto(bairro, 40), lat, lon },
      paga: pagaEvento ? 'evento' : 'convidado',
      teto: pagaEvento ? Math.min(Math.round(teto), 1000) : 0,
      voltas: pagaEvento ? Math.min(Math.round(voltas), 2000) : 0,
    };
    return Number.isFinite(janela(e).ini) ? e : null;
  }
  // o convite fica guardado no aparelho até o evento acabar
  function guardarConvite(e) { try { localStorage.setItem(GUARDADO, JSON.stringify(e)); } catch (x) { /* sem espaço */ } }
  function esquecerConvite() { try { localStorage.removeItem(GUARDADO); } catch (x) { /* ok */ } }
  function convite() {
    let e = null;
    try { e = JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch (x) { e = null; }
    if (!e || !e.id || !e.lugar) return null;
    if (situacao(e) === 'acabou') { esquecerConvite(); return null; }
    return e;
  }
  // a volta sai por conta do evento? (evento que paga, na hora dele, saindo de lá)
  function cobre(e, embarque) {
    if (!e || e.paga !== 'evento' || !embarque) return false;
    if (!['agora', 'saindo'].includes(situacao(e))) return false;
    return S.distancia(embarque, e.lugar) <= PERTO_DO_EVENTO;
  }

  /* ---------- o canal do evento ---------- */
  const topico = (id) => R.topico.evento(id);
  async function mandar(e, obj) {
    const env = { v: 1, ...(await R.cifrar(e.chave, obj)) };
    // a conta espera na fila até sair: sem sinal na garagem, ela vai quando der
    R.fila.mandar(topico(e.id), env, { validade: 12 * HORA });
  }
  async function abrir(e, env) {
    if (!env || env.v !== 1 || typeof env.iv !== 'string' || typeof env.ct !== 'string') return null;
    try { return await R.decifrar(e.chave, env); } catch (x) { return null; }
  }
  // quantas voltas o evento já pagou e se quem organiza encerrou (o convidado confere antes de pedir)
  async function voltasUsadas(e) {
    const desde = String(Math.max(Math.floor(janela(e).ini / 1000) - 60, Math.floor(Date.now() / 1000) - 12 * 3600));
    const lidas = await R.canal.ler(topico(e.id), desde);
    const corridas = new Set();
    let encerrado = false;
    for (const { corpo } of lidas) {
      const m = await abrir(e, corpo);
      if (m && m.tipo === 'conta' && typeof m.corrida === 'string') corridas.add(m.corrida);
      if (m && m.tipo === 'encerrado') encerrado = true;
    }
    return { n: corridas.size, encerrado };
  }
  // ouve os canais de vários eventos de uma vez (organizador e motorista)
  function ouvir(lista, aoReceber) {
    const porTopico = new Map(lista.map((e) => [topico(e.id), e]));
    if (!porTopico.size) return null;
    return R.canal.assinar([...porTopico.keys()], async (env, meta) => {
      const e = porTopico.get(meta && meta.topic);
      if (!e) return;
      const m = await abrir(e, env);
      if (m) aoReceber(e, m);
    }, { desde: '12h' });
  }

  /* ---------- a conta de uma volta, do jeito que o organizador guarda ---------- */
  function limparConta(e, m) {
    const mot = m.motorista || {};
    const pix = mot.pix || {};
    if (typeof m.corrida !== 'string' || !/^[\w-]{16,32}$/.test(m.corrida)) return null;
    if (typeof mot.id !== 'string' || !/^[\w-]{8,16}$/.test(mot.id)) return null;
    if (typeof pix.chave !== 'string' || !pix.chave || pix.chave.length > 77) return null;
    if (!numero(m.valor) || m.valor <= 0) return null;
    return {
      corrida: m.corrida, t: numero(m.t) ? m.t : Date.now(),
      motorista: { id: mot.id, nome: texto(mot.nome, 40) || 'Motorista', veiculo: mot.veiculo === 'patinete' ? 'patinete' : 'bike', pix: { chave: pix.chave, nome: texto(pix.nome, 60) } },
      convidado: texto(m.convidado, 30) || 'Convidado', de: texto(m.de, 40), para: texto(m.para, 40),
      km: numero(m.km) && m.km > 0 && m.km < 300 ? m.km : 0,
      // nunca mais que o teto que o próprio organizador escolheu
      valor: redondo(Math.min(m.valor, e.teto)),
    };
  }

  /* ---------- a aba Eventos, de quem organiza ---------- */
  function criar(op) {
    const raiz = op.raiz;
    const q = (s) => $(s, raiz);
    const eu = op.eu;
    let aberto = null;
    let rascunho = null;
    let pagando = null;
    let ouvindo = null;
    let ouvindoIds = '';
    let visivel = false;
    let redesenho = 0;
    let apagarArmado = 0;

    const eventos = () => { const u = eu(); if (!Array.isArray(u.eventos)) u.eventos = []; return u.eventos; };
    const acharEvento = (id) => eventos().find((e) => e.id === id) || null;
    const pagaConta = (e, c) => (e.pagas || []).includes(c.corrida);

    /* ouvir as contas dos eventos enquanto a aba está na tela (o ntfy guarda 12 h) */
    function ouvirCanais() {
      const vivos = visivel ? eventos().filter((e) => e.paga === 'evento' && Date.now() < janela(e).ate + 12 * HORA) : [];
      const ids = vivos.map((e) => e.id).sort().join();
      if (ids === ouvindoIds) return;
      if (ouvindo) { ouvindo.fechar(); ouvindo = null; }
      ouvindoIds = ids;
      if (ids) ouvindo = ouvir(vivos, receber);
    }
    function receber(e, m) {
      if (!acharEvento(e.id)) return;
      if (m.tipo === 'conta') {
        const c = limparConta(e, m);
        if (!c || e.contas.some((x) => x.corrida === c.corrida)) return;
        e.contas.push(c);
        e.contas.sort((a, b) => a.t - b.t);
      } else if (m.tipo === 'pago' && Array.isArray(m.corridas)) {
        // o aviso de pago sai deste aparelho; volta pelo canal e vale igual se veio de outro aparelho da conta
        e.pagas = [...new Set([...(e.pagas || []), ...m.corridas.filter((x) => typeof x === 'string')])];
      } else if (m.tipo === 'encerrado') {
        e.encerrado = true;
      } else return;
      op.salvar();
      clearTimeout(redesenho);
      redesenho = setTimeout(() => {
        if (op.atual() === 'eventos') lista();
        else if (op.atual() === 'evento' && aberto === e) pagina();
        if (pagando && pagando.e === e) desenharPagar();
      }, 80);
    }
    function mostrar(sim) {
      visivel = sim;
      ouvirCanais();
    }

    /* ---------- a lista ---------- */
    function totalAPagar(e) { return redondo(e.contas.filter((c) => !pagaConta(e, c)).reduce((s, c) => s + c.valor, 0)); }
    function cartao(e) {
      const sit = situacao(e);
      const n = e.contas.length;
      let resumo = e.paga === 'evento' ? `O evento paga até ${brl0(e.teto)} por volta` : 'Cada convidado paga a sua';
      if (n) {
        const falta = totalAPagar(e);
        resumo = `${n} ${n === 1 ? 'volta' : 'voltas'} · ${falta ? `${brl(falta)} a pagar` : 'tudo pago'}`;
      }
      return `<li><button type="button" class="ev-cartao" data-ev-abrir="${esc(e.id)}">
        <span class="ev-cartao-ic" aria-hidden="true"><svg><use href="#i-festa"/></svg></span>
        <span class="ev-cartao-txt"><b>${esc(e.nome)}</b><small>${esc(quandoTxt(e))}</small><small>${esc(e.lugar.bairro || e.lugar.nome)} · ${esc(resumo)}</small></span>
        <em class="ev-sit ev-sit-${sit}">${esc(rotulo(e))}</em>
      </button></li>`;
    }
    function lista() {
      const todos = eventos();
      const vivos = todos.filter((e) => situacao(e) !== 'acabou').sort((a, b) => janela(a).ini - janela(b).ini);
      const idos = todos.filter((e) => situacao(e) === 'acabou').sort((a, b) => janela(b).ini - janela(a).ini);
      const ul = q('#rp-ev-lista');
      ul.innerHTML = [...vivos, ...idos].map(cartao).join('');
      ul.hidden = !todos.length;
      q('#rp-ev-seus').hidden = !todos.length;
      q('#rp-ev-novo').textContent = todos.length ? 'Criar outro evento' : 'Criar um evento';
      ouvirCanais();
    }

    /* ---------- o formulário de um evento novo ---------- */
    function hoje() { const d = new Date(); return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`; }
    function novo() {
      rascunho = { tipo: 'casamento', paga: 'evento', teto: 80, voltas: 0, voltasMexidas: false, lugar: null };
      q('#rp-evn-nome').value = '';
      q('#rp-evn-data').value = hoje();
      q('#rp-evn-data').min = hoje();
      q('#rp-evn-ini').value = '20:00';
      q('#rp-evn-fim').value = '02:00';
      q('#rp-evn-conv').value = '150';
      q('#rp-evn-erro').hidden = true;
      op.ir('evento-novo');
    }
    function lugarEscolhido(l) {
      if (!rascunho) return;
      rascunho.lugar = { nome: texto(l.nome, 80) || 'Local do evento', bairro: texto(l.bairro, 40), lat: l.lat, lon: l.lon };
      q('#rp-evn-erro').hidden = true;
    }
    function desenharForm() {
      if (!rascunho) { novo(); return; }
      const r = rascunho;
      const conv = Number(q('#rp-evn-conv').value) || 150;
      q('#rp-evn-conv-out').textContent = conv.toLocaleString('pt-BR');
      const est = estimar(r.tipo, conv);
      if (!r.voltasMexidas) r.voltas = est.carros;
      q('#rp-evn-estima').innerHTML = `<b>${est.drinks}</b> <span>${est.drinks === 1 ? 'Drink de plantão' : 'Drinks de plantão'}</span><small>cerca de ${est.carros} ${est.carros === 1 ? 'carro' : 'carros'} para levar · cada Drink faz umas 3 voltas por noite</small>`;
      $$('[data-ev-tipo]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.evTipo === r.tipo)));
      $$('[data-ev-paga]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.evPaga === r.paga)));
      $$('[data-ev-teto]', raiz).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.evTeto) === r.teto)));
      q('#rp-evn-teto-box').hidden = r.paga !== 'evento';
      q('#rp-evn-voltas').textContent = String(r.voltas);
      q('#rp-evn-max').textContent = `No máximo ${brl(r.voltas * r.teto)}. Cada volta custa o que marca o taxímetro do Drink (${brl0(25)} de saída e ${brl(3.5)} por km, +20% de 0h às 5h). O que passar de ${brl0(r.teto)}, o convidado paga pelo Pix.`;
      const l = r.lugar;
      q('#rp-evn-onde b').textContent = l ? l.nome : 'Escolher o lugar';
      q('#rp-evn-onde small').textContent = l ? (l.bairro || 'Belo Horizonte') : 'Endereço, salão, bar ou casa de show';
      q('#rp-evn-onde').classList.toggle('ok', Boolean(l));
    }
    function erro(txt, campo) {
      const p = q('#rp-evn-erro');
      p.textContent = txt;
      p.hidden = false;
      if (campo) campo.focus();
    }
    function criarEvento() {
      const r = rascunho;
      if (!r) return;
      const nome = texto(q('#rp-evn-nome').value, 60);
      const data = q('#rp-evn-data').value;
      const inicio = q('#rp-evn-ini').value;
      const fim = q('#rp-evn-fim').value;
      if (nome.length < 3) { erro('Dá um nome para o evento. É ele que aparece para os convidados.', q('#rp-evn-nome')); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { erro('Escolhe o dia do evento.', q('#rp-evn-data')); return; }
      if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) { erro('Coloca a hora que começa e a hora que termina.', q('#rp-evn-ini')); return; }
      if (!r.lugar) { erro('Escolhe onde vai ser o evento: é de lá que o Drink busca os convidados.', q('#rp-evn-onde')); return; }
      if (!S.naGrandeBH(r.lugar)) { erro('Por enquanto o Drink só roda na Grande BH. Escolhe um lugar por aqui.', q('#rp-evn-onde')); return; }
      const e = {
        id: R.idAleatorio(12), chave: R.novaChave(), nome, tipo: r.tipo, data, inicio, fim, lugar: { ...r.lugar },
        convidados: Number(q('#rp-evn-conv').value) || 150,
        paga: r.paga, teto: r.paga === 'evento' ? r.teto : 0, voltas: r.paga === 'evento' ? r.voltas : 0,
        criado: Date.now(), contas: [], pagas: [], encerrado: false, chamado: 0,
      };
      if (situacao(e) === 'acabou' || Date.now() > janela(e).fim) { erro('Esse horário já passou. Confere o dia e a hora que termina.', q('#rp-evn-data')); return; }
      eventos().push(e);
      op.salvar();
      rascunho = null;
      aberto = e;
      op.ir('evento');
      op.avisar('Evento criado. Agora é só mandar o QR para os convidados.');
    }

    /* ---------- a página do evento ---------- */
    function abrirEvento(id) {
      const e = acharEvento(id);
      if (!e) return;
      aberto = e;
      apagarArmado = 0;
      op.ir('evento');
    }
    function textoConvite(e) {
      const paga = e.paga === 'evento' ? ` A volta é por conta do evento, até ${brl0(e.teto)}.` : '';
      return `${e.nome}: bebeu? Volta de Drink. O motorista busca você no evento e leva você e o seu carro pra casa.${paga}`;
    }
    function pagina() {
      const e = aberto;
      if (!e) { op.ir('eventos'); return; }
      const sit = situacao(e);
      const link = linkConvite(e);
      q('#rp-evp-t').textContent = e.nome;
      q('#rp-evp-quando').textContent = `${quandoTxt(e)} · ${[e.lugar.nome, e.lugar.bairro].filter(Boolean).join(', ')}`;
      const chip = q('#rp-evp-sit');
      chip.textContent = rotulo(e);
      chip.className = `ev-sit ev-sit-${sit}`;
      q('#rp-evp-cartao-nome').textContent = e.nome;
      q('#rp-evp-qr').innerHTML = PIX.qrSvg(link, `QR code do convite de ${e.nome}`);
      q('#rp-evp-qr-sub').textContent = e.paga === 'evento'
        ? `Aponta a câmera do celular. O Drink busca você aqui e leva você e o seu carro pra casa. A volta é por conta do evento, até ${brl0(e.teto)}.`
        : 'Aponta a câmera do celular. O Drink busca você aqui e leva você e o seu carro pra casa. Você paga pelo Pix, direto para o motorista.';
      q('#rp-evp-regra').textContent = e.paga === 'evento'
        ? `O evento paga até ${brl0(e.teto)} de cada volta, em até ${e.voltas} ${e.voltas === 1 ? 'volta' : 'voltas'}: no máximo ${brl(e.teto * e.voltas)}. Cada volta custa o que marca o taxímetro do Drink; o que passar de ${brl0(e.teto)}, o convidado paga pelo Pix. Você acerta com cada Drink pelo Pix, aqui mesmo.`
        : 'Cada convidado paga a própria volta pelo Pix, direto para o Drink. O QR só facilita: o Drink já busca no lugar certo.';
      desenharChamar();
      desenharContas();
    }
    function desenharChamar() {
      const e = aberto;
      const sit = situacao(e);
      const box = q('#rp-evp-chamar');
      box.hidden = sit === 'acabou';
      const bt = q('[data-ev="chamar"]');
      const txt = q('#rp-evp-chamar-txt');
      if (sit === 'antes') {
        bt.disabled = true;
        txt.textContent = 'Quando o evento começar, dá para avisar os Drinks online perto daqui para virem para cá.';
        return;
      }
      const prox = (e.chamado || 0) + 10 * 60000;
      bt.disabled = Date.now() < prox;
      txt.textContent = e.chamado
        ? `Chamado às ${hhmm(new Date(e.chamado))}.${Date.now() < prox ? ` Dá para chamar de novo às ${hhmm(new Date(prox))}.` : ''}`
        : 'Os Drinks online perto do evento recebem um aviso para vir para cá.';
    }
    function desenharContas() {
      const e = aberto;
      const contas = e.contas;
      const total = redondo(contas.reduce((s, c) => s + c.valor, 0));
      q('#rp-evp-resumo').textContent = contas.length
        ? `${contas.length} ${contas.length === 1 ? 'volta' : 'voltas'}${e.paga === 'evento' ? ` · ${brl(total)} por conta do evento` : ''}`
        : (e.paga === 'evento' ? 'Nenhuma volta ainda. Quando um convidado voltar de Drink, a conta aparece aqui.' : 'Cada convidado paga a sua: as voltas não passam por aqui.');
      q('#rp-evp').classList.toggle('com-voltas', contas.length > 0);
      q('#rp-evp-voltas').innerHTML = contas.map((c) => `<li><span><span><b>${esc(c.motorista.nome)}</b> levou ${esc(c.convidado)}</span><small>${esc(hhmm(new Date(c.t)))} · ${esc([c.de, c.para].filter(Boolean).join(' → '))}${c.km ? ` · ${esc(S.textoKm(c.km))}` : ''}</small></span><em>${esc(brl(c.valor))}</em></li>`).join('');
      // o acerto: um Pix para cada Drink, com a soma das voltas dele
      const grupos = new Map();
      contas.forEach((c) => {
        const k = c.motorista.id;
        if (!grupos.has(k)) grupos.set(k, { id: k, nome: c.motorista.nome, pix: c.motorista.pix, contas: [] });
        const g = grupos.get(k);
        g.contas.push(c);
        g.nome = c.motorista.nome;
        g.pix = c.motorista.pix;
      });
      const acerto = q('#rp-evp-acerto');
      q('#rp-evp-acerto-t').hidden = e.paga !== 'evento' || !grupos.size;
      acerto.hidden = e.paga !== 'evento' || !grupos.size;
      acerto.innerHTML = [...grupos.values()].map((g) => {
        const falta = redondo(g.contas.filter((c) => !pagaConta(e, c)).reduce((s, c) => s + c.valor, 0));
        const n = g.contas.length;
        return `<li><span><b>${esc(g.nome)}</b><small>${n} ${n === 1 ? 'volta' : 'voltas'} · chave ${esc(PIX.mascarar(g.pix.chave))}</small></span>${falta
          ? `<button type="button" class="t-botao ev-pagar" data-ev-pagar="${esc(g.id)}">Pagar ${esc(brl(falta))}</button>`
          : '<em class="ev-pago"><svg aria-hidden="true"><use href="#i-check"/></svg>Pago</em>'}</li>`;
      }).join('');
      const enc = q('[data-ev="encerrar"]');
      enc.hidden = e.paga !== 'evento' || e.encerrado || situacao(e) === 'acabou';
      q('#rp-evp-encerrado').hidden = !(e.paga === 'evento' && e.encerrado);
      q('[data-ev="apagar"]').textContent = apagarArmado > Date.now() ? 'Toca de novo para apagar' : 'Apagar o evento';
    }

    /* ---------- pagar um Drink ---------- */
    function abrirPagar(id) {
      const e = aberto;
      if (!e) return;
      pagando = { e, id };
      desenharPagar();
      op.abrirFolha('rp-ev-pagar');
    }
    function desenharPagar() {
      const { e, id } = pagando;
      const contas = e.contas.filter((c) => c.motorista.id === id && !pagaConta(e, c));
      const ultima = e.contas.filter((c) => c.motorista.id === id).pop();
      if (!ultima) return;
      const total = redondo(contas.reduce((s, c) => s + c.valor, 0));
      const mot = ultima.motorista;
      pagando.contas = contas.map((c) => c.corrida);
      pagando.total = total;
      q('#rp-evpg-t').textContent = `Pagar ${mot.nome}`;
      q('#rp-evpg-sub').textContent = `${contas.length} ${contas.length === 1 ? 'volta' : 'voltas'} do ${e.nome}`;
      q('#rp-evpg-valor').textContent = brl(total);
      const bt = q('[data-ev="paguei"]');
      if (!total) {
        q('#rp-evpg-qr').innerHTML = '<p class="rt-qr-espera">Tudo pago com esse Drink.</p>';
        pagando.codigo = '';
        bt.disabled = true;
        return;
      }
      pagando.codigo = PIX.copiaECola({ chave: mot.pix.chave, nome: mot.pix.nome || mot.nome, cidade: 'BELO HORIZONTE', valor: total, descricao: 'Voltas do evento Drink' });
      q('#rp-evpg-qr').innerHTML = PIX.qrSvg(pagando.codigo);
      q('#rp-evpg-para').innerHTML = `Para <b>${esc(mot.pix.nome || mot.nome)}</b> · chave ${esc(PIX.mascarar(mot.pix.chave))}`;
      bt.disabled = false;
    }
    async function paguei() {
      if (!pagando || !pagando.total) return;
      const { e, id } = pagando;
      const corridas = pagando.contas;
      e.pagas = [...new Set([...(e.pagas || []), ...corridas])];
      op.salvar();
      await mandar(e, { tipo: 'pago', motorista: id, corridas, total: pagando.total, t: Date.now() });
      const nome = (e.contas.find((c) => c.motorista.id === id) || { motorista: { nome: 'o Drink' } }).motorista.nome;
      pagando = null;
      op.fecharFolha();
      pagina();
      op.avisar(`Pronto. ${nome.split(' ')[0]} recebe o aviso de que você pagou.`);
    }

    /* ---------- chamar Drinks, encerrar, apagar ---------- */
    async function chamar() {
      const e = aberto;
      if (!e || !['agora', 'saindo'].includes(situacao(e)) || Date.now() < (e.chamado || 0) + 10 * 60000) return;
      const agora = Date.now();
      const est = estimar(e.tipo, e.convidados || 150);
      // aviso aberto: só o tipo do evento, o bairro e um ponto aproximado (uns 500 m), nada do nome nem do endereço
      const chamado = {
        v: 1, tipo: 'chamado', id: e.id, t: agora, expira: agora + 45 * 60000,
        de: { bairro: e.lugar.bairro || 'BH', ...S.aproximar(e.lugar) },
        evento: TIPOS[e.tipo].nome, fim: e.fim, drinks: est.drinks, teto: e.paga === 'evento' ? e.teto : 0,
      };
      const bt = q('[data-ev="chamar"]');
      bt.disabled = true;
      try {
        await R.canal.publicar(R.topico.pedidos(), chamado);
      } catch (x) {
        bt.disabled = false;
        op.avisar('O aviso não saiu. Confere a internet e tenta de novo.');
        return;
      }
      // o mesmo aviso na região do evento: é por ela que chega a notificação de quem está perto com o app fechado
      R.fila.mandar(R.topico.regiao(e.lugar), chamado, { validade: 10 * 60000 });
      e.chamado = agora;
      op.salvar();
      desenharChamar();
      op.avisar('Pronto. Os Drinks online perto do evento receberam o aviso.');
    }
    async function encerrar() {
      const e = aberto;
      if (!e || e.encerrado) return;
      e.encerrado = true;
      op.salvar();
      await mandar(e, { tipo: 'encerrado', t: Date.now() });
      desenharContas();
      op.avisar('Voltas pagas encerradas. Quem pedir agora paga a própria volta.');
    }
    function apagar() {
      const e = aberto;
      if (!e) return;
      if (apagarArmado < Date.now()) {
        apagarArmado = Date.now() + 4000;
        desenharContas();
        setTimeout(() => { if (aberto === e && op.atual() === 'evento') desenharContas(); }, 4100);
        return;
      }
      const u = eu();
      u.eventos = eventos().filter((x) => x !== e);
      op.salvar();
      aberto = null;
      op.ir('eventos');
      op.avisar('Evento apagado deste aparelho.');
    }
    function compartilhar() {
      const e = aberto;
      if (!e) return;
      const url = linkConvite(e);
      if (navigator.share) navigator.share({ title: e.nome, text: textoConvite(e), url }).catch(() => {});
      else op.copiar(`${textoConvite(e)} ${url}`, 'Convite copiado. Cola no grupo dos convidados.');
    }
    function imprimir() {
      document.body.classList.add('imprimindo-convite');
      const tirar = () => { document.body.classList.remove('imprimindo-convite'); window.removeEventListener('afterprint', tirar); };
      window.addEventListener('afterprint', tirar);
      window.print();
      setTimeout(tirar, 60000);
    }

    /* ---------- toques ---------- */
    raiz.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || !raiz.contains(b) || b.disabled) return;
      const ds = b.dataset;
      if (ds.evAbrir) { abrirEvento(ds.evAbrir); return; }
      if (ds.evPagar) { abrirPagar(ds.evPagar); return; }
      if (ds.evTipo) { rascunho.tipo = ds.evTipo; desenharForm(); return; }
      if (ds.evPaga) { rascunho.paga = ds.evPaga; desenharForm(); return; }
      if (ds.evTeto) { rascunho.teto = Number(ds.evTeto); desenharForm(); return; }
      const acoes = {
        novo,
        lista: () => op.ir('eventos'),
        onde: () => op.buscarLugar(),
        menos: () => { rascunho.voltasMexidas = true; rascunho.voltas = Math.max(1, rascunho.voltas - 1); desenharForm(); },
        mais: () => { rascunho.voltasMexidas = true; rascunho.voltas = Math.min(2000, rascunho.voltas + 1); desenharForm(); },
        compartilhar,
        copiar: () => { if (aberto) op.copiar(linkConvite(aberto), 'Link do convite copiado.'); },
        imprimir,
        chamar,
        encerrar,
        apagar,
        'copiar-pix': () => { if (pagando && pagando.codigo) op.copiar(pagando.codigo, 'Código Pix copiado. Agora cola no app do seu banco.'); },
        paguei,
      };
      if (ds.ev && acoes[ds.ev]) acoes[ds.ev]();
    });
    q('#rp-evn-form').addEventListener('submit', (ev) => { ev.preventDefault(); criarEvento(); });
    q('#rp-evn-form').addEventListener('input', (ev) => {
      if (ev.target.id === 'rp-evn-conv') desenharForm();
      q('#rp-evn-erro').hidden = true;
    });

    return { lista, desenharForm, pagina, novo, lugarEscolhido, mostrar };
  }

  window.Drink.Eventos = {
    TIPOS, TETOS, estimar, janela, situacao, quandoTxt, rotulo, linkConvite, lerConvite, guardarConvite, esquecerConvite,
    convite, cobre, topico, mandar, abrir, voltasUsadas, ouvir, limparConta, criar, PERTO_DO_EVENTO,
  };
}());
