/* Drink — página única: comanda, história que anda com a rolagem, tour do app,
   vistoria, calculadoras e navegação. É um protótipo: preços, motoristas e prazos são exemplos. */
(function () {
  'use strict';

  /* ---------- utilidades ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const reduzirMovimento = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl0 = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const num = (v) => Number(v.toFixed(1));

  function marcado(nome) {
    const el = $(`input[name="${nome}"]:checked`);
    return el ? el.value : '';
  }

  // sorteio com semente: o cenário sai sempre igual
  function semente(n) {
    return function () {
      n = (n + 0x6D2B79F5) | 0;
      let t = Math.imul(n ^ (n >>> 15), 1 | n);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // reinicia uma animação de CSS feita por classe
  function repetir(el, classe) {
    el.classList.remove(classe);
    void el.offsetWidth;
    el.classList.add(classe);
  }

  /* ---------- preço (valores de exemplo) ---------- */
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

  /* ---------- comanda ---------- */
  const MOTORISTAS = [
    { nome: 'Rafael S.', nota: '4,9', cnh: 9 },
    { nome: 'Camila R.', nota: '5,0', cnh: 12 },
    { nome: 'Diego M.', nota: '4,8', cnh: 6 },
    { nome: 'Juliana P.', nota: '4,9', cnh: 15 },
  ];

  function montarComanda() {
    const form = $('#comanda');
    const km = $('#c-km');
    const agenda = $('#agenda');
    const agendaHora = $('#c-agenda');
    const itens = $('#itens');
    const trilha = $('#trilha');
    const status = $('#c-status');
    const pedir = $('#c-pedir');
    const carimbo = $('#c-carimbo');
    let timer = null;
    let emAndamento = false;

    $('#c-num').textContent = String(1000 + Math.floor(Math.random() * 9000));

    const agendado = () => marcado('quando') === 'agendar';
    // "Agora" usa o relógio de quem está vendo; "Agendar" usa o horário escolhido
    const horaDoPedido = () => (agendado() ? agendaHora.value : hhmm(new Date()));

    function item(nome, valor, gratis) {
      return `<li${gratis ? ' class="gratis"' : ''}><span>${esc(nome)}</span><span class="pts"></span><b>${esc(valor)}</b></li>`;
    }

    function atualizar() {
      const k = Number(km.value);
      $('#c-km-out').textContent = `${k} km`;
      agenda.hidden = !agendado();
      const p = precoDaViagem(k, horaDoPedido());
      let html = item('1x Drink (saída)', brl(p.saida)) + item(`${k} km rodados`, brl(p.rodado));
      if (p.adicional) html += item('Madrugada +20%', brl(p.adicional));
      if (agendado()) html += item(`Agendado para ${agendaHora.value || '--:--'}`, 'grátis', true);
      html += item('Seguro da viagem', 'grátis', true);
      itens.innerHTML = html;
      $('#c-total').textContent = brl(p.total);
    }

    function simular(passos, fim) {
      trilha.hidden = false;
      trilha.innerHTML = passos.map((p) => `<li>${esc(p)}</li>`).join('');
      form.classList.remove('carimbada');
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
          status.textContent = 'Simulação concluída.';
          carimbo.textContent = fim;
          form.classList.add('carimbada');
          return;
        }
        status.textContent = passos[i];
        i += 1;
        timer = setTimeout(passo, reduzirMovimento ? 150 : 1300);
      }());
    }

    form.addEventListener('input', atualizar);
    form.addEventListener('change', atualizar);
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
        ], 'Agendado');
      } else {
        simular([
          `Procurando um Drink perto de ${de}`,
          aceito,
          `A caminho de ${veiculo}, chega em ${5 + Math.floor(Math.random() * 8)} min`,
          'Chegou e conferiu o seu nome',
          'Vistoria feita com 5 fotos. Seguro ativo',
          `${dobrado} no porta-malas. Em viagem para ${para}`,
          'Entregue. Carro estacionado e chave na sua mão',
        ], 'Entregue');
      }
    });
    atualizar();
  }

  /* ---------- cenário da história (gerado com semente) ---------- */
  function montarCenario() {
    const rnd = semente(7);
    let h = '';

    // estrelas
    for (let i = 0; i < 80; i++) {
      h += `<circle cx="${num(rnd() * 1200)}" cy="${num(rnd() * 250)}" r="${(0.6 + rnd() * 1.2).toFixed(2)}" opacity="${(0.25 + rnd() * 0.65).toFixed(2)}"/>`;
    }
    $('#c-estrelas').innerHTML = h;

    // prédios ao longe, com janelas acesas aqui e ali
    h = '';
    for (let x = -120; x < 2140;) {
      const w = Math.round(60 + rnd() * 90);
      const alt = Math.round(110 + rnd() * 170);
      const topo = 430 - alt;
      h += `<rect x="${x}" y="${topo}" width="${w}" height="${alt}" fill="#0D221D"/>`;
      if (rnd() < 0.25) h += `<path d="M${x + w / 2} ${topo}v-${Math.round(14 + rnd() * 20)}" stroke="#0D221D" stroke-width="3"/>`;
      for (let wy = topo + 14; wy < 418; wy += 18) {
        for (let wx = x + 10; wx < x + w - 14; wx += 14) {
          if (rnd() < 0.15) h += `<rect x="${wx}" y="${wy}" width="6" height="9" fill="#FFD27A" opacity="${(0.22 + rnd() * 0.36).toFixed(2)}"/>`;
        }
      }
      x += w + Math.round(4 + rnd() * 14);
    }
    $('#c-longe').innerHTML = h;

    // árvores e prédios médios
    h = '';
    for (let x = -80; x < 2900;) {
      if (rnd() < 0.55) {
        const r = Math.round(26 + rnd() * 20);
        const cx = x + r;
        h += `<rect x="${cx - 4}" y="360" width="8" height="70" fill="#0C211C"/>`
          + `<circle cx="${cx}" cy="350" r="${r}" fill="#0F2E26"/>`
          + `<circle cx="${num(cx - r * 0.6)}" cy="364" r="${num(r * 0.7)}" fill="#12352C"/>`
          + `<circle cx="${num(cx + r * 0.6)}" cy="360" r="${num(r * 0.75)}" fill="#0E2A23"/>`;
        x += r * 2 + Math.round(30 + rnd() * 60);
      } else {
        const w = Math.round(90 + rnd() * 80);
        const alt = Math.round(150 + rnd() * 120);
        h += `<rect x="${x}" y="${430 - alt}" width="${w}" height="${alt}" fill="#10281F"/>`;
        for (let wy = 430 - alt + 16; wy < 410; wy += 26) {
          for (let wx = x + 12; wx < x + w - 20; wx += 22) {
            if (rnd() < 0.2) h += `<rect x="${wx}" y="${wy}" width="10" height="14" fill="#FFD27A" opacity="${(0.25 + rnd() * 0.3).toFixed(2)}"/>`;
          }
        }
        x += w + Math.round(20 + rnd() * 40);
      }
    }
    $('#c-meio').innerHTML = h;

    // fachadas do caminho entre o bar e a casa
    h = '';
    const cores = ['#16362F', '#1A3D35', '#14302A', '#1B3A33'];
    for (let x = 1180; x < 2890;) {
      const w = Math.round(190 + rnd() * 170);
      const topo = Math.round(150 + rnd() * 110);
      h += `<rect x="${x}" y="${topo}" width="${w}" height="${432 - topo}" fill="${cores[Math.floor(rnd() * cores.length)]}"/>`
        + `<rect x="${x - 6}" y="${topo - 8}" width="${w + 12}" height="10" fill="#1F463D"/>`;
      for (let wy = topo + 22; wy < 290; wy += 52) {
        for (let wx = x + 22; wx + 54 < x + w; wx += 70) {
          const acesa = rnd() < 0.35;
          h += acesa
            ? `<rect x="${wx}" y="${wy}" width="44" height="32" rx="2" fill="#FFD27A" opacity="${(0.38 + rnd() * 0.25).toFixed(2)}"/>`
            : `<rect x="${wx}" y="${wy}" width="44" height="32" rx="2" fill="#0B1C18"/>`;
        }
      }
      const lx = x + 18;
      const lw = w - 36;
      if (rnd() < 0.5) {
        const riscos = Array.from({ length: 8 }, (_, i) => `M${lx} ${342 + i * 12}H${lx + lw}`).join('');
        h += `<rect x="${lx}" y="330" width="${lw}" height="102" fill="#0E221D"/><path d="${riscos}" stroke="#18332C" stroke-width="3"/>`;
      } else {
        h += `<rect x="${lx}" y="316" width="${lw}" height="12" fill="${rnd() < 0.5 ? '#FF7A33' : '#2B5E50'}"/>`
          + `<rect x="${lx}" y="332" width="${lw}" height="100" fill="url(#c-g-vitrine)" opacity=".5"/>`;
      }
      x += w + Math.round(10 + rnd() * 40);
    }
    $('#c-fachadas').innerHTML = h;
  }

  /* ---------- a história que anda com a rolagem ---------- */
  function montarHistoria() {
    const trilho = $('#trilho');
    const palco = $('#palco');
    const passos = $$('#historia-passos li').map((li) => ({ t: $('strong', li).textContent, d: $('span', li).textContent }));
    const N = passos.length;
    const pontos = $$('#leg-pontos button');
    const legenda = $('#leg-txt');
    const barra = $('#leg-barra');
    let atual = -1;

    function mostrar(n) {
      if (n === atual) return;
      atual = n;
      palco.dataset.passo = String(n);
      for (let i = 1; i <= N; i++) palco.classList.toggle(`ja${i}`, n >= i);
      const idx = Math.max(1, n) - 1;
      $('#leg-n').textContent = String(idx + 1).padStart(2, '0');
      $('#leg-t').textContent = passos[idx].t;
      $('#leg-d').textContent = passos[idx].d;
      repetir(legenda, 'troca');
      pontos.forEach((b, i) => {
        if (i === idx) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }

    function medir() {
      const r = trilho.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      return { r, total, p: Math.min(1, Math.max(0, -r.top / total)) };
    }

    function aoRolar() {
      const { r, p } = medir();
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
      barra.style.transform = `scaleX(${p.toFixed(4)})`;
      // passo 0: o palco ainda está entrando na tela; a bike espera fora de cena
      mostrar(r.top > 1 ? 0 : Math.min(N, Math.floor(p * N) + 1));
    }

    pontos.forEach((b) => b.addEventListener('click', () => {
      const { r, total } = medir();
      const topo = window.scrollY + r.top;
      window.scrollTo({ top: topo + total * ((Number(b.dataset.irPasso) - 0.5) / N), behavior: reduzirMovimento ? 'auto' : 'smooth' });
    }));
    $$('input[name="hist-veic"]').forEach((r) => r.addEventListener('change', () => { palco.dataset.veic = r.value; }));
    mostrar(0);
    return aoRolar;
  }

  /* ---------- tour do app ---------- */
  function montarTour() {
    const fone = $('#fone');
    const passos = $$('.tour-passo');
    const telas = $$('.tela', fone);
    const [voltar, avancar] = $$('.tour-seta');
    const aviso = $('#tour-aviso');
    let passo = 0;

    function mostrar(n, anunciar) {
      const novo = Math.max(0, Math.min(passos.length - 1, n));
      if (novo !== passo) fone.dataset.dir = novo > passo ? '1' : '-1';
      passo = novo;

      passos.forEach((b, i) => {
        if (i === passo) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      telas.forEach((t, i) => { t.hidden = i !== passo; });
      $('#fone-hora').textContent = telas[passo].dataset.hora;

      const titulo = $('.tp-txt strong', passos[passo]).textContent;
      const texto = $('.tp-txt > span', passos[passo]).textContent;
      $('#tour-n').textContent = `${passo + 1} de ${passos.length}`;
      $('#tour-t').textContent = titulo;
      $('#tour-d').textContent = texto;
      voltar.setAttribute('aria-disabled', String(passo === 0));
      avancar.setAttribute('aria-disabled', String(passo === passos.length - 1));
      if (anunciar) aviso.textContent = `Passo ${passo + 1} de ${passos.length}: ${titulo}. ${texto}`;
    }

    passos.forEach((b, i) => b.addEventListener('click', () => mostrar(i, true)));
    [voltar, avancar].forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') !== 'true') mostrar(passo + Number(b.dataset.ir), true);
    }));

    // deslizar o dedo sobre o celular troca de tela
    let x0 = null;
    let y0 = 0;
    fone.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
    fone.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) mostrar(passo + (dx < 0 ? 1 : -1), true);
    });
    fone.addEventListener('pointercancel', () => { x0 = null; });

    mostrar(0, false);
  }

  /* ---------- vistoria com polaroides ---------- */
  const LADOS = { frente: 'Frente', traseira: 'Traseira', esquerda: 'Esquerda', direita: 'Direita', painel: 'Painel' };
  const DESTAQUE = {
    frente: '<rect x="12" y="-2" width="96" height="48" rx="12"/>',
    traseira: '<rect x="12" y="154" width="96" height="48" rx="12"/>',
    esquerda: '<rect x="-2" y="28" width="38" height="144" rx="12"/>',
    direita: '<rect x="84" y="28" width="38" height="144" rx="12"/>',
    painel: '<rect x="26" y="50" width="68" height="44" rx="10"/>',
  };

  function montarVistoria() {
    const carro = $('#vist-carro');
    const fotos = $$('[data-foto]', carro);
    const lista = $('#polaroides');
    const res = $('#vist-res');
    const carimbo = $('#vist-carimbo');
    const refazer = $('#vist-refazer');
    const tiradas = [];

    function desenhar(nova) {
      lista.innerHTML = Object.keys(LADOS).map((_, i) => {
        const lado = tiradas[i];
        if (!lado) return `<li>${i + 1}</li>`;
        const giro = ((i * 37) % 7) - 3;
        return `<li class="tirada${lado === nova ? ' nova' : ''}" style="--r:${giro}deg">`
          + `<svg viewBox="-20 -12 160 224" aria-hidden="true"><use href="#s-carro-topo" width="120" height="200"/><g fill="#FF7A33" opacity=".55">${DESTAQUE[lado]}</g></svg>`
          + `<span>${LADOS[lado]}</span></li>`;
      }).join('');
      const n = tiradas.length;
      res.textContent = n === 5 ? 'Vistoria completa. Seguro ativado.' : `${n} de 5 fotos`;
      carimbo.classList.toggle('batido', n === 5);
      refazer.hidden = n === 0;
    }

    fotos.forEach((f) => {
      f.setAttribute('aria-pressed', 'false');
      f.addEventListener('click', () => {
        const lado = f.dataset.foto;
        const i = tiradas.indexOf(lado);
        if (i >= 0) {
          tiradas.splice(i, 1);
          f.setAttribute('aria-pressed', 'false');
          desenhar();
        } else {
          tiradas.push(lado);
          f.setAttribute('aria-pressed', 'true');
          if (!reduzirMovimento) repetir(carro, 'clarao');
          desenhar(lado);
        }
      });
    });
    refazer.addEventListener('click', () => {
      tiradas.length = 0;
      fotos.forEach((f) => f.setAttribute('aria-pressed', 'false'));
      desenhar();
    });
    desenhar();
  }

  /* ---------- números que contam ao aparecer ---------- */
  function montarNumeros() {
    const alvos = $$('[data-conta]');
    if (reduzirMovimento || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const fim = Number(e.target.dataset.conta);
      const t0 = performance.now();
      (function passo(t) {
        const k = Math.min(1, (t - t0) / 900);
        e.target.textContent = String(Math.round(fim * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(passo);
      }(t0));
    }), { threshold: 0.6 });
    alvos.forEach((el) => io.observe(el));
  }

  /* ---------- varal de luzes dos eventos ---------- */
  function montarVaral() {
    const varal = $('#varal');
    const curvas = [[[-20, 24], [300, 132], [620, 30]], [[620, 30], [940, 132], [1220, 24]]];
    let h = '';
    let i = 0;
    curvas.forEach(([a, c, b]) => {
      for (let k = 1; k <= 8; k++) {
        const t = k / 9;
        const u = 1 - t;
        const x = num(u * u * a[0] + 2 * u * t * c[0] + t * t * b[0]);
        const y = num(u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]);
        h += `<g class="lampada" style="--i:${i++}">`
          + `<circle class="brilho" cx="${x}" cy="${num(y + 16)}" r="28" fill="url(#e-g-luz)"/>`
          + `<rect x="${num(x - 3)}" y="${num(y - 1)}" width="6" height="8" rx="1" fill="#2B4A42"/>`
          + `<ellipse class="bulbo" cx="${x}" cy="${num(y + 13)}" rx="5.5" ry="7.5"/></g>`;
      }
    });
    $('#varal-lampadas').innerHTML = h;
    if (reduzirMovimento || !('IntersectionObserver' in window)) {
      varal.classList.add('acesa');
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        varal.classList.add('acesa');
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(varal);
  }

  /* ---------- QR code de enfeite no cavalete da mesa ---------- */
  function montarQR() {
    const rnd = semente(3);
    const quadro = (x, y) => `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    let h = quadro(0, 0) + quadro(18, 0) + quadro(0, 18);
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        const noCanto = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
        if (!noCanto && rnd() < 0.48) h += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
    $('#qr').innerHTML = `<g fill="#1D1A14">${h}</g>`;
  }

  /* ---------- eventos ---------- */
  function montarEventos() {
    const tipos = $$('#ev-tipos .chip');
    const convidados = $('#ev-conv');
    let taxa = 0.35; // parte dos convidados que foi de carro e vai precisar de um Drink

    function calcular() {
      const c = Number(convidados.value);
      const carros = Math.max(1, Math.round((c * taxa) / 2.2));
      const n = Math.ceil(carros / 3);
      $('#ev-conv-out').textContent = c;
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

  /* ---------- navegação: topo, seção atual e paralaxe do bar ---------- */
  function montarNavegacao() {
    const topo = $('#topo');
    const links = $$('[data-aba]');
    const hero = $('.hero');
    const fundo = $('.hero-fundo');

    function marcar(aba) {
      links.forEach((a) => {
        if (a.dataset.aba === aba) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
        if (e.isIntersecting) marcar(e.target.dataset.secao);
      }), { rootMargin: '-45% 0px -50% 0px' });
      $$('[data-secao]').forEach((s) => io.observe(s));
    }

    return function (y) {
      topo.classList.toggle('solido', y > 8);
      // o fundo do bar (luminárias e prateleira) anda mais devagar que a página
      if (!reduzirMovimento && y < hero.offsetHeight) fundo.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0)`;
    };
  }

  /* ---------- início ---------- */
  montarComanda();
  montarCenario();
  const historiaAoRolar = montarHistoria();
  montarTour();
  montarVistoria();
  montarNumeros();
  montarVaral();
  montarQR();
  montarEventos();
  montarMotorista();
  montarDialogos();
  const navegacaoAoRolar = montarNavegacao();

  let pedido = false;
  function aoRolar() {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(() => {
      pedido = false;
      const y = window.scrollY;
      navegacaoAoRolar(y);
      historiaAoRolar();
    });
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);
  aoRolar();
})();
