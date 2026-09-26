/* Drink — navegação, comanda, cena da bike, tour do app e calculadoras.
   É um protótipo: preços, motoristas e prazos são exemplos. */
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

  function marcado(nome) {
    const el = $(`input[name="${nome}"]:checked`);
    return el ? el.value : '';
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

    function simular(passos) {
      trilha.hidden = false;
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
          status.textContent = 'Simulação concluída.';
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

      simular(agendado()
        ? [
          `Procurando um Drink perto de ${de}`,
          aceito,
          `${m.nome} chega de ${veiculo} às ${agendaHora.value || '--:--'}. Você recebe um aviso 10 min antes`,
        ]
        : [
          `Procurando um Drink perto de ${de}`,
          aceito,
          `A caminho de ${veiculo}, chega em ${5 + Math.floor(Math.random() * 8)} min`,
          'Chegou e conferiu o seu nome',
          'Vistoria feita com 5 fotos. Seguro ativo',
          `${dobrado} no porta-malas. Em viagem para ${para}`,
          'Entregue. Carro estacionado e chave na sua mão',
        ]);
    });
    atualizar();
  }

  /* ---------- bike ou patinete ---------- */
  const FICHAS = {
    bike: {
      titulo: 'Bike elétrica dobrável',
      texto: 'Rodas pequenas, quadro que dobra ao meio e guidão que abaixa. Vai longe e sobe ladeira sem esforço.',
      dados: [
        ['Melhor para', 'Distâncias maiores e bairros com subida'],
        ['Porta-malas', 'Médio ou grande'],
        ['Dobra', 'O quadro dobra ao meio e o guidão abaixa'],
        ['No carro', 'Vai em pé ou deitada sobre a capa protetora'],
      ],
    },
    patinete: {
      titulo: 'Patinete elétrico',
      texto: 'Leve e compacto. Dobra na base do guidão e cabe em quase qualquer porta-malas.',
      dados: [
        ['Melhor para', 'Trechos curtos e regiões planas'],
        ['Porta-malas', 'Qualquer um, até hatch pequeno'],
        ['Dobra', 'O guidão deita sobre a base'],
        ['No carro', 'Vai deitado sobre a capa protetora'],
      ],
    },
  };

  const CABE = {
    bike: {
      hatch: ['Cabe com o banco rebatido', 'A bike dobrada é maior que o patinete. Em hatch, o motorista rebate metade do banco traseiro.'],
      seda: ['Cabe, mas justo', 'Em sedã pequeno pode não caber. Nesse caso o app manda um Drink de patinete.'],
      suv: ['Cabe com folga', 'A bike dobrada vai em pé no porta-malas e ainda sobra espaço.'],
      picape: ['Cabe', 'A bike vai na caçamba, presa com cinta.'],
      esportivo: ['Não cabe, mas tem jeito', 'O Drink vai até você sem a bike e o app paga a volta dele.'],
    },
    patinete: {
      hatch: ['Cabe', 'Com o patinete dobrado, deitado no porta-malas.'],
      seda: ['Cabe', 'O patinete dobrado vai deitado no porta-malas.'],
      suv: ['Cabe com folga', 'O patinete vai no porta-malas e sobra bastante espaço.'],
      picape: ['Cabe', 'O patinete vai na caçamba, preso com cinta.'],
      esportivo: ['Cabe, às vezes', 'Em porta-malas muito pequeno, o Drink vai sem o patinete e o app paga a volta dele.'],
    },
  };

  function montarCena() {
    const cena = $('#cena');
    const botao = $('#btn-dobrar');
    const msg = $('#cena-msg');
    const grupos = { bike: $('#v-bike'), patinete: $('#v-pat') };
    const tipos = $$('#tipos .chip');
    let veiculo = 'bike';
    let tipo = 'suv';

    function mostrarEstado() {
      const guardado = cena.classList.contains('guardado');
      msg.textContent = !guardado ? '' : (veiculo === 'bike' ? 'Bike dobrada e guardada.' : 'Patinete dobrado e guardado.');
      botao.textContent = guardado ? 'Tirar do porta-malas' : 'Dobrar e guardar';
      botao.setAttribute('aria-pressed', String(guardado));
    }

    function mostrarCabe() {
      const [titulo, texto] = CABE[veiculo][tipo];
      $('#cabe-veic').textContent = veiculo === 'bike' ? 'Com bike elétrica' : 'Com patinete';
      $('#cabe-tit').textContent = titulo;
      $('#cabe-txt').textContent = texto;
    }

    function trocar(v) {
      veiculo = v;
      cena.classList.remove('guardado');
      // grupos de SVG não têm a propriedade .hidden, só o atributo
      Object.entries(grupos).forEach(([nome, g]) => g.toggleAttribute('hidden', nome !== v));
      const f = FICHAS[v];
      $('#ficha').innerHTML = `<h3>${esc(f.titulo)}</h3><p>${esc(f.texto)}</p>
        <dl>${f.dados.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join('')}</dl>`;
      mostrarEstado();
      mostrarCabe();
    }

    $$('input[name="cena-v"]').forEach((r) => r.addEventListener('change', () => trocar(r.value)));
    botao.addEventListener('click', () => {
      cena.classList.toggle('guardado');
      mostrarEstado();
    });
    tipos.forEach((b) => b.addEventListener('click', () => {
      tipos.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      tipo = b.dataset.tipo;
      mostrarCabe();
    }));
    trocar('bike');
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

  /* ---------- vistoria ---------- */
  function montarVistoria() {
    const fotos = $$('[data-foto]');

    function atualizar() {
      const n = fotos.filter((f) => f.getAttribute('aria-pressed') === 'true').length;
      $('#vist-barra').style.width = `${(n / fotos.length) * 100}%`;
      $('#vist-res').textContent = n === fotos.length
        ? 'Vistoria completa. Seguro ativado.'
        : `${n} de ${fotos.length} fotos`;
    }

    fotos.forEach((f) => {
      f.setAttribute('aria-pressed', 'false');
      f.addEventListener('click', () => {
        f.setAttribute('aria-pressed', String(f.getAttribute('aria-pressed') !== 'true'));
        atualizar();
      });
    });
    atualizar();
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

  /* ---------- seja um Drink ---------- */
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
      $('#m-ganho').textContent = brl0(bruto - aluguel);
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

  /* ---------- navegação ---------- */
  const TITULOS = {
    inicio: 'Drink',
    'como-funciona': 'Como funciona · Drink',
    seguranca: 'Segurança · Drink',
    eventos: 'Eventos · Drink',
    motorista: 'Seja um Drink',
  };
  let telaAtual = null;

  function rota() {
    let id = 'inicio';
    try { id = decodeURIComponent(location.hash.slice(1)) || 'inicio'; } catch (e) { /* hash malformado */ }
    let view = $$('[data-view]').find((v) => v.dataset.view === id);
    if (!view) {
      if (telaAtual) return; // âncora comum (ex.: pular para o conteúdo), não é uma tela
      id = 'inicio';
      view = $('[data-view="inicio"]');
    }
    if (id === telaAtual) return;
    const primeira = telaAtual === null;
    telaAtual = id;

    $$('[data-view]').forEach((v) => { v.hidden = v !== view; });
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITULOS[id] || 'Drink';

    if (!primeira) {
      window.scrollTo(0, 0);
      const h1 = $('h1', view);
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  /* ---------- início ---------- */
  montarComanda();
  montarCena();
  montarTour();
  montarVistoria();
  montarEventos();
  montarMotorista();
  montarDialogos();
  window.addEventListener('hashchange', rota);
  rota();
})();
