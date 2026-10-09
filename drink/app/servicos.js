/* Drink — serviços reais usados pelo app: GPS do aparelho, mapa e busca de endereços (OpenStreetMap e
   Photon), rotas (OSRM) e o preço da corrida. Se um serviço cair, o app segue com uma estimativa. */
(function () {
  'use strict';

  const { precoDaViagem, hhmm } = window.Drink.util;

  // endereços dos serviços; nos testes dá para trocar por localStorage['drink-servicos']
  const cfg = {
    ntfy: 'https://ntfy.sh',
    photon: 'https://photon.komoot.io',
    osrm: 'https://router.project-osrm.org',
    // o mapa: vetorial do OpenFreeMap (dados do OpenStreetMap, sem chave); se ele não responder, as imagens do
    // OpenStreetMap e, por último, as da comunidade francesa
    mapaVetor: 'https://tiles.openfreemap.org/planet',
    mapaFontes: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    mapa: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapaReserva: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    sala: 'drink-bh-9r4t-v1',
    // SMS de verdade no cadastro: a configuração do app da Web do projeto no Firebase (apiKey, authDomain,
    // projectId, appId). Sem ela, o código chega como notificação neste celular.
    firebase: null,
  };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem('drink-servicos') || '{}')); } catch (e) { /* sem ajuste */ }

  const BH = { lat: -19.9245, lon: -43.9352 };           // Praça Sete
  const CAIXA = [-44.22, -20.12, -43.78, -19.68];        // Grande BH: oeste, sul, leste, norte

  /* ---------- distância e formatos ---------- */
  function distancia(a, b) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const virgula = (n, casas = 1) => n.toFixed(casas).replace('.', ',');
  function textoKm(km) {
    if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
    return `${virgula(km, km < 10 ? 1 : 0)} km`;
  }
  function textoMin(min) {
    const m = Math.max(1, Math.round(min));
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }
  // o valor do pedido, com a bandeira 2 da madrugada pelo relógio de verdade
  function preco(km, quando = new Date()) {
    return precoDaViagem(Math.round(km * 10) / 10, hhmm(quando));
  }
  // ponto arredondado (uns 500 m) para mostrar sem revelar o endereço exato
  const aproximar = (p) => ({ lat: Math.round(p.lat * 200) / 200, lon: Math.round(p.lon * 200) / 200 });
  const naGrandeBH = (p) => p.lon > CAIXA[0] && p.lon < CAIXA[2] && p.lat > CAIXA[1] && p.lat < CAIXA[3];

  /* ---------- GPS: um só vigia, vários interessados ---------- */
  // O que deixava o GPS falho: só o GPS fino (que demora ou nem pega em lugar fechado), qualquer leitura valia (uma
  // leitura de 2 km pela antena passava por cima de uma de 10 m), um prazo estourado virava "não achei você" e,
  // depois de um erro ou da volta do segundo plano, o vigia não voltava mais. Agora:
  // - a primeira posição vem rápida, pela rede e pelo wi-fi, enquanto o GPS fino esquenta e toma o lugar dela;
  // - uma leitura bem pior que a de agora, e de agora há pouco, não passa por cima; o tremido de quem está parado,
  //   dentro da margem de erro, é suavizado;
  // - prazo estourado com uma posição na mão não é erro (parado, o celular fica sem leitura nova); sem posição,
  //   tenta de novo, trocando entre o GPS fino e o da rede, com espera crescente;
  // - o vigia recomeça ao voltar para o app e quando a pessoa libera a localização nas configurações.
  const gps = (() => {
    const tem = 'geolocation' in navigator;
    const ouvintes = new Set();
    let id = null;
    let fino = true;
    let desde = 0;
    let ultima = null;
    let erro = null;
    let espera = 0;
    let tentativas = 0;
    let pendente = false;
    let liberado = '';

    const num = (x) => (Number.isFinite(x) ? x : null);
    const ler = (p) => ({
      lat: p.coords.latitude, lon: p.coords.longitude, precisao: Math.max(1, Math.round(num(p.coords.accuracy) || 5000)),
      rumo: num(p.coords.heading), vel: num(p.coords.speed), t: Date.now(),
    });
    function avisar() {
      ouvintes.forEach((f) => { try { f(ultima, erro); } catch (e) { setTimeout(() => { throw e; }, 0); } });
    }
    function receber(nova) {
      if (ultima) {
        const idade = nova.t - ultima.t;
        const d = distancia(ultima, nova);
        // bem pior que a de agora, que ainda vale, e no mesmo lugar: fica a de agora
        if (nova.precisao > Math.max(60, ultima.precisao * 2.5) && idade < 30000 && d < nova.precisao) return;
        // parado: o ponto não fica tremendo dentro da margem de erro (a leitura mais precisa pesa mais)
        if (d < 25 && d < Math.max(nova.precisao, ultima.precisao) * 0.5 && idade < 15000 && !(nova.vel > 1.5)) {
          const k = ultima.precisao / (ultima.precisao + nova.precisao);
          nova = { ...nova, lat: ultima.lat + (nova.lat - ultima.lat) * k, lon: ultima.lon + (nova.lon - ultima.lon) * k,
            precisao: Math.min(nova.precisao, ultima.precisao), rumo: nova.rumo === null ? ultima.rumo : nova.rumo };
        }
      }
      ultima = nova;
      erro = null;
      tentativas = 0;
      avisar();
      // está no GPS da rede há um tempo e veio posição: tenta o fino de novo
      if (!fino && Date.now() - desde > 30000) reiniciar(0, true);
    }
    function falhou(e) {
      if (e && e.code === 1) {             // negou: espera a pessoa liberar
        parar();
        erro = e;
        avisar();
        return;
      }
      // já com uma posição: parado, o celular pode passar minutos sem leitura nova (o prazo estoura e não é
      // erro); "sem sinal" só avisa e o mesmo vigia continua
      if (ultima) {
        if (e && e.code === 2) { erro = e; avisar(); }
        return;
      }
      erro = e || { code: 2, message: 'sem posição' };
      avisar();
      tentativas += 1;
      reiniciar(Math.min(20000, 1500 * tentativas), !fino);
    }
    function vigiar() {
      pendente = false;
      if (!tem || id !== null || !ouvintes.size) return;
      desde = Date.now();
      id = navigator.geolocation.watchPosition((p) => receber(ler(p)), falhou,
        fino ? { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 } : { enableHighAccuracy: false, maximumAge: 30000, timeout: 25000 });
      // a primeira posição, rápida: a da rede e do wi-fi (o GPS fino pode levar meio minuto pra pegar)
      if (fino && !ultima) {
        navigator.geolocation.getCurrentPosition((p) => receber(ler(p)), () => {}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 8000 });
      }
    }
    function parar() {
      clearTimeout(espera);
      pendente = false;
      if (id !== null) navigator.geolocation.clearWatch(id);
      id = null;
    }
    function reiniciar(ms = 0, comFino = true) {
      parar();
      fino = comFino;
      pendente = true;
      espera = setTimeout(vigiar, ms);
    }
    function comecar() {
      if (id !== null || pendente) return;      // vigiando, ou esperando a próxima tentativa
      if (erro && erro.code === 1) erro = null;   // nova tentativa: o navegador diz de novo se continua negado
      fino = true;
      vigiar();
    }
    // a pessoa liberou a localização nas configurações: volta na hora
    if (tem && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((st) => {
        liberado = st.state;
        st.addEventListener('change', () => {
          liberado = st.state;
          if (st.state !== 'denied' && ouvintes.size) { erro = null; tentativas = 0; reiniciar(0, true); }
        });
      }).catch(() => {});
    }
    // de volta ao app: o celular pode ter parado o vigia no segundo plano
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !ouvintes.size) return;
      if (!ultima || Date.now() - ultima.t > 15000 || id === null) { tentativas = 0; reiniciar(0, true); }
    });
    window.addEventListener('online', () => { if (ouvintes.size && !ultima) reiniciar(0, true); });

    const api = {
      disponivel: tem,
      ultima: () => ultima,
      erro: () => erro,
      negado: () => Boolean((erro && erro.code === 1) || liberado === 'denied'),
      assinar(f) {
        ouvintes.add(f);
        comecar();
        if (ultima || erro) setTimeout(() => { if (ouvintes.has(f)) f(ultima, erro); }, 0);
        return () => { ouvintes.delete(f); if (!ouvintes.size) parar(); };
      },
      // tenta de novo agora (o botão de achar você no mapa)
      tentar() { if (!tem) return; erro = null; tentativas = 0; reiniciar(0, true); },
      // uma posição recente, com prazo: usa o mesmo vigia (e a leitura rápida da rede, se o fino não vier)
      agora(prazo = 15000) {
        return new Promise((ok, falha) => {
          if (ultima && Date.now() - ultima.t < 15000) { ok(ultima); return; }
          if (!tem) { falha(Object.assign(new Error('sem GPS'), { code: 2 })); return; }
          let feito = false;
          let soltar = null;
          const fim = (fn, x) => {
            if (feito) return;
            feito = true;
            clearTimeout(t);
            if (soltar) soltar();
            fn(x);
          };
          const t = setTimeout(() => {
            if (ultima && Date.now() - ultima.t < 120000) fim(ok, ultima);
            else fim(falha, erro || Object.assign(new Error('o GPS não respondeu a tempo'), { code: 3 }));
          }, prazo);
          soltar = api.assinar((p, e) => {
            if (p && Date.now() - p.t < 15000) fim(ok, p);
            else if (e && e.code === 1) fim(falha, e);
          });
          if (feito) soltar();
        });
      },
    };
    return api;
  })();

  /* ---------- busca de endereços (Photon) ---------- */
  // em BH o "distrito" às vezes é a regional da prefeitura ("Regional Noroeste"), que ninguém usa como endereço:
  // vale o bairro
  const ehRegional = (s) => /^regional\b/i.test(String(s || '').trim());
  function lugarDe(f) {
    const p = f.properties || {};
    const [lon, lat] = f.geometry.coordinates;
    const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
    const bairro = [p.district, p.locality, p.suburb].find((b) => b && !ehRegional(b)) || '';
    const nome = p.name || rua || bairro || p.city || 'Local sem nome';
    const detalhe = [];
    if (p.name && rua && p.name !== p.street) detalhe.push(rua);
    if (bairro && bairro !== nome) detalhe.push(bairro);
    if (p.city && p.city !== nome && (p.city !== 'Belo Horizonte' || !bairro)) detalhe.push(p.city);
    return { nome, detalhe: detalhe.join(' · '), rua, bairro: bairro || p.city || '', lat, lon, tipo: p.osm_value || p.type || '' };
  }

  async function buscar(texto, perto, sinal) {
    const u = new URL(`${cfg.photon}/api/`);
    u.searchParams.set('q', texto);
    u.searchParams.set('limit', '8');
    u.searchParams.set('bbox', CAIXA.join(','));
    const ref = perto || BH;
    u.searchParams.set('lat', ref.lat.toFixed(5));
    u.searchParams.set('lon', ref.lon.toFixed(5));
    const r = await fetch(u, { signal: sinal });
    if (!r.ok) throw new Error(`busca ${r.status}`);
    const j = await r.json();
    const vistos = new Set();
    return (j.features || []).map(lugarDe).filter((l) => {
      const k = `${l.nome}|${l.detalhe}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }

  const cacheEndereco = new Map();
  async function endereco(p) {
    const k = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
    if (cacheEndereco.has(k)) return cacheEndereco.get(k);
    const u = new URL(`${cfg.photon}/reverse`);
    u.searchParams.set('lat', p.lat.toFixed(6));
    u.searchParams.set('lon', p.lon.toFixed(6));
    u.searchParams.set('limit', '1');
    const r = await fetch(u);
    if (!r.ok) throw new Error(`endereço ${r.status}`);
    const j = await r.json();
    if (!j.features || !j.features.length) throw new Error('sem endereço');
    const l = lugarDe(j.features[0]);
    // o ponto é o do GPS, não o do lugar mais perto
    const res = { ...l, lat: p.lat, lon: p.lon, nome: l.rua || l.nome };
    cacheEndereco.set(k, res);
    return res;
  }

  /* ---------- rota (OSRM), com estimativa se o serviço falhar ---------- */
  const cacheRota = new Map();
  async function rota(a, b) {
    const k = [a.lat, a.lon, b.lat, b.lon].map((x) => x.toFixed(4)).join(',');
    if (cacheRota.has(k)) return cacheRota.get(k);
    let res;
    try {
      const u = `${cfg.osrm}/route/v1/driving/${a.lon.toFixed(6)},${a.lat.toFixed(6)};${b.lon.toFixed(6)},${b.lat.toFixed(6)}?overview=full&geometries=geojson`;
      const ctl = new AbortController();
      const prazo = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(u, { signal: ctl.signal });
      clearTimeout(prazo);
      const j = await r.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes[0]) throw new Error('sem rota');
      const rt = j.routes[0];
      res = { km: rt.distance / 1000, min: rt.duration / 60, linha: rt.geometry.coordinates.map(([lon, lat]) => [lat, lon]), estimada: false };
    } catch (e) {
      const km = (distancia(a, b) / 1000) * 1.35;
      res = { km, min: (km / 24) * 60, linha: [[a.lat, a.lon], [b.lat, b.lon]], estimada: true };
    }
    cacheRota.set(k, res);
    return res;
  }

  // quanto falta andando por uma linha (a rota), a partir do ponto mais perto dela
  function faltaNaLinha(linha, p) {
    if (!linha || linha.length < 2) return null;
    let melhor = 0;
    let menor = Infinity;
    linha.forEach(([lat, lon], i) => {
      const d = distancia(p, { lat, lon });
      if (d < menor) { menor = d; melhor = i; }
    });
    let km = menor / 1000;
    for (let i = melhor; i < linha.length - 1; i += 1) {
      km += distancia({ lat: linha[i][0], lon: linha[i][1] }, { lat: linha[i + 1][0], lon: linha[i + 1][1] }) / 1000;
    }
    return km;
  }
  // n pontos ao longo de uma linha [[lat, lon], ...], com a mesma distância entre eles; o último é o fim da linha
  // (é por eles que anda o motorista ou o carro de uma simulação)
  function pontosNaLinha(linha, n) {
    const pts = (linha || []).map(([lat, lon]) => ({ lat, lon }));
    if (pts.length < 2) return pts.slice(0, 1);
    const acum = [0];
    for (let i = 1; i < pts.length; i += 1) acum.push(acum[i - 1] + distancia(pts[i - 1], pts[i]));
    const total = acum[acum.length - 1];
    const saida = [];
    let j = 1;
    for (let k = 1; k <= n; k += 1) {
      const alvo = (total * k) / n;
      while (j < pts.length - 1 && acum[j] < alvo) j += 1;
      const trecho = acum[j] - acum[j - 1];
      const f = trecho > 0 ? Math.min(1, Math.max(0, (alvo - acum[j - 1]) / trecho)) : 1;
      saida.push({ lat: pts[j - 1].lat + (pts[j].lat - pts[j - 1].lat) * f, lon: pts[j - 1].lon + (pts[j].lon - pts[j - 1].lon) * f });
    }
    return saida;
  }

  /* ---------- o dia do Drink ---------- */
  // vira às 6h da manhã: a noite de sexta (até o sábado cedo) conta inteira na sexta
  function diaDoDrink(t = Date.now()) {
    const d = new Date(t - 6 * 3600000);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  // quanto o motorista fez num dia do Drink, somando as corridas feitas
  function ganhosDoDia(feitas, dia = diaDoDrink()) {
    const lista = (feitas || []).filter((c) => c && diaDoDrink(new Date(c.data).getTime()) === dia);
    return { total: Math.round(lista.reduce((s, c) => s + (Number(c.total) || 0), 0) * 100) / 100, n: lista.length };
  }

  // folha por cima da tela: vira uma janela para o leitor de tela e o resto do app fica inerte (o toque, o Tab e
  // o leitor só alcançam a folha); o véu e os avisos que falam continuam de fora. Devolve a função que solta,
  // e que leva o foco de volta para quem abriu a folha (se ainda estiver na tela)
  function prenderFoco(folha) {
    const app = document.getElementById('app');
    const origem = document.activeElement;
    const inertes = [];
    folha.setAttribute('role', 'dialog');
    folha.setAttribute('aria-modal', 'true');
    for (let el = folha; el && el !== app && el.parentElement; el = el.parentElement) {
      Array.from(el.parentElement.children).forEach((irmao) => {
        if (irmao === el || irmao.hidden || irmao.inert || irmao.matches('.d-veu, .d-toast, .app-rede')) return;
        irmao.inert = true;
        inertes.push(irmao);
      });
    }
    return function soltar(devolverFoco = true) {
      inertes.forEach((x) => { x.inert = false; });
      if (devolverFoco && origem && origem !== document.body && origem.isConnected && origem.getClientRects().length && !origem.closest('[hidden], [inert]')) {
        origem.focus({ preventScroll: true });
      }
    };
  }

  window.Drink.servicos = {
    cfg, BH, CAIXA, gps, distancia, textoKm, textoMin, preco, aproximar, naGrandeBH,
    buscar, endereco, rota, faltaNaLinha, pontosNaLinha, virgula, diaDoDrink, ganhosDoDia, prenderFoco,
  };
}());
