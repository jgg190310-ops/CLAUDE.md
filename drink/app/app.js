/* Drink — o app. Abertura, boas-vindas, cadastro e login com código, escolha entre passageiro e motorista,
   cadastro de motorista de verdade (cadastro-motorista.js) e os dois apps (passageiro.js e motorista.js), com
   mapa, GPS e as corridas passando de um celular para o outro. A conta fica salva no aparelho.
   Animações acontecem uma vez e param. */
(function () {
  'use strict';

  const { $, $$, reduzirMovimento, brl } = window.Drink.util;
  const PIX = window.Drink.pix;
  const R = window.Drink.rede;
  const app = $('#app');
  const abertura = $('#abertura');
  const meta = $('meta[name="theme-color"]');
  const COR = { azul: '#2E3CF2', noite: '#0F0E15' };
  const CHAVE = 'drink-app';
  const ms = (t) => (reduzirMovimento() ? Math.min(t, 60) : t);

  /* ---------- a conta, salva no aparelho ---------- */
  function ler() {
    try {
      const b = JSON.parse(localStorage.getItem(CHAVE));
      if (b && typeof b === 'object' && b.usuarios && typeof b.usuarios === 'object') return b;
    } catch (e) { /* sem armazenamento: a conta vale enquanto a página estiver aberta */ }
    return { atual: null, usuarios: {} };
  }
  const banco = ler();
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch (e) { /* idem */ }
  }
  const eu = () => (banco.atual && banco.usuarios[banco.atual]) || null;
  const hoje = () => window.Drink.servicos.diaDoDrink();
  const primeiro = (u) => String((u && u.nome) || '').trim().split(' ')[0];
  const iniciais = (nome) => nome.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const MINUSCULAS = ['da', 'de', 'do', 'das', 'dos', 'e'];
  // "júlia" vira "Júlia"; no sobrenome, "de andrade" vira "de Andrade"
  const capitalizar = (s, sobrenome) => s.split(' ').filter(Boolean)
    .map((p, i) => ((i || sobrenome) && MINUSCULAS.includes(p.toLowerCase()) ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
  const limpo = (s) => String(s).replace(/\s+/g, ' ').trim();

  /* ---------- celular com DDD ---------- */
  const digitos = (s) => String(s).replace(/\D/g, '');
  function formatarCel(valor) {
    const d = digitos(valor).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    const resto = d.slice(2);
    if (resto.length <= 4) return `(${d.slice(0, 2)}) ${resto}`;
    const corte = d.length === 11 ? 5 : 4;
    return `(${d.slice(0, 2)}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
  }
  const celularValido = (d) => /^[1-9][1-9]9\d{8}$/.test(d);

  /* ---------- aviso, cor da barra e tempo ---------- */
  const aviso = $('#en-aviso');
  let timerAviso = 0;
  function avisar(txt) {
    $('#en-aviso-txt').textContent = txt;
    aviso.hidden = true;
    void aviso.offsetWidth;
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.hidden = true; }, 3400);
  }
  function cor(c) { if (meta) meta.setAttribute('content', c); }

  /* ---------- faixa da conexão ---------- */
  // só aparece se a conexão ficar caída uns segundos (reconectar rápido não pisca nada) e some sozinha quando volta
  (function faixaDaConexao() {
    const faixa = $('#app-rede');
    const txt = $('#app-rede-txt');
    let timer = 0;
    let visivel = false;
    function esconder() { visivel = false; faixa.hidden = true; faixa.classList.remove('ok'); app.classList.remove('sem-rede'); }
    function mostrar(texto, ok) {
      visivel = true;
      txt.textContent = texto;
      faixa.classList.toggle('ok', ok);
      faixa.hidden = false;
      app.classList.add('sem-rede');
    }
    R.conexao.ouvir((estado) => {
      clearTimeout(timer);
      if (estado === 'ok') {
        if (visivel) { mostrar('Conectado de novo', true); timer = setTimeout(esconder, 1800); }
        return;
      }
      const texto = estado === 'sem-internet' ? 'Sem internet · o que você mandar sai quando voltar' : 'Conexão fraca · tentando de novo';
      if (visivel) { mostrar(texto, false); return; }
      timer = setTimeout(() => mostrar(texto, false), estado === 'sem-internet' ? 1500 : 5000);
    });
  }());

  // timers da tela atual da entrada: somem quando a tela muda
  let timers = [];
  const agendar = (fn, t) => { timers.push(setTimeout(fn, ms(t))); };
  function limparTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- telas ---------- */
  const telasEn = $$('.en-tela');
  const modos = { passageiro: $('#passageiro'), motorista: $('#motorista') };
  const tela = (nome) => $(`.en-tela[data-en="${nome}"]`);
  let vista = null;

  function mostrar(el, anim) {
    limparTimers();
    soltar(el);
    [...telasEn, modos.passageiro, modos.motorista].forEach((t) => {
      if (t !== el) t.hidden = true;
      t.classList.remove('entra', 'volta');
    });
    el.hidden = false;
    if (anim && !reduzirMovimento()) { void el.offsetWidth; el.classList.add(anim); }
    vista = el;
  }

  const CAMPO = { celular: '#en-cel', codigo: '#en-cod-in', nome: '#en-nome' };

  /* ---------- chave Pix do motorista ---------- */
  function ajustarCampoPix(tipo, campo) {
    const t = PIX.TIPOS[tipo.value] || PIX.TIPOS.celular;
    campo.placeholder = t.exemplo;
    campo.inputMode = t.teclado;
    campo.type = { email: 'email', tel: 'tel' }[t.teclado] || 'text';
  }
  const chaveNoCampo = (pix) => (pix.tipo === 'celular' && pix.chave.startsWith('+55') ? formatarCel(pix.chave.slice(3)) : pix.chave);
  // confere a chave; se estiver errada, mostra o porquê e devolve null
  function lerPix(tipoSel, chaveSel, erroSel) {
    const tipo = $(tipoSel).value;
    const r = PIX.normalizarChave(tipo, $(chaveSel).value);
    if (r.erro) { mostrarErro(erroSel, r.erro); $(chaveSel).focus(); return null; }
    $(erroSel).hidden = true;
    return { tipo, chave: r.chave };
  }
  [['#en-pix-tipo', '#en-pix-chave', '#en-pix-erro'], ['#en-pf-tipo', '#en-pf-chave', '#en-pf-erro']].forEach(([t, c, e]) => {
    $(t).addEventListener('change', () => { ajustarCampoPix($(t), $(c)); $(e).hidden = true; });
    $(c).addEventListener('input', () => { $(e).hidden = true; });
  });
  function focar(t, nome) {
    const campo = CAMPO[nome] && $(CAMPO[nome]);
    const alvo = campo || $('.en-t, .boas-t', t);
    if (alvo) alvo.focus({ preventScroll: true });
  }

  function irEn(nome, { anim = 'entra', foco = true } = {}) {
    fecharFolha(false);
    if (nome !== 'codigo') pararDeOuvir();
    const t = tela(nome);
    mostrar(t, anim);
    cor(nome === 'boas' ? COR.azul : COR.noite);
    if (ENTRAR[nome]) ENTRAR[nome](t);
    if (foco) focar(t, nome);
  }

  const ENTRAR = {
    papel() { preencherConta(); },
    'mot-cad'() {
      const u = eu();
      escolherVeiculo((u && u.veiculo) || 'bike');
      $('#en-pix-tipo').value = (u && u.pix && u.pix.tipo) || 'celular';
      $('#en-pix-chave').value = u && u.pix ? chaveNoCampo(u.pix) : '';
      ajustarCampoPix($('#en-pix-tipo'), $('#en-pix-chave'));
      $('#en-pix-erro').hidden = true;
      cadastro.desenhar();
    },
  };

  /* ---------- abertura: o limão chega rolando, o nome aparece e o app começa ---------- */
  function abrir(temConta) {
    let saiu = false;
    let timer = 0;
    function sair() {
      if (saiu) return;
      saiu = true;
      clearTimeout(timer);
      if (temConta) sumirAbertura(); else voarParaBoas();
    }
    function comecar() {
      app.classList.add('abrindo');
      timer = setTimeout(sair, ms(temConta ? 1550 : 2000));
    }
    abertura.addEventListener('click', sair);
    cor(COR.azul);
    // espera a fonte do nome (no máximo 0,7 s) para o nome não trocar de letra no meio da animação
    let comecou = false;
    const uma = () => { if (!comecou) { comecou = true; comecar(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(uma);
    setTimeout(uma, 700);
  }

  function fimAbertura() {
    abertura.hidden = true;
    abertura.style.pointerEvents = '';
    app.classList.remove('abrindo');
  }

  // quem já tem conta: a abertura some e o app aparece
  function sumirAbertura() {
    cor(vista === tela('boas') ? COR.azul : COR.noite);
    if (reduzirMovimento() || !abertura.animate) { fimAbertura(); return; }
    // o toque já passa para o app enquanto a abertura some, e ela sai de vez mesmo se a animação não avisar o fim
    abertura.style.pointerEvents = 'none';
    const fim = { duration: 420, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' };
    $('.ab-marca', abertura).animate([{ transform: 'none' }, { transform: 'scale(1.18)' }], fim);
    abertura.animate([{ opacity: 1 }, { opacity: 0 }], fim).onfinish = fimAbertura;
    setTimeout(fimAbertura, fim.duration + 250);
    if (vista) {
      vista.classList.remove('entra', 'volta');
      void vista.offsetWidth;
      vista.classList.add('entra');
    }
  }

  // quadros de uma curva (Bézier quadrática) de (0, 0) até (x, y), passando perto de (cx, cy)
  function curva(x, y, cx, cy, extra) {
    const quadros = [];
    for (let i = 0; i <= 8; i += 1) {
      const t = i / 8;
      const px = 2 * (1 - t) * t * cx + t * t * x;
      const py = 2 * (1 - t) * t * cy + t * t * y;
      quadros.push({ transform: `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) ${extra(t)}` });
    }
    return quadros;
  }

  // conta nova: o limão voa e vira a lua das boas-vindas, o nome vira a marca lá em cima
  function voarParaBoas() {
    const boas = tela('boas');
    boas.classList.remove('entrou', 'pousou', 'sem-voo');
    void boas.offsetWidth;
    boas.classList.add('entrou', 'voando');
    const pousar = () => {
      boas.classList.remove('voando');
      boas.classList.add('pousou');
      fimAbertura();
      $('.boas-t', boas).focus({ preventScroll: true });
    };
    if (reduzirMovimento() || !abertura.animate) { pousar(); return; }
    abertura.style.pointerEvents = 'none';
    const roda = $('.ab-roda-caixa', abertura);
    const nome = $('.ab-nome', abertura);
    const lua = $('.boas-lua', boas);
    const marca = $('.boas-marca', boas);
    const r1 = roda.getBoundingClientRect();
    const r2 = lua.getBoundingClientRect();
    const n1 = nome.getBoundingClientRect();
    const n2 = marca.getBoundingClientRect();
    const voo = { duration: 800, easing: 'cubic-bezier(.6, 0, .2, 1)', fill: 'forwards' };
    const dx = r2.left + r2.width / 2 - (r1.left + r1.width / 2);
    const dy = r2.top + r2.height / 2 - (r1.top + r1.height / 2);
    const s = r2.width / r1.width;
    // o limão faz uma curva para a direita e sobe; o nome sobe e depois vai para a esquerda: os dois não se cruzam
    roda.animate(curva(dx, dy, dx * .95, dy * .05, (t) => `rotate(${135 * t}deg) scale(${1 + (s - 1) * t})`), voo);
    const escala = parseFloat(getComputedStyle(marca).fontSize) / parseFloat(getComputedStyle(nome).fontSize);
    const nx = n2.left - n1.left;
    const ny = n2.top + n2.height / 2 - (n1.top + n1.height / 2);
    nome.animate(curva(nx, ny, nx * .05, ny * .95, (t) => `scale(${1 + (escala - 1) * t})`), voo);
    $('.ab-sub', abertura).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    abertura.animate([{ backgroundColor: 'rgba(46, 60, 242, 1)' }, { backgroundColor: 'rgba(46, 60, 242, 0)' }],
      { duration: 420, delay: 120, easing: 'ease-out', fill: 'forwards' });
    setTimeout(pousar, voo.duration);
  }

  /* ---------- cadastro e login ---------- */
  const fluxo = { modo: 'criar', celular: '', codigo: '' };
  const cel = $('#en-cel');
  const celBt = $('#en-cel-bt');

  function mostrarErro(sel, txt) {
    const el = $(sel);
    el.textContent = txt;
    el.hidden = false;
  }

  // como o código chega: SMS (com o Firebase ligado), notificação neste celular ou, sem nenhum dos dois, sem código
  function jeitoDoCodigo() {
    if (SMS.ativo()) return 'sms';
    return ['ligado', 'desligado'].includes(AVISOS.estado()) ? 'notificacao' : 'nenhum';
  }
  function comecarConta(modo) {
    fluxo.modo = modo;
    const jeito = jeitoDoCodigo();
    const como = { sms: 'um código por SMS', notificacao: 'um código por notificação neste celular', nenhum: '' }[jeito];
    $('#cel-t').textContent = modo === 'criar' ? 'Qual é o seu celular?' : 'Entra com o seu celular';
    $('#cel-sub').textContent = modo === 'criar'
      ? (como ? `A gente manda ${como} pra confirmar que é você.` : 'É por ele que o motorista fala com você.')
      : `O mesmo número do cadastro.${como ? ` A gente manda ${como}.` : ''}`;
    $('#en-cel-nota').textContent = jeito === 'sms'
      ? 'SMS de verdade, protegido pelo reCAPTCHA do Google.'
      : 'O seu número só aparece para o motorista da sua corrida.';
    celBt.textContent = jeito === 'nenhum' ? 'Continuar' : 'Receber código';
    cel.value = '';
    celBt.disabled = true;
    $('#en-cel-erro').hidden = true;
    irEn('celular');
  }

  cel.addEventListener('input', () => {
    cel.value = formatarCel(cel.value);
    celBt.disabled = digitos(cel.value).length < 11;
    $('#en-cel-erro').hidden = true;
  });
  $('#form-cel').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = digitos(cel.value);
    if (d.length < 11) { mostrarErro('#en-cel-erro', 'Faltam números: é o DDD mais os 9 dígitos.'); cel.focus(); return; }
    if (!celularValido(d)) { mostrarErro('#en-cel-erro', 'Esse não parece um celular. Confere o DDD e o 9 do começo.'); cel.focus(); return; }
    fluxo.celular = d;
    const jeito = jeitoDoCodigo();
    if (jeito === 'nenhum') {
      // sem SMS e sem notificação neste navegador: o número fica anotado, sem código de mentira
      const estado = AVISOS.estado();
      avisar(estado === 'instalar' ? 'Número anotado. Com o Drink instalado na tela de início, o código chega por notificação.'
        : (estado === 'bloqueado' ? 'Número anotado. As notificações estão bloqueadas, então seguimos sem o código.' : 'Número anotado.'));
      depoisDoCodigo();
      return;
    }
    irEn('codigo');
    enviarCodigo();
  });

  // o código: por SMS de verdade (Firebase, 6 números) ou, sem o Firebase ligado, como notificação de verdade neste
  // celular (4 números, pelo ntfy); com o app aberto, o código que chega já preenche as caixas
  const SMS = window.Drink.sms;
  const AVISOS = window.Drink.avisos;
  const codIn = $('#en-cod-in');
  const codCaixa = $('#en-cod');
  const codBt = $('#en-cod-bt');
  let caixas = $$('.en-cod-caixa', codCaixa);
  let tamanho = 4;
  let ouvindo = null;

  function montarCaixas(n) {
    if (n === tamanho && caixas.length === n) return;
    tamanho = n;
    codCaixa.dataset.n = String(n);
    codIn.maxLength = n;
    codIn.setAttribute('aria-label', `Código de ${n} números`);
    caixas.forEach((c) => c.remove());
    for (let i = 0; i < n; i += 1) {
      const c = document.createElement('span');
      c.className = 'en-cod-caixa';
      codCaixa.appendChild(c);
    }
    caixas = $$('.en-cod-caixa', codCaixa);
  }
  function desenharCodigo() {
    const v = codIn.value;
    caixas.forEach((c, i) => {
      c.textContent = v[i] || '';
      c.classList.toggle('cheia', Boolean(v[i]));
      c.classList.toggle('atual', i === Math.min(v.length, tamanho - 1));
    });
    codBt.disabled = v.length < tamanho || fluxo.conferindo;
  }
  function pararDeOuvir() { if (ouvindo) { ouvindo.fechar(); ouvindo = null; } }
  function mostrarSemCodigo() { $('#en-sem-codigo').hidden = false; }
  function enviarCodigo() {
    const envio = (fluxo.envio || 0) + 1;
    fluxo.envio = envio;
    codIn.value = '';
    codCaixa.classList.remove('certo', 'erro');
    $('#en-cod-erro').hidden = true;
    $('#en-sem-codigo').hidden = true;
    montarCaixas(SMS.digitos());
    desenharCodigo();
    const numero = `<b>+55 ${formatarCel(fluxo.celular)}</b>`;
    if (SMS.ativo()) {
      $('#cod-sub-txt').innerHTML = `Mandamos um SMS com ${tamanho} números para ${numero}.`;
      enviarSms(envio);
      return;
    }
    // notificação: a permissão é pedida aqui, ainda dentro do toque (o iPhone só pergunta assim)
    const pedido = AVISOS.pedir();
    fluxo.codigo = String(1000 + Math.floor(Math.random() * 9000));
    $('#cod-sub-txt').innerHTML = `Mandamos ${tamanho} números por notificação para este celular (${numero}).`;
    contarReenvio(30);
    ouvirCodigo(envio);
    pedido.then(async (estado) => {
      if (fluxo.envio !== envio) return;
      if (estado !== 'ligado') {
        pararDeOuvir();
        avisar('Sem a permissão de notificações, seguimos sem o código.');
        depoisDoCodigo();
        return;
      }
      let foi = false;
      try { foi = await AVISOS.codigo(fluxo.codigo); } catch (e) { foi = false; }
      if (fluxo.envio !== envio) return;
      if (!foi) {
        mostrarErro('#en-cod-erro', 'Não deu pra mandar a notificação agora. Confere a internet e toca em Reenviar código.');
        contarReenvio(0);
        mostrarSemCodigo();
      }
    });
    agendar(() => { if (fluxo.envio === envio && !codCaixa.classList.contains('certo')) mostrarSemCodigo(); }, 40000);
  }
  // com o app aberto, a mesma mensagem que vira notificação chega aqui e preenche o código
  function ouvirCodigo(envio) {
    pararDeOuvir();
    ouvindo = R.canal.assinar([AVISOS.topicoCodigo()], (msg) => {
      if (fluxo.envio !== envio || !msg || msg.tipo !== 'codigo' || String(msg.codigo) !== fluxo.codigo) return;
      if (codCaixa.classList.contains('certo')) return;
      codIn.value = fluxo.codigo;
      desenharCodigo();
      conferir();
    }, { desde: String(Math.floor(Date.now() / 1000) - 5) });
  }
  async function enviarSms(envio) {
    fluxo.codigo = '';
    contarReenvio(60);
    try {
      await SMS.enviar(fluxo.celular);
      if (fluxo.envio === envio) avisar('SMS enviado. O código chega em alguns segundos.');
    } catch (e) {
      if (fluxo.envio !== envio) return;
      mostrarErro('#en-cod-erro', SMS.explicar(e));
      contarReenvio(0);
    }
  }
  let reenvio = 0;
  function contarReenvio(seg) {
    const bt = $('#en-reenviar');
    let falta = seg;
    clearTimeout(reenvio);
    const passo = () => {
      bt.disabled = falta > 0;
      bt.textContent = falta > 0 ? `Reenviar código em ${Math.floor(falta / 60)}:${String(falta % 60).padStart(2, '0')}` : 'Reenviar código';
      if (falta > 0) { falta -= 1; reenvio = setTimeout(passo, 1000); timers.push(reenvio); }
    };
    passo();
  }
  function codigoCerto() {
    codCaixa.classList.add('certo');
    codBt.disabled = true;
    codIn.blur();
    pararDeOuvir();
    if (!SMS.ativo()) AVISOS.definir('codigo', []);
    agendar(depoisDoCodigo, 600);
  }
  function codigoErrado(motivo) {
    codCaixa.classList.remove('erro');
    void codCaixa.offsetWidth;
    codCaixa.classList.add('erro');
    mostrarErro('#en-cod-erro', motivo || (SMS.ativo() ? 'Código errado. Confere no SMS e tenta de novo.' : 'Código errado. Confere na notificação e tenta de novo.'));
    const errado = codIn.value;
    agendar(() => { if (codIn.value === errado) { codIn.value = ''; desenharCodigo(); } }, 450);
  }
  async function conferir() {
    if (codIn.value.length < tamanho || codCaixa.classList.contains('certo') || fluxo.conferindo) return;
    if (!SMS.ativo()) {
      if (codIn.value === fluxo.codigo) codigoCerto(); else codigoErrado();
      return;
    }
    const envio = fluxo.envio;
    fluxo.conferindo = true;
    codBt.textContent = 'Conferindo…';
    desenharCodigo();
    try {
      await SMS.conferir(codIn.value);
      if (fluxo.envio === envio) codigoCerto();
    } catch (e) {
      if (fluxo.envio === envio) codigoErrado(SMS.explicar(e));
    } finally {
      fluxo.conferindo = false;
      codBt.textContent = 'Confirmar';
      desenharCodigo();
    }
  }
  codIn.addEventListener('input', () => {
    codIn.value = digitos(codIn.value).slice(0, tamanho);
    codCaixa.classList.remove('erro');
    $('#en-cod-erro').hidden = true;
    desenharCodigo();
    if (codIn.value.length === tamanho) conferir();
  });
  codIn.addEventListener('focus', () => codCaixa.classList.add('foco'));
  codIn.addEventListener('blur', () => codCaixa.classList.remove('foco'));
  $('#form-cod').addEventListener('submit', (e) => { e.preventDefault(); conferir(); });
  function seguirSemCodigo() {
    pararDeOuvir();
    AVISOS.definir('codigo', []);
    avisar('Tudo bem: o número ficou anotado sem o código.');
    depoisDoCodigo();
  }

  function depoisDoCodigo() {
    const conta = banco.usuarios[fluxo.celular];
    if (conta) {
      banco.atual = fluxo.celular;
      salvar();
      entrarNoApp(conta, 'entra');
      avisar(fluxo.modo === 'criar' ? `Esse número já tem conta. Oi de novo, ${primeiro(conta)}!` : `Oi de novo, ${primeiro(conta)}!`);
      return;
    }
    $('#nome-sub').textContent = fluxo.modo === 'entrar'
      ? 'Não achamos conta com esse número neste aparelho. Bora criar uma, é rapidinho.'
      : 'É assim que o motorista vai te chamar na porta do bar.';
    $('#en-nome-erro').hidden = true;
    irEn('nome');
  }

  $('#form-nome').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = limpo($('#en-nome').value);
    const sobrenome = limpo($('#en-sobrenome').value);
    const email = $('#en-email').value.trim();
    let erro = '';
    let campo = null;
    if (nome.length < 2) { erro = 'Coloca pelo menos o seu primeiro nome.'; campo = $('#en-nome'); }
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { erro = 'Esse e-mail parece incompleto.'; campo = $('#en-email'); }
    else if (!$('#en-18').checked) { erro = 'Pra usar o Drink, confirma que tem 18 anos ou mais.'; campo = $('#en-18'); }
    if (erro) { mostrarErro('#en-nome-erro', erro); campo.focus(); return; }
    const u = {
      nome: capitalizar(nome), sobrenome: capitalizar(sobrenome, true), email, celular: fluxo.celular,
      papel: null, veiculo: 'bike', motoristaOk: false, ganhos: 0, viagens: 0, dia: hoje(),
    };
    banco.usuarios[u.celular] = u;
    banco.atual = u.celular;
    salvar();
    // quem chegou pelo QR de um evento vai direto pedir a volta
    const convite = window.Drink.Eventos.convite();
    if (convite) {
      u.papel = 'passageiro';
      salvar();
      entrarNoApp(u, 'entra');
      avisar(`Tudo pronto, ${primeiro(u)}! Na hora de ir embora do ${convite.nome}, pede o seu Drink aqui.`);
      return;
    }
    $('#en-ok-txt').textContent = 'Conta criada';
    irEn('papel');
  });
  $('#form-nome').addEventListener('input', () => { $('#en-nome-erro').hidden = true; });

  function limparFormularios() {
    ['#en-cel', '#en-cod-in', '#en-nome', '#en-sobrenome', '#en-email'].forEach((s) => { $(s).value = ''; });
    $('#en-18').checked = false;
    $$('.en-erro').forEach((el) => { el.hidden = true; });
    codCaixa.classList.remove('certo', 'erro');
    desenharCodigo();
  }

  /* ---------- papel: passageiro ou motorista ---------- */
  let origemCadastro = 'papel';
  let veiculoCadastro = 'bike';
  // treino de motorista: de onde veio (para voltar) e se veio do site pedindo o treino antes de ter conta
  let origemTreino = 'papel';
  let querTreino = false;
  // o site leva quem organiza um evento direto para a aba Eventos (?aba=eventos)
  let querEventos = false;

  // o cadastro de motorista completo e conferido; quem se cadastrou antes completa o que falta
  const podeDirigir = (u) => Boolean(u && u.motoristaOk && cadastro.completo(u));
  function pedirCadastro(u, anim) {
    origemCadastro = 'papel';
    irEn('mot-cad', { anim });
    if (u.motoristaOk) avisar('O cadastro de motorista agora pede o seu rosto e os documentos. Completa o que falta para voltar a dirigir.');
  }
  function entrarNoApp(u, anim) {
    // o link do treino não passa por cima de uma volta em andamento do passageiro
    if (querTreino) {
      querTreino = false;
      if (!(u.corrida && !u.corrida.simulada)) { treinarMotorista(); return; }
    }
    if (querEventos && !u.corridaMotorista) {
      querEventos = false;
      if (u.papel !== 'passageiro') { u.papel = 'passageiro'; salvar(); }
      abrirPassageiro(anim || 'entra', 'eventos');
      return;
    }
    if (!u.papel) { $('#en-ok-txt').textContent = `Oi, ${primeiro(u)}`; irEn('papel', { anim }); return; }
    if (u.papel === 'motorista' && !podeDirigir(u)) { pedirCadastro(u, anim); return; }
    if (u.papel === 'motorista') abrirMotorista(anim); else abrirPassageiro(anim);
  }

  function escolherPapel(papel) {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    if (papel === 'motorista' && !podeDirigir(u)) { pedirCadastro(u); return; }
    u.papel = papel;
    salvar();
    entrarNoApp(u, 'entra');
    if (papel === 'passageiro') avisar(`Tudo pronto, ${primeiro(u)}! Bebeu? Pede um Drink.`);
  }

  function escolherVeiculo(v) {
    veiculoCadastro = v;
    $$('[data-veiculo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.veiculo === v)));
  }

  function comecarADirigir() {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    u.veiculo = veiculoCadastro;
    const pix = lerPix('#en-pix-tipo', '#en-pix-chave', '#en-pix-erro');
    if (!pix) { salvar(); return; }
    u.pix = pix;
    salvar();
    const falta = cadastro.faltando(u);
    if (falta.length) {
      cadastro.desenhar();
      avisar(`Antes de dirigir, ${falta.length > 1 ? 'faltam' : 'falta'} ${falta.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`);
      return;
    }
    u.motoristaOk = true;
    u.papel = 'motorista';
    salvar();
    abrirMotorista('entra');
    avisar(`Cadastro completo, ${primeiro(u)}! Fica online quando quiser.`);
  }

  /* ---------- treino de motorista: uma corrida simulada, sem cadastro ---------- */
  // Para quem quer ver como é dirigir antes de mandar a CNH e os documentos. Não muda o papel da conta: ao sair do
  // treino, volta para onde estava; para dirigir de verdade, o cadastro continua pedindo tudo.
  function treinarMotorista() {
    const u = eu();
    if (!u) {
      querTreino = true;
      irEn('boas');
      avisar('Cria a sua conta, é rapidinho. O treino começa logo depois, sem pedir CNH.');
      return;
    }
    if (passageiro && passageiro.corridaAtiva()) { avisar('Termina a sua volta antes de treinar.'); return; }
    const en = vista && vista.dataset.en;
    if (en === 'mot-cad') origemTreino = 'mot-cad';
    else if (vista === modos.passageiro || (!en && u.papel === 'passageiro')) origemTreino = 'passageiro';
    else origemTreino = 'papel';
    abrirMotorista('entra');
    // com o cadastro completo não tem tela de treino: a simulação começa direto
    if (podeDirigir(u)) motorista.simular();
  }
  function sairTreino() {
    if (origemTreino === 'mot-cad') irEn('mot-cad', { anim: 'volta' });
    else if (origemTreino === 'passageiro') abrirPassageiro('volta');
    else irEn('papel', { anim: 'volta' });
  }
  function cadastroDepoisDoTreino() {
    origemCadastro = origemTreino === 'passageiro' ? 'passageiro' : 'papel';
    irEn('mot-cad');
  }

  /* ---------- os dois apps ---------- */
  let passageiro = null;
  let motorista = null;

  // aviso do sistema quando o app está em segundo plano (com a tela aberta, o aviso do app basta); a etiqueta é a
  // mesma dos avisos que chegam pelo ntfy, então um substitui o outro em vez de aparecerem dois
  function notificar(titulo, corpo, tag = 'drink-corrida') {
    if (!document.hidden) return;
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const opcoes = { body: corpo, icon: '../icon-192.png', badge: '../icon-192.png', tag, renotify: true, vibrate: [180, 90, 180] };
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((r) => r.showNotification(titulo, opcoes)).catch(() => {});
      } else new Notification(titulo, opcoes);
    } catch (e) { /* sem notificação */ }
  }
  // chamado direto no toque (pedir o Drink, ficar online): o iPhone só pergunta assim
  function pedirNotificacao() {
    window.Drink.avisos.pedir().then(desenharAvisos);
  }

  /* ---------- avisos no celular: ligar e mostrar como estão ---------- */
  function desenharAvisos() {
    const txt = {
      ligado: 'Ligados: chegam mesmo com o app fechado',
      desligado: 'Toca para ligar',
      bloqueado: 'Bloqueados nos ajustes do celular',
      instalar: 'Instala o app para receber',
      'sem-suporte': 'Só com o app aberto neste navegador',
    }[window.Drink.avisos.estado()];
    $$('[data-avisos]').forEach((el) => { el.textContent = txt; });
  }
  function ligarAvisos(b) {
    const A = window.Drink.avisos;
    const e = A.estado();
    if (e === 'instalar') { avisar('No iPhone, os avisos chegam com o Drink instalado na tela de início.'); instalar(b); return; }
    if (e === 'sem-suporte') { avisar('Esse navegador não recebe avisos com o app fechado. Deixa o app aberto durante a corrida.'); return; }
    if (e === 'bloqueado') { avisar('Os avisos estão bloqueados. Libera em Ajustes › Notificações › Drink.'); return; }
    if (e === 'ligado') { A.sincronizar(); avisar('Avisos ligados: chegam mesmo com o app fechado.'); return; }
    A.pedir().then((novo) => {
      desenharAvisos();
      avisar(novo === 'ligado' ? 'Pronto! Os avisos chegam mesmo com o app fechado.' : 'Sem a permissão, os avisos só aparecem com o app aberto.');
    });
  }
  const opcoes = () => ({ eu, salvar, avisar, notificar, pedirNotificacao });
  function garantirPassageiro() {
    if (!passageiro) passageiro = window.Drink.Passageiro.criar({ raiz: modos.passageiro, ...opcoes() });
    return passageiro;
  }
  function garantirMotorista() {
    if (!motorista) {
      motorista = window.Drink.Motorista.criar({
        raiz: modos.motorista, ...opcoes(), editarPix: (msg) => editarPix(msg), irCadastro: cadastroDepoisDoTreino, sairTreino,
      });
    }
    return motorista;
  }

  function preencherConta() {
    const u = eu();
    if (!u) return;
    const nome = [u.nome, u.sobrenome].filter(Boolean).join(' ');
    $$('[data-en-nome]').forEach((el) => { el.textContent = nome; });
    $$('[data-en-primeiro]').forEach((el) => { el.textContent = primeiro(u); });
    $$('[data-en-iniciais]').forEach((el) => {
      el.textContent = iniciais(nome);
      el.style.backgroundImage = u.selfie ? `url("${u.selfie}")` : '';
      el.classList.toggle('com-foto', Boolean(u.selfie));
    });
    $$('[data-en-fone]').forEach((el) => { el.textContent = `+55 ${formatarCel(u.celular)}`; });
    const g = window.Drink.servicos.ganhosDoDia(u.corridasFeitas);
    if (u.dia !== hoje() || u.ganhos !== g.total || u.viagens !== g.n) { u.dia = hoje(); u.ganhos = g.total; u.viagens = g.n; salvar(); }
    $$('[data-en-ganhos]').forEach((el) => { el.textContent = brl(u.ganhos || 0); });
    $$('[data-en-viagens]').forEach((el) => { el.textContent = `${u.viagens || 0} ${u.viagens === 1 ? 'viagem' : 'viagens'}`; });
    const patinete = u.veiculo === 'patinete';
    $('#en-veic-t').textContent = patinete ? 'Trocar para bike' : 'Trocar para patinete';
    $('#en-veic-sub').textContent = `Hoje você chega de ${patinete ? 'patinete elétrico' : 'bike elétrica'}`;
    $('#en-pix-atual').textContent = u.pix ? `${PIX.TIPOS[u.pix.tipo].nome} · ${PIX.mascarar(u.pix.chave)}` : 'Cadastra onde você recebe';
    desenharAvisos();
    if (motorista) motorista.preencher();
  }

  function abrirPassageiro(anim, telaInicial) {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    fecharFolha(false);
    garantirPassageiro();
    preencherConta();
    mostrar(modos.passageiro, anim);
    cor(COR.noite);
    passageiro.abrir();
    if (telaInicial && !passageiro.corridaAtiva()) passageiro.ir(telaInicial);
  }

  function abrirMotorista(anim) {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    fecharFolha(false);
    garantirMotorista();
    // sem o cadastro completo, o app do motorista abre só para treinar
    motorista.definirTreino(!podeDirigir(u));
    preencherConta();
    mostrar(modos.motorista, anim);
    cor(COR.noite);
    motorista.abrir();
  }

  // o app que sai de cena para de usar o GPS e a rede
  function soltar(proxima) {
    if (passageiro && vista === modos.passageiro && proxima !== modos.passageiro) passageiro.fechar();
    if (motorista && vista === modos.motorista && proxima !== modos.motorista && motorista.online() && !motorista.corridaAtiva()) motorista.ficarOffline();
  }

  function virarMotorista() {
    const u = eu();
    if (!u) return;
    if (passageiro && passageiro.corridaAtiva()) { avisar('Termina a sua volta antes de trocar de modo.'); return; }
    if (podeDirigir(u)) {
      u.papel = 'motorista';
      salvar();
      abrirMotorista('entra');
      avisar('Modo motorista. Fica online quando quiser.');
    } else {
      origemCadastro = 'passageiro';
      irEn('mot-cad');
    }
  }

  function virarPassageiro() {
    const u = eu();
    if (!u) return;
    if (motorista && motorista.corridaAtiva()) { fecharFolha(false); avisar('Termina a corrida antes de trocar de modo.'); return; }
    if (motorista && motorista.online()) motorista.ficarOffline();
    u.papel = 'passageiro';
    salvar();
    abrirPassageiro('entra');
    avisar('Modo passageiro. Bebeu? Pede um Drink.');
  }

  function trocarVeiculo() {
    const u = eu();
    if (!u) return;
    u.veiculo = u.veiculo === 'patinete' ? 'bike' : 'patinete';
    salvar();
    preencherConta();
    avisar(u.veiculo === 'patinete' ? 'Hoje você vai de patinete.' : 'Hoje você vai de bike.');
  }

  function editarPix(msg, origem) {
    const u = eu();
    if (!u) return;
    $('#en-pf-tipo').value = (u.pix && u.pix.tipo) || 'celular';
    $('#en-pf-chave').value = u.pix ? chaveNoCampo(u.pix) : '';
    ajustarCampoPix($('#en-pf-tipo'), $('#en-pf-chave'));
    const erro = $('#en-pf-erro');
    erro.textContent = msg || '';
    erro.hidden = !msg;
    abrirFolha('en-pix-folha', origem);
  }
  $('#en-pf-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pix = lerPix('#en-pf-tipo', '#en-pf-chave', '#en-pf-erro');
    const u = eu();
    if (!pix || !u) return;
    u.pix = pix;
    salvar();
    fecharFolha();
    preencherConta();
    avisar(`Chave Pix salva: ${PIX.mascarar(pix.chave)}. É nela que os passageiros pagam.`);
  });

  function sairDaConta() {
    fecharFolha(false);
    if ((passageiro && passageiro.corridaAtiva()) || (motorista && motorista.corridaAtiva())) {
      avisar('Tem uma corrida acontecendo. Termina ela antes de sair da conta.');
      return;
    }
    if (passageiro) passageiro.sair();
    if (motorista) motorista.sair();
    banco.atual = null;
    salvar();
    voltarParaBoas('Você saiu da conta. Até a próxima!');
  }
  function voltarParaBoas(msg) {
    limparFormularios();
    const boas = tela('boas');
    boas.classList.remove('entrou', 'voando', 'pousou');
    boas.classList.add('sem-voo');
    irEn('boas', { anim: null });
    void boas.offsetWidth;
    boas.classList.add('entrou', 'pousou');
    avisar(msg);
  }

  /* ---------- seus dados: nome e e-mail (o celular é a conta) ---------- */
  function abrirDados(b) {
    const u = eu();
    if (!u) return;
    // o nome de quem dirige é o da CNH, que o passageiro vê junto com o rosto
    const trava = Boolean(u.motoristaOk || u.docs);
    $('#en-dados-nome').value = u.nome || '';
    $('#en-dados-sobrenome').value = u.sobrenome || '';
    $('#en-dados-email').value = u.email || '';
    $('#en-dados-cel').value = `+55 ${formatarCel(u.celular)}`;
    ['#en-dados-nome', '#en-dados-sobrenome'].forEach((sel) => { $(sel).readOnly = trava; });
    $('#en-dados-trava').hidden = !trava;
    $('#en-dados-erro').hidden = true;
    abrirFolha('en-dados', b);
  }
  $('#en-dados-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = eu();
    if (!u) return;
    const trava = Boolean(u.motoristaOk || u.docs);
    const nome = limpo($('#en-dados-nome').value);
    const sobrenome = limpo($('#en-dados-sobrenome').value);
    const email = $('#en-dados-email').value.trim();
    if (!trava && nome.length < 2) { mostrarErro('#en-dados-erro', 'Coloca pelo menos o seu primeiro nome.'); $('#en-dados-nome').focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { mostrarErro('#en-dados-erro', 'Esse e-mail parece incompleto.'); $('#en-dados-email').focus(); return; }
    if (!trava) { u.nome = capitalizar(nome); u.sobrenome = capitalizar(sobrenome, true); }
    u.email = email;
    salvar();
    preencherConta();
    fecharFolha();
    avisar('Dados salvos.');
  });
  $('#en-dados-form').addEventListener('input', () => { $('#en-dados-erro').hidden = true; });

  /* ---------- termos e privacidade ---------- */
  function abrirTermos(b) {
    const P = window.Drink.util.PRECO;
    $('#en-termos-preco').textContent = `Você vê o valor antes de pedir: ${brl(P.saida)} de saída mais ${brl(P.km)} por km da rota. `
      + `Das 0h às 5h vale a bandeira 2 (mais ${Math.round(P.madrugada * 100)}%). Os primeiros ${P.esperaGratis} minutos depois que o motorista chega são grátis; `
      + `depois, ${brl(P.espera)} a cada ${P.esperaBloco} minutos começados. A gorjeta é opcional.`;
    abaTermos('uso');
    abrirFolha('en-termos', b);
  }
  function abaTermos(aba) {
    $$('#en-termos [data-termos]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.termos === aba)));
    $('#en-termos-uso').hidden = aba !== 'uso';
    $('#en-termos-privacidade').hidden = aba !== 'privacidade';
    $('#en-termos').scrollTop = 0;
  }

  /* ---------- apagar a conta (tudo dela sai deste aparelho) ---------- */
  const emCorrida = () => (passageiro && passageiro.corridaAtiva()) || (motorista && motorista.corridaAtiva());
  const dirige = (u) => Boolean(u.motoristaOk || u.papel === 'motorista' || u.docs || u.selfie);
  function pedirApagar(b) {
    fecharFolha(false);
    const u = eu();
    if (!u) return;
    if (emCorrida()) { avisar('Tem uma corrida acontecendo. Termina ela antes de apagar a conta.'); return; }
    $('#en-apagar-txt').textContent = `Somem deste aparelho o seu cadastro (+55 ${formatarCel(u.celular)}), o carro e a placa, os lugares salvos, os contatos de confiança e o histórico de voltas`
      + `${dirige(u) ? ', e também os documentos, a selfie, as fotos da vistoria, a chave Pix e os ganhos' : ''}. Para usar o Drink de novo, é só criar outra conta.`;
    abrirFolha('en-apagar', b);
  }
  async function apagarConta() {
    const u = eu();
    fecharFolha(false);
    if (!u) return;
    if (emCorrida()) { avisar('Tem uma corrida acontecendo. Termina ela antes de apagar a conta.'); return; }
    const cel = u.celular;
    const eraMotorista = dirige(u);
    if (passageiro) passageiro.sair();
    if (motorista) motorista.sair();
    try { await cadastro.apagarArquivos(cel); } catch (e) { /* sem banco de arquivos: não havia foto guardada */ }
    if (eraMotorista) {
      try { Object.keys(localStorage).filter((k) => k.startsWith('drink-vistoria-')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* segue */ }
    }
    try { AVISOS.definir('motorista', []); AVISOS.definir('passageiro', []); } catch (e) { /* sem avisos */ }
    delete banco.usuarios[cel];
    banco.atual = null;
    salvar();
    voltarParaBoas('Conta apagada. Nada dela ficou neste aparelho.');
  }

  /* ---------- acompanhar a volta de alguém pelo link ---------- */
  function abrirAcompanhar(id, chave) {
    abertura.hidden = true;
    const t = tela('acompanhar');
    mostrar(t, null);
    cor(COR.noite);
    if (!/^[\w-]{16,32}$/.test(id) || !/^[\w-]{40,50}$/.test(chave)) {
      $('#ac-vivo').textContent = 'Link incompleto';
      $('#ac-t').textContent = 'Esse link veio pela metade';
      $('#ac-txt').textContent = 'Pede pra pessoa mandar o link da viagem de novo, inteiro.';
      return;
    }
    window.Drink.Passageiro.acompanhar(t, id, chave);
  }

  /* ---------- folhas da conta: menu do motorista e instalar ---------- */
  const veu = $('#en-veu');
  let folha = null;
  let origemFolha = null;
  let soltarFolha = null;
  function abrirFolha(id, origem) {
    fecharFolha(false);
    folha = $(`#${id}`);
    origemFolha = origem || null;
    veu.hidden = false;
    folha.hidden = false;
    soltarFolha = window.Drink.servicos.prenderFoco(folha);
    $('h4', folha).focus({ preventScroll: true });
  }
  function fecharFolha(foco = true) {
    if (!folha) return;
    folha.hidden = true;
    veu.hidden = true;
    folha = null;
    if (soltarFolha) { soltarFolha(foco && !origemFolha); soltarFolha = null; }
    if (foco && origemFolha && !origemFolha.closest('[hidden]')) origemFolha.focus({ preventScroll: true });
    origemFolha = null;
  }
  veu.addEventListener('click', () => fecharFolha());

  /* ---------- cadastro de motorista: selfie, documentos e treino ---------- */
  const cadastro = window.Drink.cadastroMotorista.criar({ eu, salvar, avisar, abrirFolha, fecharFolha });

  /* ---------- instalar na tela de início ---------- */
  let pedidoInstalar = null;
  const instalado = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const ehIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const deToque = window.matchMedia('(pointer: coarse)').matches;
  function mostrarInstalar() {
    const pode = !instalado() && (Boolean(pedidoInstalar) || ehIOS || deToque);
    $$('[data-instalar]').forEach((el) => { el.hidden = !pode; });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedidoInstalar = e;
    mostrarInstalar();
  });
  window.addEventListener('appinstalled', () => {
    pedidoInstalar = null;
    mostrarInstalar();
    avisar('Pronto! O Drink está na sua tela de início.');
  });
  function instalar(origem) {
    if (pedidoInstalar) {
      const pedido = pedidoInstalar;
      pedidoInstalar = null;
      pedido.prompt();
      pedido.userChoice.then((r) => { if (r && r.outcome === 'accepted') avisar('Instalando o Drink…'); }).catch(() => {}).then(mostrarInstalar);
      return;
    }
    $('#en-inst-ios').hidden = !ehIOS;
    $('#en-inst-outro').hidden = ehIOS;
    abrirFolha('en-instalar', origem);
  }

  /* ---------- toques ---------- */
  const ACOES = {
    criar: () => comecarConta('criar'),
    entrar: () => comecarConta('entrar'),
    voltar: () => voltar(),
    reenviar: () => { enviarCodigo(); avisar('Código novo a caminho.'); },
    'sem-codigo': seguirSemCodigo,
    papel: (b) => escolherPapel(b.dataset.papel),
    doc: (b) => cadastro.abrirDoc(b.dataset.doc, b),
    dirigir: comecarADirigir,
    'virar-motorista': virarMotorista,
    treinar: treinarMotorista,
    'virar-passageiro': virarPassageiro,
    'trocar-veiculo': trocarVeiculo,
    'editar-pix': (b) => editarPix('', b),
    avisos: (b) => ligarAvisos(b),
    menu: (b) => { preencherConta(); abrirFolha('en-menu', b); },
    instalar: (b) => instalar(b),
    fechar: () => fecharFolha(),
    sair: sairDaConta,
    termos: (b) => abrirTermos(b),
    dados: (b) => abrirDados(b),
    apagar: (b) => pedirApagar(b),
    'apagar-sim': apagarConta,
  };
  app.addEventListener('click', (e) => {
    const v = e.target.closest('[data-veiculo]');
    if (v && app.contains(v)) { escolherVeiculo(v.dataset.veiculo); return; }
    const aba = e.target.closest('[data-termos]');
    if (aba && app.contains(aba)) { abaTermos(aba.dataset.termos); return; }
    const b = e.target.closest('[data-app]');
    if (!b || !app.contains(b) || b.disabled) return;
    const acao = ACOES[b.dataset.app];
    if (acao) acao(b);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && folha && !e.defaultPrevented) { e.preventDefault(); fecharFolha(); }
  });

  /* ---------- voltar (o botão do Android, o gesto e o do navegador) ---------- */
  function voltar() {
    if (folha) { fecharFolha(); return true; }
    const en = vista && vista.dataset.en;
    if (en === 'celular') { irEn('boas', { anim: 'volta' }); return true; }
    if (en === 'codigo' || en === 'nome') { irEn('celular', { anim: 'volta' }); return true; }
    if (en === 'mot-cad') {
      if (origemCadastro === 'passageiro' && eu()) abrirPassageiro('volta', 'perfil'); else irEn('papel', { anim: 'volta' });
      return true;
    }
    if (vista === modos.passageiro && passageiro) return passageiro.voltar();
    if (vista === modos.motorista && motorista) return motorista.voltar();
    return false;
  }

  // uma entrada a mais no histórico segura o voltar dentro do app (só depois do primeiro toque)
  let guarda = false;
  function armar() {
    if (guarda) return;
    try { history.pushState({ drink: true }, ''); guarda = true; } catch (e) { /* sem histórico */ }
  }
  app.addEventListener('click', armar, true);
  app.addEventListener('keydown', armar, true);
  window.addEventListener('popstate', () => {
    guarda = false;
    if (voltar()) armar();
    else avisar('Toca em voltar de novo para sair do Drink.');
  });

  /* ---------- funciona sem internet depois da primeira visita ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  /* ---------- folhas: arrastar para baixo fecha, como nos apps do iPhone ---------- */
  function arrastarParaFechar(folha) {
    // a alça lá em cima (e o cabeçalho) seguram o dedo sem rolar a folha
    const alca = document.createElement('div');
    alca.className = 'd-alca';
    alca.setAttribute('aria-hidden', 'true');
    folha.prepend(alca);
    let ativo = false;
    let id = null;
    let y0 = 0;
    let t0 = 0;
    let dy = 0;
    folha.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (folha.scrollTop > 0 || e.clientY - folha.getBoundingClientRect().top > 76) return;
      if (e.target.closest('button, a, input, select, textarea')) return;
      ativo = true;
      id = e.pointerId;
      y0 = e.clientY;
      t0 = performance.now();
      dy = 0;
    });
    folha.addEventListener('pointermove', (e) => {
      if (!ativo || e.pointerId !== id) return;
      dy = Math.max(0, e.clientY - y0);
      if (dy > 3) { folha.style.transition = 'none'; folha.style.transform = `translateY(${dy}px)`; }
    });
    const soltar = (e) => {
      if (!ativo || e.pointerId !== id) return;
      ativo = false;
      const rapido = dy / Math.max(1, performance.now() - t0) > 0.6;
      folha.style.transition = reduzirMovimento() ? 'none' : 'transform .2s ease-out';
      if (dy > 90 || (dy > 28 && rapido)) {
        folha.style.transform = 'translateY(105%)';
        setTimeout(() => {
          const bt = $('[data-rp-fechar], [data-rm-fechar], [data-app="fechar"]', folha);
          if (bt) bt.click();
          folha.style.transition = '';
          folha.style.transform = '';
        }, reduzirMovimento() ? 0 : 190);
      } else {
        folha.style.transform = '';
        setTimeout(() => { folha.style.transition = ''; }, 220);
      }
    };
    folha.addEventListener('pointerup', soltar);
    folha.addEventListener('pointercancel', soltar);
  }
  $$('.d-sobre').forEach(arrastarParaFechar);

  /* ---------- teclado do iPhone: ao fechar, a tela volta para o lugar (senão os toques saem deslocados) ---------- */
  const campo = (el) => Boolean(el && el.matches && el.matches('input, textarea, select'));
  document.addEventListener('focusout', (e) => {
    if (!campo(e.target)) return;
    setTimeout(() => { if (!campo(document.activeElement) && (window.scrollY || document.documentElement.scrollTop)) window.scrollTo(0, 0); }, 80);
  });

  /* ---------- erro inesperado: avisa na tela em vez de o app parecer travado ---------- */
  let ultimaFalha = 0;
  function avisarFalha(motivo) {
    if (Date.now() - ultimaFalha < 5000) return;
    ultimaFalha = Date.now();
    avisar(`Deu um erro aqui (${String(motivo).slice(0, 90)}). Se o app não responder, fecha e abre de novo.`);
  }
  window.addEventListener('error', (e) => {
    if (e.filename && !e.filename.includes('/drink/')) return;
    avisarFalha(e.message || 'erro');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const txt = String((r && r.message) || r || '');
    // falta de internet já tem aviso próprio em cada tela
    if (!r || r.name === 'AbortError' || /fetch|network|load failed|conex/i.test(txt)) return;
    avisarFalha(txt);
  });

  /* ---------- começo ---------- */
  const busca = new URLSearchParams(location.search);
  if (busca.get('acompanhar')) {
    abrirAcompanhar(busca.get('acompanhar'), location.hash.slice(1));
    return;
  }
  // o convite de um evento (o QR da mesa): fica guardado e o app abre no passageiro, com o embarque no evento
  let avisoConvite = '';
  let convite = null;
  if (busca.get('evento')) {
    const Ev = window.Drink.Eventos;
    convite = Ev.lerConvite(busca.get('evento'), location.hash.slice(1));
    if (!convite) avisoConvite = 'Esse convite veio pela metade. Pede o QR de novo para quem organiza.';
    else if (Ev.situacao(convite) === 'acabou') { avisoConvite = `O ${convite.nome} já acabou.`; convite = null; }
    else { Ev.guardarConvite(convite); avisoConvite = `Convite do ${convite.nome} guardado. Na hora de ir embora, é só pedir.`; }
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ }
  }
  const u = eu();
  if (u && convite && u.papel !== 'passageiro' && !u.corridaMotorista) { u.papel = 'passageiro'; salvar(); }
  if (avisoConvite) setTimeout(() => avisar(u || !convite ? avisoConvite : `Convite do ${convite.nome} guardado. Entra com o seu celular para pedir a volta.`), 2600);
  // voltas de teste de versões antigas do app não contam mais
  if (u && Array.isArray(u.voltas) && u.voltas.some((v) => v.simulada)) { u.voltas = u.voltas.filter((v) => !v.simulada); salvar(); }
  const pedidoPapel = busca.get('papel');
  if (u && (pedidoPapel === 'passageiro' || pedidoPapel === 'motorista')) {
    u.papel = pedidoPapel;
    salvar();
  }
  // o site manda quem quer dirigir direto para o treino (?treino=motorista), com ou sem conta
  if (busca.get('treino') === 'motorista') querTreino = true;
  if (busca.get('aba') === 'eventos') querEventos = true;
  if (pedidoPapel || busca.has('treino') || busca.has('aba')) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ } }
  mostrarInstalar();
  window.Drink.avisos.sincronizar();
  try {
    if (u) entrarNoApp(u, null);
    else {
      mostrar(tela('boas'), null);
      tela('boas').classList.add('voando');
      if (querTreino) setTimeout(() => avisar('Para treinar como motorista, cria a sua conta. O treino começa logo depois, sem pedir CNH.'), 2600);
      else if (querEventos) setTimeout(() => avisar('Para criar o seu evento, cria a sua conta. A aba Eventos abre logo depois.'), 2600);
    }
  } catch (e) {
    // se abrir a conta falhar, a abertura sai do mesmo jeito e o erro aparece
    setTimeout(() => avisarFalha(e.message || e), 2500);
  }
  abrir(Boolean(u));
}());
