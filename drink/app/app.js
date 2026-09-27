/* Drink — o app. Abertura, boas-vindas, cadastro e login com código por SMS, escolha entre passageiro e motorista,
   cadastro de motorista com a chave Pix e os dois apps de verdade (passageiro.js e motorista.js), com mapa, GPS
   e as corridas passando de um celular para o outro. A conta fica salva só no aparelho.
   Animações acontecem uma vez e param. */
(function () {
  'use strict';

  const { $, $$, reduzirMovimento, brl } = window.Drink.util;
  const PIX = window.Drink.pix;
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
  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
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
    esconderSms();
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
      $$('#en-docs li').forEach((li) => { li.classList.remove('vendo', 'ok'); $('em', li).textContent = 'pendente'; });
      const bt = $('#en-verificar');
      bt.disabled = false;
      bt.textContent = 'Enviar documentos';
      bt.dataset.app = 'verificar';
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

  function comecarConta(modo) {
    fluxo.modo = modo;
    $('#cel-t').textContent = modo === 'criar' ? 'Qual é o seu celular?' : 'Entra com o seu celular';
    $('#cel-sub').textContent = modo === 'criar'
      ? 'A gente manda um código por SMS pra confirmar que é você.'
      : 'O mesmo número do cadastro. A gente manda um código por SMS.';
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
    irEn('codigo');
    enviarCodigo();
  });

  // o código: por SMS de verdade (Firebase, 6 números) ou, sem o Firebase ligado, na própria tela (4 números)
  const SMS = window.Drink.sms;
  const codIn = $('#en-cod-in');
  const codCaixa = $('#en-cod');
  const codBt = $('#en-cod-bt');
  const sms = $('#en-sms');
  let caixas = $$('.en-cod-caixa', codCaixa);
  let tamanho = 4;

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
    $('#en-cod-qtd').textContent = `${n} números`;
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
  async function enviarCodigo() {
    const envio = (fluxo.envio || 0) + 1;
    fluxo.envio = envio;
    $('#en-cel-txt').textContent = `+55 ${formatarCel(fluxo.celular)}`;
    codIn.value = '';
    codCaixa.classList.remove('certo', 'erro');
    $('#en-cod-erro').hidden = true;
    montarCaixas(SMS.digitos());
    desenharCodigo();
    if (!SMS.ativo()) {
      // sem SMS de verdade: o código aparece na tela, como um SMS
      fluxo.codigo = String(1000 + Math.floor(Math.random() * 9000));
      agendar(mostrarSms, 1300);
      contarReenvio(20);
      return;
    }
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
  function mostrarSms() {
    $('#en-sms-cod').textContent = fluxo.codigo;
    sms.classList.remove('saindo');
    sms.hidden = false;
    agendar(esconderSms, 9000);
  }
  function esconderSms() {
    if (sms.hidden || sms.classList.contains('saindo')) return;
    if (reduzirMovimento()) { sms.hidden = true; return; }
    sms.classList.add('saindo');
    setTimeout(() => { sms.hidden = true; sms.classList.remove('saindo'); }, 300);
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
    esconderSms();
    agendar(depoisDoCodigo, 600);
  }
  function codigoErrado(motivo) {
    codCaixa.classList.remove('erro');
    void codCaixa.offsetWidth;
    codCaixa.classList.add('erro');
    mostrarErro('#en-cod-erro', motivo || 'Código errado. Confere no SMS e tenta de novo.');
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
  function usarSms() {
    if (SMS.ativo()) return;
    codCaixa.classList.remove('erro');
    $('#en-cod-erro').hidden = true;
    codIn.value = fluxo.codigo;
    desenharCodigo();
    esconderSms();
    conferir();
  }
  if (SMS.ativo()) $('#en-cel-nota').textContent = 'A gente manda um SMS de verdade com o código. Protegido pelo reCAPTCHA do Google.';

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

  function entrarNoApp(u, anim) {
    if (!u.papel) { $('#en-ok-txt').textContent = `Oi, ${primeiro(u)}`; irEn('papel', { anim }); return; }
    if (u.papel === 'motorista' && !u.motoristaOk) { origemCadastro = 'papel'; irEn('mot-cad', { anim }); return; }
    if (u.papel === 'motorista') abrirMotorista(anim); else abrirPassageiro(anim);
  }

  function escolherPapel(papel) {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    if (papel === 'motorista' && !u.motoristaOk) { origemCadastro = 'papel'; irEn('mot-cad'); return; }
    u.papel = papel;
    salvar();
    entrarNoApp(u, 'entra');
    if (papel === 'passageiro') avisar(`Tudo pronto, ${primeiro(u)}! Bebeu? Pede um Drink.`);
  }

  function escolherVeiculo(v) {
    veiculoCadastro = v;
    $$('[data-veiculo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.veiculo === v)));
  }

  function verificar() {
    const pix = lerPix('#en-pix-tipo', '#en-pix-chave', '#en-pix-erro');
    if (!pix) return;
    const u = eu();
    if (u) { u.pix = pix; salvar(); }
    const bt = $('#en-verificar');
    const itens = $$('#en-docs li');
    const passo = 520;
    bt.disabled = true;
    bt.textContent = 'Verificando os documentos';
    itens.forEach((li, i) => {
      agendar(() => { li.classList.add('vendo'); $('em', li).textContent = 'verificando'; }, i * passo);
      agendar(() => { li.classList.add('ok'); $('em', li).textContent = 'aprovado'; }, i * passo + passo);
    });
    agendar(() => {
      bt.disabled = false;
      bt.textContent = 'Começar a dirigir';
      bt.dataset.app = 'dirigir';
      avisar('Documentos aprovados na hora: essa parte ainda é de mentirinha.');
    }, itens.length * passo + 250);
  }

  function comecarADirigir() {
    const u = eu();
    if (!u) { irEn('boas'); return; }
    const pix = lerPix('#en-pix-tipo', '#en-pix-chave', '#en-pix-erro');
    if (!pix) return;
    u.pix = pix;
    u.motoristaOk = true;
    u.papel = 'motorista';
    u.veiculo = veiculoCadastro;
    salvar();
    abrirMotorista('entra');
    avisar(`Bem na hora, ${primeiro(u)}! Fica online quando quiser.`);
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
    if (!motorista) motorista = window.Drink.Motorista.criar({ raiz: modos.motorista, ...opcoes(), editarPix: (msg) => editarPix(msg) });
    return motorista;
  }

  function preencherConta() {
    const u = eu();
    if (!u) return;
    const nome = [u.nome, u.sobrenome].filter(Boolean).join(' ');
    $$('[data-en-nome]').forEach((el) => { el.textContent = nome; });
    $$('[data-en-primeiro]').forEach((el) => { el.textContent = primeiro(u); });
    $$('[data-en-iniciais]').forEach((el) => { el.textContent = iniciais(nome); });
    $$('[data-en-fone]').forEach((el) => { el.textContent = `+55 ${formatarCel(u.celular)}`; });
    if (u.dia !== hoje()) { u.dia = hoje(); u.ganhos = 0; u.viagens = 0; salvar(); }
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
    if (u.motoristaOk) {
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
    limparFormularios();
    const boas = tela('boas');
    boas.classList.remove('entrou', 'voando', 'pousou');
    boas.classList.add('sem-voo');
    irEn('boas', { anim: null });
    void boas.offsetWidth;
    boas.classList.add('entrou', 'pousou');
    avisar('Você saiu da conta. Até a próxima!');
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
  function abrirFolha(id, origem) {
    fecharFolha(false);
    folha = $(`#${id}`);
    origemFolha = origem || null;
    veu.hidden = false;
    folha.hidden = false;
    $('h4', folha).focus({ preventScroll: true });
  }
  function fecharFolha(foco = true) {
    if (!folha) return;
    folha.hidden = true;
    veu.hidden = true;
    folha = null;
    if (foco && origemFolha && !origemFolha.closest('[hidden]')) origemFolha.focus({ preventScroll: true });
    origemFolha = null;
  }
  veu.addEventListener('click', () => fecharFolha());

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
    'usar-sms': usarSms,
    papel: (b) => escolherPapel(b.dataset.papel),
    verificar,
    dirigir: comecarADirigir,
    'virar-motorista': virarMotorista,
    'virar-passageiro': virarPassageiro,
    'trocar-veiculo': trocarVeiculo,
    'editar-pix': (b) => editarPix('', b),
    avisos: (b) => ligarAvisos(b),
    menu: (b) => { preencherConta(); abrirFolha('en-menu', b); },
    instalar: (b) => instalar(b),
    fechar: () => fecharFolha(),
    sair: sairDaConta,
  };
  app.addEventListener('click', (e) => {
    const v = e.target.closest('[data-veiculo]');
    if (v && app.contains(v)) { escolherVeiculo(v.dataset.veiculo); return; }
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
    if (!sms.hidden) esconderSms();
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
  const u = eu();
  const pedidoPapel = busca.get('papel');
  if (u && (pedidoPapel === 'passageiro' || pedidoPapel === 'motorista')) {
    u.papel = pedidoPapel;
    salvar();
  }
  if (pedidoPapel) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ } }
  mostrarInstalar();
  window.Drink.avisos.sincronizar();
  try {
    if (u) entrarNoApp(u, null);
    else {
      mostrar(tela('boas'), null);
      tela('boas').classList.add('voando');
    }
  } catch (e) {
    // se abrir a conta falhar, a abertura sai do mesmo jeito e o erro aparece
    setTimeout(() => avisarFalha(e.message || e), 2500);
  }
  abrir(Boolean(u));
}());
