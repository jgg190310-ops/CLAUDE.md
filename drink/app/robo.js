/* Drink — robôs de teste. Um motorista e um passageiro simulados que conversam com o app pelo mesmo
   protocolo cifrado de uma corrida de verdade, só que na memória do próprio aparelho. Servem para ver
   tudo funcionando sozinho, sem outro celular. Nenhum Pix de verdade sai de uma corrida simulada. */
(function () {
  'use strict';

  const S = window.Drink.servicos;
  const R = window.Drink.rede;

  // anda por uma linha [[lat, lon]…] em "ms" milissegundos, chamando cada(ponto) de tempos em tempos
  function andar(linha, ms, cada, passoMs, parado) {
    return new Promise((ok) => {
      if (!linha || linha.length < 2) { ok(); return; }
      const trechos = [];
      let total = 0;
      for (let i = 0; i < linha.length - 1; i += 1) {
        const d = S.distancia({ lat: linha[i][0], lon: linha[i][1] }, { lat: linha[i + 1][0], lon: linha[i + 1][1] });
        trechos.push(d);
        total += d;
      }
      const inicio = Date.now();
      const passo = () => {
        if (parado()) { ok(); return; }
        const f = Math.min(1, (Date.now() - inicio) / ms);
        let alvo = f * total;
        let i = 0;
        while (i < trechos.length - 1 && alvo > trechos[i]) { alvo -= trechos[i]; i += 1; }
        const t = trechos[i] ? Math.min(1, alvo / trechos[i]) : 1;
        cada({ lat: linha[i][0] + (linha[i + 1][0] - linha[i][0]) * t, lon: linha[i][1] + (linha[i + 1][1] - linha[i][1]) * t });
        if (f < 1) setTimeout(passo, passoMs); else ok();
      };
      passo();
    });
  }

  /* ---------- motorista simulado ---------- */
  function motorista(canal, { pedido, codigo }) {
    let parado = false;
    let resolver = null;
    const esperando = new Map();
    const topico = R.topico.corrida(pedido.id);
    const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
    let par = null;
    let chave = null;
    const enviar = async (obj) => {
      if (parado) return;
      canal.publicar(topico, { v: 1, de: 'm', k: par.pub, ...(await R.cifrar(chave, obj)) });
    };
    const esperar = (tipo) => new Promise((ok) => { esperando.set(tipo, ok); });
    const sub = canal.assinar([topico], async (env) => {
      if (parado || !env || env.de !== 'p' || !chave) return;
      let msg;
      try { msg = await R.decifrar(chave, env); } catch (e) { return; }
      if (msg.tipo === 'cancelado') { parar(); return; }
      if (esperando.has(msg.tipo)) { const f = esperando.get(msg.tipo); esperando.delete(msg.tipo); f(msg); }
      if (msg.tipo === 'msg') setTimeout(() => enviar({ tipo: 'msg', txt: 'Beleza! Já estou chegando.' }), 1500);
    });
    function parar() { parado = true; sub.fechar(); if (resolver) resolver(); }

    (async () => {
      par = await R.novoPar();
      chave = await R.chaveComum(par.privada, pedido.pub);
      await dormir(2600);
      // começa uns 1,5 km longe do ponto aproximado do pedido
      const inicio = { lat: pedido.de.lat + 0.009, lon: pedido.de.lon - 0.008 };
      const confirmado = esperar('confirmado');
      await enviar({ tipo: 'aceite', motorista: { nome: 'Rafael Souza (simulado)', nota: 4.9, corridas: 312, veiculo: 'bike', teste: true }, pos: inicio });
      const conf = await confirmado;
      if (parado) return;
      const ida = await S.rota(inicio, conf.embarque);
      await andar(ida.linha, 14000, (p) => enviar({ tipo: 'pos', lat: p.lat, lon: p.lon }), 900, () => parado);
      await enviar({ tipo: 'etapa', etapa: 'chegou' });
      await dormir(3500);
      const conferido = esperar('codigo-ok');
      await enviar({ tipo: 'codigo', valor: codigo });
      const ok = await conferido;
      if (parado || !ok.ok) return;
      for (let n = 1; n <= 5; n += 1) { await dormir(1100); await enviar({ tipo: 'etapa', etapa: 'vistoria', fotos: n }); }
      await dormir(2500);
      await enviar({ tipo: 'etapa', etapa: 'malas' });
      await dormir(1800);
      await enviar({ tipo: 'etapa', etapa: 'viagem' });
      const volta = await S.rota(conf.embarque, conf.destino);
      await andar(volta.linha, 22000, (p) => enviar({ tipo: 'pos', lat: p.lat, lon: p.lon }), 900, () => parado);
      await enviar({ tipo: 'etapa', etapa: 'chegada', valor: conf.valor });
      await enviar({ tipo: 'cobranca', simulado: true });
      await esperar('paguei');
      await dormir(1600);
      await enviar({ tipo: 'recebido' });
      parar();
    })();
    return { parar };
  }

  /* ---------- passageiro simulado (para testar o app do motorista) ---------- */
  const EMBARQUES = [
    { nome: 'Rua Pernambuco, 1000', bairro: 'Savassi', lat: -19.9386, lon: -43.9346 },
    { nome: 'Rua Mármore, 120', bairro: 'Santa Tereza', lat: -19.9135, lon: -43.9185 },
    { nome: 'Rua da Bahia, 1148', bairro: 'Centro', lat: -19.9260, lon: -43.9380 },
  ];
  const DESTINOS = [
    { nome: 'Rua Professor Mário Werneck, 2000', bairro: 'Buritis', lat: -19.9745, lon: -43.9705 },
    { nome: 'Avenida Otacílio Negrão de Lima', bairro: 'Pampulha', lat: -19.8510, lon: -43.9770 },
    { nome: 'Rua Grão Mogol, 500', bairro: 'Sion', lat: -19.9540, lon: -43.9310 },
  ];
  async function passageiro(canal, { perto }) {
    let parado = false;
    const par = await R.novoPar();
    const id = R.idAleatorio();
    const topico = R.topico.corrida(id);
    // embarque perto do motorista (até uns 1,5 km); se ele estiver longe de BH, cria um ponto ao lado
    let embarque = EMBARQUES.slice().sort((a, b) => S.distancia(perto, a) - S.distancia(perto, b))[0];
    if (S.distancia(perto, embarque) > 3000) embarque = { nome: 'Ponto de teste', bairro: 'Perto de você', lat: perto.lat + 0.006, lon: perto.lon - 0.004 };
    let destino = DESTINOS.slice().sort((a, b) => S.distancia(embarque, b) - S.distancia(embarque, a))[0];
    if (S.distancia(embarque, destino) > 25000) destino = { nome: 'Destino de teste', bairro: 'Outro bairro', lat: embarque.lat - 0.03, lon: embarque.lon - 0.02 };
    const rota = await S.rota(embarque, destino);
    const preco = S.preco(rota.km);
    const valor = Math.round(preco.total * 100) / 100;
    const agora = Date.now();
    const pedido = {
      v: 1, tipo: 'pedido', id, t: agora, expira: agora + 3 * 60000, pub: par.pub, teste: true,
      de: { bairro: embarque.bairro, ...S.aproximar(embarque) }, para: { bairro: destino.bairro },
      km: Math.round(rota.km * 10) / 10, min: Math.round(rota.min), valor, veic: 'qualquer', cambio: 'automático',
    };
    let chave = null;
    let pubMotorista = null;
    const enviar = async (obj) => {
      if (parado || !chave) return;
      canal.publicar(topico, { v: 1, de: 'p', para: pubMotorista.slice(0, 16), ...(await R.cifrar(chave, obj)) });
    };
    const sub = canal.assinar([topico], async (env) => {
      if (parado || !env || env.de !== 'm' || !env.k) return;
      if (!chave) {
        chave = await R.chaveComum(par.privada, env.k);
        pubMotorista = env.k;
      }
      if (env.k !== pubMotorista) return;
      let msg;
      try { msg = await R.decifrar(chave, env); } catch (e) { return; }
      if (msg.tipo === 'aceite') {
        setTimeout(() => enviar({
          tipo: 'confirmado', passageiro: { nome: 'Júlia A. (simulada)' }, embarque, destino,
          carro: { modelo: 'Onix', cor: 'prata', placa: '', cambio: 'automático' }, valor, km: pedido.km, dicaCodigo: '1234',
        }), 1500);
      } else if (msg.tipo === 'codigo') {
        enviar({ tipo: 'codigo-ok', ok: String(msg.valor) === '1234' });
      } else if (msg.tipo === 'etapa' && msg.etapa === 'chegada') {
        setTimeout(() => enviar({ tipo: 'avaliacao', nota: 5, tags: ['Pontual', 'Cuidou do carro'], gorjeta: 5, total: valor + 5 }), 2000);
        setTimeout(() => enviar({ tipo: 'paguei', total: valor + 5 }), 3800);
      } else if (msg.tipo === 'msg') {
        setTimeout(() => enviar({ tipo: 'msg', txt: 'Tô na porta, carro prata!' }), 1400);
      } else if (msg.tipo === 'recebido' || msg.tipo === 'cancelado') {
        parar();
      }
    });
    function parar() { parado = true; sub.fechar(); }
    return { pedido, parar };
  }

  window.Drink.robo = { motorista, passageiro };
}());
