/* Maison Rouge: contagem, QR da volta, confete e entrada das seções ao rolar. */
(function () {
  'use strict';

  var INICIO = new Date('2026-10-31T23:00:00-03:00').getTime();
  var DRINKS = new Date('2026-11-01T01:30:00-03:00').getTime();
  var FIM = new Date('2026-11-01T08:00:00-03:00').getTime();
  // o convite do evento (o link que o app gera em Eventos > Maison Rouge > Convite). Com ele, o embarque já vem no
  // Postin e os pedidos saem como da festa. Vazio: o QR abre o app.
  var CONVITE = '';
  var APP = CONVITE || 'https://jgg190310-ops.github.io/CLAUDE.md/drink/app/';

  /* ---------- contagem ---------- */
  var caixa = document.getElementById('mr-contagem');
  var titulo = document.getElementById('mr-contagem-t');
  var campos = {};
  if (caixa) {
    Array.prototype.forEach.call(caixa.querySelectorAll('[data-c]'), function (b) { campos[b.getAttribute('data-c')] = b; });
  }
  function dois(n) { return n < 10 ? '0' + n : String(n); }

  var relogio = null;
  function tique() {
    if (!caixa) return;
    var agora = Date.now();
    if (agora >= FIM) {
      caixa.classList.remove('agora');
      caixa.classList.add('fim');
      titulo.textContent = 'Valeu pela noite! Todo mundo chegou em casa.';
      clearInterval(relogio);
      return;
    }
    if (agora >= INICIO) {
      caixa.classList.add('agora');
      titulo.textContent = agora < DRINKS
        ? 'Está acontecendo agora! Os Drinks chegam à 01:30.'
        : 'Os Drinks estão na porta. Escaneia o QR e bora pra casa.';
      return;
    }
    var falta = Math.floor((INICIO - agora) / 1000);
    var d = Math.floor(falta / 86400);
    var h = Math.floor(falta % 86400 / 3600);
    var m = Math.floor(falta % 3600 / 60);
    var s = falta % 60;
    if (campos.d) campos.d.textContent = dois(d);
    if (campos.h) campos.h.textContent = dois(h);
    if (campos.m) campos.m.textContent = dois(m);
    if (campos.s) campos.s.textContent = dois(s);
    caixa.setAttribute('aria-label', 'Faltam ' + d + ' dias, ' + h + ' horas e ' + m + ' minutos para a Maison Rouge');
  }
  tique();
  relogio = setInterval(tique, 1000);

  /* ---------- QR da volta ---------- */
  if (CONVITE) Array.prototype.forEach.call(document.querySelectorAll('a[href="../app/"]'), function (a) { a.href = CONVITE; });
  var alvo = document.getElementById('mr-qr');
  if (alvo && typeof window.qrcode === 'function') {
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(APP);
      qr.make();
      alvo.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
      var svg = alvo.querySelector('svg');
      if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }
    } catch (e) { /* sem QR: o botão abaixo ainda abre o app */ }
  }

  /* ---------- confete na abertura (quem pediu menos movimento fica sem) ---------- */
  var confete = document.getElementById('mr-confete');
  var parado = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (confete && !parado) {
    var cores = ['#E5383B', '#FFFFFF', '#C1121F', '#8E0E14'];
    for (var i = 0; i < 26; i += 1) {
      var pedaco = document.createElement('i');
      pedaco.style.left = (Math.random() * 100).toFixed(1) + '%';
      pedaco.style.background = cores[i % cores.length];
      pedaco.style.animationDuration = (6 + Math.random() * 7).toFixed(1) + 's';
      pedaco.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's';
      pedaco.style.setProperty('--vento', Math.round(Math.random() * 120 - 60) + 'px');
      if (i % 3 === 0) { pedaco.style.width = '10px'; pedaco.style.height = '10px'; pedaco.style.borderRadius = '50%'; }
      confete.appendChild(pedaco);
    }
  }

  /* ---------- entrada ao rolar ---------- */
  var itens = document.querySelectorAll('.mr-revela');
  var mostrar = function (el) { el.classList.add('visto'); };
  var semMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || semMovimento) {
    Array.prototype.forEach.call(itens, mostrar);
  } else {
    var io = new IntersectionObserver(function (vistos) {
      vistos.forEach(function (v) {
        if (v.isIntersecting) { mostrar(v.target); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(itens, function (el) { io.observe(el); });
  }
})();
