/* Drink — serviços reais usados pelo app: GPS do aparelho, mapa e busca de endereços (OpenStreetMap e
   Photon), rotas (OSRM) e o preço da corrida. Se um serviço cair, o app segue com uma estimativa. */
(function () {
  'use strict';

  const { precoDaViagem, hhmm } = window.Drink.util;

  // endereços dos serviços; nos testes dá para trocar por localStorage['drink-servicos']
  const cfg = {
    ntfy: 'https://ntfy.sh',
    photon: 'https://photon.komoot.io',
    // reservas da busca: o Nominatim (a outra busca do OpenStreetMap) e o ViaCEP (CEP → rua)
    nominatim: 'https://nominatim.openstreetmap.org',
    viacep: 'https://viacep.com.br',
    osrm: 'https://router.project-osrm.org',
    // o mapa: vetorial do OpenFreeMap (dados do OpenStreetMap, sem chave); se ele não responder, as imagens do
    // OpenStreetMap e, por último, as da comunidade francesa
    mapaVetor: 'https://tiles.openfreemap.org/planet',
    mapaFontes: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    mapa: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapaReserva: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    sala: 'drink-bh-9r4t-v1',
    // SMS de verdade no cadastro: a configuração do app da Web do projeto no Firebase (apiKey, authDomain,
    // projectId, appId). Sem ela, o código chega por e-mail (o ntfy encaminha) ou por notificação neste celular.
    firebase: null,
    // o código por e-mail: o EmailJS manda o e-mail direto do app, com a conta do Drink no emailjs.com
    // ({ servico, modelo, chave }: o Service ID, o Template ID e a Public Key de lá). Sem ela, não há e-mail
    emailjs: { servico: 'service_gleq2px', modelo: 'template_psxaink', chave: 'YQZsN4vOvKUa4_bsK' },
    emailjsUrl: 'https://api.emailjs.com',
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
  // - ao abrir, a última posição boa (de até 5 min atrás, guardada no aparelho) aparece na hora, como aproximada,
  //   e a leitura da rede aceita a posição que o celular já tem de poucos minutos: o mapa não fica esperando;
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
    // a última posição boa fica guardada no aparelho (no máximo uma escrita a cada 20 s)
    const GUARDADA = 'drink-gps';
    let guardouEm = 0;
    function guardar(p) {
      if (p.precisao > 200 || Date.now() - guardouEm < 20000) return;
      guardouEm = Date.now();
      try { localStorage.setItem(GUARDADA, JSON.stringify({ lat: p.lat, lon: p.lon, precisao: p.precisao, t: p.t })); } catch (e) { /* sem armazenamento */ }
    }
    function guardada() {
      try {
        const g = JSON.parse(localStorage.getItem(GUARDADA) || 'null');
        if (!g || !Number.isFinite(g.lat) || !Number.isFinite(g.lon) || Date.now() - g.t > 5 * 60000) return null;
        // de minutos atrás: a pessoa pode ter andado, então vale como aproximada
        return { lat: g.lat, lon: g.lon, precisao: Math.max(300, g.precisao), rumo: null, vel: null, t: g.t, guardada: true };
      } catch (e) { return null; }
    }
    function receber(nova) {
      // a posição guardada (de antes) sai na hora que chega uma leitura de verdade
      if (ultima && ultima.guardada) ultima = null;
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
      guardar(nova);
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
      // a primeira posição, rápida: a da rede e do wi-fi, ou a que o celular já tem de poucos minutos (o GPS fino
      // pode levar meio minuto pra pegar); enquanto isso, a última posição boa guardada no aparelho
      if (fino && (!ultima || ultima.guardada)) {
        if (!ultima) {
          const g = guardada();
          if (g) { ultima = g; setTimeout(avisar, 0); }
        }
        navigator.geolocation.getCurrentPosition((p) => receber(ler(p)), () => {}, { enableHighAccuracy: false, maximumAge: 300000, timeout: 6000 });
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

  /* ---------- busca de endereços ---------- */
  // A busca principal é o Photon (OpenStreetMap). O que fazia ela falhar, e o que mudou:
  // - abreviação ("R.", "Av.", "Prof.") não casava com o nome do mapa: vai por extenso;
  // - o número digitado se perdia e o ponto caía no meio da rua: o número fica no endereço, e o ponto é a casa (se o
  //   mapa conhece), ou é calculado entre as casas vizinhas da mesma rua, ou fica na rua com o aviso de conferir;
  // - lugar que o Photon não tem: o Nominatim (a outra busca do OpenStreetMap) entra de reserva, no máximo uma vez
  //   por segundo, como ele pede;
  // - CEP: vira a rua pelo ViaCEP.
  const ehRegional = (s) => /^regional\b/i.test(String(s || '').trim());
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const TIPOS = [[/^(r|rua)\.?\s+/i, 'Rua '], [/^(av|avda|aven)\.?\s+/i, 'Avenida '], [/^(al)\.?\s+/i, 'Alameda '],
    [/^(p[cç]a?|pr)\.?\s+/i, 'Praça '], [/^(tv|trav)\.?\s+/i, 'Travessa '], [/^(rod)\.?\s+/i, 'Rodovia '], [/^(est|estr)\.?\s+/i, 'Estrada '], [/^(lgo|lg)\.?\s+/i, 'Largo ']];
  const TITULOS = { prof: 'Professor', profa: 'Professora', dr: 'Doutor', dra: 'Doutora', sta: 'Santa', sto: 'Santo', pres: 'Presidente', cel: 'Coronel',
    gen: 'General', gal: 'General', mal: 'Marechal', des: 'Desembargador', eng: 'Engenheiro', pe: 'Padre', cap: 'Capitão', ten: 'Tenente', gov: 'Governador', dep: 'Deputado', sen: 'Senador', cons: 'Conselheiro', vig: 'Vigário' };
  function porExtenso(t) {
    let s = String(t || '').replace(/\s+/g, ' ').trim();
    TIPOS.some(([re, tipo]) => { if (re.test(s)) { s = s.replace(re, tipo); return true; } return false; });
    // títulos com ponto ("Prof. Mário Werneck") e "prof" sem ponto, que é comum
    return s.replace(/\b([a-z]{2,5})\.\s*/gi, (m, a) => (TITULOS[a.toLowerCase()] ? `${TITULOS[a.toLowerCase()]} ` : m)).replace(/\bprof\b(?!\.)/gi, 'Professor');
  }
  const SO_TIPO = /^(rua|avenida|alameda|praca|travessa|rodovia|estrada|largo|beco|via)$/;
  // entende o que a pessoa digitou: o CEP, a rua e o número ("Rua X, 123", "R. X 123 - Bairro", "Av. X nº 123")
  function entender(texto) {
    let t = String(texto || '').replace(/\s+/g, ' ').trim();
    let cep = '';
    t = t.replace(/\b(\d{5})-?(\d{3})\b/, (m, a, b) => { cep = a + b; return ' '; }).replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '');
    t = porExtenso(t);
    // o complemento ("apto 302", "bloco B", "sala 4") não ajuda a achar a rua
    const sem = t.replace(/[\s,-]+\b(apto?|ap|apartamento|bloco|bl|casa|sala|loja|lj|andar|fundos|cobertura)\b.*$/i, '').trim();
    // o último número solto é o da casa ("Rua 13 de Maio 200"); se antes dele só vem "Rua", ele é do nome da rua
    const m = sem.match(/^(.*\D)[\s,]+(?:n(?:[º°o]|úmero|umero)?\.?\s*)?(\d{1,5})(?:\s*[a-z])?(?:\s*[-–,]\s*(.*)|\s+(\D.*))?$/i);
    if (m && /[a-zà-ú]{2}/i.test(m[1]) && !SO_TIPO.test(semAcento(m[1]).replace(/[.,]/g, '').trim())) {
      return { q: sem, rua: m[1].replace(/[\s,]+n(?:[º°o]|úmero|umero)?\.?$/i, '').replace(/[\s,.]+$/, ''), numero: +m[2], resto: (m[3] || m[4] || '').trim(), cep };
    }
    // só o CEP e o número
    const n = cep && sem.match(/^(?:n(?:[º°o]|úmero|umero)?\.?\s*)?(\d{1,5})$/i);
    if (n) return { q: '', rua: '', numero: +n[1], resto: '', cep };
    return { q: sem, rua: '', numero: 0, resto: '', cep };
  }
  // o mesmo nome de rua, com ou sem o tipo, acento e abreviação
  function chaveRua(s) {
    return semAcento(porExtenso(s)).replace(/^(rua|avenida|alameda|praca|travessa|rodovia|estrada|largo|beco|via)\s+/, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function mesmaRua(a, b) {
    const x = chaveRua(a);
    const y = chaveRua(b);
    return Boolean(x && y && (x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x)))));
  }
  // o tipo do lugar (a etiqueta do OpenStreetMap): o ícone e o nome que aparecem na lista, como na Uber
  const CATEGORIAS = {
    bar: ['i-copo', 'Bar'], pub: ['i-copo', 'Bar'], biergarten: ['i-copo', 'Cervejaria'], nightclub: ['i-musica', 'Balada'],
    restaurant: ['i-talheres', 'Restaurante'], fast_food: ['i-talheres', 'Lanchonete'], food_court: ['i-talheres', 'Praça de alimentação'],
    ice_cream: ['i-talheres', 'Sorveteria'], cafe: ['i-cafe', 'Café'],
    music_venue: ['i-musica', 'Casa de show'], theatre: ['i-musica', 'Teatro'], cinema: ['i-musica', 'Cinema'], arts_centre: ['i-musica', 'Centro cultural'],
    events_venue: ['i-festa', 'Espaço de eventos'], stadium: ['i-festa', 'Estádio'],
    suburb: ['i-mapa', 'Bairro'], neighbourhood: ['i-mapa', 'Bairro'], quarter: ['i-mapa', 'Bairro'],
    hotel: ['i-pin', 'Hotel'], hostel: ['i-pin', 'Hostel'], hospital: ['i-pin', 'Hospital'], marketplace: ['i-pin', 'Mercado'], mall: ['i-pin', 'Shopping'],
    square: ['i-pin', 'Praça'], park: ['i-pin', 'Parque'], university: ['i-pin', 'Universidade'],
  };
  // bares, restaurantes, cafés e casas de show: o que mais se busca pelo nome para voltar de Drink
  const ESTABELECIMENTO = new Set(['bar', 'pub', 'biergarten', 'nightclub', 'restaurant', 'fast_food', 'food_court', 'ice_cream', 'cafe', 'music_venue', 'theatre', 'cinema', 'arts_centre', 'events_venue']);
  function comCategoria(l) {
    const c = CATEGORIAS[l.tipo];
    if (!c || l.ehRua) return l;
    // o nome do tipo vai na frente do endereço, a não ser que o nome já diga ("Bar do Lopes" é bar; "Bairro Sion" é bairro)
    const jaDiz = semAcento(l.nome).includes(semAcento(c[1]));
    let detalhe = jaDiz ? l.detalhe : [c[1], l.detalhe].filter(Boolean).join(' · ');
    if (c[1] === 'Bairro') detalhe = l.detalhe || 'Bairro';
    return { ...l, icone: c[0], categoria: c[1], detalhe };
  }
  function lugarDe(f) {
    const p = f.properties || {};
    const [lon, lat] = f.geometry.coordinates;
    const ehRua = p.osm_key === 'highway' || p.type === 'street';
    const ruaNome = p.street || (ehRua ? p.name : '') || '';
    const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
    const bairro = [p.district, p.locality, p.suburb].find((b) => b && !ehRegional(b)) || '';
    const nome = p.name || rua || bairro || p.city || 'Local sem nome';
    const detalhe = [];
    if (p.name && rua && p.name !== p.street) detalhe.push(rua);
    if (bairro && bairro !== nome) detalhe.push(bairro);
    if (p.city && p.city !== nome && (p.city !== 'Belo Horizonte' || !bairro)) detalhe.push(p.city);
    return comCategoria({ nome, detalhe: detalhe.join(' · '), rua, bairro: bairro || p.city || '', lat, lon, tipo: p.osm_value || p.type || '', numero: p.housenumber || '', ehRua, ruaNome });
  }
  function lugarDoNominatim(x) {
    const a = x.address || {};
    const ehRua = x.category === 'highway' || x.addresstype === 'road';
    const via = a.road || a.pedestrian || a.footway || a.square || '';
    const ruaNome = via || (ehRua ? x.name : '') || '';
    const rua = [via, a.house_number].filter(Boolean).join(', ');
    const bairro = [a.suburb, a.neighbourhood, a.quarter, a.city_district].find((b) => b && !ehRegional(b)) || '';
    const cidade = a.city || a.town || a.municipality || a.village || '';
    const nome = x.name || rua || bairro || cidade || 'Local sem nome';
    const detalhe = [];
    if (x.name && rua && x.name !== via) detalhe.push(rua);
    if (bairro && bairro !== nome) detalhe.push(bairro);
    if (cidade && cidade !== nome && (cidade !== 'Belo Horizonte' || !bairro)) detalhe.push(cidade);
    return comCategoria({ nome, detalhe: detalhe.join(' · '), rua, bairro: bairro || cidade, lat: +x.lat, lon: +x.lon, tipo: x.type || '', numero: a.house_number || '', ehRua, ruaNome });
  }

  async function photon(caminho, params, sinal) {
    const u = new URL(`${cfg.photon}/${caminho}`);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') u.searchParams.set(k, String(v)); });
    const r = await fetch(u, { signal: sinal });
    if (!r.ok) throw new Error(`busca ${r.status}`);
    const j = await r.json();
    return (j.features || []).filter((f) => f && f.geometry && Array.isArray(f.geometry.coordinates));
  }
  const buscaPhoton = (q, ref, sinal, extra = {}) => photon('api/', { q, limit: 8, bbox: CAIXA.join(','), lat: ref.lat.toFixed(5), lon: ref.lon.toFixed(5), ...extra }, sinal);

  // o Nominatim pede no máximo uma consulta por segundo: as consultas entram numa fila
  let filaNominatim = Promise.resolve();
  let ultimoNominatim = 0;
  function nominatim(caminho, params, sinal) {
    if (!cfg.nominatim) return Promise.resolve(null);
    const vez = filaNominatim.then(async () => {
      const espera = ultimoNominatim + 1100 - Date.now();
      if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
      if (sinal && sinal.aborted) throw new DOMException('cancelada', 'AbortError');
      ultimoNominatim = Date.now();
      const u = new URL(`${cfg.nominatim}/${caminho}`);
      Object.entries({ format: 'jsonv2', addressdetails: 1, 'accept-language': 'pt-BR', ...params }).forEach(([k, v]) => u.searchParams.set(k, String(v)));
      const r = await fetch(u, { signal: sinal });
      if (!r.ok) throw new Error(`nominatim ${r.status}`);
      return r.json();
    });
    filaNominatim = vez.catch(() => {});
    return vez;
  }
  async function cep(numero, sinal) {
    if (!cfg.viacep) return null;
    const r = await fetch(`${cfg.viacep}/ws/${numero}/json/`, { signal: sinal });
    if (!r.ok) return null;
    const j = await r.json();
    return j && !j.erro ? j : null;
  }
  const textoCep = (c) => `${c.slice(0, 5)}-${c.slice(5)}`;

  // onde fica o número N numa rua: a casa, se o mapa conhece; senão, a conta entre as casas vizinhas do mesmo lado
  // (pares de um lado, ímpares do outro); se o mapa não tem nenhuma casa perto disso, o ponto da rua
  async function numeroNaRua(base, numero, sinal) {
    const nomeRua = base.ruaNome || base.nome;
    let casas = [];
    try {
      const fs = await buscaPhoton(`${nomeRua} ${base.bairro || ''}`.trim(), base, sinal, { layer: 'house', limit: 50 });
      casas = fs.map(lugarDe).filter((l) => l.numero && mesmaRua(l.ruaNome, nomeRua))
        .map((l) => ({ n: parseInt(l.numero, 10), lat: l.lat, lon: l.lon })).filter((c) => Number.isFinite(c.n) && distancia(c, base) < 4000);
    } catch (e) { if (e.name === 'AbortError') throw e; }
    const igual = casas.find((c) => c.n === numero);
    if (igual) return { lat: igual.lat, lon: igual.lon, como: 'exato' };
    const doLado = casas.filter((c) => c.n % 2 === numero % 2);
    const usar = doLado.length >= 2 ? doLado : casas;
    const abaixo = usar.filter((c) => c.n < numero).sort((a, b) => b.n - a.n);
    const acima = usar.filter((c) => c.n > numero).sort((a, b) => a.n - b.n);
    const entre = (a, b) => { const t = (numero - a.n) / (b.n - a.n); return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }; };
    if (abaixo[0] && acima[0]) return { ...entre(abaixo[0], acima[0]), como: 'calculado' };
    // casas só de um lado do número: segue a linha das duas mais perto (é o sentido em que a numeração cresce)
    const ponta = abaixo[0] || acima[0];
    const par = abaixo.length >= 2 ? [abaixo[1], abaixo[0]] : (acima.length >= 2 ? [acima[0], acima[1]] : null);
    if (par && Math.abs(numero - ponta.n) <= 600) {
      const p = entre(par[0], par[1]);
      if (distancia(p, ponta) < 800) return { ...p, como: 'calculado' };
    }
    if (ponta && Math.abs(ponta.n - numero) <= 40) return { lat: ponta.lat, lon: ponta.lon, como: 'calculado' };
    return { lat: base.lat, lon: base.lon, como: 'rua' };
  }

  // a ordem de uma busca por nome, como na Uber: primeiro o que começa com o que foi digitado ("Bar do" → "Bar do
  // Lopes"), depois o que tem todas as palavras (a última pode estar pela metade), e, entre eles, o mais perto
  const palavrasDe = (t) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
  function relevancia(l, q, ref) {
    const ws = palavrasDe(q);
    const nome = palavrasDe(l.nome);
    let m = 0;
    if (ws.length && nome.join(' ').startsWith(ws.join(' '))) m = 3;
    else if (ws.length && ws.every((w, i) => nome.some((p) => (i === ws.length - 1 ? p.startsWith(w) : p === w)))) m = 2;
    else if (ws.some((w) => w.length > 2 && nome.some((p) => p.startsWith(w)))) m = 1;
    const km = distancia(ref, l) / 1000;
    return m * 2 + (ESTABELECIMENTO.has(l.tipo) ? 0.4 : 0) - Math.log2(1 + km) * 0.5;
  }

  async function buscar(texto, perto, sinal) {
    const ref = perto || BH;
    const e = entender(texto);
    let doCep = null;
    if (e.cep) { try { doCep = await cep(e.cep, sinal); } catch (x) { if (x.name === 'AbortError') throw x; } }
    const ruaCep = doCep && doCep.logradouro ? porExtenso(doCep.logradouro) : '';
    const ruaAlvo = ruaCep || e.rua;
    // (a cidade não entra: a busca já é só na Grande BH)
    const q = doCep ? [ruaCep || doCep.bairro, e.numero || '', ruaCep ? doCep.bairro : ''].filter(Boolean).join(' ') : (e.q || texto);
    let lista = [];
    let falha = null;
    const porNome = !e.numero && !e.cep;
    try {
      // pelo nome (sem número nem CEP): a mesma busca, mais uma só entre bares, restaurantes e afins, pesando mais a
      // distância que a fama do lugar; as duas juntas
      const [geral, locais] = await Promise.all([
        buscaPhoton(q, ref, sinal),
        porNome ? buscaPhoton(q, ref, sinal, { osm_tag: 'amenity', limit: 12, location_bias_scale: 0.1 }).catch((x) => { if (x.name === 'AbortError') throw x; return []; }) : [],
      ]);
      lista = [...geral, ...locais].map(lugarDe);
    } catch (x) { if (x.name === 'AbortError') throw x; falha = x; }
    // poucos resultados, nenhum com o número pedido, ou o Photon fora do ar: a outra busca do OpenStreetMap
    const temNumero = (l) => e.numero && String(parseInt(l.numero, 10)) === String(e.numero) && mesmaRua(l.ruaNome, ruaAlvo);
    if (lista.length < 3 || (e.numero && !lista.some(temNumero))) {
      try {
        const nom = await nominatim('search', { q: doCep ? q : (e.q || texto), countrycodes: 'br', viewbox: [CAIXA[0], CAIXA[3], CAIXA[2], CAIXA[1]].join(','), bounded: 1, limit: 8 }, sinal);
        if (Array.isArray(nom)) lista = lista.concat(nom.map(lugarDoNominatim));
      } catch (x) { if (x.name === 'AbortError') throw x; }
      if (falha && !lista.length) throw falha;
    }
    if (e.numero && ruaAlvo) {
      // o número digitado não se perde: a casa exata, ou o ponto calculado na rua
      const exato = lista.find(temNumero);
      if (exato) lista = [{ ...exato, nome: exato.ehRua || !exato.nome || exato.nome === exato.rua ? exato.rua : exato.nome }, ...lista.filter((l) => l !== exato)];
      else {
        const base = lista.find((l) => l.ehRua && mesmaRua(l.ruaNome || l.nome, ruaAlvo)) || lista.find((l) => mesmaRua(l.ruaNome, ruaAlvo));
        if (base) {
          const p = await numeroNaRua(base, e.numero, sinal);
          const nomeRua = base.ruaNome || base.nome;
          const aviso = { exato: '', calculado: 'número aproximado', rua: 'confira o número no mapa' }[p.como];
          lista.unshift({ ...base, nome: `${nomeRua}, ${e.numero}`, rua: `${nomeRua}, ${e.numero}`, numero: String(e.numero), tipo: 'house', icone: 'i-pin', categoria: '',
            detalhe: [base.bairro, doCep ? `CEP ${textoCep(e.cep)}` : '', aviso].filter(Boolean).join(' · '), lat: p.lat, lon: p.lon, aproximado: p.como !== 'exato', ehRua: false });
        }
      }
    } else if (doCep && ruaCep) {
      const base = lista.find((l) => l.ehRua && mesmaRua(l.ruaNome || l.nome, ruaCep));
      if (base) lista = [{ ...base, detalhe: [base.bairro || doCep.bairro, `CEP ${textoCep(e.cep)}`].filter(Boolean).join(' · ') }, ...lista.filter((l) => l !== base)];
    }
    if (porNome) {
      const nota = new Map(lista.map((l, i) => [l, relevancia(l, q, ref) - i * 0.001]));
      lista = [...lista].sort((a, b) => nota.get(b) - nota.get(a));
    }
    const vistos = new Set();
    return lista.filter((l) => {
      const k = `${semAcento(l.nome)}|${Math.round(l.lat * 2000)}|${Math.round(l.lon * 2000)}`;
      // o mesmo lugar vindo das duas buscas (pontos um pouco diferentes); duas unidades longe uma da outra ficam
      const k2 = `${semAcento(l.nome)}|${semAcento(l.detalhe)}|${Math.round(l.lat * 300)}|${Math.round(l.lon * 300)}`;
      if (vistos.has(k) || vistos.has(k2)) return false;
      vistos.add(k);
      vistos.add(k2);
      return true;
    }).slice(0, 12);
  }

  // o endereço de um ponto (onde a pessoa está, ou o meio do mapa): a rua certa, e o número só quando há uma casa
  // conhecida bem ali (um número chutado leva o motorista para a porta errada)
  const cacheEndereco = new Map();
  const PERTO_DA_CASA = 35;
  function montarEndereco(p, ruaNome, numero, bairro, nomeLugar) {
    const rua = [ruaNome, numero].filter(Boolean).join(', ');
    return { nome: rua || nomeLugar || bairro || 'Ponto no mapa', detalhe: bairro || '', rua, bairro: bairro || '', lat: p.lat, lon: p.lon, numero: numero || '', ehRua: false, ruaNome: ruaNome || '' };
  }
  async function endereco(p) {
    const k = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
    if (cacheEndereco.has(k)) return cacheEndereco.get(k);
    let res = null;
    // o Nominatim procura pela linha das ruas de verdade (não pelo meio delas), por isso acerta mais a rua
    try {
      const x = await nominatim('reverse', { lat: p.lat.toFixed(6), lon: p.lon.toFixed(6), zoom: 18 });
      if (x && !x.error && x.address) {
        const l = lugarDoNominatim(x);
        const perto = distancia(p, l) <= PERTO_DA_CASA;
        if (l.ruaNome) res = montarEndereco(p, l.ruaNome, perto ? l.numero : '', l.bairro, l.nome);
      }
    } catch (e) { /* tenta o Photon */ }
    if (!res) {
      const fs = await photon('reverse', { lat: p.lat.toFixed(6), lon: p.lon.toFixed(6), limit: 10 });
      if (!fs.length) throw new Error('sem endereço');
      const ls = fs.map(lugarDe).map((l) => ({ ...l, d: distancia(p, l) }));
      const casa = ls.filter((l) => l.numero && l.ruaNome).sort((a, b) => a.d - b.d)[0];
      const rua = ls.find((l) => l.ehRua && l.ruaNome);
      const qualquer = ls.find((l) => l.ruaNome) || ls[0];
      if (casa && casa.d <= PERTO_DA_CASA) res = montarEndereco(p, casa.ruaNome, casa.numero, casa.bairro, casa.nome);
      else if (rua) res = montarEndereco(p, rua.ruaNome, '', rua.bairro || (qualquer && qualquer.bairro), rua.nome);
      else res = montarEndereco(p, qualquer.ruaNome, '', qualquer.bairro, qualquer.nome);
    }
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
    buscar, endereco, entender, rota, faltaNaLinha, pontosNaLinha, virgula, diaDoDrink, ganhosDoDia, prenderFoco,
  };
}());
