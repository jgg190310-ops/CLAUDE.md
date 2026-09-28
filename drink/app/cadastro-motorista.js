/* Drink — o cadastro de quem dirige, de verdade: selfie tirada com a câmera (é o rosto que o passageiro vê),
   CPF e CNH conferidos (dígitos, idade, categoria, validade, tempo de habilitação e EAR), foto da CNH, a certidão
   de antecedentes da Polícia Federal e um treino com perguntas. Os arquivos ficam guardados neste celular. */
(function () {
  'use strict';

  const { $, $$, esc } = window.Drink.util;
  const digitos = (s) => String(s || '').replace(/\D/g, '');

  /* ---------- conferências ---------- */
  function cpfValido(valor) {
    const d = digitos(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (n) => {
      let soma = 0;
      for (let i = 0; i < n; i += 1) soma += Number(d[i]) * (n + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  // número de registro da CNH (11 dígitos, os dois últimos conferem os nove primeiros)
  function cnhValida(valor) {
    const d = digitos(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    let soma = 0;
    for (let i = 0, j = 9; i < 9; i += 1, j -= 1) soma += Number(d[i]) * j;
    let dv1 = soma % 11;
    let desconto = 0;
    if (dv1 >= 10) { dv1 = 0; desconto = 2; }
    soma = 0;
    for (let i = 0, j = 1; i < 9; i += 1, j += 1) soma += Number(d[i]) * j;
    const x = soma % 11;
    const dv2 = x >= 10 ? 0 : x - desconto;
    return `${dv1}${dv2}` === d.slice(9);
  }
  const CATEGORIAS = ['B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'];
  const data = (iso) => { const [a, m, d] = String(iso || '').split('-').map(Number); return a && m && d ? new Date(a, m - 1, d) : null; };
  function anosAte(inicio, fim = new Date()) {
    let anos = fim.getFullYear() - inicio.getFullYear();
    if (fim.getMonth() < inicio.getMonth() || (fim.getMonth() === inicio.getMonth() && fim.getDate() < inicio.getDate())) anos -= 1;
    return anos;
  }
  const formatarCpf = (v) => {
    const d = digitos(v).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  };
  const dataBR = (iso) => { const d = data(iso); return d ? d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : ''; };

  // a CNH vale para dirigir o carro de outra pessoa por dinheiro?
  function conferirCnh(f) {
    const hoje = new Date();
    if (!cpfValido(f.cpf)) return 'Esse CPF não confere. Confere os 11 números.';
    const nasc = data(f.nascimento);
    if (!nasc || nasc > hoje) return 'Coloca a sua data de nascimento.';
    if (anosAte(nasc) < 21) return 'Para dirigir com o Drink é preciso ter 21 anos ou mais.';
    if (!cnhValida(f.numero)) return 'Esse número de registro da CNH não confere. São 11 números, no campo "Nº registro".';
    if (!CATEGORIAS.includes(f.categoria)) return 'A CNH precisa ser categoria B ou mais (AB, C, D, E): é com ela que você dirige carro.';
    const val = data(f.validade);
    if (!val) return 'Coloca a validade da CNH.';
    if (val < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) return 'Essa CNH está vencida. Renova no Detran e volta aqui.';
    const pri = data(f.primeira);
    if (!pri || pri > hoje || pri < nasc) return 'Coloca a data da 1ª habilitação, que está na CNH.';
    if (anosAte(pri) < 2) return 'É preciso ter habilitação há pelo menos 2 anos (sem ser a provisória).';
    if (!f.ear) return 'A CNH precisa ter a observação EAR (exerce atividade remunerada). Dá para incluir no Detran.';
    if (!f.foto) return 'Falta a foto da CNH aberta, com tudo legível.';
    return '';
  }

  /* ---------- fotos e arquivos ---------- */
  function lerImagem(arquivo) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem')); };
      img.src = url;
    });
  }
  // reduz a foto; quadrada, recorta o meio (a selfie)
  function reduzir(img, { lado, quadrada = false, qualidade = 0.8 }) {
    const tela = document.createElement('canvas');
    let sx = 0; let sy = 0; let sw = img.naturalWidth; let sh = img.naturalHeight;
    if (quadrada) {
      const m = Math.min(sw, sh);
      sx = (sw - m) / 2;
      sy = Math.max(0, (sh - m) / 2 - m * 0.08);
      sw = m; sh = m;
    }
    const escala = Math.min(1, lado / Math.max(sw, sh));
    tela.width = Math.round(sw * escala);
    tela.height = Math.round(sh * escala);
    tela.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, tela.width, tela.height);
    return tela.toDataURL('image/jpeg', qualidade);
  }
  const blobDe = (url) => fetch(url).then((r) => r.blob());
  function base() {
    return new Promise((ok, falha) => {
      if (!('indexedDB' in window)) { falha(new Error('sem banco')); return; }
      const r = indexedDB.open('drink-arquivos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('arquivos');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => falha(r.error);
    });
  }
  async function guardarArquivo(chave, blob) {
    const db = await base();
    await new Promise((ok, falha) => {
      const t = db.transaction('arquivos', 'readwrite');
      t.objectStore('arquivos').put(blob, chave);
      t.oncomplete = ok;
      t.onerror = () => falha(t.error);
    });
    db.close();
  }
  // apagar a conta: a foto da CNH e a certidão saem do aparelho junto
  async function apagarArquivos(celular) {
    const db = await base();
    await new Promise((ok, falha) => {
      const t = db.transaction('arquivos', 'readwrite');
      const loja = t.objectStore('arquivos');
      loja.delete(`${celular}:cnh`);
      loja.delete(`${celular}:antecedentes`);
      t.oncomplete = ok;
      t.onerror = () => falha(t.error);
    });
    db.close();
  }

  /* ---------- treino ---------- */
  const LICOES = [
    ['i-escudo', 'A chave só depois do código', 'Chegou no passageiro? Pede os 4 números do código de segurança e digita no app. A chave só vem para a sua mão quando o celular dele confirmar que é você.'],
    ['i-camera', 'Vistoria antes de ligar o carro', 'Tira as 5 fotos pelo app: frente, traseira, os dois lados e o painel com km e combustível. Elas protegem você e o passageiro.'],
    ['i-bike', 'Bike ou patinete sem arranhar nada', 'Estende a capa no porta-malas, dobra com calma e acomoda sem forçar a tampa. Nada solto lá dentro.'],
    ['i-carro', 'Direção de quem cuida', 'Velocidade da via, cinto nos dois e celular só no suporte. Quem bebeu pode passar mal: janela aberta e parada segura se precisar.'],
    ['i-casa', 'Carro na garagem, chave na mão', 'Estaciona onde o passageiro pedir, devolve a chave na mão dele e recebe o Pix direto na sua chave. Confere no seu banco antes de encerrar.'],
  ];
  const PERGUNTAS = [
    ['O passageiro já te entregou a chave, mas você ainda não digitou o código. O que você faz?',
      ['Dirige: se ele entregou, está tudo certo', 'Pede o código e só fica com a chave depois que o app confirmar', 'Liga para o passageiro para confirmar o endereço'], 1,
      'O código é o que prova que você é o Drink certo. Sem ele confirmado no app, nada de chave.'],
    ['Quando você tira as fotos da vistoria?',
      ['Antes de ligar o carro', 'Quando chega no destino', 'Só se o carro tiver algum arranhão'], 0,
      'As fotos antes de sair registram como o carro estava. Protegem você e o passageiro.'],
    ['No caminho, o passageiro pede para você ir mais rápido. E aí?',
      ['Acelera um pouco para agradar', 'Segue na velocidade da via e explica com calma', 'Encosta e cancela a corrida'], 1,
      'Segurança primeiro. Explica com calma: você está cuidando dele e do carro.'],
    ['Chegou no destino. Qual é o último passo?',
      ['Deixa a chave no painel e vai embora', 'Devolve a chave na mão do passageiro e confere o Pix', 'Leva a chave e devolve no dia seguinte'], 1,
      'A chave volta na mão do passageiro, e você confere no banco se o Pix caiu.'],
  ];

  function criar(op) {
    const { eu, salvar, avisar } = op;
    const docs = () => { const u = eu(); u.docs = u.docs || {}; return u.docs; };

    /* ---------- situação de cada parte ---------- */
    function situacao(u) {
      const d = (u && u.docs) || {};
      return {
        selfie: Boolean(u && u.selfie && u.selfieEnvio),
        cnh: Boolean(d.cnh && !conferirCnh({ ...d.cnh, cpf: d.cpf, nascimento: d.nascimento, foto: d.cnh.foto })),
        antecedentes: Boolean(d.antecedentes && d.antecedentes.nome),
        treino: Boolean(d.treino && d.treino.t),
        pix: Boolean(u && u.pix && u.pix.chave),
      };
    }
    const completo = (u) => Object.values(situacao(u)).every(Boolean);
    const NOMES = { selfie: 'a selfie', pix: 'a chave Pix', cnh: 'a CNH', antecedentes: 'a certidão de antecedentes', treino: 'o treino' };
    function faltando(u, semPix) {
      const s = situacao(u);
      return Object.keys(NOMES).filter((k) => !s[k] && !(semPix && k === 'pix')).map((k) => NOMES[k]);
    }

    function desenhar() {
      const u = eu();
      if (!u) return;
      const s = situacao(u);
      const d = u.docs || {};
      const foto = $('#en-selfie-foto');
      foto.style.backgroundImage = u.selfie ? `url("${u.selfie}")` : '';
      foto.classList.toggle('com-foto', Boolean(u.selfie));
      $('#en-selfie').classList.toggle('ok', s.selfie);
      $('#en-selfie-t').textContent = s.selfie ? 'Selfie pronta' : 'Tirar uma selfie';
      $('#en-selfie-sub').textContent = s.selfie ? 'Toca para tirar outra. É a foto que o passageiro vê quando você aceita a corrida.' : 'De frente, sem óculos escuros e sem boné. É a foto que o passageiro vê quando você aceita a corrida.';
      const sub = {
        cnh: s.cnh ? `Categoria ${d.cnh.categoria} com EAR · válida até ${dataBR(d.cnh.validade)}` : 'Categoria B ou mais, com EAR',
        antecedentes: s.antecedentes ? `Certidão anexada · ${esc(String(d.antecedentes.nome).slice(0, 28))}` : 'Certidão da Polícia Federal, de graça',
        treino: s.treino ? 'Concluído · 4 de 4 perguntas' : '5 minutos: código, vistoria, dobra e direção',
      };
      ['cnh', 'antecedentes', 'treino'].forEach((k) => {
        $(`[data-doc-sub="${k}"]`).innerHTML = sub[k];
        $(`[data-doc-em="${k}"]`).textContent = s[k] ? 'ok' : 'pendente';
        $(`[data-doc="${k}"]`).classList.toggle('ok', s[k]);
      });
      const falta = faltando(u, true);
      const lista = falta.join(', ').replace(/, ([^,]*)$/, ' e $1');
      $('#en-falta').textContent = falta.length ? `${falta.length > 1 ? 'Faltam' : 'Falta'} ${lista}.` : 'Tudo certo. Confere a chave Pix e bora.';
    }

    /* ---------- selfie ---------- */
    async function selfie(arquivo) {
      if (!arquivo) return;
      if (!/^image\//.test(arquivo.type || 'image/')) { avisar('Isso não é uma foto. Tira uma selfie pela câmera.'); return; }
      try {
        const img = await lerImagem(arquivo);
        if (Math.min(img.naturalWidth, img.naturalHeight) < 200) { avisar('Essa foto ficou pequena demais. Tira de novo, mais perto.'); return; }
        const u = eu();
        u.selfie = reduzir(img, { lado: 320, quadrada: true, qualidade: 0.82 });
        u.selfieEnvio = reduzir(img, { lado: 144, quadrada: true, qualidade: 0.72 });
        salvar();
        desenhar();
        avisar('Selfie guardada. É assim que o passageiro vai te ver.');
      } catch (e) {
        avisar('Não deu pra ler essa foto. Tira de novo.');
      }
    }

    /* ---------- CNH e CPF ---------- */
    let fotoCnh = null;
    function abrirCnh(origem) {
      const d = docs();
      const c = d.cnh || {};
      $('#en-cpf').value = d.cpf ? formatarCpf(d.cpf) : '';
      $('#en-nasc').value = d.nascimento || '';
      $('#en-cnh-num').value = c.numero || '';
      $('#en-cnh-cat').value = c.categoria || 'B';
      $('#en-cnh-val').value = c.validade || '';
      $('#en-cnh-pri').value = c.primeira || '';
      $('#en-cnh-ear').checked = Boolean(c.ear);
      fotoCnh = null;
      mostrarFotoCnh(c.foto ? 'Foto guardada neste celular. Toca para trocar.' : '');
      $('#en-cnh-erro').hidden = true;
      op.abrirFolha('en-cnh', origem);
    }
    function mostrarFotoCnh(txt, url) {
      const ver = $('#en-cnh-foto-ver');
      ver.style.backgroundImage = url ? `url("${url}")` : '';
      ver.classList.toggle('com-foto', Boolean(url));
      const bt = $('#en-cnh-foto-bt');
      bt.classList.toggle('ok', Boolean(txt));
      $('#en-cnh-foto-sub').textContent = txt || 'Frente, fora do plástico, com tudo legível';
    }
    async function fotoDaCnh(arquivo) {
      if (!arquivo) return;
      try {
        const img = await lerImagem(arquivo);
        if (Math.max(img.naturalWidth, img.naturalHeight) < 500) { mostrarErro('#en-cnh-erro', 'A foto da CNH ficou pequena demais. Tira de novo, mais perto.'); return; }
        fotoCnh = reduzir(img, { lado: 1400, qualidade: 0.8 });
        mostrarFotoCnh('Foto pronta. Toca para trocar.', fotoCnh);
        $('#en-cnh-erro').hidden = true;
      } catch (e) {
        mostrarErro('#en-cnh-erro', 'Não deu pra ler essa foto. Tira de novo.');
      }
    }
    function mostrarErro(sel, txt) { const el = $(sel); el.textContent = txt; el.hidden = false; }
    async function salvarCnh() {
      const d = docs();
      const u = eu();
      const f = {
        cpf: digitos($('#en-cpf').value), nascimento: $('#en-nasc').value, numero: digitos($('#en-cnh-num').value),
        categoria: $('#en-cnh-cat').value, validade: $('#en-cnh-val').value, primeira: $('#en-cnh-pri').value,
        ear: $('#en-cnh-ear').checked, foto: fotoCnh || (d.cnh && d.cnh.foto),
      };
      const erro = conferirCnh(f);
      if (erro) { mostrarErro('#en-cnh-erro', erro); return; }
      let foto = d.cnh && d.cnh.foto;
      if (fotoCnh) {
        foto = { t: Date.now(), guardada: true };
        try { await guardarArquivo(`${u.celular}:cnh`, await blobDe(fotoCnh)); } catch (e) { foto.guardada = false; }
      }
      d.cpf = f.cpf;
      d.nascimento = f.nascimento;
      d.cnh = { numero: f.numero, categoria: f.categoria, validade: f.validade, primeira: f.primeira, ear: true, foto };
      salvar();
      op.fecharFolha();
      desenhar();
      avisar('CNH e CPF conferidos.');
    }

    /* ---------- antecedentes ---------- */
    function abrirAntecedentes(origem) {
      const a = docs().antecedentes;
      $('#en-antec-sub').textContent = a ? `${a.nome} · toca para trocar` : 'PDF ou foto da certidão';
      $('#en-antec-bt').classList.toggle('ok', Boolean(a));
      $('#en-antec-erro').hidden = true;
      op.abrirFolha('en-antec', origem);
    }
    async function certidao(arquivo) {
      if (!arquivo) return;
      const tipo = arquivo.type || '';
      if (!/^(application\/pdf|image\/)/.test(tipo) && !/\.pdf$/i.test(arquivo.name)) { mostrarErro('#en-antec-erro', 'Anexa o PDF da certidão ou uma foto dela.'); return; }
      if (arquivo.size > 12 * 1024 * 1024) { mostrarErro('#en-antec-erro', 'Esse arquivo é grande demais. A certidão da PF tem menos de 1 MB.'); return; }
      if (arquivo.size < 2000) { mostrarErro('#en-antec-erro', 'Esse arquivo parece vazio. Baixa a certidão de novo.'); return; }
      const u = eu();
      let guardada = true;
      try { await guardarArquivo(`${u.celular}:antecedentes`, arquivo); } catch (e) { guardada = false; }
      docs().antecedentes = { nome: String(arquivo.name || 'certidão').slice(0, 60), tipo, tamanho: arquivo.size, t: Date.now(), guardada };
      salvar();
      op.fecharFolha();
      desenhar();
      avisar('Certidão anexada.');
    }

    /* ---------- treino ---------- */
    const treino = { fase: 'licao', i: 0, respondeu: false };
    function abrirTreino(origem) {
      treino.fase = 'licao';
      treino.i = 0;
      treino.respondeu = false;
      desenharTreino();
      op.abrirFolha('en-treino', origem);
    }
    function desenharTreino() {
      const caixa = $('#en-treino-corpo');
      const barra = $('#en-treino-barra');
      if (treino.fase === 'licao') {
        const [ic, t, txt] = LICOES[treino.i];
        barra.style.width = `${((treino.i + 1) / (LICOES.length + PERGUNTAS.length)) * 100}%`;
        caixa.innerHTML = `<p class="en-tr-passo">Lição ${treino.i + 1} de ${LICOES.length}</p>
          <span class="en-tr-ic" aria-hidden="true"><svg><use href="#${ic}"/></svg></span>
          <h5 class="en-tr-t" tabindex="-1">${esc(t)}</h5><p class="en-tr-txt">${esc(txt)}</p>
          <button type="button" class="t-botao" data-treino="seguir">${treino.i < LICOES.length - 1 ? 'Próxima' : 'Fazer as perguntas'}</button>`;
      } else if (treino.fase === 'pergunta') {
        const [p, ops] = PERGUNTAS[treino.i];
        barra.style.width = `${((LICOES.length + treino.i + 1) / (LICOES.length + PERGUNTAS.length)) * 100}%`;
        caixa.innerHTML = `<p class="en-tr-passo">Pergunta ${treino.i + 1} de ${PERGUNTAS.length}</p>
          <h5 class="en-tr-t" tabindex="-1">${esc(p)}</h5>
          <div class="en-tr-ops" role="group">${ops.map((o, k) => `<button type="button" data-treino-op="${k}">${esc(o)}</button>`).join('')}</div>
          <p class="en-tr-porque" id="en-tr-porque" aria-live="polite"></p>
          <button type="button" class="t-botao" data-treino="seguir" hidden>${treino.i < PERGUNTAS.length - 1 ? 'Próxima pergunta' : 'Concluir o treino'}</button>`;
      } else {
        barra.style.width = '100%';
        caixa.innerHTML = `<span class="en-tr-ic en-tr-fim" aria-hidden="true"><svg><use href="#i-check"/></svg></span>
          <h5 class="en-tr-t" tabindex="-1">Treino concluído</h5><p class="en-tr-txt">Acertou as ${PERGUNTAS.length} perguntas. Você já sabe o jeito Drink de cuidar do passageiro e do carro.</p>
          <button type="button" class="t-botao" data-treino="fechar">Voltar ao cadastro</button>`;
      }
      const t = $('.en-tr-t', caixa);
      if (t) t.focus({ preventScroll: true });
    }
    function tocarTreino(b) {
      if (b.dataset.treino === 'fechar') { op.fecharFolha(); desenhar(); return; }
      if (b.dataset.treino === 'seguir') {
        if (treino.fase === 'licao') {
          if (treino.i < LICOES.length - 1) treino.i += 1; else { treino.fase = 'pergunta'; treino.i = 0; }
        } else if (treino.fase === 'pergunta') {
          if (treino.i < PERGUNTAS.length - 1) treino.i += 1;
          else {
            treino.fase = 'fim';
            docs().treino = { t: Date.now(), perguntas: PERGUNTAS.length };
            salvar();
          }
        }
        desenharTreino();
        return;
      }
      if (b.dataset.treinoOp !== undefined && treino.fase === 'pergunta') {
        const [, , certa, porque] = PERGUNTAS[treino.i];
        const k = Number(b.dataset.treinoOp);
        const ops = $$('[data-treino-op]', $('#en-treino-corpo'));
        const porqueEl = $('#en-tr-porque');
        if (k === certa) {
          ops.forEach((o, n) => { o.disabled = true; o.classList.toggle('certa', n === certa); });
          porqueEl.textContent = `Isso! ${porque}`;
          porqueEl.className = 'en-tr-porque certo';
          $('[data-treino="seguir"]', $('#en-treino-corpo')).hidden = false;
        } else {
          b.classList.add('errada');
          b.disabled = true;
          porqueEl.textContent = 'Não é bem assim. Pensa no que protege o passageiro e o carro, e tenta de novo.';
          porqueEl.className = 'en-tr-porque errado';
        }
      }
    }

    /* ---------- toques e campos ---------- */
    $('#en-selfie-in').addEventListener('change', (e) => { const a = e.target.files && e.target.files[0]; e.target.value = ''; selfie(a); });
    $('#en-cnh-foto-in').addEventListener('change', (e) => { const a = e.target.files && e.target.files[0]; e.target.value = ''; fotoDaCnh(a); });
    $('#en-antec-in').addEventListener('change', (e) => { const a = e.target.files && e.target.files[0]; e.target.value = ''; certidao(a); });
    $('#en-cpf').addEventListener('input', (e) => { e.target.value = formatarCpf(e.target.value); $('#en-cnh-erro').hidden = true; });
    $('#en-cnh-num').addEventListener('input', (e) => { e.target.value = digitos(e.target.value).slice(0, 11); $('#en-cnh-erro').hidden = true; });
    $('#en-cnh-form').addEventListener('input', () => { $('#en-cnh-erro').hidden = true; });
    $('#en-cnh-form').addEventListener('submit', (e) => { e.preventDefault(); salvarCnh(); });
    $('#en-treino').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled && (b.dataset.treino || b.dataset.treinoOp !== undefined)) tocarTreino(b);
    });

    function abrirDoc(nome, origem) {
      if (nome === 'cnh') abrirCnh(origem);
      else if (nome === 'antecedentes') abrirAntecedentes(origem);
      else if (nome === 'treino') abrirTreino(origem);
    }

    return { desenhar, completo, faltando, situacao, abrirDoc, apagarArquivos };
  }

  window.Drink.cadastroMotorista = { criar, cpfValido, cnhValida };
}());
