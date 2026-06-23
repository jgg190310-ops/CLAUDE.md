/* ════════════════════════════════════════════════════════════════════
   HealthOS — saúde & alimentação + NutriBot (IA de nutrição)
   Compartilha o escopo global com app.js (pageTitles, _store, saveStore,
   navigateTo, cloudSave, showToast, Chart).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // títulos das páginas do HealthOS
  Object.assign(pageTitles, {
    'h-dashboard': 'Painel de Saúde',
    'h-meals': 'Refeições & Hidratação',
    'h-goals': 'Metas & Corpo',
    'h-nutri': 'NutriBot',
    'h-exercise': 'Exercícios',
    'h-sleep': 'Sono',
    'h-progress': 'Progresso Corporal',
    'h-calc': 'Calculadoras de Saúde',
    'h-challenge': 'Desafios de Saúde',
  });

  // ── modelo de dados ──────────────────────────────────────────────
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function hData() {
    if (!_store.health) _store.health = {};
    const h = _store.health;
    if (!h.body) h.body = {};
    if (!h.goals) h.goals = {};
    if (!h.days) h.days = {};
    return h;
  }
  function hPersist() {
    saveStore({ health: _store.health });
    if (typeof cloudSave === 'function') { try { cloudSave('health', _store.health); } catch (e) {} }
  }
  function hToday() {
    const h = hData();
    const k = todayKey();
    if (!h.days[k]) h.days[k] = { meals: [], water: 0 };
    return h.days[k];
  }
  function kcalFmt(v) { return Math.round(v).toLocaleString('pt-BR'); }

  // ── base de alimentos (kcal e proteína por porção comum) ─────────
  const FOODS = {
    'arroz branco (1 concha)': { kcal: 130, prot: 2.5 },
    'feijão (1 concha)': { kcal: 95, prot: 6 },
    'peito de frango (100g)': { kcal: 165, prot: 31 },
    'ovo cozido (1 un)': { kcal: 78, prot: 6 },
    'ovo frito (1 un)': { kcal: 90, prot: 6 },
    'pão francês (1 un)': { kcal: 140, prot: 4 },
    'pão integral (1 fatia)': { kcal: 70, prot: 3 },
    'banana (1 un)': { kcal: 90, prot: 1 },
    'maçã (1 un)': { kcal: 80, prot: 0.5 },
    'leite (1 copo)': { kcal: 120, prot: 6.5 },
    'café com açúcar (1 xíc)': { kcal: 40, prot: 0 },
    'queijo mussarela (1 fatia)': { kcal: 60, prot: 4 },
    'carne bovina (100g)': { kcal: 210, prot: 26 },
    'salada verde (1 prato)': { kcal: 40, prot: 2 },
    'batata cozida (100g)': { kcal: 86, prot: 2 },
    'macarrão (1 prato)': { kcal: 220, prot: 8 },
    'tapioca (1 un)': { kcal: 170, prot: 1 },
    'iogurte natural (1 un)': { kcal: 100, prot: 5 },
    'whey (1 scoop)': { kcal: 120, prot: 24 },
    'aveia (2 colheres)': { kcal: 80, prot: 3 },
    'pizza (1 fatia)': { kcal: 270, prot: 11 },
    'hambúrguer (1 un)': { kcal: 350, prot: 16 },
    'refrigerante (1 lata)': { kcal: 140, prot: 0 },
    'chocolate (30g)': { kcal: 160, prot: 2 },
    'castanhas (30g)': { kcal: 180, prot: 5 },
    'atum (1 lata)': { kcal: 120, prot: 26 },
    'tomate (1 un)': { kcal: 22, prot: 1 },
    'arroz integral (1 concha)': { kcal: 110, prot: 2.5 },
  };
  // atalhos rápidos (mostrados na tela de refeições)
  const QUICK = [
    'ovo cozido (1 un)', 'peito de frango (100g)', 'arroz branco (1 concha)',
    'feijão (1 concha)', 'banana (1 un)', 'pão francês (1 un)',
    'leite (1 copo)', 'whey (1 scoop)', 'salada verde (1 prato)', 'aveia (2 colheres)',
  ];

  const MEAL_LABEL = { cafe: 'Café', almoco: 'Almoço', jantar: 'Jantar', lanche: 'Lanche' };
  const MEAL_COLOR = { cafe: '#f59e0b', almoco: '#10b981', jantar: '#6366f1', lanche: '#06b6d4' };

  // ── cálculos (TMB, gasto, IMC) ───────────────────────────────────
  function computeTMB(body) {
    const { sex, age, height, weight } = body;
    if (!age || !height || !weight) return null;
    // Mifflin-St Jeor
    const base = 10 * weight + 6.25 * height - 5 * age + (sex === 'f' ? -161 : 5);
    const tdee = base * (parseFloat(body.activity) || 1.55);
    return { tmb: Math.round(base), tdee: Math.round(tdee) };
  }
  function suggestKcal(body) {
    const c = computeTMB(body);
    if (!c) return null;
    if (body.objective === 'lose') return Math.round(c.tdee - 500);
    if (body.objective === 'gain') return Math.round(c.tdee + 350);
    return c.tdee;
  }
  function computeIMC(body) {
    if (!body.height || !body.weight) return null;
    const h = body.height / 100;
    const imc = body.weight / (h * h);
    let cls = 'normal';
    if (imc < 18.5) cls = 'abaixo do peso';
    else if (imc < 25) cls = 'peso normal';
    else if (imc < 30) cls = 'sobrepeso';
    else cls = 'obesidade';
    return { imc: Math.round(imc * 10) / 10, cls };
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER — Dashboard
  // ════════════════════════════════════════════════════════════════
  let hCalChart = null, hMacroChart = null;

  function renderHDashboard() {
    const h = hData(), day = hToday();
    const goals = h.goals;
    const name = (_store.profile?.name || '').split(' ')[0];
    const greet = document.getElementById('hGreeting');
    if (greet) {
      const hr = new Date().getHours();
      const s = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
      greet.textContent = name ? `${s}, ${name}!` : `${s}!`;
    }
    const kcal = day.meals.reduce((a, m) => a + (+m.kcal || 0), 0);
    const prot = day.meals.reduce((a, m) => a + (+m.prot || 0), 0);
    const goalKcal = +goals.kcal || suggestKcal(h.body) || 2000;
    const goalProt = +goals.prot || 0;
    const goalWater = +goals.water || 8;
    const remaining = goalKcal - kcal;
    const imcData = computeIMC(h.body);
    const pctKcal = Math.min(100, Math.round((kcal / goalKcal) * 100));

    const kpis = [
      { ic: '#10b981', label: 'Calorias hoje', value: `${kcalFmt(kcal)}`, sub: `de ${kcalFmt(goalKcal)} kcal` },
      { ic: remaining >= 0 ? '#6366f1' : '#ef4444', label: remaining >= 0 ? 'Ainda pode comer' : 'Acima da meta', value: `${kcalFmt(Math.abs(remaining))}`, sub: 'kcal restantes' },
      { ic: '#06b6d4', label: 'Água', value: `${day.water}`, sub: `de ${goalWater} copos` },
      { ic: '#f59e0b', label: 'Proteína', value: `${kcalFmt(prot)}g`, sub: goalProt ? `de ${goalProt}g` : 'consumida' },
      { ic: imcData ? (imcData.imc < 25 ? '#10b981' : imcData.imc < 30 ? '#f59e0b' : '#ef4444') : '#8b5cf6',
        label: 'IMC', value: imcData ? `${imcData.imc}` : '—', sub: imcData ? imcData.cls : 'Configure em Metas' },
    ];
    const grid = document.getElementById('hKpis');
    if (grid) grid.innerHTML = kpis.map(k => `
      <div class="kpi-card" style="--ic:${k.ic}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-trend" style="color:${k.ic}">${k.sub}</div>
      </div>`).join('');

    const todayBox = document.getElementById('hTodayMeals');
    if (todayBox) {
      if (day.meals.length === 0) {
        todayBox.innerHTML = `<div class="empty-state"><p>Nenhuma refeição hoje. Toque em "Nova" para registrar.</p></div>`;
      } else {
        todayBox.innerHTML = `<table class="data-table">
          <thead><tr><th>Alimento</th><th>Tipo</th><th>Proteína</th><th>Calorias</th></tr></thead>
          <tbody>${day.meals.map((m, i) => `<tr>
            <td>${escapeHtml(m.name)}</td>
            <td><span style="color:${MEAL_COLOR[m.type]||'#10b981'};font-weight:600">${MEAL_LABEL[m.type]||''}</span></td>
            <td style="color:var(--text-2)">${m.prot ? m.prot + 'g' : '—'}</td>
            <td><strong>${kcalFmt(m.kcal)}</strong> kcal</td>
          </tr>`).join('')}</tbody>
        </table>`;
      }
    }

    // Insights de saúde
    const alertsEl = document.getElementById('hAlertsList');
    if (alertsEl) {
      const insights = [];
      if (pctKcal >= 100) insights.push({ type: 'warning', title: 'Meta calórica atingida', desc: `Você consumiu ${kcalFmt(kcal)} kcal — meta de ${kcalFmt(goalKcal)} kcal alcançada.` });
      else if (pctKcal > 0) insights.push({ type: 'info', title: `${pctKcal}% da meta calórica`, desc: `Faltam ${kcalFmt(remaining)} kcal para completar sua meta diária.` });
      else insights.push({ type: 'info', title: 'Comece o dia bem', desc: 'Registre sua primeira refeição para acompanhar as calorias.' });

      if (day.water >= goalWater) insights.push({ type: 'success', title: 'Meta de hidratação atingida!', desc: `Você bebeu ${day.water} copos hoje. Parabéns!` });
      else insights.push({ type: 'info', title: `Hidratação: ${day.water}/${goalWater} copos`, desc: `Beba mais ${goalWater - day.water} copos para atingir sua meta.` });

      if (goalProt && prot >= goalProt) insights.push({ type: 'success', title: 'Meta de proteína atingida!', desc: `${kcalFmt(prot)}g de proteína consumida hoje.` });
      else if (goalProt) insights.push({ type: 'warning', title: `Proteína: ${kcalFmt(prot)}g / ${goalProt}g`, desc: `Faltam ${kcalFmt(goalProt - prot)}g de proteína para sua meta.` });

      if (imcData) insights.push({ type: imcData.imc < 25 ? 'success' : 'warning', title: `IMC: ${imcData.imc}`, desc: `Classificação: ${imcData.cls}. ${imcData.imc < 25 ? 'Continue assim!' : 'Configure metas em "Metas & Corpo".'}` });

      alertsEl.innerHTML = insights.map(a => `<div class="alert-item ${a.type}">
        <div class="alert-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div><p class="alert-title">${a.title}</p><p class="alert-desc">${a.desc}</p></div>
      </div>`).join('');
    }

    drawHCharts(h, day, goalKcal);
  }

  function mealRow(m, i) {
    return `<div class="cf-li">
      <div class="cf-li-main">
        <span class="cf-li-dot" style="background:${MEAL_COLOR[m.type] || '#10b981'}"></span>
        <div><div class="cf-li-name">${escapeHtml(m.name)}</div>
        <div class="cf-li-sub">${MEAL_LABEL[m.type] || ''}${m.prot ? ' · ' + m.prot + 'g prot' : ''}</div></div>
      </div>
      <div class="cf-li-right"><span class="cf-li-val">${kcalFmt(m.kcal)} kcal</span>
      <button class="cf-del" onclick="hDelMeal(${i})" title="Remover">×</button></div>
    </div>`;
  }

  function drawHCharts(h, day, goalKcal) {
    if (typeof Chart === 'undefined') return;
    // 7 dias
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
      const dd = h.days[k];
      data.push(dd ? dd.meals.reduce((a, m) => a + (+m.kcal || 0), 0) : 0);
    }
    const cal = document.getElementById('hCalChart');
    if (cal) {
      if (hCalChart) hCalChart.destroy();
      hCalChart = new Chart(cal, {
        type: 'bar',
        data: {
          labels, datasets: [{
            data, backgroundColor: data.map(v => v > goalKcal ? 'rgba(239,68,68,.7)' : 'rgba(16,185,129,.7)'),
            borderRadius: 6, barPercentage: 0.6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => kcalFmt(c.raw) + ' kcal' } } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.1)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
          },
        },
      });
    }
    // doughnut por tipo de refeição
    const byType = { cafe: 0, almoco: 0, jantar: 0, lanche: 0 };
    day.meals.forEach(m => { byType[m.type] = (byType[m.type] || 0) + (+m.kcal || 0); });
    const mc = document.getElementById('hMacroChart');
    if (mc) {
      if (hMacroChart) hMacroChart.destroy();
      const vals = Object.values(byType);
      hMacroChart = new Chart(mc, {
        type: 'doughnut',
        data: {
          labels: ['Café', 'Almoço', 'Jantar', 'Lanche'],
          datasets: [{ data: vals.some(v => v > 0) ? vals : [1, 1, 1, 1],
            backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#06b6d4'], borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: c => c.label + ': ' + kcalFmt(c.raw) + ' kcal' } } },
        },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER — Refeições & Água
  // ════════════════════════════════════════════════════════════════
  function renderHMeals() {
    const day = hToday(), goals = hData().goals;
    const goalWater = +goals.water || 8;
    document.getElementById('hWaterCount').textContent = day.water;
    document.getElementById('hWaterGoal').textContent = goalWater;
    document.getElementById('hWaterMl').textContent = (day.water * 250) + ' ml';
    const track = document.getElementById('hWaterTrack');
    if (track) {
      let cups = '';
      for (let i = 0; i < goalWater; i++) cups += `<span class="h-cup ${i < day.water ? 'on' : ''}"></span>`;
      track.innerHTML = cups;
    }
    // atalhos
    const qf = document.getElementById('hQuickFoods');
    if (qf) qf.innerHTML = QUICK.map(name => {
      const f = FOODS[name];
      return `<button class="h-foodchip" onclick="hQuickAdd('${name.replace(/'/g, "\\'")}')">${shortFood(name)} <small>${f.kcal}</small></button>`;
    }).join('');
    // lista
    const list = document.getElementById('hMealList');
    if (list) list.innerHTML = day.meals.length
      ? day.meals.map((m, i) => mealRow(m, i)).join('')
      : '<div class="cf-empty" style="padding:20px">Nenhuma refeição registrada hoje.</div>';
  }
  function shortFood(name) { return name.replace(/\s*\(.*?\)/, ''); }

  function hAddMeal(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('hMealName').value.trim();
    const kcal = parseFloat(document.getElementById('hMealKcal').value);
    const prot = parseFloat(document.getElementById('hMealProt').value) || 0;
    const type = document.getElementById('hMealType').value;
    if (!name || isNaN(kcal)) return false;
    hToday().meals.push({ name, kcal, prot, type });
    hPersist();
    document.getElementById('hMealName').value = '';
    document.getElementById('hMealKcal').value = '';
    document.getElementById('hMealProt').value = '';
    renderHMeals();
    if (typeof showToast === 'function') showToast('Refeição adicionada!', 'success');
    return false;
  }
  function hQuickAdd(name) {
    const f = FOODS[name];
    if (!f) return;
    const hr = new Date().getHours();
    const type = hr < 11 ? 'cafe' : hr < 15 ? 'almoco' : hr < 18 ? 'lanche' : 'jantar';
    hToday().meals.push({ name: shortFood(name), kcal: f.kcal, prot: f.prot, type });
    hPersist();
    renderHMeals();
    if (typeof showToast === 'function') showToast(`+${f.kcal} kcal · ${shortFood(name)}`, 'success');
  }
  function hDelMeal(i) {
    hToday().meals.splice(i, 1);
    hPersist();
    renderHMeals();
    if (document.getElementById('h-dashboard').classList.contains('active')) renderHDashboard();
  }
  function hWater(delta) {
    const day = hToday();
    day.water = Math.max(0, day.water + delta);
    hPersist();
    renderHMeals();
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER — Metas & Corpo
  // ════════════════════════════════════════════════════════════════
  function renderHGoals() {
    const h = hData();
    const b = h.body, g = h.goals;
    setVal('hSex', b.sex || 'm'); setVal('hAge', b.age); setVal('hHeight', b.height);
    setVal('hWeight', b.weight); setVal('hActivity', b.activity || '1.55'); setVal('hObjective', b.objective || 'maintain');
    setVal('hGoalKcal', g.kcal); setVal('hGoalProt', g.prot); setVal('hGoalWater', g.water || 8); setVal('hGoalWeight', g.weight);
    renderTmbResult();
  }
  function renderTmbResult() {
    const body = readBody();
    const box = document.getElementById('hTmbResult');
    if (!box) return;
    const c = computeTMB(body), imc = computeIMC(body), sug = suggestKcal(body);
    if (!c) { box.innerHTML = '<p class="h-hint">Preencha idade, altura e peso para calcular seu gasto calórico.</p>'; return; }
    box.innerHTML = `
      <div class="h-tmb-grid">
        <div class="h-tmb-cell"><span class="h-tmb-num">${kcalFmt(c.tmb)}</span><span class="h-tmb-lbl">TMB (repouso)</span></div>
        <div class="h-tmb-cell"><span class="h-tmb-num">${kcalFmt(c.tdee)}</span><span class="h-tmb-lbl">Gasto diário</span></div>
        <div class="h-tmb-cell"><span class="h-tmb-num" style="color:var(--green)">${kcalFmt(sug)}</span><span class="h-tmb-lbl">Meta sugerida</span></div>
        ${imc ? `<div class="h-tmb-cell"><span class="h-tmb-num">${imc.imc}</span><span class="h-tmb-lbl">IMC · ${imc.cls}</span></div>` : ''}
      </div>
      <button class="btn-sm" style="margin-top:12px" onclick="hUseSuggested(${sug})">Usar ${kcalFmt(sug)} kcal como meta</button>`;
  }
  function readBody() {
    return {
      sex: getVal('hSex'), age: +getVal('hAge'), height: +getVal('hHeight'),
      weight: +getVal('hWeight'), activity: getVal('hActivity'), objective: getVal('hObjective'),
    };
  }
  function hUseSuggested(v) { setVal('hGoalKcal', v); }
  function hSaveGoals() {
    const h = hData();
    h.body = readBody();
    h.goals = { kcal: +getVal('hGoalKcal') || 0, prot: +getVal('hGoalProt') || 0,
      water: +getVal('hGoalWater') || 8, weight: +getVal('hGoalWeight') || 0 };
    hPersist();
    renderTmbResult();
    if (typeof showToast === 'function') showToast('Metas e corpo salvos!', 'success');
  }

  // helpers DOM
  function setVal(id, v) { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // recalcula TMB ao vivo quando muda algum campo do corpo
  document.addEventListener('input', e => {
    if (['hSex', 'hAge', 'hHeight', 'hWeight', 'hActivity', 'hObjective'].includes(e.target.id)) renderTmbResult();
  });

  // ════════════════════════════════════════════════════════════════
  //  NUTRIBOT — IA de nutrição
  // ════════════════════════════════════════════════════════════════
  const NB_SUGGESTIONS = [
    'Quantas calorias eu preciso por dia?',
    'Quantas calorias tem arroz e feijão?',
    'Como emagrecer com saúde?',
    'Quanto de proteína por dia?',
    'Como ganhar massa muscular?',
    'Qual meu IMC?',
    'Quanta água devo beber?',
    'O que comer no café da manhã?',
    'Dieta low carb funciona?',
    'Como cortar o açúcar?',
  ];

  function nbAnswer(q) {
    const t = q.toLowerCase();
    const h = hData(), body = h.body;
    const norm = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // lookup de alimento na base
    const food = matchFood(norm);
    if (food && /(caloria|kcal|quantas|tem |valor)/.test(norm)) {
      return food;
    }

    // calorias diárias / TMB
    if (/(quantas? caloria|preciso por dia|gasto calor|tmb|metaboli|emagrecer quantas)/.test(norm)) {
      const c = computeTMB(body), sug = suggestKcal(body);
      if (!c) return `Para calcular suas calorias diárias eu preciso dos seus dados. Vá em <b>Metas & Corpo</b> e preencha sexo, idade, altura, peso e nível de atividade. 📋<br><br>Em geral: mulheres ~1800-2000 kcal/dia e homens ~2200-2500 kcal/dia para manter o peso.`;
      return `Com seus dados:<br><br>• <b>TMB</b> (em repouso): ${kcalFmt(c.tmb)} kcal<br>• <b>Gasto diário</b> (com atividade): ${kcalFmt(c.tdee)} kcal<br>• <b>Meta sugerida</b> (${objLabel(body.objective)}): <b>${kcalFmt(sug)} kcal/dia</b><br><br>${body.objective === 'lose' ? 'Déficit de ~500 kcal/dia ≈ 0,5 kg por semana. 🔥' : body.objective === 'gain' ? 'Superávit de ~350 kcal/dia para ganho de massa magra. 💪' : 'Esse valor mantém seu peso atual. ⚖️'}`;
    }

    // proteína
    if (/(proteina|whey|massa magra)/.test(norm) && /(quant|por dia|preciso|grama)/.test(norm)) {
      const w = body.weight || 70;
      return `Proteína recomendada: <b>1,6 a 2,2g por kg</b> de peso por dia.<br><br>Para ${body.weight ? `seus ${w}kg` : '70kg'}: cerca de <b>${Math.round(w * 1.6)}g a ${Math.round(w * 2.2)}g/dia</b>.<br><br>Boas fontes: frango (31g/100g), ovo (6g/un), whey (24g/scoop), atum (26g/lata), feijão (6g/concha). 🍗`;
    }

    // emagrecer
    if (/(emagrec|perder peso|perder gordura|secar|déficit|deficit)/.test(norm)) {
      const sug = suggestKcal({ ...body, objective: 'lose' });
      return `Para emagrecer com saúde: ⚖️<br><br>• <b>Déficit calórico</b>: coma ~500 kcal a menos que seu gasto${sug ? ` (meta ~<b>${kcalFmt(sug)} kcal/dia</b> pra você)` : ''}<br>• <b>Priorize proteína</b> (sacia e preserva músculo)<br>• <b>Mais fibras</b>: verduras, legumes, frutas<br>• <b>Reduza ultraprocessados</b> e açúcar líquido (refri, suco)<br>• <b>Beba água</b> e durma bem (sono ruim aumenta a fome)<br>• <b>Treino de força</b> + caminhada<br><br>Meta saudável: 0,5 a 1 kg por semana. Nada de dietas radicais! 🥗`;
    }

    // ganhar massa
    if (/(ganhar massa|hipertrofia|ganhar peso|bulking|crescer m[uú]sculo)/.test(norm)) {
      const sug = suggestKcal({ ...body, objective: 'gain' });
      return `Para ganhar massa muscular: 💪<br><br>• <b>Superávit calórico</b>: ~300-400 kcal acima do gasto${sug ? ` (meta ~<b>${kcalFmt(sug)} kcal/dia</b>)` : ''}<br>• <b>Proteína alta</b>: 1,8-2,2g/kg<br>• <b>Carboidratos</b> para energia no treino (arroz, batata, aveia)<br>• <b>Treino de força progressivo</b> 3-5x/semana<br>• <b>Durma 7-9h</b> — o músculo cresce no descanso<br><br>Ganho saudável: 0,25-0,5 kg por semana. 🏋️`;
    }

    // IMC
    if (/(imc|indice de massa|estou acima do peso|peso ideal)/.test(norm)) {
      const imc = computeIMC(body);
      if (!imc) return 'Para calcular seu IMC preciso da sua altura e peso. Preencha em <b>Metas & Corpo</b>. 📋<br><br>IMC = peso ÷ (altura × altura). Faixa normal: 18,5 a 24,9.';
      return `Seu <b>IMC é ${imc.imc}</b> → <b>${imc.cls}</b>.<br><br>Referência:<br>• Abaixo de 18,5: abaixo do peso<br>• 18,5–24,9: peso normal ✅<br>• 25–29,9: sobrepeso<br>• 30+: obesidade<br><br>Lembre: o IMC é um indicador geral e não distingue músculo de gordura.`;
    }

    // água
    if (/(agua|hidrat|beber)/.test(norm)) {
      const w = body.weight || 70;
      const ml = Math.round(w * 35);
      return `Hidratação: 💧<br><br>Recomendação geral: <b>35 ml por kg</b> de peso.<br>Para ${body.weight ? `${w}kg` : '70kg'}: cerca de <b>${(ml / 1000).toFixed(1)} litros/dia</b> (~${Math.round(ml / 250)} copos).<br><br>Beba mais em dias quentes ou de treino. Use o registro de água na aba <b>Refeições</b>! 🥤`;
    }

    // café da manhã
    if (/(café da manh|cafe da manh|primeira refei|de manhã pra comer)/.test(norm)) {
      return `Café da manhã equilibrado: 🍳<br><br>• <b>Proteína</b>: ovos, iogurte, queijo ou whey<br>• <b>Carbo bom</b>: pão integral, aveia, tapioca, fruta<br>• <b>Gordura boa</b>: abacate, castanhas, pasta de amendoim<br><br>Ex.: 2 ovos mexidos + 1 fatia de pão integral + 1 banana ≈ 320 kcal e 16g de proteína. ☕`;
    }

    // low carb
    if (/(low carb|sem carboidrato|cetog|keto|cortar carbo)/.test(norm)) {
      return `Low carb: 🥑<br><br>Reduz carboidratos (pão, arroz, massa, açúcar) e prioriza proteína, gordura boa e vegetais.<br><br>✅ Pode ajudar no emagrecimento e controle de açúcar no sangue<br>⚠️ Não é "milagre": o que emagrece é o <b>déficit calórico</b><br>⚠️ Pode ser difícil de manter a longo prazo<br><br>Não precisa zerar carbo — escolha os integrais e controle a quantidade. Consulte um nutricionista para dietas restritivas.`;
    }

    // açúcar
    if (/(açúcar|acucar|doce|adoçante|adocante)/.test(norm)) {
      return `Reduzir o açúcar: 🍬<br><br>• Corte primeiro o <b>açúcar líquido</b> (refri, suco de caixinha): é o que mais engorda sem saciar<br>• Troque doces por <b>frutas</b><br>• Cuidado com "fit/zero" — nem sempre é melhor<br>• A OMS recomenda < 25g (~6 colheres de chá) de açúcar livre por dia<br><br>O paladar se adapta: em 2-3 semanas você sente menos falta. 💪`;
    }

    // dieta vegetariana
    if (/(vegetarian|vegan|sem carne)/.test(norm)) {
      return `Dieta vegetariana/vegana: 🌱<br><br>É saudável e completa se bem planejada. Atenção a:<br>• <b>Proteína</b>: feijão, lentilha, grão-de-bico, tofu, ovos (se ovolacto)<br>• <b>B12</b>: pode precisar suplementar (principalmente vegano)<br>• <b>Ferro</b>: combine com vitamina C para absorver melhor<br>• <b>Cálcio e ômega-3</b><br><br>Procure um nutricionista para ajustar suplementação. 🥦`;
    }

    // o que comer / dieta geral
    if (/(o que (comer|devo comer)|montar dieta|card[aá]pio|alimenta(ç|c)[aã]o saud)/.test(norm)) {
      return `Alimentação saudável na prática: 🥗<br><br>• <b>Metade do prato</b>: verduras e legumes<br>• <b>Um quarto</b>: proteína (carne, frango, peixe, ovo, leguminosas)<br>• <b>Um quarto</b>: carboidrato (arroz, batata, massa — de preferência integral)<br>• <b>Gordura boa</b>: azeite, abacate, castanhas<br>• <b>Menos</b>: ultraprocessados, frituras, açúcar<br><br>Coma de verdade, beba água e mantenha constância. Quer que eu calcule suas calorias? Preencha <b>Metas & Corpo</b>. 😊`;
    }

    // saudação
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|eai|opa|hey)/.test(norm)) {
      return `Olá! 👋 Sou o <b>NutriBot</b>, sua IA de nutrição. Posso:<br><br>• Calcular suas calorias diárias e IMC<br>• Dizer quantas calorias tem cada alimento<br>• Te orientar a emagrecer ou ganhar massa<br>• Montar divisão de proteína e macros<br><br>Pergunte algo ou toque numa sugestão abaixo. 🥗`;
    }

    // fallback
    return `Boa pergunta! Sou especializado em <b>nutrição e alimentação</b>. Posso te ajudar com:<br><br>• Calorias diárias e de alimentos<br>• Emagrecimento e ganho de massa<br>• Proteína, água, IMC e macros<br>• Café da manhã, low carb, açúcar, dietas<br><br>Tente perguntar de outro jeito, ex.: <i>"quantas calorias tem 1 ovo?"</i> ou <i>"quanto de proteína eu preciso?"</i> 😊`;
  }

  function matchFood(norm) {
    // procura alimentos citados na frase
    const found = [];
    for (const key in FOODS) {
      const base = key.replace(/\s*\(.*?\)/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const word = base.split(' ')[0];
      if (norm.includes(base) || (word.length > 3 && norm.includes(word))) found.push(key);
    }
    if (!found.length) return null;
    const uniq = [...new Set(found)].slice(0, 5);
    let total = 0, totalP = 0;
    const lines = uniq.map(k => {
      const f = FOODS[k]; total += f.kcal; totalP += f.prot;
      return `• <b>${capitalize(k)}</b>: ${f.kcal} kcal${f.prot ? ` · ${f.prot}g proteína` : ''}`;
    });
    let out = lines.join('<br>');
    if (uniq.length > 1) out += `<br><br><b>Total: ${kcalFmt(total)} kcal</b>${totalP ? ` · ${Math.round(totalP)}g de proteína` : ''}`;
    return out;
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function objLabel(o) { return o === 'lose' ? 'emagrecer' : o === 'gain' ? 'ganhar massa' : 'manter'; }

  // chat plumbing (espelha o FinBot)
  function nbAppend(html, who) {
    const box = document.getElementById('nbMessages');
    const div = document.createElement('div');
    div.className = `ai-msg ${who}`;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }
  let nbBusy = false;
  function nbSend(e, preset) {
    if (e) e.preventDefault();
    if (nbBusy) return false;
    const input = document.getElementById('nbInput');
    const text = (preset || input.value).trim();
    if (!text) return false;
    input.value = '';
    nbAppend(escapeHtml(text), 'user');
    nbBusy = true;
    const typing = nbAppend('<span class="ai-typing"><span></span><span></span><span></span></span>', 'bot');
    setTimeout(() => {
      typing.innerHTML = nbAnswer(text);
      document.getElementById('nbMessages').scrollTop = 1e9;
      nbBusy = false;
    }, 500 + Math.random() * 500);
    return false;
  }
  let nbInited = false;
  function initNutri() {
    if (nbInited) return;
    nbInited = true;
    const sug = document.getElementById('nbSuggestions');
    if (sug) sug.innerHTML = NB_SUGGESTIONS.map(s =>
      `<button class="ai-chip" onclick="nbSend(null, '${s.replace(/'/g, "\\'")}')">${s}</button>`).join('');
    nbAppend(nbAnswer('olá'), 'bot');
  }

  // ── hook de navegação vindo do app.js ────────────────────────────
  // ════════════════════════════════════════════════════════════════
  //  EXERCÍCIOS
  // ════════════════════════════════════════════════════════════════
  const EXERCISES = [
    { name: 'Corrida', icon: '🏃', kcalMin: 10 },
    { name: 'Musculação', icon: '💪', kcalMin: 7 },
    { name: 'Caminhada', icon: '🚶', kcalMin: 5 },
    { name: 'Ciclismo', icon: '🚴', kcalMin: 8 },
    { name: 'Natação', icon: '🏊', kcalMin: 9 },
    { name: 'Yoga', icon: '🧘', kcalMin: 4 },
    { name: 'Futebol', icon: '⚽', kcalMin: 9 },
    { name: 'Pular corda', icon: '🪢', kcalMin: 12 },
  ];

  function hExData() {
    const h = hData();
    const k = todayKey();
    if (!h.days[k]) h.days[k] = { meals: [], water: 0 };
    if (!h.days[k].exercises) h.days[k].exercises = [];
    return h.days[k].exercises;
  }

  let _exChart = null;

  function renderHExercise() {
    const h = hData();
    const exs = hExData();
    const todayKcal = exs.reduce((a, e) => a + (e.kcalBurned || 0), 0);
    const todayMins = exs.reduce((a, e) => a + (e.mins || 0), 0);

    const last7 = [], last7Labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const day = h.days[k];
      last7.push(day && day.exercises ? day.exercises.reduce((a, e) => a + (e.kcalBurned || 0), 0) : 0);
      last7Labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
    }

    const el = document.getElementById('h-exercise');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header"><div><h1>Exercícios</h1><p class="page-sub">Registre seus treinos e calorias queimadas.</p></div></div>
      <div class="kpi-grid kpi-grid-4" style="margin-bottom:16px">
        <div class="kpi-card" style="--ic:#ef4444"><div class="kpi-label">Kcal queimadas hoje</div><div class="kpi-value">${kcalFmt(todayKcal)}</div><div class="kpi-trend" style="color:#ef4444">kcal</div></div>
        <div class="kpi-card" style="--ic:#f59e0b"><div class="kpi-label">Minutos ativos</div><div class="kpi-value">${todayMins}</div><div class="kpi-trend" style="color:#f59e0b">minutos</div></div>
        <div class="kpi-card" style="--ic:#6366f1"><div class="kpi-label">Exercícios hoje</div><div class="kpi-value">${exs.length}</div><div class="kpi-trend" style="color:#6366f1">sessões</div></div>
        <div class="kpi-card" style="--ic:#10b981"><div class="kpi-label">Média semanal</div><div class="kpi-value">${kcalFmt(Math.round(last7.reduce((a,v)=>a+v,0)/7))}</div><div class="kpi-trend" style="color:#10b981">kcal/dia</div></div>
      </div>
      <div class="s-sessions-grid">
        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Adicionar Treino</h3>
          <div class="s-quick-chips" style="margin-bottom:14px" id="hExQuickChips">
            ${EXERCISES.map(e => `<button class="s-quick-chip" onclick="hExQuick('${e.name}',${e.kcalMin})">${e.icon} ${e.name}</button>`).join('')}
          </div>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group full"><label>Tipo de exercício</label><input type="text" class="s-input" id="hExType" placeholder="Ex: Corrida"/></div>
            <div class="form-group"><label>Duração (min)</label><input type="number" class="s-input" id="hExMins" placeholder="30" min="1"/></div>
            <div class="form-group"><label>Calorias queimadas</label><input type="number" class="s-input" id="hExKcal" placeholder="Auto" min="0"/></div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:12px" onclick="hAddExercise()">Registrar Treino</button>
        </div>
        <div class="chart-card">
          <div class="chart-card-head"><h3>Calorias queimadas</h3><span class="chart-sub">últimos 7 dias</span></div>
          <div class="chart-wrap"><canvas id="hExChart"></canvas></div>
        </div>
      </div>
      <div class="cf-card" style="margin-top:16px">
        <div class="table-header"><h3>Treinos de Hoje</h3></div>
        <div id="hExList">${renderExList(exs)}</div>
      </div>`;

    setTimeout(() => {
      if (_exChart) { try { _exChart.destroy(); } catch(e){} }
      const c = document.getElementById('hExChart');
      if (c) _exChart = new Chart(c, {
        type: 'bar',
        data: { labels: last7Labels, datasets: [{ data: last7, backgroundColor: last7.map((_,i)=>i===6?'rgba(239,68,68,.8)':'rgba(239,68,68,.35)'), borderRadius: 6 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
          scales: { x:{grid:{display:false},ticks:{color:'#94a3b8'}}, y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.1)'},ticks:{color:'#94a3b8'}} } }
      });
    }, 80);
  }

  function renderExList(exs) {
    if (!exs.length) return `<div class="empty-state"><p>Nenhum treino hoje. Comece a se mexer!</p></div>`;
    return exs.map((e, i) => `<div class="cf-li">
      <div class="cf-li-main"><span class="cf-li-name">${e.type}</span><span class="cf-li-sub">${e.mins} min</span></div>
      <div class="cf-li-right"><span class="cf-li-val" style="color:#ef4444">${kcalFmt(e.kcalBurned)} kcal</span>
      <button class="cf-del" onclick="hDelExercise(${i})">×</button></div>
    </div>`).join('');
  }

  function hExQuick(name, rate) {
    const inp = document.getElementById('hExType');
    if (inp) inp.value = name;
    const minsEl = document.getElementById('hExMins');
    if (minsEl && !minsEl.value) minsEl.value = 30;
    const kcalEl = document.getElementById('hExKcal');
    if (kcalEl) kcalEl.value = Math.round(rate * (parseInt(minsEl?.value)||30));
  }

  function hAddExercise() {
    const type = document.getElementById('hExType')?.value.trim();
    const mins = parseInt(document.getElementById('hExMins')?.value) || 0;
    const kcalEl = document.getElementById('hExKcal');
    let kcalBurned = parseInt(kcalEl?.value) || 0;
    if (!type || mins <= 0) { showToast && showToast('Informe o tipo e duração.'); return; }
    if (!kcalBurned) {
      const match = EXERCISES.find(e => e.name.toLowerCase() === type.toLowerCase());
      kcalBurned = Math.round((match ? match.kcalMin : 6) * mins);
    }
    hExData().push({ type, mins, kcalBurned, ts: Date.now() });
    hPersist();
    ['hExType','hExMins','hExKcal'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    const list = document.getElementById('hExList');
    if (list) list.innerHTML = renderExList(hExData());
    showToast && showToast(`${type} registrado!`);
  }

  function hDelExercise(i) {
    hExData().splice(i, 1);
    hPersist();
    const list = document.getElementById('hExList');
    if (list) list.innerHTML = renderExList(hExData());
  }

  // ════════════════════════════════════════════════════════════════
  //  SONO
  // ════════════════════════════════════════════════════════════════
  let _sleepChart = null;

  function renderHSleep() {
    const h = hData();
    if (!h.sleep) h.sleep = [];
    const sleep = h.sleep;

    const last7Labels = [], last7Hours = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const entry = sleep.find(s => s.date === k);
      last7Labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
      last7Hours.push(entry ? entry.hours : 0);
    }
    const avgHours = last7Hours.filter(h=>h>0).length ? Math.round(last7Hours.reduce((a,v)=>a+v,0) / last7Hours.filter(v=>v>0).length * 10)/10 : 0;
    const streak = (() => { let s=0; for (let i=0;i<sleep.length;i++) { if(sleep[sleep.length-1-i]?.hours>=7) s++; else break; } return s; })();
    const best = sleep.length ? Math.max(...sleep.map(s=>s.hours)) : 0;

    const el = document.getElementById('h-sleep');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header"><div><h1>Sono</h1><p class="page-sub">Acompanhe a qualidade e duração do seu sono.</p></div></div>
      <div class="kpi-grid kpi-grid-4" style="margin-bottom:16px">
        <div class="kpi-card" style="--ic:#8b5cf6"><div class="kpi-label">Média semanal</div><div class="kpi-value">${avgHours}h</div><div class="kpi-trend" style="color:#8b5cf6">por noite</div></div>
        <div class="kpi-card" style="--ic:#10b981"><div class="kpi-label">Melhor noite</div><div class="kpi-value">${best}h</div><div class="kpi-trend" style="color:#10b981">horas</div></div>
        <div class="kpi-card" style="--ic:#6366f1"><div class="kpi-label">Sequência ≥7h</div><div class="kpi-value">${streak}</div><div class="kpi-trend" style="color:#6366f1">noites seguidas</div></div>
        <div class="kpi-card" style="--ic:#f59e0b"><div class="kpi-label">Registros</div><div class="kpi-value">${sleep.length}</div><div class="kpi-trend" style="color:#f59e0b">noites</div></div>
      </div>
      <div class="s-sessions-grid">
        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Registrar Sono</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group"><label>Horas dormidas</label><input type="number" class="s-input" id="hSleepHours" placeholder="7.5" min="0" max="24" step="0.5"/></div>
            <div class="form-group"><label>Data</label><input type="date" class="s-input" id="hSleepDate" value="${todayKey()}"/></div>
            <div class="form-group full"><label>Qualidade (1–5 ★)</label>
              <div class="h-sleep-stars" id="hSleepStars">
                ${[1,2,3,4,5].map(n=>`<button class="h-star-btn" data-val="${n}" onclick="hSetSleepQuality(${n})">★</button>`).join('')}
              </div>
            </div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:12px" onclick="hAddSleep()">Registrar</button>
        </div>
        <div class="chart-card">
          <div class="chart-card-head"><h3>Horas de sono</h3><span class="chart-sub">últimos 7 dias</span></div>
          <div class="chart-wrap"><canvas id="hSleepChart"></canvas></div>
        </div>
      </div>
      <div class="cf-card" style="margin-top:16px">
        <div class="table-header"><h3>Histórico de Sono</h3></div>
        <div id="hSleepList">${renderSleepList(sleep.slice(-7).reverse())}</div>
      </div>`;

    window._sleepQuality = 0;
    setTimeout(() => {
      if (_sleepChart) { try { _sleepChart.destroy(); } catch(e){} }
      const c = document.getElementById('hSleepChart');
      if (c) _sleepChart = new Chart(c, {
        type: 'bar',
        data: { labels: last7Labels, datasets: [{ data: last7Hours, backgroundColor: last7Hours.map(h=>h>=7?'rgba(139,92,246,.8)':h>0?'rgba(139,92,246,.4)':'rgba(148,163,184,.2)'), borderRadius:6 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
          scales: { x:{grid:{display:false},ticks:{color:'#94a3b8'}}, y:{beginAtZero:true,max:12,grid:{color:'rgba(148,163,184,.1)'},ticks:{color:'#94a3b8',callback:v=>v+'h'}} } }
      });
    }, 80);
  }

  function renderSleepList(entries) {
    if (!entries.length) return `<div class="empty-state"><p>Nenhum registro de sono ainda.</p></div>`;
    return entries.map((s, i) => {
      const stars = '★'.repeat(s.quality||0) + '☆'.repeat(5-(s.quality||0));
      return `<div class="cf-li">
        <div class="cf-li-main"><span class="cf-li-name">${new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})}</span>
        <span class="cf-li-sub" style="color:#f59e0b">${stars}</span></div>
        <div class="cf-li-right"><span class="cf-li-val">${s.hours}h</span>
        <button class="cf-del" onclick="hDelSleep(${i})">×</button></div>
      </div>`;
    }).join('');
  }

  window.hSetSleepQuality = function(val) {
    window._sleepQuality = val;
    document.querySelectorAll('.h-star-btn').forEach(b => {
      b.style.color = parseInt(b.dataset.val) <= val ? '#f59e0b' : 'var(--text-3)';
    });
  };

  function hAddSleep() {
    const hours = parseFloat(document.getElementById('hSleepHours')?.value) || 0;
    const date = document.getElementById('hSleepDate')?.value || todayKey();
    if (hours <= 0) { showToast && showToast('Informe as horas dormidas.'); return; }
    const h = hData();
    if (!h.sleep) h.sleep = [];
    const idx = h.sleep.findIndex(s => s.date === date);
    if (idx >= 0) h.sleep[idx] = { date, hours, quality: window._sleepQuality || 0 };
    else h.sleep.push({ date, hours, quality: window._sleepQuality || 0 });
    h.sleep.sort((a,b) => a.date.localeCompare(b.date));
    hPersist();
    renderHSleep();
    showToast && showToast('Sono registrado!');
  }

  function hDelSleep(i) {
    const h = hData();
    const entries = h.sleep ? h.sleep.slice(-7).reverse() : [];
    const real = entries[i];
    if (real && h.sleep) { const idx = h.sleep.indexOf(real); if(idx>=0) h.sleep.splice(idx,1); }
    hPersist();
    const list = document.getElementById('hSleepList');
    if (list) { const h2=hData(); list.innerHTML = renderSleepList((h2.sleep||[]).slice(-7).reverse()); }
  }

  // ════════════════════════════════════════════════════════════════
  //  PROGRESSO CORPORAL
  // ════════════════════════════════════════════════════════════════
  let _weightChart = null;

  function renderHProgress() {
    const h = hData();
    if (!h.weightLog) h.weightLog = [];
    const log = h.weightLog;
    const current = log.length ? log[log.length-1].weight : null;
    const start = log.length ? log[0].weight : null;
    const change = (current && start) ? Math.round((current - start)*10)/10 : null;
    const imcData = current && h.body?.height ? computeIMC({ ...h.body, weight: current }) : null;
    const goalWeight = parseFloat(h.body?.goalWeight) || null;
    const toGoal = (goalWeight && current) ? Math.round((current - goalWeight)*10)/10 : null;

    const labels = log.slice(-30).map(e => new Date(e.date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
    const weights = log.slice(-30).map(e => e.weight);

    const el = document.getElementById('h-progress');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header"><div><h1>Progresso Corporal</h1><p class="page-sub">Acompanhe sua evolução de peso ao longo do tempo.</p></div></div>
      <div class="kpi-grid kpi-grid-5" style="margin-bottom:16px">
        <div class="kpi-card" style="--ic:#10b981"><div class="kpi-label">Peso atual</div><div class="kpi-value">${current?current+'kg':'—'}</div><div class="kpi-trend" style="color:#10b981">último registro</div></div>
        <div class="kpi-card" style="--ic:#6366f1"><div class="kpi-label">Peso inicial</div><div class="kpi-value">${start?start+'kg':'—'}</div><div class="kpi-trend" style="color:#6366f1">primeiro registro</div></div>
        <div class="kpi-card" style="--ic:${change!==null?(change<0?'#10b981':'#ef4444'):'#8b5cf6'}"><div class="kpi-label">Variação total</div><div class="kpi-value">${change!==null?(change>0?'+':'')+change+'kg':'—'}</div><div class="kpi-trend" style="color:${change!==null?(change<0?'#10b981':'#ef4444'):'#8b5cf6'}">${change!==null?(change<0?'emagrecido':'ganho de peso'):'sem dados'}</div></div>
        <div class="kpi-card" style="--ic:#f59e0b"><div class="kpi-label">IMC atual</div><div class="kpi-value">${imcData?imcData.imc:'—'}</div><div class="kpi-trend" style="color:#f59e0b">${imcData?imcData.cls:'configure altura'}</div></div>
        <div class="kpi-card" style="--ic:#06b6d4"><div class="kpi-label">Para a meta</div><div class="kpi-value">${toGoal!==null?(toGoal>0?'-':'')+Math.abs(toGoal)+'kg':'—'}</div><div class="kpi-trend" style="color:#06b6d4">${goalWeight?'meta: '+goalWeight+'kg':'sem meta'}</div></div>
      </div>
      <div class="s-sessions-grid">
        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Registrar Peso</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group"><label>Peso (kg)</label><input type="number" class="s-input" id="hWtKg" placeholder="${current||70}" min="20" max="300" step="0.1"/></div>
            <div class="form-group"><label>Data</label><input type="date" class="s-input" id="hWtDate" value="${todayKey()}"/></div>
            <div class="form-group"><label>Meta de peso (kg)</label><input type="number" class="s-input" id="hWtGoal" placeholder="${goalWeight||65}" step="0.1" value="${goalWeight||''}"/></div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:12px" onclick="hAddWeight()">Registrar</button>
        </div>
        <div class="chart-card">
          <div class="chart-card-head"><h3>Evolução de peso</h3><span class="chart-sub">últimos 30 registros</span></div>
          <div class="chart-wrap"><canvas id="hWeightChart"></canvas></div>
        </div>
      </div>
      ${goalWeight && current ? `
      <div class="cf-card" style="margin-top:16px">
        <div style="margin-bottom:8px;font-size:14px;font-weight:600">Progresso para a meta (${goalWeight}kg)</div>
        <div style="background:var(--border);border-radius:6px;height:10px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,Math.max(0,Math.round((1-(Math.abs(toGoal||0)/Math.abs((start||current)-goalWeight)))*100)))}%;background:linear-gradient(90deg,#10b981,#06b6d4);border-radius:6px;transition:width .5s"></div>
        </div>
      </div>` : ''}
      <div class="cf-card" style="margin-top:16px">
        <div class="table-header"><h3>Histórico</h3></div>
        <div id="hWeightList">${renderWeightList(log.slice(-10).reverse())}</div>
      </div>`;

    setTimeout(() => {
      if (_weightChart) { try { _weightChart.destroy(); } catch(e){} }
      const c = document.getElementById('hWeightChart');
      if (c && weights.length) _weightChart = new Chart(c, {
        type: 'line',
        data: { labels, datasets: [{ data: weights, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.1)', tension:.3, fill:true, pointRadius:3 },
          ...(goalWeight ? [{ data: weights.map(()=>goalWeight), borderColor:'rgba(239,68,68,.5)', borderDash:[6,3], pointRadius:0, label:'Meta' }] : []) ] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
          scales: { x:{grid:{display:false},ticks:{color:'#94a3b8',maxTicksLimit:6}}, y:{grid:{color:'rgba(148,163,184,.1)'},ticks:{color:'#94a3b8',callback:v=>v+'kg'}} } }
      });
    }, 80);
  }

  function renderWeightList(entries) {
    if (!entries.length) return `<div class="empty-state"><p>Nenhum registro de peso ainda.</p></div>`;
    return entries.map((e, i) => `<div class="cf-li">
      <div class="cf-li-main"><span class="cf-li-name">${new Date(e.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})}</span></div>
      <div class="cf-li-right"><span class="cf-li-val">${e.weight} kg</span>
      <button class="cf-del" onclick="hDelWeight(${i})">×</button></div>
    </div>`).join('');
  }

  function hAddWeight() {
    const kg = parseFloat(document.getElementById('hWtKg')?.value);
    const date = document.getElementById('hWtDate')?.value || todayKey();
    const goalW = parseFloat(document.getElementById('hWtGoal')?.value);
    if (!kg || kg < 10) { showToast && showToast('Informe o peso em kg.'); return; }
    const h = hData();
    if (!h.weightLog) h.weightLog = [];
    const idx = h.weightLog.findIndex(e => e.date === date);
    if (idx >= 0) h.weightLog[idx].weight = kg;
    else h.weightLog.push({ date, weight: kg });
    h.weightLog.sort((a,b) => a.date.localeCompare(b.date));
    if (goalW) { if (!h.body) h.body = {}; h.body.goalWeight = goalW; }
    hPersist();
    renderHProgress();
    showToast && showToast('Peso registrado!');
  }

  function hDelWeight(i) {
    const h = hData();
    const entries = (h.weightLog||[]).slice(-10).reverse();
    const real = entries[i];
    if (real && h.weightLog) { const idx = h.weightLog.indexOf(real); if(idx>=0) h.weightLog.splice(idx,1); }
    hPersist();
    renderHProgress();
  }

  // ════════════════════════════════════════════════════════════════
  //  CALCULADORA DE SAÚDE
  // ════════════════════════════════════════════════════════════════
  function renderHCalc() {
    const el = document.getElementById('h-calc');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header"><div><h1>Calculadora de Saúde</h1><p class="page-sub">Calcule IMC, TDEE, hidratação e muito mais.</p></div></div>

      <div class="charts-row" style="grid-template-columns:1fr 1fr;gap:16px">
        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--indigo)">Calculadora de IMC</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group"><label>Peso (kg)</label><input type="number" class="s-input" id="cImc_peso" placeholder="70"/></div>
            <div class="form-group"><label>Altura (cm)</label><input type="number" class="s-input" id="cImc_alt" placeholder="175"/></div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:10px" onclick="hCalcRun('imc')">Calcular IMC</button>
          <div id="cImcResult" class="h-calc-result"></div>
        </div>

        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--green)">Gasto Calórico (TDEE)</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group"><label>Sexo</label>
              <select class="s-select" id="cTdee_sex"><option value="m">Masculino</option><option value="f">Feminino</option></select>
            </div>
            <div class="form-group"><label>Idade</label><input type="number" class="s-input" id="cTdee_age" placeholder="25"/></div>
            <div class="form-group"><label>Peso (kg)</label><input type="number" class="s-input" id="cTdee_peso" placeholder="70"/></div>
            <div class="form-group"><label>Altura (cm)</label><input type="number" class="s-input" id="cTdee_alt" placeholder="175"/></div>
            <div class="form-group full"><label>Nível de atividade</label>
              <select class="s-select" id="cTdee_act">
                <option value="1.2">Sedentário</option><option value="1.375">Levemente ativo</option>
                <option value="1.55" selected>Moderadamente ativo</option><option value="1.725">Muito ativo</option>
                <option value="1.9">Extremamente ativo</option>
              </select>
            </div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:10px" onclick="hCalcRun('tdee')">Calcular TDEE</button>
          <div id="cTdeeResult" class="h-calc-result"></div>
        </div>

        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--cyan)">Hidratação Ideal</h3>
          <div class="form-group"><label>Peso (kg)</label><input type="number" class="s-input" id="cHid_peso" placeholder="70"/></div>
          <button class="btn-confirm" style="width:100%;margin-top:10px" onclick="hCalcRun('hidrat')">Calcular</button>
          <div id="cHidResult" class="h-calc-result"></div>
        </div>

        <div class="cf-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--amber)">Peso Ideal</h3>
          <div class="form-grid-2" style="gap:10px">
            <div class="form-group"><label>Altura (cm)</label><input type="number" class="s-input" id="cPeso_alt" placeholder="175"/></div>
            <div class="form-group"><label>Sexo</label>
              <select class="s-select" id="cPeso_sex"><option value="m">Masculino</option><option value="f">Feminino</option></select>
            </div>
          </div>
          <button class="btn-confirm" style="width:100%;margin-top:10px" onclick="hCalcRun('peso')">Calcular</button>
          <div id="cPesoResult" class="h-calc-result"></div>
        </div>
      </div>`;
  }

  function hCalcRun(type) {
    if (type === 'imc') {
      const p = parseFloat(document.getElementById('cImc_peso')?.value);
      const a = parseFloat(document.getElementById('cImc_alt')?.value);
      const el = document.getElementById('cImcResult');
      if (!p || !a || !el) return;
      const imc = Math.round(p / ((a/100)**2) * 10) / 10;
      const cls = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
      const color = imc < 18.5 ? '#06b6d4' : imc < 25 ? '#10b981' : imc < 30 ? '#f59e0b' : '#ef4444';
      el.innerHTML = `<div class="h-calc-res" style="--rc:${color}"><span class="h-calc-big">${imc}</span><span class="h-calc-lbl">${cls}</span></div>`;
    } else if (type === 'tdee') {
      const sex = document.getElementById('cTdee_sex')?.value;
      const age = parseFloat(document.getElementById('cTdee_age')?.value);
      const p = parseFloat(document.getElementById('cTdee_peso')?.value);
      const a = parseFloat(document.getElementById('cTdee_alt')?.value);
      const act = parseFloat(document.getElementById('cTdee_act')?.value);
      const el = document.getElementById('cTdeeResult');
      if (!age||!p||!a||!el) return;
      const tmb = Math.round(10*p + 6.25*a - 5*age + (sex==='f'?-161:5));
      const tdee = Math.round(tmb * act);
      el.innerHTML = `<div class="h-calc-res" style="--rc:#10b981">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div><span class="h-calc-big">${kcalFmt(tmb)}</span><span class="h-calc-lbl">TMB (kcal)</span></div>
          <div><span class="h-calc-big">${kcalFmt(tdee)}</span><span class="h-calc-lbl">TDEE (kcal)</span></div>
          <div><span class="h-calc-big">${kcalFmt(tdee-500)}</span><span class="h-calc-lbl">Emagrecer (−500)</span></div>
          <div><span class="h-calc-big">${kcalFmt(tdee+350)}</span><span class="h-calc-lbl">Ganhar massa (+350)</span></div>
        </div>
      </div>`;
    } else if (type === 'hidrat') {
      const p = parseFloat(document.getElementById('cHid_peso')?.value);
      const el = document.getElementById('cHidResult');
      if (!p||!el) return;
      const ml = Math.round(p * 35);
      const copos = Math.round(ml / 250);
      el.innerHTML = `<div class="h-calc-res" style="--rc:#06b6d4"><span class="h-calc-big">${(ml/1000).toFixed(1)}L</span><span class="h-calc-lbl">${copos} copos de 250ml por dia</span></div>`;
    } else if (type === 'peso') {
      const a = parseFloat(document.getElementById('cPeso_alt')?.value);
      const sex = document.getElementById('cPeso_sex')?.value;
      const el = document.getElementById('cPesoResult');
      if (!a||!el) return;
      const h = a / 100;
      const min = Math.round(18.5 * h * h * 10)/10;
      const max = Math.round(24.9 * h * h * 10)/10;
      const ideal = sex === 'm' ? Math.round((22.0 * h * h)*10)/10 : Math.round((21.0 * h * h)*10)/10;
      el.innerHTML = `<div class="h-calc-res" style="--rc:#f59e0b">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div><span class="h-calc-big">${ideal}kg</span><span class="h-calc-lbl">Peso ideal</span></div>
          <div><span class="h-calc-big">${min}–${max}kg</span><span class="h-calc-lbl">Faixa saudável</span></div>
        </div>
      </div>`;
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  DESAFIOS DE SAÚDE
  // ════════════════════════════════════════════════════════════════
  const CHALLENGES = [
    { id: 'nosugar',   title: '30 dias sem açúcar',       days: 30, icon: '🍬', desc: 'Elimine açúcar refinado por 30 dias e sinta a diferença.' },
    { id: 'exercise',  title: '30 dias de exercício',     days: 30, icon: '💪', desc: 'Pelo menos 30 minutos de atividade física por dia.' },
    { id: 'water2l',   title: 'Beber 2L de água por dia', days: 21, icon: '💧', desc: 'Hidrate-se adequadamente por 21 dias seguidos.' },
    { id: 'sleep8',    title: 'Dormir 8h por 7 dias',     days:  7, icon: '😴', desc: 'Priorize o sono por uma semana inteira.' },
    { id: 'nofastfood',title: 'Semana sem fast food',     days:  7, icon: '🥗', desc: 'Coma apenas comida caseira por 7 dias.' },
    { id: 'meditat',   title: '30 dias de meditação',     days: 30, icon: '🧘', desc: '10 minutos de meditação por dia durante 30 dias.' },
    { id: 'steps',     title: '10.000 passos por dia',    days: 21, icon: '🚶', desc: 'Caminhe pelo menos 10.000 passos diários por 3 semanas.' },
  ];

  function renderHChallenge() {
    const h = hData();
    if (!h.challenges) h.challenges = [];

    const el = document.getElementById('h-challenge');
    if (!el) return;

    const active = h.challenges.filter(c => {
      const ch = CHALLENGES.find(x => x.id === c.id);
      if (!ch) return false;
      const daysPassed = Math.floor((Date.now() - new Date(c.startDate)) / 86400000);
      return daysPassed < ch.days;
    });

    el.innerHTML = `
      <div class="page-header"><div><h1>Desafios de Saúde</h1><p class="page-sub">Aceite um desafio e mude seus hábitos.</p></div></div>
      ${active.length ? `<div class="cf-card" style="margin-bottom:16px;border-color:rgba(16,185,129,.3)">
        <h3 style="font-size:14px;font-weight:700;color:var(--green);margin-bottom:12px">✅ Desafios Ativos</h3>
        ${active.map(c => {
          const ch = CHALLENGES.find(x => x.id === c.id);
          const daysPassed = Math.floor((Date.now() - new Date(c.startDate)) / 86400000);
          const pct = Math.min(100, Math.round(daysPassed / ch.days * 100));
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:600">${ch.icon} ${ch.title}</span>
              <span style="color:var(--text-2);font-size:13px">${daysPassed}/${ch.days} dias</span>
            </div>
            <div style="background:var(--border);border-radius:4px;height:8px">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10b981,#06b6d4);border-radius:4px;transition:width .4s"></div>
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-top:3px">${pct}% concluído</div>
          </div>`;
        }).join('')}
      </div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${CHALLENGES.map(ch => {
          const joined = h.challenges.find(c => c.id === ch.id);
          const daysPassed = joined ? Math.floor((Date.now() - new Date(joined.startDate)) / 86400000) : 0;
          const done = joined && daysPassed >= ch.days;
          const inProgress = joined && !done;
          return `<div class="cf-card" style="border-color:${inProgress?'rgba(16,185,129,.3)':done?'rgba(99,102,241,.3)':''}">
            <div style="font-size:28px;margin-bottom:8px">${ch.icon}</div>
            <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">${ch.title}</h3>
            <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;line-height:1.5">${ch.desc}</p>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:12px;color:var(--text-3)">${ch.days} dias</span>
              ${done ? `<span style="color:var(--indigo);font-weight:700;font-size:12px">Concluído ✓</span>` :
                inProgress ? `<button class="btn-cancel" onclick="hLeaveChallenge('${ch.id}')" style="font-size:12px;padding:6px 12px">Abandonar</button>` :
                `<button class="btn-confirm" onclick="hJoinChallenge('${ch.id}')" style="font-size:12px;padding:6px 12px">Aceitar Desafio</button>`}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function hJoinChallenge(id) {
    const h = hData();
    if (!h.challenges) h.challenges = [];
    if (h.challenges.find(c => c.id === id)) return;
    h.challenges.push({ id, startDate: new Date().toISOString() });
    hPersist();
    renderHChallenge();
    const ch = CHALLENGES.find(c => c.id === id);
    showToast && showToast(`Desafio "${ch?.title}" iniciado!`);
  }

  function hLeaveChallenge(id) {
    const h = hData();
    if (!h.challenges) return;
    h.challenges = h.challenges.filter(c => c.id !== id);
    hPersist();
    renderHChallenge();
  }

  window.onAppNavigate = function (page) {
    if (page === 'h-dashboard') renderHDashboard();
    else if (page === 'h-meals') renderHMeals();
    else if (page === 'h-goals') renderHGoals();
    else if (page === 'h-nutri') initNutri();
    else if (page === 'h-exercise') renderHExercise();
    else if (page === 'h-sleep') renderHSleep();
    else if (page === 'h-progress') renderHProgress();
    else if (page === 'h-calc') renderHCalc();
    else if (page === 'h-challenge') renderHChallenge();
  };

  // expõe funções usadas no HTML (onclick)
  Object.assign(window, {
    hAddMeal, hQuickAdd, hDelMeal, hWater, hSaveGoals, hUseSuggested, nbSend,
    hAddExercise, hDelExercise, hLogSleep, hDelSleep, hLogWeight, hDelWeight,
    hStartChallenge,
  });

  // ── restaura último app aberto ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (_store.lastApp && _store.lastApp !== 'finance' && typeof switchApp === 'function') {
      switchApp(_store.lastApp);
    }
  });
})();
