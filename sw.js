/* Kill-switch service worker.
   Versões antigas cacheavam o app e causavam "versão velha". Este SW NÃO
   cacheia nada: ele apaga todos os caches, se descadastra e recarrega as abas
   abertas, garantindo que o usuário sempre rode a versão mais nova. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => { try { c.navigate(c.url); } catch (e) {} });
    } catch (e) {}
  })());
});

/* Sem cache: todas as requisições vão direto para a rede. */
self.addEventListener('fetch', () => {});
