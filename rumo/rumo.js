/* Rumo — tarefas, dinheiro e rotina num lugar só.
   Tudo fica salvo neste aparelho (localStorage). Backup em Ajustes. */
(() => {
'use strict';

const KEY = 'rumo:v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- dinheiro ---------- */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const BRLc = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const din = v => BRL.format(v || 0);
const din0 = v => BRL0.format(Math.round(v || 0));
const dinC = v => BRLc.format(v || 0);
const num2 = v => (Math.round(v * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function lerValor(s) {
  s = String(s || '').trim().replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /^-?\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  return Math.round(parseFloat(s) * 100) / 100;
}

/* ---------- datas (sempre no fuso do aparelho) ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => iso(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDias = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const difDias = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
const mesDe = s => s.slice(0, 7);
const addMes = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(m)}`; };
const diasNoMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIA_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIA_L = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
function rotDia(s) {
  const t = hoje();
  if (s === t) return 'Hoje';
  if (s === addDias(t, 1)) return 'Amanhã';
  if (s === addDias(t, -1)) return 'Ontem';
  const d = parse(s);
  const base = `${DIA_C[d.getDay()]}, ${d.getDate()} ${MES_C[d.getMonth()]}`;
  return d.getFullYear() !== parse(t).getFullYear() ? `${base} ${d.getFullYear()}` : base;
}
const rotMes = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} de ${y}`; };
const rotMesC = ym => MES_C[Number(ym.slice(5, 7)) - 1];

/* ---------- ícones (traço, 24×24) ---------- */
const IC = {
  hoje: '<circle cx="12" cy="12" r="8.5"/><path d="m15.4 8.6-2.2 4.6-4.6 2.2 2.2-4.6z"/>',
  tarefas: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="m8 12.2 2.8 2.8L16.2 9"/>',
  dinheiro: '<path d="M4 8V7a2 2 0 0 1 2-2h11v3"/><rect x="3.5" y="8" width="17" height="11.5" rx="2.2"/><path d="M15.5 13.7h1.8"/>',
  rotina: '<path d="M4.5 11a7.5 7.5 0 0 1 13.4-4.2L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 13a7.5 7.5 0 0 1-13.4 4.2L4.5 15"/><path d="M4.5 19.5V15H9"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  ajustes: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2.2"/><circle cx="9" cy="16.5" r="2.2"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="m5.5 12.5 4 4 9-9.5"/>',
  esq: '<path d="m14.5 6-6 6 6 6"/>',
  dir: '<path d="m9.5 6 6 6-6 6"/>',
  setas: '<path d="M4.5 8.5h14l-3.5-3.5M19.5 15.5h-14L9 19"/>',
  fogo: '<path d="M12 20.5c-3.8 0-6.3-2.5-6.3-6 0-3.3 2.4-5.2 3.5-8 .9 1.6 1.9 2.5 2.9 2.8-.2-2.4.7-4.6 2.5-6.2.4 2.9 2.3 4.5 3.4 6.5.8 1.4 1.2 2.9 1.2 4.7 0 3.6-2.5 6.2-7.2 6.2z"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  alerta: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.8v.2"/>',
  casa: '<path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  carrinho: '<path d="M3 4.5h2.2l2.3 10.5h10l2-7.5H6.4"/><circle cx="9" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  garfo: '<path d="M7 3.5V10M4.5 3.5V8a2.5 2.5 0 0 0 5 0V3.5M7 10.5v10M17 20.5v-17c-2.2 0-3.5 2.4-3.5 6s1.3 4.5 3.5 4.5"/>',
  carro: '<path d="M5 16v-4l1.8-4.6A1.6 1.6 0 0 1 8.3 6.4h7.4a1.6 1.6 0 0 1 1.5 1L19 12v4z"/><path d="M5 16v2.5M19 16v2.5M5 12h14M8 14h.01M16 14h.01"/>',
  raio: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  coracao: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  estrela: '<path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  livro: '<path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11.5"/>',
  play: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
  sacola: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  pontos: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  maleta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  notebook: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18.5h18"/>',
  grafico: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  presente: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M4 13.5h16M12 9C10.5 5.5 7 5.5 7 7.8 7 9 9 9 12 9zm0 0c1.5-3.5 5-3.5 5-1.2C17 9 15 9 12 9z"/>',
  banco: '<path d="M3.5 9.5 12 4.5l8.5 5M5.5 10.5v7M9.8 10.5v7M14.2 10.5v7M18.5 10.5v7M3.5 20h17"/>',
  cofre: '<rect x="3.5" y="5" width="17" height="13.5" rx="2.2"/><circle cx="12" cy="11.8" r="3"/><path d="M6.5 18.5V20M17.5 18.5V20"/>',
  cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3 10h18M7 15h3"/>',
  notas: '<rect x="3" y="6.5" width="18" height="11" rx="1.6"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/>',
  manha: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>',
  tarde: '<path d="M3.5 18.5h17M7 18.5a5 5 0 0 1 10 0M12 7.5v2.5M5.6 11.6l1.6 1.1M18.4 11.6l-1.6 1.1"/>',
  noite: '<path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.4 7.4 0 1 0 9.6 9.6z"/>',
  dia: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bandeira: '<path d="M5.5 20.5v-16M5.5 4.5h11l-2 4 2 4h-11"/>',
  baixar: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  subir: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;

/* ---------- categorias ---------- */
const CAT_S = {
  moradia: { nome: 'Moradia', cor: '#5466E8', ic: 'casa', re: /aluguel|condom|iptu|reforma|moveis/ },
  mercado: { nome: 'Mercado', cor: '#16865A', ic: 'carrinho', re: /mercad|supermerc|atacad|hortifr|feira|padaria|acougue|assai|carrefour|sacolao/ },
  comida: { nome: 'Comer fora', cor: '#D9662D', ic: 'garfo', re: /ifood|restaur|lanche|pizza|hamburg|burger|almoc|janta|cafe|\bbar\b|acai|sushi|delivery|rappi/ },
  transporte: { nome: 'Transporte', cor: '#2A7FC0', ic: 'carro', re: /uber|\b99\b|taxi|onibus|metro|gasolina|combust|estacion|pedagio|ipva|posto|passagem/ },
  contas: { nome: 'Contas da casa', cor: '#8556D0', ic: 'raio', re: /\bluz\b|energia|cemig|enel|copasa|\bagua\b|internet|celular|telefone|\bgas\b|\bvivo\b|\bclaro\b|\btim\b/ },
  saude: { nome: 'Saúde', cor: '#CF4366', ic: 'coracao', re: /farmac|drogar|medic|consulta|exame|academia|dentista|plano de saude|remedio|terapia/ },
  assinaturas: { nome: 'Assinaturas', cor: '#64707A', ic: 'play', re: /netflix|spotify|prime|disney|hbo|\bmax\b|youtube|assinatura|icloud|google one|deezer|globoplay/ },
  educacao: { nome: 'Educação', cor: '#0C7D8E', ic: 'livro', re: /curso|livro|faculdade|escola|ingles|mensalidade|apostila/ },
  lazer: { nome: 'Lazer', cor: '#B98410', ic: 'estrela', re: /cinema|show|ingresso|viagem|passeio|jogo|festa|balada/ },
  compras: { nome: 'Compras', cor: '#B04C88', ic: 'sacola', re: /roupa|tenis|shopee|amazon|mercado livre|shein|magalu|presente/ },
  outros: { nome: 'Outros gastos', cor: '#76827E', ic: 'pontos', re: null },
};
const CAT_E = {
  salario: { nome: 'Salário', cor: '#1C7A45', ic: 'maleta', re: /salar|holerite|pagamento/ },
  freela: { nome: 'Freela e bicos', cor: '#2A7FC0', ic: 'notebook', re: /freela|\bjob\b|projeto|cliente|bico/ },
  rendimentos: { nome: 'Rendimentos', cor: '#B98410', ic: 'grafico', re: /rendim|juros|dividend|\bcdb\b|tesouro|cashback/ },
  presente: { nome: 'Presente', cor: '#B04C88', ic: 'presente', re: /presente|mesada/ },
  outros_e: { nome: 'Outras entradas', cor: '#76827E', ic: 'pontos', re: null },
};
const catInfo = l => l.tipo === 'entrada' ? (CAT_E[l.cat] || CAT_E.outros_e) : l.tipo === 'transf' ? { nome: 'Transferência', cor: '#64707A', ic: 'setas' } : (CAT_S[l.cat] || CAT_S.outros);
function sugerirCat(desc, tipo) {
  const t = norm(desc), mapa = tipo === 'entrada' ? CAT_E : CAT_S;
  for (const [k, c] of Object.entries(mapa)) if (c.re && c.re.test(t)) return k;
  return null;
}
const TIPOS_CONTA = {
  corrente: { nome: 'Conta corrente', ic: 'banco' },
  poupanca: { nome: 'Reserva / poupança', ic: 'cofre' },
  investimento: { nome: 'Investimento', ic: 'grafico' },
  carteira: { nome: 'Dinheiro vivo', ic: 'notas' },
  cartao: { nome: 'Cartão de crédito', ic: 'cartao' },
};
const CORES = ['#0F5C66', '#7B3FD0', '#E06A12', '#1C7A45', '#C63B54', '#2A6FD6', '#B98410', '#4A5560'];
const AREAS = ['Pessoal', 'Trabalho', 'Estudos', 'Casa', 'Dinheiro', 'Saúde'];
const PERIODOS = {
  manha: { nome: 'Manhã', ic: 'manha' },
  tarde: { nome: 'Tarde', ic: 'tarde' },
  noite: { nome: 'Noite', ic: 'noite' },
  dia: { nome: 'Ao longo do dia', ic: 'dia' },
};
const PRIO = { 1: 'Alta', 2: 'Normal', 3: 'Baixa' };

/* ---------- estado ---------- */
function vazio() {
  return {
    v: 1, exemplo: false, boasVindas: false, passos: true,
    perfil: { nome: '', meta: 20, rendimento: 10, tema: 'sistema' },
    contas: [], lanc: [], fixas: [], orcamento: {}, tarefas: [], habitos: [],
    conexao: { url: '', chave: '', itens: [], ultima: null },
  };
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function exemplo() {
  const S = vazio(); S.exemplo = true;
  const r = rng(42), entre = (a, b) => Math.round((a + r() * (b - a)) * 100) / 100;
  const t = hoje(), ymNow = mesDe(t), dNow = parse(t).getDate();
  S.contas = [
    { id: 'c1', nome: 'Nubank', tipo: 'corrente', saldoInicial: 980, cor: '#7B3FD0' },
    { id: 'c2', nome: 'Reserva no Inter', tipo: 'poupanca', saldoInicial: 3100, cor: '#E06A12' },
    { id: 'c3', nome: 'Tesouro Selic', tipo: 'investimento', saldoInicial: 4200, cor: '#0F5C66' },
    { id: 'c4', nome: 'Carteira', tipo: 'carteira', saldoInicial: 70, cor: '#4A5560' },
  ];
  S.fixas = [
    { id: 'f1', desc: 'Aluguel', valor: 1350, dia: 10, cat: 'moradia', conta: 'c1', pagas: {} },
    { id: 'f2', desc: 'Luz', valor: 138.4, dia: 15, cat: 'contas', conta: 'c1', pagas: {} },
    { id: 'f3', desc: 'Internet', valor: 99.9, dia: 20, cat: 'contas', conta: 'c1', pagas: {} },
    { id: 'f4', desc: 'Academia', valor: 109.9, dia: 5, cat: 'saude', conta: 'c1', pagas: {} },
    { id: 'f5', desc: 'Spotify', valor: 23.9, dia: 12, cat: 'assinaturas', conta: 'c1', pagas: {} },
    { id: 'f6', desc: 'Celular', valor: 59.9, dia: 25, cat: 'contas', conta: 'c1', pagas: {} },
  ];
  S.orcamento = { mercado: 1100, comida: 320, transporte: 260, lazer: 250, compras: 200 };
  const L = (tipo, valor, desc, cat, conta, data, extra = {}) => { const l = { id: uid(), tipo, valor, desc, cat, conta, data, ...extra }; S.lanc.push(l); return l; };
  for (let k = 5; k >= 0; k--) {
    const ym = addMes(ymNow, -k), fim = k === 0 ? dNow : diasNoMes(ym);
    const dt = d => `${ym}-${pad(d)}`;
    L('entrada', 4200, 'Salário', 'salario', 'c1', dt(1));
    if (fim >= 1) L('entrada', entre(52, 61), 'Rendimento do Tesouro', 'rendimentos', 'c3', dt(1));
    if (k % 2 === 1 && fim >= 18) L('entrada', entre(550, 900), 'Freela de design', 'freela', 'c1', dt(18));
    if (fim >= 6) L('transf', 500, 'Aporte no Tesouro', null, 'c1', dt(6), { destino: 'c3' });
    if (fim >= 7) L('transf', 150, 'Para a reserva', null, 'c1', dt(7), { destino: 'c2' });
    for (const f of S.fixas) {
      const pagar = k > 0 ? true : f.dia < dNow;
      if (pagar) { const l = L('saida', f.desc === 'Luz' ? entre(118, 162) : f.valor, f.desc, f.cat, f.conta, dt(Math.min(f.dia, diasNoMes(ym)))); f.pagas[ym] = l.id; }
    }
    for (let d = 2; d <= fim; d += 7) L('saida', entre(170, 310), r() > .5 ? 'Supermercado BH' : 'Mercado do bairro', 'mercado', 'c1', dt(d));
    for (let d = 1; d <= fim; d++) {
      const x = r();
      if (x < .13) L('saida', entre(24, 68), ['iFood', 'Almoço no trabalho', 'Pizza com amigos', 'Padaria e café'][Math.floor(r() * 4)], 'comida', 'c1', dt(d));
      else if (x < .3) L('saida', entre(11, 32), r() > .3 ? 'Uber' : 'Ônibus', 'transporte', r() > .85 ? 'c4' : 'c1', dt(d));
    }
    if (fim >= 13) L('saida', entre(60, 140), r() > .5 ? 'Cinema' : 'Show no sábado', 'lazer', 'c1', dt(13));
    if (fim >= 22) L('saida', entre(90, 230), 'Tênis novo', 'compras', 'c1', dt(22));
    if (fim >= 27) L('saida', entre(35, 80), 'Farmácia', 'saude', 'c1', dt(27));
  }
  const tar = (titulo, dd, prio, area, feita) => S.tarefas.push({ id: uid(), titulo, data: dd == null ? '' : addDias(t, dd), prio, area, nota: '', feita: !!feita, feitaEm: feita ? addDias(t, feita === true ? 0 : feita) : null, criada: addDias(t, -5) });
  tar('Pagar o boleto do IPVA', -1, 1, 'Dinheiro');
  tar('Ligar para o pai', 0, 2, 'Pessoal');
  tar('Mandar o currículo para a vaga de estágio', 0, 1, 'Trabalho');
  tar('Estudar 1 hora de inglês', 0, 2, 'Estudos', true);
  tar('Comprar o presente da mãe', 2, 2, 'Pessoal');
  tar('Levar o carro na revisão', 4, 3, 'Casa');
  tar('Ver quais assinaturas eu não uso', null, 2, 'Dinheiro');
  tar('Abrir uma reserva de emergência', null, 1, 'Dinheiro');
  tar('Separar 10% do salário', -2, 1, 'Dinheiro', -2);
  const hab = (nome, dias, periodo, hora, p) => {
    const h = { id: uid(), nome, dias, periodo, hora, feitos: {}, criado: addDias(t, -45) };
    for (let d = 1; d <= 44; d++) { const dd = addDias(t, -d); if (agendado(h, dd) && r() < p) h.feitos[dd] = 1; }
    S.habitos.push(h); return h;
  };
  const SEMANA = [1, 2, 3, 4, 5], TODOS = [0, 1, 2, 3, 4, 5, 6];
  hab('Acordar às 6h30', SEMANA, 'manha', '06:30', .86).feitos[t] = 1;
  hab('Beber 2 litros de água', TODOS, 'dia', '', .7);
  hab('Treinar', [1, 3, 5], 'tarde', '18:00', .8);
  hab('Anotar os gastos do dia', TODOS, 'noite', '21:30', .9);
  hab('Ler 20 páginas', TODOS, 'noite', '22:00', .6);
  return S;
}

function migrar(s) {
  const base = vazio();
  const out = { ...base, ...s, perfil: { ...base.perfil, ...(s.perfil || {}) } };
  for (const k of ['contas', 'lanc', 'fixas', 'tarefas', 'habitos']) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.orcamento || typeof out.orcamento !== 'object') out.orcamento = {};
  out.conexao = { ...base.conexao, ...(s.conexao || {}) };
  if (!Array.isArray(out.conexao.itens)) out.conexao.itens = [];
  // quem abriu a primeira versão caiu direto no exemplo: pergunta uma vez como quer começar
  if (s.exemplo && !('boasVindas' in s)) out.boasVindas = true;
  return out;
}
/* ---------- onde fica guardado ----------
   Duas cópias: IndexedDB (espaço grande, separado) e localStorage (rápido).
   O localStorage deste endereço é dividido com os outros apps do site (Drink,
   OSHelp): quando as fotos deles enchem os ~5 MB, o Safari recusa gravar ali,
   e o IndexedDB continua guardando. Ao abrir, vale a cópia mais nova. */
const armaz = { ls: null, idb: null, privado: false, ultimo: 0 };
let bancoIDB = null;
function abrirIDB() {
  if (bancoIDB) return bancoIDB;
  bancoIDB = new Promise((ok, falha) => {
    if (!('indexedDB' in window)) { falha(new Error('sem IndexedDB')); return; }
    let r;
    try { r = indexedDB.open('rumo', 1); } catch (e) { falha(e); return; }
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('estado')) r.result.createObjectStore('estado'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error || new Error('IndexedDB'));
    r.onblocked = () => falha(new Error('IndexedDB bloqueado'));
  });
  bancoIDB.catch(() => { bancoIDB = null; });
  return bancoIDB;
}
async function idbLer() {
  const db = await abrirIDB();
  return new Promise((ok, falha) => {
    const g = db.transaction('estado', 'readonly').objectStore('estado').get(KEY);
    g.onsuccess = () => ok(g.result ?? null); g.onerror = () => falha(g.error);
  });
}
async function idbGravar(txt) {
  const db = await abrirIDB();
  return new Promise((ok, falha) => {
    const tx = db.transaction('estado', 'readwrite');
    tx.objectStore('estado').put(txt, KEY); // texto, não Blob: o Safari em aba privada falha calado com Blob
    tx.oncomplete = () => ok(); tx.onerror = () => falha(tx.error); tx.onabort = () => falha(tx.error || new Error('abortado'));
  });
}
const comPrazo = (p, ms) => Promise.race([p, new Promise((_, f) => setTimeout(() => f(new Error('demorou')), ms))]);
function lerJSON(raw) { try { const d = raw ? JSON.parse(raw) : null; return d && typeof d === 'object' ? d : null; } catch (e) { return null; } }
async function carregar() {
  let deLS = null, deIDB = null;
  try { deLS = lerJSON(localStorage.getItem(KEY)); } catch (e) { /* bloqueado */ }
  try { deIDB = lerJSON(await comPrazo(idbLer(), 2000)); } catch (e) { /* sem IndexedDB */ }
  const melhor = [deLS, deIDB].filter(Boolean).sort((a, b) => (b.salvoEm || 0) - (a.salvoEm || 0))[0];
  if (melhor) return migrar(melhor);
  const novo = vazio(); novo.boasVindas = true;
  return novo;
}
let S = vazio(); S.boasVindas = true;
let pronto = false, falhouSalvar = false, filaIDB = Promise.resolve();
function salvar() {
  if (!pronto) return Promise.resolve();
  S.salvoEm = Date.now();
  const txt = JSON.stringify(S);
  try { localStorage.setItem(KEY, txt); armaz.ls = true; } catch (e) { armaz.ls = false; }
  filaIDB = filaIDB.then(() => idbGravar(txt)).then(() => { armaz.idb = true; }, () => { armaz.idb = false; }).then(() => {
    const falhou = !armaz.ls && !armaz.idb;
    if (falhou && !falhouSalvar) { toast('O navegador não deixou guardar. O que você anotar pode sumir ao fechar.'); render(); }
    if (!falhou) armaz.ultimo = Date.now();
    if (falhouSalvar && !falhou) render();
    falhouSalvar = falhou;
  });
  return filaIDB;
}
async function conferirArmazenamento() {
  // aba privada do Safari: a pasta de arquivos do site não abre ("unknown transient reason")
  try { if (navigator.storage?.getDirectory) await navigator.storage.getDirectory(); }
  catch (e) { if (/unknown transient reason/i.test(String(e?.message))) armaz.privado = true; }
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (e) { /* opcional */ }
}
function avisoArmazenamento() {
  if (armaz.privado) return `<div class="alerta-armaz" role="alert"><b>Aba privada.</b> O Safari apaga tudo o que você anotar quando esta aba fechar. Abra o Rumo numa aba normal ou instale na tela de início.</div>`;
  if (falhouSalvar) return `<div class="alerta-armaz" role="alert"><b>Não está salvando.</b> O navegador recusou guardar os seus dados neste aparelho. No iPhone, veja em Ajustes › Safari se “Bloquear Todos os Cookies” está desligado e se não é uma aba privada. Até lá, baixe um backup em Ajustes.</div>`;
  return '';
}
function mudar(fn, msg, comDesfazer = true) {
  const antes = JSON.stringify(S);
  fn(); salvar(); render();
  if (msg) toast(msg, comDesfazer ? () => { S = JSON.parse(antes); salvar(); render(); } : null);
}

/* ---------- contas e lançamentos ---------- */
const contaPor = id => S.contas.find(c => c.id === id);
function saldo(id) {
  const c = contaPor(id); if (!c) return 0;
  let s = c.saldoInicial || 0;
  for (const l of S.lanc) {
    if (l.tipo === 'entrada' && l.conta === id) s += l.valor;
    else if (l.tipo === 'saida' && l.conta === id) s -= l.valor;
    else if (l.tipo === 'transf') { if (l.conta === id) s -= l.valor; if (l.destino === id) s += l.valor; }
  }
  return Math.round(s * 100) / 100;
}
const patrimonio = () => S.contas.reduce((a, c) => a + saldo(c.id), 0);
function resumoMes(ym) {
  const r = { entradas: 0, saidas: 0, porCat: {}, qtd: 0 };
  for (const l of S.lanc) {
    if (mesDe(l.data) !== ym || l.tipo === 'transf') continue;
    r.qtd++;
    if (l.tipo === 'entrada') r.entradas += l.valor;
    else { r.saidas += l.valor; r.porCat[l.cat] = (r.porCat[l.cat] || 0) + l.valor; }
  }
  r.sobra = r.entradas - r.saidas;
  r.taxa = r.entradas > 0 ? r.sobra / r.entradas : null;
  return r;
}
function statusFixa(f, ym) {
  const lid = f.pagas?.[ym];
  if (lid && S.lanc.some(l => l.id === lid)) return { paga: true, rot: 'Paga', cls: 'ok' };
  const venc = `${ym}-${pad(Math.min(f.dia, diasNoMes(ym)))}`, d = difDias(venc, hoje());
  if (d < 0) return { venc, d, rot: d === -1 ? 'Venceu ontem' : `Atrasada há ${-d} dias`, cls: 'out' };
  if (d === 0) return { venc, d, rot: 'Vence hoje', cls: 'warn' };
  if (d <= 7) return { venc, d, rot: d === 1 ? 'Vence amanhã' : `Vence em ${d} dias`, cls: 'warn' };
  return { venc, d, rot: `Vence dia ${f.dia}`, cls: '' };
}
function projecao() {
  const P = patrimonio(), ym = mesDe(hoje());
  let soma = 0, n = 0;
  for (let k = 1; k <= 3; k++) { const r = resumoMes(addMes(ym, -k)); if (r.qtd) { soma += r.sobra; n++; } }
  const A = n ? soma / n : 0;
  const taxa = (Number(S.perfil.rendimento) || 0) / 100, i = Math.pow(1 + taxa, 1 / 12) - 1;
  const fv = (m, a) => i ? P * Math.pow(1 + i, m) + a * (Math.pow(1 + i, m) - 1) / i : P + a * m;
  const ateMilhao = a => { if (P >= 1e6) return 0; for (let m = 1; m <= 960; m++) if (fv(m, a) >= 1e6) return m; return null; };
  const a0 = Math.max(A, 0);
  return { P, A, n, fv, a0, m1: ateMilhao(a0), m2: ateMilhao(a0 + 300) };
}
const anosTxt = m => { if (m == null) return 'mais de 80 anos'; if (m === 0) return 'já chegou'; const a = Math.floor(m / 12), r = m % 12; if (a === 0) return `${r} ${r === 1 ? 'mês' : 'meses'}`; return r ? `${a} ${a === 1 ? 'ano' : 'anos'} e ${r} ${r === 1 ? 'mês' : 'meses'}` : `${a} ${a === 1 ? 'ano' : 'anos'}`; };

/* ---------- tarefas e hábitos ---------- */
function agendado(h, d) { return h.dias.includes(parse(d).getDay()); }
function sequencia(h) {
  let d = hoje(); if (!h.feitos[d]) d = addDias(d, -1);
  let n = 0;
  for (let g = 0; g < 500; g++) {
    if (h.criado && d < h.criado) break;
    if (agendado(h, d)) { if (h.feitos[d]) n++; else break; }
    d = addDias(d, -1);
  }
  return n;
}
function taxa30(h) {
  let ag = 0, f = 0, d = hoje();
  for (let k = 0; k < 30; k++, d = addDias(d, -1)) { if (h.criado && d < h.criado) break; if (agendado(h, d)) { ag++; if (h.feitos[d]) f++; } }
  return ag ? f / ag : null;
}
const ordTar = (a, b) => (a.data || '9999') .localeCompare(b.data || '9999') || a.prio - b.prio || a.titulo.localeCompare(b.titulo);
function tarefasHoje() {
  const t = hoje();
  return S.tarefas.filter(x => x.data && x.data <= t && (!x.feita || x.feitaEm === t)).sort((a, b) => (a.feita - b.feita) || ordTar(a, b));
}
function placarDia(d) {
  const habs = S.habitos.filter(h => agendado(h, d));
  const fh = habs.filter(h => h.feitos[d]).length;
  return { total: habs.length, feitos: fh };
}

/* ---------- interface ---------- */
const ui = { aba: 'hoje', din: 'geral', mes: mesDe(hoje()), tar: 'hoje', dia: hoje(), busca: '' };
const ABAS = ['hoje', 'tarefas', 'dinheiro', 'rotina'];

function anel(p, tam = 64, esp = 7, cls = '') {
  const r = (tam - esp) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p || 0));
  return `<svg class="anel ${cls}" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--trilha)" stroke-width="${esp}"/>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${esp}" stroke-linecap="round"
      stroke-dasharray="${(c * v).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/></svg>`;
}
const chipCat = (info, tam = '') => `<span class="cat-ic ${tam}" style="--c:${info.cor}">${ic(info.ic)}</span>`;
const vazioBox = (titulo, texto, botao, acao) => `<div class="vazio"><p class="vazio-t">${titulo}</p><p>${texto}</p>${botao ? `<button class="btn btn-sec" type="button" data-a="${acao}">${ic('mais')}${botao}</button>` : ''}</div>`;

function bannerExemplo() {
  return `<div class="aviso" role="note">
    <span class="aviso-ponto" aria-hidden="true"></span>
    <p><strong>Modo exemplo.</strong> Os dados abaixo são fictícios.</p>
    <button class="aviso-btn" type="button" data-a="zerar-exemplo">Começar do zero</button>
  </div>`;
}
/* valor com os centavos à parte, para o número grande */
function dinGrande(v) {
  const partes = BRL.formatToParts(v || 0);
  let ini = '', cent = '';
  let depois = false;
  for (const p of partes) { if (p.type === 'decimal') depois = true; if (depois) cent += p.value; else ini += p.value; }
  return `${esc(ini)}<span class="cent">${esc(cent)}</span>`;
}
function seriePatrimonio(dias) {
  const t = hoje(), delta = {};
  for (const l of S.lanc) { if (l.tipo === 'transf') continue; delta[l.data] = (delta[l.data] || 0) + (l.tipo === 'entrada' ? l.valor : -l.valor); }
  let acc = patrimonio();
  for (const [d, v] of Object.entries(delta)) if (d > t) acc -= v;
  const out = []; let d = t;
  for (let k = 0; k < dias; k++) { out.unshift({ d, v: acc }); acc -= delta[d] || 0; d = addDias(d, -1); }
  return out;
}
function sparkline(serie, W = 600, H = 96) {
  const vs = serie.map(p => p.v), min = Math.min(...vs), max = Math.max(...vs), amp = max - min || 1;
  const x = k => (k / (serie.length - 1)) * W, y = v => 6 + (H - 12) * (1 - (v - min) / amp);
  const pts = serie.map((p, k) => `${x(k).toFixed(1)},${y(p.v).toFixed(1)}`);
  const ult = serie[serie.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--hero-linha)" stop-opacity=".28"/><stop offset="1" stop-color="var(--hero-linha)" stop-opacity="0"/></linearGradient></defs>
    <path d="M${pts.join(' L')} L${W},${H} L0,${H} Z" fill="url(#spark-g)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--hero-linha)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    <circle cx="${x(serie.length - 1)}" cy="${y(ult.v)}" r="3.2" fill="var(--hero-linha)" vector-effect="non-scaling-stroke"/>
  </svg>`;
}
function topoBloco(titulo, cont, link) {
  return `<header class="bloco-topo"><h2>${titulo}${cont != null && cont !== '' ? `<span class="cont">${cont}</span>` : ''}</h2>${link || ''}</header>`;
}
const linkIr = (txt, aba, din) => `<button class="topo-link" type="button" data-a="ir" data-aba="${aba}"${din ? ` data-din="${din}"` : ''}>${txt}${ic('dir')}</button>`;

/* ===== Boas-vindas ===== */
function viewBoasVindas() {
  return `<section class="bv">
    <svg class="bv-marca" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" class="marca-bg"/><path d="M16 5.5 20 16h-8z" class="marca-n"/><path d="M12 16h8l-4 10.5z" class="marca-s"/></svg>
    <p class="eyebrow">Bem-vindo ao Rumo</p>
    <h1 tabindex="-1">Tarefas, dinheiro e rotina, num lugar só.</h1>
    <p class="sub">Tudo o que você anotar fica guardado só neste aparelho.</p>
    <form class="bv-form" data-form="bv" autocomplete="off">
      <label class="campo"><span>Como quer ser chamado?</span><input id="bv-nome" name="nome" maxlength="30" value="${esc(S.perfil.nome)}" placeholder="Seu nome (opcional)"></label>
      <div class="bv-op">
        ${instalado() ? '<button class="bv-b bv-prim" type="button" data-a="trazer"><b>Trazer meus dados do Safari</b><small>Já usa o Rumo no Safari? No Safari, abra Ajustes › Levar meus dados e digite o código aqui.</small></button>' : ''}
        <button class="bv-b ${instalado() ? '' : 'bv-prim'}" type="submit" name="modo" value="zero"><b>Começar do zero</b><small>O app abre vazio, pronto para as suas contas, tarefas e hábitos.</small></button>
        <button class="bv-b" type="submit" name="modo" value="exemplo"><b>Ver com um exemplo</b><small>Dados fictícios para conhecer o app. Dá para apagar depois com um toque.</small></button>
      </div>
      ${instalado() ? '' : '<button class="bv-trazer" type="button" data-a="trazer">Já usa o Rumo em outro lugar? <b>Trazer meus dados</b></button>'}
    </form>
  </section>`;
}
function blocoPassos() {
  if (S.exemplo || S.passos === false) return '';
  const passos = [
    [S.contas.length, 'nova-conta', 'Cadastre sua conta do banco', 'Com o saldo de hoje, olhando no app do banco'],
    [S.fixas.length, 'nova-fixa', 'Adicione as contas de todo mês', 'Aluguel, luz, internet, academia'],
    [S.lanc.length, 'novo-gasto', 'Anote seu primeiro gasto', 'Na hora em que gastar, leva 5 segundos'],
    [S.tarefas.length, 'nova-tarefa', 'Escreva o que precisa fazer', 'Tirar da cabeça já é metade do caminho'],
    [S.habitos.length, 'novo-habito', 'Crie o primeiro hábito', 'Algo pequeno, para repetir todo dia'],
  ];
  const feitos = passos.filter(p => p[0]).length;
  if (feitos === passos.length) return '';
  return `<section class="bloco passos">
    ${topoBloco('Primeiros passos', `${feitos} de ${passos.length}`, '<button class="topo-link" type="button" data-a="passos-ocultar">Esconder</button>')}
    <div class="meta-barra passos-barra" aria-hidden="true"><span class="meta-fill" style="width:${feitos / passos.length * 100}%"></span></div>
    <ol class="lista passos-lista">${passos.map(([ok, a, t, sub], i) => `<li class="item${ok ? ' feita' : ''}">
      <span class="passo-n" aria-hidden="true">${ok ? ic('check') : i + 1}</span>
      ${ok ? `<span class="item-corpo"><span class="item-t">${t}</span><span class="item-m"><span>Feito</span></span></span>` : `<button class="item-corpo" type="button" data-a="${a}"><span class="item-t">${t}</span><span class="item-m"><span>${sub}</span></span></button>`}
      ${ok ? '' : `<button class="btn btn-mini btn-sec" type="button" data-a="${a}" aria-label="${t}">Fazer</button>`}
    </li>`).join('')}</ol>
  </section>`;
}

/* ===== Hoje ===== */
function viewHoje() {
  const t = hoje(), d = parse(t), h = new Date().getHours();
  const saud = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = S.perfil.nome.trim();
  const tars = tarefasHoje(), pl = placarDia(t);
  const total = tars.length + pl.total, feitos = tars.filter(x => x.feita).length + pl.feitos;
  const frase = total === 0 ? 'Nada marcado para hoje ainda.'
    : feitos === total ? `Tudo feito hoje. ${total} de ${total}.`
    : `${feitos} de ${total} coisas feitas hoje.`;
  return `
  <section class="cabeca">
    <div class="cabeca-txt">
      <p class="eyebrow">${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}</p>
      <h1 tabindex="-1">${saud}${nome ? `, ${esc(nome)}` : ''}</h1>
      <p class="sub">${frase}${!nome ? ` <button class="link" type="button" data-a="ajustes">Como quer ser chamado?</button>` : ''}</p>
    </div>
    <div class="placar" aria-label="${feitos} de ${total} feitos hoje">${anel(total ? feitos / total : 0, 64, 4)}<span>${feitos}<small>/${total}</small></span></div>
  </section>
  ${blocoPassos()}
  ${S.contas.length || S.exemplo || S.passos === false ? heroHoje() : ''}
  <div class="grade-hoje">
    <div class="col">
      ${blocoTarefasHoje(tars)}
      ${blocoRotinaHoje()}
    </div>
    <div class="col">
      ${blocoVencer()}
      ${blocoMilhao()}
    </div>
  </div>`;
}

function itemTarefa(x, mostrarData = true) {
  const t = hoje(), atras = !x.feita && x.data && x.data < t;
  const meta = [];
  if (mostrarData && x.data) meta.push(atras ? `<span class="tag out">Atrasada · ${rotDia(x.data).toLowerCase()}</span>` : `<span>${rotDia(x.data)}</span>`);
  if (x.area) meta.push(`<span>${esc(x.area)}</span>`);
  if (x.nota) meta.push(`<span class="nota">${esc(x.nota)}</span>`);
  return `<li class="item tarefa${x.feita ? ' feita' : ''}">
    <button class="chk" type="button" data-a="tarefa-ok" data-id="${x.id}" aria-pressed="${x.feita}" aria-label="${x.feita ? 'Desmarcar' : 'Marcar como feita'}: ${esc(x.titulo)}">${ic('check')}</button>
    <button class="item-corpo" type="button" data-a="tarefa-edit" data-id="${x.id}">
      <span class="item-t">${esc(x.titulo)}</span>
      ${meta.length ? `<span class="item-m">${meta.join('<i>·</i>')}</span>` : ''}
    </button>
    ${x.prio === 1 && !x.feita ? `<span class="prio" title="Prioridade alta"><span class="sr">Prioridade alta</span></span>` : ''}
  </li>`;
}
function formRapido(id, ph, comQuando) {
  return `<form class="rapido" data-form="tarefa-rapida" autocomplete="off">
    <span class="rapido-ic" aria-hidden="true">${ic('mais')}</span>
    <label class="sr" for="${id}">Nova tarefa</label>
    <input id="${id}" name="titulo" placeholder="${ph}" maxlength="140" enterkeyhint="done">
    ${comQuando ? `<label class="sr" for="${id}-q">Quando</label><select id="${id}-q" name="quando"><option value="0">Hoje</option><option value="1">Amanhã</option><option value="7">Em 1 semana</option><option value="">Sem data</option></select>` : '<input type="hidden" name="quando" value="0">'}
    <button class="rapido-ok" type="submit">Adicionar</button>
  </form>`;
}
function blocoTarefasHoje(tars) {
  const pend = tars.filter(x => !x.feita).length;
  return `<section class="bloco">
    ${topoBloco('Para fazer hoje', pend || '', linkIr('Todas', 'tarefas'))}
    ${tars.length ? `<ul class="lista">${tars.map(x => itemTarefa(x)).join('')}</ul>` : `<p class="calmo">Nenhuma tarefa para hoje.</p>`}
    ${formRapido('rap-hoje', 'Nova tarefa para hoje', false)}
  </section>`;
}
function itemHabito(h, dia, compacto) {
  const feito = !!h.feitos[dia], seq = sequencia(h), futuro = dia > hoje();
  return `<li class="item habito${feito ? ' feita' : ''}">
    <button class="chk chk-q" type="button" data-a="habito-ok" data-id="${h.id}" data-dia="${dia}" aria-pressed="${feito}" ${futuro ? 'disabled' : ''} aria-label="${feito ? 'Desmarcar' : 'Marcar'}: ${esc(h.nome)}">${ic('check')}</button>
    <button class="item-corpo" type="button" data-a="habito-edit" data-id="${h.id}">
      <span class="item-t">${esc(h.nome)}</span>
      <span class="item-m">${h.hora ? `<span>${h.hora.replace(':', 'h')}</span>` : ''}${!compacto ? `${h.hora ? '<i>·</i>' : ''}<span>${diasTxt(h.dias)}</span>` : ''}</span>
    </button>
    ${seq > 1 ? `<span class="seq" title="${seq} vezes seguidas">${seq}<small>${seq === 1 ? 'dia' : 'dias'}</small></span>` : ''}
  </li>`;
}
function diasTxt(d) {
  const s = [...d].sort().join('');
  if (s === '0123456') return 'Todo dia';
  if (s === '12345') return 'Dias úteis';
  if (s === '06') return 'Fim de semana';
  return [1, 2, 3, 4, 5, 6, 0].filter(x => d.includes(x)).map(x => DIA_C[x]).join(', ');
}
function habitosPorPeriodo(dia, compacto) {
  const hs = S.habitos.filter(h => agendado(h, dia));
  const ordem = ['manha', 'tarde', 'noite', 'dia'];
  return ordem.map(p => {
    const g = hs.filter(h => (h.periodo || 'dia') === p).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    if (!g.length) return '';
    return `<div class="periodo"><p class="periodo-t">${PERIODOS[p].nome}</p><ul class="lista">${g.map(h => itemHabito(h, dia, compacto)).join('')}</ul></div>`;
  }).join('');
}
function blocoRotinaHoje() {
  const t = hoje(), pl = placarDia(t);
  return `<section class="bloco">
    ${topoBloco('Rotina de hoje', pl.total ? `${pl.feitos}/${pl.total}` : '', S.habitos.length ? linkIr('Semana', 'rotina') : '')}
    ${S.habitos.length ? (pl.total ? habitosPorPeriodo(t, true) : '<p class="calmo">Nenhum hábito marcado para hoje.</p>')
      : vazioBox('Monte sua rotina', 'Hábitos pequenos, repetidos todo dia, são o que muda a vida. Comece com um.', 'Criar hábito', 'novo-habito')}
  </section>`;
}
function heroHoje() {
  if (!S.contas.length) return `<section class="hero hero-vazio">
    <p class="hero-rot">Patrimônio</p>
    <p class="hero-valor">R$ 0<span class="cent">,00</span></p>
    <p class="hero-txt">Cadastre suas contas com o saldo de hoje. A partir daí o Rumo acompanha cada real que entra e sai.</p>
    <button class="btn btn-claro" type="button" data-a="nova-conta">${ic('mais')}Adicionar conta do banco</button>
  </section>`;
  const ym = mesDe(hoje()), r = resumoMes(ym), P = patrimonio(), meta = (S.perfil.meta || 0) / 100;
  const serie = seriePatrimonio(90), var30 = P - serie[Math.max(0, serie.length - 31)].v;
  const pct = r.taxa == null ? 0 : Math.max(0, r.taxa);
  let msg;
  if (r.taxa == null) msg = 'Ainda não entrou dinheiro este mês.';
  else if (r.taxa >= meta) msg = `Meta de ${S.perfil.meta}% batida`;
  else if (r.taxa > 0) msg = `Faltam ${din0(meta * r.entradas - r.sobra)} para a meta de ${S.perfil.meta}%`;
  else msg = `Saiu ${din0(-r.sobra)} a mais do que entrou`;
  return `<section class="hero">
    <div class="hero-grade">
      <div class="hero-esq">
        <div class="hero-topo">
          <p class="hero-rot">Patrimônio</p>
          ${linkIr(`${S.contas.length} ${S.contas.length === 1 ? 'conta' : 'contas'}`, 'dinheiro', 'contas').replace('topo-link', 'hero-link')}
        </div>
        <p class="hero-valor ${P < 0 ? 'neg' : ''}">${dinGrande(P)}</p>
        <p class="hero-var"><span class="${var30 >= 0 ? 'sobe' : 'desce'}">${var30 >= 0 ? '+' : '−'} ${din(Math.abs(var30))}</span> nos últimos 30 dias</p>
        <div class="hero-graf">${sparkline(serie)}</div>
      </div>
      <div class="hero-dir">
        <p class="hero-rot">${MESES[Number(ym.slice(5, 7)) - 1].replace(/^./, c => c.toUpperCase())}</p>
        <dl class="hero-mes">
          <div><dt>Entrou</dt><dd>${din0(r.entradas)}</dd></div>
          <div><dt>Saiu</dt><dd>${din0(r.saidas)}</dd></div>
          <div><dt>Sobrou</dt><dd class="${r.sobra < 0 ? 'desce' : ''}">${din0(r.sobra)}</dd></div>
        </dl>
        <div class="hero-meta">
          <div class="hero-meta-topo"><span>Guardou <b>${r.taxa == null ? '—' : Math.round(r.taxa * 100) + '%'}</b></span><span>${msg}</span></div>
          <div class="meta-barra" role="img" aria-label="Guardou ${Math.round(pct * 100)}% de uma meta de ${S.perfil.meta}%">
            <span class="meta-fill" style="width:${Math.min(100, pct * 100)}%"></span>
            <span class="meta-marca" style="left:${Math.min(100, meta * 100)}%"></span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}
function blocoVencer() {
  if (!S.fixas.length) return `<section class="bloco">${topoBloco('Contas a vencer')}${vazioBox('Nenhuma conta fixa', 'Cadastre aluguel, luz, internet e o que mais vence todo mês. O Rumo avisa antes do vencimento.', 'Adicionar conta fixa', 'nova-fixa')}</section>`;
  const ym = mesDe(hoje());
  const lista = S.fixas.map(f => ({ f, s: statusFixa(f, ym) })).filter(x => !x.s.paga && x.s.d <= 10).sort((a, b) => a.s.d - b.s.d);
  const pagas = S.fixas.filter(f => statusFixa(f, ym).paga).length;
  return `<section class="bloco">
    ${topoBloco('Contas a vencer', `${pagas}/${S.fixas.length} pagas`, linkIr('Mês', 'dinheiro', 'fixas'))}
    ${lista.length ? `<ul class="lista">${lista.map(({ f, s }) => itemFixa(f, s, ym)).join('')}</ul>` : '<p class="calmo">Nada vence nos próximos 10 dias.</p>'}
  </section>`;
}

function itemFixa(f, s, ym) {
  const info = CAT_S[f.cat] || CAT_S.outros;
  return `<li class="item">
    ${chipCat(info)}
    <button class="item-corpo" type="button" data-a="fixa-edit" data-id="${f.id}">
      <span class="item-t">${esc(f.desc)}</span>
      <span class="item-m"><span class="pill ${s.cls}">${s.rot}</span></span>
    </button>
    <span class="fixa-dir"><span class="valor">${din(f.valor)}</span>
    ${s.paga ? `<button class="btn btn-mini btn-sec" type="button" data-a="fixa-desfazer" data-id="${f.id}" data-ym="${ym}">Desfazer</button>`
      : `<button class="btn btn-mini" type="button" data-a="fixa-pagar" data-id="${f.id}" data-ym="${ym}">Paguei</button>`}</span>
  </li>`;
}
function blocoMilhao() {
  if (!S.contas.length) return '';
  const p = projecao(), taxa = S.perfil.rendimento;
  const anos = 20, W = 340, H = 168, ml = 50, mr = 10, mt = 12, mb = 26;
  const serie = a => Array.from({ length: anos + 1 }, (_, y) => p.fv(y * 12, a));
  const s1 = serie(p.a0), s2 = serie(p.a0 + 300);
  const max = Math.max(...s2, 1);
  const tk = ticks(max, 4), top = tk[tk.length - 1];
  const x = y => ml + (W - ml - mr) * y / anos, yv = v => mt + (H - mt - mb) * (1 - v / top);
  const linha = s => s.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${yv(v).toFixed(1)}`).join(' ');
  const area = `${linha(s1)} L${x(anos)} ${yv(0)} L${x(0)} ${yv(0)} Z`;
  const ultimo = s1[anos];
  let txt;
  if (p.m1 === 0) txt = 'Você já passou do primeiro milhão. Agora é proteger e fazer render.';
  else if (p.a0 <= 0) txt = `Nos últimos meses não sobrou dinheiro. Só com o que você tem hoje rendendo ${taxa}% ao ano, o milhão chega em ${anosTxt(p.m1)}. Guardando ${din0(300)} por mês, em ${anosTxt(p.m2)}.`;
  else txt = `Guardando ${din0(p.a0)} por mês, como na média dos últimos meses, você chega ao primeiro milhão em <strong>${anosTxt(p.m1)}</strong>. Com ${din0(300)} a mais por mês, em <strong>${anosTxt(p.m2)}</strong>.`;
  return `<section class="bloco bloco-milhao">
    ${topoBloco('Rumo ao primeiro milhão')}
    <p class="calmo">${txt}</p>
    <div class="grafico" role="img" aria-label="Projeção do patrimônio em 20 anos: ${din0(ultimo)} no ritmo atual">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${tk.map(v => `<line x1="${ml}" x2="${W - mr}" y1="${yv(v)}" y2="${yv(v)}" class="g-grade"/><text x="${ml - 6}" y="${yv(v) + 3.5}" text-anchor="end" class="g-txt">${v ? dinC(v).replace('R$', '').trim() : '0'}</text>`).join('')}
      ${1e6 <= top ? `<line x1="${ml}" x2="${W - mr}" y1="${yv(1e6)}" y2="${yv(1e6)}" class="g-milhao"/><text x="${ml + 6}" y="${yv(1e6) - 5}" class="g-txt g-forte">1 milhão</text>` : ''}
      <path d="${area}" class="g-area"/>
      <path d="${linha(s2)}" class="g-linha2"/>
      <path d="${linha(s1)}" class="g-linha"/>
      <circle cx="${x(anos)}" cy="${yv(ultimo)}" r="3.5" class="g-ponto"/>
      ${[0, 5, 10, 15, 20].map(y => `<text x="${x(y)}" y="${H - 8}" text-anchor="${y === 0 ? 'start' : y === 20 ? 'end' : 'middle'}" class="g-txt">${y === 0 ? 'hoje' : `${y} anos`}</text>`).join('')}
    </svg></div>
    <div class="legenda"><span><i class="lg-1"></i>No ritmo atual: ${dinC(ultimo)} em 20 anos</span><span><i class="lg-2"></i>Com ${din0(300)} a mais: ${dinC(s2[anos])}</span></div>
    <p class="miudo">Conta feita com rendimento de ${taxa}% ao ano, antes de impostos e inflação. <button class="link" type="button" data-a="ajustes">Mudar</button></p>
  </section>`;
}
function ticks(max, n) {
  if (max <= 0) return [0, 1];
  const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const out = []; for (let v = 0; v < max + step * .999; v += step) out.push(Math.round(v));
  return out;
}

/* ===== Tarefas ===== */
function viewTarefas() {
  const t = hoje(), pend = S.tarefas.filter(x => !x.feita);
  const grupos = {
    hoje: pend.filter(x => x.data && x.data <= t),
    proximas: pend.filter(x => x.data && x.data > t),
    semdata: pend.filter(x => !x.data),
    feitas: S.tarefas.filter(x => x.feita).sort((a, b) => (b.feitaEm || '').localeCompare(a.feitaEm || '')),
  };
  const rot = { hoje: 'Hoje', proximas: 'Próximas', semdata: 'Sem data', feitas: 'Feitas' };
  const g = grupos[ui.tar] || grupos.hoje;
  let corpo;
  if (!S.tarefas.length) corpo = vazioBox('Sua lista está vazia', 'Escreva tudo o que está na sua cabeça. Tirar da cabeça e pôr na lista já é metade do caminho.', null);
  else if (!g.length) corpo = `<p class="calmo centro">${{ hoje: 'Nada para hoje. Aproveite ou adiante uma das próximas.', proximas: 'Nenhuma tarefa com data marcada para os próximos dias.', semdata: 'Nenhuma tarefa sem data.', feitas: 'Você ainda não concluiu nenhuma tarefa.' }[ui.tar]}</p>`;
  else if (ui.tar === 'proximas') {
    const dias = [...new Set(g.map(x => x.data))].sort();
    corpo = dias.map(d => `<h3 class="dia-t">${rotDia(d)}</h3><ul class="lista">${g.filter(x => x.data === d).sort(ordTar).map(x => itemTarefa(x, false)).join('')}</ul>`).join('');
  } else if (ui.tar === 'feitas') {
    corpo = `<ul class="lista">${g.slice(0, 60).map(x => itemTarefa(x)).join('')}</ul>`;
  } else corpo = `<ul class="lista">${g.sort(ordTar).map(x => itemTarefa(x, ui.tar === 'hoje')).join('')}</ul>`;
  const feitasSemana = S.tarefas.filter(x => x.feita && x.feitaEm && difDias(t, x.feitaEm) < 7).length;
  return `
  <section class="cabeca cabeca-p">
    <div class="cabeca-txt"><p class="eyebrow">Tarefas</p><h1 tabindex="-1">O que precisa sair do papel</h1>
    <p class="sub">${pend.length} ${pend.length === 1 ? 'pendente' : 'pendentes'} · ${feitasSemana} ${feitasSemana === 1 ? 'feita' : 'feitas'} nos últimos 7 dias</p></div>
  </section>
  <section class="bloco">
    ${formRapido('rap-tar', 'Escreva uma tarefa e aperte Enter', true)}
    <div class="seg" role="tablist" aria-label="Filtrar tarefas">
      ${Object.keys(rot).map(k => `<button type="button" role="tab" aria-selected="${ui.tar === k}" data-a="tar" data-v="${k}">${rot[k]}${k !== 'feitas' && grupos[k].length ? ` <span class="n">${grupos[k].length}</span>` : ''}</button>`).join('')}
    </div>
    <div class="tar-corpo">${corpo}</div>
  </section>`;
}

/* ===== Dinheiro ===== */
function viewDinheiro() {
  const rot = { geral: 'Mês', extrato: 'Extrato', contas: 'Contas', fixas: 'Contas fixas' };
  const comMes = ui.din !== 'contas';
  let corpo = '';
  if (!S.contas.length && ui.din !== 'fixas') corpo = `<section class="bloco">${vazioBox('Comece pela sua conta do banco', 'Cadastre cada conta com o saldo de hoje: conta corrente, reserva, investimento e o dinheiro da carteira.', 'Adicionar conta', 'nova-conta')}</section>`;
  else corpo = { geral: dinGeral, extrato: dinExtrato, contas: dinContas, fixas: dinFixas }[ui.din]();
  return `
  <section class="cabeca cabeca-p">
    <div class="cabeca-txt"><p class="eyebrow">Dinheiro</p><h1 tabindex="-1">Para onde vai cada real</h1></div>
  </section>
  <div class="barra-din">
    <div class="seg" role="tablist" aria-label="Seções do dinheiro">
      ${Object.keys(rot).map(k => `<button type="button" role="tab" aria-selected="${ui.din === k}" data-a="din" data-v="${k}">${rot[k]}</button>`).join('')}
    </div>
    ${comMes ? `<div class="mes-nav"><button class="ic-btn" type="button" data-a="mes" data-d="-1" aria-label="Mês anterior">${ic('esq')}</button><span class="mes-nome">${rotMes(ui.mes)}</span><button class="ic-btn" type="button" data-a="mes" data-d="1" aria-label="Próximo mês" ${ui.mes >= mesDe(hoje()) ? 'disabled' : ''}>${ic('dir')}</button></div>` : ''}
  </div>
  ${corpo}`;
}
function dinGeral() {
  const r = resumoMes(ui.mes), meta = S.perfil.meta;
  const cats = Object.entries(r.porCat).sort((a, b) => b[1] - a[1]);
  const orc = S.orcamento || {};
  const todas = [...new Set([...cats.map(c => c[0]), ...Object.keys(orc).filter(k => orc[k] > 0)])];
  const maxCat = Math.max(1, ...todas.map(k => Math.max(r.porCat[k] || 0, orc[k] || 0)));
  const ehAtual = ui.mes === mesDe(hoje());
  const dPass = ehAtual ? parse(hoje()).getDate() : diasNoMes(ui.mes), dMes = diasNoMes(ui.mes);
  const linhas = todas.sort((a, b) => (r.porCat[b] || 0) - (r.porCat[a] || 0)).map(k => {
    const info = CAT_S[k] || CAT_S.outros, v = r.porCat[k] || 0, lim = orc[k] || 0;
    const estouro = lim && v > lim, perto = lim && !estouro && v > lim * .85;
    return `<li class="cat-linha">
      <button class="cat-btn" type="button" data-a="cat-extrato" data-cat="${k}">
        ${chipCat(info)}
        <span class="cat-info">
          <span class="cat-topo"><span class="item-t">${info.nome}</span><span class="valor">${din(v)}${lim ? `<small> de ${din0(lim)}</small>` : ''}</span></span>
          <span class="cat-trilha"><span class="cat-fill ${estouro ? 'out' : perto ? 'warn' : ''}" style="width:${(v / maxCat * 100).toFixed(1)}%;--c:${info.cor}"></span>${lim ? `<span class="cat-lim" style="left:${(lim / maxCat * 100).toFixed(1)}%"></span>` : ''}</span>
          ${estouro ? `<span class="item-m"><span class="pill out">Passou ${din0(v - lim)} do limite</span></span>` : perto ? `<span class="item-m"><span class="pill warn">Restam ${din0(lim - v)}</span></span>` : ''}
        </span>
      </button>
    </li>`;
  }).join('');
  const taxaTxt = r.taxa == null ? '—' : `${Math.round(r.taxa * 100)}%`;
  return `
  <div class="grade-2">
    <section class="hero hero-mes-din">
      <p class="hero-rot">Sobrou em ${MESES[Number(ui.mes.slice(5, 7)) - 1]}</p>
      <p class="hero-valor ${r.sobra < 0 ? 'neg' : ''}">${dinGrande(r.sobra)}</p>
      <dl class="hero-mes">
        <div><dt>Entrou</dt><dd>${din0(r.entradas)}</dd></div>
        <div><dt>Saiu</dt><dd>${din0(r.saidas)}</dd></div>
        <div><dt>Guardou</dt><dd class="${r.taxa != null && r.taxa * 100 >= meta ? 'sobe' : ''}">${taxaTxt}<small> meta ${meta}%</small></dd></div>
      </dl>
      ${ehAtual && r.saidas > 0 ? `<p class="hero-txt">Gasto médio de ${din0(r.saidas / dPass)} por dia. Nesse ritmo, o mês fecha com ${din0(r.saidas / dPass * dMes)} de gastos.</p>` : ''}
      <div class="hero-barras">${graficoMeses()}</div>
    </section>
    <section class="bloco">
      ${topoBloco('Gastos por categoria', '', '<button class="topo-link" type="button" data-a="orcamento">Limites</button>')}
      ${todas.length ? `<ul class="cats">${linhas}</ul><p class="miudo">A marca na barra é o limite que você definiu para o mês.</p>` : '<p class="calmo">Nenhum gasto neste mês.</p>'}
    </section>
  </div>`;
}
function graficoMeses() {
  const meses = Array.from({ length: 6 }, (_, k) => addMes(ui.mes, k - 5));
  const dados = meses.map(m => ({ m, ...resumoMes(m) }));
  const max = Math.max(1, ...dados.map(d => Math.max(d.entradas, d.saidas)));
  const tk = ticks(max, 3), top = tk[tk.length - 1];
  const W = 340, H = 150, ml = 40, mr = 4, mt = 8, mb = 22, gw = (W - ml - mr) / 6, bw = Math.min(16, gw * .3);
  const y = v => mt + (H - mt - mb) * (1 - v / top);
  return `<div class="grafico" role="img" aria-label="Entradas e saídas dos últimos 6 meses">
  <svg viewBox="0 0 ${W} ${H}">
    ${tk.map(v => `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${ml - 6}" y="${y(v) + 3.5}" text-anchor="end" class="g-txt">${v ? dinC(v).replace('R$', '').trim() : '0'}</text>`).join('')}
    ${dados.map((d, k) => {
      const cx = ml + gw * k + gw / 2, sel = d.m === ui.mes;
      return `<g class="${sel ? 'sel' : ''}">
        ${sel ? `<rect x="${cx - gw / 2 + 2}" y="${mt - 4}" width="${gw - 4}" height="${H - mt - mb + 4}" rx="6" class="g-sel"/>` : ''}
        <rect x="${cx - bw - 1.5}" y="${y(d.entradas)}" width="${bw}" height="${Math.max(0, y(0) - y(d.entradas))}" rx="2.5" class="g-in"/>
        <rect x="${cx + 1.5}" y="${y(d.saidas)}" width="${bw}" height="${Math.max(0, y(0) - y(d.saidas))}" rx="2.5" class="g-out"/>
        <text x="${cx}" y="${H - 6}" text-anchor="middle" class="g-txt ${sel ? 'g-forte' : ''}">${rotMesC(d.m)}</text></g>`;
    }).join('')}
  </svg></div>
  <div class="legenda"><span><i class="lg-in"></i>Entrou</span><span><i class="lg-out"></i>Saiu</span></div>`;
}
function dinExtrato() {
  return `<section class="bloco">
    <div class="busca"><label class="sr" for="busca-ex">Buscar no extrato</label>${ic('busca')}<input id="busca-ex" type="search" placeholder="Buscar em todos os meses: mercado, Uber, aluguel…" value="${esc(ui.busca)}" autocomplete="off"></div>
    <div class="extrato-acoes"><button class="topo-link" type="button" data-a="importar-extrato">${ic('subir')}Importar extrato</button>${S.conexao.itens.length ? `<button class="topo-link" type="button" data-a="banco-sync"><span data-status-banco>${statusConexaoTxt()}</span></button>` : `<button class="topo-link" type="button" data-a="conexao">Conectar banco</button>`}</div>
    <div id="extrato-lista">${listaExtrato()}</div>
  </section>`;
}
function listaExtrato() {
  const q = norm(ui.busca.trim());
  let ls = q ? S.lanc.filter(l => norm(`${l.desc} ${catInfo(l).nome} ${contaPor(l.conta)?.nome || ''}`).includes(q)) : S.lanc.filter(l => mesDe(l.data) === ui.mes);
  ls = ls.slice().sort((a, b) => b.data.localeCompare(a.data));
  if (!ls.length) return q ? `<p class="calmo centro">Nada encontrado para “${esc(ui.busca)}”.</p>` : vazioBox('Nenhum lançamento neste mês', 'Anote cada gasto na hora, leva cinco segundos. É assim que se descobre para onde o dinheiro vai.', 'Anotar gasto', 'novo-gasto');
  const tot = ls.reduce((a, l) => a + (l.tipo === 'entrada' ? l.valor : l.tipo === 'saida' ? -l.valor : 0), 0);
  const dias = [...new Set(ls.map(l => l.data))];
  return `${q ? `<p class="calmo">${ls.length} ${ls.length === 1 ? 'lançamento' : 'lançamentos'} · saldo ${din(tot)}</p>` : ''}
  ${dias.map(d => {
    const g = ls.filter(l => l.data === d), td = g.reduce((a, l) => a + (l.tipo === 'entrada' ? l.valor : l.tipo === 'saida' ? -l.valor : 0), 0);
    return `<h3 class="dia-t"><span>${rotDia(d)}</span><span class="${td < 0 ? 'neg' : td > 0 ? 'pos' : ''}">${td ? din(td) : ''}</span></h3>
    <ul class="lista">${g.map(itemLanc).join('')}</ul>`;
  }).join('')}`;
}
function itemLanc(l) {
  const info = catInfo(l), c = contaPor(l.conta);
  const sub = l.tipo === 'transf' ? `${esc(c?.nome || '?')} → ${esc(contaPor(l.destino)?.nome || '?')}` : `${info.nome} · ${esc(c?.nome || 'conta apagada')}`;
  const v = l.tipo === 'entrada' ? `+ ${din(l.valor)}` : l.tipo === 'saida' ? `− ${din(l.valor)}` : din(l.valor);
  return `<li class="item"><button class="item-corpo item-lanc" type="button" data-a="lanc-edit" data-id="${l.id}">
    ${chipCat(info)}
    <span class="item-txt"><span class="item-t">${esc(l.desc || info.nome)}</span><span class="item-m"><span>${sub}</span></span></span>
    <span class="valor ${l.tipo === 'entrada' ? 'pos' : l.tipo === 'transf' ? 'neutro' : ''}">${v}</span>
  </button></li>`;
}
function dinContas() {
  const P = patrimonio();
  const porTipo = Object.keys(TIPOS_CONTA).map(k => ({ k, v: S.contas.filter(c => c.tipo === k).reduce((a, c) => a + saldo(c.id), 0) })).filter(x => x.v);
  const reserva = porTipo.filter(x => x.k === 'poupanca' || x.k === 'investimento').reduce((a, x) => a + x.v, 0);
  const gastoMedio = (() => { let s = 0, n = 0; for (let k = 1; k <= 3; k++) { const r = resumoMes(addMes(mesDe(hoje()), -k)); if (r.qtd) { s += r.saidas; n++; } } return n ? s / n : 0; })();
  const meses = gastoMedio ? reserva / gastoMedio : null;
  return `
  <div class="grade-2">
    <section class="hero">
      <p class="hero-rot">Patrimônio</p>
      <p class="hero-valor ${P < 0 ? 'neg' : ''}">${dinGrande(P)}</p>
      ${P > 0 ? `<div class="pilha" role="img" aria-label="Divisão do patrimônio por tipo de conta">${porTipo.filter(x => x.v > 0).map(x => `<span style="flex:${x.v}" class="pilha-${x.k}"></span>`).join('')}</div>
      <ul class="pilha-leg">${porTipo.map(x => `<li><i class="pilha-${x.k}"></i>${TIPOS_CONTA[x.k].nome}<b>${din(x.v)}</b></li>`).join('')}</ul>` : ''}
      ${meses != null ? `<div class="reserva"><p class="hero-rot">Reserva de emergência</p><p><b>${meses.toFixed(1).replace('.', ',')} ${meses >= 1 && meses < 2 ? 'mês' : 'meses'}</b> do seu custo de vida guardados. ${meses >= 6 ? 'O recomendado é 6 meses, e você já tem.' : `O recomendado é 6 meses (${din0(gastoMedio * 6)}).`}</p></div>` : ''}
    </section>
    <section class="bloco">
      ${topoBloco('Suas contas', '', `<button class="topo-link" type="button" data-a="nova-transf">Transferir</button>`)}
      <ul class="lista">${S.contas.map(c => {
        const s = saldo(c.id), t = TIPOS_CONTA[c.tipo] || TIPOS_CONTA.corrente;
        return `<li class="item"><button class="item-corpo item-lanc" type="button" data-a="conta-edit" data-id="${c.id}">
          <span class="conta-ic" style="--c:${c.cor}">${ic(t.ic)}</span>
          <span class="item-txt"><span class="item-t">${esc(c.nome)}</span><span class="item-m"><span>${t.nome}</span></span></span>
          <span class="valor ${s < 0 ? 'neg' : ''}">${din(s)}</span></button></li>`;
      }).join('')}</ul>
      <div class="botoes">
        <button class="btn btn-sec" type="button" data-a="nova-conta">${ic('mais')}Adicionar conta</button>
        <button class="btn btn-sec" type="button" data-a="importar-extrato">${ic('subir')}Importar extrato</button>
      </div>
      <button class="conexao-cta" type="button" data-a="conexao">
        <span class="conexao-ic">${ic('rotina')}</span>
        <span class="item-txt"><span class="item-t">${S.conexao.itens.length ? 'Conexão automática ligada' : 'Ligar a conexão automática'}</span><span class="item-m"><span data-status-banco>${S.conexao.itens.length ? statusConexaoTxt() : 'O extrato do banco entra sozinho, pelo Open Finance'}</span></span></span>
        ${ic('dir')}
      </button>
    </section>
  </div>`;
}
function dinFixas() {
  const ym = ui.mes;
  if (!S.fixas.length) return `<section class="bloco">${vazioBox('Nenhuma conta fixa', 'Aluguel, luz, água, internet, academia, assinaturas: cadastre uma vez e marque “Paguei” todo mês.', 'Adicionar conta fixa', 'nova-fixa')}</section>`;
  const itens = S.fixas.map(f => ({ f, s: statusFixa(f, ym) })).sort((a, b) => (a.s.paga - b.s.paga) || a.f.dia - b.f.dia);
  const total = S.fixas.reduce((a, f) => a + f.valor, 0), pago = itens.filter(x => x.s.paga).reduce((a, x) => a + x.f.valor, 0);
  return `<section class="bloco">
    <div class="trio">
      <div><span class="eyebrow">Total no mês</span><b>${din0(total)}</b></div>
      <div><span class="eyebrow">Já pago</span><b class="pos">${din0(pago)}</b></div>
      <div><span class="eyebrow">Falta pagar</span><b>${din0(total - pago)}</b></div>
    </div>
    <ul class="lista">${itens.map(({ f, s }) => itemFixa(f, s, ym)).join('')}</ul>
    <button class="btn btn-sec largo" type="button" data-a="nova-fixa">${ic('mais')}Adicionar conta fixa</button>
  </section>`;
}

/* ===== Rotina ===== */
function viewRotina() {
  const t = hoje(), d0 = parse(ui.dia), seg = addDias(ui.dia, -((d0.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, k) => addDias(seg, k));
  const melhor = S.habitos.map(h => ({ h, s: sequencia(h) })).sort((a, b) => b.s - a.s)[0];
  return `
  <section class="cabeca cabeca-p">
    <div class="cabeca-txt"><p class="eyebrow">Rotina</p><h1 tabindex="-1">O que você faz todo dia</h1>
    <p class="sub">${melhor && melhor.s > 1 ? `Maior sequência agora: ${esc(melhor.h.nome).toLowerCase()}, ${melhor.s} vezes seguidas.` : 'Repetir é o que faz a rotina virar hábito.'}</p></div>
  </section>
  <section class="bloco">
    <div class="semana-topo">
      <button class="ic-btn" type="button" data-a="semana" data-d="-7" aria-label="Semana anterior">${ic('esq')}</button>
      <span class="mes-nome">${semana[0].slice(5, 7) === semana[6].slice(5, 7) ? rotMes(mesDe(semana[0])) : `${MES_C[parse(semana[0]).getMonth()]} – ${MES_C[parse(semana[6]).getMonth()]} ${parse(semana[6]).getFullYear()}`}</span>
      <button class="ic-btn" type="button" data-a="semana" data-d="7" aria-label="Próxima semana">${ic('dir')}</button>
    </div>
    <div class="semana" role="group" aria-label="Dias da semana">
      ${semana.map(d => {
        const pl = placarDia(d), dd = parse(d), p = pl.total ? pl.feitos / pl.total : 0;
        return `<button type="button" class="sdia${d === ui.dia ? ' sel' : ''}${d === t ? ' hj' : ''}${d > t ? ' fut' : ''}" data-a="dia" data-dia="${d}" aria-pressed="${d === ui.dia}" aria-label="${DIAS[dd.getDay()]}, ${dd.getDate()}: ${pl.feitos} de ${pl.total}">
          <span class="sdia-l">${DIA_C[dd.getDay()]}</span>
          <span class="sdia-n" style="--p:${d > t ? 0 : p}">${dd.getDate()}</span>
        </button>`;
      }).join('')}
    </div>
    <h3 class="dia-t">${rotDia(ui.dia)}${ui.dia > t ? '<span class="calmo">dá para marcar quando o dia chegar</span>' : ''}</h3>
    ${S.habitos.length ? (S.habitos.some(h => agendado(h, ui.dia)) ? habitosPorPeriodo(ui.dia, false) : '<p class="calmo">Nenhum hábito neste dia.</p>')
      : vazioBox('Nenhum hábito ainda', 'Sugestões para começar: acordar no mesmo horário, anotar os gastos do dia, ler 10 páginas, treinar.', 'Criar hábito', 'novo-habito')}
  </section>
  ${S.habitos.length ? `<section class="bloco">
    ${topoBloco('Últimas 4 semanas')}
    <div class="mapa-wrap"><table class="mapa">
      <thead><tr><th scope="col"><span class="sr">Hábito</span></th><th scope="col" class="mapa-dias" colspan="28"><span>há 4 semanas</span><span>hoje</span></th><th scope="col">30 dias</th></tr></thead>
      <tbody>${S.habitos.map(h => {
        const cel = Array.from({ length: 28 }, (_, k) => { const d = addDias(t, k - 27), ag = agendado(h, d) && !(h.criado && d < h.criado); return `<td class="mc ${!ag ? 'na' : h.feitos[d] ? 'ok' : 'nao'}" title="${rotDia(d)}: ${!ag ? 'sem hábito' : h.feitos[d] ? 'feito' : 'não feito'}"></td>`; }).join('');
        const tx = taxa30(h);
        return `<tr><th scope="row"><button class="link" type="button" data-a="habito-edit" data-id="${h.id}">${esc(h.nome)}</button></th>${cel}<td class="mapa-tx">${tx == null ? '—' : Math.round(tx * 100) + '%'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <button class="btn btn-sec largo" type="button" data-a="novo-habito">${ic('mais')}Criar hábito</button>
  </section>` : ''}`;
}

/* ---------- render ---------- */
const VIEWS = { hoje: viewHoje, tarefas: viewTarefas, dinheiro: viewDinheiro, rotina: viewRotina };
const FAB = { hoje: 'Adicionar', tarefas: 'Nova tarefa', dinheiro: 'Anotar gasto', rotina: 'Novo hábito' };
function render() {
  $$('[data-a="ir"][data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.aba === ui.aba ? 'page' : 'false'));
  const ini = S.perfil.nome.trim().charAt(0).toUpperCase();
  $('#avatar').innerHTML = ini ? `<span>${esc(ini)}</span>` : ic('ajustes');
  document.body.classList.toggle('modo-bv', !!S.boasVindas);
  if (!pronto) return;
  if (S.boasVindas) { $('#v').innerHTML = avisoArmazenamento() + viewBoasVindas(); aplicarTema(); return; }
  $('#v').innerHTML = avisoArmazenamento() + (S.exemplo ? bannerExemplo() : '') + VIEWS[ui.aba]();
  $('#fab').setAttribute('aria-label', FAB[ui.aba]);
  $('#fab-txt').textContent = FAB[ui.aba];
  aplicarTema();
}
function irPara(aba, extra = {}) {
  if (!ABAS.includes(aba)) aba = 'hoje';
  const mudou = ui.aba !== aba;
  ui.aba = aba; Object.assign(ui, extra);
  if (location.hash.slice(1) !== aba) history.replaceState(null, '', '#' + aba);
  render();
  if (mudou) { window.scrollTo(0, 0); $('#v h1')?.focus({ preventScroll: true }); }
}

/* ---------- folhas (diálogos) ---------- */
const dlg = $('#folha');
let aoEnviar = null;
function folha(titulo, corpo, { enviar, rodape, cls = '', dataTipo } = {}) {
  dlg.innerHTML = `<form class="folha ${cls}" id="folha-form" novalidate ${dataTipo ? `data-tipo="${dataTipo}"` : ''} autocomplete="off">
    <header class="folha-topo"><h2 id="folha-t">${titulo}</h2><button type="button" class="ic-btn" data-a="fechar" aria-label="Fechar">${ic('x')}</button></header>
    <div class="folha-corpo">${corpo}<p class="folha-erro" role="alert" hidden></p></div>
    ${rodape ?? (enviar ? `<footer class="folha-pe"><button class="btn largo" type="submit">Salvar</button></footer>` : '')}
  </form>`;
  dlg.setAttribute('aria-labelledby', 'folha-t');
  aoEnviar = enviar || null;
  if (!dlg.open) dlg.showModal();
  const foco = $('[autofocus]', dlg); if (foco) setTimeout(() => foco.focus(), 30);
}
function fechar() { if (dlg.open) dlg.close(); aoEnviar = null; }
function erro(msg) { const e = $('.folha-erro', dlg); e.textContent = msg; e.hidden = false; }
dlg.addEventListener('click', e => { if (e.target === dlg) fechar(); });
dlg.addEventListener('submit', e => {
  e.preventDefault();
  if (!aoEnviar) return;
  const f = e.target, ok = aoEnviar(new FormData(f), f);
  if (ok instanceof Promise || ok === false) return;
  fechar();
});
function confirmar(titulo, texto, botao, fn) {
  folha(titulo, `<p class="calmo">${texto}</p>`, {
    rodape: `<footer class="folha-pe duplo"><button class="btn btn-sec" type="button" data-a="fechar">Cancelar</button><button class="btn btn-perigo" type="button" data-a="confirmar-ok">${botao}</button></footer>`,
  });
  confirmarFn = fn;
}
let confirmarFn = null;

const radios = (nome, opcoes, atual, cls = '') => opcoes.map(([v, rot, extra = '']) => `<label class="opc ${cls}"><input type="radio" name="${nome}" value="${v}" ${String(v) === String(atual) ? 'checked' : ''}><span ${extra}>${rot}</span></label>`).join('');
const chipsCat = (nome, mapa, atual) => `<div class="chips">${Object.entries(mapa).map(([k, c]) => `<label class="opc chip" style="--c:${c.cor}"><input type="radio" name="${nome}" value="${k}" ${k === atual ? 'checked' : ''}><span>${ic(c.ic)}${c.nome}</span></label>`).join('')}</div>`;
const opcoesContas = (sel, excluir) => S.contas.filter(c => c.id !== excluir).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)} · ${din(saldo(c.id))}</option>`).join('');

function formNovo() {
  const op = [
    ['novo-gasto', 'Gasto', 'Anote na hora, leva 5 segundos', 'dinheiro', 'out'],
    ['novo-entrada', 'Entrada', 'Salário, freela, rendimento', 'grafico', 'in'],
    ['nova-tarefa', 'Tarefa', 'Algo para fazer, com ou sem data', 'tarefas', 'ac'],
    ['novo-habito', 'Hábito', 'Algo para repetir na rotina', 'rotina', 'br'],
  ];
  folha('O que você quer anotar?', `<div class="escolha">${op.map(([a, t, s, i, c]) => `<button type="button" class="escolha-b es-${c}" data-a="${a}">${ic(i)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div>`);
}

function formLanc(id, tipoIni = 'saida') {
  if (!S.contas.length) { formConta(null, 'Antes de anotar, cadastre a conta de onde o dinheiro sai ou para onde entra.'); return; }
  const l = id ? S.lanc.find(x => x.id === id) : null;
  if (id && !l) return;
  const tipo = l?.tipo || tipoIni;
  if (tipo === 'transf' && S.contas.length < 2 && !l) { formConta(null, 'Para transferir, você precisa de pelo menos duas contas.'); return; }
  const contaIni = l?.conta || S.contas.find(c => c.tipo === 'corrente')?.id || S.contas[0].id;
  const destIni = l?.destino || S.contas.find(c => c.id !== contaIni)?.id;
  const corpo = `
    <div class="seg seg-tipo" role="radiogroup" aria-label="Tipo">${radios('tipo', [['saida', 'Gasto'], ['entrada', 'Entrada'], ['transf', 'Transferência']], tipo)}</div>
    <label class="campo campo-valor"><span>Valor</span><span class="valor-in"><span aria-hidden="true">R$</span><input name="valor" inputmode="decimal" placeholder="0,00" value="${l ? num2(l.valor) : ''}" ${l ? '' : 'autofocus'} required></span></label>
    <label class="campo"><span>Descrição</span><input name="desc" maxlength="80" value="${esc(l?.desc || '')}" placeholder="Ex.: mercado, Uber, salário"></label>
    <fieldset class="campo" data-so="saida"><legend>Categoria</legend>${chipsCat('cat', CAT_S, l?.tipo === 'saida' ? l.cat : '')}</fieldset>
    <fieldset class="campo" data-so="entrada"><legend>Categoria</legend>${chipsCat('catE', CAT_E, l?.tipo === 'entrada' ? l.cat : '')}</fieldset>
    <div class="linha2">
      <label class="campo"><span data-rot-conta>${tipo === 'entrada' ? 'Entrou na conta' : tipo === 'transf' ? 'Saiu de' : 'Saiu da conta'}</span><select name="conta">${opcoesContas(contaIni)}</select></label>
      <label class="campo" data-so="transf"><span>Foi para</span><select name="destino">${opcoesContas(destIni)}</select></label>
      <label class="campo"><span>Data</span><input type="date" name="data" value="${l?.data || hoje()}" max="${addDias(hoje(), 366)}"></label>
    </div>`;
  folha(l ? 'Editar lançamento' : 'Anotar', corpo, {
    dataTipo: tipo,
    rodape: `<footer class="folha-pe ${l ? 'duplo' : ''}">${l ? `<button class="btn btn-perigo-sec" type="button" data-a="lanc-apagar" data-id="${l.id}">Apagar</button>` : ''}<button class="btn largo" type="submit">${l ? 'Salvar' : 'Anotar'}</button></footer>`,
    enviar(fd) {
      const tipo = fd.get('tipo'), valor = lerValor(fd.get('valor'));
      if (!(valor > 0)) { erro('Digite um valor maior que zero, por exemplo 32,90.'); $('[name=valor]', dlg).focus(); return false; }
      const conta = fd.get('conta'), destino = fd.get('destino');
      if (tipo === 'transf' && conta === destino) { erro('Escolha contas diferentes para a transferência.'); return false; }
      const desc = String(fd.get('desc') || '').trim();
      let cat = tipo === 'saida' ? fd.get('cat') : tipo === 'entrada' ? fd.get('catE') : null;
      if (tipo !== 'transf' && !cat) cat = sugerirCat(desc, tipo) || (tipo === 'entrada' ? 'outros_e' : 'outros');
      const dados = { tipo, valor, desc: desc || (tipo === 'transf' ? 'Transferência' : ''), cat, conta, data: fd.get('data') || hoje() };
      if (tipo === 'transf') dados.destino = destino;
      mudar(() => {
        if (l) { Object.assign(l, dados); if (tipo !== 'transf') delete l.destino; }
        else S.lanc.push({ id: uid(), ...dados });
      }, l ? 'Lançamento salvo' : tipo === 'saida' ? `Gasto de ${din(valor)} anotado` : tipo === 'entrada' ? `Entrada de ${din(valor)} anotada` : 'Transferência feita', false);
    },
  });
  const f = $('#folha-form');
  f.addEventListener('change', e => {
    if (e.target.name === 'tipo') {
      f.dataset.tipo = e.target.value;
      $('[data-rot-conta]', f).textContent = e.target.value === 'entrada' ? 'Entrou na conta' : e.target.value === 'transf' ? 'Saiu de' : 'Saiu da conta';
    }
  });
  let catManual = !!l;
  f.addEventListener('change', e => { if (e.target.name === 'cat' || e.target.name === 'catE') catManual = true; });
  $('[name=desc]', f).addEventListener('input', e => {
    if (catManual) return;
    const tipo = f.dataset.tipo; if (tipo === 'transf') return;
    const k = sugerirCat(e.target.value, tipo);
    if (k) { const r = $(`[name=${tipo === 'entrada' ? 'catE' : 'cat'}][value=${k}]`, f); if (r) r.checked = true; }
  });
}

function formTarefa(id) {
  const x = id ? S.tarefas.find(t => t.id === id) : null;
  if (id && !x) return;
  const t = hoje();
  const corpo = `
    <label class="campo"><span>Tarefa</span><input name="titulo" maxlength="140" value="${esc(x?.titulo || '')}" placeholder="Ex.: pagar o boleto do IPVA" ${x ? '' : 'autofocus'} required></label>
    <fieldset class="campo"><legend>Quando</legend>
      <div class="chips">${radios('quando', [[t, 'Hoje'], [addDias(t, 1), 'Amanhã'], ['', 'Sem data'], ['outra', 'Outro dia']], x ? (x.data === t ? t : x.data === addDias(t, 1) ? addDias(t, 1) : x.data ? 'outra' : '') : t, 'chip')}</div>
      <input type="date" name="dataOutra" class="data-outra" value="${x?.data || addDias(t, 2)}" aria-label="Escolha o dia">
    </fieldset>
    <fieldset class="campo"><legend>Prioridade</legend><div class="seg">${radios('prio', [[1, 'Alta'], [2, 'Normal'], [3, 'Baixa']], x?.prio || 2)}</div></fieldset>
    <fieldset class="campo"><legend>Área</legend><div class="chips">${radios('area', AREAS.map(a => [a, a]), x?.area || 'Pessoal', 'chip')}</div></fieldset>
    <label class="campo"><span>Observação</span><textarea name="nota" rows="2" maxlength="400" placeholder="Opcional">${esc(x?.nota || '')}</textarea></label>`;
  folha(x ? 'Editar tarefa' : 'Nova tarefa', corpo, {
    rodape: `<footer class="folha-pe ${x ? 'duplo' : ''}">${x ? `<button class="btn btn-perigo-sec" type="button" data-a="tarefa-apagar" data-id="${x.id}">Apagar</button>` : ''}<button class="btn largo" type="submit">Salvar</button></footer>`,
    enviar(fd) {
      const titulo = String(fd.get('titulo') || '').trim();
      if (!titulo) { erro('Escreva o que precisa ser feito.'); return false; }
      let data = fd.get('quando'); if (data === 'outra') data = fd.get('dataOutra') || '';
      const dados = { titulo, data, prio: Number(fd.get('prio')) || 2, area: fd.get('area') || '', nota: String(fd.get('nota') || '').trim() };
      mudar(() => { if (x) Object.assign(x, dados); else S.tarefas.push({ id: uid(), ...dados, feita: false, feitaEm: null, criada: hoje() }); }, x ? 'Tarefa salva' : 'Tarefa criada', false);
    },
  });
}

function formHabito(id) {
  const h = id ? S.habitos.find(x => x.id === id) : null;
  if (id && !h) return;
  const dias = h?.dias || [0, 1, 2, 3, 4, 5, 6];
  const corpo = `
    <label class="campo"><span>Hábito</span><input name="nome" maxlength="60" value="${esc(h?.nome || '')}" placeholder="Ex.: anotar os gastos do dia" ${h ? '' : 'autofocus'} required></label>
    <fieldset class="campo"><legend>Em quais dias</legend>
      <div class="dias">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="opc dia-op"><input type="checkbox" name="dias" value="${d}" ${dias.includes(d) ? 'checked' : ''}><span aria-label="${DIAS[d]}">${DIA_L[d]}</span></label>`).join('')}</div>
      <div class="atalhos"><button type="button" class="link" data-a="dias-set" data-v="0123456">Todo dia</button><button type="button" class="link" data-a="dias-set" data-v="12345">Dias úteis</button><button type="button" class="link" data-a="dias-set" data-v="06">Fim de semana</button></div>
    </fieldset>
    <fieldset class="campo"><legend>Período</legend><div class="chips">${radios('periodo', Object.entries(PERIODOS).map(([k, p]) => [k, `${ic(p.ic)}${p.nome}`]), h?.periodo || 'manha', 'chip')}</div></fieldset>
    <label class="campo campo-curto"><span>Horário (opcional)</span><input type="time" name="hora" value="${h?.hora || ''}"></label>
    ${h ? `<p class="miudo">Sequência atual: ${sequencia(h)} · feito ${Object.keys(h.feitos).length} vezes desde que você criou.</p>` : ''}`;
  folha(h ? 'Editar hábito' : 'Novo hábito', corpo, {
    rodape: `<footer class="folha-pe ${h ? 'duplo' : ''}">${h ? `<button class="btn btn-perigo-sec" type="button" data-a="habito-apagar" data-id="${h.id}">Apagar</button>` : ''}<button class="btn largo" type="submit">Salvar</button></footer>`,
    enviar(fd) {
      const nome = String(fd.get('nome') || '').trim(), ds = fd.getAll('dias').map(Number);
      if (!nome) { erro('Dê um nome ao hábito.'); return false; }
      if (!ds.length) { erro('Escolha pelo menos um dia da semana.'); return false; }
      const dados = { nome, dias: ds, periodo: fd.get('periodo') || 'dia', hora: fd.get('hora') || '' };
      mudar(() => { if (h) Object.assign(h, dados); else S.habitos.push({ id: uid(), ...dados, feitos: {}, criado: hoje() }); }, h ? 'Hábito salvo' : 'Hábito criado', false);
    },
  });
}

function formConta(id, aviso) {
  const c = id ? contaPor(id) : null;
  if (id && !c) return;
  const atual = c ? saldo(c.id) : 0;
  const corpo = `${aviso ? `<p class="aviso-mini">${aviso}</p>` : ''}
    <label class="campo"><span>Nome</span><input name="nome" maxlength="40" value="${esc(c?.nome || '')}" placeholder="Ex.: Nubank, Itaú, Caixa" ${c ? '' : 'autofocus'} required></label>
    <fieldset class="campo"><legend>Tipo</legend><div class="chips">${radios('tipo', Object.entries(TIPOS_CONTA).map(([k, t]) => [k, `${ic(t.ic)}${t.nome}`]), c?.tipo || 'corrente', 'chip')}</div></fieldset>
    <label class="campo campo-valor"><span>Saldo de hoje</span><span class="valor-in"><span aria-hidden="true">R$</span><input name="saldo" inputmode="decimal" placeholder="0,00" value="${c ? num2(atual) : ''}"></span></label>
    <p class="miudo">${c ? 'Se mudar o saldo, o Rumo ajusta a conta sem mexer nos lançamentos.' : 'Olhe no app do banco e coloque o saldo exato de agora.'}</p>
    <fieldset class="campo"><legend>Cor</legend><div class="cores">${CORES.map((k, i) => `<label class="opc cor-op"><input type="radio" name="cor" value="${k}" ${(c?.cor || CORES[S.contas.length % CORES.length]) === k ? 'checked' : ''}><span style="--c:${k}" aria-label="Cor ${i + 1}"></span></label>`).join('')}</div></fieldset>`;
  folha(c ? 'Editar conta' : 'Nova conta', corpo, {
    rodape: `<footer class="folha-pe ${c ? 'duplo' : ''}">${c ? `<button class="btn btn-perigo-sec" type="button" data-a="conta-apagar" data-id="${c.id}">Apagar</button>` : ''}<button class="btn largo" type="submit">Salvar</button></footer>`,
    enviar(fd) {
      const nome = String(fd.get('nome') || '').trim();
      if (!nome) { erro('Dê um nome para a conta, como o nome do banco.'); return false; }
      const raw = String(fd.get('saldo') || '').trim(), v = raw ? lerValor(raw) : 0;
      if (Number.isNaN(v)) { erro('O saldo precisa ser um número, por exemplo 1.250,00.'); return false; }
      mudar(() => {
        if (c) { c.nome = nome; c.tipo = fd.get('tipo'); c.cor = fd.get('cor'); c.saldoInicial = Math.round(((c.saldoInicial || 0) + (v - atual)) * 100) / 100; }
        else S.contas.push({ id: uid(), nome, tipo: fd.get('tipo'), cor: fd.get('cor'), saldoInicial: v });
      }, c ? 'Conta salva' : `${nome} adicionada`, false);
    },
  });
}

function formFixa(id) {
  const f = id ? S.fixas.find(x => x.id === id) : null;
  if (id && !f) return;
  if (!S.contas.length) { formConta(null, 'Antes, cadastre a conta de onde você paga as contas.'); return; }
  const corpo = `
    <label class="campo"><span>Nome da conta</span><input name="desc" maxlength="60" value="${esc(f?.desc || '')}" placeholder="Ex.: aluguel, luz, internet" ${f ? '' : 'autofocus'} required></label>
    <div class="linha2">
      <label class="campo campo-valor"><span>Valor (médio)</span><span class="valor-in"><span aria-hidden="true">R$</span><input name="valor" inputmode="decimal" placeholder="0,00" value="${f ? num2(f.valor) : ''}"></span></label>
      <label class="campo"><span>Vence todo dia</span><input type="number" name="dia" min="1" max="31" inputmode="numeric" value="${f?.dia || 10}"></label>
    </div>
    <fieldset class="campo"><legend>Categoria</legend>${chipsCat('cat', CAT_S, f?.cat || 'contas')}</fieldset>
    <label class="campo"><span>Pago pela conta</span><select name="conta">${opcoesContas(f?.conta || S.contas[0].id)}</select></label>`;
  folha(f ? 'Editar conta fixa' : 'Nova conta fixa', corpo, {
    rodape: `<footer class="folha-pe ${f ? 'duplo' : ''}">${f ? `<button class="btn btn-perigo-sec" type="button" data-a="fixa-apagar" data-id="${f.id}">Apagar</button>` : ''}<button class="btn largo" type="submit">Salvar</button></footer>`,
    enviar(fd) {
      const desc = String(fd.get('desc') || '').trim(), valor = lerValor(fd.get('valor')), dia = Math.round(Number(fd.get('dia')));
      if (!desc) { erro('Dê um nome para a conta.'); return false; }
      if (!(valor > 0)) { erro('Digite o valor da conta, por exemplo 99,90.'); return false; }
      if (!(dia >= 1 && dia <= 31)) { erro('O dia do vencimento vai de 1 a 31.'); return false; }
      const dados = { desc, valor, dia, cat: fd.get('cat') || 'contas', conta: fd.get('conta') };
      mudar(() => { if (f) Object.assign(f, dados); else S.fixas.push({ id: uid(), ...dados, pagas: {} }); }, f ? 'Conta fixa salva' : `${desc} adicionada`, false);
    },
  });
}

function formOrcamento() {
  const corpo = `<p class="calmo">Quanto você aceita gastar por mês em cada categoria. Deixe em branco o que não quer limitar.</p>
  <div class="orc">${Object.entries(CAT_S).map(([k, c]) => `<label class="orc-l">${chipCat(c)}<span>${c.nome}</span><span class="valor-in mini"><span aria-hidden="true">R$</span><input name="${k}" inputmode="decimal" placeholder="—" value="${S.orcamento[k] ? num2(S.orcamento[k]) : ''}" aria-label="Limite de ${c.nome}"></span></label>`).join('')}</div>`;
  folha('Limites do mês', corpo, {
    enviar(fd) {
      const o = {};
      for (const k of Object.keys(CAT_S)) { const v = lerValor(fd.get(k)); if (v > 0) o[k] = v; }
      mudar(() => { S.orcamento = o; }, 'Limites salvos', false);
    },
  });
}

function formAjustes() {
  const p = S.perfil;
  const corpo = `
    <label class="campo"><span>Seu nome</span><input name="nome" maxlength="30" value="${esc(p.nome)}" placeholder="Como quer ser chamado"></label>
    <div class="linha2">
      <label class="campo"><span>Meta de quanto guardar</span><span class="valor-in"><input name="meta" type="number" min="0" max="90" step="1" value="${p.meta}"><span aria-hidden="true">% do que entra</span></span></label>
      <label class="campo"><span>Rendimento esperado</span><span class="valor-in"><input name="rendimento" type="number" min="0" max="40" step="0.5" value="${p.rendimento}"><span aria-hidden="true">% ao ano</span></span></label>
    </div>
    <p class="miudo">O rendimento entra só na conta do “primeiro milhão”. Para comparar: o Tesouro Selic costuma render perto da taxa Selic do momento.</p>
    <fieldset class="campo"><legend>Aparência</legend><div class="seg">${radios('tema', [['sistema', 'Igual ao celular'], ['claro', 'Claro'], ['escuro', 'Escuro']], p.tema)}</div></fieldset>
    <div class="ajuste-grupo">
      <p class="eyebrow">Banco</p>
      <div class="botoes">
        <button class="btn btn-sec" type="button" data-a="conexao">${ic('rotina')}Conexão automática${S.conexao.itens.length ? ' (ligada)' : ''}</button>
        <button class="btn btn-sec" type="button" data-a="importar-extrato">${ic('subir')}Importar extrato</button>
      </div>
    </div>
    <div class="ajuste-grupo">
      <p class="eyebrow">Seus dados</p>
      <p class="miudo">Tudo fica guardado só neste navegador, deste aparelho. ${falhouSalvar ? '<b class="neg">Agora o navegador não está deixando salvar.</b>' : armaz.ultimo ? `Último salvamento: ${haQuanto(new Date(armaz.ultimo).toISOString())}.` : ''} ${instalado() ? 'Você está no Rumo da tela de início, que guarda separado do Safari.' : 'No iPhone, o Safari e o Rumo da tela de início guardam separado.'} Faça um backup de vez em quando e guarde o arquivo no Drive ou no e-mail.</p>
      <div class="botoes">
        <button class="btn" type="button" data-a="levar">${ic('dir')}Levar meus dados</button>
        <button class="btn btn-sec" type="button" data-a="trazer">${ic('baixar')}Trazer meus dados</button>
      </div>
      <p class="miudo">Para passar tudo do Safari para o app da tela de início (ou para outro celular): <b>Levar</b> aqui, <b>Trazer</b> lá.</p>
      <div class="botoes">
        <button class="btn btn-sec" type="button" data-a="exportar">${ic('baixar')}Baixar backup</button>
        <label class="btn btn-sec">${ic('subir')}Restaurar backup<input type="file" accept="application/json,.json" data-a-file="importar" hidden></label>
        <button class="btn btn-sec" type="button" data-a="csv">${ic('baixar')}Extrato em planilha</button>
      </div>
      <div class="botoes">
        ${S.exemplo ? '<button class="btn btn-perigo-sec" type="button" data-a="zerar-exemplo">Apagar o exemplo</button>' : ''}
        <button class="btn btn-perigo-sec" type="button" data-a="apagar-tudo">Apagar tudo e começar do zero</button>
      </div>
      <p class="miudo">Ou apague só uma parte:</p>
      <div class="botoes">
        <button class="btn btn-sec" type="button" data-a="apagar-parte" data-v="tarefas">Só as tarefas</button>
        <button class="btn btn-sec" type="button" data-a="apagar-parte" data-v="habitos">Só os hábitos</button>
        <button class="btn btn-sec" type="button" data-a="apagar-parte" data-v="dinheiro">Só o dinheiro</button>
      </div>
    </div>`;
  folha('Ajustes', corpo, {
    enviar(fd) {
      const n = (k, min, max, def) => { const v = Number(fd.get(k)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
      mudar(() => { S.perfil = { ...S.perfil, nome: String(fd.get('nome') || '').trim(), meta: n('meta', 0, 90, 20), rendimento: n('rendimento', 0, 40, 10), tema: fd.get('tema') || 'sistema' }; }, 'Ajustes salvos', false);
    },
  });
  $('#folha-form').addEventListener('change', e => { if (e.target.name === 'tema') aplicarTema(e.target.value); });
}
function aplicarTema(t = S.perfil.tema) {
  const r = document.documentElement;
  if (t === 'claro') r.dataset.theme = 'light'; else if (t === 'escuro') r.dataset.theme = 'dark'; else delete r.dataset.theme;
  try { localStorage.setItem('rumo:tema', t); } catch (e) { /* tudo bem */ }
}

/* ---------- extrato do banco: arquivo (OFX/CSV) e conexão automática (Pluggy) ---------- */
const PG_CAT_S = [
  [/groceries|supermarket|supermercado/, 'mercado'],
  [/eating out|restaurant|food|delivery|alimenta|restaurante|bakery/, 'comida'],
  [/transport|taxi|ride|fuel|gas station|parking|toll|combust|public transport|vehicle/, 'transporte'],
  [/rent|housing|aluguel|moradia|condominium/, 'moradia'],
  [/utilit|electric|water|internet|telecom|phone|mobile|energia/, 'contas'],
  [/health|pharmac|gym|fitness|hospital|doctor|dentist|saude|farm|wellness/, 'saude'],
  [/streaming|digital services|subscription|assinatura|software/, 'assinaturas'],
  [/education|school|course|educa|university|books/, 'educacao'],
  [/entertainment|leisure|travel|lazer|viage|tourism|hotel|airline|games|events/, 'lazer'],
  [/shopping|clothing|electronics|compras|vestu|department/, 'compras'],
];
const PG_CAT_E = [[/salary|salar|payroll|wage/, 'salario'], [/investment|interest|yield|rendim|juros|dividend|income from/, 'rendimentos']];
const ehFatura = d => /pagamento.{0,12}fatura|pgto.{0,6}fatura|fatura.{0,6}cart|pagamento.{0,6}cartao|credit card payment/.test(norm(d));
function catDe(hint, desc, tipo) {
  const porDesc = sugerirCat(desc, tipo); if (porDesc) return porDesc;
  const h = norm(hint);
  if (h) for (const [re, k] of tipo === 'entrada' ? PG_CAT_E : PG_CAT_S) if (re.test(h)) return k;
  return tipo === 'entrada' ? 'outros_e' : 'outros';
}
function limparDesc(d) {
  d = String(d || '').replace(/\s+/g, ' ').trim();
  if (d.length > 3 && d === d.toUpperCase() && /[A-Z]/.test(d)) d = d.toLowerCase().replace(/(^|[\s\-*/.])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return d.slice(0, 80);
}
/* lança no Rumo o que veio do banco, sem repetir.
   lista: [{ ext, data, valor (positivo), tipo: 'entrada'|'saida', desc, catHint }] */
function importarLancamentos(contaId, lista, { saldoBanco = null, manterSaldo = false } = {}) {
  const c = contaPor(contaId); if (!c) return { novos: 0, repetidos: 0 };
  const exts = new Set(S.lanc.filter(l => l.ext).map(l => l.ext));
  const cartao = S.contas.find(x => x.tipo === 'cartao' && x.id !== contaId);
  let novos = 0, repetidos = 0, liquido = 0;
  const usados = new Set();
  for (const x of lista.slice().sort((a, b) => a.data.localeCompare(b.data))) {
    if (x.ext && exts.has(x.ext)) { repetidos++; continue; }
    // lançado à mão antes? mesmo valor, mesma conta, até 2 dias de diferença
    const manual = S.lanc.find(l => !l.ext && !usados.has(l.id) && l.conta === contaId && Math.abs(l.valor - x.valor) < .005 && Math.abs(difDias(l.data, x.data)) <= 2 && (l.tipo === x.tipo || (l.tipo === 'transf' && x.tipo === 'saida')));
    if (manual) { manual.ext = x.ext; usados.add(manual.id); repetidos++; continue; }
    const l = { id: uid(), tipo: x.tipo, valor: x.valor, desc: x.desc, conta: contaId, data: x.data, ext: x.ext, origem: 'banco' };
    if (x.tipo === 'saida' && c.tipo !== 'cartao' && cartao && ehFatura(x.desc)) { l.tipo = 'transf'; l.destino = cartao.id; l.cat = null; }
    else l.cat = catDe(x.catHint, x.desc, x.tipo);
    S.lanc.push(l); if (x.ext) exts.add(x.ext); novos++;
    if (l.data <= hoje()) liquido += l.tipo === 'entrada' ? l.valor : -l.valor;
  }
  if (saldoBanco != null && Number.isFinite(saldoBanco)) c.saldoInicial = Math.round(((c.saldoInicial || 0) + (saldoBanco - saldo(contaId))) * 100) / 100;
  else if (manterSaldo) c.saldoInicial = Math.round(((c.saldoInicial || 0) - liquido) * 100) / 100;
  return { novos, repetidos };
}

/* ---- arquivo ---- */
function dataDe(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  return null;
}
function lerOFX(txt) {
  const tag = (b, t) => { const m = b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i')); return m ? m[1].trim() : ''; };
  const cartao = /<CCSTMTRS>/i.test(txt);
  const itens = [];
  for (const b of txt.split(/<STMTTRN>/i).slice(1)) {
    const bloco = b.split(/<\/STMTTRN>/i)[0];
    const v = lerValor(tag(bloco, 'TRNAMT')), data = dataDe(tag(bloco, 'DTPOSTED'));
    if (!Number.isFinite(v) || !v || !data) continue;
    const desc = tag(bloco, 'MEMO') || tag(bloco, 'NAME') || 'Lançamento';
    const fit = tag(bloco, 'FITID');
    itens.push({ data, v, desc, id: fit });
  }
  const bal = txt.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]*)/i);
  const org = (txt.match(/<ORG>([^<\r\n]*)/i) || [])[1] || '';
  return { itens, cartao, saldo: bal ? lerValor(bal[1]) : null, banco: org.trim(), sinalGasto: -1 };
}
function linhasCSV(txt, sep) {
  const out = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; linha.push(campo); if (linha.some(x => x.trim())) out.push(linha); linha = []; campo = ''; }
    else campo += ch;
  }
  linha.push(campo); if (linha.some(x => x.trim())) out.push(linha);
  return out;
}
function lerCSV(txt) {
  txt = txt.replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/)[0] || '';
  const sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ';' : (prim.includes('\t') && !prim.includes(',') ? '\t' : ',');
  const ls = linhasCSV(txt, sep); if (ls.length < 2) return null;
  // acha a linha de cabeçalho nas primeiras 10
  let hi = ls.slice(0, 10).findIndex(l => l.some(c => /^(data|date|dt)/.test(norm(c).trim())));
  if (hi < 0) hi = 0;
  const cab = ls[hi].map(c => norm(c).trim());
  const col = re => cab.findIndex(c => re.test(c));
  const cD = col(/^(data|date|dt)/), cV = col(/^(valor|amount|value|quantia|montante)/), cDesc = col(/descri|title|histor|lancamento|estabelec|memo|detalhe|nome/), cId = col(/^(identificador|id)$/);
  const cE = col(/^(credito|entrada)/), cS = col(/^(debito|saida)/);
  if (cD < 0 || (cV < 0 && cE < 0 && cS < 0)) return null;
  const itens = [];
  for (const l of ls.slice(hi + 1)) {
    const data = dataDe(l[cD]); if (!data) continue;
    let v;
    if (cV >= 0) v = lerValor(l[cV]);
    else { const e = lerValor(l[cE]), s2 = lerValor(l[cS]); v = (Number.isFinite(e) ? Math.abs(e) : 0) - (Number.isFinite(s2) ? Math.abs(s2) : 0); }
    if (!Number.isFinite(v) || !v) continue;
    itens.push({ data, v, desc: cDesc >= 0 ? l[cDesc] : 'Lançamento', id: cId >= 0 ? l[cId] : '' });
  }
  // fatura de cartão (ex.: Nubank "date,title,amount"): compras vêm positivas
  const cartao = cab.includes('title') && cab.includes('amount');
  return { itens, cartao, saldo: null, banco: '', sinalGasto: cartao ? 1 : -1 };
}
function paraLista(arq, inverter) {
  const sinal = inverter ? -arq.sinalGasto : arq.sinalGasto;
  return arq.itens.map((x, i) => {
    const gasto = Math.sign(x.v) === sinal;
    const desc = limparDesc(x.desc);
    return { ext: 'arq:' + (x.id ? x.id : `${x.data}|${x.v}|${norm(desc)}|${arq.itens.slice(0, i).filter(y => y.data === x.data && y.v === x.v && y.desc === x.desc).length}`), data: x.data, valor: Math.abs(Math.round(x.v * 100) / 100), tipo: gasto ? 'saida' : 'entrada', desc, catHint: '' };
  });
}
let arqAtual = null;
function formImportar() {
  arqAtual = null;
  const corpo = `
    <p class="calmo">No app do seu banco, procure <b>Extrato</b> e depois <b>Exportar</b> ou <b>Compartilhar</b>. Escolha <b>OFX</b> se tiver; CSV também serve. No Nubank: no extrato da conta, toque em exportar; no cartão, peça a fatura em CSV.</p>
    <label class="arquivo"><input type="file" id="arq-extrato" accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx" data-a-file="extrato"><span>${ic('subir')}<b>Escolher o arquivo do extrato</b><small>OFX ou CSV</small></span></label>
    <div id="arq-prev"></div>`;
  folha('Importar extrato', corpo, {
    rodape: `<footer class="folha-pe"><button class="btn largo" type="submit" id="arq-ok" disabled>Importar</button></footer>`,
    enviar(fd) {
      if (!arqAtual) { erro('Escolha o arquivo do extrato primeiro.'); return false; }
      let contaId = fd.get('conta');
      const lista = paraLista(arqAtual, fd.get('inverter') === '1');
      if (!lista.length) { erro('Não achei lançamentos nesse arquivo.'); return false; }
      const modo = fd.get('saldo') || 'manter';
      let res;
      const antes = JSON.stringify(S);
      const saldoHoje = lerValor(fd.get('saldoHoje'));
      const novaConta = contaId === 'nova' || S.exemplo;
      if (S.exemplo) { const perfil = S.perfil, conexao = S.conexao; S = vazio(); S.perfil = perfil; S.conexao = conexao; contaId = 'nova'; }
      {
        if (contaId === 'nova') {
          const nome = String(fd.get('nomeNova') || '').trim() || arqAtual.banco || (arqAtual.cartao ? 'Cartão de crédito' : 'Conta do banco');
          const c = { id: uid(), nome, tipo: arqAtual.cartao ? 'cartao' : 'corrente', cor: CORES[S.contas.length % CORES.length], saldoInicial: 0 };
          S.contas.push(c); contaId = c.id;
        }
        const opc = modo === 'banco' ? { saldoBanco: arqAtual.cartao ? -Math.abs(arqAtual.saldo) : arqAtual.saldo }
          : novaConta ? (Number.isFinite(saldoHoje) ? { saldoBanco: arqAtual.cartao ? -Math.abs(saldoHoje) : saldoHoje } : { manterSaldo: false })
          : { manterSaldo: modo === 'manter' };
        res = importarLancamentos(contaId, lista, opc);
      }
      salvar();
      toast(res.novos ? `${res.novos} ${res.novos === 1 ? 'lançamento importado' : 'lançamentos importados'}${res.repetidos ? `, ${res.repetidos} já estavam no Rumo` : ''}` : 'Nada novo: tudo isso já estava no Rumo.', res.novos ? () => { S = JSON.parse(antes); salvar(); render(); } : null);
      irPara('dinheiro', { din: 'extrato', busca: '' });
    },
  });
}
function prevImportar(arq) {
  const f = $('#folha-form');
  const inverter = $('[name=inverter]', f)?.checked;
  const lista = paraLista(arq, inverter);
  const ent = lista.filter(x => x.tipo === 'entrada'), sai = lista.filter(x => x.tipo === 'saida');
  const datas = lista.map(x => x.data).sort();
  const exts = new Set(S.lanc.filter(l => l.ext).map(l => l.ext));
  const ja = lista.filter(x => exts.has(x.ext)).length;
  const sel = $('[name=conta]', f)?.value;
  const contas = S.exemplo ? [] : S.contas;
  $('#arq-prev').innerHTML = lista.length ? `
    <div class="arq-resumo">
      <p><b>${lista.length} lançamentos</b> de ${rotDia(datas[0]).toLowerCase()} a ${rotDia(datas[datas.length - 1]).toLowerCase()}${ja ? `, ${ja} já estão no Rumo` : ''}.</p>
      <p class="miudo">${ent.length} ${ent.length === 1 ? 'entrada' : 'entradas'} (${din(ent.reduce((a, x) => a + x.valor, 0))}) · ${sai.length} ${sai.length === 1 ? 'gasto' : 'gastos'} (${din(sai.reduce((a, x) => a + x.valor, 0))})</p>
    </div>
    <ul class="lista arq-lista">${lista.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6).map(x => { const info = x.tipo === 'entrada' ? CAT_E[catDe('', x.desc, 'entrada')] : CAT_S[catDe('', x.desc, 'saida')]; return `<li class="item">${chipCat(info)}<span class="item-txt"><span class="item-t">${esc(x.desc)}</span><span class="item-m"><span>${rotDia(x.data)} · ${info.nome}</span></span></span><span class="valor ${x.tipo === 'entrada' ? 'pos' : ''}">${x.tipo === 'entrada' ? '+ ' : '− '}${din(x.valor)}</span></li>`; }).join('')}</ul>
    ${lista.length > 6 ? `<p class="miudo">e mais ${lista.length - 6}. As categorias são separadas pela descrição, e você pode mudar qualquer uma depois.</p>` : ''}
    <label class="checa"><input type="checkbox" name="inverter" value="1" ${inverter ? 'checked' : ''} data-a-prev><span>Os gastos estão aparecendo como entradas (inverter)</span></label>
    <label class="campo"><span>Lançar na conta</span><select name="conta" data-a-prev>
      ${contas.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
      <option value="nova" ${sel === 'nova' || !contas.length ? 'selected' : ''}>Criar conta nova</option>
    </select></label>
    ${S.exemplo ? '<p class="aviso-mini">O exemplo vai ser apagado para entrar o seu extrato de verdade.</p>' : ''}
    <label class="campo campo-nova" ${(sel && sel !== 'nova') || (!sel && contas.length) ? 'hidden' : ''}><span>Nome da conta nova</span><input name="nomeNova" value="${esc(arq.banco || (arq.cartao ? 'Cartão de crédito' : ''))}" placeholder="Ex.: Nubank"></label>
    ${arq.saldo == null ? `<label class="campo campo-nova campo-valor" ${(sel && sel !== 'nova') || (!sel && contas.length) ? 'hidden' : ''}><span>Saldo de hoje nessa conta</span><span class="valor-in"><span aria-hidden="true">R$</span><input name="saldoHoje" inputmode="decimal" placeholder="0,00"></span></label>` : ''}
    <fieldset class="campo campo-saldo" ${arq.saldo == null && (!contas.length || sel === 'nova') ? 'hidden' : ''}><legend>Saldo da conta</legend>
      ${arq.saldo != null ? `<label class="checa"><input type="radio" name="saldo" value="banco" checked><span>Usar o saldo que veio no arquivo: <b>${din(arq.saldo)}</b></span></label>` : ''}
      <label class="checa"><input type="radio" name="saldo" value="manter" ${arq.saldo == null ? 'checked' : ''}><span>Manter o saldo que já está no Rumo (o saldo que cadastrei já inclui esses lançamentos)</span></label>
      <label class="checa"><input type="radio" name="saldo" value="somar"><span>Somar os lançamentos ao saldo</span></label>
    </fieldset>`
    : '<p class="folha-erro">Não achei lançamentos nesse arquivo. Confira se é o extrato em OFX ou CSV.</p>';
  const ok = $('#arq-ok'); ok.disabled = !lista.length; ok.textContent = lista.length ? `Importar ${lista.length - ja} ${lista.length - ja === 1 ? 'lançamento' : 'lançamentos'}` : 'Importar';
}
function lerArquivoExtrato(file) {
  const fr = new FileReader();
  fr.onload = () => {
    let txt = String(fr.result || '');
    if (/�/.test(txt)) { const fr2 = new FileReader(); fr2.onload = () => processar(String(fr2.result || '')); fr2.readAsText(file, 'windows-1252'); return; }
    processar(txt);
  };
  function processar(txt) {
    const arq = /<OFX>|OFXHEADER/i.test(txt) ? lerOFX(txt) : lerCSV(txt);
    if (!arq) { $('#arq-prev').innerHTML = '<p class="folha-erro">Não reconheci esse arquivo. Use o extrato em OFX ou em CSV (planilha) exportado pelo banco.</p>'; arqAtual = null; $('#arq-ok').disabled = true; return; }
    arqAtual = arq; prevImportar(arq);
    $('.arquivo b', dlg).textContent = file.name;
  }
  fr.readAsText(file, 'utf-8');
}

/* ---- conexão automática (Open Finance pela Pluggy, através do seu servidor) ---- */
let sincronizando = false;
async function chamar(caminho, corpo) {
  const c = S.conexao;
  let r;
  try {
    r = await fetch(c.url.replace(/\/+$/, '') + caminho, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rumo-chave': c.chave }, body: JSON.stringify(corpo || {}) });
  } catch (e) { throw new Error('Não consegui falar com o servidor. Confira o endereço e a internet.'); }
  let j = {}; try { j = await r.json(); } catch (e) { /* resposta vazia */ }
  if (!r.ok) throw new Error(j.erro || `O servidor respondeu com erro ${r.status}.`);
  return j;
}
function ligarConta(banco, a) {
  const tipo = a.tipo === 'CREDIT' ? 'cartao' : /saving|poupan/i.test(a.subtipo || '') ? 'poupanca' : 'corrente';
  const ligadas = new Set(S.conexao.itens.flatMap(i => Object.values(i.contas || {})));
  const nb = norm(banco).split(' ')[0];
  const existente = S.contas.find(c => !ligadas.has(c.id) && c.tipo === tipo && nb && norm(c.nome).includes(nb));
  if (existente) return existente.id;
  const nome = `${banco || 'Banco'}${tipo === 'cartao' ? ' · cartão' : tipo === 'poupanca' ? ' · poupança' : ''}`;
  const c = { id: uid(), nome, tipo, cor: CORES[S.contas.length % CORES.length], saldoInicial: 0 };
  S.contas.push(c);
  return c.id;
}
async function sincronizar({ silencioso = false } = {}) {
  const c = S.conexao;
  if (!c?.url || !c.chave || !c.itens.length || sincronizando) return;
  sincronizando = true; renderConexaoStatus();
  try {
    const desde = c.ultima ? addDias(c.ultima.slice(0, 10), -7) : addDias(hoje(), -90);
    const r = await chamar('/sync', { itens: c.itens.map(i => i.id), desde });
    let novos = 0; const erros = [];
    if (S.exemplo) { const perfil = S.perfil; S = vazio(); S.perfil = perfil; S.conexao = c; } // dados reais chegando: o exemplo sai
    for (const it of r.itens || []) {
      const reg = c.itens.find(i => i.id === it.id); if (!reg) continue;
      reg.banco = it.banco || reg.banco; reg.status = it.status || (it.erro ? 'ERRO' : reg.status); reg.atualizado = it.atualizado || reg.atualizado; reg.erro = it.erro || '';
      if (it.erro) erros.push(`${reg.banco || 'Banco'}: ${it.erro}`);
      reg.contas = reg.contas || {};
      const contas = (it.contas || []).slice().sort((a, b) => (a.tipo === 'CREDIT') - (b.tipo === 'CREDIT'));
      for (const a of contas) if (!reg.contas[a.id] || !contaPor(reg.contas[a.id])) reg.contas[a.id] = ligarConta(reg.banco, a);
      for (const a of contas) {
        const cartao = a.tipo === 'CREDIT';
        let lista = (a.txs || []).filter(t => t.status !== 'PENDING' && t.data).map(t => {
          const saida = t.tipo ? t.tipo === 'DEBIT' : t.valor < 0;
          return { ext: 'pg:' + t.id, data: t.data, valor: Math.abs(Math.round(t.valor * 100) / 100), tipo: saida ? 'saida' : 'entrada', desc: limparDesc(t.desc), catHint: t.cat };
        }).filter(x => x.valor > 0);
        if (cartao) lista = lista.filter(x => !(x.tipo === 'entrada' && /pagamento|pgto|pag fat/.test(norm(x.desc))));
        const saldoBanco = typeof a.saldo === 'number' ? (cartao ? -Math.abs(a.saldo) : a.saldo) : null;
        novos += importarLancamentos(reg.contas[a.id], lista, { saldoBanco }).novos;
      }
    }
    c.ultima = new Date().toISOString();
    salvar(); render();
    if (erros.length) toast(erros[0]);
    else if (novos || !silencioso) toast(novos ? `${novos} ${novos === 1 ? 'lançamento novo' : 'lançamentos novos'} do banco` : 'Tudo em dia com o banco');
  } catch (e) { if (!silencioso) toast(e.message); }
  finally { sincronizando = false; renderConexaoStatus(); }
}
function haQuanto(isoTs) {
  if (!isoTs) return 'nunca';
  const m = Math.round((Date.now() - new Date(isoTs).getTime()) / 6e4);
  if (m < 1) return 'agora'; if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24); return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}
function statusConexaoTxt() {
  const c = S.conexao;
  if (!c?.itens?.length) return '';
  return sincronizando ? 'Atualizando com o banco…' : `Banco atualizado ${haQuanto(c.ultima)}`;
}
function renderConexaoStatus() { $$('[data-status-banco]').forEach(el => { el.textContent = statusConexaoTxt(); }); }
function carregarPluggy() {
  if (window.PluggyConnect) return Promise.resolve();
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js';
    s.onload = () => window.PluggyConnect ? ok() : falha(new Error('O botão da Pluggy não carregou.'));
    s.onerror = () => falha(new Error('Não consegui carregar o botão da Pluggy. Use o ID da conexão abaixo.'));
    document.head.appendChild(s);
  });
}
async function conectarBanco() {
  try {
    const { accessToken } = await chamar('/connect-token', {});
    await carregarPluggy();
    fechar();
    const pc = new window.PluggyConnect({
      connectToken: accessToken,
      onSuccess: d => { const item = d?.item || d; if (item?.id) adicionarItem(item.id, item.connector?.name); },
      onError: e => toast(e?.message ? `A conexão não deu certo: ${e.message}` : 'A conexão não deu certo. Tente de novo.'),
    });
    await pc.init();
  } catch (e) { erro(e.message); }
}
function adicionarItem(id, banco) {
  id = String(id || '').trim();
  if (!/^[\w-]{8,64}$/.test(id)) { erro('Esse ID não parece certo. Ele tem letras, números e traços, como 3f1c2a9e-….'); return false; }
  if (!S.conexao.itens.some(i => i.id === id)) S.conexao.itens.push({ id, banco: banco || '', contas: {}, status: '' });
  salvar();
  fechar();
  toast('Banco conectado. Buscando os lançamentos…');
  sincronizar();
  return true;
}
function formConexao() {
  const c = S.conexao;
  const pronto = c.url && c.chave;
  const passos = `
    <ol class="passos-txt">
      <li>Crie sua conta grátis no <b>Meu Pluggy</b> (meu.pluggy.ai) e conecte seus bancos lá. Ele abre o app de cada banco para você autorizar.</li>
      <li>No painel da Pluggy (dashboard.pluggy.ai), crie uma aplicação e copie o <b>Client ID</b> e o <b>Client Secret</b>.</li>
      <li>Coloque o servidor do Rumo no ar com essas chaves. O passo a passo está no arquivo <b>rumo/servidor/LEIA-ME.md</b> do seu repositório.</li>
      <li>Cole abaixo o endereço do servidor e a senha que você criou.</li>
    </ol>`;
  const corpo = `
    <p class="calmo">O Rumo busca sozinho o saldo e o extrato das suas contas pelo Open Finance, toda vez que você abre o app.</p>
    ${pronto ? '' : passos}
    ${pronto && c.itens.length ? `<ul class="lista">${c.itens.map(i => `<li class="item"><span class="conta-ic" style="--c:var(--accent)">${ic('banco')}</span><span class="item-txt"><span class="item-t">${esc(i.banco || 'Banco')}</span><span class="item-m"><span class="pill ${i.erro ? 'out' : 'ok'}">${i.erro ? esc(i.erro) : `${Object.keys(i.contas || {}).length} ${Object.keys(i.contas || {}).length === 1 ? 'conta' : 'contas'}`}</span></span></span><button class="btn btn-mini btn-sec" type="button" data-a="item-remover" data-id="${esc(i.id)}">Remover</button></li>`).join('')}</ul>
      <p class="miudo" data-status-banco>${statusConexaoTxt()}</p>` : ''}
    ${pronto ? `<div class="botoes">
        <button class="btn" type="button" data-a="banco-conectar">${ic('mais')}${c.itens.length ? 'Conectar outro banco' : 'Conectar meu banco'}</button>
        ${c.itens.length ? `<button class="btn btn-sec" type="button" data-a="banco-sync">${ic('rotina')}Atualizar agora</button>` : ''}
      </div>
      <details class="detalhe"><summary>Já tenho o ID da conexão</summary>
        <p class="miudo">Se o botão da Pluggy não abrir, copie o ID do item no painel da Pluggy (em Items) e cole aqui.</p>
        <div class="rapido"><input id="item-id" placeholder="ID do item" autocomplete="off"><button class="rapido-ok" type="button" data-a="item-add">Adicionar</button></div>
      </details>` : ''}
    <details class="detalhe" ${pronto ? '' : 'open'}><summary>Servidor</summary>
      <label class="campo"><span>Endereço do servidor</span><input name="url" inputmode="url" value="${esc(c.url || 'https://rumo-banco.jgg190310.workers.dev')}" placeholder="https://rumo-banco.jgg190310.workers.dev"></label>
      <label class="campo"><span>Senha do servidor</span><input name="chave" type="password" value="${esc(c.chave)}" placeholder="A RUMO_CHAVE que você criou" autocomplete="off"></label>
      <button class="btn btn-sec" type="submit">Salvar e testar</button>
      ${pronto ? '<button class="btn btn-perigo-sec" type="button" data-a="conexao-desligar">Desligar a conexão</button>' : ''}
    </details>
    <p class="miudo">Seus dados passam pela Pluggy e pelo seu servidor, e o Rumo só lê: não faz Pix nem pagamento. A autorização vence (em geral em até 12 meses) e você renova pelo app do banco.</p>`;
  folha('Conexão com o banco', corpo, {
    rodape: '',
    async enviar(fd) {
      const url = String(fd.get('url') || '').trim(), chave = String(fd.get('chave') || '').trim();
      if (!/^https:\/\/[^\s/]+/.test(url)) { erro('O endereço precisa começar com https://'); return false; }
      if (chave.length < 8) { erro('A senha do servidor tem pelo menos 8 caracteres.'); return false; }
      S.conexao.url = url; S.conexao.chave = chave; salvar();
      const botao = $('#folha-form [type=submit]'); botao.disabled = true; botao.textContent = 'Testando…';
      try { await chamar('/ping', {}); toast('Servidor ligado. Agora conecte seu banco.'); formConexao(); }
      catch (e) { botao.disabled = false; botao.textContent = 'Salvar e testar'; erro(e.message); }
      return false;
    },
  });
}

/* ---------- arquivos ---------- */
/* ---------- levar os dados para outro navegador por um link ----------
   Os dados vão comprimidos depois do # do link: essa parte nunca sai do
   aparelho (o navegador não manda o # para o site). */
const b64url = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64url = s => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i); return out; };
async function empacotar(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (window.CompressionStream) {
    try { const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z' + b64url(z); } catch (e) { /* sem compressão */ }
  }
  return 'j' + b64url(bytes);
}
async function desempacotar(s) {
  const tipo = s[0], bytes = deB64url(s.slice(1));
  const txt = tipo === 'z' ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text() : new TextDecoder().decode(bytes);
  return JSON.parse(txt);
}
const BASE_APP = 'https://jgg190310-ops.github.io/CLAUDE.md/rumo/';
/* Código de 8 letras (como no Drink): os dados vão cifrados pelo ntfy.sh, que só
   vê o pacote embaralhado e apaga em 12 horas. O código gera o canal e a chave
   e só aparece na tela de quem pediu. É o jeito de levar os dados do Safari para
   o Rumo da tela de início, que no iPhone guarda tudo separado e não abre por link. */
const NTFY = () => String(window.RUMO_NTFY || 'https://ntfy.sh').replace(/\/$/, '');
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', PEDACO = 3200;
const limparCod = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fmtCod = c => `${c.slice(0, 4)}-${c.slice(4)}`;
const instalado = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function sha(txt) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))); }
async function chavesCodigo(cod) {
  const c = limparCod(cod);
  const topico = 'rumo-' + [...await sha('rumo-canal:' + c)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 28);
  const k = await crypto.subtle.importKey('raw', await sha('rumo-chave:' + c), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { topico, k };
}
async function enviarPorCodigo(obj) {
  const cod = Array.from(crypto.getRandomValues(new Uint8Array(8)), n => LETRAS[n % LETRAS.length]).join('');
  const { topico, k } = await chavesCodigo(cod);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(await empacotar(obj))));
  const tudo = new Uint8Array(12 + ct.length); tudo.set(iv); tudo.set(ct, 12);
  const env = b64url(tudo), n = Math.ceil(env.length / PEDACO);
  if (n > 60) throw new Error('grande');
  for (let i = 0; i < n; i++) {
    const r = await fetch(`${NTFY()}/${topico}`, { method: 'POST', body: JSON.stringify({ c: 'rumo', i, n, d: env.slice(i * PEDACO, (i + 1) * PEDACO) }) });
    if (!r.ok) throw new Error('publicar ' + r.status);
  }
  return cod;
}
async function buscarPorCodigo(cod) {
  const { topico, k } = await chavesCodigo(cod);
  let r;
  try { r = await fetch(`${NTFY()}/${topico}/json?poll=1&since=12h`); } catch (e) { throw new Error('Sem internet agora. Confira a conexão e tente de novo.'); }
  if (!r.ok) throw new Error('Não deu para buscar agora. Tente de novo em um minuto.');
  const partes = new Map(); let n = 0;
  for (const linha of (await r.text()).split('\n')) {
    try { const p = JSON.parse(JSON.parse(linha).message); if (p?.c === 'rumo' && Number.isInteger(p.i) && Number.isInteger(p.n) && typeof p.d === 'string') { partes.set(p.i, p.d); n = p.n; } } catch (e) { /* outra linha */ }
  }
  if (!n || partes.size < n) throw new Error('Não achei dados com esse código. Confira as letras ou gere um código novo (cada um vale 12 horas).');
  try {
    const b = deB64url(Array.from({ length: n }, (_, i) => partes.get(i)).join(''));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, k, b.slice(12));
    return await desempacotar(new TextDecoder().decode(pt));
  } catch (e) { throw new Error('Esse código não abriu os dados. Gere um código novo e tente de novo.'); }
}
const resumoDe = d => `${d.tarefas.length} ${d.tarefas.length === 1 ? 'tarefa' : 'tarefas'}, ${(d.habitos || []).length} hábitos, ${(d.contas || []).length} contas e ${d.lanc.length} lançamentos`;
const dadosParaLevar = () => ({ ...S, boasVindas: false, conexao: { ...S.conexao, chave: '' } });
async function formLevar() {
  folha('Levar meus dados', `<p class="calmo">Gerando o código…</p>`, { rodape: '' });
  const obj = dadosParaLevar();
  const link = `${BASE_APP}#dados=${await empacotar(obj)}`;
  let cod = null;
  try { cod = await enviarPorCodigo(obj); } catch (e) { cod = null; }
  const ate = new Date(Date.now() + 12 * 3600e3).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const guiaInstalar = ehIOS() && !instalado() ? `
    <p class="eyebrow">Para usar como app no iPhone</p>
    <ol class="passos-txt">
      <li>Aqui no Safari, toque em <b>Compartilhar</b> (o quadrado com a seta) e em <b>Adicionar à Tela de Início</b>.</li>
      <li>Abra o Rumo pelo ícone novo na tela de início.</li>
      <li>Toque em <b>Trazer meus dados</b> e digite o código acima.</li>
    </ol>` : `
    <ol class="passos-txt">
      <li>Abra o Rumo onde você quer os dados: o app da tela de início, outro navegador ou um celular novo.</li>
      <li>Toque em <b>Trazer meus dados</b> (na tela de boas-vindas ou em Ajustes) e digite o código.</li>
    </ol>`;
  folha('Levar meus dados', `
    <p class="calmo">Vão <b>${resumoDe(obj)}</b>${S.perfil.nome ? ` de ${esc(S.perfil.nome)}` : ''}. Tudo continua aqui também.</p>
    ${cod ? `<div class="codigo-caixa"><span class="eyebrow">Seu código</span><p class="codigo" id="levar-cod">${fmtCod(cod)}</p><button class="btn btn-sec" type="button" data-a="levar-copiar-cod">Copiar código</button><p class="miudo">Vale até ${ate}.</p></div>${guiaInstalar}`
      : '<p class="aviso-mini">Não deu para gerar o código agora (precisa de internet). Use o link abaixo.</p>'}
    <details class="detalhe" ${cod ? '' : 'open'}><summary>Ou leve por um link (para o Safari ou outro navegador)</summary>
      <a class="btn largo" href="${esc('x-safari-' + link)}">${ic('dir')}Abrir no Safari</a>
      <button class="btn btn-sec largo" type="button" data-a="levar-copiar">Copiar o link</button>
      <textarea id="levar-link" rows="3" readonly aria-label="Link com os seus dados">${esc(link)}</textarea>
      <p class="miudo">O link também pode ser colado em Trazer meus dados.</p>
    </details>
    <p class="miudo">Os dados vão cifrados: o serviço que leva o código (ntfy.sh) só vê tudo embaralhado e apaga em 12 horas. Não mande o código nem o link para ninguém. A senha da conexão com o banco não vai junto.</p>`, { rodape: '' });
}
function formTrazer() {
  folha('Trazer meus dados', `
    <p class="calmo">No Rumo onde os seus dados estão (no Safari, por exemplo), abra <b>Ajustes › Levar meus dados</b> e digite aqui o código que aparecer.</p>
    <label class="campo"><span>Código (ou o link)</span><input id="trazer-cod" name="cod" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" autofocus></label>`, {
    rodape: `<footer class="folha-pe"><button class="btn largo" type="submit" id="trazer-ok">Trazer meus dados</button></footer>`,
    async enviar(fd) {
      const v = String(fd.get('cod') || '').trim();
      const botao = $('#trazer-ok'); botao.disabled = true; botao.textContent = 'Buscando…';
      try {
        let d;
        if (v.includes('#dados=')) d = await desempacotar(v.split('#dados=')[1].trim());
        else {
          const c = limparCod(v);
          if (c.length !== 8) throw new Error('O código tem 8 letras e números, como ABCD-2345.');
          d = await buscarPorCodigo(c);
        }
        if (!d || !Array.isArray(d.lanc) || !Array.isArray(d.tarefas)) throw new Error('Esses dados vieram incompletos. Gere um código novo.');
        confirmarRecebidos(d);
      } catch (e) { botao.disabled = false; botao.textContent = 'Trazer meus dados'; erro(e.message || 'Não deu certo. Tente de novo.'); }
    },
  });
  $('#trazer-cod', dlg).addEventListener('input', e => {
    if (e.target.value.includes('#')) return;
    const c = limparCod(e.target.value).slice(0, 8);
    e.target.value = c.length > 4 ? fmtCod(c) : c;
  });
}
async function receberDados(pacote) {
  let d;
  try { d = await desempacotar(pacote); if (!d || !Array.isArray(d.lanc) || !Array.isArray(d.tarefas)) throw new Error('formato'); }
  catch (e) { toast('Esse link de dados está incompleto. Copie o link inteiro de novo.'); return; }
  confirmarRecebidos(d);
}
function confirmarRecebidos(d) {
  const temAqui = !S.boasVindas && !S.exemplo && (S.tarefas.length || S.contas.length || S.habitos.length || S.lanc.length);
  const resumo = `${d.tarefas.length} tarefas, ${(d.habitos || []).length} hábitos, ${(d.contas || []).length} contas e ${d.lanc.length} lançamentos`;
  folha('Trazer os seus dados', `
    <p class="calmo">Chegaram <b>${resumo}</b>${d.perfil?.nome ? ` de ${esc(d.perfil.nome)}` : ''}.</p>
    ${temAqui ? '<p class="aviso-mini">Este navegador já tem dados do Rumo. Eles serão trocados pelos que chegaram. Se quiser guardar os daqui, baixe um backup antes.</p>' : ''}`, {
    rodape: `<footer class="folha-pe duplo"><button class="btn btn-sec" type="button" data-a="fechar">Agora não</button><button class="btn" type="button" data-a="receber-ok">Trazer e salvar aqui</button></footer>`,
  });
  recebidos = d;
}
let recebidos = null;

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportarCSV() {
  const linhas = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Para', 'Valor']];
  for (const l of S.lanc.slice().sort((a, b) => a.data.localeCompare(b.data))) {
    const v = l.tipo === 'saida' ? -l.valor : l.valor;
    linhas.push([l.data.split('-').reverse().join('/'), { saida: 'Gasto', entrada: 'Entrada', transf: 'Transferência' }[l.tipo], l.desc, catInfo(l).nome, contaPor(l.conta)?.nome || '', l.tipo === 'transf' ? contaPor(l.destino)?.nome || '' : '', num2(v)]);
  }
  const csv = '﻿' + linhas.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  baixar(`rumo-extrato-${hoje()}.csv`, csv, 'text/csv;charset=utf-8');
}
function importar(arq) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d || typeof d !== 'object' || !Array.isArray(d.lanc) || !Array.isArray(d.tarefas)) throw new Error('formato');
      fechar();
      mudar(() => { const chave = S.conexao?.chave; S = migrar(d); if (!S.conexao.chave && chave) S.conexao.chave = chave; }, 'Backup restaurado');
    } catch (e) { erro('Esse arquivo não é um backup do Rumo. Escolha o arquivo rumo-backup que você baixou.'); }
  };
  fr.readAsText(arq);
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, desfazer) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${desfazer ? '<button type="button" class="toast-btn">Desfazer</button>' : ''}`;
  el.hidden = false; el.classList.remove('sai'); void el.offsetWidth; el.classList.add('entra');
  if (desfazer) $('.toast-btn', el).onclick = () => { desfazer(); some(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(some, desfazer ? 6000 : 2800);
  function some() { el.classList.remove('entra'); el.classList.add('sai'); setTimeout(() => { el.hidden = true; }, 220); }
}

/* ---------- ações ---------- */
const ACOES = {
  fechar,
  ir: b => { fechar(); irPara(b.dataset.aba, b.dataset.din ? { din: b.dataset.din } : {}); },
  ajustes: () => formAjustes(),
  fab: () => ({ hoje: formNovo, tarefas: () => formTarefa(), dinheiro: () => formLanc(null, 'saida'), rotina: () => formHabito() }[ui.aba])(),
  'novo-gasto': () => formLanc(null, 'saida'),
  'novo-entrada': () => formLanc(null, 'entrada'),
  'nova-transf': () => formLanc(null, 'transf'),
  'nova-tarefa': () => formTarefa(),
  'novo-habito': () => formHabito(),
  'nova-conta': () => formConta(),
  'nova-fixa': () => formFixa(),
  orcamento: () => formOrcamento(),
  'tarefa-edit': b => formTarefa(b.dataset.id),
  'habito-edit': b => formHabito(b.dataset.id),
  'lanc-edit': b => formLanc(b.dataset.id),
  'conta-edit': b => formConta(b.dataset.id),
  'fixa-edit': b => formFixa(b.dataset.id),
  'tarefa-ok': b => {
    const x = S.tarefas.find(t => t.id === b.dataset.id); if (!x) return;
    const feita = !x.feita;
    mudar(() => { x.feita = feita; x.feitaEm = feita ? hoje() : null; }, feita ? 'Tarefa feita' : null);
  },
  'habito-ok': b => {
    const h = S.habitos.find(x => x.id === b.dataset.id), d = b.dataset.dia; if (!h || d > hoje()) return;
    mudar(() => { if (h.feitos[d]) delete h.feitos[d]; else h.feitos[d] = 1; });
    if (h.feitos[d]) { const s = sequencia(h); if (d === hoje() && s >= 3 && [3, 7, 14, 21, 30, 50, 100].includes(s)) toast(`${s} vezes seguidas: ${h.nome.toLowerCase()}.`); }
  },
  'fixa-pagar': b => {
    const f = S.fixas.find(x => x.id === b.dataset.id), ym = b.dataset.ym; if (!f) return;
    if (!contaPor(f.conta)) { formFixa(f.id); erro('A conta de pagamento foi apagada. Escolha outra.'); return; }
    const data = ym === mesDe(hoje()) ? hoje() : `${ym}-${pad(Math.min(f.dia, diasNoMes(ym)))}`;
    mudar(() => { const l = { id: uid(), tipo: 'saida', valor: f.valor, desc: f.desc, cat: f.cat, conta: f.conta, data }; S.lanc.push(l); f.pagas = { ...(f.pagas || {}), [ym]: l.id }; }, `${f.desc} paga: ${din(f.valor)}`);
  },
  'fixa-desfazer': b => {
    const f = S.fixas.find(x => x.id === b.dataset.id), ym = b.dataset.ym; if (!f) return;
    mudar(() => { const lid = f.pagas?.[ym]; S.lanc = S.lanc.filter(l => l.id !== lid); delete f.pagas[ym]; }, `Pagamento de ${f.desc} desfeito`);
  },
  'lanc-apagar': b => { fechar(); mudar(() => { const id = b.dataset.id; S.lanc = S.lanc.filter(l => l.id !== id); for (const f of S.fixas) for (const k in f.pagas || {}) if (f.pagas[k] === id) delete f.pagas[k]; }, 'Lançamento apagado'); },
  'tarefa-apagar': b => { fechar(); mudar(() => { S.tarefas = S.tarefas.filter(t => t.id !== b.dataset.id); }, 'Tarefa apagada'); },
  'habito-apagar': b => { fechar(); mudar(() => { S.habitos = S.habitos.filter(h => h.id !== b.dataset.id); }, 'Hábito apagado'); },
  'fixa-apagar': b => { fechar(); mudar(() => { S.fixas = S.fixas.filter(f => f.id !== b.dataset.id); }, 'Conta fixa apagada'); },
  'conta-apagar': b => {
    const c = contaPor(b.dataset.id); if (!c) return;
    const n = S.lanc.filter(l => l.conta === c.id || l.destino === c.id).length;
    confirmar(`Apagar ${esc(c.nome)}?`, n ? `Os ${n} lançamentos dessa conta também serão apagados. Você pode desfazer logo depois.` : 'A conta não tem lançamentos.', 'Apagar conta', () => {
      mudar(() => { S.contas = S.contas.filter(x => x.id !== c.id); S.lanc = S.lanc.filter(l => l.conta !== c.id && l.destino !== c.id); }, `${c.nome} apagada`);
    });
  },
  'confirmar-ok': () => { const fn = confirmarFn; confirmarFn = null; fechar(); fn?.(); },
  'zerar-exemplo': () => confirmar('Começar do zero?', 'O exemplo some e o Rumo fica vazio, pronto para as suas contas, tarefas e hábitos.', 'Apagar o exemplo', () => {
    const nome = S.perfil.nome, tema = S.perfil.tema;
    mudar(() => { const cx = S.conexao; S = vazio(); S.conexao = { ...cx, ultima: null, itens: cx.itens.map(i => ({ ...i, contas: {} })) }; S.perfil.nome = nome; S.perfil.tema = tema; }, 'Pronto. Comece cadastrando sua conta do banco.');
    irPara('hoje');
  }),
  'apagar-tudo': () => confirmar('Apagar tudo?', 'Contas, lançamentos, tarefas e hábitos deste aparelho serão apagados e o Rumo fica vazio. Você pode desfazer logo depois.', 'Apagar tudo', () => {
    const nome = S.perfil.nome, tema = S.perfil.tema;
    mudar(() => { const cx = S.conexao; S = vazio(); S.conexao = { ...cx, ultima: null, itens: cx.itens.map(i => ({ ...i, contas: {} })) }; S.perfil.nome = nome; S.perfil.tema = tema; }, 'Tudo apagado. O Rumo está vazio.');
    irPara('hoje');
  }),
  'apagar-parte': b => {
    const v = b.dataset.v;
    const info = {
      tarefas: [`Apagar as ${S.tarefas.length} tarefas?`, 'Contas, gastos e hábitos continuam como estão.', () => { S.tarefas = []; }, 'Tarefas apagadas'],
      habitos: [`Apagar os ${S.habitos.length} hábitos?`, 'O histórico de cada hábito também sai. Tarefas e dinheiro continuam como estão.', () => { S.habitos = []; }, 'Hábitos apagados'],
      dinheiro: ['Apagar todo o dinheiro?', `Saem ${S.contas.length} contas, ${S.lanc.length} lançamentos, ${S.fixas.length} contas fixas e os limites. Tarefas e hábitos continuam.`, () => { S.contas = []; S.lanc = []; S.fixas = []; S.orcamento = {}; S.conexao.ultima = null; S.conexao.itens.forEach(i => { i.contas = {}; }); }, 'Dinheiro apagado'],
    }[v];
    if (!info) return;
    confirmar(info[0], `${info[1]} Você pode desfazer logo depois.`, 'Apagar', () => {
      mudar(() => { info[2](); if (!S.contas.length && !S.tarefas.length && !S.habitos.length) { S.exemplo = false; S.passos = true; } }, info[3]);
    });
  },
  'importar-extrato': () => formImportar(),
  conexao: () => formConexao(),
  'banco-conectar': () => conectarBanco(),
  'banco-sync': () => { fechar(); sincronizar(); },
  'item-add': () => adicionarItem($('#item-id', dlg)?.value),
  'item-remover': b => { S.conexao.itens = S.conexao.itens.filter(i => i.id !== b.dataset.id); salvar(); formConexao(); toast('Banco removido do Rumo. Os lançamentos que já vieram ficam. Para cancelar de vez, revogue a autorização no app do banco.'); },
  'conexao-desligar': () => confirmar('Desligar a conexão?', 'O Rumo para de buscar os lançamentos sozinho. O que já veio do banco continua aqui.', 'Desligar', () => { mudar(() => { S.conexao = { url: '', chave: '', itens: [], ultima: null }; }, 'Conexão desligada'); }),
  levar: () => formLevar(),
  trazer: () => formTrazer(),
  'levar-copiar-cod': async () => {
    const t = $('#levar-cod', dlg)?.textContent; if (!t) return;
    try { await navigator.clipboard.writeText(t); toast('Código copiado.'); } catch (e) { toast(`O código é ${t}.`); }
  },
  'levar-copiar': async () => {
    const t = $('#levar-link', dlg); if (!t) return;
    try { await navigator.clipboard.writeText(t.value); toast('Link copiado. Cole na barra do Safari.'); }
    catch (e) { t.focus(); t.select(); toast('Não deu para copiar sozinho. O link está selecionado: toque em Copiar.'); }
  },
  'receber-ok': async () => {
    const d = recebidos; recebidos = null; if (!d) return;
    const chave = S.conexao?.chave, tema = S.perfil.tema;
    fechar();
    S = migrar(d); S.boasVindas = false;
    if (!S.conexao.chave && chave) S.conexao.chave = chave;
    if (!S.perfil.tema) S.perfil.tema = tema;
    ui.aba = 'hoje'; history.replaceState(null, '', location.pathname + '#hoje');
    render();
    await salvar();
    toast(falhouSalvar ? 'Os dados chegaram, mas este navegador não está deixando salvar.' : 'Pronto. Seus dados estão salvos neste navegador.');
  },
  'passos-ocultar': () => mudar(() => { S.passos = false; }, 'Primeiros passos escondidos'),
  exportar: () => { baixar(`rumo-backup-${hoje()}.json`, JSON.stringify({ ...S, conexao: { ...S.conexao, chave: '' } }, null, 1), 'application/json'); toast('Backup baixado'); },
  csv: () => { if (!S.lanc.length) { toast('Ainda não há lançamentos para exportar.'); return; } exportarCSV(); toast('Planilha baixada. Abre no Excel e no Google Planilhas.'); },
  tar: b => { ui.tar = b.dataset.v; render(); },
  din: b => { ui.din = b.dataset.v; render(); },
  mes: b => { const n = addMes(ui.mes, Number(b.dataset.d)); if (n > mesDe(hoje())) return; ui.mes = n; render(); },
  semana: b => { ui.dia = addDias(ui.dia, Number(b.dataset.d)); render(); },
  dia: b => { ui.dia = b.dataset.dia; render(); },
  'cat-extrato': b => { ui.din = 'extrato'; ui.busca = (CAT_S[b.dataset.cat] || CAT_S.outros).nome; render(); },
  'dias-set': b => { const v = b.dataset.v; $$('[name=dias]', dlg).forEach(i => { i.checked = v.includes(i.value); }); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const fn = ACOES[b.dataset.a];
  if (fn) { e.preventDefault(); fn(b); }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-a-file="importar"]') && e.target.files[0]) importar(e.target.files[0]);
  if (e.target.matches('[data-a-file="extrato"]') && e.target.files[0]) lerArquivoExtrato(e.target.files[0]);
  if (e.target.matches('[data-a-prev]') && arqAtual) {
    if (e.target.name === 'conta') {
      $$('.campo-nova', dlg).forEach(n => { n.hidden = e.target.value !== 'nova'; });
      const cs = $('.campo-saldo', dlg); if (cs && arqAtual.saldo == null) cs.hidden = e.target.value === 'nova';
    }
    else prevImportar(arqAtual);
  }
});
document.addEventListener('submit', e => {
  const bv = e.target.closest('[data-form="bv"]');
  if (bv) {
    e.preventDefault();
    const nome = String(new FormData(bv).get('nome') || '').trim(), modo = e.submitter?.value || 'zero';
    const tema = S.perfil.tema, conexao = S.conexao;
    S = modo === 'exemplo' ? exemplo() : vazio();
    S.boasVindas = false; S.perfil.nome = nome; S.perfil.tema = tema;
    if (conexao?.chave) S.conexao = conexao;
    irPara('hoje');
    salvar().then(() => {
      if (falhouSalvar || armaz.privado) return; // o aviso já aparece no topo
      toast(modo === 'exemplo' ? 'Exemplo carregado. Para apagar, toque em Começar do zero.' : 'Tudo pronto e salvo neste aparelho.');
    });
    return;
  }
  const f = e.target.closest('[data-form="tarefa-rapida"]');
  if (!f) return;
  e.preventDefault();
  const fd = new FormData(f), titulo = String(fd.get('titulo') || '').trim();
  if (!titulo) { f.querySelector('input').focus(); return; }
  const q = fd.get('quando'), data = q === '' ? '' : addDias(hoje(), Number(q));
  const idInput = f.querySelector('input[name=titulo]').id, qSel = f.querySelector('select')?.value;
  mudar(() => { S.tarefas.push({ id: uid(), titulo, data, prio: 2, area: 'Pessoal', nota: '', feita: false, feitaEm: null, criada: hoje() }); }, data ? `Anotado para ${rotDia(data).toLowerCase()}` : 'Anotado, sem data', false);
  const novo = document.getElementById(idInput); if (novo) { novo.focus(); const s = novo.form.querySelector('select'); if (s && qSel != null) s.value = qSel; }
});
document.addEventListener('input', e => {
  if (e.target.id === 'busca-ex') { ui.busca = e.target.value; $('#extrato-lista').innerHTML = listaExtrato(); }
});
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#dados=')) { const p = location.hash.slice(7); history.replaceState(null, '', location.pathname + '#hoje'); receberDados(p); return; }
  irPara(location.hash.slice(1));
});
document.addEventListener('keydown', e => {
  if (S.boasVindas || dlg.open || e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n') { e.preventDefault(); ACOES.fab(); }
  const k = { 1: 'hoje', 2: 'tarefas', 3: 'dinheiro', 4: 'rotina' }[e.key]; if (k) irPara(k);
});
// virou o dia com o app aberto: atualiza
let diaVisto = hoje();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && hoje() !== diaVisto) { diaVisto = hoje(); ui.dia = diaVisto; ui.mes = mesDe(diaVisto); render(); }
  if (document.visibilityState === 'visible') autoSync();
});
function autoSync() {
  const c = S.conexao; if (!pronto || !c?.itens?.length || S.boasVindas) return;
  if (!c.ultima || Date.now() - new Date(c.ultima).getTime() > 30 * 6e4) sincronizar({ silencioso: true });
}

(async () => {
  // link com os dados vindos de outro navegador: .../rumo/#dados=...
  let pacoteRecebido = null;
  if (location.hash.startsWith('#dados=')) { pacoteRecebido = location.hash.slice(7); history.replaceState(null, '', location.pathname + location.search + '#hoje'); }
  ui.aba = ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'hoje';
  S = await carregar();
  await conferirArmazenamento();
  // link pronto da conexão: .../rumo/?ligar=SENHA (a senha sai da barra de endereço na hora)
  const lig = new URLSearchParams(location.search).get('ligar');
  let abrirConexao = false;
  if (lig) {
    history.replaceState(null, '', location.pathname + location.hash);
    if (/^[\w-]{16,128}$/.test(lig)) {
      S.conexao.chave = lig;
      if (!S.conexao.url) S.conexao.url = 'https://rumo-banco.jgg190310.workers.dev';
      abrirConexao = true;
    }
  }
  pronto = true;
  if (!S.boasVindas || abrirConexao) await salvar(); // regrava nas duas cópias (e testa se o navegador deixa)
  if (abrirConexao && !S.boasVindas) { ui.aba = 'dinheiro'; ui.din = 'contas'; }
  render();
  if (abrirConexao && !S.boasVindas) formConexao();
  if (pacoteRecebido) await receberDados(pacoteRecebido);
  autoSync();
})();
})();
