/* Drink — o app do motorista, de verdade: fica online com o GPS, recebe os pedidos dos passageiros,
   aceita, vai até o embarque com o Google Maps ou o Waze, confere o código no celular do passageiro,
   fotografa o carro com a câmera, dobra a bike, leva o passageiro e recebe pelo Pix na própria chave. */
(function () {
  'use strict';

  const { $, $$, brl, brl0, hhmm, esc, reduzirMovimento, taxaEspera, PRECO } = window.Drink.util;
  const S = window.Drink.servicos;
  const R = window.Drink.rede;
  const Mapa = window.Drink.mapa;
  const CARROS = window.Drink.carros;

  const GUIA = [
    'Abre o porta-malas e estende a capa protetora.',
    'Dobra o guidão pra baixo até ouvir o clique.',
    'Dobra o quadro ao meio, abaixa o selim e guarda no porta-malas.',
  ];
  const redondo = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
  const primeiroNome = (nome) => String(nome || '').trim().split(' ')[0] || 'Passageiro';
  const iniciais = (nome) => String(nome || '').replace(/\(.*?\)/g, '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'PA';
  const nomeCurto = (u) => [u.nome, u.sobrenome ? `${u.sobrenome.trim()[0]}.` : ''].filter(Boolean).join(' ');
  // os pedidos chegam por um canal aberto: só entra o que tem a forma certa
  const numero = (n) => typeof n === 'number' && Number.isFinite(n);
  const ponto = (p) => Boolean(p) && numero(p.lat) && numero(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  const texto = (s, max = 50) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
  function limparPedido(m) {
    if (typeof m.id !== 'string' || !/^[\w-]{16,32}$/.test(m.id) || typeof m.pub !== 'string' || !/^[\w-]{80,100}$/.test(m.pub)) return null;
    if (!m.de || !ponto(m.de) || !m.para || !numero(m.valor) || m.valor <= 0 || m.valor > 3000 || !numero(m.km) || m.km <= 0 || m.km > 300) return null;
    if (!numero(m.t) || !numero(m.expira)) return null;
    return {
      v: 1, tipo: 'pedido', id: m.id, pub: m.pub, t: m.t, expira: Math.min(m.expira, Date.now() + 5 * 60000),
      fecho: typeof m.fecho === 'string' ? m.fecho.slice(0, 64) : null,
      de: { bairro: texto(m.de.bairro) || 'BH', lat: m.de.lat, lon: m.de.lon }, para: { bairro: texto(m.para.bairro) || 'o destino' },
      km: m.km, min: numero(m.min) ? m.min : 0, valor: Math.round(m.valor * 100) / 100,
      nota: numero(m.nota) && m.nota >= 1 && m.nota <= 5 ? Math.round(m.nota * 10) / 10 : 0,
      veic: ['bike', 'patinete'].includes(m.veic) ? m.veic : 'qualquer', cambio: m.cambio === 'manual' ? 'manual' : 'automático',
    };
  }

  function criar(op) {
    const raiz = op.raiz;
    const q = (s) => $(s, raiz);
    const telas = $$('.rt[data-rt]', raiz);
    const veu = q('#rm-veu');
    const eu = op.eu;

    let mapa = null;
    let atual = '';
    let folha = null;
    let online = false;
    let pos = null;
    let soltarGps = null;
    let assPedidos = null;
    let pedidos = new Map();
    let aceito = null;
    let corrida = null;
    let assCorrida = null;
    let fila = Promise.resolve();
    const canalCorrida = R.canal;
    let presencaTimer = 0;
    let limpezaTimer = 0;
    let posTimer = 0;
    let ultimaPosEnviada = null;
    let trava = null;
    let som = null;
    let passo = 0;
    let fotos = [];
    let timers = [];
    let vistosNoMapa = '';

    const agendar = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const limparTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* ---------- mapa, GPS, tela ligada e som ---------- */
    function garantirMapa() {
      if (!mapa) mapa = Mapa.criar(q('#mapa-m'), { centro: pos || S.BH, zoom: 15 });
      return mapa;
    }
    function ligarGps() {
      if (soltarGps) return;
      soltarGps = S.gps.assinar((p) => {
        if (!p) return;
        pos = p;
        if (mapa) mapa.ponto('eu', p, Mapa.ICONE.motorista((eu() || {}).veiculo));
        if (atual === 'online') desenharPedidos();
        assinarRegioes();
        if (corrida && corrida.etapa === 'buscar') { enviarPosicao(); avisarSePerto(); }
        if (corrida && corrida.etapa === 'viagem') atualizarViagem();
      });
    }
    function desligarGps() { if (soltarGps) { soltarGps(); soltarGps = null; } }
    async function travarTela() {
      try { if ('wakeLock' in navigator && !trava) { trava = await navigator.wakeLock.request('screen'); trava.addEventListener('release', () => { trava = null; }); } } catch (e) { /* sem trava */ }
    }
    document.addEventListener('visibilitychange', () => { if (online && document.visibilityState === 'visible') travarTela(); });
    function tocar() {
      try {
        if (!som) som = new (window.AudioContext || window.webkitAudioContext)();
        const t = som.currentTime;
        [880, 1175].forEach((f, i) => {
          const o = som.createOscillator();
          const g = som.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t + i * 0.18);
          g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
          o.connect(g).connect(som.destination);
          o.start(t + i * 0.18);
          o.stop(t + i * 0.18 + 0.18);
        });
      } catch (e) { /* sem som */ }
      if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
    }
    function medirFolha(tela) {
      const f = $('.rt-folha', tela);
      if (mapa) mapa.folga(f ? () => f.getBoundingClientRect().height : 0);
    }

    /* ---------- telas ---------- */
    function ir(nome, { foco = true } = {}) {
      fecharFolha();
      const tela = telas.find((t) => t.dataset.rt === nome);
      if (!tela) return;
      const antes = atual;
      telas.forEach((t) => { t.hidden = t !== tela; t.classList.remove('entrando'); });
      if (!reduzirMovimento() && antes !== nome) { void tela.offsetWidth; tela.classList.add('entrando'); }
      atual = nome;
      if (!tela.classList.contains('rt-cheia')) { garantirMapa(); mapa.ajustar(); medirFolha(tela); }
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) { const t = $('.d-titulo, .en-t', tela); if (t) t.focus({ preventScroll: true }); }
    }
    const ENTRAR = {
      off() { desenharGanhos(); },
      online() {
        mapa.limpar();
        if (pos) { mapa.ponto('eu', pos, Mapa.ICONE.motorista(eu().veiculo)); mapa.centrar(pos, 15); }
        desenharGanhos();
        desenharPedidos();
      },
      buscar() { mostrarBuscar(); },
      codigo() {
        const campo = q('#rm-cod-in');
        campo.value = '';
        q('#rm-cod').classList.remove('erro', 'certo');
        q('#rm-cod-erro').hidden = true;
        desenharCodigo();
        mostrarEspera();
        const carro = (corrida && corrida.carro) || {};
        q('#rm-co-carro').innerHTML = carro.modelo
          ? `<span>Antes de pegar a chave, confere o carro: <b>${esc([carro.marca, carro.modelo, carro.cor].filter(Boolean).join(' '))}</b></span>${CARROS.placa.valida(carro.placa || '') ? CARROS.placa.html(carro.placa) : ''}`
          : '';
        q('#rm-co-t').textContent = `Pede o código ${corrida ? `pra ${primeiroNome(corrida.passageiro.nome)}` : ''}`.trim();
        setTimeout(() => campo.focus({ preventScroll: true }), 60);
      },
      vistoria() { desenharFotos(); },
      dobra() { passo = 0; mostrarPasso(); },
      viagem() { mostrarViagem(); },
      receber() { mostrarReceber(); },
    };

    /* ---------- ganhos ---------- */
    // os ganhos do dia saem das corridas feitas; o dia do Drink vira às 6h (a noite conta inteira)
    function contarDia(u) {
      const d = S.ganhosDoDia(u.corridasFeitas);
      const dia = S.diaDoDrink();
      if (u.dia !== dia || u.ganhos !== d.total || u.viagens !== d.n) { u.dia = dia; u.ganhos = d.total; u.viagens = d.n; return true; }
      return false;
    }
    function desenharGanhos() {
      const u = eu();
      if (contarDia(u)) op.salvar();
      const g = brl(u.ganhos || 0);
      const n = u.viagens || 0;
      ['#rm-hoje', '#rm-hoje-2', '#rm-hoje-3'].forEach((s) => { q(s).textContent = g; });
      ['#rm-viagens', '#rm-viagens-3'].forEach((s) => { q(s).textContent = `${n} ${n === 1 ? 'viagem' : 'viagens'}`; });
      q('#rm-veic-txt').textContent = u.veiculo === 'patinete' ? 'Patinete elétrico dobrável' : 'Bike elétrica dobrável';
      q('#rm-status-ic').setAttribute('href', u.veiculo === 'patinete' ? '#i-patinete' : '#i-bike');
      q('#rm-nota').textContent = notaTxt(u);
    }
    function nota(u) {
      const lista = (u.avaliacoes || []).filter((n) => n > 0);
      return lista.length ? redondo(lista.reduce((s, n) => s + n, 0) / lista.length, 1) : 0;
    }
    const notaTxt = (u) => (nota(u) ? `nota ${S.virgula(nota(u))}` : 'novo no Drink');

    /* ---------- ficar online ---------- */
    async function ficarOnline() {
      const u = eu();
      q('#rm-alerta').hidden = true;
      if (!u.pix || !u.pix.chave) { op.editarPix('Antes de ficar online, cadastra a chave Pix onde você recebe.'); return; }
      op.pedirNotificacao();
      if (!R.cifraPronta) { alerta('Esse navegador não tem a proteção que o Drink usa. Usa o Chrome ou o Safari atualizados.'); return; }
      try { if (!som) som = new (window.AudioContext || window.webkitAudioContext)(); if (som.state === 'suspended') som.resume(); } catch (e) { /* sem som */ }
      ligarGps();
      try { pos = await S.gps.agora(20000); } catch (e) {
        alerta(e && e.code === 1 ? 'Sem a sua localização não dá pra receber pedidos. Libera a localização nas configurações do navegador.' : 'Não deu pra achar você no mapa. Tenta de novo num lugar aberto.');
        return;
      }
      travarTela();
      online = true;
      avisosDePedidos();
      if (avisos().estado() === 'instalar') op.avisar('Dica: instala o Drink na tela de início para receber os pedidos com o app fechado.');
      if (!u.idMotorista) { u.idMotorista = R.idAleatorio(9); op.salvar(); }
      ouvirPedidos();
      presenca();
      clearInterval(presencaTimer);
      presencaTimer = setInterval(presenca, 300000);
      clearInterval(limpezaTimer);
      limpezaTimer = setInterval(desenharPedidos, 15000);
      ir('online');
    }
    function alerta(txt) {
      const a = q('#rm-alerta');
      a.textContent = txt;
      a.hidden = false;
    }
    function ouvirPedidos() {
      if (assPedidos) return;
      pedidos = new Map();
      assPedidos = R.canal.assinar([R.topico.pedidos(), R.topico.fechados()], (msg) => receberPedido(msg), { desde: '4m' });
    }
    function pararPedidos() {
      if (assPedidos) { assPedidos.fechar(); assPedidos = null; }
    }
    function presenca(tipo = 'online') {
      const u = eu();
      if (!u || !u.idMotorista) return;
      if (tipo === 'online' && (!pos || corrida || aceito)) return;
      R.canal.publicar(R.topico.online(), { v: 1, tipo, d: u.idMotorista, p: pos ? S.aproximar(pos) : null, veic: u.veiculo || 'bike', t: Date.now() }).catch(() => {});
    }
    function ficarOffline() {
      const estava = online;
      online = false;
      pararPedidos();
      clearInterval(presencaTimer);
      clearInterval(limpezaTimer);
      if (estava) presenca('offline');
      if (!corrida) { regioesAssinadas = ''; avisos().definir('motorista', []); }
      if (trava) { trava.release().catch(() => {}); trava = null; }
      pedidos.clear();
      if (!corrida) desligarGps();
      ir('off');
    }

    /* ---------- pedidos chegando ---------- */
    // o passageiro fecha o pedido mostrando o segredo que só ele tem
    async function fecharPedido(msg) {
      const p = pedidos.get(msg.id) || (aceito && aceito.id === msg.id ? aceito.pedido : null);
      if (!p || !p.fecho || typeof msg.segredo !== 'string' || msg.segredo.length > 64) return;
      if (await R.resumo(msg.segredo) !== p.fecho) return;
      pedidos.delete(msg.id);
      if (aceito && aceito.id === msg.id && atual === 'aguardando') {
          // o passageiro confirmou com alguém; se não fomos nós, o aviso "recusado" chega pela corrida
        agendar(() => { if (aceito && aceito.id === msg.id && !corrida) { desistir(); op.avisar('Outro Drink pegou essa corrida.'); } }, 8000);
      }
      if (atual === 'online') desenharPedidos();
    }
    /* ---------- até onde o motorista recebe pedidos ---------- */
    // de bike ou patinete, pedido do outro lado da cidade não serve: fora do raio, nada de som nem de aviso
    const RAIOS = [3, 5, 8];
    const raio = () => (RAIOS.includes(eu().raio) ? eu().raio : 5);
    const dentro = (p) => !pos || S.distancia(pos, p.de) <= raio() * 1000;
    function mudarRaio(km) {
      if (!RAIOS.includes(km)) return;
      eu().raio = km;
      op.salvar();
      desenharPedidos();
      assinarRegioes();
    }
    // avisos com o app fechado: só os pedidos das regiões em volta (até 8 km, duas voltas de regiões)
    let regioesAssinadas = '';
    function assinarRegioes() {
      if (!online || corrida || aceito || !pos) return;
      const lista = R.topico.regioes(pos, raio() > 5 ? 2 : 1);
      const chave = lista.join();
      if (chave === regioesAssinadas) return;
      regioesAssinadas = chave;
      avisos().definir('motorista', lista);
    }
    // de volta aos pedidos (fim da corrida, desistiu) ou offline
    function avisosDePedidos() {
      regioesAssinadas = '';
      if (online) assinarRegioes();
      else avisos().definir('motorista', []);
    }

    function receberPedido(recebido) {
      if (!recebido || recebido.v !== 1) return;
      if (recebido.tipo === 'fechado') { if (typeof recebido.id === 'string') fecharPedido(recebido); return; }
      const msg = recebido.tipo === 'pedido' ? limparPedido(recebido) : null;
      if (!msg || Date.now() > msg.expira || pedidos.has(msg.id)) return;
      const u = eu();
      if (msg.veic !== 'qualquer' && msg.veic !== (u.veiculo || 'bike')) return;
      pedidos.set(msg.id, { ...msg, chegou: Date.now() });
      if (!corrida && !aceito && dentro(msg)) {
        tocar();
        op.notificar('Pedido novo no Drink', `${msg.de.bairro} → ${msg.para.bairro} · ${brl(msg.valor)}`, 'drink-pedido');
      }
      if (atual === 'online') desenharPedidos();
    }
    function desenharPedidos() {
      const agora = Date.now();
      [...pedidos.keys()].forEach((id) => { if (agora > pedidos.get(id).expira) pedidos.delete(id); });
      const todos = [...pedidos.values()];
      // do mais perto para o mais longe (sem GPS ainda, do mais novo para o mais antigo)
      const lista = todos.filter(dentro).sort((a, b) => (pos ? S.distancia(pos, a.de) - S.distancia(pos, b.de) : b.t - a.t));
      const km = raio();
      $$('#rm-raio [data-raio]', raiz).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.raio) === km)));
      const longe = todos.length - lista.length;
      q('#rm-longe').hidden = !longe;
      if (longe) {
        const maior = RAIOS.find((r) => r > km);
        q('#rm-longe').innerHTML = `${longe === 1 ? 'Mais 1 pedido' : `Mais ${longe} pedidos`} além de ${km} km.${maior ? ` <button type="button" class="en-link" data-raio="${maior}">Ver até ${maior} km</button>` : ''}`;
      }
      q('#rm-vazio').hidden = lista.length > 0;
      q('#rm-on-chip').textContent = lista.length ? `Online · ${lista.length} ${lista.length === 1 ? 'pedido' : 'pedidos'}` : 'Online · procurando pedidos';
      q('#rm-pedidos').innerHTML = lista.map((p) => {
        const perto = pos ? S.textoKm((S.distancia(pos, p.de) * 1.3) / 1000) : '';
        const seg = Math.max(0, Math.round((p.expira - agora) / 1000));
        return `<li class="rm-pedido">
          <div class="rm-ped-topo"><b>${esc(p.de.bairro)} → ${esc(p.para.bairro)}</b><em>${esc(brl(p.valor))}</em></div>
          <p>${perto ? `${perto} de você · ` : ''}viagem de ${esc(S.textoKm(p.km))} · câmbio ${esc(p.cambio || 'automático')} · ${p.nota ? `passageiro nota ${esc(S.virgula(p.nota))}` : 'passageiro novo no Drink'}</p>
          <p class="rm-ped-prazo">${seg > 60 ? `aberto por mais ${Math.ceil(seg / 60)} min` : 'fechando'}</p>
          <button type="button" class="t-botao" data-aceitar="${esc(p.id)}">Aceitar</button>
        </li>`;
      }).join('');
      if (mapa && atual === 'online') {
        mapa.pedidos(lista.map((p) => ({ lat: p.de.lat, lon: p.de.lon, id: p.id })));
        // pedido novo: o mapa abre para mostrar de onde ele veio
        const ids = lista.map((p) => p.id).join();
        if (ids && ids !== vistosNoMapa && pos) mapa.enquadrar([pos, ...lista.map((p) => p.de)], { maxZoom: 15 });
        vistosNoMapa = ids;
      }
    }

    /* ---------- aceitar ---------- */
    async function aceitar(id) {
      const p = pedidos.get(id);
      if (!p || aceito || corrida) return;
      if (Date.now() > p.expira) { pedidos.delete(id); desenharPedidos(); op.avisar('Esse pedido já fechou.'); return; }
      const u = eu();
      const par = await R.novoPar();
      const chave = await R.chaveComum(par.privada, p.pub);
      aceito = { id, pedido: p, priv: par.priv, pub: par.pub, chave, t: Date.now() };
      assinarCorrida(id, String(Math.floor(Date.now() / 1000) - 5));
      ir('aguardando');
      q('#rm-ag-sub').textContent = `Você aceitou ${p.de.bairro} → ${p.para.bairro}. Assim que o passageiro confirmar, aparece o endereço.`;
      await enviar({
        tipo: 'aceite',
        motorista: { nome: nomeCurto(u), nota: nota(u), corridas: u.totalCorridas || 0, veiculo: u.veiculo || 'bike', foto: Boolean(u.selfieEnvio) },
        pos: pos ? { lat: pos.lat, lon: pos.lon } : null,
      });
      avisos().mandar(R.topico.aviso(id, 'p'), 'aceite');
      regioesAssinadas = '';
      avisos().definir('motorista', [R.topico.aviso(id, 'm')]);
      agendar(() => {
        if (aceito && aceito.id === id && !corrida) { desistir(); op.avisar('O passageiro não confirmou. Voltando pros pedidos.'); }
      }, 60000);
    }
    function desistir() {
      if (assCorrida) { assCorrida.fechar(); assCorrida = null; }
      if (aceito) pedidos.delete(aceito.id);
      aceito = null;
      avisosDePedidos();
      limparTimers();
      if (online) ir('online'); else ir('off');
    }

    /* ---------- a corrida ---------- */
    const avisos = () => window.Drink.avisos;
    // aviso curto no celular do passageiro (só em corrida de verdade)
    function avisarPassageiro(tipo) {
      if (corrida) avisos().mandar(R.topico.aviso(corrida.id, 'p'), tipo);
    }
    function assinarCorrida(id, desde) {
      if (assCorrida) assCorrida.fechar();
      assCorrida = canalCorrida.assinar([R.topico.corrida(id)], (env, meta) => {
        fila = fila.then(() => receber(env, meta)).catch(() => {});
      }, { desde });
    }
    // tudo é lido antes de cifrar: a corrida pode acabar logo depois (cancelar, receber)
    async function enviar(obj) {
      const base = corrida || aceito;
      if (!base) return;
      const topico = R.topico.corrida(base.id);
      const env = { v: 1, de: 'm', k: base.pub, ...(await R.cifrar(base.chave, obj)) };
      // pela fila: com o sinal fraco, a mensagem espera e sai assim que der, na ordem (posição nova troca a velha)
      R.fila.mandar(topico, env, obj.tipo === 'pos' ? { troca: `pos-${base.id}`, validade: 2 * 60000 } : undefined);
    }
    function salvarCorrida() {
      const u = eu();
      if (corrida) u.corridaMotorista = corrida;
      else delete u.corridaMotorista;
      op.salvar();
    }
    async function receber(env, meta) {
      const base = corrida || aceito;
      if (!base || !env || env.v !== 1 || env.de !== 'p' || !env.iv) return;
      if (env.para && env.para !== base.pub.slice(0, 16)) return;
      let msg;
      try { msg = await R.decifrar(base.chave, env); } catch (e) { return; }
      if (corrida && meta && meta.id) corrida.ultimo = meta.id;
      tratar(msg);
      if (corrida) salvarCorrida();
    }
    function tratar(msg) {
      switch (msg.tipo) {
        case 'confirmado': {
          if (!aceito || corrida || !ponto(msg.embarque) || !ponto(msg.destino)) return;
          const p = aceito.pedido;
          corrida = {
            id: aceito.id, pub: aceito.pub, priv: aceito.priv, chave: aceito.chave, t0: Date.now(),
            etapa: 'buscar', passageiro: { nome: String((msg.passageiro && msg.passageiro.nome) || 'Passageiro').slice(0, 40), nota: p.nota || 0 },
            embarque: { lat: msg.embarque.lat, lon: msg.embarque.lon, nome: texto(msg.embarque.nome, 80) || 'Embarque', bairro: texto(msg.embarque.bairro) },
            destino: { lat: msg.destino.lat, lon: msg.destino.lon, nome: texto(msg.destino.nome, 80) || 'Destino', bairro: texto(msg.destino.bairro) },
            carro: msg.carro && typeof msg.carro === 'object' ? {
              marca: texto(msg.carro.marca, 20), modelo: texto(msg.carro.modelo, 40), cor: texto(msg.carro.cor, 20),
              placa: CARROS.placa.limpar(texto(msg.carro.placa, 8)), cambio: texto(msg.carro.cambio, 12),
            } : {},
            valor: numero(msg.valor) && msg.valor > 0 ? msg.valor : p.valor, km: numero(msg.km) && msg.km > 0 ? msg.km : p.km,
            msgs: [], fotos: 0, avaliacao: null, paguei: false, ultimo: null,
          };
          aceito = null;
          limparTimers();
          pararPedidos();
          salvarCorrida();
          tocar();
          op.notificar('Corrida confirmada', `Vá até ${corrida.embarque.nome}.`);
          mandarFoto();
          ir('buscar');
          avisarSePerto();
          enviarPosicao(true);
          clearInterval(posTimer);
          posTimer = setInterval(() => enviarPosicao(true), 45000);
          break;
        }
        case 'recusado':
          if (aceito && !corrida) { desistir(); op.avisar('Outro Drink pegou essa corrida.'); }
          break;
        case 'codigo-ok': {
          if (!corrida || corrida.etapa !== 'codigo') return;
          const caixa = q('#rm-cod');
          if (msg.ok) {
            caixa.classList.add('certo');
            corrida.codigoEm = Date.now();
            corrida.espera = corrida.esperaConta ? taxaEspera(corrida.codigoEm - corrida.chegouEm) : 0;
            corrida.etapa = 'vistoria';
            agendar(() => ir('vistoria'), reduzirMovimento() ? 50 : 600);
          } else {
            caixa.classList.remove('erro');
            void caixa.offsetWidth;
            caixa.classList.add('erro');
            q('#rm-cod-erro').hidden = false;
            q('#rm-cod-erro').textContent = 'O celular do passageiro disse que esse não é o código. Confere de novo.';
            q('#rm-cod-bt').disabled = false;
          }
          break;
        }
        case 'avaliacao':
          if (!corrida) return;
          corrida.avaliacao = { nota: Number(msg.nota) || 0, tags: Array.isArray(msg.tags) ? msg.tags.slice(0, 4) : [], gorjeta: Math.max(0, Number(msg.gorjeta) || 0) };
          if (atual === 'receber') mostrarReceber();
          break;
        case 'paguei':
          if (!corrida) return;
          corrida.paguei = true;
          tocar();
          op.notificar(`${primeiroNome(corrida.passageiro.nome)} pagou`, 'Confere no app do seu banco se o Pix caiu.');
          if (atual === 'receber') mostrarReceber();
          break;
        case 'msg':
          adicionarMsg('ela', String(msg.txt || '').slice(0, 300));
          break;
        case 'cancelado':
          if (!corrida || ['viagem', 'receber'].includes(corrida.etapa)) return;
          op.notificar('Corrida cancelada', 'O passageiro cancelou.');
          op.avisar('O passageiro cancelou a corrida.');
          encerrar();
          if (online) { ouvirPedidos(); ir('online'); } else ir('off');
          break;
        default:
      }
    }
    // o rosto do motorista vai para o passageiro confirmado, cifrado, em pedaços (cada mensagem do ntfy tem limite)
    async function mandarFoto() {
      const foto = eu().selfieEnvio;
      const c = corrida;
      if (!foto || !c || !/^data:image\/jpeg;base64,/.test(foto)) return;
      const dados = foto.slice(foto.indexOf(',') + 1);
      const PEDACO = 2400;
      const n = Math.ceil(dados.length / PEDACO);
      if (n > 12) return;
      for (let i = 0; i < n && corrida === c; i += 1) {
        await enviar({ tipo: 'foto', i, n, parte: dados.slice(i * PEDACO, (i + 1) * PEDACO) });
      }
    }
    function enviarPosicao(forcar) {
      if (!corrida || corrida.etapa !== 'buscar' || !pos) return;
      if (!forcar && ultimaPosEnviada && (S.distancia(pos, ultimaPosEnviada) < 80 || Date.now() - ultimaPosEnviada.t < 20000)) return;
      ultimaPosEnviada = { lat: pos.lat, lon: pos.lon, t: Date.now() };
      enviar({ tipo: 'pos', lat: redondo(pos.lat, 6), lon: redondo(pos.lon, 6) });
      if (atual === 'buscar' && mapa) mapa.ponto('eu', pos, Mapa.ICONE.motorista(eu().veiculo));
    }
    // perto do embarque (uns 2 min de bike): o passageiro recebe "está chegando", uma vez só
    function avisarSePerto() {
      const c = corrida;
      if (!c || c.etapa !== 'buscar' || c.avisouPerto || !pos || !c.embarque) return;
      if (S.distancia(pos, c.embarque) > 450) return;
      c.avisouPerto = true;
      enviar({ tipo: 'perto' });
      avisarPassageiro('perto');
      salvarCorrida();
    }
    function encerrar() {
      const tinha = Boolean(corrida);
      clearInterval(posTimer);
      limparTimers();
      if (assCorrida) { assCorrida.fechar(); assCorrida = null; }
      corrida = null;
      aceito = null;
      fotos = [];
      salvarCorrida();
      if (tinha) avisosDePedidos();
    }

    /* ---------- buscar o passageiro ---------- */
    function links(p, modo) {
      const ll = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
      return {
        g: `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=${modo}`,
        w: `https://waze.com/ul?ll=${ll}&navigate=yes`,
      };
    }
    async function mostrarBuscar() {
      const c = corrida;
      if (!c) return;
      const nome = primeiroNome(c.passageiro.nome);
      q('#rm-bu-t').textContent = `Vá buscar ${nome}`;
      q('#rm-bu-end').textContent = [c.embarque.nome, c.embarque.bairro].filter(Boolean).join(' · ');
      q('#rm-pa-av').textContent = iniciais(c.passageiro.nome);
      q('#rm-pa-nome').textContent = c.passageiro.nota ? `${c.passageiro.nome} · nota ${S.virgula(c.passageiro.nota)}` : c.passageiro.nome;
      const carro = c.carro || {};
      q('#rm-pa-carro').textContent = [[carro.modelo, carro.cor].filter(Boolean).join(' '), carro.cambio ? `câmbio ${carro.cambio}` : ''].filter(Boolean).join(' · ') || 'Carro do passageiro';
      q('#rm-pa-placa').innerHTML = CARROS.placa.valida(carro.placa || '') ? CARROS.placa.html(carro.placa) : '';
      q('#rm-chat-t').textContent = c.passageiro.nome;
      q('#rm-chat-av').textContent = iniciais(c.passageiro.nome);
      const l = links(c.embarque, 'bicycling');
      q('#rm-nav-g').href = l.g;
      q('#rm-nav-w').href = l.w;
      q('#rm-nova-msg').hidden = !c.novaMsg;
      mapa.limpar();
      mapa.ponto('embarque', c.embarque, Mapa.ICONE.embarque());
      if (pos) mapa.ponto('eu', pos, Mapa.ICONE.motorista(eu().veiculo));
      mapa.enquadrar([pos, c.embarque].filter(Boolean), { maxZoom: 17 });
      if (pos) {
        const r = await S.rota(pos, c.embarque);
        if (corrida !== c || atual !== 'buscar') return;
        mapa.rota(r.linha);
        q('#rm-bu-chip').textContent = `Até o embarque: ${S.textoKm(r.km)}`;
      }
    }

    /* ---------- espera: 10 min grátis depois que o motorista chega ---------- */
    let esperaTimer = 0;
    function mostrarEspera() {
      clearInterval(esperaTimer);
      const c = corrida;
      if (!c || !c.chegouEm) { q('#rm-espera').textContent = ''; return; }
      if (!c.esperaConta) { q('#rm-espera').textContent = 'Sem o GPS no embarque, a espera não é cobrada.'; return; }
      const passo = () => {
        if (!corrida || corrida !== c || atual !== 'codigo') { clearInterval(esperaTimer); return; }
        const min = Math.floor((Date.now() - c.chegouEm) / 60000);
        const taxa = taxaEspera(Date.now() - c.chegouEm);
        q('#rm-espera').textContent = taxa
          ? `Esperando há ${min} min · espera de ${brl(taxa)} somada à corrida`
          : `Esperando há ${min} min · espera grátis até ${PRECO.esperaGratis} min`;
      };
      passo();
      esperaTimer = setInterval(passo, 15000);
    }

    /* ---------- código ---------- */
    function desenharCodigo() {
      const v = q('#rm-cod-in').value;
      $$('#rm-cod .en-cod-caixa', raiz).forEach((c, i) => {
        c.textContent = v[i] || '';
        c.classList.toggle('cheia', Boolean(v[i]));
        c.classList.toggle('atual', i === Math.min(v.length, 3));
      });
      q('#rm-cod-bt').disabled = v.length < 4;
    }
    function conferirCodigo() {
      const v = q('#rm-cod-in').value;
      if (v.length < 4 || !corrida) return;
      q('#rm-cod-bt').disabled = true;
      q('#rm-cod-erro').hidden = true;
      enviar({ tipo: 'codigo', valor: v });
      agendar(() => {
        if (corrida && corrida.etapa === 'codigo' && !q('#rm-cod').classList.contains('certo')) {
          q('#rm-cod-erro').hidden = false;
          q('#rm-cod-erro').textContent = 'O celular do passageiro não respondeu. Confere se ele está com internet e tenta de novo.';
          q('#rm-cod-bt').disabled = false;
        }
      }, 20000);
    }

    /* ---------- vistoria com a câmera ---------- */
    const NOMES_FOTOS = ['Frente', 'Traseira', 'Lado esquerdo', 'Lado direito', 'Painel'];
    // a foto sai com o carimbo da data, da hora e do lado do carro, como nas vistorias de locadora
    function carimbar(g, largura, altura, rotulo) {
      const agora = new Date();
      const txt = `${agora.toLocaleDateString('pt-BR')} ${hhmm(agora)} · ${rotulo} · Drink`;
      const fonte = Math.max(11, Math.round(Math.min(largura, altura) / 24));
      g.font = `700 ${fonte}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const folga = Math.round(fonte * 0.55);
      const w = Math.min(largura - folga * 2, g.measureText(txt).width + folga * 2);
      const h = Math.round(fonte * 1.7);
      const x = largura - w - folga;
      const y = altura - h - folga;
      g.fillStyle = 'rgba(0, 0, 0, .62)';
      g.fillRect(x, y, w, h);
      g.fillStyle = '#FFF3E2';
      g.textBaseline = 'middle';
      g.fillText(txt, x + folga, y + h / 2, w - folga * 2);
    }
    function reduzirFoto(arquivo, rotulo) {
      return new Promise((ok) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        img.onload = () => {
          const escala = Math.min(1, 480 / Math.max(img.width, img.height));
          const tela = document.createElement('canvas');
          tela.width = Math.round(img.width * escala);
          tela.height = Math.round(img.height * escala);
          const g = tela.getContext('2d');
          g.drawImage(img, 0, 0, tela.width, tela.height);
          carimbar(g, tela.width, tela.height, rotulo);
          URL.revokeObjectURL(url);
          ok(tela.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => { URL.revokeObjectURL(url); ok(null); };
        img.src = url;
      });
    }
    function guardarFotos() {
      if (!corrida) return;
      try {
        const chave = `drink-vistoria-${corrida.id}`;
        localStorage.setItem(chave, JSON.stringify({ t: Date.now(), fotos }));
        const antigas = Object.keys(localStorage).filter((k) => k.startsWith('drink-vistoria-') && k !== chave)
          .map((k) => ({ k, t: (JSON.parse(localStorage.getItem(k)) || {}).t || 0 })).sort((a, b) => b.t - a.t);
        antigas.slice(2).forEach(({ k }) => localStorage.removeItem(k));
      } catch (e) { /* sem espaço: as fotos ficam só na tela */ }
    }
    function desenharFotos() {
      const n = fotos.filter(Boolean).length;
      $$('#rm-fotos li', raiz).forEach((li, i) => {
        li.classList.toggle('ok', Boolean(fotos[i]));
        li.style.setProperty('--foto', fotos[i] ? `url("${fotos[i]}")` : 'none');
      });
      q('#rm-vi-barra').style.width = `${n * 20}%`;
      const bt = q('#rm-vi-bt');
      bt.disabled = n < 5;
      bt.textContent = n < 5 ? `${n} de 5 fotos` : `Guardar ${eu().veiculo === 'patinete' ? 'o patinete' : 'a bike'}`;
      q('#rm-vi-sub').textContent = n < 5 ? 'Tira as 5 fotos antes de dirigir. O passageiro acompanha no celular dele.' : 'Vistoria feita. As fotos ficam guardadas e mostram como o carro estava antes de sair.';
    }
    async function fotoTirada(input) {
      const i = Number(input.dataset.foto);
      const arquivo = input.files && input.files[0];
      input.value = '';
      if (!arquivo || !corrida) return;
      const reduzida = await reduzirFoto(arquivo, NOMES_FOTOS[i]);
      if (!reduzida) { op.avisar('Não deu pra ler essa foto. Tira de novo.'); return; }
      fotos[i] = reduzida;
      corrida.fotos = fotos.filter(Boolean).length;
      desenharFotos();
      guardarFotos();
      enviar({ tipo: 'etapa', etapa: 'vistoria', fotos: corrida.fotos });
      if (i === 4) op.avisar('Painel registrado. Confere se dá para ler o km e o combustível na foto.');
    }

    /* ---------- dobra guiada ---------- */
    function mostrarPasso() {
      q('#rm-passo').textContent = `Passo ${passo + 1} de ${GUIA.length}`;
      q('#rm-guia-txt').textContent = GUIA[passo];
      $$('#rm-pontos span', raiz).forEach((s, i) => s.classList.toggle('on', i === passo));
      const grupos = $$('#rm-guia-desenho .ma-g', raiz);
      grupos.forEach((g) => g.classList.remove('on'));
      void q('#rm-guia-desenho').getBoundingClientRect();
      grupos[passo].classList.add('on');
      q('#rm-guia-bt').textContent = passo < GUIA.length - 1 ? 'Próximo passo' : 'Começar a viagem';
    }
    function proximoPasso() {
      if (passo < GUIA.length - 1) { passo += 1; mostrarPasso(); return; }
      corrida.etapa = 'viagem';
      enviar({ tipo: 'etapa', etapa: 'malas' });
      enviar({ tipo: 'etapa', etapa: 'viagem' });
      clearInterval(posTimer);
      salvarCorrida();
      ir('viagem');
    }

    /* ---------- viagem ---------- */
    async function mostrarViagem() {
      const c = corrida;
      if (!c) return;
      q('#rm-vg-t').textContent = `Levando ${primeiroNome(c.passageiro.nome)}`;
      q('#rm-vg-dest').textContent = [c.destino.nome, c.destino.bairro].filter(Boolean).join(' · ');
      const l = links(c.destino, 'driving');
      q('#rm-nav-g2').href = l.g;
      q('#rm-nav-w2').href = l.w;
      mapa.limpar();
      mapa.ponto('destino', c.destino, Mapa.ICONE.destino());
      if (!c.linha) {
        const r = await S.rota(c.embarque, c.destino);
        if (corrida !== c) return;
        c.linha = r.linha;
      }
      mapa.rota(c.linha);
      mapa.enquadrar([pos || c.embarque, c.destino]);
      atualizarViagem();
    }
    function atualizarViagem() {
      const c = corrida;
      if (!c || atual !== 'viagem') return;
      const aqui = pos || c.embarque;
      mapa.tirar('eu');
      mapa.ponto('carro', aqui, Mapa.ICONE.carro());
      const falta = S.faltaNaLinha(c.linha, aqui);
      q('#rm-vg-faltam').textContent = falta !== null ? S.textoKm(falta) : '--';
    }
    function cheguei() {
      const c = corrida;
      if (!c) return;
      if (pos && S.distancia(pos, c.destino) > 1500 && !c.confirmouLonge) {
        c.confirmouLonge = true;
        op.avisar('O GPS diz que o destino ainda está longe. Toca de novo se chegou mesmo.');
        return;
      }
      const u = eu();
      c.etapa = 'receber';
      enviar({ tipo: 'etapa', etapa: 'chegada', valor: c.valor, espera: c.espera || 0 });
      avisarPassageiro('chegada');
      enviar({ tipo: 'cobranca', pix: { chave: u.pix.chave, nome: [u.nome, u.sobrenome].filter(Boolean).join(' '), cidade: 'BELO HORIZONTE' } });
      salvarCorrida();
      ir('receber');
    }

    /* ---------- receber pelo Pix ---------- */
    function mostrarReceber() {
      const c = corrida;
      if (!c) return;
      const nome = primeiroNome(c.passageiro.nome);
      const gorjeta = c.avaliacao ? c.avaliacao.gorjeta : 0;
      const espera = c.espera || 0;
      const total = redondo(c.valor + espera + gorjeta);
      q('#rm-re-t').textContent = `Receber ${brl(total)}`;
      q('#rm-re-sub').textContent = `${nome} paga pelo Pix direto na sua chave ${window.Drink.pix.mascarar(eu().pix.chave)}.`;
      q('#rm-recibo').innerHTML = `<p><span>Corrida · ${esc(S.virgula(c.km))} km</span><b>${esc(brl(c.valor))}</b></p>${espera ? `<p><span>Espera</span><b>${esc(brl(espera))}</b></p>` : ''}${gorjeta ? `<p><span>Gorjeta</span><b>${esc(brl(gorjeta))}</b></p>` : ''}<p class="t-total"><span>Total</span><b>${esc(brl(total))}</b></p>`;
      const checks = $$('#rm-re-checks li', raiz);
      checks[0].classList.toggle('ok', Boolean(c.avaliacao));
      q('#rm-re-aval').textContent = c.avaliacao
        ? (c.avaliacao.nota ? `${nome} deu ${c.avaliacao.nota} ${c.avaliacao.nota === 1 ? 'estrela' : 'estrelas'}${gorjeta ? ` e ${brl(gorjeta)} de gorjeta` : ''}` : `${nome} não deu nota${gorjeta ? `, mas deu ${brl(gorjeta)} de gorjeta` : ''}`)
        : `Esperando ${nome} avaliar`;
      checks[1].classList.toggle('ok', c.paguei);
      q('#rm-re-pago').textContent = c.paguei ? `${nome} disse que pagou. Confere no seu banco.` : 'Esperando o pagamento';
      desenharNotaPassageiro();
    }
    // o motorista também avalia o passageiro; a nota vai junto com o "recebi"
    function desenharNotaPassageiro() {
      const c = corrida;
      if (!c) return;
      q('#rm-aval-t').textContent = `Como foi com ${primeiroNome(c.passageiro.nome)}?`;
      $$('#rm-estrelas [data-nota-p]', raiz).forEach((b) => {
        const n = Number(b.dataset.notaP);
        b.classList.toggle('on', n <= (c.notaPassageiro || 0));
        b.setAttribute('aria-checked', String(n === c.notaPassageiro));
      });
    }
    function recebi() {
      const c = corrida;
      if (!c) return;
      const u = eu();
      const gorjeta = c.avaliacao ? c.avaliacao.gorjeta : 0;
      const total = redondo(c.valor + (c.espera || 0) + gorjeta);
      enviar({ tipo: 'recebido', nota: c.notaPassageiro || 0 });
      u.totalCorridas = (u.totalCorridas || 0) + 1;
      if (c.avaliacao && c.avaliacao.nota) u.avaliacoes = [...(u.avaliacoes || []), c.avaliacao.nota].slice(-100);
      u.corridasFeitas = [{
        id: c.id, data: new Date().toISOString(), rota: `${c.embarque.bairro || c.embarque.nome} → ${c.destino.bairro || c.destino.nome}`,
        total, km: c.km, valor: c.valor, espera: c.espera || 0, gorjeta, nota: c.avaliacao ? c.avaliacao.nota || 0 : 0,
      }, ...(u.corridasFeitas || [])].slice(0, 100);
      contarDia(u);
      encerrar();
      op.salvar();
      q('#rm-fim-t').textContent = `+ ${brl(total)}`;
      q('#rm-fim-sub').textContent = 'Corrida concluída. O Pix foi direto pra sua conta.';
      desenharGanhos();
      ir('fim');
    }

    /* ---------- chat ---------- */
    function adicionarMsg(de, txt) {
      if (!corrida || !txt) return;
      corrida.msgs.push({ de, txt, t: Date.now() });
      if (de === 'ela' && folha !== 'rm-chat') {
        corrida.novaMsg = true;
        q('#rm-nova-msg').hidden = false;
        op.notificar(primeiroNome(corrida.passageiro.nome), txt);
        op.avisar(`${primeiroNome(corrida.passageiro.nome)}: “${txt}”`);
      }
      const lista = q('#rm-msgs');
      lista.innerHTML = corrida.msgs.map((m) => `<p class="d-msg${m.de === 'eu' ? ' eu' : ''}">${esc(m.txt)}</p>`).join('');
      lista.scrollTop = lista.scrollHeight;
    }
    function mandarMsg(txt) {
      const t = String(txt || '').trim().slice(0, 300);
      if (!t || !corrida) return;
      enviar({ tipo: 'msg', txt: t });
      avisarPassageiro('msg');
      adicionarMsg('eu', t);
    }

    /* ---------- seus ganhos: os últimos 7 dias em barras e as corridas de cada dia ---------- */
    const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    let diaEscolhido = null;
    function desenharSemana() {
      const u = eu();
      const agora = Date.now();
      const dias = [];
      for (let i = 6; i >= 0; i -= 1) {
        const t = agora - i * 86400000;
        const quando = new Date(t - 6 * 3600000);
        dias.push({ chave: S.diaDoDrink(t), rotulo: i === 0 ? 'hoje' : DIAS[quando.getDay()], quando, total: 0, n: 0, lista: [] });
      }
      (u.corridasFeitas || []).forEach((c) => {
        const d = dias.find((x) => x.chave === S.diaDoDrink(new Date(c.data).getTime()));
        if (d) { d.total = redondo(d.total + (Number(c.total) || 0)); d.n += 1; d.lista.push(c); }
      });
      if (diaEscolhido && !dias.some((d) => d.chave === diaEscolhido)) diaEscolhido = null;
      const total = redondo(dias.reduce((soma, d) => soma + d.total, 0));
      const n = dias.reduce((soma, d) => soma + d.n, 0);
      q('#rm-semana-valor').textContent = brl(total);
      q('#rm-semana-txt').textContent = `${n} ${n === 1 ? 'corrida' : 'corridas'} nos últimos 7 dias`;
      const maior = Math.max(...dias.map((d) => d.total), 1);
      const nomeDia = (d) => (d.rotulo === 'hoje' ? 'Hoje' : `${d.rotulo}, ${d.quando.getDate()}/${d.quando.getMonth() + 1}`);
      q('#rm-barras').classList.toggle('escolheu', Boolean(diaEscolhido));
      q('#rm-barras').innerHTML = dias.map((d) => {
        // a barra mais alta tem 5 em; dia sem corrida fica só com um risco
        const alto = d.total ? Math.max(0.5, Math.round((d.total / maior) * 50) / 10) : 0.2;
        const on = d.chave === diaEscolhido;
        return `<button type="button" class="rm-barra${on ? ' on' : ''}${d.rotulo === 'hoje' ? ' hoje' : ''}" data-dia="${d.chave}" aria-pressed="${on}" aria-label="${esc(`${nomeDia(d)}: ${brl(d.total)}, ${d.n} ${d.n === 1 ? 'corrida' : 'corridas'}`)}">`
          + `<small>${d.total ? esc(brl0(d.total)) : ''}</small><i style="height:${alto}em"></i><span>${esc(d.rotulo)}</span></button>`;
      }).join('');
      const mostrar = dias.filter((d) => d.n && (!diaEscolhido || d.chave === diaEscolhido)).reverse();
      q('#rm-feitas-t').textContent = diaEscolhido ? `Corridas de ${nomeDia(dias.find((d) => d.chave === diaEscolhido)).replace(/^Hoje$/, 'hoje')}` : 'Corridas';
      q('#rm-feitas-todas').hidden = !diaEscolhido;
      q('#rm-feitas').innerHTML = mostrar.length
        ? mostrar.map((d) => `${diaEscolhido ? '' : `<li class="rm-feitas-dia"><span>${esc(nomeDia(d))}</span><b>${esc(brl(d.total))}</b></li>`}${d.lista.map((c) => {
          const det = [hhmm(new Date(c.data)), c.km ? `${S.virgula(Number(c.km))} km` : '', c.espera ? `espera ${brl(c.espera)}` : '', c.gorjeta ? `gorjeta ${brl(c.gorjeta)}` : ''].filter(Boolean).join(' · ');
          return `<li class="rm-feita"><div><b>${esc(c.rota || 'Corrida')}</b><small>${esc(det)}</small></div><strong>${esc(brl(Number(c.total) || 0))}</strong></li>`;
        }).join('')}`).join('')
        : `<li class="rm-feitas-vazio">${diaEscolhido ? 'Nenhuma corrida nesse dia.' : 'Quando você fizer corridas, elas aparecem aqui com o valor, a espera e a gorjeta.'}</li>`;
    }

    /* ---------- folhas ---------- */
    function abrirFolha(id) {
      fecharFolha();
      folha = id;
      veu.hidden = false;
      q(`#${id}`).hidden = false;
      if (id === 'rm-ganhos') { diaEscolhido = null; desenharSemana(); }
      if (id === 'rm-chat' && corrida) {
        corrida.novaMsg = false;
        q('#rm-nova-msg').hidden = true;
        const lista = q('#rm-msgs');
        lista.innerHTML = corrida.msgs.length ? corrida.msgs.map((m) => `<p class="d-msg${m.de === 'eu' ? ' eu' : ''}">${esc(m.txt)}</p>`).join('') : '<p class="d-msg digitando">As mensagens chegam aqui, cifradas de ponta a ponta.</p>';
      }
      const t = $('h4', q(`#${id}`));
      if (t) t.focus({ preventScroll: true });
    }
    function fecharFolha() {
      if (!folha) return;
      q(`#${folha}`).hidden = true;
      veu.hidden = true;
      folha = null;
    }

    /* ---------- toques ---------- */
    raiz.addEventListener('click', (e) => {
      if (e.target === veu) { fecharFolha(); return; }
      const b = e.target.closest('button');
      if (!b || !raiz.contains(b) || b.disabled) return;
      const ds = b.dataset;
      if (ds.rmFechar !== undefined) { fecharFolha(); return; }
      if (ds.rmFolha) { abrirFolha(ds.rmFolha); return; }
      if (ds.dia) { diaEscolhido = diaEscolhido === ds.dia ? null : ds.dia; desenharSemana(); return; }
      if (ds.rmTodas !== undefined) { diaEscolhido = null; desenharSemana(); return; }
      if (ds.aceitar) { aceitar(ds.aceitar); return; }
      if (ds.raio) { mudarRaio(Number(ds.raio)); return; }
      if (ds.notaP) { if (corrida) { corrida.notaPassageiro = Number(ds.notaP); desenharNotaPassageiro(); salvarCorrida(); } return; }
      if (ds.rapida) { mandarMsg(ds.rapida); return; }
      const acoes = {
        online: () => { if (online) { ouvirPedidos(); ir('online'); } else ficarOnline(); },
        offline: ficarOffline,
        centralizar: () => { if (pos) mapa.centrar(pos, 16); else op.avisar('Ainda não achei você no mapa.'); },
        desistir,
        cheguei: () => {
          if (!corrida) return;
          const longe = pos ? S.distancia(pos, corrida.embarque) : 0;
          if (longe > 300 && !corrida.confirmouLongeEmb) {
            corrida.confirmouLongeEmb = true;
            op.avisar(`O GPS diz que você está a ${S.textoKm(longe / 1000)} do embarque. Toca de novo se chegou mesmo.`);
            return;
          }
          // a espera só é cobrada com o GPS mostrando o motorista no embarque
          if (!corrida.chegouEm) { corrida.chegouEm = Date.now(); corrida.esperaConta = Boolean(pos) && longe <= 300; }
          corrida.etapa = 'codigo';
          clearInterval(posTimer);
          enviar({ tipo: 'etapa', etapa: 'chegou', pos: pos ? { lat: redondo(pos.lat, 5), lon: redondo(pos.lon, 5) } : null });
          avisarPassageiro('chegou');
          salvarCorrida();
          ir('codigo');
        },
        cancelar: () => {
          if (!corrida) return;
          enviar({ tipo: 'cancelado', motivo: 'motorista' });
          avisarPassageiro('cancelado');
          encerrar();
          op.avisar('Corrida cancelada.');
          if (online) { ouvirPedidos(); ir('online'); } else ir('off');
        },
        dobrar: () => { if (corrida) { corrida.etapa = 'dobra'; salvarCorrida(); ir('dobra'); } },
        passo: proximoPasso,
        chegada: cheguei,
        recebi,
        'nao-caiu': () => { mandarMsg('O Pix ainda não caiu aqui. Confere pra mim?'); op.avisar('Mandamos uma mensagem pro passageiro.'); },
      };
      if (ds.rm && acoes[ds.rm]) acoes[ds.rm]();
    });
    raiz.addEventListener('change', (e) => {
      const input = e.target.closest('input[data-foto]');
      if (input) fotoTirada(input);
    });
    q('#rm-cod-in').addEventListener('input', () => {
      const campo = q('#rm-cod-in');
      campo.value = campo.value.replace(/\D/g, '').slice(0, 4);
      q('#rm-cod').classList.remove('erro');
      q('#rm-cod-erro').hidden = true;
      desenharCodigo();
    });
    q('#rm-cod-in').addEventListener('focus', () => q('#rm-cod').classList.add('foco'));
    q('#rm-cod-in').addEventListener('blur', () => q('#rm-cod').classList.remove('foco'));
    q('#rm-cod-form').addEventListener('submit', (e) => { e.preventDefault(); conferirCodigo(); });
    q('#rm-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = q('#rm-chat-in');
      mandarMsg(campo.value);
      campo.value = '';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && folha && !raiz.hidden) { e.preventDefault(); fecharFolha(); }
    });

    /* ---------- abrir, voltar e sair ---------- */
    function abrir() {
      const u = eu();
      if (u && u.corridaMotorista && !corrida) {
        const c = u.corridaMotorista;
        if (Date.now() - c.t0 > 6 * 3600000) { delete u.corridaMotorista; op.salvar(); }
        else {
          corrida = c;
          ligarGps();
          regioesAssinadas = '';
          avisos().definir('motorista', [R.topico.aviso(c.id, 'm')]);
          assinarCorrida(c.id, c.ultimo || String(Math.floor(c.t0 / 1000) - 5));
          const tela = { buscar: 'buscar', codigo: 'codigo', vistoria: 'vistoria', dobra: 'dobra', viagem: 'viagem', receber: 'receber' }[c.etapa] || 'buscar';
          if (c.etapa === 'buscar') { clearInterval(posTimer); posTimer = setInterval(() => enviarPosicao(true), 45000); }
          ir(tela, { foco: false });
          return;
        }
      }
      ir(online ? 'online' : 'off', { foco: false });
    }
    function voltar() {
      if (folha) { fecharFolha(); return true; }
      if (atual === 'off') return false;
      if (atual === 'online') { op.avisar('Pra parar de receber pedidos, toca em Ficar offline.'); return true; }
      if (atual === 'aguardando') { desistir(); return true; }
      if (atual === 'fim') { ir(online ? 'online' : 'off'); return true; }
      op.avisar('Termina a corrida antes de voltar.');
      return true;
    }
    function sair() {
      if (corrida) enviar({ tipo: 'cancelado', motivo: 'motorista' });
      encerrar();
      ficarOffline();
      desligarGps();
    }
    function preencher() { desenharGanhos(); }

    return { abrir, voltar, sair, preencher, ficarOffline, telaAtual: () => atual, online: () => online, corridaAtiva: () => Boolean(corrida) };
  }

  window.Drink.Motorista = { criar };
}());
