/* Maison Rouge: o QR da volta e a entrada das seções ao rolar. */
(function () {
  'use strict';

  // o convite do evento (o link que o app gera em Eventos > Maison Rouge > Convite). Com ele, o embarque já vem no
  // Postin e os pedidos saem como da festa. Vazio: o QR abre o app.
  var CONVITE = '';
  var APP = CONVITE || 'https://jgg190310-ops.github.io/CLAUDE.md/drink/app/';

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
