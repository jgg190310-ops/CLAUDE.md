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
          <button class="ai-chip" onclick="sbSend(null,'O que é repetição espaçada?')">Repetição espaçada</button>
          <button class="ai-chip" onclick="sbSend(null,'Como memorizar mais rápido?')">Como memorizar mais?</button>
          <button class="ai-chip" onclick="sbSend(null,'Dicas para provas')">Dicas para provas</button>
          <button class="ai-chip" onclick="sbSend(null,'Como parar de procrastinar?')">Parar de procrastinar</button>
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

    if (/prova|concurs|vestibular|enem|exam/.test(t))
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

    if (/horario|plano|cronograma|organiz|rotina/.test(t))
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

    if (/ola|oi|olá|tudo|bom dia|boa tarde|boa noite/.test(t))
      return `<p>Olá! Pronto para estudar mais e melhor? 📚</p>
<p>Pode me perguntar sobre qualquer técnica de estudo, como organizar seu tempo, como memorizar, dicas para provas ou combater a procrastinação!</p>`;

    return `<p>Boa pergunta! Para te ajudar melhor, posso falar sobre:</p>
<ul style="margin:8px 0 0 16px;line-height:2">
  <li>Técnica Pomodoro e gestão de tempo</li>
  <li>Repetição espaçada e flashcards</li>
  <li>Active recall e memorização</li>
  <li>Preparação para provas e concursos</li>
  <li>Foco e vencer a procrastinação</li>
  <li>Como montar um cronograma</li>
  <li>Técnica Feynman e mapas mentais</li>
</ul>
<p style="margin-top:8px">Qual dessas áreas você quer explorar?</p>`;
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
  const _prevOnAppNavigate = window.onAppNavigate;
  window.onAppNavigate = function (page) {
    if (page === 's-dashboard') renderSDashboard();
    else if (page === 's-sessions') renderSSessions();
    else if (page === 's-goals') renderSGoals();
    else if (page === 's-bot') renderSBot();
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
})();
