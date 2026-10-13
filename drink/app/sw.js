/* Drink — o service worker do app. Guarda o app no aparelho para abrir sem internet e mostra os avisos
   (pedido novo, motorista chegou, mensagem…) que chegam pelo ntfy mesmo com o app fechado.
   Com internet, tudo vem da rede primeiro: o celular sempre usa a versão mais nova do app. */
const VERSAO = 'drink-app-62';
const FONTES = 'drink-fontes-1';
const V = '?v=62';
const ARQUIVOS = [
  './', 'manifest.webmanifest',
  ...['app.css', 'visual.css', 'tema.css', 'ritmo.css', 'perfil.css', 'jornada.css', 'agenda.css', 'bares.css', 'app.js', 'servicos.js', 'rede.js', 'mapa-estilo.js', 'mapa.js', 'carros.js', 'cadastro-motorista.js', 'config-servidor.js', 'servidor.js', 'perfil.js', 'agenda.js', 'leitor.js', 'bares.js', 'pix.js', 'avisos.js', 'sms.js',
    'eventos.js', 'passageiro.js', 'motorista.js', 'vendor/maplibre-gl.js', 'vendor/maplibre-gl.css', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/qrcode.js',
    '../app-telas.css', '../app-nucleo.js'].map((a) => a + V),
  'fontes/inter-latin.woff2',
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
  'ag-reservada': ['Sua volta agendada tem motorista', 'Abre o Drink para ver quem vai te buscar.'],
  'ag-confirmada': ['Volta agendada confirmada', 'A pessoa confirmou a sua reserva. O horário está no app.'],
  'ag-cancelada': ['Volta agendada cancelada', 'Abre o Drink para ver se tem taxa para você.'],
  'ag-desistiu': ['O motorista desistiu', 'A sua volta voltou para a lista. Abre o Drink.'],
  'ag-pronto': ['A pessoa está pronta', 'Hora de ir buscar. Abre o Drink.'],
  'ag-indo': ['O Drink está indo te buscar', 'A sua volta agendada começou.'],
  'ag-taxa': ['Taxa paga', 'Confere no app do seu banco se o Pix caiu.'],
  'ag-nao-veio': ['Taxa por não aparecer', 'O motorista esperou e você não apareceu. Abre o Drink.'],
};
// a corrida num aviso só, que vai se atualizando na tela de bloqueio (como o placar de um jogo): cada etapa substitui
// a anterior, e um aviso atrasado de uma etapa que já passou não volta o placar
const ETAPA_AO_VIVO = { aceite: 1, 'ag-indo': 1, indo: 2, perto: 3, chegou: 4, viagem: 5, chegada: 6, cancelado: 7 };
const barra = (pct) => { const n = Math.max(0, Math.min(10, Math.round(pct / 10))); return '▰'.repeat(n) + '▱'.repeat(10 - n); };
const virgula = (n) => String(n).replace('.', ',');
function aoVivo(corpo) {
  const min = Math.max(1, Math.min(240, parseInt(corpo.min, 10) || 1));
  const km = Math.max(0, Math.min(200, Number(corpo.km) || 0));
  const pct = Math.max(0, Math.min(100, Number(corpo.pct) || 0));
  const hora = /^\d{2}:\d{2}$/.test(String(corpo.hora)) ? corpo.hora : '';
  if (corpo.etapa === 'viagem') {
    return [`Indo pra casa · ${min} min`, `${barra(pct)}  ${virgula(km)} km${hora ? `\nEm casa por volta das ${hora}` : ''}`];
  }
  return [`O Drink está a ${min} min`, `${barra(pct)}  ${virgula(km)} km${hora ? `\nChega por volta das ${hora}` : ''}`];
}
const reais = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const bairro = (p) => String((p && p.bairro) || '').slice(0, 30) || 'BH';

async function mostrarAviso(dados) {
  let titulo = 'Drink';
  let texto = 'Tem novidade no Drink.';
  let tag = 'drink';
  let etapa = '';
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
    } else if (corpo && corpo.tipo === 'chamado') {
      titulo = 'Evento chamando Drinks';
      texto = `${String(corpo.evento || 'Evento').slice(0, 30)} · ${bairro(corpo.de)}${/^\d{2}:\d{2}$/.test(String(corpo.fim)) ? ` · até ${corpo.fim}` : ''}`;
      tag = 'drink-chamado';
    } else if (corpo && corpo.tipo === 'agendada' && corpo.janela) {
      const h = new Date(Number(corpo.janela.de)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      titulo = 'Volta agendada perto de você';
      texto = `${bairro(corpo.de)} → ${bairro(corpo.para)} · às ${h} · ${reais(corpo.valor)}`;
      tag = 'drink-agendada';
    } else if (corpo && corpo.tipo === 'bar-abriu' && /^[\w-]{16}$/.test(String(corpo.id))) {
      // um bar favorito abriu: o nome, até que horas e o benefício (o que o bar já mostra na fachada)
      const nome = String(corpo.nome || 'Seu bar favorito').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60);
      const ate = Number(corpo.ate) > 0 ? new Date(Number(corpo.ate)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
      const ben = String(corpo.beneficio || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60);
      titulo = `${nome} abriu`;
      texto = `${ate ? `Aberto até ${ate}. ` : ''}${ben ? `Voltando de Drink: ${ben.charAt(0).toLowerCase()}${ben.slice(1)}.` : 'Bebeu? Volte de Drink.'}`;
      tag = `drink-bar-${corpo.id}`;
    } else if (corpo && corpo.tipo === 'pedido') {
      titulo = 'Pedido novo no Drink';
      texto = `${bairro(corpo.de)} → ${bairro(corpo.para)} · ${reais(corpo.valor)}`;
      tag = 'drink-pedido';
    } else if (corpo && corpo.tipo === 'ao-vivo' && ['indo', 'viagem'].includes(corpo.etapa)) {
      [titulo, texto] = aoVivo(corpo);
      tag = 'drink-ao-vivo';
      etapa = corpo.etapa;
    } else if (corpo && AVISOS[corpo.tipo]) {
      [titulo, texto] = AVISOS[corpo.tipo];
      tag = ETAPA_AO_VIVO[corpo.tipo] ? 'drink-ao-vivo' : 'drink-corrida';
      if (ETAPA_AO_VIVO[corpo.tipo]) etapa = corpo.tipo;
    }
  }
  let mudou = true;
  if (etapa) {
    // o placar não volta: se já passou dessa etapa, fica o que estava (o iPhone pede que todo push mostre algo)
    const [antes] = await self.registration.getNotifications({ tag: 'drink-ao-vivo' });
    const etapaAntes = antes && antes.data && antes.data.etapa;
    if (etapaAntes && ETAPA_AO_VIVO[etapaAntes] > ETAPA_AO_VIVO[etapa]) { titulo = antes.title; texto = antes.body; etapa = etapaAntes; }
    mudou = etapaAntes !== etapa;
  }
  // com o app na tela, o aviso chega sem som (o próprio app já avisou)
  const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const naTela = abertos.some((c) => c.visibilityState === 'visible');
  return self.registration.showNotification(titulo, {
    // "tem Drink perto" chega uma vez: os seguintes só trocam o texto, sem tocar de novo; o ao vivo só toca quando
    // muda a etapa (os minutos que baixam trocam o texto em silêncio)
    body: texto, tag, renotify: tag !== 'drink-online' && mudou, silent: naTela || !mudou,
    icon: '../icon-192.png', badge: '../icon-192.png', data: { url: './', etapa },
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
