/* Service worker — يخزّن العرض كاملًا (الصور، الخطوط، الفيديو) ليعمل بدون إنترنت
   ويجعله قابلًا للتثبيت كتطبيق. النسخة: غيّر CACHE_VERSION بعد أي تعديل على الملفات
   حتى يحمّل الزوار النسخة الجديدة. */
const CACHE_VERSION = 'pews-v1';
const CACHE_NAME = CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './fonts/1.ttf',
  './icons/icon-48.png','./icons/icon-72.png','./icons/icon-96.png','./icons/icon-128.png',
  './icons/icon-144.png','./icons/icon-152.png','./icons/icon-180.png','./icons/icon-192.png',
  './icons/icon-192-maskable.png','./icons/icon-256.png','./icons/icon-384.png',
  './icons/icon-512.png','./icons/icon-512-maskable.png','./icons/favicon.ico'
];

// أسماء ملفات الخطوط المحلية (يُبنى القالب من البنية المعروفة)
const FONT_WEIGHTS_BODY = [300,400,500,600,700];
const FONT_WEIGHTS_DISPLAY = [400,500,700,800,900];
FONT_WEIGHTS_BODY.forEach(function(w){
  CORE_ASSETS.push('./fonts/body-arabic-'+w+'.woff2', './fonts/body-latin-'+w+'.woff2');
});
FONT_WEIGHTS_DISPLAY.forEach(function(w){
  CORE_ASSETS.push('./fonts/display-arabic-'+w+'.woff2', './fonts/display-latin-'+w+'.woff2');
});

// صور العرض
const IMG_NAMES = ['physiology','avpu','form-lt2m','form-2-11m','form-1-4y','form-5-12y','form-gt12y','form-hero','ox6','ox7','ox8','ox9','ox10'];
IMG_NAMES.forEach(function(n){ CORE_ASSETS.push('./img/'+n+'.webp'); });

// الفيديو: نحاول كل الامتدادات المحتملة؛ الملفات غير الموجودة تُتجاهل بصمت
const VIDEO_CANDIDATES = ['./video/video.mp4','./video/video.webm','./video/video.mov','./video/video.m4v'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      var all = CORE_ASSETS.concat(VIDEO_CANDIDATES);
      return Promise.allSettled(all.map(function(url){
        return cache.add(new Request(url, {cache:'reload'})).catch(function(){ /* ملف غير موجود، تجاهل */ });
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // لا نتدخل بطلبات خارجية

  event.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

// يسمح للصفحة بطلب تحديث الفيديو بعد رفعه لاحقًا دون رفع نسخة كاملة جديدة
self.addEventListener('message', function(event){
  if (event.data === 'cache-video'){
    caches.open(CACHE_NAME).then(function(cache){
      VIDEO_CANDIDATES.forEach(function(url){
        fetch(url, {cache:'reload'}).then(function(res){
          if (res && res.ok) cache.put(url, res);
        }).catch(function(){});
      });
    });
  }
});
