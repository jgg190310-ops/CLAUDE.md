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

  /* ---------- como está a conexão ---------- */
  // cada assinatura diz se está ligada e a fila diz se tem mensagem esperando; a tela junta tudo num aviso só
  const conexao = (() => {
    const fontes = new Map();
    const ouvintes = new Set();
    let pendentes = 0;
    let atual = 'ok';
    function avisar() {
      const caiu = [...fontes.values()].some((ok) => !ok);
      const estado = navigator.onLine === false ? 'sem-internet' : (caiu || pendentes > 0 ? 'tentando' : 'ok');
      if (estado === atual) return;
      atual = estado;
      ouvintes.forEach((fn) => { try { fn(estado); } catch (e) { /* segue */ } });
    }
    window.addEventListener('online', avisar);
    window.addEventListener('offline', avisar);
    return {
      fonte(id, ok) { if (ok === null) fontes.delete(id); else fontes.set(id, ok); avisar(); },
      fila(n) { pendentes = n; avisar(); },
      ouvir(fn) { ouvintes.add(fn); if (atual !== 'ok') fn(atual); return () => ouvintes.delete(fn); },
      agora: () => atual,
    };
  })();

  /* ---------- ntfy ---------- */
  function ntfy(base) {
    const raiz = base.replace(/\/$/, '');
    return {
      real: true,
      async publicar(topico, obj) {
        const r = await fetch(`${raiz}/${topico}`, { method: 'POST', body: JSON.stringify(obj) });
        if (!r.ok) { const e = new Error(`publicar ${r.status}`); e.status = r.status; throw e; }
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
        const ivs = new Set();
        const id = idAleatorio(6);
        const vivo = () => { sinal = Date.now(); };
        function abrir() {
          if (fechado) return;
          const q = ultimo ? `?since=${encodeURIComponent(ultimo)}` : '';
          fonte = new EventSource(`${raiz}/${topicos.join(',')}/sse${q}`);
          vivo();
          fonte.onopen = () => { vivo(); conexao.fonte(id, true); };
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
            // o mesmo envelope duas vezes (a resposta do envio se perdeu e a fila mandou de novo): vale uma vez só
            if (corpo && typeof corpo.iv === 'string') {
              if (ivs.has(corpo.iv)) return;
              ivs.add(corpo.iv);
              if (ivs.size > 500) ivs.delete(ivs.values().next().value);
            }
            aoReceber(corpo, m);
          };
          fonte.onerror = () => {
            fonte.close();
            if (fechado) return;
            conexao.fonte(id, false);
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
        conexao.fonte(id, false);
        abrir();
        return {
          fechar() {
            fechado = true;
            clearTimeout(timer);
            clearInterval(vigia);
            conexao.fonte(id, null);
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

  /* ---------- fila de envio ---------- */
  // no bar, no elevador ou na garagem o sinal cai: as mensagens esperam na fila, saem na ordem, uma de cada vez,
  // e o app insiste até irem. A fila fica guardada no aparelho: se o app fechar, ela continua quando abrir.
  const fila = (() => {
    const CHAVE = 'drink-fila';
    let itens = [];
    try {
      const guardados = JSON.parse(localStorage.getItem(CHAVE) || '[]');
      itens = Array.isArray(guardados) ? guardados.filter((x) => x && x.topico && x.obj && Date.now() < x.ate) : [];
    } catch (e) { itens = []; }
    let rodando = false;
    let falhas = 0;
    let acordar = null;
    function guardar() {
      try { if (itens.length) localStorage.setItem(CHAVE, JSON.stringify(itens)); else localStorage.removeItem(CHAVE); } catch (e) { /* cheio: fica só na memória */ }
      conexao.fila(itens.length);
    }
    const dormir = (ms) => new Promise((ok) => {
      const t = setTimeout(() => { acordar = null; ok(); }, ms);
      acordar = () => { clearTimeout(t); acordar = null; ok(); };
    });
    async function rodar() {
      if (rodando) return;
      rodando = true;
      while (itens.length) {
        const item = itens[0];
        if (Date.now() > item.ate) { itens = itens.filter((x) => x !== item); guardar(); continue; }
        try {
          await canal.publicar(item.topico, item.obj);
          itens = itens.filter((x) => x !== item);
          falhas = 0;
          guardar();
        } catch (e) {
          // recusada pelo servidor (fora o limite de envios): insistir não adianta
          if (e && e.status >= 400 && e.status < 500 && ![408, 429].includes(e.status)) { itens = itens.filter((x) => x !== item); guardar(); continue; }
          falhas += 1;
          conexao.fila(itens.length);
          const base = e && e.status === 429 ? 10000 : 1500;
          await dormir(Math.min(base * 2 ** Math.min(falhas - 1, 5), 60000));
        }
      }
      rodando = false;
    }
    // a internet voltou ou o app voltou para a frente: tenta agora, sem esperar a vez
    const cutucar = () => { falhas = 0; if (acordar) acordar(); };
    window.addEventListener('online', cutucar);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cutucar(); });
    if (itens.length) { conexao.fila(itens.length); setTimeout(rodar, 0); }
    return {
      // troca: uma mensagem que torna a anterior inútil (a posição nova vale mais que a velha)
      mandar(topicoEnvio, obj, { validade = 30 * 60000, troca = '' } = {}) {
        if (troca) itens = itens.filter((x) => x.troca !== troca);
        itens.push({ topico: topicoEnvio, obj, ate: Date.now() + validade, troca });
        guardar();
        rodar();
      },
      pendentes: () => itens.length,
    };
  })();

  // a cidade em regiões de 0,05° (uns 5 km)
  const celula = (p) => [Math.floor((p.lon + 180) / 0.05), Math.floor((p.lat + 90) / 0.05)];
  function vizinhas(p, anel) {
    const [ix, iy] = celula(p);
    const lista = [];
    for (let dx = -anel; dx <= anel; dx += 1) for (let dy = -anel; dy <= anel; dy += 1) lista.push(`${ix + dx}-${iy + dy}`);
    return lista;
  }
  const topico = {
    pedidos: () => `${cfg.sala}-pedidos`,
    // as voltas agendadas: o ntfy guarda por 12 h, que é o limite para agendar
    agendadas: () => `${cfg.sala}-agendadas`,
    // pedidos fechados ficam num canal à parte: no canal de pedidos, cada mensagem vira um aviso no celular
    fechados: () => `${cfg.sala}-fechados`,
    online: () => `${cfg.sala}-online`,
    // regiões de uns 5 km (0,05°): o pedido também sai no canal da região do embarque, e o motorista só
    // recebe aviso (com o app fechado) dos pedidos das regiões em volta dele
    regiao: (p) => `${cfg.sala}-r-${celula(p).join('-')}`,
    regioes: (p, anel = 1) => vizinhas(p, anel).map((c) => `${cfg.sala}-r-${c}`),
    // "me avise quando tiver Drink perto": quem fica online avisa a região dele no canal da hora cheia; quem quer
    // ser avisado assina as regiões em volta nas próximas horas, e o aviso some sozinho quando elas passam
    regiaoOnline: (p, hora = Math.floor(Date.now() / 3600000)) => `${cfg.sala}-o-${celula(p).join('-')}-${hora}`,
    regioesOnline: (p, horas = 3) => {
      const h0 = Math.floor(Date.now() / 3600000);
      return vizinhas(p, 1).flatMap((c) => Array.from({ length: horas }, (_, k) => `${cfg.sala}-o-${c}-${h0 + k}`));
    },
    corrida: (id) => `drk-${id}`,
    rastreio: (id) => `drk-${id}-r`,
    // avisos curtos da corrida: p para o passageiro, m para o motorista
    aviso: (id, quem) => `drk-${id}-a${quem}`,
    // as contas das voltas de um evento, cifradas com a chave que só existe no convite
    evento: (id) => `drk-ev-${id}`,
  };

  window.Drink.rede = {
    canal, fila, conexao, topico, idAleatorio, cifraPronta,
    novoPar, importarPrivada, chaveComum, novaChave, cifrar, decifrar, resumo,
  };
}());
