// ⚡ بدّل الرقم هنا كل مرة تعمل تحديث للتطبيق
const VERSION = 'kinona-260608-1326';

self.addEventListener('install', e => {
  // لا تفعّل تلقائياً — انتظر حتى يضغط المستخدم "تحديث"
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// المستخدم ضغط "تحديث" → طبّق الـ SW الجديد فوراً
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
