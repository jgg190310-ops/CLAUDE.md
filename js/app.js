'use strict';

// ══════════════════════════════════════════════
//  PERSISTENCE — tudo salvo no localStorage
// ══════════════════════════════════════════════
const STORE_KEY = 'financeos-store';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveStore(patch) {
  try {
    const s = loadStore();
    Object.assign(s, patch);
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) { /* storage indisponível — segue sem persistir */ }
}

const _store = loadStore();

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
const pageTitles = {
  dashboard: 'Dashboard',
  goals: 'Metas Financeiras',
  budgets: 'Orçamentos',
  stocks: 'Bolsa de Valores',
  calculator: 'Calculadora de Juros',
  profile: 'Configurações do Perfil',
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
    // close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById(page).classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  if (page === 'dashboard') initDashboardCharts();
  if (page === 'stocks') initStocksPage();
  if (page === 'calculator') calcInvestment();
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ══════════════════════════════════════════════
//  DASHBOARD CHARTS
// ══════════════════════════════════════════════
let patrimonioChart, gastosChart;

function initDashboardCharts() {
  if (patrimonioChart) return;

  const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const patrimonio = [180000, 195000, 200000, 210000, 218000, 225000, 238000, 245000, 255000, 268000, 275000, 284750];
  const invest = [80000, 88000, 92000, 100000, 108000, 115000, 124000, 132000, 140000, 155000, 162000, 172000];

  const ctx1 = document.getElementById('patrimonioChart').getContext('2d');
  patrimonioChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Patrimônio',
          data: patrimonio,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: 'Investimentos',
          data: invest,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: chartOptions(),
  });

  const ctx2 = document.getElementById('gastosChart').getContext('2d');
  gastosChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'],
      datasets: [{
        data: [2200, 1200, 800, 600, 400, 220],
        backgroundColor: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      ...doughnutOptions(),
      cutout: '70%',
    },
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,15,36,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        callbacks: {
          label: ctx => ` R$ ${ctx.parsed.y.toLocaleString('pt-BR')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { color: 'transparent' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k',
        },
        border: { color: 'transparent' },
      },
    },
  };
}

function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 12 },
          padding: 12,
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 2,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15,15,36,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: ctx => ` R$ ${ctx.parsed.toLocaleString('pt-BR')}`,
        },
      },
    },
  };
}

// Init on load
initDashboardCharts();

// ══════════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════════
const defaultGoals = [
  { id: 1, name: 'Viagem para Europa', icon: '✈️', color: '#6366f1', target: 15000, current: 10200, deadline: '2026-12-01' },
  { id: 2, name: 'Casa Própria', icon: '🏠', color: '#10b981', target: 150000, current: 48000, deadline: '2030-06-01' },
  { id: 3, name: 'Reserva de Emergência', icon: '💰', color: '#f59e0b', target: 50000, current: 50000, deadline: '2025-12-01' },
  { id: 4, name: 'Carro Novo', icon: '🚗', color: '#8b5cf6', target: 80000, current: 12000, deadline: '2026-09-01' },
  { id: 5, name: 'MBA Internacional', icon: '📚', color: '#ef4444', target: 30000, current: 30000, deadline: '2025-08-01' },
  { id: 6, name: 'Casamento', icon: '💍', color: '#06b6d4', target: 40000, current: 18000, deadline: '2027-04-01' },
];
let goals = Array.isArray(_store.goals) ? _store.goals : defaultGoals;

function goalStatus(g) {
  if (g.current >= g.target) return 'done';
  return new Date(g.deadline) < new Date() ? 'late' : 'on-track';
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  grid.innerHTML = goals.map(g => {
    const status = goalStatus(g);
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    const remaining = Math.max(0, g.target - g.current);
    const deadline = new Date(g.deadline);
    const monthsLeft = Math.max(1, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
    const monthly = (remaining / monthsLeft).toFixed(0);
    const statusLabel = { 'on-track': 'No prazo', late: 'Atrasada', done: 'Concluída' }[status];
    return `
    <div class="goal-card">
      <div class="goal-card-header">
        <div class="goal-icon-wrap">
          <span class="goal-emoji">${g.icon}</span>
          <div>
            <div class="goal-name">${g.name}</div>
            <div class="goal-deadline">Meta: ${deadline.toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}</div>
          </div>
        </div>
        <div class="goal-head-right">
          <span class="goal-status ${status}">${statusLabel}</span>
          <button class="card-del" onclick="deleteGoal(${g.id})" title="Excluir meta">✕</button>
        </div>
      </div>
      <div class="goal-values">
        <span class="gv-current">R$ ${g.current.toLocaleString('pt-BR')}</span>
        <div style="text-align:right">
          <div class="gv-pct" style="color:${g.color}">${pct}%</div>
          <div class="gv-target">de R$ ${g.target.toLocaleString('pt-BR')}</div>
        </div>
      </div>
      <div class="goal-bar">
        <div class="goal-bar-fill" style="width:${pct}%;background:${g.color}"></div>
      </div>
      <div class="goal-monthly">
        <span>Aporte mensal sugerido</span>
        <strong>R$ ${Number(monthly).toLocaleString('pt-BR')}</strong>
      </div>
    </div>`;
  }).join('');

  // resumo calculado dos dados reais
  const done = goals.filter(g => goalStatus(g) === 'done').length;
  const late = goals.filter(g => goalStatus(g) === 'late').length;
  document.getElementById('gsTotal').textContent = goals.length;
  document.getElementById('gsDone').textContent = done;
  document.getElementById('gsProgress').textContent = goals.length - done - late;
  document.getElementById('gsLate').textContent = late;
}

renderGoals();

function openGoalModal() {
  document.getElementById('goalModal').classList.add('open');
}
function addGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value) || 0;
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const deadline = document.getElementById('goalDeadline').value;
  const icon = document.getElementById('goalIcon').value;
  const color = document.getElementById('goalColor').value;
  if (!name || !target || !deadline) { showToast('Preencha todos os campos', 'error'); return; }
  goals.push({ id: Date.now(), name, icon, color, target, current, deadline });
  saveStore({ goals });
  renderGoals();
  closeModal('goalModal');
  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalCurrent').value = '';
  document.getElementById('goalDeadline').value = '';
  showToast('Meta criada e salva!', 'success');
}
function deleteGoal(id) {
  const g = goals.find(x => x.id === id);
  if (!g || !confirm(`Excluir a meta "${g.name}"?`)) return;
  goals = goals.filter(x => x.id !== id);
  saveStore({ goals });
  renderGoals();
  showToast('Meta excluída');
}

// ══════════════════════════════════════════════
//  BUDGETS
// ══════════════════════════════════════════════
const defaultBudgets = [
  { id: 1, name: 'Moradia', icon: '🏠', color: '#6366f1', limit: 2500, spent: 2200 },
  { id: 2, name: 'Alimentação', icon: '🍔', color: '#10b981', limit: 1500, spent: 1200 },
  { id: 3, name: 'Transporte', icon: '🚗', color: '#f59e0b', limit: 1000, spent: 800 },
  { id: 4, name: 'Lazer', icon: '🎭', color: '#ef4444', limit: 1200, spent: 984 },
  { id: 5, name: 'Saúde', icon: '💊', color: '#8b5cf6', limit: 600, spent: 200 },
  { id: 6, name: 'Educação', icon: '📚', color: '#06b6d4', limit: 800, spent: 36 },
];
let budgets = Array.isArray(_store.budgets) ? _store.budgets : defaultBudgets;

function renderBudgets() {
  const list = document.getElementById('budgetsList');
  list.innerHTML = budgets.map(b => {
    const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
    const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : b.color;
    return `
    <div class="budget-item">
      <div class="budget-item-icon">${b.icon}</div>
      <div class="budget-main">
        <div class="budget-name">${b.name}</div>
        <div class="budget-bar-row">
          <div class="budget-bar-outer">
            <div class="budget-bar-inner" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <span class="budget-pct">${pct}%</span>
        </div>
      </div>
      <div class="budget-amounts">
        <div class="ba-spent" style="color:${barColor}">R$ ${b.spent.toLocaleString('pt-BR')}</div>
        <div class="ba-limit">de R$ ${b.limit.toLocaleString('pt-BR')}</div>
      </div>
      <button class="card-del" onclick="deleteBudget(${b.id})" title="Excluir orçamento">✕</button>
    </div>`;
  }).join('');

  // visão geral calculada dos dados reais
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const pctUsed = totalLimit ? (totalSpent / totalLimit) * 100 : 0;
  const top = budgets.reduce((m, b) => (b.spent > (m?.spent || 0) ? b : m), null);
  document.getElementById('boTotal').textContent = `R$ ${totalLimit.toLocaleString('pt-BR')}`;
  document.getElementById('boFill').style.width = `${Math.min(100, pctUsed).toFixed(1)}%`;
  document.getElementById('boTotalSub').textContent =
    `R$ ${totalSpent.toLocaleString('pt-BR')} utilizados de R$ ${totalLimit.toLocaleString('pt-BR')}`;
  document.getElementById('boSaldo').textContent = `R$ ${Math.max(0, totalLimit - totalSpent).toLocaleString('pt-BR')}`;
  document.getElementById('boSaldoSub').textContent = `${Math.max(0, 100 - pctUsed).toFixed(1).replace('.', ',')}% do orçamento restante`;
  document.getElementById('boTop').textContent = top ? top.name : '—';
  document.getElementById('boTopSub').textContent = top
    ? `R$ ${top.spent.toLocaleString('pt-BR')} — ${totalSpent ? Math.round((top.spent / totalSpent) * 100) : 0}% do total`
    : '—';
}

renderBudgets();

function openBudgetModal() {
  document.getElementById('budgetModal').classList.add('open');
}
function addBudget() {
  const name = document.getElementById('budgetName').value.trim();
  const limit = parseFloat(document.getElementById('budgetLimit').value) || 0;
  const spent = parseFloat(document.getElementById('budgetSpent').value) || 0;
  const icon = document.getElementById('budgetIcon').value;
  const color = document.getElementById('budgetColor').value;
  if (!name || !limit) { showToast('Preencha todos os campos', 'error'); return; }
  budgets.push({ id: Date.now(), name, icon, color, limit, spent });
  saveStore({ budgets });
  renderBudgets();
  closeModal('budgetModal');
  document.getElementById('budgetName').value = '';
  document.getElementById('budgetLimit').value = '';
  document.getElementById('budgetSpent').value = '';
  showToast('Orçamento criado e salvo!', 'success');
}
function deleteBudget(id) {
  const b = budgets.find(x => x.id === id);
  if (!b || !confirm(`Excluir o orçamento "${b.name}"?`)) return;
  budgets = budgets.filter(x => x.id !== id);
  saveStore({ budgets });
  renderBudgets();
  showToast('Orçamento excluído');
}

// ══════════════════════════════════════════════
//  STOCKS
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  STOCKS DATA
//  Preços base = últimos valores conhecidos (Jun/2026).
//  Quando brapi.dev não está conectado, o simulador
//  oscila em torno desse preço BASE (mean-reverting),
//  sem jamais se afastar da realidade. Ao conectar o
//  token brapi, os preços reais substituem tudo.
// ══════════════════════════════════════════════
const stocksData = {
  acoes: [
    { ticker: 'ITSA4', name: 'Itaúsa',        qty: 500, avgPrice:  9.20, price: 10.88, base: 10.88, total:  5440 },
    { ticker: 'PETR4', name: 'Petrobras',      qty: 200, avgPrice: 35.50, price: 37.90, base: 37.90, total:  7580 },
    { ticker: 'VALE3', name: 'Vale',           qty: 100, avgPrice: 65.00, price: 58.50, base: 58.50, total:  5850 },
    { ticker: 'BBAS3', name: 'Banco do Brasil',qty: 150, avgPrice: 55.00, price: 24.80, base: 24.80, total:  3720 },
    { ticker: 'WEGE3', name: 'WEG',            qty:  80, avgPrice: 38.00, price: 50.20, base: 50.20, total:  4016 },
  ],
  fiis: [
    { ticker: 'MXRF11', name: 'Maxi Renda',      qty: 200, avgPrice:  9.80, price:  9.98, base:  9.98, total:  1996 },
    { ticker: 'HGLG11', name: 'CSHG Logística',  qty:  50, avgPrice:160.00, price:162.50, base:162.50, total:  8125 },
    { ticker: 'XPML11', name: 'XP Malls',        qty: 100, avgPrice: 95.00, price: 96.40, base: 96.40, total:  9640 },
  ],
  crypto: [
    { ticker: 'BTC', name: 'Bitcoin',   qty: 0.12, avgPrice: 280000, price: 580000, base: 580000, total: 69600 },
    { ticker: 'ETH', name: 'Ethereum',  qty:  1.5, avgPrice:  12000, price:  16800, base:  16800, total: 25200 },
  ],
};

let currentTab = 'acoes';

function initStocksPage() {
  renderStocks('acoes');
  initMiniCharts();
  if (!window._alocacaoChart) {
    const ctx = document.getElementById('alocacaoChart').getContext('2d');
    window._alocacaoChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ações', 'FIIs', 'Crypto', 'Renda Fixa'],
        datasets: [{
          data: [33420, 21070, 69886, 160374],
          backgroundColor: ['#6366f1','#10b981','#f59e0b','#8b5cf6'],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: { ...doughnutOptions(), cutout: '65%' },
    });
  }
}

function renderStocks(tab) {
  currentTab = tab;
  const data = stocksData[tab];
  const body = document.getElementById('stocksBody');
  const query = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  body.innerHTML = data.map(s => {
    const rentab = ((s.price - s.avgPrice) / s.avgPrice * 100);
    const rentabClass = rentab >= 0 ? 'positive' : 'negative';
    const rentabSign = rentab >= 0 ? '+' : '';
    const prevP = _prevRow[s.ticker];
    const tickCls = prevP !== undefined && prevP !== s.price ? (s.price > prevP ? 'tick-up' : 'tick-down') : '';
    _prevRow[s.ticker] = s.price;
    const hidden = query && !`${s.ticker} ${s.name}`.toLowerCase().includes(query) ? ' style="display:none"' : '';
    return `
    <tr${hidden}>
      <td>
        <div class="asset-name">${s.ticker}${s.live ? ' <span class="live-tag">●</span>' : ''}</div>
        <div class="asset-desc">${s.name}</div>
      </td>
      <td>${s.qty.toLocaleString('pt-BR')}</td>
      <td>R$ ${s.avgPrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
      <td class="${tickCls}">R$ ${s.price.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td class="${rentabClass}">${rentabSign}${rentab.toFixed(2)}%</td>
      <td>R$ ${s.total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td><span class="tag ${rentab >= 0 ? 'green' : 'red'}">${rentabSign}${rentab.toFixed(1)}%</span></td>
    </tr>`;
  }).join('');
}

function switchTab(el, tab) {
  document.querySelectorAll('.tab-group .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderStocks(tab);
}

function initMiniCharts() {
  if (window._miniCharts) return;
  window._miniCharts = {};
  const configs = [
    { key: 'ibov', id: 'ibovChart', data: [124000, 125200, 123800, 126100, 127400, 128450], color: '#10b981' },
    { key: 'ifix', id: 'ifixChart', data: [3180, 3195, 3188, 3202, 3210, 3218], color: '#6366f1' },
    { key: 'btc', id: 'btcChart', data: [365000, 358000, 360000, 355000, 350000, 352140], color: '#ef4444' },
    { key: 'usd', id: 'usdChart', data: [5.75, 5.78, 5.76, 5.80, 5.81, 5.82], color: '#10b981' },
  ];
  configs.forEach(({ key, id, data, color }) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    window._miniCharts[key] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{ data: [...data], borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      },
    });
  });
}

// stock search filter (aplicado no render, pois a tabela re-renderiza a cada tick)
document.getElementById('stockSearch')?.addEventListener('input', () => renderStocks(currentTab));

// ══════════════════════════════════════════════
//  LIVE MARKET ENGINE — tempo real
//  · Cripto: CoinGecko (real, sem chave)
//  · Câmbio: AwesomeAPI (real, sem chave)
//  · B3: brapi.dev (real, com token gratuito) ou simulação
// ══════════════════════════════════════════════
const liveState = { lastUpdate: null, started: false };
const _prevRow = {};
const _prevCard = {};

const marketIndices = {
  // val = preço atual, base = âncora para o simulador mean-reverting
  ibov: { val: 134800, base: 134800, chg:  0.42, live: false, fmt: v => Math.round(v).toLocaleString('pt-BR') },
  ifix: { val:   3312, base:   3312, chg:  0.18, live: false, fmt: v => Math.round(v).toLocaleString('pt-BR') },
  btc:  { val:  580000, base: 580000, chg: -1.20, live: false, fmt: v => 'R$ ' + Math.round(v).toLocaleString('pt-BR') },
  usd:  { val:   5.76, base:   5.76, chg:  0.12, live: false, fmt: v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
};

// Ornstein-Uhlenbeck: oscila em torno de 'base' com reversão à média.
// theta = força de reversão (0.08 ≈ volta ~8% em direção ao base a cada tick)
// sigma = volatilidade por tick
function ouWalk(val, base, theta, sigma) {
  const drift = theta * (base - val);
  const noise = base * sigma * (Math.random() - 0.5) * 2;
  return val + drift + noise;
}

function touchUpdate() { liveState.lastUpdate = Date.now(); }

async function fetchCrypto() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (d.bitcoin?.brl) {
      marketIndices.btc.val  = d.bitcoin.brl;
      marketIndices.btc.base = d.bitcoin.brl;
      if (typeof d.bitcoin.brl_24h_change === 'number') marketIndices.btc.chg = d.bitcoin.brl_24h_change;
      marketIndices.btc.live = true;
      const btc = stocksData.crypto.find(c => c.ticker === 'BTC');
      if (btc) { btc.price = d.bitcoin.brl; btc.base = d.bitcoin.brl; btc.total = btc.qty * btc.price; btc.live = true; }
    }
    if (d.ethereum?.brl) {
      const eth = stocksData.crypto.find(c => c.ticker === 'ETH');
      if (eth) { eth.price = d.ethereum.brl; eth.base = d.ethereum.brl; eth.total = eth.qty * eth.price; eth.live = true; }
    }
    touchUpdate();
  } catch (e) { /* sem rede/limite — simulação continua */ }
  setSourceLabel();
}

async function fetchUsd() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (d.USDBRL?.bid) {
      marketIndices.usd.val = parseFloat(d.USDBRL.bid);
      marketIndices.usd.chg = parseFloat(d.USDBRL.pctChange) || 0;
      marketIndices.usd.live = true;
      touchUpdate();
    }
  } catch (e) { /* fallback simulação */ }
  setSourceLabel();
}

// Aplica resultado brapi (token ou público) nos ativos
function applyB3Results(results) {
  let updated = 0;
  (results || []).forEach(res => {
    if (!res.regularMarketPrice) return;
    if (res.symbol === '^BVSP' || res.symbol === 'BVSP') {
      marketIndices.ibov.val  = res.regularMarketPrice;
      marketIndices.ibov.base = res.regularMarketPrice;
      if (typeof res.regularMarketChangePercent === 'number') marketIndices.ibov.chg = res.regularMarketChangePercent;
      marketIndices.ibov.live = true;
      updated++;
      return;
    }
    ['acoes', 'fiis'].forEach(cat => {
      const a = stocksData[cat].find(s => s.ticker === res.symbol);
      if (a) {
        a.price = res.regularMarketPrice;
        a.base  = res.regularMarketPrice;
        a.total = a.qty * a.price;
        a.live  = true;
        updated++;
      }
    });
  });
  if (updated > 0) touchUpdate();
  return updated;
}

// Tenta Yahoo Finance via proxy CORS público (sem cadastro)
async function fetchYahooViaProxy(ticker) {
  const symbol = ticker === '^BVSP' ? '%5EBVSP' : `${ticker}.SA`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  ];
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const raw = await r.json();
      // allorigins envolve em { contents: "..." }
      const text = raw.contents !== undefined ? raw.contents : JSON.stringify(raw);
      const d = typeof text === 'string' ? JSON.parse(text) : text;
      const meta = d?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      return {
        symbol: ticker,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketChangePercent: meta.regularMarketPrice && meta.chartPreviousClose
          ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
          : 0,
      };
    } catch (e) { /* tenta o próximo proxy */ }
  }
  return null;
}

// Busca B3 sem precisar de token: tenta brapi público → Yahoo Finance via proxy
async function fetchB3() {
  const token = localStorage.getItem('brapiToken');
  const tickers = ['ITSA4', 'PETR4', 'VALE3', 'BBAS3', 'WEGE3', 'MXRF11', 'HGLG11', 'XPML11', '^BVSP'];

  // 1) brapi.dev com token (prioridade máxima)
  if (token) {
    try {
      const r = await fetch(
        `https://brapi.dev/api/quote/${tickers.join(',')}?token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) {
        const d = await r.json();
        const n = applyB3Results(d.results);
        if (n > 0) { setSourceLabel(); return; }
      }
    } catch (e) { /* cai para próxima fonte */ }
  }

  // 2) brapi.dev SEM token (tier público — funciona com limite de requisições)
  try {
    const r = await fetch(
      `https://brapi.dev/api/quote/${tickers.join(',')}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (r.ok) {
      const d = await r.json();
      const n = applyB3Results(d.results);
      if (n > 0) { setSourceLabel(); return; }
    }
  } catch (e) { /* cai para próxima fonte */ }

  // 3) Yahoo Finance via proxy CORS — busca individualmente (mais lento mas sem cadastro)
  let yahooBatch = 0;
  for (const ticker of tickers) {
    try {
      const res = await fetchYahooViaProxy(ticker);
      if (res) { applyB3Results([res]); yahooBatch++; }
    } catch (e) { /* continua */ }
  }
  if (yahooBatch > 0) { setSourceLabel(); return; }

  // 4) nenhuma fonte funcionou → simulação OU notifica que mercado está fechado
  setSourceLabel();
}

function configureBrapi() {
  const cur = localStorage.getItem('brapiToken') || '';
  const t = prompt(
    'Token brapi.dev (opcional — melhora a estabilidade das cotações):\n\n' +
    '1. Crie uma conta gratuita em https://brapi.dev\n' +
    '2. Copie seu token e cole abaixo\n\n' +
    'Obs: sem token o app já tenta buscar cotações reais automaticamente.\n' +
    '(deixe vazio para remover o token salvo)', cur
  );
  if (t === null) return;
  if (t.trim()) {
    localStorage.setItem('brapiToken', t.trim());
    showToast('Token salvo! Buscando cotações…', 'success');
  } else {
    localStorage.removeItem('brapiToken');
    showToast('Token removido');
  }
  fetchB3();
}

function simTick() {
  // Ornstein-Uhlenbeck: oscila em torno do preço BASE real, não deriva
  if (!marketIndices.ibov.live) marketIndices.ibov.val = ouWalk(marketIndices.ibov.val, marketIndices.ibov.base, 0.05, 0.0008);
  if (!marketIndices.ifix.live) marketIndices.ifix.val = ouWalk(marketIndices.ifix.val, marketIndices.ifix.base, 0.05, 0.0006);
  if (!marketIndices.btc.live)  marketIndices.btc.val  = ouWalk(marketIndices.btc.val,  marketIndices.btc.base,  0.04, 0.003);
  if (!marketIndices.usd.live)  marketIndices.usd.val  = ouWalk(marketIndices.usd.val,  marketIndices.usd.base,  0.06, 0.0008);

  ['acoes', 'fiis'].forEach(cat => stocksData[cat].forEach(s => {
    if (!s.live) {
      s.price = ouWalk(s.price, s.base, 0.06, 0.0012);
      s.price = Math.max(s.base * 0.85, Math.min(s.base * 1.15, s.price)); // ±15% de limite
      s.total = s.qty * s.price;
    }
  }));
  stocksData.crypto.forEach(s => {
    if (!s.live) {
      s.price = ouWalk(s.price, s.base, 0.04, 0.003);
      s.price = Math.max(s.base * 0.80, Math.min(s.base * 1.20, s.price));
      s.total = s.qty * s.price;
    }
  });
  touchUpdate();
  renderLive();
}

function renderLive() {
  Object.entries(marketIndices).forEach(([key, m]) => {
    const valEl = document.getElementById('mcVal-' + key);
    const chgEl = document.getElementById('mcChg-' + key);
    if (!valEl) return;
    const prev = _prevCard[key];
    valEl.textContent = m.fmt(m.val);
    chgEl.textContent = (m.chg >= 0 ? '+' : '') + m.chg.toFixed(2).replace('.', ',') + '%';
    chgEl.className = 'mc-chg ' + (m.chg >= 0 ? 'positive' : 'negative');
    if (prev !== undefined && prev !== m.val) {
      flashEl(valEl.closest('.market-card'), m.val > prev ? 'tick-up' : 'tick-down');
    }
    _prevCard[key] = m.val;
    const chart = window._miniCharts?.[key];
    if (chart) {
      const ds = chart.data.datasets[0];
      ds.data.push(m.val);
      chart.data.labels.push(chart.data.labels.length);
      if (ds.data.length > 40) { ds.data.shift(); chart.data.labels.shift(); }
      ds.borderColor = m.chg >= 0 ? '#10b981' : '#ef4444';
      chart.update('none');
    }
  });
  const stocksPage = document.getElementById('stocks');
  if (stocksPage?.classList.contains('active')) renderStocks(currentTab);
}

function flashEl(el, cls) {
  if (!el) return;
  el.classList.remove('tick-up', 'tick-down');
  void el.offsetWidth; // reinicia a animação
  el.classList.add(cls);
}

function updateLiveLabel() {
  const el = document.getElementById('liveUpdated');
  if (!el || !liveState.lastUpdate) return;
  const s = Math.max(0, Math.round((Date.now() - liveState.lastUpdate) / 1000));
  el.textContent = s <= 1 ? 'atualizado agora' : `atualizado há ${s}s`;
}

function setSourceLabel() {
  const el = document.getElementById('liveSource');
  if (!el) return;
  const b3Live   = marketIndices.ibov.live || stocksData.acoes.some(s => s.live);
  const liveCount = [...stocksData.acoes, ...stocksData.fiis].filter(s => s.live).length;
  const parts = [
    marketIndices.btc.live ? '🟢 Cripto: ao vivo'     : '🟡 Cripto: simulado',
    marketIndices.usd.live ? '🟢 Câmbio: ao vivo'     : '🟡 Câmbio: simulado',
    b3Live
      ? `🟢 B3: ${liveCount} ativos ao vivo`
      : '🟡 B3: buscando cotações reais… (simulado enquanto aguarda)',
  ];
  el.textContent = parts.join('   ');

  // botão de configuração: muda texto conforme estado
  const btn = document.getElementById('brapiBtn');
  if (btn) btn.textContent = b3Live ? '🔌 B3 conectada' : '🔌 Conectar B3 real';
}

function startLiveMarket() {
  if (liveState.started) return;
  liveState.started = true;
  fetchCrypto(); fetchUsd(); fetchB3();
  setInterval(fetchCrypto, 30000);
  setInterval(fetchUsd, 30000);
  setInterval(fetchB3, 60000);
  setInterval(simTick, 4000);
  setInterval(updateLiveLabel, 1000);
}

// ══════════════════════════════════════════════
//  CALCULATOR
// ══════════════════════════════════════════════
let calcChart;

function calcInvestment() {
  const principal = parseFloat(document.getElementById('calcPrincipal').value) || 0;
  const monthly = parseFloat(document.getElementById('calcMonthly').value) || 0;
  const annualRate = parseFloat(document.getElementById('calcRate').value) || 0;
  const years = parseInt(document.getElementById('calcYears').value) || 1;
  const irRate = parseFloat(document.getElementById('calcIR').value) || 0;

  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;

  const labels = [];
  const totalValues = [];
  const investedValues = [];
  let balance = principal;
  let totalInvested = principal;

  const tableBody = document.getElementById('calcTableBody');
  tableBody.innerHTML = '';

  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthly;
        totalInvested += monthly;
      }
    }
    labels.push(`Ano ${y}`);
    totalValues.push(Math.round(balance));
    investedValues.push(Math.round(totalInvested));

    if (y > 0) {
      const interest = balance - totalInvested;
      const irDeduction = interest * irRate;
      const netBalance = balance - irDeduction;
      tableBody.innerHTML += `
        <tr>
          <td>${y}</td>
          <td>R$ ${totalInvested.toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0})}</td>
          <td>R$ ${Math.round(interest).toLocaleString('pt-BR', {minimumFractionDigits:0})}</td>
          <td>R$ ${Math.round(netBalance).toLocaleString('pt-BR', {minimumFractionDigits:0})}</td>
          <td class="positive">+${(((netBalance/totalInvested)-1)*100).toFixed(1)}%</td>
        </tr>`;
    }
  }

  const totalInterest = balance - totalInvested;
  const netBalance = balance - (totalInterest * irRate);

  document.getElementById('rk-final').textContent = `R$ ${Math.round(netBalance).toLocaleString('pt-BR')}`;
  document.getElementById('rk-invested').textContent = `R$ ${Math.round(totalInvested).toLocaleString('pt-BR')}`;
  document.getElementById('rk-interest').textContent = `R$ ${Math.round(totalInterest * (1 - irRate)).toLocaleString('pt-BR')}`;
  document.getElementById('rk-return').textContent = `+${(((netBalance / totalInvested) - 1) * 100).toFixed(1)}%`;

  if (calcChart) calcChart.destroy();
  const ctx = document.getElementById('calcChart').getContext('2d');
  calcChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Investido',
          data: investedValues,
          backgroundColor: 'rgba(99,102,241,0.6)',
          borderRadius: 4,
          stack: 'stack',
        },
        {
          label: 'Juros',
          data: totalValues.map((v, i) => Math.max(0, v - investedValues[i])),
          backgroundColor: 'rgba(16,185,129,0.7)',
          borderRadius: 4,
          stack: 'stack',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 10, boxHeight: 10 },
        },
        tooltip: {
          backgroundColor: 'rgba(15,15,36,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => ` R$ ${ctx.parsed.y.toLocaleString('pt-BR', {maximumFractionDigits:0})}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', font: { size: 11 } },
          border: { color: 'transparent' },
          stacked: true,
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            callback: v => 'R$ ' + (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : (v/1000).toFixed(0)+'k'),
          },
          border: { color: 'transparent' },
          stacked: true,
        },
      },
    },
  });
}

calcInvestment();

// ══════════════════════════════════════════════
//  PROFILE TABS
// ══════════════════════════════════════════════
document.querySelectorAll('.psn-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.psn-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
  });
});

document.querySelectorAll('.ip-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.ip-card').forEach(c => {
      c.classList.remove('active');
      c.querySelector('.ip-current')?.remove();
    });
    card.classList.add('active');
    const badge = document.createElement('div');
    badge.className = 'ip-current';
    badge.textContent = 'Perfil atual';
    card.appendChild(badge);
  });
});

function updateRange() {
  ['rf','rv','fii','int'].forEach(k => {
    const val = document.getElementById(`${k}Range`).value;
    document.getElementById(`${k}Val`).textContent = val + '%';
  });
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Profile — personal data
document.getElementById('savePersonal')?.addEventListener('click', () => {
  const data = {
    name:   document.getElementById('pfName').value.trim(),
    email:  document.getElementById('pfEmail').value.trim(),
    cpf:    document.getElementById('pfCpf').value.trim(),
    phone:  document.getElementById('pfPhone').value.trim(),
    birth:  document.getElementById('pfBirth').value,
    job:    document.getElementById('pfJob').value.trim(),
    income: document.getElementById('pfIncome').value,
  };
  saveStore({ profile: data });
  cloudSave('profile', data);
  refreshProfileUI(data);
  showToast('Perfil salvo na nuvem!', 'success');
});

// Profile — investor profile
document.getElementById('saveInvestor')?.addEventListener('click', () => {
  const investor = {
    profile: document.querySelector('.ip-card.active')?.dataset.profile || 'moderado',
    alloc: {
      rf:  document.getElementById('rfRange').value,
      rv:  document.getElementById('rvRange').value,
      fii: document.getElementById('fiiRange').value,
      int: document.getElementById('intRange').value,
    },
  };
  saveStore({ investor });
  cloudSave('investor', investor);
  showToast('Perfil de investidor salvo na nuvem!', 'success');
});

function refreshProfileUI(data) {
  if (!data) return;
  const name = data.name || 'Usuário';
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';
  const greet = document.getElementById('dashGreeting');
  if (greet) greet.textContent = `Bom dia, ${name.split(' ')[0]}! 👋`;
  ['pfAvatarBig','pfAvatarBig'].forEach(() => {});
  const big = document.getElementById('pfAvatarBig');
  const dn  = document.getElementById('pfDisplayName');
  const ua  = document.querySelector('.user-avatar');
  const un  = document.querySelector('.user-name');
  if (big) big.textContent = initials;
  if (dn)  dn.textContent  = name;
  if (ua)  ua.textContent  = initials;
  if (un)  un.textContent  = name;
  const map = { pfName:'name', pfEmail:'email', pfCpf:'cpf', pfPhone:'phone', pfBirth:'birth', pfJob:'job', pfIncome:'income' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && data[key] !== undefined) el.value = data[key];
  });
}

function restoreInvestorUI(investor) {
  if (!investor) return;
  document.querySelectorAll('.ip-card').forEach(c => { c.classList.remove('active'); c.querySelector('.ip-current')?.remove(); });
  const active = document.querySelector(`.ip-card[data-profile="${investor.profile}"]`);
  if (active) {
    active.classList.add('active');
    const b = document.createElement('div');
    b.className = 'ip-current'; b.textContent = 'Perfil atual';
    active.appendChild(b);
  }
  if (investor.alloc) {
    ['rf','rv','fii','int'].forEach(k => {
      const r = document.getElementById(`${k}Range`);
      const v = document.getElementById(`${k}Val`);
      if (r && investor.alloc[k] !== undefined) { r.value = investor.alloc[k]; if (v) v.textContent = investor.alloc[k] + '%'; }
    });
  }
}

refreshProfileUI(_store.profile);
restoreInvestorUI(_store.investor);

// Notification + security toggles — save state
document.querySelectorAll('.notif-item .toggle-wrap, .so-row .toggle-wrap').forEach((tw, i) => {
  const key = `toggle_${i}`;
  if (_store[key] === 'on')  tw.classList.add('on');
  if (_store[key] === 'off') tw.classList.remove('on');
  tw.addEventListener('click', () => {
    saveStore({ [key]: tw.classList.contains('on') ? 'on' : 'off' });
    const snap = Object.fromEntries(
      [...document.querySelectorAll('.notif-item .toggle-wrap, .so-row .toggle-wrap')]
        .map((t, j) => [`toggle_${j}`, t.classList.contains('on') ? 'on' : 'off'])
    );
    cloudSave('toggles', snap);
  });
});

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => {
    if (e.target === bd) bd.classList.remove('open');
  });
});

// Start live market engine
startLiveMarket();

// ══════════════════════════════════════════════
//  FIREBASE CLOUD SYNC
//  Usa Firebase Realtime Database (plano Spark
//  gratuito). Cada usuário acessa /users/{uid}/.
//  Configuração via botão "☁ Nuvem" no topo.
// ══════════════════════════════════════════════
let _db = null;     // firebase database ref
let _uid = null;    // user id (anônimo ou email/senha)
let _syncTimer = null;

const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
const FB_DB  = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';
const FB_AUTH= 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function initFirebase(config) {
  try {
    await loadScript(FB_SDK);
    await loadScript(FB_DB);
    await loadScript(FB_AUTH);
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth();
    // login anônimo — nenhum dado pessoal necessário
    let user = auth.currentUser;
    if (!user) {
      const cred = await auth.signInAnonymously();
      user = cred.user;
    }
    _uid = user.uid;
    _db = firebase.database();
    saveStore({ fbConfig: config, fbUid: _uid });
    cloudPull(); // carrega dados salvos na nuvem
    setCloudStatus('online');
    showToast('Nuvem conectada! Dados sincronizando…', 'success');
  } catch (e) {
    setCloudStatus('error');
    showToast('Erro ao conectar: ' + e.message, 'error');
    console.error('Firebase init error:', e);
  }
}

function cloudRef(path) {
  if (!_db || !_uid) return null;
  return _db.ref(`users/${_uid}/${path}`);
}

function cloudSave(path, data) {
  const ref = cloudRef(path);
  if (!ref) return;
  ref.set(data).catch(e => console.warn('cloudSave error:', e));
}

function cloudPull() {
  if (!_db || !_uid) return;
  const ref = _db.ref(`users/${_uid}`);
  ref.once('value').then(snap => {
    const remote = snap.val();
    if (!remote) return;
    // metas
    if (Array.isArray(remote.goals)) {
      goals = remote.goals;
      saveStore({ goals });
      renderGoals();
    }
    // orçamentos
    if (Array.isArray(remote.budgets)) {
      budgets = remote.budgets;
      saveStore({ budgets });
      renderBudgets();
    }
    // perfil
    if (remote.profile) {
      saveStore({ profile: remote.profile });
      refreshProfileUI(remote.profile);
    }
    if (remote.investor) {
      saveStore({ investor: remote.investor });
      restoreInvestorUI(remote.investor);
    }
    showToast('Dados sincronizados da nuvem!', 'success');
  }).catch(e => console.warn('cloudPull error:', e));
}

// sincronização em tempo real: escuta mudanças remotas (multi-dispositivo)
function cloudListen() {
  if (!_db || !_uid) return;
  _db.ref(`users/${_uid}/goals`).on('value', snap => {
    const v = snap.val();
    if (Array.isArray(v)) { goals = v; saveStore({ goals }); renderGoals(); }
  });
  _db.ref(`users/${_uid}/budgets`).on('value', snap => {
    const v = snap.val();
    if (Array.isArray(v)) { budgets = v; saveStore({ budgets }); renderBudgets(); }
  });
}

function setCloudStatus(status) {
  const btn = document.getElementById('cloudBtn');
  if (!btn) return;
  const map = {
    offline: { text: '☁ Nuvem', cls: '' },
    online:  { text: '✅ Nuvem', cls: 'cloud-online' },
    error:   { text: '❌ Nuvem', cls: 'cloud-error' },
  };
  const s = map[status] || map.offline;
  btn.textContent = s.text;
  btn.className = 'btn-sm ' + s.cls;
}

function openCloudModal() {
  const cfg = _store.fbConfig;
  if (cfg) {
    document.getElementById('fbConfigInput').value = JSON.stringify(cfg, null, 2);
  }
  const msg = document.getElementById('cloudStatusMsg');
  if (_db && _uid) {
    msg.textContent = `✅ Conectado (UID: ${_uid.slice(0, 8)}…)`; msg.className = 'cloud-status-msg ok';
  } else {
    msg.textContent = 'Não conectado — dados salvos apenas localmente.'; msg.className = 'cloud-status-msg';
  }
  document.getElementById('cloudModal').classList.add('open');
}

async function connectCloud() {
  const raw = document.getElementById('fbConfigInput').value.trim();
  const msg = document.getElementById('cloudStatusMsg');
  if (!raw) { msg.textContent = 'Cole o firebaseConfig acima.'; msg.className = 'cloud-status-msg err'; return; }
  let cfg;
  try { cfg = JSON.parse(raw); } catch (e) {
    msg.textContent = 'JSON inválido — verifique o formato.'; msg.className = 'cloud-status-msg err'; return;
  }
  if (!cfg.databaseURL) {
    msg.textContent = 'databaseURL não encontrado. Confira o passo 2.'; msg.className = 'cloud-status-msg err'; return;
  }
  msg.textContent = 'Conectando…'; msg.className = 'cloud-status-msg';
  await initFirebase(cfg);
  cloudListen();
  const ok = !!_db;
  msg.textContent = ok ? `✅ Conectado com sucesso! UID: ${_uid?.slice(0, 8)}…` : '❌ Falha ao conectar.';
  msg.className = 'cloud-status-msg ' + (ok ? 'ok' : 'err');
}

function cloudDisconnect() {
  _db = null; _uid = null;
  saveStore({ fbConfig: null, fbUid: null });
  setCloudStatus('offline');
  closeModal('cloudModal');
  showToast('Nuvem desconectada — dados salvos localmente');
}

// Data dinâmica na topbar
(function() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  const d = new Date();
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  el.textContent = `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
})();

// Tenta reconectar com config salva ao abrir o app
const _savedCfg = _store.fbConfig;
if (_savedCfg?.databaseURL) {
  setTimeout(async () => {
    await initFirebase(_savedCfg);
    if (_db) cloudListen();
  }, 800);
}
