/* ═══════════════════════════════════════════
   YID PLUS — Home Dashboard Module
   js/home.js
═══════════════════════════════════════════ */

'use strict';

/* ── DATA ── */
const STATUSES = [
  { nick:'MosheMusic', emoji:'🎹', slides:[{bg:'#1a0a2e',text:'New niggun dropping Friday! 🎵',color:'#F0D080'},{bg:'#0a1a1a',text:'Studio session was fire 🎧',color:'#5DCAA5'}], time:'5m', viewed:false },
  { nick:'RebbeVibes', emoji:'📖', slides:[{bg:'#1a0f00',text:'Torah thought: Be kind 💛',color:'#F0D080'}], time:'12m', viewed:false },
  { nick:'ShlomoBeats', emoji:'🎤', slides:[{bg:'#001020',text:'Live performance SUNDAY! 🎤',color:'#85B7EB'},{bg:'#0a001a',text:'Link in bio for tickets 🎟️',color:'#5DCAA5'}], time:'2h', viewed:false },
  { nick:'KosherChef', emoji:'🥘', slides:[{bg:'#1a0a0a',text:'Cholent reveal TOMORROW 👀',color:'#F09595'}], time:'3h', viewed:true },
  { nick:'FiddlerNY', emoji:'🎻', slides:[{bg:'#0a1a0a',text:'New klezmer album OUT NOW 🎻',color:'#97C459'}], time:'5h', viewed:true },
];

const ADS = [
  { title:"Moshe's Judaica", sub:"Finest Judaica worldwide • Free shipping!", icon:"🕎", bg:"#1a1000", duration:5000 },
  { title:"Kosher Vacations", sub:"Exclusive glatt kosher resorts", icon:"🏖️", bg:"#001a1a", duration:6000 },
  { title:"Torah Academy Online", sub:"Learn with the best • Free trial!", icon:"📚", bg:"#0a001a", duration:5000 },
];

const SHORTS_PREVIEW = [
  { emoji:'🎹', views:'12.4K', nick:'@Moshe' },
  { emoji:'🕺', views:'8.7K',  nick:'@YidDancer' },
  { emoji:'🎤', views:'22K',   nick:'@Shlomo' },
  { emoji:'🥘', views:'5.1K',  nick:'@KosherChef' },
  { emoji:'📖', views:'3.2K',  nick:'@RebbeVibes' },
  { emoji:'🎻', views:'9.8K',  nick:'@FiddlerNY' },
];

const CHANNELS_PREVIEW = [
  { emoji:'🎹', name:'MosheMusic',  followers:'12.4K', verified:true  },
  { emoji:'🎤', name:'ShlomoBeats', followers:'8.1K',  verified:false },
  { emoji:'📖', name:'RebbeVibes',  followers:'31K',   verified:true  },
  { emoji:'🥘', name:'KosherFood',  followers:'5.6K',  verified:false },
];

const POSTS = [
  { emoji:'🎹', nick:'MosheMusic',  time:'10 min ago',  caption:'Just dropped a new clip! Check it out 🔥', likes:142, cmts:23 },
  { emoji:'📖', nick:'RebbeVibes',  time:'1 hour ago',  caption:'Weekly Torah class recording is up!',      likes:87,  cmts:11 },
  { emoji:'🎤', nick:'ShlomoBeats', time:'3 hours ago', caption:'Studio behind the scenes 👀🎧',             likes:204, cmts:38 },
];

/* ── AD STATE ── */
let adIdx = 0, adRaf = null, adStart = 0;

/* ── INIT (called by router) ── */
function init_home() {
  buildStatusRow();
  buildAds();
  buildShortsPreview();
  buildChannelsPreview();
  buildFeedPosts();
  updateNavLabels();
}
window.init_home = init_home;

/* ── STATUS ROW ── */
function buildStatusRow() {
  const row = document.getElementById('home-status-row');
  if (!row) return;
  row.innerHTML = `
    <div class="status-item" onclick="toast('Upload a new status!')">
      <div class="status-ring mine">
        <div class="status-inner">👤<div class="status-plus">+</div></div>
      </div>
      <div class="status-name">My Status</div>
    </div>`;
  STATUSES.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.onclick = () => openStatusViewer(i);
    item.innerHTML = `
      <div class="status-ring ${s.viewed ? 'viewed' : ''}">
        <div class="status-inner">${s.emoji}</div>
      </div>
      <div class="status-name">${s.nick}</div>`;
    row.appendChild(item);
  });
}

/* ── AD BANNER ── */
function buildAds() {
  const frame = document.getElementById('ad-frame');
  const dots  = document.getElementById('ad-dots');
  if (!frame || !dots) return;
  frame.innerHTML = '<div id="ad-progress-bar"></div>';
  dots.innerHTML  = '';

  ADS.forEach((ad, i) => {
    const slide = document.createElement('div');
    slide.className = 'ad-slide' + (i === 0 ? ' active' : '');
    slide.style.background = ad.bg;
    slide.innerHTML = `
      <div class="ad-inner">
        <div class="ad-icon">${ad.icon}</div>
        <div class="ad-badge">Sponsored</div>
        <div class="ad-title">${ad.title}</div>
        <div class="ad-sub">${ad.sub}</div>
      </div>`;
    frame.appendChild(slide);
    const dot = document.createElement('div');
    dot.className = 'ad-dot' + (i === 0 ? ' active' : '');
    dots.appendChild(dot);
  });

  startAdTimer();
}

function startAdTimer() {
  cancelAnimationFrame(adRaf);
  adStart = performance.now();
  const dur = ADS[adIdx].duration;
  const bar = document.getElementById('ad-progress-bar');

  function tick(now) {
    const pct = Math.min(100, (now - adStart) / dur * 100);
    if (bar) bar.style.width = pct + '%';
    if (pct < 100) {
      adRaf = requestAnimationFrame(tick);
    } else {
      adIdx = (adIdx + 1) % ADS.length;
      document.querySelectorAll('#home-screen .ad-slide').forEach((s, i) => s.classList.toggle('active', i === adIdx));
      document.querySelectorAll('#home-screen .ad-dot').forEach((d, i)  => d.classList.toggle('active', i === adIdx));
      startAdTimer();
    }
  }
  adRaf = requestAnimationFrame(tick);
}

/* ── SHORTS PREVIEW ── */
function buildShortsPreview() {
  const row = document.getElementById('home-shorts-row');
  if (!row) return;
  row.innerHTML = '';
  SHORTS_PREVIEW.forEach(s => {
    const card = document.createElement('div');
    card.className = 'short-preview-card';
    card.onclick = () => navTo('shorts');
    card.innerHTML = `
      <div class="sp-thumb">${s.emoji}</div>
      <div class="sp-overlay">
        <div class="sp-nick">${s.nick}</div>
        <div class="sp-views">👁 ${s.views}</div>
      </div>
      <div class="sp-play">▶</div>`;
    row.appendChild(card);
  });
}

/* ── CHANNELS PREVIEW ── */
function buildChannelsPreview() {
  const row = document.getElementById('home-channels-row');
  if (!row) return;
  row.innerHTML = '';
  CHANNELS_PREVIEW.forEach(c => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.onclick = () => openChannel(c.name);
    card.innerHTML = `
      <div class="ch-avatar-wrap">
        <div class="ch-card-avatar">${c.emoji}</div>
        ${c.verified ? '<div class="ch-crown">👑</div>' : ''}
      </div>
      <div class="ch-card-name">${c.name}</div>
      <div class="ch-card-followers">${c.followers} followers</div>
      <button class="follow-pill" onclick="event.stopPropagation(); toggleFollowBtn(this)">+ Follow</button>`;
    row.appendChild(card);
  });
}

function toggleFollowBtn(btn) {
  const following = btn.classList.toggle('following');
  btn.textContent = following ? '✓ Following' : '+ Follow';
}
window.toggleFollowBtn = toggleFollowBtn;

/* ── FEED POSTS ── */
function buildFeedPosts() {
  const feed = document.getElementById('home-feed');
  if (!feed) return;
  feed.innerHTML = '';
  POSTS.forEach((p, i) => {
    const post = document.createElement('article');
    post.className = 'feed-post';
    post.innerHTML = `
      <div class="post-header" onclick="openChannel('${p.nick}')">
        <div class="post-avatar">${p.emoji}</div>
        <div>
          <div class="post-nick">${p.nick}</div>
          <div class="post-time">${p.time}</div>
        </div>
      </div>
      <div class="post-thumb" onclick="navTo('shorts')">
        ${p.emoji}
        <div class="post-play">▶</div>
      </div>
      <div class="post-caption">${p.caption}</div>
      <div class="post-actions">
        <button class="post-action" data-likes="${p.likes}" onclick="likePost(this)">🤍 ${p.likes}</button>
        <button class="post-action" onclick="toast('Opening comments...')">💬 ${p.cmts}</button>
        <button class="post-action" onclick="toast('Link copied!')">📤 Share</button>
      </div>`;
    feed.appendChild(post);
  });
}

function likePost(btn) {
  const liked = btn.classList.toggle('liked');
  const base  = parseInt(btn.dataset.likes);
  btn.innerHTML = (liked ? '❤️ ' : '🤍 ') + (liked ? base + 1 : base);
}
window.likePost = likePost;

/* ── UPDATE NAV LABELS ── */
function updateNavLabels() {
  document.querySelectorAll('[data-nav-label]').forEach(el => {
    const key = el.dataset.navLabel;
    if (APP.navLabels[key]) el.textContent = APP.navLabels[key];
  });
}

/* ── STATUS VIEWER ── */
let svUser = null, svSlide = 0, svBarTimer = null;

function openStatusViewer(i) {
  svUser  = STATUSES[i];
  svSlide = 0;
  STATUSES[i].viewed = true;
  // Update ring to viewed
  const rings = document.querySelectorAll('#home-status-row .status-ring');
  if (rings[i + 1]) rings[i + 1].classList.add('viewed');

  let ov = document.getElementById('sv-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'sv-overlay';
    document.body.appendChild(ov);
  }
  ov.className = 'sv-overlay open';
  ov.innerHTML = `
    <div class="sv-header">
      <div class="sv-bars" id="sv-bars"></div>
      <div class="sv-top">
        <div class="sv-user">
          <div class="sv-avatar">${svUser.emoji}</div>
          <div>
            <div class="sv-nick">@${svUser.nick}</div>
            <div class="sv-time">${svUser.time} ago</div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem">
          <button class="sv-ctrl" onclick="svToggleMute(this)">🔊</button>
          <button class="sv-ctrl" onclick="closeSV()">✕</button>
        </div>
      </div>
    </div>
    <div class="sv-content">
      <div class="sv-tap sv-tap-left"  onclick="svPrev()"></div>
      <div class="sv-tap sv-tap-right" onclick="svNext()"></div>
      <div class="sv-slide" id="sv-slide"></div>
    </div>
    <div class="sv-footer">
      <input class="sv-reply" placeholder="Reply..." id="sv-reply">
      <div class="sv-heart" onclick="this.textContent='❤️';setTimeout(()=>this.textContent='🤍',1000)">🤍</div>
    </div>`;
  svShowSlide(0);
}
window.openStatusViewer = openStatusViewer;

function svShowSlide(idx) {
  if (!svUser) return;
  clearTimeout(svBarTimer);
  const slide = svUser.slides[idx];
  const el    = document.getElementById('sv-slide');
  const bars  = document.getElementById('sv-bars');
  if (!el || !bars) return;

  bars.innerHTML = svUser.slides.map((_, j) =>
    `<div class="sv-bar"><div class="sv-bar-fill ${j < idx ? 'done' : j === idx ? 'running' : ''}" style="${j === idx ? 'animation-duration:5s' : ''}"></div></div>`
  ).join('');

  el.style.opacity = '0';
  el.style.background = slide.bg || '#111';
  el.style.color      = slide.color || '#fff';
  setTimeout(() => { el.textContent = slide.text || ''; el.style.opacity = '1'; }, 120);

  svBarTimer = setTimeout(svNext, 5000);
}

function svNext() { svUser && svSlide < svUser.slides.length - 1 ? svShowSlide(++svSlide) : closeSV(); }
function svPrev() { svUser && svSlide > 0 ? svShowSlide(--svSlide) : null; }
function closeSV() { const ov = document.getElementById('sv-overlay'); if (ov) ov.classList.remove('open'); clearTimeout(svBarTimer); }
function svToggleMute(btn) { btn.textContent = btn.textContent === '🔊' ? '🔇' : '🔊'; }

window.svNext = svNext; window.svPrev = svPrev; window.closeSV = closeSV; window.svToggleMute = svToggleMute;

/* ── CHANNEL NAV ── */
function openChannel(nick) { navTo('channel', { nick }); }
window.openChannel = openChannel;
