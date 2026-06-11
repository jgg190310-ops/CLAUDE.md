'use strict';

// ══════════════════════════════════════════════
//  NAV SCROLL + HAMBURGER
// ══════════════════════════════════════════════
const nav = document.getElementById('nav');
const mobileMenu = document.getElementById('mobileMenu');
const hamburger = document.getElementById('navHamburger');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

hamburger?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open');
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
}

// ══════════════════════════════════════════════
//  PARALLAX — scroll + mouse-tracking + tilt
// ══════════════════════════════════════════════
const orbs = document.querySelectorAll('.orb[data-speed]');
const dashboardPreview = document.querySelector('.dashboard-preview');
const geoShapes = document.querySelectorAll('.geo-shape');
const lpLayers = document.querySelectorAll('.lp-beam, .lp-grid-floor');
const floatBadges = document.querySelectorAll('.float-badge');

// Smoothed mouse position (lerp)
let mx = 0, my = 0;   // raw normalized [-1, 1]
let smx = 0, smy = 0; // smoothed
let scrollY = 0;
let rafId = null;

window.addEventListener('mousemove', (e) => {
  mx = (e.clientX / window.innerWidth  - 0.5) * 2;
  my = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

// second lerp layer — slower, for background orbs deep parallax
let smx2 = 0, smy2 = 0;

function parallaxLoop() {
  // fast layer (foreground)
  smx  += (mx  - smx)  * 0.06;
  smy  += (my  - smy)  * 0.06;
  // slow layer (deep background)
  smx2 += (mx  - smx2) * 0.025;
  smy2 += (my  - smy2) * 0.025;

  // Scroll-based orb movement + mouse offset, deep layer uses smx2
  orbs.forEach(orb => {
    const sp  = parseFloat(orb.dataset.speed) || 0.3;
    const msp = parseFloat(orb.dataset.mspeed) || sp * 30;
    // large background orbs use slow layer for more inertia
    const depth = sp < 0.25 ? 0.5 : 1.0;
    const lx = depth < 1 ? smx2 : smx;
    const ly = depth < 1 ? smy2 : smy;
    const tx  = lx * msp;
    const ty  = ly * msp + scrollY * sp;
    orb.style.transform = `translate(${tx}px, ${ty}px)`;
  });

  // Geometric shapes — different depths
  geoShapes.forEach(s => {
    const sp  = parseFloat(s.dataset.speed) || 0.2;
    const msp = parseFloat(s.dataset.mspeed) || sp * 50;
    const tx  = smx * msp;
    const ty  = smy * msp + scrollY * sp;
    s.style.transform = `translate(${tx}px, ${ty}px) rotate(${scrollY * sp * 0.12}deg)`;
  });

  // Beams + grid floor — use `translate` so their CSS transform animations keep running
  lpLayers.forEach(el => {
    const sp  = parseFloat(el.dataset.speed) || 0.1;
    const msp = parseFloat(el.dataset.mspeed) || 6;
    el.style.translate = `${smx2 * msp}px ${smy2 * msp + scrollY * sp}px`;
  });

  // Dashboard card: stronger 3D tilt
  if (dashboardPreview) {
    const sp  = parseFloat(dashboardPreview.dataset.speed) || 0.15;
    const rx  =  smy * 10;
    const ry  = -smx * 16;
    const ty  = scrollY * sp;
    dashboardPreview.style.transform =
      `perspective(1000px) rotateX(${rx}deg) rotateY(${ry - 4}deg) translateY(${ty}px)`;
  }

  // Float badges sway
  floatBadges.forEach((b, i) => {
    const dir = i % 2 === 0 ? 1 : -1;
    const tx  = smx * 10 * dir;
    const ty  = smy * 6;
    b.style.setProperty('--mx', `${tx}px`);
    b.style.setProperty('--my', `${ty}px`);
  });

  rafId = requestAnimationFrame(parallaxLoop);
}
parallaxLoop();

// ══════════════════════════════════════════════
//  FLOATING PARTICLES  (canvas-based for lines)
// ══════════════════════════════════════════════
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  // DOM dots (existing style, more of them)
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#a5b4fc'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1.5;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${20 + Math.random() * 80}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      --dur:${8 + Math.random() * 12}s;
      --del:${Math.random() * 10}s;
      --travel:${150 + Math.random() * 350}px;
    `;
    container.appendChild(p);
  }

  // Canvas for connecting lines
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  container.appendChild(canvas);

  const particleData = [];
  const COUNT = 55;
  const CONNECT_DIST = 140;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Seed positions
  for (let i = 0; i < COUNT; i++) {
    particleData.push({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 1.8 + 0.8,
      c:  colors[Math.floor(Math.random() * colors.length)],
    });
  }

  const ctx = canvas.getContext('2d');

  // shooting stars
  const meteors = [];
  function maybeMeteor() {
    if (Math.random() < 0.005 && meteors.length < 3) {
      meteors.push({
        x: Math.random() * canvas.width * 0.7,
        y: Math.random() * canvas.height * 0.4,
        vx: 6 + Math.random() * 5,
        vy: 3 + Math.random() * 2.5,
        life: 1,
      });
    }
  }
  function drawMeteorsL() {
    maybeMeteor();
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= 0.011;
      if (m.life <= 0 || m.x > canvas.width || m.y > canvas.height) { meteors.splice(i, 1); continue; }
      const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
      tail.addColorStop(0, `rgba(199,210,254,${0.9 * m.life})`);
      tail.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.8;
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${m.life})`;
      ctx.fill();
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    drawMeteorsL();

    particleData.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    });

    // Draw connecting lines
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = particleData[i].x - particleData[j].x;
        const dy = particleData[i].y - particleData[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < CONNECT_DIST) {
          ctx.beginPath();
          ctx.moveTo(particleData[i].x, particleData[i].y);
          ctx.lineTo(particleData[j].x, particleData[j].y);
          const alpha = (1 - dist / CONNECT_DIST) * 0.18;
          ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    particleData.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c + 'bb';
      ctx.fill();
    });

    requestAnimationFrame(drawFrame);
  }
  drawFrame();
}
spawnParticles();

// ══════════════════════════════════════════════
//  SCROLL REVEAL (IntersectionObserver)
// ══════════════════════════════════════════════
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-card').forEach(el => revealObserver.observe(el));

// ══════════════════════════════════════════════
//  COUNTER ANIMATION
// ══════════════════════════════════════════════
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

// ══════════════════════════════════════════════
//  AUTH MODAL
//  (loadStore / saveStore / STORE_KEY definidos
//   no app.js quando em single-file; aqui
//   definimos apenas se ainda não existirem)
// ══════════════════════════════════════════════
if (typeof STORE_KEY === 'undefined') {
  window.STORE_KEY = 'financeos-store';
  window.loadStore = function() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  };
  window.saveStore = function(patch) {
    try { const s = loadStore(); Object.assign(s, patch); localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch (e) {}
  };
}

function openAuth(panel) {
  document.getElementById('authBackdrop').classList.add('open');
  switchPanel(panel);
  // focus no primeiro campo
  setTimeout(() => {
    const f = document.querySelector('#authModal .auth-field input');
    if (f) f.focus();
  }, 350);
}

function closeAuth() {
  document.getElementById('authBackdrop').classList.remove('open');
  clearErrors();
}

function switchPanel(name) {
  ['login','signup','success'].forEach(n => {
    const el = document.getElementById('panel' + n.charAt(0).toUpperCase() + n.slice(1));
    if (el) el.classList.toggle('hidden', n !== name);
  });
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.auth-field input').forEach(i => i.classList.remove('error'));
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

// Password strength meter
document.getElementById('signupPass')?.addEventListener('input', function() {
  const val = this.value;
  const fill = document.getElementById('psFill');
  const label = document.getElementById('psLabel');
  if (!fill || !label) return;
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w:'0%',   color:'transparent', label:'' },
    { w:'25%',  color:'#ef4444', label:'Fraca' },
    { w:'50%',  color:'#f59e0b', label:'Média' },
    { w:'75%',  color:'#06b6d4', label:'Boa' },
    { w:'100%', color:'#10b981', label:'Forte' },
  ];
  const l = levels[Math.min(score, 4)];
  fill.style.width    = l.w;
  fill.style.background = l.color;
  label.textContent   = l.label;
  label.style.color   = l.color;
});

const EYE_OPEN  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_SLASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = isText ? EYE_OPEN : EYE_SLASH;
}

// ── Local auth (sem Firebase) — persiste no localStorage ──
function localAuth(email, name) {
  saveStore({ user: { email, name, uid: 'local-' + Date.now() } });
}

// ── Firebase auth (se configurado) ──
async function tryFirebaseAuth(mode, email, password, name) {
  const store = loadStore();
  const fbConfig = store.fbConfig;
  if (!fbConfig?.apiKey) return null; // Firebase não configurado — usa local

  try {
    if (!firebase.apps?.length) firebase.initializeApp(fbConfig);
    const auth = firebase.auth();
    let cred;
    if (mode === 'login') {
      cred = await auth.signInWithEmailAndPassword(email, password);
    } else {
      cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
    }
    return { uid: cred.user.uid, email: cred.user.email, name: cred.user.displayName || name };
  } catch (e) {
    const map = {
      'auth/user-not-found':      'E-mail não encontrado.',
      'auth/wrong-password':      'Senha incorreta.',
      'auth/email-already-in-use':'Este e-mail já está cadastrado.',
      'auth/invalid-email':       'E-mail inválido.',
      'auth/weak-password':       'Senha muito fraca (mínimo 6 caracteres).',
      'auth/too-many-requests':   'Muitas tentativas. Aguarde um momento.',
      'auth/network-request-failed': 'Erro de rede. Verifique sua conexão.',
    };
    throw new Error(map[e.code] || e.message || 'Erro desconhecido.');
  }
}

async function doLogin() {
  clearErrors();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;

  if (!email) { showError('loginError', 'Informe seu e-mail.'); document.getElementById('loginEmail').classList.add('error'); return; }
  if (!pass)  { showError('loginError', 'Informe sua senha.'); document.getElementById('loginPass').classList.add('error'); return; }

  setLoading('loginBtn', true);
  try {
    let user = await tryFirebaseAuth('login', email, pass, '');
    if (!user) {
      // Autenticação local
      const store = loadStore();
      const accounts = store.accounts || [];
      const found = accounts.find(a => a.email === email && a.password === btoa(pass));
      if (!found) throw new Error('E-mail ou senha incorretos.');
      user = { email: found.email, name: found.name, uid: found.uid };
    }
    saveStore({ user });
    goSuccess(user.name || email.split('@')[0]);
  } catch (e) {
    showError('loginError', e.message);
  } finally {
    setLoading('loginBtn', false);
  }
}

async function doSignup() {
  clearErrors();
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass  = document.getElementById('signupPass').value;
  const pass2 = document.getElementById('signupPass2').value;
  const terms = document.getElementById('acceptTerms').checked;

  if (!name)         { showError('signupError', 'Informe seu nome.'); return; }
  if (!email)        { showError('signupError', 'Informe seu e-mail.'); return; }
  if (pass.length < 6) { showError('signupError', 'Senha deve ter pelo menos 6 caracteres.'); return; }
  if (pass !== pass2){ showError('signupError', 'As senhas não coincidem.'); return; }
  if (!terms)        { showError('signupError', 'Aceite os termos para continuar.'); return; }

  setLoading('signupBtn', true);
  try {
    let user = await tryFirebaseAuth('signup', email, pass, name);
    if (!user) {
      // Cria conta local
      const store = loadStore();
      const accounts = store.accounts || [];
      if (accounts.find(a => a.email === email)) throw new Error('Este e-mail já está cadastrado.');
      const uid = 'local-' + Date.now();
      accounts.push({ email, name, password: btoa(pass), uid });
      saveStore({ accounts, user: { email, name, uid } });
      user = { email, name, uid };
    }
    saveStore({ user, profile: { name, email } });
    goSuccess(name);
  } catch (e) {
    showError('signupError', e.message);
  } finally {
    setLoading('signupBtn', false);
  }
}

function doGuestLogin() {
  const user = { email: 'visitante@financeos.app', name: 'Visitante', uid: 'guest-' + Date.now() };
  saveStore({ user });
  goSuccess('Visitante', 'Entrando como visitante…');
}

function goSuccess(name, subtitle) {
  document.getElementById('successTitle').textContent = `Olá, ${name.split(' ')[0]}! 👋`;
  document.getElementById('successSub').textContent = subtitle || 'Entrando no seu painel…';
  switchPanel('success');
  // redireciona para o app após a barra de progresso
  setTimeout(() => {
    window.location.href = 'app.html';
  }, 1900);
}

// Fecha modal ao clicar no backdrop
document.getElementById('authBackdrop')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('authBackdrop')) closeAuth();
});

// Atalho ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAuth();
});

// Enter nos campos
document.getElementById('loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('signupPass2')?.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });

// Se já estiver logado, troca botão nav para "Meu Painel"
(function checkExistingSession() {
  const store = loadStore();
  if (!store.user?.uid) return;
  const ctaBtns = document.querySelectorAll('.nav-cta .btn-ghost');
  ctaBtns.forEach(btn => {
    btn.textContent = '⬡ Meu Painel';
    btn.onclick = () => { window.location.href = 'app.html'; };
  });
})();
