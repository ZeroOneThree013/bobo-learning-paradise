/* BoBo 學習樂園 service worker：連得上網就抓最新版，失敗才用快取（所以更新內容不會卡在舊版） */
const CACHE = 'bobo-v1';
const OK_HOSTS = [self.location.host, 'cdnjs.cloudflare.com'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html'])).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || OK_HOSTS.indexOf(u.host) < 0) return;   // 雲端帳號 API 等其他請求不碰
  e.respondWith(fetch(r).then(res => {
    if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(r, c)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
