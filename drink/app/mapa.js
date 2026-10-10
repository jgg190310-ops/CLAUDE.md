/* Drink — o mapa de verdade. Mapa vetorial (MapLibre, com os dados do OpenStreetMap servidos pelo OpenFreeMap,
   sem chave) no desenho da noite do Drink: nítido em qualquer zoom e macio no dedo. Se o vetorial não carregar,
   o mesmo mapa passa para as imagens do OpenStreetMap; sem WebGL, o Leaflet mostra essas imagens.
   Marcadores do app: você, o Drink chegando, o embarque, o destino, o carro e os Drinks online por perto. */
(function () {
  'use strict';

  const S = window.Drink.servicos;
  const { cfg, BH } = S;
  const { reduzirMovimento } = window.Drink.util;
  const ESTILO = window.Drink.estiloMapa;

  // o alfinete do destino, rosa com o miolo escuro
  const PINO = '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" fill="#FF6FB1" stroke="#0E0D12" stroke-width="1.3"/><circle cx="12" cy="10" r="2.6" fill="#0E0D12"/>';
  // cada marcador é uma descrição (classe, desenho e tamanho): o motor do mapa monta o seu
  const marca = (classe, html, tam) => ({ classe, html, tam });
  const veiculo = (v) => `<svg aria-hidden="true"><use href="#i-${v === 'patinete' ? 'patinete' : 'bike'}"/></svg>`;
  const ICONE = {
    voce: () => marca('mk-voce', '<i></i>', 22),
    embarque: () => marca('mk-emb', '<i></i>', 20),
    destino: () => marca('mk-dest', `<svg viewBox="0 0 24 24" aria-hidden="true">${PINO}</svg>`, 34),
    motorista: (veic) => marca('mk-mot', veiculo(veic), 38),
    carro: () => marca('mk-mot', '<svg aria-hidden="true"><use href="#i-carro"/></svg>', 38),
    online: (veic) => marca('mk-on', veiculo(veic), 26),
    pedido: () => marca('mk-ped', '<i></i>', 18),
  };
  const CREDITOS = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

  // você (passageiro) e eu (motorista) ganham o círculo da margem de erro do GPS, quando ela passa de uns 20 m
  const ANEL = ['voce', 'eu'];
  const comAnel = (p) => (p && p.precisao > 20 ? { lat: p.lat, lon: p.lon, precisao: Math.min(p.precisao, 3000) } : null);
  function circulo(p, metros) {
    const dLat = metros / 111320;
    const dLon = metros / (111320 * Math.cos((p.lat * Math.PI) / 180));
    const anel = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * 2 * Math.PI;
      anel.push([p.lon + dLon * Math.cos(a), p.lat + dLat * Math.sin(a)]);
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anel] } };
  }

  // o tema do app (escuro ou claro), decidido em app.js e guardado no <html>
  const temaAtual = () => (document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro');
  // o mapa inclinado, em 3D, como no GPS do carro (sem WebGL, o Leaflet fica reto)
  const INCLINACAO = 48;

  function temWebGL() {
    if (!window.maplibregl) return false;
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  // os Drinks online chegam com a posição arredondada (uns 500 m, para não mostrar onde a pessoa está): cada um
  // ganha um desvio fixo dentro desse quadrado, e não ficam todos empilhados no mesmo ponto
  function espalhar(p) {
    const semente = String(p.id || `${p.lat},${p.lon}`);
    let h = 2166136261;
    for (let i = 0; i < semente.length; i += 1) { h ^= semente.charCodeAt(i); h = Math.imul(h, 16777619); }
    const a = ((h >>> 0) % 1000) / 1000 - 0.5;
    const b = (((h >>> 10) >>> 0) % 1000) / 1000 - 0.5;
    return { lat: p.lat + a * 0.004, lon: p.lon + b * 0.004, veic: p.veic };
  }

  // quanto do mapa fica escondido embaixo: um número, uma função ou a própria folha
  function cobre(el, x) {
    if (typeof x === 'function') return x;
    if (x && x.getBoundingClientRect) {
      return () => {
        const f = x.getBoundingClientRect();
        if (!f.height) return 0;
        return Math.max(0, el.getBoundingClientRect().bottom - f.top);
      };
    }
    return () => x;
  }

  // a última vista que o app pediu (enquadrar ou centrar), para refazer quando o mapa muda de formato: o celular
  // deitou e voltou em pé, a janela mudou muito. Sem isso, o motorista e o destino ficam fora da tela. Se a
  // pessoa mexeu no mapa com o dedo, a vista passa a ser dela e fica como está.
  function memoriaDaVista(el) {
    let refazer = null;
    let formato = null;
    let espera = 0;
    const medir = () => ({ w: el.clientWidth, h: el.clientHeight });
    const mudou = (a, b) => !a.w || !a.h || (a.w > a.h) !== (b.w > b.h) || Math.abs(a.w - b.w) > a.w / 4 || Math.abs(a.h - b.h) > a.h / 4;
    return {
      guardar(fazer) { refazer = fazer; formato = medir(); },
      esquecer() { refazer = null; clearTimeout(espera); },
      conferir() {
        const agora = medir();
        if (!refazer || !agora.w || !agora.h || !mudou(formato, agora)) return;
        clearTimeout(espera);
        espera = setTimeout(() => { if (refazer) { formato = medir(); refazer(); } }, 250);
      },
      // a folha de baixo mudou de altura (o preço e a rota chegaram depois): refaz a vista no espaço novo
      folhaMudou() {
        if (!refazer) return;
        clearTimeout(espera);
        espera = setTimeout(() => { if (refazer) refazer(); }, 180);
      },
    };
  }

  // acompanha a altura da folha: quando ela cresce ou encolhe de verdade, a vista é refeita (a rota não fica embaixo dela)
  function vigiarFolha(x, medida, memoria, antigo) {
    if (antigo) antigo.disconnect();
    if (!x || !x.getBoundingClientRect || typeof ResizeObserver === 'undefined') return null;
    let ultima = null;
    const ob = new ResizeObserver(() => {
      const agora = medida();
      if (ultima !== null && Math.abs(agora - ultima) > 12) memoria.folhaMudou();
      ultima = agora;
    });
    ob.observe(x);
    return ob;
  }

  function criar(el, opcoes = {}) {
    if (temWebGL()) {
      try { return criarGL(el, opcoes); } catch (e) { el.innerHTML = ''; }
    }
    return criarLeaflet(el, opcoes);
  }

  /* ---------- mapa vetorial (MapLibre) ---------- */
  function criarGL(el, { centro = BH, zoom = 15, inclinar = true } = {}) {
    const gl = window.maplibregl;
    // o app conta o zoom como o Leaflet (ladrilhos de 256 px); o MapLibre usa ladrilhos de 512 px: um a menos
    const zGL = (z) => z - 1;
    const mapa = new gl.Map({
      container: el, style: ESTILO.vetorial(cfg, temaAtual()), center: [centro.lon, centro.lat], zoom: zGL(zoom), pitch: inclinar ? INCLINACAO : 0,
      minZoom: 3, maxZoom: 19, maxPitch: 60, attributionControl: false, dragRotate: false, pitchWithRotate: false,
      touchPitch: false, renderWorldCopies: false, fadeDuration: 160, refreshExpiredTiles: false,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.keyboard.disableRotation();
    el.classList.add('mapa-gl');
    el.mapaGL = mapa;
    const creditos = document.createElement('p');
    creditos.className = 'mapa-creditos';
    creditos.innerHTML = CREDITOS;
    el.appendChild(creditos);

    // se o mapa vetorial não carregar, o mesmo mapa passa para as imagens do OpenStreetMap
    const reservas = [cfg.mapa, cfg.mapaReserva].filter(Boolean);
    let fonte = 'omt';
    let urlImagens = null;
    let carregou = false;
    let falhas = 0;
    let estiloPronto = false;
    function trocarEstilo() {
      const url = reservas.shift();
      if (!url) return;
      fonte = 'osm';
      carregou = false;
      falhas = 0;
      estiloPronto = false;
      el.classList.add('mapa-imagens');
      creditos.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
      urlImagens = url;
      mapa.setStyle(ESTILO.imagens(url, temaAtual()));
      setTimeout(() => { if (!carregou && fonte === 'osm') trocarEstilo(); }, 12000);
    }
    mapa.on('sourcedata', (e) => { if (e.sourceId === fonte && e.tile) carregou = true; });
    mapa.on('error', (e) => {
      if (!e || e.sourceId !== fonte || carregou) return;
      falhas += 1;
      if (falhas >= 3) trocarEstilo();
    });
    setTimeout(() => { if (!carregou && fonte === 'omt') trocarEstilo(); }, 12000);
    mapa.on('style.load', () => { estiloPronto = true; aplicarPrecisao(); aplicarRota(); });
    // trocou o tema: o mesmo mapa no outro desenho (a rota e a margem do GPS voltam no style.load)
    window.addEventListener('drink-tema', () => {
      estiloPronto = false;
      mapa.setStyle(fonte === 'omt' ? ESTILO.vetorial(cfg, temaAtual()) : ESTILO.imagens(urlImagens, temaAtual()), { diff: false });
    });
    const memoria = memoriaDaVista(el);
    let vigia = null;
    mapa.on('resize', () => memoria.conferir());
    mapa.on('dragstart', () => memoria.esquecer());
    mapa.on('zoomstart', (e) => { if (e && e.originalEvent) memoria.esquecer(); });

    const pontos = {};
    const tweens = {};
    let linhaRota = null;
    let anel = null;
    const grupos = { online: [], pedidos: [] };
    let medirFolga = () => 0;
    let seguir = null;
    const folga = () => Math.max(0, medirFolga() || 0);
    const duracao = () => (reduzirMovimento() ? 0 : 650);

    function pintar(caixa, icone) {
      const chave = `${icone.classe}|${icone.html}`;
      if (caixa.dataset.chave === chave) return;
      caixa.dataset.chave = chave;
      caixa.innerHTML = `<div class="mk ${icone.classe}" style="width:${icone.tam}px;height:${icone.tam}px">${icone.html}</div>`;
    }
    function marcador(p, icone) {
      const caixa = document.createElement('div');
      caixa.className = 'mk-caixa';
      pintar(caixa, icone);
      return new gl.Marker({ element: caixa, anchor: 'center' }).setLngLat([p.lon, p.lat]).addTo(mapa);
    }
    // move o marcador devagar até o ponto novo
    function mover(nome, p) {
      const m = pontos[nome];
      const de = m.getLngLat();
      if (tweens[nome]) cancelAnimationFrame(tweens[nome]);
      if (reduzirMovimento() || S.distancia({ lat: de.lat, lon: de.lng }, p) > 2000) { m.setLngLat([p.lon, p.lat]); return; }
      const t0 = performance.now();
      const passo = (agora) => {
        const t = Math.min(1, (agora - t0) / 900);
        m.setLngLat([de.lng + (p.lon - de.lng) * t, de.lat + (p.lat - de.lat) * t]);
        if (t < 1) tweens[nome] = requestAnimationFrame(passo);
      };
      tweens[nome] = requestAnimationFrame(passo);
    }

    function aplicarRota() {
      if (!estiloPronto) return;
      const f = mapa.getSource('rota');
      if (!linhaRota) {
        if (f) { ['rota-luz', 'rota-borda'].forEach((id) => { if (mapa.getLayer(id)) mapa.removeLayer(id); }); mapa.removeSource('rota'); }
        return;
      }
      const dados = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: linhaRota.map(([lat, lon]) => [lon, lat]) } };
      if (f) { f.setData(dados); return; }
      mapa.addSource('rota', { type: 'geojson', data: dados });
      const antes = mapa.getLayer('bares') ? 'bares' : undefined;
      const jeito = { 'line-cap': 'round', 'line-join': 'round' };
      // escuro: a rota em limão com borda escura; claro: a rota escura com um halo limão
      const claro = temaAtual() === 'claro';
      mapa.addLayer({ id: 'rota-borda', type: 'line', source: 'rota', layout: jeito, paint: { 'line-color': claro ? '#C2F23A' : '#0E0D12', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, claro ? 8 : 6, 16, claro ? 14 : 11], 'line-opacity': claro ? 0.9 : 0.6, 'line-blur': claro ? 1.5 : 0 } }, antes);
      mapa.addLayer({ id: 'rota-luz', type: 'line', source: 'rota', layout: jeito, paint: { 'line-color': claro ? '#0E0D12' : '#D2FF3C', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 5.5] } }, antes);
    }

    // a margem de erro do GPS: um círculo azul claro em volta de você
    function aplicarPrecisao() {
      if (!estiloPronto) return;
      const f = mapa.getSource('precisao');
      const dados = anel ? circulo(anel, anel.precisao) : { type: 'FeatureCollection', features: [] };
      if (f) { f.setData(dados); return; }
      if (!anel) return;
      mapa.addSource('precisao', { type: 'geojson', data: dados });
      const antes = mapa.getLayer('rota-borda') ? 'rota-borda' : (mapa.getLayer('bares') ? 'bares' : undefined);
      mapa.addLayer({ id: 'precisao-fundo', type: 'fill', source: 'precisao', paint: { 'fill-color': '#5B67FF', 'fill-opacity': 0.13 } }, antes);
      mapa.addLayer({ id: 'precisao-borda', type: 'line', source: 'precisao', paint: { 'line-color': '#8D97FF', 'line-opacity': 0.5, 'line-width': 1 } }, antes);
    }

    // inclinado em 3D; mas se sobra pouco mapa acima da folha (celular baixo), fica mais deitado para a rota caber
    const pitch = () => {
      if (!inclinar) return 0;
      const livre = (el.clientHeight || 600) - folga();
      return livre < 260 ? 18 : livre < 360 ? 32 : INCLINACAO;
    };
    function centrarAgora(p, z) {
      mapa.easeTo({ center: [p.lon, p.lat], zoom: zGL(z), pitch: pitch(), offset: [0, -folga() / 2], duration: duracao() });
    }

    const api = {
      mapa,
      // quanto a folha de baixo cobre do mapa: um número ou uma função que mede na hora
      // (uma folha: mede do topo dela até o pé do mapa, e assim conta também a margem da folha solta e a barra de abas)
      folga(x) { medirFolga = cobre(el, x); vigia = vigiarFolha(x, folga, memoria, vigia); },
      aoMover(fn) { mapa.on('moveend', fn); },
      ponto(nome, p, icone) {
        if (!p) { api.tirar(nome); return; }
        if (ANEL.includes(nome)) { anel = comAnel(p); aplicarPrecisao(); }
        if (pontos[nome]) { mover(nome, p); if (icone) pintar(pontos[nome].getElement(), icone); return; }
        pontos[nome] = marcador(p, icone || ICONE.voce());
        if (seguir === nome) api.centrar(p);
      },
      tirar(nome) {
        if (ANEL.includes(nome)) { anel = null; aplicarPrecisao(); }
        if (tweens[nome]) cancelAnimationFrame(tweens[nome]);
        if (pontos[nome]) { pontos[nome].remove(); delete pontos[nome]; }
      },
      tem: (nome) => Boolean(pontos[nome]),
      rota(linha) {
        linhaRota = linha && linha.length >= 2 ? linha : null;
        aplicarRota();
      },
      semRota() { linhaRota = null; aplicarRota(); },
      // os Drinks online por perto (para o passageiro) e os pedidos abertos (para o motorista)
      online(lista) { api.grupo('online', lista, (q) => ICONE.online(q.veic)); },
      pedidos(lista) { api.grupo('pedidos', lista, () => ICONE.pedido()); },
      grupo(nome, lista, desenho) {
        grupos[nome].forEach((m) => m.remove());
        grupos[nome] = (lista || []).map((p) => { const q = espalhar(p); return marcador(q, desenho(q)); });
      },
      // mostra todos os pontos dados, deixando livre o espaço da folha de baixo. A lista pode ser uma função:
      // quando a vista é refeita, os pontos são os de agora (o motorista andou)
      enquadrar(lista, { maxZoom = 16 } = {}) {
        const pegar = typeof lista === 'function' ? lista : () => lista;
        const fazer = () => {
          const pts = (pegar() || []).filter(Boolean);
          if (pts.length === 1) { centrarAgora(pts[0], maxZoom); return; }
          if (!pts.length) return;
          // a caixa da rota fica no pedaço de mapa que sobra acima da folha: com pouco espaço (celular baixo), o
          // respiro de cima encolhe antes, para a rota não ficar embaixo da folha
          const alto = el.clientHeight || 600;
          const livre = alto - folga();
          const topo = Math.round(Math.min(96, Math.max(20, livre * 0.25)));
          const baixo = Math.max(40, Math.min(folga() + 36, alto - topo - 90));
          const caixa = new gl.LngLatBounds();
          pts.forEach((p) => caixa.extend([p.lon, p.lat]));
          mapa.fitBounds(caixa, { padding: { top: topo, bottom: baixo, left: 44, right: 44 }, maxZoom: zGL(maxZoom), pitch: pitch(), duration: duracao() });
        };
        memoria.guardar(fazer);
        fazer();
      },
      centrar(p, zoom) {
        if (!p) return;
        const z = zoom || Math.max(mapa.getZoom() + 1, 15);
        memoria.guardar(() => centrarAgora(p, z));
        centrarAgora(p, z);
      },
      // o ponto que está no meio da área livre (o alfinete de "escolher no mapa")
      meio() {
        const ll = mapa.unproject([el.clientWidth / 2, (el.clientHeight - folga()) / 2]);
        return { lat: ll.lat, lon: ll.lng };
      },
      seguir(nome) { seguir = nome; },
      ajustar() { mapa.resize(); },
      limpar() {
        Object.keys(pontos).forEach((n) => { if (n !== 'voce') api.tirar(n); });
        api.semRota();
        api.online([]);
        api.pedidos([]);
        memoria.esquecer();
      },
    };
    return api;
  }

  /* ---------- sem WebGL: Leaflet com as imagens do OpenStreetMap ---------- */
  function criarLeaflet(el, { centro = BH, zoom = 15 } = {}) {
    const icone = (m) => L.divIcon({ className: `mk ${m.classe}`, html: m.html, iconSize: [m.tam, m.tam], iconAnchor: [m.tam / 2, m.tam / 2] });
    const mapa = L.map(el, {
      zoomControl: false, center: [centro.lat, centro.lon], zoom, zoomSnap: 0.25,
      attributionControl: false, tapTolerance: 20, bounceAtZoomLimits: false,
    });
    el.classList.add('mapa-imagens');
    const creditos = document.createElement('p');
    creditos.className = 'mapa-creditos';
    creditos.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
    el.appendChild(creditos);
    // o mapa claro do OpenStreetMap fica escuro no CSS (invertido, meio transparente sobre o azul da noite)
    const camada = L.tileLayer(cfg.mapa, { subdomains: 'abc', maxZoom: 19, opacity: 0.8 }).addTo(mapa);
    let carregados = 0;
    let falhas = 0;
    camada.on('tileload', () => { carregados += 1; });
    camada.on('tileerror', () => {
      falhas += 1;
      if (cfg.mapaReserva && falhas >= 6 && carregados < 2 && camada._url !== cfg.mapaReserva) camada.setUrl(cfg.mapaReserva);
    });

    const pontos = {};
    const tweens = {};
    let rota = null;
    let anel = null;
    const grupos = { online: [], pedidos: [] };
    let medirFolga = () => 0;
    let seguir = null;
    let pendente = null;
    const folga = () => medirFolga() || 0;

    // o Leaflet ignora mudar a vista no meio de um zoom animado: a mudança espera o zoom terminar
    function vista(fazer) {
      if (mapa._animatingZoom) {
        if (!pendente) mapa.once('zoomend', () => { const f = pendente; pendente = null; if (f) f(); });
        pendente = fazer;
        return;
      }
      fazer();
    }
    function mover(nome, p) {
      const m = pontos[nome];
      const de = m.getLatLng();
      const ate = L.latLng(p.lat, p.lon);
      if (tweens[nome]) cancelAnimationFrame(tweens[nome]);
      if (reduzirMovimento() || de.distanceTo(ate) > 2000) { m.setLatLng(ate); return; }
      const t0 = performance.now();
      const passo = (agora) => {
        const t = Math.min(1, (agora - t0) / 900);
        m.setLatLng([de.lat + (ate.lat - de.lat) * t, de.lng + (ate.lng - de.lng) * t]);
        if (t < 1) tweens[nome] = requestAnimationFrame(passo);
      };
      tweens[nome] = requestAnimationFrame(passo);
    }
    const memoria = memoriaDaVista(el);
    let vigia = null;
    mapa.on('resize', () => memoria.conferir());
    // o dedo mexeu no mapa (arrastar, pinça, dois toques, rodinha): a vista é da pessoa
    mapa.on('dragstart dblclick', () => memoria.esquecer());
    el.addEventListener('touchstart', (e) => { if (e.touches.length > 1) memoria.esquecer(); }, { passive: true });
    el.addEventListener('wheel', () => memoria.esquecer(), { passive: true });
    // ponto na tela, descontando a folha de baixo que cobre o mapa
    function alvo(p, z) {
      const pt = mapa.project([p.lat, p.lon], z).add([0, folga() / 2]);
      return mapa.unproject(pt, z);
    }

    function centrarAgora(p, zoom) {
      vista(() => {
        const z = zoom || Math.max(mapa.getZoom(), 15);
        mapa.setView(alvo(p, z), z, { animate: !reduzirMovimento() });
      });
    }

    const api = {
      mapa,
      // (uma folha: mede do topo dela até o pé do mapa, e assim conta também a margem da folha solta e a barra de abas)
      folga(x) { medirFolga = cobre(el, x); vigia = vigiarFolha(x, folga, memoria, vigia); },
      aoMover(fn) { mapa.on('moveend', fn); },
      ponto(nome, p, ic) {
        if (!p) { api.tirar(nome); return; }
        if (ANEL.includes(nome)) {
          const a = comAnel(p);
          if (!a) { if (anel) { anel.remove(); anel = null; } } else if (anel) { anel.setLatLng([a.lat, a.lon]); anel.setRadius(a.precisao); } else {
            anel = L.circle([a.lat, a.lon], { radius: a.precisao, color: '#8D97FF', weight: 1, opacity: 0.5, fillColor: '#5B67FF', fillOpacity: 0.13, interactive: false }).addTo(mapa);
          }
        }
        if (pontos[nome]) { mover(nome, p); if (ic) pontos[nome].setIcon(icone(ic)); return; }
        pontos[nome] = L.marker([p.lat, p.lon], { icon: icone(ic || ICONE.voce()), keyboard: false, interactive: false }).addTo(mapa);
        if (seguir === nome) api.centrar(p);
      },
      tirar(nome) {
        if (ANEL.includes(nome) && anel) { anel.remove(); anel = null; }
        if (pontos[nome]) { pontos[nome].remove(); delete pontos[nome]; }
      },
      tem: (nome) => Boolean(pontos[nome]),
      rota(linha) {
        api.semRota();
        if (!linha || linha.length < 2) return;
        rota = L.layerGroup([
          L.polyline(linha, { color: '#0E0D12', weight: 10, opacity: 0.55, interactive: false }),
          L.polyline(linha, { color: '#D2FF3C', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }),
        ]).addTo(mapa);
      },
      semRota() { if (rota) { rota.remove(); rota = null; } },
      online(lista) { api.grupo('online', lista, (q) => ICONE.online(q.veic)); },
      pedidos(lista) { api.grupo('pedidos', lista, () => ICONE.pedido()); },
      grupo(nome, lista, desenho) {
        grupos[nome].forEach((m) => m.remove());
        grupos[nome] = (lista || []).map((p) => { const q = espalhar(p); return L.marker([q.lat, q.lon], { icon: icone(desenho(q)), interactive: false, keyboard: false }).addTo(mapa); });
      },
      enquadrar(lista, { maxZoom = 16 } = {}) {
        const pegar = typeof lista === 'function' ? lista : () => lista;
        const fazer = () => {
          const pts = (pegar() || []).filter(Boolean).map((p) => [p.lat, p.lon]);
          if (pts.length === 1) { centrarAgora({ lat: pts[0][0], lon: pts[0][1] }, maxZoom); return; }
          if (!pts.length) return;
          vista(() => mapa.fitBounds(L.latLngBounds(pts), {
            paddingTopLeft: [40, 90], paddingBottomRight: [40, folga() + 40], maxZoom, animate: !reduzirMovimento(),
          }));
        };
        memoria.guardar(fazer);
        fazer();
      },
      centrar(p, zoom) {
        if (!p) return;
        memoria.guardar(() => centrarAgora(p, zoom));
        centrarAgora(p, zoom);
      },
      meio() {
        const tam = mapa.getSize();
        const ll = mapa.containerPointToLatLng([tam.x / 2, (tam.y - folga()) / 2]);
        return { lat: ll.lat, lon: ll.lng };
      },
      seguir(nome) { seguir = nome; },
      ajustar() { mapa.invalidateSize({ pan: false }); },
      limpar() {
        Object.keys(pontos).forEach((n) => { if (n !== 'voce') api.tirar(n); });
        api.semRota();
        api.online([]);
        api.pedidos([]);
        memoria.esquecer();
      },
    };
    return api;
  }

  window.Drink.mapa = { criar, ICONE };
}());
