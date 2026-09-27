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

  function montarDemo() {
    const demo = $('#demo');
    if (!demo) return;
    const telas = $$('.d-tela', demo);
    const etapas = $$('#etapas li');
    const lista = $('#etapas');
    const abas = $('#d-abas');
    const veu = $('#d-veu');
    const toast = $('#d-toast');
    const splash = $('#d-splash');
    // o que dura a sessão inteira: carteira, histórico, contatos e ajustes
    const conta = {
      creditos: CUPOM, pag: 'Pix', historico: HISTORICO.slice(),
      contatos: { Ana: true, Pedro: false, 'Mãe': false },
      ajustes: { avisar: true, sempre: false, codigo: true },
    };
    const est = {};
    let timers = [];
    let paradas = [];
    let timerToast = 0;
    let folha = null;
    let viuAbertura = false;

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
      marcarEtapa(tela.dataset.etapa);
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) {
        const t = $('.d-titulo', tela);
        if (t) t.focus({ preventScroll: true });
      }
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
      const total = conta.historico.reduce((s, v) => s + v.km, 0);
      $('#d-resumo').textContent = `${conta.historico.length} voltas · ${total} km · nenhum carro esquecido`;
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
    const oi = () => ({ de: 'ele', txt: `Oi, Júlia! Aqui é ${ela() ? 'a' : 'o'} ${primeiro()}. Estou indo de ${nomeVeiculo()}.` });
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
      if (b.id === 'demo-sair') { fecharCheia(); return; }
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
        aviso(conta.contatos[ds.contato] ? `Viagem compartilhada com ${listaNomes([ds.contato])}.` : `${ds.contato} não vê mais a viagem.`);
        return;
      }
      if (ds.ajuste) {
        conta.ajustes[ds.ajuste] = !conta.ajustes[ds.ajuste];
        b.setAttribute('aria-checked', String(conta.ajustes[ds.ajuste]));
        if (ds.ajuste === 'sempre') {
          const todos = Object.keys(conta.contatos);
          if (conta.ajustes.sempre) todos.forEach((c) => { conta.contatos[c] = true; });
          aviso(conta.ajustes.sempre ? `Toda viagem vai ao vivo para ${listaNomes(todos)}.` : 'Agora você escolhe com quem compartilhar a cada viagem.');
        }
        return;
      }
      if (ds.pagamento) { conta.pag = ds.pagamento; desenharCarteira(); aviso(`Pagamento padrão: ${ds.pagamento.replace('Cartão', 'crédito')}.`); return; }
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
      if (ds.acao && acoes[ds.acao]) { acoes[ds.acao](); return; }
      switch (b.id) {
        case 'd-veic': {
          const ordem = Object.keys(VEICULOS);
          est.veic = ordem[(ordem.indexOf(est.veic) + 1) % ordem.length];
          atualizarOpcoes();
          break;
        }
        case 'd-cambio': est.cambio = est.cambio === 'Automático' ? 'Manual' : 'Automático'; atualizarOpcoes(); break;
        case 'd-pag': conta.pag = conta.pag === 'Pix' ? 'Cartão •••• 4821' : 'Pix'; atualizarOpcoes(); break;
        case 'd-cupom': est.cupom = !est.cupom; atualizarOpcoes(); break;
        case 'd-pedir': ir('buscando'); break;
        case 'd-concluir': {
          const v = viagemAtual();
          conta.historico.unshift(v);
          if (v.desconto) conta.creditos = Math.max(0, conta.creditos - v.desconto);
          aviso(est.nota ? `Obrigado! ${est.nota} ${est.nota === 1 ? 'estrela' : 'estrelas'} para ${ela() ? 'a' : 'o'} ${primeiro()}. Recibo salvo.` : 'Obrigado! O recibo ficou salvo em Viagens.');
          zerar();
          ir('viagens');
          desenharHistorico(true);
          break;
        }
        default:
      }
    });

    // etapas ao lado: pulam direto para aquela parte
    etapas.forEach((li) => $('button', li).addEventListener('click', () => {
      const alvo = ETAPA_TELA[li.dataset.etapa];
      if (alvo === 'inicio') zerar();
      ir(alvo);
    }));
    $('#demo-recomecar').addEventListener('click', () => { zerar(); ir('inicio'); });

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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && folha) { fecharFolha(); return; }
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

    zerar();
    ir('inicio', false);
  }

  /* ---------- app do motorista ---------- */
  const GUIA_DOBRA = [
    'Abra o porta-malas e estenda a capa protetora.',
    'Dobre o guidão para baixo até ouvir o clique.',
    'Dobre o quadro ao meio, abaixe o selim e guarde a bike.',
  ];
  const GANHO_VIAGEM = 42.38;

  function montarAppMotorista() {
    const app = $('#mot-app');
    if (!app) return;
    const telas = $$('.ma-tela', app);
    let timers = [];
    let paradas = [];
    let ganhos = 0;
    let viagens = 0;
    let passo = 0;
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
      if (ENTRAR[nome]) ENTRAR[nome](tela);
      if (foco) {
        const t = $('.d-titulo', tela);
        if (t) t.focus({ preventScroll: true });
      }
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
    atualizarGanhos();
    ir('off', false);
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
