/* Drink — o carro de apoio. Depois de deixar o cliente em casa, o motorista (de bike ou patinete, longe da festa)
   toca em "Me busca"; o carro de apoio da equipe vê a lista de quem está esperando e vai recolher.
   Tudo cifrado com o código da equipe: a posição de quem acabou de deixar alguém em casa é quase o endereço do
   cliente, e o canal do ntfy é público. Do código saem a chave (PBKDF2) e o nome do canal; quem não tem o código
   não acha o canal nem lê as mensagens. Usado pelo app do motorista e pela página da equipe (drink/apoio/). */
(function () {
  'use strict';
  const sub = window.crypto && window.crypto.subtle;
  const enc = new TextEncoder();
  const b64 = {
    de(bytes) { let s = ''; new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); },
    para(str) { return Uint8Array.from(atob(str), (c) => c.charCodeAt(0)); },
  };
  const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

  function config() {
    const padrao = { ntfy: 'https://ntfy.sh', sala: 'drink-bh-9r4t-v1' };
    const doApp = window.Drink && window.Drink.servicos && window.Drink.servicos.cfg;
    if (doApp) return { ntfy: doApp.ntfy, sala: doApp.sala };
    try { return { ...padrao, ...JSON.parse(localStorage.getItem('drink-servicos') || '{}') }; } catch (e) { return padrao; }
  }

  // o código da equipe: letras e números, sem acento nem espaço (fácil de ditar no WhatsApp)
  const limparCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const codigoValido = (c) => limparCodigo(c).length >= 6;
  function novoCodigo() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => letras[n % letras.length]).join('');
  }

  const cache = new Map();
  async function equipe(codigo) {
    const c = limparCodigo(codigo);
    if (!codigoValido(c)) throw new Error('codigo');
    if (cache.has(c)) return cache.get(c);
    const p = (async () => {
      const base = await sub.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveBits']);
      const bits = new Uint8Array(await sub.deriveBits({ name: 'PBKDF2', salt: enc.encode('drink-apoio-v1'), iterations: 120000, hash: 'SHA-256' }, base, 320));
      const chave = await sub.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
      const cfg = config();
      return { codigo: c, chave, topico: `${cfg.sala}-apoio-${hex(bits.slice(32, 40))}`, raiz: cfg.ntfy };
    })();
    cache.set(c, p);
    return p;
  }

  async function publicar(eq, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await sub.encrypt({ name: 'AES-GCM', iv }, eq.chave, enc.encode(JSON.stringify({ ...obj, t: Date.now() })));
    const r = await fetch(`${eq.raiz}/${eq.topico}`, { method: 'POST', body: JSON.stringify({ v: 1, iv: b64.de(iv), ct: b64.de(new Uint8Array(ct)) }) });
    if (!r.ok) throw new Error(`apoio ${r.status}`);
  }
  async function abrir(eq, texto) {
    try {
      const env = JSON.parse(texto);
      if (!env || env.v !== 1 || typeof env.iv !== 'string' || typeof env.ct !== 'string') return null;
      const pt = await sub.decrypt({ name: 'AES-GCM', iv: b64.para(env.iv) }, eq.chave, b64.para(env.ct));
      const m = JSON.parse(new TextDecoder().decode(pt));
      return m && typeof m === 'object' && typeof m.d === 'string' && Number.isFinite(m.t) ? m : null;
    } catch (e) { return null; }
  }
  // ouve o canal da equipe (as últimas 6 h e o que chegar); devolve { fechar }
  function ouvir(eq, aoChegar) {
    let fonte = null;
    let fechado = false;
    let espera = 1000;
    const vistos = new Set();
    const ligar = () => {
      if (fechado) return;
      fonte = new EventSource(`${eq.raiz}/${eq.topico}/sse?since=6h`);
      fonte.onmessage = async (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if ((m.event && m.event !== 'message') || vistos.has(m.id)) return;
        vistos.add(m.id);
        espera = 1000;
        const msg = await abrir(eq, m.message);
        if (msg) aoChegar(msg);
      };
      fonte.onerror = () => {
        if (fechado) return;
        fonte.close();
        setTimeout(ligar, espera);
        espera = Math.min(espera * 2, 15000);
      };
    };
    ligar();
    return { fechar() { fechado = true; if (fonte) fonte.close(); } };
  }

  // a situação de cada motorista: a última mensagem dele vale (busca → indo → peguei; ou voltei sozinho)
  // (a posição nova, reenviada a cada 2 min, não apaga o "Estou indo" de quem já saiu para buscar)
  function situacao(msgs) {
    const est = new Map();
    [...msgs].sort((a, b) => a.t - b.t).forEach((m) => {
      const a = est.get(m.d);
      if (m.tipo === 'busca') est.set(m.d, a && a.tipo === 'indo' && a.desde === m.desde ? { ...m, tipo: 'indo', quem: a.quem } : { ...m });
      else if (m.tipo === 'indo' && a) est.set(m.d, { ...a, tipo: 'indo', quem: String(m.quem || '').slice(0, 30) });
      else if (m.tipo === 'peguei' || m.tipo === 'voltei') est.delete(m.d);
    });
    return [...est.values()].sort((a, b) => (a.desde || a.t) - (b.desde || b.t));
  }

  window.Drink = window.Drink || {};
  window.Drink.apoio = { equipe, publicar, ouvir, situacao, novoCodigo, limparCodigo, codigoValido };
})();
