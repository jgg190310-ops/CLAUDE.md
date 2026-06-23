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
    's-soon': 'StudyOS',
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

    const kpis = [
      { ic: '#10b981', label: 'Calorias hoje', value: `${kcalFmt(kcal)}`, sub: `de ${kcalFmt(goalKcal)} kcal` },
      { ic: '#6366f1', label: remaining >= 0 ? 'Ainda pode comer' : 'Acima da meta', value: `${kcalFmt(Math.abs(remaining))}`, sub: 'kcal' },
      { ic: '#06b6d4', label: 'Água', value: `${day.water}`, sub: `de ${goalWater} copos` },
      { ic: '#f59e0b', label: 'Proteína', value: `${kcalFmt(prot)}g`, sub: goalProt ? `de ${goalProt}g` : 'consumida' },
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
      todayBox.innerHTML = day.meals.length
        ? day.meals.map((m, i) => mealRow(m, i)).join('')
        : '<div class="cf-empty" style="padding:24px">Nenhuma refeição hoje. Vá em "Refeições" e registre.</div>';
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
  window.onAppNavigate = function (page) {
    if (page === 'h-dashboard') renderHDashboard();
    else if (page === 'h-meals') renderHMeals();
    else if (page === 'h-goals') renderHGoals();
    else if (page === 'h-nutri') initNutri();
  };

  // expõe funções usadas no HTML (onclick)
  Object.assign(window, {
    hAddMeal, hQuickAdd, hDelMeal, hWater, hSaveGoals, hUseSuggested, nbSend,
  });

  // ── restaura último app aberto ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (_store.lastApp && _store.lastApp !== 'finance' && typeof switchApp === 'function') {
      switchApp(_store.lastApp);
    }
  });
})();
