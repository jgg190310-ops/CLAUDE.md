/* Drink — o leitor de QR Code dentro do app (o QR da mesa do bar, o convite de um evento). A câmera de trás filma; o
   leitor nativo do navegador (BarcodeDetector, no Chrome do Android) lê cada quadro; onde ele não existe (o Safari do
   iPhone), o jsQR faz o mesmo no próprio celular, carregado só na primeira vez que a câmera abre. Nada sai do aparelho. */
(function () {
  'use strict';

  let jsqrPromessa = null;
  function carregarJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (!jsqrPromessa) {
      jsqrPromessa = new Promise((ok, falha) => {
        const s = document.createElement('script');
        s.src = 'vendor/jsqr.js?v=37';
        s.onload = () => (window.jsQR ? ok(window.jsQR) : falha(new Error('o leitor não carregou')));
        s.onerror = () => { jsqrPromessa = null; falha(new Error('o leitor não carregou')); };
        document.head.appendChild(s);
      });
    }
    return jsqrPromessa;
  }
  async function detectorNativo() {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      return formatos.includes('qr_code') ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    } catch (e) { return null; }
  }
  const temCamera = () => Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // liga a câmera no <video> e chama aoLer(texto) a cada QR lido (o mesmo QR só uma vez a cada 2 s)
  async function iniciar(video, aoLer) {
    if (!temCamera()) throw Object.assign(new Error('sem câmera'), { code: 'sem-camera' });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    let parado = false;
    let timer = 0;
    const parar = () => {
      parado = true;
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    try {
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
    } catch (e) { parar(); throw e; }
    const detector = await detectorNativo();
    let jsQR = null;
    if (!detector) {
      try { jsQR = await carregarJsQR(); } catch (e) { parar(); throw Object.assign(e, { code: 'sem-leitor' }); }
    }
    const tela = document.createElement('canvas');
    const ctx = tela.getContext('2d', { willReadFrequently: true });
    let ultimo = '';
    let ultimoEm = 0;
    const passo = async () => {
      if (parado) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          let txt = '';
          if (detector) {
            const r = await detector.detect(video);
            if (r && r[0]) txt = r[0].rawValue || '';
          } else {
            // um quadro menor basta para o QR de uma mesa, e é bem mais rápido
            const w = Math.min(720, video.videoWidth);
            const h = Math.round((video.videoHeight * w) / video.videoWidth);
            tela.width = w;
            tela.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
            if (r) txt = r.data || '';
          }
          if (txt && !parado && (txt !== ultimo || Date.now() - ultimoEm > 2000)) {
            ultimo = txt;
            ultimoEm = Date.now();
            aoLer(txt);
          }
        }
      } catch (e) { /* quadro ruim: tenta o próximo */ }
      if (!parado) timer = setTimeout(passo, 140);
    };
    passo();
    return { parar };
  }

  window.Drink.leitor = { iniciar, temCamera };
}());
