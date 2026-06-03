
// ══════════════════════════════════════
// CINEMA ROOM
// ══════════════════════════════════════
const CINEMA_CHANNEL = 'kinona_cinema_room';
let ciChannel = null;
let ciIsAdmin = false;
let ciViewers = {}; // { userId: { username, avatar_url } }
let ciControlsTimer = null;
let ciIsUnlocked = false;
let ciSyncTimer = null; // مؤقت حفظ الـ currentTime

// ══ قناة الأدمن الشبح — تراقب المشاهدين دائماً في الخلفية ══
let ciGhostChannel = null;

function ciStartGhostWatch(){
  if(!currentUser || currentProfile?.username !== '7r.9') return;
  if(ciGhostChannel) return;

  ciGhostChannel = sb.channel(CINEMA_CHANNEL, {config:{presence:{key: '_ghost_'+currentUser.id}}})
  .on('broadcast', {event:'ci_join'}, ({payload}) => {
    if(payload?.user_id){
      ciViewers[payload.user_id] = { username: payload.username, avatar_url: payload.avatar_url||null };
      ciUpdateViewers();
    }
  })
  .on('broadcast', {event:'ci_leave'}, ({payload}) => {
    if(payload?.user_id){
      delete ciViewers[payload.user_id];
      ciUpdateViewers();
    }
  })
  .on('broadcast', {event:'ci_ping'}, () => {
    // Ghost لا يرد على ping
  })
  // ── Presence: يلتقط كل اللي داخلين حتى لو فاتنا الـ broadcast ──
  .on('presence', {event:'sync'}, () => {
    const state = ciGhostChannel.presenceState();
    for(const key in state){
      const arr = state[key];
      if(!Array.isArray(arr)) continue;
      arr.forEach(p => {
        const uid = p.user_id || p.id;
        if(uid && !p._ghost && !key.startsWith('_ghost_')){
          ciViewers[uid] = { username: p.username||uid, avatar_url: p.avatar_url||null };
        }
      });
    }
    ciUpdateViewers();
  })
  .on('presence', {event:'join'}, ({newPresences}) => {
    newPresences.forEach(p => {
      const uid = p.user_id || p.id;
      if(uid && !p._ghost && !(p.presence_ref||'').startsWith('_ghost_')){
        ciViewers[uid] = { username: p.username||uid, avatar_url: p.avatar_url||null };
      }
    });
    ciUpdateViewers();
  })
  .on('presence', {event:'leave'}, ({leftPresences}) => {
    leftPresences.forEach(p => {
      const uid = p.user_id || p.id;
      if(uid) delete ciViewers[uid];
    });
    ciUpdateViewers();
  })
  .subscribe(async (status) => {
    if(status === 'SUBSCRIBED'){
      // سجّل presence كـ ghost عشان ما يتعد كمشاهد
      await ciGhostChannel.track({ _ghost: true, user_id: currentUser.id });
      setTimeout(() => {
        ciGhostChannel.send({type:'broadcast', event:'ci_ping', payload:{}});
      }, 500);
    }
  });
}

// ── كلمة السر (يخزنها الأدمن في Supabase) ──
async function ciGetPassword(){
  const {data} = await sb.from('cinema_settings').select('value').eq('key','password').single();
  return data?.value || 'kinona2025';
}

async function ciGetTitle(){
  const {data} = await sb.from('cinema_settings').select('value').eq('key','title').single();
  return data?.value || 'سينما كينونا';
}

// ── فتح شاشة القفل ──
// ── Rooms Hub — tap logic ──
let activeRoomId = null;

function roomBubbleTap(e, roomId){
  e.stopPropagation();
  const el = document.getElementById('rb-' + roomId);
  const orbit = document.getElementById('rooms-orbit');

  if(activeRoomId === roomId){
    // ضغطة ثانية → دخول
    if(roomId === 'cinema') openCinemaLock();
    else if(roomId === 'lounge') openLoungeRoom();
    else if(roomId === 'randommatch') openRandomMatchRoom();
    return;
  }

  // ألغِ السابق
  if(activeRoomId){
    const prev = document.getElementById('rb-' + activeRoomId);
    if(prev){ prev.classList.remove('rb-active'); }
  }

  // فعّل الجديد
  el.classList.add('rb-active');
  orbit.classList.add('has-active');
  activeRoomId = roomId;
}

function roomsPageClick(e){
  // ضغط خارج أي فقاعة → إلغاء التحديد
  if(e.target.closest('.room-bubble')) return;
  if(activeRoomId){
    const prev = document.getElementById('rb-' + activeRoomId);
    if(prev) prev.classList.remove('rb-active');
    document.getElementById('rooms-orbit').classList.remove('has-active');
    activeRoomId = null;
  }
}

function openCinemaLock(){
  document.querySelector('.bottom-nav')?.style.setProperty('display','none','important');
  if(ciIsUnlocked){ openCinemaRoom(); return; }
  $('cinema-lock').style.display = 'flex';
  $('cinema-pw-input').value = '';
  $('cinema-lock-err').textContent = '';
  setTimeout(()=> $('cinema-pw-input').focus(), 300);
}

function ciCloseLock(){
  $('cinema-lock').style.display = 'none';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
}

function ciCloseLock(){
  $('cinema-lock').style.display = 'none';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
}

function ciClearErr(){ $('cinema-lock-err').textContent = ''; }

async function ciCheckPassword(){
  const input = $('cinema-pw-input').value.trim();
  if(!input){ $('cinema-lock-err').textContent = 'أدخل كلمة السر'; return; }
  const btn = document.querySelector('.cinema-lock-btn');
  btn.textContent = '...'; btn.disabled = true;

  try {
    // الأدمن: كلمة سره ثابتة في الكود
    const ADMIN_PASS = 'yones1996cv';
    if(input === ADMIN_PASS){
      ciIsAdmin = true;
      ciIsUnlocked = true;
      $('cinema-lock').style.display = 'none';
      await openCinemaRoom();
      btn.textContent = 'دخول'; btn.disabled = false;
      return;
    }
    // المشاهدون: كلمة السر من الـ DB
    const pw = await ciGetPassword();
    if(input === pw){
      ciIsAdmin = false;
      ciIsUnlocked = true;
      $('cinema-lock').style.display = 'none';
      await openCinemaRoom();
    } else {
      $('cinema-lock-err').textContent = '❌ كلمة السر غلط';
      const box = $('cinema-pw-input');
      box.style.borderColor = 'rgba(255,65,108,.8)';
      setTimeout(()=>{ box.style.borderColor = ''; }, 1000);
    }
  } catch(e){
    $('cinema-lock-err').textContent = 'خطأ في الاتصال، حاول مجدداً';
  }
  btn.textContent = 'دخول'; btn.disabled = false;
}

// ── فتح غرفة السينما ──
async function openCinemaRoom(){
  const room = $('cinema-room');
  room.classList.add('show');
  document.body.style.overflow = '';

  // أظهر زر الأدمن
  $('ci-admin-toggle').style.display = ciIsAdmin ? 'flex' : 'none';

  // عنوان الفيلم (اختياري)
  const title = await ciGetTitle();
  const titleEl = $('ci-title');
  if(titleEl) titleEl.textContent = title;

  // أظهر زر البدء للمستخدم فوراً لضمان إذن المتصفح
  if(!ciIsAdmin){
    const vid = $('cinema-video');
    vid.muted = true;
    // نحاول تشغيل تلقائي صامت — لو فشل نتجاهل
    vid.play().catch(()=>{});
  }

  // اشترك في الـ channel
  ciJoinChannel();

  // جلب رابط الفيلم والـ currentTime المحفوظ
  const [{data:vidData},{data:timeData}] = await Promise.all([
    sb.from('cinema_settings').select('value').eq('key','video_url').single(),
    sb.from('cinema_settings').select('value').eq('key','current_time').single(),
  ]);
  const videoUrl = vidData?.value || 'https://yunes.b-cdn.net/zotopiiiiiiiiiia.mp4';
  const videoTime = parseFloat(timeData?.value || 0);
  ciLoadVideo(videoUrl, videoTime);

  // Leader election: بس شخص واحد يحفظ الوقت في DB
  clearInterval(ciSyncTimer);
  const _leaderId = currentUser.id + '_' + Date.now();
  const _leaderKey = 'ci_leader';

  async function _leaderSave(){
    const vid = $('cinema-video');
    if(!vid.src || !$('cinema-room').classList.contains('show')) return;
    const stored = localStorage.getItem(_leaderKey);
    const now = Date.now();
    const isExpired = !stored || (now - parseInt(stored.split('|')[1] || 0)) > 6000;
    const isMe = stored && stored.startsWith(_leaderId);
    if(ciIsAdmin || isMe || isExpired){
      localStorage.setItem(_leaderKey, _leaderId + '|' + now);
      if(vid.currentTime > 0){
        await sb.from('cinema_settings').upsert({key:'current_time', value: String(Math.floor(vid.currentTime))});
      }
    }
  }

  ciSyncTimer = setInterval(_leaderSave, 3000);

  // لما يطلع من الغرفة، يتخلى عن القيادة
  const _oldExit = window._ciExitHook;
  window._ciExitHook = () => {
    const stored = localStorage.getItem(_leaderKey);
    if(stored && stored.startsWith(_leaderId)) localStorage.removeItem(_leaderKey);
    if(_oldExit) _oldExit();
  };
}



// ── الخروج ──
function ciExit(){
  const room = $('cinema-room');
  room.classList.remove('show');
  room.classList.remove('fullscreen-mode');
  document.body.style.overflow = '';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
  try { if(document.fullscreenElement) document.exitFullscreen(); } catch(e){}
  ciIsUnlocked = false;
  clearInterval(ciSyncTimer);
  ciSyncTimer = null;
  if(window._ciExitHook) window._ciExitHook();
  // أعلن خروجك قبل ما تغلق القناة
  if(ciChannel && !ciIsAdmin){
    ciChannel.send({type:'broadcast', event:'ci_leave', payload:{ user_id: currentUser.id }});
  }
  if(ciChannel){ sb.removeChannel(ciChannel); ciChannel = null; }
  // أوقف الفيديو
  const vid = $('cinema-video');
  vid.pause(); vid.src = '';
  $('cinema-chat-msgs').innerHTML = '';
  // لا نمسح ciViewers إذا القناة الشبح شغالة — هي ستتولى التحديث
  if(!ciGhostChannel) ciViewers = {};
  $('cinema-admin-panel').classList.remove('show');
}

