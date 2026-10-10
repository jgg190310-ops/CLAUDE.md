/* Drink — o app do passageiro, de verdade: GPS e mapa reais, busca de endereço, rota e preço calculados,
   pedido para os motoristas online, o Drink chegando no mapa, código conferido entre os dois celulares,
   chat, viagem ao vivo com link para a família e pagamento por Pix direto para o motorista. */
(function () {
  'use strict';

  const { $, $$, brl, brl0, hhmm, esc, reduzirMovimento, taxaEspera, PRECO } = window.Drink.util;
  const S = window.Drink.servicos;
  const PF = window.Drink.perfil;
  const R = window.Drink.rede;
  const Mapa = window.Drink.mapa;
  const PIX = window.Drink.pix;
  const CARROS = window.Drink.carros;
  const EV = window.Drink.Eventos;

  const PRAZO_BUSCA = 3 * 60 * 1000;
  const VEICULOS = { qualquer: 'Tanto faz', bike: 'Bike', patinete: 'Patinete' };
  const TAGS = {
    boas: window.Drink.perfil.ELOGIOS,
    ruins: ['Atrasou', 'Dirigiu rápido', 'Pouco cuidado com o carro', 'Outro motivo'],
  };
  const FOTOS = ['Frente', 'Traseira', 'Esquerda', 'Direita', 'Painel'];
  const redondo = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
  const iniciais = (nome) => String(nome || '').replace(/\(.*?\)/g, '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const primeiroNome = (nome) => String(nome || '').trim().split(' ')[0] || 'O Drink';
  // o avatar do motorista: o rosto dele (a selfie do cadastro) ou as iniciais
  function rosto(el, m) {
    el.textContent = iniciais(m.nome);
    el.style.backgroundImage = m.foto ? `url("${m.foto}")` : '';
    el.classList.toggle('com-foto', Boolean(m.foto));
  }
  const nomeCurto = (u) => [u.nome, u.sobrenome ? `${u.sobrenome.trim()[0]}.` : ''].filter(Boolean).join(' ');
  const digitos = (s) => String(s).replace(/\D/g, '');
  // o carro com placa de verdade; sem placa (conta antiga), o app pede antes da primeira corrida
  const carroPronto = (c) => Boolean(c && c.modelo && c.cor && CARROS.placa.valida(CARROS.placa.limpar(c.placa)));
  const nomeCarro = (c) => `${c.modelo} ${c.cor}`;
  // a nota que os motoristas deram (média das últimas), como nos apps de corrida
  function minhaNota(u) {
    const l = ((u && u.notasRecebidas) || []).filter((n) => n >= 1 && n <= 5);
    return l.length ? redondo(l.reduce((s, n) => s + n, 0) / l.length, 1) : 0;
  }
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
    const canal = R.canal;
    let assinatura = null;
    let fila = Promise.resolve();
    let timers = [];
    let rastreioTimer = 0;
    let gpsNegado = false;
    let embarqueManual = false;

    const agendar = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const limparTimers = () => { timers.forEach(clearTimeout); timers = []; };

    // a aba Eventos, de quem organiza (a busca do lugar do evento usa a mesma tela de endereço)
    const painel = EV.criar({
      raiz, eu, salvar: op.salvar, avisar: op.avisar, copiar: (t, ok) => copiar(t, ok),
      ir: (nome) => ir(nome), atual: () => atual, abrirFolha: (id) => abrirFolha(id), fecharFolha: () => fecharFolha(),
      buscarLugar: () => { voltarPara = 'evento-novo'; modoBusca = 'evento'; ir('destino'); },
    });
    const TELAS_EVENTO = ['eventos', 'evento', 'evento-novo'];

    /* ---------- mapa e GPS ---------- */
    function garantirMapa() {
      if (mapa) return mapa;
      mapa = Mapa.criar(q('#mapa-p'), { centro: pos || S.BH, zoom: 15 });
      mapa.aoMover(() => { if (atual === 'no-mapa') lerMeio(); });
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
        if (atual === 'opcoes') avisoPrecisao();
        if (mapa && !(corrida && corrida.etapa === 'viagem')) mapa.ponto('voce', p, Mapa.ICONE.voce());
        if (primeira && atual === 'inicio') { centrarEmMim(); desenharAtalhos(); }
        if (!corrida) atualizarEmbarque();
        if (corrida && corrida.etapa === 'viagem' && !corrida.simulada) andarNaViagem(p);
      });
    }
    // o embarque é onde você está (o nome da rua vem do endereço mais perto), ou o lugar que você escolheu
    const juntar = (l) => [l.nome, l.bairro && l.bairro !== l.nome ? l.bairro : ''].filter(Boolean).join(' · ');
    // o GPS ainda está aproximado (só a rede e o wi-fi, ou lugar fechado): melhor a pessoa conferir o embarque
    const PRECISAO_RUIM = 150;
    const aproximado = () => Boolean(!embarqueManual && pos && pos.precisao > PRECISAO_RUIM);
    const margem = () => S.textoKm(Math.round(pos.precisao / 50) * 50 / 1000);
    function avisoPrecisao() {
      const a = q('#rp-op-gps');
      a.hidden = !aproximado();
      if (!a.hidden) a.textContent = `Sua localização está aproximada (margem de uns ${margem()}). Confere o embarque antes de pedir.`;
    }
    function mostrarEmbarque() {
      if (embarqueManual && embarque) q('#rp-local').textContent = `Embarque em ${juntar(embarque)}`;
      else if (ultimoEndereco && aproximado()) q('#rp-local').textContent = `Perto de ${juntar(ultimoEndereco.lugar)} · margem de uns ${margem()}`;
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
    /* ---------- convidado de um evento (veio pelo QR do convite) ---------- */
    let conviteAplicado = '';
    function desenharConvite() {
      const e = EV.convite();
      const box = q('#rp-evento');
      box.hidden = !e;
      if (!e) return;
      const sit = EV.situacao(e);
      q('#rp-evento-t').textContent = e.nome;
      q('#rp-evento-sub').textContent = sit === 'antes'
        ? `Começa ${EV.quandoTxt(e)}. ${e.paga === 'evento' ? 'A volta por conta do evento' : 'O Drink saindo de lá'} vale a partir daí.`
        : (e.paga === 'evento'
          ? `A volta é por conta do evento, até ${brl0(e.teto)}. O Drink busca você em ${e.lugar.nome}.`
          : `O Drink busca você em ${e.lugar.nome}. Você paga pelo Pix, direto para o motorista.`);
      // o embarque vai para o lugar do evento uma vez; se a pessoa trocar, vale a escolha dela
      if (sit !== 'antes' && !corrida && conviteAplicado !== e.id) {
        conviteAplicado = e.id;
        embarque = { nome: e.lugar.nome, bairro: e.lugar.bairro, lat: e.lugar.lat, lon: e.lugar.lon };
        embarqueManual = true;
        mostrarEmbarque();
      }
    }
    function sairDoConvite() {
      const e = EV.convite();
      EV.esquecerConvite();
      q('#rp-evento').hidden = true;
      if (e && embarqueManual && embarque && S.distancia(embarque, e.lugar) < 30) {
        embarqueManual = false;
        embarque = null;
        atualizarEmbarque();
        mostrarEmbarque();
      }
      conviteAplicado = '';
      op.avisar('Pronto, você saiu do convite do evento.');
    }
    // quantas voltas o evento já pagou (e se quem organiza encerrou): lido no canal do evento, no máximo a cada minuto
    let usoEvento = null;
    const voltasAcabaram = (e) => Boolean(usoEvento && usoEvento.id === e.id && (usoEvento.encerrado || usoEvento.n >= e.voltas));
    function conferirVoltas(e) {
      if (usoEvento && usoEvento.id === e.id && Date.now() - usoEvento.t < 60000) return;
      usoEvento = { id: e.id, t: Date.now(), n: 0, encerrado: false };
      EV.voltasUsadas(e).then((uso) => {
        usoEvento = { id: e.id, t: Date.now(), ...uso };
        if (atual === 'opcoes' && rota && !corrida) desenharParteEvento(S.preco(rota.km).total);
      }).catch(() => { usoEvento = null; });
    }
    // a volta de agora sai do evento? e o evento paga?
    function eventoDaVolta() {
      const e = EV.convite();
      if (!e || !embarque) return null;
      if (S.distancia(embarque, e.lugar) > EV.PERTO_DO_EVENTO) {
        return { e, daqui: false, cobre: false, fora: e.paga === 'evento' ? 'O evento só paga a volta que sai de lá. Esse embarque é em outro lugar.' : '' };
      }
      if (e.paga === 'evento' && EV.situacao(e) === 'antes') return { e, daqui: true, cobre: false, fora: `A volta por conta do evento vale a partir de ${e.inicio}.` };
      if (EV.cobre(e, embarque) && voltasAcabaram(e)) {
        return { e, daqui: true, cobre: false, fora: usoEvento.encerrado ? 'Quem organiza encerrou as voltas pagas: essa você paga pelo Pix.' : 'As voltas pagas pelo evento acabaram: essa você paga pelo Pix.' };
      }
      return { e, daqui: true, cobre: EV.cobre(e, embarque), fora: '' };
    }
    // a parte da volta que o evento paga: a corrida e a espera, até o teto (a gorjeta é de quem dá)
    function parteEvento(c) {
      if (!c || !c.evento || !(c.evento.teto > 0)) return 0;
      return redondo(Math.min(c.valor + (c.espera || 0), c.evento.teto));
    }
    const reciboEvento = (c) => (parteEvento(c) ? { nome: c.evento.nome, valor: parteEvento(c) } : null);

    function centrarEmMim() {
      garantirMapa();
      mapa.centrar(pos || S.BH, 15.5);
    }
    // a folha de baixo cobre parte do mapa: o mapa precisa saber quanto
    function medirFolha(tela) {
      const f = $('.rt-folha', tela);
      if (mapa) mapa.folga(f || 0);
    }

    /* ---------- Drinks online por perto ---------- */
    // os que estão perto agora (a posição deles vem arredondada, uns 500 m): servem para estimar quanto o mais perto demora
    let pertoAgora = [];
    // bike ou patinete na cidade: uns 16 km/h, pelas ruas (a reta vezes 1,3), mais 1 min para sair
    function maisPerto(ref) {
      if (!ref || !pertoAgora.length) return null;
      const km = Math.min(...pertoAgora.map((o) => S.distancia(ref, o.p))) / 1000;
      return { km, min: Math.max(2, Math.round(((km * 1.3) / 16) * 60 + 1)) };
    }
    async function lerOnline() {
      try {
        const lista = await R.canal.ler(R.topico.online(), '11m');
        const ultimos = new Map();
        lista.forEach(({ corpo }) => {
          if (corpo && corpo.v === 1 && typeof corpo.d === 'string' && Number.isFinite(corpo.t)) ultimos.set(corpo.d, corpo);
        });
        const agora = Date.now();
        const eu0 = eu();
        const vivos = [...ultimos.values()].filter((o) => o.tipo === 'online' && agora - o.t < 11 * 60000 && o.d !== (eu0 && eu0.idMotorista));
        // perto: até uns 6 km do embarque (motorista de bike não atravessa a cidade para buscar ninguém)
        const ref = embarque || pos;
        const perto = ref ? vivos.filter((o) => ponto(o.p) && S.distancia(ref, o.p) <= 6000) : vivos;
        pertoAgora = perto.filter((o) => ponto(o.p));
        const mp = maisPerto(ref);
        q('#rp-online-eta').textContent = mp ? ` · chega em uns ${mp.min} min` : '';
        if (atual === 'opcoes' && rota) desenharTempo();
        const txt = q('#rp-online-txt');
        if (perto.length) txt.textContent = `${perto.length} ${perto.length === 1 ? 'Drink online' : 'Drinks online'} perto de você`;
        else if (vivos.length) txt.textContent = `Nenhum Drink perto agora · ${vivos.length} na cidade`;
        else txt.textContent = 'Nenhum Drink online agora';
        q('#rp-online').classList.toggle('vazio', !perto.length);
        desenharAvise(perto.length);
        if (mapa && atual === 'inicio') mapa.online(vivos.filter((o) => ponto(o.p)).map((o) => ({ lat: o.p.lat, lon: o.p.lon, veic: o.veic, id: o.d })));
      } catch (e) {
        pertoAgora = [];
        q('#rp-online-eta').textContent = '';
        q('#rp-online-txt').textContent = 'Sem conexão com a central';
        q('#rp-online').classList.add('vazio');
      }
    }
    /* ---------- me avise quando tiver Drink perto ---------- */
    const esperaAtiva = () => { const e = (eu() || {}).aviseOnline; return Boolean(e && e.ate > Date.now()); };
    function pararEspera() {
      const u = eu();
      if (!u || !u.aviseOnline) return;
      delete u.aviseOnline;
      op.salvar();
      avisos().definir('espera', []);
    }
    function desenharAvise(nPerto) {
      const bt = q('#rp-avise');
      if (!bt) return;
      if (!esperaAtiva() && (eu() || {}).aviseOnline) pararEspera();
      // já tem Drink perto: o aviso cumpriu o papel
      if (nPerto > 0 && esperaAtiva()) { pararEspera(); op.avisar('Tem Drink online perto de você agora.'); }
      const on = esperaAtiva();
      bt.hidden = nPerto > 0 && !on;
      // sem Drink perto, dá para ver como funciona numa simulação
      q('#rp-ver-sim').hidden = nPerto > 0;
      bt.setAttribute('aria-pressed', String(on));
      q('#rp-avise-t').textContent = on ? 'Vamos te avisar quando tiver Drink perto' : 'Me avise quando tiver Drink perto';
      q('#rp-avise-sub').textContent = on
        ? `Aviso ligado até as ${hhmm(new Date(eu().aviseOnline.ate))}. Toca para desligar.`
        : 'Chega uma notificação quando alguém ficar online na sua região.';
    }
    function pedirAviso() {
      if (esperaAtiva()) { pararEspera(); desenharAvise(0); op.avisar('Pronto, aviso desligado.'); return; }
      const ref = embarque || pos;
      if (!ref) { op.avisar('Ainda não achei você no mapa.'); return; }
      // a permissão precisa ser pedida já no toque (o iPhone só pergunta assim)
      const pedido = avisos().pedir();
      const u = eu();
      u.aviseOnline = { ate: Date.now() + 2 * 3600000 };
      op.salvar();
      avisos().definir('espera', R.topico.regioesOnline(ref, 3));
      desenharAvise(0);
      pedido.then((est) => {
        if (est === 'ligado') { op.avisar('Combinado: quando um Drink ficar online perto, o celular avisa.'); return; }
        pararEspera();
        desenharAvise(0);
        op.avisar({
          instalar: 'No iPhone, instala o Drink na tela de início para receber avisos.',
          bloqueado: 'Os avisos do Drink estão bloqueados. Libera nas configurações do navegador.',
        }[est] || 'Esse navegador não recebe avisos com o app fechado. Deixa o app aberto que a contagem atualiza sozinha.');
      });
    }

    function vigiarOnline(ligado) {
      clearInterval(onlineTimer);
      onlineTimer = 0;
      if (!ligado) { if (mapa) mapa.online([]); return; }
      lerOnline();
      onlineTimer = setInterval(lerOnline, 30000);
    }

    /* ---------- telas ---------- */
    const COM_ABAS = ['inicio', 'viagens', 'eventos', 'carteira', 'perfil'];
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
      painel.mostrar(TELAS_EVENTO.includes(nome));
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
        desenharRecentes();
        q('#rp-gps').hidden = !gpsNegado;
        if (!ultimoEndereco && pos) atualizarEmbarque();
        desenharConvite();
      },
      destino() {
        const campo = q('#rp-busca');
        campo.value = '';
        const titulos = { destino: 'Para onde?', embarque: 'Onde o Drink te busca?', casa: 'Onde é a sua casa?', trabalho: 'Onde você trabalha?', evento: 'Onde vai ser o evento?' };
        q('#rp-dest-t').textContent = titulos[modoBusca];
        q('#rp-de-linha').hidden = modoBusca !== 'destino';
        q('.rt-campos').classList.toggle('so-embarque', modoBusca === 'embarque' || modoBusca === 'evento');
        q('#rp-de').textContent = (embarque && embarque.nome) || 'Sua localização';
        campo.placeholder = { embarque: 'Rua e número, bar, praça…', evento: 'Salão, bar, casa de show ou endereço…' }[modoBusca] || 'Endereço, bar, bairro…';
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
      buscando() { resumoBusca(); },
      caminho() { mostrarCaminho(); },
      preparo() { mostrarPreparo(); },
      viagem() { mostrarViagem(); },
      chegou() { mostrarChegada(); },
      pix() { mostrarPix(); },
      viagens() { desenharHistorico(); },
      carteira() { desenharCarteira(); },
      perfil() { desenharPerfil(); },
      eventos() { painel.lista(); },
      'evento-novo'() { painel.desenharForm(); },
      evento() { painel.pagina(); },
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
        return `<button type="button" data-rp-salvar="${tipo}"><svg aria-hidden="true"><use href="#${icone}"/></svg><span><b>${titulo}</b><small>Adicionar</small></span></button>`;
      };
      q('#rp-atalhos').innerHTML = item('casa', 'i-casa', 'Casa') + item('trabalho', 'i-maleta', 'Trabalho');
    }

    // os últimos destinos (das voltas de verdade), para pedir de novo com um toque
    let recentes = [];
    function desenharRecentes() {
      const u = eu();
      const vistos = new Set();
      recentes = ((u && u.voltas) || []).map((v) => v.destino).filter((d) => d && ponto(d) && !vistos.has(d.nome) && vistos.add(d.nome)).slice(0, 3);
      const caixa = q('#rp-recentes');
      caixa.hidden = !recentes.length;
      caixa.innerHTML = recentes.map((d, i) => `<button type="button" data-recente="${i}"><svg aria-hidden="true"><use href="#i-relogio"/></svg><span>${esc(d.bairro && d.bairro !== d.nome ? `${d.nome} · ${d.bairro}` : d.nome)}</span></button>`).join('');
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
      if ((modoBusca === 'embarque' || modoBusca === 'evento') && pos) {
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
      q('#rp-res-t').textContent = lista.length ? 'Salvos e recentes' : 'Dá para buscar por';
      q('#rp-dicas').hidden = lista.length > 0;
      q('#rp-resultados').innerHTML = lista.map((l, i) => linhaLugar(l, i, l.icone)).join('');
    }
    function buscarAgora() {
      const texto = q('#rp-busca').value.trim();
      clearTimeout(buscaTimer);
      if (texto.length < 3) { mostrarSalvos(); return; }
      q('#rp-dicas').hidden = true;
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
      if (modo === 'evento') {
        // "onde estou agora": o endereço do GPS, com o ponto exato
        const aqui = l.gps && pos ? { ...(ultimoEndereco ? ultimoEndereco.lugar : { nome: 'Local do evento', bairro: '' }), lat: pos.lat, lon: pos.lon } : lugar;
        painel.lugarEscolhido(aqui);
        ir('evento-novo');
        return;
      }
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
      q('#rp-op-carro').textContent = carroPronto(u.carro) ? `${nomeCarro(u.carro)} · ${CARROS.placa.formatar(u.carro.placa)}` : (u.carro ? 'Falta a placa' : 'Cadastrar');
      const bt = q('#rp-pedir');
      bt.disabled = true;
      bt.textContent = 'Pedir Drink';
      q('#rp-simular').disabled = true;
      q('#rp-op-ev').hidden = true;
      avisoPrecisao();
      q('#rp-op-pag').textContent = 'Pix na chegada';
      // a cada preço novo, confere de novo se o evento ainda paga (quem organiza pode ter encerrado)
      usoEvento = null;
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
      q('#rp-simular').disabled = false;
      desenharTempo();
      desenharParteEvento(p.total);
    }
    // por estimativa: o Drink mais perto até o embarque, a vistoria e a dobra (uns 5 min) e a rota até em casa
    const PREPARO_MIN = 5;
    function desenharTempo() {
      const lista = q('#rp-op-tempo');
      if (!rota || !embarque) { lista.hidden = true; return; }
      const mp = maisPerto(embarque);
      lista.hidden = false;
      lista.classList.toggle('sem-drink', !mp);
      q('#rp-op-t1').textContent = mp ? `uns ${mp.min} min` : 'sem Drink perto';
      q('#rp-op-t2').textContent = `uns ${PREPARO_MIN} min`;
      q('#rp-op-t3').textContent = mp ? `por volta de ${hhmm(new Date(Date.now() + (mp.min + PREPARO_MIN + Math.round(rota.min)) * 60000))}` : `${S.textoMin(rota.min)} de carro`;
    }
    function desenharParteEvento(total) {
      const linha = q('#rp-op-ev');
      const v = eventoDaVolta();
      if (v && v.cobre) conferirVoltas(v.e);
      q('#rp-op-pag').textContent = 'Pix na chegada';
      if (!q('#rp-pedir').disabled) q('#rp-pedir').textContent = `Pedir Drink · ${brl(total)}`;
      if (!v || (!v.cobre && !v.fora)) { linha.hidden = true; return; }
      linha.hidden = false;
      linha.classList.toggle('fora', !v.cobre);
      if (!v.cobre) { linha.textContent = v.fora; return; }
      const parte = Math.min(total, v.e.teto);
      const resto = redondo(total - parte);
      linha.textContent = resto > 0 ? `${v.e.nome} paga ${brl(parte)}. Você paga ${brl(resto)} pelo Pix.` : `Por conta de ${v.e.nome}: você não paga nada.`;
      q('#rp-op-pag').textContent = resto > 0 ? 'Evento + Pix' : 'Por conta do evento';
      q('#rp-pedir').textContent = resto > 0 ? `Pedir Drink · ${brl(resto)}` : 'Pedir Drink · por conta do evento';
    }

    // a conta do preço, antes de pedir
    function desenharPreco() {
      const km = rota ? rota.km : 0;
      const p = S.preco(km);
      let h = linhaRecibo('Saída', brl(p.saida))
        + linhaRecibo(`${S.virgula(redondo(km, 1))} km × ${brl(PRECO.km)}`, brl(p.rodado));
      if (p.adicional) h += linhaRecibo('Bandeira 2 (+20%, de 0h às 5h)', brl(p.adicional));
      h += linhaRecibo('Total, com Pix na chegada', brl(p.total), 't-total');
      q('#rp-preco-det').innerHTML = h;
      q('#rp-preco-espera').textContent = `Espera: ${PRECO.esperaGratis} min grátis depois que o Drink chega; depois, ${brl(PRECO.espera)} a cada ${PRECO.esperaBloco} min.`;
    }

    /* ---------- a corrida ---------- */
    const avisos = () => window.Drink.avisos;
    // aviso curto no celular do motorista (só em corrida de verdade, depois que ele aceitou)
    function avisarMotorista(tipo) {
      if (corrida && corrida.motorista && !corrida.simulada) avisos().mandar(R.topico.aviso(corrida.id, 'm'), tipo);
    }
    // aviso no celular da passageira (aparece com o app fechado); na simulação, fica só o aviso dentro do app
    function notificar(titulo, corpo) {
      if (!(corrida && corrida.simulada)) op.notificar(titulo, corpo);
    }
    function salvarCorrida() {
      const u = eu();
      if (!u) return;
      if (corrida) u.corrida = corrida;
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
      // na simulação, quem recebe é o motorista simulado, no próprio celular: nada vai para a rede
      if (corrida.simulada) { simRecebe(obj); return; }
      const chave = para ? para.chave : corrida.chave;
      const pub = para ? para.pub : corrida.motorista.pub;
      const topico = R.topico.corrida(corrida.id);
      const env = { v: 1, de: 'p', para: pub.slice(0, 16), ...(await R.cifrar(chave, obj)) };
      // pela fila: com o sinal fraco, a mensagem espera e sai assim que der, na ordem
      R.fila.mandar(topico, env);
    }

    let pedindo = false;
    async function pedir() {
      if (pedindo) return;
      pedindo = true;
      try { await pedirAgora(); } finally { pedindo = false; }
    }
    async function pedirAgora() {
      const u = eu();
      if (esperaAtiva()) pararEspera();
      op.pedirNotificacao();
      if (!R.cifraPronta) { op.avisar('Esse navegador não tem a proteção que o Drink usa. Tenta no Chrome ou no Safari atualizados.'); return; }
      if (!carroPronto(u.carro)) {
        abrirFolha('rp-carro');
        q('#rp-carro-erro').hidden = false;
        q('#rp-carro-erro').textContent = u.carro ? 'Falta a placa do seu carro: é por ela que o Drink acha ele na rua.' : 'Antes de pedir, conta qual é o seu carro e a placa dele.';
        return;
      }
      if (!rota || !embarque || !destino) { op.avisar('Espera a rota aparecer no mapa e toca de novo.'); return; }
      // saindo de um evento: a volta leva o evento junto (o motorista manda a conta para ele, se ele paga)
      const v = eventoDaVolta();
      let evento = null;
      if (v && v.daqui) {
        evento = { id: v.e.id, chave: v.e.chave, nome: v.e.nome, teto: v.cobre ? v.e.teto : 0 };
        if (v.cobre) {
          // antes de pedir, confere se as voltas pagas não acabaram (ou se quem organiza encerrou)
          const uso = await Promise.race([EV.voltasUsadas(v.e).catch(() => null), new Promise((ok) => { setTimeout(() => ok(null), 4000); })]);
          if (uso) usoEvento = { id: v.e.id, t: Date.now(), ...uso };
          if (uso && (uso.encerrado || uso.n >= v.e.voltas)) {
            evento.teto = 0;
            op.avisar(uso.encerrado ? 'Quem organiza encerrou as voltas pagas. Essa você paga pelo Pix.' : 'As voltas pagas pelo evento acabaram. Essa você paga pelo Pix.');
          }
        }
      }
      if (corrida) return;
      const par = await R.novoPar();
      const agora = Date.now();
      const p = S.preco(rota.km);
      corrida = {
        id: R.idAleatorio(), t0: agora, etapa: 'buscando',
        embarque: { ...embarque }, destino: { ...destino }, km: redondo(rota.km, 1), min: Math.round(rota.min), linha: rota.linha,
        valor: redondo(p.total), saida: p.saida, rodado: redondo(p.rodado), adicional: redondo(p.adicional),
        veic, carro: { ...u.carro },
        codigo: String(1000 + Math.floor(Math.random() * 9000)),
        priv: par.priv, pub: par.pub, rastreio: R.novaChave(), segredo: R.idAleatorio(),
        motorista: null, chave: null, ultimo: null, msgs: [], fotos: 0, malas: false,
        nota: 0, tags: [], gorjeta: 0, cobranca: null, paguei: false, compartilhada: false, evento,
      };
      privada = par.privada;
      salvarCorrida();
      assinarCorrida();
      const pedido = {
        v: 1, tipo: 'pedido', id: corrida.id, t: agora, expira: agora + PRAZO_BUSCA, pub: par.pub,
        de: { bairro: embarque.bairro || 'BH', ...S.aproximar(embarque) },
        para: { bairro: destino.bairro || destino.nome },
        km: corrida.km, min: corrida.min, valor: corrida.valor, veic, cambio: u.carro.cambio, nota: minhaNota(u),
        fecho: await R.resumo(corrida.segredo),
        // o pedido aberto só diz que é de um evento e até quanto ele paga (o nome vai cifrado, depois do aceite)
        ev: evento ? { teto: evento.teto } : undefined,
      };
      ir('buscando');
      q('#rp-bu-sub').textContent = `O pedido foi para os Drinks online perto ${embarque.bairro ? `de ${embarque.bairro}` : 'de você'}.`;
      try {
        await canal.publicar(R.topico.pedidos(), pedido);
      } catch (e) {
        encerrar();
        ir('ninguem');
        q('#rp-ni-t').textContent = 'Sem conexão com a central';
        q('#rp-ni-sub').textContent = 'O pedido não saiu do seu celular. Confere a internet e tenta de novo.';
        return;
      }
      // o mesmo pedido no canal da região do embarque: é por ele que chega o aviso no celular de quem está perto
      R.fila.mandar(R.topico.regiao(embarque), pedido, { validade: 3 * 60000 });
      avisos().definir('passageiro', [R.topico.aviso(corrida.id, 'p')]);
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
      q('#rp-ni-sub').textContent = 'Pode ser que ninguém esteja online perto de você agora. Tenta de novo daqui a pouco.';
    }
    function publicarFechado() {
      if (!corrida || corrida.simulada) return;
      R.fila.mandar(R.topico.fechados(), { v: 1, tipo: 'fechado', id: corrida.id, segredo: corrida.segredo }, { validade: 10 * 60000 });
    }
    function encerrar() {
      if (corrida && !corrida.simulada) avisos().definir('passageiro', []);
      limparTimers();
      pararSim();
      clearInterval(rastreioTimer);
      if (assinatura) { assinatura.fechar(); assinatura = null; }
      corrida = null;
      privada = null;
      salvarCorrida();
      marcarSim();
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
            corridas: Number(m.corridas) || 0, veiculo: m.veiculo === 'patinete' ? 'patinete' : 'bike',
            ...PF.limpar(m),
          };
          c.chave = chave;
          c.pos = ponto(msg.pos) ? { lat: msg.pos.lat, lon: msg.pos.lon } : null;
          c.etapa = 'a-caminho';
          c.aceiteEm = Date.now();
          limparTimers();
          const u = eu();
          enviar({
            tipo: 'confirmado',
            passageiro: { nome: nomeCurto(u) },
            embarque: { lat: c.embarque.lat, lon: c.embarque.lon, nome: c.embarque.nome, bairro: c.embarque.bairro },
            destino: { lat: c.destino.lat, lon: c.destino.lon, nome: c.destino.nome, bairro: c.destino.bairro },
            carro: c.carro, valor: c.valor, km: c.km,
            evento: c.evento || undefined,
          });
          avisarMotorista('confirmado');
          publicarFechado();
          notificar(`${primeiroNome(c.motorista.nome)} aceitou`, 'O Drink está indo até você.');
          ir('caminho');
          break;
        }
        case 'pos':
          if (!ponto(msg)) return;
          c.pos = { lat: msg.lat, lon: msg.lon, t: Date.now() };
          if (atual === 'caminho') atualizarChegando();
          break;
        case 'perto':
          if (c.etapa === 'a-caminho' && !c.avisouPerto) {
            c.avisouPerto = true;
            notificar(`${nome} está chegando`, 'Uns 2 minutos. Vai saindo para encontrar o Drink.');
            if (!document.hidden) op.avisar(`${nome} está chegando: uns 2 minutos.`);
            if (atual === 'caminho') mostrarCaminho();
          }
          break;
        case 'etapa':
          if (msg.etapa === 'chegou' && ['a-caminho'].includes(c.etapa)) {
            c.etapa = 'chegou';
            c.noEmbarque = Date.now();
            // a espera só conta se o motorista está mesmo no embarque
            c.chegouEm = ponto(msg.pos) && S.distancia(msg.pos, c.embarque) <= 350 ? Date.now() : 0;
            if (ponto(msg.pos)) c.pos = { lat: msg.pos.lat, lon: msg.pos.lon, t: Date.now() };
            notificar(`${nome} chegou`, 'Confere o código antes de entregar a chave.');
            if (atual === 'caminho') mostrarCaminho();
            vigiarEspera();
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
            // a espera que o motorista cobra não passa do que o celular do passageiro viu (com 2 min de folga)
            c.espera = Math.min(Math.max(0, Number(msg.espera) || 0), c.esperaMax || 0);
            clearInterval(rastreioTimer);
            publicarRastreio(true);
            notificar('Chegou!', totalAtual() > 0 ? 'Avalia a corrida e paga com Pix.' : 'Avalia a corrida. A volta é por conta do evento.');
            ir('chegou');
          }
          break;
        case 'codigo': {
          const ok = String(msg.valor) === c.codigo;
          enviar({ tipo: 'codigo-ok', ok });
          if (ok && ['a-caminho', 'chegou'].includes(c.etapa)) {
            c.codigoEm = Date.now();
            c.esperaMax = taxaEspera(c.codigoEm - (c.chegouEm || c.codigoEm) + 120000);
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
          c.cobranca = { pix };
          if (atual === 'pix') mostrarPix();
          break;
        }
        case 'foto': {
          // o rosto do motorista chega em pedaços; só vale uma foto JPEG pequena
          const i = Number(msg.i);
          const n = Number(msg.n);
          if (!c.motorista || !Number.isInteger(i) || !Number.isInteger(n) || n < 1 || n > 12 || i < 0 || i >= n) return;
          if (typeof msg.parte !== 'string' || msg.parte.length > 2600 || !/^[A-Za-z0-9+/=]*$/.test(msg.parte)) return;
          if (c.fotoN !== n) { c.fotoN = n; c.fotoPartes = {}; }
          c.fotoPartes[i] = msg.parte;
          if (Object.keys(c.fotoPartes).length < n) return;
          const b64 = Array.from({ length: n }, (_, k) => c.fotoPartes[k]).join('');
          delete c.fotoPartes;
          delete c.fotoN;
          if (!b64.startsWith('/9j/') || b64.length > 31000) return;
          c.motorista.foto = `data:image/jpeg;base64,${b64}`;
          if (atual === 'caminho') mostrarCaminho();
          else if (atual === 'viagem') rosto(q('#rp-via-av'), c.motorista);
          rosto(q('#rp-chat-av'), c.motorista);
          break;
        }
        case 'recebido': {
          // a nota que o motorista deu para o passageiro vem junto
          const nota = Number(msg.nota);
          if (Number.isInteger(nota) && nota >= 1 && nota <= 5) c.notaRecebida = nota;
          if (c.etapa === 'pagando' || c.paguei) concluir();
          else { c.recebido = true; }
          break;
        }
        case 'msg':
          adicionarMsg('ele', String(msg.txt || '').slice(0, 300));
          break;
        case 'cancelado':
          if (['viagem', 'chegada', 'pagando'].includes(c.etapa)) return;
          notificar(`${nome} cancelou`, 'Você pode pedir outro Drink.');
          op.avisar(`${nome} cancelou a corrida. Pede de novo que outro Drink aceita.`);
          encerrar();
          ir(destino ? 'opcoes' : 'inicio');
          break;
        default:
      }
    }

    /* ---------- o Drink chegando ---------- */
    function veiculoTxt(v) { return v === 'patinete' ? 'patinete elétrico' : 'bike elétrica'; }
    // depois que o Drink chega: 10 min grátis, depois R$ 5 a cada 10 min
    function textoEspera(c) {
      if (!c.chegouEm) return '';
      const ms = Date.now() - c.chegouEm;
      const taxa = taxaEspera(ms);
      if (taxa) return ` · espera ${esc(brl(taxa))}`;
      const falta = Math.max(1, Math.ceil(PRECO.esperaGratis - ms / 60000));
      return ` · ${falta} min de espera grátis`;
    }
    let esperaTimer = 0;
    function vigiarEspera() {
      clearInterval(esperaTimer);
      esperaTimer = setInterval(() => {
        if (!corrida || corrida.etapa !== 'chegou' || atual !== 'caminho') { clearInterval(esperaTimer); return; }
        atualizarChegando();
      }, 15000);
    }
    function mostrarCaminho() {
      const c = corrida;
      if (!c || !c.motorista) return;
      const m = c.motorista;
      const nome = primeiroNome(m.nome);
      q('#rp-cam-t').textContent = c.etapa === 'chegou' ? `${nome} chegou` : (c.avisouPerto ? `${nome} está chegando` : `${nome} está a caminho`);
      rosto(q('#rp-mot-av'), m);
      q('#rp-mot-nome').textContent = m.nome;
      q('#rp-mot-info').textContent = c.simulada ? 'simulação' : notaCorridas(m);
      desenharVeiculo(m);
      q('#rp-codigo').textContent = c.codigo.split('').join(' ');
      q('#rp-codigo-txt').textContent = c.etapa === 'chegou'
        ? `Fala esse código pro ${nome}. Quando ele digitar no app, o seu celular confere e aí você entrega a chave.`
        : 'Fala esse código pro motorista quando ele chegar. Ele digita no app e o seu celular confere se é ele mesmo.';
      q('#rp-chat-t').textContent = m.nome;
      rosto(q('#rp-chat-av'), m);
      q('#rp-nova-msg').hidden = !c.novaMsg;
      if (c.etapa === 'chegou') vigiarEspera();
      mapa.limpar();
      mapa.ponto('embarque', c.embarque, Mapa.ICONE.embarque());
      if (pos) mapa.ponto('voce', pos, Mapa.ICONE.voce());
      atualizarChegando(true);
    }
    // a nota e as corridas, como nos apps de corrida ("4,9 · 23 corridas"), ou "novo no Drink"
    function notaCorridas(m) {
      const corridas = m.corridas ? `${m.corridas} ${m.corridas === 1 ? 'corrida' : 'corridas'}` : '';
      if (m.nota) return [S.virgula(m.nota), corridas].filter(Boolean).join(' · ');
      return corridas ? `${corridas} · ainda sem nota` : 'novo no Drink';
    }
    // a bike ou o patinete do motorista, com a cor que ele cadastrou
    function desenharVeiculo(m) {
      const v = { ...(m.veic || {}), tipo: m.veiculo };
      const c = PF.cor(v.cor);
      const caixa = q('#rp-mot-veic-box');
      caixa.style.setProperty('--veic', c ? c.hex : '');
      caixa.classList.toggle('com-cor', Boolean(c));
      q('#rp-mot-veic').setAttribute('href', v.tipo === 'patinete' ? '#i-patinete' : '#i-bike');
      q('#rp-mot-veic-nome').textContent = v.modelo || PF.curto(v.tipo);
      q('#rp-mot-veic-sub').textContent = [PF.corTxt(v.cor, v.tipo), 'dobrável'].filter(Boolean).join(' · ');
    }
    // o perfil de quem dirige, ao tocar na foto
    function desenharPerfilMotorista() {
      const c = corrida;
      if (!c || !c.motorista) return;
      const m = c.motorista;
      const nome = primeiroNome(m.nome);
      rosto(q('#rp-mot-foto'), m);
      q('#rp-mot-t').textContent = m.nome;
      const desde = PF.desdeTxt(m.desde);
      q('#rp-mot-desde').textContent = c.simulada ? 'Motorista da simulação: ninguém de verdade vai até você.' : (desde ? `Dirige com o Drink desde ${desde}` : 'Começou a dirigir com o Drink agora');
      q('#rp-mot-nota').textContent = m.nota ? S.virgula(m.nota) : '—';
      q('#rp-mot-corridas').textContent = String(m.corridas || 0);
      const meses = m.desde ? Math.floor((Date.now() - m.desde) / (30.4 * 864e5)) : 0;
      q('#rp-mot-tempo').textContent = !m.desde || meses < 1 ? 'novo' : (meses < 12 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : `${Math.floor(meses / 12)} ${meses < 24 ? 'ano' : 'anos'}`);
      // o veículo
      const v = { ...(m.veic || {}), tipo: m.veiculo };
      const cor = PF.cor(v.cor);
      q('#rp-mot-amostra').style.setProperty('--veic', cor ? cor.hex : '');
      q('#rp-mot-amostra').classList.toggle('com-cor', Boolean(cor));
      q('#rp-mot-amostra-ic').setAttribute('href', v.tipo === 'patinete' ? '#i-patinete' : '#i-bike');
      q('#rp-mot-veic-t').textContent = v.modelo ? `${v.modelo}${cor ? ` ${PF.corTxt(v.cor, v.tipo)}` : ''}` : `${PF.curto(v.tipo)}${cor ? ` ${PF.corTxt(v.cor, v.tipo)}` : ''}`;
      q('#rp-mot-veic-s').textContent = `${PF.texto(v.tipo)}: ${nome} chega com ${v.tipo === 'patinete' ? 'ele' : 'ela'}, dirige o seu carro e leva ${v.tipo === 'patinete' ? 'o patinete' : 'a bike'} no porta-malas.`;
      // os elogios
      const el = m.elogios || [];
      q('#rp-mot-elogios-t').hidden = !el.length;
      q('#rp-mot-elogios').hidden = !el.length;
      q('#rp-mot-elogios').innerHTML = el.map((e) => `<li><b>${esc(e.t)}</b><span>${e.n}×</span></li>`).join('');
      // o que o cadastro pediu: só aparece o que o motorista mandou
      const d = m.docs || {};
      const itens = [
        [d.selfie, 'i-camera', 'Rosto', 'A selfie do cadastro é esta foto'],
        [d.cnh, 'i-cnh', 'CNH com EAR', 'A carteira de motorista com atividade remunerada'],
        [d.antecedentes, 'i-escudo', 'Antecedentes criminais', 'A certidão da Polícia Federal'],
        [d.treino, 'i-capacete', 'Treino de segurança', 'Código, vistoria, dobra e direção'],
      ].filter(([ok]) => ok || !c.simulada);
      q('#rp-mot-docs').innerHTML = c.simulada
        ? '<li class="pendente"><svg aria-hidden="true"><use href="#i-capacete"/></svg><span><b>Simulação</b><small>Na corrida de verdade, aqui aparece o que o motorista mandou no cadastro.</small></span></li>'
        : itens.map(([ok, ic, t, sub]) => `<li class="${ok ? 'ok' : 'pendente'}"><svg aria-hidden="true"><use href="#${ic}"/></svg><span><b>${t}</b><small>${ok ? sub : 'Não veio no aceite'}</small></span><em>${ok ? 'enviado' : '—'}</em></li>`).join('');
    }
    // o pedido que está procurando Drink: de onde, para onde, o carro e o valor
    function resumoBusca() {
      const c = corrida;
      if (!c) return;
      const lugar = (l) => [l.nome, l.bairro].filter(Boolean).join(' · ');
      q('#rp-bu-de').textContent = lugar(c.embarque) || 'Onde você está';
      q('#rp-bu-para').textContent = lugar(c.destino) || '—';
      q('#rp-bu-carro').textContent = c.carro && c.carro.modelo ? `${nomeCarro(c.carro)}${c.carro.placa ? ` · ${CARROS.placa.formatar(CARROS.placa.limpar(c.carro.placa))}` : ''}` : '—';
      q('#rp-bu-valor').textContent = `${brl(c.valor)} · ${S.virgula(c.km)} km${c.adicional ? ' · bandeira 2' : ''}`;
    }
    /* ---------- o caminho do Drink até o embarque ---------- */
    // a rota de verdade do ponto onde o motorista está até o embarque: encurta conforme ele anda e é refeita
    // se ele sair dela; o tempo e os km do aviso saem dela (de bike ou patinete, uns 17 km/h na cidade)
    let aproximacao = null;
    let tracandoDesde = 0;
    function restoDaAproximacao(c) {
      if (!aproximacao || aproximacao.id !== c.id || !c.pos) return null;
      const linha = aproximacao.linha;
      let perto = 0;
      let menor = Infinity;
      linha.forEach(([lat, lon], i) => { const d = S.distancia(c.pos, { lat, lon }); if (d < menor) { menor = d; perto = i; } });
      if (menor > 220) return null;
      const resto = [[c.pos.lat, c.pos.lon], ...linha.slice(perto + 1)];
      let km = 0;
      for (let i = 0; i < resto.length - 1; i += 1) km += S.distancia({ lat: resto[i][0], lon: resto[i][1] }, { lat: resto[i + 1][0], lon: resto[i + 1][1] }) / 1000;
      return { linha: resto, km };
    }
    async function tracarAproximacao() {
      const c = corrida;
      if (!c || !c.pos || c.etapa !== 'a-caminho' || Date.now() - tracandoDesde < 30000) return;
      tracandoDesde = Date.now();
      const de = { lat: c.pos.lat, lon: c.pos.lon };
      let r = null;
      try { r = await S.rota(de, c.embarque); } catch (e) { r = null; }
      if (corrida !== c || c.etapa !== 'a-caminho' || !r || r.estimada || !r.linha || r.linha.length < 2) return;
      aproximacao = { id: c.id, linha: r.linha };
      tracandoDesde = 0;
      if (atual === 'caminho') atualizarChegando();
    }
    function atualizarChegando(enquadrar) {
      const c = corrida;
      if (!c || !c.motorista) return;
      const chip = q('#rp-eta');
      if (c.pos) {
        mapa.ponto('motorista', c.pos, Mapa.ICONE.motorista(c.motorista.veiculo));
        const d = S.distancia(c.pos, c.embarque);
        if (c.etapa === 'chegou' || d < 60) {
          chip.innerHTML = `<b>${esc(primeiroNome(c.motorista.nome))}</b> está no embarque${textoEspera(c)}`;
          if (aproximacao) { aproximacao = null; mapa.semRota(); }
        } else {
          const resto = restoDaAproximacao(c);
          const km = resto ? resto.km : (d * 1.3) / 1000;
          const min = Math.max(1, Math.round((km / 17) * 60));
          chip.innerHTML = `Chega em <b>${min} min</b> · ${S.textoKm(km)}`;
          if (resto) mapa.rota(resto.linha);
          else { mapa.semRota(); tracarAproximacao(); }
        }
        if (enquadrar) mapa.enquadrar(() => [c.pos, c.embarque], { maxZoom: 17 });
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
      q('#rp-via-de').textContent = `Saiu ${c.inicioViagem ? `às ${hhmm(new Date(c.inicioViagem))}` : 'agora'} de ${c.embarque.bairro || c.embarque.nome}`;
      q('#rp-via-nome').textContent = primeiroNome(m.nome);
      rosto(q('#rp-via-av'), m);
      q('#rp-via-veic').textContent = m.veiculo === 'patinete' ? 'o patinete' : 'a bike';
      q('#rp-vivo').textContent = c.compartilhada ? 'Ao vivo · compartilhada' : 'Ao vivo';
      mapa.limpar();
      mapa.rota(c.linha);
      mapa.ponto('destino', c.destino, Mapa.ICONE.destino());
      const aqui = pos || c.pos;
      mapa.enquadrar(() => [c.aqui || aqui || c.embarque, c.destino]);
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
          const pct = c.km > 0 ? Math.max(0, Math.min(100, Math.round((1 - falta / c.km) * 100))) : 0;
          q('#rp-via-barra').style.width = `${pct}%`;
          q('#rp-via-pct').textContent = `${pct}% do caminho`;
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
      if (v.espera) h += linhaRecibo('Espera', brl(v.espera));
      if (v.gorjeta) h += linhaRecibo('Gorjeta', brl(v.gorjeta));
      if (v.evento && v.evento.valor) h += linhaRecibo(`Por conta de ${v.evento.nome}`, `− ${brl(v.evento.valor)}`);
      h += linhaRecibo(`Total · ${v.pag || (v.evento && v.total <= 0 ? 'Evento' : 'Pix')}`, brl(v.total), 't-total');
      return h;
    }
    // o recibo de uma volta: quem dirigiu, de onde, para onde e quando; para mandar para quem reembolsa
    let reciboAberto = null;
    const lugarTxt = (l) => (l ? [l.nome, l.bairro].filter(Boolean).join(' · ') : '');
    const quandoTxt = (iso) => { const d = new Date(iso); return `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}, ${hhmm(d)}`; };
    function infoRecibo(v) {
      const linha = (a, b) => (b ? `<li><span>${esc(a)}</span><b>${esc(b)}</b></li>` : '');
      return linha('Motorista', v.motorista) + linha('Saiu de', lugarTxt(v.embarque)) + linha('Chegou em', lugarTxt(v.destino))
        + linha('Início', v.inicio ? quandoTxt(v.inicio) : '') + linha('Chegada', quandoTxt(v.data))
        + linha('Pagamento', v.evento ? (v.total > 0 ? `${v.evento.nome} e Pix direto para o motorista` : `Por conta de ${v.evento.nome}`) : `${v.pag || 'Pix'} direto para o motorista`);
    }
    // o trajeto da volta, desenhado da linha guardada (sem mapa de fundo: só a forma do caminho, a saída e a chegada)
    function desenharTrajeto(v) {
      const fig = q('#rp-rec-mapa');
      const l = Array.isArray(v.linha) ? v.linha.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];
      fig.hidden = l.length < 2;
      if (fig.hidden) return;
      const W = 320; const H = 150; const M = 18;
      const lats = l.map((p) => p[0]); const lons = l.map((p) => p[1]);
      const kx = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI / 180);
      const w = Math.max(1e-6, (Math.max(...lons) - Math.min(...lons)) * kx);
      const h = Math.max(1e-6, Math.max(...lats) - Math.min(...lats));
      const esc2 = Math.min((W - 2 * M) / w, (H - 2 * M) / h);
      const ox = (W - w * esc2) / 2; const oy = (H - h * esc2) / 2;
      const xy = ([lat, lon]) => [ox + (lon - Math.min(...lons)) * kx * esc2, oy + (Math.max(...lats) - lat) * esc2];
      const pts = l.map(xy).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const [x0, y0] = xy(l[0]); const [x1, y1] = xy(l[l.length - 1]);
      q('#rp-rec-svg').innerHTML = '<defs><pattern id="rp-rec-grade" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" class="rp-rec-grade"/></pattern></defs>'
        + `<rect width="${W}" height="${H}" fill="url(#rp-rec-grade)"/>`
        + `<polyline points="${pts}" class="rp-rec-luz"/><polyline points="${pts}" class="rp-rec-linha"/>`
        + `<circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="6" class="rp-rec-de"/><circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="7" class="rp-rec-para"/>`;
      q('#rp-rec-mapa-leg').textContent = `${lugarTxt(v.embarque) || 'Saída'} → ${lugarTxt(v.destino) || 'Chegada'} · ${S.virgula(v.km)} km`;
    }
    // a volta minuto a minuto: só os horários que o celular viu de verdade
    function desenharTempos(v) {
      const t = v.tempos || {};
      const nome = primeiroNome(v.motorista);
      const passos = [
        [t.pedido, 'Pedido', 'Você pediu o Drink'],
        [t.aceite, 'Aceite', `${nome} aceitou${v.veiculo ? `, de ${v.veiculo}` : ''}`],
        [t.embarque, 'No embarque', `${nome} chegou até você`],
        [t.codigo, 'Código', 'O seu celular conferiu o código'],
        [t.saida, 'Saída', `${nome} saiu com o seu carro`],
        [t.chegada, 'Chegada', `Em ${lugarTxt(v.destino) || 'casa'}`],
      ].filter(([ms]) => Number(ms) > 0);
      const ol = q('#rp-rec-tempo');
      ol.hidden = passos.length < 2;
      q('#rp-rec-tempo-t').hidden = ol.hidden;
      if (ol.hidden) return;
      const ini = passos[0][0];
      ol.innerHTML = passos.map(([ms, rot, txt], i) => {
        const dif = i ? Math.round((ms - passos[i - 1][0]) / 60000) : 0;
        return `<li><time>${hhmm(new Date(ms))}</time><span><b>${esc(rot)}</b><small>${esc(txt)}</small></span>${i ? `<em>+${Math.max(0, dif)} min</em>` : ''}</li>`;
      }).join('') + `<li class="total"><time></time><span><b>Do pedido à chegada</b></span><em>${S.textoMin((passos[passos.length - 1][0] - ini) / 60000)}</em></li>`;
    }
    function textoRecibo(v) {
      const d = new Date(v.data);
      const cab = ['Recibo Drink', `${v.rota} · ${d.toLocaleDateString('pt-BR')} ${hhmm(d)}`];
      if (v.embarque) cab.push(`Saiu de: ${lugarTxt(v.embarque)}`);
      if (v.destino) cab.push(`Chegou em: ${lugarTxt(v.destino)}`);
      cab.push(`Motorista: ${v.motorista}`);
      const conta = [`Saída: ${brl(v.saida)}`, `${S.virgula(v.km)} km rodados: ${brl(v.rodado)}`];
      if (v.adicional) conta.push(`Bandeira 2 (+20%): ${brl(v.adicional)}`);
      if (v.espera) conta.push(`Espera: ${brl(v.espera)}`);
      if (v.gorjeta) conta.push(`Gorjeta: ${brl(v.gorjeta)}`);
      if (v.evento && v.evento.valor) conta.push(`Por conta de ${v.evento.nome}: − ${brl(v.evento.valor)}`);
      conta.push(`Total (${v.pag || 'Pix'}): ${brl(v.total)}`);
      return `${cab.join('\n')}\n\n${conta.join('\n')}`;
    }
    async function compartilharRecibo(v) {
      const texto = textoRecibo(v);
      if (navigator.share) {
        try { await navigator.share({ title: 'Recibo Drink', text: texto }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      copiar(texto, 'Recibo copiado. É só colar onde quiser.');
    }
    // abre o app de e-mail do celular com o recibo pronto, já para o e-mail da conta (se tiver um)
    function emailRecibo(v) {
      const para = eu().email || '';
      const assunto = `Recibo Drink · ${v.rota} · ${new Date(v.data).toLocaleDateString('pt-BR')}`;
      const corpo = textoRecibo(v).replace(/\n/g, '\r\n');
      const a = q('#rp-rec-email');
      a.href = `mailto:${encodeURIComponent(para).replace(/%40/g, '@')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      a.setAttribute('aria-label', para ? `Mandar o recibo para ${para}` : 'Mandar o recibo por e-mail');
    }
    function totalAtual() { return redondo(corrida.valor + (corrida.espera || 0) + (corrida.gorjeta || 0) - parteEvento(corrida)); }
    function mostrarChegada() {
      const c = corrida;
      if (!c) return;
      const nome = primeiroNome(c.motorista && c.motorista.nome);
      q('#rp-fim-sub').textContent = `Chegada às ${hhmm(new Date(c.chegada || Date.now()))} · ${c.destino.bairro || c.destino.nome}`;
      q('#rp-aval-t').textContent = `Como foi a volta com ${nome}?`;
      if (c.motorista) rosto(q('#rp-aval-av'), c.motorista);
      q('#rp-gorjeta-t').textContent = `Gorjeta, se quiser · vai inteira para ${nome}`;
      desenharAvaliacao();
    }
    function desenharAvaliacao() {
      const c = corrida;
      q('#rp-recibo').innerHTML = htmlRecibo({ ...c, total: totalAtual(), evento: reciboEvento(c) });
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
      q('#rp-pagar').textContent = totalAtual() > 0 ? `Pagar ${brl(totalAtual())} com Pix` : 'Concluir a volta';
    }
    function irPagar() {
      const c = corrida;
      c.etapa = 'pagando';
      enviar({ tipo: 'avaliacao', nota: c.nota, tags: c.tags, gorjeta: c.gorjeta, total: totalAtual() });
      salvarCorrida();
      // por conta do evento e sem gorjeta: não tem nada para pagar
      if (!c.simulada && totalAtual() <= 0) {
        c.paguei = true;
        enviar({ tipo: 'paguei', total: 0 });
        concluir();
        return;
      }
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
      if (c.simulada) {
        // na simulação não existe Pix: nenhum código de pagamento de verdade aparece aqui
        qr.innerHTML = '<p class="rt-qr-espera">Na simulação não tem Pix. Numa corrida de verdade, aqui aparece o QR code com a chave Pix do motorista e o valor certinho.</p>';
        q('#rp-pix-para').textContent = 'Você paga pelo app do seu banco, direto para o motorista.';
        copiarBt.disabled = true;
        q('#rp-pix-status').textContent = '';
        q('#rp-paguei').textContent = 'Concluir a simulação';
        q('#rp-paguei').disabled = false;
        return;
      }
      if (!c.cobranca) {
        qr.innerHTML = '<p class="rt-qr-espera">Esperando a chave Pix do motorista…</p>';
        q('#rp-pix-para').textContent = `Assim que o ${primeiroNome(nome)} mandar, o QR code aparece aqui.`;
        copiarBt.disabled = true;
      } else if (!c.cobranca.pix || !c.cobranca.pix.chave) {
        qr.innerHTML = '<p class="rt-qr-espera">O motorista não mandou uma chave Pix válida. Pede a chave pela mensagem.</p>';
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
      if (c.simulada) { fimDaSimulacao(); return; }
      if (c.paguei) { if (c.podeConcluir) concluir(); return; }
      c.paguei = true;
      enviar({ tipo: 'paguei', total: totalAtual() });
      avisarMotorista('paguei');
      salvarCorrida();
      if (c.recebido) { concluir(); return; }
      mostrarPix();
      agendar(() => { if (corrida === c) { c.podeConcluir = true; mostrarPix(); q('#rp-pix-status').textContent = `O ${primeiroNome(c.motorista && c.motorista.nome)} ainda não confirmou. Se você já pagou, pode concluir.`; } }, 90000);
    }
    function trajetoCurto(linha) {
      if (!Array.isArray(linha) || linha.length < 2) return undefined;
      const passo = Math.max(1, Math.ceil(linha.length / 80));
      const pts = linha.filter((_, i) => i % passo === 0 || i === linha.length - 1);
      return pts.map(([lat, lon]) => [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5]);
    }
    function concluir() {
      const c = corrida;
      if (!c) return;
      const u = eu();
      const v = {
        id: c.id, rota: `${c.embarque.bairro || c.embarque.nome} → ${c.destino.bairro || c.destino.nome}`,
        data: new Date(c.chegada || Date.now()).toISOString(), km: c.km, motorista: c.motorista ? c.motorista.nome : 'Drink',
        pag: parteEvento(c) ? (totalAtual() > 0 ? 'Evento + Pix' : 'Evento') : 'Pix',
        saida: c.saida, rodado: c.rodado, adicional: c.adicional, espera: c.espera || 0, gorjeta: c.gorjeta, total: totalAtual(),
        evento: reciboEvento(c) || undefined,
        nota: c.nota, destino: { nome: c.destino.nome, bairro: c.destino.bairro, detalhe: c.destino.detalhe, lat: c.destino.lat, lon: c.destino.lon },
        embarque: { nome: c.embarque.nome, bairro: c.embarque.bairro, lat: c.embarque.lat, lon: c.embarque.lon }, inicio: c.inicioViagem ? new Date(c.inicioViagem).toISOString() : null,
        // o desenho do trajeto (no máximo uns 80 pontos) e os horários, para o recibo
        linha: trajetoCurto(c.linha),
        tempos: { pedido: c.t0 || 0, aceite: c.aceiteEm || 0, embarque: c.noEmbarque || 0, codigo: c.codigoEm || 0, saida: c.inicioViagem || 0, chegada: c.chegada || 0 },
        veiculo: c.motorista ? PF.descrever({ tipo: c.motorista.veiculo, ...(c.motorista.veic || {}) }) : '',
        simulada: c.simulada || undefined,
      };
      u.voltas = [v, ...(u.voltas || [])].slice(0, 100);
      if (c.notaRecebida) u.notasRecebidas = [...(u.notasRecebidas || []), c.notaRecebida].slice(-100);
      op.salvar();
      embarqueManual = false;
      destino = null;
      encerrar();
      op.avisar(v.evento && v.total <= 0 ? 'Volta concluída, por conta do evento. O recibo ficou salvo em Viagens.' : 'Pago! O recibo ficou salvo em Viagens.');
      ir('viagens');
    }

    /* ---------- simulação ---------- */
    // Para ver como é antes de pedir de verdade: um motorista simulado, que só existe no seu celular, faz a corrida
    // inteira pela rota de verdade, mais rápido (aceita, vem até o embarque, digita o código, faz a vistoria, guarda a
    // bike e dirige até o destino). Nada sai do celular: nenhum motorista recebe o pedido, não tem Pix e a volta não
    // entra em Viagens.
    let simTimers = [];
    const simAgendar = (fn, ms) => { simTimers.push(setTimeout(fn, ms)); };
    function pararSim() { simTimers.forEach(clearTimeout); simTimers = []; }
    function marcarSim() {
      const sim = Boolean(corrida && corrida.simulada);
      const app = raiz.closest('.app');
      if (app) app.classList.toggle('simulando', sim);
      q('#rp-sim').hidden = !sim;
    }
    // o que o motorista simulado "manda" chega como chegaria o de um motorista de verdade
    function simManda(msg) {
      if (!corrida || !corrida.simulada) return;
      tratar(msg, 'simulado', null);
      salvarCorrida();
    }
    async function simular() {
      if (corrida) return;
      if (!rota || !embarque || !destino) { op.avisar('Escolhe o destino e espera a rota aparecer no mapa.'); return; }
      const u = eu();
      const p = S.preco(rota.km);
      corrida = {
        id: `sim-${Date.now()}`, simulada: true, t0: Date.now(), etapa: 'buscando',
        embarque: { ...embarque }, destino: { ...destino }, km: redondo(rota.km, 1), min: Math.round(rota.min), linha: rota.linha,
        valor: redondo(p.total), saida: p.saida, rodado: redondo(p.rodado), adicional: redondo(p.adicional),
        veic, carro: { ...(u.carro || {}) }, codigo: String(1000 + Math.floor(Math.random() * 9000)),
        motorista: null, chave: null, ultimo: null, msgs: [], fotos: 0, malas: false,
        nota: 0, tags: [], gorjeta: 0, cobranca: null, paguei: false, compartilhada: false,
      };
      const c = corrida;
      salvarCorrida();
      marcarSim();
      ir('buscando');
      q('#rp-bu-sub').textContent = 'Simulação: o pedido não sai do seu celular. Um motorista simulado vai aceitar.';
      q('#rp-prazo').style.width = '0%';
      // o motorista simulado sai de uns 1,5 km do embarque e vem pela rota de verdade
      const inicio = { lat: c.embarque.lat + 0.0078, lon: c.embarque.lon + 0.0074 };
      let r = null;
      try { r = await S.rota(inicio, c.embarque); } catch (e) { r = null; }
      if (corrida !== c) return;
      c.simLinha = r && r.linha && r.linha.length > 1 ? r.linha : [[inicio.lat, inicio.lon], [c.embarque.lat, c.embarque.lon]];
      simAgendar(() => {
        const [lat, lon] = c.simLinha[0];
        simManda({ tipo: 'aceite', motorista: { nome: 'Motorista simulado', veiculo: veic === 'patinete' ? 'patinete' : 'bike' }, pos: { lat, lon } });
      }, 2500);
    }
    // o que o seu celular manda para o motorista chega no motorista simulado
    function simRecebe(obj) {
      const c = corrida;
      if (!c || !c.simulada) return;
      if (obj.tipo === 'confirmado') simIrAteEmbarque(c);
      else if (obj.tipo === 'codigo-ok' && obj.ok) simVistoria(c);
      else if (obj.tipo === 'msg') simAgendar(() => { if (corrida === c) simManda({ tipo: 'msg', txt: 'Recebi! Aqui é uma simulação: numa corrida de verdade, o motorista responde por aqui.' }); }, 1800);
    }
    function simIrAteEmbarque(c) {
      const passos = S.pontosNaLinha(c.simLinha, 24);
      // no mapa, o caminho do motorista é a rota dele, que encurta conforme ele anda
      aproximacao = { id: c.id, linha: c.simLinha };
      let perto = false;
      passos.forEach((p, i) => simAgendar(() => {
        if (corrida !== c || c.etapa !== 'a-caminho') return;
        simManda({ tipo: 'pos', lat: p.lat, lon: p.lon });
        if (!perto && S.distancia(p, c.embarque) < 450) { perto = true; simManda({ tipo: 'perto' }); }
      }, 1000 * (i + 1)));
      simAgendar(() => {
        if (corrida !== c || c.etapa !== 'a-caminho') return;
        simManda({ tipo: 'etapa', etapa: 'chegou', pos: { lat: c.embarque.lat, lon: c.embarque.lon } });
        // numa corrida de verdade você fala o código e o motorista digita; aqui ele "digita" sozinho
        simAgendar(() => {
          if (corrida !== c || c.etapa !== 'chegou') return;
          op.avisar(`O motorista simulado digitou ${c.codigo}. O seu celular conferiu: é o Drink certo.`);
          simManda({ tipo: 'codigo', valor: c.codigo });
        }, 6000);
      }, 1000 * (passos.length + 1));
    }
    function simVistoria(c) {
      for (let n = 1; n <= 5; n += 1) simAgendar(() => { if (corrida === c) simManda({ tipo: 'etapa', etapa: 'vistoria', fotos: n }); }, 1500 * n);
      simAgendar(() => { if (corrida === c) simManda({ tipo: 'etapa', etapa: 'malas' }); }, 10000);
      simAgendar(() => {
        if (corrida !== c) return;
        simManda({ tipo: 'etapa', etapa: 'viagem' });
        simViagem(c);
      }, 13000);
    }
    // a viagem pela rota do embarque até o destino (o GPS de verdade fica de fora enquanto isso)
    function simViagem(c) {
      const passos = S.pontosNaLinha(c.linha, 30);
      passos.forEach((p, i) => simAgendar(() => { if (corrida === c && c.etapa === 'viagem') andarNaViagem(p); }, 1000 * (i + 1)));
      simAgendar(() => { if (corrida === c && c.etapa === 'viagem') simManda({ tipo: 'etapa', etapa: 'chegada', valor: c.valor, espera: 0 }); }, 1000 * (passos.length + 2));
    }
    function fimDaSimulacao() {
      encerrar();
      destino = null;
      op.avisar('Simulação concluída. Numa corrida de verdade, você paga com Pix direto para o motorista e o recibo fica em Viagens.');
      ir('inicio');
    }

    /* ---------- cancelar ---------- */
    function cancelar() {
      const c = corrida;
      if (!c) return;
      // a simulação para a qualquer hora, sem avisar ninguém
      if (c.simulada) { encerrar(); op.avisar('Simulação encerrada.'); ir(destino ? 'opcoes' : 'inicio'); return; }
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
        notificar(primeiroNome(corrida.motorista && corrida.motorista.nome), txt);
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
      $$('[data-sem-voltas]', raiz).forEach((el) => { el.hidden = n > 0; });
      if (!n) {
        lista.innerHTML = '<li class="d-hist-vazio"><svg aria-hidden="true"><use href="#i-limao"/></svg><b>Suas voltas aparecem aqui</b><span>Pediu um Drink, o recibo fica salvo nesta aba.</span><button type="button" data-rp-aba="inicio">Pedir o primeiro Drink</button></li>';
        return;
      }
      lista.innerHTML = voltas.map((v, i) => {
        const d = new Date(v.data);
        const quando = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
        return `<li${i === 0 && Date.now() - d.getTime() < 60000 ? ' class="novo"' : ''}><button type="button" data-volta="${i}">`
          + '<span class="d-hist-ic" aria-hidden="true"><svg><use href="#i-rota"/></svg></span>'
          + `<span><b>${esc(v.rota)}</b><small>${esc(quando)}, ${esc(hhmm(d))} · ${esc(v.motorista)}</small></span><em>${esc(brl(v.total))}</em></button></li>`;
      }).join('');
    }
    function desenharCarteira() {
      const u = eu();
      const agora = new Date();
      const doMes = ((u && u.voltas) || []).filter((v) => { const d = new Date(v.data); return !v.simulada && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); });
      q('#rp-mes').textContent = brl(doMes.reduce((s, v) => s + v.total, 0));
      q('#rp-mes-txt').textContent = doMes.length ? `em ${doMes.length} ${doMes.length === 1 ? 'volta' : 'voltas'}` : 'em nenhuma volta';
      // os números do mês
      const km = doMes.reduce((s, v) => s + (v.km || 0), 0);
      q('#rp-n-voltas').textContent = String(doMes.length);
      q('#rp-n-km').textContent = `${S.virgula(km, km < 10 ? 1 : 0)} km`;
      q('#rp-n-media').textContent = doMes.length ? brl(doMes.reduce((s, v) => s + v.total, 0) / doMes.length) : '—';
      // a tabela do preço, tirada das mesmas regras que calculam cada volta, e a bandeira de agora pelo relógio
      q('#rp-t-saida').textContent = brl(PRECO.saida);
      q('#rp-t-km').textContent = brl(PRECO.km);
      q('#rp-t-mad').textContent = `+${Math.round(PRECO.madrugada * 100)}%`;
      q('#rp-t-espera').textContent = `${PRECO.esperaGratis} min grátis, depois ${brl0(PRECO.espera)} a cada ${PRECO.esperaBloco} min`;
      const h = agora.getHours();
      const madrugada = h < 5;
      q('#rp-tarifa-agora').classList.toggle('b2', madrugada);
      q('#rp-tarifa-agora-txt').textContent = madrugada ? `Agora: bandeira 2, até as 5h` : `Agora: bandeira 1 · a 2 começa à meia-noite`;
      // um exemplo com a casa salva (se tiver) ou com 8 km, no preço de agora
      const casa = u && u.locais && u.locais.casa;
      const kmEx = casa && pos ? Math.max(1, Math.round(S.distancia(pos, casa) / 100) / 10 * 1.3) : 8;
      const ex = S.preco(kmEx, agora);
      q('#rp-tarifa-ex').textContent = casa && pos
        ? `Até a sua casa, uns ${S.virgula(Math.round(kmEx), 0)} km de rua: por volta de ${brl(ex.total)} agora.`
        : `Uma volta de ${S.virgula(kmEx, 0)} km agora sai por ${brl(ex.total)}.`;
    }
    function desenharPerfil() {
      const u = eu();
      const nota = minhaNota(u);
      q('#rp-minha-nota').hidden = !nota;
      q('#rp-minha-nota').textContent = nota ? `Sua nota com os motoristas: ${S.virgula(nota)}` : '';
      const reais = (u.voltas || []).filter((v) => !v.simulada);
      const kmTotal = reais.reduce((t, v) => t + (v.km || 0), 0);
      q('#rp-pe-voltas').textContent = String(reais.length);
      q('#rp-pe-km').textContent = S.virgula(kmTotal, kmTotal < 10 ? 1 : 0);
      q('#rp-pe-nota').textContent = nota ? S.virgula(nota) : '—';
      q('#rp-carro-t').textContent = u.carro ? nomeCarro(u.carro) : 'Cadastra o seu carro';
      q('#rp-carro-sub').textContent = u.carro
        ? [u.carro.marca, `câmbio ${u.carro.cambio}`].filter(Boolean).join(' · ') + (carroPronto(u.carro) ? '' : ' · falta a placa')
        : 'Modelo, cor, placa e câmbio, pro Drink achar ele';
      q('#rp-carro-placa-mini').innerHTML = carroPronto(u.carro) ? CARROS.placa.html(u.carro.placa) : '';
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
    let soltarFolha = null;
    function abrirFolha(id) {
      fecharFolha(false);
      folha = id;
      veu.hidden = false;
      q(`#${id}`).hidden = false;
      soltarFolha = S.prenderFoco(q(`#${id}`));
      if (id === 'rp-chat') { if (corrida) corrida.novaMsg = false; q('#rp-nova-msg').hidden = true; desenharChat(); }
      if (id === 'rp-carro') {
        const c = eu().carro || {};
        const modelo = q('#rp-carro-modelo');
        modelo.value = c.modelo || '';
        modelo.dataset.marca = c.marca || '';
        q('#rp-carro-sug').hidden = true;
        q('#rp-carro-cores').innerHTML = CARROS.CORES.map(([nome, hex]) => `<button type="button" role="radio" aria-checked="${nome === c.cor}" data-cor="${nome}" style="--cor:${hex}"><i aria-hidden="true"></i><span>${nome}</span></button>`).join('');
        q('#rp-carro-placa').value = c.placa ? CARROS.placa.formatar(CARROS.placa.limpar(c.placa)) : '';
        mostrarPlaca();
        $$('#rp-carro [data-cambio]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cambio === (c.cambio || 'automático'))));
        q('#rp-carro-erro').hidden = true;
      }
      if (id === 'rp-preco') desenharPreco();
      if (id === 'rp-mot') desenharPerfilMotorista();
      if (id === 'rp-contato') { q('#rp-contato-nome').value = ''; q('#rp-contato-cel').value = ''; q('#rp-contato-erro').hidden = true; }
      const t = $('h4', q(`#${id}`));
      if (t) t.focus({ preventScroll: true });
    }
    function fecharFolha(foco = true) {
      if (!folha) return;
      q(`#${folha}`).hidden = true;
      veu.hidden = true;
      folha = null;
      if (soltarFolha) { soltarFolha(foco); soltarFolha = null; }
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
      if (ds.cor) { $$('#rp-carro [data-cor]', raiz).forEach((x) => x.setAttribute('aria-checked', String(x === b))); q('#rp-carro-erro').hidden = true; return; }
      if (ds.carroSug !== undefined) {
        const c = sugestoes[Number(ds.carroSug)];
        if (!c) return;
        const modelo = q('#rp-carro-modelo');
        modelo.value = c.modelo;
        modelo.dataset.marca = c.marca;
        q('#rp-carro-sug').hidden = true;
        return;
      }
      if (ds.rapida) { mandarMsg(ds.rapida); return; }
      if (ds.recente !== undefined) {
        const d = recentes[Number(ds.recente)];
        if (!d || corrida) return;
        modoBusca = 'destino';
        destino = { nome: d.nome, detalhe: d.detalhe || '', bairro: d.bairro || '', lat: d.lat, lon: d.lon };
        ir('opcoes');
        return;
      }
      if (ds.volta) {
        const v = eu().voltas[Number(ds.volta)];
        if (!v) return;
        reciboAberto = v;
        q('#rp-rec-sub').textContent = `${v.rota} · ${new Date(v.data).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        q('#rp-rec-det').innerHTML = htmlRecibo(v);
        q('#rp-rec-info').innerHTML = infoRecibo(v);
        desenharTrajeto(v);
        desenharTempos(v);
        emailRecibo(v);
        q('#rp-rec-bts [data-rp="recibo-de-novo"]').hidden = !(v.destino && ponto(v.destino));
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
        avise: pedirAviso,
        centralizar: () => {
          if (!pos) {
            S.gps.tentar();
            op.avisar(S.gps.negado() ? 'A localização está bloqueada. Libera nas configurações do navegador e toca de novo.' : 'Procurando você no mapa…');
            centrarEmMim();
            return;
          }
          if (embarqueManual) { embarqueManual = false; op.avisar('Embarque de volta onde você está.'); atualizarEmbarque(); }
          centrarEmMim();
        },
        'trocar-embarque': () => { voltarPara = atual; modoBusca = 'embarque'; ir('destino'); },
        'voltar-busca': () => { const volta = modoBusca === 'destino' ? 'inicio' : (voltarPara || 'perfil'); modoBusca = 'destino'; ir(volta); },
        'no-mapa': () => ir('no-mapa'),
        'confirmar-no-mapa': () => { if (meioLugar) escolherLugar(meioLugar); },
        cancelar,
        simular,
        'ver-simulacao': () => {
          modoBusca = 'destino';
          ir('destino');
          op.avisar('Escolhe um destino. Na tela do preço, toca em "Simular esta corrida".');
        },
        'sair-sim': () => { if (corrida && corrida.simulada) cancelar(); },
        tentar: () => ir('opcoes'),
        compartilhar: () => {
          if (!corrida) return;
          if (corrida.simulada) { op.avisar('Na simulação não dá pra compartilhar. Numa corrida de verdade, quem recebe o link vê o carro no mapa até você chegar.'); return; }
          abrirCompartilhar();
        },
        'compartilhar-outro': () => {
          if (!corrida) return;
          marcarCompartilhada();
          if (navigator.share) navigator.share({ title: 'Minha volta com o Drink', text: textoRastreio() }).catch(() => {});
          else copiar(textoRastreio(), 'Link copiado. Cola no WhatsApp de quem vai acompanhar.');
          fecharFolha();
        },
        'copiar-link': () => { if (!corrida) return; marcarCompartilhada(); copiar(linkRastreio(), 'Link da viagem copiado.'); fecharFolha(); },
        'recibo-compartilhar': () => { if (reciboAberto) compartilharRecibo(reciboAberto); },
        'recibo-de-novo': () => {
          const v = reciboAberto;
          if (!v || !v.destino || !ponto(v.destino) || corrida) return;
          fecharFolha();
          modoBusca = 'destino';
          destino = { nome: v.destino.nome, detalhe: v.destino.detalhe || '', bairro: v.destino.bairro || '', lat: v.destino.lat, lon: v.destino.lon };
          ir('opcoes');
        },
        'mandar-local': () => {
          const p = (corrida && (corrida.aqui || corrida.pos)) || pos;
          if (!p) { op.avisar('Ainda não achei você no mapa.'); return; }
          const texto = `Estou aqui: https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
          if (navigator.share) navigator.share({ text: texto }).catch(() => {});
          else copiar(texto, 'Localização copiada.');
        },
        'copiar-pix': () => { if (corrida && corrida.pixCodigo) copiar(corrida.pixCodigo, 'Código Pix copiado. Agora cola no app do seu banco.'); },
        paguei,
        'sair-evento': sairDoConvite,
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
        case 'rp-op-pag': {
          const v = eventoDaVolta();
          op.avisar(v && v.cobre
            ? `O ${v.e.nome} paga até ${brl0(v.e.teto)} da volta. Se passar disso, você paga a diferença pelo Pix, direto pro motorista.`
            : 'Você paga com Pix direto pro motorista, pelo app do seu banco, quando chegar em casa.');
          break;
        }
        case 'rp-pedir': pedir(); break;
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
    // o modelo: sugestões da lista de carros enquanto digita
    let sugestoes = [];
    q('#rp-carro-modelo').addEventListener('input', () => {
      const campo = q('#rp-carro-modelo');
      campo.dataset.marca = '';
      sugestoes = CARROS.buscar(campo.value);
      const lista = q('#rp-carro-sug');
      lista.hidden = !sugestoes.length || Boolean(CARROS.achar(campo.value) && sugestoes.length === 1);
      lista.innerHTML = sugestoes.map((c, i) => `<li><button type="button" data-carro-sug="${i}"><b>${esc(c.modelo)}</b><small>${esc(c.marca)}</small></button></li>`).join('');
      q('#rp-carro-erro').hidden = true;
    });
    // a placa aparece desenhada enquanto digita
    function mostrarPlaca() {
      const p = CARROS.placa.limpar(q('#rp-carro-placa').value);
      q('#rp-carro-placa-ver').innerHTML = CARROS.placa.previa(p);
    }
    q('#rp-carro-placa').addEventListener('input', () => {
      const campo = q('#rp-carro-placa');
      const p = CARROS.placa.limpar(campo.value);
      campo.value = p.length === 7 ? CARROS.placa.formatar(p) : p;
      mostrarPlaca();
      q('#rp-carro-erro').hidden = true;
    });
    q('#rp-carro-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = q('#rp-carro-modelo');
      const texto = campo.value.trim().replace(/\s+/g, ' ');
      const achado = CARROS.achar(texto);
      const marca = campo.dataset.marca || (achado && achado.marca) || '';
      const modelo = achado ? achado.modelo : texto;
      const cor = (($('#rp-carro [data-cor][aria-checked="true"]', raiz) || {}).dataset || {}).cor || '';
      const conferida = CARROS.placa.conferir(q('#rp-carro-placa').value);
      const cambio = (($('#rp-carro [data-cambio][aria-checked="true"]', raiz) || {}).dataset || {}).cambio || 'automático';
      const erro = q('#rp-carro-erro');
      const falha = (txt, foco) => { erro.hidden = false; erro.textContent = txt; if (foco) foco.focus(); };
      if (modelo.length < 2) { falha('Qual é o modelo do carro? Onix, HB20, Corolla…', campo); return; }
      if (!cor) { falha('Escolhe a cor do carro.'); return; }
      if (conferida.erro) { falha(conferida.erro, q('#rp-carro-placa')); return; }
      eu().carro = { marca, modelo: modelo[0].toUpperCase() + modelo.slice(1), cor, placa: conferida.placa, cambio };
      op.salvar();
      fecharFolha();
      op.avisar(`Carro salvo: ${nomeCarro(eu().carro)}, placa ${CARROS.placa.formatar(conferida.placa)}.`);
      if (atual === 'opcoes') mostrarOpcoes();
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
      painel.mostrar(false);
      fecharFolha();
      if (soltarGps && !corrida) { soltarGps(); soltarGps = null; }
    }
    // voltar do aparelho: devolve true se tratou
    function voltar() {
      if (folha) { fecharFolha(); return true; }
      const mapaVolta = { destino: modoBusca === 'destino' ? 'inicio' : (voltarPara || 'perfil'), 'no-mapa': 'destino', opcoes: 'destino', ninguem: 'opcoes', viagens: 'inicio', carteira: 'inicio', perfil: 'inicio', pix: 'chegou', eventos: 'inicio', 'evento-novo': 'eventos', evento: 'eventos' };
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
    mapa.folga(q('.rt-folha'));
    setTimeout(() => mapa.ajustar(), 50);
    let primeira = true;
    let ultima = 0;
    // o carro e o destino de agora: se o celular virar, o mapa volta a mostrar os dois
    const visto = { carro: null, destino: null };
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
      visto.carro = p;
      if (d.destino) visto.destino = d.destino;
      mapa.ponto('carro', p, Mapa.ICONE.carro());
      if (d.destino) mapa.ponto('destino', d.destino, Mapa.ICONE.destino());
      q('#ac-t').textContent = d.etapa === 'chegou' ? `${d.quem || 'A pessoa'} chegou em casa` : `${d.quem || 'Alguém'} está voltando com o Drink`;
      q('#ac-txt').textContent = d.etapa === 'chegou'
        ? `Chegou em ${d.destino ? d.destino.nome : 'casa'}. Carro na garagem.`
        : `Indo para ${d.destino ? [d.destino.nome, d.destino.bairro].filter(Boolean).join(' · ') : 'casa'}${d.eta ? ` · chega por volta de ${d.eta}` : ''}${d.motorista ? ` · dirigindo: ${d.motorista}` : ''}`;
      if (primeira) { mapa.enquadrar(() => [visto.carro, visto.destino]); primeira = false; }
    }, { desde: '12h' });
  }

  window.Drink.Passageiro = { criar, acompanhar };
}());
