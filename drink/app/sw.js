/* Drink — o service worker do app. Guarda o app no aparelho para abrir sem internet e mostra os avisos
   (pedido novo, motorista chegou, mensagem…) que chegam pelo ntfy mesmo com o app fechado.
   Com internet, tudo vem da rede primeiro: o celular sempre usa a versão mais nova do app. */
const VERSAO = 'drink-app-17';
const FONTES = 'drink-fontes-1';
const V = '?v=17';
const ARQUIVOS = [
  './', 'manifest.webmanifest',
  ...['app.css', 'app.js', 'servicos.js', 'rede.js', 'mapa-estilo.js', 'mapa.js', 'carros.js', 'cadastro-motorista.js', 'pix.js', 'avisos.js', 'sms.js',
    'passageiro.js', 'motorista.js', 'vendor/maplibre-gl.js', 'vendor/maplibre-gl.css', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/qrcode.js',
    '../app-telas.css', '../app-nucleo.js'].map((a) => a + V),
  '../icon.svg', '../icon-180.png', '../icon-192.png', '../icon-512.png',
  'icone-maskable-192.png', 'icone-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO)
    .then((c) => c.addAll(ARQUIVOS.map((a) => new Request(a, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO && n !== FONTES).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // a fonte do Google fica guardada depois da primeira vez
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTES).then((c) => c.match(req).then((salvo) => salvo || fetch(req).then((resp) => {
      if (resp.ok || resp.type === 'opaque') c.put(req, resp.clone());
      return resp;
    }))));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // o app: rede primeiro (conferindo se mudou); sem internet, o que está guardado
  const pagina = req.mode === 'navigate';
  const chave = pagina ? './' : req;
  const daRede = pagina
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, { cache: 'no-cache' });
  e.respondWith(daRede.then((resp) => {
    if (resp.ok) {
      const copia = resp.clone();
      e.waitUntil(caches.open(VERSAO).then((c) => c.put(chave, copia)));
    }
    return resp;
  }).catch(() => caches.match(chave).then((salvo) => salvo || caches.match(req, { ignoreSearch: true }))));
});

/* ---------- avisos que chegam pelo ntfy com o app fechado ---------- */
const AVISOS = {
  aceite: ['Um Drink aceitou', 'O motorista está indo até você.'],
  perto: ['O Drink está chegando', 'Uns 2 minutos. Vai saindo para encontrar ele.'],
  chegou: ['O Drink chegou', 'Confere o código antes de entregar a chave.'],
  chegada: ['Chegou!', 'Avalia a corrida e paga com Pix.'],
  msg: ['Mensagem nova', 'Abre o Drink para ler.'],
  cancelado: ['Corrida cancelada', 'Abre o Drink para ver o que aconteceu.'],
  confirmado: ['Corrida confirmada', 'Vai buscar o passageiro. O endereço está no app.'],
  paguei: ['O passageiro pagou', 'Confere no app do seu banco se o Pix caiu.'],
};
const reais = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const bairro = (p) => String((p && p.bairro) || '').slice(0, 30) || 'BH';

async function mostrarAviso(dados) {
  let titulo = 'Drink';
  let texto = 'Tem novidade no Drink.';
  let tag = 'drink';
  if (dados && dados.event === 'subscription_expiring') {
    texto = 'Abre o Drink para continuar recebendo os avisos.';
    tag = 'drink-expira';
  } else if (dados && dados.message) {
    let corpo = null;
    try { corpo = JSON.parse(dados.message.message); } catch (e) { corpo = null; }
    if (corpo && corpo.tipo === 'codigo' && /^\d{4,6}$/.test(String(corpo.codigo))) {
      titulo = 'Drink';
      texto = `Seu código é ${corpo.codigo}. Não passe para ninguém.`;
      tag = 'drink-codigo';
    } else if (corpo && corpo.tipo === 'drink-perto') {
      titulo = 'Tem Drink online perto de você';
      texto = 'Abre o app e pede o seu. O motorista chega de bike ou patinete.';
      tag = 'drink-online';
    } else if (corpo && corpo.tipo === 'pedido') {
      titulo = 'Pedido novo no Drink';
      texto = `${bairro(corpo.de)} → ${bairro(corpo.para)} · ${reais(corpo.valor)}`;
      tag = 'drink-pedido';
    } else if (corpo && AVISOS[corpo.tipo]) {
      [titulo, texto] = AVISOS[corpo.tipo];
      tag = 'drink-corrida';
    }
  }
  // com o app na tela, o aviso chega sem som (o próprio app já avisou)
  const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const naTela = abertos.some((c) => c.visibilityState === 'visible');
  return self.registration.showNotification(titulo, {
    // "tem Drink perto" chega uma vez: os seguintes só trocam o texto, sem tocar de novo
    body: texto, tag, renotify: tag !== 'drink-online', silent: naTela,
    icon: '../icon-192.png', badge: '../icon-192.png', data: { url: './' },
  });
}

self.addEventListener('push', (e) => {
  let dados = null;
  try { dados = e.data ? e.data.json() : null; } catch (x) { dados = null; }
  e.waitUntil(mostrarAviso(dados));
});

// tocar no aviso traz o app para a frente
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertos) => {
    const app = abertos.find((c) => new URL(c.url).pathname.startsWith(new URL('./', self.location).pathname));
    if (app) return app.focus();
    return self.clients.openWindow('./');
  }));
});
