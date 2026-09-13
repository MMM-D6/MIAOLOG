// MMM (ADHD RPG) — Service Worker v16
// v16: 修复调字色时取色器一动就关掉的问题（选色行不再整段重建，可以按住来回拖）
// v15: 任务页的 tag 栏默认展开（🏷️ 变成收起/展开）；
//      tag 可以长按拖动调整前后位置，换行后上下排也能拖；
//      新建/编辑 tag 时字体颜色也能单独设，默认仍是跟着底色自动配黑白
// v14: 任务栏的「＋新状态」改叫「＋ tag」；
//      抽选卡片上可以直接改这条 Log 的内容、直接加/去 tag，不用回列表里往下翻；
//      新增导出：把 tag 和它绑定的 Log 一起导出成 .txt / .json 或复制到剪贴板
// v13: 任务卡上不再挂状态标签，状态地图收进任务页顶部的状态管理栏；
//      点状态在任务栏当场弹抽选框，不再跳去 Log；
//      新建/编辑状态改成弹窗（颜色 16 色＋自定义、字号、字体、实时预览）；
//      标签后面的 ✕ 去掉，改成右键菜单（写一条 / 编辑 / 删除）；各处说明文字精简
// v12: 任务的标签改成「状态地图」——任务卡上的色块点一下就抽一条同状态下写过的 Log；
//      一个任务可挂多个状态、浮层里搜索/新建/取下，调色板扩到 16 色；
//      状态与 Log 的绑定只读 Log 不写 Log，删除状态不影响 Log 的正文和标签；
//      随机回溯的点赞和「再抽一条」挪到一起；扩展里失效的内置链接删掉
// v11: 导入 Log 的条目改成跟手写 Log 一致的样式（无标签、来源信息淡化置底）；
//      标记去掉勾选框改成一键导入；新增「复制记录」把整条任务导出到剪贴板
// v10: 手动清空改成「勾选+打字确认」的清理弹窗，不好误触；
//      修复跨设备同步会把已清空任务并回来的问题（Log 永远只增不减）
// v9: 任务区支持「清空任务、重新开始」——手动一键清空，也可设置每天/每周/每月自动清空；
//     清空前会自动把还没导入 Log 的时间轴标记补导入，Log 里的数据完全不受影响
// v8: 任务卡新增「专注模式」大屏；进度条标记改用百分比定格（不再随目标时长漂移）；
//     标记图标可从贴纸库自定义；贴纸库重构成「总库 + 各柜子分配」，支持随时改名、拖拽分配
// v7: 任务卡进度条加大，内嵌时间轴打点（目标时长 × 自我觉察），
//     标记可单条/批量导入 Log
// v6: 配合贴纸库
//     - stickers.json 清单改成网络优先，仓库里新加的贴纸提交后立刻能看到
//     - stickers/ 下的图片走「先用缓存、同时后台更新」，既快又不会长期过期
// v5: 适配重构后的主程序（移除甘特图/Toolkit/英语卡片，新增 BOX 栏）
//     修复：v4 中 STATIC_ASSETS 引用了不存在的 icons/ 文件，
//     导致 cache.addAll 整体失败、Service Worker 无法安装；
//     修复：index.html 离线回退之前从未真正入缓存，离线时无法打开
const CACHE_NAME = 'adhd-rpg-v16';

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
