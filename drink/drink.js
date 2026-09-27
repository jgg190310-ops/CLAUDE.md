/* Drink — o site. As telas dos apps (passageiro e motorista) ficam em app-nucleo.js.
   Animações acontecem uma vez (na chegada ou num clique) e param. */
(function () {
  'use strict';

  const {
    $, $$, reduzirMovimento, esc, brl, brl0, hhmm, hhmmss, marcado, sortear, limitar, suave, animar,
    precoDaViagem, MOTORISTAS, ETAPA_TELA, ORDEM_ETAPAS,
  } = window.Drink.util;

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

  /* ---------- letreiros, selos, lua e sol andam junto com a rolagem (parados quando ela para) ---------- */
  function montarLetreiro() {
    const trilhos = $$('.letreiro-trilho');
    const selos = $$('.selo-giro-txt');
    const lua = $('.lua');
    const final = $('.final');
    const sol = $('.sol');
    const roda = $('.rodape-gigante svg');
    if (reduzirMovimento()) return () => {};
    let meias = [];
    const medir = () => { meias = trilhos.map((t) => t.scrollWidth / 2); };
    medir();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    window.addEventListener('resize', medir);
    return function aoRolar() {
      // primeiro lê tudo, depois escreve
      const y = window.scrollY;
      const alto = window.innerHeight;
      const caixa = final && sol ? final.getBoundingClientRect() : null;
      trilhos.forEach((t, i) => {
        const meia = meias[i];
        if (!meia) return;
        const x = (y * 0.4) % meia;
        // o letreiro de volta anda para o outro lado
        t.style.transform = `translateX(${(t.classList.contains('letreiro-volta') ? x - meia : -x).toFixed(1)}px)`;
      });
      selos.forEach((s) => { s.style.transform = `rotate(${(y * 0.12).toFixed(1)}deg)`; });
      if (lua && y < alto * 1.5) lua.style.rotate = `${(y * 0.05).toFixed(2)}deg`;
      if (caixa && caixa.top < alto && caixa.bottom > 0) {
        // o sol sobe enquanto o final entra na tela
        const p = Math.min(1, Math.max(0, (alto - caixa.top) / caixa.height));
        sol.style.translate = `0 ${((1 - p) * 38).toFixed(1)}%`;
        sol.style.rotate = `${(p * 40).toFixed(1)}deg`;
      }
      if (roda) roda.style.rotate = `${(y * 0.08).toFixed(1)}deg`;
    };
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
      // barra fina no pé do topo mostra quanto da página já foi lido
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const lido = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      topo.classList.toggle('solido', window.scrollY > 8 || document.body.classList.contains('menu-aberto'));
      topo.style.setProperty('--lido', lido.toFixed(4));
    };
  }

  /* ---------- experimente o app: o app do passageiro, com as etapas ao lado e a tela cheia ---------- */
  function montarDemo() {
    const demo = $('#demo');
    if (!demo) return;
    const etapas = $$('#etapas li');
    const lista = $('#etapas');
    const splash = $('#d-splash');
    let viuAbertura = false;

    function marcarEtapa(etapa) {
      const i = ORDEM_ETAPAS.indexOf(etapa);
      etapas.forEach((li, j) => {
        li.classList.toggle('atual', j === i);
        li.classList.toggle('feita', j < i);
        const b = $('button', li);
        if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      lista.style.setProperty('--prog', `${(Math.max(0, i) / (ORDEM_ETAPAS.length - 1)) * 100}%`);
    }
    const app = window.Drink.cliente({ raiz: demo, aoIr: (nome, tela) => marcarEtapa(tela.dataset.etapa) });

    // etapas ao lado: pulam direto para aquela parte
    etapas.forEach((li) => $('button', li).addEventListener('click', () => {
      const alvo = ETAPA_TELA[li.dataset.etapa];
      if (alvo === 'inicio') app.zerar();
      app.ir(alvo);
    }));
    $('#demo-recomecar').addEventListener('click', () => { app.zerar(); app.ir('inicio'); });

    // tela cheia: no celular vira o próprio app; no computador, o aparelho no centro
    const fundo = document.createElement('div');
    fundo.className = 'app-fundo';
    fundo.hidden = true;
    document.body.appendChild(fundo);
    let voltarPara = null;
    function abrirCheia(origem) {
      voltarPara = origem || document.activeElement;
      $$('dialog[open]').forEach((d) => d.close());
      const menu = $('#menu');
      if (menu && !menu.hidden) $('#menu-btn').click();
      fundo.hidden = false;
      demo.classList.add('cheia');
      document.body.classList.add('app-aberto');
      demo.setAttribute('role', 'dialog');
      demo.setAttribute('aria-modal', 'true');
      if (!viuAbertura && !reduzirMovimento()) {
        viuAbertura = true;
        splash.hidden = false;
        splash.classList.remove('saindo');
        setTimeout(() => splash.classList.add('saindo'), 1250);
        setTimeout(() => { splash.hidden = true; }, 1650);
      }
      const t = $('.d-tela:not([hidden]) .d-titulo', demo);
      (t || $('#demo-sair')).focus({ preventScroll: true });
    }
    function fecharCheia() {
      if (!demo.classList.contains('cheia')) return;
      demo.classList.remove('cheia');
      document.body.classList.remove('app-aberto');
      demo.setAttribute('role', 'region');
      demo.removeAttribute('aria-modal');
      fundo.hidden = true;
      splash.hidden = true;
      if (voltarPara && voltarPara.focus) voltarPara.focus({ preventScroll: true });
    }
    document.addEventListener('click', (e) => {
      const gatilho = e.target.closest('[data-app-cheia]');
      if (!gatilho) return;
      e.preventDefault();
      abrirCheia(gatilho);
    });
    fundo.addEventListener('click', fecharCheia);
    demo.addEventListener('click', (e) => { if (e.target.closest('#demo-sair')) fecharCheia(); });
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return; // o Esc já fechou uma folha do app
      if (!demo.classList.contains('cheia')) return;
      if (e.key === 'Escape') { fecharCheia(); return; }
      if (e.key !== 'Tab') return;
      // mantém o foco dentro do app aberto
      const focaveis = $$('button:not([disabled])', demo).filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
      if (!focaveis.length) return;
      const primeiroEl = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroEl) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiroEl.focus(); }
    });
  }

  /* ---------- app do motorista em Seja um Drink ---------- */
  function montarAppMotorista() {
    window.Drink.motorista({ raiz: $('#mot-app') });
  }

  /* ---------- seções entram de leve quando aparecem ---------- */
  function montarRevela() {
    if (!('IntersectionObserver' in window) || reduzirMovimento()) return;
    const alvos = $$('.cab, .tile, .rec, .ev-pontos li, .mot-porque li, .pergunta, .faixa-in li, .calc, .planta, .tabela, .specs, .ev-passos li');
    document.documentElement.classList.add('js-revela');
    alvos.forEach((el) => el.classList.add('revela'));
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visto');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    alvos.forEach((el) => io.observe(el));
  }

  /* ---------- tudo pelo app: quem pede e quem dirige ---------- */
  function montarRecursos() {
    const grade = $('#rec-grade');
    if (!grade) return;
    $$('input[name="rec-lado"]').forEach((r) => r.addEventListener('change', () => {
      grade.dataset.lado = r.value;
      grade.scrollLeft = 0;
    }));
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
  montarFoneHero();
  montarMenu();
  const aoRolarTopo = montarNavegacao();
  const aoRolarLetreiro = montarLetreiro();
  montarDobra();
  montarCalculadora();
  montarVistoria();
  montarEventos();
  montarMotorista();
  montarDialogos();
  montarFaixas();
  montarDemo();
  montarRecursos();
  montarAppMotorista();
  montarRevela();

  let pendente = false;
  function rolar() {
    pendente = false;
    aoRolarTopo();
    aoRolarLetreiro();
  }
  const pedirQuadro = () => { if (!pendente) { pendente = true; requestAnimationFrame(rolar); } };
  window.addEventListener('scroll', pedirQuadro, { passive: true });
  window.addEventListener('resize', pedirQuadro);
  rolar();
}());
