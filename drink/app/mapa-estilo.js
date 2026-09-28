/* Drink — o desenho do mapa: a noite de BH em azul-marinho, ruas limpas, nomes legíveis e os bares em limão.
   Mapa vetorial do OpenFreeMap (dados do OpenStreetMap, sem chave), no esquema OpenMapTiles. Se ele não
   responder, o app usa o mapa de imagens do OpenStreetMap, escurecido do mesmo jeito. */
(function () {
  'use strict';

  const COR = {
    chao: '#11142A',
    bairro: '#13172F',
    comercio: '#161A35',
    verde: '#122C2D',
    agua: '#0C2649',
    rio: '#15407A',
    predio: '#1A1F3F',
    predioBorda: '#232A55',
    rua: '#262E57',
    ruaMedia: '#30396A',
    avenida: '#3A447B',
    rodovia: '#4A5594',
    trilha: '#2B3360',
    trilho: '#2A3159',
    nomeRua: '#9AA2D6',
    nomeBairro: '#737BB0',
    nomeCidade: '#EDE3D0',
    nomeAgua: '#5582C6',
    numero: '#5A6294',
    bar: '#D2FF3C',
    nomeBar: '#D9F58E',
  };
  const NOME = ['coalesce', ['get', 'name:pt'], ['get', 'name']];
  const FONTE = ['Noto Sans Regular'];
  const FONTE_B = ['Noto Sans Bold'];
  const FONTE_I = ['Noto Sans Italic'];
  const classe = (lista) => ['in', ['get', 'class'], ['literal', lista]];
  // largura das ruas: cresce com o zoom (valores em pixels, zoom do MapLibre)
  const largura = (pares) => ['interpolate', ['exponential', 1.5], ['zoom'], ...pares];

  function vetorial(cfg) {
    return {
      version: 8,
      name: 'Drink · noite',
      glyphs: cfg.mapaFontes,
      sources: { omt: { type: 'vector', url: cfg.mapaVetor } },
      layers: [
        { id: 'chao', type: 'background', paint: { 'background-color': COR.chao } },
        { id: 'bairros', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: classe(['residential', 'suburb', 'neighbourhood', 'quarter']), paint: { 'fill-color': COR.bairro } },
        { id: 'comercio', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: classe(['commercial', 'retail', 'industrial', 'railway', 'garages', 'hospital', 'school', 'university', 'college']), paint: { 'fill-color': COR.comercio } },
        { id: 'verde', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: classe(['grass', 'wood', 'farmland', 'wetland']), paint: { 'fill-color': COR.verde, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 1] } },
        { id: 'parques', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': COR.verde } },
        { id: 'pracas', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: classe(['park', 'playground', 'pitch', 'cemetery', 'stadium', 'zoo']), paint: { 'fill-color': COR.verde } },
        { id: 'agua', type: 'fill', source: 'omt', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': COR.agua } },
        { id: 'rios', type: 'line', source: 'omt', 'source-layer': 'waterway', filter: ['!=', ['get', 'brunnel'], 'tunnel'], layout: { 'line-cap': 'round' }, paint: { 'line-color': COR.rio, 'line-width': largura([10, 0.6, 18, 5]) } },
        { id: 'pista', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': COR.comercio } },
        {
          id: 'predios', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
          paint: { 'fill-color': COR.predio, 'fill-outline-color': COR.predioBorda, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 1] },
        },
        // caminhos e trilhos
        { id: 'trilhas', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 14.5, filter: classe(['path', 'track']), paint: { 'line-color': COR.trilha, 'line-width': largura([15, 1, 18, 2.2]), 'line-dasharray': [1.5, 1.2] } },
        { id: 'trilhos', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: classe(['rail', 'transit']), paint: { 'line-color': COR.trilho, 'line-width': largura([11, 0.8, 18, 3]), 'line-dasharray': [3, 2] } },
        // ruas, das menores às maiores
        { id: 'ruas-servico', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 14, filter: classe(['service']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COR.rua, 'line-width': largura([14, 0.6, 18, 5]) } },
        { id: 'ruas', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: classe(['minor']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COR.rua, 'line-width': largura([12, 0.5, 14, 1.6, 18, 11]) } },
        { id: 'ruas-medias', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: classe(['tertiary', 'secondary']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COR.ruaMedia, 'line-width': largura([10, 0.6, 13, 1.6, 18, 14]) } },
        { id: 'avenidas', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 7, filter: classe(['primary', 'trunk']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COR.avenida, 'line-width': largura([7, 0.6, 12, 2, 18, 17]) } },
        { id: 'rodovias', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 5, filter: classe(['motorway']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COR.rodovia, 'line-width': largura([5, 0.6, 12, 2.6, 18, 20]) } },
        // nomes
        {
          id: 'nome-agua', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 12,
          layout: { 'text-field': NOME, 'text-font': FONTE_I, 'text-size': 12, 'text-max-width': 8 },
          paint: { 'text-color': COR.nomeAgua, 'text-halo-color': COR.chao, 'text-halo-width': 1.2 },
        },
        {
          id: 'nome-ruas', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13.5,
          filter: classe(['minor', 'tertiary', 'secondary', 'service']),
          layout: {
            'symbol-placement': 'line', 'symbol-spacing': 320, 'text-field': NOME, 'text-font': FONTE,
            'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10.5, 18, 13.5], 'text-max-angle': 30, 'text-letter-spacing': 0.02, 'text-padding': 4,
          },
          paint: { 'text-color': COR.nomeRua, 'text-halo-color': COR.chao, 'text-halo-width': 1.5 },
        },
        {
          id: 'nome-avenidas', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 11,
          filter: classe(['primary', 'trunk', 'motorway']),
          layout: {
            'symbol-placement': 'line', 'symbol-spacing': 380, 'text-field': NOME, 'text-font': FONTE_B,
            'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 18, 14.5], 'text-max-angle': 30, 'text-letter-spacing': 0.03, 'text-padding': 4,
          },
          paint: { 'text-color': '#B3BAE6', 'text-halo-color': COR.chao, 'text-halo-width': 1.6 },
        },
        {
          id: 'numeros', type: 'symbol', source: 'omt', 'source-layer': 'housenumber', minzoom: 17.2,
          layout: { 'text-field': ['get', 'housenumber'], 'text-font': FONTE, 'text-size': 10, 'text-padding': 2 },
          paint: { 'text-color': COR.numero, 'text-halo-color': COR.chao, 'text-halo-width': 1 },
        },
        // os bares: ponto limão e o nome (o Drink é para quem sai para beber)
        {
          id: 'bares', type: 'circle', source: 'omt', 'source-layer': 'poi', minzoom: 14.5,
          filter: ['any', classe(['bar', 'beer']), ['in', ['get', 'subclass'], ['literal', ['bar', 'pub', 'nightclub', 'biergarten']]]],
          paint: {
            'circle-color': COR.bar, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14.5, 2.4, 18, 5],
            'circle-stroke-color': COR.chao, 'circle-stroke-width': 1.5, 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15, 1], 'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15, 1],
          },
        },
        {
          id: 'nome-bares', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 15.6,
          filter: ['any', classe(['bar', 'beer']), ['in', ['get', 'subclass'], ['literal', ['bar', 'pub', 'nightclub', 'biergarten']]]],
          layout: {
            'text-field': NOME, 'text-font': FONTE_B, 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.75, 0],
            'text-max-width': 9, 'text-optional': true, 'text-padding': 3,
          },
          paint: { 'text-color': COR.nomeBar, 'text-halo-color': COR.chao, 'text-halo-width': 1.4 },
        },
        {
          id: 'nome-bairros', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11.5, maxzoom: 17,
          filter: classe(['suburb', 'neighbourhood', 'quarter']),
          layout: {
            'text-field': ['upcase', NOME], 'text-font': FONTE_B, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9.5, 16, 12],
            'text-letter-spacing': 0.14, 'text-max-width': 7, 'text-padding': 8,
          },
          paint: { 'text-color': COR.nomeBairro, 'text-halo-color': COR.chao, 'text-halo-width': 1.4 },
        },
        {
          id: 'nome-cidades', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 13,
          filter: classe(['city', 'town']),
          layout: { 'text-field': NOME, 'text-font': FONTE_B, 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 12, 19], 'text-max-width': 8 },
          paint: { 'text-color': COR.nomeCidade, 'text-halo-color': COR.chao, 'text-halo-width': 1.6 },
        },
      ],
    };
  }

  // reserva: o mapa de imagens do OpenStreetMap, com o claro virado em escuro e meio transparente sobre o azul
  function imagens(url) {
    return {
      version: 8,
      name: 'Drink · noite (imagens)',
      sources: { osm: { type: 'raster', tiles: [url.replace('{s}', 'a')], tileSize: 256, maxzoom: 19 } },
      layers: [
        { id: 'fundo', type: 'background', paint: { 'background-color': '#1C2395' } },
        {
          id: 'osm', type: 'raster', source: 'osm',
          paint: { 'raster-opacity': 0.8, 'raster-brightness-min': 0.95, 'raster-brightness-max': 0.05, 'raster-hue-rotate': 180, 'raster-saturation': -0.4, 'raster-contrast': 0.05 },
        },
      ],
    };
  }

  window.Drink.estiloMapa = { vetorial, imagens, COR };
}());
