/* Drink — o desenho do mapa: a noite de BH em grafite, sem cor gritando, ruas limpas, nomes legíveis e os bares
   em limão (a única cor forte, junto com a rota).
   Mapa vetorial do OpenFreeMap (dados do OpenStreetMap, sem chave), no esquema OpenMapTiles. Se ele não
   responder, o app usa o mapa de imagens do OpenStreetMap, escurecido do mesmo jeito. */
(function () {
  'use strict';

  const ESCURO = {
    chao: '#17191E',
    bairro: '#191B21',
    comercio: '#1C1E24',
    verde: '#1A2620',
    agua: '#142230',
    rio: '#1E3448',
    predio: '#1F2228',
    predioBorda: '#272A31',
    rua: '#2A2D34',
    ruaMedia: '#33363E',
    avenida: '#3F434C',
    rodovia: '#4C505A',
    trilha: '#2A2D33',
    trilho: '#2E3138',
    nomeRua: '#8D919B',
    nomeBairro: '#6E727C',
    nomeCidade: '#D9DBE0',
    nomeAgua: '#5C7A96',
    numero: '#5F636C',
    bar: '#D2FF3C',
    nomeBar: '#C9E58A',
    // referências da cidade: praças e parques, hospitais, metrô e o resto (shopping, faculdade, estádio)
    parque: '#5E8F6E',
    nomeParque: '#7FA48A',
    hospital: '#E06A6A',
    nomeHospital: '#D99A9A',
    metro: '#7E93C9',
    nomeMetro: '#9FAED6',
    lugar: '#8E8AA6',
    nomeLugar: '#A3A0B8',
  };
  // o mesmo mapa no tema claro: papel quente, ruas brancas, nomes em cinza-escuro
  const CLARO = {
    chao: '#ECEAE4',
    bairro: '#E8E6DF',
    comercio: '#E4E1DA',
    verde: '#D3E6C2',
    agua: '#C6DBEE',
    rio: '#9EC3E6',
    predio: '#DFDCD4',
    predioBorda: '#D3CFC6',
    rua: '#FFFFFF',
    ruaMedia: '#FFFFFF',
    avenida: '#FFFFFF',
    rodovia: '#FFE9A8',
    trilha: '#D6D2C9',
    trilho: '#C9C5BC',
    nomeRua: '#5C5F67',
    nomeBairro: '#7A7D86',
    nomeCidade: '#2A2C33',
    nomeAgua: '#4C78A8',
    numero: '#8A8D95',
    bar: '#4E7A00',
    nomeBar: '#3E6200',
    parque: '#5E9A6E',
    nomeParque: '#4D7F5B',
    hospital: '#C9483F',
    nomeHospital: '#A8433C',
    metro: '#4A63B8',
    nomeMetro: '#3E559E',
    lugar: '#7A7395',
    nomeLugar: '#6A6485',
  };
  const CORES = { escuro: ESCURO, claro: CLARO };
  const COR = ESCURO;
  const NOME = ['coalesce', ['get', 'name:pt'], ['get', 'name']];
  const FONTE = ['Noto Sans Regular'];
  const FONTE_B = ['Noto Sans Bold'];
  const FONTE_I = ['Noto Sans Italic'];
  const classe = (lista) => ['in', ['get', 'class'], ['literal', lista]];
  // os lugares que ajudam a se achar à noite (nada de loja, restaurante ou ponto de ônibus, que poluem)
  const REFERENCIA = ['any',
    classe(['park', 'hospital', 'college', 'stadium', 'attraction', 'town_hall']),
    ['all', classe(['railway']), ['in', ['get', 'subclass'], ['literal', ['station', 'subway', 'halt']]]],
    ['all', classe(['shop']), ['==', ['get', 'subclass'], 'mall']]];
  const corDoLugar = (parque, hospital, metro, outro) => ['match', ['get', 'class'], 'park', parque, 'hospital', hospital, 'railway', metro, outro];
  // largura das ruas: cresce com o zoom (valores em pixels, zoom do MapLibre)
  const largura = (pares) => ['interpolate', ['exponential', 1.5], ['zoom'], ...pares];

  function vetorial(cfg, tema = 'escuro') {
    const COR = CORES[tema] || ESCURO;
    return {
      version: 8,
      name: tema === 'claro' ? 'Drink · claro' : 'Drink · grafite',
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
          paint: { 'text-color': tema === 'claro' ? '#3A3D45' : '#A6AAB3', 'text-halo-color': COR.chao, 'text-halo-width': 1.6 },
        },
        {
          id: 'numeros', type: 'symbol', source: 'omt', 'source-layer': 'housenumber', minzoom: 17.2,
          layout: { 'text-field': ['get', 'housenumber'], 'text-font': FONTE, 'text-size': 10, 'text-padding': 2 },
          paint: { 'text-color': COR.numero, 'text-halo-color': COR.chao, 'text-halo-width': 1 },
        },
        // referências: ponto pequeno colorido e o nome, abaixo dos bares (que têm a prioridade)
        {
          id: 'nome-parques', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 14,
          filter: ['has', 'name'],
          layout: {
            'text-field': NOME, 'text-font': FONTE_I, 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10.5, 17, 12.5], 'text-max-width': 8, 'text-padding': 10,
            'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
          },
          paint: { 'text-color': COR.nomeParque, 'text-halo-color': COR.chao, 'text-halo-width': 1.4 },
        },
        {
          id: 'lugares', type: 'circle', source: 'omt', 'source-layer': 'poi', minzoom: 14.5, filter: REFERENCIA,
          paint: {
            'circle-color': corDoLugar(COR.parque, COR.hospital, COR.metro, COR.lugar), 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14.5, 2, 18, 4],
            'circle-stroke-color': COR.chao, 'circle-stroke-width': 1.2, 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15, 1], 'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15, 1],
          },
        },
        {
          id: 'nome-lugares', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 15, filter: ['all', REFERENCIA, ['has', 'name'], ['!=', ['get', 'class'], 'hospital']],
          layout: {
            'text-field': NOME, 'text-font': FONTE, 'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 12], 'text-anchor': 'left', 'text-offset': [0.7, 0],
            'text-max-width': 9, 'text-optional': true, 'text-padding': 5, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
          },
          paint: { 'text-color': corDoLugar(COR.nomeParque, COR.nomeHospital, COR.nomeMetro, COR.nomeLugar), 'text-halo-color': COR.chao, 'text-halo-width': 1.4 },
        },
        // hospital numa camada própria, acima dos outros lugares: à noite, é o que mais importa achar
        {
          id: 'nome-hospitais', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 14.5, filter: ['all', classe(['hospital']), ['has', 'name']],
          layout: {
            'text-field': NOME, 'text-font': FONTE_B, 'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 12], 'text-anchor': 'left', 'text-offset': [0.7, 0],
            'text-max-width': 9, 'text-optional': true, 'text-padding': 4,
          },
          paint: { 'text-color': COR.nomeHospital, 'text-halo-color': COR.chao, 'text-halo-width': 1.4 },
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
          id: 'nome-cidades', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 11.5,
          filter: classe(['city', 'town']),
          layout: { 'text-field': NOME, 'text-font': FONTE_B, 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 12, 19], 'text-max-width': 8 },
          paint: { 'text-color': COR.nomeCidade, 'text-halo-color': COR.chao, 'text-halo-width': 1.6 },
        },
      ],
    };
  }

  // reserva: o mapa de imagens do OpenStreetMap, com o claro virado em escuro, em tons de cinza
  function imagens(url, tema = 'escuro') {
    const claro = tema === 'claro';
    return {
      version: 8,
      name: 'Drink · noite (imagens)',
      sources: { osm: { type: 'raster', tiles: [url.replace('{s}', 'a')], tileSize: 256, maxzoom: 19 } },
      layers: [
        { id: 'fundo', type: 'background', paint: { 'background-color': claro ? '#ECEAE4' : '#17191E' } },
        {
          id: 'osm', type: 'raster', source: 'osm',
          paint: claro ? { 'raster-opacity': 1, 'raster-saturation': -0.85, 'raster-contrast': -0.05 } : { 'raster-opacity': 0.9, 'raster-brightness-min': 0.92, 'raster-brightness-max': 0.08, 'raster-saturation': -1, 'raster-contrast': -0.05 },
        },
      ],
    };
  }

  window.Drink.estiloMapa = { vetorial, imagens, COR, CORES };
}());
