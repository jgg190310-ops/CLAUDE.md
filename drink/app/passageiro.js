/* Drink — o app do passageiro, de verdade: GPS e mapa reais, busca de endereço, rota e preço calculados,
   pedido para os motoristas online, o Drink chegando no mapa, código conferido entre os dois celulares,
   chat, viagem ao vivo com link para a família e pagamento por Pix direto para o motorista.
   Sem motorista por perto, dá para ver tudo funcionando com um motorista simulado. */
(function () {
  'use strict';

  const { $, $$, brl, hhmm, esc, reduzirMovimento } = window.Drink.util;
  const S = window.Drink.servicos;
  const R = window.Drink.rede;
  const Mapa = window.Drink.mapa;
  const PIX = window.Drink.pix;

  const PRAZO_BUSCA = 3 * 60 * 1000;
  const VEICULOS = { qualquer: 'Tanto faz', bike: 'Bike', patinete: 'Patinete' };
  const TAGS = {
    boas: ['Pontual', 'Cuidou do carro', 'Dirigiu com calma', 'Gente boa'],
    ruins: ['Atrasou', 'Dirigiu rápido', 'Pouco cuidado com o carro', 'Outro motivo'],
  };
  const FOTOS = ['Frente', 'Traseira', 'Esquerda', 'Direita', 'Painel'];
  const redondo = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
  const iniciais = (nome) => String(nome || '').replace(/\(.*?\)/g, '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const primeiroNome = (nome) => String(nome || '').trim().split(' ')[0] || 'O Drink';
  const nomeCurto = (u) => [u.nome, u.sobrenome ? `${u.sobrenome.trim()[0]}.` : ''].filter(Boolean).join(' ');
  const digitos = (s) => String(s).replace(/\D/g, '');
  // o que chega pela rede só vale se tiver a forma certa
  const ponto = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

  function criar(op) {
    const raiz = op.raiz;
    const q = (s) => $(s, raiz);
    const telas = $$('.rt[data-rt]', raiz);
    const abas = q('#rp-abas');
    const veu = q('#rp-veu');
    const eu = op.eu;

    let mapa = null;
    let atual = '';
    let folha = null;
    let soltarGps = null;
    let pos = null;
    let ultimoEndereco = null;
    let embarque = null;
    let destino = null;
    let rota = null;
    let veic = 'qualquer';
    let modoBusca = 'destino';
    let buscaCtl = null;
    let buscaTimer = 0;
    let achados = [];
    let onlineTimer = 0;
    let corrida = null;
    let privada = null;
    let canal = R.canal;
    let assinatura = null;
    let fila = Promise.resolve();
    let robo = null;
    let timers = [];
    let rastreioTimer = 0;
    let gpsNegado = false;
    let embarqueManual = false;

    const agendar = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const limparTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* ---------- mapa e GPS ---------- */
    function garantirMapa() {
      if (mapa) return mapa;
      mapa = Mapa.criar(q('#mapa-p'), { centro: pos || S.BH, zoom: 15 });
      mapa.mapa.on('moveend', () => { if (atual === 'no-mapa') lerMeio(); });
      return mapa;
    }
    function ligarGps() {
      if (soltarGps) return;
      soltarGps = S.gps.assinar((p, erro) => {
        if (erro && !p) {
          gpsNegado = true;
          const aviso = q('#rp-gps');
          aviso.textContent = erro.code === 1
            ? 'Sem acesso à sua localização. Libera nas configurações do navegador, ou escolhe o embarque na busca.'
            : 'Não deu pra achar você no mapa agora. Tenta num lugar aberto, ou escolhe o embarque na busca.';
          aviso.hidden = atual !== 'inicio';
          if (!embarque) q('#rp-local').textContent = 'Localização desligada';
          return;
        }
        if (!p) return;
        gpsNegado = false;
        q('#rp-gps').hidden = true;
        const primeira = !pos;
        pos = p;
        if (mapa && !(corrida && corrida.etapa === 'viagem')) mapa.ponto('voce', p, Mapa.ICONE.voce());
        if (primeira && atual === 'inicio') { centrarEmMim(); desenharAtalhos(); }
        if (!corrida) atualizarEmbarque();
        if (corrida && corrida.etapa === 'viagem' && !corrida.simulada) andarNaViagem(p);
      });
    }
    // o embarque é onde você está (o nome da rua vem do endereço mais perto), ou o lugar que você escolheu
    const juntar = (l) => [l.nome, l.bairro && l.bairro !== l.nome ? l.bairro : ''].filter(Boolean).join(' · ');
    function mostrarEmbarque() {
      if (embarqueManual && embarque) q('#rp-local').textContent = `Embarque em ${juntar(embarque)}`;
      else if (ultimoEndereco) q('#rp-local').textContent = `Você está em ${juntar(ultimoEndereco.lugar)}`;
      q('#rp-de').textContent = (embarque && embarque.nome) || 'Sua localização';
    }
    async function atualizarEmbarque() {
      if (!pos || embarqueManual) return;
      if (ultimoEndereco && S.distancia(ultimoEndereco, pos) < 120) {
        embarque = { ...ultimoEndereco.lugar, lat: pos.lat, lon: pos.lon };
        mostrarEmbarque();
        return;
      }
      embarque = { nome: (embarque && embarque.nome) || 'Sua localização', bairro: (embarque && embarque.bairro) || '', lat: pos.lat, lon: pos.lon };
      const aqui = pos;
      try {
        const l = await S.endereco(aqui);
        ultimoEndereco = { lat: aqui.lat, lon: aqui.lon, lugar: l };
        if (embarqueManual) return;
        embarque = { ...l, lat: pos.lat, lon: pos.lon };
        mostrarEmbarque();
      } catch (e) {
        if (!embarqueManual && !ultimoEndereco) q('#rp-local').textContent = 'Você está aqui no mapa';
      }
    }
    function centrarEmMim() {
      garantirMapa();
      mapa.centrar(pos || S.BH, 15.5);
    }
    // a folha de baixo cobre parte do mapa: o mapa precisa saber quanto
    function medirFolha(tela) {
      const f = $('.rt-folha', tela);
      if (mapa) mapa.folga(f ? () => f.getBoundingClientRect().height : 0);
    }

    /* ---------- Drinks online por perto ---------- */
    async function lerOnline() {
      if (!canal.real && corrida) return;
      try {
        const lista = await R.canal.ler(R.topico.online(), '11m');
        const ultimos = new Map();
        lista.forEach(({ corpo }) => {
          if (corpo && corpo.v === 1 && typeof corpo.d === 'string' && Number.isFinite(corpo.t)) ultimos.set(corpo.d, corpo);
        });
        const agora = Date.now();
        const eu0 = eu();
        const vivos = [...ultimos.values()].filter((o) => o.tipo === 'online' && agora - o.t < 11 * 60000 && o.d !== (eu0 && eu0.idMotorista));
        const txt = q('#rp-online-txt');
        if (!vivos.length) txt.textContent = 'Nenhum Drink online agora';
        else txt.textContent = `${vivos.length} ${vivos.length === 1 ? 'Drink online' : 'Drinks online'} agora`;
        q('#rp-online').classList.toggle('vazio', !vivos.length);
        if (mapa && atual === 'inicio') mapa.online(vivos.map((o) => o.p).filter(ponto));
      } catch (e) {
        q('#rp-online-txt').textContent = 'Sem conexão com a central';
        q('#rp-online').classList.add('vazio');
      }
    }
    function vigiarOnline(ligado) {
      clearInterval(onlineTimer);
      onlineTimer = 0;
      if (!ligado) { if (mapa) mapa.online([]); return; }
      lerOnline();
      onlineTimer = setInterval(lerOnline, 30000);
    }

    /* ---------- telas ---------- */
    const COM_ABAS = ['inicio', 'viagens', 'carteira', 'perfil'];
    function ir(nome, { foco = true } = {}) {
      fecharFolha(false);
      const tela = telas.find((t) => t.dataset.rt === nome);
      if (!tela) return;
      const antes = atual;
      telas.forEach((t) => { t.hidden = t !== tela; t.classList.remove('entrando'); });
      if (!reduzirMovimento() && antes !== nome) { void tela.offsetWidth; tela.classList.add('entrando'); }
      atual = nome;
      abas.hidden = !COM_ABAS.includes(nome);
      $$('button', abas).forEach((b) => { if (b.dataset.rpAba === nome) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      vigiarOnline(nome === 'inicio');
      if (!tela.classList.contains('rt-cheia')) {
        garantirMapa();
        mapa.ajustar();
        medirFolha(tela);
      }
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) {
        const t = $('.d-titulo, .en-t', tela);
        if (t) t.focus({ preventScroll: true });
      }
      if (op.aoIr) op.aoIr(nome);
    }

    const ENTRAR = {
      inicio() {
        const h = new Date().getHours();
        q('.rp-saudacao').textContent = h >= 5 && h < 12 ? 'Bom dia' : (h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite');
        mapa.limpar();
        if (pos) mapa.ponto('voce', pos, Mapa.ICONE.voce());
        centrarEmMim();
        desenharAtalhos();
        q('#rp-gps').hidden = !gpsNegado;
        if (!ultimoEndereco && pos) atualizarEmbarque();
      },
      destino() {
        const campo = q('#rp-busca');
        campo.value = '';
        const titulos = { destino: 'Para onde?', embarque: 'Onde o Drink te busca?', casa: 'Onde é a sua casa?', trabalho: 'Onde você trabalha?' };
        q('#rp-dest-t').textContent = titulos[modoBusca];
        q('#rp-de-linha').hidden = modoBusca !== 'destino';
        q('.rt-campos').classList.toggle('so-embarque', modoBusca === 'embarque');
        q('#rp-de').textContent = (embarque && embarque.nome) || 'Sua localização';
        campo.placeholder = modoBusca === 'embarque' ? 'Rua e número, bar, praça…' : 'Endereço, bar, bairro…';
        mostrarSalvos();
        setTimeout(() => campo.focus({ preventScroll: true }), 50);
      },
      'no-mapa'() {
        mapa.limpar();
        if (pos) mapa.ponto('voce', pos, Mapa.ICONE.voce());
        mapa.centrar(destino || pos || S.BH, 16);
        posicionarAlfinete();
        lerMeio();
      },
      opcoes() { mostrarOpcoes(); },
      caminho() { mostrarCaminho(); },
      preparo() { mostrarPreparo(); },
      viagem() { mostrarViagem(); },
      chegou() { mostrarChegada(); },
      pix() { mostrarPix(); },
      viagens() { desenharHistorico(); },
      carteira() { desenharCarteira(); },
      perfil() { desenharPerfil(); },
    };

    /* ---------- atalhos: casa e trabalho ---------- */
    function desenharAtalhos() {
      const u = eu();
      const locais = (u && u.locais) || {};
      const item = (tipo, icone, titulo) => {
        const l = locais[tipo];
        if (l) {
          const dist = pos ? ` · ${S.textoKm(S.distancia(pos, l) / 1000)}` : '';
          return `<button type="button" data-rp-local="${tipo}"><svg aria-hidden="true"><use href="#${icone}"/></svg><span><b>${titulo}</b><small>${esc(l.bairro || l.nome)}${dist}</small></span></button>`;
        }
        return `<button type="button" data-rp-salvar="${tipo}"><svg aria-hidden="true"><use href="#${icone}"/></svg><span><b>${titulo}</b><small>Salvar endereço</small></span></button>`;
      };
      q('#rp-atalhos').innerHTML = item('casa', 'i-casa', 'Casa') + item('trabalho', 'i-maleta', 'Trabalho');
    }

    /* ---------- busca de endereço ---------- */
    function linhaLugar(l, i, icone = 'i-pin') {
      const dist = pos ? `<em>${S.textoKm(S.distancia(pos, l) / 1000)}</em>` : '';
      return `<li><button type="button" data-lugar="${i}"><svg aria-hidden="true"><use href="#${icone}"/></svg><span><b>${esc(l.nome)}</b><small>${esc(l.detalhe || l.bairro || '')}</small></span>${dist}</button></li>`;
    }
    function mostrarSalvos() {
      const u = eu();
      const locais = (u && u.locais) || {};
      const lista = [];
      if (modoBusca === 'embarque' && pos) {
        lista.push({ nome: 'Onde estou agora', detalhe: ultimoEndereco ? juntar(ultimoEndereco.lugar) : 'pelo GPS do celular', lat: pos.lat, lon: pos.lon, icone: 'i-mira', gps: true });
      }
      if (modoBusca === 'destino' || modoBusca === 'embarque') {
        if (locais.casa) lista.push({ ...locais.casa, nome: 'Casa', detalhe: locais.casa.nome, icone: 'i-casa' });
        if (locais.trabalho) lista.push({ ...locais.trabalho, nome: 'Trabalho', detalhe: locais.trabalho.nome, icone: 'i-maleta' });
        const vistos = new Set(lista.map((l) => l.detalhe));
        ((u && u.voltas) || []).forEach((v) => {
          if (modoBusca === 'destino' && v.destino && !vistos.has(v.destino.nome) && lista.length < 6) {
            vistos.add(v.destino.nome);
            lista.push({ ...v.destino, detalhe: v.destino.detalhe || v.destino.bairro, icone: 'i-relogio' });
          }
        });
      }
      achados = lista;
      q('#rp-res-t').textContent = lista.length ? 'Salvos e recentes' : 'Digita um endereço, um bar ou um bairro';
      q('#rp-resultados').innerHTML = lista.map((l, i) => linhaLugar(l, i, l.icone)).join('');
    }
    function buscarAgora() {
      const texto = q('#rp-busca').value.trim();
      clearTimeout(buscaTimer);
      if (texto.length < 3) { mostrarSalvos(); return; }
      buscaTimer = setTimeout(async () => {
        if (buscaCtl) buscaCtl.abort();
        buscaCtl = new AbortController();
        q('#rp-res-t').textContent = 'Buscando…';
        try {
          const lista = await S.buscar(texto, pos, buscaCtl.signal);
          achados = lista;
          q('#rp-res-t').textContent = lista.length ? 'Resultados' : 'Não achei esse lugar. Tenta outro nome ou escolhe no mapa.';
          q('#rp-resultados').innerHTML = lista.map((l, i) => linhaLugar(l, i)).join('');
        } catch (e) {
          if (e.name === 'AbortError') return;
          achados = [];
          q('#rp-res-t').textContent = 'A busca não respondeu. Confere a internet, ou escolhe no mapa.';
          q('#rp-resultados').innerHTML = '';
        }
      }, 380);
    }
    function escolherLugar(l) {
      const lugar = { nome: l.detalhe && ['Casa', 'Trabalho'].includes(l.nome) ? l.detalhe : l.nome, detalhe: l.detalhe || '', bairro: l.bairro || '', lat: l.lat, lon: l.lon };
      const modo = modoBusca;
      modoBusca = 'destino';
      if (modo === 'embarque') {
        if (l.gps) {
          embarqueManual = false;
          atualizarEmbarque();
        } else {
          embarqueManual = true;
          embarque = lugar;
        }
        mostrarEmbarque();
        ir(voltarPara === 'opcoes' && destino ? 'opcoes' : 'destino');
        return;
      }
      if (modo === 'casa' || modo === 'trabalho') {
        const u = eu();
        u.locais = u.locais || {};
        u.locais[modo] = lugar;
        op.salvar();
        op.avisar(`${modo === 'casa' ? 'Casa' : 'Trabalho'} salvo: ${lugar.nome}.`);
        ir(voltarPara || 'inicio');
        return;
      }
      destino = lugar;
      ir('opcoes');
    }
    let voltarPara = 'inicio';

    /* ---------- escolher no mapa ---------- */
    let meioTimer = 0;
    let meioLugar = null;
    function posicionarAlfinete() {
      const tela = telas.find((t) => t.dataset.rt === 'no-mapa');
      const f = $('.rt-folha', tela);
      const alt = raiz.getBoundingClientRect().height - f.getBoundingClientRect().height;
      q('#rp-alfinete').style.top = `${Math.max(60, alt / 2)}px`;
    }
    function lerMeio() {
      clearTimeout(meioTimer);
      q('#rp-nm-txt').textContent = 'Procurando o endereço…';
      meioTimer = setTimeout(async () => {
        const p = mapa.meio();
        meioLugar = { nome: 'Ponto no mapa', detalhe: '', bairro: '', lat: p.lat, lon: p.lon };
        try {
          const l = await S.endereco(p);
          meioLugar = { ...l, lat: p.lat, lon: p.lon };
          q('#rp-nm-txt').textContent = [l.nome, l.bairro].filter(Boolean).join(' · ');
        } catch (e) {
          q('#rp-nm-txt').textContent = `Ponto escolhido no mapa (${S.virgula(p.lat, 4)}, ${S.virgula(p.lon, 4)})`;
        }
      }, 450);
    }

    /* ---------- rota e preço ---------- */
    async function mostrarOpcoes() {
      const u = eu();
      q('#rp-op-t').textContent = [destino.nome, destino.bairro && destino.bairro !== destino.nome ? destino.bairro : ''].filter(Boolean).join(' · ');
      q('#rp-op-rota').textContent = 'Calculando a rota…';
      q('#rp-op-veic').textContent = VEICULOS[veic];
      q('#rp-op-carro').textContent = u.carro ? `${u.carro.modelo} ${u.carro.cor} · ${u.carro.cambio}` : 'Cadastrar';
      const bt = q('#rp-pedir');
      bt.disabled = true;
      bt.textContent = 'Pedir Drink';
      mapa.limpar();
      if (!embarque && pos) embarque = { nome: 'Sua localização', bairro: '', lat: pos.lat, lon: pos.lon };
      q('#rp-op-emb').textContent = embarque ? embarque.nome : 'Escolher';
      if (!embarque) {
        q('#rp-op-rota').textContent = 'Falta o embarque: toca em Embarque e escolhe onde o Drink te busca.';
        return;
      }
      mapa.ponto('embarque', embarque, Mapa.ICONE.embarque());
      mapa.ponto('destino', destino, Mapa.ICONE.destino());
      mapa.enquadrar([embarque, destino]);
      const esta = destino;
      const r = await S.rota(embarque, destino);
      if (esta !== destino || atual !== 'opcoes') return;
      rota = r;
      mapa.rota(r.linha);
      mapa.enquadrar([embarque, destino, ...r.linha.filter((_, i) => i % 10 === 0).map(([lat, lon]) => ({ lat, lon }))]);
      const p = S.preco(r.km);
      q('#rp-op-rota').textContent = `${S.textoKm(r.km)} · uns ${S.textoMin(r.min)} de carro${r.estimada ? ' (estimativa)' : ''}`;
      q('#rp-op-preco').textContent = brl(p.total);
      q('#rp-op-band').hidden = !p.adicional;
      q('#rp-op-chega').textContent = veic === 'qualquer' ? 'bike ou patinete' : (veic === 'bike' ? 'bike elétrica' : 'patinete elétrico');
      if (r.km < 0.4) {
        q('#rp-op-rota').textContent = 'Esse destino é pertinho demais. Escolhe outro.';
        return;
      }
      bt.disabled = false;
      bt.textContent = `Pedir Drink · ${brl(p.total)}`;
    }

    /* ---------- a corrida ---------- */
    const avisos = () => window.Drink.avisos;
    // aviso curto no celular do motorista (só em corrida de verdade, depois que ele aceitou)
    function avisarMotorista(tipo) {
      if (corrida && !corrida.simulada && corrida.motorista) avisos().mandar(R.topico.aviso(corrida.id, 'm'), tipo);
    }
    function salvarCorrida() {
      const u = eu();
      if (!u) return;
      if (corrida && !corrida.simulada) u.corrida = corrida;
      else delete u.corrida;
      op.salvar();
    }
    async function chavePrivada() {
      if (!privada) privada = await R.importarPrivada(corrida.priv);
      return privada;
    }
    function assinarCorrida() {
      if (assinatura) assinatura.fechar();
      const desde = corrida.ultimo || String(Math.floor(corrida.t0 / 1000) - 5);
      assinatura = canal.assinar([R.topico.corrida(corrida.id)], (env, meta) => {
        fila = fila.then(() => receber(env, meta)).catch(() => {});
      }, { desde });
    }
    // tudo é lido antes de cifrar: a corrida pode acabar logo depois (cancelar, concluir)
    async function enviar(obj, para) {
      if (!corrida) return;
      const chave = para ? para.chave : corrida.chave;
      const pub = para ? para.pub : corrida.motorista.pub;
      const topico = R.topico.corrida(corrida.id);
      const rede = canal;
      const env = { v: 1, de: 'p', para: pub.slice(0, 16), ...(await R.cifrar(chave, obj)) };
      try { await rede.publicar(topico, env); } catch (e) {
        op.avisar('Sem conexão agora. Tentando de novo…');
        setTimeout(() => rede.publicar(topico, env).catch(() => {}), 3000);
      }
    }

    async function pedir(simulada) {
      const u = eu();
      if (!simulada) op.pedirNotificacao();
      if (!R.cifraPronta) { op.avisar('Esse navegador não tem a proteção que o Drink usa. Tenta no Chrome ou no Safari atualizados.'); return; }
      if (!u.carro) { abrirFolha('rp-carro'); q('#rp-carro-erro').hidden = false; q('#rp-carro-erro').textContent = 'Antes de pedir, conta qual é o seu carro.'; return; }
      if (!rota || !embarque || !destino) { op.avisar('Espera a rota aparecer no mapa e toca de novo.'); return; }
      const par = await R.novoPar();
      const agora = Date.now();
      const p = S.preco(rota.km);
      corrida = {
        id: R.idAleatorio(), t0: agora, etapa: 'buscando', simulada: Boolean(simulada),
        embarque: { ...embarque }, destino: { ...destino }, km: redondo(rota.km, 1), min: Math.round(rota.min), linha: rota.linha,
        valor: redondo(p.total), saida: p.saida, rodado: redondo(p.rodado), adicional: redondo(p.adicional),
        veic, carro: { ...u.carro },
        codigo: String(1000 + Math.floor(Math.random() * 9000)),
        priv: par.priv, pub: par.pub, rastreio: R.novaChave(), segredo: R.idAleatorio(),
        motorista: null, chave: null, ultimo: null, msgs: [], fotos: 0, malas: false,
        nota: 0, tags: [], gorjeta: 0, cobranca: null, paguei: false, compartilhada: false,
      };
      privada = par.privada;
      canal = simulada ? R.memoria() : R.canal;
      salvarCorrida();
      assinarCorrida();
      const pedido = {
        v: 1, tipo: 'pedido', id: corrida.id, t: agora, expira: agora + PRAZO_BUSCA, pub: par.pub,
        de: { bairro: embarque.bairro || 'BH', ...S.aproximar(embarque) },
        para: { bairro: destino.bairro || destino.nome },
        km: corrida.km, min: corrida.min, valor: corrida.valor, veic, cambio: u.carro.cambio,
        fecho: await R.resumo(corrida.segredo),
      };
      ir('buscando');
      q('#rp-bu-sub').textContent = simulada
        ? 'Simulação: um motorista de mentirinha vai aceitar e fazer o caminho de verdade no mapa.'
        : `O pedido foi para os Drinks online perto ${embarque.bairro ? `de ${embarque.bairro}` : 'de você'}.`;
      try {
        await canal.publicar(R.topico.pedidos(), pedido);
      } catch (e) {
        encerrar();
        ir('ninguem');
        q('#rp-ni-t').textContent = 'Sem conexão com a central';
        q('#rp-ni-sub').textContent = 'O pedido não saiu do seu celular. Confere a internet e tenta de novo, ou testa com um motorista simulado.';
        return;
      }
      if (simulada) robo = window.Drink.robo.motorista(canal, { pedido, codigo: corrida.codigo });
      else avisos().definir('passageiro', [R.topico.aviso(corrida.id, 'p')]);
      contarPrazo(agora + PRAZO_BUSCA);
    }
    function contarPrazo(ate) {
      const barra = q('#rp-prazo');
      const total = PRAZO_BUSCA;
      const passo = () => {
        if (!corrida || corrida.etapa !== 'buscando') return;
        const falta = ate - Date.now();
        barra.style.width = `${Math.max(0, Math.min(100, (1 - falta / total) * 100))}%`;
        if (falta <= 0) { semMotorista(); return; }
        agendar(passo, 1000);
      };
      passo();
    }
    function semMotorista() {
      if (!corrida || corrida.etapa !== 'buscando') return;
      publicarFechado();
      encerrar();
      ir('ninguem');
      q('#rp-ni-t').textContent = 'Nenhum Drink aceitou agora';
      q('#rp-ni-sub').textContent = 'Pode ser que ninguém esteja online perto de você. Tenta de novo daqui a pouco, ou vê o app funcionando com um motorista simulado.';
    }
    function publicarFechado() {
      if (!corrida || corrida.simulada) return;
      R.canal.publicar(R.topico.fechados(), { v: 1, tipo: 'fechado', id: corrida.id, segredo: corrida.segredo }).catch(() => {});
    }
    function encerrar() {
      if (corrida && !corrida.simulada) avisos().definir('passageiro', []);
      limparTimers();
      clearInterval(rastreioTimer);
      if (assinatura) { assinatura.fechar(); assinatura = null; }
      if (robo) { robo.parar(); robo = null; }
      corrida = null;
      privada = null;
      canal = R.canal;
      salvarCorrida();
      if (mapa) { mapa.tirar('motorista'); mapa.tirar('carro'); }
    }

    // mensagens da corrida, uma de cada vez, na ordem
    async function receber(env, meta) {
      if (!corrida || !env || env.v !== 1 || env.de !== 'm' || !env.k || !env.iv) return;
      if (meta && meta.id) corrida.ultimo = meta.id;
      const doEscolhido = corrida.motorista && env.k === corrida.motorista.pub;
      const chave = doEscolhido ? corrida.chave : await R.chaveComum(await chavePrivada(), env.k);
      let msg;
      try { msg = await R.decifrar(chave, env); } catch (e) { return; }
      if (corrida.motorista && !doEscolhido) {
        if (msg.tipo === 'aceite') enviar({ tipo: 'recusado' }, { chave, pub: env.k });
        return;
      }
      tratar(msg, env.k, chave);
      salvarCorrida();
    }

    function tratar(msg, k, chave) {
      const c = corrida;
      const nome = c.motorista ? primeiroNome(c.motorista.nome) : 'O Drink';
      switch (msg.tipo) {
        case 'aceite': {
          if (c.motorista || c.etapa !== 'buscando') return;
          const m = msg.motorista || {};
          c.motorista = {
            pub: k, nome: String(m.nome || 'Motorista').slice(0, 40), nota: Number(m.nota) || 0,
            corridas: Number(m.corridas) || 0, veiculo: m.veiculo === 'patinete' ? 'patinete' : 'bike', teste: Boolean(m.teste),
          };
          c.chave = chave;
          c.pos = ponto(msg.pos) ? { lat: msg.pos.lat, lon: msg.pos.lon } : null;
          c.etapa = 'a-caminho';
          limparTimers();
          const u = eu();
          enviar({
            tipo: 'confirmado',
            passageiro: { nome: nomeCurto(u) },
            embarque: { lat: c.embarque.lat, lon: c.embarque.lon, nome: c.embarque.nome, bairro: c.embarque.bairro },
            destino: { lat: c.destino.lat, lon: c.destino.lon, nome: c.destino.nome, bairro: c.destino.bairro },
            carro: c.carro, valor: c.valor, km: c.km,
          });
          avisarMotorista('confirmado');
          publicarFechado();
          op.notificar(`${primeiroNome(c.motorista.nome)} aceitou`, 'O Drink está indo até você.');
          ir('caminho');
          break;
        }
        case 'pos':
          if (!ponto(msg)) return;
          c.pos = { lat: msg.lat, lon: msg.lon, t: Date.now() };
          if (c.etapa === 'viagem' && c.simulada) andarNaViagem(c.pos);
          else if (atual === 'caminho') atualizarChegando();
          break;
        case 'etapa':
          if (msg.etapa === 'chegou' && ['a-caminho'].includes(c.etapa)) {
            c.etapa = 'chegou';
            op.notificar(`${nome} chegou`, 'Confere o código antes de entregar a chave.');
            if (atual === 'caminho') mostrarCaminho();
          } else if (msg.etapa === 'vistoria') {
            c.fotos = Math.max(c.fotos, Math.min(5, Number(msg.fotos) || 0));
            if (atual === 'preparo') mostrarPreparo();
          } else if (msg.etapa === 'malas') {
            c.malas = true;
            if (atual === 'preparo') mostrarPreparo();
          } else if (msg.etapa === 'viagem' && ['preparo', 'chegou'].includes(c.etapa)) {
            c.etapa = 'viagem';
            c.inicioViagem = Date.now();
            ir('viagem');
          } else if (msg.etapa === 'chegada' && c.etapa !== 'chegada' && c.etapa !== 'pagando') {
            c.etapa = 'chegada';
            c.chegada = Date.now();
            if (Number(msg.valor) > 0) c.valor = redondo(Number(msg.valor));
            clearInterval(rastreioTimer);
            publicarRastreio(true);
            op.notificar('Chegou!', 'Avalia a corrida e paga com Pix.');
            ir('chegou');
          }
          break;
        case 'codigo': {
          const ok = String(msg.valor) === c.codigo;
          enviar({ tipo: 'codigo-ok', ok });
          if (ok && ['a-caminho', 'chegou'].includes(c.etapa)) {
            c.etapa = 'preparo';
            ir('preparo');
          } else if (!ok) {
            op.avisar(`${nome} digitou um código diferente. Confere se é o Drink certo antes de entregar a chave.`);
          }
          break;
        }
        case 'cobranca': {
          const px = msg.pix;
          const pix = px && typeof px.chave === 'string' && px.chave.length <= 77
            ? { chave: px.chave, nome: String(px.nome || '').slice(0, 60), cidade: String(px.cidade || '').slice(0, 30) } : null;
          c.cobranca = { pix, simulado: Boolean(msg.simulado) };
          if (atual === 'pix') mostrarPix();
          break;
        }
        case 'recebido':
          if (c.etapa === 'pagando' || c.paguei) concluir();
          else { c.recebido = true; }
          break;
        case 'msg':
          adicionarMsg('ele', String(msg.txt || '').slice(0, 300));
          break;
        case 'cancelado':
          if (['viagem', 'chegada', 'pagando'].includes(c.etapa)) return;
          op.notificar(`${nome} cancelou`, 'Você pode pedir outro Drink.');
          op.avisar(`${nome} cancelou a corrida. Pede de novo que outro Drink aceita.`);
          encerrar();
          ir(destino ? 'opcoes' : 'inicio');
          break;
        default:
      }
    }

    /* ---------- o Drink chegando ---------- */
    function veiculoTxt(v) { return v === 'patinete' ? 'patinete elétrico' : 'bike elétrica'; }
    function mostrarCaminho() {
      const c = corrida;
      if (!c || !c.motorista) return;
      const m = c.motorista;
      const nome = primeiroNome(m.nome);
      q('#rp-cam-t').textContent = c.etapa === 'chegou' ? `${nome} chegou` : `${nome} está a caminho`;
      q('#rp-mot-av').textContent = iniciais(m.nome);
      q('#rp-mot-nome').textContent = m.nome;
      q('#rp-mot-info').textContent = `${m.nota ? S.virgula(m.nota) : 'novo no Drink'} · ${veiculoTxt(m.veiculo)}${m.teste ? ' · simulado' : ''}`;
      q('#rp-mot-veic').setAttribute('href', m.veiculo === 'patinete' ? '#i-patinete' : '#i-bike');
      q('#rp-codigo').textContent = c.codigo.split('').join(' ');
      q('#rp-codigo-txt').textContent = c.etapa === 'chegou'
        ? `Fala esse código pro ${nome}. Quando ele digitar no app, o seu celular confere e aí você entrega a chave.`
        : 'Fala esse código pro motorista quando ele chegar. Ele digita no app e o seu celular confere se é ele mesmo.';
      q('#rp-chat-t').textContent = m.nome;
      q('#rp-chat-av').textContent = iniciais(m.nome);
      q('#rp-nova-msg').hidden = !c.novaMsg;
      mapa.limpar();
      mapa.ponto('embarque', c.embarque, Mapa.ICONE.embarque());
      if (pos) mapa.ponto('voce', pos, Mapa.ICONE.voce());
      atualizarChegando(true);
    }
    function atualizarChegando(enquadrar) {
      const c = corrida;
      if (!c || !c.motorista) return;
      const chip = q('#rp-eta');
      if (c.pos) {
        mapa.ponto('motorista', c.pos, Mapa.ICONE.motorista(c.motorista.veiculo));
        const d = S.distancia(c.pos, c.embarque);
        if (c.etapa === 'chegou' || d < 60) chip.innerHTML = `<b>${esc(primeiroNome(c.motorista.nome))}</b> está no embarque`;
        else {
          const min = Math.max(1, Math.round(((d * 1.3) / 1000 / 17) * 60));
          chip.innerHTML = `Chega em <b>${min} min</b> · ${S.textoKm((d * 1.3) / 1000)}`;
        }
        if (enquadrar) mapa.enquadrar([c.pos, c.embarque], { maxZoom: 17 });
      } else {
        chip.innerHTML = 'Esperando a posição do Drink';
        if (enquadrar) mapa.centrar(c.embarque, 16);
      }
    }

    /* ---------- vistoria e porta-malas ---------- */
    function mostrarPreparo() {
      const c = corrida;
      if (!c) return;
      const nome = primeiroNome(c.motorista && c.motorista.nome);
      const n = c.fotos;
      $$('#rp-fotos li', raiz).forEach((li, i) => li.classList.toggle('on', i < n));
      const checks = $$('#rp-checks li', raiz);
      checks[1].classList.toggle('ok', n >= 5);
      checks[2].classList.toggle('ok', c.malas);
      q('#rp-check-malas').textContent = `${c.motorista && c.motorista.veiculo === 'patinete' ? 'Patinete dobrado' : 'Bike dobrada'} no porta-malas`;
      q('#rp-prep-t').textContent = c.malas ? 'Tudo pronto' : (n >= 5 ? 'Vistoria feita' : 'Código conferido');
      q('#rp-prep-sub').textContent = c.malas
        ? `${nome} já vai sair com o seu carro.`
        : (n >= 5 ? `${nome} está guardando a ${c.motorista && c.motorista.veiculo === 'patinete' ? 'patinete' : 'bike'} no porta-malas.` : `Pode entregar a chave. ${nome} está fotografando o carro: ${n} de 5.`);
    }

    /* ---------- viagem ---------- */
    function mostrarViagem() {
      const c = corrida;
      if (!c) return;
      const m = c.motorista || { nome: 'O Drink', veiculo: 'bike' };
      q('#rp-via-dest').textContent = c.destino.nome;
      q('#rp-via-nome').textContent = primeiroNome(m.nome);
      q('#rp-via-av').textContent = iniciais(m.nome);
      q('#rp-via-veic').textContent = m.veiculo === 'patinete' ? 'o patinete' : 'a bike';
      q('#rp-vivo').textContent = c.compartilhada ? 'Ao vivo · compartilhada' : 'Ao vivo';
      mapa.limpar();
      mapa.rota(c.linha);
      mapa.ponto('destino', c.destino, Mapa.ICONE.destino());
      const aqui = c.simulada ? c.pos : (pos || c.pos);
      mapa.enquadrar([aqui || c.embarque, c.destino]);
      andarNaViagem(aqui || c.embarque);
      if (c.compartilhada) ligarRastreio();
    }
    function andarNaViagem(p) {
      const c = corrida;
      if (!c || !p) return;
      c.aqui = { lat: p.lat, lon: p.lon };
      if (mapa && atual === 'viagem') {
        mapa.tirar('voce');
        mapa.ponto('carro', p, Mapa.ICONE.carro());
      }
      const falta = S.faltaNaLinha(c.linha, p);
      if (falta !== null) {
        const min = c.km > 0 ? (falta / c.km) * c.min : (falta / 30) * 60;
        c.eta = hhmm(new Date(Date.now() + Math.max(1, min) * 60000));
        if (atual === 'viagem') {
          q('#rp-faltam').textContent = S.textoKm(falta);
          q('#rp-chegada').textContent = c.eta;
        }
      }
    }

    /* ---------- compartilhar ao vivo ---------- */
    function linkRastreio() {
      const u = new URL(location.href);
      u.search = `?acompanhar=${corrida.id}`;
      u.hash = corrida.rastreio;
      return u.toString();
    }
    function textoRastreio() {
      return `Tô voltando pra casa com o Drink. Acompanha a viagem ao vivo: ${linkRastreio()}`;
    }
    function ligarRastreio() {
      clearInterval(rastreioTimer);
      publicarRastreio();
      rastreioTimer = setInterval(() => publicarRastreio(), 30000);
    }
    async function publicarRastreio(fim) {
      const c = corrida;
      if (!c || !c.compartilhada) return;
      const p = c.etapa === 'viagem' || fim ? (c.aqui || pos || c.pos) : (c.pos || pos);
      if (!p) return;
      const corpo = {
        lat: p.lat, lon: p.lon, t: Date.now(), etapa: fim ? 'chegou' : c.etapa, eta: c.eta || null,
        destino: { lat: c.destino.lat, lon: c.destino.lon, nome: c.destino.nome, bairro: c.destino.bairro },
        quem: eu().nome, motorista: c.motorista ? c.motorista.nome : null,
      };
      try { await R.canal.publicar(R.topico.rastreio(c.id), { v: 1, ...(await R.cifrar(c.rastreio, corpo)) }); } catch (e) { /* tenta na próxima */ }
    }
    function marcarCompartilhada() {
      if (!corrida) return;
      corrida.compartilhada = true;
      salvarCorrida();
      if (['a-caminho', 'chegou', 'preparo', 'viagem'].includes(corrida.etapa)) ligarRastreio();
      if (atual === 'viagem') q('#rp-vivo').textContent = 'Ao vivo · compartilhada';
    }
    function abrirCompartilhar() {
      const u = eu();
      const contatos = (u.contatos || []);
      q('#rp-comp-lista').innerHTML = contatos.length
        ? contatos.map((c, i) => `<li><button type="button" data-zap="${i}"><svg aria-hidden="true"><use href="#i-mensagem"/></svg><span><b>${esc(c.nome)}</b><small>Mandar pelo WhatsApp</small></span></button></li>`).join('')
        : '<li class="rt-dica">Cadastra contatos de confiança no Perfil pra mandar com um toque.</li>';
      abrirFolha('rp-comp');
    }
    async function copiar(texto, ok) {
      try {
        await navigator.clipboard.writeText(texto);
      } catch (e) {
        // navegador antigo: copia por uma caixa de texto escondida
        const caixa = document.createElement('textarea');
        caixa.value = texto;
        caixa.setAttribute('readonly', '');
        caixa.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(caixa);
        caixa.select();
        let foi = false;
        try { foi = document.execCommand('copy'); } catch (e2) { foi = false; }
        caixa.remove();
        if (!foi) { op.avisar('Não deu pra copiar sozinho. Segura o dedo no texto pra copiar.'); return; }
      }
      op.avisar(ok);
    }

    /* ---------- chegada: avaliação, gorjeta e Pix ---------- */
    const linhaRecibo = (a, b, classe = '') => `<p${classe ? ` class="${classe}"` : ''}><span>${esc(a)}</span><b>${esc(b)}</b></p>`;
    function htmlRecibo(v) {
      let h = linhaRecibo('Saída', brl(v.saida)) + linhaRecibo(`${S.virgula(v.km)} km rodados`, brl(v.rodado));
      if (v.adicional) h += linhaRecibo('Bandeira 2 (+20%)', brl(v.adicional));
      h += linhaRecibo('Seguro da viagem', 'incluso');
      if (v.gorjeta) h += linhaRecibo('Gorjeta', brl(v.gorjeta));
      h += linhaRecibo(`Total · ${v.pag || 'Pix'}`, brl(v.total), 't-total');
      return h;
    }
    function totalAtual() { return redondo(corrida.valor + (corrida.gorjeta || 0)); }
    function mostrarChegada() {
      const c = corrida;
      if (!c) return;
      const nome = primeiroNome(c.motorista && c.motorista.nome);
      q('#rp-fim-sub').textContent = `Chegada às ${hhmm(new Date(c.chegada || Date.now()))} · ${c.destino.bairro || c.destino.nome}`;
      q('#rp-aval-t').textContent = `Como foi com o ${nome}?`;
      desenharAvaliacao();
    }
    function desenharAvaliacao() {
      const c = corrida;
      q('#rp-recibo').innerHTML = htmlRecibo({ ...c, total: totalAtual() });
      $$('#rp-estrelas [data-nota]', raiz).forEach((b) => {
        const n = Number(b.dataset.nota);
        b.classList.toggle('on', n <= c.nota);
        b.setAttribute('aria-checked', String(n === c.nota));
      });
      $$('#rp-gorjeta [data-gorjeta]', raiz).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.gorjeta) === c.gorjeta)));
      const tags = q('#rp-tags');
      tags.hidden = !c.nota;
      if (c.nota) {
        const tipo = c.nota >= 4 ? 'boas' : 'ruins';
        tags.classList.toggle('ruins', tipo === 'ruins');
        tags.innerHTML = TAGS[tipo].map((t) => `<button type="button" data-tag="${esc(t)}" aria-pressed="${c.tags.includes(t)}">${esc(t)}</button>`).join('');
      }
      q('#rp-pagar').textContent = `Pagar ${brl(totalAtual())} com Pix`;
    }
    function irPagar() {
      const c = corrida;
      c.etapa = 'pagando';
      enviar({ tipo: 'avaliacao', nota: c.nota, tags: c.tags, gorjeta: c.gorjeta, total: totalAtual() });
      salvarCorrida();
      ir('pix');
    }
    function mostrarPix() {
      const c = corrida;
      if (!c) return;
      const total = totalAtual();
      const nome = c.motorista ? c.motorista.nome : 'o motorista';
      q('#rp-pix-valor').textContent = brl(total);
      const qr = q('#rp-qr');
      const copiarBt = q('#rp-copiar');
      if (!c.cobranca) {
        qr.innerHTML = '<p class="rt-qr-espera">Esperando a chave Pix do motorista…</p>';
        q('#rp-pix-para').textContent = `Assim que o ${primeiroNome(nome)} mandar, o QR code aparece aqui.`;
        copiarBt.disabled = true;
      } else if (c.cobranca.simulado || !c.cobranca.pix || !c.cobranca.pix.chave) {
        qr.innerHTML = '<p class="rt-qr-espera rt-qr-sim"><b>Simulação</b>Nenhum dinheiro de verdade. Numa corrida real, aqui aparece o QR code do Pix do motorista.</p>';
        q('#rp-pix-para').textContent = `Para ${nome}`;
        copiarBt.disabled = true;
      } else {
        const px = c.cobranca.pix;
        c.pixCodigo = PIX.copiaECola({ chave: px.chave, nome: px.nome || nome, cidade: px.cidade || 'BELO HORIZONTE', valor: total });
        qr.innerHTML = PIX.qrSvg(c.pixCodigo);
        q('#rp-pix-para').innerHTML = `Para <b>${esc(px.nome || nome)}</b> · chave ${esc(PIX.mascarar(px.chave))}`;
        copiarBt.disabled = false;
      }
      const status = q('#rp-pix-status');
      const bt = q('#rp-paguei');
      if (c.paguei) {
        status.textContent = `Avisamos o ${primeiroNome(nome)}. Esperando ele confirmar que o Pix caiu…`;
        bt.textContent = 'Concluir';
        bt.disabled = !c.podeConcluir;
      } else {
        status.textContent = '';
        bt.textContent = 'Já paguei';
        bt.disabled = !c.cobranca;
      }
    }
    function paguei() {
      const c = corrida;
      if (!c) return;
      if (c.paguei) { if (c.podeConcluir) concluir(); return; }
      c.paguei = true;
      enviar({ tipo: 'paguei', total: totalAtual() });
      avisarMotorista('paguei');
      salvarCorrida();
      if (c.recebido) { concluir(); return; }
      mostrarPix();
      agendar(() => { if (corrida === c) { c.podeConcluir = true; mostrarPix(); q('#rp-pix-status').textContent = `O ${primeiroNome(c.motorista && c.motorista.nome)} ainda não confirmou. Se você já pagou, pode concluir.`; } }, 90000);
    }
    function concluir() {
      const c = corrida;
      if (!c) return;
      const u = eu();
      const v = {
        id: c.id, rota: `${c.embarque.bairro || c.embarque.nome} → ${c.destino.bairro || c.destino.nome}`,
        data: new Date(c.chegada || Date.now()).toISOString(), km: c.km, motorista: c.motorista ? c.motorista.nome : 'Drink',
        pag: 'Pix', saida: c.saida, rodado: c.rodado, adicional: c.adicional, gorjeta: c.gorjeta, total: totalAtual(),
        nota: c.nota, simulada: c.simulada, destino: { nome: c.destino.nome, bairro: c.destino.bairro, detalhe: c.destino.detalhe, lat: c.destino.lat, lon: c.destino.lon },
      };
      u.voltas = [v, ...(u.voltas || [])].slice(0, 100);
      op.salvar();
      embarqueManual = false;
      destino = null;
      const simulada = c.simulada;
      encerrar();
      op.avisar(simulada ? 'Simulação concluída. O recibo de teste ficou em Viagens.' : 'Pago! O recibo ficou salvo em Viagens.');
      ir('viagens');
    }

    /* ---------- cancelar ---------- */
    function cancelar() {
      const c = corrida;
      if (!c) return;
      if (['preparo', 'viagem', 'chegada', 'pagando'].includes(c.etapa)) { op.avisar('A corrida já começou. Se precisar, usa a Ajuda.'); return; }
      if (c.etapa === 'buscando') publicarFechado();
      else { enviar({ tipo: 'cancelado', motivo: 'passageiro' }); avisarMotorista('cancelado'); }
      encerrar();
      op.avisar('Corrida cancelada.');
      ir(destino ? 'opcoes' : 'inicio');
    }

    /* ---------- chat ---------- */
    function adicionarMsg(de, txt) {
      if (!corrida || !txt) return;
      corrida.msgs.push({ de, txt, t: Date.now() });
      if (de === 'ele' && folha !== 'rp-chat') {
        corrida.novaMsg = true;
        q('#rp-nova-msg').hidden = false;
        op.notificar(primeiroNome(corrida.motorista && corrida.motorista.nome), txt);
        op.avisar(`${primeiroNome(corrida.motorista && corrida.motorista.nome)}: “${txt}”`);
      }
      desenharChat();
    }
    function desenharChat() {
      const lista = q('#rp-msgs');
      const msgs = (corrida && corrida.msgs) || [];
      lista.innerHTML = msgs.length
        ? msgs.map((m) => `<p class="d-msg${m.de === 'eu' ? ' eu' : ''}">${esc(m.txt)}</p>`).join('')
        : '<p class="d-msg digitando">As mensagens chegam aqui, cifradas de ponta a ponta.</p>';
      lista.scrollTop = lista.scrollHeight;
    }
    function mandarMsg(txt) {
      const t = String(txt || '').trim().slice(0, 300);
      if (!t || !corrida || !corrida.motorista) return;
      enviar({ tipo: 'msg', txt: t });
      avisarMotorista('msg');
      adicionarMsg('eu', t);
    }

    /* ---------- abas: viagens, carteira, perfil ---------- */
    function desenharHistorico() {
      const u = eu();
      const voltas = (u && u.voltas) || [];
      const n = voltas.length;
      const km = voltas.reduce((s, v) => s + (v.km || 0), 0);
      q('#rp-resumo').textContent = n ? `${n} ${n === 1 ? 'volta' : 'voltas'} · ${S.virgula(km)} km · nenhum carro esquecido` : 'Nenhuma volta ainda';
      const lista = q('#rp-hist');
      if (!n) {
        lista.innerHTML = '<li class="d-hist-vazio"><svg aria-hidden="true"><use href="#i-limao"/></svg><b>Suas voltas aparecem aqui</b><span>Pediu um Drink, o recibo fica salvo nesta aba.</span><button type="button" data-rp-aba="inicio">Pedir o primeiro Drink</button></li>';
        return;
      }
      lista.innerHTML = voltas.map((v, i) => {
        const d = new Date(v.data);
        const quando = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
        return `<li${i === 0 && Date.now() - d.getTime() < 60000 ? ' class="novo"' : ''}><button type="button" data-volta="${i}">`
          + '<span class="d-hist-ic" aria-hidden="true"><svg><use href="#i-rota"/></svg></span>'
          + `<span><b>${esc(v.rota)}</b><small>${esc(quando)}, ${esc(hhmm(d))} · ${esc(v.motorista)}${v.simulada ? ' · teste' : ''}</small></span><em>${esc(brl(v.total))}</em></button></li>`;
      }).join('');
    }
    function desenharCarteira() {
      const u = eu();
      const agora = new Date();
      const doMes = ((u && u.voltas) || []).filter((v) => { const d = new Date(v.data); return !v.simulada && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); });
      q('#rp-mes').textContent = brl(doMes.reduce((s, v) => s + v.total, 0));
      q('#rp-mes-txt').textContent = doMes.length ? `em ${doMes.length} ${doMes.length === 1 ? 'volta' : 'voltas'}` : 'em nenhuma volta';
    }
    function desenharPerfil() {
      const u = eu();
      q('#rp-carro-t').textContent = u.carro ? `${u.carro.modelo} ${u.carro.cor}` : 'Cadastra o seu carro';
      q('#rp-carro-sub').textContent = u.carro ? `${u.carro.cambio}${u.carro.placa ? ` · placa ${u.carro.placa}` : ''}` : 'Modelo, cor e câmbio, pro Drink achar ele';
      const locais = u.locais || {};
      const item = (tipo, icone, titulo) => {
        const l = locais[tipo];
        return `<li class="rt-item"><button type="button" data-rp-salvar="${tipo}"><svg aria-hidden="true"><use href="#${icone}"/></svg><span><b>${titulo}</b><small>${l ? esc([l.nome, l.bairro].filter(Boolean).join(' · ')) : 'Toca pra salvar'}</small></span></button>${l ? `<button type="button" class="rt-tirar" data-rp-tirar="${tipo}" aria-label="Apagar ${titulo}"><svg aria-hidden="true"><use href="#i-lixo"/></svg></button>` : ''}</li>`;
      };
      q('#rp-lugares').innerHTML = item('casa', 'i-casa', 'Casa') + item('trabalho', 'i-maleta', 'Trabalho');
      const contatos = u.contatos || [];
      q('#rp-contatos').innerHTML = contatos.map((c, i) => `<li class="rt-item"><p class="rt-contato"><span class="mu-av">${esc(iniciais(c.nome))}</span><span><b>${esc(c.nome)}</b><small>${esc(c.cel)}</small></span></p><button type="button" class="rt-tirar" data-rp-tirar-contato="${i}" aria-label="Apagar ${esc(c.nome)}"><svg aria-hidden="true"><use href="#i-lixo"/></svg></button></li>`).join('')
        + '<li><button type="button" data-rp-folha="rp-contato"><svg aria-hidden="true"><use href="#i-mais"/></svg><span><b>Adicionar contato</b><small>Pra mandar a viagem ao vivo com um toque</small></span></button></li>';
    }

    /* ---------- folhas por cima ---------- */
    function abrirFolha(id) {
      fecharFolha(false);
      folha = id;
      veu.hidden = false;
      q(`#${id}`).hidden = false;
      if (id === 'rp-chat') { if (corrida) corrida.novaMsg = false; q('#rp-nova-msg').hidden = true; desenharChat(); }
      if (id === 'rp-carro') {
        const c = eu().carro || {};
        q('#rp-carro-modelo').value = c.modelo || '';
        q('#rp-carro-cor').value = c.cor || '';
        q('#rp-carro-placa').value = c.placa || '';
        $$('#rp-carro [data-cambio]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cambio === (c.cambio || 'automático'))));
        q('#rp-carro-erro').hidden = true;
      }
      if (id === 'rp-contato') { q('#rp-contato-nome').value = ''; q('#rp-contato-cel').value = ''; q('#rp-contato-erro').hidden = true; }
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
      if (ds.rpFechar !== undefined) { fecharFolha(); return; }
      if (ds.rpFolha) { abrirFolha(ds.rpFolha); return; }
      if (ds.rpAba) { ir(ds.rpAba); return; }
      if (ds.rpIr) { ir(ds.rpIr); return; }
      if (ds.rpLocal) { const l = eu().locais[ds.rpLocal]; if (l) { modoBusca = 'destino'; destino = { ...l }; ir('opcoes'); } return; }
      if (ds.rpSalvar) { voltarPara = atual; modoBusca = ds.rpSalvar; ir('destino'); return; }
      if (ds.rpTirar) { const u = eu(); if (u.locais) delete u.locais[ds.rpTirar]; op.salvar(); desenharPerfil(); return; }
      if (ds.rpTirarContato) { const u = eu(); u.contatos.splice(Number(ds.rpTirarContato), 1); op.salvar(); desenharPerfil(); return; }
      if (ds.lugar) { const l = achados[Number(ds.lugar)]; if (l) escolherLugar(l); return; }
      if (ds.nota) { corrida.nota = Number(ds.nota); corrida.tags = []; desenharAvaliacao(); salvarCorrida(); return; }
      if (ds.tag) {
        const i = corrida.tags.indexOf(ds.tag);
        if (i >= 0) corrida.tags.splice(i, 1); else corrida.tags.push(ds.tag);
        b.setAttribute('aria-pressed', String(i < 0));
        return;
      }
      if (ds.gorjeta) { corrida.gorjeta = Number(ds.gorjeta); desenharAvaliacao(); salvarCorrida(); return; }
      if (ds.cambio) { $$('#rp-carro [data-cambio]', raiz).forEach((x) => x.setAttribute('aria-checked', String(x === b))); return; }
      if (ds.rapida) { mandarMsg(ds.rapida); return; }
      if (ds.volta) {
        const v = eu().voltas[Number(ds.volta)];
        if (!v) return;
        q('#rp-rec-sub').textContent = `${v.rota} · ${new Date(v.data).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        q('#rp-rec-det').innerHTML = htmlRecibo(v);
        abrirFolha('rp-recibo-folha');
        return;
      }
      if (ds.zap) {
        const c = eu().contatos[Number(ds.zap)];
        if (!c || !corrida) return;
        window.open(`https://wa.me/55${digitos(c.cel)}?text=${encodeURIComponent(textoRastreio())}`, '_blank', 'noopener');
        marcarCompartilhada();
        fecharFolha();
        return;
      }
      const acoes = {
        centralizar: () => {
          if (!pos) { op.avisar('Ainda não achei você no mapa.'); centrarEmMim(); return; }
          if (embarqueManual) { embarqueManual = false; op.avisar('Embarque de volta onde você está.'); atualizarEmbarque(); }
          centrarEmMim();
        },
        'trocar-embarque': () => { voltarPara = atual; modoBusca = 'embarque'; ir('destino'); },
        'voltar-busca': () => { const volta = modoBusca === 'destino' ? 'inicio' : (voltarPara || 'perfil'); modoBusca = 'destino'; ir(volta); },
        'no-mapa': () => ir('no-mapa'),
        'confirmar-no-mapa': () => { if (meioLugar) escolherLugar(meioLugar); },
        cancelar,
        tentar: () => ir('opcoes'),
        simular: () => pedir(true),
        compartilhar: () => { if (corrida) abrirCompartilhar(); },
        'compartilhar-outro': () => {
          if (!corrida) return;
          marcarCompartilhada();
          if (navigator.share) navigator.share({ title: 'Minha volta com o Drink', text: textoRastreio() }).catch(() => {});
          else copiar(textoRastreio(), 'Link copiado. Cola no WhatsApp de quem vai acompanhar.');
          fecharFolha();
        },
        'copiar-link': () => { if (!corrida) return; marcarCompartilhada(); copiar(linkRastreio(), 'Link da viagem copiado.'); fecharFolha(); },
        'mandar-local': () => {
          const p = (corrida && (corrida.aqui || corrida.pos)) || pos;
          if (!p) { op.avisar('Ainda não achei você no mapa.'); return; }
          const texto = `Estou aqui: https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
          if (navigator.share) navigator.share({ text: texto }).catch(() => {});
          else copiar(texto, 'Localização copiada.');
        },
        'copiar-pix': () => { if (corrida && corrida.pixCodigo) copiar(corrida.pixCodigo, 'Código Pix copiado. Agora cola no app do seu banco.'); },
        paguei,
      };
      if (ds.rp && acoes[ds.rp]) { acoes[ds.rp](); return; }
      switch (b.id) {
        case 'rp-op-veic': {
          const ordem = Object.keys(VEICULOS);
          veic = ordem[(ordem.indexOf(veic) + 1) % ordem.length];
          q('#rp-op-veic').textContent = VEICULOS[veic];
          q('#rp-op-chega').textContent = veic === 'qualquer' ? 'bike ou patinete' : (veic === 'bike' ? 'bike elétrica' : 'patinete elétrico');
          break;
        }
        case 'rp-op-pag': op.avisar('Você paga com Pix direto pro motorista, quando chegar. Cartão ainda não.'); break;
        case 'rp-pedir': pedir(false); break;
        case 'rp-pagar': irPagar(); break;
        default:
      }
    });
    q('#rp-busca').addEventListener('input', buscarAgora);
    q('#rp-busca').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(buscaTimer); buscarAgora(); } });
    q('#rp-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = q('#rp-chat-in');
      mandarMsg(campo.value);
      campo.value = '';
    });
    q('#rp-carro-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const modelo = q('#rp-carro-modelo').value.trim();
      const cor = q('#rp-carro-cor').value.trim().toLowerCase();
      const placa = q('#rp-carro-placa').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cambio = ($('#rp-carro [aria-checked="true"]', raiz) || {}).dataset?.cambio || 'automático';
      const erro = q('#rp-carro-erro');
      if (modelo.length < 2) { erro.hidden = false; erro.textContent = 'Qual é o modelo? Onix, HB20, Corolla…'; return; }
      if (cor.length < 3) { erro.hidden = false; erro.textContent = 'E a cor do carro?'; return; }
      if (placa && !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) { erro.hidden = false; erro.textContent = 'A placa parece incompleta. Pode deixar em branco.'; return; }
      eu().carro = { modelo: modelo[0].toUpperCase() + modelo.slice(1), cor, placa, cambio };
      op.salvar();
      fecharFolha();
      op.avisar('Carro salvo.');
      if (atual === 'opcoes') q('#rp-op-carro').textContent = `${eu().carro.modelo} ${cor} · ${cambio}`;
      if (atual === 'perfil') desenharPerfil();
    });
    q('#rp-contato-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = q('#rp-contato-nome').value.trim();
      const cel = digitos(q('#rp-contato-cel').value);
      const erro = q('#rp-contato-erro');
      if (nome.length < 2) { erro.hidden = false; erro.textContent = 'Coloca o nome da pessoa.'; return; }
      if (!/^[1-9][1-9]9\d{8}$/.test(cel)) { erro.hidden = false; erro.textContent = 'O celular precisa do DDD e do 9 na frente.'; return; }
      const u = eu();
      u.contatos = [...(u.contatos || []), { nome, cel: `(${cel.slice(0, 2)}) ${cel.slice(2, 7)}-${cel.slice(7)}` }].slice(0, 5);
      op.salvar();
      fecharFolha();
      desenharPerfil();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && folha && !raiz.hidden) { e.preventDefault(); fecharFolha(); }
    });

    /* ---------- abrir e fechar o modo ---------- */
    function abrir() {
      ligarGps();
      const u = eu();
      if (u && u.corrida && !corrida) {
        const c = u.corrida;
        if (c.simulada || Date.now() - c.t0 > 6 * 3600000) { delete u.corrida; op.salvar(); }
        else {
          corrida = c;
          canal = R.canal;
          destino = c.destino;
          embarque = c.embarque;
          assinarCorrida();
          avisos().definir('passageiro', [R.topico.aviso(c.id, 'p')]);
          const tela = { buscando: 'buscando', 'a-caminho': 'caminho', chegou: 'caminho', preparo: 'preparo', viagem: 'viagem', chegada: 'chegou', pagando: 'pix' }[c.etapa] || 'inicio';
          if (c.etapa === 'buscando') {
            if (Date.now() > c.t0 + PRAZO_BUSCA) { semMotorista(); return; }
            ir('buscando', { foco: false });
            contarPrazo(c.t0 + PRAZO_BUSCA);
            return;
          }
          if (c.compartilhada) ligarRastreio();
          ir(tela, { foco: false });
          return;
        }
      }
      ir('inicio', { foco: false });
    }
    function fechar() {
      vigiarOnline(false);
      fecharFolha();
      if (soltarGps && !corrida) { soltarGps(); soltarGps = null; }
    }
    // voltar do aparelho: devolve true se tratou
    function voltar() {
      if (folha) { fecharFolha(); return true; }
      const mapaVolta = { destino: modoBusca === 'destino' ? 'inicio' : (voltarPara || 'perfil'), 'no-mapa': 'destino', opcoes: 'destino', ninguem: 'opcoes', viagens: 'inicio', carteira: 'inicio', perfil: 'inicio', pix: 'chegou' };
      if (atual === 'buscando' || atual === 'caminho') { op.avisar('Pra desistir, toca em Cancelar.'); return true; }
      if (mapaVolta[atual]) { if (atual === 'destino') modoBusca = 'destino'; ir(mapaVolta[atual]); return true; }
      if (atual === 'inicio') return false;
      op.avisar('A corrida está acontecendo. Termina por aqui mesmo.');
      return true;
    }
    function sair() {
      if (corrida) encerrar();
      fechar();
      destino = null;
      rota = null;
      embarqueManual = false;
      embarque = null;
      ultimoEndereco = null;
    }

    return { abrir, fechar, voltar, sair, ir: (nome) => ir(nome, { foco: false }), telaAtual: () => atual, corridaAtiva: () => Boolean(corrida), folhaAberta: () => Boolean(folha) };
  }

  /* ---------- acompanhar a viagem de alguém pelo link ---------- */
  function acompanhar(raiz, id, chave) {
    const q = (s) => $(s, raiz);
    const mapa = Mapa.criar(q('#mapa-a'), { centro: S.BH, zoom: 13 });
    mapa.folga(() => q('.rt-folha').getBoundingClientRect().height);
    setTimeout(() => mapa.ajustar(), 50);
    let primeira = true;
    let ultima = 0;
    function mostrarIdade() {
      if (!ultima) return;
      const s = Math.round((Date.now() - ultima) / 1000);
      q('#ac-vivo').textContent = s < 60 ? 'Ao vivo' : `Atualizado há ${Math.round(s / 60)} min`;
    }
    setInterval(mostrarIdade, 15000);
    R.canal.assinar([R.topico.rastreio(id)], async (env) => {
      if (!env || env.v !== 1 || !env.iv) return;
      let d;
      try { d = await R.decifrar(chave, env); } catch (e) { return; }
      if (!d || !ponto(d)) return;
      if (d.destino && !ponto(d.destino)) d.destino = null;
      ultima = Number.isFinite(d.t) ? d.t : Date.now();
      mostrarIdade();
      const p = { lat: d.lat, lon: d.lon };
      mapa.ponto('carro', p, Mapa.ICONE.carro());
      if (d.destino) mapa.ponto('destino', d.destino, Mapa.ICONE.destino());
      q('#ac-t').textContent = d.etapa === 'chegou' ? `${d.quem || 'A pessoa'} chegou em casa` : `${d.quem || 'Alguém'} está voltando com o Drink`;
      q('#ac-txt').textContent = d.etapa === 'chegou'
        ? `Chegou em ${d.destino ? d.destino.nome : 'casa'}. Carro na garagem.`
        : `Indo para ${d.destino ? [d.destino.nome, d.destino.bairro].filter(Boolean).join(' · ') : 'casa'}${d.eta ? ` · chega por volta de ${d.eta}` : ''}${d.motorista ? ` · dirigindo: ${d.motorista}` : ''}`;
      if (primeira) { mapa.enquadrar([p, d.destino].filter(Boolean)); primeira = false; }
    }, { desde: '12h' });
  }

  window.Drink.Passageiro = { criar, acompanhar };
}());
