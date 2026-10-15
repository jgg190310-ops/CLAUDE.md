/* Carro de apoio — a página da equipe: entra com o código, vê quem pediu "Me busca" (cifrado), avisa "Estou indo"
   e marca "Peguei". A lista vem do canal da equipe no ntfy; a posição de cada motorista só existe cifrada lá. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const AP = window.Drink.apoio;
  const GUARDADO = 'drink-apoio-equipe';

  function toast(t) {
    const el = $('#pn-toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function erro(t) { const e = $('#ap-erro'); e.textContent = t || ''; e.hidden = !t; }

  let eq = null;
  let nome = '';
  let msgs = [];
  let ouvindo = null;
  let vistos = new Set(); // quem já tocou o alarme
  let meu = null;         // a posição deste carro, para a distância
  let trava = null;

  const minutos = (t) => Math.max(0, Math.round((Date.now() - t) / 60000));
  const km = (a, b) => {
    const r = Math.PI / 180;
    const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(x));
  };

  function tocar() {
    try {
      const som = new (window.AudioContext || window.webkitAudioContext)();
      [880, 1175, 880].forEach((f, i) => {
        const o = som.createOscillator(); const g = som.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, som.currentTime + i * 0.2);
        g.gain.exponentialRampToValueAtTime(0.3, som.currentTime + i * 0.2 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, som.currentTime + i * 0.2 + 0.18);
        o.connect(g).connect(som.destination); o.start(som.currentTime + i * 0.2); o.stop(som.currentTime + i * 0.2 + 0.2);
      });
    } catch (e) { /* sem som */ }
    try { if (navigator.vibrate) navigator.vibrate([250, 100, 250]); } catch (e) { /* ok */ }
  }

  function desenhar() {
    const lista = AP.situacao(msgs);
    const ul = $('#ap-lista');
    ul.innerHTML = '';
    $('#ap-resumo').textContent = lista.length
      ? `${lista.length} ${lista.length === 1 ? 'motorista esperando' : 'motoristas esperando'}. O mais antigo vem primeiro.`
      : 'Ninguém esperando agora. Quando um motorista pedir, o celular toca.';
    lista.forEach((m) => {
      const li = document.createElement('li');
      li.className = m.tipo === 'indo' ? 'indo' : '';
      const cab = document.createElement('div');
      cab.className = 'ap-mot';
      const b = document.createElement('b');
      b.textContent = m.nome || 'Motorista';
      const t = document.createElement('span');
      const min = minutos(m.desde || m.t);
      t.textContent = min < 1 ? 'agora' : `há ${min} min`;
      cab.append(b, t);
      const det = document.createElement('p');
      det.className = 'ap-det';
      const dist = meu && m.pos ? `${km(meu, m.pos).toFixed(1).replace('.', ',')} km daqui` : '';
      det.textContent = [m.veic === 'patinete' ? 'de patinete' : 'de bike', dist, m.tipo === 'indo' ? `${m.quem || 'um carro'} está indo` : ''].filter(Boolean).join(' · ');
      const bts = document.createElement('div');
      bts.className = 'az-bts';
      if (m.pos) {
        const mapa = document.createElement('a');
        mapa.className = 'pn-botao pn-botao-2';
        mapa.target = '_blank';
        mapa.rel = 'noopener';
        mapa.href = `https://www.google.com/maps/dir/?api=1&destination=${m.pos.lat},${m.pos.lon}`;
        mapa.textContent = 'Abrir no mapa';
        bts.append(mapa);
      }
      const indo = document.createElement('button');
      indo.type = 'button';
      indo.className = 'pn-botao';
      indo.textContent = m.tipo === 'indo' && m.quem === nome ? 'Peguei' : 'Estou indo';
      indo.addEventListener('click', () => (indo.textContent === 'Peguei' ? marcar(m, 'peguei') : marcar(m, 'indo')));
      bts.append(indo);
      li.append(cab, det, bts);
      ul.append(li);
    });
  }

  async function marcar(m, tipo) {
    try {
      await AP.publicar(eq, { tipo, d: m.d, quem: nome });
      toast(tipo === 'indo' ? `${m.nome || 'O motorista'} foi avisado: você está indo.` : `${m.nome || 'Motorista'} marcado como pego.`);
    } catch (e) { toast('Não deu para avisar. Confere a internet e toca de novo.'); }
  }

  async function entrar(codigo, nomeCarro) {
    erro('');
    if (!AP.codigoValido(codigo)) { erro('O código tem pelo menos 6 letras ou números.'); $('#ap-codigo').focus(); return; }
    try { eq = await AP.equipe(codigo); } catch (e) { erro('Este navegador não consegue abrir o canal da equipe. Usa o Chrome ou o Safari atualizados.'); return; }
    nome = String(nomeCarro || '').trim().slice(0, 30) || 'Carro de apoio';
    try { localStorage.setItem(GUARDADO, JSON.stringify({ codigo: eq.codigo, nome })); } catch (e) { /* ok */ }
    $('#ap-entrar').hidden = true;
    $('#ap-painel').hidden = false;
    $('#ap-quem').hidden = false;
    $('#ap-quem').textContent = `${nome} · equipe ${eq.codigo}`;
    const link = new URL('../app/', location.href);
    link.hash = `equipe=${eq.codigo}`;
    $('#ap-link').value = link.href;
    $('#ap-whats').href = `https://wa.me/?text=${encodeURIComponent(`Motorista da equipe Drink: toca neste link uma vez (com o app aberto ou não). Depois, quando estiver online e longe, toca em "Me busca" que o carro de apoio vai te buscar. ${link.href}`)}`;
    $('#ap-t').focus();
    msgs = [];
    if (ouvindo) ouvindo.fechar();
    ouvindo = AP.ouvir(eq, (m) => {
      msgs.push(m);
      if (m.tipo === 'busca' && !vistos.has(m.d + m.desde) && Date.now() - m.t < 10 * 60000) { vistos.add(m.d + m.desde); tocar(); }
      desenhar();
    });
    desenhar();
    if (navigator.geolocation) navigator.geolocation.watchPosition((p) => { meu = { lat: p.coords.latitude, lon: p.coords.longitude }; desenhar(); }, () => {}, { enableHighAccuracy: false, maximumAge: 30000 });
    try { if ('wakeLock' in navigator) trava = await navigator.wakeLock.request('screen'); } catch (e) { /* ok */ }
  }

  $('#ap-form').addEventListener('submit', (e) => { e.preventDefault(); entrar($('#ap-codigo').value, $('#ap-nome').value); });
  $('#ap-novo').addEventListener('click', () => { $('#ap-codigo').value = AP.novoCodigo(); erro(''); toast('Código novo criado. Entre e mande o link para os motoristas.'); });
  $('#ap-copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#ap-link').value); toast('Link copiado.'); } catch (e) { $('#ap-link').select(); toast('Selecionei o link: copie e mande.'); }
  });
  $('#ap-sair').addEventListener('click', () => {
    try { localStorage.removeItem(GUARDADO); } catch (e) { /* ok */ }
    if (ouvindo) ouvindo.fechar();
    if (trava) trava.release().catch(() => {});
    location.reload();
  });
  setInterval(() => { if (eq) desenhar(); }, 30000);
  document.addEventListener('visibilitychange', async () => {
    if (eq && document.visibilityState === 'visible' && 'wakeLock' in navigator) { try { trava = await navigator.wakeLock.request('screen'); } catch (e) { /* ok */ } }
  });

  try {
    const g = JSON.parse(localStorage.getItem(GUARDADO) || 'null');
    if (g && g.codigo) { $('#ap-codigo').value = g.codigo; $('#ap-nome').value = g.nome || ''; entrar(g.codigo, g.nome); }
  } catch (e) { /* entra de novo */ }
})();
