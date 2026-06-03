// ══════════════════════════════════════
// BACK NAVIGATION — زر الرجوع يغلق النوافذ
// ══════════════════════════════════════
const backCloseMap = [
  { check: () => $('block-modal')?.classList.contains('show'),              close: closeBlockModal },
  { check: () => $('follow-modal')?.classList.contains('show'),             close: closeFollowModal },
  { check: () => $('cinema-admin-panel')?.classList.contains('show'),       close: () => $('cinema-admin-panel').classList.remove('show') },
  { check: () => document.getElementById('admin-cinema-modal')?.style.display === 'flex', close: closeAdminCinemaModal },
  { check: () => $('sticker-overlay')?.classList.contains('show'),          close: closeStickerPicker },
  { check: () => $('img-confirm-overlay')?.classList.contains('show'),      close: cancelImgSend },
  { check: () => $('post-opt-overlay')?.classList.contains('show'),         close: closePostOpts },
  { check: () => $('chatlist-opt-overlay')?.classList.contains('show'),     close: closeChatListOpts },
  { check: () => $('chat-opt-overlay')?.classList.contains('show'),         close: closeChatOpts },
  { check: () => $('mp-menu')?.classList.contains('show'),                  close: closeMpMenu },
  { check: () => $('msg-pick-overlay')?.classList.contains('show'),         close: closeMsgPick },
  { check: () => $('avatar-pick-overlay')?.classList.contains('show'),      close: closeAvatarPick },
  { check: () => $('media-pick-overlay')?.classList.contains('show'),       close: closeMediaPick },
  { check: () => $('comments-overlay')?.classList.contains('show'),         close: closeComments },
  { check: () => $('np-overlay')?.classList.contains('show') || $('np-overlay')?.style.display === 'flex', close: closeNewPost },
  { check: () => $('edit-profile-overlay')?.classList.contains('show'),     close: closeEditProfile },
  { check: () => $('cinema-lock')?.style.display === 'flex',                close: ciCloseLock },
  { check: () => $('cinema-room')?.classList.contains('show'),              close: ciExit },
  { check: () => $('post-viewer')?.classList.contains('show'),              close: closePostViewer },
  { check: () => document.getElementById('admin-cinema-page')?.style.display === 'flex', close: closeAdminPage },
  { check: () => $('profile-view')?.style.display === 'flex',               close: () => {
    closeProfile();
    // إذا رجعنا للشات من البروفايل، أضف history state إضافي للشات
    if(profileOpenedFromChat) history.pushState({k:1}, '');
  }},
  { check: () => $('vip-age-gate')?.style.display === 'flex',               close: vipAgeReject },
  { check: () => $('vip-lock')?.style.display === 'flex',                   close: vipCloseLock },
  { check: () => $('vip-room')?.style.display === 'block',                  close: vipClose },
  { check: () => $('chat-view')?.style.display === 'flex',                  close: closeChat },
];

function handleBackGesture(){
  for(const item of backCloseMap){
    try { if(item.check()){ item.close(); return true; } } catch(e){}
  }
  return false;
}

window.addEventListener('popstate', () => {
  const handled = handleBackGesture();
  if(handled) history.pushState({k:1}, '');
});

window.addEventListener('load', () => {
  history.pushState({k:1}, '');
});

if('serviceWorker' in navigator){
  // إنشاء Service Worker مباشرة من الذاكرة — لا حاجة لملف sw.js على السيرفر
  const swCode = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => new Response('', {status:503}))));
`;
  const swBlob = new Blob([swCode], {type: 'application/javascript'});
  const swUrl  = URL.createObjectURL(swBlob);

  navigator.serviceWorker.register(swUrl).then(reg => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
          showUpdateBanner();
        }
      });
    });
    setInterval(() => reg.update(), 60000);
  }).catch(() => {/* blob SW غير مدعوم — نتجاهل بهدوء */});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
