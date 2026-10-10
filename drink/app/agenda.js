/* Drink — a volta agendada (v34). Para quem vai a um lugar longe, onde quase não tem Drink rodando (Jardim Canadá,
   Nova Lima, Lagoa Santa…): marca antes a hora de ir embora, numa janela de uma hora, e um motorista reserva.
   - o pedido agendado sai num canal próprio, guardado pelo ntfy por 12 h (é o limite para agendar);
   - quem dirige vê a lista, reserva, e o celular da pessoa confirma o primeiro que reservou (mesmo se o app só abrir
     depois: a mensagem fica esperando no canal);
   - na hora, o motorista toca em "Ir buscar" e a volta vira uma corrida normal nos dois celulares (código, vistoria,
     viagem, Pix);
   - cancelar é de graça até 2 h antes; depois, R$ 15; se o motorista chegar e a pessoa não aparecer em 15 min,
     R$ 25. A taxa vai por Pix direto para o motorista e, até pagar, o app não deixa pedir outra volta (sem servidor,
     é o próprio celular que segura: como o Pix da corrida, vale a palavra de quem paga);
   - se o motorista desistir, a pessoa é avisada e a volta volta para a lista na hora.
   Tudo cifrado como a corrida: a chave sai da troca do pedido com o aceite. */
(function () {
  const { $, $$, brl, hhmm, esc } = window.Drink.util;
  const R = window.Drink.rede;
  const S = window.Drink.servicos;
  const PF = window.Drink.perfil;
  const PIX = window.Drink.pix;

  const REGRAS = {
    antecedenciaMin: 60, // agendar com pelo menos 1 h
    maxHoras: 12, // e no máximo 12 h antes (o canal guarda as mensagens por 12 h)
    passoMin: 30, // horários de meia em meia hora
    janelaMin: 60, // a janela de saída
    gratisAteMin: 120, // cancelar de graça até 2 h antes
    taxaTarde: 15, // depois disso
    taxaNaoVeio: 25, // o motorista chegou e a pessoa não apareceu
    esperaNaoVeioMin: 15,
    irAntesMin: 60, // o motorista pode sair até 1 h antes (lugar longe, de bike)
    toleranciaMin: 30, // depois do fim da janela, ainda dá para começar
  };
  const MIN = 60000;
  const redondo = (v) => Math.round(v * 100) / 100;
  const primeiro = (nome) => String(nome || '').trim().split(' ')[0] || 'O Drink';
  const ponto = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lon);

  /* ---------- horários e textos ---------- */
  // de meia em meia hora, de 1 h a 12 h daqui (a janela inteira cabe nas 12 h)
  function horarios(agora = Date.now()) {
    const passo = REGRAS.passoMin * MIN;
    const primeiroH = Math.ceil((agora + REGRAS.antecedenciaMin * MIN) / passo) * passo;
    const lista = [];
    for (let t = primeiroH; t + REGRAS.janelaMin * MIN <= agora + REGRAS.maxHoras * 3600000; t += passo) lista.push(t);
    return lista;
  }
  // "hoje", "amanhã", "madrugada de sábado" (1 h da manhã de amanhã é a noite de hoje para quem está na festa)
  function dia(ms, agora = Date.now()) {
    const d = new Date(ms);
    const meia = (x) => { const y = new Date(x); return new Date(y.getFullYear(), y.getMonth(), y.getDate()).getTime(); };
    const dif = Math.round((meia(ms) - meia(agora)) / 864e5);
    const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
    if (dif === 0) return d.getHours() < 6 ? 'esta madrugada' : 'hoje';
    if (dif === 1 && d.getHours() < 6) return `madrugada de ${semana}`;
    if (dif === 1) return 'amanhã';
    return semana;
  }
  const janelaTxt = (j, agora) => `${dia(j.de, agora)}, ${hhmm(new Date(j.de))} às ${hhmm(new Date(j.ate))}`;
  const gratisAte = (ag) => ag.janela.de - REGRAS.gratisAteMin * MIN;
  function taxaCancelar(ag, agora = Date.now()) {
    if (!ag || !ag.motorista) return 0;
    return agora < gratisAte(ag) ? 0 : REGRAS.taxaTarde;
  }
  const naJanela = (j, agora = Date.now()) => agora >= j.de && agora <= j.ate + REGRAS.toleranciaMin * MIN;
  const podeIr = (j, agora = Date.now()) => agora >= j.de - REGRAS.irAntesMin * MIN && agora <= j.ate + REGRAS.toleranciaMin * MIN;
  const veiculoTxt = (m) => (m ? PF.descrever({ tipo: m.veiculo, ...(m.veic || {}) }) : '');
  function limparPix(px) {
    return px && typeof px.chave === 'string' && px.chave.length <= 77
      ? { chave: px.chave, nome: String(px.nome || '').slice(0, 60), cidade: String(px.cidade || 'BELO HORIZONTE').slice(0, 30) } : null;
  }
  const lugar = (l) => (l ? [l.nome, l.bairro].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ') : '');
  const texto = (s, n = 60) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, n);

  // os envelopes, iguais aos da corrida: o passageiro manda para a chave do motorista; o motorista manda a dele junto
  const envP = async (chave, pubOutro, obj) => ({ v: 1, de: 'p', para: pubOutro.slice(0, 16), ...(await R.cifrar(chave, obj)) });
  const envM = async (chave, pubEu, obj) => ({ v: 1, de: 'm', k: pubEu, ...(await R.cifrar(chave, obj)) });

  /* ==========================================================================================================
     o lado de quem pede
     ========================================================================================================== */
  function passageiro(ctx) {
    const q = (s) => $(s, ctx.raiz);
    const lista = () => { const u = ctx.eu(); if (!u) return []; u.agendadas = (u.agendadas || []).filter(Boolean); return u.agendadas; };
    const ativa = () => lista().find((a) => ['procurando', 'confirmada'].includes(a.estado)) || null;
    const assinaturas = new Map();
    const filas = new Map();
    let escolhido = 0;
    let base = null;

    /* ---------- agendar ---------- */
    // a folha de agendar: os horários, o preço pela bandeira da hora e as regras
    function desenharAgendar(b) {
      base = b;
      const hs = horarios();
      if (!escolhido || !hs.includes(escolhido)) escolhido = hs[0];
      q('#rp-ag-horas').innerHTML = hs.map((t) => `<button type="button" role="radio" aria-checked="${t === escolhido}" data-ag-hora="${t}"><b>${hhmm(new Date(t))}</b><small>${esc(dia(t))}</small></button>`).join('');
      desenharEscolha();
    }
    function desenharEscolha() {
      if (!base || !base.rota) return;
      const j = { de: escolhido, ate: escolhido + REGRAS.janelaMin * MIN };
      const p = S.preco(base.rota.km, new Date(escolhido));
      $$('#rp-ag-horas [data-ag-hora]', ctx.raiz).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.agHora) === escolhido)));
      q('#rp-ag-janela').textContent = `Saída ${janelaTxt(j)}`;
      q('#rp-ag-valor').textContent = `${brl(p.total)}${p.adicional ? ' · bandeira 2' : ''}`;
      q('#rp-ag-rota').textContent = `${lugar(base.embarque)} → ${lugar(base.destino)} · ${S.textoKm(base.rota.km)}`;
      q('#rp-ag-gratis').textContent = hhmm(new Date(escolhido - REGRAS.gratisAteMin * MIN));
      q('#rp-ag-taxa').textContent = `R$ ${S.virgula(REGRAS.taxaTarde, Number.isInteger(REGRAS.taxaTarde) ? 0 : 2)}`;
      q('#rp-ag-naoveio').textContent = `R$ ${S.virgula(REGRAS.taxaNaoVeio, Number.isInteger(REGRAS.taxaNaoVeio) ? 0 : 2)}`;
      q('#rp-ag-espera').textContent = String(REGRAS.esperaNaoVeioMin);
      q('#rp-ag-ok').textContent = `Agendar · ${brl(p.total)}`;
    }
    function escolher(t) { escolhido = Number(t); desenharEscolha(); }

    async function agendar() {
      if (!base || !base.rota || !base.embarque || !base.destino) return null;
      if (ativa()) { ctx.avisar('Você já tem uma volta agendada. Cancela ela antes de marcar outra.'); return null; }
      if (pendente()) { ctx.fecharFolha(); ctx.abrirFolha('rp-pend'); return null; }
      const agora = Date.now();
      if (!horarios(agora).includes(escolhido)) { desenharAgendar(base); ctx.avisar('Esse horário ficou perto demais. Escolhe outro.'); return null; }
      const u = ctx.eu();
      const par = await R.novoPar();
      const p = S.preco(base.rota.km, new Date(escolhido));
      const ag = {
        id: R.idAleatorio(), papel: 'p', criada: agora, janela: { de: escolhido, ate: escolhido + REGRAS.janelaMin * MIN }, estado: 'procurando',
        embarque: { ...base.embarque }, destino: { ...base.destino }, km: Math.round(base.rota.km * 10) / 10, min: Math.round(base.rota.min), linha: base.rota.linha,
        valor: redondo(p.total), saida: p.saida, rodado: redondo(p.rodado), adicional: redondo(p.adicional), veic: base.veic, carro: { ...u.carro },
        codigo: String(1000 + Math.floor(Math.random() * 9000)), priv: par.priv, pub: par.pub, rastreio: R.novaChave(), segredo: R.idAleatorio(),
        motorista: null, chave: null, aceiteEm: 0, ultimo: null,
      };
      try { await publicar(ag); } catch (e) { ctx.avisar('Sem conexão com a central: a volta não foi agendada. Confere a internet e tenta de novo.'); return null; }
      lista().unshift(ag);
      ctx.salvar();
      ouvir(ag);
      ctx.avisos().definir('agenda', [R.topico.aviso(ag.id, 'p')]);
      ctx.pedirNotificacao();
      desenhar();
      return ag;
    }
    async function publicar(ag) {
      const pedido = {
        v: 1, tipo: 'agendada', id: ag.id, t: Date.now(), janela: ag.janela, pub: ag.pub,
        de: { bairro: ag.embarque.bairro || 'BH', ...S.aproximar(ag.embarque) }, para: { bairro: ag.destino.bairro || ag.destino.nome },
        km: ag.km, min: ag.min, valor: ag.valor, veic: ag.veic, cambio: ag.carro.cambio, fecho: await R.resumo(ag.segredo),
      };
      await R.canal.publicar(R.topico.agendadas(), pedido);
      // e no canal da região do embarque: quem dirige perto recebe o aviso no celular
      R.fila.mandar(R.topico.regiao(ag.embarque), pedido, { validade: 30 * MIN });
    }
    const fechar = (ag) => R.fila.mandar(R.topico.fechados(), { v: 1, tipo: 'fechado', id: ag.id, segredo: ag.segredo }, { validade: 12 * 60 * MIN });

    /* ---------- ouvir o canal da volta ---------- */
    function ouvir(ag) {
      if (assinaturas.has(ag.id)) return;
      const id = ag.id;
      const desde = ag.ultimo || String(Math.floor(ag.criada / 1000) - 5);
      assinaturas.set(id, R.canal.assinar([R.topico.corrida(id)], (env, meta) => {
        filas.set(id, (filas.get(id) || Promise.resolve()).then(() => receber(id, env, meta)).catch(() => {}));
      }, { desde }));
    }
    function parar(id) { const s = assinaturas.get(id); if (s) { s.fechar(); assinaturas.delete(id); } }
    async function mandar(ag, obj, para) {
      const chave = para ? para.chave : ag.chave;
      const pub = para ? para.pub : ag.motorista.pub;
      R.fila.mandar(R.topico.corrida(ag.id), await envP(chave, pub, obj));
    }
    async function receber(id, env, meta) {
      const ag = lista().find((a) => a.id === id);
      if (!ag || !env || env.v !== 1 || env.de !== 'm' || !env.k || !env.iv) return;
      if (meta && meta.id) ag.ultimo = meta.id;
      const doEscolhido = ag.motorista && env.k === ag.motorista.pub;
      const chave = doEscolhido ? ag.chave : await R.chaveComum(await R.importarPrivada(ag.priv), env.k);
      let msg;
      try { msg = await R.decifrar(chave, env); } catch (e) { return; }
      if (ag.motorista && !doEscolhido) {
        if (msg.tipo === 'aceite') mandar(ag, { tipo: 'recusado' }, { chave, pub: env.k });
        return;
      }
      await tratar(ag, msg, env.k, chave, meta);
      ctx.salvar();
      desenhar();
    }
    async function tratar(ag, msg, k, chave, meta) {
      switch (msg.tipo) {
        case 'aceite': {
          if (ag.estado !== 'procurando' || !msg.agendada) return;
          const m = msg.motorista || {};
          ag.motorista = {
            pub: k, nome: texto(m.nome, 40) || 'Motorista', nota: Number(m.nota) || 0, corridas: Number(m.corridas) || 0,
            veiculo: m.veiculo === 'patinete' ? 'patinete' : 'bike', ...PF.limpar(m), pix: limparPix(m.pix),
          };
          ag.chave = chave;
          ag.estado = 'confirmada';
          ag.aceiteEm = Date.now();
          const u = ctx.eu();
          await mandar(ag, {
            tipo: 'confirmado', agendada: true, passageiro: { nome: ctx.nomeCurto(u) }, janela: ag.janela,
            embarque: { lat: ag.embarque.lat, lon: ag.embarque.lon, nome: ag.embarque.nome, bairro: ag.embarque.bairro },
            destino: { lat: ag.destino.lat, lon: ag.destino.lon, nome: ag.destino.nome, bairro: ag.destino.bairro },
            carro: ag.carro, valor: ag.valor, km: ag.km,
          });
          ctx.avisos().mandar(R.topico.aviso(ag.id, 'm'), 'ag-confirmada');
          fechar(ag);
          const nome = primeiro(ag.motorista.nome);
          ctx.notificar(`${nome} reservou a sua volta`, `${janelaTxt(ag.janela)} · ${veiculoTxt(ag.motorista)}`);
          ctx.avisar(`${nome} reservou a sua volta (${janelaTxt(ag.janela)}).`);
          break;
        }
        case 'desistiu': {
          if (ag.estado !== 'confirmada') return;
          const nome = primeiro(ag.motorista.nome);
          // a volta volta para a lista, com outra chave (quem já tinha visto ela fechada vê de novo)
          parar(ag.id);
          const par = await R.novoPar();
          Object.assign(ag, { id: R.idAleatorio(), priv: par.priv, pub: par.pub, segredo: R.idAleatorio(), criada: Date.now(), estado: 'procurando', motorista: null, chave: null, aceiteEm: 0, ultimo: null });
          try { await publicar(ag); } catch (e) { /* a fila manda quando a internet voltar */ }
          ouvir(ag);
          ctx.avisos().definir('agenda', [R.topico.aviso(ag.id, 'p')]);
          ctx.notificar(`${nome} desistiu da sua volta`, 'Ela voltou para a lista e outro Drink pode reservar.');
          ctx.avisar(`${nome} desistiu. A sua volta voltou para a lista dos motoristas.`);
          break;
        }
        case 'indo': {
          if (ag.estado !== 'confirmada') return;
          ag.estado = 'iniciada';
          parar(ag.id);
          ctx.avisos().definir('agenda', []);
          remover(ag.id);
          ctx.iniciar(ag, meta && meta.id);
          break;
        }
        default:
      }
    }
    function remover(id) {
      const u = ctx.eu();
      u.agendadas = lista().filter((a) => a.id !== id);
      ctx.salvar();
    }

    /* ---------- na hora, ou antes ---------- */
    async function pronto() {
      const ag = ativa();
      if (!ag || ag.estado !== 'confirmada') return;
      ag.pronto = Date.now();
      ctx.salvar();
      await mandar(ag, { tipo: 'pronto' });
      ctx.avisos().mandar(R.topico.aviso(ag.id, 'm'), 'ag-pronto');
      ctx.avisar(`Avisamos ${primeiro(ag.motorista.nome)} que você está pronto.`);
      desenharFolha();
    }
    async function cancelar() {
      const ag = ativa();
      if (!ag) return;
      const taxa = taxaCancelar(ag);
      if (ag.motorista) {
        await mandar(ag, { tipo: 'cancelado', taxa });
        ctx.avisos().mandar(R.topico.aviso(ag.id, 'm'), 'ag-cancelada');
        if (taxa > 0) criarPendencia({ id: ag.id, valor: taxa, motivo: 'Cancelou a volta agendada a menos de 2\u00a0h', nome: ag.motorista.nome, pix: ag.motorista.pix, chave: ag.chave, pub: ag.motorista.pub, rota: `${ag.embarque.bairro || ag.embarque.nome} → ${ag.destino.bairro || ag.destino.nome}` });
      } else {
        fechar(ag);
      }
      parar(ag.id);
      ctx.avisos().definir('agenda', []);
      remover(ag.id);
      ctx.fecharFolha();
      desenhar();
      ctx.avisar(taxa > 0 ? `Volta cancelada. A taxa de ${brl(taxa)} vai por Pix para ${primeiro(ag.motorista.nome)}.` : 'Volta agendada cancelada, sem taxa.');
      if (taxa > 0) ctx.abrirFolha('rp-pend');
    }

    /* ---------- a taxa pendente ---------- */
    const pendencias = () => { const u = ctx.eu(); return (u && u.pendencias) || []; };
    const pendente = () => pendencias().find((p) => !p.paga) || null;
    function criarPendencia(p) {
      const u = ctx.eu();
      u.pendencias = [{ ...p, t: Date.now(), paga: false }, ...pendencias()].slice(0, 20);
      ctx.salvar();
      desenhar();
    }
    function desenharPendencia() {
      const p = pendente();
      if (!p) return;
      q('#rp-pend-t').textContent = /não apareceu/.test(p.motivo) ? 'Taxa por não aparecer' : 'Taxa de cancelamento';
      q('#rp-pend-sub').textContent = `${p.motivo}${p.rota ? ` · ${p.rota}` : ''}`;
      q('#rp-pend-valor').textContent = brl(p.valor);
      q('#rp-pend-para').textContent = `Para ${p.pix && p.pix.nome ? p.pix.nome : p.nome}, direto pelo Pix`;
      const qr = q('#rp-pend-qr');
      if (p.pix && p.pix.chave) {
        p.codigo = PIX.copiaECola({ chave: p.pix.chave, nome: p.pix.nome || p.nome, cidade: p.pix.cidade || 'BELO HORIZONTE', valor: p.valor, descricao: 'Taxa Drink' });
        qr.innerHTML = PIX.qrSvg(p.codigo, `QR code do Pix da taxa de ${brl(p.valor)}`);
        q('#rp-pend-copiar').hidden = false;
      } else {
        qr.innerHTML = '<p class="rp-pend-sem">O motorista não mandou a chave Pix. Combina com ele pelo chat da próxima vez, ou fala com o Drink.</p>';
        q('#rp-pend-copiar').hidden = true;
      }
    }
    async function copiarPendencia() {
      const p = pendente();
      if (!p || !p.codigo) return;
      try { await navigator.clipboard.writeText(p.codigo); ctx.avisar('Código do Pix copiado. Cola no app do seu banco.'); } catch (e) { ctx.avisar('Não deu pra copiar. Usa o QR code.'); }
    }
    async function paguei() {
      const p = pendente();
      if (!p) return;
      p.paga = true;
      p.pagaEm = Date.now();
      ctx.salvar();
      if (p.chave && p.pub) {
        R.fila.mandar(R.topico.corrida(p.id), await envP(p.chave, p.pub, { tipo: 'taxa-paga', valor: p.valor }), { validade: 12 * 60 * MIN });
        ctx.avisos().mandar(R.topico.aviso(p.id, 'm'), 'ag-taxa');
      }
      ctx.fecharFolha();
      desenhar();
      ctx.avisar(`Pronto. Avisamos ${primeiro(p.nome)} que a taxa foi paga.`);
    }
    // a taxa de uma volta agendada que já tinha virado corrida: a pessoa cancelou depois que o motorista saiu, ou ele
    // chegou e ela não apareceu (vem da tela da corrida)
    function taxaDaCorrida(c, taxa, motivo) {
      if (!(taxa > 0) || !c.motorista) return;
      criarPendencia({
        id: c.id, valor: taxa, motivo, nome: c.motorista.nome, pix: c.motorista.pix, chave: c.chave, pub: c.motorista.pub,
        rota: `${c.embarque.bairro || c.embarque.nome} → ${c.destino.bairro || c.destino.nome}`,
      });
    }

    /* ---------- o que aparece ---------- */
    function vencer() {
      const agora = Date.now();
      lista().forEach((ag) => {
        if (ag.estado === 'procurando' && agora > ag.janela.de) {
          ag.estado = 'vencida';
          fechar(ag);
          parar(ag.id);
          ctx.avisar(`Ninguém reservou a sua volta das ${hhmm(new Date(ag.janela.de))}. Dá para pedir agora pelo app.`);
        } else if (ag.estado === 'confirmada' && agora > ag.janela.ate + REGRAS.toleranciaMin * MIN) {
          ag.estado = 'vencida';
          parar(ag.id);
          ctx.avisar(`${primeiro(ag.motorista.nome)} não começou a sua volta das ${hhmm(new Date(ag.janela.de))}. Sem taxa para você.`);
        }
      });
      const u = ctx.eu();
      if (u && u.agendadas && u.agendadas.some((a) => a.estado === 'vencida')) {
        u.agendadas = u.agendadas.filter((a) => a.estado !== 'vencida');
        ctx.avisos().definir('agenda', []);
        ctx.salvar();
      }
    }
    function desenhar() {
      vencer();
      const ag = ativa();
      const card = q('#rp-ag-card');
      card.hidden = !ag;
      if (ag) {
        q('#rp-ag-card-t').textContent = `Volta agendada · ${janelaTxt(ag.janela)}`;
        let sub;
        if (ag.estado === 'procurando') sub = 'Procurando motorista para reservar';
        else if (naJanela(ag.janela)) sub = ag.pronto ? `${primeiro(ag.motorista.nome)} sabe que você está pronto` : 'Está na hora: toque e avise que está pronto';
        else sub = `${primeiro(ag.motorista.nome)} reservou · ${veiculoTxt(ag.motorista)}`;
        q('#rp-ag-card-sub').textContent = sub;
        card.classList.toggle('confirmada', ag.estado === 'confirmada');
      }
      const p = pendente();
      q('#rp-pend-card').hidden = !p;
      if (p) {
        q('#rp-pend-card-t').textContent = `Taxa pendente · ${brl(p.valor)}`;
        q('#rp-pend-card-sub').textContent = `Para ${primeiro(p.nome)}, por Pix. Até pagar, não dá para pedir outra volta.`;
      }
    }
    function desenharFolha() {
      const ag = ativa();
      if (!ag) { ctx.fecharFolha(); return; }
      const m = ag.motorista;
      q('#rp-agenda-sub').textContent = janelaTxt(ag.janela);
      q('#rp-agenda-estado').textContent = ag.estado === 'procurando'
        ? 'Procurando motorista. Quando alguém reservar, o celular avisa.'
        : (ag.pronto ? `${primeiro(m.nome)} sabe que você está pronto.` : `${primeiro(m.nome)} reservou. Na hora, ${m.veiculo === 'patinete' ? 'ele vem de patinete' : 'vem de bike'} até você.`);
      q('#rp-agenda-estado').classList.toggle('ok', ag.estado === 'confirmada');
      const mot = q('#rp-agenda-mot');
      mot.hidden = !m;
      if (m) {
        const av = q('#rp-agenda-av');
        av.textContent = String(m.nome || '').split(' ').filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
        q('#rp-agenda-nome').textContent = m.nome;
        q('#rp-agenda-info').textContent = [m.nota ? `${S.virgula(m.nota)} ★` : 'novo no Drink', m.corridas ? `${m.corridas} corridas` : '', veiculoTxt(m)].filter(Boolean).join(' · ');
      }
      q('#rp-agenda-de').textContent = lugar(ag.embarque);
      q('#rp-agenda-para').textContent = lugar(ag.destino);
      q('#rp-agenda-valor').textContent = `${brl(ag.valor)}${ag.adicional ? ' · bandeira 2' : ''}`;
      const taxa = taxaCancelar(ag);
      q('#rp-agenda-gratis').textContent = !m ? 'De graça até alguém reservar' : (taxa ? `Agora custa ${brl(taxa)}` : `De graça até as ${hhmm(new Date(gratisAte(ag)))}`);
      q('#rp-agenda-pronto').hidden = !(m && naJanela(ag.janela) && !ag.pronto);
      const bt = q('#rp-agenda-cancelar');
      bt.textContent = taxa ? `Cancelar · taxa de ${brl(taxa)}` : 'Cancelar o agendamento';
      bt.classList.toggle('com-taxa', Boolean(taxa));
    }

    // ao abrir o app: volta a ouvir as agendadas e confere o que venceu
    lista().forEach((ag) => { if (['procurando', 'confirmada'].includes(ag.estado)) ouvir(ag); });
    const relogio = setInterval(() => { if (lista().length || pendente()) desenhar(); }, 30000);
    desenhar();

    return {
      REGRAS, desenhar, desenharAgendar, escolher, agendar, desenharFolha, pronto, cancelar,
      pendente, desenharPendencia, copiarPendencia, paguei, taxaDaCorrida, ativa,
      parar: () => { clearInterval(relogio); [...assinaturas.keys()].forEach(parar); },
    };
  }

  /* ==========================================================================================================
     o lado de quem dirige
     ========================================================================================================== */
  function motorista(ctx) {
    const q = (s) => $(s, ctx.raiz);
    const reservas = () => { const u = ctx.eu(); if (!u) return []; u.reservas = (u.reservas || []).filter(Boolean); return u.reservas; };
    const taxas = () => { const u = ctx.eu(); if (!u) return []; u.taxasReceber = (u.taxasReceber || []).filter((t) => t && Date.now() - t.t < 12 * 3600000); return u.taxasReceber; };
    const assinaturas = new Map();
    const filas = new Map();
    let abertas = [];
    let carregando = false;

    /* ---------- a lista ---------- */
    async function carregar() {
      if (carregando) return;
      carregando = true;
      try {
        const [lidas, fech] = await Promise.all([R.canal.ler(R.topico.agendadas(), '12h'), R.canal.ler(R.topico.fechados(), '12h')]);
        const fechados = new Map();
        fech.forEach(({ corpo }) => { if (corpo && corpo.tipo === 'fechado' && typeof corpo.id === 'string') fechados.set(corpo.id, corpo.segredo); });
        const minhas = new Set(reservas().map((r) => r.id));
        const agora = Date.now();
        const vistas = new Map();
        for (const { corpo } of lidas) {
          const a = limparAgendada(corpo);
          if (!a || a.janela.de <= agora || minhas.has(a.id)) continue;
          if (fechados.has(a.id) && (await R.resumo(String(fechados.get(a.id) || ''))) === a.fecho) continue;
          vistas.set(a.id, a);
        }
        abertas = [...vistas.values()].sort((x, y) => x.janela.de - y.janela.de);
      } catch (e) {
        abertas = null;
      } finally {
        carregando = false;
      }
      desenhar();
      return abertas;
    }
    function limparAgendada(p) {
      if (!p || p.v !== 1 || p.tipo !== 'agendada' || typeof p.id !== 'string' || typeof p.pub !== 'string' || !p.janela) return null;
      const de = Number(p.janela.de);
      const ate = Number(p.janela.ate);
      if (!Number.isFinite(de) || !Number.isFinite(ate) || ate <= de || ate - de > 3 * 3600000 || !ponto(p.de)) return null;
      const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
      return {
        id: p.id.slice(0, 40), pub: p.pub, janela: { de, ate }, fecho: String(p.fecho || ''),
        de: { bairro: texto(p.de.bairro, 40) || 'BH', lat: p.de.lat, lon: p.de.lon }, para: { bairro: texto(p.para && p.para.bairro, 40) || 'Destino' },
        km: num(p.km), min: num(p.min), valor: num(p.valor), veic: ['bike', 'patinete'].includes(p.veic) ? p.veic : 'qualquer', cambio: texto(p.cambio, 12),
      };
    }

    /* ---------- reservar ---------- */
    async function reservar(id) {
      const u = ctx.eu();
      const a = (abertas || []).find((x) => x.id === id);
      if (!a) return;
      if (!u.motoristaOk || !u.pix) { ctx.avisar('Para reservar, termina o cadastro de motorista e a chave Pix.'); return; }
      if (a.veic !== 'qualquer' && a.veic !== (u.veiculo || 'bike')) { ctx.avisar(`Essa volta pede ${a.veic === 'patinete' ? 'patinete' : 'bike'}. Troca o veículo de hoje no menu, se tiver.`); return; }
      const par = await R.novoPar();
      const chave = await R.chaveComum(par.privada, a.pub);
      const r = { id: a.id, papel: 'm', estado: 'reservada', pedido: a, janela: a.janela, priv: par.priv, pub: par.pub, chave, t: Date.now(), ultimo: null };
      reservas().unshift(r);
      ctx.salvar();
      ouvir(r);
      R.fila.mandar(R.topico.corrida(a.id), await envM(chave, par.pub, {
        tipo: 'aceite', agendada: true,
        motorista: {
          nome: ctx.nomeCurto(u), nota: ctx.nota(u), corridas: u.totalCorridas || 0, veiculo: u.veiculo || 'bike', foto: false, ...PF.doMotorista(u),
          pix: { chave: u.pix.chave, nome: [u.nome, u.sobrenome].filter(Boolean).join(' '), cidade: 'BELO HORIZONTE' },
        },
      }));
      ctx.avisos().mandar(R.topico.aviso(a.id, 'p'), 'ag-reservada');
      abertas = (abertas || []).filter((x) => x.id !== id);
      avisosReservas();
      desenhar();
      ctx.avisar('Reserva enviada. Assim que a pessoa confirmar, a volta é sua.');
    }

    /* ---------- o canal de cada reserva (e das taxas a receber) ---------- */
    function ouvir(r) {
      if (assinaturas.has(r.id)) return;
      const id = r.id;
      const desde = r.ultimo || String(Math.floor(r.t / 1000) - 5);
      assinaturas.set(id, R.canal.assinar([R.topico.corrida(id)], (env, meta) => {
        filas.set(id, (filas.get(id) || Promise.resolve()).then(() => receber(id, env, meta)).catch(() => {}));
      }, { desde }));
    }
    function parar(id) { const s = assinaturas.get(id); if (s) { s.fechar(); assinaturas.delete(id); } }
    async function mandar(r, obj) { R.fila.mandar(R.topico.corrida(r.id), await envM(r.chave, r.pub, obj)); }
    async function receber(id, env, meta) {
      const r = reservas().find((x) => x.id === id) || taxas().find((x) => x.id === id);
      if (!r || !env || env.v !== 1 || env.de !== 'p' || !env.iv) return;
      if (env.para && env.para !== r.pub.slice(0, 16)) return;
      let msg;
      try { msg = await R.decifrar(r.chave, env); } catch (e) { return; }
      if (meta && meta.id) r.ultimo = meta.id;
      tratar(r, msg);
      ctx.salvar();
      desenhar();
    }
    function tratar(r, msg) {
      const nome = r.passageiro ? primeiro(r.passageiro.nome) : 'A pessoa';
      switch (msg.tipo) {
        case 'confirmado': {
          if (r.estado !== 'reservada' || !ponto(msg.embarque) || !ponto(msg.destino)) return;
          r.estado = 'confirmada';
          r.passageiro = { nome: texto(msg.passageiro && msg.passageiro.nome, 40) || 'Passageiro' };
          r.embarque = { lat: msg.embarque.lat, lon: msg.embarque.lon, nome: texto(msg.embarque.nome, 80) || 'Embarque', bairro: texto(msg.embarque.bairro) };
          r.destino = { lat: msg.destino.lat, lon: msg.destino.lon, nome: texto(msg.destino.nome, 80) || 'Destino', bairro: texto(msg.destino.bairro) };
          r.carro = msg.carro && typeof msg.carro === 'object' ? { modelo: texto(msg.carro.modelo, 40), cor: texto(msg.carro.cor, 20), placa: texto(msg.carro.placa, 8), cambio: texto(msg.carro.cambio, 12), marca: texto(msg.carro.marca, 20) } : {};
          r.valor = Number(msg.valor) > 0 ? Number(msg.valor) : r.pedido.valor;
          r.km = Number(msg.km) > 0 ? Number(msg.km) : r.pedido.km;
          ctx.tocar();
          ctx.notificar('Volta agendada confirmada', `${primeiro(r.passageiro.nome)} · ${janelaTxt(r.janela)} · ${r.embarque.bairro || r.embarque.nome}`);
          ctx.avisar(`${primeiro(r.passageiro.nome)} confirmou: a volta de ${janelaTxt(r.janela)} é sua.`);
          break;
        }
        case 'recusado':
          if (r.estado !== 'reservada') return;
          tirar(r.id);
          ctx.avisar('Outro Drink reservou essa volta antes.');
          break;
        case 'cancelado': {
          if (!['reservada', 'confirmada'].includes(r.estado)) return;
          const taxa = Math.max(0, Math.min(REGRAS.taxaNaoVeio, Number(msg.taxa) || 0));
          tirar(r.id);
          if (taxa > 0) aReceber({ id: r.id, chave: r.chave, pub: r.pub, priv: r.priv, valor: taxa, nome: r.passageiro ? r.passageiro.nome : 'Passageiro', rota: rotaTxt(r), motivo: 'cancelou a menos de 2\u00a0h' });
          ctx.tocar();
          ctx.notificar('Volta agendada cancelada', taxa ? `${nome} cancelou: a taxa de ${brl(taxa)} vai por Pix para você.` : `${nome} cancelou com antecedência, sem taxa.`);
          ctx.avisar(taxa ? `${nome} cancelou a volta de ${janelaTxt(r.janela)}. A taxa de ${brl(taxa)} vem por Pix.` : `${nome} cancelou a volta de ${janelaTxt(r.janela)}, com antecedência.`);
          break;
        }
        case 'pronto':
          if (r.estado !== 'confirmada') return;
          r.pronto = Date.now();
          ctx.tocar();
          ctx.notificar(`${nome} está pronto`, `Volta de ${janelaTxt(r.janela)} · ${r.embarque.bairro || r.embarque.nome}`);
          ctx.avisar(`${nome} avisou que está pronto. Toca em "Ir buscar".`);
          break;
        case 'taxa-paga': {
          const t = taxas().find((x) => x.id === r.id);
          if (!t || t.paga) return;
          t.paga = Date.now();
          ctx.registrarTaxa(t);
          parar(t.id);
          ctx.notificar(`${primeiro(t.nome)} pagou a taxa`, `Confere no app do seu banco se os ${brl(t.valor)} caíram.`);
          ctx.avisar(`${primeiro(t.nome)} disse que pagou a taxa de ${brl(t.valor)}. Confere no banco.`);
          break;
        }
        default:
      }
    }
    const rotaTxt = (r) => `${(r.embarque && (r.embarque.bairro || r.embarque.nome)) || r.pedido.de.bairro} → ${(r.destino && (r.destino.bairro || r.destino.nome)) || r.pedido.para.bairro}`;
    function tirar(id) {
      const u = ctx.eu();
      u.reservas = reservas().filter((x) => x.id !== id);
      if (!taxas().some((t) => t.id === id)) parar(id);
      avisosReservas();
      ctx.salvar();
    }
    // a taxa que a pessoa deve: o canal fica aberto até ela dizer que pagou (ou 12 h)
    function aReceber(t) {
      const u = ctx.eu();
      u.taxasReceber = [{ ...t, t: Date.now(), paga: 0 }, ...taxas().filter((x) => x.id !== t.id)].slice(0, 20);
      ctx.salvar();
      if (!assinaturas.has(t.id)) {
        const id = t.id;
        assinaturas.set(id, R.canal.assinar([R.topico.corrida(id)], (env, meta) => {
          filas.set(id, (filas.get(id) || Promise.resolve()).then(() => receber(id, env, meta)).catch(() => {}));
        }, { desde: String(Math.floor(Date.now() / 1000) - 5) }));
      }
    }
    function avisosReservas() {
      const ids = [...reservas().map((r) => r.id), ...taxas().filter((t) => !t.paga).map((t) => t.id)];
      ctx.avisos().definir('reservas', ids.map((id) => R.topico.aviso(id, 'm')));
    }

    /* ---------- ir buscar, desistir ---------- */
    async function ir(id) {
      const r = reservas().find((x) => x.id === id);
      if (!r || r.estado !== 'confirmada') return;
      if (!podeIr(r.janela)) { ctx.avisar(`Dá para sair a partir das ${hhmm(new Date(r.janela.de - REGRAS.irAntesMin * MIN))}.`); return; }
      if (ctx.ocupado()) { ctx.avisar('Termina a corrida de agora antes de ir buscar a agendada.'); return; }
      await mandar(r, { tipo: 'indo' });
      ctx.avisos().mandar(R.topico.aviso(r.id, 'p'), 'ag-indo');
      parar(r.id);
      const u = ctx.eu();
      u.reservas = reservas().filter((x) => x.id !== id);
      avisosReservas();
      ctx.salvar();
      ctx.iniciar(r);
    }
    async function desistir(id) {
      const r = reservas().find((x) => x.id === id);
      if (!r) return;
      await mandar(r, { tipo: 'desistiu' });
      ctx.avisos().mandar(R.topico.aviso(r.id, 'p'), 'ag-desistiu');
      const u = ctx.eu();
      if (r.estado === 'confirmada') u.desistencias = (u.desistencias || 0) + 1;
      tirar(r.id);
      desenhar();
      ctx.avisar('Você desistiu. A pessoa foi avisada e a volta voltou para a lista.');
    }

    /* ---------- o que aparece ---------- */
    function desenhar() {
      const agora = Date.now();
      // reservas que passaram da hora sem ninguém começar saem da lista
      const u = ctx.eu();
      if (u && u.reservas && u.reservas.some((r) => agora > r.janela.ate + REGRAS.toleranciaMin * MIN)) {
        u.reservas.filter((r) => agora > r.janela.ate + REGRAS.toleranciaMin * MIN).forEach((r) => parar(r.id));
        u.reservas = u.reservas.filter((r) => agora <= r.janela.ate + REGRAS.toleranciaMin * MIN);
        ctx.salvar();
      }
      const rs = reservas();
      const ts = taxas().filter((t) => !t.paga);
      const n = (abertas || []).length;
      $$('[data-agd-resumo]', ctx.raiz).forEach((el) => {
        el.textContent = rs.length
          ? `${rs.length} ${rs.length === 1 ? 'reserva' : 'reservas'}${n ? ` · ${n} ${n === 1 ? 'aberta' : 'abertas'}` : ''}`
          : (n ? `${n} ${n === 1 ? 'aberta' : 'abertas'} para reservar` : 'Reserve as voltas de mais tarde');
      });
      $$('[data-agd-bt]', ctx.raiz).forEach((el) => el.classList.toggle('tem', rs.length > 0 || n > 0));
      if (ctx.atual() !== 'agendadas') return;
      const pos = ctx.pos();
      const reservaHtml = (r) => {
        const confirmada = r.estado === 'confirmada';
        const pode = confirmada && podeIr(r.janela, agora);
        const quem = r.passageiro ? r.passageiro.nome : 'Esperando a pessoa confirmar';
        const end = confirmada ? `${r.embarque.nome}${r.embarque.bairro ? ` · ${r.embarque.bairro}` : ''}` : `${r.pedido.de.bairro} (endereço depois da confirmação)`;
        return `<li class="rm-agd-item ${confirmada ? 'confirmada' : 'reservada'}${r.pronto ? ' pronto' : ''}">`
          + `<div class="rm-agd-hora"><b>${hhmm(new Date(r.janela.de))}</b><small>${esc(dia(r.janela.de, agora))}</small></div>`
          + `<div class="rm-agd-txt"><b>${esc(rotaTxt(r))}</b><small>${esc(quem)}${r.pronto ? ' · pronto' : ''}</small><small>${esc(end)}</small></div>`
          + `<em>${brl(r.valor || r.pedido.valor)}</em>`
          + `<div class="rm-agd-bts">${confirmada ? `<button type="button" class="t-botao" data-agd-ir="${esc(r.id)}"${pode ? '' : ' disabled'}>${pode ? 'Ir buscar' : `Sair a partir das ${hhmm(new Date(r.janela.de - REGRAS.irAntesMin * MIN))}`}</button>` : ''}`
          + `<button type="button" class="en-link rm-agd-desistir" data-agd-desistir="${esc(r.id)}">Desistir</button></div></li>`;
      };
      q('#rm-agd-reservas').innerHTML = rs.length ? rs.map(reservaHtml).join('') : '<li class="rm-agd-vazio">Nenhuma reserva sua ainda.</li>';
      q('#rm-agd-taxas-t').hidden = !ts.length;
      q('#rm-agd-taxas').hidden = !ts.length;
      q('#rm-agd-taxas').innerHTML = ts.map((t) => `<li><b>${brl(t.valor)}</b><span>${esc(primeiro(t.nome))} ${esc(t.motivo)} · ${esc(t.rota)}</span><small>Esperando o Pix</small></li>`).join('');
      const lista = q('#rm-agd-abertas');
      if (abertas === null) { lista.innerHTML = '<li class="rm-agd-vazio">Sem conexão com a central. Toca em atualizar.</li>'; return; }
      lista.innerHTML = abertas.length ? abertas.map((a) => {
        const longe = pos ? S.textoKm(S.distancia(pos, a.de) / 1000) : '';
        return `<li class="rm-agd-item aberta"><div class="rm-agd-hora"><b>${hhmm(new Date(a.janela.de))}</b><small>${esc(dia(a.janela.de, agora))}</small></div>`
          + `<div class="rm-agd-txt"><b>${esc(a.de.bairro)} → ${esc(a.para.bairro)}</b><small>${S.virgula(a.km)} km de carro${a.cambio ? ` · câmbio ${esc(a.cambio)}` : ''}</small><small>${longe ? `Embarque a uns ${longe} de você` : 'Embarque aproximado'}</small></div>`
          + `<em>${brl(a.valor)}</em><div class="rm-agd-bts"><button type="button" class="t-bt" data-agd-reservar="${esc(a.id)}">Reservar</button></div></li>`;
      }).join('') : '<li class="rm-agd-vazio">Nenhuma volta agendada aberta agora. Quando alguém agendar perto, o celular avisa.</li>';
    }

    // lembrete: 1 h antes da janela (hora de sair para um lugar longe)
    function lembrar() {
      const agora = Date.now();
      reservas().forEach((r) => {
        if (r.estado === 'confirmada' && !r.lembrou && agora >= r.janela.de - REGRAS.irAntesMin * MIN) {
          r.lembrou = true;
          ctx.salvar();
          ctx.tocar();
          ctx.notificar('Hora de ir buscar', `${primeiro(r.passageiro.nome)} · ${janelaTxt(r.janela)} · ${r.embarque.bairro || r.embarque.nome}`);
        }
      });
      desenhar();
    }

    reservas().forEach(ouvir);
    taxas().filter((t) => !t.paga).forEach((t) => {
      if (assinaturas.has(t.id)) return;
      const id = t.id;
      assinaturas.set(id, R.canal.assinar([R.topico.corrida(id)], (env, meta) => {
        filas.set(id, (filas.get(id) || Promise.resolve()).then(() => receber(id, env, meta)).catch(() => {}));
      }, { desde: t.ultimo || String(Math.floor(t.t / 1000) - 5) }));
    });
    const relogio = setInterval(lembrar, 30000);

    return {
      REGRAS, carregar, desenhar, reservar, ir, desistir, aReceber, reservas,
      parar: () => { clearInterval(relogio); [...assinaturas.keys()].forEach(parar); },
    };
  }

  window.Drink.agenda = { REGRAS, horarios, dia, janelaTxt, taxaCancelar, naJanela, podeIr, passageiro, motorista };
}());
