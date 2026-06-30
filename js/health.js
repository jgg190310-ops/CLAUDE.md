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
    'h-whoop': 'Integração Whoop',
    'h-oura': 'Integração Oura',
    'h-strava': 'Integração Strava',
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
    // proteínas
    'ovo mexido (2 un)': { kcal: 180, prot: 12 },
    'clara de ovo (1 un)': { kcal: 17, prot: 4 },
    'tilápia (100g)': { kcal: 128, prot: 26 },
    'salmão (100g)': { kcal: 208, prot: 20 },
    'sardinha (1 lata)': { kcal: 180, prot: 22 },
    'carne moída (100g)': { kcal: 215, prot: 24 },
    'patinho (100g)': { kcal: 150, prot: 28 },
    'picanha (100g)': { kcal: 290, prot: 22 },
    'linguiça (1 un)': { kcal: 260, prot: 14 },
    'bacon (2 fatias)': { kcal: 90, prot: 6 },
    'presunto (1 fatia)': { kcal: 30, prot: 4 },
    'peito de peru (1 fatia)': { kcal: 25, prot: 5 },
    'tofu (100g)': { kcal: 76, prot: 8 },
    'lentilha (1 concha)': { kcal: 115, prot: 9 },
    'grão-de-bico (1 concha)': { kcal: 130, prot: 7 },
    // carboidratos
    'batata-doce (100g)': { kcal: 86, prot: 1.6 },
    'mandioca (100g)': { kcal: 125, prot: 1 },
    'cuscuz (100g)': { kcal: 112, prot: 3 },
    'pão de queijo (1 un)': { kcal: 80, prot: 2 },
    'cuscuz nordestino (1 fatia)': { kcal: 130, prot: 3 },
    'panqueca (1 un)': { kcal: 90, prot: 3 },
    'crepioca (1 un)': { kcal: 150, prot: 13 },
    'granola (2 colheres)': { kcal: 120, prot: 3 },
    'biscoito recheado (1 un)': { kcal: 55, prot: 0.6 },
    'farofa (2 colheres)': { kcal: 110, prot: 1 },
    // frutas
    'laranja (1 un)': { kcal: 62, prot: 1 },
    'manga (1 un)': { kcal: 100, prot: 1 },
    'morango (1 xíc)': { kcal: 50, prot: 1 },
    'abacate (metade)': { kcal: 160, prot: 2 },
    'uva (1 cacho)': { kcal: 90, prot: 1 },
    'melancia (1 fatia)': { kcal: 45, prot: 1 },
    'mamão (1 fatia)': { kcal: 60, prot: 1 },
    'abacaxi (1 fatia)': { kcal: 50, prot: 0.5 },
    // laticínios / bebidas
    'iogurte grego (1 un)': { kcal: 130, prot: 10 },
    'requeijão (1 colher)': { kcal: 55, prot: 1.5 },
    'leite desnatado (1 copo)': { kcal: 80, prot: 7 },
    'suco de laranja (1 copo)': { kcal: 110, prot: 1.5 },
    'cerveja (1 lata)': { kcal: 150, prot: 1.5 },
    'vinho (1 taça)': { kcal: 125, prot: 0 },
    'açaí (300ml)': { kcal: 300, prot: 4 },
    'vitamina de banana (1 copo)': { kcal: 220, prot: 8 },
    // lanches / fast food
    'coxinha (1 un)': { kcal: 180, prot: 6 },
    'pastel (1 un)': { kcal: 220, prot: 6 },
    'misto quente (1 un)': { kcal: 280, prot: 14 },
    'x-burguer (1 un)': { kcal: 450, prot: 22 },
    'batata frita (porção)': { kcal: 320, prot: 4 },
    'salgadinho (1 pacote)': { kcal: 150, prot: 2 },
    'pipoca (1 saco)': { kcal: 120, prot: 3 },
    'sorvete (1 bola)': { kcal: 130, prot: 2 },
    'brigadeiro (1 un)': { kcal: 80, prot: 1 },
    // gorduras / extras
    'azeite (1 colher)': { kcal: 90, prot: 0 },
    'pasta de amendoim (1 colher)': { kcal: 95, prot: 4 },
    'manteiga (1 colher)': { kcal: 75, prot: 0 },
    'amendoim (30g)': { kcal: 170, prot: 7 },
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
      greet.textContent = name ? `${s}, ${name}.` : `${s}.`;
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
    'Posso treinar hoje?',
    'Quantas calorias eu preciso por dia?',
    'Quanto de proteína por dia?',
    'O que comer no pós-treino?',
    'Creatina vale a pena?',
    'Como emagrecer com saúde?',
    'Como ganhar massa muscular?',
    'Qual meu IMC?',
    'Jejum intermitente funciona?',
    'Quanta água devo beber?',
    'Como cortar o açúcar?',
    'O que comer no café da manhã?',
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

    // sono
    if (/(sono|sleep|dormir)/.test(norm)) {
      return `Sono & recuperação: 😴<br><br>• O sono tem <b>4-5 ciclos</b> de ~90 min: N1, N2, N3 (sono profundo) e REM<br>• <b>N3 (sono profundo)</b>: repara tecidos e libera GH (hormônio do crescimento)<br>• <b>REM</b>: consolida memórias e regula emoções<br>• <b>Luz azul</b> (telas) suprime melatonina — evite 1h antes de dormir<br>• Dica: quarto escuro, fresco (18–21°C) e silencioso melhora a qualidade<br>• Falta de sono aumenta cortisol, fome (grelina) e prejudica a perda de gordura 🌙`;
    }

    // stress / ansiedade
    if (/(stress|ansiedade|ansioso|ansiedade)/.test(norm)) {
      return `Controle do estresse: 🧘<br><br><b>Técnicas de respiração:</b><br>• <b>4-7-8</b>: inspire 4s, segure 7s, expire 8s — ativa o sistema parassimpático<br>• <b>Respiração boxe</b>: 4s in, 4s hold, 4s out, 4s hold — usada por militares<br><br><b>Exercícios anti-estresse:</b><br>• <b>Caminhada 30 min</b>: reduz cortisol em até 26%<br>• <b>Yoga/Pilates</b>: combina movimento com respiração<br>• <b>HIIT</b>: libera endorfinas e melhora o humor rapidamente<br><br>Estresse crônico aumenta cortisol, retém gordura abdominal e prejudica a imunidade. 💚`;
    }

    // vitaminas
    if (/(vitamina|vitaminas)/.test(norm)) {
      return `Vitaminas essenciais: 💊<br><br>• <b>Vitamina D</b>: deficiência muito comum — sol 15 min/dia ou suplemento. Crucial para imunidade e humor<br>• <b>B12</b>: encontrada só em alimentos animais. Veganos precisam suplementar<br>• <b>Ferro</b>: carnes vermelhas, feijão, folhas escuras. Combine com vitamina C para absorver melhor<br>• <b>Magnésio</b>: essencial para sono, músculos e humor. Castanhas, sementes, folhas verdes<br>• <b>Ômega-3</b>: anti-inflamatório, melhora colesterol e cognição. Peixes gordurosos 2x/semana<br><br>⚠️ Consulte seu médico antes de suplementar — exames de sangue revelam deficiências reais. 🩺`;
    }

    // receitas
    if (/(receita|receitas)/.test(norm)) {
      return `Receita saudável rápida: 🍳<br><br><b>Omelete proteico (≈ 350 kcal | 28g prot)</b><br>• 3 ovos, 50g de queijo cottage, 1 tomate, folhas de espinafre<br>• Bata os ovos, despeje na frigideira antiaderente com azeite, adicione o recheio, dobre e tampe por 2 min<br><br><b>Bowl de frango (≈ 500 kcal | 42g prot)</b><br>• 150g peito de frango grelhado, 1 concha de arroz integral, 1 xíc de legumes assados, 1 col de tahine<br><br><b>Overnight oats (≈ 400 kcal | 20g prot)</b><br>• 4 col de aveia + 150ml leite + 1 scoop de whey + frutas. Misture e deixe na geladeira overnight 🥣`;
    }

    // dieta vegetariana
    if (/(vegetarian|vegan|sem carne)/.test(norm)) {
      return `Dieta vegetariana/vegana: 🌱<br><br>É saudável e completa se bem planejada. Atenção a:<br>• <b>Proteína</b>: feijão, lentilha, grão-de-bico, tofu, ovos (se ovolacto)<br>• <b>B12</b>: pode precisar suplementar (principalmente vegano)<br>• <b>Ferro</b>: combine com vitamina C para absorver melhor<br>• <b>Cálcio e ômega-3</b><br><br>Procure um nutricionista para ajustar suplementação. 🥦`;
    }

    // o que comer / dieta geral (exceto pré/pós-treino e café da manhã, tratados à parte)
    if (/(o que (comer|devo comer)|montar dieta|card[aá]pio|alimenta(ç|c)[aã]o saud)/.test(norm) && !/(treino|treinar|manh)/.test(norm)) {
      return `Alimentação saudável na prática: 🥗<br><br>• <b>Metade do prato</b>: verduras e legumes<br>• <b>Um quarto</b>: proteína (carne, frango, peixe, ovo, leguminosas)<br>• <b>Um quarto</b>: carboidrato (arroz, batata, massa — de preferência integral)<br>• <b>Gordura boa</b>: azeite, abacate, castanhas<br>• <b>Menos</b>: ultraprocessados, frituras, açúcar<br><br>Coma de verdade, beba água e mantenha constância. Quer que eu calcule suas calorias? Preencha <b>Metas & Corpo</b>. 😊`;
    }

    // ───────── INTEGRAÇÃO WHOOP (recuperação real) ─────────
    if (/(whoop|recuperacao|minha recupera|recovery|treinar hoje|posso treinar|pronto pra|pronto para|como estou hoje|devo treinar|treino hoje)/.test(norm) && !/recuperar (o )?musculo/.test(norm)) {
      let w = null; try { w = JSON.parse(localStorage.getItem('whoop_last') || 'null'); } catch(e){}
      if (!w || w.recScore == null) {
        return `Conecte sua <b>Whoop</b> (aba Whoop, no menu Saúde) que eu uso sua recuperação, sono e strain reais para orientar treino e alimentação do dia. 🟢<br><br>Enquanto isso: se você dormiu bem e não está dolorido, pode treinar forte. Cansado ou mal dormido? Priorize recuperação ativa (caminhada, mobilidade) e capriche na proteína e hidratação.`;
      }
      const fmtH = ms => { const m = Math.round((ms||0)/60000); return Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'); };
      const rec = w.recScore;
      const zone = rec>=67 ? 'verde' : rec>=34 ? 'amarela' : 'vermelha';
      const guide = rec>=67
        ? `🟢 <b>Zona verde (${rec}%)</b> — corpo pronto para intensidade. Pode ir de treino pesado/HIIT. Garanta <b>carboidrato antes</b> (energia) e <b>proteína depois</b> (reparo).`
        : rec>=34
        ? `🟡 <b>Zona amarela (${rec}%)</b> — recuperação parcial. Treino moderado: força com volume menor ou cardio leve. Hidrate bem e evite déficit calórico agressivo hoje.`
        : `🔴 <b>Zona vermelha (${rec}%)</b> — corpo pedindo descanso. Foque em recuperação ativa (caminhada, mobilidade, alongamento), capriche em proteína, magnésio e sono. Treino pesado hoje rende pouco e aumenta risco de lesão.`;
      const extra = [];
      if (w.sleepMs) extra.push(`Você dormiu <b>${fmtH(w.sleepMs)}</b>${w.sleepPerf!=null?` (${w.sleepPerf}% de desempenho)`:''}${w.sleepMs < 6.5*3600000 ? ' — sono curto eleva a fome (grelina); cuidado com beliscos hoje.' : '.'}`);
      if (w.strain != null) extra.push(`Strain de hoje: <b>${w.strain.toFixed(1)}/21</b>${w.strain>=14?' — esforço alto, reponha carbo e proteína no pós.':'.'}`);
      if (w.rhr != null) extra.push(`FC de repouso: <b>${w.rhr} bpm</b>${w.hrv!=null?` · HRV ${w.hrv} ms`:''}.`);
      return `${guide}<br><br>${extra.join('<br>')}`;
    }

    // ───────── PRÉ E PÓS-TREINO ─────────
    if (/(pre.?treino|pré.?treino|antes do treino|comer antes de treinar|o que comer antes)/.test(norm)) {
      return `Refeição <b>pré-treino</b> (1-2h antes): 🏋️<br><br>• <b>Carboidrato</b> é o foco — combustível: banana, aveia, pão integral, batata-doce, arroz.<br>• Proteína leve ajuda (iogurte, whey).<br>• Evite muita gordura/fibra perto do treino (digestão lenta dá desconforto).<br><br>Ex. rápido (30-45 min antes): 1 banana + 1 scoop de whey. Treino de manhã em jejum? Tudo bem para sessões leves/moderadas; para força pesada, coma algo antes.`;
    }
    if (/(pos.?treino|pós.?treino|depois do treino|janela anabolica|janela anabólica|recuperar musculo|recuperar músculo)/.test(norm)) {
      const w0 = body.weight || 70;
      return `Refeição <b>pós-treino</b>: 💪<br><br>• <b>Proteína</b> (20-40g) para reparar o músculo: ${Math.round(w0*0.3)}g é um bom alvo pra você. Whey, frango, ovos, atum.<br>• <b>Carboidrato</b> para repor o glicogênio: arroz, batata, fruta.<br>• A "janela anabólica" não é tão estreita quanto diziam — o importante é a <b>proteína total do dia</b>. Mas comer em 1-2h ajuda.<br><br>Ex.: 150g frango + 1 concha de arroz + legumes. Ou shake: whey + banana + aveia.`;
    }

    // ───────── SUPLEMENTOS ─────────
    if (/(creatina)/.test(norm)) {
      return `<b>Creatina</b> — o suplemento mais estudado e seguro: 🔬<br><br>• <b>Dose</b>: 3-5g por dia, todos os dias (inclusive dias sem treino). Não precisa de fase de saturação.<br>• <b>Quando</b>: qualquer horário — constância importa mais que timing.<br>• <b>Benefícios</b>: mais força, mais volume de treino, ganho de massa, e até benefícios cognitivos.<br>• <b>Tipo</b>: monohidratada (a mais barata já é a melhor). Fuja de "blends" caros.<br>• Retém um pouco de água no músculo (normal, não é gordura).<br><br>Segura para uso contínuo em pessoas saudáveis. 💧 Beba bastante água.`;
    }
    if (/(suplement|whey|bcaa|glutamina|pre.?workout|termogenic|termogênic|maltodextrina)/.test(norm)) {
      return `<b>Suplementos — o que vale e o que é hype:</b> 💊<br><br>• <b>Vale a pena</b>: Whey (praticidade de proteína), Creatina (força/massa), Cafeína (foco/energia), Vitamina D e Ômega-3 (se há deficiência).<br>• <b>Geralmente desnecessário</b>: BCAA (se você já come proteína suficiente), Glutamina, "termogênicos" milagrosos, maltodextrina (comida resolve).<br>• <b>Regra</b>: suplemento <i>complementa</i> uma dieta boa, não substitui. 80% do resultado é comida de verdade + treino + sono.<br><br>Antes de gastar: bata sua meta de proteína com comida primeiro.`;
    }
    if (/(cafe|café|cafein|cafeín|pre.?treino energia)/.test(norm) && /(quant|hora|dose|demais|ajuda|treino|energia|dormir)/.test(norm)) {
      return `<b>Cafeína</b> — o estimulante mais usado do mundo: ☕<br><br>• <b>Dose</b>: 3-6 mg/kg melhora foco, disposição e desempenho. Para 70kg: ~200-400 mg (1 xícara de café ≈ 80-100 mg).<br>• <b>Pré-treino</b>: 30-45 min antes aumenta força e resistência.<br>• <b>Corte após 14-16h</b>: meia-vida de ~5-6h atrapalha o sono mesmo que você "durma".<br>• Tolerância sobe — faça pausas periódicas.<br><br>⚠️ Em excesso: ansiedade, taquicardia, insônia. Café puro é ótimo; cuidado com energéticos açucarados.`;
    }

    // ───────── JEJUM / METABOLISMO ─────────
    if (/(jejum|intermitente|16.?8|nao comer de manha|não comer de manhã)/.test(norm)) {
      return `<b>Jejum intermitente</b> (ex.: 16/8): ⏱️<br><br>• Você concentra as refeições numa janela (ex.: 12h-20h) e jejua o resto.<br>• <b>Funciona para emagrecer?</b> Sim — mas porque ajuda a comer menos no total, não por "mágica metabólica".<br>• Pode melhorar sensibilidade à insulina e disciplina alimentar.<br>• ⚠️ Não combina com todo mundo: quem tem histórico de compulsão, gestantes ou certas condições devem evitar.<br>• Treino em jejum: ok para leve/moderado; força pesada rende mais alimentado.<br><br>O melhor protocolo é o que você sustenta sem sofrer. Não é obrigatório.`;
    }
    if (/(metabolismo|metabolismo lento|destravar|emagrecer mais rapido|nao emagreco|não emagreço|travou|plato|platô|estagnei)/.test(norm)) {
      return `<b>"Metabolismo travado" — o que realmente acontece:</b> 🔄<br><br>• Raramente é o metabolismo — quase sempre é <b>gasto subestimado e comida subnotada</b> (a gente esquece dos beliscos, óleo, bebidas).<br>• Platô real existe: ao emagrecer, seu corpo gasta menos (menos massa para mover). Ajuste a meta calórica conforme perde peso.<br>• <b>Como reacelerar</b>: aumente proteína (efeito térmico alto), ganhe músculo (queima em repouso), mais passos no dia (NEAT), durma bem (sono ruim trava perda de gordura).<br>• Evite déficits muito agressivos por meses — pause em manutenção por 1-2 semanas (diet break).<br><br>Pese e anote 1 semana com sinceridade — o "mistério" some.`;
    }

    // ───────── SAÚDE METABÓLICA ─────────
    if (/(colesterol|ldl|hdl|triglicer)/.test(norm)) {
      return `<b>Colesterol — entendendo os números:</b> 🫀<br><br>• <b>LDL</b> ("ruim"): em excesso forma placas. <b>HDL</b> ("bom"): protege. <b>Triglicerídeos</b>: ligados a açúcar/álcool/excesso calórico.<br>• <b>Para melhorar</b>: mais fibras (aveia, feijão, frutas), gorduras boas (azeite, abacate, peixe), menos ultraprocessado e açúcar, atividade física.<br>• O <b>ovo foi absolvido</b>: para a maioria, comer ovo não dispara o colesterol — o vilão é gordura trans e excesso de açúcar/refinados.<br>• Triglicerídeo alto responde muito a cortar açúcar e álcool.<br><br>⚠️ Acompanhe com exames e médico — genética pesa.`;
    }
    if (/(glicemia|diabetes|açucar no sangue|acucar no sangue|insulina|indice glicemico|índice glicêmico|pre.?diabet)/.test(norm)) {
      return `<b>Controle de glicemia e açúcar no sangue:</b> 🩸<br><br>• Picos de glicose vêm de <b>carboidrato refinado isolado</b> (pão branco, doce, refri).<br>• <b>Amacie os picos</b>: combine carbo com proteína, gordura e fibra; comece a refeição pela salada/proteína.<br>• Prefira carbos integrais e <i>in natura</i> (baixo índice glicêmico).<br>• Movimento após comer (caminhada de 10-15 min) reduz o pico.<br>• Massa muscular = "esponja" de glicose: treino de força melhora a sensibilidade à insulina.<br><br>⚠️ Pré-diabetes/diabetes: acompanhamento médico e nutricional é essencial.`;
    }
    if (/(intestino|fibra|prisao de ventre|prisão de ventre|constipa|digest|microbiota|flora intestinal|inchaço|inchaco|retençao|retencao)/.test(norm)) {
      return `<b>Intestino, fibras e digestão:</b> 🌱<br><br>• <b>Fibras</b> (25-35g/dia): regulam o intestino e alimentam a microbiota. Fontes: feijão, aveia, frutas com casca, verduras, sementes.<br>• <b>Água</b> é parceira da fibra — sem água, fibra prende mais.<br>• <b>Probióticos/fermentados</b>: iogurte natural, kefir, kombucha ajudam a flora.<br>• <b>Inchaço/retenção</b>: muito sódio (ultraprocessado) retém água; potássio (banana, água, vegetais) equilibra.<br>• Movimento e rotina (ir ao banheiro no mesmo horário) regulam o trânsito.<br><br>Intestino saudável melhora imunidade, humor e até absorção de nutrientes.`;
    }

    // ───────── COMPORTAMENTO ALIMENTAR ─────────
    if (/(compuls|fome emocional|beliscar|ansiedade de comer|comer demais|descontar na comida|vontade de doce a noite|vontade de doce à noite)/.test(norm)) {
      return `<b>Fome emocional e compulsão:</b> 🧠<br><br>• <b>Fome real</b> vem gradual e aceita qualquer comida; <b>fome emocional</b> é súbita e quer algo específico (doce, gordura).<br>• <b>Pausa de 10 min</b> antes de ceder: beba água, respire, pergunte "é fome ou emoção?".<br>• <b>Não proíba tudo</b>: restrição total gera farra de rebote. Inclua um prazer planejado.<br>• <b>Coma proteína e fibra</b> nas refeições — saciam de verdade e cortam o beliscar.<br>• Sono ruim e estresse disparam vontade de açúcar (cortisol + grelina).<br>• Tire o gatilho de vista: o que não está em casa não é comido às 22h.<br><br>Compulsão recorrente merece apoio de nutricionista e/ou psicólogo — sem culpa. 💚`;
    }
    if (/(alcool|álcool|cerveja|bebida|vinho|beber engorda)/.test(norm)) {
      return `<b>Álcool e o corpo:</b> 🍺<br><br>• 7 kcal por grama — quase como gordura, e <b>"calorias vazias"</b> (sem nutriente).<br>• O corpo prioriza queimar o álcool, então a queima de gordura <b>pausa</b> enquanto ele está no sangue.<br>• Atrapalha o sono profundo (você dorme, mas recupera mal — sua Whoop mostra isso).<br>• Reduz a síntese proteica e a recuperação muscular.<br>• <b>Dano controlado</b>: hidrate (1 copo de água por dose), coma antes, escolha opções menos açucaradas, e limite a frequência.<br><br>Não precisa zerar — mas álcool frequente é o maior sabotador silencioso de quem treina.`;
    }
    if (/(imunidade|gripe|resfriado|defesa|fortalecer o corpo|imune)/.test(norm)) {
      return `<b>Imunidade pela alimentação:</b> 🛡️<br><br>• <b>Vitamina C</b> (laranja, acerola, kiwi, pimentão), <b>Zinco</b> (carne, sementes), <b>Vitamina D</b> (sol + suplemento se baixa).<br>• <b>Proteína suficiente</b>: anticorpos são feitos de proteína.<br>• <b>Intestino saudável</b> = 70% da imunidade. Fibras e fermentados ajudam.<br>• <b>Sono</b> é imunidade: noites mal dormidas derrubam as defesas.<br>• Menos açúcar e ultraprocessado (inflamam), mais comida colorida de verdade.<br><br>Nenhum alimento isolado faz milagre — é o conjunto + sono + movimento.`;
    }
    if (/(comer fora|fast food|restaurante|marmita|meal prep|delivery|comer na rua)/.test(norm)) {
      return `<b>Comendo bem fora de casa:</b> 🍱<br><br>• <b>Marmita/meal prep</b>: cozinhe 1x na semana (proteínas + carbos + legumes em potes). Economiza dinheiro e blinda contra escolhas ruins.<br>• <b>Restaurante a quilo</b>: metade do prato de salada/legumes, um quarto de proteína, um quarto de carbo. Cuidado com molhos e frituras.<br>• <b>Fast food</b>: prefira grelhados, versões sem maionese, sem refri (calorias líquidas). Combo vira 1200+ kcal fácil.<br>• <b>Delivery</b>: peça por porção, não por "promoção dobrada"; adicione uma salada.<br><br>Regra prática: proteína + vegetais sempre presentes = refeição decente em qualquer lugar.`;
    }

    // ───────── NOVOS INTENTS DE NUTRIÇÃO ─────────

    // proteína por refeição
    if (/(proteina por refei|proteina por refeicao|proteina em cada|quanto de proteina por refei|dividir (a )?proteina)/.test(norm)) {
      const w = body.weight || 70;
      const perMeal = Math.round((w * 1.8) / 4);
      return `<b>Proteína por refeição</b> — distribua ao longo do dia: 🍽️<br><br>• A síntese muscular responde melhor a <b>20-40g por refeição</b>, a cada 3-4h.<br>• Para ${body.weight ? `seus ${w}kg` : '70kg'}: cerca de <b>${perMeal}g por refeição</b> em 4 refeições.<br>• Inclua uma fonte em <b>todas</b>: ovo no café, frango no almoço, atum na tarde, carne na janta.<br>• Distribuir é melhor que concentrar tudo numa refeição só.<br><br>Dica: na ceia, caseína (queijo, iogurte) libera aminoácidos devagar à noite. 🌙`;
    }

    // déficit calórico (explicação, sem ser só "emagrecer")
    if (/(deficit calorico|deficit calórico|o que e deficit|como fazer deficit|tamanho do deficit)/.test(norm) && !/emagrec/.test(norm)) {
      return `<b>Déficit calórico</b> — a base de toda perda de gordura: 🔥<br><br>• É comer <b>menos calorias do que você gasta</b>. Sem déficit, não há emagrecimento — independente da dieta.<br>• <b>Tamanho ideal</b>: 300-500 kcal/dia (perda de ~0,3-0,5 kg/semana). Sustentável.<br>• Déficit agressivo (>700 kcal) derruba energia, músculo e adesão.<br>• Você cria déficit comendo menos <b>e</b> se movendo mais (treino + passos).<br>• Proteína alta no déficit preserva músculo e dá saciedade.<br><br>1 kg de gordura ≈ 7700 kcal. Constância > pressa.`;
    }

    // carboidratos bons vs ruins
    if (/(carboidrato|carbo bom|carbo ruim|carbo faz mal|qual carbo|melhores carbo)/.test(norm) && !/(low carb|sem carbo|cortar carbo|pre.?treino|pós.?treino|pos.?treino)/.test(norm)) {
      return `<b>Carboidratos — bons x ruins:</b> 🍚<br><br>• <b>Bons</b> (in natura, integrais, com fibra): arroz integral, batata-doce, aveia, feijão, frutas, mandioca. Liberam energia devagar.<br>• <b>Ruins</b> (refinados, pobres em fibra): pão branco, açúcar, refri, doces, salgadinho. Picos de glicose e fome rápida.<br>• Carbo <b>não engorda</b> por si — o excesso calórico engorda.<br>• Quanto mais ativo/treina, mais carbo você aproveita (energia e recuperação).<br><br>Regra: prefira o carbo "que veio da terra" ao "que veio do pacote". 🌾`;
    }

    // gordura saudável / ômega-3
    if (/(gordura (boa|saudavel|saudável)|gordura faz mal|omega.?3|ômega.?3|gordura insaturada)/.test(norm)) {
      return `<b>Gorduras boas e ômega-3:</b> 🥑<br><br>• Gordura é essencial — produz hormônios e absorve vitaminas (A, D, E, K). Mire <b>20-35% das calorias</b>.<br>• <b>Boas (insaturadas)</b>: azeite extravirgem, abacate, castanhas, sementes, peixes gordos.<br>• <b>Ômega-3</b> (anti-inflamatório, coração e cérebro): salmão, sardinha, atum 2x/semana; chia e linhaça para veganos.<br>• <b>Evite</b>: gordura trans (margarina dura, frituras industriais) — a vilã real.<br>• Castanhas: 1 punhado/dia (~30g) é ótimo, mas calórico — não exagere.<br><br>Gordura boa sacia e melhora o colesterol HDL. 🐟`;
    }

    // ovo
    if (/(ovo|ovos)/.test(norm) && !/(café da manh|cafe da manh)/.test(norm)) {
      return `<b>Ovo — proteína completa e barata:</b> 🥚<br><br>• <b>1 ovo grande</b>: ~70 kcal e <b>6g de proteína</b> de alto valor biológico.<br>• A <b>gema</b> tem colina, vitamina D, A e B12 — não jogue fora; coma o ovo inteiro.<br>• <b>Colesterol</b>: para a maioria das pessoas, ovo não eleva o colesterol no sangue.<br>• Quantos por dia? 1-3 é seguro e saudável para gente saudável.<br>• Cozido, mexido com pouco óleo ou pochê: melhores formas.<br><br>Excelente no café, na marmita ou como lanche proteico. 💪`;
    }

    // frango vs carne vermelha
    if (/(frango (vs|ou) carne|carne vermelha|frango ou carne|melhor carne|carne branca)/.test(norm)) {
      return `<b>Frango x carne vermelha:</b> 🍗<br><br>• <b>Frango (peito)</b>: ~31g proteína/100g, magro, baixa gordura. Ótimo no dia a dia.<br>• <b>Carne vermelha magra</b> (patinho, alcatra): rica em <b>ferro, zinco e B12</b> — importante contra anemia.<br>• Varie as duas: nenhuma precisa ser excluída.<br>• <b>Modere</b> carne vermelha processada (linguiça, bacon, salsicha) — ligada a mais risco cardíaco.<br>• Prefira grelhado/assado a frito; a forma de preparo pesa mais que a carne em si.<br><br>2-4x/semana carne vermelha magra + frango/peixe nos outros dias é equilibrado.`;
    }

    // peixe
    if (/(peixe|salmao|salmão|sardinha|atum|tilapia|tilápia)/.test(norm) && !/(omega|ômega)/.test(norm)) {
      return `<b>Peixe — proteína leve e ômega-3:</b> 🐟<br><br>• <b>Magros</b> (tilápia, merluza, pescada): proteína com pouca gordura — ótimos no déficit.<br>• <b>Gordos</b> (salmão, sardinha, atum): ricos em <b>ômega-3</b>, anti-inflamatório.<br>• <b>Sardinha</b> é barata, sustentável e cheia de cálcio e ômega-3 — subestimada!<br>• Mire <b>2x/semana</b> de peixe, ao menos 1 sendo gordo.<br>• Grelhado, assado ou no vapor preserva os nutrientes.<br><br>Atum em lata (em água) é praticidade: ~26g de proteína por lata. 🥫`;
    }

    // ferro / anemia
    if (/(ferro|anemia|cansaco constante|cansaço constante|ferritina)/.test(norm)) {
      return `<b>Ferro e anemia:</b> 🩸<br><br>• Ferro carrega oxigênio no sangue — baixo nível causa cansaço, falta de ar e palidez.<br>• <b>Ferro heme</b> (melhor absorvido): carne vermelha, fígado, frango, peixe.<br>• <b>Ferro não-heme</b>: feijão, lentilha, folhas escuras — absorve menos.<br>• <b>Truque</b>: combine ferro vegetal com <b>vitamina C</b> (laranja, limão) e absorve muito mais.<br>• <b>Evite café/chá</b> junto da refeição rica em ferro (tanino atrapalha).<br>• Mulheres menstruadas e veganos têm mais risco.<br><br>⚠️ Cansaço persistente? Peça hemograma e ferritina ao médico.`;
    }

    // magnésio
    if (/(magnesio|magnésio)/.test(norm)) {
      return `<b>Magnésio — mineral relaxante:</b> ✨<br><br>• Atua em 300+ reações: músculos, sono, humor, energia e açúcar no sangue.<br>• <b>Sinais de falta</b>: cãibras, insônia, irritabilidade, fadiga.<br>• <b>Fontes</b>: castanhas, sementes (abóbora), folhas verde-escuras, abacate, cacau 70%+, feijão.<br>• <b>Dose</b>: ~300-400 mg/dia. Suplemento (glicinato/dimalato) ajuda no sono e cãibras.<br>• Útil para quem treina pesado e sua muito.<br><br>Um quadradinho de chocolate amargo + punhado de castanhas já contribui bem. 🍫`;
    }

    // vitamina D (específica)
    if (/(vitamina d|vit d|tomar sol|deficiencia de vitamina|deficiência de vitamina)/.test(norm)) {
      return `<b>Vitamina D — a vitamina do sol:</b> ☀️<br><br>• Crucial para <b>ossos, imunidade, humor e hormônios</b>. Deficiência é muito comum no Brasil mesmo com sol.<br>• <b>Produção</b>: 15-20 min de sol (braços e pernas) na maioria dos dias, sem protetor nesse intervalo curto.<br>• <b>Alimentos</b> têm pouco: gema, peixes gordos, alimentos fortificados.<br>• <b>Suplementação</b> é frequentemente necessária — mas só com exame (25-OH-D) e orientação médica.<br>• Nível desejável geralmente >30 ng/mL.<br><br>⚠️ Não suplemente "no chute": vitamina D em excesso é tóxica. Dose com exame. 🩺`;
    }

    // ceia / comer à noite
    if (/(ceia|antes de dormir comer|lanche da noite|comer (a|à) noite engorda|comer de madrugada|comer tarde engorda)/.test(norm)) {
      return `<b>Comer à noite engorda? (mito) e a ceia ideal:</b> 🌙<br><br>• <b>Mito</b>: a hora não engorda — o que conta é o <b>total de calorias do dia</b>. Comer às 22h não vira gordura "automaticamente".<br>• O cuidado real: à noite a gente belisca por tédio/ansiedade, e aí o total estoura.<br>• <b>Ceia inteligente</b>: proteína de digestão lenta — iogurte natural, queijo, ovo, ou whey/caseína.<br>• Evita acordar com fome e alimenta o reparo muscular durante o sono.<br>• Refeição pesada/gordurosa tarde pode atrapalhar o sono.<br><br>Ex.: 1 pote de iogurte natural + canela, ou 2 ovos mexidos. 🥛`;
    }

    // mastigação / velocidade de comer
    if (/(mastig|comer devagar|comer rapido|comer rápido|velocidade de comer|comer com pressa)/.test(norm)) {
      return `<b>Mastigação e velocidade ao comer:</b> 🍽️<br><br>• O cérebro leva <b>~20 min</b> para registrar saciedade. Comendo rápido, você come demais antes do "chega".<br>• <b>Mastigar bem</b> (20-30x cada garfada) melhora a digestão e a absorção de nutrientes.<br>• <b>Truques</b>: pouse o garfo entre garfadas, beba água, evite tela na refeição.<br>• Comer devagar reduz inchaço, gases e azia.<br>• Estudos ligam comer rápido a mais peso e pior controle de glicose.<br><br>Refeição é pra durar 15-20 min, não 5. Diminua o ritmo e coma menos naturalmente. 🧘`;
    }

    // pressão alta / sódio
    if (/(pressao alta|pressão alta|hipertens|sodio|sódio|sal demais|reduzir sal)/.test(norm)) {
      return `<b>Pressão alta e sódio:</b> 🫀<br><br>• Excesso de <b>sódio</b> retém água e eleva a pressão. Limite: <b>< 2g de sódio/dia</b> (~5g de sal, 1 colher de chá).<br>• O vilão escondido é o <b>ultraprocessado</b>: embutidos, temperos prontos, salgadinho, miojo, enlatados.<br>• <b>Potássio equilibra o sódio</b>: banana, feijão, batata, folhas, água de coco.<br>• Dieta <b>DASH</b> (frutas, vegetais, integrais, laticínios magros) reduz a pressão comprovadamente.<br>• Atividade física, menos álcool e perda de peso também baixam a pressão.<br><br>⚠️ Hipertensão exige acompanhamento médico — não suspenda remédio por conta própria.`;
    }

    // açúcar escondido / leitura de rótulo
    if (/(acucar escondido|açúcar escondido|ler rotulo|ler rótulo|leitura de rotulo|leitura de rótulo|entender rotulo|tabela nutricional)/.test(norm)) {
      return `<b>Lendo o rótulo e caçando açúcar escondido:</b> 🔍<br><br>• Olhe os <b>ingredientes</b>: quanto mais curta a lista, melhor. Açúcar entre os primeiros = produto açucarado.<br>• Açúcar tem <b>vários nomes</b>: xarope de glicose/milho, dextrose, maltodextrina, sacarose, "açúcar invertido".<br>• Compare a coluna <b>por 100g</b> (não por porção, que vem manipulada pequena).<br>• <b>Atenção</b> a molhos, pães, iogurtes "de fruta", cereais, granolas e bebidas — açúcar escondido.<br>• "Zero gordura" costuma compensar com mais açúcar; "fit/natural" não significa saudável.<br><br>Regra: se a avó não reconheceria como comida, desconfie. 🏷️`;
    }

    // ultraprocessados
    if (/(ultraprocessad|processado|comida industrializada|nova classifica)/.test(norm)) {
      return `<b>Ultraprocessados — por que evitar:</b> 🚫<br><br>• São formulações industriais cheias de açúcar, sódio, gordura ruim e aditivos: salgadinho, refri, biscoito recheado, embutidos, miojo, nuggets.<br>• <b>Hiperpalatáveis</b>: feitos pra você comer demais — calóricos e pouco saciantes.<br>• Ligados a obesidade, diabetes, hipertensão e inflamação.<br>• Troque por <b>comida de verdade</b>: in natura (frutas, legumes, ovo, feijão) e minimamente processada (arroz, leite, queijo).<br>• Não precisa ser 100% — mire em <b>80/20</b>: a base é comida real.<br><br>Cozinhar em casa é o maior atalho para comer melhor. 🍳`;
    }

    // suplementos necessários (visão geral, sem repetir creatina/whey)
    if (/(quais suplementos|suplementos necessarios|suplementos necessários|preciso suplementar|todo mundo precisa)/.test(norm)) {
      return `<b>Quais suplementos você realmente precisa?</b> 💊<br><br>• <b>Depende de exames e dieta</b> — não existe lista universal.<br>• <b>Mais comuns por deficiência</b>: Vitamina D, B12 (veganos), Ômega-3, Ferro (mulheres), Magnésio.<br>• <b>Por praticidade/performance</b>: Whey (bater proteína) e Creatina (força/massa).<br>• <b>Quase sempre dispensáveis</b>: BCAA, glutamina, termogênicos, "queimadores de gordura".<br>• A base é comida real — suplemento só tampa buracos específicos.<br><br>⚠️ Faça exames de sangue antes de gastar; suplementar "no escuro" é desperdício (ou risco). 🩺`;
    }

    // ressaca / muito sal / comilança
    if (/(ressaca alimentar|exagerei|comi demais|sai da dieta|furei a dieta|fim de semana exagerei|comi muito)/.test(norm)) {
      return `<b>Exagerou? Veja o que fazer (sem culpa):</b> 😌<br><br>• <b>Um dia não desfaz semanas</b> — assim como uma salada não emagrece, uma comilança não engorda de vez.<br>• O peso que subir no dia seguinte é <b>água e sódio</b>, não gordura. Passa em 2-3 dias.<br>• <b>Não compense</b> com jejum punitivo ou treino exaustivo — isso alimenta o ciclo restringe-descontrola.<br>• Volte à rotina normal na próxima refeição: proteína, vegetais, água.<br>• Hidrate bem e caminhe — ajuda a desinchar.<br><br>Disciplina é voltar rápido, não ser perfeito. Siga em frente. 💚`;
    }

    // azia / refluxo
    if (/(azia|refluxo|queimacao|queimação|estomago queima|estômago queima|gastrite)/.test(norm)) {
      return `<b>Azia e refluxo — alívio pela alimentação:</b> 🔥<br><br>• <b>Gatilhos comuns</b>: frituras, gordura em excesso, café, álcool, refri, chocolate, pimenta, tomate, hortelã.<br>• <b>Coma menos por vez</b> e devagar — refeições grandes pressionam o estômago.<br>• <b>Não deite</b> logo após comer; espere 2-3h antes de dormir.<br>• Eleve a cabeceira da cama e evite roupas apertadas.<br>• Perder peso abdominal reduz muito o refluxo.<br><br>⚠️ Azia frequente merece avaliação médica (pode ser gastrite/H. pylori) — não vire refém de antiácido. 🩺`;
    }

    // emagrecer sem perder músculo
    if (/(perder gordura sem perder|emagrecer sem perder|nao perder musculo|não perder músculo|preservar massa|secar sem perder)/.test(norm)) {
      const w = body.weight || 70;
      return `<b>Emagrecer sem perder músculo:</b> 🏋️<br><br>• <b>Déficit moderado</b> (300-500 kcal): cortes agressivos comem músculo junto com gordura.<br>• <b>Proteína alta</b>: 1,8-2,2g/kg (para ${body.weight ? `${w}kg` : '70kg'}: ~${Math.round(w*2)}g/dia). É o que mais protege o músculo.<br>• <b>Treino de força</b> 3-4x/semana: dá ao corpo o "motivo" de manter o músculo.<br>• Não zere o carbo — ele sustenta o desempenho no treino.<br>• Durma 7-9h: sono ruim aumenta a perda de massa magra.<br><br>O objetivo é mudar a composição, não só o número da balança. 💪`;
    }

    // vontade de doce
    if (/(vontade de doce|desejo de doce|fissura por doce|nao resisto (a )?doce|não resisto)/.test(norm) && !/(a noite|à noite)/.test(norm)) {
      return `<b>Domando a vontade de doce:</b> 🍫<br><br>• Muitas vezes é <b>fome real ou pouca proteína</b> — coma direito nas refeições e a fissura cai.<br>• <b>Açúcar chama açúcar</b>: quanto mais come, mais o paladar pede. Reduzir desacostuma em 2-3 semanas.<br>• <b>Trocas</b>: fruta, chocolate 70%+ (1-2 quadradinhos), iogurte com canela, tâmara.<br>• <b>Sono e estresse</b>: noite mal dormida e cortisol alto disparam o desejo por doce.<br>• Não proíba 100% — um doce planejado evita a farra por rebote.<br><br>Beba água e espere 10 min: muita "vontade" é sede ou tédio. 💚`;
    }

    // cálcio / ossos
    if (/(calcio|cálcio|osteoporose|saude dos ossos|saúde dos ossos|leite faz bem)/.test(norm)) {
      return `<b>Cálcio e saúde dos ossos:</b> 🦴<br><br>• Mire <b>~1000 mg/dia</b> (mais para idosos e mulheres pós-menopausa).<br>• <b>Fontes</b>: leite e derivados, sardinha com espinha, tofu, gergelim, folhas verde-escuras (couve, brócolis).<br>• <b>Vitamina D</b> é parceira: sem ela, o cálcio não fixa no osso.<br>• <b>Treino de força e impacto</b> deixa o osso mais denso — exercício é remédio para osso.<br>• Excesso de refri, sal e álcool atrapalha a fixação de cálcio.<br><br>Veganos: tofu, gergelim, vegetais verdes e bebidas fortificadas cobrem bem. 🥬`;
    }

    // zinco
    if (/(zinco)/.test(norm)) {
      return `<b>Zinco — imunidade, pele e hormônios:</b> 🛡️<br><br>• Atua na imunidade, cicatrização, testosterona e saúde da pele/cabelo.<br>• <b>Sinais de falta</b>: imunidade baixa, queda de cabelo, cicatrização lenta.<br>• <b>Fontes</b>: carnes, frutos do mar (ostra é campeã), sementes de abóbora, castanhas, feijão.<br>• Veganos absorvem menos (fitatos dos grãos) — atenção à quantidade.<br>• <b>Dose</b>: ~8-11 mg/dia. Não suplemente em excesso (atrapalha a absorção de cobre).<br><br>Uma alimentação variada com proteína costuma cobrir o zinco. 🦪`;
    }

    // refrigerante / sucos / calorias líquidas
    if (/(refrigerante|refri|suco de caixinha|calorias liquidas|calorias líquidas|bebida açucarada|bebida acucarada|energetico|energético)/.test(norm)) {
      return `<b>Calorias líquidas — o sabotador invisível:</b> 🥤<br><br>• Refri, suco de caixinha e energéticos têm <b>muito açúcar e zero saciedade</b> — você bebe e continua com fome.<br>• 1 lata de refri ≈ <b>140 kcal e 7 colheres de açúcar</b>. Fácil somar 500 kcal/dia só em bebida.<br>• <b>Suco natural</b> também concentra açúcar de várias frutas — prefira a fruta inteira (tem fibra).<br>• <b>Troque por</b>: água, água com gás e limão, chá gelado sem açúcar, café.<br>• Cortar bebida açucarada é uma das mudanças que mais emagrece com menos esforço.<br><br>Hidrate com o que não tem caloria. 💧`;
    }

    // glúten / lactose
    if (/(gluten|glúten|lactose|intolerancia|intolerância|sem gluten|sem lactose)/.test(norm)) {
      return `<b>Glúten e lactose — quando cortar:</b> 🌾<br><br>• <b>Só corte se houver diagnóstico</b>: doença celíaca/sensibilidade ao glúten, ou intolerância à lactose. Para quem não tem, cortar não emagrece nem é "mais saudável".<br>• <b>Intolerância à lactose</b>: gases, inchaço e diarreia após laticínios. Use lactose-free ou enzima (lactase); iogurte e queijos curados são melhor tolerados.<br>• "Sem glúten" industrializado costuma ter <b>mais açúcar e gordura</b> — não é sinônimo de saudável.<br>• Inchaço após pão pode ser excesso de ultraprocessado, não o glúten em si.<br><br>⚠️ Suspeita de intolerância/celíaca? Investigue com médico antes de cortar grupos alimentares. 🩺`;
    }

    // fibras (específico)
    if (/(fibra|fibras)/.test(norm) && !/(intestino|microbiota|prisao|prisão|constipa)/.test(norm)) {
      return `<b>Fibras — pouco lembradas, muito importantes:</b> 🌾<br><br>• Mire <b>25-35g/dia</b> — a maioria das pessoas come bem menos.<br>• <b>Solúveis</b> (aveia, feijão, maçã, chia): controlam colesterol e glicose, dão saciedade.<br>• <b>Insolúveis</b> (cascas, folhas, integrais): regulam o intestino.<br>• Saciam muito: pratos ricos em fibra ajudam a comer menos sem fome.<br>• <b>Aumente aos poucos</b> e com água — fibra demais de repente dá gases.<br><br>Fontes fáceis: feijão na marmita, fruta com casca, aveia no café, salada no almoço. 🥗`;
    }

    // macros / como dividir
    if (/(macro|dividir as calorias|montar macros|distribuicao de macro|quanto de cada|proporcao de macro|proporção)/.test(norm) && !/(proteina por refei)/.test(norm)) {
      const sug = suggestKcal(body);
      const kcal = sug || 2000;
      const p = Math.round((kcal*0.30)/4), c = Math.round((kcal*0.40)/4), g = Math.round((kcal*0.30)/9);
      return `<b>Como dividir seus macros:</b> 📊<br><br>• Ponto de partida equilibrado: <b>30% proteína · 40% carboidrato · 30% gordura</b>.<br>• Para ${sug ? `sua meta de ~${kcalFmt(kcal)} kcal` : '~2000 kcal'}: cerca de <b>${p}g proteína · ${c}g carbo · ${g}g gordura</b>/dia.<br>• <b>Fixe a proteína primeiro</b> (1,6-2,2g/kg); ajuste carbo e gordura ao gosto e ao treino.<br>• Mais treino pesado → mais carbo. Low carb → menos carbo, mais gordura.<br>• 1g proteína = 4 kcal · 1g carbo = 4 kcal · 1g gordura = 9 kcal.<br><br>Não precisa pesar tudo pra sempre — entenda as proporções e estime no olho. 🍽️`;
    }

    // frutas
    if (/(fruta|frutas)/.test(norm) && !/(suco|caixinha)/.test(norm)) {
      return `<b>Frutas — naturais e nutritivas:</b> 🍎<br><br>• Têm açúcar, sim, mas vêm com <b>fibra, água, vitaminas e antioxidantes</b> — o pacote completo. Não engordam no contexto de uma dieta equilibrada.<br>• <b>Coma a fruta inteira</b> em vez de suco (suco perde a fibra e concentra açúcar).<br>• <b>Mais fibra/menos açúcar</b>: maçã, pera, frutas vermelhas, abacate, kiwi.<br>• Banana e manga são ótimas <b>pré-treino</b> (energia rápida).<br>• Mire <b>2-3 porções/dia</b>, variando as cores.<br><br>Casca, quando comestível (maçã, pera, uva), tem fibra e nutrientes — lave bem e coma. 🍓`;
    }

    // ───────── NOVOS INTENTS — RODADA 2 ─────────

    // creatina (como tomar)
    if (/(creatina|monohidrat|monoidrat|creapure)/.test(norm)) {
      return `<b>Creatina — o suplemento mais estudado que existe:</b> 💪<br><br>• <b>Dose</b>: 3-5g por dia, todo dia (inclusive nos dias sem treino). Saturação leva ~3-4 semanas.<br>• <b>Saturação rápida</b> (opcional): 20g/dia divididos em 4 doses por 5-7 dias, depois 5g/dia de manutenção.<br>• <b>Horário não importa</b> — o efeito é por acúmulo no músculo, não agudo. Tome quando lembrar.<br>• <b>Tipo</b>: monohidratada é a melhor (custo-benefício e evidência). Não precisa "Creapure" caro nem versões fancy.<br>• Ganha 1-2kg de água intramuscular no início — é normal e desejável (volume e força).<br><br>Segura para rins saudáveis. Não é esteroide nem causa queda de cabelo na maioria. 🧪`;
    }

    // whey — tipos (concentrado, isolado, hidrolisado)
    if (/(whey)/.test(norm) && /(tipo|concentrad|isolad|hidrolis|qual whey|diferenca|diferença|melhor whey|comprar whey)/.test(norm)) {
      return `<b>Tipos de whey — qual escolher:</b> 🥛<br><br>• <b>Concentrado (WPC)</b>: 70-80% proteína, tem um pouco de lactose e gordura. Mais barato e ótimo para a maioria. ~24g prot/scoop.<br>• <b>Isolado (WPI)</b>: 90%+ proteína, quase sem lactose/gordura. Bom para intolerantes ou cutting.<br>• <b>Hidrolisado (WPH)</b>: pré-digerido, absorção mais rápida e caro — ganho marginal para a maioria.<br>• <b>Vegano</b>: ervilha + arroz combinados fecham o aminograma (boa opção sem lactose).<br><br>Whey é só comida em pó prática — se você bate sua proteína com frango, ovo e feijão, é opcional. 🍳`;
    }

    // dieta mediterrânea
    if (/(mediterran|mediterrâne|dieta dash)/.test(norm)) {
      return `<b>Dieta mediterrânea — a mais validada do mundo:</b> 🫒<br><br>• Base: <b>azeite de oliva</b>, vegetais, frutas, leguminosas, grãos integrais, castanhas.<br>• <b>Peixe e frutos do mar</b> 2-3x/semana; aves e ovos com moderação; carne vermelha pouca.<br>• Laticínios em quantidade moderada (queijo, iogurte natural).<br>• Açúcar e ultraprocessados são raros; vinho tinto é opcional e moderado.<br>• Associada a <b>menos doenças cardíacas</b>, melhor colesterol e longevidade.<br><br>Versão brasileira: azeite, feijão, arroz integral, peixe, muita verdura e fruta da estação. Sustentável e gostosa. 🐟`;
    }

    // B12 / vegano (detalhe de suplementação)
    if (/(b12|vitamina b12|cobalamina|cianocobalamina)/.test(norm)) {
      return `<b>Vitamina B12 — atenção redobrada para veg*:</b> 💉<br><br>• Encontrada quase só em <b>alimentos de origem animal</b> (carne, peixe, ovo, leite).<br>• <b>Veganos devem suplementar sempre</b> — não há fonte vegetal confiável (espirulina não conta).<br>• Dose comum: ~2500 mcg/semana ou 250 mcg/dia (cianocobalamina). Ajuste com exame.<br>• <b>Deficiência</b> causa anemia, fadiga, formigamento e dano neurológico que pode ser irreversível.<br>• Vegetarianos (ovolacto) costumam ter menos risco, mas vale checar no exame.<br><br>⚠️ Faça dosagem sérica e siga orientação médica. 🩺`;
    }

    // adoçantes — quais usar
    if (/(adoçante|adocante)/.test(norm) && /(qual|melhor|seguro|engorda|faz mal|stevia|sucralose|xilitol|eritritol|aspartame)/.test(norm)) {
      return `<b>Adoçantes — quais valem:</b> 🍯<br><br>• <b>Naturais</b>: <b>Stevia</b> e <b>eritritol</b> são bem tolerados, zero/baixa caloria e não elevam glicemia. Boas escolhas.<br>• <b>Xilitol</b>: ok, mas em excesso solta o intestino (e é tóxico para cães).<br>• <b>Sucralose e aspartame</b>: seguros nas doses usuais segundo as agências; alguns sentem desconforto.<br>• <b>Cuidado</b>: produtos "zero açúcar" podem manter o paladar viciado em doce — o ideal é reduzir o doce no geral.<br><br>Nenhum adoçante é "milagre de emagrecimento"; o ganho é trocar açúcar líquido (refri) por versão zero. 🥤`;
    }

    // chá verde / termogênicos naturais
    if (/(cha verde|chá verde|termogenic|termogênic|cha de hibisco|chá de hibisco|chá emagrece|cha emagrece|gengibre emagrece)/.test(norm)) {
      return `<b>Chás e "termogênicos" naturais:</b> 🍵<br><br>• <b>Chá verde</b>: cafeína + catequinas dão um leve empurrão no metabolismo e foco — efeito real mas <b>pequeno</b>.<br>• <b>Gengibre, canela, pimenta, hibisco</b>: ajudam pouco; servem mais como bebida sem açúcar e saciedade.<br>• Nenhum chá "derrete gordura" — o que emagrece é o <b>déficit calórico</b>.<br>• Útil de verdade: chá no lugar de refri/suco corta calorias líquidas e hidrata.<br>• ⚠️ Chá verde tem cafeína — evite à noite e não exagere se você é sensível.<br><br>Use como hábito de apoio, não como solução. 🌿`;
    }

    // eletrólitos
    if (/(eletrolito|eletrólito|sais minerais|isotonico|isotônico|repor sal|sodio potassio|cãibra|caibra|cambra)/.test(norm)) {
      return `<b>Eletrólitos — quando importam:</b> ⚡<br><br>• Principais: <b>sódio, potássio, magnésio e cálcio</b> — regulam contração muscular, hidratação e nervos.<br>• <b>Treino &lt; 1h</b>: água pura basta. <b>Treino longo/muito suor/calor</b>: reponha sódio e potássio.<br>• <b>Cãibras</b> ligam-se a perda de sódio/magnésio e desidratação — não é só "falta de banana".<br>• Caseiro: 500ml água + pitada de sal + suco de limão + um pouco de mel já é um isotônico decente.<br>• Low carb no início "perde água e sódio" — adicionar sal ajuda na adaptação (evita dor de cabeça/moleza).<br><br>Isotônico de mercado é açúcar caro para a maioria — só justifica em esforço prolongado. 🏃`;
    }

    // ressaca alcoólica
    if (/(ressaca|hangover|bebi demais|de ressaca|dor de cabeca depois de beber|dor de cabeça depois de beber)/.test(norm)) {
      return `<b>Ressaca — o que ajuda de verdade:</b> 🥴<br><br>• A ressaca é <b>desidratação + inflamação + queda de açúcar</b> no sangue, não "toxina mágica".<br>• <b>Hidrate muito</b>: água e eletrólitos (sódio/potássio) — caldo, água de coco, soro caseiro.<br>• <b>Coma carbo + proteína</b>: ovos (cisteína ajuda o fígado), pão, fruta, para repor glicose.<br>• Evite "virar" café forte em jejum — pode piorar o estômago. Hidrate primeiro.<br>• <b>Prevenção</b>: 1 copo de água por dose, comer antes/durante, e dormir o suficiente.<br>• Nada de "beber de novo" (corote/chopp) — só adia o problema.<br><br>O único antídoto real é tempo + água + comida. 💧`;
    }

    // TPM / ciclo menstrual
    if (/(tpm|ciclo menstrual|menstruacao|menstruação|periodo menstrual|período menstrual|colica|cólica|tensao pre menstrual|tensão pré menstrual)/.test(norm)) {
      return `<b>Alimentação na TPM e no ciclo:</b> 🌸<br><br>• <b>Vontade de doce/carbo</b> na fase pré-menstrual é hormonal (queda de serotonina) — prefira <b>chocolate 70%+</b>, fruta e carbo integral em vez de se culpar.<br>• <b>Magnésio</b> (castanhas, cacau, folhas verdes) ajuda em cólica, humor e retenção.<br>• <b>Cálcio e B6</b> aliviam sintomas de TPM.<br>• <b>Ferro</b>: o fluxo menstrual perde ferro — capriche em carne, feijão e folhas + vitamina C.<br>• <b>Menos sódio e cafeína</b> reduzem inchaço e irritabilidade nessa fase.<br>• Retenção e +1-2kg na balança perto da menstruação é água, não gordura — relaxe. 💧<br><br>Movimento leve (caminhada, yoga) alivia cólica e melhora o humor.`;
    }

    // colesterol alto — dieta prática (não colide: foco em alimentos)
    if (/(baixar colesterol|reduzir colesterol|dieta para colesterol|alimentos para colesterol|colesterol alto o que comer)/.test(norm)) {
      return `<b>Comer para baixar o colesterol:</b> 🫀<br><br>• <b>Fibra solúvel</b> (aveia, feijão, maçã, cevada) "varre" colesterol — 1 tigela de aveia/dia ajuda.<br>• <b>Gorduras boas</b>: azeite, abacate, castanhas, peixe (ômega-3) elevam o HDL.<br>• <b>Corte gordura trans</b> (margarina dura, biscoito recheado, frituras industriais) — o maior vilão.<br>• <b>Fitosteróis</b> (vegetais, sementes) competem com a absorção do colesterol.<br>• <b>Menos açúcar e álcool</b> derruba triglicerídeos rápido.<br>• Atividade física e perder gordura abdominal melhoram todo o perfil.<br><br>⚠️ Genética influencia muito — acompanhe com exames e médico. 🩺`;
    }

    // gordura no fígado (esteatose)
    if (/(gordura no figado|gordura no fígado|esteatose|figado gordo|fígado gordo|figado gorduroso|fígado gorduroso)/.test(norm)) {
      return `<b>Gordura no fígado (esteatose hepática):</b> 🫛<br><br>• Causa principal não é "comer gordura" — é <b>excesso de açúcar, frutose líquida e álcool</b> + sobrepeso.<br>• <b>Corte refrigerante e sucos</b> (frutose vira gordura no fígado), doces e ultraprocessados.<br>• <b>Perder 7-10% do peso</b> reverte boa parte da gordura hepática.<br>• <b>Reduza/zere o álcool</b> — é tóxico direto ao fígado.<br>• Mais fibras, café (sem açúcar tem efeito protetor), peixe e exercício ajudam.<br>• Evite "chás detox" milagrosos — o fígado se cura com dieta e perda de peso, não com poções.<br><br>⚠️ É reversível nos estágios iniciais — acompanhe com médico. 🩺`;
    }

    // ácido úrico / gota
    if (/(acido urico|ácido úrico|gota|hiperuricemia|purina|cristais nas articula)/.test(norm)) {
      return `<b>Ácido úrico e gota:</b> 🦶<br><br>• Excesso de <b>purinas</b> vira ácido úrico, que cristaliza nas articulações (dor intensa, geralmente no dedão).<br>• <b>Evite/reduza</b>: carnes vermelhas e vísceras (fígado, rim), frutos do mar, <b>cerveja e destilados</b>, e <b>frutose</b> (refri, suco de caixinha).<br>• <b>Beba muita água</b> (2-3L) — ajuda a eliminar o ácido úrico.<br>• <b>Ajuda</b>: laticínios magros, café, cereja e vitamina C reduzem os níveis.<br>• Perder peso de forma gradual ajuda (jejum/dietas radicais podem disparar crise).<br><br>⚠️ Crises e ácido úrico alto precisam de acompanhamento médico — às vezes medicação. 🩺`;
    }

    // alimentos anti-inflamatórios
    if (/(anti.?inflamator|antiinflamator|inflamacao|inflamação|alimentos que inflamam|inflamado)/.test(norm)) {
      return `<b>Alimentação anti-inflamatória:</b> 🔥<br><br>• <b>Pró-inflamatórios</b>: açúcar, ultraprocessados, gordura trans, excesso de álcool e óleos refinados em excesso.<br>• <b>Anti-inflamatórios</b>: peixes gordurosos (ômega-3), azeite, frutas vermelhas, vegetais coloridos, cúrcuma + pimenta, gengibre, chá verde, castanhas.<br>• <b>Fibras e fermentados</b> (microbiota saudável) reduzem inflamação sistêmica.<br>• Manter <b>peso saudável e dormir bem</b> baixam marcadores inflamatórios mais que qualquer "superalimento".<br><br>Não existe alimento único milagroso — é o padrão geral (estilo mediterrâneo) que conta. 🥗`;
    }

    // insônia / comer à noite e sono
    if (/(insonia|insônia|nao consigo dormir|não consigo dormir|alimento para dormir|o que comer para dormir|comida que ajuda a dormir|triptofano|triptofano)/.test(norm)) {
      return `<b>Comer para dormir melhor:</b> 🌙<br><br>• <b>Triptofano</b> (precursor da melatonina/serotonina): leite, ovo, banana, aveia, castanhas, peru.<br>• <b>Carbo leve + proteína</b> à noite ajuda o triptofano a chegar ao cérebro. Ex.: iogurte com banana e aveia.<br>• <b>Evite à noite</b>: cafeína (corte após 14-16h), álcool (fragmenta o sono), refeição muito pesada/gordurosa e líquido em excesso.<br>• <b>Magnésio</b> (folhas, sementes, cacau) relaxa músculos e nervos.<br>• Fome ou açúcar no sangue baixo também atrapalham — um lanche leve ajuda quem deita com fome.<br><br>Rotina, quarto escuro e menos tela contam tanto quanto a comida. 😴`;
    }

    // gestante / gravidez
    if (/(gestante|gravida|grávida|gravidez|gestacao|gestação|amamenta|lactante)/.test(norm)) {
      return `<b>Nutrição na gravidez e amamentação:</b> 🤰<br><br>• <b>Ácido fólico</b> (folato): essencial antes e no início da gestação — folhas verdes, leguminosas + suplemento prescrito.<br>• <b>Ferro e cálcio</b> aumentam muito; <b>ômega-3 (DHA)</b> ajuda o cérebro do bebê (peixe de baixo mercúrio).<br>• Não é "comer por dois" — só ~300-500 kcal extras a partir do 2º trimestre.<br>• <b>Evite</b>: álcool (zero), peixes de alto mercúrio, carne/ovo crus, queijos não pasteurizados, excesso de cafeína (&lt;200mg/dia).<br>• Hidrate bem e capriche em fibras (prisão de ventre é comum).<br><br>⚠️ Acompanhamento com obstetra e nutricionista é indispensável — isto é orientação geral. 🩺`;
    }

    // idoso / terceira idade
    if (/(idoso|terceira idade|idade avançada|idade avancada|sarcopenia|perda de massa com a idade|massa muscular idoso)/.test(norm)) {
      return `<b>Nutrição na terceira idade:</b> 👴<br><br>• <b>Proteína mais alta</b> (1,2-1,6g/kg) para combater a <b>sarcopenia</b> (perda de músculo) — distribua em todas as refeições.<br>• <b>Treino de força</b> é inegociável: preserva músculo, ossos e independência.<br>• <b>Cálcio + vitamina D</b> para os ossos (e prevenir quedas/fraturas).<br>• <b>B12</b>: absorção cai com a idade — vale checar e suplementar se baixa.<br>• <b>Hidratação</b>: a sede diminui — lembre de beber água ao longo do dia.<br>• Comida macia e saborosa + fibras ajudam apetite e intestino.<br><br>⚠️ Ajuste com médico/nutricionista, especialmente com medicações. 🩺`;
    }

    // alimentação infantil
    if (/(crianca|criança|infantil|meu filho|minha filha|bebe come|bebê come|alimentacao do bebe|alimentação do bebê|introducao alimentar|introdução alimentar)/.test(norm)) {
      return `<b>Alimentação infantil — princípios:</b> 🧒<br><br>• <b>Comida de verdade</b> desde cedo: a criança aprende o paladar que é oferecido em casa.<br>• <b>Evite ao máximo</b> açúcar, refrigerante e ultraprocessados nos primeiros anos (a OMS recomenda <b>zero açúcar antes dos 2 anos</b>).<br>• Ofereça variedade e cores; criança pode recusar um alimento 8-10 vezes antes de aceitar — insista sem forçar.<br>• Não use doce como recompensa nem comida como castigo.<br>• <b>Pais são espelho</b>: criança come o que vê os adultos comerem.<br><br>⚠️ Introdução alimentar (a partir dos ~6 meses) e dietas restritivas exigem pediatra/nutricionista. 🩺`;
    }

    // efeito sanfona
    if (/(efeito sanfona|engordei de novo|recuperei o peso|voltei a engordar|recuperar peso perdido|emagreci e engordei)/.test(norm)) {
      return `<b>Efeito sanfona — por que acontece:</b> 🪗<br><br>• Vem de <b>dietas radicais e temporárias</b>: você corta tudo, perde rápido (inclusive músculo), e ao voltar ao normal recupera com juros.<br>• Menos músculo = metabolismo mais baixo = engorda mais fácil depois.<br>• <b>Como quebrar o ciclo</b>: déficit moderado (não radical), <b>muita proteína</b> e <b>treino de força</b> para preservar músculo.<br>• <b>Mude hábitos, não faça "dieta"</b> com data para acabar — o que você sustenta para sempre é o que mantém o peso.<br>• Inclua flexibilidade (80/20) para não viver em restrição e estourar depois.<br><br>Perda lenta e sustentável bate perda rápida que volta. 🐢`;
    }

    // recomposição corporal
    if (/(recomposi|ganhar musculo e perder gordura|perder gordura e ganhar musculo|trocar gordura por musculo|magro mas com barriga|skinny fat)/.test(norm)) {
      return `<b>Recomposição corporal (ganhar músculo + perder gordura):</b> ⚖️<br><br>• É possível, principalmente para <b>iniciantes</b>, quem voltou a treinar ou está acima do peso.<br>• Fique perto da <b>manutenção calórica</b> (déficit bem leve ou zero) com <b>proteína alta</b> (1,8-2,2g/kg).<br>• <b>Treino de força progressivo</b> é o motor — sem estímulo, não há músculo novo.<br>• Processo é <b>lento</b>: a balança quase não muda, mas o espelho e a roupa sim. Use fotos e medidas, não só o peso.<br>• Avançados costumam render mais alternando fases de bulking e cutting.<br><br>Paciência: recomposição premia constância de meses, não semanas. 📸`;
    }

    // cutting (definição)
    if (/(cutting|definicao|definição|secar para verao|secar para o verao|secar pro verão|fase de corte|ficar definido)/.test(norm)) {
      const sug = suggestKcal({ ...body, objective: 'lose' });
      return `<b>Cutting (fase de definição):</b> 🔪<br><br>• <b>Déficit moderado</b> (~300-500 kcal abaixo do gasto)${sug ? ` — meta ~<b>${kcalFmt(sug)} kcal/dia</b> pra você` : ''}; nada de cortes radicais.<br>• <b>Proteína bem alta</b> (2,0-2,4g/kg) para preservar músculo enquanto perde gordura.<br>• <b>Mantenha o treino pesado</b> — é o sinal de "não queime meu músculo". Cardio entra para ampliar o déficit.<br>• Carbo perto do treino para manter força; gordura suficiente para hormônios.<br>• Esperado: 0,5-1% do peso por semana. Mais rápido = perde músculo e água.<br><br>Cutting sem treino de força vira só "emagrecer" — e você fica magro e flácido. 💪`;
    }

    // vinagre de maçã / mitos detox
    if (/(vinagre de maca|vinagre de maçã|detox|suco verde|chá detox|cha detox|limpar o organismo|desintoxicar|suco detox)/.test(norm)) {
      return `<b>"Detox" e vinagre de maçã — separando fato de mito:</b> 🧪<br><br>• Seu corpo <b>já se desintoxica</b> sozinho — fígado e rins fazem isso 24h. Nenhum suco "limpa" o que eles não limpem.<br>• <b>Suco verde</b> é saudável como bebida nutritiva, mas não "derrete gordura" nem desintoxica nada.<br>• <b>Vinagre de maçã</b>: pode reduzir levemente o pico de glicose após refeições; efeito modesto. Não emagrece sozinho e em excesso irrita o esôfago/esmalte.<br>• <b>"Chás detox" comerciais</b>: muitos são só diuréticos/laxantes — você perde água, não gordura.<br><br>O verdadeiro "detox" é comer comida de verdade, beber água e dormir. Sem milagre. 🚱`;
    }

    // proteína vegetal / combinar fontes
    if (/(proteina vegetal|proteína vegetal|combinar proteina|proteina de planta|aminoacido vegetal|tofu proteina|grao de bico proteina)/.test(norm)) {
      return `<b>Proteína vegetal — como acertar:</b> 🌱<br><br>• A maioria das fontes vegetais é "incompleta" (falta algum aminoácido), então <b>combine</b> ao longo do dia.<br>• Clássico brasileiro: <b>arroz + feijão</b> juntos formam proteína completa. 🍚<br>• Boas fontes: <b>soja/tofu (completa)</b>, grão-de-bico, lentilha, ervilha, quinoa, edamame, sementes.<br>• Veganos precisam de <b>mais volume</b> de comida para bater a proteína (alvo 1,6-2,2g/kg).<br>• Mix de proteína em pó vegana (ervilha + arroz) ajuda a fechar a conta.<br>• Não esqueça <b>B12</b> (suplementar) — não vem das plantas.<br><br>Dá para ganhar músculo vegano, mas exige planejamento. 💪`;
    }

    // óleo de coco / qual gordura cozinhar
    if (/(oleo de coco|óleo de coco|qual oleo|qual óleo|gordura para cozinhar|fritar com|banha|manteiga ou margarina|qual gordura usar)/.test(norm)) {
      return `<b>Qual gordura usar para cozinhar:</b> 🫗<br><br>• <b>Cozinhar/refogar</b>: azeite de oliva é ótimo (aguenta o fogo doméstico melhor do que diziam). 🫒<br>• <b>Frituras de alta temperatura</b>: óleos estáveis como o de abacate; evite reusar óleo velho (forma compostos ruins).<br>• <b>Manteiga</b> com moderação é melhor que <b>margarina</b> com gordura trans/hidrogenada.<br>• <b>Óleo de coco</b>: virou moda mas é rico em gordura saturada — sem superpoderes; use com parcimônia pelo sabor.<br>• Evite excesso de óleos refinados (soja/milho) muito processados.<br><br>Mais importante que o tipo é a <b>quantidade</b> — 1 colher de óleo já são ~120 kcal. 🥄`;
    }

    // churrasco / fim de semana saudável
    if (/(churrasco|churras|comer no churrasco|feijoada|pizza saudavel|pizza saudável|happy hour|sair com amigos)/.test(norm)) {
      return `<b>Churrasco, feijoada e festa sem culpa:</b> 🍖<br><br>• <b>Vá com fome controlada</b>, não em jejum total (chega faminto e exagera). Coma uma fruta/proteína antes.<br>• <b>Carne magra à vontade</b> (alcatra, fraldinha, frango) é proteína — o problema é pão de alho, farofa, maionese e cerveja.<br>• <b>Encha metade do prato de salada/vinagrete</b> e vá com calma nos acompanhamentos.<br>• <b>Álcool</b> é o que mais soma calorias escondidas — alterne com água.<br>• Um dia "fora" não engorda; o que engorda é o fim de semana inteiro virar exceção.<br><br>80% da semana no controle = liberdade para curtir os 20%. 🍻`;
    }

    // panturrilha de café / café preto benefícios
    if (/(beneficio do cafe|benefício do café|cafe faz mal|café faz mal|cafe preto|café preto|quanto cafe por dia|quanto café por dia)/.test(norm) && !/(treino|pre.?treino)/.test(norm)) {
      return `<b>Café — vilão ou aliado?</b> ☕<br><br>• Para a maioria, <b>café é saudável</b>: rico em antioxidantes, associado a menor risco de diabetes, doença hepática e Parkinson.<br>• <b>Limite seguro</b>: até ~400 mg de cafeína/dia (3-4 xícaras de coado). Gestantes: &lt;200 mg.<br>• O problema costuma ser o que se <b>adiciona</b>: açúcar, creme, calda — vira sobremesa líquida.<br>• <b>Corte após 14-16h</b> para não prejudicar o sono (meia-vida ~5-6h).<br>• Pode ser leve diurético e estimular o intestino — normal.<br><br>Café puro, sem açúcar, é uma das bebidas mais saudáveis que existem. Sem exageros. 🌿`;
    }

    // ───────── NOVOS INTENTS — ONDA 1 ─────────

    // potássio
    if (/\bpotassio\b|\bpotássio\b|agua de coco mineral|banana potassio/.test(norm)) {
      return `<b>Potássio — o mineral que equilibra o sódio:</b> 🍌<br><br>• Mire <b>~3500-4700 mg/dia</b> — a maioria dos brasileiros fica abaixo.<br>• <b>Função</b>: controla pressão arterial, contração muscular e batimento cardíaco; combate a retenção causada pelo sódio.<br>• <b>Fontes</b>: banana (~420mg/un), feijão (~600mg/concha), batata, abacate, água de coco (~600mg/copo), folhas verdes.<br>• Quanto mais ultraprocessado (sódio) você come, mais potássio precisa para equilibrar.<br>• Cãibras frequentes podem ligar-se a potássio + magnésio + hidratação baixos.<br><br>⚠️ Quem tem doença renal deve controlar potássio com médico. 🩺`;
    }

    // selênio / castanha-do-pará
    if (/\bselenio\b|\bselênio\b|castanha do para|castanha do pará|castanha-do-para/.test(norm)) {
      return `<b>Selênio — pouco e poderoso:</b> 🌰<br><br>• Antioxidante essencial para <b>tireoide, imunidade e fertilidade</b>.<br>• A <b>castanha-do-pará</b> é a maior fonte: <b>1-2 unidades/dia</b> já cobrem a necessidade (~55 mcg/dia).<br>• ⚠️ <b>Não exagere</b>: mais de 4-5 castanhas/dia pode dar excesso (náusea, queda de cabelo, unhas frágeis). Mais não é melhor.<br>• Outras fontes: peixes, ovos, frango, sementes.<br>• Importante para converter o hormônio T4 em T3 (tireoide ativa).<br><br>Regra simples: 1 castanha-do-pará por dia e está resolvido. 🥜`;
    }

    // iodo / tireoide alimentação
    if (/\biodo\b|tireoide|tireóide|hipotireoid|sal iodado|metabolismo tireoide/.test(norm)) {
      return `<b>Iodo e saúde da tireoide:</b> 🦋<br><br>• A tireoide comanda o <b>metabolismo</b> — precisa de iodo, selênio e zinco para funcionar.<br>• <b>Iodo</b>: vem do <b>sal iodado</b> (obrigatório no Brasil), peixes, frutos do mar e ovos. Necessidade ~150 mcg/dia.<br>• <b>Selênio</b> (1 castanha-do-pará) e <b>zinco</b> ajudam a converter T4 em T3.<br>• Hipotireoidismo desacelera o metabolismo (cansaço, ganho de peso, frio) — mas é minoria dos casos de "metabolismo lento".<br>• Excesso de iodo também atrapalha — nem falta nem demais.<br><br>⚠️ Suspeita de tireoide? Peça TSH e T4 livre ao médico — não se autodiagnostique. 🩺`;
    }

    // congelar / conservar comida (meal prep avançado)
    if (/congelar|descongelar|conservar (a )?comida|validade da marmita|guardar comida|sobra de comida|freezer/.test(norm)) {
      return `<b>Congelar e conservar comida com segurança:</b> ❄️<br><br>• <b>Marmita na geladeira</b>: consuma em até <b>3-4 dias</b>. No <b>freezer</b>: 2-3 meses.<br>• <b>Resfrie rápido</b> antes de guardar — comida quente no fechado prolifera bactéria.<br>• <b>Congele em porções</b> já divididas (potes de vidro ou sacos); rotule com a data.<br>• <b>Descongele na geladeira</b> ou no micro, nunca em temperatura ambiente por horas.<br>• <b>Não recongele</b> o que já foi descongelado cru.<br>• Arroz cozido estraga rápido — esfrie e refrigere em até 1h.<br><br>Cozinhar 1x e congelar economiza tempo e dinheiro (R$ e blinda a dieta). 🍱`;
    }

    // orçamento / comer bem barato
    if (/comer bem barato|dieta barata|comida barata|economizar (na |com )?comida|proteina barata|proteína barata|sem dinheiro|orcamento|orçamento|gastar pouco/.test(norm)) {
      return `<b>Comer bem gastando pouco (R$):</b> 💰<br><br>• <b>Proteína barata</b>: ovo (~R$0,80/un, 6g prot), frango (~R$15/kg), sardinha em lata (~R$5), feijão.<br>• <b>Arroz + feijão</b>: proteína completa por poucos reais a porção — base imbatível.<br>• <b>Compre da estação e a granel</b> (feira no fim do dia tem desconto); congele o que sobrar.<br>• Whey é opcional — bater proteína com ovo e frango sai mais barato que scoop.<br>• <b>Evite ultraprocessado</b>: salgadinho e refri são caros e vazios; comida de verdade rende mais.<br>• Fruta da estação e legumes congelados cabem no bolso.<br><br>Marmita caseira custa ~1/3 do delivery. Cozinhar é o maior atalho financeiro. 🍳`;
    }

    // colágeno
    if (/colageno|colágeno|pele firme suplemento|articulacao suplemento|articulação suplemento|colageno hidrolisado/.test(norm)) {
      return `<b>Colágeno — vale o investimento?</b> 🧴<br><br>• É uma proteína estrutural da pele, tendões e articulações — a produção cai ~1%/ano após os 25-30.<br>• <b>Evidência moderada</b>: 10g/dia de colágeno hidrolisado por 8-12 semanas pode melhorar elasticidade da pele e dor articular.<br>• <b>Potencialize com vitamina C</b> — necessária para sintetizar colágeno.<br>• <b>Não é proteína "completa"</b> para músculo (aminograma pobre) — não substitui whey/carne na meta proteica.<br>• Caldo de osso e gelatina são fontes naturais mais baratas.<br><br>Útil para pele/articulação, secundário para shape. Dieta proteica + treino + sol contam mais. ☀️`;
    }

    // ômega-3 suplemento / qual comprar
    if (/(omega.?3|ômega.?3)/.test(norm) && /(suplement|capsula|cápsula|qual comprar|epa|dha|oleo de peixe|óleo de peixe|quanto tomar)/.test(norm)) {
      return `<b>Suplemento de ômega-3 (óleo de peixe):</b> 🐟<br><br>• O que importa é a soma de <b>EPA + DHA</b> na cápsula — leia o rótulo, não os "1000mg de óleo".<br>• <b>Dose comum</b>: 1-2g de EPA+DHA/dia (mais para triglicerídeos altos, com médico).<br>• Vale a pena se você <b>não come peixe gordo 2x/semana</b>.<br>• <b>Qualidade</b>: prefira marcas com selo de pureza (baixo mercúrio); guarde na geladeira (oxida).<br>• <b>Veganos</b>: óleo de algas fornece DHA/EPA direto (chia/linhaça só dão ALA, conversão baixa).<br>• Anti-inflamatório, bom para coração, cérebro e olhos.<br><br>Sardinha 2x/semana resolve barato; cápsula é o plano B. 🥫`;
    }

    // probióticos / fermentados
    if (/probiotic|probiótic|kefir|kombucha|fermentado|iogurte natural beneficio|lactobacilo|saude intestinal suplemento/.test(norm)) {
      return `<b>Probióticos e fermentados:</b> 🦠<br><br>• Alimentam a <b>microbiota</b> (bactérias boas do intestino) — ligada a imunidade, humor e digestão.<br>• <b>Fontes naturais</b>: iogurte natural, kefir, kombucha, chucrute, kimchi, missô.<br>• <b>Prebióticos</b> (a "comida" dos probióticos): cebola, alho, banana verde, aveia, leguminosas — tão importantes quanto.<br>• Cápsulas de probiótico ajudam em casos específicos (pós-antibiótico, diarreia), mas comida fermentada + fibra é a base.<br>• Resultado vem com <b>constância</b> (semanas), não em 1 dose.<br><br>Intestino saudável melhora absorção de nutrientes e até reduz inchaço. 🌱`;
    }

    // antioxidantes / radicais livres
    if (/antioxidante|radicais livres|envelhecimento alimentacao|envelhecimento alimentação|alimentos coloridos|polifenois|polifenóis/.test(norm)) {
      return `<b>Antioxidantes — defesa contra o envelhecimento:</b> 🫐<br><br>• Combatem os <b>radicais livres</b> (estresse oxidativo) gerados por poluição, sol, estresse e ultraprocessados.<br>• <b>Coma o arco-íris</b>: cada cor é um antioxidante diferente — frutas vermelhas (antocianinas), cenoura (betacaroteno), tomate (licopeno), folhas verdes, cacau 70%+, chá verde.<br>• <b>Vitaminas C e E</b> e o mineral <b>selênio</b> são antioxidantes-chave.<br>• Comida real bate qualquer cápsula isolada — megadoses de antioxidante sintético podem até fazer mal.<br>• Dormir bem e não fumar reduzem o estresse oxidativo mais que "superalimentos".<br><br>5 cores no prato por dia é a meta simples e poderosa. 🌈`;
    }

    // enxaqueca / dor de cabeça e comida
    if (/enxaqueca|dor de cabeca (frequente|recorrente|alimento)|dor de cabeça (frequente|recorrente|alimento)|cefaleia|cefaléia|gatilho de enxaqueca|comida que da dor de cabeca/.test(norm)) {
      return `<b>Enxaqueca e alimentação:</b> 🤕<br><br>• <b>Gatilhos comuns</b>: jejum prolongado (queda de glicose), desidratação, álcool (vinho tinto), queijos curados, embutidos (nitritos), excesso de cafeína — e a <b>abstinência</b> de cafeína também.<br>• <b>Glutamato monossódico</b> e adoçantes em excesso incomodam algumas pessoas.<br>• <b>Previna</b>: refeições regulares (não pule), hidratação, sono constante.<br>• <b>Magnésio</b> e <b>vitamina B2 (riboflavina)</b> têm evidência para reduzir frequência de crises.<br>• Anote o que comeu antes das crises por 2-3 semanas — revela seu gatilho pessoal.<br><br>⚠️ Enxaqueca frequente merece avaliação médica/neurológica. 🩺`;
    }

    // pele / acne e dieta
    if (/\bacne\b|espinha|pele oleosa|dieta para pele|alimento para pele|pele e alimentacao|pele e alimentação|cravos/.test(norm)) {
      return `<b>Pele, acne e alimentação:</b> ✨<br><br>• <b>Pioram a acne</b>: alto índice glicêmico (açúcar, pão branco, doces) e, para alguns, <b>leite</b> (especialmente desnatado) — testam-se cortes individuais.<br>• <b>Ajudam a pele</b>: ômega-3 (peixe), zinco (sementes, carne), vitaminas A e C (vegetais coloridos), água.<br>• <b>Ultraprocessado e açúcar</b> elevam insulina e inflamação, que disparam oleosidade.<br>• Microbiota saudável (fibras, fermentados) reflete na pele.<br>• Comida não é o único fator — genética, hormônios e skincare contam muito.<br><br>⚠️ Acne persistente é caso de dermatologista; dieta é coadjuvante. 🩺`;
    }

    // cabelo e unhas / queda
    if (/queda de cabelo|cabelo caindo|cabelo fraco|unha fraca|unhas fracas|biotina|cabelo e alimentacao|cabelo e alimentação|fortalecer cabelo/.test(norm)) {
      return `<b>Cabelo e unhas — o que comer:</b> 💇<br><br>• Cabelo e unha são <b>proteína (queratina)</b> — dieta proteica baixa enfraquece os dois.<br>• <b>Nutrientes-chave</b>: ferro (queda ligada à anemia), zinco, biotina (B7), vitamina D, ômega-3 e proteína suficiente.<br>• <b>Queda</b> costuma vir de deficiência de ferro/vitamina D, dietas muito restritivas, estresse e pós-parto.<br>• Biotina só ajuda quem tem deficiência real — megadose não faz crescer mais em quem já tem o suficiente.<br>• Crescimento é lento: melhoras aparecem em <b>3-6 meses</b>.<br><br>⚠️ Queda acentuada? Investigue ferritina, vitamina D e tireoide com médico. 🩺`;
    }

    // libido / testosterona natural
    if (/libido|testosterona|hormonio masculino|hormônio masculino|disposicao sexual|disposição sexual|aumentar testosterona|baixa testosterona/.test(norm)) {
      return `<b>Testosterona e libido — o que a dieta faz:</b> 🔋<br><br>• <b>Gordura suficiente</b> (20-35% das calorias) é essencial — dietas zero gordura derrubam hormônios.<br>• <b>Zinco e vitamina D</b> são críticos para a produção de testosterona; magnésio ajuda.<br>• <b>Evite</b>: déficit calórico extremo e excesso de álcool — ambos baixam testosterona.<br>• <b>Sono é hormônio</b>: dormir <5h derruba a testosterona como envelhecer anos.<br>• <b>Treino de força</b> e manter gordura corporal saudável otimizam naturalmente.<br>• Cuidado com "boosters" milagrosos — quase nenhum tem evidência forte.<br><br>⚠️ Sintomas reais (cansaço, libido baixa) pedem exame e médico — não suplemente no chute. 🩺`;
    }

    // olhos / visão
    if (/\bvisao\b|\bvisão\b|saude dos olhos|saúde dos olhos|alimento para os olhos|luteina|luteína|vitamina a olhos|cansaco visual/.test(norm)) {
      return `<b>Alimentação para a visão:</b> 👁️<br><br>• <b>Vitamina A / betacaroteno</b>: cenoura, batata-doce, abóbora, manga — essenciais para a retina.<br>• <b>Luteína e zeaxantina</b>: folhas verde-escuras (couve, espinafre), gema de ovo, milho — protegem a mácula da luz azul.<br>• <b>Ômega-3</b> (peixe): combate olho seco e protege a retina.<br>• <b>Vitamina C, E e zinco</b>: reduzem risco de degeneração macular com a idade.<br>• Hidratação e pausas das telas (regra 20-20-20) aliviam o cansaço visual.<br><br>Prato colorido + peixe + folhas verdes cobre quase tudo que o olho precisa. 🥕`;
    }

    // gases / flatulência
    if (/\bgases\b|flatulencia|flatulência|pum|barriga estufada gases|gases no feijao|gases no feijão|barriga roncando/.test(norm)) {
      return `<b>Gases e flatulência — como reduzir:</b> 💨<br><br>• <b>Causas comuns</b>: leguminosas (feijão, grão-de-bico), repolho/brócolis, refrigerante, adoçantes (xilitol/sorbitol), comer rápido (engolir ar).<br>• <b>Feijão</b>: deixe de molho 8-12h e troque a água antes de cozinhar — reduz muito os gases.<br>• <b>Coma devagar</b> e mastigue bem; evite mascar chiclete e beber com canudo (engole ar).<br>• Aumente fibras <b>aos poucos</b> — salto brusco fermenta e estufa.<br>• Intolerância à lactose e excesso de adoçante são gatilhos frequentes.<br><br>⚠️ Gases com dor forte, perda de peso ou alteração do hábito intestinal merecem médico. 🩺`;
    }

    // saciedade / sensação de fome
    if (/saciedade|fome o tempo todo|sempre com fome|nao sinto saciedade|não sinto saciedade|controlar a fome|matar a fome|alimento que sacia/.test(norm) && !/emocional|compuls|doce/.test(norm)) {
      return `<b>Domando a fome — comer mais e comer menos:</b> 🍽️<br><br>• <b>Proteína</b> é o macro mais saciante — comece a refeição por ela.<br>• <b>Fibra + água</b> (volume): saladas, legumes, frutas com casca, sopas enchem o estômago com poucas calorias.<br>• <b>Alimentos "voláteis"</b> (líquidos açucarados, biscoito) somam calorias sem saciar — cortam o efeito chega.<br>• <b>Durma bem</b>: noite ruim eleva grelina (fome) e baixa leptina (saciedade).<br>• Coma devagar — a saciedade leva ~20 min para registrar.<br>• Às vezes é <b>sede</b>: beba água e espere 10 min.<br><br>Prato com proteína + muito vegetal + fibra = fome controlada o dia todo. 💧`;
    }

    // jantar leve / o que comer na janta
    if (/o que (comer|jantar) (no jantar|a noite|na janta)|jantar saudavel|jantar saudável|jantar leve|montar (o )?jantar|ideia de jantar/.test(norm)) {
      return `<b>Jantar saudável e prático:</b> 🍽️<br><br>• Estrutura: <b>proteína + vegetais</b> sempre; carbo conforme seu gasto/treino do dia.<br>• <b>Leve e nutritivo</b>: omelete com legumes, peixe grelhado com salada, frango desfiado com abobrinha, sopa de legumes com proteína.<br>• Treinou à noite? Inclua carbo (arroz, batata) para repor glicogênio.<br>• Evite refeição muito pesada/gordurosa perto de dormir (atrapalha o sono).<br>• <b>Ex. ~450 kcal | 35g prot</b>: 150g de frango + legumes salteados + 2 col de arroz integral.<br><br>Jantar não precisa ser "sem carbo" — precisa caber nas suas calorias do dia. 🌙`;
    }

    // água com gás / refrigerante zero / bebidas
    if (/agua com gas|água com gás|refrigerante zero|refri zero|bebida zero|agua saborizada|água saborizada|o que beber no lugar/.test(norm)) {
      return `<b>O que beber além de água:</b> 🥤<br><br>• <b>Água com gás</b> (pura ou com limão/hortelã): zero caloria, mata a vontade de refri. Ótima troca.<br>• <b>Refrigerante zero</b>: sem açúcar/calorias; melhor que o normal, mas mantém o paladar viciado em doce — use como ponte, não hábito eterno.<br>• <b>Chá gelado sem açúcar, café, água saborizada caseira</b> (água + frutas/ervas): hidratam sem somar calorias.<br>• <b>Cuidado</b>: "águas" e chás de garrafa prontos costumam ter açúcar escondido — leia o rótulo.<br>• Suco natural conta como calorias líquidas — prefira a fruta inteira.<br><br>Meta: hidratar com bebidas de ~zero caloria e reservar as calóricas para a comida. 💧`;
    }

    // ───────── saudação ─────────
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|eai|opa|hey|tudo bem|ola nutri)/.test(norm)) {
      return `Olá! 👋 Sou o <b>NutriBot</b>, sua IA de nutrição e performance. Posso:<br><br>• Calcular suas calorias, macros e IMC com seus dados<br>• Dizer as calorias de cada alimento<br>• Orientar emagrecimento, ganho de massa, pré/pós-treino<br>• Falar de suplementos (creatina, whey, cafeína), jejum, colesterol, glicemia, sono e mais<br>• Usar sua <b>recuperação da Whoop</b> para sugerir treino e dieta do dia 🟢<br><br>Pergunte à vontade ou toque numa sugestão. 🥗`;
    }
    if (/(obrigad|valeu|thanks|show|top|legal|ajudou)/.test(norm)) {
      return `Por nada! 💪 Constância vence intensidade — comida de verdade, proteína, água e sono todo dia constroem o resultado. Conte comigo!`;
    }

    // ───────── fallback inteligente (sugere o tópico mais próximo) ─────────
    {
      const topics = [
        { k:['caloria','kcal','gasto','tmb','energia'], s:'"quantas calorias eu preciso por dia?"' },
        { k:['proteina','macro','whey'],               s:'"quanto de proteína por dia?"' },
        { k:['emagrec','perder','gordura','secar'],     s:'"como emagrecer com saúde?"' },
        { k:['massa','hipertrofia','musculo','músculo'],s:'"como ganhar massa muscular?"' },
        { k:['treino','treinar','exercicio','exercício'],s:'"posso treinar hoje?" (uso sua Whoop)' },
        { k:['suplement','creatina','cafe','café'],     s:'"creatina vale a pena?"' },
        { k:['sono','dormir','recupera'],               s:'"como o sono afeta meu shape?"' },
        { k:['agua','hidrat'],                          s:'"quanta água devo beber?"' },
        { k:['acucar','açúcar','doce','glicemia'],      s:'"como cortar o açúcar?"' },
        { k:['receita','comer','cardapio','cardápio'],  s:'"o que comer no café da manhã?"' },
      ];
      let best = null, bestScore = 0;
      for (const tp of topics) {
        const sc = tp.k.reduce((a,kw)=> a + (norm.includes(kw)?1:0), 0);
        if (sc > bestScore) { bestScore = sc; best = tp; }
      }
      const hint = best && bestScore>0
        ? `Acho que você quis perguntar algo como ${best.s} — manda assim que eu respondo certinho. 😊`
        : `Tente algo como <i>"quantas calorias tem 1 ovo?"</i>, <i>"quanto de proteína eu preciso?"</i> ou <i>"posso treinar hoje?"</i>.`;
      return `Sou especialista em <b>nutrição, treino e performance</b>. ${hint}<br><br>Domino: calorias e alimentos, emagrecimento, ganho de massa, pré/pós-treino, suplementos, jejum, colesterol, glicemia, intestino, imunidade, sono e integração com sua Whoop. 🥗`;
    }
  }

  function matchFood(norm) {
    // procura alimentos citados na frase (h\u00edfens viram espa\u00e7o p/ casar "batata doce")
    const nrm = norm.replace(/-/g, ' ');
    const found = [];
    for (const key in FOODS) {
      const base = key.replace(/\s*\(.*?\)/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/-/g, ' ');
      const word = base.split(' ')[0];
      if (nrm.includes(base) || (word.length > 3 && nrm.includes(word))) found.push(key);
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
    { name: 'Corrida', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/><path d="m7 21 2-6 3 2 2-5 3 3"/></svg>', kcalMin: 10 },
    { name: 'Musculação', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v4m0 0H4a2 2 0 0 0 0 4h16a2 2 0 0 0 0-4h-2m-8 0h4"/></svg>', kcalMin: 7 },
    { name: 'Caminhada', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="1"/><path d="m9 20 1-5 2 2 1-5"/><path d="m6 8 3 1 2-2 3 1"/></svg>', kcalMin: 5 },
    { name: 'Ciclismo', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 5a2 2 0 1 0 4 0m-4 0h4m-4 0-3 7h8l-1-7"/></svg>', kcalMin: 8 },
    { name: 'Natação', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/><path d="m8 8 4-4 4 4"/></svg>', kcalMin: 9 },
    { name: 'Yoga', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="1"/><path d="m4 20 4-8 4 4 4-4 4 8"/><path d="M12 8v4"/></svg>', kcalMin: 4 },
    { name: 'Futebol', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m12 3 1.5 4.5h4.5L15 10l1.5 4.5L12 12l-4.5 2.5L9 10 6 7.5h4.5z"/></svg>', kcalMin: 9 },
    { name: 'Pular corda', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8c0 5 14 5 14 0"/><path d="M5 8 3 6m2 2-2 2"/><path d="M19 8l2-2m-2 2 2 2"/><circle cx="12" cy="16" r="3"/></svg>', kcalMin: 12 },
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
    if (!exs.length) return `<div class="empty-state"><p>Nenhum treino registrado hoje.</p></div>`;
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
    { id: 'nosugar',    title: '30 dias sem açúcar',       days: 30, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>', desc: 'Elimine açúcar refinado por 30 dias e sinta a diferença.' },
    { id: 'exercise',   title: '30 dias de exercício',     days: 30, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5h11"/><rect x="5" y="8" width="3" height="8" rx="1.5"/><rect x="16" y="8" width="3" height="8" rx="1.5"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', desc: 'Pelo menos 30 minutos de atividade física por dia.' },
    { id: 'water2l',    title: 'Beber 2L de água por dia', days: 21, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C6 10 4 13.5 4 16a8 8 0 0 0 16 0c0-2.5-2-6-8-14z"/></svg>', desc: 'Hidrate-se adequadamente por 21 dias seguidos.' },
    { id: 'sleep8',     title: 'Dormir 8h por 7 dias',     days:  7, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', desc: 'Priorize o sono por uma semana inteira.' },
    { id: 'nofastfood', title: 'Semana sem fast food',     days:  7, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>', desc: 'Coma apenas comida caseira por 7 dias.' },
    { id: 'meditat',    title: '30 dias de meditação',     days: 30, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="2"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/><path d="M12 10v4"/><path d="M8 14h8"/></svg>', desc: '10 minutos de meditação por dia durante 30 dias.' },
    { id: 'steps',      title: '10.000 passos por dia',    days: 21, icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="4" r="1.2"/><path d="m9 20 2-5.5 2.5 2L16 10"/><path d="m7 9 3 1 2-2 3 1"/></svg>', desc: 'Caminhe pelo menos 10.000 passos diários por 3 semanas.' },
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
      <div class="page-header"><div><h1>Desafios de Saúde</h1><p class="page-sub">Acompanhe desafios e desenvolva hábitos saudáveis.</p></div></div>
      ${active.length ? `<div class="cf-card" style="margin-bottom:16px;border-color:rgba(16,185,129,.3)">
        <h3 style="font-size:14px;font-weight:700;color:var(--green);margin-bottom:12px">✅ Desafios Ativos</h3>
        ${active.map(c => {
          const ch = CHALLENGES.find(x => x.id === c.id);
          const daysPassed = Math.floor((Date.now() - new Date(c.startDate)) / 86400000);
          const pct = Math.min(100, Math.round(daysPassed / ch.days * 100));
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:600;display:flex;align-items:center;gap:8px"><span style="color:var(--indigo)">${ch.icon}</span>${ch.title}</span>
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
            <div style="width:40px;height:40px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:var(--indigo)">${ch.icon}</div>
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

  function renderHWhoop() {
    const el = document.getElementById('h-whoop');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header"><div><h1>Integração Whoop</h1><p class="page-sub">Conecte seu Whoop para monitorar recovery, HRV e sono.</p></div></div>
      <div class="cf-card" style="margin-bottom:16px;padding:24px;text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:#e11d48;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;font-weight:900;color:#fff">W</div>
        <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">Whoop</h3>
        <p style="font-size:13px;opacity:.6;margin-bottom:16px">Status: <span style="color:#ef4444">Não conectado</span></p>
        <button class="btn-primary" onclick="showToast('Integração Whoop em breve! Aguarde a versão Pro.','info')">Conectar com Whoop</button>
      </div>
      <div style="position:relative">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;filter:blur(3px);pointer-events:none;opacity:.5">
          <div class="cf-card" style="padding:20px;text-align:center"><div style="font-size:24px;font-weight:800;color:#10b981">78%</div><div style="font-size:12px;opacity:.7;margin-top:4px">Recovery Score</div></div>
          <div class="cf-card" style="padding:20px;text-align:center"><div style="font-size:24px;font-weight:800;color:#6366f1">62ms</div><div style="font-size:12px;opacity:.7;margin-top:4px">HRV</div></div>
          <div class="cf-card" style="padding:20px;text-align:center"><div style="font-size:24px;font-weight:800;color:#f59e0b">52bpm</div><div style="font-size:12px;opacity:.7;margin-top:4px">Resting HR</div></div>
          <div class="cf-card" style="padding:20px;text-align:center"><div style="font-size:24px;font-weight:800;color:#3b82f6">7h 23min</div><div style="font-size:12px;opacity:.7;margin-top:4px">Sleep</div></div>
        </div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;opacity:.8">🔒 Conecte o Whoop para ver seus dados reais</div>
      </div>`;
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
    else if (page === 'h-whoop') { if (typeof window.renderWhoop === 'function') window.renderWhoop(); else renderHWhoop(); }
    else if (page === 'h-oura') { if (typeof window.renderOura === 'function') window.renderOura(); }
    else if (page === 'h-strava') { if (typeof window.renderStrava === 'function') window.renderStrava(); }
  };

  // expõe funções usadas no HTML (onclick)
  Object.assign(window, {
    hAddMeal, hQuickAdd, hDelMeal, hWater, hSaveGoals, hUseSuggested, nbSend,
    hAddExercise, hDelExercise, hAddSleep, hDelSleep, hAddWeight, hDelWeight,
    hJoinChallenge, hLeaveChallenge, hCalcRun, hUseSuggested, renderHWhoop,
  });

  // ── restaura último app aberto ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (_store.lastApp && _store.lastApp !== 'finance' && typeof switchApp === 'function') {
      switchApp(_store.lastApp);
    }
  });
})();
