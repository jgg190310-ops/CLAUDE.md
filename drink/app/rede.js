/* Drink — a rede entre os celulares. Pedidos e mensagens passam pelo ntfy (serviço aberto de mensagens);
   o pedido público só diz o bairro e o valor. Tudo da corrida (endereço exato, nome, chat, posição, código)
   vai cifrado de ponta a ponta: passageiro e motorista combinam uma chave (ECDH P-256 + AES-GCM) que o
   servidor nunca vê. */
(function () {
  'use strict';

  const { cfg } = window.Drink.servicos;

  /* ---------- base64url ---------- */
  const b64 = {
    de(bytes) {
      let s = '';
      bytes.forEach((b) => { s += String.fromCharCode(b); });
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    para(txt) {
      const s = atob(txt.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((txt.length + 3) % 4));
      return Uint8Array.from(s, (c) => c.charCodeAt(0));
    },
  };
  const idAleatorio = (n = 16) => b64.de(crypto.getRandomValues(new Uint8Array(n)));

  /* ---------- cifra ---------- */
  const CURVA = { name: 'ECDH', namedCurve: 'P-256' };
  const cifraPronta = Boolean(window.crypto && crypto.subtle);
  async function novoPar() {
    const par = await crypto.subtle.generateKey(CURVA, true, ['deriveBits']);
    const pub = b64.de(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
    const priv = await crypto.subtle.exportKey('jwk', par.privateKey);
    return { privada: par.privateKey, pub, priv };
  }
  const importarPrivada = (jwk) => crypto.subtle.importKey('jwk', jwk, CURVA, true, ['deriveBits']);
  // a chave comum vira bytes (para guardar no aparelho e continuar a corrida depois de recarregar)
  async function chaveComum(privada, pubOutro) {
    const pub = await crypto.subtle.importKey('raw', b64.para(pubOutro), CURVA, false, []);
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, privada, 256);
    return b64.de(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)));
  }
  const chaves = new Map();
  function chaveAes(raw) {
    if (!chaves.has(raw)) chaves.set(raw, crypto.subtle.importKey('raw', b64.para(raw), 'AES-GCM', false, ['encrypt', 'decrypt']));
    return chaves.get(raw);
  }
  const novaChave = () => b64.de(crypto.getRandomValues(new Uint8Array(32)));
  // resumo (SHA-256) de um texto: o pedido leva o resumo de um segredo, e só quem sabe o segredo fecha o pedido
  async function resumo(txt) {
    return b64.de(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))));
  }
  async function cifrar(raw, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveAes(raw), new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64.de(iv), ct: b64.de(new Uint8Array(ct)) };
  }
  async function decifrar(raw, env) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.para(env.iv) }, await chaveAes(raw), b64.para(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---------- ntfy ---------- */
  function ntfy(base) {
    const raiz = base.replace(/\/$/, '');
    return {
      real: true,
      async publicar(topico, obj) {
        const r = await fetch(`${raiz}/${topico}`, { method: 'POST', body: JSON.stringify(obj) });
        if (!r.ok) throw new Error(`publicar ${r.status}`);
        return r.json().catch(() => ({}));
      },
      // assina um ou mais canais; reconecta sozinho e continua de onde parou
      assinar(topicos, aoReceber, { desde } = {}) {
        let fonte = null;
        let fechado = false;
        let ultimo = desde || null;
        let espera = 1000;
        let timer = 0;
        let sinal = Date.now();
        let escondidoEm = 0;
        const vistos = new Set();
        const vivo = () => { sinal = Date.now(); };
        function abrir() {
          if (fechado) return;
          const q = ultimo ? `?since=${encodeURIComponent(ultimo)}` : '';
          fonte = new EventSource(`${raiz}/${topicos.join(',')}/sse${q}`);
          vivo();
          fonte.onopen = vivo;
          fonte.addEventListener('keepalive', vivo);
          fonte.onmessage = (ev) => {
            vivo();
            let m;
            try { m = JSON.parse(ev.data); } catch (e) { return; }
            if (m.event && m.event !== 'message') return;
            ultimo = m.id;
            espera = 1000;
            if (vistos.has(m.id)) return;
            vistos.add(m.id);
            if (vistos.size > 500) vistos.delete(vistos.values().next().value);
            let corpo;
            try { corpo = JSON.parse(m.message); } catch (e) { return; }
            aoReceber(corpo, m);
          };
          fonte.onerror = () => {
            fonte.close();
            if (fechado) return;
            clearTimeout(timer);
            timer = setTimeout(abrir, espera);
            espera = Math.min(espera * 2, 15000);
          };
        }
        // começa de novo de onde parou (o que chegou nesse meio-tempo vem junto)
        function reabrir() {
          if (fechado) return;
          clearTimeout(timer);
          if (fonte) fonte.close();
          espera = 1000;
          abrir();
        }
        // no iPhone, com a tela bloqueada ou o app em segundo plano, a conexão fica parada sem avisar:
        // na volta, reconecta na hora
        const acordar = () => {
          if (fechado) return;
          if (document.visibilityState === 'hidden') { escondidoEm = Date.now(); return; }
          const longe = escondidoEm && Date.now() - escondidoEm > 8000;
          escondidoEm = 0;
          if (!fonte || fonte.readyState !== 1 || longe) reabrir();
        };
        // o ntfy manda um sinal de vida a cada 45 s: sem nada por muito tempo, a conexão morreu
        const vigia = setInterval(() => {
          if (!fechado && document.visibilityState === 'visible' && Date.now() - sinal > 100000) reabrir();
        }, 20000);
        document.addEventListener('visibilitychange', acordar);
        window.addEventListener('pageshow', acordar);
        window.addEventListener('online', reabrir);
        abrir();
        return {
          fechar() {
            fechado = true;
            clearTimeout(timer);
            clearInterval(vigia);
            if (fonte) fonte.close();
            document.removeEventListener('visibilitychange', acordar);
            window.removeEventListener('pageshow', acordar);
            window.removeEventListener('online', reabrir);
          },
          ultimo: () => ultimo,
        };
      },
      // lê o que chegou num canal nos últimos minutos, sem ficar ouvindo
      async ler(topico, desde) {
        const r = await fetch(`${raiz}/${topico}/json?poll=1&since=${encodeURIComponent(desde)}`);
        if (!r.ok) throw new Error(`ler ${r.status}`);
        const txt = await r.text();
        return txt.split('\n').filter(Boolean).map((linha) => {
          try {
            const m = JSON.parse(linha);
            return m.event === 'message' ? { corpo: JSON.parse(m.message), m } : null;
          } catch (e) { return null; }
        }).filter(Boolean);
      },
    };
  }

  const canal = ntfy(cfg.ntfy);
  const topico = {
    pedidos: () => `${cfg.sala}-pedidos`,
    // pedidos fechados ficam num canal à parte: no canal de pedidos, cada mensagem vira um aviso no celular
    fechados: () => `${cfg.sala}-fechados`,
    online: () => `${cfg.sala}-online`,
    corrida: (id) => `drk-${id}`,
    rastreio: (id) => `drk-${id}-r`,
    // avisos curtos da corrida: p para o passageiro, m para o motorista
    aviso: (id, quem) => `drk-${id}-a${quem}`,
  };

  window.Drink.rede = {
    canal, topico, idAleatorio, cifraPronta,
    novoPar, importarPrivada, chaveComum, novaChave, cifrar, decifrar, resumo,
  };
}());
