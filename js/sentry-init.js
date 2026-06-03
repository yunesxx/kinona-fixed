(function(){
  if(!window.Sentry) return;
  const DSN = window.__SENTRY_DSN__ || 'https://9a5aae53bb6e97d5bfffd9f91a1668a6@o4511482464174080.ingest.de.sentry.io/4511482485080144';
  if(!DSN){ console.warn('[Sentry] DSN غير معيّن'); return; }
  Sentry.init({
    dsn: DSN,
    environment: location.hostname === 'localhost' ? 'dev' : 'prod',
    release: 'kinona@' + (window.__APP_VERSION__ || '1.0.0'),
    tracesSampleRate: 0.1,  // 10% من الـ transactions لـ performance
    replaysSessionSampleRate: 0,   // ما نسجّل جلسات عشوائية
    replaysOnErrorSampleRate: 0.2, // 20% من جلسات الأخطاء (نسخة فيديو للـ DOM)
    // فلترة معلومات حساسة قبل الإرسال
    beforeSend(event){
      // ما نبعت كلمات السر أو الـ tokens
      if(event.request && event.request.headers){
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
      }
      return event;
    },
    // تجاهل أخطاء extensions و third-party scripts
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'Network request failed',
      /chrome-extension/i,
      /moz-extension/i
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i
    ]
  });
  console.log('[Sentry] جاهز');
})();
