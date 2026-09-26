/* Drink — protótipo. Tudo roda no navegador; nada é enviado.
   Animações acontecem uma vez (na chegada ou num clique) e param. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduzirMovimento = () => movimentoReduzido.matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl0 = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const dois = (n) => String(n).padStart(2, '0');
  const hhmm = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  const hhmmss = (d) => `${hhmm(d)}:${dois(d.getSeconds())}`;
  const marcado = (nome) => { const r = document.querySelector(`input[name="${nome}"]:checked`); return r ? r.value : null; };
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const limitar = (v) => Math.max(0, Math.min(1, v));
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const freando = (t) => 1 - Math.pow(1 - t, 3);

  // gerador com semente: o cenário sai igual em toda visita
  function semente(n) {
    return function () {
      n = (n + 0x6D2B79F5) | 0;
      let t = Math.imul(n ^ (n >>> 15), 1 | n);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // anima uma vez; com movimento reduzido vai direto ao fim
  function animar(ms, cada, fim) {
    if (reduzirMovimento()) { cada(1); if (fim) fim(); return () => {}; }
    let id = 0;
    let inicio = 0;
    let parado = false;
    function quadro(agora) {
      if (parado) return;
      if (!inicio) inicio = agora;
      const t = Math.min(1, (agora - inicio) / ms);
      cada(t);
      if (t < 1) id = requestAnimationFrame(quadro);
      else if (fim) fim();
    }
    id = requestAnimationFrame(quadro);
    return () => { parado = true; cancelAnimationFrame(id); };
  }

  /* ---------- preço ---------- */
  const PRECO = { saida: 25, km: 3.5, madrugada: 0.2 };

  function ehMadrugada(hora) {
    if (!hora) return false;
    const h = Number(String(hora).split(':')[0]);
    return h >= 0 && h < 5;
  }

  function precoDaViagem(km, hora) {
    const rodado = km * PRECO.km;
    const subtotal = PRECO.saida + rodado;
    const adicional = ehMadrugada(hora) ? subtotal * PRECO.madrugada : 0;
    return { saida: PRECO.saida, rodado, adicional, total: subtotal + adicional };
  }

  /* ---------- rastros de luz do início ---------- */
  function montarRastros() {
    const cv = $('#rastros');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const hero = cv.parentElement;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let P = null;
    let faixa = 0;
    let rastros = [];
    let progresso = 0;

    function ponto(t) {
      const u = 1 - t;
      const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
      return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
    }
    function normal(t) {
      const u = 1 - t;
      const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
      const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    }
    // ponto numa faixa (off em larguras de faixa), com perspectiva: perto é largo, longe é estreito
    const perto = (t) => 1 - 0.74 * t;
    function naFaixa(t, off, lado = 0) {
      const [x, y] = ponto(t);
      const [nx, ny] = normal(t);
      const o = (off * faixa + lado) * perto(t);
      return [(x + nx * o) * dpr, (y + ny * o) * dpr];
    }

    function preparar() {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      const estreito = W < 900;
      P = estreito
        ? [[-0.25 * W, 0.99 * H], [0.32 * W, 0.95 * H], [0.56 * W, 0.72 * H], [1.3 * W, 0.6 * H]]
        : [[0.15 * W, 1.2 * H], [0.55 * W, 1.08 * H], [0.66 * W, 0.72 * H], [1.12 * W, 0.5 * H]];
      faixa = Math.min(W, H) * (estreito ? 0.066 : 0.045);
      const rnd = semente(11);
      rastros = [];
      [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].forEach((f) => {
        const vindo = f > 0;
        [-0.19, 0.19].forEach((lado) => {
          let cor = vindo ? [236, 242, 255] : [255, 52, 78];
          if (f === 1.5 && lado > 0) cor = [255, 170, 72];
          rastros.push({
            off: f + lado + (rnd() - 0.5) * 0.08,
            vindo,
            cor,
            atraso: rnd() * 0.22,
            k1: 4 + rnd() * 6, k2: 11 + rnd() * 10, f1: rnd() * 6.28, f2: rnd() * 6.28,
            forca: 0.7 + rnd() * 0.3,
          });
        });
      });
    }

    function gradiente(r) {
      const [x0] = naFaixa(0, r.off);
      const [x1] = naFaixa(1, r.off);
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      const cor = r.cor.join(',');
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const [x] = naFaixa(t, r.off);
        const brilho = limitar(0.62 + 0.26 * Math.sin(t * r.k1 + r.f1) + 0.16 * Math.sin(t * r.k2 + r.f2)) * r.forca * (0.5 + 0.5 * perto(t));
        g.addColorStop(limitar((x - x0) / (x1 - x0 || 1)), `rgba(${cor},${brilho.toFixed(3)})`);
      }
      return g;
    }

    function fita(r, ta, tb, largura) {
      const S = 36;
      const ida = [];
      const volta = [];
      for (let s = 0; s <= S; s++) {
        const t = ta + ((tb - ta) * s) / S;
        const w = (largura * (0.3 + 0.7 * perto(t))) / 2;
        ida.push(naFaixa(t, r.off, w));
        volta.push(naFaixa(t, r.off, -w));
      }
      ctx.beginPath();
      ctx.moveTo(ida[0][0], ida[0][1]);
      ida.forEach((q) => ctx.lineTo(q[0], q[1]));
      for (let i = volta.length - 1; i >= 0; i--) ctx.lineTo(volta[i][0], volta[i][1]);
      ctx.closePath();
      ctx.fill();
    }

    function linhaTracejada(off, alfa, traco) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const [x, y] = naFaixa(i / 60, off);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.setLineDash(traco ? traco.map((v) => v * dpr) : []);
      ctx.strokeStyle = `rgba(200, 214, 255, ${alfa})`;
      ctx.stroke();
    }

    function desenhar(p) {
      progresso = p;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, cv.width, cv.height);

      // asfalto e faixas pintadas
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const [x, y] = naFaixa(i / 60, -3.3); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      for (let i = 60; i >= 0; i--) { const [x, y] = naFaixa(i / 60, 3.3); ctx.lineTo(x, y); }
      ctx.closePath();
      const chao = ctx.createLinearGradient(0, cv.height, cv.width, cv.height * 0.4);
      chao.addColorStop(0, 'rgba(26, 33, 62, .6)');
      chao.addColorStop(1, 'rgba(26, 33, 62, 0)');
      ctx.fillStyle = chao;
      ctx.fill();
      ctx.lineWidth = 1 * dpr;
      [-2, -1, 1, 2].forEach((f) => linhaTracejada(f, 0.07, [14, 18]));
      linhaTracejada(0, 0.1);
      [-3.1, 3.1].forEach((f) => linhaTracejada(f, 0.09));
      ctx.setLineDash([]);

      ctx.globalCompositeOperation = 'lighter';

      // postes de luz de sódio ao longo da pista
      [0.08, 0.24, 0.4, 0.56, 0.72, 0.88].forEach((t, i) => {
        const a = limitar(p * 1.6 - i * 0.08);
        if (!a) return;
        const [x, y] = naFaixa(t, 4.1);
        const raio = (26 + 46 * perto(t)) * dpr;
        const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
        g.addColorStop(0, `rgba(255, 200, 130, ${0.55 * a})`);
        g.addColorStop(0.18, `rgba(255, 165, 58, ${0.22 * a})`);
        g.addColorStop(1, 'rgba(255, 165, 58, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
      });

      // rastros: lanternas vão, faróis vêm
      rastros.forEach((r) => {
        const pr = limitar((p - r.atraso) / (1 - r.atraso));
        if (!pr) return;
        const ta = r.vindo ? 1 - pr : 0;
        const tb = r.vindo ? 1 : pr;
        const cor = r.cor.join(',');
        const g = gradiente(r);
        ctx.fillStyle = g;
        ctx.shadowColor = `rgba(${cor}, .9)`;
        ctx.shadowBlur = 14 * dpr;
        fita(r, ta, tb, 2.6);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.12;
        fita(r, ta, tb, 12);
        ctx.globalAlpha = 1;
        if (pr < 1) {
          const tp = r.vindo ? ta : tb;
          const [x, y] = naFaixa(tp, r.off);
          const raio = (8 + 14 * perto(tp)) * dpr;
          const h = ctx.createRadialGradient(x, y, 0, x, y, raio);
          h.addColorStop(0, `rgba(${cor}, .95)`);
          h.addColorStop(1, `rgba(${cor}, 0)`);
          ctx.fillStyle = h;
          ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
        }
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    preparar();
    const r0 = hero.getBoundingClientRect();
    const visivel = r0.bottom > 0 && r0.top < window.innerHeight;
    if (!visivel || reduzirMovimento()) desenhar(1);
    else animar(2800, (t) => desenhar(freando(t)));

    let largura = W;
    let espera = 0;
    window.addEventListener('resize', () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const r = hero.getBoundingClientRect();
        if (Math.abs(r.width - largura) < 2 && Math.abs(r.height - H) < 40) return;
        largura = r.width;
        preparar();
        desenhar(progresso);
      }, 150);
    });
  }

  /* ---------- celular do início: o carro anda um trecho ---------- */
  function montarFoneHero() {
    const rota = $('#h-rota');
    const carro = $('#h-carro');
    if (!rota || !carro || reduzirMovimento() || !rota.getTotalLength) return;
    const total = rota.getTotalLength();
    const de = 0.2;
    const ate = 0.55;
    function em(f) {
      const pt = rota.getPointAtLength(total * f);
      carro.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      rota.setAttribute('stroke-dasharray', `${(f * 100).toFixed(2)} 100`);
    }
    em(de);
    setTimeout(() => animar(2600, (t) => em(de + (ate - de) * suave(t))), 900);
  }

  /* ---------- menu do celular ---------- */
  function montarMenu() {
    const bt = $('#menu-btn');
    const menu = $('#menu');
    if (!bt || !menu) return;
    function abrir(sim) {
      menu.hidden = !sim;
      bt.setAttribute('aria-expanded', String(sim));
      $('use', bt).setAttribute('href', sim ? '#i-fechar' : '#i-menu');
      $('.sr', bt).textContent = sim ? 'Fechar o menu' : 'Abrir o menu';
      document.body.classList.toggle('menu-aberto', sim);
      $('#topo').classList.toggle('solido', sim || window.scrollY > 8);
    }
    bt.addEventListener('click', () => abrir(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { abrir(false); bt.focus(); }
    });
    const largo = window.matchMedia('(min-width: 1101px)');
    const aoMudar = () => { if (largo.matches) abrir(false); };
    if (largo.addEventListener) largo.addEventListener('change', aoMudar);
  }

  /* ---------- topo e seção atual ---------- */
  function montarNavegacao() {
    const topo = $('#topo');
    const links = $$('.nav a[data-aba]');
    function marcar(id) { links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.aba === id))); }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) marcar(e.target.dataset.secao); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('[data-secao]').forEach((s) => io.observe(s));
    }
    return function aoRolar() {
      topo.classList.toggle('solido', window.scrollY > 8 || document.body.classList.contains('menu-aberto'));
    };
  }

  /* ---------- como funciona: o celular acompanha o passo ---------- */
  function montarComo() {
    const fone = $('#fone');
    const palco = $('.como-palco');
    const passos = $$('.passo');
    if (!fone || !passos.length) return () => {};
    const telas = $$('.tela', fone);
    const cartoes = passos.map((p) => $('.passo-card', p));
    let atual = 1;

    function mostrar(n) {
      if (n === atual) return;
      atual = n;
      fone.dataset.tela = String(n);
      telas.forEach((t) => t.classList.toggle('ativa', Number(t.dataset.tela) === n));
      passos.forEach((p) => {
        const sim = Number(p.dataset.passo) === n;
        p.classList.toggle('ativo', sim);
        if (sim) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
      });
    }

    return function aoRolar() {
      const alto = window.innerHeight;
      let alvo = alto * 0.5;
      if (window.innerWidth <= 900) {
        const baixo = palco.getBoundingClientRect().bottom;
        alvo = (Math.max(0, baixo) + alto) / 2;
      }
      let melhor = atual;
      let menor = Infinity;
      cartoes.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - alvo);
        if (d < menor) { menor = d; melhor = i + 1; }
      });
      mostrar(melhor);
    };
  }

  /* ---------- a dobra: desenho técnico que dobra de verdade ---------- */
  const DOBRA = {
    bike: {
      nome: 'Bike elétrica dobrável', botao: ['Dobrar a bike', 'Abrir a bike'],
      aberta: ['Aberta', '134 × 88 cm'], dobrada: ['Dobrada', '74 × 63 × 36 cm'], peso: '17 kg', tempo: '20 s', ms: 1700,
    },
    patinete: {
      nome: 'Patinete elétrico dobrável', botao: ['Dobrar o patinete', 'Abrir o patinete'],
      aberta: ['Aberto', '116 × 114 cm'], dobrada: ['Dobrado', '116 × 33 × 43 cm'], peso: '14 kg', tempo: '5 s', ms: 1000,
    },
  };

  function montarDobra() {
    const planta = $('#planta');
    const bt = $('#dobrar');
    if (!planta || !bt) return;
    const guidao = $('#b-guidao');
    const selim = $('#b-selim');
    const frente = $('#b-frente');
    const haste = $('#p-haste');
    let veic = 'bike';
    let dobrada = false;
    let f = 0; // 0 aberta, 1 dobrada
    let parar = null;

    function poseBike(x) {
      const g = suave(limitar(x / 0.34));
      const s = suave(limitar((x - 0.14) / 0.3));
      const v = suave(limitar((x - 0.3) / 0.7));
      guidao.setAttribute('transform', `rotate(${(160 * g).toFixed(2)} 94 44)`);
      selim.setAttribute('transform', `translate(${(2.3 * s).toFixed(2)} ${(13.8 * s).toFixed(2)})`);
      const sx = 1 - 2 * v;
      frente.setAttribute('transform', `translate(75 0) scale(${sx.toFixed(4)} 1) translate(-75 0)`);
      frente.classList.toggle('atras', sx < 0);
    }
    function posePat(x) {
      haste.setAttribute('transform', `rotate(${(-87.8 * suave(limitar(x))).toFixed(2)} 103.6 70)`);
    }
    function pose(x) {
      f = x;
      if (veic === 'bike') poseBike(x); else posePat(x);
    }
    function legenda() {
      const d = DOBRA[veic];
      $('#planta-nome').textContent = d.nome;
      $('#sp-aberta-t').textContent = d.aberta[0];
      $('#sp-aberta').textContent = d.aberta[1];
      $('#sp-dobrada-t').textContent = d.dobrada[0];
      $('#sp-dobrada').textContent = d.dobrada[1];
      $('#sp-peso').textContent = d.peso;
      $('#sp-tempo').textContent = d.tempo;
      bt.textContent = d.botao[dobrada ? 1 : 0];
      const e = dobrada ? d.dobrada : d.aberta;
      $('#planta-estado').textContent = `${e[0]}: ${e[1]}`;
    }

    bt.addEventListener('click', () => {
      if (parar) parar();
      dobrada = !dobrada;
      const de = f;
      const para = dobrada ? 1 : 0;
      planta.dataset.estado = 'mudando';
      legenda();
      const ms = DOBRA[veic].ms * Math.max(0.3, Math.abs(para - de));
      parar = animar(ms, (t) => pose(de + (para - de) * t), () => {
        parar = null;
        planta.dataset.estado = dobrada ? 'dobrada' : 'aberta';
      });
    });

    $$('input[name="dobra-veic"]').forEach((r) => r.addEventListener('change', () => {
      if (parar) { parar(); parar = null; }
      veic = r.value;
      dobrada = false;
      poseBike(0);
      posePat(0);
      f = 0;
      planta.dataset.veic = veic;
      planta.dataset.estado = 'aberta';
      legenda();
    }));
    legenda();
  }

  /* ---------- simulação da volta ---------- */
  const MOTORISTAS = [
    { nome: 'Rafael S.', nota: '4,9', cnh: 9 },
    { nome: 'Camila R.', nota: '5,0', cnh: 12 },
    { nome: 'Diego M.', nota: '4,8', cnh: 6 },
    { nome: 'Juliana P.', nota: '4,9', cnh: 15 },
  ];

  function montarCalculadora() {
    const form = $('#pedir');
    if (!form) return;
    const km = $('#c-km');
    const agenda = $('#agenda');
    const agendaHora = $('#c-agenda');
    const itens = $('#itens');
    const trilha = $('#trilha');
    const status = $('#c-status');
    const pedir = $('#c-pedir');
    const selo = $('#c-selo');
    let timer = null;
    let emAndamento = false;

    $('#c-num').textContent = String(1000 + Math.floor(Math.random() * 9000));

    const agendado = () => marcado('quando') === 'agendar';
    // "Agora" usa o relógio de quem está vendo; "Agendar" usa o horário escolhido
    const horaDoPedido = () => (agendado() ? agendaHora.value : hhmm(new Date()));
    const item = (nome, valor, gratis) => `<li${gratis ? ' class="gratis"' : ''}><span>${esc(nome)}</span><b>${esc(valor)}</b></li>`;

    function atualizar() {
      const k = Number(km.value);
      $('#c-km-out').textContent = `${k} km`;
      agenda.hidden = !agendado();
      const p = precoDaViagem(k, horaDoPedido());
      let html = item('Saída', brl(p.saida)) + item(`${k} km × R$ 3,50`, brl(p.rodado));
      if (p.adicional) html += item('Bandeira 2 (+20%)', brl(p.adicional));
      if (agendado()) html += item(`Agendado para ${agendaHora.value || '--:--'}`, 'grátis', true);
      html += item('Seguro da viagem', 'incluso', true);
      itens.innerHTML = html;
      $('#c-total').textContent = brl(p.total);
      $('#tx-b1').dataset.on = String(!p.adicional);
      $('#tx-b2').dataset.on = String(Boolean(p.adicional));
    }

    function limpar() {
      if (emAndamento) return;
      trilha.hidden = true;
      selo.hidden = true;
      pedir.textContent = 'Pedir este Drink';
    }

    function simular(passos, fim) {
      trilha.hidden = false;
      selo.hidden = true;
      trilha.innerHTML = passos.map((p) => `<li>${esc(p)}</li>`).join('');
      const lis = $$('li', trilha);
      let i = 0;
      emAndamento = true;
      pedir.setAttribute('aria-disabled', 'true');
      pedir.textContent = 'Pedido em andamento';

      (function passo() {
        lis.forEach((li, j) => { li.className = j < i ? 'feito' : (j === i ? 'atual' : ''); });
        if (i >= lis.length) {
          emAndamento = false;
          pedir.removeAttribute('aria-disabled');
          pedir.textContent = 'Pedir outro Drink';
          status.textContent = `Simulação concluída. ${fim}.`;
          selo.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>${esc(fim)}`;
          selo.hidden = false;
          return;
        }
        status.textContent = passos[i];
        i += 1;
        timer = setTimeout(passo, reduzirMovimento() ? 150 : 1300);
      }());
    }

    form.addEventListener('input', () => { limpar(); atualizar(); });
    form.addEventListener('change', () => { limpar(); atualizar(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (emAndamento) return;
      clearTimeout(timer);

      const m = sortear(MOTORISTAS);
      let v = marcado('veic');
      if (v === 'qualquer') v = Math.random() < 0.5 ? 'bike' : 'patinete';
      const veiculo = v === 'bike' ? 'bike elétrica' : 'patinete';
      const dobrado = v === 'bike' ? 'Bike dobrada' : 'Patinete dobrado';
      const de = $('#c-de').value.trim() || 'você';
      const para = $('#c-para').value.trim() || 'o destino';
      const aceito = `Pedido aceito por ${m.nome}, nota ${m.nota}, CNH há ${m.cnh} anos`
        + (marcado('cambio') === 'manual' ? '. Dirige câmbio manual' : '');

      if (agendado()) {
        simular([
          `Procurando um Drink perto de ${de}`,
          aceito,
          `${m.nome} chega de ${veiculo} às ${agendaHora.value || '--:--'}. Você recebe um aviso 10 min antes`,
        ], `Agendado para ${agendaHora.value || '--:--'}`);
      } else {
        simular([
          `Procurando um Drink perto de ${de}`,
          aceito,
          `A caminho de ${veiculo}, chega em ${5 + Math.floor(Math.random() * 8)} min`,
          'Chegou e conferiu o seu nome',
          'Vistoria feita com 5 fotos. Seguro ativo',
          `${dobrado} no porta-malas. Em viagem para ${para}`,
          'Carro estacionado e chave na sua mão',
        ], 'Entregue');
      }
    });
    atualizar();
  }

  /* ---------- vistoria ---------- */
  function montarVistoria() {
    const vist = $('.vistoria');
    if (!vist) return;
    const carro = $('#vist-carro');
    const botoes = $$('.foto', vist);
    const lis = $$('#vist-fotos li');
    const res = $('#vist-res');
    const barra = $('#vist-barra');
    const refazer = $('#vist-refazer');
    const tiradas = new Map();

    function atualizar() {
      const n = tiradas.size;
      lis.forEach((li) => {
        const h = tiradas.get(li.dataset.foto);
        li.classList.toggle('tirada', Boolean(h));
        $('.vf-hora', li).textContent = h ? `foto às ${h}` : 'sem foto';
      });
      botoes.forEach((b) => b.setAttribute('aria-pressed', String(tiradas.has(b.dataset.foto))));
      barra.style.width = `${(n / 5) * 100}%`;
      vist.classList.toggle('completa', n === 5);
      res.textContent = n === 5 ? 'Vistoria completa. Seguro ativado.' : `${n} de 5 fotos`;
      refazer.hidden = n === 0;
    }

    botoes.forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.foto;
      if (tiradas.has(k)) {
        tiradas.delete(k);
      } else {
        tiradas.set(k, hhmmss(new Date()));
        if (!reduzirMovimento()) {
          carro.classList.remove('clarao');
          void carro.offsetWidth;
          carro.classList.add('clarao');
        }
      }
      atualizar();
    }));
    refazer.addEventListener('click', () => {
      tiradas.clear();
      atualizar();
      botoes[0].focus();
    });
    atualizar();
  }

  /* ---------- eventos ---------- */
  function montarEventos() {
    const tipos = $$('#ev-tipos .chip');
    const convidados = $('#ev-conv');
    if (!convidados) return;
    let taxa = 0.35; // parte dos convidados que foi de carro e vai precisar de um Drink

    function calcular() {
      const c = Number(convidados.value);
      const carros = Math.max(1, Math.round((c * taxa) / 2.2));
      const n = Math.ceil(carros / 3);
      $('#ev-conv-out').textContent = c.toLocaleString('pt-BR');
      $('#ev-num').textContent = n;
      $('#ev-num-txt').textContent = n === 1 ? 'Drink de plantão' : 'Drinks de plantão';
      $('#ev-conta').innerHTML = `<li><span>Carros para levar</span><span>cerca de ${carros}</span></li>`
        + '<li><span>Viagens por Drink</span><span>3 por noite</span></li>';
    }

    tipos.forEach((b) => b.addEventListener('click', () => {
      tipos.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      taxa = Number(b.dataset.ev);
      calcular();
    }));
    convidados.addEventListener('input', calcular);
    calcular();
  }

  /* ---------- seja um Drink: ganho em odômetro ---------- */
  function odometro(el, texto) {
    const chars = Array.from(texto);
    const eDigito = (c) => /\d/.test(c);
    const antes = Array.from(el.dataset.valor || '');
    const mesmaForma = antes.length === chars.length && antes.every((c, i) => eDigito(c) === eDigito(chars[i]));
    if (!mesmaForma) {
      el.innerHTML = chars.map((c) => (eDigito(c)
        ? `<span class="odo-d"><span class="odo-fita">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`
        : `<span class="odo-s">${c.trim() ? esc(c) : '&nbsp;'}</span>`)).join('');
      void el.offsetWidth;
    }
    const fitas = $$('.odo-fita', el);
    let k = 0;
    chars.forEach((c) => {
      if (eDigito(c)) fitas[k++].style.transform = `translateY(${-Number(c) * 1.18}em)`;
    });
    el.dataset.valor = texto;
  }

  function montarMotorista() {
    const noites = $('#m-noites');
    const horas = $('#m-horas');
    if (!noites || !horas) return;

    function calcular() {
      const n = Number(noites.value);
      const h = Number(horas.value);
      $('#m-noites-out').textContent = n;
      $('#m-horas-out').textContent = h;
      const viagens = Math.round(n * 4.3 * h * 1.3);
      const bruto = viagens * 45;
      const aluguel = marcado('m-veic') === 'alugo' ? Math.round(60 * 4.3) : 0;
      const ganho = brl0(bruto - aluguel);
      $('#m-ganho').textContent = ganho;
      odometro($('#m-odo'), ganho);
      let html = `<li><span>Cerca de ${viagens} viagens</span><span>${brl0(bruto)}</span></li>`;
      if (aluguel) html += `<li><span>Aluguel com o Drink (R$ 60 por semana)</span><span>− ${brl0(aluguel)}</span></li>`;
      $('#m-conta').innerHTML = html;
    }

    [noites, horas].forEach((el) => el.addEventListener('input', calcular));
    $$('input[name="m-veic"]').forEach((r) => r.addEventListener('change', calcular));
    calcular();
  }

  /* ---------- diálogos "em breve" ---------- */
  function montarDialogos() {
    document.addEventListener('click', (e) => {
      const gatilho = e.target.closest('[data-abrir]');
      if (!gatilho) return;
      const dlg = document.getElementById(gatilho.dataset.abrir);
      if (!dlg) return;
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    });
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    });
  }

  /* ---------- amanhecer: prédios contra o céu ---------- */
  function montarSkyline() {
    const svg = $('#skyline');
    if (!svg) return;
    const rnd = semente(23);
    function fileira(base, min, var_, largMin, largVar) {
      const predios = [];
      let x = -10;
      while (x < 1450) {
        const w = largMin + Math.floor(rnd() * largVar);
        const h = min + Math.floor(rnd() * var_) + (rnd() < 0.12 ? 70 : 0);
        predios.push({ x, w, h });
        x += w + (rnd() < 0.2 ? 6 : 0);
      }
      const d = predios.map((p) => `M${p.x} ${base}V${base - p.h}H${p.x + p.w}V${base}Z`).join('');
      return { d, predios };
    }
    const fundo = fileira(240, 70, 110, 40, 70);
    const frente = fileira(240, 36, 90, 30, 60);
    let janelas = '';
    frente.predios.forEach((p) => {
      if (p.h < 60 || rnd() < 0.45) return;
      const q = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < q; i++) {
        const jx = p.x + 6 + Math.floor(rnd() * Math.max(1, p.w - 14));
        const jy = 240 - p.h + 10 + Math.floor(rnd() * Math.max(1, p.h - 30));
        janelas += `<rect x="${jx}" y="${jy}" width="4" height="5" rx="1"/>`;
      }
    });
    let antenas = '';
    frente.predios.forEach((p) => {
      if (rnd() < 0.12) antenas += `<rect x="${p.x + Math.floor(p.w / 2)}" y="${240 - p.h - 22}" width="2" height="22"/>`;
    });
    svg.innerHTML = `<path d="${fundo.d}" fill="#3A2150" opacity=".55"/>`
      + `<path d="${frente.d}"/>${antenas}`
      + `<g fill="#FFC57A" opacity=".85">${janelas}</g>`;
  }

  /* ---------- faixas de rolagem pintadas até o valor ---------- */
  function montarFaixas() {
    $$('input[type="range"]').forEach((r) => {
      const pintar = () => {
        const min = Number(r.min || 0);
        const max = Number(r.max || 100);
        r.style.setProperty('--p', `${((Number(r.value) - min) / (max - min || 1)) * 100}%`);
      };
      pintar();
      r.addEventListener('input', pintar);
    });
  }

  /* ---------- início ---------- */
  montarSkyline();
  montarRastros();
  montarFoneHero();
  montarMenu();
  const aoRolarTopo = montarNavegacao();
  const aoRolarComo = montarComo();
  montarDobra();
  montarCalculadora();
  montarVistoria();
  montarEventos();
  montarMotorista();
  montarDialogos();
  montarFaixas();

  let pendente = false;
  function rolar() {
    pendente = false;
    aoRolarTopo();
    aoRolarComo();
  }
  const pedirQuadro = () => { if (!pendente) { pendente = true; requestAnimationFrame(rolar); } };
  window.addEventListener('scroll', pedirQuadro, { passive: true });
  window.addEventListener('resize', pedirQuadro);
  rolar();
}());
