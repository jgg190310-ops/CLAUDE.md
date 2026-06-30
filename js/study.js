/* ════════════════════════════════════════════════════════════════════
   StudyOS — estudos & produtividade + StudyBot (IA de estudos)
   Compartilha escopo global com app.js (_store, saveStore, navigateTo,
   cloudSave, showToast, Chart, pageTitles).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  Object.assign(pageTitles, {
    's-dashboard': 'Painel de Estudos',
    's-sessions': 'Sessões & Pomodoro',
    's-goals': 'Matérias & Metas',
    's-bot': 'StudyBot',
    's-tasks': 'Tarefas',
    's-flashcards': 'Flashcards',
    's-schedule': 'Cronograma Semanal',
    's-grades': 'Calculadora de Notas',
    's-notes': 'Anotações',
  });

  // ── modelo de dados ──────────────────────────────────────────────
  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function sData() {
    if (!_store.study) _store.study = {};
    const s = _store.study;
    if (!s.subjects) s.subjects = [];
    if (!s.days) s.days = {};
    if (!s.settings) s.settings = { dailyGoal: 4, pomoDur: 25, breakDur: 5 };
    return s;
  }

  function sPersist() {
    saveStore({ study: _store.study });
    if (typeof cloudSave === 'function') { try { cloudSave('study', _store.study); } catch (e) {} }
  }

  function sToday() {
    const s = sData();
    const k = todayKey();
    if (!s.days[k]) s.days[k] = { sessions: [] };
    return s.days[k];
  }

  function totalMins(sessions) {
    return sessions.reduce((a, x) => a + (x.mins || 0), 0);
  }

  function fmtDur(mins) {
    if (mins < 60) return mins + 'min';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h${m}min` : `${h}h`;
  }

  // ── cores de matérias ────────────────────────────────────────────
  const SUBJ_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#10b981','#06b6d4',
    '#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316',
  ];

  // ── atalhos de duração ───────────────────────────────────────────
  const QUICK_MINS = [15, 25, 45, 60, 90, 120];

  // ── render: Dashboard ────────────────────────────────────────────
  function renderSDashboard() {
    const s = sData();
    const today = sToday();
    const todayMins = totalMins(today.sessions);
    const goalMins = (s.settings.dailyGoal || 4) * 60;
    const pct = Math.min(100, Math.round((todayMins / goalMins) * 100));

    // streak
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const day = s.days[k];
      if (day && totalMins(day.sessions) > 0) streak++;
      else if (i > 0) break;
    }

    // últimos 7 dias para o mini chart
    const last7 = [];
    const last7Labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const day = s.days[k];
      last7.push(day ? Math.round(totalMins(day.sessions) / 60 * 10) / 10 : 0);
      last7Labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
    }

    // sessões recentes (últimas 5)
    const recentAll = [];
    Object.entries(s.days).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).forEach(([k, day]) => {
      (day.sessions || []).forEach(sess => recentAll.push({ ...sess, date: k }));
    });
    recentAll.sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
    const recent = recentAll.slice(0, 5);

    // distribuição por matéria (hoje)
    const subjectMap = {};
    today.sessions.forEach(sess => {
      subjectMap[sess.subject] = (subjectMap[sess.subject] || 0) + (sess.mins || 0);
    });

    const el = document.getElementById('s-dashboard');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 id="sDashGreeting">Painel de Estudos</h1>
          <p class="page-sub">Acompanhe seu desempenho e organize seus estudos.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary-sm" onclick="navigateTo('s-sessions')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Iniciar Sessão
          </button>
        </div>
      </div>

      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Hoje</span>
            <div class="kpi-icon" style="--ic:#6366f1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="kpi-value">${fmtDur(todayMins)}</div>
          <div class="kpi-change ${pct >= 100 ? 'positive' : ''}">${pct}% da meta diária</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Sequência</span>
            <div class="kpi-icon" style="--ic:#f59e0b">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
          </div>
          <div class="kpi-value">${streak} dia${streak !== 1 ? 's' : ''}</div>
          <div class="kpi-change positive">dias consecutivos</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Matérias</span>
            <div class="kpi-icon" style="--ic:#10b981">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
          </div>
          <div class="kpi-value">${s.subjects.length}</div>
          <div class="kpi-change">ativas no momento</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Meta Diária</span>
            <div class="kpi-icon" style="--ic:#06b6d4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
          </div>
          <div class="kpi-value">${s.settings.dailyGoal}h</div>
          <div class="kpi-change">por dia</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-card" style="flex:0 0 220px;min-width:0">
          <div class="chart-card-head">
            <h3>Progresso Hoje</h3>
            <span class="chart-sub">${fmtDur(todayMins)} / ${fmtDur(goalMins)}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:16px 0">
            <div class="s-ring-wrap">
              <canvas id="sDailyRing" width="160" height="160"></canvas>
              <div class="s-ring-center">
                <span class="s-ring-pct">${pct}%</span>
                <span class="s-ring-label">meta</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card wide">
          <div class="chart-card-head">
            <h3>Horas esta semana</h3>
            <span class="chart-sub">últimos 7 dias</span>
          </div>
          <div class="chart-wrap"><canvas id="sWeekChart"></canvas></div>
        </div>

        ${Object.keys(subjectMap).length > 0 ? `
        <div class="chart-card" style="flex:0 0 220px;min-width:0">
          <div class="chart-card-head">
            <h3>Por Matéria</h3>
            <span class="chart-sub">hoje</span>
          </div>
          <div class="chart-wrap"><canvas id="sSubjectPie"></canvas></div>
        </div>` : ''}
      </div>

      <div class="bottom-row">
        <div class="table-card">
          <div class="table-header">
            <h3>Sessões Recentes</h3>
            <button class="btn-sm" onclick="navigateTo('s-sessions')">Ver todas</button>
          </div>
          ${recent.length === 0 ? `<div class="empty-state"><p>Nenhuma sessão registrada.</p></div>` : `
          <table class="data-table">
            <thead><tr><th>Matéria</th><th>Duração</th><th>Data</th></tr></thead>
            <tbody>
              ${recent.map(sess => {
                const subj = s.subjects.find(x => x.name === sess.subject);
                const color = subj ? subj.color : '#6366f1';
                const dateStr = sess.date === todayKey() ? 'Hoje' : new Date(sess.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                return `<tr>
                  <td><span class="s-subj-chip" style="--sc:${color}">${sess.subject}</span></td>
                  <td>${fmtDur(sess.mins || 0)}</td>
                  <td style="color:var(--text-2)">${dateStr}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`}
        </div>

        <div class="alerts-card">
          <div class="table-header"><h3>Dicas de Estudo</h3></div>
          <div class="alert-list" id="sStudyTips">
            ${getStudyTip()}
          </div>
        </div>
      </div>`;

    // greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Bom dia.' : hour < 18 ? 'Boa tarde.' : 'Boa noite.';
    const greetEl = document.getElementById('sDashGreeting');
    if (greetEl) greetEl.textContent = greet;

    drawSCharts(pct, last7, last7Labels, subjectMap, s);
  }

  function getStudyTip() {
    const tips = [
      { type: 'info', title: 'Técnica Pomodoro', desc: '25 minutos de foco + 5 de pausa. Após 4 ciclos, descanse 15-30 min. Aumenta concentração.' },
      { type: 'success', title: 'Repetição Espaçada', desc: 'Revise o conteúdo em intervalos crescentes: 1 dia, 3 dias, 1 semana. Memorização muito mais eficaz.' },
      { type: 'warning', title: 'Active Recall', desc: 'Feche o livro e tente lembrar o que estudou. Esse esforço fortalece a memória muito mais que reler.' },
      { type: 'info', title: 'Sono é estudo', desc: 'Durante o sono o cérebro consolida memórias. Dormir bem após estudar dobra a retenção.' },
      { type: 'success', title: 'Ambiente limpo', desc: 'Celular virado pra baixo, fones com ruído branco. Até 2h de foco profundo > 6h distratido.' },
    ];
    const t = tips[Math.floor(Math.random() * tips.length)];
    return `<div class="alert-item ${t.type}">
      <div class="alert-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div><p class="alert-title">${t.title}</p><p class="alert-desc">${t.desc}</p></div>
    </div>`;
  }

  // ── render: Sessões ──────────────────────────────────────────────
  function renderSSessions() {
    const s = sData();
    const today = sToday();
    const todayMins = totalMins(today.sessions);

    const el = document.getElementById('s-sessions');
    if (!el) return;

    const subjectOptions = s.subjects.length
      ? s.subjects.map(sub => `<option value="${sub.name}">${sub.name}</option>`).join('')
      : '<option value="Geral">Geral</option>';

    el.innerHTML = `
      <div class="page-header">
        <div><h1>Sessões & Pomodoro</h1><p class="page-sub">Registre seu tempo e use o cronômetro.</p></div>
      </div>

      <div class="s-sessions-grid">

        <!-- POMODORO TIMER -->
        <div class="cf-card s-pomo-card">
          <div class="s-pomo-header">
            <h3>Pomodoro</h3>
            <div class="s-pomo-mode-btns">
              <button class="s-mode-btn active" id="sModeWork" onclick="sSetMode('work')">Foco</button>
              <button class="s-mode-btn" id="sModeBreak" onclick="sSetMode('break')">Pausa</button>
              <button class="s-mode-btn" id="sModeLong" onclick="sSetMode('long')">Longa</button>
            </div>
          </div>
          <div class="s-pomo-ring-wrap">
            <svg class="s-pomo-svg" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="var(--border)" stroke-width="8"/>
              <circle cx="100" cy="100" r="88" fill="none" stroke="url(#spomoGrad)" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="552.9" stroke-dashoffset="0"
                id="sPomoArc" style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .5s"/>
              <defs>
                <linearGradient id="spomoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="s-pomo-center">
              <div class="s-pomo-time" id="sPomoTime">25:00</div>
              <div class="s-pomo-label" id="sPomoLabel">Foco</div>
            </div>
          </div>
          <div class="s-pomo-subject">
            <select class="s-select" id="sPomoSubject">${subjectOptions}</select>
          </div>
          <div class="s-pomo-controls">
            <button class="s-pomo-btn s-pomo-reset" onclick="sPomoReset()" title="Reiniciar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
            </button>
            <button class="s-pomo-btn s-pomo-play" id="sPomoPlayBtn" onclick="sPomoToggle()">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" id="sPomoPlayIcon"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <button class="s-pomo-btn s-pomo-skip" onclick="sPomoSkip()" title="Pular">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
          </div>
          <div class="s-pomo-count">
            <span id="sPomoCount">Pomodoros hoje: <b id="sPomodosCount">0</b></span>
          </div>
        </div>

        <!-- ADICIONAR SESSÃO MANUAL -->
        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Adicionar Sessão</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group full">
              <label>Matéria</label>
              <select class="s-select" id="sManualSubject">${subjectOptions}</select>
            </div>
            <div class="form-group">
              <label>Duração (min)</label>
              <input type="number" class="s-input" id="sManualMins" placeholder="45" min="1" max="480"/>
            </div>
            <div class="form-group">
              <label>Data</label>
              <input type="date" class="s-input" id="sManualDate" value="${todayKey()}"/>
            </div>
            <div class="form-group full">
              <label>Notas (opcional)</label>
              <input type="text" class="s-input" id="sManualNotes" placeholder="O que você estudou?"/>
            </div>
          </div>
          <div class="s-quick-chips">
            ${QUICK_MINS.map(m => `<button class="s-quick-chip" onclick="sSetMins(${m})">${fmtDur(m)}</button>`).join('')}
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:12px" onclick="sAddSession()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Registrar Sessão
          </button>

          ${s.subjects.length === 0 ? `<p style="margin-top:12px;font-size:12px;color:var(--text-3)">Crie matérias na aba <a href="#" onclick="navigateTo('s-goals');return false" style="color:var(--indigo)">Matérias & Metas</a> para organizar melhor.</p>` : ''}
        </div>
      </div>

      <!-- SESSÕES DO DIA -->
      <div class="cf-card" style="margin-top:16px">
        <div class="table-header" style="margin-bottom:12px">
          <h3>Sessões de Hoje <span style="color:var(--text-2);font-size:13px;font-weight:400">${fmtDur(todayMins)} total</span></h3>
        </div>
        <div id="sSessionsList">
          ${renderSessionsList(today.sessions, s)}
        </div>
      </div>`;

    // restore pomodoro state
    renderPomoState();
  }

  function renderSessionsList(sessions, s) {
    if (!sessions || sessions.length === 0) {
      return `<div class="empty-state"><p>Nenhuma sessão registrada hoje.</p></div>`;
    }
    return sessions.map((sess, i) => {
      const subj = s.subjects.find(x => x.name === sess.subject);
      const color = subj ? subj.color : '#6366f1';
      return `<div class="cf-li">
        <div class="cf-li-main">
          <span class="s-subj-chip" style="--sc:${color}">${sess.subject}</span>
          ${sess.notes ? `<span class="cf-li-sub">${sess.notes}</span>` : ''}
        </div>
        <div class="cf-li-right">
          <span style="font-weight:700;font-size:14px;color:var(--text-1)">${fmtDur(sess.mins || 0)}</span>
          <button class="cf-del" onclick="sDelSession(${i})" title="Remover">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── render: Matérias & Metas ─────────────────────────────────────
  function renderSGoals() {
    const s = sData();
    const el = document.getElementById('s-goals');
    if (!el) return;

    // calcular horas esta semana por matéria
    const weekMins = {};
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const day = s.days[k];
      if (day) day.sessions.forEach(sess => {
        weekMins[sess.subject] = (weekMins[sess.subject] || 0) + (sess.mins || 0);
      });
    }

    el.innerHTML = `
      <div class="page-header">
        <div><h1>Matérias & Metas</h1><p class="page-sub">Organize o que você estuda e defina metas semanais.</p></div>
        <div class="page-header-actions">
          <button class="btn-primary-sm" onclick="sOpenSubjectForm()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Matéria
          </button>
        </div>
      </div>

      <!-- CONFIG GERAL -->
      <div class="cf-card" style="margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Configurações de Estudo</h3>
        <div class="h-tmb-grid">
          <div class="form-group">
            <label>Meta diária (horas)</label>
            <input type="number" class="s-input" id="sDailyGoal" value="${s.settings.dailyGoal || 4}" min="0.5" max="24" step="0.5"/>
          </div>
          <div class="form-group">
            <label>Duração Pomodoro (min)</label>
            <input type="number" class="s-input" id="sPomoDur" value="${s.settings.pomoDur || 25}" min="5" max="90"/>
          </div>
          <div class="form-group">
            <label>Pausa curta (min)</label>
            <input type="number" class="s-input" id="sBreakDur" value="${s.settings.breakDur || 5}" min="1" max="30"/>
          </div>
        </div>
        <button class="btn-confirm" style="margin-top:10px" onclick="sSaveSettings()">Salvar Configurações</button>
      </div>

      <!-- FORM NOVA MATÉRIA (hidden) -->
      <div class="cf-card" id="sSubjectForm" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Nova Matéria</h3>
        <div class="form-grid-2" style="gap:10px">
          <div class="form-group full"><label>Nome</label><input type="text" class="s-input" id="sSubjName" placeholder="Ex: Matemática"/></div>
          <div class="form-group"><label>Meta semanal (h)</label><input type="number" class="s-input" id="sSubjGoal" placeholder="5" min="0" step="0.5"/></div>
          <div class="form-group"><label>Cor</label>
            <div class="s-color-row" id="sSubjColorRow">
              ${SUBJ_COLORS.map((c, i) => `<button class="s-color-btn ${i === 0 ? 'active' : ''}" data-color="${c}" style="background:${c}" onclick="sPickColor(this)"></button>`).join('')}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-cancel" onclick="sCloseSubjectForm()">Cancelar</button>
          <button class="btn-confirm" onclick="sAddSubject()">Criar Matéria</button>
        </div>
      </div>

      <!-- LISTA DE MATÉRIAS -->
      <div id="sSubjectList">
        ${s.subjects.length === 0 ? `
          <div class="cf-card" style="text-align:center;padding:40px 24px">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" stroke-width="1.4" style="margin-bottom:12px"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            <p style="color:var(--text-2)">Nenhuma matéria criada ainda.<br>Crie uma para organizar seus estudos.</p>
          </div>` :
          s.subjects.map((subj, i) => {
            const done = weekMins[subj.name] || 0;
            const goalMin = (subj.weeklyGoal || 5) * 60;
            const pct = Math.min(100, Math.round((done / goalMin) * 100));
            return `
            <div class="cf-card s-subject-card" style="margin-bottom:12px;border-left:3px solid ${subj.color}">
              <div class="cf-li" style="margin-bottom:8px">
                <div class="cf-li-main">
                  <span style="font-weight:700;font-size:15px;color:${subj.color}">${subj.name}</span>
                  <span class="cf-li-sub">Meta: ${subj.weeklyGoal || 5}h/semana</span>
                </div>
                <div class="cf-li-right">
                  <span style="font-size:13px;color:var(--text-2)">${fmtDur(done)} esta semana</span>
                  <button class="cf-del" onclick="sDelSubject(${i})">✕</button>
                </div>
              </div>
              <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${subj.color};border-radius:4px;transition:width .4s"></div>
              </div>
              <div style="font-size:12px;color:var(--text-3);margin-top:4px">${pct}% da meta semanal</div>
            </div>`;
          }).join('')
        }
      </div>`;
  }

  // ── render: StudyBot ─────────────────────────────────────────────
  function renderSBot() {
    const el = document.getElementById('s-bot');
    if (!el) return;
    if (el.querySelector('.ai-chat-card')) return; // já montado

    el.innerHTML = `
      <div class="ai-chat-card">
        <div class="ai-chat-messages" id="sbMessages">
          <div class="ai-msg bot">
            <p><strong>StudyBot aqui!</strong> Sou sua IA especialista em técnicas de estudo, produtividade e aprendizagem.</p>
            <p>Posso te ajudar com:</p>
            <ul style="margin:8px 0 0 16px;line-height:2">
              <li>Técnica Pomodoro e gestão de tempo</li>
              <li>Repetição espaçada e active recall</li>
              <li>Como memorizar melhor</li>
              <li>Preparação para provas</li>
              <li>Foco e combate à procrastinação</li>
            </ul>
          </div>
        </div>
        <div class="ai-suggestions" id="sbSuggestions">
          <button class="ai-chip" onclick="sbSend(null,'Como usar o Pomodoro?')">Como usar o Pomodoro?</button>
          <button class="ai-chip" onclick="sbSend(null,'O que é active recall?')">Active recall</button>
          <button class="ai-chip" onclick="sbSend(null,'Como memorizar mais rápido?')">Como memorizar mais?</button>
          <button class="ai-chip" onclick="sbSend(null,'Dicas para provas')">Dicas para provas</button>
          <button class="ai-chip" onclick="sbSend(null,'Como parar de procrastinar?')">Parar de procrastinar</button>
          <button class="ai-chip" onclick="sbSend(null,'Como vencer a ansiedade na prova?')">Ansiedade na prova</button>
          <button class="ai-chip" onclick="sbSend(null,'Qual o melhor horário para estudar?')">Melhor horário</button>
        </div>
        <div class="ai-input-row">
          <input type="text" class="ai-input" id="sbInput" placeholder="Pergunte sobre estudos..."
            onkeydown="if(event.key==='Enter')sbSend(event)"/>
          <button class="ai-send-btn" onclick="sbSend(event)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>`;
  }

  // ── StudyBot IA ──────────────────────────────────────────────────
  function sbAnswer(q) {
    const t = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    if (/pomodoro|tecnica|25.?min|ciclo/.test(t))
      return `<p><strong>Técnica Pomodoro</strong></p>
<p>Criada por Francesco Cirillo, é simples e muito eficaz:</p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li>Escolha uma tarefa</li>
  <li>Estude por <b>25 minutos</b> sem interrupções</li>
  <li>Descanse <b>5 minutos</b></li>
  <li>Após 4 ciclos, faça uma pausa longa de <b>15–30 min</b></li>
</ol>
<p style="margin-top:8px">Use o temporizador no StudyOS para cronometrar automaticamente!</p>`;

    if (/repeti|espacad|intervalo|anki/.test(t))
      return `<p><strong>Repetição Espaçada</strong></p>
<p>Em vez de revisar todo dia, você revisa em intervalos crescentes:</p>
<p><b>Dia 1 → Dia 3 → Dia 7 → Dia 21 → Dia 60</b></p>
<p style="margin-top:8px">O cérebro consolida melhor quando precisa "buscar" a memória. Ferramentas como <b>Anki</b> automatizam esse processo com flashcards.</p>`;

    if (/memoriz|lembr|guardar|retencao|retençao/.test(t))
      return `<p><strong>Como memorizar mais rápido:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Active recall:</b> feche o livro e tente lembrar</li>
  <li><b>Ensine o conteúdo</b> (Técnica Feynman)</li>
  <li><b>Associe a imagens</b> ou histórias bizarras</li>
  <li><b>Revisite antes de dormir</b> — o sono consolida a memória</li>
  <li><b>Exercícios físicos</b> aumentam BDNF, proteína da memória</li>
</ul>`;

    if (/prova|concurs|vestibular|enem|exam/.test(t) && !/ansiedade|nervos|branco|panico|pânico|trava/.test(t))
      return `<p><strong>Preparação para provas:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Comece a revisar <b>2 semanas antes</b>, não na véspera</li>
  <li>Resolva <b>provas anteriores</b> — simula o ambiente real</li>
  <li>Identifique seus pontos fracos e foque neles</li>
  <li>Na véspera: revisão leve, dorme cedo, come bem</li>
  <li>Na hora: leia tudo primeiro, responda o que sabe</li>
</ul>`;

    if (/foco|concentra|distrai|celular|redes/.test(t))
      return `<p><strong>Técnicas de foco:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Celular em <b>modo avião</b> ou em outro cômodo</li>
  <li>Use fones com <b>ruído branco</b> ou lofi</li>
  <li>Defina <b>horários fixos</b> de estudo — cria hábito automático</li>
  <li>Ambiente limpo = mente limpa</li>
  <li>Notifique as pessoas que você não será perturbado</li>
</ul>`;

    if (/procrast|enrolar|preguic|motivation|motivac/.test(t))
      return `<p><strong>Vença a procrastinação:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Regra dos 2 minutos:</b> se leva menos de 2 min, faça agora</li>
  <li><b>Quebre em micro-tarefas:</b> "estudar química" → "ler página 42"</li>
  <li>Comece com <b>5 minutos</b> — o começo é o pior</li>
  <li>Remova todas as distrações do ambiente antes</li>
  <li>Recompense-se após completar um bloco</li>
</ul>`;

    if (/sono|dormir|descanso|cansad/.test(t))
      return `<p><strong>Sono e estudos:</strong></p>
<p>Durante o sono, especialmente na fase REM, o cérebro <b>consolida memórias</b> e descarta informações irrelevantes.</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Durma <b>7–9 horas</b> por noite</li>
  <li>Estudar antes de dormir melhora a retenção</li>
  <li>Evite telas 1h antes de dormir (luz azul atrapalha)</li>
  <li>Cochilos de <b>20 min</b> restauram foco sem gerar inércia</li>
</ul>`;

    if (/horario|plano|cronograma|organiz|rotina/.test(t) && !/melhor horario|melhor horário|manha ou noite|manhã ou noite|quando estudar|de manha|de noite|madrugada/.test(t))
      return `<p><strong>Como montar um cronograma de estudos:</strong></p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li>Liste todas as matérias/tópicos</li>
  <li>Classifique por dificuldade e importância</li>
  <li>Aloque horários fixos por semana para cada uma</li>
  <li>Comece sempre pelas matérias mais difíceis (energia alta)</li>
  <li>Reserve 1 dia para revisão geral</li>
</ol>
<p style="margin-top:8px">No StudyOS, crie suas matérias e defina metas semanais de horas!</p>`;

    if (/feynman|explica|professor|ensina/.test(t))
      return `<p><strong>Técnica Feynman</strong></p>
<p>Richard Feynman (Nobel de Física) usava isso:</p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li>Escolha um conceito e estude</li>
  <li>Explique como se fosse para <b>uma criança de 12 anos</b></li>
  <li>Onde você travar, volte e estude mais</li>
  <li>Simplifique e use analogias</li>
</ol>
<p style="margin-top:8px">Se você não consegue explicar simplesmente, não entendeu ainda. Ensinar é a melhor prova de aprendizado.</p>`;

    if (/mapa mental|mindmap|visual|esquema/.test(t))
      return `<p><strong>Mapas Mentais:</strong></p>
<p>Ótimos para conectar conceitos e ter uma visão geral do assunto.</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Coloque o tema central no meio</li>
  <li>Adicione ramos para subtópicos</li>
  <li>Use cores diferentes por área</li>
  <li>Adicione imagens e símbolos — memória visual é poderosa</li>
</ul>
<p style="margin-top:8px">Apps úteis: <b>MindNode, XMind, Miro</b>. Papel e caneta colorida também funcionam bem!</p>`;

    if (/active recall|recall|testar|flash/.test(t))
      return `<p><strong>Active Recall — o método mais eficaz:</strong></p>
<p>Em vez de reler passivamente, <b>feche o material e tente lembrar</b>. Esse esforço de recuperação fortalece a memória muito mais.</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Leia um trecho, feche e escreva tudo que lembrou</li>
  <li>Crie <b>flashcards</b> com perguntas sobre o conteúdo</li>
  <li>Responda exercícios sem olhar as respostas primeiro</li>
  <li>Explique o conteúdo em voz alta</li>
</ul>`;

    if (/quanto|horas|tempo|dia|semana/.test(t))
      return `<p><strong>Quanto tempo estudar por dia?</strong></p>
<p>Depende do seu objetivo, mas estudos mostram:</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Manutenção:</b> 1–2h/dia com qualidade</li>
  <li><b>Crescimento:</b> 3–4h/dia focadas</li>
  <li><b>Concurso/vestibular:</b> 6–8h/dia com pausas</li>
</ul>
<p style="margin-top:8px">Qualidade supera quantidade. <b>4h de foco profundo &gt; 8h distraído</b>. Use o Pomodoro para manter a intensidade.</p>`;

    if (/memoria|memorizar|lembrar/.test(t))
      return `<p><strong>Técnicas de memória avançadas:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Repetição espaçada:</b> revise em intervalos crescentes (1→3→7→21→60 dias)</li>
  <li><b>Active recall:</b> feche o material e tente lembrar — o esforço fortalece a memória</li>
  <li><b>Palácio da memória:</b> associe conceitos a locais de um lugar que você conhece bem</li>
  <li><b>Método de ligação:</b> crie histórias absurdas conectando as informações</li>
  <li><b>Chunking:</b> agrupe informações em blocos menores (como memorizar um CPF em blocos)</li>
</ul>
<p style="margin-top:8px">A memória é como um músculo — quanto mais você a exercita com recuperação ativa, mais forte fica.</p>`;

    if (/leitura|ler/.test(t))
      return `<p><strong>Leitura eficiente — método SQ3R:</strong></p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li><b>Survey (panorama):</b> leia títulos, subtítulos e resumos</li>
  <li><b>Question (perguntas):</b> transforme os títulos em perguntas</li>
  <li><b>Read (leitura):</b> leia buscando responder as perguntas</li>
  <li><b>Recite (recite):</b> feche e responda as perguntas de memória</li>
  <li><b>Review (revisão):</b> revise os pontos que errou</li>
</ol>
<p style="margin-top:8px"><b>Speed reading:</b> use um dedo como guia, evite reler, expanda o campo visual. Foco na compreensão, não na velocidade!</p>`;

    if (/matematica|math|calculo|algebra/.test(t))
      return `<p><strong>Como estudar matemática de verdade:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Entenda, não decore:</b> busque o "porquê" de cada fórmula</li>
  <li><b>Resolva muitos exercícios:</b> matemática se aprende fazendo, não lendo</li>
  <li><b>Errou? Ótimo!</b> Analise o erro antes de ver a resposta</li>
  <li><b>Progrida em dificuldade:</b> domine o básico antes do avançado</li>
  <li><b>Escreva à mão:</b> escrever fórmulas reforça a memória motora</li>
</ul>
<p style="margin-top:8px">Recursos: <b>Khan Academy</b> (gratuito), <b>YouTube 3Blue1Brown</b> para entendimento visual, <b>Wolfram Alpha</b> para checar respostas.</p>`;

    if (/idioma|lingua|ingles|ingles|frances|espanhol/.test(t))
      return `<p><strong>Aprender idiomas de forma eficaz:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Imersão diária:</b> troque o idioma do celular, assista séries sem legenda</li>
  <li><b>Método comprehensible input (Krashen):</b> consuma conteúdo um nível acima do seu</li>
  <li><b>Flashcards com Anki:</b> vocabulário com repetição espaçada</li>
  <li><b>Shadowing:</b> repita em voz alta junto com nativos (podcasts, vídeos)</li>
  <li><b>Output:</b> fale e escreva desde o início — apps como Tandem, HelloTalk</li>
</ul>
<p style="margin-top:8px">Consistência bate intensidade: <b>30 min/dia todos os dias</b> supera 3h/semana. 🗣️</p>`;

    if (/concurso|concursos/.test(t))
      return `<p><strong>Preparação para concursos públicos:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Análise do edital:</b> mapeie todas as matérias e pesos</li>
  <li><b>Resolução de questões anteriores:</b> é o método mais eficiente — estude pelo gabarito</li>
  <li><b>Ciclo de revisões:</b> revise semanalmente o que estudou</li>
  <li><b>Simule provas:</b> faça simulados cronometrados para treinar pressão</li>
  <li><b>Foco nas matérias de maior peso:</b> Português e Matemática geralmente valem mais</li>
  <li><b>Não negligencie saúde:</b> sono, exercício e alimentação impactam diretamente o rendimento</li>
</ul>
<p style="margin-top:8px">Média de aprovação: 1-2 anos de estudo consistente. Use o StudyOS para rastrear suas horas! 🏆</p>`;

    if (/cornell|anota|caderno|fazer resumo|resumir|resumo/.test(t))
      return `<p><strong>Anotações que funcionam — método Cornell:</strong></p>
<p>Divida a página em 3 áreas:</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Coluna direita (notas):</b> anote durante a aula/leitura</li>
  <li><b>Coluna esquerda (pistas):</b> depois, escreva perguntas-chave sobre as notas</li>
  <li><b>Rodapé (resumo):</b> sintetize tudo em 2-3 frases com suas palavras</li>
</ul>
<p style="margin-top:8px">Para revisar: tampe as notas e responda às perguntas da coluna esquerda — vira active recall automático. <b>Não copie tudo</b>: anote com suas palavras, senão é só transcrição passiva.</p>`;

    if (/intercal|interleav|alternar materia|alternar matéria|misturar materia|variar/.test(t))
      return `<p><strong>Interleaving — alternar em vez de blocar:</strong></p>
<p>Em vez de estudar 3h só de um assunto, <b>intercale</b> tópicos/tipos de problema na mesma sessão.</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Treina o cérebro a <b>escolher a estratégia certa</b>, não só repetir</li>
  <li>Parece mais difícil — e é por isso que funciona (dificuldade desejável)</li>
  <li>Ótimo para matemática, física e questões de concurso</li>
</ul>
<p style="margin-top:8px">Ex.: bloco de 90 min = 30 min de cada uma de 3 matérias relacionadas, não 90 min de uma só.</p>`;

    if (/deep work|trabalho profundo|imersao|imersão|flow|estado de fluxo/.test(t))
      return `<p><strong>Deep Work — foco profundo (Cal Newport):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Blocos de <b>60-90 min</b> sem nenhuma interrupção — é onde o aprendizado real acontece</li>
  <li><b>Ritual fixo:</b> mesmo lugar, mesmo horário, celular longe — o cérebro entra em modo foco mais rápido</li>
  <li>Elimine o "switching": cada interrupção custa ~20 min para recuperar a concentração</li>
  <li>Comece com 2 blocos/dia e aumente gradualmente</li>
</ul>
<p style="margin-top:8px">1 hora de deep work vale por 3 horas fragmentadas. Proteja esse tempo como sagrado.</p>`;

    if (/ansiedade|branco|nervos|panico|pânico|trava na prova|deu branco/.test(t))
      return `<p><strong>Ansiedade e "deu branco" na prova:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Respiração 4-7-8</b> antes e durante: acalma o sistema nervoso em segundos</li>
  <li><b>Comece pelas questões fáceis:</b> acertos iniciais destravam a memória e dão confiança</li>
  <li><b>Deu branco?</b> Pule, respire, volte depois — a informação costuma reaparecer</li>
  <li><b>Simulados cronometrados</b> dessensibilizam a pressão: a prova vira "mais um treino"</li>
  <li>Sono e alimentação na véspera importam mais que virar a noite</li>
</ul>
<p style="margin-top:8px">Um pouco de ansiedade é normal e até ajuda. Ela só atrapalha quando vira pânico — e treino reduz isso. 💪</p>`;

    if (/tdah|tda|deficit de atencao|déficit de atenção|hiperativ|nao consigo focar|não consigo focar/.test(t))
      return `<p><strong>Foco para mente dispersa (estilo TDAH):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Pomodoros curtos</b> (15-20 min) em vez de 25 — ajuste ao seu limite real</li>
  <li><b>Externalize tudo:</b> listas, lembretes, timers visíveis — não confie na memória de trabalho</li>
  <li><b>Body doubling:</b> estude junto com alguém (presencial ou online) aumenta a responsabilização</li>
  <li><b>Movimento ajuda:</b> caminhar antes ou estudar em pé melhora o foco</li>
  <li><b>Recompensas imediatas:</b> o cérebro responde melhor a ganhos próximos do que a metas distantes</li>
</ul>
<p style="margin-top:8px">⚠️ Dificuldade persistente de foco merece avaliação profissional — estratégia certa muda tudo.</p>`;

    if (/musica|música|lofi|barulho|ruido branco|ruído branco|som pra estudar|playlist/.test(t))
      return `<p><strong>Música para estudar — o que a ciência diz:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Sem letra</b> para tarefas que exigem leitura/raciocínio — letra compete com a linguagem</li>
  <li><b>Lofi, clássico, ambient ou ruído branco</b> ajudam a maioria</li>
  <li><b>Sons da natureza</b> (chuva, café) mascaram distrações sem prender atenção</li>
  <li>Para tarefas mecânicas/repetitivas, música animada com letra pode até motivar</li>
</ul>
<p style="margin-top:8px">Teste o que funciona pra você — alguns rendem mais em silêncio total. O importante é a consistência do ambiente.</p>`;

    if (/melhor horario|melhor horário|manha ou noite|manhã ou noite|de manha|de noite|madrugada|quando estudar/.test(t))
      return `<p><strong>Qual o melhor horário para estudar?</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Manhã:</b> mente descansada, ótima para conteúdo novo e difícil (matemática, teoria)</li>
  <li><b>Tarde:</b> boa para prática, exercícios e revisão</li>
  <li><b>Noite:</b> revisar antes de dormir ajuda a consolidar na memória</li>
  <li>Respeite seu <b>cronotipo:</b> não force madrugada se você rende de manhã</li>
</ul>
<p style="margin-top:8px">Estude o mais difícil quando sua energia está no pico. Vire a noite só em último caso — sono perdido derruba a retenção.</p>`;

    if (/burnout|esgota|cansaco mental|cansaço mental|sobrecarreg|exaust|nao aguento mais|não aguento mais/.test(t))
      return `<p><strong>Evitando o burnout nos estudos:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Pausas reais:</b> sem tela — caminhe, alongue, olhe pra longe (regra 20-20-20)</li>
  <li><b>1 dia de folga/semana:</b> descanso faz parte do método, não é preguiça</li>
  <li><b>Sono inegociável:</b> estudar exausto é jogar tempo fora — a retenção despenca</li>
  <li><b>Metas realistas:</b> 4h de foco real &gt; 10h se arrastando</li>
  <li><b>Movimento e sol</b> recarregam mais que "mais uma hora de estudo"</li>
</ul>
<p style="margin-top:8px">Consistência sustentável vence sprints heroicos seguidos de colapso. Maratona, não tiro de 100m. 🌱</p>`;

    if (/meta|smart|objetivo|planejar metas/.test(t))
      return `<p><strong>Metas de estudo que funcionam (SMART):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>S</b>pecífica: "resolver 30 questões de física", não "estudar física"</li>
  <li><b>M</b>ensurável: dá pra contar se cumpriu</li>
  <li><b>A</b>tingível: desafiadora mas possível</li>
  <li><b>R</b>elevante: ligada ao seu objetivo maior</li>
  <li><b>T</b>emporal: com prazo ("até sexta")</li>
</ul>
<p style="margin-top:8px">Foque em <b>metas de processo</b> ("estudar 1h30 hoje") mais que de resultado ("passar") — você controla o processo. No StudyOS, defina horas semanais por matéria! 🎯</p>`;

    if (/exercicio|exercício|atividade fisica|atividade física|cerebro|cérebro|caminhar/.test(t))
      return `<p><strong>Exercício turbina o cérebro:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Atividade física aumenta o <b>BDNF</b> — a "proteína do crescimento" dos neurônios</li>
  <li>Melhora memória, foco, humor e reduz ansiedade</li>
  <li><b>Caminhada de 20 min</b> antes de estudar já melhora a concentração</li>
  <li>Exercício após estudar ajuda a consolidar o que aprendeu</li>
</ul>
<p style="margin-top:8px">Corpo e mente são o mesmo sistema: quem treina, estuda melhor. 🏃</p>`;

    if (/ola|oi|olá|tudo|bom dia|boa tarde|boa noite|opa|eai|e ai/.test(t))
      return `<p>Olá! Pronto para estudar mais e melhor? 📚</p>
<p>Posso te ajudar com técnicas (Pomodoro, active recall, Feynman, Cornell), memorização, foco, procrastinação, ansiedade de prova, montar cronograma, idiomas, redação, concursos e muito mais. Toque numa sugestão ou pergunte à vontade!</p>`;

    if (/obrigad|valeu|thanks|show|top|legal|ajudou/.test(t))
      return `<p>Por nada! 🙌 Lembre: <b>esforço de recuperação &gt; releitura passiva</b>, e constância vence intensidade. Bons estudos!</p>`;

    if (/mnemonic|mnemônic|acrostic|acróstic|sigla|decoreba|lei seca|decorar lei/.test(t))
      return `<p><strong>Mnemônicos e decoreba inteligente:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Acrônimos:</b> monte uma palavra com as iniciais (ex.: "PEMDAS" para ordem de operações)</li>
  <li><b>Acrósticos:</b> crie uma frase boba onde cada palavra puxa a informação</li>
  <li><b>Rimas e ritmo:</b> o cérebro guarda melhor o que tem som e cadência</li>
  <li><b>Histórias absurdas:</b> quanto mais bizarra a imagem, mais ela gruda</li>
  <li>Para <b>lei seca</b>: transforme artigos em flashcards e use repetição espaçada — decoreba sem revisão evapora</li>
</ul>
<p style="margin-top:8px">Mnemônico é atalho de codificação, mas só a <b>recuperação ativa repetida</b> fixa de verdade.</p>`;

    if (/palacio da memoria|palácio da memória|loci|memory palace/.test(t))
      return `<p><strong>Palácio da Memória (método de loci):</strong></p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li>Escolha um lugar que conhece bem (sua casa, o trajeto ao trabalho)</li>
  <li>Defina uma <b>rota fixa</b> com pontos de parada (porta, sofá, geladeira...)</li>
  <li>"Coloque" cada informação num ponto, como uma imagem vívida e exagerada</li>
  <li>Para lembrar, <b>caminhe mentalmente</b> pela rota e colete as imagens</li>
</ol>
<p style="margin-top:8px">Campeões de memória usam isso para decorar centenas de itens em ordem. Funciona porque o cérebro é ótimo com <b>espaço e imagens</b>. 🏛️</p>`;

    if (/formula|fórmula|equacao|equação/.test(t))
      return `<p><strong>Como memorizar fórmulas (sem decoreba cega):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Entenda a derivação:</b> saber de onde vem a fórmula faz você reconstruí-la se esquecer</li>
  <li><b>Use muito em exercícios:</b> a repetição na prática fixa melhor que olhar a folha</li>
  <li><b>Folha de fórmulas ativa:</b> escreva de memória, depois confira o que faltou</li>
  <li><b>Conecte ao significado:</b> cada variável representa algo real, não é só letra</li>
  <li><b>Flashcards:</b> frente = situação, verso = fórmula a aplicar</li>
</ul>
<p style="margin-top:8px">Fórmula entendida raramente é esquecida; fórmula decorada some na pressão da prova.</p>`;

    if (/curva do esquecimento|ebbinghaus|esquecer|esqueco|esqueço rapido|esqueço rápido/.test(t))
      return `<p><strong>Curva do esquecimento (Ebbinghaus):</strong></p>
<p>Sem revisão, você esquece <b>~50-80% do conteúdo em 1-2 dias</b>. A boa notícia: cada revisão achata a curva.</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Revise <b>no mesmo dia</b>, depois em 1, 3, 7 e 21 dias</li>
  <li>Cada revisão deixa a memória mais duradoura e exige menos esforço</li>
  <li>Revisar com <b>active recall</b> (sem olhar) é o que realmente trava a curva</li>
</ul>
<p style="margin-top:8px">Não é que você "tem memória ruim" — é que ninguém revisou no momento certo. Sistematize! 📉</p>`;

    if (/pratica deliberada|prática deliberada|deliberate practice/.test(t))
      return `<p><strong>Prática deliberada — como os experts treinam:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Saia da zona de conforto:</b> treine o que você ainda NÃO domina, não o que já sabe</li>
  <li><b>Foco total:</b> sessões curtas e intensas valem mais que horas no automático</li>
  <li><b>Feedback imediato:</b> corrija o erro na hora, não acumule vícios</li>
  <li><b>Decomponha a habilidade:</b> isole a parte fraca e treine só ela</li>
  <li><b>Repita com ajuste:</b> não é repetir igual, é repetir melhorando</li>
</ul>
<p style="margin-top:8px">Não são "10 mil horas" quaisquer — são horas de prática deliberada e desconfortável. 🎯</p>`;

    if (/fichament|ficha de leitura|ficha de estudo/.test(t))
      return `<p><strong>Fichamento que serve para revisar:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cabeçalho:</b> autor, obra, página — para citar depois</li>
  <li><b>Fichamento de citação:</b> trecho literal entre aspas (use com parcimônia)</li>
  <li><b>Fichamento de resumo:</b> a ideia do trecho com <b>suas palavras</b></li>
  <li><b>Fichamento de comentário:</b> sua análise crítica e conexões</li>
</ul>
<p style="margin-top:8px">O ouro está no resumo com suas palavras — copiar literalmente é passivo e não fixa. Termine cada ficha com uma <b>pergunta-chave</b> para virar active recall.</p>`;

    if (/grifar|grif|marca texto|marca-texto|sublinha|destacar texto/.test(t))
      return `<p><strong>Grifar do jeito certo (a maioria erra):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Leia o parágrafo todo antes</b> de grifar — só então você sabe o que importa</li>
  <li>Grife <b>no máximo 10-20%</b>: página toda amarela = nada destacado</li>
  <li>Marque <b>palavras-chave</b>, não frases inteiras</li>
  <li>Grifar é passivo: depois, <b>transforme os grifos em perguntas</b> e responda de memória</li>
</ul>
<p style="margin-top:8px">Grifar dá sensação de produtividade, mas sozinho ensina pouco. O aprendizado vem do que você faz <b>depois</b> com os grifos. 🖍️</p>`;

    if (/regra dos 2 minutos|regra dos dois minutos|2 minutos|dois minutos/.test(t))
      return `<p><strong>Regra dos 2 minutos:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Versão produtividade:</b> se a tarefa leva menos de 2 min, faça AGORA — não anote, não adie</li>
  <li><b>Versão hábito:</b> reduza o início a 2 min ("abrir o livro", "ler 1 página") — vencer a inércia é o difícil</li>
  <li>Começar pequeno destrava: depois de iniciar, continuar é fácil</li>
  <li>Encadeie 2 min com o ambiente já preparado (livro aberto, celular longe)</li>
</ul>
<p style="margin-top:8px">A barreira quase nunca é a tarefa — é o começo. Encolha o começo e o resto flui. ⏱️</p>`;

    if (/redacao|redação|dissertacao|dissertação|nota 1000|escrever bem|argumenta/.test(t))
      return `<p><strong>Redação nota 1000 (modelo ENEM):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Estrutura:</b> introdução (tese) + 2 desenvolvimentos (argumentos) + conclusão (proposta de intervenção)</li>
  <li><b>Proposta de intervenção:</b> precisa ter agente, ação, meio, finalidade e detalhamento</li>
  <li><b>Repertório legitimado:</b> cite dados, leis, filósofos, fatos históricos — não opinião solta</li>
  <li><b>Conectivos</b> entre parágrafos garantem coesão</li>
  <li><b>Treine cronometrado</b> (1 redação/semana) e peça correção pelas 5 competências</li>
</ul>
<p style="margin-top:8px">Respeite os direitos humanos na proposta — desrespeitá-los zera a redação. ✍️</p>`;

    if (/simulad|prova simulada|mock/.test(t))
      return `<p><strong>Simulados — seu melhor termômetro:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cronometre de verdade:</b> mesmo tempo e condições da prova real</li>
  <li><b>Faça periodicamente:</b> 1 a cada 1-2 semanas para medir evolução</li>
  <li><b>O ouro está na correção:</b> analise CADA erro e entenda o porquê</li>
  <li><b>Treina resistência:</b> 4-5h de prova exigem preparo físico e mental</li>
  <li><b>Calibra o ritmo:</b> você aprende a não travar numa questão difícil</li>
</ul>
<p style="margin-top:8px">Simulado é active recall sob pressão real — o tipo de treino que mais aproxima da prova. 📝</p>`;

    if (/nervosismo|controlar nervos|tremer na prova|panico na prova|respiracao|respiração/.test(t))
      return `<p><strong>Controlar o nervosismo na hora da prova:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Respiração 4-7-8:</b> inspire 4s, segure 7s, expire 8s — baixa a frequência cardíaca</li>
  <li><b>Chegue cedo:</b> correria antes da prova dispara a ansiedade</li>
  <li><b>Comece pelo fácil:</b> acertos iniciais geram confiança e destravam</li>
  <li><b>Reinterprete o frio na barriga:</b> "estou animado", não "estou com medo" — mesma sensação, outra leitura</li>
  <li><b>Foque na questão atual</b>, não no resultado final</li>
</ul>
<p style="margin-top:8px">Nervosismo moderado melhora o desempenho. Treino e simulados domam o excesso. 💪</p>`;

    if (/revisar a prova|corrigir prova|aprender com erro|aprender com os erros|caderno de erros|analisar erro/.test(t))
      return `<p><strong>Aprender com os erros (caderno de erros):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Mantenha um <b>caderno só de questões erradas</b></li>
  <li>Para cada erro anote: <b>o que errei, por quê e o conceito certo</b></li>
  <li>Classifique: erro de conteúdo, de interpretação ou de desatenção</li>
  <li><b>Refaça as questões erradas</b> dias depois, sem olhar a solução</li>
  <li>Revisar erros vale mais que fazer questões novas — ataca exatamente sua lacuna</li>
</ul>
<p style="margin-top:8px">Erro não revisado vira erro repetido. Erro analisado vira ponto forte. 🔁</p>`;

    if (/programacao|programação|programar|codar|codificar|aprender a programar|do zero/.test(t))
      return `<p><strong>Aprender programação do zero:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Escolha 1 linguagem</b> e fique nela (Python é ótima pra começar)</li>
  <li><b>Codifique todo dia:</b> ler tutorial não ensina — digitar e quebrar o código sim</li>
  <li><b>Projetos pequenos reais:</b> calculadora, lista de tarefas, bot — aprende fazendo</li>
  <li><b>Erre e leia os erros:</b> a mensagem de erro é seu professor</li>
  <li><b>Active recall:</b> resolva exercícios (Exercism, freeCodeCamp) sem copiar</li>
</ul>
<p style="margin-top:8px">Não caia no "inferno dos tutoriais": 80% mão na massa, 20% teoria. Construa, não só assista. 💻</p>`;

    if (/estudar trabalhando|trabalho e estudo|pouco tempo|conciliar|sem tempo/.test(t))
      return `<p><strong>Estudar trabalhando (com pouco tempo):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Blocos curtos contam:</b> 2-3 sessões de 30-50 min rendem muito ao longo da semana</li>
  <li><b>Aproveite tempos mortos:</b> flashcards no transporte, áudios em deslocamentos</li>
  <li><b>Horário fixo inegociável:</b> ex. 1h antes do trabalho — vira hábito automático</li>
  <li><b>Qualidade > quantidade:</b> 1h focada bate 3h dispersa</li>
  <li><b>Proteja o sono:</b> virar a noite derruba seu rendimento no dia seguinte</li>
</ul>
<p style="margin-top:8px">Constância vence volume: 1h/dia consistente forma especialistas em meses. ⏳</p>`;

    if (/grupo|sozinho|estudar junto|estudar acompanhado|estudar em grupo/.test(t))
      return `<p><strong>Estudar em grupo vs sozinho:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Sozinho é melhor para:</b> aprender conteúdo novo, active recall e foco profundo</li>
  <li><b>Em grupo é melhor para:</b> tirar dúvidas, ensinar uns aos outros (Feynman) e revisar</li>
  <li><b>Ensinar ao grupo</b> expõe o que você ainda não domina</li>
  <li><b>Cuidado:</b> grupo vira conversa fácil — combine pauta e tempo</li>
  <li>Ideal: estude sozinho e use o grupo para <b>discutir e testar</b></li>
</ul>
<p style="margin-top:8px">Misture os dois: solo para absorver, grupo para consolidar e tirar dúvidas. 👥</p>`;

    if (/tirar duvida|tirar dúvida|tirar duvidas|tirar dúvidas|nao entendi|não entendi/.test(t))
      return `<p><strong>Como tirar dúvidas de forma eficaz:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Tente sozinho primeiro:</b> a luta antes da resposta fixa melhor o aprendizado</li>
  <li><b>Formule a dúvida por escrito:</b> só de escrever, muitas se resolvem sozinhas</li>
  <li><b>Seja específico:</b> "não entendi" → "por que esse passo usa essa regra?"</li>
  <li>Use <b>fóruns e comunidades</b> (Reddit, Discord, Stack Overflow) e professores</li>
  <li>Depois de entender, <b>explique de volta</b> com suas palavras</li>
</ul>
<p style="margin-top:8px">Dúvida bem formulada já é meio caminho da resposta. 💡</p>`;

    if (/ambiente|local de estudo|onde estudar|mesa de estudo|escrivaninha/.test(t))
      return `<p><strong>Ambiente de estudo ideal:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Lugar fixo só para estudar:</b> o cérebro associa o local ao modo foco</li>
  <li><b>Mesa organizada:</b> só o material da sessão atual à vista</li>
  <li><b>Boa luz e postura:</b> evitam fadiga e sono</li>
  <li><b>Celular fora de alcance</b> — não basta silenciar, tem que sumir</li>
  <li><b>Evite a cama:</b> o cérebro a associa a dormir, não a focar</li>
</ul>
<p style="margin-top:8px">O ambiente certo reduz o esforço de concentração: metade do foco é design do espaço. 🪑</p>`;

    if (/alimenta|comer|alimento|cafeina|cafeína|nutricao|nutrição/.test(t))
      return `<p><strong>Alimentação e foco:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Hidrate-se:</b> desidratação leve já reduz concentração</li>
  <li><b>Evite picos de açúcar:</b> dão energia rápida e queda brusca depois</li>
  <li><b>Prefira liberação lenta:</b> grãos integrais, frutas, oleaginosas, proteína</li>
  <li><b>Cafeína:</b> 1-2 xícaras ajudam, mas evite após as 16h (atrapalha o sono)</li>
  <li><b>Ômega-3</b> (peixe, nozes) favorece a saúde cerebral</li>
</ul>
<p style="margin-top:8px">Cérebro é caro energeticamente: o que você come vira (ou não) combustível para focar. 🥗</p>`;

    if (/pausa|intervalo|descansar entre|quanto descansar/.test(t) && !/sono|dormir|burnout|esgota/.test(t))
      return `<p><strong>Pausas e intervalos ideais:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Pomodoro:</b> 5 min a cada 25, pausa longa de 15-30 min a cada 4 ciclos</li>
  <li><b>Regra 20-20-20:</b> a cada 20 min, olhe algo a 20 pés (6m) por 20s — descansa a vista</li>
  <li><b>Pausa de verdade:</b> levante, ande, beba água — não troque estudo por scroll no feed</li>
  <li><b>Pausas curtas</b> mantêm energia; <b>longas demais</b> quebram o ritmo</li>
</ul>
<p style="margin-top:8px">A pausa não é desperdício: é quando o cérebro consolida o que acabou de aprender. ☕</p>`;

    if (/habito|hábito|criar habito|criar hábito|disciplina|consistencia|consistência/.test(t))
      return `<p><strong>Criar o hábito de estudar (disciplina > motivação):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Mesmo horário, mesmo lugar:</b> o gatilho automatiza o início</li>
  <li><b>Empilhe o hábito:</b> "depois do café, estudo 30 min"</li>
  <li><b>Comece ridiculamente pequeno:</b> 10 min/dia consolidam mais que 3h esporádicas</li>
  <li><b>Não quebre a corrente:</b> marque os dias num calendário (efeito streak)</li>
  <li><b>Motivação inicia, hábito sustenta</b> — você não vai "estar motivado" todo dia</li>
</ul>
<p style="margin-top:8px">Disciplina é só hábito bem treinado. Depende de sistema, não de força de vontade. 📅</p>`;

    if (/materia dificil|matéria difícil|materia chata|matéria chata|odeio|dificuldade com/.test(t))
      return `<p><strong>Encarar matérias difíceis ou chatas:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Comece por ela</b> quando sua energia está alta (manhã)</li>
  <li><b>Fatie em pedaços minúsculos:</b> o monstro fica gerenciável</li>
  <li><b>Descubra o "porquê":</b> entender a aplicação real reduz a aversão</li>
  <li><b>Busque outra fonte:</b> um vídeo bom pode destravar o que o livro travou</li>
  <li><b>Recompense-se</b> após blocos da matéria difícil</li>
</ul>
<p style="margin-top:8px">Quase sempre o "chato" é só o "ainda não entendido". Vença a base e ela fica tolerável. 💪</p>`;

    if (/exatas|humanas|biologicas|biológicas/.test(t))
      return `<p><strong>Exatas vs Humanas — estratégias diferentes:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Exatas (mat, física, química):</b> aprende-se <b>resolvendo exercícios</b>, não lendo. Entenda a lógica e pratique muito</li>
  <li><b>Humanas (história, filosofia, direito):</b> foco em <b>leitura ativa, fichamento e conexões</b> entre ideias</li>
  <li><b>Ambas se beneficiam</b> de active recall e repetição espaçada</li>
  <li>Exatas: interleaving de tipos de problema. Humanas: mapas mentais conectando contextos</li>
</ul>
<p style="margin-top:8px">A técnica muda, o princípio não: recuperação ativa + revisão espaçada funcionam em tudo. 📚</p>`;

    if (/motiva|sem vontade|desanim|nao tenho vontade|não tenho vontade|empolg/.test(t))
      return `<p><strong>Motivação para estudar:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Conecte ao seu "porquê":</b> visualize onde esse estudo vai te levar</li>
  <li><b>Ação gera motivação</b> (não o contrário): comece 5 min e a vontade aparece</li>
  <li><b>Metas pequenas e visíveis:</b> progresso visível alimenta a vontade</li>
  <li><b>Comemore vitórias:</b> riscar tarefas libera dopamina</li>
  <li><b>Não dependa só dela:</b> nos dias sem motivação, o hábito te carrega</li>
</ul>
<p style="margin-top:8px">Esperar motivação para começar é uma armadilha. Comece, e ela vem no caminho. 🚀</p>`;

    // ═════════ NOVOS INTENTS (2ª rodada) — colocados antes do fallback ═════════

    if (/52.?17|5217|pomodoro longo|ciclo longo|90.?20|112.?26|pausa ativa do pomodoro/.test(t))
      return `<p><strong>Variações do Pomodoro (além do 25/5):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>52/17:</b> 52 min de foco + 17 min de pausa — ótimo para tarefas que exigem imersão maior</li>
  <li><b>90/20:</b> alinhado ao ciclo ultradiano do cérebro (~90 min de pico) + descanso real</li>
  <li><b>112/26:</b> ritmo de "deep work" para quem já tem foco treinado</li>
  <li><b>Regra de ouro:</b> a pausa precisa ser <b>real</b> (longe da tela), não scroll no feed</li>
</ul>
<p style="margin-top:8px">Teste 1-2 semanas cada e meça onde você rende mais. Não existe número mágico — existe o seu. ⏲️</p>`;

    if (/sq3r|sq4r|pq4r|robinson|panorama de leitura|survey question read/.test(t))
      return `<p><strong>Método SQ3R para leitura ativa:</strong></p>
<ol style="margin:8px 0 0 16px;line-height:2">
  <li><b>Survey:</b> folheie títulos, negritos e resumos (2-3 min) antes de ler</li>
  <li><b>Question:</b> transforme cada subtítulo em pergunta</li>
  <li><b>Read:</b> leia buscando responder essas perguntas</li>
  <li><b>Recite:</b> feche o livro e responda em voz alta ou no papel</li>
  <li><b>Review:</b> revise 1, 7 e 30 dias depois o que não fixou</li>
</ol>
<p style="margin-top:8px">Transforma leitura passiva em active recall embutido. Funciona muito bem para concurso e provas teóricas. 📖</p>`;

    if (/notion|obsidian|segundo cerebro|segundo cérebro|zettelkasten|nota digital|notas digitais|app de anotac/.test(t))
      return `<p><strong>Notion, Obsidian e o "segundo cérebro":</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Notion:</b> ótimo para organizar matérias, cronogramas e bancos de questões em tabelas</li>
  <li><b>Obsidian:</b> notas em markdown com <b>links entre ideias</b> (Zettelkasten) — cria uma rede de conhecimento</li>
  <li><b>Princípio:</b> a ferramenta não estuda por você — conecte e reescreva com suas palavras</li>
  <li><b>Cuidado:</b> não vire "produtividade pornô" arrumando o app em vez de estudar</li>
</ul>
<p style="margin-top:8px">Papel vence em retenção de conteúdo novo; digital vence em busca e revisão. Use os dois conforme a fase. 🧠</p>`;

    if (/papel ou digital|caneta ou teclado|manuscrit|escrever a mao|escrever à mão|digitar ou escrever|laptop na aula/.test(t))
      return `<p><strong>Anotar à mão vs no computador:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>À mão:</b> você é mais lento, então <b>resume e reformula</b> — isso processa melhor o conteúdo</li>
  <li><b>Digital:</b> rápido, busca fácil, mas vira transcrição passiva e abre porta para distração</li>
  <li><b>Estudo Mueller & Oppenheimer:</b> manuscrito teve melhor desempenho em questões conceituais</li>
  <li><b>Meio-termo:</b> anote à mão na aula, depois digite organizando — vira 2ª revisão</li>
</ul>
<p style="margin-top:8px">Para aprender, à mão tende a ganhar. Para arquivar e buscar depois, digital ganha. ✍️</p>`;

    if (/configurar anki|config do anki|deck|intervalo do anki|ease|cartao anki|cartão anki|como usar anki/.test(t))
      return `<p><strong>Configurar o Anki direito:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cartões atômicos:</b> 1 fato por cartão — pergunta clara, resposta curta</li>
  <li><b>Novos cartões/dia:</b> comece com <b>10-20</b>, não 200 (a avalanche de revisões te quebra)</li>
  <li><b>Não decore o cartão:</b> entenda antes de adicionar, senão vira papagaio</li>
  <li><b>Seja honesto nos botões</b> (de novo/difícil/bom/fácil) — o algoritmo depende disso</li>
  <li><b>Cloze deletion</b> (lacunas) é poderoso para leis e definições</li>
</ul>
<p style="margin-top:8px">Revise <b>todo dia</b>, mesmo que pouco. Pular dias acumula e desmotiva. 🃏</p>`;

    if (/oab|exame de ordem|primeira fase|segunda fase da oab|peca pratica|peça prática/.test(t))
      return `<p><strong>Estratégia para a OAB:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>1ª fase:</b> 80 questões — domine <b>Ética, Constitucional, Civil e Processo</b> (maiores pesos)</li>
  <li><b>Resolva provas da FGV:</b> a banca repete muito o estilo — questões antigas são ouro</li>
  <li><b>Meta de aprovação:</b> 40 acertos; foque em garantir as disciplinas que mais caem</li>
  <li><b>2ª fase:</b> escolha a área com antecedência e treine <b>peça + questões</b> cronometradas</li>
  <li><b>Vade mecum:</b> aprenda a localizar artigos rápido — na 2ª fase ele é permitido</li>
</ul>
<p style="margin-top:8px">Questões > teoria pura. Estude pelo gabarito comentado da FGV. ⚖️</p>`;

    if (/medicina|vestibular de medicina|fuvest|residencia|residência med|carreira medica/.test(t))
      return `<p><strong>Vestibular de Medicina (alta concorrência):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Biologia, Química e Física</b> têm peso extra na maioria das provas — priorize</li>
  <li><b>Redação forte é decisiva:</b> em provas como a Fuvest, ela desempata vagas concorridíssimas</li>
  <li><b>Rotina de 6-8h/dia</b> com revisão espaçada e muitos exercícios</li>
  <li><b>Simulados quinzenais</b> nas condições reais (4-5h) treinam resistência</li>
  <li><b>Caderno de erros</b> é indispensável nesse nível de concorrência</li>
</ul>
<p style="margin-top:8px">Maratona de 1-3 anos. Constância e saúde mental valem tanto quanto o conteúdo. 🩺</p>`;

    if (/multitarefa|multitask|fazer varias coisas|várias coisas ao mesmo tempo|duas coisas ao mesmo tempo/.test(t))
      return `<p><strong>Multitarefa é um mito (para estudar):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>O cérebro <b>não</b> faz duas tarefas cognitivas juntas — ele alterna ("task switching")</li>
  <li>Cada troca custa atenção e tempo: estudar com WhatsApp aberto pode <b>dobrar</b> o tempo</li>
  <li>Estudos mostram queda de desempenho e mais erros em quem "multitarefa"</li>
  <li><b>Monotarefa intencional:</b> 1 coisa de cada vez, com bloco de tempo definido</li>
</ul>
<p style="margin-top:8px">Você não é lento — você está dividido. Feche as abas e foque numa coisa só. 🎯</p>`;

    if (/bloquead|bloquear app|bloquear site|forest|cold turkey|app de foco|freedom|tempo de tela|screen time/.test(t))
      return `<p><strong>Apps para bloquear distração digital:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Forest:</b> planta uma árvore que morre se você sair do app — gamifica o foco</li>
  <li><b>Cold Turkey / Freedom:</b> bloqueiam sites e apps por blocos de tempo</li>
  <li><b>Modo Foco / Tempo de Tela</b> (iOS/Android) já fazem isso nativamente, de graça</li>
  <li><b>Truque físico:</b> celular em outro cômodo bate qualquer app — a fricção vence o impulso</li>
</ul>
<p style="margin-top:8px">O melhor bloqueador é a distância: o que não está ao alcance da mão não te interrompe. 🌳</p>`;

    if (/impostor|nao sou capaz|não sou capaz|nao sou bom o suficiente|fraude|sentir que nao mereco/.test(t))
      return `<p><strong>Síndrome do impostor:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>É comum justamente em quem se esforça</b> — sentir-se "fraude" não significa que você é</li>
  <li><b>Registre vitórias:</b> mantenha um log de acertos e progressos para confrontar a sensação</li>
  <li><b>Separe sentimento de fato:</b> "me sinto despreparado" ≠ "estou despreparado"</li>
  <li><b>Compare-se com seu eu de ontem</b>, não com os outros</li>
  <li>Falar sobre isso com colegas mostra que quase todos sentem o mesmo</li>
</ul>
<p style="margin-top:8px">Dúvida sobre a própria capacidade costuma andar junto com competência real. Siga em frente. 💛</p>`;

    if (/comparar com|comparacao com outros|comparação com outros|todo mundo sabe mais|estou atrasad|me comparo/.test(t))
      return `<p><strong>Parar de se comparar com os outros:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Você vê o resultado dos outros, não o processo</b> — comparação é sempre injusta</li>
  <li><b>Régua única:</b> o você de hoje vs o você de 1 mês atrás</li>
  <li><b>Redes sociais distorcem:</b> ninguém posta as horas travado e desmotivado</li>
  <li><b>Use o outro como referência, não como juiz:</b> aprenda o método, ignore o ranking</li>
</ul>
<p style="margin-top:8px">A corrida que importa é contra a sua própria estagnação. Foque na sua trilha. 🛤️</p>`;

    if (/voltar a estudar|parei de estudar|recomecar|recomeçar|sair do zero de novo|fiquei parado|destreinad/.test(t))
      return `<p><strong>Voltar a estudar depois de parar:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Não tente recuperar tudo de uma vez:</b> recaída comum é querer 6h no dia 1 e abandonar no dia 3</li>
  <li><b>Recomece minúsculo:</b> 20-30 min/dia na primeira semana só para reativar o hábito</li>
  <li><b>Sem culpa pelo tempo parado:</b> ela só consome energia que serviria para estudar</li>
  <li><b>Reabilite a base:</b> uma revisão leve do que já sabia destrava a confiança</li>
  <li><b>Marque os dias</b> (efeito streak) para reconstruir o ritmo</li>
</ul>
<p style="margin-top:8px">Recomeçar não é voltar à estaca zero — você ainda carrega o que aprendeu. Suba a rampa devagar. 🔄</p>`;

    if (/gamific|gamificar|streak|xp de estudo|pontos de estudo|nivel de estudo|nível de estudo|recompensa/.test(t))
      return `<p><strong>Gamificar os estudos:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Streak (corrente):</b> não quebrar a sequência de dias vira motivação por si só</li>
  <li><b>Pontos/XP:</b> dê pontos por bloco concluído e defina "níveis" semanais</li>
  <li><b>Recompensas atreladas:</b> episódio da série só depois de 2 pomodoros</li>
  <li><b>Barra de progresso visível:</b> ver o avanço libera dopamina e puxa pra continuar</li>
  <li><b>Cuidado:</b> a recompensa deve seguir o esforço, não substituí-lo</li>
</ul>
<p style="margin-top:8px">No StudyOS, suas metas de horas já funcionam como placar — transforme estudo em jogo que você quer vencer. 🎮</p>`;

    if (/accountability|parceiro de estudo|cobranca mutua|cobrança mútua|responsabiliza|body doubling|alguem pra cobrar/.test(t))
      return `<p><strong>Parceiro de estudo (accountability):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Compromisso público</b> com alguém aumenta muito a taxa de cumprimento da meta</li>
  <li><b>Check-in diário:</b> mande "feito" ao parceiro ao fim da sessão</li>
  <li><b>Body doubling:</b> estudar junto (presencial ou em chamada de vídeo) reduz a procrastinação</li>
  <li><b>Metas claras e mensuráveis</b> para o parceiro poder cobrar de fato</li>
  <li><b>Comunidades online</b> (Discord de estudos, "study with me") cumprem esse papel</li>
</ul>
<p style="margin-top:8px">A gente falha com a gente fácil — falhar com outra pessoa custa mais. Use isso a seu favor. 🤝</p>`;

    if (/videoaula|video aula|video-aula|aula gravada|velocidade do video|acelerar video|2x|assistir aula/.test(t))
      return `<p><strong>Aprender com videoaula (sem ilusão de produtividade):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Velocidade 1.25x-1.5x</b> costuma manter compreensão; 2x só para revisão do que já sabe</li>
  <li><b>Pause e anote</b> com suas palavras — assistir passivo fixa pouquíssimo</li>
  <li><b>Teste depois:</b> feche o vídeo e tente recriar o raciocínio (active recall)</li>
  <li><b>Refaça os exercícios sozinho</b> antes de ver a resolução</li>
  <li><b>Cuidado com a maratona:</b> 5 aulas seguidas viram entretenimento, não estudo</li>
</ul>
<p style="margin-top:8px">Vídeo é input passivo. O aprendizado real vem do que você faz com a pausa. ▶️</p>`;

    if (/podcast|audio para estudar|áudio para estudar|escutar enquanto/.test(t))
      return `<p><strong>Podcasts educativos no estudo:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Ótimos para tempos mortos:</b> trânsito, academia, tarefas domésticas</li>
  <li><b>Melhor para revisão e visão geral</b> do que para aprender conteúdo novo e técnico</li>
  <li><b>Áudio é passivo:</b> depois, anote 3 pontos que lembrou para virar active recall</li>
  <li><b>Não substitui</b> a prática de exercícios em exatas</li>
</ul>
<p style="margin-top:8px">Use podcast para "aproveitar o tempo que ia se perder", não como estudo principal. 🎧</p>`;

    if (/jejum de dopamina|dopamine|reduzir dopamina|detox digital|excesso de estimulo|excesso de estímulo/.test(t))
      return `<p><strong>"Jejum de dopamina" e foco:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Ideia central:</b> estímulos rápidos (reels, jogos, açúcar) elevam tanto a recompensa que estudar parece "sem graça"</li>
  <li><b>Reduza o pico:</b> corte scroll infinito e notificações nas horas de estudo</li>
  <li><b>Recompensa lenta:</b> reaprenda a achar satisfação em tarefas que exigem esforço</li>
  <li><b>Comece o dia sem o celular:</b> proteger a manhã preserva a atenção para o resto</li>
</ul>
<p style="margin-top:8px">Não precisa de "jejum" radical — basta baixar o ruído digital para o estudo voltar a competir. 📵</p>`;

    if (/perfeccion|tudo perfeito|nunca esta bom|nunca está bom|medo de errar|paralis/.test(t))
      return `<p><strong>Perfeccionismo que trava o estudo:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Feito > perfeito:</b> um resumo "bom o bastante" hoje vale mais que o perfeito que nunca sai</li>
  <li><b>Errar faz parte do método:</b> o erro é onde o aprendizado acontece, não um fracasso</li>
  <li><b>Defina "bom o suficiente"</b> antes de começar para não polir infinitamente</li>
  <li><b>Cronometre:</b> dar prazo à tarefa corta o loop de revisão sem fim</li>
  <li><b>Caderno bonito ≠ aprendizado:</b> não gaste horas decorando anotações</li>
</ul>
<p style="margin-top:8px">Perfeccionismo costuma ser procrastinação disfarçada de capricho. Avance imperfeito. 🌗</p>`;

    if (/prova oral|apresentacao|apresentação|seminario|seminário|falar em publico|falar em público|defesa oral/.test(t))
      return `<p><strong>Prova oral e apresentações:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Domine a estrutura, não o roteiro decorado:</b> saber a sequência de ideias evita o branco</li>
  <li><b>Ensaie em voz alta</b> e cronometrado — pensar ≠ falar fluentemente</li>
  <li><b>Grave-se:</b> ouvir revela vícios, "né?", pausas e ritmo</li>
  <li><b>Antecipe perguntas</b> e prepare respostas curtas</li>
  <li><b>Respiração 4-7-8</b> antes de começar baixa o nervosismo</li>
</ul>
<p style="margin-top:8px">Quem ensaia em voz alta domina o conteúdo e o nervoso. Repetição é confiança. 🎤</p>`;

    if (/tcc|monografia|trabalho de conclusao|trabalho de conclusão|dissertacao de mestrado|tese|artigo cientifico|artigo científico/.test(t))
      return `<p><strong>TCC / monografia sem sofrimento:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Recorte estreito:</b> tema específico é mais fácil que tema amplo — delimite logo</li>
  <li><b>Pergunta de pesquisa clara</b> guia tudo: tudo que não responde a ela, corta</li>
  <li><b>Escreva sujo primeiro:</b> rascunho ruim é editável; página em branco não</li>
  <li><b>Metas diárias minúsculas:</b> "300 palavras/dia" termina monografias</li>
  <li><b>Gerencie referências</b> com Zotero/Mendeley desde o início — economiza dias</li>
</ul>
<p style="margin-top:8px">TCC não se faz numa maratona final — se faz em pequenos blocos constantes. Comece a escrever antes de "terminar de ler tudo". 📑</p>`;

    if (/decoreba|decorar vs entender|entender ou decorar|so decorei|só decorei|aprendizado profundo|aprendizado superficial/.test(t))
      return `<p><strong>Decorar vs entender:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Decoreba some sob pressão:</b> na prova difícil, o que foi só memorizado evapora</li>
  <li><b>Entendimento se reconstrói:</b> se você sabe o "porquê", recria o que esqueceu</li>
  <li><b>Teste-se com "por quê?":</b> se só sabe o "o quê", ainda é superficial</li>
  <li><b>Algumas coisas exigem memória mesmo</b> (vocabulário, leis) — aí use repetição espaçada</li>
  <li><b>Feynman</b> expõe na hora o que você decorou sem entender</li>
</ul>
<p style="margin-top:8px">Entenda primeiro, memorize o que sobrar. Compreensão é memória que não trai. 🧩</p>`;

    if (/grupo de estudo eficaz|grupo eficiente|reuniao de estudo|reunião de estudo|estudar coletivo/.test(t))
      return `<p><strong>Grupo de estudo que realmente funciona:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Máximo 3-5 pessoas</b> com nível e objetivo parecidos</li>
  <li><b>Pauta e tempo definidos</b> antes — senão vira papo</li>
  <li><b>Cada um ensina um tópico</b> (Feynman coletivo) — expõe lacunas de todos</li>
  <li><b>Resolvam questões juntos</b> e discutam os porquês das alternativas</li>
  <li><b>Conteúdo novo se aprende sozinho;</b> grupo serve para revisar e tirar dúvidas</li>
</ul>
<p style="margin-top:8px">Grupo bom é máquina de tirar dúvida e ensinar; grupo ruim é distração coletiva. Combine regras. 👥</p>`;

    if (/revisao espacada cronograma|cronograma de revisao|cronograma de revisão|1.?7.?30|um sete trinta|quando revisar/.test(t))
      return `<p><strong>Cronograma de revisão 1-7-30:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Mesmo dia:</b> revisão rápida do que estudou, ainda fresco</li>
  <li><b>1 dia depois:</b> primeira revisão de verdade, com active recall</li>
  <li><b>7 dias depois:</b> reforça antes que a curva do esquecimento derrube</li>
  <li><b>30 dias depois:</b> consolidação de longo prazo</li>
  <li><b>Acertou fácil?</b> Espace mais. <b>Errou?</b> Encurte o intervalo</li>
</ul>
<p style="margin-top:8px">3 revisões curtas espaçadas valem mais que reler 5 vezes seguidas. Sistematize as datas. 📆</p>`;

    if (/em pe|em pé|de pe|de pé|estudar andando|estudar caminhando|mesa em pe|movimento|estudar em movimento/.test(t))
      return `<p><strong>Estudar em pé ou em movimento:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Mesa em pé</b> reduz a sonolência e melhora a circulação em sessões longas</li>
  <li><b>Andar enquanto revisa</b> (flashcards, áudios) ativa o cérebro — bom para mente dispersa/TDAH</li>
  <li><b>Alterne posições:</b> sentar e levantar a cada bloco evita fadiga postural</li>
  <li><b>Para escrever/resolver exercícios</b>, sentar com boa postura ainda é melhor</li>
</ul>
<p style="margin-top:8px">Movimento leve combina com revisão e memorização; foco profundo de escrita pede estabilidade. 🚶</p>`;

    if (/cinco porques|cinco porquês|5 porques|5 porquês|analise de causa|análise de causa|por que errei/.test(t))
      return `<p><strong>Técnica dos 5 Porquês (achar a causa raiz):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Diante de um erro ou dificuldade, pergunte <b>"por quê?"</b> cinco vezes seguidas</li>
  <li>Ex.: "Errei a questão" → por quê? "não sabia a fórmula" → por quê? "não revisei" → por quê? "sem cronograma"...</li>
  <li>Cada resposta vira a próxima pergunta até chegar à <b>causa real</b></li>
  <li>Aí você corrige a raiz, não o sintoma</li>
</ul>
<p style="margin-top:8px">Muito útil no caderno de erros: o "porquê" final costuma ser um problema de método, não de inteligência. ❓</p>`;

    if (/montar meta de horas|meta de horas|quantas horas devo|meta realista|carga horaria|carga horária/.test(t))
      return `<p><strong>Montar uma meta de horas realista:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Parta do tempo que sobra de fato</b> na sua semana, não do ideal imaginário</li>
  <li><b>Conte só foco real:</b> 1h de pomodoro vale mais que 3h "ligado no automático"</li>
  <li><b>Comece 20% abaixo do que acha que aguenta</b> — meta batível cria momentum</li>
  <li><b>Distribua por dia</b> e deixe 1 dia de folga/buffer para imprevistos</li>
  <li><b>Ajuste semanalmente</b> com base no que você realmente cumpriu</li>
</ul>
<p style="margin-top:8px">Meta inflada que você nunca bate desmotiva. No StudyOS, defina horas semanais por matéria e acompanhe o real. 🕒</p>`;

    if (/cafe e foco|café e foco|cafeina e foco|cafeína e foco|tomar cafe|tomar café|quanto de cafe|quanto de café/.test(t))
      return `<p><strong>Café e cafeína para focar:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Dose útil:</b> ~1-2 xícaras melhoram alerta e atenção; mais que isso dá ansiedade e tremor</li>
  <li><b>Evite após as 14-16h:</b> a cafeína tem meia-vida ~5-6h e atrapalha o sono (que consolida memória)</li>
  <li><b>Não dependa em jejum:</b> com o estômago vazio pode aumentar a ansiedade</li>
  <li><b>Tolerância sobe:</b> pausas de alguns dias restauram o efeito</li>
</ul>
<p style="margin-top:8px">Café é aliado pontual, não substituto de sono. Use para potencializar foco, não para tapar exaustão. ☕</p>`;

    // ═════════ NOVOS INTENTS (3ª rodada / onda 1) — nichos antes do fallback ═════════

    if (/\bsisu\b|prouni|fies|nota de corte|peso das materias|peso das matérias|peso enem|escolher curso enem/.test(t))
      return `<p><strong>SISU, ProUni e FIES (usar a nota do ENEM):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>SISU:</b> vagas em públicas; inscrição em janeiro, você concorre com 2 opções e a nota de corte muda diariamente — monitore até o último dia</li>
  <li><b>ProUni:</b> bolsas de 50% ou 100% em privadas; exige renda familiar até <b>3 salários mínimos</b> por pessoa (100%) ou <b>3</b> (parcial) e nota mínima 450, sem zerar a redação</li>
  <li><b>FIES:</b> financiamento com juros baixos; renda familiar até 3 salários mínimos per capita</li>
  <li><b>Pesos importam:</b> cada curso pondera áreas diferente — Medicina pesa Natureza, Engenharia pesa Matemática</li>
</ul>
<p style="margin-top:8px">Calcule sua nota ponderada por curso antes de escolher: às vezes um curso "menos concorrido" cabe na sua nota. 🎓</p>`;

    if (/toefl|ielts|cambridge|proficiencia|proficiência|certificado de ingles|certificado de inglês|celpe/.test(t))
      return `<p><strong>Provas de proficiência (TOEFL, IELTS, Cambridge):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>IELTS:</b> banda de 0 a 9; maioria das universidades pede <b>6.5-7.0</b>. Validade de 2 anos</li>
  <li><b>TOEFL iBT:</b> 0 a 120; muitas pedem <b>80-100</b>. Tudo no computador</li>
  <li><b>Treine as 4 habilidades separadas:</b> listening, reading, writing e speaking têm técnicas próprias</li>
  <li><b>Familiarize-se com o formato:</b> faça simulados oficiais cronometrados — metade da prova é conhecer a estrutura</li>
  <li><b>Speaking/Writing:</b> use templates e conectivos; grave-se e cronometre</li>
</ul>
<p style="margin-top:8px">Custo aproximado no Brasil: R$ 1.200-1.600. Faça simulado real antes de marcar a data. 🌎</p>`;

    if (/dislexia|dislexico|disléxico|discalculia|tea\b|autis|neurodiverg|laudo/.test(t))
      return `<p><strong>Estudar com dislexia / neurodivergência:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Texto para áudio (TTS):</b> ouvir junto com ler reduz o esforço de decodificação</li>
  <li><b>Fontes e espaçamento:</b> fontes tipo OpenDyslexic, linha mais espaçada e fundo creme cansam menos a vista</li>
  <li><b>Multissensorial:</b> combine ver, ouvir, falar e escrever — fixa por mais de um canal</li>
  <li><b>Tempo extra é direito:</b> ENEM, vestibulares e concursos concedem atendimento especializado com laudo</li>
  <li><b>Discalculia:</b> use material concreto e visual para números antes do abstrato</li>
</ul>
<p style="margin-top:8px">Dificuldade específica não é falta de capacidade — é questão de método adaptado. Solicite o atendimento especializado no edital. 🧩</p>`;

    if (/power nap|cochilo|soneca|sesta|nap\b|dormir de dia/.test(t))
      return `<p><strong>Cochilo estratégico (power nap):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>10-20 min:</b> restaura alerta e foco <b>sem inércia do sono</b> — o ideal para estudo</li>
  <li><b>Evite 30-60 min:</b> você acorda no sono profundo e fica grogue por um tempo</li>
  <li><b>90 min:</b> ciclo completo, bom se você está em dívida de sono, mas ocupa muito tempo</li>
  <li><b>Coffee nap:</b> tome um café e cochile 20 min — a cafeína age ao acordar</li>
  <li><b>Cochilar após estudar</b> ajuda a consolidar o que acabou de aprender</li>
</ul>
<p style="margin-top:8px">Cochilo não é preguiça — é manutenção cognitiva. Use cedo da tarde para não atrapalhar o sono da noite. 😴</p>`;

    if (/vocabular|palavras novas|aumentar vocabulario|aumentar vocabulário|word list|lista de palavras/.test(t))
      return `<p><strong>Construir vocabulário (idioma ou erudito):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Vocabulário em contexto:</b> aprenda a palavra dentro de uma frase, não isolada — fixa o uso real</li>
  <li><b>Frequência primeiro:</b> as <b>2.000 palavras mais comuns</b> cobrem ~80% de um texto cotidiano</li>
  <li><b>Flashcards com cloze:</b> frase com lacuna no Anki é melhor que tradução solta</li>
  <li><b>Raízes e afixos:</b> aprender prefixos/sufixos (bio-, -logia) destrava famílias inteiras de palavras</li>
  <li><b>Output:</b> use a palavra nova em 2-3 frases suas no mesmo dia</li>
</ul>
<p style="margin-top:8px">Meta sustentável: <b>10-15 palavras/dia</b> com revisão espaçada bate "decorar 100 e esquecer 90". 📖</p>`;

    if (/escrever rapido|escrever rápido|caligrafia|letra feia|escrita a mao cansa|escrita à mão cansa|caibra|cãibra|mao doi|mão dói/.test(t))
      return `<p><strong>Escrever mais rápido e sem cansaço:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Pegada relaxada:</b> apertar a caneta com força é a maior causa de cãibra — segure leve</li>
  <li><b>Movimento do braço, não só dos dedos:</b> apoie o antebraço e deslize</li>
  <li><b>Abreviações pessoais:</b> crie um sistema (q/ = que, ∴ = portanto) para anotar rápido</li>
  <li><b>Caneta de boa esfera</b> (0.7mm gel) desliza e exige menos pressão</li>
  <li><b>Não transcreva tudo:</b> anote palavras-chave, não frases inteiras — escreve menos e aprende mais</li>
</ul>
<p style="margin-top:8px">Em provas discursivas longas, treine a resistência da mão antes — escrever 2-3 redações/semana condiciona. ✏️</p>`;

    if (/material de estudo|que material|qual apostila|apostila|comprar livro|melhor livro|fonte confiavel|fonte confiável/.test(t))
      return `<p><strong>Escolher material de estudo (sem se perder):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Menos é mais:</b> 1 fonte boa terminada vale mais que 5 começadas — evite o acúmulo</li>
  <li><b>Alinhe ao edital/prova:</b> material genérico desperdiça tempo; busque o que cobra sua banca</li>
  <li><b>Gratuito e bom existe:</b> Khan Academy, MEC, videoaulas oficiais, provas anteriores com gabarito</li>
  <li><b>Atualização:</b> em Direito e atualidades, material velho induz a erro — confira o ano</li>
  <li><b>Questões comentadas</b> costumam ensinar mais que a teoria pura</li>
</ul>
<p style="margin-top:8px">Defina seu material no início e pare de pesquisar "o melhor curso" — isso é procrastinação disfarçada. 📚</p>`;

    if (/quimica|química|tabela periodica|tabela periódica|reacao quimica|reação química|organica|orgânica/.test(t))
      return `<p><strong>Como estudar Química de verdade:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Entenda a tabela periódica</b> como mapa: tendências (eletronegatividade, raio) explicam quase tudo</li>
  <li><b>Não decore reações isoladas:</b> entenda o mecanismo e você prevê o produto</li>
  <li><b>Orgânica = funções + reações:</b> domine os grupos funcionais antes de avançar</li>
  <li><b>Resolva estequiometria com método:</b> sempre balanceie e use proporção em mol</li>
  <li><b>Visualize:</b> modelos 3D e simuladores (PhET) ajudam a "ver" moléculas</li>
</ul>
<p style="margin-top:8px">Química mistura lógica (exatas) e memória (nomes/funções): entenda o porquê e use repetição espaçada para o resto. 🧪</p>`;

    if (/historia|história|geografia|atualidades|decorar datas|linha do tempo|geopolitica|geopolítica/.test(t))
      return `<p><strong>História, Geografia e Atualidades:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Não decore datas soltas:</b> entenda <b>causa → consequência</b> — a cronologia se monta sozinha</li>
  <li><b>Linha do tempo visual:</b> conecte eventos por período, não por lista</li>
  <li><b>Geografia:</b> relacione mapa, clima, economia e população — tudo se conecta</li>
  <li><b>Atualidades:</b> leia 1 boa fonte de notícias/dia e ligue ao conteúdo (cai muito em redação)</li>
  <li><b>Mapas mentais</b> conectando contexto histórico e geográfico fixam muito bem</li>
</ul>
<p style="margin-top:8px">Humanas premiam quem conecta ideias, não quem decora fatos isolados. Pense em rede, não em lista. 🗺️</p>`;

    if (/teste vocacional|nao sei o que estudar|não sei o que estudar|que carreira|escolher profissao|escolher profissão|qual faculdade/.test(t))
      return `<p><strong>Não sei que curso/carreira escolher:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cruze 3 eixos:</b> o que você gosta, no que é bom e o que tem mercado — a interseção é o caminho</li>
  <li><b>Experimente antes:</b> assista aulas abertas, converse com profissionais da área, faça job shadowing</li>
  <li><b>Teste vocacional ajuda, não decide:</b> use como ponto de partida, não como veredito</li>
  <li><b>Curso não é prisão:</b> muita gente migra de área — a primeira escolha não é definitiva</li>
  <li><b>Cuidado com "status":</b> escolher por pressão externa costuma cobrar caro depois</li>
</ul>
<p style="margin-top:8px">Dúvida é normal aos 17 (e aos 30). Decida com a informação que tem hoje e ajuste no caminho. 🧭</p>`;

    if (/dor nas costas|postura|ergonomi|pescoco|pescoço|vista cansada|olho seco|tela cansa/.test(t))
      return `<p><strong>Ergonomia e saúde física no estudo:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Tela na altura dos olhos:</b> topo do monitor na linha do olhar evita dor no pescoço</li>
  <li><b>Pés no chão, costas apoiadas:</b> joelhos a ~90°, sem cruzar as pernas por horas</li>
  <li><b>Regra 20-20-20:</b> a cada 20 min, olhe 20s para algo a 6m — alivia a vista</li>
  <li><b>Levante a cada 30-50 min:</b> ficar sentado horas é mais nocivo que parece</li>
  <li><b>Alongue pescoço e punhos</b> entre blocos; iluminação difusa evita fadiga ocular</li>
</ul>
<p style="margin-top:8px">Corpo dolorido tira o foco. Cuidar da postura é parte do método, não luxo. 🪑</p>`;

    if (/decidir por onde comecar|por onde comecar|por onde começar|muito conteudo|muito conteúdo|sobrecarga de conteudo|tudo ao mesmo tempo|paralisia de analise|paralisia de análise/.test(t))
      return `<p><strong>Muito conteúdo, sem saber por onde começar:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Matriz peso × dificuldade:</b> ataque primeiro o que cai muito E você não domina</li>
  <li><b>Pareto (80/20):</b> ~20% do conteúdo costuma valer 80% das questões — descubra esse núcleo</li>
  <li><b>Diagnóstico rápido:</b> faça um simulado curto para ver onde estão as lacunas reais</li>
  <li><b>Uma matéria por vez no bloco</b>, mas alterne ao longo da semana (interleaving)</li>
  <li><b>Não tente abraçar tudo:</b> lista priorizada vence lista completa</li>
</ul>
<p style="margin-top:8px">Paralisia vem de tentar decidir tudo de uma vez. Escolha o próximo passo único e comece. 🧱</p>`;

    if (/fisica|física|cinematica|cinemática|newton|eletromagnet|leis da fisica|leis da física/.test(t))
      return `<p><strong>Como estudar Física:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Entenda o conceito antes da fórmula:</b> física é fenômeno, fórmula é só a linguagem</li>
  <li><b>Desenhe o problema:</b> diagrama de forças/esquema resolve metade da questão</li>
  <li><b>Unidades e ordem de grandeza:</b> confira sempre — resposta com unidade errada já está errada</li>
  <li><b>Poucas fórmulas-mãe:</b> entenda a derivação e você reconstrói o resto</li>
  <li><b>Muitos exercícios variados</b> (interleaving) treinam a escolher a estratégia certa</li>
</ul>
<p style="margin-top:8px">3Blue1Brown e simuladores PhET dão intuição visual. Entenda o porquê e a física deixa de ser decoreba. ⚛️</p>`;

    if (/orcamento de estudo|orçamento de estudo|estudar de graca|estudar de graça|sem dinheiro|recurso gratuito|material gratuito|estudar gastando pouco/.test(t))
      return `<p><strong>Estudar com pouco (ou nenhum) dinheiro:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Conteúdo gratuito de qualidade:</b> Khan Academy, MEC, YouTube de cursinhos, podcasts educativos</li>
  <li><b>Anki é grátis</b> (no PC e Android) — repetição espaçada sem custo</li>
  <li><b>Provas anteriores com gabarito</b> são o melhor material e custam R$ 0</li>
  <li><b>Biblioteca pública</b> e acervos digitais (Domínio Público, bibliotecas universitárias)</li>
  <li><b>Isenção de taxa:</b> ENEM e muitos concursos isentam inscritos no CadÚnico/baixa renda</li>
</ul>
<p style="margin-top:8px">Aprovação não se compra: método + constância + provas antigas custam quase nada. 💸</p>`;

    if (/aprovado|depoimento|mentalidade de aprovado|mindset|mentalidade de crescimento|growth mindset|talento ou esforco|talento ou esforço/.test(t))
      return `<p><strong>Mentalidade de crescimento (growth mindset):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Habilidade se constrói:</b> "não sei ainda" no lugar de "não sou capaz" (Carol Dweck)</li>
  <li><b>Esforço e estratégia</b> pesam mais que "talento nato" no longo prazo</li>
  <li><b>Erro é informação,</b> não veredito sobre sua inteligência</li>
  <li><b>Elogie o processo</b> (você se dedicou), não o rótulo (você é gênio)</li>
  <li><b>Compare-se com seu eu de ontem,</b> não com aprovados de print</li>
</ul>
<p style="margin-top:8px">Quem acredita que pode melhorar, treina mais — e melhora. A crença vira resultado. 🌱</p>`;

    if (/colar|cola na prova|trapacear|plagio|plágio|integridade academica|integridade acadêmica|chatgpt na prova/.test(t))
      return `<p><strong>Por que colar e plagiar sai caro:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Você só engana a si mesmo:</b> a lacuna de conhecimento continua lá para a próxima prova/concurso</li>
  <li><b>Risco alto:</b> anulação, reprovação e até expulsão — não compensa</li>
  <li><b>Plágio em TCC/artigo</b> é detectado por software e pode invalidar o trabalho</li>
  <li><b>IA como ferramenta, não como autor:</b> use para explicar e revisar, não para entregar como seu</li>
  <li><b>O atalho real</b> é active recall e questões — aprende de verdade e rende na hora H</li>
</ul>
<p style="margin-top:8px">Estudar direito é mais barato que o preço de ser pego. Construa conhecimento que ninguém tira de você. 🛡️</p>`;

    if (/cronotipo|sou notur|coruja|matutino|relogio biologico|relógio biológico|ritmo circadiano|circadiano/.test(t))
      return `<p><strong>Cronotipo: descubra seu pico de rendimento:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Matutino ("cotovia"):</b> pico de foco de manhã — reserve o conteúdo difícil cedo</li>
  <li><b>Vespertino/noturno ("coruja"):</b> rende melhor à tarde/noite — não force madrugar à toa</li>
  <li><b>Observe-se 1-2 semanas:</b> anote quando se concentra melhor naturalmente</li>
  <li><b>Aloque o mais difícil no pico</b> e tarefas leves (revisão, organização) nos vales</li>
  <li><b>Sono regular</b> estabiliza o ritmo — dormir e acordar em horários fixos potencializa tudo</li>
</ul>
<p style="margin-top:8px">Trabalhar a favor do seu relógio biológico rende mais que copiar a rotina dos outros. 🕰️</p>`;

    if (/dia da prova|o que levar|kit prova|véspera|vespera da prova|checklist da prova|nao esquecer documento/.test(t))
      return `<p><strong>Checklist da véspera e do dia da prova:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Véspera:</b> revisão leve (nada novo!), separe documento, caneta preta, comprovante e roupa</li>
  <li><b>Durma cedo:</b> sono na véspera vale mais que qualquer revisão extra</li>
  <li><b>Chegue com folga:</b> conheça o trajeto; atraso = porta fechada em muitos concursos</li>
  <li><b>Leve água e lanche</b> (barra de cereal, fruta, chocolate) para provas longas</li>
  <li><b>Documento oficial com foto</b> é obrigatório — confira a regra do edital</li>
</ul>
<p style="margin-top:8px">No ENEM, leve caneta preta de corpo transparente e chegue até as 13h (horário de Brasília). Prepare tudo na noite anterior. ✅</p>`;

    if (/voz alta|estudar falando|ler em voz alta|gravar a propria voz|gravar a própria voz|efeito de producao|efeito de produção/.test(t))
      return `<p><strong>Estudar em voz alta (efeito de produção):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Falar o que lê fixa mais</b> que ler em silêncio — o "efeito de produção" é comprovado</li>
  <li><b>Explique em voz alta</b> sem olhar (Feynman + active recall ao mesmo tempo)</li>
  <li><b>Grave sua voz</b> resumindo e ouça em tempos mortos (trânsito, academia)</li>
  <li><b>Bom para idiomas:</b> shadowing e pronúncia melhoram falando, não só lendo</li>
  <li><b>Cuidado com o ambiente:</b> reserve um espaço onde possa falar sem incomodar</li>
</ul>
<p style="margin-top:8px">Som + esforço de recuperação = memória mais forte. Tire o conteúdo da cabeça pela boca. 🗣️</p>`;

    // ═════════ NOVOS INTENTS (onda 2) — nichos ainda não cobertos ═════════

    if (/mapa de assunto|raio.?x do edital|edital verticalizado|verticaliz|incidencia|incidência|o que mais cai|assunto que mais cai/.test(t))
      return `<p><strong>Edital verticalizado e raio-X de incidência:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Verticalize o edital:</b> quebre cada matéria em tópicos e subtópicos numa planilha — vira seu checklist</li>
  <li><b>Levante a incidência:</b> conte quantas vezes cada tópico caiu nas últimas <b>5-10 provas</b> da banca</li>
  <li><b>Priorize por frequência:</b> tópico que cai em <b>80%</b> das provas vem antes do que cai em 10%</li>
  <li><b>Marque o status:</b> não estudado / estudado / revisado / questões feitas — visão clara do avanço</li>
  <li><b>Cuidado com o "tudo igual":</b> distribuir o mesmo tempo para todo tópico é desperdício</li>
</ul>
<p style="margin-top:8px">Quem mapeia a incidência estuda 20% do edital e acerta 80% da prova. No StudyOS, crie uma matéria por bloco e acompanhe as horas. 📊</p>`;

    if (/banca|cespe|cebraspe|certo ou errado|fcc|fgv|vunesp|estilo da banca|perfil da banca/.test(t))
      return `<p><strong>Estudar pela banca (cada uma tem manha):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cespe/Cebraspe:</b> itens <b>certo/errado</b> — 1 errada anula 1 certa. Cuidado com generalizações ("sempre", "nunca") e pegadinhas de palavra</li>
  <li><b>FCC:</b> cobra <b>letra da lei</b> e detalhe — decoreba técnica e literalidade pesam</li>
  <li><b>FGV:</b> questões longas e interpretativas, contextualizadas — leitura atenta</li>
  <li><b>Vunesp:</b> enunciados diretos, foco em base sólida</li>
  <li><b>Resolva 50+ questões da sua banca</b> antes de concluir que "domina" o tópico</li>
</ul>
<p style="margin-top:8px">Na Cespe, chutar custa: só marque o que tem segurança, porque o erro desconta o acerto. ⚖️</p>`;

    if (/grade de correcao|grade de correção|chute|chutar|probabilidade de acertar|estrategia de chute|estratégia de chute|deixar em branco/.test(t))
      return `<p><strong>Estratégia de chute (gestão de risco na prova):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Prova sem desconto</b> (ENEM, maioria das múltiplas): <b>nunca</b> deixe em branco — chute sempre, ~20% de chance em 5 alternativas</li>
  <li><b>Elimine 2 alternativas</b> e o chute vira ~33-50% — sempre vale arriscar</li>
  <li><b>Prova com desconto</b> (certo/errado da Cespe): só marque com convicção; chute cego tem valor esperado negativo</li>
  <li><b>TRI do ENEM:</b> acertar fáceis e médias e errar difíceis vale mais que o contrário — não despreze as fáceis</li>
</ul>
<p style="margin-top:8px">Saber a regra de pontuação do edital muda toda a sua estratégia de marcação. Leia antes. 🎲</p>`;

    if (/\btri\b|teoria de resposta|item facil item dificil|item fácil item difícil|coerencia pedagogica|coerência pedagógica|nota enem alta/.test(t))
      return `<p><strong>Como a TRI do ENEM realmente funciona:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Não é proporcional:</b> 45 acertos de uma pessoa podem valer mais que 45 de outra — depende de <b>quais</b> questões</li>
  <li><b>Coerência pedagógica:</b> acertar difíceis e errar fáceis levanta suspeita de "chute" e derruba a nota</li>
  <li><b>Garanta as fáceis e médias:</b> são a base da sua nota — errar fácil pune muito</li>
  <li><b>Cada área vai de ~300 a ~1000;</b> consistência vale mais que sorte em 2-3 difíceis</li>
</ul>
<p style="margin-top:8px">Estratégia TRI: domine o básico de cada área antes de caçar as questões mais difíceis. Consistência > heroísmo. 📈</p>`;

    if (/ciclo de estudo|ciclo de estudos|estudar por ciclo|girar materia|girar matéria|sistema de ciclo|rotacao de materia|rotação de matéria/.test(t))
      return `<p><strong>Ciclo de estudos (alternativa ao cronograma rígido):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Em vez de "segunda = matemática"</b>, você gira blocos numa sequência fixa, sem amarrar a dias</li>
  <li><b>Defina blocos por peso:</b> matéria de maior peso recebe mais blocos no ciclo (ex.: 2 de Português, 1 de Geografia)</li>
  <li><b>Faltou hoje? O ciclo não quebra</b> — você apenas continua de onde parou, sem culpa</li>
  <li><b>Blocos de 50 min</b> com pausa; ao fechar o ciclo, recomeça</li>
  <li><b>Vantagem:</b> garante que nenhuma matéria fique esquecida e se adapta à vida real</li>
</ul>
<p style="margin-top:8px">Cronograma falha quando a vida muda; o ciclo é flexível e à prova de imprevistos. 🔁</p>`;

    if (/lei de parkinson|parkinson|prazo curto|deadline|timeboxing|time boxing|caixa de tempo|trabalho expande/.test(t))
      return `<p><strong>Lei de Parkinson e timeboxing:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Lei de Parkinson:</b> "o trabalho se expande para ocupar todo o tempo disponível" — sem prazo, tudo demora</li>
  <li><b>Timeboxing:</b> dê um teto curto à tarefa ("resolver 10 questões em 40 min") e o foco dispara</li>
  <li><b>Prazos artificiais funcionam:</b> marque um timer mesmo sem cobrança externa</li>
  <li><b>Combate o perfeccionismo:</b> a caixa de tempo força você a entregar "bom o suficiente"</li>
</ul>
<p style="margin-top:8px">Dar 3h para algo de 1h só cria enrolação. Aperte o prazo (com bom senso) e veja o rendimento subir. ⏳</p>`;

    if (/comer o sapo|eat the frog|tarefa mais dificil primeiro|tarefa mais difícil primeiro|mit\b|tarefa mais importante|sapo da manha|sapo da manhã/.test(t))
      return `<p><strong>"Comer o sapo" (eat the frog):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Ideia (Brian Tracy):</b> faça a tarefa mais difícil/importante <b>logo de manhã</b>, antes de qualquer coisa</li>
  <li><b>Energia e força de vontade</b> estão no pico cedo — é quando o "sapo" desce melhor</li>
  <li><b>Define 1-3 MITs</b> (Most Important Tasks) do dia na noite anterior</li>
  <li><b>Resto do dia rende mais:</b> com o pior já feito, alivia a ansiedade e o resto flui</li>
</ul>
<p style="margin-top:8px">Adiar o difícil para "depois" é receita de procrastinação. Coma o sapo cedo e o dia inteiro melhora. 🐸</p>`;

    if (/desejavel|desejável|dificuldade desejavel|dificuldade desejável|esforco facilita|esforço facilita|fluencia ilusoria|fluência ilusória|ilusao de saber|ilusão de saber/.test(t))
      return `<p><strong>Dificuldades desejáveis (por que o esforço ajuda):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Conceito (Bjork):</b> técnicas que parecem mais difíceis no momento geram aprendizado mais durável</li>
  <li><b>Reler é fácil e ilusório:</b> a "fluência" engana — você reconhece, mas não recupera sozinho</li>
  <li><b>Active recall, espaçamento e interleaving</b> são difíceis de propósito — e por isso funcionam</li>
  <li><b>Desconforto ≠ ineficácia:</b> se está fácil demais, provavelmente você não está aprendendo</li>
</ul>
<p style="margin-top:8px">Sentir esforço ao recuperar é sinal de que a memória está sendo construída. Abrace o desconforto certo. 💪</p>`;

    if (/curva de aprendizado|plato|platô|estagnei|estagnado|nao evoluo|não evoluo|empacado|nao saio do lugar|não saio do lugar/.test(t))
      return `<p><strong>Estagnei: como furar o platô de aprendizado:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Platô é normal:</b> ganhos rápidos no início, depois desaceleram — não é regressão</li>
  <li><b>Mude o estímulo:</b> se travou, troque tipo de exercício, fonte ou nível de dificuldade</li>
  <li><b>Prática deliberada:</b> ataque especificamente o ponto fraco, não o que já domina</li>
  <li><b>Meça com objetividade:</b> simulados mostram avanço que a sensação esconde</li>
  <li><b>Descanso conta:</b> às vezes o platô é fadiga — o salto vem após dormir/folgar</li>
</ul>
<p style="margin-top:8px">No platô, "mais do mesmo" não resolve. Mude o método e o desafio para destravar o próximo nível. 📉</p>`;

    if (/efeito zeigarnik|zeigarnik|tarefa inacabada|deixar inacabad|parar no meio|loop aberto|loops abertos/.test(t))
      return `<p><strong>Efeito Zeigarnik (tarefas inacabadas grudam na mente):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>O cérebro guarda melhor o que ficou em aberto</b> — tarefas inacabadas geram tensão produtiva</li>
  <li><b>Truque para começar:</b> pare a sessão <b>no meio</b> de algo fácil — voltar no dia seguinte fica mais natural</li>
  <li><b>Esvazie a mente:</b> "loops abertos" (coisas a fazer) consomem atenção — anote tudo para liberar foco</li>
  <li><b>Cuidado com o excesso:</b> muitas tarefas pendentes viram ansiedade, não motivação</li>
</ul>
<p style="margin-top:8px">Interromper de propósito num ponto fácil é um truque poderoso contra a barreira do recomeço. ✂️</p>`;

    if (/efeito de teste|testing effect|prova como estudo|fazer prova ajuda|simulado memoriza|recuperacao melhora|recuperação melhora/.test(t))
      return `<p><strong>Efeito de teste (testar ensina mais que reler):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Fazer um teste é estudo,</b> não só medição — o ato de recuperar fortalece a memória</li>
  <li><b>Estudo Roediger & Karpicke:</b> quem se testou reteve <b>~50% mais</b> a longo prazo que quem releu</li>
  <li><b>Mesmo errando você aprende</b> mais do que relendo passivamente (desde que veja a correção)</li>
  <li><b>Transforme tudo em pergunta:</b> resumo vira flashcard, título vira questão</li>
</ul>
<p style="margin-top:8px">Não espere "estar pronto" para se testar — testar É o que te deixa pronto. 🧪</p>`;

    if (/dependente de estado|dependencia de contexto|dependência de contexto|estudar no mesmo lugar da prova|contexto da prova|variar local|mudar de ambiente para estudar/.test(t))
      return `<p><strong>Memória dependente de contexto (varie os ambientes):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Estudar sempre no mesmo lugar</b> amarra a memória àquele contexto — e a prova é em outro lugar</li>
  <li><b>Variar locais de estudo</b> cria múltiplas "âncoras" e a recordação fica mais robusta</li>
  <li><b>Faça simulados em ambiente novo</b> (biblioteca, sala diferente) para treinar a recuperação fora de casa</li>
  <li><b>Estado interno conta:</b> evite estudar sempre superdopado de café se na prova você estará diferente</li>
</ul>
<p style="margin-top:8px">Aprender em contextos variados é uma "dificuldade desejável": custa um pouco, mas a memória vira mais portátil. 🌍</p>`;

    if (/dupla codificacao|dupla codificação|dual coding|texto mais imagem|aprender com imagem|combinar palavra e imagem|verbal e visual/.test(t))
      return `<p><strong>Dupla codificação (palavra + imagem):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Teoria de Paivio:</b> combinar informação verbal com visual cria <b>duas rotas</b> de memória</li>
  <li><b>Desenhe o conceito:</b> esquemas, diagramas e setas fixam mais que só o texto</li>
  <li><b>Sketchnoting:</b> anotações com pequenos desenhos e símbolos turbinam a retenção</li>
  <li><b>Não precisa saber desenhar:</b> rabiscos toscos funcionam — o esforço de representar é o que importa</li>
  <li><b>Ótimo para:</b> processos, anatomia, ciclos, linha do tempo, fluxos</li>
</ul>
<p style="margin-top:8px">Uma imagem ligada à ideia vale mais que reler o parágrafo cinco vezes. Desenhe o que estuda. 🎨</p>`;

    if (/elaboracao|elaboração|perguntar por que|interrogacao elaborativa|interrogação elaborativa|conectar com o que ja sei|conectar com o que já sei|elaborative/.test(t))
      return `<p><strong>Interrogação elaborativa (pergunte "por quê?"):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Para cada fato, pergunte "por que isso é verdade?"</b> e responda — força entendimento, não decoreba</li>
  <li><b>Conecte ao que você já sabe:</b> ligar conteúdo novo a conhecimento prévio cria mais "ganchos" de memória</li>
  <li><b>Auto-explicação:</b> narre seu raciocínio enquanto resolve ("escolhi essa fórmula porque...")</li>
  <li><b>Compare e contraste</b> conceitos parecidos para fixar as diferenças</li>
</ul>
<p style="margin-top:8px">Conhecimento isolado se perde; conhecimento conectado vira rede que se sustenta sozinha. 🕸️</p>`;

    if (/diario de estudo|diário de estudo|registro de estudo|log de estudo|metacogni|monitorar aprendizado|reflexao semanal|reflexão semanal/.test(t))
      return `<p><strong>Diário de estudo e metacognição:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Anote ao fim da sessão:</b> o que estudou, o que travou e o que faz amanhã — fecha o ciclo</li>
  <li><b>Metacognição:</b> "pensar sobre como você aprende" é o que separa quem evolui de quem repete erros</li>
  <li><b>Revisão semanal (15 min):</b> o que funcionou, o que não, qual o foco da próxima semana</li>
  <li><b>Meça com dados:</b> horas reais, questões feitas, % de acerto — sensação engana, número não</li>
</ul>
<p style="margin-top:8px">No StudyOS, suas sessões e metas já viram esse log. Reserve 15 min no domingo para ajustar a rota. 📓</p>`;

    if (/oversleep|dormi demais|sonolencia ao estudar|sonolência ao estudar|sono na hora de estudar|durmo estudando|pego no sono estudando|combater o sono/.test(t))
      return `<p><strong>Pego no sono estudando — o que fazer:</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Estudo passivo dá sono:</b> leitura silenciosa adormece — troque por active recall, escrever e resolver</li>
  <li><b>Sente ereto, longe da cama:</b> a postura e o local mudam o estado de alerta</li>
  <li><b>Hidrate e ventile:</b> ar parado e quente e desidratação aumentam a sonolência</li>
  <li><b>Power nap de 10-20 min</b> resolve sono real melhor que lutar contra ele por 2h</li>
  <li><b>Luz forte e movimento:</b> luz natural e um alongamento rápido reativam o cérebro</li>
</ul>
<p style="margin-top:8px">Se o sono é constante, pode ser dívida de sono ou estudo passivo demais — ataque a causa, não o sintoma. 😵</p>`;

    if (/sindrome de burnin|tela azul mental|fadiga de decisao|fadiga de decisão|cansaco de escolha|cansaço de escolha|decidir demais|paralisia de decisao do dia/.test(t))
      return `<p><strong>Fadiga de decisão (decidir cansa):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Cada escolha gasta energia mental</b> — no fim do dia, sobra pouca força de vontade para estudar</li>
  <li><b>Automatize o trivial:</b> deixe roupa, comida e material decididos na noite anterior</li>
  <li><b>Planeje o estudo de véspera:</b> chegar e já saber "o que estudar agora" evita gastar foco decidindo</li>
  <li><b>Decisões importantes cedo,</b> quando a mente está fresca</li>
  <li><b>Rotina reduz escolhas:</b> horário e local fixos eliminam dezenas de microdecisões</li>
</ul>
<p style="margin-top:8px">Quanto menos você decide, mais energia sobra para o que importa. Deixe o plano pronto e só execute. 🧠</p>`;

    if (/decoreba de ultima hora|decoreba de última hora|virar a noite|madrugar antes da prova|estudar de madrugada antes|cramming|enfiar conteudo|enfiar conteúdo/.test(t))
      return `<p><strong>Virar a noite / decoreba de última hora (cramming):</strong></p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li><b>Funciona pouco e custa caro:</b> sem sono, a memória não consolida e o raciocínio despenca na prova</li>
  <li><b>Se for inevitável:</b> foque no que mais cai (incidência), não tente "tudo"</li>
  <li><b>Active recall mesmo na pressa:</b> resolver questões fixa mais que reler resumo</li>
  <li><b>Durma ao menos 3-4h:</b> trocar todo o sono por estudo costuma piorar a nota</li>
  <li><b>Cafeína com parcimônia:</b> excesso vira ansiedade e tremor na hora H</li>
</ul>
<p style="margin-top:8px">Cramming tapa buraco para prova de amanhã, mas evapora em dias. Para concurso/ENEM, só constância espaçada funciona. 🌙</p>`;

    // ───────── fallback inteligente (sugere o tópico mais próximo) ─────────
    {
      const topics = [
        { k:['pomodoro','tempo','hora','cronometr'], s:'a Técnica Pomodoro' },
        { k:['memoriz','lembrar','decorar','guardar'], s:'como memorizar mais rápido' },
        { k:['prova','concurso','vestibular','enem','exame'], s:'preparação para provas' },
        { k:['foco','concentr','distrai','celular'], s:'técnicas de foco' },
        { k:['procrast','enrolar','preguic','desanim'], s:'vencer a procrastinação' },
        { k:['cronograma','plano','organiz','rotina','horario','horário'], s:'montar um cronograma' },
        { k:['recall','flashcard','anki','testar'], s:'active recall e flashcards' },
        { k:['ansiedade','nervos','branco','panico','pânico'], s:'controlar a ansiedade na prova' },
        { k:['idioma','ingles','inglês','lingua','língua'], s:'aprender idiomas' },
        { k:['matematica','matemática','calculo','cálculo'], s:'como estudar matemática' },
        { k:['redacao','redação','dissertacao','escrever','texto'], s:'redação e escrita' },
      ];
      let best = null, bestScore = 0;
      for (const tp of topics) {
        const sc = tp.k.reduce((a,kw)=> a + (t.includes(kw)?1:0), 0);
        if (sc > bestScore) { bestScore = sc; best = tp; }
      }
      if (best && bestScore>0) {
        return `<p>Acho que você quer falar sobre <b>${best.s}</b> — pode perguntar diretamente que eu detalho! 😊</p>
<p style="margin-top:8px">Ou explore: Pomodoro, active recall, técnica Feynman, Cornell, repetição espaçada, foco, procrastinação, cronograma, provas e concursos.</p>`;
      }
      return `<p>Boa pergunta! Posso te ajudar com:</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Técnicas: Pomodoro, Active Recall, Feynman, Cornell, mapas mentais</li>
  <li>Memorização e repetição espaçada</li>
  <li>Foco profundo, procrastinação e ansiedade de prova</li>
  <li>Cronograma, metas SMART e melhor horário de estudo</li>
  <li>Provas, concursos, idiomas, matemática e redação</li>
</ul>
<p style="margin-top:8px">Sobre qual desses você quer saber mais? 📚</p>`;
    }
  }

  function sbSend(e, preset) {
    if (e) e.preventDefault();
    const inp = document.getElementById('sbInput');
    const q = preset || (inp ? inp.value.trim() : '');
    if (!q) return;
    if (inp) inp.value = '';

    const msgs = document.getElementById('sbMessages');
    if (!msgs) return;

    // user bubble
    const uDiv = document.createElement('div');
    uDiv.className = 'ai-msg user';
    uDiv.textContent = q;
    msgs.appendChild(uDiv);

    // hide chips
    const chips = document.getElementById('sbSuggestions');
    if (chips) chips.style.display = 'none';

    // typing indicator
    const typing = document.createElement('div');
    typing.className = 'ai-msg bot typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(() => {
      typing.remove();
      const bDiv = document.createElement('div');
      bDiv.className = 'ai-msg bot';
      bDiv.innerHTML = sbAnswer(q);
      msgs.appendChild(bDiv);
      msgs.scrollTop = msgs.scrollHeight;
    }, 600 + Math.random() * 400);
  }

  // ── POMODORO ENGINE ──────────────────────────────────────────────
  let _pomoState = {
    mode: 'work',    // 'work' | 'break' | 'long'
    totalSecs: 25 * 60,
    remaining: 25 * 60,
    running: false,
    interval: null,
    pomos: 0,
  };

  function sSetMode(mode) {
    if (_pomoState.running) sPomoStop();
    _pomoState.mode = mode;
    const s = sData();
    const dur = mode === 'work' ? (s.settings.pomoDur || 25)
      : mode === 'break' ? (s.settings.breakDur || 5) : 20;
    _pomoState.totalSecs = dur * 60;
    _pomoState.remaining = _pomoState.totalSecs;
    renderPomoState();
    ['sModeWork', 'sModeBreak', 'sModeLong'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.remove('active');
    });
    const activeId = { work: 'sModeWork', break: 'sModeBreak', long: 'sModeLong' }[mode];
    const ab = document.getElementById(activeId);
    if (ab) ab.classList.add('active');
  }

  function sPomoToggle() {
    if (_pomoState.running) sPomoStop(); else sPomoStart();
  }

  function sPomoStart() {
    _pomoState.running = true;
    _pomoState.interval = setInterval(() => {
      _pomoState.remaining--;
      renderPomoState();
      if (_pomoState.remaining <= 0) {
        sPomoStop();
        if (_pomoState.mode === 'work') {
          _pomoState.pomos++;
          // auto-save pomodoro as session
          const subjEl = document.getElementById('sPomoSubject');
          const subject = subjEl ? subjEl.value || 'Geral' : 'Geral';
          const s = sData();
          const mins = s.settings.pomoDur || 25;
          sToday().sessions.push({ subject, mins, notes: 'Pomodoro', ts: Date.now() });
          sPersist();
          const listEl = document.getElementById('sSessionsList');
          if (listEl) listEl.innerHTML = renderSessionsList(sToday().sessions, s);
          if (typeof showToast === 'function') showToast('Pomodoro concluído! Bom trabalho.');
        }
        const countEl = document.getElementById('sPomodosCount');
        if (countEl) countEl.textContent = _pomoState.pomos;
      }
    }, 1000);
    renderPomoState();
  }

  function sPomoStop() {
    _pomoState.running = false;
    clearInterval(_pomoState.interval);
    renderPomoState();
  }

  function sPomoReset() {
    sPomoStop();
    const s = sData();
    const dur = _pomoState.mode === 'work' ? (s.settings.pomoDur || 25)
      : _pomoState.mode === 'break' ? (s.settings.breakDur || 5) : 20;
    _pomoState.totalSecs = dur * 60;
    _pomoState.remaining = _pomoState.totalSecs;
    renderPomoState();
  }

  function sPomoSkip() {
    sPomoStop();
    _pomoState.remaining = 0;
    renderPomoState();
    sSetMode(_pomoState.mode === 'work' ? 'break' : 'work');
  }

  function renderPomoState() {
    const mins = Math.floor(_pomoState.remaining / 60);
    const secs = _pomoState.remaining % 60;
    const timeEl = document.getElementById('sPomoTime');
    if (timeEl) timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const arc = document.getElementById('sPomoArc');
    if (arc) {
      const circumference = 2 * Math.PI * 88;
      const offset = circumference * (1 - _pomoState.remaining / _pomoState.totalSecs);
      arc.style.strokeDashoffset = offset;
    }

    const icon = document.getElementById('sPomoPlayIcon');
    if (icon) {
      if (_pomoState.running) {
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      } else {
        icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      }
    }

    const label = document.getElementById('sPomoLabel');
    if (label) {
      label.textContent = { work: 'Foco', break: 'Pausa', long: 'Pausa Longa' }[_pomoState.mode];
    }
  }

  // ── ações: Sessões ───────────────────────────────────────────────
  function sAddSession() {
    const subjectEl = document.getElementById('sManualSubject');
    const minsEl = document.getElementById('sManualMins');
    const dateEl = document.getElementById('sManualDate');
    const notesEl = document.getElementById('sManualNotes');

    const subject = subjectEl ? subjectEl.value.trim() || 'Geral' : 'Geral';
    const mins = parseInt(minsEl ? minsEl.value : '0') || 0;
    const date = dateEl ? dateEl.value : todayKey();
    const notes = notesEl ? notesEl.value.trim() : '';

    if (mins <= 0) {
      if (typeof showToast === 'function') showToast('Informe a duração em minutos.');
      return;
    }

    const s = sData();
    if (!s.days[date]) s.days[date] = { sessions: [] };
    s.days[date].sessions.push({ subject, mins, notes, ts: Date.now() });
    sPersist();

    if (minsEl) minsEl.value = '';
    if (notesEl) notesEl.value = '';

    const listEl = document.getElementById('sSessionsList');
    if (listEl && date === todayKey()) listEl.innerHTML = renderSessionsList(sToday().sessions, s);

    if (typeof showToast === 'function') showToast(`${fmtDur(mins)} de ${subject} registrados!`);
  }

  function sSetMins(m) {
    const el = document.getElementById('sManualMins');
    if (el) { el.value = m; el.focus(); }
  }

  function sDelSession(i) {
    const today = sToday();
    today.sessions.splice(i, 1);
    sPersist();
    const s = sData();
    const listEl = document.getElementById('sSessionsList');
    if (listEl) listEl.innerHTML = renderSessionsList(today.sessions, s);
  }

  // ── ações: Matérias ──────────────────────────────────────────────
  let _selectedColor = SUBJ_COLORS[0];

  function sOpenSubjectForm() {
    const f = document.getElementById('sSubjectForm');
    if (f) { f.style.display = ''; f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  function sCloseSubjectForm() {
    const f = document.getElementById('sSubjectForm');
    if (f) f.style.display = 'none';
  }

  function sPickColor(btn) {
    _selectedColor = btn.dataset.color;
    document.querySelectorAll('.s-color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function sAddSubject() {
    const nameEl = document.getElementById('sSubjName');
    const goalEl = document.getElementById('sSubjGoal');
    const name = nameEl ? nameEl.value.trim() : '';
    const weeklyGoal = parseFloat(goalEl ? goalEl.value : '5') || 5;

    if (!name) {
      if (typeof showToast === 'function') showToast('Informe o nome da matéria.');
      return;
    }

    const s = sData();
    if (s.subjects.find(x => x.name === name)) {
      if (typeof showToast === 'function') showToast('Matéria já existe.');
      return;
    }

    s.subjects.push({ name, color: _selectedColor, weeklyGoal });
    sPersist();

    if (nameEl) nameEl.value = '';
    sCloseSubjectForm();
    renderSGoals();
    if (typeof showToast === 'function') showToast(`Matéria "${name}" criada!`);
  }

  function sDelSubject(i) {
    const s = sData();
    s.subjects.splice(i, 1);
    sPersist();
    renderSGoals();
  }

  function sSaveSettings() {
    const s = sData();
    const dg = parseFloat(document.getElementById('sDailyGoal')?.value) || 4;
    const pd = parseInt(document.getElementById('sPomoDur')?.value) || 25;
    const bd = parseInt(document.getElementById('sBreakDur')?.value) || 5;
    s.settings.dailyGoal = dg;
    s.settings.pomoDur = pd;
    s.settings.breakDur = bd;
    sPersist();
    sPomoReset();
    if (typeof showToast === 'function') showToast('Configurações salvas!');
  }

  // ── gráficos ─────────────────────────────────────────────────────
  let _sCharts = {};

  function destroySChart(id) {
    if (_sCharts[id]) { try { _sCharts[id].destroy(); } catch (e) {} delete _sCharts[id]; }
  }

  function drawSCharts(pct, last7, labels, subjectMap, s) {
    setTimeout(() => {
      // Ring diário
      destroySChart('sDailyRing');
      const rc = document.getElementById('sDailyRing');
      if (rc) {
        _sCharts['sDailyRing'] = new Chart(rc, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [pct, Math.max(0, 100 - pct)],
              backgroundColor: ['#6366f1', 'rgba(99,102,241,.12)'],
              borderWidth: 0,
            }]
          },
          options: {
            cutout: '76%', responsive: false, animation: { duration: 600 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          }
        });
      }

      // Bar semanal
      destroySChart('sWeekChart');
      const wc = document.getElementById('sWeekChart');
      if (wc) {
        _sCharts['sWeekChart'] = new Chart(wc, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Horas',
              data: last7,
              backgroundColor: last7.map((_, i) => i === 6 ? '#6366f1' : 'rgba(99,102,241,.35)'),
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw}h` } } },
            scales: {
              x: { grid: { display: false }, ticks: { color: 'rgba(148,163,184,.8)', font: { size: 11 } } },
              y: { grid: { color: 'rgba(148,163,184,.1)' }, ticks: { color: 'rgba(148,163,184,.8)', font: { size: 11 }, callback: v => v + 'h' }, beginAtZero: true },
            }
          }
        });
      }

      // Pie por matéria
      destroySChart('sSubjectPie');
      const pc = document.getElementById('sSubjectPie');
      if (pc && Object.keys(subjectMap).length > 0) {
        const names = Object.keys(subjectMap);
        const colors = names.map(n => {
          const sub = s.subjects.find(x => x.name === n);
          return sub ? sub.color : '#6366f1';
        });
        _sCharts['sSubjectPie'] = new Chart(pc, {
          type: 'doughnut',
          data: {
            labels: names,
            datasets: [{ data: Object.values(subjectMap), backgroundColor: colors, borderWidth: 2, borderColor: 'var(--bg-card)' }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: 'rgba(148,163,184,.9)', font: { size: 11 }, padding: 8 } },
              tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmtDur(ctx.raw)}` } }
            }
          }
        });
      }
    }, 80);
  }

  // ── hook de navegação ────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  //  TAREFAS
  // ════════════════════════════════════════════════════════════════
  let _taskFilter = 'all';

  function renderSTasks() {
    const s = sData();
    if (!s.tasks) s.tasks = [];
    const tasks = s.tasks;
    const today = todayKey();

    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done).length;
    const late = tasks.filter(t => !t.done && t.deadline && t.deadline < today).length;

    const subjectOptions = s.subjects.length ? s.subjects.map(sub => `<option value="${sub.name}">${sub.name}</option>`).join('') : '<option value="Geral">Geral</option>';

    const filtered = tasks.filter(t => {
      if (_taskFilter === 'pending') return !t.done;
      if (_taskFilter === 'done') return t.done;
      return true;
    }).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pr = { Alta: 0, Média: 1, Baixa: 2 };
      return (pr[a.priority] || 1) - (pr[b.priority] || 1);
    });

    const el = document.getElementById('s-tasks');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><h1>Tarefas</h1><p class="page-sub">Organize o que você precisa estudar ou entregar.</p></div>
        <div class="page-header-actions"><button class="btn-primary-sm" onclick="sOpenTaskForm()">+ Nova Tarefa</button></div>
      </div>
      <div class="kpi-grid kpi-grid-4" style="margin-bottom:16px">
        <div class="kpi-card" style="--ic:#6366f1"><div class="kpi-label">Total</div><div class="kpi-value">${total}</div><div class="kpi-trend" style="color:#6366f1">tarefas</div></div>
        <div class="kpi-card" style="--ic:#10b981"><div class="kpi-label">Concluídas</div><div class="kpi-value">${done}</div><div class="kpi-trend" style="color:#10b981">feitas</div></div>
        <div class="kpi-card" style="--ic:#f59e0b"><div class="kpi-label">Pendentes</div><div class="kpi-value">${pending}</div><div class="kpi-trend" style="color:#f59e0b">a fazer</div></div>
        <div class="kpi-card" style="--ic:#ef4444"><div class="kpi-label">Atrasadas</div><div class="kpi-value">${late}</div><div class="kpi-trend" style="color:#ef4444">vencidas</div></div>
      </div>
      <div class="cf-card" id="sTaskForm" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Nova Tarefa</h3>
        <div class="form-grid-2" style="gap:10px">
          <div class="form-group full"><label>Título</label><input type="text" class="s-input" id="sTaskTitle" placeholder="Ex: Revisar capítulo 5"/></div>
          <div class="form-group"><label>Matéria</label><select class="s-select" id="sTaskSubject">${subjectOptions}</select></div>
          <div class="form-group"><label>Prioridade</label><select class="s-select" id="sTaskPriority"><option value="Alta">Alta</option><option value="Média" selected>Média</option><option value="Baixa">Baixa</option></select></div>
          <div class="form-group"><label>Prazo</label><input type="date" class="s-input" id="sTaskDeadline"/></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-cancel" onclick="sCloseTaskForm()">Cancelar</button>
          <button class="btn-confirm" onclick="sAddTask()">Criar Tarefa</button>
        </div>
      </div>
      <div class="cf-card">
        <div style="display:flex;gap:6px;margin-bottom:14px">
          ${['all','pending','done'].map(f=>`<button class="s-mode-btn${_taskFilter===f?' active':''}" onclick="sFilterTasks('${f}')">${{all:'Todas',pending:'Pendentes',done:'Concluídas'}[f]}</button>`).join('')}
        </div>
        <div id="sTaskList">${renderTaskList(filtered, today)}</div>
      </div>`;
  }

  function renderTaskList(tasks, today) {
    if (!tasks.length) return `<div class="empty-state"><p>Nenhuma tarefa aqui.</p></div>`;
    const PCOLOR = { Alta:'#ef4444', Média:'#f59e0b', Baixa:'#10b981' };
    return tasks.map((t, i) => {
      const late = !t.done && t.deadline && t.deadline < today;
      return `<div class="cf-li" style="${t.done?'opacity:.55':''}">
        <div class="cf-li-main">
          <input type="checkbox" ${t.done?'checked':''} style="margin-right:8px;width:16px;height:16px;accent-color:var(--indigo);cursor:pointer" onchange="sToggleTask(${t.id})"/>
          <div>
            <div class="cf-li-name" style="${t.done?'text-decoration:line-through':''}">${t.title}</div>
            <div class="cf-li-sub">
              <span class="s-subj-chip" style="--sc:${sSubjColor(t.subject)}">${t.subject}</span>
              <span style="margin-left:6px;color:${PCOLOR[t.priority]};font-size:11px;font-weight:600">${t.priority}</span>
              ${t.deadline?`<span style="margin-left:6px;font-size:11px;color:${late?'#ef4444':'var(--text-3)'}">${late?'⚠ Atrasada — ':''} ${new Date(t.deadline+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>`:''}
            </div>
          </div>
        </div>
        <div class="cf-li-right"><button class="cf-del" onclick="sDelTask(${t.id})">×</button></div>
      </div>`;
    }).join('');
  }

  function sSubjColor(name) {
    const s = sData().subjects.find(x => x.name === name);
    return s ? s.color : '#6366f1';
  }

  function sOpenTaskForm() { const f = document.getElementById('sTaskForm'); if (f) { f.style.display=''; f.scrollIntoView({behavior:'smooth',block:'nearest'}); } }
  function sCloseTaskForm() { const f = document.getElementById('sTaskForm'); if (f) f.style.display='none'; }

  function sAddTask() {
    const title = document.getElementById('sTaskTitle')?.value.trim();
    if (!title) { showToast && showToast('Informe o título da tarefa.'); return; }
    const s = sData();
    if (!s.tasks) s.tasks = [];
    s.tasks.push({ id: Date.now(), title, subject: document.getElementById('sTaskSubject')?.value||'Geral', priority: document.getElementById('sTaskPriority')?.value||'Média', deadline: document.getElementById('sTaskDeadline')?.value||'', done: false });
    sPersist();
    sCloseTaskForm();
    renderSTasks();
    showToast && showToast('Tarefa criada!');
  }

  function sToggleTask(id) {
    const s = sData();
    const t = s.tasks?.find(t => t.id === id);
    if (t) { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; }
    sPersist();
    const today = todayKey();
    const filtered = (s.tasks||[]).filter(t => { if (_taskFilter==='pending') return !t.done; if (_taskFilter==='done') return t.done; return true; }).sort((a,b)=>a.done===b.done?0:a.done?1:-1);
    const list = document.getElementById('sTaskList');
    if (list) list.innerHTML = renderTaskList(filtered, today);
  }

  function sDelTask(id) {
    const s = sData();
    if (s.tasks) s.tasks = s.tasks.filter(t => t.id !== id);
    sPersist();
    renderSTasks();
  }

  function sFilterTasks(f) {
    _taskFilter = f;
    renderSTasks();
  }

  // ════════════════════════════════════════════════════════════════
  //  FLASHCARDS
  // ════════════════════════════════════════════════════════════════
  let _fcDeck = null, _fcCard = 0, _fcFlipped = false, _fcReview = false;

  function renderSFlashcards() {
    const s = sData();
    if (!s.decks) s.decks = [];
    if (_fcReview && _fcDeck !== null) { renderFCReview(); return; }

    const subjectOptions = s.subjects.length ? s.subjects.map(sub=>`<option value="${sub.name}">${sub.name}</option>`).join('') : '<option value="Geral">Geral</option>';
    const el = document.getElementById('s-flashcards');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><h1>Flashcards</h1><p class="page-sub">Crie baralhos e revise com repetição espaçada.</p></div>
        <div class="page-header-actions"><button class="btn-primary-sm" onclick="sFCNewDeck()">+ Novo Baralho</button></div>
      </div>
      <div class="cf-card" id="sFCDeckForm" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Novo Baralho</h3>
        <div class="form-grid-2" style="gap:10px">
          <div class="form-group full"><label>Nome do baralho</label><input type="text" class="s-input" id="sFCDeckName" placeholder="Ex: Biologia - Célula"/></div>
          <div class="form-group"><label>Matéria</label><select class="s-select" id="sFCDeckSubject">${subjectOptions}</select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-cancel" onclick="document.getElementById('sFCDeckForm').style.display='none'">Cancelar</button>
          <button class="btn-confirm" onclick="sFCCreateDeck()">Criar</button>
        </div>
      </div>
      ${s.decks.length === 0 ? `<div class="cf-card" style="text-align:center;padding:40px"><p style="color:var(--text-2)">Nenhum baralho criado ainda.<br>Crie um para começar a revisar.</p></div>` :
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${s.decks.map((d, i) => {
          const color = sSubjColor(d.subject);
          return `<div class="cf-card" style="border-left:3px solid ${color}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
              <div>
                <div style="font-weight:700;font-size:15px">${d.name}</div>
                <div class="s-subj-chip" style="--sc:${color};margin-top:4px">${d.subject}</div>
              </div>
              <button class="cf-del" onclick="sFCDelDeck(${i})">×</button>
            </div>
            <div style="color:var(--text-2);font-size:13px;margin-bottom:12px">${d.cards.length} cartões</div>
            <div style="display:flex;gap:8px">
              <button class="s-mode-btn" onclick="sFCAddCard(${i})" style="flex:1">+ Cartão</button>
              ${d.cards.length > 0 ? `<button class="btn-confirm" onclick="sFCStartReview(${i})" style="flex:1;font-size:12px;padding:6px">Revisar</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`}`;
  }

  function sFCNewDeck() { const f = document.getElementById('sFCDeckForm'); if (f) { f.style.display=''; f.scrollIntoView({behavior:'smooth',block:'nearest'}); } }

  function sFCCreateDeck() {
    const name = document.getElementById('sFCDeckName')?.value.trim();
    if (!name) { showToast && showToast('Informe o nome do baralho.'); return; }
    const s = sData();
    if (!s.decks) s.decks = [];
    s.decks.push({ id: Date.now(), name, subject: document.getElementById('sFCDeckSubject')?.value||'Geral', cards: [] });
    sPersist();
    renderSFlashcards();
  }

  function sFCDelDeck(i) {
    const s = sData(); if (!s.decks) return;
    s.decks.splice(i, 1); sPersist(); renderSFlashcards();
  }

  function sFCAddCard(deckIdx) {
    const front = prompt('Frente do cartão (pergunta):');
    if (!front) return;
    const back = prompt('Verso do cartão (resposta):');
    if (!back) return;
    const s = sData();
    s.decks[deckIdx].cards.push({ front, back, score: 0 });
    sPersist();
    renderSFlashcards();
    showToast && showToast('Cartão adicionado!');
  }

  function sFCStartReview(deckIdx) {
    _fcDeck = deckIdx; _fcCard = 0; _fcFlipped = false; _fcReview = true;
    renderFCReview();
  }

  function renderFCReview() {
    const s = sData();
    const deck = s.decks[_fcDeck];
    if (!deck || deck.cards.length === 0) { _fcReview = false; renderSFlashcards(); return; }
    const card = deck.cards[_fcCard];
    const el = document.getElementById('s-flashcards');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><h1>${deck.name}</h1><p class="page-sub">Cartão ${_fcCard+1} de ${deck.cards.length}</p></div>
        <div class="page-header-actions"><button class="btn-sm" onclick="sFCExitReview()">Sair</button></div>
      </div>
      <div style="max-width:540px;margin:32px auto">
        <div class="fc-card" onclick="sFCFlip()" id="fcCardEl" style="cursor:pointer">
          <div class="fc-front ${_fcFlipped?'fc-hidden':''}">
            <div class="fc-label">Pergunta</div>
            <div class="fc-text">${card.front}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:16px">Toque para ver a resposta</div>
          </div>
          <div class="fc-back ${_fcFlipped?'':'fc-hidden'}">
            <div class="fc-label" style="color:var(--green)">Resposta</div>
            <div class="fc-text">${card.back}</div>
          </div>
        </div>
        ${_fcFlipped ? `
        <div style="display:flex;gap:12px;margin-top:20px">
          <button class="btn-cancel" style="flex:1;padding:14px" onclick="sFCAnswer('hard')">😓 Difícil</button>
          <button class="btn-confirm" style="flex:1;padding:14px" onclick="sFCAnswer('easy')">😊 Fácil</button>
        </div>` : `
        <div style="text-align:center;margin-top:20px">
          <button class="btn-confirm" style="padding:14px 40px" onclick="sFCFlip()">Ver Resposta</button>
        </div>`}
        <div style="display:flex;justify-content:center;gap:4px;margin-top:20px">
          ${deck.cards.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===_fcCard?'var(--indigo)':'var(--border)'}"></div>`).join('')}
        </div>
      </div>`;
  }

  function sFCFlip() { _fcFlipped = !_fcFlipped; renderFCReview(); }

  function sFCAnswer(result) {
    const s = sData();
    if (result === 'easy') s.decks[_fcDeck].cards[_fcCard].score = (_fcDeck||0) + 1;
    sPersist();
    _fcCard++;
    _fcFlipped = false;
    if (_fcCard >= s.decks[_fcDeck].cards.length) {
      _fcReview = false;
      showToast && showToast('Revisão concluída!');
      renderSFlashcards();
    } else renderFCReview();
  }

  function sFCExitReview() { _fcReview = false; renderSFlashcards(); }

  // ════════════════════════════════════════════════════════════════
  //  CRONOGRAMA SEMANAL
  // ════════════════════════════════════════════════════════════════
  const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const HOURS = Array.from({length:16},(_,i)=>i+7); // 7h–22h

  function renderSSchedule() {
    const s = sData();
    if (!s.schedule) s.schedule = {};
    const el = document.getElementById('s-schedule');
    if (!el) return;

    const subjectOptions = s.subjects.length ? s.subjects.map(sub=>`<option value="${sub.name}">${sub.name}</option>`).join('') : '<option value="Estudo">Estudo</option>';

    el.innerHTML = `
      <div class="page-header"><div><h1>Cronograma Semanal</h1><p class="page-sub">Planeje seus horários de estudo para cada dia.</p></div></div>
      <div class="cf-card" style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:8px">Clique em uma célula vazia para adicionar, clique novamente para remover.</div>
        <div class="s-schedule-wrap">
          <div class="s-schedule-grid">
            <div class="s-sch-header"></div>
            ${WEEKDAYS.map(d=>`<div class="s-sch-header">${d}</div>`).join('')}
            ${HOURS.map(h=>`
              <div class="s-sch-time">${h}h</div>
              ${WEEKDAYS.map((_,di)=>{
                const key=`${di}-${h}`;
                const block = s.schedule[key];
                const color = block ? sSubjColor(block.subject) : null;
                return block
                  ? `<div class="s-sch-cell filled" style="background:${color}22;border-color:${color};color:${color}" onclick="sSchClear('${key}')" title="Clique para remover">${block.subject}</div>`
                  : `<div class="s-sch-cell" onclick="sSchAdd('${key}')" title="Adicionar bloco"></div>`;
              }).join('')}
            `).join('')}
          </div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-3)">Adicionar bloco:</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center" id="sSchAddRow">
          <select class="s-select" id="sSchSubject" style="flex:1;min-width:140px">${subjectOptions}</select>
          <span style="font-size:12px;color:var(--text-3)">Selecione a matéria e clique numa célula vazia</span>
        </div>
      </div>`;
  }

  function sSchAdd(key) {
    const s = sData();
    if (!s.schedule) s.schedule = {};
    if (s.schedule[key]) { sSchClear(key); return; }
    const subj = document.getElementById('sSchSubject')?.value || 'Estudo';
    s.schedule[key] = { subject: subj };
    sPersist();
    renderSSchedule();
  }

  function sSchClear(key) {
    const s = sData();
    if (s.schedule) { delete s.schedule[key]; sPersist(); renderSSchedule(); }
  }

  // ════════════════════════════════════════════════════════════════
  //  CALCULADORA DE NOTAS
  // ════════════════════════════════════════════════════════════════
  function renderSGrades() {
    const s = sData();
    if (!s.gradeBook) s.gradeBook = [];
    const el = document.getElementById('s-grades');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><h1>Calculadora de Notas</h1><p class="page-sub">Acompanhe suas notas e calcule médias ponderadas.</p></div>
        <div class="page-header-actions"><button class="btn-primary-sm" onclick="sAddGradeSubject()">+ Matéria</button></div>
      </div>
      ${s.gradeBook.length === 0 ? `<div class="cf-card" style="text-align:center;padding:40px"><p style="color:var(--text-2)">Adicione uma matéria para começar.</p></div>` :
        s.gradeBook.map((gs, si) => {
          const totalWeight = gs.entries.reduce((a,e)=>a+(+e.weight||0),0);
          const avg = totalWeight > 0 ? gs.entries.reduce((a,e)=>a+(+e.grade||0)*(+e.weight||0),0) / totalWeight : null;
          const avgRound = avg !== null ? Math.round(avg*10)/10 : null;
          const color = avgRound !== null ? (avgRound >= 7 ? '#10b981' : avgRound >= 5 ? '#f59e0b' : '#ef4444') : 'var(--indigo)';
          const remaining = 100 - totalWeight;
          const needed = (remaining > 0 && avgRound !== null) ? ((7 * 100 - avg * totalWeight) / remaining).toFixed(1) : null;
          return `<div class="cf-card" style="margin-bottom:14px;border-left:3px solid ${color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="font-size:15px;font-weight:700;color:${color}">${gs.subject}</h3>
              <div style="display:flex;align-items:center;gap:8px">
                ${avgRound!==null?`<span style="font-size:20px;font-weight:900;color:${color}">${avgRound}</span>`:''}
                <button class="cf-del" onclick="sDelGradeSubject(${si})">×</button>
              </div>
            </div>
            ${gs.entries.map((e, ei) => `<div class="cf-li" style="margin-bottom:6px">
              <div class="cf-li-main"><span class="cf-li-name">${e.name}</span><span class="cf-li-sub">Peso: ${e.weight}%</span></div>
              <div class="cf-li-right"><span class="cf-li-val">${e.grade}</span><button class="cf-del" onclick="sDelGradeEntry(${si},${ei})">×</button></div>
            </div>`).join('')}
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              <input type="text" class="s-input" id="sGN_${si}" placeholder="Nome (ex: Prova 1)" style="flex:2;min-width:100px"/>
              <input type="number" class="s-input" id="sGG_${si}" placeholder="Nota (0-10)" min="0" max="10" step="0.1" style="flex:1;min-width:70px"/>
              <input type="number" class="s-input" id="sGW_${si}" placeholder="Peso %" min="1" max="100" style="flex:1;min-width:60px"/>
              <button class="btn-confirm" style="padding:8px 12px;font-size:12px" onclick="sAddGradeEntry(${si})">+ Nota</button>
            </div>
            ${needed && remaining > 0 ? `<div style="margin-top:8px;font-size:12px;color:var(--amber)">Para média 7.0: você precisa de <b>${Math.max(0,Math.min(10,parseFloat(needed))).toFixed(1)}</b> nos ${remaining.toFixed(0)}% restantes.</div>` : ''}
          </div>`;
        }).join('')}
    `;
  }

  function sAddGradeSubject() {
    const name = prompt('Nome da matéria:');
    if (!name) return;
    const s = sData();
    if (!s.gradeBook) s.gradeBook = [];
    s.gradeBook.push({ subject: name, entries: [] });
    sPersist();
    renderSGrades();
  }

  function sDelGradeSubject(i) {
    const s = sData(); if (s.gradeBook) { s.gradeBook.splice(i,1); sPersist(); renderSGrades(); }
  }

  function sAddGradeEntry(si) {
    const name = document.getElementById(`sGN_${si}`)?.value.trim();
    const grade = parseFloat(document.getElementById(`sGG_${si}`)?.value);
    const weight = parseFloat(document.getElementById(`sGW_${si}`)?.value);
    if (!name || isNaN(grade) || isNaN(weight)) { showToast && showToast('Preencha nome, nota e peso.'); return; }
    const s = sData();
    s.gradeBook[si].entries.push({ name, grade, weight });
    sPersist();
    renderSGrades();
  }

  function sDelGradeEntry(si, ei) {
    const s = sData(); s.gradeBook[si].entries.splice(ei,1); sPersist(); renderSGrades();
  }

  // ════════════════════════════════════════════════════════════════
  //  ANOTAÇÕES
  // ════════════════════════════════════════════════════════════════
  let _noteFilter = '', _noteOpen = null;

  function renderSNotes() {
    const s = sData();
    if (!s.notes) s.notes = [];
    const el = document.getElementById('s-notes');
    if (!el) return;

    const subjectOptions = ['Todas', ...(s.subjects.map(sub=>sub.name))];
    const filtered = s.notes.filter(n => !_noteFilter || n.subject === _noteFilter || _noteFilter === 'Todas');
    filtered.sort((a,b) => b.createdAt - a.createdAt);

    el.innerHTML = `
      <div class="page-header">
        <div><h1>Anotações</h1><p class="page-sub">Guarde ideias, resumos e lembretes por matéria.</p></div>
        <div class="page-header-actions"><button class="btn-primary-sm" onclick="sOpenNoteForm()">+ Nova Nota</button></div>
      </div>
      <div class="cf-card" id="sNoteForm" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Nova Anotação</h3>
        <div class="form-grid-2" style="gap:10px">
          <div class="form-group full"><label>Título</label><input type="text" class="s-input" id="sNoteTitle" placeholder="Ex: Resumo de Funções"/></div>
          <div class="form-group"><label>Matéria</label><select class="s-select" id="sNoteSubject">${s.subjects.map(sub=>`<option value="${sub.name}">${sub.name}</option>`).join('')||'<option value="Geral">Geral</option>'}</select></div>
        </div>
        <div class="form-group" style="margin-top:10px"><label>Conteúdo</label><textarea class="s-input" id="sNoteContent" rows="5" style="resize:vertical" placeholder="Escreva aqui..."></textarea></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-cancel" onclick="sCloseNoteForm()">Cancelar</button>
          <button class="btn-confirm" onclick="sAddNote()">Salvar Nota</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${subjectOptions.map(f=>`<button class="s-mode-btn${_noteFilter===f||(!_noteFilter&&f==='Todas')?' active':''}" onclick="sNoteFilterSet('${f}')">${f}</button>`).join('')}
      </div>
      ${filtered.length === 0 ? `<div class="cf-card" style="text-align:center;padding:40px"><p style="color:var(--text-2)">Nenhuma anotação encontrada.</p></div>` :
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${filtered.map((n, i) => {
          const color = sSubjColor(n.subject);
          const isOpen = _noteOpen === n.id;
          return `<div class="cf-card" style="border-left:3px solid ${color};cursor:pointer" onclick="sToggleNote(${n.id})">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px">${n.title}</div>
                <div class="s-subj-chip" style="--sc:${color}">${n.subject}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:4px">${new Date(n.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</div>
              </div>
              <button class="cf-del" onclick="event.stopPropagation();sDelNote(${n.id})">×</button>
            </div>
            ${isOpen ? `<div style="margin-top:12px;font-size:13px;color:var(--text-2);line-height:1.6;white-space:pre-wrap">${n.content}</div>` : `<div style="margin-top:8px;font-size:12px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.content.slice(0,80)}${n.content.length>80?'…':''}</div>`}
          </div>`;
        }).join('')}
      </div>`}`;
  }

  function sOpenNoteForm() { const f=document.getElementById('sNoteForm'); if(f){f.style.display='';f.scrollIntoView({behavior:'smooth',block:'nearest'});} }
  function sCloseNoteForm() { const f=document.getElementById('sNoteForm'); if(f) f.style.display='none'; }

  function sAddNote() {
    const title = document.getElementById('sNoteTitle')?.value.trim();
    const content = document.getElementById('sNoteContent')?.value.trim();
    if (!title || !content) { showToast && showToast('Preencha título e conteúdo.'); return; }
    const s = sData();
    if (!s.notes) s.notes = [];
    s.notes.push({ id: Date.now(), title, content, subject: document.getElementById('sNoteSubject')?.value||'Geral', createdAt: Date.now() });
    sPersist();
    sCloseNoteForm();
    renderSNotes();
    showToast && showToast('Nota salva!');
  }

  function sDelNote(id) { const s=sData(); if(s.notes){s.notes=s.notes.filter(n=>n.id!==id);sPersist();renderSNotes();} }
  function sToggleNote(id) { _noteOpen=(_noteOpen===id?null:id); renderSNotes(); }
  function sNoteFilterSet(f) { _noteFilter=f==='Todas'?'':f; renderSNotes(); }

  const _prevOnAppNavigate = window.onAppNavigate;
  window.onAppNavigate = function (page) {
    if (page === 's-dashboard') renderSDashboard();
    else if (page === 's-sessions') renderSSessions();
    else if (page === 's-goals') renderSGoals();
    else if (page === 's-bot') renderSBot();
    else if (page === 's-tasks') renderSTasks();
    else if (page === 's-flashcards') renderSFlashcards();
    else if (page === 's-schedule') renderSSchedule();
    else if (page === 's-grades') renderSGrades();
    else if (page === 's-notes') renderSNotes();
    if (typeof _prevOnAppNavigate === 'function') _prevOnAppNavigate(page);
  };

  // ── expor funções globais (usadas nos onclick do HTML) ───────────
  Object.assign(window, {
    // sessões & pomodoro
    sAddSession, sSetMins, sDelSession, sPomoToggle, sPomoReset, sPomoSkip, sSetMode, sSaveSettings,
    // matérias
    sOpenSubjectForm, sCloseSubjectForm, sPickColor, sAddSubject, sDelSubject,
    // StudyBot
    sbSend,
    // flashcards
    sFCNewDeck, sFCCreateDeck, sFCDelDeck, sFCAddCard, sFCStartReview, sFCFlip, sFCAnswer, sFCExitReview,
    // tarefas
    sOpenTaskForm, sCloseTaskForm, sAddTask, sToggleTask, sDelTask, sFilterTasks,
    // agenda / cronograma
    sSchAdd, sSchClear,
    // boletim / notas (grades)
    sAddGradeSubject, sDelGradeSubject, sAddGradeEntry, sDelGradeEntry,
    // anotações (notes)
    sOpenNoteForm, sCloseNoteForm, sAddNote, sDelNote, sToggleNote, sNoteFilterSet,
  });
})();
