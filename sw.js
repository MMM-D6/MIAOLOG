// MMM — Service Worker v17
// v17: 大改版。MMM 变成「时间轴 + 打点 + 抽一条 + 备忘录」；BOX 独立成 box.html；
//      图标改成 icons/ 里的图片，manifest 不再内嵌大段图片数据；去掉贴纸相关缓存
const CACHE_NAME = 'mmm-v18';
const STATIC_ASSETS = ['./manifest.json', './icons/mmm-180.png', './icons/mmm-192.png', './icons/mmm-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;          // Supabase 等外部请求不经过缓存

  // 页面：网络优先，拿到就更新缓存；离线时用缓存
  if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return resp;
      }).catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // 字体、图标等：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      if (resp.ok) { const clone = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); }
      return resp;
    }))
  );
});
