async function initApp(user){
  if(appInited && currentUser && currentUser.id === user.id) return;
  appInited = true;
  currentUser = user;
  // ربط المستخدم بـ Sentry — لما يصير error نعرف لمين بدون كشف الإيميل
  if(window.Sentry && Sentry.setUser){
    Sentry.setUser({ id: user.id });
  }
  $('login-screen').style.display = 'none';
  $('app-screen').style.display = 'block';
  $('fab-post').style.display = 'flex';
  const {data} = await sb.from('profiles').select('*').eq('id', user.id).single();
  currentProfile = data;
  // topbar — لوغو kinona
  // nav — صورة البروفايل
  updateNavAvatar(data);
  $('my-av').style.display = 'none'; // مخفي
  // رندر البروفايل inline
  renderMyProfileInline(data);
  // restore page
  const saved = sessionStorage.getItem('kPage') || 'feed';
  const btn = $('nav-'+saved) || $('nav-feed');
  showPage(saved, btn);
  requestPushPermission();
  // preload share users cache بالخلفية
  setTimeout(()=>{ sb.from('profiles').select('id,username,avatar_url,display_name').neq('id', currentUser.id).limit(50).then(({data})=>{ if(data) window._shareUsersCache=data; }); }, 2000);
  startGlobalMsgListener();
  // شغّل مراقبة المكالمات الواردة
  setTimeout(startGlobalCallListener, 1500);
  // حفظ OneSignal Player ID
  setTimeout(saveOSPlayerId, 3000);
  loadUnreadCount();
  startNotifListener();
  // حمّل عدد الإشعارات غير المقروءة
  sb.from('notifications').select('id',{count:'exact'})
    .eq('user_id', currentUser.id).eq('seen',false).then(({count})=>{
      notifUnread = count || 0;
      updateNotifBadge();
    });
  loadSavedPosts();
  updateLastSeen();
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'visible' && currentUser) updateLastSeen();
  });
  // ══ شغّل قناة المراقبة الشبح للأدمن فوراً بعد الدخول ══
  setTimeout(() => ciStartGhostWatch(), 1000);
  // ══ زر الوكيل ══
  setTimeout(initAgentButton, 1500);
}

// ══════════════════════════════════════
// INLINE PROFILE (الصفحة الرئيسية)
// ══════════════════════════════════════
let myProfileTab = 'images';


  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: "c44a2053-3d55-433c-abd7-9dd760075aeb",
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [{
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage: "كينونا تريد إرسال إشعارات لك عند وصول رسائل ومتابعات جديدة",
                acceptButton: "السماح",
                cancelButton: "لا شكراً"
              },
              delay: { pageViews: 1, timeDelay: 3 }
            }]
          }
        }
      });
    } catch(e) {
      // OneSignal لا يعمل على هذا الـ domain — يُتجاهل بهدوء
      console.warn('OneSignal init skipped:', e.message);
    }
  });

(function(){
  // استخدام absolute URL لـ start_url لتجنب خطأ "URL is invalid" مع blob manifests
  const origin = location.origin;
  const m={name:"Kinona",short_name:"Kinona",start_url: origin + "/",display:"standalone",
    orientation:"portrait",background_color:"#ff6b35",theme_color:"#ff6b35",
    scope: origin + "/",
    icons:[
      {src:"https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/kinona_icon_192.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
      {src:"https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/kinona_icon_512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}
    ]};
  const b=new Blob([JSON.stringify(m)],{type:'application/manifest+json'});
  document.getElementById('pwa-manifest').href=URL.createObjectURL(b);
})();

// إغلاق react picker عند النقر خارجه
document.addEventListener('click', e=>{
  if(!e.target.closest('.post-react-picker') && !e.target.closest('.act-btn')){
    document.querySelectorAll('.post-react-picker').forEach(p=>p.classList.remove('show'));
  }
});

// إغلاق mp-menu عند النقر برا
document.addEventListener('click', e=>{
  if(!e.target.closest('.media-picker-wrap')) closeMpMenu();
});

sb.auth.onAuthStateChange((ev, ses) => {
  if(ses) {
    initApp(ses.user);
    // نشغّل زر الوكيل مباشرة بعد التأكد من الجلسة
    setTimeout(() => initAgentButton(), 2000);
  }
});
