/* VOA — navegação, setores, filtros e ferramentas.
   As lojas vêm de lojas.js (window.VOA_LOJAS). Hoje a lista está vazia. */
(function () {
  'use strict';

  const LOJAS = Array.isArray(window.VOA_LOJAS) ? window.VOA_LOJAS : [];

  const CATEGORIAS = {
    moda: 'Moda',
    calcados: 'Calçados',
    beleza: 'Beleza e perfumaria',
    eletronicos: 'Eletrônicos',
    casa: 'Casa e decoração',
    livraria: 'Livraria',
    brinquedos: 'Brinquedos',
    esportes: 'Esportes',
    joias: 'Joias e relógios',
    chocolates: 'Chocolates e doces',
    flores: 'Flores e plantas',
    bebidas: 'Vinhos e bebidas',
  };

  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ---------- utilidades ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plural = (n) => (n === 1 ? '1 loja' : `${n} lojas`);

  function minutos(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
  }
  function horarioHoje(loja, agora = new Date()) {
    return loja.horario ? loja.horario[DIAS[agora.getDay()]] || null : null;
  }
  function abertaAgora(loja, agora = new Date()) {
    const faixa = horarioHoje(loja, agora);
    if (!faixa) return false;
    const [ini, fim] = faixa.split('-').map(minutos);
    const m = agora.getHours() * 60 + agora.getMinutes();
    return m >= ini && m < fim;
  }

  function hoje() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function somarDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diasEntre(a, b) { return Math.round((b - a) / 86400000); }
  function fmtData(d) { return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`; }
  function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function hhmm(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  /* ---------- setores ---------- */
  const SETORES = [
    {
      id: 'troca',
      codigo: 'TRC',
      nome: 'Troca de presente',
      resumo: 'Onde e até quando trocar',
      corPainel: '--b-troca',
      pertence: (l) => !!l.troca,
      vazio: [
        'Nenhuma loja com troca cadastrada ainda',
        'Quando as lojas entrarem, cada uma vai mostrar aqui o prazo de troca, se precisa de nota e em quais unidades dá para trocar. Enquanto isso, a calculadora acima mostra o seu prazo.',
      ],
      filtros: [
        { id: 'sem-nota', rotulo: 'Troca sem nota', teste: (l) => !!(l.troca && l.troca.semNota) },
        { id: 'qualquer-unidade', rotulo: 'Em qualquer unidade', teste: (l) => !!(l.troca && l.troca.qualquerUnidade) },
        { id: 'prazo-30', rotulo: 'Prazo de 30 dias ou mais', teste: (l) => !!(l.troca && l.troca.prazoDias >= 30) },
        { id: 'online', rotulo: 'Troca pelo site', teste: (l) => !!(l.troca && l.troca.online) },
      ],
    },
    {
      id: 'ultima-hora',
      codigo: 'ULT',
      nome: 'Presente de última hora',
      resumo: 'Aberto agora, entrega hoje',
      corPainel: '--b-ultima',
      pertence: (l) => !!l.ultimaHora,
      ordenar: (a, b) => Number(abertaAgora(b)) - Number(abertaAgora(a)),
      vazio: [
        'Nenhuma loja de última hora por enquanto',
        'Aqui vão aparecer as lojas abertas agora, com entrega no mesmo dia ou retirada rápida, primeiro as que estão abertas.',
      ],
      filtros: [
        { id: 'aberta', rotulo: 'Aberta agora', teste: (l) => abertaAgora(l) },
        { id: 'entrega-hoje', rotulo: 'Entrega hoje', teste: (l) => !!(l.ultimaHora && l.ultimaHora.entregaHoje) },
        { id: 'retirada', rotulo: 'Retirada em até 1 h', teste: (l) => !!(l.ultimaHora && l.ultimaHora.retirada1h) },
        { id: 'embrulho', rotulo: 'Embrulha para presente', teste: (l) => !!l.embrulho },
        { id: 'ate-100', rotulo: 'Presentes até R$ 100', teste: (l) => typeof l.precoMin === 'number' && l.precoMin <= 100 },
      ],
    },
    {
      id: 'shopping',
      codigo: 'SHP',
      nome: 'Shopping',
      resumo: 'Lojas por shopping e piso',
      corPainel: '--b-shopping',
      pertence: (l) => l.tipo === 'shopping',
      agrupar: (l) => l.shopping || 'Outros shoppings',
      ordenar: (a, b) => String(a.piso || '').localeCompare(String(b.piso || ''), 'pt-BR', { numeric: true })
        || a.nome.localeCompare(b.nome, 'pt-BR'),
      vazio: [
        'Nenhum shopping cadastrado ainda',
        'As lojas vão aparecer agrupadas por shopping, com o piso e o número de cada uma.',
      ],
      filtros: [
        { id: 'aberta', rotulo: 'Aberta agora', teste: (l) => abertaAgora(l) },
        { id: 'embrulho', rotulo: 'Embrulha para presente', teste: (l) => !!l.embrulho },
        { id: 'troca', rotulo: 'Aceita troca', teste: (l) => !!l.troca },
      ],
    },
    {
      id: 'rua',
      codigo: 'RUA',
      nome: 'Lojas de rua',
      resumo: 'Comércio de bairro, com endereço',
      corPainel: '--b-rua',
      pertence: (l) => l.tipo === 'rua',
      agrupar: (l) => l.bairro || 'Outros bairros',
      ordenar: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
      vazio: [
        'Nenhuma loja de rua cadastrada ainda',
        'As lojas vão aparecer agrupadas por bairro, com endereço, horário e se fazem entrega.',
      ],
      filtros: [
        { id: 'aberta', rotulo: 'Aberta agora', teste: (l) => abertaAgora(l) },
        { id: 'entrega', rotulo: 'Faz entrega', teste: (l) => !!l.entrega },
        { id: 'estacionamento', rotulo: 'Estacionamento', teste: (l) => !!l.estacionamento },
        { id: 'troca', rotulo: 'Aceita troca', teste: (l) => !!l.troca },
      ],
    },
  ];

  /* ---------- cartão de loja ---------- */
  function linkSeguro(url) { return /^https?:\/\//i.test(url || '') ? url : null; }

  function cartaoLoja(l) {
    const local = l.tipo === 'shopping'
      ? [l.shopping, l.piso && `Piso ${l.piso}`, l.numero && `Loja ${l.numero}`]
      : [l.endereco, l.bairro, l.cidade];
    const faixa = horarioHoje(l);
    const aberta = abertaAgora(l);

    const tags = [];
    if (l.troca) {
      if (l.troca.prazoDias) tags.push(`Troca em ${l.troca.prazoDias} dias`);
      if (l.troca.semNota) tags.push('Troca sem nota');
      if (l.troca.qualquerUnidade) tags.push('Troca em qualquer unidade');
      if (l.troca.online) tags.push('Troca pelo site');
    }
    if (l.ultimaHora) {
      if (l.ultimaHora.entregaHoje) tags.push('Entrega hoje');
      if (l.ultimaHora.retirada1h) tags.push('Retirada em 1 h');
    }
    if (l.embrulho) tags.push('Embrulha para presente');
    if (l.entrega && !(l.ultimaHora && l.ultimaHora.entregaHoje)) tags.push('Faz entrega');
    if (l.estacionamento) tags.push('Estacionamento');
    if (typeof l.precoMin === 'number') tags.push(`A partir de R$ ${l.precoMin}`);

    const contato = [];
    if (l.telefone) contato.push(`<span>${esc(l.telefone)}</span>`);
    if (l.instagram) {
      const user = String(l.instagram).replace(/^@/, '');
      contato.push(`<a href="https://instagram.com/${encodeURIComponent(user)}" target="_blank" rel="noopener">@${esc(user)}</a>`);
    }
    const site = linkSeguro(l.site);
    if (site) contato.push(`<a href="${esc(site)}" target="_blank" rel="noopener">Site</a>`);

    return `<article class="loja">
      <div class="loja-topo">
        <h3>${esc(l.nome)}</h3>
        ${l.horario ? `<span class="estado ${aberta ? 'on' : 'off'}">${aberta ? 'Aberta agora' : 'Fechada agora'}</span>` : ''}
      </div>
      ${l.categoria ? `<p class="loja-cat">${esc(CATEGORIAS[l.categoria] || l.categoria)}</p>` : ''}
      <p class="loja-local">${local.filter(Boolean).map(esc).join(' · ')}</p>
      ${l.horario ? `<p class="loja-hora">Hoje: ${faixa ? esc(faixa.replace('-', '–')) : 'fechada'}</p>` : ''}
      ${tags.length ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${contato.length ? `<p class="loja-contato">${contato.join('')}</p>` : ''}
    </article>`;
  }

  function listaHTML(lojas, agrupar) {
    if (!agrupar) return lojas.map(cartaoLoja).join('');
    const grupos = new Map();
    lojas.forEach((l) => {
      const g = agrupar(l);
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(l);
    });
    return Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((g) => `<h3 class="grupo">${esc(g)} · ${plural(grupos.get(g).length)}</h3>${grupos.get(g).map(cartaoLoja).join('')}`)
      .join('');
  }

  function vazioHTML(titulo, texto) {
    return `<div class="vazio">
      <p class="vazio-cod">0 LOJAS</p>
      <h3>${esc(titulo)}</h3>
      <p>${esc(texto)}</p>
      <button class="btn-sec" type="button" data-abrir-lojista>Tenho uma loja</button>
    </div>`;
  }

  /* ---------- bloco de lojas de cada setor ---------- */
  function montarBloco(setor) {
    const alvo = $(`[data-view="${setor.id}"] [data-bloco]`);
    const opcoes = Object.entries(CATEGORIAS).map(([v, r]) => `<option value="${v}">${esc(r)}</option>`).join('');
    alvo.innerHTML = `
      <div class="lojas-cab">
        <h2>Lojas neste setor</h2>
        <p class="contagem" data-contagem></p>
      </div>
      <div class="filtros">
        <label class="sel" for="cat-${setor.id}"><span>Categoria</span>
          <select id="cat-${setor.id}" data-categoria><option value="">Todas</option>${opcoes}</select>
        </label>
        <div class="chips" role="group" aria-label="Filtros de ${esc(setor.nome)}">
          ${setor.filtros.map((f) => `<button type="button" class="chip" aria-pressed="false" data-filtro="${f.id}">${esc(f.rotulo)}</button>`).join('')}
        </div>
      </div>
      <div class="lista" data-lista></div>`;

    const estado = { categoria: '', filtros: new Set() };
    const select = $('[data-categoria]', alvo);
    const lista = $('[data-lista]', alvo);
    const contagem = $('[data-contagem]', alvo);

    function desenhar() {
      const doSetor = LOJAS.filter(setor.pertence);
      let lojas = doSetor.filter((l) => !estado.categoria || l.categoria === estado.categoria);
      setor.filtros.forEach((f) => { if (estado.filtros.has(f.id)) lojas = lojas.filter(f.teste); });
      if (setor.ordenar) lojas.sort(setor.ordenar);

      contagem.textContent = lojas.length === doSetor.length
        ? plural(doSetor.length)
        : `${lojas.length} de ${plural(doSetor.length)}`;

      if (!doSetor.length) {
        lista.innerHTML = vazioHTML(setor.vazio[0], setor.vazio[1]);
      } else if (!lojas.length) {
        lista.innerHTML = `<div class="vazio">
          <p class="vazio-cod">0 DE ${doSetor.length}</p>
          <h3>Nenhuma loja com esses filtros</h3>
          <p>Tire um filtro ou escolha outra categoria.</p>
          <button class="btn-sec" type="button" data-limpar>Limpar filtros</button>
        </div>`;
      } else {
        lista.innerHTML = listaHTML(lojas, setor.agrupar);
      }
    }

    function limpar() {
      estado.categoria = '';
      estado.filtros.clear();
      select.value = '';
      $$('[data-filtro]', alvo).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      desenhar();
    }

    select.addEventListener('change', () => { estado.categoria = select.value; desenhar(); });
    alvo.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filtro]');
      if (chip) {
        const id = chip.dataset.filtro;
        const ligado = !estado.filtros.has(id);
        if (ligado) estado.filtros.add(id); else estado.filtros.delete(id);
        chip.setAttribute('aria-pressed', String(ligado));
        desenhar();
      }
      if (e.target.closest('[data-limpar]')) limpar();
    });

    setor.escolherCategoria = (cat) => { estado.categoria = cat; select.value = cat; desenhar(); };
    setor.desenhar = desenhar;
    desenhar();
  }

  /* ---------- painel de setores (início) ---------- */
  function flaps(n) {
    return String(n).padStart(2, '0').split('').map((d) => `<span class="flap">${d}</span>`).join('');
  }

  function montarPainel() {
    const agora = new Date();
    $('#painel-linhas').innerHTML = SETORES.map((s) => {
      const lojas = LOJAS.filter(s.pertence);
      const abertas = lojas.filter((l) => abertaAgora(l, agora)).length;
      const status = !lojas.length ? 'Aguardando lojas' : `${abertas} aberta${abertas === 1 ? '' : 's'} agora`;
      return `<li><a class="linha" href="#${s.id}" style="--c: var(${s.corPainel})">
        <span class="l-cod">${s.codigo}</span>
        <span class="l-nome"><span data-flap>${esc(s.nome)}</span><small>${esc(s.resumo)}</small></span>
        <span class="l-lojas"><span class="sr">${plural(lojas.length)}</span><span aria-hidden="true">${flaps(lojas.length)}</span></span>
        <span class="l-status${abertas ? ' on' : ''}">${status}</span>
      </a></li>`;
    }).join('');
  }

  /* letras do painel giram rapidinho antes de assentar, como num painel de aeroporto */
  function embaralhar(els) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    els.forEach((el, i) => {
      const final = el.textContent;
      const inicio = performance.now() + i * 110;
      const dur = 650;
      function passo(t) {
        const p = Math.max(0, (t - inicio) / dur);
        const fixas = Math.floor(p * final.length);
        el.textContent = p >= 1 ? final : final.split('').map((c, k) => (
          k < fixas || c === ' ' ? c : CH[(Math.random() * CH.length) | 0]
        )).join('');
        if (p < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    });
  }

  /* ---------- relógio ---------- */
  function duracao(min) {
    const h = Math.floor(min / 60);
    const r = min % 60;
    if (!h) return `${r} min`;
    return r ? `${h} h ${r} min` : `${h} h`;
  }

  function mensagemRelogio(agora) {
    const domingo = agora.getDay() === 0;
    const abre = domingo ? 14 : 10;
    const fecha = domingo ? 20 : 22;
    const m = agora.getHours() * 60 + agora.getMinutes();
    if (m < abre * 60) {
      return `Os shoppings costumam abrir às ${abre}h hoje. Até lá, procure lojas de rua ou com entrega.`;
    }
    if (m < fecha * 60) {
      const resta = fecha * 60 - m;
      const verbo = resta === 1 || resta === 60 ? 'Falta' : 'Faltam';
      return `${verbo} ${duracao(resta)} para o horário típico de fechamento dos shoppings (${fecha}h).`;
    }
    return `Os shoppings costumam fechar às ${fecha}h. Procure lojas abertas até mais tarde ou com entrega amanhã cedo.`;
  }

  function tique() {
    const agora = new Date();
    $('#painel-hora').textContent = hhmm(agora);
    $('#relogio-hora').textContent = hhmm(agora);
    $('#relogio-msg').textContent = mensagemRelogio(agora);
  }

  /* ---------- calculadora de troca ---------- */
  function montarTroca() {
    const form = $('#form-troca');
    const data = $('#troca-data');
    const tipoCampo = $('#troca-tipo');
    const res = $('#troca-res');
    data.value = isoLocal(somarDias(hoje(), -3));
    data.max = isoLocal(hoje());

    function faltaTexto(n) {
      if (n > 1) return `faltam ${n} dias`;
      if (n === 1) return 'falta 1 dia';
      if (n === 0) return 'o prazo termina hoje';
      return `o prazo terminou há ${-n} dia${n === -1 ? '' : 's'}`;
    }

    function calcular() {
      const onde = $('input[name="troca-onde"]:checked').value;
      const motivo = $('input[name="troca-motivo"]:checked').value;
      const tipo = $('input[name="troca-tipo"]:checked').value;
      tipoCampo.hidden = motivo !== 'defeito';

      if (!data.value) {
        res.innerHTML = '<p class="res-rotulo">Prazo</p><p class="res-base">Informe a data da compra para ver o prazo.</p>';
        return;
      }
      const [a, m, d] = data.value.split('-').map(Number);
      const base = new Date(a, m - 1, d);

      if (motivo === 'gosto' && onde === 'loja') {
        res.innerHTML = `
          <p class="res-rotulo">Prazo para trocar</p>
          <p class="res-data">Depende da loja</p>
          <p class="res-falta">Se a loja der 30 dias, que é comum: até ${fmtData(somarDias(base, 30))}.</p>
          <p class="res-base">Na loja física, trocar por tamanho, cor ou gosto não é obrigatório por lei. Vale a política da loja, e o que ela prometer na etiqueta, na nota ou em cartaz precisa ser cumprido.</p>`;
        return;
      }

      let dias;
      let rotulo = 'Prazo para trocar';
      let texto;
      if (motivo === 'defeito') {
        const duravel = tipo === 'duravel';
        dias = duravel ? 90 : 30;
        rotulo = 'Prazo para reclamar do defeito';
        texto = duravel
          ? 'Produto durável com defeito aparente: 90 dias para reclamar (CDC, art. 26, II). A loja tem até 30 dias para resolver; se não resolver, você pode pedir outro produto ou o dinheiro de volta.'
          : 'Produto não durável com defeito aparente: 30 dias para reclamar (CDC, art. 26, I).';
      } else {
        dias = 7;
        texto = 'Compras pela internet ou por telefone podem ser desfeitas em até 7 dias após o recebimento, por qualquer motivo, com devolução do valor pago (CDC, art. 49).';
      }
      const limite = somarDias(base, dias);
      const falta = diasEntre(hoje(), limite);
      res.innerHTML = `
        <p class="res-rotulo">${rotulo}</p>
        <p class="res-data">${fmtData(limite)}</p>
        <p class="res-falta${falta < 0 ? ' fim' : ''}">${faltaTexto(falta)}</p>
        <p class="res-base">${texto}</p>`;
    }

    form.addEventListener('input', calcular);
    form.addEventListener('change', calcular);
    form.addEventListener('submit', (e) => e.preventDefault());
    calcular();
  }

  /* ---------- ideias de última hora ---------- */
  const IDEIAS = {
    mae: [['Flores ou planta em vaso', 'flores'], ['Kit de banho ou perfume', 'beleza'], ['Livro de um autor que ela gosta', 'livraria'], ['Chocolate fino', 'chocolates']],
    pai: [['Vinho ou cerveja especial', 'bebidas'], ['Carteira ou cinto de couro', 'moda'], ['Livro ou biografia', 'livraria'], ['Algo para o esporte dele', 'esportes']],
    par: [['Perfume', 'beleza'], ['Joia pequena ou relógio', 'joias'], ['Chocolate fino', 'chocolates'], ['Buquê de flores', 'flores']],
    amigo: [['Livro ou HQ', 'livraria'], ['Jogo de cartas ou de tabuleiro', 'brinquedos'], ['Caneca e café especial', 'casa'], ['Fone de ouvido', 'eletronicos']],
    crianca: [['Brinquedo de montar', 'brinquedos'], ['Livro ilustrado', 'livraria'], ['Kit de desenho e pintura', 'brinquedos'], ['Bola ou item de esporte', 'esportes']],
    colega: [['Suculenta ou planta pequena', 'flores'], ['Caderno ou agenda', 'livraria'], ['Caneca', 'casa'], ['Caixa de bombons', 'chocolates']],
  };

  function montarIdeias() {
    const grupo = $('#ideias-para');
    const lista = $('#ideias-lista');
    const setor = SETORES.find((s) => s.id === 'ultima-hora');

    function ativar(para) {
      $$('[data-para]', grupo).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.para === para)));
      lista.innerHTML = IDEIAS[para].map(([ideia, cat]) => `<li class="ideia">
        <strong>${esc(ideia)}</strong>
        <button type="button" class="ideia-ir" data-cat="${cat}">Ver lojas de ${esc(CATEGORIAS[cat])}</button>
      </li>`).join('');
    }

    grupo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-para]');
      if (b) ativar(b.dataset.para);
    });
    lista.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      setor.escolherCategoria(b.dataset.cat);
      $('[data-view="ultima-hora"] [data-bloco]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    ativar('mae');
  }

  /* ---------- busca ---------- */
  let termo = '';

  function desenharBusca() {
    const titulo = $('#busca-titulo');
    const alvo = $('#busca-lista');
    $$('[data-busca] input').forEach((i) => { i.value = termo; });

    if (!LOJAS.length) {
      titulo.textContent = termo ? `Busca por “${termo}”` : 'Buscar lojas';
      alvo.innerHTML = vazioHTML(
        'Ainda não há lojas cadastradas na VOA',
        'Assim que as primeiras lojas entrarem, a busca encontra lojas por nome, categoria, bairro ou shopping.',
      );
      return;
    }
    if (!termo) {
      titulo.textContent = 'Buscar lojas';
      alvo.innerHTML = '';
      return;
    }
    const q = normalizar(termo);
    const achadas = LOJAS.filter((l) => normalizar([
      l.nome, CATEGORIAS[l.categoria], l.categoria, l.bairro, l.cidade, l.shopping, l.endereco,
    ].join(' ')).includes(q));
    titulo.textContent = `${plural(achadas.length)} para “${termo}”`;
    alvo.innerHTML = achadas.length
      ? listaHTML(achadas)
      : `<div class="vazio"><p class="vazio-cod">0 LOJAS</p><h3>Nada encontrado para “${esc(termo)}”</h3><p>Tente o nome da loja, uma categoria como “livraria” ou um bairro.</p></div>`;
  }

  function montarBusca() {
    $$('[data-busca]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        termo = $('input', form).value.trim();
        if (location.hash === '#busca') desenharBusca();
        else location.hash = 'busca';
      });
    });
  }

  /* ---------- navegação ---------- */
  const TITULOS = { inicio: 'VOA', busca: 'Busca · VOA' };
  SETORES.forEach((s) => { TITULOS[s.id] = `${s.nome} · VOA`; });
  let atual = null;

  function rota() {
    let id = decodeURIComponent(location.hash.slice(1)) || 'inicio';
    let view = $$('[data-view]').find((v) => v.dataset.view === id);
    if (!view) {
      if (atual) return; // âncora comum (ex.: pular para o conteúdo), não é uma tela
      id = 'inicio';
      view = $('[data-view="inicio"]');
    }
    const primeira = atual === null;
    if (id === atual) return;
    atual = id;

    $$('[data-view]').forEach((v) => { v.hidden = v !== view; });
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITULOS[id] || 'VOA';

    if (id === 'busca') desenharBusca();
    const setor = SETORES.find((s) => s.id === id);
    if (setor && setor.desenhar) setor.desenhar(); // atualiza "aberta agora"

    if (!primeira) {
      window.scrollTo(0, 0);
      const h1 = $('h1', view);
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  /* ---------- diálogo do lojista ---------- */
  function montarDialogo() {
    const dlg = $('#dlg-lojista');
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-abrir-lojista]')) return;
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- início ---------- */
  montarPainel();
  SETORES.forEach(montarBloco);
  montarTroca();
  montarIdeias();
  montarBusca();
  montarDialogo();
  tique();
  setInterval(tique, 15000);
  window.addEventListener('hashchange', rota);
  rota();
  if (atual === 'inicio') embaralhar($$('[data-flap]'));
})();
