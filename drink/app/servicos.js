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
  const gps = (() => {
    const ouvintes = new Set();
    let id = null;
    let ultima = null;
    let erro = null;
    function comecar() {
      if (id !== null || !('geolocation' in navigator)) return;
      id = navigator.geolocation.watchPosition((p) => {
        ultima = { lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy, t: Date.now() };
        erro = null;
        ouvintes.forEach((f) => f(ultima, null));
      }, (e) => {
        erro = e;
        ouvintes.forEach((f) => f(ultima, e));
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    }
    function parar() {
      if (id !== null) navigator.geolocation.clearWatch(id);
      id = null;
    }
    return {
      disponivel: 'geolocation' in navigator,
      ultima: () => ultima,
      erro: () => erro,
      assinar(f) {
        ouvintes.add(f);
        comecar();
        if (ultima || erro) setTimeout(() => f(ultima, erro), 0);
        return () => { ouvintes.delete(f); if (!ouvintes.size) parar(); };
      },
      // uma leitura só, com prazo
      agora(prazo = 15000) {
        return new Promise((ok, falha) => {
          if (ultima && Date.now() - ultima.t < 15000) { ok(ultima); return; }
          if (!('geolocation' in navigator)) { falha(new Error('sem GPS')); return; }
          navigator.geolocation.getCurrentPosition((p) => {
            ultima = { lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy, t: Date.now() };
            ok(ultima);
          }, falha, { enableHighAccuracy: true, maximumAge: 10000, timeout: prazo });
        });
      },
    };
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

  window.Drink.servicos = {
    cfg, BH, CAIXA, gps, distancia, textoKm, textoMin, preco, aproximar, naGrandeBH,
    buscar, endereco, rota, faltaNaLinha, virgula,
  };
}());
