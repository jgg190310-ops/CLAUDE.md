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
//  PARALLAX
// ══════════════════════════════════════════════
const orbs = document.querySelectorAll('.orb[data-speed]');
const dashboardPreview = document.querySelector('.dashboard-preview');

function onScroll() {
  const sy = window.scrollY;
  orbs.forEach(orb => {
    const speed = parseFloat(orb.dataset.speed) || 0.3;
    orb.style.transform = `translateY(${sy * speed}px)`;
  });
  if (dashboardPreview) {
    const speed = parseFloat(dashboardPreview.dataset.speed) || 0.15;
    dashboardPreview.style.transform =
      `rotateY(-4deg) rotateX(3deg) translateY(${sy * speed}px)`;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ══════════════════════════════════════════════
//  FLOATING PARTICLES
// ══════════════════════════════════════════════
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${40 + Math.random() * 60}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      --dur:${6 + Math.random() * 10}s;
      --del:${Math.random() * 8}s;
      --travel:${200 + Math.random() * 400}px;
    `;
    container.appendChild(p);
  }
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

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
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
