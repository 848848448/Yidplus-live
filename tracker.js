/*!
 * Web Analytics HQ — tracking snippet.
 * Add ONE line to any site you want to track (before </body>):
 *   <script defer src="https://YOUR-DASHBOARD.pages.dev/tracker.js" data-site="SITE_ID"></script>
 * Get the exact line (with the right SITE_ID) from the "Install" button in your dashboard.
 *
 * It counts a unique visitor once (persistent id in localStorage) and measures
 * real active time on the page (only while the tab is visible), reporting via
 * navigator.sendBeacon so nothing is lost on unload. No cookies, no personal data.
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var site = s.getAttribute('data-site');
  if (!site) return;
  var api = s.getAttribute('data-api') || (new URL(s.src).origin + '/api/collect');

  var vid;
  try {
    vid = localStorage.getItem('_wahq_v');
    if (!vid) { vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('_wahq_v', vid); }
  } catch (e) { vid = 'v' + Math.random().toString(36).slice(2, 10); }

  function send(ev, d) {
    var payload = JSON.stringify({ s: site, v: vid, e: ev, d: d || 0, p: location.pathname, r: document.referrer || '' });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(api, new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch (e) {}
    try { fetch(api, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true, mode: 'no-cors' }); } catch (e) {}
  }

  // Count the pageview.
  send('view', 0);

  // Measure active time — accumulate only while the tab is visible.
  var visible = document.visibilityState !== 'hidden';
  var last = Date.now();
  var pending = 0;

  function accumulate() {
    if (visible) { var now = Date.now(); pending += now - last; last = now; }
  }
  function flush() {
    accumulate();
    if (pending >= 1000) { send('ping', pending); pending = 0; }
  }

  var timer = setInterval(flush, 15000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { accumulate(); visible = false; flush(); }
    else { visible = true; last = Date.now(); }
  });
  window.addEventListener('pagehide', function () { clearInterval(timer); flush(); });
  window.addEventListener('beforeunload', flush);
})();
