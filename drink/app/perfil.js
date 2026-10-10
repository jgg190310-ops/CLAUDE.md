/* Drink — o perfil de quem dirige, igual nos dois lados: o motorista conta qual é a bike ou o patinete (marca, modelo e
   cor) e o passageiro vê isso quando a corrida é aceita, como o carro e a placa nos apps de carro. Tocando na foto,
   o passageiro vê o perfil: o rosto, a nota, as corridas, desde quando dirige, os elogios e o que o cadastro pediu.
   Tudo o que chega pela rede passa por limpar(): só vale o que tem a forma certa. */
(function () {
  // as cores, no feminino (a bike) e no masculino (o patinete), com a amostra
  const CORES = [
    { chave: 'preto', f: 'preta', m: 'preto', hex: '#1B1B1F' },
    { chave: 'branco', f: 'branca', m: 'branco', hex: '#F4F4F2' },
    { chave: 'cinza', f: 'cinza', m: 'cinza', hex: '#8A8C93' },
    { chave: 'prata', f: 'prata', m: 'prata', hex: '#C9CCD2' },
    { chave: 'azul', f: 'azul', m: 'azul', hex: '#2F5BEA' },
    { chave: 'vermelho', f: 'vermelha', m: 'vermelho', hex: '#D7263D' },
    { chave: 'verde', f: 'verde', m: 'verde', hex: '#2E9E5B' },
    { chave: 'amarelo', f: 'amarela', m: 'amarelo', hex: '#F2C94C' },
    { chave: 'laranja', f: 'laranja', m: 'laranja', hex: '#F2853A' },
    { chave: 'rosa', f: 'rosa', m: 'rosa', hex: '#EE6FA8' },
  ];
  // os elogios que o passageiro pode dar (os mesmos botões do fim da corrida)
  const ELOGIOS = ['Pontual', 'Cuidou do carro', 'Dirigiu com calma', 'Gente boa'];

  const tipo = (t) => (t === 'patinete' ? 'patinete' : 'bike');
  const cor = (chave) => CORES.find((c) => c.chave === chave) || null;
  const texto = (t) => (tipo(t) === 'patinete' ? 'Patinete elétrico dobrável' : 'Bike elétrica dobrável');
  const curto = (t) => (tipo(t) === 'patinete' ? 'Patinete elétrico' : 'Bike elétrica');
  const corTxt = (chave, t) => { const c = cor(chave); return c ? c[tipo(t) === 'patinete' ? 'm' : 'f'] : ''; };
  // "Caloi E-Vibe preta", "Xiaomi M365 preto", "Bike elétrica preta" ou só "Bike elétrica"
  function descrever(v) {
    if (!v) return '';
    const t = tipo(v.tipo);
    const c = corTxt(v.cor, t);
    const nome = v.modelo || curto(t);
    return c ? `${nome} ${c}` : nome;
  }
  const limparTexto = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  function limparVeiculo(v) {
    if (!v || typeof v !== 'object') return null;
    return { tipo: tipo(v.tipo), modelo: limparTexto(v.modelo, 40), cor: cor(v.cor) ? v.cor : '' };
  }
  // o mês e o ano em que o cadastro de motorista ficou completo
  function desdeTxt(ms) {
    const d = new Date(Number(ms));
    if (!Number(ms) || Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 864e5) return '';
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  // o que o motorista manda no aceite, a partir da conta dele
  function doMotorista(u) {
    const veic = { tipo: tipo(u.veiculo), ...((u.veiculos && u.veiculos[tipo(u.veiculo)]) || {}) };
    const docs = u.docs || {};
    const elogios = Object.entries(u.elogios || {})
      .filter(([t, n]) => ELOGIOS.includes(t) && n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t, n]) => ({ t, n }));
    return {
      veic: limparVeiculo(veic),
      desde: Number(u.motoristaDesde) || 0,
      docs: { cnh: Boolean(docs.cnh), antecedentes: Boolean(docs.antecedentes), treino: Boolean(docs.treino), selfie: Boolean(u.selfie) },
      elogios,
    };
  }
  // o que o passageiro aceita do aceite
  function limpar(m) {
    const p = m && typeof m === 'object' ? m : {};
    const docs = p.docs && typeof p.docs === 'object' ? p.docs : {};
    return {
      veic: limparVeiculo(p.veic),
      desde: Number(p.desde) > 0 ? Number(p.desde) : 0,
      docs: { cnh: docs.cnh === true, antecedentes: docs.antecedentes === true, treino: docs.treino === true, selfie: docs.selfie === true },
      elogios: (Array.isArray(p.elogios) ? p.elogios : [])
        .filter((e) => e && ELOGIOS.includes(e.t) && Number.isFinite(Number(e.n)) && Number(e.n) > 0)
        .slice(0, 4)
        .map((e) => ({ t: e.t, n: Math.min(9999, Math.round(Number(e.n))) })),
    };
  }
  // guarda os elogios de uma corrida boa
  function somarElogios(u, nota, tags) {
    if (!(nota >= 4) || !Array.isArray(tags)) return;
    u.elogios = { ...(u.elogios || {}) };
    tags.filter((t) => ELOGIOS.includes(t)).forEach((t) => { u.elogios[t] = (u.elogios[t] || 0) + 1; });
  }

  window.Drink = window.Drink || {};
  window.Drink.perfil = { CORES, ELOGIOS, tipo, cor, texto, curto, corTxt, descrever, limparVeiculo, desdeTxt, doMotorista, limpar, somarElogios };
}());
