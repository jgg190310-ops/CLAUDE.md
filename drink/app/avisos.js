/* Drink — avisos de verdade no celular. Pedido novo, motorista chegou, mensagem nova, pagamento: o ntfy manda
   uma notificação pelo sistema (Web Push) mesmo com o app fechado ou a tela apagada. No iPhone, isso só
   funciona com o Drink instalado na tela de início. Os avisos não levam nome, endereço nem conversa. */
(function () {
  'use strict';

  const { cfg } = window.Drink.servicos;
  const GUARDADO = 'drink-avisos';

  const ehIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const temPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // quem pediu quais canais (motorista, passageiro); guardado para continuar depois de fechar o app
  let dados = { grupos: {}, aparelho: '' };
  try { dados = { ...dados, ...JSON.parse(localStorage.getItem(GUARDADO) || '{}') }; } catch (e) { /* começa do zero */ }
  if (!dados.aparelho) dados.aparelho = window.Drink.rede.idAleatorio(9);
  const guardar = () => { try { localStorage.setItem(GUARDADO, JSON.stringify(dados)); } catch (e) { /* sem espaço */ } };
  guardar();

  // ligado, desligado, bloqueado, instalar (iPhone fora da tela de início) ou sem-suporte
  function estado() {
    if (!temPush()) return ehIOS && !instalado() ? 'instalar' : 'sem-suporte';
    if (Notification.permission === 'granted') return 'ligado';
    if (Notification.permission === 'denied') return 'bloqueado';
    return 'desligado';
  }

  // pede a permissão; precisa ser chamado direto no toque, antes de qualquer espera (o iPhone só pergunta assim)
  function pedir() {
    if (!temPush() || Notification.permission !== 'default') return Promise.resolve(estado());
    let pedido;
    try { pedido = Notification.requestPermission(); } catch (e) { return Promise.resolve(estado()); }
    return Promise.resolve(pedido).then(() => { if (estado() === 'ligado') sincronizar(); return estado(); }, () => estado());
  }

  const bytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
  let chave = null;
  // a chave pública com que o ntfy assina os avisos
  async function chavePublica() {
    if (chave) return chave;
    try {
      const r = await fetch(`${cfg.ntfy}/v1/config`);
      if (r.ok) {
        const j = await r.json();
        if (j && j.web_push_public_key) { chave = j.web_push_public_key; return chave; }
      }
    } catch (e) { /* tenta pelo arquivo de configuração do site do ntfy */ }
    const r = await fetch(`${cfg.ntfy}/config.js`);
    const m = /web_push_public_key["']?\s*:\s*["']([\w-]+)["']/.exec(await r.text());
    if (!m) throw new Error('o ntfy não mandou a chave dos avisos');
    chave = m[1];
    return chave;
  }

  const prazo = (ms) => new Promise((ok, falha) => setTimeout(() => falha(new Error('sem service worker')), ms));
  async function enviar() {
    if (estado() !== 'ligado') return false;
    const reg = await Promise.race([navigator.serviceWorker.ready, prazo(10000)]);
    const k = bytes(await chavePublica());
    let sub = await reg.pushManager.getSubscription();
    // assinatura feita com outra chave não recebe nada: refaz
    const atual = sub && sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
    if (sub && atual && (atual.length !== k.length || atual.some((x, i) => x !== k[i]))) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: k });
    const j = sub.toJSON();
    let topicos = [...new Set(Object.values(dados.grupos).flat())].slice(0, 40);
    // sem nenhum canal, a assinatura fica num canal só deste aparelho, onde ninguém publica
    if (!topicos.length) topicos = [`drk-quieto-${dados.aparelho}`];
    // corpo em texto simples: vai direto, sem a consulta prévia do navegador
    const r = await fetch(`${cfg.ntfy}/v1/webpush`, { method: 'POST', body: JSON.stringify({ endpoint: j.endpoint, auth: j.keys.auth, p256dh: j.keys.p256dh, topics: topicos }) });
    if (!r.ok) throw new Error(`avisos ${r.status}`);
    return true;
  }
  let fila = Promise.resolve(false);
  function sincronizar() {
    fila = fila.then(enviar, enviar).catch(() => false);
    return fila;
  }

  // o que cada lado quer receber: motorista (pedidos, a corrida dele) e passageiro (a corrida dele)
  function definir(grupo, topicos) {
    const antes = JSON.stringify(dados.grupos[grupo] || []);
    dados.grupos[grupo] = topicos.filter(Boolean);
    guardar();
    if (antes === JSON.stringify(dados.grupos[grupo])) return fila;
    return sincronizar();
  }

  // aviso curto para o outro celular da corrida: só o tipo do acontecimento, nada pessoal
  function mandar(topico, tipo) {
    // pela fila, mas só vale por 5 min: aviso atrasado demais só atrapalha
    window.Drink.rede.fila.mandar(topico, { v: 1, tipo }, { validade: 5 * 60000 });
  }

  // o código do cadastro, mandado como notificação para este aparelho (enquanto o SMS não está ligado)
  const topicoCodigo = () => `drk-cod-${dados.aparelho}`;
  async function codigo(numero) {
    if (estado() !== 'ligado') return false;
    const ok = await definir('codigo', [topicoCodigo()]);
    if (!ok) return false;
    await window.Drink.rede.canal.publicar(topicoCodigo(), { v: 1, tipo: 'codigo', codigo: numero });
    return true;
  }

  window.Drink.avisos = { estado, pedir, definir, sincronizar, mandar, instalado, ehIOS, codigo, topicoCodigo };
}());
