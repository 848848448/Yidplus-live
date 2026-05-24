/* ═══════════════════════════════════════════
   YID PLUS — App Router & Shared Utilities
   js/app.js
═══════════════════════════════════════════ */

'use strict';

/* ── CONSTANTS ── */
const OWNER_EMAIL  = 'avrumy5872877@gmail.com';
const ADMIN_PIN    = '1234';
const APP_VERSION  = '1.0.0';

/* ── APP STATE ── */
const APP = {
  user:       null,
  screen:     'auth',
  prevScreen: 'home',
  navLabels:  { home:'Home', shorts:'Shorts', music:'Music', chats:'Chats', settings:'Settings' },
};

/* ════════════════════════════
   SCREEN ROUTER
════════════════════════════ */
function navTo(screenId, data) {
  const prev = APP.screen;
  APP.prevScreen = prev;
  APP.screen     = screenId;

  // Slide out previous
  const prevEl = document.getElementById('screen-' + prev);
  if (prevEl) {
    prevEl.classList.remove('active');
    prevEl.classList.add('slide-back');
    setTimeout(() => prevEl.classList.remove('slide-back'), 350);
  }

  // Slide in next
  const nextEl = document.getElementById('screen-' + screenId);
  if (nextEl) {
    nextEl.classList.add('active');
    // Trigger screen init
    const initFn = window['init_' + screenId];
    if (typeof initFn === 'function') initFn(data);
  }

  // Update all bottom navs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === screenId);
  });
}

window.navTo = navTo;

/* ════════════════════════════
   TOAST
════════════════════════════ */
function toast(msg) {
  const t = document.getElementById('app-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}
window.toast = toast;

/* ════════════════════════════
   LOADING BUTTON HELPER
════════════════════════════ */
function setLoading(btnId, on) {
  const btn  = document.getElementById(btnId);
  const txt  = document.getElementById(btnId + '-txt');
  const dots = document.getElementById(btnId + '-dots');
  if (!btn) return;
  btn.disabled = on;
  if (txt)  txt.style.display  = on ? 'none'  : 'inline';
  if (dots) dots.style.display = on ? 'flex'  : 'none';
}
window.setLoading = setLoading;

/* ════════════════════════════
   NIGHT THEME AUTO-SWITCHER
════════════════════════════ */
function checkNightTheme() {
  const h = new Date().getHours();
  document.body.classList.toggle('night', h >= 19 || h < 7);
}
checkNightTheme();
setInterval(checkNightTheme, 60_000);

/* ════════════════════════════
   UTILITIES
════════════════════════════ */
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
window.fmtNum = fmtNum;

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
window.validEmail = validEmail;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
window.delay = delay;

/* ════════════════════════════
   SESSION RESTORE
════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('yp_session');
  if (saved) {
    try {
      APP.user = JSON.parse(saved);
      navTo('home');
    } catch {
      navTo('auth');
    }
  } else {
    navTo('auth');
  }
  // Restore remembered email
  const remEmail = localStorage.getItem('yp_remember');
  if (remEmail) {
    const emailField = document.getElementById('l-email');
    const remTog     = document.getElementById('rem-tog');
    if (emailField) emailField.value = remEmail;
    if (remTog)     remTog.classList.add('on');
  }
});

/* expose constants for other modules */
window.OWNER_EMAIL = OWNER_EMAIL;
window.ADMIN_PIN   = ADMIN_PIN;
window.APP         = APP;
