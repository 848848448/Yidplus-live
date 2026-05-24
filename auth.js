/* ═══════════════════════════════════════════
   YID PLUS — Auth Module
   js/auth.js
   Handles Login, Register, Session
═══════════════════════════════════════════ */

'use strict';

/* ── TAB SWITCHER ── */
function authTab(tab) {
  document.getElementById('auth-login').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'))
  );
  hideAuthMsg();
}
window.authTab = authTab;

/* ── REMEMBER ME ── */
let rememberMe = !!localStorage.getItem('yp_remember');
function toggleRemember() {
  rememberMe = !rememberMe;
  document.getElementById('rem-tog').classList.toggle('on', rememberMe);
}
window.toggleRemember = toggleRemember;

/* ── MESSAGE ── */
function showAuthMsg(type, text) {
  const el = document.getElementById('auth-msg');
  if (!el) return;
  el.className = 'auth-msg ' + (type === 'err' ? 'err' : 'ok');
  el.innerHTML = (type === 'err' ? '⚠ ' : '✓ ') + text;
}
function hideAuthMsg() {
  const el = document.getElementById('auth-msg');
  if (el) el.className = 'auth-msg';
}

/* ── LOGIN ── */
async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  hideAuthMsg();
  if (!email || !pass)           return showAuthMsg('err', 'Please fill in all fields.');
  if (!validEmail(email))        return showAuthMsg('err', 'Enter a valid email address.');
  setLoading('l-btn', true);

  await delay(1200);

  /* ── REAL FIREBASE (uncomment when ready) ──
  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
    const snap = await firebase.firestore().collection('users').doc(cred.user.uid).get();
    const data = snap.data();
    APP.user = { uid: cred.user.uid, email, nickname: data.nickname, role: data.role };
  } catch(e) {
    setLoading('l-btn', false);
    return showAuthMsg('err', 'Wrong email or password.');
  }
  ── END FIREBASE ── */

  // Demo mode
  APP.user = {
    email,
    nickname: email.split('@')[0],
    role:     email === OWNER_EMAIL ? 'owner' : 'user',
    isOwner:  email === OWNER_EMAIL,
  };

  if (rememberMe) localStorage.setItem('yp_remember', email);
  else            localStorage.removeItem('yp_remember');
  localStorage.setItem('yp_session', JSON.stringify(APP.user));

  setLoading('l-btn', false);
  showAuthMsg('ok', APP.user.isOwner ? 'Welcome back, Owner! 👑' : 'Signed in! Loading your feed...');
  setTimeout(() => navTo('home'), 700);
}
window.doLogin = doLogin;

/* ── REGISTER ── */
async function doRegister() {
  const email = document.getElementById('r-email').value.trim();
  const nick  = document.getElementById('r-nick').value.trim();
  const phone = document.getElementById('r-phone').value.trim();
  const pass  = document.getElementById('r-pass').value;
  const pass2 = document.getElementById('r-pass2').value;
  hideAuthMsg();

  if (!email || !nick || !pass || !pass2) return showAuthMsg('err', 'Fill in all required fields.');
  if (!validEmail(email))                 return showAuthMsg('err', 'Enter a valid email address.');
  if (nick.length < 3)                    return showAuthMsg('err', 'Nickname must be at least 3 characters.');
  if (pass.length < 6)                    return showAuthMsg('err', 'Password must be at least 6 characters.');
  if (pass !== pass2)                     return showAuthMsg('err', 'Passwords do not match.');

  setLoading('r-btn', true);
  await delay(1400);

  /* ── REAL FIREBASE (uncomment when ready) ──
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
    await firebase.firestore().collection('users').doc(cred.user.uid).set({
      email, nickname: nick, phone,
      role: 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Auto-create channel portfolio
    await firebase.firestore().collection('channels').doc(cred.user.uid).set({
      ownerUID: cred.user.uid, nickname: nick,
      followers: 0, following: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch(e) {
    setLoading('r-btn', false);
    if (e.code === 'auth/email-already-in-use')
      return showAuthMsg('err', 'This email is already registered.');
    return showAuthMsg('err', 'Registration failed. Try again.');
  }
  ── END FIREBASE ── */

  APP.user = { email, nickname: nick, role: 'user', isOwner: false };
  localStorage.setItem('yp_session', JSON.stringify(APP.user));

  setLoading('r-btn', false);
  showAuthMsg('ok', 'Account created! Your personal channel is being set up...');
  setTimeout(() => navTo('home'), 900);
}
window.doRegister = doRegister;

/* ── LOGOUT ── */
function doLogout() {
  if (!confirm('Sign out of YID PLUS?')) return;
  localStorage.removeItem('yp_session');
  APP.user = null;
  navTo('auth');
  toast('👋 Signed out successfully.');
}
window.doLogout = doLogout;

/* ── ENTER KEY on password field ── */
document.addEventListener('DOMContentLoaded', () => {
  const lpass = document.getElementById('l-pass');
  if (lpass) lpass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});
