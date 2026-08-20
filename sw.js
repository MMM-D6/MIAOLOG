// MMM (ADHD RPG) — Service Worker v6
// v6: 配合贴纸库
//     - stickers.json 清单改成网络优先，仓库里新加的贴纸提交后立刻能看到
//     - stickers/ 下的图片走「先用缓存、同时后台更新」，既快又不会长期过期
// v5: 适配重构后的主程序（移除甘特图/Toolkit/英语卡片，新增 BOX 栏）
//     修复：v4 中 STATIC_ASSETS 引用了不存在的 icons/ 文件，
//     导致 cache.addAll 整体失败、Service Worker 无法安装；
//     修复：index.html 离线回退之前从未真正入缓存，离线时无法打开
const CACHE_NAME = 'adhd-rpg-v6';

// 只预缓存确定存在的静态资源（图标已内嵌在 manifest.json 的 data URL 中，仓库里没有 icons/ 目录）
const STATIC_ASSETS = [
  './manifest.json',
  './box.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 逐个缓存：单个资源失败不影响 Service Worker 安装
      Promise.all(STATIC_ASSETS.map(url =>
        cache.add(url).catch(() => null)
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // index.html / box.html 始终网络优先获取最新版本；
  // 成功后写入缓存，离线时回退到缓存副本
  const isIndex = url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  const isBox = url.pathname.endsWith('box.html');
  if (isIndex || isBox) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return resp;
      }).catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match(isBox ? './box.html' : './index.html')
        )
      )
    );
    return;
  }

  // stickers.json：贴纸清单，网络优先，拿不到再用缓存
  if (url.pathname.endsWith('stickers.json')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // stickers/ 下的图片：先给缓存里的，同时后台悄悄拉一份新的
  if (url.pathname.includes('/stickers/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // unifont.ttf 体积大，优先缓存
  if (url.pathname.endsWith('unifont.ttf')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // 其他静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'MMM', body: '番茄钟完成！' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      vibrate: [200, 100, 200]
    })
  );
});
