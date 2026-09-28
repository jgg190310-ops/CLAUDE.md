/* Drink — o núcleo dos apps: o app do passageiro e o app do motorista.
   Usado pelo protótipo dentro do site (drink.js) e pelo app de verdade (app/app.js).
   Tudo roda no aparelho; nada é enviado. Animações acontecem uma vez e param. */
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
  // espera: os primeiros 10 min depois que o motorista chega são grátis; depois, R$ 5 a cada 10 min começados
  const PRECO = { saida: 25, km: 3.5, madrugada: 0.2, espera: 5, esperaGratis: 10, esperaBloco: 10 };

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
  function taxaEspera(ms) {
    const min = Math.max(0, Number(ms) || 0) / 60000;
    if (min <= PRECO.esperaGratis) return 0;
    return Math.ceil((min - PRECO.esperaGratis) / PRECO.esperaBloco) * PRECO.espera;
  }


  /* ---------- experimente o app: o app do cliente, com abas ---------- */
  const DESTINOS = {
    casa: { nome: 'Casa', bairro: 'Buritis', km: 9, rota: 'M140 170L60 250V292', fim: [60, 292], rotulo: '', rua: 'Av. Raja Gabaglia' },
    trabalho: { nome: 'Trabalho', bairro: 'Funcionários', km: 3, rota: 'M140 170L210 240H250', fim: [250, 240], rotulo: '', rua: 'Av. Getúlio Vargas' },
    bia: { nome: 'Casa da Bia', bairro: 'Sion', km: 6, rota: 'M140 170V292', fim: [140, 292], rotulo: 'SION', rua: 'Av. Uruguai' },
    pampulha: { nome: 'Orla da Pampulha', bairro: 'Pampulha', km: 14, rota: 'M140 170V26', fim: [140, 26], rotulo: 'PAMPULHA', rua: 'Av. Antônio Carlos' },
  };
  const VEICULOS = { qualquer: 'Tanto faz', bike: 'Bike', patinete: 'Patinete' };
  const ETAPA_TELA = { pedir: 'inicio', caminho: 'caminho', vistoria: 'vistoria', malas: 'malas', viagem: 'viagem', casa: 'casa' };
  const ORDEM_ETAPAS = ['pedir', 'caminho', 'vistoria', 'malas', 'viagem', 'casa'];
  const CUPOM = 10;
  const RESPOSTAS = {
    porta: 'Perfeito! Te encontro aí na porta.',
    espera: 'Combinado, já estou pedalando.',
    carro: 'Anotado: Onix prata. Levo a capa para o porta-malas.',
  };
  const TAGS = {
    boas: ['Pontual', 'Cuidou do carro', 'Dirigiu com calma', 'Simpático'],
    ruins: ['Atrasou', 'Dirigiu rápido', 'Pouco cuidado com o carro', 'Outro motivo'],
  };
  const HISTORICO = [
    { rota: 'Lourdes → Sion', data: 'Sáb, 13 set', km: 5, motorista: 'Camila R.', pag: 'Pix', gorjeta: 5 },
    { rota: 'Funcionários → Buritis', data: 'Sex, 5 set', km: 8, motorista: 'Diego M.', pag: 'Cartão •••• 4821', gorjeta: 0 },
    { rota: 'Savassi → Buritis', data: 'Sex, 29 ago', km: 9, motorista: 'Rafael S.', pag: 'Pix', gorjeta: 0 },
  ].map((v) => {
    const p = precoDaViagem(v.km, '22:00');
    return { ...v, saida: p.saida, rodado: p.rodado, adicional: 0, desconto: 0, total: p.total + v.gorjeta };
  });

  const MOTORISTAS = [
    { nome: 'Rafael S.', nota: '4,9', cnh: 9 },
    { nome: 'Camila R.', nota: '5,0', cnh: 12 },
    { nome: 'Diego M.', nota: '4,8', cnh: 6 },
    { nome: 'Juliana P.', nota: '4,9', cnh: 15 },
  ];

  /* app do passageiro. Opções: raiz (o elemento com as telas), usuario() com { nome, sobrenome },
     conta (dados salvos no aparelho), aoIr(nome, tela) depois de cada troca de tela,
     aoMudar(conta) quando carteira, histórico, contatos ou ajustes mudam e acoes extras para data-acao */
  function cliente(op = {}) {
    const demo = op.raiz;
    if (!demo) return null;
    const telas = $$('.d-tela', demo);
    const abas = $('#d-abas');
    const veu = $('#d-veu');
    const toast = $('#d-toast');
    const usuario = op.usuario || (() => ({ nome: 'Júlia', sobrenome: 'Andrade' }));
    // o que dura a sessão inteira (ou fica salvo no aparelho): carteira, histórico, contatos e ajustes
    const conta = Object.assign({
      creditos: CUPOM, pag: 'Pix', historico: HISTORICO.slice(),
      contatos: { Ana: true, Pedro: false, 'Mãe': false },
      ajustes: { avisar: true, sempre: false, codigo: true },
    }, op.conta || {});
    const mudou = () => { if (op.aoMudar) op.aoMudar(conta); };
    const est = {};
    let timers = [];
    let paradas = [];
    let timerToast = 0;
    let folha = null;
    let atual = '';

    function zerar() {
      Object.assign(est, {
        destino: 'casa', quando: 'agora', hora: '01:30', veic: 'qualquer', cambio: 'Automático', cupom: false,
        motorista: MOTORISTAS[0], veiculo: 'bike', fotos: new Set(), nota: 0, tags: new Set(), gorjeta: 0,
        chegada: '', codigo: '4821', conversa: [], respondidas: new Set(), novaMsg: false,
      });
    }
    const esperar = (ms, fn) => { timers.push(setTimeout(fn, reduzirMovimento() ? Math.min(ms, 120) : ms)); };
    function limpar() {
      timers.forEach(clearTimeout);
      timers = [];
      paradas.forEach((parar) => parar());
      paradas = [];
    }
    const agora = () => hhmm(new Date());
    const primeiro = () => est.motorista.nome.split(' ')[0];
    const ela = () => /^(Camila|Juliana)/.test(est.motorista.nome);
    const iniciais = (nome) => nome.replace(/\./g, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const destino = () => DESTINOS[est.destino];
    const nomeVeiculo = () => (est.veiculo === 'patinete' ? 'patinete' : 'bike');
    function preco() {
      const p = precoDaViagem(destino().km, est.quando === 'agendar' ? est.hora : agora());
      const desconto = est.cupom ? Math.min(conta.creditos, p.total) : 0;
      return { ...p, desconto, final: p.total - desconto };
    }

    function aviso(texto) {
      $('#d-toast-txt').textContent = texto;
      toast.hidden = false;
      clearTimeout(timerToast);
      timerToast = setTimeout(() => { toast.hidden = true; }, 3000);
    }

    // quem usa o app: saudação, perfil e o oi do motorista
    const primeiroUsuario = () => String(usuario().nome || 'você').trim().split(' ')[0];
    function preencherUsuario() {
      const u = usuario();
      const nome = [u.nome, u.sobrenome].filter(Boolean).join(' ').trim();
      $$('[data-usuario="primeiro"]', demo).forEach((el) => { el.textContent = primeiroUsuario(); });
      $$('[data-usuario="nome"]', demo).forEach((el) => { el.textContent = nome; });
      $$('[data-usuario="iniciais"]', demo).forEach((el) => { el.textContent = iniciais(nome); });
    }

    /* folhas que sobem por cima da tela (conversa, compartilhar, ajuda, recibo) */
    function abrirFolha(id) {
      fecharFolha(false);
      folha = $(`#${id}`, demo);
      veu.hidden = false;
      folha.hidden = false;
      if (id === 'd-chat') { est.novaMsg = false; $('#d-nova-msg').hidden = true; desenharConversa(); }
      if (id === 'd-compartilhar') desenharContatos();
      const t = $('h4', folha);
      if (t) t.focus({ preventScroll: true });
    }
    function fecharFolha(foco = true) {
      if (!folha) return;
      const aberta = folha;
      folha.hidden = true;
      veu.hidden = true;
      folha = null;
      if (foco) {
        const origem = $(`[data-folha="${aberta.id}"]`, $('.d-tela:not([hidden])', demo) || demo);
        if (origem) origem.focus({ preventScroll: true });
      }
    }

    function ir(nome, foco = true) {
      limpar();
      fecharFolha(false);
      const tela = telas.find((t) => t.dataset.d === nome);
      telas.forEach((t) => {
        t.hidden = t !== tela;
        t.classList.remove('entrando');
      });
      if (!reduzirMovimento()) { void tela.offsetWidth; tela.classList.add('entrando'); }
      $$('.d-hora', tela).forEach((h) => { h.textContent = agora(); });
      const aba = tela.dataset.aba;
      abas.hidden = !aba;
      $$('button', abas).forEach((b) => { if (b.dataset.aba === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      atual = nome;
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) {
        const t = $('.d-titulo', tela);
        if (t) t.focus({ preventScroll: true });
      }
      if (op.aoIr) op.aoIr(nome, tela);
    }

    function preencherMotorista() {
      const m = est.motorista;
      $$('[data-mot="nome"]', demo).forEach((el) => { el.textContent = m.nome; });
      $$('[data-mot="primeiro"]', demo).forEach((el) => { el.textContent = primeiro(); });
      $$('[data-mot="iniciais"]', demo).forEach((el) => { el.textContent = iniciais(m.nome); });
      $$('[data-mot="info"]', demo).forEach((el) => { el.textContent = `${m.nota} · CNH há ${m.cnh} anos`; });
      $$('[data-mot="veiculo"]', demo).forEach((el) => { el.textContent = est.veiculo === 'patinete' ? 'o patinete' : 'a bike'; });
      $$('use[data-mot="veic"]', demo).forEach((el) => el.setAttribute('href', est.veiculo === 'patinete' ? '#i-patinete' : '#i-bike'));
    }

    function desenharRota(rota, fim, rotulo) {
      const d = destino();
      rota.forEach((r) => r.setAttribute('d', d.rota));
      fim.setAttribute('transform', `translate(${d.fim[0]} ${d.fim[1]})`);
      rotulo.textContent = d.rotulo;
      rotulo.setAttribute('x', d.fim[0] + 13);
      rotulo.setAttribute('y', d.fim[1] + 3);
    }

    function atualizarOpcoes() {
      const d = destino();
      const p = preco();
      $('#d-dest-t').textContent = `${d.nome} · ${d.bairro}`;
      const chega = est.veic === 'qualquer' ? 'bike ou patinete' : (est.veic === 'bike' ? 'bike elétrica' : 'patinete');
      $('#d-chega').textContent = est.quando === 'agendar' ? `${chega} · às ${est.hora}` : `${chega} · 6 min`;
      $('#d-preco').textContent = brl(p.final);
      const antes = $('#d-preco-antes');
      antes.hidden = !p.desconto;
      antes.textContent = brl(p.total);
      $('#d-band').hidden = !p.adicional;
      const acao = est.quando === 'agendar' ? `Agendar para ${est.hora}` : 'Pedir Drink';
      $('#d-pedir').textContent = `${acao} · ${brl(p.final)}`;
      $$('[data-quando]', demo).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.quando === est.quando)));
      $('#d-horas').hidden = est.quando !== 'agendar';
      $$('[data-hora]', demo).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.hora === est.hora)));
      $('#d-veic').textContent = VEICULOS[est.veic];
      $('#d-cambio').textContent = est.cambio;
      $('#d-pag').textContent = conta.pag;
      const cupom = $('#d-cupom');
      cupom.disabled = conta.creditos <= 0;
      cupom.setAttribute('aria-pressed', String(est.cupom));
      cupom.textContent = conta.creditos <= 0 ? 'Já usado' : (est.cupom ? `PRIMEIRADRINK −${brl0(CUPOM)}` : `Usar ${brl0(CUPOM)}`);
      desenharRota([$('#d-rota-prev')], $('#d-fim-prev'), $('#d-rot-prev'));
    }

    function atualizarFotos() {
      const n = est.fotos.size;
      $$('.d-foto', demo).forEach((b) => b.setAttribute('aria-pressed', String(est.fotos.has(b.dataset.foto))));
      $$('.d-miniaturas li', demo).forEach((li) => li.classList.toggle('on', est.fotos.has(li.dataset.foto)));
      $('#d-vist-barra').style.width = `${n * 20}%`;
      const bt = $('#d-malas-bt');
      bt.disabled = n < 5;
      bt.textContent = n < 5 ? `${n} de 5 fotos` : `Guardar ${est.veiculo === 'patinete' ? 'o patinete' : 'a bike'}`;
      const sub = $('#d-vist-sub');
      sub.textContent = n < 5 ? 'Toque nos 5 pontos para fotografar' : `Seguro ativo desde ${agora()}`;
      sub.classList.toggle('ok', n === 5);
    }

    const linhaRecibo = (a, b, classe = '') => `<p${classe ? ` class="${classe}"` : ''}><span>${esc(a)}</span><b>${esc(b)}</b></p>`;
    function htmlRecibo(v) {
      let html = linhaRecibo('Saída', brl(v.saida)) + linhaRecibo(`${String(v.km).replace('.', ',')} km rodados`, brl(v.rodado));
      if (v.adicional) html += linhaRecibo('Bandeira 2 (+20%)', brl(v.adicional));
      html += linhaRecibo('Seguro da viagem', 'incluso');
      if (v.desconto) html += linhaRecibo('Cupom PRIMEIRADRINK', `− ${brl(v.desconto)}`);
      if (v.gorjeta) html += linhaRecibo('Gorjeta', brl(v.gorjeta));
      html += linhaRecibo(`Total · ${v.pag.split(' ')[0]}`, brl(v.total), 't-total');
      return html;
    }
    function viagemAtual() {
      const d = destino();
      const p = preco();
      return {
        rota: `Savassi → ${d.bairro}`, data: `Hoje, ${est.chegada || agora()}`, km: d.km, motorista: est.motorista.nome,
        pag: conta.pag, saida: p.saida, rodado: p.rodado, adicional: p.adicional, desconto: p.desconto,
        gorjeta: est.gorjeta, total: p.final + est.gorjeta,
      };
    }

    function preencherRecibo() {
      const d = destino();
      $('#d-fim-sub').textContent = `Chegada às ${est.chegada || agora()} · ${d.bairro}`;
      $('#d-recibo').innerHTML = htmlRecibo(viagemAtual());
      $('#d-avaliar-t').textContent = `Como foi com ${ela() ? 'a' : 'o'} ${primeiro()}?`;
      $$('[data-nota]', demo).forEach((b) => {
        const n = Number(b.dataset.nota);
        b.classList.toggle('on', n <= est.nota);
        b.setAttribute('aria-checked', String(n === est.nota));
      });
      $$('[data-gorjeta]', demo).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.gorjeta) === est.gorjeta)));
      const tags = $('#d-tags');
      tags.hidden = !est.nota;
      if (est.nota) {
        const tipo = est.nota >= 4 ? 'boas' : 'ruins';
        tags.classList.toggle('ruins', tipo === 'ruins');
        tags.innerHTML = TAGS[tipo].map((t) => `<button type="button" data-tag="${esc(t)}" aria-pressed="${est.tags.has(t)}">${esc(t)}</button>`).join('');
      }
    }

    function desenharHistorico(novo) {
      const n = conta.historico.length;
      const total = conta.historico.reduce((s, v) => s + v.km, 0);
      $('#d-resumo').textContent = n ? `${n} ${n === 1 ? 'volta' : 'voltas'} · ${total} km · nenhum carro esquecido` : 'Nenhuma volta ainda';
      if (!n) {
        // conta nova: ainda não tem recibo nenhum
        $('#d-hist').innerHTML = '<li class="d-hist-vazio"><svg aria-hidden="true"><use href="#i-limao"/></svg>'
          + '<b>Suas voltas aparecem aqui</b><span>Pediu um Drink, o recibo fica salvo nesta aba.</span>'
          + '<button type="button" data-aba="inicio">Pedir o primeiro Drink</button></li>';
        return;
      }
      $('#d-hist').innerHTML = conta.historico.map((v, i) => `<li${novo && i === 0 ? ' class="novo"' : ''}><button type="button" data-viagem="${i}">`
        + '<span class="d-hist-ic" aria-hidden="true"><svg><use href="#i-rota"/></svg></span>'
        + `<span><b>${esc(v.rota)}</b><small>${esc(v.data)} · ${esc(v.motorista)}</small></span><em>${esc(brl(v.total))}</em></button></li>`).join('');
    }

    function desenharCarteira() {
      $('#d-creditos').textContent = brl(conta.creditos);
      $('#d-creditos-txt').textContent = conta.creditos > 0 ? 'Cupom PRIMEIRADRINK · vale na primeira volta' : 'Cupom PRIMEIRADRINK usado. Obrigado!';
      $$('[data-pagamento]', demo).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pagamento === conta.pag)));
    }

    // a conversa sempre começa com o oi do motorista
    const oi = () => ({ de: 'ele', txt: `Oi, ${primeiroUsuario()}! Aqui é ${ela() ? 'a' : 'o'} ${primeiro()}. Estou indo de ${nomeVeiculo()}.` });
    function desenharConversa() {
      if (!est.conversa.length) est.conversa.push(oi());
      $('#d-chat-sub').textContent = `a caminho de ${nomeVeiculo()}`;
      $('#d-msgs').innerHTML = est.conversa.map((m) => `<p class="d-msg${m.de === 'eu' ? ' eu' : ''}${m.digitando ? ' digitando' : ''}">${esc(m.txt)}</p>`).join('');
      $$('#d-rapidas button').forEach((b) => { b.disabled = est.respondidas.has(b.dataset.msg); });
      const msgs = $('#d-msgs');
      msgs.scrollTop = msgs.scrollHeight;
    }

    function desenharContatos() {
      $$('[data-contato]', demo).forEach((b) => b.setAttribute('aria-checked', String(Boolean(conta.contatos[b.dataset.contato]))));
    }
    const compartilhados = () => Object.keys(conta.contatos).filter((c) => conta.contatos[c]);
    function listaNomes(nomes) {
      const comArtigo = nomes.map((n) => (n === 'Pedro' ? 'o Pedro' : (n === 'Mãe' ? 'a sua mãe' : `a ${n}`)));
      return comArtigo.length > 1 ? `${comArtigo.slice(0, -1).join(', ')} e ${comArtigo[comArtigo.length - 1]}` : comArtigo[0];
    }

    const ENTRAR = {
      inicio(tela) {
        preencherUsuario();
        const h = new Date().getHours();
        $('.d-saudacao', tela).textContent = h >= 5 && h < 12 ? 'Bom dia' : (h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite');
        $('#d-promo').hidden = conta.creditos <= 0;
      },
      opcoes: atualizarOpcoes,
      buscando() {
        esperar(2300, () => {
          est.motorista = sortear(MOTORISTAS);
          est.veiculo = est.veic === 'qualquer' ? (Math.random() < 0.5 ? 'bike' : 'patinete') : est.veic;
          est.codigo = String(1000 + Math.floor(Math.random() * 9000));
          est.conversa = [];
          est.respondidas = new Set();
          ir(est.quando === 'agendar' ? 'agendado' : 'caminho');
        });
      },
      agendado() {
        preencherMotorista();
        $('#d-agendado-txt').textContent = `${est.motorista.nome} chega às ${est.hora}, de ${nomeVeiculo()}. Você recebe um aviso 10 minutos antes.`;
      },
      caminho() {
        preencherMotorista();
        $('#d-codigo').textContent = est.codigo.split('').join(' ');
        $('.d-codigo', demo).hidden = !conta.ajustes.codigo;
        $('#d-nova-msg').hidden = !est.novaMsg;
        const rota = $('#d-rota-aprox');
        const bike = $('#d-bike');
        const eta = $('#d-eta');
        const bt = $('#d-vistoria-bt');
        const titulo = $('#d-caminho-t');
        const total = rota.getTotalLength();
        const em = (f) => {
          const p = rota.getPointAtLength(total * f);
          bike.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          rota.setAttribute('stroke-dasharray', `${(f * 100).toFixed(1)} 100`);
        };
        titulo.textContent = `${primeiro()} está a caminho`;
        bt.disabled = true;
        bt.textContent = 'Aguardando o Drink';
        eta.innerHTML = 'Chega em <b>4 min</b>';
        em(0);
        let avisou = false;
        paradas.push(animar(6500, (t) => {
          em(suave(t));
          if (t < 1) eta.innerHTML = `Chega em <b>${Math.max(1, 4 - Math.floor(t * 4))} min</b>`;
          if (!avisou && t > 0.45) {
            avisou = true;
            if (!est.conversa.length) est.conversa.push(oi());
            est.conversa.push({ de: 'ele', txt: 'Estou na Av. Getúlio Vargas, chego em 2 minutos.' });
            if (folha && folha.id === 'd-chat') desenharConversa();
            else { est.novaMsg = true; $('#d-nova-msg').hidden = false; aviso(`${primeiro()}: “Chego em 2 minutos.”`); }
          }
        }, () => {
          eta.innerHTML = '<b>Chegou</b> no Bar do Lucas';
          titulo.textContent = `${primeiro()} chegou`;
          bt.disabled = false;
          bt.textContent = conta.ajustes.codigo ? `Código ${est.codigo} conferido · vistoria` : 'Fazer a vistoria';
          aviso(`${primeiro()} chegou e está na porta do bar.`);
        }));
      },
      vistoria() {
        est.fotos = new Set();
        atualizarFotos();
      },
      malas(tela) {
        const patinete = est.veiculo === 'patinete';
        $('#d-malas-t').textContent = patinete ? 'Patinete no porta-malas' : 'Bike no porta-malas';
        $('#d-malas-sub').textContent = `${primeiro()} está guardando ${patinete ? 'o patinete' : 'a bike'}`;
        $('#d-check-dobra').textContent = patinete ? 'Patinete dobrado e preso' : 'Bike dobrada e presa';
        const carga = $('#d-carga');
        const [href, x, y, w, h] = patinete ? ['#pat-dobrado', 52, 96, 96, 32] : ['#bike-dobrada', 68, 82, 58, 52];
        carga.setAttribute('href', href);
        carga.setAttribute('x', x); carga.setAttribute('y', y); carga.setAttribute('width', w); carga.setAttribute('height', h);
        const svg = $('.d-malas', tela);
        const itens = $$('.d-checks li', tela);
        const bt = $('#d-viagem-bt');
        svg.classList.remove('guardada', 'fechada');
        itens.forEach((li) => li.classList.remove('ok'));
        bt.disabled = true;
        bt.textContent = 'Guardando';
        void svg.getBoundingClientRect();
        esperar(60, () => svg.classList.add('guardada'));
        esperar(900, () => itens[0].classList.add('ok'));
        esperar(1550, () => itens[1].classList.add('ok'));
        esperar(2150, () => svg.classList.add('fechada'));
        esperar(2500, () => {
          itens[2].classList.add('ok');
          bt.disabled = false;
          bt.textContent = 'Começar a viagem';
          $('#d-malas-sub').textContent = `Dobrad${patinete ? 'o' : 'a'} em 18 s`;
        });
      },
      viagem() {
        preencherMotorista();
        const d = destino();
        const rota = $('#d-rota');
        const feita = $('#d-rota-feita');
        const carro = $('#d-carro');
        desenharRota([rota, feita], $('#d-fim'), $('#d-rot-fim'));
        $('#d-rua').textContent = d.rua;
        const quem = compartilhados();
        $('#d-vivo-txt').textContent = quem.length ? `Ao vivo · ${quem.length === 1 ? `com ${quem[0] === 'Mãe' ? 'a sua mãe' : quem[0]}` : `${quem.length} pessoas vendo`}` : 'Ao vivo';
        const minutos = Math.round(d.km * 1.8) + 2;
        est.chegada = hhmm(new Date(Date.now() + minutos * 60000));
        $('#d-chegada').textContent = est.chegada;
        const total = rota.getTotalLength();
        const vel = [38, 44, 47, 41, 36, 42, 45, 33];
        const em = (f) => {
          const p = rota.getPointAtLength(total * f);
          carro.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          feita.setAttribute('stroke-dasharray', `${(f * 100).toFixed(1)} 100`);
          $('#d-faltam').textContent = `${(d.km * (1 - f)).toFixed(1).replace('.', ',')} km`;
          $('#d-vel').textContent = f < 1 ? `${vel[Math.min(vel.length - 1, Math.floor(f * vel.length))]} km/h` : '0 km/h';
        };
        em(0);
        paradas.push(animar(8000, (t) => em(suave(t)), () => {
          if (conta.ajustes.avisar) aviso('A Ana recebeu: “Cheguei em casa. O carro está na garagem.”');
          esperar(900, () => ir('casa'));
        }));
      },
      casa: preencherRecibo,
      viagens() { desenharHistorico(false); },
      carteira: desenharCarteira,
    };

    // cliques dentro do app
    demo.addEventListener('click', (e) => {
      if (e.target === veu) { fecharFolha(); return; }
      const b = e.target.closest('button');
      if (!b || !demo.contains(b) || b.disabled) return;
      const ds = b.dataset;
      if (ds.fechar !== undefined) { fecharFolha(); return; }
      if (ds.folha) { abrirFolha(ds.folha); return; }
      if (ds.aba) { if (ds.aba === 'inicio') zerar(); ir(ds.aba); return; }
      if (ds.destino) { est.destino = ds.destino; ir('opcoes'); return; }
      if (ds.ir) { ir(ds.ir); return; }
      if (ds.quando) { est.quando = ds.quando; atualizarOpcoes(); return; }
      if (ds.hora) { est.hora = ds.hora; atualizarOpcoes(); return; }
      if (ds.foto) {
        if (est.fotos.has(ds.foto)) est.fotos.delete(ds.foto);
        else {
          est.fotos.add(ds.foto);
          const carro = $('#d-vist-carro');
          if (!reduzirMovimento()) { carro.classList.remove('clarao'); void carro.offsetWidth; carro.classList.add('clarao'); }
          if (ds.foto === 'painel') aviso('Painel registrado: 48.210 km e meio tanque.');
        }
        atualizarFotos();
        return;
      }
      if (ds.nota) { est.nota = Number(ds.nota); est.tags = new Set(); preencherRecibo(); return; }
      if (ds.tag) {
        if (est.tags.has(ds.tag)) est.tags.delete(ds.tag); else est.tags.add(ds.tag);
        b.setAttribute('aria-pressed', String(est.tags.has(ds.tag)));
        return;
      }
      if (ds.gorjeta) { est.gorjeta = Number(ds.gorjeta); preencherRecibo(); return; }
      if (ds.msg) {
        est.respondidas.add(ds.msg);
        est.conversa.push({ de: 'eu', txt: b.textContent });
        const digitando = { de: 'ele', txt: `${primeiro()} está digitando…`, digitando: true };
        est.conversa.push(digitando);
        desenharConversa();
        setTimeout(() => {
          const i = est.conversa.indexOf(digitando);
          if (i >= 0) est.conversa.splice(i, 1, { de: 'ele', txt: RESPOSTAS[ds.msg] });
          if (folha && folha.id === 'd-chat') desenharConversa();
        }, reduzirMovimento() ? 100 : 1100);
        return;
      }
      if (ds.contato) {
        conta.contatos[ds.contato] = !conta.contatos[ds.contato];
        desenharContatos();
        mudou();
        aviso(conta.contatos[ds.contato] ? `Viagem compartilhada com ${listaNomes([ds.contato])}.` : `${ds.contato} não vê mais a viagem.`);
        return;
      }
      if (ds.ajuste) {
        conta.ajustes[ds.ajuste] = !conta.ajustes[ds.ajuste];
        b.setAttribute('aria-checked', String(conta.ajustes[ds.ajuste]));
        mudou();
        if (ds.ajuste === 'sempre') {
          const todos = Object.keys(conta.contatos);
          if (conta.ajustes.sempre) todos.forEach((c) => { conta.contatos[c] = true; });
          aviso(conta.ajustes.sempre ? `Toda viagem vai ao vivo para ${listaNomes(todos)}.` : 'Agora você escolhe com quem compartilhar a cada viagem.');
        }
        return;
      }
      if (ds.pagamento) { conta.pag = ds.pagamento; mudou(); desenharCarteira(); aviso(`Pagamento padrão: ${ds.pagamento.replace('Cartão', 'crédito')}.`); return; }
      if (ds.viagem) {
        const v = conta.historico[Number(ds.viagem)];
        $('#d-rec-sub').textContent = `${v.rota} · ${v.data}`;
        $('#d-recibo-det').innerHTML = htmlRecibo(v);
        abrirFolha('d-recibo-folha');
        return;
      }
      const acoes = {
        copiar: () => aviso('Link ao vivo copiado (demonstração).'),
        central: () => aviso('A central do Drink vai ligar para você em instantes (demonstração).'),
        local: () => aviso(compartilhados().length ? `Localização enviada para ${listaNomes(compartilhados())}.` : 'Escolha alguém em Compartilhar para enviar a localização.'),
        policia: () => aviso('Demonstração: nenhuma ligação é feita. No app de verdade, isso liga para o 190.'),
        baixar: () => aviso('Recibo em PDF salvo (demonstração).'),
        cartao: () => aviso('Cadastro de cartão fica para a versão de verdade.'),
      };
      Object.assign(acoes, op.acoes || {});
      if (ds.acao && acoes[ds.acao]) { acoes[ds.acao](); return; }
      switch (b.id) {
        case 'd-veic': {
          const ordem = Object.keys(VEICULOS);
          est.veic = ordem[(ordem.indexOf(est.veic) + 1) % ordem.length];
          atualizarOpcoes();
          break;
        }
        case 'd-cambio': est.cambio = est.cambio === 'Automático' ? 'Manual' : 'Automático'; atualizarOpcoes(); break;
        case 'd-pag': conta.pag = conta.pag === 'Pix' ? 'Cartão •••• 4821' : 'Pix'; mudou(); atualizarOpcoes(); break;
        case 'd-cupom': est.cupom = !est.cupom; atualizarOpcoes(); break;
        case 'd-pedir': ir('buscando'); break;
        case 'd-concluir': {
          const v = viagemAtual();
          conta.historico.unshift(v);
          if (v.desconto) conta.creditos = Math.max(0, conta.creditos - v.desconto);
          mudou();
          aviso(est.nota ? `Obrigado! ${est.nota} ${est.nota === 1 ? 'estrela' : 'estrelas'} para ${ela() ? 'a' : 'o'} ${primeiro()}. Recibo salvo.` : 'Obrigado! O recibo ficou salvo em Viagens.');
          zerar();
          ir('viagens');
          desenharHistorico(true);
          break;
        }
        default:
      }
    });

    // Esc fecha a folha aberta; quem ouvir a tecla depois sabe que ela já foi usada
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && folha) { e.preventDefault(); fecharFolha(); }
    });

    zerar();
    ir(op.telaInicial || 'inicio', false);
    return {
      ir, zerar, aviso, abrirFolha, fecharFolha, preencherUsuario, conta,
      folhaAberta: () => folha, telaAtual: () => atual,
    };
  }

  /* ---------- app do motorista ---------- */
  const GUIA_DOBRA = [
    'Abra o porta-malas e estenda a capa protetora.',
    'Dobre o guidão para baixo até ouvir o clique.',
    'Dobre o quadro ao meio, abaixe o selim e guarde a bike.',
  ];
  const GANHO_VIAGEM = 42.38;

  /* app do motorista. Opções: raiz, usuario() com { nome, sobrenome }, veiculo() 'bike' ou 'patinete',
     ganhos e viagens já feitas, aoIr(nome, tela) e aoGanhar(ganhos, viagens) */
  function motorista(op = {}) {
    const app = op.raiz;
    if (!app) return null;
    const telas = $$('.ma-tela', app);
    let timers = [];
    let paradas = [];
    let ganhos = op.ganhos || 0;
    let viagens = op.viagens || 0;
    let passo = 0;
    let atual = '';
    // nome e veículo de quem dirige (no site fica o Vitor de exemplo)
    function preencher() {
      if (!op.usuario) return;
      const u = op.usuario();
      const nome = [u.nome, u.sobrenome].filter(Boolean).join(' ').trim();
      $$('[data-motorista="primeiro"]', app).forEach((el) => { el.textContent = String(u.nome || '').trim().split(' ')[0]; });
      $$('[data-motorista="iniciais"]', app).forEach((el) => {
        el.textContent = nome.replace(/\./g, '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
      });
      const v = op.veiculo ? op.veiculo() : 'bike';
      $$('[data-motorista="veiculo"]', app).forEach((el) => { el.textContent = v === 'patinete' ? 'Patinete elétrico dobrável' : 'Bike elétrica dobrável'; });
    }
    const esperar = (ms, fn) => { timers.push(setTimeout(fn, reduzirMovimento() ? Math.min(ms, 120) : ms)); };
    function limpar() {
      timers.forEach(clearTimeout);
      timers = [];
      paradas.forEach((parar) => parar());
      paradas = [];
    }
    function atualizarGanhos() {
      $$('.ma-hoje', app).forEach((el) => { el.textContent = brl(ganhos); });
      $$('.ma-viagens', app).forEach((el) => { el.textContent = `${viagens} ${viagens === 1 ? 'viagem' : 'viagens'}`; });
    }
    function mostrarPasso() {
      $('#ma-passo').textContent = `Passo ${passo + 1} de ${GUIA_DOBRA.length}`;
      $('#ma-guia-txt').textContent = GUIA_DOBRA[passo];
      $$('.ma-pontos span', app).forEach((s, i) => s.classList.toggle('on', i === passo));
      // tira o passo anterior, deixa o navegador ver e acende o novo: assim a transição acontece
      const grupos = $$('.ma-g', app);
      grupos.forEach((g) => g.classList.remove('on'));
      void $('#ma-guia-desenho').getBoundingClientRect();
      grupos[passo].classList.add('on');
      $('#ma-guia-bt').textContent = passo < GUIA_DOBRA.length - 1 ? 'Próximo passo' : 'Começar a viagem';
    }
    function andar(rota, marca, ms, fim, cada) {
      const total = rota.getTotalLength();
      const em = (f) => {
        const p = rota.getPointAtLength(total * f);
        marca.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        rota.setAttribute('stroke-dasharray', `${(f * 100).toFixed(1)} 100`);
        if (cada) cada(f);
      };
      em(0);
      paradas.push(animar(ms, (t) => em(suave(t)), fim));
    }

    const ENTRAR = {
      online() {
        const barra = $('#ma-barra');
        barra.style.width = '0%';
        paradas.push(animar(2600, (t) => { barra.style.width = `${t * 100}%`; }, () => esperar(150, () => ir('pedido'))));
      },
      pedido() {
        const anel = $('#ma-anel');
        const seg = $('#ma-seg');
        anel.style.strokeDasharray = '100 100';
        seg.textContent = '15';
        if (reduzirMovimento()) return;
        paradas.push(animar(15000, (t) => {
          anel.style.strokeDasharray = `${((1 - t) * 100).toFixed(1)} 100`;
          seg.textContent = String(Math.max(0, Math.ceil(15 * (1 - t))));
        }, () => ir('online')));
      },
      buscar() {
        const bt = $('#ma-cheguei');
        bt.disabled = true;
        bt.textContent = 'Pedalando até lá';
        $('#ma-chip').innerHTML = 'Pedale até a cliente · <b>1,2 km</b>';
        andar($('#ma-rota-cli'), $('#ma-bike'), 4000, () => {
          $('#ma-chip').innerHTML = '<b>Chegou</b> no Bar do Lucas';
          bt.disabled = false;
          bt.textContent = 'Código conferido · dobrar a bike';
        });
      },
      dobra() { passo = 0; mostrarPasso(); },
      viagem() {
        const bt = $('#ma-entregar');
        bt.disabled = true;
        bt.textContent = 'Dirigindo';
        andar($('#ma-rota-viagem'), $('#ma-carro'), 5000, () => {
          bt.disabled = false;
          bt.textContent = 'Estacionar e entregar a chave';
        }, (f) => { $('#ma-faltam').textContent = `${(9 * (1 - f)).toFixed(1).replace('.', ',')} km`; });
      },
      fim() {
        ganhos += GANHO_VIAGEM;
        viagens += 1;
        atualizarGanhos();
        if (op.aoGanhar) op.aoGanhar(ganhos, viagens);
      },
    };

    function ir(nome, foco = true) {
      limpar();
      const tela = telas.find((t) => t.dataset.ma === nome);
      telas.forEach((t) => {
        t.hidden = t !== tela;
        t.classList.remove('entrando');
      });
      if (!reduzirMovimento()) { void tela.offsetWidth; tela.classList.add('entrando'); }
      $$('.d-hora', tela).forEach((h) => { h.textContent = hhmm(new Date()); });
      atual = nome;
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) {
        const t = $('.d-titulo', tela);
        if (t) t.focus({ preventScroll: true });
      }
      if (op.aoIr) op.aoIr(nome, tela);
    }

    app.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !app.contains(b) || b.disabled) return;
      if (b.dataset.maIr) { ir(b.dataset.maIr); return; }
      if (b.dataset.maAcao === 'aceitar') { ir('buscar'); return; }
      if (b.dataset.maAcao === 'recusar') { ir('online'); return; }
      if (b.id === 'ma-guia-bt') {
        if (passo < GUIA_DOBRA.length - 1) { passo += 1; mostrarPasso(); } else ir('viagem');
      }
    });
    // troca de conta no mesmo aparelho: outros ganhos e outro número de viagens
    function definir(g, v) {
      ganhos = g || 0;
      viagens = v || 0;
      atualizarGanhos();
    }
    preencher();
    atualizarGanhos();
    ir('off', false);
    return { ir, preencher, definir, telaAtual: () => atual };
  }

  window.Drink = {
    cliente, motorista,
    util: {
      $, $$, reduzirMovimento, esc, brl, brl0, dois, hhmm, hhmmss, marcado, sortear, limitar, suave, animar,
      PRECO, ehMadrugada, precoDaViagem, taxaEspera, MOTORISTAS, DESTINOS, ETAPA_TELA, ORDEM_ETAPAS,
    },
  };
}());
