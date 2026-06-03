// ══════════════════════════════════════
// VIP ROOM — غرفة خاصة بكلمة سر من الأدمن + شات +18
// ══════════════════════════════════════

const VIP_CHANNEL = 'kinona_vip_room';
let vipIsUnlocked = false;
let vipChannel = null;
let vipOnline = {};
let _vipPendingOpen = false;

async function vipGetPassword(){
  const {data} = await sb.from('cinema_settings').select('value').eq('key','vip_password').maybeSingle();
  return data?.value || null;
}

function openVipLock(){
  document.querySelector('.bottom-nav')?.style.setProperty('display','none','important');
  if(vipIsUnlocked){ vipStartEntry(); return; }
  const lock = document.getElementById('vip-lock');
  lock.style.display = 'flex';
  const inp = document.getElementById('vip-pw-input');
  inp.value = '';
  document.getElementById('vip-lock-err').textContent = '';
  setTimeout(()=> inp.focus(), 300);
}

function vipCloseLock(){
  document.getElementById('vip-lock').style.display = 'none';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
}

function vipClearErr(){
  document.getElementById('vip-lock-err').textContent = '';
}

async function vipCheckPassword(){
  const input = document.getElementById('vip-pw-input').value.trim();
  if(!input){ document.getElementById('vip-lock-err').textContent = 'أدخل كلمة السر'; return; }
  const btn = document.querySelector('.vip-lock-btn');
  btn.textContent = '...'; btn.disabled = true;

  try {
    const ADMIN_PASS = 'yones1996cv';
    if(input === ADMIN_PASS){
      vipIsUnlocked = true;
      vipCloseLock();
      vipStartEntry();
      return;
    }
    const pw = await vipGetPassword();
    if(pw && input === pw){
      vipIsUnlocked = true;
      vipCloseLock();
      vipStartEntry();
    } else {
      document.getElementById('vip-lock-err').textContent = pw ? 'كلمة السر خاطئة' : 'لم يتم تعيين كلمة سر بعد';
    }
  } catch(e){
    console.error('vipCheckPassword:', e);
    document.getElementById('vip-lock-err').textContent = 'حدث خطأ — حاول ثانية';
  } finally {
    btn.textContent = '👑 دخول الغرفة';
    btn.disabled = false;
  }
}

// تحقق عمر +18 — مرة واحدة لكل جهاز
function vipStartEntry(){
  const accepted = localStorage.getItem('vip_age_accepted') === '1';
  if(accepted){ openVipRoom(); return; }
  _vipPendingOpen = true;
  document.getElementById('vip-age-gate').style.display = 'flex';
}

function vipAgeAccept(){
  localStorage.setItem('vip_age_accepted', '1');
  document.getElementById('vip-age-gate').style.display = 'none';
  if(_vipPendingOpen){ _vipPendingOpen = false; openVipRoom(); }
}

function vipAgeReject(){
  _vipPendingOpen = false;
  document.getElementById('vip-age-gate').style.display = 'none';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
}

function openVipRoom(){
  document.querySelector('.bottom-nav')?.style.setProperty('display','none','important');
  document.getElementById('vip-room').style.display = 'block';
  document.getElementById('vip-msgs').innerHTML = '';
  vipJoinChannel();
}

function vipClose(){
  document.getElementById('vip-room').style.display = 'none';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
  vipLeaveChannel();
}

// ══════════════════════
// Realtime channel
// ══════════════════════
function vipJoinChannel(){
  if(vipChannel) vipLeaveChannel();
  vipChannel = sb.channel(VIP_CHANNEL, {
    config: { presence: { key: currentUser.id } }
  })
  .on('broadcast', {event:'vip_msg'}, ({payload}) => {
    if(!payload?.uid || payload.uid === currentUser.id) return;
    if(payload.media_url) vipRenderMedia(payload, false);
    else vipRenderMsg(payload, false);
    vipBumpActivity(payload.media_url ? 2 : 1);
  })
  .on('broadcast', {event:'vip_react'}, ({payload}) => {
    if(payload?.uid === currentUser.id) return;
    vipShowFlyEmoji(payload.emoji);
    vipBumpActivity();
  })
  .on('broadcast', {event:'vip_sys'}, ({payload}) => {
    if(payload?.text) vipAppendSys(payload.text);
  })
  .on('presence', {event:'sync'}, () => {
    const state = vipChannel.presenceState();
    vipOnline = {};
    for(const k in state){
      (state[k]||[]).forEach(p => {
        const uid = p.user_id || p.id;
        if(uid) vipOnline[uid] = {username:p.username||uid, avatar_url:p.avatar_url||null};
      });
    }
    vipUpdateOnlineCount();
  })
  .on('presence', {event:'join'}, ({newPresences}) => {
    newPresences.forEach(p => {
      const uid = p.user_id || p.id;
      if(uid && uid !== currentUser.id){
        vipOnline[uid] = {username:p.username||uid, avatar_url:p.avatar_url||null};
        vipAppendSys((p.username||'مستخدم') + ' انضم 👑');
      }
    });
    vipUpdateOnlineCount();
  })
  .on('presence', {event:'leave'}, ({leftPresences}) => {
    leftPresences.forEach(p => {
      const uid = p.user_id || p.id;
      if(uid && vipOnline[uid]){
        const name = vipOnline[uid].username;
        delete vipOnline[uid];
        vipAppendSys(name + ' غادر');
      }
    });
    vipUpdateOnlineCount();
  })
  .subscribe(status => {
    if(status !== 'SUBSCRIBED') return;
    vipChannel.track({
      user_id: currentUser.id,
      username: currentProfile?.username || 'guest',
      avatar_url: currentProfile?.avatar_url || null
    });
    vipOnline[currentUser.id] = {
      username: currentProfile?.username || 'guest',
      avatar_url: currentProfile?.avatar_url || null
    };
    vipUpdateOnlineCount();
  });
}

function vipLeaveChannel(){
  if(vipChannel){
    try { sb.removeChannel(vipChannel); } catch(e){}
    vipChannel = null;
  }
  vipOnline = {};
  vipUpdateOnlineCount();
  // أوقف الاهتزاز
  _vipActivity = [];
  if(_vipShakeTimer){ clearInterval(_vipShakeTimer); _vipShakeTimer = null; }
  vipUpdateShake();
}

function vipUpdateOnlineCount(){
  const el = document.getElementById('vip-online-count');
  if(el) el.textContent = Object.keys(vipOnline).length;
}

// ══════════════════════
// Send / render messages
// ══════════════════════
function vipSendMsg(){
  const inp = document.getElementById('vip-input');
  const text = inp.value.trim();
  if(!text) return;
  inp.value = '';
  const payload = {
    uid: currentUser.id,
    username: currentProfile?.username || 'guest',
    avatar_url: currentProfile?.avatar_url || null,
    text, ts: Date.now()
  };
  vipRenderMsg(payload, true);
  vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
  vipBumpActivity();
}

// ══════════════════════
// رفع صورة / GIF
// ══════════════════════
async function vipUploadMedia(input){
  const file = input.files?.[0];
  input.value = '';
  if(!file) return;
  if(!/^image\//.test(file.type)){ showToast('فقط صور أو GIF'); return; }
  if(file.size > 8 * 1024 * 1024){ showToast('الحجم يتجاوز 8MB'); return; }

  vipShowUploadProgress(true);
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `vip/${currentUser.id}/${Date.now()}.${ext}`;
    const {error} = await sb.storage.from('posts').upload(path, file, {upsert:true, contentType:file.type});
    if(error) throw error;
    const url = sb.storage.from('posts').getPublicUrl(path).data.publicUrl;
    const isGif = file.type === 'image/gif' || ext === 'gif';
    const payload = {
      uid: currentUser.id,
      username: currentProfile?.username || 'guest',
      avatar_url: currentProfile?.avatar_url || null,
      media_url: url, is_gif: isGif, ts: Date.now()
    };
    vipRenderMedia(payload, true);
    vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
    vipBumpActivity(2);
  } catch(e){
    console.error('vipUploadMedia:', e);
    showToast('فشل رفع الصورة');
  } finally {
    vipShowUploadProgress(false);
  }
}

function vipShowUploadProgress(show){
  let bar = document.getElementById('vip-up-progress');
  if(show){
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'vip-up-progress';
      bar.className = 'vip-upload-progress';
      bar.innerHTML = '<span>⬆️ يتم الرفع...</span><div class="upbar"><div class="upbar-fill"></div></div>';
      document.getElementById('vip-room').appendChild(bar);
    }
  } else if(bar) bar.remove();
}

function vipRenderMsg(p, isMine){
  const msgs = document.getElementById('vip-msgs');
  if(!msgs) return;
  const wrap = document.createElement('div');
  wrap.className = 'vip-msg ' + (isMine ? 'mine' : '');

  const av = document.createElement('div');
  av.className = 'vip-msg-av';
  av.innerHTML = p.avatar_url
    ? '<img src="'+escHtml(p.avatar_url)+'" loading="lazy">'
    : (p.username||'?')[0].toUpperCase();

  const body = document.createElement('div');
  body.className = 'vip-msg-body';
  if(!isMine){
    const name = document.createElement('div');
    name.className = 'vip-msg-name';
    name.textContent = p.username || '?';
    body.appendChild(name);
  }
  const bub = document.createElement('div');
  bub.className = 'vip-msg-bubble';
  bub.textContent = p.text;
  body.appendChild(bub);

  wrap.appendChild(av);
  wrap.appendChild(body);
  msgs.appendChild(wrap);

  while(msgs.children.length > 80) msgs.removeChild(msgs.firstChild);
  msgs.scrollTop = msgs.scrollHeight;
}

let _vipStageTimer = null;
function vipRenderMedia(p, isMine){
  const stage = document.getElementById('vip-media-stage');
  if(!stage) return;

  // أزل الصورة السابقة فوراً
  stage.querySelectorAll('.vip-stage-item').forEach(el => el.remove());
  if(_vipStageTimer){ clearTimeout(_vipStageTimer); _vipStageTimer = null; }

  const item = document.createElement('div');
  item.className = 'vip-stage-item';

  // اسم المرسل
  const sender = document.createElement('div');
  sender.className = 'vip-stage-sender';
  const av = document.createElement('div');
  av.className = 'vmav';
  av.innerHTML = p.avatar_url
    ? '<img src="'+escHtml(p.avatar_url)+'">'
    : (p.username||'?')[0].toUpperCase();
  const name = document.createElement('span');
  name.textContent = p.username || '?';
  sender.appendChild(av);
  sender.appendChild(name);
  item.appendChild(sender);

  if(p.is_gif){
    const tag = document.createElement('div');
    tag.className = 'vip-stage-gif-tag';
    tag.textContent = 'GIF';
    item.appendChild(tag);
  }

  const img = document.createElement('img');
  img.src = p.media_url;
  img.loading = 'eager';
  item.appendChild(img);

  stage.appendChild(item);

  // اختفاء بعد 10 ثواني (مدة معقولة قبل ما الصورة تروح)
  _vipStageTimer = setTimeout(() => {
    item.classList.add('fading');
    setTimeout(() => item.remove(), 500);
    _vipStageTimer = null;
  }, 10000);
}

function vipAppendSys(text){
  const msgs = document.getElementById('vip-msgs');
  if(!msgs) return;
  const el = document.createElement('div');
  el.className = 'vip-msg-sys';
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

// ══════════════════════
// اهتزاز السرير حسب نشاط الشات
// ══════════════════════
let _vipActivity = [];   // طوابع زمنية للرسائل الأخيرة
let _vipShakeTimer = null;

function vipBumpActivity(weight = 1){
  const now = Date.now();
  for(let i=0; i<weight; i++) _vipActivity.push(now);
  vipUpdateShake();
  // ابدأ مؤقت تحديث/تبريد دوري
  if(!_vipShakeTimer){
    _vipShakeTimer = setInterval(() => {
      const cutoff = Date.now() - 15000; // نافذة 15 ثانية
      _vipActivity = _vipActivity.filter(t => t > cutoff);
      vipUpdateShake();
      if(_vipActivity.length === 0){
        clearInterval(_vipShakeTimer);
        _vipShakeTimer = null;
      }
    }, 1500);
  }
}

function vipUpdateShake(){
  const bed = document.querySelector('#vip-room .vip-bed');
  if(!bed) return;
  const n = _vipActivity.length;
  let level = 0, speed = 0, amp = 0, deg = 0;
  if(n >= 1 && n <= 3)        { level = 1; speed = 1.6; amp = 3;  deg = 0.5; }
  else if(n >= 4 && n <= 8)   { level = 2; speed = 1.0; amp = 6;  deg = 1.2; }
  else if(n >= 9)             { level = 3; speed = 0.55; amp = 11; deg = 2.2; }

  if(level === 0){
    bed.classList.add('no-shake');
    bed.style.setProperty('--vip-shake-speed','0s');
    bed.style.setProperty('--vip-shake-amp','0px');
    bed.style.setProperty('--vip-shake-deg','0deg');
    bed.removeAttribute('data-shake-level');
  } else {
    bed.classList.remove('no-shake');
    bed.style.setProperty('--vip-shake-speed', speed + 's');
    bed.style.setProperty('--vip-shake-amp',   amp + 'px');
    bed.style.setProperty('--vip-shake-deg',   deg + 'deg');
    bed.setAttribute('data-shake-level', String(level));
  }
}

// ══════════════════════
// Flying reactions
// ══════════════════════
function vipSendReaction(emoji){
  vipShowFlyEmoji(emoji);
  vipChannel?.send({type:'broadcast', event:'vip_react', payload:{uid:currentUser.id, emoji}});
  vipBumpActivity();
}

function vipShowFlyEmoji(emoji){
  const layer = document.getElementById('vip-fly-layer');
  if(!layer) return;
  const count = 3 + Math.floor(Math.random()*3);
  for(let i=0; i<count; i++){
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'vip-fly-emoji';
      el.textContent = emoji;
      el.style.left = (5 + Math.random()*90) + '%';
      el.style.bottom = (40 + Math.random()*10) + '%';
      layer.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }, i * 120);
  }
}

// ══════════════════════
// تغيير كلمة السر من لوحة الأدمن
// ══════════════════════
async function acpChangeVipPw(){
  const inp = document.getElementById('acp-vip-pw');
  const pw = inp.value.trim();
  if(!pw || pw.length < 3){ showToast('كلمة السر قصيرة'); return; }
  const {error} = await sb.from('cinema_settings')
    .upsert({key:'vip_password', value:pw}, {onConflict:'key'});
  if(error){
    console.error('acpChangeVipPw:', error);
    showToast('فشل الحفظ: ' + (error.message || 'خطأ'));
    return;
  }
  const {data:check} = await sb.from('cinema_settings').select('value').eq('key','vip_password').maybeSingle();
  if(!check || check.value !== pw){
    showToast('لم تُحفظ — تحقق من صلاحيات DB');
    return;
  }
  inp.value = '';
  showToast('تم تغيير كلمة سر VIP ✓');
}

// ══ توسعة roomBubbleTap لتشمل VIP ══
(function(){
  const orig = window.roomBubbleTap;
  window.roomBubbleTap = function(e, roomId){
    if(roomId === 'vip'){
      e.stopPropagation();
      const el = document.getElementById('rb-vip');
      const orbit = document.getElementById('rooms-orbit');
      if(activeRoomId === 'vip'){ openVipLock(); return; }
      if(activeRoomId){
        const prev = document.getElementById('rb-' + activeRoomId);
        if(prev) prev.classList.remove('rb-active');
      }
      el.classList.add('rb-active');
      orbit.classList.add('has-active');
      activeRoomId = 'vip';
      return;
    }
    return orig.call(this, e, roomId);
  };
})();
