
// ══════════════════════════════════════════════
//  THEME — claro/escuro (persistido)
// ══════════════════════════════════════════════
if (typeof window.toggleTheme !== 'function') {
  (function initTheme() {
    const saved = localStorage.getItem('financeos-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  })();
  window.toggleTheme = function () {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('financeos-theme', next);
  };
}

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
//  SVG ICON MAPS
// ══════════════════════════════════════════════
const GOAL_ICONS = {
  travel:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  home:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  savings:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  car:       `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  education: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  wedding:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  tech:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  other:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
};

const BUDGET_ICONS = {
  food:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
  home:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  transport: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  leisure:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  health:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  education: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  clothing:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20.38 3.46 16 2 12 8 8 2 3.62 3.46"/><path d="M3.62 3.46 2 16l10 2 10-2-1.62-12.54"/></svg>`,
  utilities: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

function goalIconSvg(iconKey) {
  return GOAL_ICONS[iconKey] || GOAL_ICONS.other;
}
function budgetIconSvg(iconKey) {
  return BUDGET_ICONS[iconKey] || BUDGET_ICONS.food;
}

// ── Carrega dados do usuário logado na UI ──
(function applySession() {
  const user = _store.user;
  if (!user) return;
  const name = user.name || user.email?.split('@')[0] || 'Usuário';
  const initials = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'U';
  const greet = document.getElementById('dashGreeting');
  if (greet) {
    const hr = new Date().getHours();
    const saudacao = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    greet.textContent = `${saudacao}, ${name.split(' ')[0]}!`;
  }
  const ua = document.querySelector('.user-avatar');
  const un = document.querySelector('.user-name');
  if (ua) ua.textContent = initials;
  if (un) un.textContent = name;
  // popula campos de perfil se ainda não foram salvos
  if (!_store.profile) {
    saveStore({ profile: { name, email: user.email || '' } });
  }
  // aplica foto salva
  if (_store.profile?.photo) {
    const photoStyle = `background-image:url(${_store.profile.photo});background-size:cover;background-position:center;`;
    const bigEl = document.getElementById('pfAvatarBig');
    if (bigEl) { bigEl.textContent = ''; bigEl.setAttribute('style', photoStyle); }
    if (ua)    { ua.textContent = ''; ua.setAttribute('style', photoStyle); }
  }
})();

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
const pageTitles = {
  dashboard: 'Dashboard',
  goals: 'Metas Financeiras',
  budgets: 'Orçamentos',
  stocks: 'Bolsa de Valores',
  calculator: 'Calculadora de Juros',
  assistant: 'Assistente IA',
  cashflow: 'Fluxo de Caixa Projetado',
  health: 'Saúde Financeira',
  crisis: 'Modo Crise',
  subs: 'Assinaturas & Recorrentes',
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
  if (page === 'assistant') initAssistant();
  if (page === 'cashflow') { renderPlan(); cfSetDefaultMonths(); }
  if (page === 'health') { renderHealthScore(); renderLifeHours(); renderHealthTips(); }
  if (page === 'crisis') renderCrisis();
  if (page === 'subs') renderSubs();
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

// ── KPIs do dashboard calculados a partir dos SEUS dados ──
// Patrimônio = carteira de investimentos; Renda = perfil; Gastos = orçamentos.
function updateDashKpis() {
  const fmtBRL = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const tot = (typeof portfolioTotals === 'function') ? portfolioTotals() : { all: 0 };
  const income = parseFloat(_store.profile?.income) || 0;
  const spent  = (typeof budgets !== 'undefined' ? budgets : []).reduce((s, b) => s + b.spent, 0);
  const savings = Math.max(0, income - spent);
  const cash = parseFloat(_store.profile?.cash) || 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('kpiPatrimonio', fmtBRL(tot.all));
  set('kpiCash',       fmtBRL(cash));
  set('kpiRenda',      fmtBRL(income));
  set('kpiGastos',     fmtBRL(spent));
  set('kpiEconomias',  fmtBRL(savings));

  const sub = document.getElementById('kpiEconomiasSub');
  if (sub) sub.textContent = income > 0 ? `Taxa de ${Math.round(savings / income * 100)}% da renda` : 'Defina sua renda no perfil';
  const pSub = document.getElementById('kpiPatrimonioSub');
  if (pSub) pSub.textContent = tot.all > 0 ? 'Valor da sua carteira' : 'Adicione ativos na Bolsa';
}

function editCash() {
  const cur = parseFloat(_store.profile?.cash) || 0;
  const val = prompt('Saldo de dinheiro líquido (conta corrente, poupança, carteira):\nR$', cur.toFixed(2));
  if (val === null) return;
  const v = parseFloat(String(val).replace(',', '.'));
  if (isNaN(v) || v < 0) { showToast('Valor inválido', 'error'); return; }
  const profile = { ...(_store.profile || {}), cash: v };
  saveStore({ profile });
  Object.assign(_store, { profile });
  cloudSave('profile', profile);
  updateDashKpis();
  showToast('Saldo atualizado!', 'success');
}

// ══════════════════════════════════════════════
//  TRANSACTIONS
// ══════════════════════════════════════════════
const TX_COLORS = {
  income:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981', tag: 'green' },
  expense:    { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', tag: 'red'   },
  investment: { bg: 'rgba(99,102,241,0.10)', color: '#6366f1', tag: 'indigo' },
};
const CAT_TYPE_MAP = {
  'Receita': 'income', 'Alimentação': 'expense', 'Moradia': 'expense',
  'Transporte': 'expense', 'Lazer': 'expense', 'Saúde': 'expense',
  'Educação': 'expense', 'Investimento': 'investment', 'Outro': 'expense',
};

const defaultTransactions = [
  { id: 1, desc: 'Salário',          category: 'Receita',      type: 'income',     value: 12800, date: '2026-06-05' },
  { id: 2, desc: 'Mercado',          category: 'Alimentação',  type: 'expense',    value: 480,   date: '2026-06-07' },
  { id: 3, desc: 'ITSA4 — Aporte',   category: 'Investimento', type: 'investment', value: 2000,  date: '2026-06-06' },
  { id: 4, desc: 'Aluguel',          category: 'Moradia',      type: 'expense',    value: 2200,  date: '2026-06-05' },
  { id: 5, desc: 'Netflix / Serviços', category: 'Lazer',      type: 'expense',    value: 89,    date: '2026-06-04' },
];
let transactions = Array.isArray(_store.transactions) ? _store.transactions : defaultTransactions;

function renderTransactions() {
  const body = document.getElementById('txBody');
  if (!body) return;
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  if (sorted.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:20px">Nenhuma transação ainda</td></tr>';
    return;
  }
  body.innerHTML = sorted.map(tx => {
    const c = TX_COLORS[tx.type] || TX_COLORS.expense;
    const init = tx.desc[0].toUpperCase();
    const sign = tx.type === 'income' ? '+' : '−';
    const cls  = tx.type === 'income' ? 'positive' : 'negative';
    const d = new Date(tx.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `<tr>
      <td><div class="tx-name"><div class="tx-icon" style="background:${c.bg};color:${c.color}">${init}</div>${tx.desc}</div></td>
      <td><span class="tag ${c.tag}">${tx.category}</span></td>
      <td>${dateStr}</td>
      <td class="${cls}">${sign}R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td><button class="btn-del-tx" onclick="deleteTx(${tx.id})" title="Excluir">✕</button></td>
    </tr>`;
  }).join('');
}

renderTransactions();

function openTxModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('txDate').value = today;
  document.getElementById('txModal').classList.add('open');
}

// Receita soma no dinheiro líquido; despesa/investimento subtrai.
function applyCashDelta(delta) {
  const cur = parseFloat(_store.profile?.cash) || 0;
  const profile = { ...(_store.profile || {}), cash: cur + delta };
  saveStore({ profile });
  Object.assign(_store, { profile });
  cloudSave('profile', profile);
}

function txCashDelta(tx) {
  return tx.type === 'income' ? tx.value : -tx.value;
}

function addTransaction() {
  const desc  = document.getElementById('txDesc').value.trim();
  const type  = document.getElementById('txType').value;
  const value = parseFloat(document.getElementById('txValue').value);
  const cat   = document.getElementById('txCategory').value;
  const date  = document.getElementById('txDate').value;
  if (!desc || !value || !date) { showToast('Preencha todos os campos', 'error'); return; }
  const tx = { id: Date.now(), desc, type, value, category: cat, date };
  transactions.unshift(tx);
  saveStore({ transactions });
  cloudSave('transactions', transactions);
  applyCashDelta(txCashDelta(tx));
  renderTransactions();
  updateDashKpis();
  closeModal('txModal');
  document.getElementById('txDesc').value = '';
  document.getElementById('txValue').value = '';
  const newCash = parseFloat(_store.profile?.cash) || 0;
  showToast(`Transação adicionada! Saldo: R$ ${newCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'success');
}

function deleteTx(id) {
  const tx = transactions.find(t => t.id === id);
  transactions = transactions.filter(t => t.id !== id);
  saveStore({ transactions });
  cloudSave('transactions', transactions);
  if (tx) applyCashDelta(-txCashDelta(tx)); // reverte o efeito no saldo
  renderTransactions();
  updateDashKpis();
}

function updateTxTypeColor() {
  const t = document.getElementById('txType').value;
  const catSel = document.getElementById('txCategory');
  const defaults = { income: 'Receita', expense: 'Alimentação', investment: 'Investimento' };
  if (defaults[t]) catSel.value = defaults[t];
}

// Init on load
initDashboardCharts();

// ══════════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════════
const defaultGoals = [
  { id: 1, name: 'Viagem para Europa',    icon: 'travel',    color: '#6366f1', target:  15000, current: 10200, deadline: '2026-12-01' },
  { id: 2, name: 'Casa Própria',          icon: 'home',      color: '#10b981', target: 150000, current: 48000, deadline: '2030-06-01' },
  { id: 3, name: 'Reserva de Emergência', icon: 'savings',   color: '#f59e0b', target:  50000, current: 50000, deadline: '2025-12-01' },
  { id: 4, name: 'Carro Novo',            icon: 'car',       color: '#8b5cf6', target:  80000, current: 12000, deadline: '2026-09-01' },
  { id: 5, name: 'MBA Internacional',     icon: 'education', color: '#ef4444', target:  30000, current: 30000, deadline: '2025-08-01' },
  { id: 6, name: 'Casamento',             icon: 'wedding',   color: '#06b6d4', target:  40000, current: 18000, deadline: '2027-04-01' },
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
          <div class="goal-icon-svg" style="--ic:${g.color}">${goalIconSvg(g.icon)}</div>
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
  { id: 1, name: 'Moradia',      icon: 'home',      color: '#6366f1', limit: 2500, spent: 2200 },
  { id: 2, name: 'Alimentação',  icon: 'food',      color: '#10b981', limit: 1500, spent: 1200 },
  { id: 3, name: 'Transporte',   icon: 'transport', color: '#f59e0b', limit: 1000, spent:  800 },
  { id: 4, name: 'Lazer',        icon: 'leisure',   color: '#ef4444', limit: 1200, spent:  984 },
  { id: 5, name: 'Saúde',        icon: 'health',    color: '#8b5cf6', limit:  600, spent:  200 },
  { id: 6, name: 'Educação',     icon: 'education', color: '#06b6d4', limit:  800, spent:   36 },
];
let budgets = Array.isArray(_store.budgets) ? _store.budgets : defaultBudgets;

function renderBudgets() {
  const list = document.getElementById('budgetsList');
  list.innerHTML = budgets.map(b => {
    const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
    const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : b.color;
    return `
    <div class="budget-item">
      <div class="budget-item-icon" style="--ic:${b.color}">${budgetIconSvg(b.icon)}</div>
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
// Catálogo de mercado: preços de referência. A POSIÇÃO do usuário
// (qty/avgPrice) vem de _store.holdings — conta nova começa ZERADA.
const stocksData = {
  acoes: [
    { ticker: 'ITSA4', name: 'Itaúsa',           price:  10.88, base:  10.88 },
    { ticker: 'PETR4', name: 'Petrobras',         price:  37.90, base:  37.90 },
    { ticker: 'VALE3', name: 'Vale',              price:  58.50, base:  58.50 },
    { ticker: 'BBAS3', name: 'Banco do Brasil',   price:  24.80, base:  24.80 },
    { ticker: 'WEGE3', name: 'WEG',               price:  50.20, base:  50.20 },
    { ticker: 'ITUB4', name: 'Itaú Unibanco',     price:  36.50, base:  36.50 },
    { ticker: 'BBDC4', name: 'Bradesco',          price:  16.50, base:  16.50 },
    { ticker: 'ABEV3', name: 'Ambev',             price:  13.20, base:  13.20 },
    { ticker: 'B3SA3', name: 'B3',                price:  13.50, base:  13.50 },
    { ticker: 'MGLU3', name: 'Magazine Luiza',    price:   9.80, base:   9.80 },
    { ticker: 'RENT3', name: 'Localiza',          price:  42.00, base:  42.00 },
    { ticker: 'PRIO3', name: 'PetroRio',          price:  44.00, base:  44.00 },
    { ticker: 'RADL3', name: 'Raia Drogasil',     price:  21.00, base:  21.00 },
    { ticker: 'SUZB3', name: 'Suzano',            price:  52.00, base:  52.00 },
    { ticker: 'EMBR3', name: 'Embraer',           price:  65.00, base:  65.00 },
  ],
  fiis: [
    { ticker: 'MXRF11', name: 'Maxi Renda',        price:   9.98, base:   9.98 },
    { ticker: 'HGLG11', name: 'CSHG Logística',    price: 162.50, base: 162.50 },
    { ticker: 'XPML11', name: 'XP Malls',          price:  96.40, base:  96.40 },
    { ticker: 'KNRI11', name: 'Kinea Renda Imob.', price: 145.00, base: 145.00 },
    { ticker: 'VISC11', name: 'Vinci Shopping',    price: 105.00, base: 105.00 },
    { ticker: 'BTLG11', name: 'BTG Logística',     price:  98.00, base:  98.00 },
    { ticker: 'HGRE11', name: 'CSHG Real Estate',  price: 120.00, base: 120.00 },
    { ticker: 'XPLG11', name: 'XP Log',            price: 102.00, base: 102.00 },
  ],
  crypto: [
    { ticker: 'BTC',  name: 'Bitcoin',    price: 580000, base: 580000 },
    { ticker: 'ETH',  name: 'Ethereum',   price:  16800, base:  16800 },
    { ticker: 'SOL',  name: 'Solana',     price:    950, base:    950 },
    { ticker: 'BNB',  name: 'BNB',        price:   3300, base:   3300 },
    { ticker: 'XRP',  name: 'XRP',        price:  12.50, base:  12.50 },
    { ticker: 'ADA',  name: 'Cardano',    price:   4.20, base:   4.20 },
    { ticker: 'DOGE', name: 'Dogecoin',   price:   1.10, base:   1.10 },
    { ticker: 'DOT',  name: 'Polkadot',   price:  38.00, base:  38.00 },
  ],
  acoes_us: [
    { ticker: 'AAPL',  name: 'Apple Inc.',        price: 211.00, base: 211.00, currency: 'USD' },
    { ticker: 'MSFT',  name: 'Microsoft Corp.',   price: 425.00, base: 425.00, currency: 'USD' },
    { ticker: 'NVDA',  name: 'NVIDIA Corp.',      price: 135.00, base: 135.00, currency: 'USD' },
    { ticker: 'AMZN',  name: 'Amazon.com Inc.',   price: 196.00, base: 196.00, currency: 'USD' },
    { ticker: 'TSLA',  name: 'Tesla Inc.',        price: 248.00, base: 248.00, currency: 'USD' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.',     price: 175.00, base: 175.00, currency: 'USD' },
    { ticker: 'META',  name: 'Meta Platforms',    price: 560.00, base: 560.00, currency: 'USD' },
    { ticker: 'NFLX',  name: 'Netflix Inc.',      price: 680.00, base: 680.00, currency: 'USD' },
    { ticker: 'AMD',   name: 'AMD Inc.',          price: 160.00, base: 160.00, currency: 'USD' },
    { ticker: 'JPM',   name: 'JPMorgan Chase',    price: 210.00, base: 210.00, currency: 'USD' },
  ],
};

// ── CARTEIRA DO USUÁRIO (editável, começa vazia) ──
let holdings = (_store.holdings && typeof _store.holdings === 'object') ? _store.holdings : {};

function applyHoldings() {
  Object.values(stocksData).forEach(list => list.forEach(s => {
    const h = holdings[s.ticker];
    s.qty      = h ? h.qty : 0;
    s.avgPrice = h ? h.avgPrice : 0;
    s.total    = s.qty * s.price;
  }));
}
applyHoldings();

function editHolding(ticker) {
  let asset = null;
  Object.values(stocksData).forEach(list => {
    const f = list.find(s => s.ticker === ticker);
    if (f) asset = f;
  });
  if (!asset) return;
  const cur = holdings[ticker] || { qty: 0, avgPrice: 0 };
  const qtyStr = prompt(`Quantidade de ${ticker} que você possui:\n(0 para remover da carteira)`, cur.qty || '');
  if (qtyStr === null) return;
  const qty = parseFloat(String(qtyStr).replace(',', '.'));
  if (isNaN(qty) || qty < 0) { showToast('Quantidade inválida', 'error'); return; }
  if (qty === 0) {
    delete holdings[ticker];
  } else {
    const priceStr = prompt(
      `Preço médio de compra de ${ticker} (${asset.currency === 'USD' ? 'US$' : 'R$'}):`,
      cur.avgPrice || asset.price.toFixed(2)
    );
    if (priceStr === null) return;
    const avgPrice = parseFloat(String(priceStr).replace(',', '.'));
    if (isNaN(avgPrice) || avgPrice <= 0) { showToast('Preço inválido', 'error'); return; }
    holdings[ticker] = { qty, avgPrice };
  }
  saveStore({ holdings });
  if (typeof cloudSave === 'function') cloudSave('holdings', holdings);
  applyHoldings();
  renderStocks(currentTab);
  updateAlocacaoChart();
  updateDashKpis();
  showToast(qty === 0 ? `${ticker} removido da carteira` : `${ticker}: posição salva!`, 'success');
}

function portfolioTotals() {
  const usd = marketIndices.usd?.val || 5.76;
  const tot = { acoes: 0, fiis: 0, crypto: 0, acoes_us: 0 };
  Object.entries(stocksData).forEach(([cat, list]) => list.forEach(s => {
    if (!s.qty) return;
    const v = s.qty * s.price * (s.currency === 'USD' ? usd : 1);
    tot[cat] += v;
  }));
  tot.all = tot.acoes + tot.fiis + tot.crypto + tot.acoes_us;
  return tot;
}

let currentTab = 'acoes';

function initStocksPage() {
  renderStocks('acoes');
  initMiniCharts();
  if (!window._alocacaoChart) {
    const ctx = document.getElementById('alocacaoChart').getContext('2d');
    window._alocacaoChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ações BR', 'FIIs', 'Crypto', 'Ações EUA'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#6366f1','#10b981','#f59e0b','#06b6d4'],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: { ...doughnutOptions(), cutout: '65%' },
    });
  }
  updateAlocacaoChart();
}

function updateAlocacaoChart() {
  const chart = window._alocacaoChart;
  if (!chart) return;
  const tot = portfolioTotals();
  chart.data.datasets[0].data = [tot.acoes, tot.fiis, tot.crypto, tot.acoes_us];
  chart.update('none');
  const card = document.querySelector('.portfolio-chart-card h3');
  if (card) {
    card.textContent = tot.all > 0
      ? `Alocação — R$ ${Math.round(tot.all).toLocaleString('pt-BR')}`
      : 'Alocação da Carteira (vazia)';
  }
}

function renderStocks(tab) {
  currentTab = tab;
  const data = stocksData[tab];
  const body = document.getElementById('stocksBody');
  const query = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  body.innerHTML = data.map(s => {
    const owned = s.qty > 0;
    const cur = s.currency === 'USD' ? 'US$' : 'R$';
    const rentab = owned && s.avgPrice > 0 ? ((s.price - s.avgPrice) / s.avgPrice * 100) : 0;
    const rentabClass = rentab >= 0 ? 'positive' : 'negative';
    const rentabSign = rentab >= 0 ? '+' : '';
    const prevP = _prevRow[s.ticker];
    const tickCls = prevP !== undefined && prevP !== s.price ? (s.price > prevP ? 'tick-up' : 'tick-down') : '';
    _prevRow[s.ticker] = s.price;
    const hidden = query && !`${s.ticker} ${s.name}`.toLowerCase().includes(query) ? ' style="display:none"' : '';
    return `
    <tr${hidden}${owned ? ' class="row-owned"' : ''}>
      <td>
        <div class="asset-name">${s.ticker}${s.live ? ' <span class="live-tag">●</span>' : ''}</div>
        <div class="asset-desc">${s.name}</div>
      </td>
      <td>${owned ? s.qty.toLocaleString('pt-BR') : '—'}</td>
      <td>${owned ? cur + ' ' + s.avgPrice.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '—'}</td>
      <td class="${tickCls}">${cur} ${s.price.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td class="${owned ? rentabClass : ''}">${owned ? rentabSign + rentab.toFixed(2) + '%' : '—'}</td>
      <td>${owned ? cur + ' ' + s.total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}</td>
      <td>
        <button class="btn-edit-holding" onclick="editHolding('${s.ticker}')" title="${owned ? 'Editar posição' : 'Adicionar à carteira'}">
          ${owned
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>'
            : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
        </button>
      </td>
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

const CRYPTO_IDS = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', polkadot: 'DOT',
};

async function fetchCrypto() {
  try {
    const ids = Object.keys(CRYPTO_IDS).join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    Object.entries(CRYPTO_IDS).forEach(([id, ticker]) => {
      const q = d[id];
      if (!q?.brl) return;
      const c = stocksData.crypto.find(x => x.ticker === ticker);
      if (c) { c.price = q.brl; c.base = q.brl; c.total = c.qty * c.price; c.live = true; }
      if (ticker === 'BTC') {
        marketIndices.btc.val  = q.brl;
        marketIndices.btc.base = q.brl;
        if (typeof q.brl_24h_change === 'number') marketIndices.btc.chg = q.brl_24h_change;
        marketIndices.btc.live = true;
      }
    });
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
  const tickers = [
    ...stocksData.acoes.map(s => s.ticker),
    ...stocksData.fiis.map(s => s.ticker),
    '^BVSP',
  ];

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

// Busca ações americanas via Yahoo Finance proxy
async function fetchUS() {
  const tickers = stocksData.acoes_us.map(s => s.ticker);
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      ];
      for (const proxy of proxies) {
        try {
          const r = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
          if (!r.ok) continue;
          const raw = await r.json();
          const text = raw.contents !== undefined ? raw.contents : JSON.stringify(raw);
          const d = typeof text === 'string' ? JSON.parse(text) : text;
          const meta = d?.chart?.result?.[0]?.meta;
          if (!meta?.regularMarketPrice) continue;
          const s = stocksData.acoes_us.find(x => x.ticker === ticker);
          if (s) {
            s.price = meta.regularMarketPrice;
            s.base  = meta.regularMarketPrice;
            s.total = s.qty * s.price;
            s.live  = true;
            s.chgPct = meta.chartPreviousClose
              ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
              : 0;
          }
          touchUpdate();
          break;
        } catch (e) { /* tenta próximo proxy */ }
      }
    } catch (e) { /* continua */ }
  }
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
  stocksData.acoes_us.forEach(s => {
    if (!s.live) {
      s.price = ouWalk(s.price, s.base, 0.06, 0.0015);
      s.price = Math.max(s.base * 0.85, Math.min(s.base * 1.15, s.price));
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
  if (stocksPage?.classList.contains('active')) { renderStocks(currentTab); updateAlocacaoChart(); }
  updateDashKpis();
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
  const dot = (live) => live ? '● ' : '○ ';
  const parts = [
    dot(marketIndices.btc.live) + (marketIndices.btc.live ? 'Cripto ao vivo'  : 'Cripto: simulado'),
    dot(marketIndices.usd.live) + (marketIndices.usd.live ? 'Câmbio ao vivo'  : 'Câmbio: simulado'),
    b3Live
      ? `● B3: ${liveCount} ativos ao vivo`
      : '○ B3: buscando cotações…',
  ];
  el.textContent = parts.join('   ·   ');

  const btn = document.getElementById('brapiBtn');
  if (btn) {
    const svgCloud = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    btn.innerHTML = svgCloud + (b3Live ? 'B3 conectada' : 'Conectar B3 real');
  }
}

function startLiveMarket() {
  if (liveState.started) return;
  liveState.started = true;
  fetchCrypto(); fetchUsd(); fetchB3(); fetchUS();
  setInterval(fetchCrypto, 30000);
  setInterval(fetchUsd, 30000);
  setInterval(fetchB3, 60000);
  setInterval(fetchUS, 45000);
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
  Object.assign(_store, { profile: data });
  cloudSave('profile', data);
  refreshProfileUI(data);
  updateDashKpis();
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

function applyAvatarPhoto(photo) {
  const big = document.getElementById('pfAvatarBig');
  const ua  = document.querySelector('.user-avatar');
  if (photo) {
    const style = `background-image:url(${photo});background-size:cover;background-position:center;`;
    if (big) { big.textContent = ''; big.setAttribute('style', style); }
    if (ua)  { ua.textContent  = ''; ua.setAttribute('style', `${ua.getAttribute('style') || ''};${style}`); }
  }
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const photo = ev.target.result;
    const profile = { ...(_store.profile || {}), photo };
    saveStore({ profile });
    Object.assign(_store, { profile });
    cloudSave('profile', profile);
    applyAvatarPhoto(photo);
    showToast('Foto atualizada!', 'success');
  };
  reader.readAsDataURL(file);
}

function refreshProfileUI(data) {
  if (!data) return;
  const name = data.name || 'Usuário';
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';
  const greet = document.getElementById('dashGreeting');
  if (greet) greet.textContent = `Bom dia, ${name.split(' ')[0]}!`;
  const big = document.getElementById('pfAvatarBig');
  const dn  = document.getElementById('pfDisplayName');
  const ua  = document.querySelector('.user-avatar');
  const un  = document.querySelector('.user-name');
  if (!data.photo) {
    if (big) big.textContent = initials;
    if (ua)  ua.textContent  = initials;
  } else {
    applyAvatarPhoto(data.photo);
  }
  if (dn)  dn.textContent  = name;
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

function doLogout() {
  if (!confirm('Deseja sair da sua conta?')) return;
  saveStore({ user: null });
  window.location.href = 'index.html';
}

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => {
    if (e.target === bd) bd.classList.remove('open');
  });
});

// Start live market engine
startLiveMarket();
updateDashKpis();

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
    // transações
    if (Array.isArray(remote.transactions)) {
      transactions = remote.transactions;
      saveStore({ transactions });
      renderTransactions();
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

// ══════════════════════════════════════════════
//  APP PARALLAX — mouse tracking + canvas
// ══════════════════════════════════════════════
(function initAppParallax() {
  const bg = document.getElementById('appParallaxBg');
  if (!bg) return;

  const orbs = [...bg.querySelectorAll('.app-orb')];
  const geos = [...bg.querySelectorAll('.app-geo')];

  let tx = 0, ty = 0;
  let sx = 0, sy = 0;

  document.addEventListener('mousemove', (e) => {
    const main = document.querySelector('.main-content');
    if (!main) return;
    const rect = main.getBoundingClientRect();
    tx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    ty = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
  }, { passive: true });

  // scroll-based parallax: orbs drift as the page scrolls
  let scrl = 0, sScrl = 0;
  window.addEventListener('scroll', () => { scrl = window.scrollY; }, { passive: true });

  // orb depths — larger index = closer = more movement
  const orbSpeeds = [22, 36, 15, 8, 42];
  const geoSpeeds = [10, 18, 6, 12, 7, 14, 16, 9, 11];
  const beams = [...bg.querySelectorAll('.app-beam')];
  const beamSpeeds = [6, -8];

  // Canvas particle layer
  const canvas = document.getElementById('appCanvas');
  let ctx2, particles2 = [];
  function initCanvas() {
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    new ResizeObserver(resize).observe(canvas);
    for (let i = 0; i < 35; i++) {
      particles2.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.8,
      });
    }
    ctx2 = canvas.getContext('2d');
  }
  initCanvas();

  // shooting stars (meteors) — occasional streaks
  const meteors = [];
  function maybeSpawnMeteor() {
    if (Math.random() < 0.004 && meteors.length < 2) {
      meteors.push({
        x: Math.random() * canvas.width * 0.8,
        y: Math.random() * canvas.height * 0.3,
        vx: 5 + Math.random() * 4,
        vy: 2.5 + Math.random() * 2,
        life: 1,
      });
    }
  }
  function drawMeteors() {
    maybeSpawnMeteor();
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= 0.012;
      if (m.life <= 0 || m.x > canvas.width || m.y > canvas.height) { meteors.splice(i, 1); continue; }
      const grad = ctx2.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
      grad.addColorStop(0, `rgba(199,210,254,${0.8 * m.life})`);
      grad.addColorStop(1, 'transparent');
      ctx2.beginPath();
      ctx2.strokeStyle = grad;
      ctx2.lineWidth = 1.6;
      ctx2.moveTo(m.x, m.y);
      ctx2.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
      ctx2.fillStyle = `rgba(255,255,255,${m.life})`;
      ctx2.fill();
    }
  }

  function drawParticles() {
    if (!ctx2) return;
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    drawMeteors();
    particles2.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    for (let i = 0; i < particles2.length; i++) {
      for (let j = i + 1; j < particles2.length; j++) {
        const dx = particles2[i].x - particles2[j].x;
        const dy = particles2[i].y - particles2[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          const alpha = (1 - dist / 130) * 0.10;
          ctx2.beginPath();
          ctx2.strokeStyle = `rgba(99,102,241,${alpha})`;
          ctx2.lineWidth = 0.8;
          ctx2.moveTo(particles2[i].x, particles2[i].y);
          ctx2.lineTo(particles2[j].x, particles2[j].y);
          ctx2.stroke();
        }
      }
    }
    particles2.forEach(p => {
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2.fillStyle = 'rgba(139,92,246,0.25)';
      ctx2.fill();
    });
  }

  // slow layer for deep orbs
  let sx2 = 0, sy2 = 0;

  // 3D tilt on KPI / market / goal / budget-overview cards — delegated so
  // dynamically rendered cards get the effect too
  const tiltSelector = '.kpi-card, .market-card, .goal-card, .bo-card';
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest?.(tiltSelector);
    if (!card) return;
    const r = card.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width  - 0.5;
    const cy = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${-cy * 10}deg) rotateY(${cx * 12}deg) translateY(-4px) scale(1.01)`;
    card.style.boxShadow = `0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(99,102,241,.18), ${cx * -10}px ${cy * -10}px 30px rgba(99,102,241,.08)`;
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest?.(tiltSelector);
    if (!card || card.contains(e.relatedTarget)) return;
    card.style.transform = '';
    card.style.boxShadow = '';
  }, { passive: true });

  // scroll speeds per orb (px of orb drift per px scrolled)
  const orbScrollSp = [0.08, -0.12, 0.05, -0.06, 0.15];
  const geoScrollSp = [0.10, -0.08, 0.04, 0.12, -0.10, 0.06, -0.09, 0.07, 0.05];

  // cursor spotlight on cards — radial highlight follows the mouse
  const spotSelectors = '.kpi-card, .chart-card, .table-card, .alerts-card, .goal-card, .bo-card, .stocks-table-wrap, .portfolio-chart-card, .calc-form-card, .calc-results-card, .profile-content, .budget-item, .market-card';
  function attachSpotlights() {
    document.querySelectorAll(spotSelectors).forEach(card => {
      if (card.querySelector(':scope > .card-spot')) return;
      const spot = document.createElement('div');
      spot.className = 'card-spot';
      card.appendChild(spot);
    });
  }
  attachSpotlights();
  // re-attach for cards rendered dynamically later
  setInterval(attachSpotlights, 3000);
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll(spotSelectors).forEach(card => {
      const r = card.getBoundingClientRect();
      if (e.clientX < r.left - 60 || e.clientX > r.right + 60 || e.clientY < r.top - 60 || e.clientY > r.bottom + 60) return;
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }, { passive: true });

  // subtle page-header drift with mouse (counter-motion for depth)
  const pageHeaders = document.querySelectorAll('.page-header');

  // scroll-reveal: cards rise into view with stagger
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('revealed');
      revealObs.unobserve(en.target);
      // drop the class after the transition so it can't slow later transforms (KPI tilt)
      setTimeout(() => en.target.classList.remove('reveal-up', 'revealed'), 700);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(spotSelectors).forEach((card, i) => {
    card.classList.add('reveal-up');
    card.style.transitionDelay = `${(i % 6) * 60}ms`;
    setTimeout(() => { card.style.transitionDelay = ''; }, 1500);
    revealObs.observe(card);
  });

  function loop() {
    sx  += (tx - sx)  * 0.05;
    sy  += (ty - sy)  * 0.05;
    sx2 += (tx - sx2) * 0.022;
    sy2 += (ty - sy2) * 0.022;
    sScrl += (scrl - sScrl) * 0.08;

    orbs.forEach((orb, i) => {
      const sp = orbSpeeds[i] || 20;
      // orbs 0,3 (deeper) use slow layer
      const lx = (i === 0 || i === 3) ? sx2 : sx;
      const ly = (i === 0 || i === 3) ? sy2 : sy;
      const sc = sScrl * (orbScrollSp[i] || 0.05);
      orb.style.transform = `translate(${lx * sp}px, ${ly * sp + sc}px)`;
    });

    geos.forEach((geo, i) => {
      const sp = geoSpeeds[i] || 10;
      const sc = sScrl * (geoScrollSp[i] || 0.05);
      geo.style.transform = `translate(${sx * sp}px, ${sy * sp + sc}px)`;
    });

    beams.forEach((beam, i) => {
      const sp = beamSpeeds[i] || 6;
      beam.style.translate = `${sx2 * sp}px ${sy2 * sp - sScrl * 0.04}px`;
    });

    pageHeaders.forEach(h => {
      h.style.transform = `translate(${sx * -4}px, ${sy * -2}px)`;
    });

    drawParticles();
    requestAnimationFrame(loop);
  }
  loop();

  // Color shift per page
  const pageColors = {
    dashboard:  ['rgba(99,102,241,.20)', 'rgba(139,92,246,.14)', 'rgba(99,102,241,.08)'],
    goals:      ['rgba(16,185,129,.16)', 'rgba(6,182,212,.12)',  'rgba(16,185,129,.06)'],
    budgets:    ['rgba(245,158,11,.14)', 'rgba(239,68,68,.10)',  'rgba(245,158,11,.06)'],
    stocks:     ['rgba(16,185,129,.18)', 'rgba(99,102,241,.12)', 'rgba(6,182,212,.06)'],
    calculator: ['rgba(139,92,246,.16)', 'rgba(99,102,241,.12)', 'rgba(139,92,246,.06)'],
    profile:    ['rgba(6,182,212,.14)',  'rgba(99,102,241,.12)', 'rgba(139,92,246,.06)'],
  };

  const orb1 = bg.querySelector('.app-orb-1');
  const orb2 = bg.querySelector('.app-orb-2');
  const orb3 = bg.querySelector('.app-orb-3');

  function shiftParallaxColors(pageId) {
    const cols = pageColors[pageId];
    if (!cols) return;
    if (orb1) orb1.style.background = `radial-gradient(circle, ${cols[0]} 0%, transparent 70%)`;
    if (orb2) orb2.style.background = `radial-gradient(circle, ${cols[1]} 0%, transparent 70%)`;
    if (orb3) orb3.style.background = `radial-gradient(circle, ${cols[2]} 0%, transparent 70%)`;
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => shiftParallaxColors(item.dataset.page));
  });
})();

// ══════════════════════════════════════════════
//  ASSISTENTE IA — análise local das finanças
// ══════════════════════════════════════════════
const aiFmt = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

function aiSnapshot() {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
  const invest  = transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.value, 0);
  const cash    = parseFloat(_store.profile?.cash) || 0;

  const byCat = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.value;
  });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const overBudgets = budgets.filter(b => b.spent / b.limit >= 0.9);
  const warnBudgets = budgets.filter(b => b.spent / b.limit >= 0.75 && b.spent / b.limit < 0.9);

  const now = new Date();
  const goalPace = goals.filter(g => g.current < g.target).map(g => {
    const months = Math.max(1, (new Date(g.deadline) - now) / (1000 * 60 * 60 * 24 * 30.4));
    return { ...g, monthly: (g.target - g.current) / months, months: Math.round(months) };
  });

  const reserveGoal = goals.find(g => /reserva|emerg/i.test(g.name));
  const monthlyExpense = expense || 1;
  const reserveMonths = reserveGoal ? reserveGoal.current / monthlyExpense : cash / monthlyExpense;

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  return { income, expense, invest, cash, topCats, overBudgets, warnBudgets, goalPace, reserveMonths, savingsRate };
}

function aiInsightCards() {
  const s = aiSnapshot();
  const cards = [];

  if (s.savingsRate >= 30) {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>', color: '#10b981', title: `Taxa de poupança: ${s.savingsRate.toFixed(0)}%`,
      text: `Excelente! Você guarda ${s.savingsRate.toFixed(0)}% da sua renda. Acima de 30% é nível avançado — considere direcionar o excedente para investimentos.` });
  } else if (s.savingsRate > 0) {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/></svg>', color: '#f59e0b', title: `Taxa de poupança: ${s.savingsRate.toFixed(0)}%`,
      text: `Você poupa ${s.savingsRate.toFixed(0)}% da renda. A referência saudável é 20–30%. Pequenos cortes no maior gasto já te aproximam disso.` });
  } else {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', color: '#ef4444', title: 'Gastos acima da renda',
      text: 'Suas despesas superam as receitas registradas neste período. Priorize revisar os maiores gastos.' });
  }

  if (s.topCats.length) {
    const [cat, val] = s.topCats[0];
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', color: '#6366f1', title: `Maior gasto: ${cat}`,
      text: `${aiFmt(val)} no período — ${((val / (s.expense || 1)) * 100).toFixed(0)}% das suas despesas. Reduzir 10% aqui libera ${aiFmt(val * 0.1)}/mês.` });
  }

  if (s.overBudgets.length) {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', color: '#ef4444', title: `${s.overBudgets.length} orçamento(s) no limite`,
      text: s.overBudgets.map(b => `${b.name} (${Math.round((b.spent / b.limit) * 100)}%)`).join(', ') + ' — quase ou já estourados.' });
  }

  if (s.reserveMonths >= 6) {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>', color: '#10b981', title: 'Reserva de emergência sólida',
      text: `Sua reserva cobre ~${Math.floor(s.reserveMonths)} meses de despesas. O recomendado (6 meses) está garantido.` });
  } else {
    cards.push({ icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/></svg>', color: '#f59e0b', title: 'Reserva de emergência',
      text: `Cobre ~${Math.max(0, Math.floor(s.reserveMonths))} meses de despesas. A meta clássica é 6 meses (${aiFmt(s.expense * 6)}).` });
  }

  return cards.slice(0, 4);
}

function renderAiInsights() {
  const el = document.getElementById('aiInsights');
  if (!el) return;
  el.innerHTML = aiInsightCards().map(c => `
    <div class="ai-insight-card" style="--ic:${c.color}">
      <div class="ai-insight-icon">${c.icon}</div>
      <div>
        <div class="ai-insight-title">${c.title}</div>
        <div class="ai-insight-text">${c.text}</div>
      </div>
    </div>`).join('');
}

// — chat engine —
const AI_SUGGESTIONS = [
  'Indicadores de hoje',
  'Qual é o meu score de saúde financeira?',
  'Resumo das minhas finanças',
  'Onde posso economizar?',
  'Como montar uma carteira?',
  'Simule 500 por mês por 10 anos a 12% ao ano',
  'Como sair das dívidas?',
  'Comprar ou alugar imóvel?',
  'Como abrir MEI?',
  'Como precificar meu produto?',
];

// ── DADOS OFICIAIS AO VIVO — Banco Central, AwesomeAPI, CoinGecko ──
let aiMarket = null;
async function aiEnsureMarket() {
  if (aiMarket && Date.now() - aiMarket.ts < 6 * 3600 * 1000) return aiMarket;
  try {
    const cached = JSON.parse(localStorage.getItem('financeos-ai-market') || 'null');
    if (cached && Date.now() - cached.ts < 6 * 3600 * 1000) { aiMarket = cached; return aiMarket; }
  } catch (e) {}

  const bcb = serie => fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`)
    .then(r => r.json()).then(d => parseFloat(d[0].valor));
  const bcb12 = serie => fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/12?formato=json`)
    .then(r => r.json()).then(d => d.reduce((a, x) => a + parseFloat(x.valor), 0));

  const [selic, cdi, ipca12, usd, btc] = await Promise.allSettled([
    bcb(432),                       // Selic meta % a.a.
    bcb(4389),                      // CDI % a.a.
    bcb12(433),                     // IPCA acumulado 12m (soma aprox.)
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL').then(r => r.json()).then(d => parseFloat(d.USDBRL.bid)),
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl').then(r => r.json()).then(d => d.bitcoin.brl),
  ]);

  const v = p => p.status === 'fulfilled' && isFinite(p.value) ? p.value : null;
  aiMarket = { selic: v(selic), cdi: v(cdi), ipca12: v(ipca12), usd: v(usd), btc: v(btc), ts: Date.now() };
  try { localStorage.setItem('financeos-ai-market', JSON.stringify(aiMarket)); } catch (e) {}
  return aiMarket;
}
function aiMarketFooter(m) {
  const dt = new Date(m.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `<br><br><small style="opacity:.65">📡 Fontes oficiais: Banco Central do Brasil (SGS)` +
    (m.usd ? ', AwesomeAPI' : '') + (m.btc ? ', CoinGecko' : '') + ` · atualizado ${dt}. Conteúdo educacional — não é recomendação de investimento.</small>`;
}

function aiNorm(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// — simulador por linguagem natural: "simule 500 por mês por 10 anos a 12% ao ano" —
function aiTrySimulation(t) {
  if (!/simul|quanto rende|rendimento de|se eu (investir|aplicar|guardar)/.test(t)) return null;
  const nums = (t.match(/(\d+[.,]?\d*)\s*(mil|k)?/g) || []).map(m => {
    let v = parseFloat(m.replace(/[^\d,.]/g, '').replace(',', '.'));
    if (/mil|k/.test(m)) v *= 1000;
    return v;
  }).filter(v => v > 0);
  if (nums.length < 2) return null;

  const pctMatch = t.match(/(\d+[.,]?\d*)\s*%/);
  let rate = pctMatch ? parseFloat(pctMatch[1].replace(',', '.')) : 10;
  const yearly = /ano|a\.a|aa/.test(t) || !/m[e]s|a\.m|am/.test(t);
  const iMonthly = yearly ? Math.pow(1 + rate / 100, 1 / 12) - 1 : rate / 100;

  const yearsMatch = t.match(/(\d+)\s*anos?/);
  const monthsMatch = t.match(/(\d+)\s*m[e]s(es)?/);
  let months = yearsMatch ? parseInt(yearsMatch[1]) * 12 : (monthsMatch ? parseInt(monthsMatch[1]) : 120);

  const monthly = nums[0];
  let total = 0;
  for (let m = 0; m < months; m++) total = (total + monthly) * (1 + iMonthly);
  const invested = monthly * months;

  return `🧮 <b>Simulação:</b> ${aiFmt(monthly)}/mês por ${Math.round(months / 12 * 10) / 10} anos a ${rate}% ${yearly ? 'a.a.' : 'a.m.'}<br><br>` +
    `• Total investido: <b>${aiFmt(invested)}</b><br>` +
    `• Montante final: <b>${aiFmt(total)}</b><br>` +
    `• Juros ganhos: <b>${aiFmt(total - invested)}</b> (${Math.round(((total / invested) - 1) * 100)}% acima do aportado)<br><br>` +
    `Use a aba <b>Calculadora</b> para ajustar os detalhes.`;
}

async function aiAnswer(q) {
  const s = aiSnapshot();
  const t = aiNorm(q);

  // ───────── TAXAS OFICIAIS AO VIVO ─────────
  if (/selic|cdi|taxa basica|taxa de juros (atual|hoje)|ipca (hoje|atual)|inflacao (hoje|atual)|dolar (hoje|agora|atual)|cotacao|quanto (esta|ta|custa) o dolar|bitcoin (hoje|agora)|indicadores/.test(t)) {
    const m = await aiEnsureMarket();
    if (m.selic === null && m.usd === null) {
      return 'Não consegui acessar as fontes oficiais agora (verifique a conexão). Posso responder com conceitos gerais — pergunte sobre "renda fixa", por exemplo.';
    }
    const juroReal = (m.selic !== null && m.ipca12 !== null)
      ? ((1 + m.selic / 100) / (1 + m.ipca12 / 100) - 1) * 100 : null;
    return `📊 <b>Indicadores oficiais agora:</b><br><br>` +
      (m.selic  !== null ? `• <b>Selic</b>: ${m.selic.toFixed(2).replace('.', ',')}% a.a. (meta — Banco Central)<br>` : '') +
      (m.cdi    !== null ? `• <b>CDI</b>: ${m.cdi.toFixed(2).replace('.', ',')}% a.a.<br>` : '') +
      (m.ipca12 !== null ? `• <b>IPCA</b>: ${m.ipca12.toFixed(2).replace('.', ',')}% acumulado em 12 meses<br>` : '') +
      (m.usd    !== null ? `• <b>Dólar</b>: R$ ${m.usd.toFixed(2).replace('.', ',')}<br>` : '') +
      (m.btc    !== null ? `• <b>Bitcoin</b>: ${aiFmt(m.btc)}<br>` : '') +
      (juroReal !== null ? `<br>💡 <b>Juro real</b> (Selic − inflação): ${juroReal.toFixed(2).replace('.', ',')}% a.a. — ${juroReal > 5 ? 'alto: renda fixa está muito atrativa' : juroReal > 2 ? 'moderado: renda fixa segue saudável' : 'baixo: diversificação em renda variável ganha apelo'}.` : '') +
      aiMarketFooter(m);
  }

  if (/quanto rende (a |na )?(poupanca|cdb|tesouro|100% do cdi)/.test(t)) {
    const m = await aiEnsureMarket();
    if (m.cdi !== null) {
      const cdiM = Math.pow(1 + m.cdi / 100, 1 / 12) - 1;
      const poup = m.selic > 8.5 ? 0.5 + 0.0 : (m.selic * 0.7) / 12;
      const v1000cdb = 1000 * Math.pow(1 + cdiM, 12);
      return `Com o <b>CDI real de hoje (${m.cdi.toFixed(2).replace('.', ',')}% a.a.)</b>:<br><br>` +
        `• R$ 1.000 em CDB 100% CDI → ~<b>${aiFmt(v1000cdb)}</b> em 12 meses (antes do IR)<br>` +
        `• Poupança rende ~${m.selic > 8.5 ? '0,5% a.m. + TR' : (m.selic * 0.7).toFixed(2).replace('.', ',') + '% a.a.'} — quase sempre <b>perde do CDB</b><br>` +
        `• Tesouro Selic acompanha a Selic (${m.selic !== null ? m.selic.toFixed(2).replace('.', ',') + '% a.a.' : '—'})` +
        aiMarketFooter(m);
    }
  }

  const sim = aiTrySimulation(t);
  if (sim) return sim;

  // ───────── FINANÇAS PESSOAIS (personalizado) ─────────
  if (/econom|gastar menos|cortar gasto|reduzir gasto|apertar/.test(t)) {
    const lines = s.topCats.slice(0, 3).map(([c, v], i) =>
      `${i + 1}. <b>${c}</b>: ${aiFmt(v)} — corte de 10–15% libera ${aiFmt(v * 0.12)}/mês`);
    return `Analisando seus gastos, os maiores pontos de economia são:<br><br>${lines.join('<br>')}<br><br>` +
      `<b>Táticas que funcionam:</b><br>` +
      `• Regra das 48h: espere 2 dias antes de qualquer compra não planejada acima de R$ 100.<br>` +
      `• Audite assinaturas: cancele o que não usou nos últimos 30 dias.<br>` +
      `• Mercado com lista + comparador de preços: economia média de 15–20%.<br>` +
      `• Renegocie planos (internet, celular, seguros) a cada 12 meses — a concorrência é sua alavanca.<br><br>` +
      `Somando os cortes acima: <b>~${aiFmt(s.topCats.slice(0, 3).reduce((a, [, v]) => a + v * 0.12, 0))}/mês</b> liberados.`;
  }

  if (/meta/.test(t) && !/metade/.test(t)) {
    if (!s.goalPace.length) return 'Todas as suas metas estão concluídas! 🎉 Que tal criar uma nova na aba Metas? Sugestões: reserva reforçada (12 meses), entrada de imóvel, ou liberdade financeira (25× seus gastos anuais).';
    const lines = s.goalPace.map(g =>
      `• <b>${g.name}</b>: faltam ${aiFmt(g.target - g.current)} em ~${g.months} meses → aporte de <b>${aiFmt(g.monthly)}/mês</b>`);
    const totalMonthly = s.goalPace.reduce((a, g) => a + g.monthly, 0);
    const surplus = Math.max(0, s.income - s.expense);
    const feasible = surplus >= totalMonthly;
    return `Ritmo necessário para cada meta:<br><br>${lines.join('<br>')}<br><br>` +
      `Total mensal: <b>${aiFmt(totalMonthly)}</b> · Sua sobra atual: <b>${aiFmt(surplus)}</b><br><br>` +
      (feasible
        ? '✅ Dá para manter todas no prazo. Dica: automatize os aportes no dia do salário ("pague-se primeiro").'
        : `⚠️ Faltam ${aiFmt(totalMonthly - surplus)}/mês. Opções: (1) alongar prazos das metas menos urgentes, (2) priorizar 2 metas por vez, (3) buscar renda extra — cada R$ 500/mês a mais fecha boa parte do gap.`);
  }

  if (/reserva|emergencia/.test(t)) {
    const target = s.expense * 6;
    return `A reserva ideal cobre <b>6 meses de despesas</b> — no seu caso, ${aiFmt(target)}. Hoje você cobre ~<b>${Math.max(0, Math.floor(s.reserveMonths))} meses</b>.<br><br>` +
      `<b>Onde deixar (liquidez diária, baixo risco):</b><br>` +
      `• Tesouro Selic — o padrão-ouro, garantido pelo governo.<br>` +
      `• CDB liquidez diária pagando 100%+ do CDI (garantia FGC até R$ 250 mil).<br>` +
      `• Contas remuneradas de bancos digitais sólidos.<br><br>` +
      `<b>Nunca</b> em ações, cripto ou fundos com carência — reserva é seguro, não investimento. ` +
      `Autônomos e PJs: mire 12 meses em vez de 6.`;
  }

  if (/(50.?30.?20|dividir|distribuir).*(orcamento|renda|salario)|orcamento ideal|como dividir/.test(t)) {
    const inc = s.income || 5000;
    return `A regra <b>50/30/20</b> aplicada à sua renda (${aiFmt(inc)}):<br><br>` +
      `• 50% necessidades → <b>${aiFmt(inc * 0.5)}</b> (moradia, mercado, transporte, saúde)<br>` +
      `• 30% desejos → <b>${aiFmt(inc * 0.3)}</b> (lazer, assinaturas, restaurantes)<br>` +
      `• 20% futuro → <b>${aiFmt(inc * 0.2)}</b> (investimentos, reserva, quitar dívidas)<br><br>` +
      `Suas despesas atuais: ${aiFmt(s.expense)} (${s.income ? Math.round((s.expense / s.income) * 100) : '—'}% da renda).<br><br>` +
      `Variações: <b>60/20/20</b> se a moradia pesa muito; <b>50/20/30</b> agressiva se busca independência financeira cedo (movimento FIRE).`;
  }

  if (/resumo|analise|visao geral|como esta|diagnostico/.test(t)) {
    return `📊 <b>Diagnóstico financeiro:</b><br><br>` +
      `• Receitas: <b>${aiFmt(s.income)}</b> · Despesas: <b>${aiFmt(s.expense)}</b> · Investido: <b>${aiFmt(s.invest)}</b><br>` +
      `• Dinheiro líquido: <b>${aiFmt(s.cash)}</b><br>` +
      `• Taxa de poupança: <b>${s.savingsRate.toFixed(0)}%</b> ${s.savingsRate >= 20 ? '✅' : '⚠️ (meta: 20%+)'}<br>` +
      `• Reserva: ~<b>${Math.max(0, Math.floor(s.reserveMonths))} meses</b> ${s.reserveMonths >= 6 ? '✅' : '⚠️ (meta: 6 meses)'}<br>` +
      `• Orçamentos críticos: <b>${s.overBudgets.length}</b><br>` +
      `• Metas em andamento: <b>${s.goalPace.length}</b><br><br>` +
      `<b>Próximo passo recomendado:</b> ${s.reserveMonths < 6 ? 'completar a reserva de emergência antes de investir em risco.' : s.savingsRate < 20 ? 'elevar a taxa de poupança para 20% — pergunte "onde posso economizar?".' : 'diversificar investimentos de longo prazo. Pergunte "como montar uma carteira?".'}`;
  }

  // ───────── DÍVIDAS E CRÉDITO ─────────
  if (/divida|devendo|emprestimo|inadimpl|nome sujo|negativad/.test(t)) {
    return `<b>Plano de guerra contra dívidas:</b><br><br>` +
      `1. <b>Mapeie tudo</b>: valor, juros mensal e parcela de cada dívida.<br>` +
      `2. <b>Método avalanche</b>: quite primeiro a de maior juro (cartão ~14% a.m., cheque especial ~8% a.m.) — matematicamente ótimo.<br>` +
      `3. <b>Método bola de neve</b>: quite primeiro a menor dívida — psicologicamente motivador. Escolha o que você consegue sustentar.<br>` +
      `4. <b>Troque dívida cara por barata</b>: consignado (~2% a.m.) ou portabilidade de crédito.<br>` +
      `5. <b>Negocie à vista</b>: descontos de 50–90% em feirões como Serasa Limpa Nome são comuns.<br>` +
      `6. Pause investimentos enquanto houver dívida acima de ~1,5% a.m. — quitar É o melhor investimento.`;
  }

  if (/cartao de credito|cartao|fatura|rotativo/.test(t)) {
    return `<b>Cartão de crédito — use a favor, não contra:</b><br><br>` +
      `• <b>Nunca</b> pague o mínimo: o rotativo cobra ~14% a.m. (≈ 380% ao ano!).<br>` +
      `• Trate o limite como ferramenta, não renda extra: gaste só o que já existe na conta.<br>` +
      `• Concentre gastos em 1 cartão com bom programa de pontos e anuidade zero (ou isenta por gasto).<br>` +
      `• Fatura no débito automático + alerta de 80% do limite.<br>` +
      `• Parcelado sem juros embute custo no preço — pedir desconto à vista quase sempre vale mais.<br><br>` +
      `Se a fatura está fora de controle: transfira para um crédito mais barato e corte o cartão temporariamente.`;
  }

  if (/score|credito|serasa|spc/.test(t)) {
    return `<b>Como subir seu score de crédito:</b><br><br>` +
      `• Pague contas em dia (maior peso) — atrasos derrubam o score por até 12 meses.<br>` +
      `• Cadastro positivo ativado: histórico bom passa a contar a seu favor.<br>` +
      `• Use 30% ou menos do limite do cartão.<br>` +
      `• Evite pedir crédito várias vezes em sequência (cada consulta pesa).<br>` +
      `• Mantenha dados atualizados nos birôs (Serasa, SPC, Quod).<br><br>` +
      `Score alto = juros menores em financiamentos — a diferença num imóvel pode passar de R$ 100 mil.`;
  }

  // ───────── INVESTIMENTOS ─────────
  if (/juros compostos|juro composto/.test(t)) {
    return `Juros compostos são "juros sobre juros": cada rendimento passa a render também.<br><br>` +
      `Fórmula: <b>M = C × (1 + i)ᵗ</b><br><br>` +
      `O que pouca gente percebe: o tempo vale mais que o valor. Começar aos 25 com R$ 300/mês supera começar aos 35 com R$ 600/mês.<br><br>` +
      `💡 Me peça uma simulação: <i>"simule 500 por mês por 10 anos a 12% ao ano"</i> — eu calculo na hora.`;
  }

  if (/cdi|selic|tesouro|renda fixa|cdb|lci|lca|debentur|ipca\+|prefixado/.test(t)) {
    return `<b>Mapa da renda fixa brasileira:</b><br><br>` +
      `• <b>Selic</b>: taxa básica (Banco Central). <b>CDI</b>: referência interbancária, ~Selic.<br>` +
      `• <b>Tesouro Selic</b>: pós-fixado, ideal para reserva.<br>` +
      `• <b>Tesouro IPCA+</b>: inflação + taxa real — protege o poder de compra; ótimo para aposentadoria.<br>` +
      `• <b>Tesouro Prefixado</b>: taxa travada — ganha se a Selic cair, perde se subir (marcação a mercado).<br>` +
      `• <b>CDB</b>: busque 100%+ do CDI; garantia FGC até R$ 250 mil por banco.<br>` +
      `• <b>LCI/LCA</b>: <b>isentas de IR</b> — 90% do CDI isento ≈ 105% do CDI tributado.<br>` +
      `• <b>Debêntures incentivadas</b>: isentas de IR, mas sem FGC — risco da empresa.<br><br>` +
      `IR regressivo (CDB/Tesouro): 22,5% até 6 meses → 15% acima de 2 anos. Segure 2+ anos quando puder.`;
  }

  if (/acao|acoes|bolsa|dividendo|b3|fundamentalista|p\/l/.test(t)) {
    return `<b>Investir em ações com método:</b><br><br>` +
      `• <b>Longo prazo + aportes mensais</b> vencem day trade: estudos da CVM mostram que 90%+ dos day traders perdem dinheiro.<br>` +
      `• Análise fundamentalista básica: empresa lucrativa (ROE > 10%), dívida controlada (dív. líq./EBITDA < 3), histórico de receita crescente.<br>` +
      `• <b>P/L</b> (preço/lucro): quantos anos de lucro pagam a ação — compare dentro do mesmo setor.<br>` +
      `• <b>Dividend yield</b>: dividendos/preço. Empresas maduras (bancos, energia) pagam 6–12% a.a. — isentos de IR.<br>` +
      `• Diversifique: 10–20 empresas de setores diferentes, ou simplifique com ETFs.<br><br>` +
      `Venda até R$ 20 mil/mês em ações é isenta de IR sobre o ganho (swing trade). Acompanhe tudo na aba <b>Bolsa de Valores</b>.`;
  }

  if (/fii|fundo imobiliario|imobiliario/.test(t)) {
    return `<b>FIIs — renda passiva com imóveis:</b><br><br>` +
      `• Você compra cotas e recebe aluguéis mensais <b>isentos de IR</b> (pessoa física).<br>` +
      `• Tipos: <b>tijolo</b> (shoppings, galpões, lajes), <b>papel</b> (CRIs — recebíveis), <b>híbridos</b> e FoFs.<br>` +
      `• Métricas: dividend yield (8–12% a.a. é comum), P/VP (abaixo de 1 = desconto sobre o patrimônio), vacância.<br>` +
      `• Diversifique entre tijolo e papel: papel rende mais com juros altos; tijolo valoriza com juros baixos.<br>` +
      `• Atenção: a venda de cotas com lucro paga 20% de IR (sem isenção dos R$ 20 mil).<br><br>` +
      `Estratégia popular: reinvestir os proventos até a renda mensal cobrir suas despesas.`;
  }

  if (/etf|indice|ibovespa|ivvb|s&p/.test(t)) {
    return `<b>ETFs — diversificação em 1 clique:</b><br><br>` +
      `• Fundo que replica um índice, negociado como ação.<br>` +
      `• <b>BOVA11</b>: Ibovespa (Brasil) · <b>IVVB11</b>: S&P 500 em reais (EUA + proteção cambial) · <b>SMAL11</b>: small caps.<br>` +
      `• Taxas baixíssimas (0,1–0,5% a.a.) vs fundos ativos (2%+ que raramente batem o índice).<br>` +
      `• Estratégia consagrada: aporte mensal constante em ETF global — simples e historicamente eficaz.<br>` +
      `• Tributação: 15% sobre ganho na venda, sem isenção de R$ 20 mil.<br><br>` +
      `Buffett recomenda exatamente isso para 99% das pessoas: índice amplo + constância + décadas.`;
  }

  if (/cripto|bitcoin|btc|ethereum/.test(t)) {
    return `<b>Cripto com responsabilidade:</b><br><br>` +
      `• Volatilidade extrema: quedas de 50–80% já aconteceram várias vezes — invista só o que pode ver derreter.<br>` +
      `• Posição sugerida por especialistas conservadores: <b>1–5% do patrimônio</b>, no máximo.<br>` +
      `• Bitcoin e Ethereum dominam; altcoins pequenas são loteria.<br>` +
      `• Segurança: exchanges grandes + autenticação 2FA; valores altos em carteira própria (hardware wallet).<br>` +
      `• IR Brasil: vendas acima de R$ 35 mil/mês pagam 15% sobre o ganho; declare tudo (exchanges reportam à Receita).<br><br>` +
      `Acompanhe BTC/ETH em tempo real na aba <b>Bolsa de Valores</b>.`;
  }

  if (/dolar|cambio|exterior|internacional|dolarizar/.test(t)) {
    return `<b>Proteção cambial e investimento no exterior:</b><br><br>` +
      `• Por quê: seu custo de vida é parcialmente dolarizado (eletrônicos, combustível, viagens) — ter 10–30% do patrimônio em dólar protege.<br>` +
      `• Caminhos: <b>IVVB11</b> (ETF S&P em reais, simples), <b>BDRs</b> (ações estrangeiras na B3), conta internacional (Avenue, Nomad, Inter Global), fundos cambiais.<br>` +
      `• Evite comprar dólar papel — spread alto e não rende.<br>` +
      `• Imposto: BDR/ETF seguem regras de ações; conta no exterior tem regras próprias de declaração (e-Financeira/CBE acima de US$ 1 milhão).<br><br>` +
      `Regra de ouro: dolarize aos poucos (aportes mensais) para diluir o preço médio do câmbio.`;
  }

  if (/carteira|alocacao|diversific|portfolio|perfil/.test(t)) {
    return `<b>Montando uma carteira por perfil:</b><br><br>` +
      `• <b>Conservador</b>: 85% renda fixa (Selic/IPCA+) · 10% FIIs · 5% ações/ETF<br>` +
      `• <b>Moderado</b>: 60% renda fixa · 15% FIIs · 20% ações/ETF · 5% internacional<br>` +
      `• <b>Arrojado</b>: 30% renda fixa · 15% FIIs · 35% ações · 15% internacional · 5% cripto<br><br>` +
      `Princípios: reserva de emergência <b>fora</b> da carteira; rebalanceie 1–2× ao ano (venda o que subiu, compre o que caiu); ` +
      `regra dos 100: <i>100 − sua idade</i> ≈ % máxima em renda variável.<br><br>` +
      `Defina seu perfil na aba <b>Perfil → Investimentos</b>.`;
  }

  if (/aposentadoria|previdencia|pgbl|vgbl|inss|fire|independencia financeira/.test(t)) {
    return `<b>Aposentadoria e independência financeira:</b><br><br>` +
      `• <b>Número FIRE</b>: 25× seus gastos anuais. Gastando ${aiFmt(s.expense)}/mês → alvo de <b>${aiFmt(s.expense * 12 * 25)}</b> (regra dos 4% de retirada).<br>` +
      `• <b>PGBL</b>: deduz até 12% da renda bruta no IR (vale para quem declara completo) — mas IR incide sobre o total no resgate.<br>` +
      `• <b>VGBL</b>: IR só sobre o rendimento — melhor para declaração simplificada.<br>` +
      `• Tabela regressiva: 10% de IR após 10 anos — imbatível no longo prazo.<br>` +
      `• Cuidado com taxas: administração acima de 1% a.a. ou qualquer taxa de carregamento destroem o rendimento.<br>` +
      `• INSS: vale manter como piso de segurança, mas não conte só com ele.<br><br>` +
      `Alternativa DIY: Tesouro IPCA+ longo + ETFs, sem taxas de previdência.`;
  }

  if (/imposto|ir\b|declarar|leao|tributa/.test(t)) {
    return `<b>IR sobre investimentos — guia rápido:</b><br><br>` +
      `• <b>Isentos</b>: poupança, LCI/LCA, dividendos de ações, proventos de FIIs, venda de ações até R$ 20 mil/mês.<br>` +
      `• <b>Renda fixa</b>: tabela regressiva 22,5% → 15% (2+ anos), retido na fonte.<br>` +
      `• <b>Ações (acima da isenção)</b>: 15% swing / 20% day trade — você emite o DARF até o fim do mês seguinte.<br>` +
      `• <b>FIIs (venda de cotas)</b>: 20%, sem isenção.<br>` +
      `• <b>Cripto</b>: 15%+ sobre vendas acima de R$ 35 mil/mês.<br>` +
      `• Prejuízos compensam lucros futuros da mesma categoria — registre tudo.<br><br>` +
      `Declare mesmo investimentos isentos: eles entram em "Bens e Direitos".`;
  }

  if (/inflacao|ipca|poder de compra/.test(t)) {
    return `<b>Inflação — o imposto invisível:</b><br><br>` +
      `• IPCA é o índice oficial. A 5% a.a., seu dinheiro parado perde <b>metade do poder de compra em ~14 anos</b>.<br>` +
      `• Juro <b>real</b> = rendimento − inflação. CDB a 10% com IPCA a 5% rende 4,76% de verdade.<br>` +
      `• Proteções: Tesouro IPCA+ (garante juro real), FIIs (aluguéis reajustados), ações de empresas com poder de preço.<br>` +
      `• Poupança frequentemente <b>perde</b> da inflação — é perda disfarçada de segurança.<br><br>` +
      `Sempre avalie investimentos pelo ganho real, não pelo nominal.`;
  }

  if (/poupanca/.test(t)) {
    return `<b>Poupança: o conforto que custa caro.</b><br><br>` +
      `• Rende 70% da Selic (quando Selic ≤ 8,5%) + TR — quase sempre <b>perde para CDBs e Tesouro Selic</b>.<br>` +
      `• Só rende na "data de aniversário": sacou um dia antes, perdeu o mês inteiro.<br>` +
      `• Única vantagem real: isenção de IR e simplicidade — mas LCI/LCA também são isentas e rendem mais.<br><br>` +
      `Migração simples: Tesouro Selic ou CDB 100%+ CDI com liquidez diária. Mesmo risco prático (FGC), retorno maior todo dia útil.`;
  }

  // ───────── GRANDES DECISÕES ─────────
  if (/financiamento|sac|price|imovel|casa propria|comprar casa|apartamento/.test(t)) {
    return `<b>Financiamento imobiliário inteligente:</b><br><br>` +
      `• <b>SAC</b>: parcelas começam altas e caem; você paga menos juros no total. Melhor se o orçamento aguenta.<br>` +
      `• <b>Price</b>: parcelas fixas; mais fáceis no início, mais juros no total.<br>` +
      `• Entrada ideal: 30%+ (reduz juros e evita LTV alto).<br>` +
      `• Compare o <b>CET</b> (custo efetivo total), não só a taxa — seguros e tarifas escondem custo.<br>` +
      `• Use FGTS na entrada e amortizações a cada 2 anos.<br>` +
      `• Amortize sempre no modo "reduzir prazo" — corta juros exponencialmente.<br>` +
      `• Renegocie/porte o contrato se a taxa de mercado cair 1+ ponto.<br><br>` +
      `Parcela máxima saudável: <b>25–30% da renda líquida</b> — no seu caso, ~${aiFmt((s.income || 5000) * 0.28)}.`;
  }

  if (/alugar|aluguel vs|comprar vs|comprar ou alugar/.test(t)) {
    return `<b>Comprar vs. alugar — a conta fria:</b><br><br>` +
      `• Regra rápida: se o aluguel anual é <b>menos de 5%</b> do valor do imóvel, alugar tende a ganhar (investindo a diferença).<br>` +
      `• Exemplo: imóvel de R$ 500 mil alugado por R$ 1.800/mês = 4,3% a.a. → alugar + investir vence na maioria dos cenários.<br>` +
      `• Comprar faz sentido: longa permanência (8+ anos), estabilidade, valor emocional, financiamento barato.<br>` +
      `• Alugar faz sentido: mobilidade de carreira, fase de acumulação, juros altos.<br><br>` +
      `Não esqueça os custos ocultos da compra: ITBI (~3%), escritura, condomínio, IPTU, manutenção (~1% a.a.).`;
  }

  if (/carro|veiculo|automovel/.test(t)) {
    return `<b>Carro — o destruidor silencioso de patrimônio:</b><br><br>` +
      `• Custo total ≈ <b>o dobro</b> da parcela: deprecia 10–20%/ano + seguro + IPVA + manutenção + combustível.<br>` +
      `• Regra 20/4/10: entrada de 20%+, financie no máx. 4 anos, custo total ≤ 10% da renda.<br>` +
      `• Seminovo de 2–4 anos: o primeiro dono pagou a maior depreciação por você.<br>` +
      `• Consórcio: sem juros mas com taxa de adm (15–20%) e sem garantia de contemplação — bom só para quem não tem pressa.<br>` +
      `• Faça a conta do "custo por km" vs apps/assinatura — para baixo uso urbano, não ter carro libera centenas de reais/mês.`;
  }

  if (/consorcio/.test(t)) {
    return `<b>Consórcio — quando vale (e quando não):</b><br><br>` +
      `• Não tem juros, mas tem <b>taxa de administração</b> (15–25% no total) + fundo de reserva.<br>` +
      `• Você só recebe quando contemplado: sorteio (sorte) ou lance (dinheiro extra).<br>` +
      `• Vale: para disciplinados sem pressa, como "poupança forçada" com custo conhecido.<br>` +
      `• Não vale: se você tem pressa (financiamento resolve) ou disciplina (investir + comprar à vista é matematicamente superior).<br><br>` +
      `Alternativa quase sempre melhor: aporte mensal no Tesouro/CDB e compra à vista com desconto.`;
  }

  // ───────── NEGÓCIOS E EMPREENDEDORISMO ─────────
  if (/abrir empresa|mei|cnpj|microempre|simples nacional|formalizar/.test(t)) {
    return `<b>Formalizando seu negócio:</b><br><br>` +
      `• <b>MEI</b>: faturamento até R$ 81 mil/ano, imposto fixo (~R$ 70/mês), 1 funcionário. Simples e barato — comece aqui se couber.<br>` +
      `• <b>ME (Simples Nacional)</b>: até R$ 4,8 mi/ano; alíquota começa em 4–6% conforme atividade.<br>` +
      `• Serviços de profissionais (médicos, devs, consultores): compare Simples vs <b>Lucro Presumido</b> — com fator R, a diferença pode ser grande.<br>` +
      `• PJ para prestar serviço costuma pagar <b>muito menos imposto</b> que CLT/autônomo PF acima de ~R$ 6 mil/mês.<br><br>` +
      `Custo de contador (R$ 200–500/mês) se paga em economia tributária. Não pule essa etapa.`;
  }

  if (/fluxo de caixa|caixa da empresa|capital de giro/.test(t)) {
    return `<b>Fluxo de caixa — o oxigênio do negócio:</b><br><br>` +
      `• Lucro ≠ caixa: você pode lucrar no papel e quebrar por falta de caixa (vendas a prazo, estoque parado).<br>` +
      `• <b>Capital de giro</b>: tenha 3–6 meses de custos fixos em reserva empresarial.<br>` +
      `• Reduza o ciclo: receba antes (antecipe à vista com desconto, PIX) e pague depois (negocie prazos com fornecedores).<br>` +
      `• Projete 90 dias à frente, sempre — planilha semanal de entradas/saídas previstas.<br>` +
      `• Estoque é dinheiro parado: gire rápido, compre conforme demanda.<br><br>` +
      `Sinal vermelho: usar dinheiro de impostos/13º provisionado para tapar buraco do mês.`;
  }

  if (/precific|quanto cobrar|margem|markup|preco de venda/.test(t)) {
    return `<b>Precificação que sustenta o negócio:</b><br><br>` +
      `• <b>Markup</b>: preço = custo × multiplicador. Ex.: custo R$ 50, markup 2,5 → R$ 125.<br>` +
      `• <b>Margem</b>: lucro/preço. Margem 40% em R$ 125 = R$ 50 de lucro. (Margem ≠ markup!)<br>` +
      `• Inclua TODOS os custos: matéria-prima, seu tempo (!), impostos, taxas de cartão (~3–5%), frete, embalagem, marketing, inadimplência.<br>` +
      `• Serviços: calcule sua hora → (salário desejado + custos) ÷ horas vendáveis (≈ 60% das horas úteis).<br>` +
      `• Preço também é posicionamento: cobrar barato demais atrai cliente ruim e te mata de trabalhar.<br><br>` +
      `Teste de sanidade: se vender 30% menos, ainda paga as contas? Se não, sua margem está perigosa.`;
  }

  if (/pro.?labore|distribuicao de lucro|salario do dono|retirada/.test(t)) {
    return `<b>Como o dono deve se pagar:</b><br><br>` +
      `• <b>Pró-labore</b>: "salário" do sócio — paga INSS (11%) e IR. Defina um valor fixo realista (mercado pagaria quanto pela sua função?).<br>` +
      `• <b>Distribuição de lucros</b>: <b>isenta de IR</b> — mas só sobre lucro real apurado em contabilidade.<br>` +
      `• Estratégia comum: pró-labore enxuto (mantém INSS/aposentadoria) + distribuição trimestral do excedente.<br>` +
      `• <b>Nunca</b> misture PF e PJ: conta separada, cartão separado. Mistura = descontrole + risco fiscal.<br>` +
      `• Pague-se TODO mês, mesmo pouco — negócio que não remunera o dono é hobby caro.`;
  }

  if (/cac|ltv|ponto de equilibrio|break even|metricas|indicadores do negocio/.test(t)) {
    return `<b>Métricas que todo dono precisa acompanhar:</b><br><br>` +
      `• <b>Ponto de equilíbrio</b>: custos fixos ÷ margem de contribuição % — o faturamento mínimo para não ter prejuízo.<br>` +
      `• <b>CAC</b>: custo de aquisição de cliente = marketing ÷ novos clientes.<br>` +
      `• <b>LTV</b>: valor do cliente no tempo = ticket × compras/ano × anos de retenção.<br>` +
      `• Regra de ouro: <b>LTV ≥ 3× CAC</b>. Abaixo disso, você compra clientes no prejuízo.<br>` +
      `• <b>Margem de contribuição</b>: preço − custos variáveis. É ela que paga os fixos.<br>` +
      `• <b>Churn</b> (cancelamento): reduzir 5% no churn pode aumentar o lucro em 25–95% (estudo Bain).<br><br>` +
      `Acompanhe mensalmente em planilha simples — o que não é medido, não melhora.`;
  }

  if (/validar|ideia de negocio|comecar um negocio|empreender|abrir um negocio/.test(t)) {
    return `<b>Validando uma ideia antes de investir pesado:</b><br><br>` +
      `1. <b>Venda antes de construir</b>: landing page + pré-venda ou lista de espera. Interesse real = dinheiro ou cadastro, não elogio.<br>` +
      `2. <b>MVP em 30 dias</b>: a menor versão que entrega o valor central.<br>` +
      `3. <b>10 clientes na mão</b>: fale com eles; padrões de dor valem mais que pesquisas genéricas.<br>` +
      `4. Comece como side project: não largue a renda principal antes do negócio pagar 6+ meses dos seus custos.<br>` +
      `5. Capital inicial enxuto: prefira validar com < R$ 5 mil a financiar um sonho não testado.<br><br>` +
      `Estatística fria: ~60% das empresas fecham em 5 anos — quase sempre por falta de caixa e de clientes, não de ideia.`;
  }

  if (/renda extra|ganhar mais|segunda renda|freela/.test(t)) {
    return `<b>Renda extra com estratégia:</b><br><br>` +
      `• <b>Monetize o que já sabe</b>: freelas da sua profissão pagam 2–5× mais por hora que bicos genéricos.<br>` +
      `• Plataformas: Workana/99Freelas (serviços), Hotmart (infoprodutos), iFood/Uber (imediato, mas teto baixo).<br>` +
      `• <b>Escada de valor</b>: troque tempo por dinheiro → produtize (curso, template, consultoria em grupo) → renda semi-passiva.<br>` +
      `• Destine 100% da renda extra para um objetivo (dívida ou investimento) — senão ela evapora no padrão de vida.<br><br>` +
      `Com ${aiFmt(500)}/mês extras investidos a 1% a.m., você acumula ~${aiFmt(116000)} em 10 anos. Pequenos fluxos somam alto.`;
  }

  if (/negociar salario|aumento|promocao|crescer na carreira/.test(t)) {
    return `<b>Negociando salário como um profissional:</b><br><br>` +
      `• Pesquise a faixa (Glassdoor, levels.fyi, colegas de mercado) — dado vence achismo.<br>` +
      `• Documente resultados: "aumentei X em Y%" vale mais que "trabalho muito".<br>` +
      `• Timing: após entrega de impacto ou no ciclo de orçamento da empresa.<br>` +
      `• Peça um número específico (ex.: R$ 8.700, não "uns 8 mil") — âncoras precisas funcionam.<br>` +
      `• Proposta externa é a alavanca mais forte — mas só use se toparia sair.<br>` +
      `• Se não rolar aumento: negocie bônus, remoto, educação paga — tudo tem valor financeiro.<br><br>` +
      `Cada 10% a mais hoje compõe sobre TODOS os aumentos futuros da carreira.`;
  }

  // ───────── COMPORTAMENTO ─────────
  if (/impulso|compulsiv|ansiedade|habito|mentalidade|psicolog/.test(t)) {
    return `<b>O jogo mental do dinheiro:</b><br><br>` +
      `• <b>Regra das 48h</b>: desejo de compra não planejada? Espere 2 dias. 80% evapora.<br>` +
      `• Deixe o cartão fora dos apps e do navegador — fricção reduz impulso.<br>` +
      `• Automatize ANTES de ver: aporte automático no dia do salário ("pague-se primeiro").<br>` +
      `• Orçamento de culpa zero: separe uma verba mensal para gastar SEM remorso — restrição total gera farra de rebote.<br>` +
      `• Acompanhe o patrimônio 1×/mês, não todo dia — ver número crescer vicia mais que gastar.<br><br>` +
      `Como diz Morgan Housel: "fazer dinheiro exige correr risco; manter dinheiro exige humildade".`;
  }

  if (/livro|estudar|aprender|curso|conteudo/.test(t)) {
    return `<b>Trilha de estudos em finanças:</b><br><br>` +
      `• <b>Básico</b>: "Pai Rico, Pai Pobre" (mentalidade), "Me Poupe!" (Nathalia Arcuri, prático BR).<br>` +
      `• <b>Comportamento</b>: "A Psicologia Financeira" (Morgan Housel) — talvez o melhor de todos.<br>` +
      `• <b>Investimentos</b>: "O Investidor Inteligente" (Graham), "Faça Fortuna com Ações" (Décio Bazin, dividendos BR).<br>` +
      `• <b>Negócios</b>: "A Startup Enxuta" (Eric Ries), "Trabalhe 4 Horas por Semana" (Tim Ferriss).<br>` +
      `• Grátis: portal do Tesouro Direto, canal do Banco Central, CVM Educacional.<br><br>` +
      `1 livro por mês + prática no FinanceOS = evolução real em 1 ano.`;
  }

  // ───────── PROTEÇÃO E SEGURANÇA ─────────
  if (/golpe|piramide|fraude|phishing|pix errado|caiu num|esquema/.test(t)) {
    return `<b>🛡️ Blindagem contra golpes financeiros:</b><br><br>` +
      `• <b>Pirâmide disfarçada</b>: retorno fixo alto "garantido" (2%+ ao mês) + ganho por indicação = fuja. Verifique se tem registro na CVM.<br>` +
      `• <b>Golpe do PIX/WhatsApp</b>: parente pedindo dinheiro com número novo? Ligue antes. Sempre.<br>` +
      `• <b>Falso boleto/banco</b>: nunca clique em link de SMS/e-mail — digite o site do banco manualmente.<br>` +
      `• <b>Central falsa</b>: banco NUNCA liga pedindo senha, token ou para "transferir por segurança".<br>` +
      `• Configure: limite de PIX noturno baixo, 2FA em tudo, cartão virtual para compras online.<br>` +
      `• Caiu? Registre BO, conteste no banco em até 72h (MED do PIX) e avise os birôs.<br><br>` +
      `Regra de ouro: se o retorno parece bom demais, o produto é você.`;
  }

  if (/cheque especial/.test(t)) {
    return `<b>Cheque especial — o crédito mais caro do Brasil (junto do rotativo):</b><br><br>` +
      `• Juros de ~8% a.m. (≈ 150% a.a.) — limitado por lei, ainda assim brutal.<br>` +
      `• Entrou no limite? Troque imediatamente por crédito pessoal (~3% a.m.) ou consignado (~2% a.m.).<br>` +
      `• Peça ao banco para <b>desativar</b> o limite se você cai nele com frequência — sem limite, sem tentação.<br>` +
      `• Use a reserva de emergência antes do cheque especial, sempre — é exatamente para isso que ela existe.`;
  }

  if (/consignado/.test(t)) {
    return `<b>Crédito consignado — o menos pior dos empréstimos:</b><br><br>` +
      `• Desconto direto na folha/benefício → menor risco para o banco → <b>juros de ~1,5–2,5% a.m.</b><br>` +
      `• Disponível para: CLT (algumas empresas), servidores públicos, aposentados e pensionistas INSS.<br>` +
      `• Margem máxima: ~35% da renda — não comprometa tudo, imprevistos continuam existindo.<br>` +
      `• Ótimo para: quitar dívidas caras (cartão, cheque especial). Péssimo para: consumo por impulso.<br>` +
      `• Cuidado com o "consignado eterno": refinanciar sempre que abre margem vira bola de neve disfarçada.`;
  }

  if (/open finance|portabilidade/.test(t)) {
    return `<b>Open Finance e portabilidade — concorrência a seu favor:</b><br><br>` +
      `• <b>Open Finance</b>: você autoriza compartilhar seu histórico entre bancos → ofertas melhores de crédito e investimento personalizadas.<br>` +
      `• <b>Portabilidade de crédito</b>: leve qualquer financiamento para outro banco com juro menor — o banco atual pode cobrir a oferta.<br>` +
      `• <b>Portabilidade de salário</b>: receba onde quiser, sem precisar da "conta do convênio".<br>` +
      `• Na prática: a cada 12 meses, cote seu financiamento imobiliário em 2–3 bancos. Queda de 1 ponto na taxa pode economizar dezenas de milhares.`;
  }

  // ───────── FAMÍLIA E VIDA ─────────
  if (/casal|casamento e dinheiro|conta conjunta|regime de bens|conjuge|esposa|marido/.test(t)) {
    return `<b>Finanças a dois sem briga:</b><br><br>` +
      `• Modelo 3 contas: conta de cada um + conta conjunta para despesas da casa (proporcional à renda de cada um).<br>` +
      `• Reunião financeira mensal de 30 min: gastos, metas, próximos passos — dinheiro às claras evita 90% dos conflitos.<br>` +
      `• <b>Regime de bens</b>: comunhão parcial (padrão — o que vier depois do casamento é dos dois), separação total, comunhão universal. Decisão jurídica E financeira.<br>` +
      `• Metas conjuntas com nome e prazo ("Casa: R$ 80 mil até 2028") engajam mais que "vamos economizar".<br>` +
      `• Dívida do cônjuge em comunhão parcial pode respingar em você — transparência total antes de casar.`;
  }

  if (/filho|crianca|mesada|bebe|educacao financeira (infantil|dos filhos)/.test(t)) {
    return `<b>Filhos e dinheiro:</b><br><br>` +
      `• Custo médio de um filho até os 18: estimativas brasileiras passam de <b>R$ 700 mil</b> (classe média) — planeje antes.<br>` +
      `• <b>Poupança do filho</b>: Tesouro IPCA+ longo ou ETF mensal desde o nascimento. R$ 200/mês por 18 anos a juro real de 5% ≈ <b>R$ 70 mil</b> reais de hoje.<br>` +
      `• <b>Tesouro Educa+</b>: título específico que paga renda mensal por 5 anos na fase da faculdade.<br>` +
      `• <b>Mesada educativa</b>: valor fixo semanal + 3 potes (gastar/poupar/doar) — ensina escolha, não mimo.<br>` +
      `• Envolva a criança: deixe errar com pouco dinheiro agora para não errar com muito depois.`;
  }

  if (/heranca|inventario|sucessao|testamento|holding familiar|doacao em vida/.test(t)) {
    return `<b>Planejamento sucessório — proteger quem fica:</b><br><br>` +
      `• Sem planejamento, o inventário custa <b>10–20% do patrimônio</b> (ITCMD, advogado, custas) e trava os bens por anos.<br>` +
      `• <b>Testamento</b>: você decide 50% livremente; a outra metade é dos herdeiros necessários.<br>` +
      `• <b>Doação em vida</b> com usufruto: antecipa a transferência pagando ITCMD menor e mantendo o controle.<br>` +
      `• <b>Previdência (VGBL)</b> não entra em inventário — vai direto ao beneficiário em ~30 dias. Excelente para liquidez imediata da família.<br>` +
      `• <b>Holding familiar</b>: vale para patrimônios maiores (imóveis múltiplos, empresa) — consulte especialista tributário.<br>` +
      `• Básico que todo mundo deveria ter: lista de contas/senhas/apólices acessível ao cônjuge + seguro de vida.`;
  }

  if (/seguro de vida|seguro/.test(t)) {
    return `<b>Seguros — pagar pouco para não quebrar:</b><br><br>` +
      `• <b>Seguro de vida</b>: essencial se alguém depende da sua renda. Cobertura sugerida: 5–10× a renda anual. Custa menos do que parece (R$ 50–150/mês aos 30 anos).<br>` +
      `• <b>Invalidez</b>: estatisticamente mais provável que morte antes dos 60 — inclua na apólice.<br>` +
      `• <b>Seguro residencial</b>: ~R$ 30/mês protege seu maior patrimônio. Subutilizado no Brasil.<br>` +
      `• <b>Auto</b>: compare franquia × valor de mercado; carro velho às vezes só vale RCF (danos a terceiros).<br>` +
      `• Não vale: seguro de eletrônico barato, garantia estendida (margem de 70%+ da loja).<br><br>` +
      `Seguro é para catástrofe, não para inconveniência.`;
  }

  if (/demissao|desemprego|fui demitido|perdi o emprego|rescisao|seguro.desemprego/.test(t)) {
    return `<b>Plano de contingência pós-demissão:</b><br><br>` +
      `1. <b>Rescisão</b>: confira saldo, aviso, 13º e férias proporcionais, multa de 40% do FGTS.<br>` +
      `2. <b>Seguro-desemprego</b>: 3–5 parcelas conforme tempo trabalhado — dê entrada imediatamente.<br>` +
      `3. <b>FGTS</b>: saque liberado na demissão sem justa causa.<br>` +
      `4. Corte gastos para "modo sobrevivência" no dia 1 — não espere a reserva acabar.<br>` +
      `5. Plano de saúde: você tem direito de manter o coletivo por 6–24 meses pagando integral (avalie vs individual).<br>` +
      `6. Reserva + rescisão = sua pista de decolagem. Divida pelo custo mensal e saiba exatamente quantos meses tem.<br><br>` +
      `Com despesas de ${aiFmt(s.expense)}/mês, cada R$ 10 mil de colchão = ${(10000 / (s.expense || 5000)).toFixed(1)} meses de fôlego.`;
  }

  if (/clt vs pj|pj ou clt|clt ou pj/.test(t)) {
    return `<b>CLT vs PJ — a conta completa:</b><br><br>` +
      `• Regra de bolso: PJ precisa pagar <b>~30–40% a mais</b> para empatar com CLT (13º, férias+1/3, FGTS, INSS patronal, estabilidade).<br>` +
      `• CLT 10k ≈ PJ 13–14k. Abaixo disso, a CLT costuma ganhar.<br>` +
      `• PJ vence quando: alíquota baixa (Simples ~6–15%), você se disciplina a provisionar férias/13º/INSS por conta própria.<br>` +
      `• PJ: provisione TODO mês — 8% "FGTS pessoal", 1/12 de 13º, 1/12 de férias, INSS sobre pró-labore.<br>` +
      `• Risco PJ: zero estabilidade — reserva de 12 meses, não 6.`;
  }

  // ───────── INVESTIMENTOS AVANÇADOS ─────────
  if (/fundo de investimento|fundos|come.cotas|taxa de adm/.test(t)) {
    return `<b>Fundos de investimento — leia a letra miúda:</b><br><br>` +
      `• <b>Taxa de administração</b>: acima de 1% a.a. em renda fixa ou 2% em ações precisa entregar MUITO para se justificar.<br>` +
      `• <b>Taxa de performance</b>: 20% sobre o que exceder o benchmark — ok se o benchmark for justo.<br>` +
      `• <b>Come-cotas</b>: antecipação de IR em maio/novembro nos fundos abertos — corrói os juros compostos vs ETFs/títulos.<br>` +
      `• Estudo clássico: a maioria dos fundos ativos <b>perde do índice</b> em janelas de 10+ anos.<br>` +
      `• Quando fundos valem: multimercados descorrelacionados, crédito privado pulverizado, gestor com histórico longo comprovado.<br><br>` +
      `Alternativa simples: ETF + Tesouro direto = 90% do resultado com 10% do custo.`;
  }

  if (/opcoes|derivativo|alavancagem|day trade|short|vender a descoberto/.test(t)) {
    return `<b>⚠️ Zona de alto risco — opções, alavancagem e day trade:</b><br><br>` +
      `• Estudo da FGV/CVM: <b>97% dos day traders perdem dinheiro</b> em 300+ pregões; menos de 1% ganha mais que um salário mínimo.<br>` +
      `• <b>Alavancagem</b> multiplica nos dois sentidos — dá para perder MAIS do que investiu.<br>` +
      `• <b>Opções</b>: úteis para proteção (hedge) de carteiras grandes; como especulação, viram loteria com taxas.<br>` +
      `• Corretoras e influencers lucram com seu giro, não com seu ganho — entenda o incentivo de quem te empurra isso.<br>` +
      `• Se ainda assim quiser testar: máximo 5% do patrimônio, dinheiro que pode virar pó, e registre cada trade.<br><br>` +
      `Riqueza consistente vem de aporte + tempo + juros compostos. Chato? Sim. Funciona? Sempre funcionou.`;
  }

  if (/ouro|commodit|prata/.test(t)) {
    return `<b>Ouro e commodities na carteira:</b><br><br>` +
      `• Ouro é <b>proteção</b>, não investimento produtivo: não paga dividendo, mas historicamente segura valor em crises.<br>` +
      `• Posição típica: 0–5% do patrimônio como "seguro de catástrofe".<br>` +
      `• Como comprar no Brasil: ETF GOLD11 (mais prático), contratos na B3, ou fundos cambiais com ouro.<br>` +
      `• Commodities agrícolas/petróleo: exposição via ações (Petrobras, SLC, ETFs setoriais) é mais simples que futuros.<br>` +
      `• Lembre: no longo prazo, ações de empresas produtivas superam ouro por margem larga.`;
  }

  if (/renda passiva|viver de renda|dividendos mensais/.test(t)) {
    return `<b>Construindo renda passiva de verdade:</b><br><br>` +
      `• Meta: patrimônio que gere sua despesa mensal. Com yield médio de 8% a.a., viver com ${aiFmt(s.expense)}/mês exige ~<b>${aiFmt(s.expense * 12 / 0.08)}</b>.<br>` +
      `• Combinação clássica BR: FIIs (renda mensal isenta) + ações pagadoras (bancos, energia, saneamento) + Tesouro IPCA+ com juros semestrais.<br>` +
      `• <b>Tesouro RendA+</b>: paga renda mensal por 20 anos a partir da data que você escolher — aposentadoria DIY.<br>` +
      `• Fase 1 (acumulação): reinvista TUDO. Fase 2 (usufruto): saque só os proventos, nunca o principal.<br>` +
      `• Armadilha comum: perseguir yield de 15%+ — geralmente é empresa/fundo problemático devolvendo seu próprio capital.`;
  }

  if (/ipo|oferta publica|estreia na bolsa/.test(t)) {
    return `<b>IPOs — entrar na estreia vale a pena?</b><br><br>` +
      `• Estatística global e BR: a maioria dos IPOs <b>perde do índice</b> nos primeiros 2 anos — você compra no preço que os vendedores escolheram.<br>` +
      `• O hype do lançamento beneficia quem vende, não quem compra.<br>` +
      `• Estratégia prudente: espere 2–4 trimestres de resultados como empresa listada antes de avaliar.<br>` +
      `• Exceções existem, mas exigem analisar prospecto (500+ páginas) — se você não vai ler, não é sua praia.<br>` +
      `• Flipagem (vender no 1º dia) já foi lucrativa em média, mas as corretoras restringem quem flipa.`;
  }

  if (/stock options|rsu|equity|vesting/.test(t)) {
    return `<b>Stock options e RSUs — equity como remuneração:</b><br><br>` +
      `• <b>Options</b>: direito de comprar ações da empresa a preço fixo (strike). Só valem se a empresa valorizar acima do strike.<br>` +
      `• <b>RSU</b>: ações entregues de graça conforme o vesting — sempre têm valor.<br>` +
      `• <b>Vesting típico</b>: 4 anos com cliff de 1 (nada no 1º ano, depois mensal/trimestral).<br>` +
      `• Risco de concentração: salário + carreira + equity na MESMA empresa. Venda parcelas ao vestir e diversifique.<br>` +
      `• Startups: options podem virar pó (maioria vira) — negocie salário primeiro, equity como upside.<br>` +
      `• IR: RSU de empresa estrangeira gera obrigações de declaração (carnê-leão/GCAP na venda).`;
  }

  if (/crowdfunding|p2p|peer to peer|emprestimo coletivo/.test(t)) {
    return `<b>Investimentos alternativos — P2P e crowdfunding:</b><br><br>` +
      `• <b>P2P lending</b>: você empresta para empresas via plataforma (taxas de 1,5–2,5% a.m.). Risco real de calote — sem FGC!<br>` +
      `• <b>Equity crowdfunding</b>: cotas de startups (regulado pela CVM, Resolução 88). Potencial alto, liquidez zero, mortalidade alta.<br>` +
      `• Regra: máximo 5% do patrimônio somando todos os alternativos, pulverizado em muitas operações.<br>` +
      `• Só plataformas autorizadas pelo BC/CVM — confira no site do regulador.<br>` +
      `• Compare sempre com o CDI: risco muito maior tem que pagar MUITO mais que 100% do CDI para compensar.`;
  }

  // ───────── MORADIA E GRANDES PROJETOS ─────────
  if (/planta|imovel na planta|leilao de imove/.test(t)) {
    return `<b>Imóvel na planta e leilões — oportunidade com armadilhas:</b><br><br>` +
      `<b>Na planta:</b><br>` +
      `• Desconto típico de 15–30% vs pronto, mas: risco de atraso (comum), INCC corrige as parcelas durante a obra (pode surpreender), e distrato custa caro.<br>` +
      `• Pesquise a construtora: obras entregues, reclamações, saúde financeira.<br><br>` +
      `<b>Leilão:</b><br>` +
      `• Descontos de 30–50%, MAS: avalie dívidas do imóvel (condomínio passa ao arrematante!), ocupação (desocupar leva tempo e custo) e edital com advogado.<br>` +
      `• Caixa tem leilões frequentes com financiamento disponível — porta de entrada mais segura.`;
  }

  if (/airbnb|alugar imovel|renda com imovel|investir em imovel/.test(t)) {
    return `<b>Imóvel para renda — a conta honesta:</b><br><br>` +
      `• Aluguel tradicional rende <b>0,3–0,5% a.m.</b> do valor do imóvel — frequentemente menos que o CDI, com muito mais trabalho.<br>` +
      `• Custos que comem o retorno: vacância, condomínio parado, IPTU, manutenção, corretagem, inquilino problemático.<br>` +
      `• <b>Airbnb</b>: pode render 1,5–2× o aluguel tradicional, mas é um NEGÓCIO (limpeza, gestão, sazonalidade, taxas de 15%+).<br>` +
      `• Compare com FIIs: renda mensal isenta de IR, liquidez em 2 dias, diversificação em dezenas de imóveis, zero dor de cabeça.<br>` +
      `• Imóvel físico ganha em: alavancagem barata (financiamento), controle total e valorização em regiões específicas.`;
  }

  if (/energia solar|painel solar/.test(t)) {
    return `<b>Energia solar como investimento:</b><br><br>` +
      `• Payback típico no Brasil: <b>3–5 anos</b>; vida útil dos painéis: 25+ anos — TIR de 15–20% a.a., difícil de bater com baixo risco.<br>` +
      `• Conta de R$ 500/mês → sistema de ~R$ 18–25 mil. Financiamentos específicos têm juros decentes.<br>` +
      `• Valoriza o imóvel e protege contra bandeiras tarifárias e reajustes acima da inflação.<br>` +
      `• Atenção: Lei 14.300 cobra gradualmente o "fio B" — o retorno segue ótimo, mas faça a conta atualizada.<br>` +
      `• Peça 3 orçamentos e confira a homologação na distribuidora + garantia do inversor (peça que mais quebra).`;
  }

  // ───────── IMPOSTO DE RENDA PRÁTICO ─────────
  if (/declarar|declaracao|malha fina|restituicao|carne.leao/.test(t)) {
    return `<b>IR sem medo — guia prático:</b><br><br>` +
      `• <b>Completa vs simplificada</b>: simplificada dá desconto padrão de 20% (teto ~R$ 16 mil); completa vale com muitas deduções (saúde sem limite, educação, dependentes, PGBL).<br>` +
      `• <b>Malha fina — top 3 causas</b>: despesa médica inflada, renda de fonte não declarada (a Receita cruza TUDO), dependente em duas declarações.<br>` +
      `• <b>Restituição</b>: priorize entregar cedo nos primeiros lotes; corrige pela Selic.<br>` +
      `• Investimentos: corretoras enviam informes em março — declare ativo por ativo em Bens e Direitos.<br>` +
      `• <b>Carnê-leão</b>: obrigatório para aluguel recebido de pessoa física e renda do exterior — mensal, não anual.<br>` +
      `• Autônomos: livro-caixa deduz despesas do consultório/atividade.`;
  }

  // ───────── CONCEITOS E ESTRATÉGIA ─────────
  if (/custo de oportunidade|valor do dinheiro no tempo|valor presente/.test(t)) {
    return `<b>Custo de oportunidade — o conceito que muda tudo:</b><br><br>` +
      `• Todo gasto tem um custo invisível: o que esse dinheiro renderia investido.<br>` +
      `• R$ 100/mês de assinatura = ${aiFmt(100 * 12)} por ano = <b>~${aiFmt(23000)}</b> em 10 anos a 1% a.m. que deixaram de existir.<br>` +
      `• Carro de R$ 90 mil vs R$ 50 mil: os R$ 40 mil de diferença virariam ~${aiFmt(132000)} em 10 anos.<br>` +
      `• Aplique a "taxa pessoal": antes de comprar, calcule o valor em 10 anos (multiplique por ~3,3 a 1% a.m.) e pergunte se ainda vale.<br>` +
      `• Não é para nunca gastar — é para gastar SABENDO o preço real da escolha.`;
  }

  if (/lifestyle|inflacao de estilo|padrao de vida|ganho mais e nao sobra/.test(t)) {
    return `<b>Inflação de estilo de vida — o ladrão silencioso:</b><br><br>` +
      `• Sintoma: salário dobrou nos últimos anos, sobra continua zero.<br>` +
      `• Cada aumento vira carro melhor, apartamento maior, restaurante mais caro — e a liberdade nunca chega.<br>` +
      `• Antídoto: <b>congele o padrão por 12 meses a cada aumento</b> — destine 50–100% do acréscimo para investimento ANTES de sentir o dinheiro.<br>` +
      `• Pergunta-filtro: "isso melhora minha vida de verdade ou só sinaliza status?"<br>` +
      `• Quem segura o padrão enquanto a renda cresce aposenta 10–15 anos mais cedo. É o maior hack de enriquecimento que existe.`;
  }

  if (/mba|pos.graduacao|vale a pena estudar|investir em educacao|faculdade/.test(t)) {
    return `<b>Educação como investimento — faça a conta:</b><br><br>` +
      `• ROI educacional = (aumento salarial anual × anos de carreira) − (custo + salário não ganho durante o curso).<br>` +
      `• MBA de R$ 60 mil que gera +R$ 2 mil/mês se paga em 2,5 anos — excelente. O mesmo MBA sem mudança de cargo é consumo, não investimento.<br>` +
      `• Sinal de valor real: empregadores pagam mais POR CAUSA do diploma (pergunte a quem fez, não a quem vende).<br>` +
      `• Alternativas com ROI altíssimo: certificações técnicas (cloud, dados), inglês fluente (+30–50% em muitas áreas), portfólio público.<br>` +
      `• Use Tesouro Educa+ ou IPCA+ para poupar para educação dos filhos com data certa.`;
  }

  if (/minimalismo|frugal|gastar menos e viver|essencialismo/.test(t)) {
    return `<b>Minimalismo financeiro — riqueza é o que você NÃO gasta:</b><br><br>` +
      `• Premissa: cada compra carrega custo de dinheiro + manutenção + espaço + atenção.<br>` +
      `• Teste dos 30 dias: item não essencial vai para uma lista; se em 30 dias ainda fizer sentido, compre.<br>` +
      `• Qualidade > quantidade: 1 item bom que dura 10 anos vence 5 baratos que duram 1.<br>` +
      `• "Comprar experiências, não coisas" tem base científica: a felicidade de bens se adapta rápido; memórias valorizam.<br>` +
      `• Resultado prático: taxa de poupança de 30–50% sem sensação de sacrifício — e cada % a mais antecipa sua liberdade em anos.`;
  }

  if (/sabatico|pausa na carreira|viajar o mundo|morar fora|intercambio/.test(t)) {
    return `<b>Sabático e morar fora — bancando o sonho:</b><br><br>` +
      `• Fundo do sabático = custo mensal no destino × meses × 1,3 (margem) + passagens + seguro + volta (3 meses de colchão para recolocação).<br>` +
      `• Ex.: 6 meses na Europa a R$ 8 mil/mês ≈ <b>R$ 75 mil</b> com folga.<br>` +
      `• Guarde em Tesouro Selic/CDB liquidez — data certa, zero risco.<br>` +
      `• Morar fora: pesquise custo real (Numbeo), visto de trabalho/nômade digital, e mantenha CPF regular + declaração de saída fiscal se for definitivo.<br>` +
      `• Trabalho remoto em real vs custo em euro/dólar: a conta precisa fechar com o câmbio 20% pior que o atual.`;
  }

  // ───────── PERGUNTAS COM NÚMEROS ─────────
  const salMatch = t.match(/ganho\s+(?:r\$\s*)?(\d+[.,]?\d*)\s*(mil)?/);
  if (salMatch && /como (divido|dividir|organizo|organizar|uso)|o que fa[cz]o/.test(t)) {
    let sal = parseFloat(salMatch[1].replace(',', '.'));
    if (salMatch[2]) sal *= 1000;
    return `Com uma renda de <b>${aiFmt(sal)}</b>, a divisão 50/30/20 fica:<br><br>` +
      `• Necessidades (50%): <b>${aiFmt(sal * 0.5)}</b> — moradia, mercado, transporte, saúde<br>` +
      `• Desejos (30%): <b>${aiFmt(sal * 0.3)}</b> — lazer, assinaturas, restaurantes<br>` +
      `• Futuro (20%): <b>${aiFmt(sal * 0.2)}</b> — reserva, investimentos, quitar dívidas<br><br>` +
      `Ordem de prioridade do "futuro": (1) reserva de 6 meses, (2) dívidas caras, (3) investimentos. ` +
      `Configure esses tetos na aba <b>Orçamentos</b> para acompanhar automaticamente.`;
  }

  if (/quanto (devo|preciso) (guardar|poupar|investir)( por m[e]s)?|quanto guardar/.test(t)) {
    const inc = s.income || 5000;
    return `Referências de quanto guardar por mês:<br><br>` +
      `• <b>Mínimo saudável</b>: 10% da renda → ${aiFmt(inc * 0.1)}<br>` +
      `• <b>Padrão recomendado</b>: 20% → ${aiFmt(inc * 0.2)}<br>` +
      `• <b>Acelerado (FIRE)</b>: 30–50% → ${aiFmt(inc * 0.3)} a ${aiFmt(inc * 0.5)}<br><br>` +
      `Sua taxa atual: <b>${s.savingsRate.toFixed(0)}%</b>.<br><br>` +
      `O truque que funciona: transferência automática no dia do salário. O que sobra no fim do mês é o que você NÃO viu primeiro.`;
  }

  if (/como come[cç]o|comecar a investir|primeiro investimento|nunca investi|iniciante/.test(t)) {
    return `<b>Seu primeiro investimento em 5 passos:</b><br><br>` +
      `1. Abra conta em corretora sem taxas (várias grandes são gratuitas).<br>` +
      `2. Comece pelo <b>Tesouro Selic</b> — a partir de ~R$ 150, liquidez diária, risco mínimo. É o "treino" perfeito.<br>` +
      `3. Monte a reserva de 6 meses ali antes de qualquer outra coisa.<br>` +
      `4. Depois diversifique aos poucos: CDB, Tesouro IPCA+, e só então renda variável (ETF é a porta de entrada).<br>` +
      `5. Aporte TODO mês, qualquer valor — o hábito vale mais que a quantia.<br><br>` +
      `Erro de iniciante nº 1: começar por ações/cripto por dica de influencer. Fundação primeiro, emoção depois.`;
  }

  // ───────── BENEFÍCIOS E DIREITOS ─────────
  if (/13o|decimo terceiro|13 salario/.test(t)) {
    return `<b>13º salário — o dinheiro que mais evapora no Brasil:</b><br><br>` +
      `Destino inteligente, em ordem:<br>` +
      `1. Dívidas caras (cartão/cheque especial) — retorno garantido de 10%+ a.m.<br>` +
      `2. Despesas de janeiro (IPVA, IPTU, material escolar) — pagar à vista com desconto.<br>` +
      `3. Reserva de emergência incompleta.<br>` +
      `4. Investimento de longo prazo.<br><br>` +
      `Armadilha clássica: tratar como "dinheiro extra de Natal". Quem investe o 13º todo ano a 1% a.m. acumula <b>${aiFmt((s.income || 5000) * 23)}</b> em 15 anos.`;
  }

  if (/fgts/.test(t)) {
    return `<b>FGTS — seu dinheiro esquecido:</b><br><br>` +
      `• Rende TR + 3% a.a. — <b>perde da inflação</b> na maioria dos anos. Quanto menos parado lá, melhor.<br>` +
      `• <b>Saque-aniversário</b>: libera parte todo ano, mas trava o saque-rescisão por 2 anos se você for demitido. Faça a conta antes.<br>` +
      `• Usos que valem: entrada de imóvel, amortização de financiamento habitacional (a cada 2 anos), doenças graves.<br>` +
      `• A multa de 40% na demissão incide sobre TODO o saldo — mais um motivo para usar o FGTS no imóvel.<br>` +
      `• Consulte saldo no app FGTS — bilhões em contas esquecidas no Brasil.`;
  }

  if (/ferias/.test(t)) {
    return `<b>Férias e dinheiro:</b><br><br>` +
      `• Você recebe salário + 1/3 — use o terço para a viagem e não toque no salário do mês.<br>` +
      `• <b>Vender 10 dias</b> (abono): vale se você tem dívida cara para quitar; não vale por consumo — descanso também é patrimônio.<br>` +
      `• Viagem: defina o orçamento ANTES de escolher o destino (passagem ~40%, hospedagem ~30%, diária ~30%).<br>` +
      `• Fundo de férias: ${aiFmt((s.expense || 4000) * 0.08)} /mês numa caixinha rendendo CDI = viagem anual sem parcelar.<br>` +
      `• Parcelar viagem em 10x é pagar a próxima ainda devendo a anterior — o ciclo que nunca fecha.`;
  }

  // ───────── ARMADILHAS MODERNAS ─────────
  if (/aposta|bet|tigrinho|jogo do|cassino|roleta/.test(t)) {
    return `<b>⚠️ Bets e jogos — matemática sem maquiagem:</b><br><br>` +
      `• A casa SEMPRE tem vantagem estatística — no longo prazo, o retorno esperado é <b>negativo por design</b>.<br>` +
      `• "Estratégias" e "sinais" de Telegram são marketing de afiliados que ganham sobre sua perda.<br>` +
      `• Pesquisas do BC: bilhões/mês saem das famílias brasileiras para bets — dinheiro que era do mercado, do lazer e da poupança.<br>` +
      `• Se for jogar: trate como ingresso de cinema (entretenimento com preço fixo), nunca como renda.<br>` +
      `• Sinais de problema: apostar para recuperar perda, esconder valores, usar crédito. Ajuda gratuita: Jogadores Anônimos.<br><br>` +
      `Os mesmos R$ 200/mês em ETF por 20 anos ≈ <b>${aiFmt(150000)}</b>. A única aposta com odds a seu favor.`;
  }

  if (/cashback|programa de pontos|milhas/.test(t)) {
    return `<b>Cashback e milhas — bônus, não estratégia:</b><br><br>` +
      `• Regra de ouro: só vale se você gastaria de qualquer forma. Gastar para pontuar é desconto de 1% sobre prejuízo de 100%.<br>` +
      `• Milhas: concentre gastos num cartão, transfira com bônus de 80%+ para programas, e use em voos internacionais (maior valor por milha).<br>` +
      `• Venda de milhas: possível, mas costuma render menos que usar bem.<br>` +
      `• Cashback real (dinheiro na conta) > pontos que expiram.<br>` +
      `• Anuidade só se justifica se os benefícios usados superarem o custo — faça a conta anual friamente.`;
  }

  if (/black friday|promocao|desconto|compras online/.test(t)) {
    return `<b>Comprando como um estrategista:</b><br><br>` +
      `• Monitore o preço 2–3 meses antes (Zoom, Buscapé, histórico) — "metade do dobro" ainda existe.<br>` +
      `• Lista fechada ANTES das ofertas: promoção de coisa que você não ia comprar é gasto, não economia.<br>` +
      `• Compare o preço à vista com PIX — desconto de 5–10% costuma vencer parcelado "sem juros".<br>` +
      `• Carrinho abandonado: muitas lojas mandam cupom em 24–48h.<br>` +
      `• Pergunta final antes de pagar: "quantas horas de trabalho isso custa?" (veja sua taxa na aba Saúde Financeira).`;
  }

  if (/crediario|carne|parcelado|parcelar/.test(t)) {
    return `<b>Parcelamento — a inflação pessoal disfarçada:</b><br><br>` +
      `• "Sem juros" embute o custo no preço: à vista quase sempre tem 5–15% de desconto se você pedir.<br>` +
      `• Crediário/carnê: juros de 3–8% a.m. escondidos na parcela "que cabe no bolso". Pergunte sempre o <b>CET total</b>.<br>` +
      `• Regra prática: se precisa parcelar em mais de 3x algo que não é essencial, você ainda não pode comprar.<br>` +
      `• Parcelas comprometem renda FUTURA — some todas: acima de 30% da renda em parcelas é sinal vermelho.<br>` +
      `• Inverta o jogo: "parcele para você mesmo" — guarde a parcela por X meses rendendo e compre à vista com desconto.`;
  }

  // ───────── NEGÓCIOS II ─────────
  if (/contratar|funcionario|equipe|folha de pagamento/.test(t)) {
    return `<b>Quanto custa contratar no Brasil:</b><br><br>` +
      `• CLT custa ao empregador <b>~1,7–1,8× o salário</b>: INSS patronal, FGTS, 13º, férias+1/3, provisões e benefícios.<br>` +
      `• Salário de R$ 3.000 = custo real de ~R$ 5.200/mês.<br>` +
      `• Antes de contratar: a função gera ou libera mais receita do que custa? Se não, automatize ou terceirize.<br>` +
      `• Alternativas para validar: freelancer por projeto, PJ parcial, estagiário (custo menor, ganho social).<br>` +
      `• Erro comum: contratar no pico de demanda e não conseguir sustentar no vale — regra: 3 meses de folha em caixa antes de cada contratação.`;
  }

  if (/marketing|divulgar|atrair cliente|vender mais|instagram/.test(t)) {
    return `<b>Marketing com orçamento enxuto:</b><br><br>` +
      `• Comece onde seu cliente JÁ está — 1 canal bem feito > 5 canais medianos.<br>` +
      `• Orçamento de teste: 5–10% do faturamento; dobre no que der retorno mensurável, corte o resto.<br>` +
      `• <b>Meça CAC por canal</b>: tráfego pago sem medir conversão é doação para plataformas.<br>` +
      `• O mais barato e ignorado: base de clientes atual — reativação, indicação premiada e recompra custam 5× menos que aquisição.<br>` +
      `• Conteúdo orgânico é juro composto de audiência: lento no início, imbatível no longo prazo.`;
  }

  if (/nota fiscal|imposto da empresa|das\b|guia/.test(t)) {
    return `<b>Obrigações fiscais do pequeno negócio:</b><br><br>` +
      `• <b>MEI</b>: DAS fixo mensal (~R$ 70) + declaração anual (DASN) até maio. Só isso.<br>` +
      `• <b>Simples</b>: DAS mensal sobre o faturamento (guia única que junta até 8 impostos).<br>` +
      `• Emita nota de TUDO: sem nota, sem comprovação de receita → crédito negado, problema com Receita e cliente PJ não fecha.<br>` +
      `• Atrasou o DAS? Multa pequena + juros — regularize rápido para não perder o enquadramento.<br>` +
      `• MEI estourando R$ 81 mil/ano: planeje a migração para ME ANTES de estourar (desenquadramento retroativo dói).`;
  }

  // ───────── MÉTODOS DE ORÇAMENTO ─────────
  if (/kakeibo|envelope|orcamento base zero|zero.based|metodo de orcamento/.test(t)) {
    return `<b>Métodos de orçamento além do 50/30/20:</b><br><br>` +
      `• <b>Base zero</b>: todo real recebe um destino antes do mês começar. Renda − alocações = 0. Máximo controle, exige disciplina.<br>` +
      `• <b>Envelopes</b> (físicos ou caixinhas digitais): um valor por categoria; acabou o envelope, acabou o gasto do mês. Brutalmente eficaz contra estouro.<br>` +
      `• <b>Kakeibo</b> (japonês): registre à mão em 4 categorias (essencial, opcional, cultura, extra) + reflexão semanal. Foco em consciência.<br>` +
      `• <b>Pague-se primeiro</b>: investe a meta no dia 1 e vive com o resto — o mais simples que funciona.<br><br>` +
      `Não existe método certo — existe o que VOCÊ sustenta por 12 meses. Teste um por 60 dias.`;
  }

  if (/score|saude financeira|minha nota|pontuacao/.test(t)) {
    const h = computeHealthScore();
    const lbl = healthLabelFor(h.total);
    const weakest = [...h.pillars].sort((a, b) => a.pts - b.pts)[0];
    const tips = {
      'Poupança': 'eleve sua taxa de poupança — pergunte "onde posso economizar?" para um plano de cortes.',
      'Reserva': 'fortaleça a reserva de emergência — pergunte "reserva de emergência" para saber quanto e onde.',
      'Orçamentos': 'há orçamentos estourando — revise os limites na aba Orçamentos ou corte na categoria crítica.',
      'Metas': 'há metas atrasadas — pergunte "minhas metas estão no ritmo?" para recalcular os aportes.',
    };
    return `🎯 <b>Seu Score de Saúde Financeira: ${h.total}/1000 — ${lbl.txt}</b><br><br>` +
      h.pillars.map(p => `• ${p.name}: <b>${p.pts}/250</b>`).join('<br>') +
      `<br><br><b>Maior oportunidade:</b> ${weakest.name} (${weakest.pts}/250) — ${tips[weakest.name]}<br><br>` +
      `Cada ponto conquistado é progresso real: o score recalcula na hora conforme você age.`;
  }

  if (/oi|ola|bom dia|boa tarde|boa noite|hello|eai|e ai/.test(t)) {
    return `Olá! 👋 Sou o FinBot — especialista em finanças pessoais, investimentos e negócios. Analiso seus dados localmente e domino: economia doméstica, dívidas, renda fixa/variável, FIIs, cripto, impostos, financiamentos, empreendedorismo, precificação e muito mais.<br><br>Busco indicadores <b>ao vivo do Banco Central</b> (Selic, CDI, IPCA, dólar). Pergunte "indicadores de hoje" ou peça uma <i>"simulação de 500 por mês por 10 anos a 12% ao ano"</i>.`;
  }

  if (/obrigad|valeu|thanks|show|top|legal/.test(t)) {
    return `De nada! 💪 Estou aqui sempre que precisar. Lembre-se: consistência vence intensidade — pequenas decisões certas todo mês constroem patrimônio.`;
  }

  return `Sou especialista em finanças e negócios. Alguns temas que domino:<br><br>` +
    `💰 <b>Pessoal</b>: "onde economizar?", "resumo", "reserva de emergência", "dividir orçamento", "sair das dívidas", "score de crédito"<br>` +
    `📈 <b>Investimentos</b>: "renda fixa", "ações", "FIIs", "ETFs", "cripto", "dólar", "montar carteira", "aposentadoria", "imposto de renda"<br>` +
    `🏠 <b>Decisões</b>: "financiamento imobiliário", "comprar ou alugar", "carro", "consórcio", "imóvel na planta", "energia solar"<br>👨‍👩‍👧 <b>Vida</b>: "finanças do casal", "filhos", "herança", "seguro de vida", "demissão", "CLT vs PJ", "MBA vale a pena?"<br>🛡️ <b>Proteção</b>: "golpes financeiros", "cheque especial", "consignado", "declarar IR", "malha fina"<br>` +
    `🚀 <b>Negócios</b>: "abrir empresa/MEI", "fluxo de caixa", "precificação", "pró-labore", "CAC e LTV", "validar ideia", "renda extra", "negociar salário"<br>` +
    `🧮 <b>Simulações</b>: "simule 500 por mês por 10 anos a 12% ao ano"<br>📡 <b>Ao vivo</b>: "indicadores de hoje", "quanto está o dólar?", "quanto rende a poupança?"`;
}

function aiAppendMsg(html, who) {
  const box = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-msg ${who}`;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

let aiBusy = false;
function aiSend(e, presetText) {
  if (e) e.preventDefault();
  if (aiBusy) return false;
  const input = document.getElementById('aiInput');
  const text = (presetText || input.value).trim();
  if (!text) return false;
  input.value = '';
  aiAppendMsg(text.replace(/</g, '&lt;'), 'user');

  aiBusy = true;
  const typing = aiAppendMsg('<span class="ai-typing"><span></span><span></span><span></span></span>', 'bot');
  const minDelay = new Promise(res => setTimeout(res, 600 + Math.random() * 600));
  Promise.all([aiAnswer(text), minDelay]).then(([answer]) => {
    typing.innerHTML = answer;
    document.getElementById('aiMessages').scrollTop = 1e9;
    aiBusy = false;
  }).catch(() => {
    typing.innerHTML = 'Tive um problema ao buscar os dados. Tente novamente em instantes.';
    aiBusy = false;
  });
  return false;
}

let aiInited = false;
function initAssistant() {
  renderAiInsights();
  if (aiInited) return;
  aiInited = true;
  const sug = document.getElementById('aiSuggestions');
  if (sug) sug.innerHTML = AI_SUGGESTIONS.map(s =>
    `<button class="ai-chip" onclick="aiSend(null, '${s.replace(/'/g, "\\'")}')">${s}</button>`).join('');
  aiEnsureMarket().then(m => {
    const st = document.querySelector('.ai-status');
    if (st && m.selic !== null) st.innerHTML = '<span class="ai-status-dot"></span>Conectado ao Banco Central · Selic ' + m.selic.toFixed(2).replace('.', ',') + '% a.a.';
  }).catch(() => {});
  Promise.resolve(aiAnswer('olá')).then(msg => aiAppendMsg(msg, 'bot'));
}

// ══════════════════════════════════════════════
//  SCORE DE SAÚDE FINANCEIRA + VIDA EM HORAS
// ══════════════════════════════════════════════
function computeHealthScore() {
  const s = aiSnapshot();
  // 4 pilares de 250 pontos
  const pPoupanca = Math.max(0, Math.min(250, (s.savingsRate / 30) * 250));
  const pReserva  = Math.max(0, Math.min(250, (s.reserveMonths / 6) * 250));
  const okBudgets = budgets.length - s.overBudgets.length - s.warnBudgets.length * 0.5;
  const pOrcam    = budgets.length ? Math.max(0, Math.min(250, (okBudgets / budgets.length) * 250)) : 125;
  const onTrack   = goals.filter(g => goalStatus(g) !== 'late').length;
  const pMetas    = goals.length ? Math.max(0, Math.min(250, (onTrack / goals.length) * 250)) : 125;
  const total = Math.round(pPoupanca + pReserva + pOrcam + pMetas);
  return {
    total,
    pillars: [
      { name: 'Poupança',   pts: Math.round(pPoupanca), color: '#6366f1' },
      { name: 'Reserva',    pts: Math.round(pReserva),  color: '#10b981' },
      { name: 'Orçamentos', pts: Math.round(pOrcam),    color: '#f59e0b' },
      { name: 'Metas',      pts: Math.round(pMetas),    color: '#8b5cf6' },
    ],
  };
}

function healthLabelFor(score) {
  if (score >= 850) return { txt: 'Lendário', color: '#06b6d4' };
  if (score >= 700) return { txt: 'Excelente', color: '#10b981' };
  if (score >= 500) return { txt: 'Bom', color: '#a3e635' };
  if (score >= 300) return { txt: 'Atenção', color: '#f59e0b' };
  return { txt: 'Crítico', color: '#ef4444' };
}

function renderHealthScore() {
  const el = document.getElementById('healthScore');
  if (!el) return;
  const h = computeHealthScore();
  const label = healthLabelFor(h.total);

  // animação do arco (251.3 = comprimento do semicírculo r=80)
  const arc = document.getElementById('healthArc');
  if (arc) {
    const offset = 251.3 * (1 - h.total / 1000);
    arc.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)';
    requestAnimationFrame(() => { arc.style.strokeDashoffset = offset; });
  }
  // contador animado
  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / 1300, 1);
    el.textContent = Math.round((1 - Math.pow(1 - t, 3)) * h.total);
    if (t < 1) requestAnimationFrame(tick);
  })(start);

  const lbl = document.getElementById('healthLabel');
  lbl.textContent = label.txt;
  lbl.style.color = label.color;

  document.getElementById('healthBreakdown').innerHTML = h.pillars.map(p => `
    <div class="hb-row">
      <span class="hb-name">${p.name}</span>
      <div class="hb-bar"><div class="hb-fill" style="width:${(p.pts / 250) * 100}%; background:${p.color}"></div></div>
      <span class="hb-pts">${p.pts}<small>/250</small></span>
    </div>`).join('');
}

function renderLifeHours() {
  const main = document.getElementById('hoursMain');
  if (!main) return;
  const s = aiSnapshot();
  const hourly = (s.income || 1) / 220; // 220h úteis/mês
  const totalH = s.expense / hourly;

  main.innerHTML = `${Math.round(totalH)}h <small>de trabalho/mês para pagar suas despesas</small>`;

  const list = document.getElementById('hoursList');
  list.innerHTML = s.topCats.slice(0, 4).map(([cat, val]) => {
    const hrs = val / hourly;
    return `<div class="hl-row">
      <span>${cat}</span>
      <b>${hrs >= 1 ? Math.round(hrs) + 'h' : Math.round(hrs * 60) + 'min'}</b>
    </div>`;
  }).join('') || '<div class="hl-row"><span>Adicione transações para ver</span></div>';
}

// renderizações ocorrem ao navegar para a página Saúde Financeira

// ══════════════════════════════════════════════
//  MODO CRISE — simulador de sobrevivência
// ══════════════════════════════════════════════
function renderCrisis() {
  const result = document.getElementById('crisisResult');
  if (!result) return;
  const s = aiSnapshot();
  const cutPct = parseInt(document.getElementById('crisisCut').value) || 0;
  document.getElementById('crisisCutLabel').textContent = cutPct + '%';
  const extra = parseFloat(document.getElementById('crisisExtra').value) || 0;

  const reserveGoal = goals.find(g => /reserva|emerg/i.test(g.name));
  const cushion = s.cash + (reserveGoal ? reserveGoal.current : 0);
  const burn = Math.max(0, s.expense * (1 - cutPct / 100) - extra);
  const months = burn > 0 ? cushion / burn : Infinity;

  const lvl = months >= 12 ? { c: '#06b6d4', t: 'Fortaleza', d: 'Você aguenta mais de um ano. Tranquilidade para escolher o próximo passo sem desespero.' }
    : months >= 6 ? { c: '#10b981', t: 'Seguro', d: 'Colchão saudável — tempo de sobra para recolocação na maioria das áreas.' }
    : months >= 3 ? { c: '#f59e0b', t: 'Apertado', d: 'Dá para respirar, mas reforce a reserva assim que possível.' }
    : { c: '#ef4444', t: 'Vulnerável', d: 'Prioridade máxima: construir colchão. Pergunte ao FinBot "onde posso economizar?".' };

  result.innerHTML = `
    <div class="crisis-months" style="--cc:${lvl.c}">
      <div class="cm-num">${months === Infinity ? '∞' : months.toFixed(1).replace('.', ',')}</div>
      <div class="cm-unit">meses de sobrevivência</div>
      <div class="cm-level">${lvl.t}</div>
    </div>
    <div class="crisis-detail">
      <div class="cd-row"><span>Colchão (líquido + reserva)</span><b>${aiFmt(cushion)}</b></div>
      <div class="cd-row"><span>Queima mensal na crise</span><b>${aiFmt(burn)}</b></div>
      <div class="cd-row"><span>Gastos atuais</span><b>${aiFmt(s.expense)}</b></div>
      <p class="cd-note">${lvl.d}</p>
    </div>`;
}

// ══════════════════════════════════════════════
//  ASSINATURAS & RECORRENTES
// ══════════════════════════════════════════════
const defaultSubs = [
  { id: 1, name: 'Netflix',     value: 44.90,  cycle: 'm' },
  { id: 2, name: 'Spotify',     value: 21.90,  cycle: 'm' },
  { id: 3, name: 'Academia',    value: 119.90, cycle: 'm' },
  { id: 4, name: 'iCloud 200GB',value: 14.90,  cycle: 'm' },
];
let subs = Array.isArray(_store.subs) ? _store.subs : defaultSubs;

function subMonthly(sub) { return sub.cycle === 'y' ? sub.value / 12 : sub.value; }

function renderSubs() {
  const list = document.getElementById('subsList');
  if (!list) return;
  const s = aiSnapshot();
  const hourly = (s.income || 1) / 220;
  const totalM = subs.reduce((a, x) => a + subMonthly(x), 0);
  const totalY = totalM * 12;
  // custo de oportunidade: 10 anos investidos a 0,8% a.m.
  let opp = 0;
  for (let m = 0; m < 120; m++) opp = (opp + totalM) * 1.008;

  document.getElementById('subsOverview').innerHTML = `
    <h3 class="subs-summary-title">Resumo</h3>
    <div class="sub-kpi"><div class="sk-label">Total mensal</div><div class="sk-value">${aiFmt(totalM)}</div></div>
    <div class="sub-kpi"><div class="sk-label">Total anual</div><div class="sk-value">${aiFmt(totalY)}</div></div>
    <div class="sub-kpi amber"><div class="sk-label">Horas de trabalho/mês</div><div class="sk-value">${(totalM / hourly).toFixed(1).replace('.', ',')}h</div></div>
    <div class="sub-kpi red">
      <div class="sk-label">Se investido por 10 anos</div>
      <div class="sk-value">${aiFmt(opp)}</div>
      <div class="sk-note">É isso que suas assinaturas custam do seu futuro (0,8% a.m.)</div>
    </div>`;

  list.innerHTML = subs.map(x => `
    <div class="sub-item">
      <div class="sub-avatar">${x.name.slice(0, 2).toUpperCase()}</div>
      <div class="sub-info">
        <div class="sub-name">${x.name}</div>
        <div class="sub-cycle">${x.cycle === 'y' ? 'Anual' : 'Mensal'} · ${(subMonthly(x) / hourly).toFixed(1).replace('.', ',')}h de trabalho/mês</div>
      </div>
      <div class="sub-value">${aiFmt(subMonthly(x))}<small>/mês</small></div>
      <button class="card-del" onclick="deleteSub(${x.id})" title="Remover">✕</button>
    </div>`).join('') ||
    '<div class="subs-empty">Nenhuma assinatura cadastrada. Adicione e descubra quanto elas custam do seu futuro.</div>';
}

function saveSubs() {
  saveStore({ subs });
  Object.assign(_store, { subs });
  if (typeof cloudSave === 'function') cloudSave('subs', subs);
}

function deleteSub(id) {
  subs = subs.filter(x => x.id !== id);
  saveSubs();
  renderSubs();
}

function openSubModal() {
  document.getElementById('subName').value = '';
  document.getElementById('subValue').value = '';
  document.getElementById('subCycle').value = 'm';
  document.getElementById('subModal').classList.add('open');
  setTimeout(() => document.getElementById('subName').focus(), 100);
}
function closeSubModal() {
  document.getElementById('subModal').classList.remove('open');
}
function confirmSub() {
  const name = document.getElementById('subName').value.trim();
  const value = parseFloat(String(document.getElementById('subValue').value).replace(',', '.'));
  const cycle = document.getElementById('subCycle').value;
  if (!name || !value || value <= 0) {
    if (typeof showToast === 'function') showToast('Preencha nome e valor.', 'error');
    return;
  }
  subs.push({ id: Date.now(), name, value, cycle });
  saveSubs();
  renderSubs();
  closeSubModal();
  if (typeof showToast === 'function') showToast('Assinatura adicionada!', 'success');
}

// ══════════════════════════════════════════════
//  DICAS DO SCORE (página Saúde)
// ══════════════════════════════════════════════
function renderHealthTips() {
  const el = document.getElementById('healthTips');
  if (!el) return;
  const h = computeHealthScore();
  const tips = {
    'Poupança':   { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', tip: 'Aumente a sobra mensal: ataque o maior gasto (pergunte ao FinBot "onde posso economizar?") e automatize um aporte no dia do salário.' },
    'Reserva':    { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>', tip: 'Direcione toda renda extra para a reserva até cobrir 6 meses de despesas. Deixe em Tesouro Selic ou CDB com liquidez diária.' },
    'Orçamentos': { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', tip: 'Revise os limites estourados na aba Orçamentos — limites realistas que você cumpre valem mais que metas heroicas que você fura.' },
    'Metas':      { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', tip: 'Recalcule os aportes das metas atrasadas ou alongue prazos — meta atrasada desanima; meta repactuada anda.' },
  };
  el.innerHTML = [...h.pillars].sort((a, b) => a.pts - b.pts).map(p => `
    <div class="ht-row ${p.pts < 125 ? 'weak' : ''}">
      <span class="ht-icon">${tips[p.name].icon}</span>
      <div>
        <b>${p.name} — ${p.pts}/250</b>
        <p>${tips[p.name].tip}</p>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════
//  FLUXO DE CAIXA PROJETADO
// ══════════════════════════════════════════════
const defaultPlan = {
  incomes: [
    { id: 1, name: 'Salário', value: 5000, recur: 'm', month: new Date().toISOString().slice(0, 7) },
  ],
  expenses: [
    { id: 2, name: 'Luz',            value: 180,  recur: 'm', month: new Date().toISOString().slice(0, 7) },
    { id: 3, name: 'Água',           value: 90,   recur: 'm', month: new Date().toISOString().slice(0, 7) },
    { id: 4, name: 'Plano de saúde', value: 420,  recur: 'm', month: new Date().toISOString().slice(0, 7) },
    { id: 5, name: 'Internet',       value: 110,  recur: 'm', month: new Date().toISOString().slice(0, 7) },
  ],
};
let plan = (_store.plan && Array.isArray(_store.plan.incomes)) ? _store.plan : defaultPlan;

function savePlan() {
  saveStore({ plan });
  Object.assign(_store, { plan });
  if (typeof cloudSave === 'function') cloudSave('plan', plan);
}

function cfMonthKey(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}
function cfMonthLabel(key) {
  const [y, m] = key.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`;
}
function cfAppliesTo(entry, monthKey) {
  if (entry.recur === 'u') return entry.month === monthKey;
  return entry.month <= monthKey; // mensal: do mês de início em diante
}

function cfProject() {
  const months = [];
  let acc = parseFloat(_store.profile?.cash) || 0;
  for (let i = 0; i < 12; i++) {
    const key = cfMonthKey(i);
    const inc = plan.incomes.filter(e => cfAppliesTo(e, key)).reduce((a, e) => a + e.value, 0);
    const exp = plan.expenses.filter(e => cfAppliesTo(e, key)).reduce((a, e) => a + e.value, 0);
    acc += inc - exp;
    months.push({ key, label: cfMonthLabel(key), inc, exp, net: inc - exp, acc });
  }
  return months;
}

function cfAdd(e, type) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('.cf-name').value.trim();
  const value = parseFloat(form.querySelector('.cf-value').value);
  const recur = form.querySelector('.cf-recur').value;
  const month = form.querySelector('.cf-month').value;
  if (!name || !value || !month) return false;
  plan[type === 'income' ? 'incomes' : 'expenses'].push({ id: Date.now(), name, value, recur, month });
  savePlan();
  renderPlan();
  form.reset();
  cfSetDefaultMonths();
  if (typeof showToast === 'function') showToast(type === 'income' ? 'Receita adicionada!' : 'Despesa adicionada!', 'success');
  return false;
}

function cfDelete(type, id) {
  plan[type] = plan[type].filter(x => x.id !== id);
  savePlan();
  renderPlan();
}

function cfSetDefaultMonths() {
  document.querySelectorAll('#cashflow .cf-month').forEach(inp => {
    if (!inp.value) inp.value = new Date().toISOString().slice(0, 7);
  });
}

let cfChartInstance = null;
function renderPlan() {
  const kpis = document.getElementById('cfKpis');
  if (!kpis) return;
  const proj = cfProject();
  const cur = proj[0];
  const yearEnd = proj[11];
  const firstNegative = proj.find(p => p.acc < 0);

  kpis.innerHTML = `
    <div class="cf-kpi green"><div class="cfk-label">Receitas (mês atual)</div><div class="cfk-value">${aiFmt(cur.inc)}</div></div>
    <div class="cf-kpi red"><div class="cfk-label">Despesas estimadas (mês atual)</div><div class="cfk-value">${aiFmt(cur.exp)}</div></div>
    <div class="cf-kpi ${cur.net >= 0 ? 'green' : 'red'}"><div class="cfk-label">Saldo do mês</div><div class="cfk-value">${cur.net >= 0 ? '+' : ''}${aiFmt(cur.net)}</div></div>
    <div class="cf-kpi ${yearEnd.acc >= 0 ? 'indigo' : 'red'}">
      <div class="cfk-label">Caixa projetado em 12 meses</div>
      <div class="cfk-value">${aiFmt(yearEnd.acc)}</div>
      ${firstNegative ? `<div class="cfk-warn">⚠ Caixa negativo previsto em ${firstNegative.label}</div>` : ''}
    </div>`;

  const renderList = (arr, type) => arr
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month) || b.value - a.value)
    .map(x => `
    <div class="cf-item">
      <div class="cf-item-info">
        <span class="cf-item-name">${x.name}</span>
        <span class="cf-item-meta">${x.recur === 'm' ? 'Mensal · desde ' : 'Única · em '}${cfMonthLabel(x.month)}</span>
      </div>
      <span class="cf-item-value ${type}">${type === 'income' ? '+' : '−'} ${aiFmt(x.value)}</span>
      <button class="card-del" onclick="cfDelete('${type === 'income' ? 'incomes' : 'expenses'}', ${x.id})" title="Remover">✕</button>
    </div>`).join('') || '<div class="cf-empty">Nenhum lançamento ainda.</div>';

  document.getElementById('cfIncomeList').innerHTML = renderList(plan.incomes, 'income');
  document.getElementById('cfExpenseList').innerHTML = renderList(plan.expenses, 'expense');

  // tabela mês a mês
  document.getElementById('cfTable').innerHTML = `
    <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo do mês</th><th>Caixa acumulado</th></tr></thead>
    <tbody>${proj.map(p => `
      <tr>
        <td>${p.label}</td>
        <td class="positive">+ ${aiFmt(p.inc)}</td>
        <td class="negative">− ${aiFmt(p.exp)}</td>
        <td class="${p.net >= 0 ? 'positive' : 'negative'}">${p.net >= 0 ? '+' : ''} ${aiFmt(p.net)}</td>
        <td style="${p.acc < 0 ? 'color:var(--red);font-weight:800' : 'font-weight:700'}">${aiFmt(p.acc)}</td>
      </tr>`).join('')}</tbody>`;

  // gráfico
  const ctx = document.getElementById('cfChart');
  if (ctx && typeof Chart !== 'undefined') {
    if (cfChartInstance) cfChartInstance.destroy();
    cfChartInstance = new Chart(ctx, {
      data: {
        labels: proj.map(p => p.label),
        datasets: [
          { type: 'bar', label: 'Receitas', data: proj.map(p => p.inc), backgroundColor: 'rgba(16,185,129,.55)', borderRadius: 6 },
          { type: 'bar', label: 'Despesas', data: proj.map(p => p.exp), backgroundColor: 'rgba(239,68,68,.45)', borderRadius: 6 },
          { type: 'line', label: 'Caixa acumulado', data: proj.map(p => p.acc),
            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.08)',
            borderWidth: 2.5, tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y1' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true } },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: R$ ${Math.round(c.parsed.y).toLocaleString('pt-BR')}` } },
        },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(128,128,160,.08)' } },
          y1: { position: 'right', ticks: { color: '#818cf8', font: { size: 10 }, callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }, grid: { display: false } },
        },
      },
    });
  }
}
