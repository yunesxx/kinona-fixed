function showPage(p, btn){
  // إخفاء cinema-lock لما نغير الصفحة
  if(p !== 'cinema') $('cinema-lock').style.display = 'none';
  // إعادة تعيين الغرفة المحددة عند الخروج من صفحة الغرف
  if(p !== 'cinema' && activeRoomId){
    const prev = document.getElementById('rb-' + activeRoomId);
    if(prev) prev.classList.remove('rb-active');
    const orbit = document.getElementById('rooms-orbit');
    if(orbit) orbit.classList.remove('has-active');
    activeRoomId = null;
  }

  const currentPage = document.querySelector('.page.active');
  const nextPage = $('page-'+p);

  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  // إخفاء الصفحة الحالية فوراً وإظهار الجديدة — بدون انتظار animation
  document.querySelectorAll('.page').forEach(pg=>pg.classList.remove('active','page-exit'));
  if(nextPage) nextPage.classList.add('active');
  sessionStorage.setItem('kPage', p);
  if(p==='messages'){
    loadChats();
    unreadCount = 0;
    updateBadge();
    localStorage.setItem('lastMsgSeen_'+currentUser.id, new Date().toISOString());
    setTimeout(()=>{ window.scrollTo(0,0); }, 100);
  }
  if(p==='notifs'){
    setTimeout(()=>{ window.scrollTo(0,0); }, 100);
    loadNotifs();
  }
  if(p==='posts') loadFeed();
  // FAB فقط بصفحة الـ Reels
  $('fab-post').style.display = (p === 'posts') ? 'flex' : 'none';
  // زر الإعدادات فقط في صفحة البروفايل
  $('topbar-settings-wrap').style.display = (p === 'feed') ? 'block' : 'none';
  // إخفاء الـ topbar في الـ Reels (وضع immersive كامل)
  document.body.classList.toggle('reels-mode', p === 'posts');
  // TODO: غيّر 'feed' إلى اسم الصفحة الصحيحة إذا لزم
}

// ══════════════════════════════════════
// NEW POST
// ══════════════════════════════════════
