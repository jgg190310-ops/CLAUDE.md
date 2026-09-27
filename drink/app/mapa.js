/* Drink — o mapa de verdade (Leaflet, com o mapa do OpenStreetMap escurecido no azul da noite do Drink).
   Marcadores do app: você, o Drink chegando, o destino e os Drinks online por perto. */
(function () {
  'use strict';

  const { cfg, BH } = window.Drink.servicos;
  const { reduzirMovimento } = window.Drink.util;

  // o alfinete do destino, rosa com o miolo escuro
  const PINO = '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" fill="#FF6FB1" stroke="#0E0D12" stroke-width="1.3"/><circle cx="12" cy="10" r="2.6" fill="#0E0D12"/>';
  function marca(classe, html, tam) {
    return L.divIcon({ className: `mk ${classe}`, html, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] });
  }
  const ICONE = {
    voce: () => marca('mk-voce', '<i></i>', 22),
    embarque: () => marca('mk-emb', '<i></i>', 20),
    destino: () => marca('mk-dest', `<svg viewBox="0 0 24 24" aria-hidden="true">${PINO}</svg>`, 34),
    motorista: (veic) => marca('mk-mot', `<svg aria-hidden="true"><use href="#i-${veic === 'patinete' ? 'patinete' : 'bike'}"/></svg>`, 38),
    carro: () => marca('mk-mot', '<svg aria-hidden="true"><use href="#i-carro"/></svg>', 38),
    online: () => marca('mk-on', '<i></i>', 14),
  };

  function criar(el, { centro = BH, zoom = 15 } = {}) {
    const mapa = L.map(el, {
      zoomControl: false, center: [centro.lat, centro.lon], zoom, zoomSnap: 0.25,
      attributionControl: true, tapTolerance: 20, bounceAtZoomLimits: false,
    });
    mapa.attributionControl.setPosition('topright')
      .setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    // o mapa claro do OpenStreetMap fica escuro no CSS (invertido, meio transparente sobre o azul da noite)
    const camada = L.tileLayer(cfg.mapa, { subdomains: 'abc', maxZoom: 19, opacity: 0.8, attribution: cfg.creditos }).addTo(mapa);
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
    let online = [];
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

    // move o marcador devagar até o ponto novo
    function mover(nome, p) {
      const m = pontos[nome];
      if (!m) return;
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

    // ponto na tela, descontando a folha de baixo que cobre o mapa
    function alvo(p, z) {
      const pt = mapa.project([p.lat, p.lon], z).add([0, folga() / 2]);
      return mapa.unproject(pt, z);
    }

    const api = {
      mapa,
      // quanto a folha de baixo cobre do mapa: um número ou uma função que mede na hora
      folga(x) { medirFolga = typeof x === 'function' ? x : () => x; },
      ponto(nome, p, icone) {
        if (!p) { api.tirar(nome); return; }
        if (pontos[nome]) { mover(nome, p); if (icone) pontos[nome].setIcon(icone); return; }
        pontos[nome] = L.marker([p.lat, p.lon], { icon: icone || ICONE.voce(), keyboard: false, interactive: false }).addTo(mapa);
        if (seguir === nome) api.centrar(p);
      },
      tirar(nome) {
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
      online(lista) {
        online.forEach((m) => m.remove());
        online = (lista || []).map((p) => L.marker([p.lat, p.lon], { icon: ICONE.online(), interactive: false, keyboard: false }).addTo(mapa));
      },
      // mostra todos os pontos dados, deixando livre o espaço da folha de baixo
      enquadrar(lista, { maxZoom = 16 } = {}) {
        const pts = lista.filter(Boolean).map((p) => [p.lat, p.lon]);
        if (!pts.length) return;
        if (pts.length === 1) { api.centrar({ lat: pts[0][0], lon: pts[0][1] }, maxZoom); return; }
        vista(() => mapa.fitBounds(L.latLngBounds(pts), {
          paddingTopLeft: [40, 90], paddingBottomRight: [40, folga() + 40], maxZoom, animate: !reduzirMovimento(),
        }));
      },
      centrar(p, zoom) {
        if (!p) return;
        vista(() => {
          const z = zoom || Math.max(mapa.getZoom(), 15);
          mapa.setView(alvo(p, z), z, { animate: !reduzirMovimento() });
        });
      },
      // o ponto que está no meio da área livre (o alfinete de "escolher no mapa")
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
      },
    };
    return api;
  }

  window.Drink.mapa = { criar, ICONE };
}());
