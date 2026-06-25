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
          <h1 id="sDashGreeting">Bora estudar!</h1>
          <p class="page-sub">Foque, progrida, conquiste.</p>
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
          ${recent.length === 0 ? `<div class="empty-state"><p>Nenhuma sessão ainda. Comece a estudar!</p></div>` : `
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
    const greet = hour < 12 ? 'Bom dia! Ótimo momento para estudar.' : hour < 18 ? 'Boa tarde! Foco total.' : 'Boa noite! Revisão rápida antes de dormir?';
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
      return `<div class="empty-state"><p>Nenhuma sessão hoje. Bora começar!</p></div>`;
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

  // ── expor funções globais ────────────────────────────────────────
  window.sAddSession = sAddSession;
  window.sSetMins = sSetMins;
  window.sDelSession = sDelSession;
  window.sOpenSubjectForm = sOpenSubjectForm;
  window.sCloseSubjectForm = sCloseSubjectForm;
  window.sPickColor = sPickColor;
  window.sAddSubject = sAddSubject;
  window.sDelSubject = sDelSubject;
  window.sSaveSettings = sSaveSettings;
  window.sPomoToggle = sPomoToggle;
  window.sPomoReset = sPomoReset;
  window.sPomoSkip = sPomoSkip;
  window.sSetMode = sSetMode;
  window.sbSend = sbSend;
  window.sAddDeck = sAddDeck;
  window.sDelDeck = sDelDeck;
  window.sAddCard = sAddCard;
  window.sStartReview = sStartReview;
  window.sReviewAnswer = sReviewAnswer;
  window.sAddTask = sAddTask;
  window.sToggleTask = sToggleTask;
  window.sDelTask = sDelTask;
  window.sFilterTasks = sFilterTasks;
  window.sClickCell = sClickCell;
  window.sAddGradeSubject = sAddGradeSubject;
  window.sDelGradeSubject = sDelGradeSubject;
  window.sAddGradeEntry = sAddGradeEntry;
  window.sDelGradeEntry = sDelGradeEntry;
  window.sCalcNeeded = sCalcNeeded;
  window.sAddNote = sAddNote;
  window.sDelNote = sDelNote;
  window.sViewNote = sViewNote;
  window.sFilterNotes = sFilterNotes;
  window.sSearchNotes = sSearchNotes;
})();
