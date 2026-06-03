// ══════════════════════════════════════
let lastSeenTimer = 0;
async function updateLastSeen(){
  if(!currentUser) return;
  const now = Date.now();
  if(now - lastSeenTimer < 30000) return; // تجاهل لو أقل من 30 ثانية
  lastSeenTimer = now;
  sb.from('profiles').update({last_seen: new Date().toISOString()}).eq('id', currentUser.id).then(()=>{});
}

function formatLastSeen(ts){
  if(!ts) return 'لم يظهر بعد';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if(diff < 120) return 'متصل الآن 🟢';
  if(diff < 3600) return `آخر ظهور منذ ${Math.floor(diff/60)} دقيقة`;
  if(diff < 86400) return `آخر ظهور منذ ${Math.floor(diff/3600)} ساعة`;
  if(diff < 604800) return `آخر ظهور منذ ${Math.floor(diff/86400)} يوم`;
  return `آخر ظهور منذ فترة`;
}

// ══════════════════════════════════════
// NOTIFICATIONS SYSTEM
// ══════════════════════════════════════
let globalMsgChannel = null;
let unreadCount = 0;
const unreadPerChat = {}; // { userId: count }
let notifSender = null; // { id, username, avatar_url } of last notif sender
let notifHideTimer = null;

// طلب إذن Push Notification
async function requestPushPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted') return;
  if(Notification.permission === 'denied'){
    // مرفوضة — أظهر زر يدوي
    showNotifBtn();
    return;
  }
  // default — اطلب بعد تأخير بسيط
  setTimeout(async () => {
    const perm = await Notification.requestPermission();
    if(perm === 'granted'){
      showToast('🔔 الإشعارات مفعّلة');
      hideNotifBtn();
    } else {
      showNotifBtn();
    }
  }, 2000);
}

function showNotifBtn(){
  if($('notif-enable-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'notif-enable-btn';
  btn.title = 'تفعيل الإشعارات';
  btn.style.cssText = 'background:none;border:none;cursor:pointer;padding:6px;color:#ff6b35;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s;';
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23" stroke="#ff416c"/></svg>`;
  btn.onclick = async () => {
    const perm = await Notification.requestPermission();
    if(perm === 'granted'){ showToast('🔔 الإشعارات مفعّلة'); hideNotifBtn(); }
    else showToast('اسمح بالإشعارات من إعدادات المتصفح');
  };
  const icons = document.querySelector('.topbar-icons');
  if(icons) icons.prepend(btn);
}

function hideNotifBtn(){
  const btn = $('notif-enable-btn');
  if(btn) btn.remove();
}

// مستمع عالمي للرسائل الجديدة (خارج المحادثة)

// إرسال broadcast لصندوق الوارد للمستلم
// cache للـ channels المفتوحة
const _inboxChannels = {};

