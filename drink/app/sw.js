/* Drink — o service worker do app: guarda o app no aparelho para abrir rápido e funcionar sem internet.
   Páginas vêm da rede primeiro; o resto sai do que está guardado e se atualiza por trás. */
const VERSAO = 'drink-app-2';
const FONTES = 'drink-fontes-1';
const ARQUIVOS = [
  './', 'app.css', 'app.js', 'manifest.webmanifest',
  'servicos.js', 'rede.js', 'mapa.js', 'pix.js', 'robo.js', 'passageiro.js', 'motorista.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/qrcode.js',
  '../app-telas.css', '../app-nucleo.js',
  '../icon.svg', '../icon-180.png', '../icon-192.png', '../icon-512.png',
  'icone-maskable-192.png', 'icone-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
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

  // a página do app: rede primeiro, para sempre pegar a versão nova; sem internet, a guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((resp) => {
      if (resp.ok) {
        const copia = resp.clone();
        e.waitUntil(caches.open(VERSAO).then((c) => c.put('./', copia)));
      }
      return resp;
    }).catch(() => caches.match('./')));
    return;
  }

  // o resto: responde com o guardado na hora e atualiza por trás
  const rede = fetch(req).then((resp) => {
    if (resp.ok) {
      const copia = resp.clone();
      caches.open(VERSAO).then((c) => c.put(req, copia));
    }
    return resp;
  });
  e.respondWith(caches.match(req).then((salvo) => salvo || rede));
  e.waitUntil(rede.then(() => {}, () => {}));
});

// tocar no aviso (pedido novo, motorista chegou…) traz o app para a frente
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertos) => {
    const app = abertos.find((c) => new URL(c.url).pathname.startsWith(new URL('./', self.location).pathname));
    if (app) return app.focus();
    return self.clients.openWindow('./');
  }));
});
