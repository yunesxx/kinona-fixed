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
  document.body.classList.add('vip-open');
  document.getElementById('vip-msgs').innerHTML = '';
  vipJoinChannel();
}

// ══════════════════════
// لا تتبّع للكيبورد هنا — utils.js يضبط --kb على :root من visualViewport،
// و CSS بيستخدمها عبر `.vip-chat { bottom: var(--kb) }`.
// (نفس آلية #chat-view الأصلي بالضبط)
// ══════════════════════

function vipClose(){
  document.getElementById('vip-room').style.display = 'none';
  document.body.classList.remove('vip-open');
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
    if(payload.is_sticker)         vipRenderSticker(payload, false);
    else if(payload.media_url)     vipRenderMedia(payload, false);
    else                            vipRenderMsg(payload, false);
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
  document.getElementById('vip-send-btn')?.classList.add('hidden');
  // خلي الكيبورد ثابت — لا تترك الـ input لئلا يقفل الكيبورد
  inp.focus();
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
// ستيكر / GIF — نعيد استخدام منتقي المحادثة العام مع تحويل
// الإرسال إلى قناة VIP بدل قاعدة البيانات
// ══════════════════════
let _vipPickerSavedEmoji = null;
let _vipPickerSavedImg   = null;
function vipOpenStickerPicker(){
  if(typeof openStickerPicker !== 'function') return;
  // احفظ الدوال الأصلية وحوّلها إلى نسخ VIP
  _vipPickerSavedEmoji = window.sendSticker;
  _vipPickerSavedImg   = window.sendImgSticker;
  window.sendSticker    = vipSendSticker;
  window.sendImgSticker = vipSendImgSticker;
  openStickerPicker();
  // راقب إغلاق المنتقي لاسترجاع الدوال
  const ov = document.getElementById('sticker-overlay');
  if(ov){
    const obs = new MutationObserver(() => {
      if(!ov.classList.contains('show')){
        if(_vipPickerSavedEmoji) window.sendSticker    = _vipPickerSavedEmoji;
        if(_vipPickerSavedImg)   window.sendImgSticker = _vipPickerSavedImg;
        _vipPickerSavedEmoji = _vipPickerSavedImg = null;
        obs.disconnect();
      }
    });
    obs.observe(ov, { attributes:true, attributeFilter:['class'] });
  }
}

function vipSendSticker(emoji){
  if(typeof closeStickerPicker === 'function') closeStickerPicker();
  const payload = {
    uid: currentUser.id,
    username: currentProfile?.username || 'guest',
    avatar_url: currentProfile?.avatar_url || null,
    text: emoji, is_sticker: true, ts: Date.now()
  };
  vipRenderSticker(payload, true);
  vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
  vipBumpActivity();
}

function vipSendImgSticker(url){
  if(typeof closeStickerPicker === 'function') closeStickerPicker();
  const payload = {
    uid: currentUser.id,
    username: currentProfile?.username || 'guest',
    avatar_url: currentProfile?.avatar_url || null,
    media_url: url, is_img_sticker: true, ts: Date.now()
  };
  vipRenderMedia(payload, true);
  vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
  vipBumpActivity();
}

function vipRenderSticker(p, isMine){
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
  const big = document.createElement('div');
  big.className = 'vip-msg-sticker';
  big.textContent = p.text;
  body.appendChild(big);

  wrap.appendChild(av);
  wrap.appendChild(body);
  msgs.appendChild(wrap);
  while(msgs.children.length > 80) msgs.removeChild(msgs.firstChild);
  msgs.scrollTop = msgs.scrollHeight;
}

// ══════════════════════
// رفع صورة / GIF — مع شاشة تأكيد + ضغط
// ══════════════════════
let _vipPendingImgFile = null;
let _vipPendingVidFile = null;
let _vipPendingVidMeta = null;

const VIP_MAX_BATCH = 10;

function vipUploadMedia(input){
  const files = Array.from(input.files || []);
  input.value = '';
  if(!files.length) return;

  // فلتر: فقط صور وحجمها ≤ 20MB
  const valid = files.filter(f => /^image\//.test(f.type) && f.size <= 20*1024*1024);
  const skipped = files.length - valid.length;
  if(!valid.length){ showToast('فقط صور أو GIF (≤20MB)'); return; }

  // قص لأقصى 10 صور
  let batch = valid;
  if(batch.length > VIP_MAX_BATCH){
    showToast(`الحد الأقصى ${VIP_MAX_BATCH} صور — تم تجاهل الباقي`);
    batch = batch.slice(0, VIP_MAX_BATCH);
  } else if(skipped > 0){
    showToast(`تم تجاهل ${skipped} ملف (غير صورة أو >20MB)`);
  }

  // صورة واحدة → معاينة + caption كالعادة
  if(batch.length === 1){
    _vipPendingImgFile = batch[0];
    const prev = document.getElementById('vip-img-confirm-preview');
    if(prev){
      if(prev.dataset.blobUrl){ try{ URL.revokeObjectURL(prev.dataset.blobUrl); }catch(_){} }
      const u = URL.createObjectURL(batch[0]);
      prev.src = u;
      prev.dataset.blobUrl = u;
    }
    const cap = document.getElementById('vip-img-confirm-caption');
    if(cap) cap.value = '';
    document.getElementById('vip-img-confirm-overlay')?.classList.add('show');
    setTimeout(() => cap?.focus(), 300);
    return;
  }

  // دفعة 2-10 صور → ارفع كل واحدة ع التوالي بدون شاشة تأكيد
  vipUploadBatch(batch);
}

async function vipUploadBatch(files){
  vipShowUploadProgress(true, `0/${files.length}`);
  let done = 0, failed = 0;
  for(const file of files){
    try {
      await vipDoImageUpload(file, '');
    } catch(e){
      console.error('vipUploadBatch item:', e);
      failed++;
    }
    done++;
    vipShowUploadProgress(true, `${done}/${files.length}`);
  }
  vipShowUploadProgress(false);
  if(failed > 0) showToast(`فشل رفع ${failed} من ${files.length}`);
}

// منطق رفع صورة واحدة — قابل لإعادة الاستخدام (للوحدة + الدفعة)
async function vipDoImageUpload(file, caption){
  const isGif = file.type === 'image/gif';
  if(!isGif && typeof compressImage === 'function'){
    try { file = await compressImage(file, 1920, 0.85); } catch(_){}
  }
  const ext = isGif ? 'gif' : 'jpg';
  const path = `vip/${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
  const {error} = await sb.storage.from('posts').upload(path, file, {upsert:true, contentType:file.type});
  if(error) throw error;
  const url = sb.storage.from('posts').getPublicUrl(path).data.publicUrl;
  const payload = {
    uid: currentUser.id,
    username: currentProfile?.username || 'guest',
    avatar_url: currentProfile?.avatar_url || null,
    media_url: url, is_gif: isGif, caption: caption || '', ts: Date.now()
  };
  vipRenderMedia(payload, true);
  vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
  vipBumpActivity(2);
}

function vipCancelImgSend(){
  _vipPendingImgFile = null;
  const ov = document.getElementById('vip-img-confirm-overlay');
  if(ov) ov.classList.remove('show');
  const prev = document.getElementById('vip-img-confirm-preview');
  if(prev){
    if(prev.dataset.blobUrl){ try{ URL.revokeObjectURL(prev.dataset.blobUrl); }catch(_){} delete prev.dataset.blobUrl; }
    prev.src = '';
  }
}

async function vipConfirmImgSend(){
  if(!_vipPendingImgFile) return;
  const file = _vipPendingImgFile;
  _vipPendingImgFile = null;
  const caption = document.getElementById('vip-img-confirm-caption')?.value.trim() || '';

  document.getElementById('vip-img-confirm-overlay')?.classList.remove('show');
  const prev = document.getElementById('vip-img-confirm-preview');
  if(prev?.dataset.blobUrl){ try{ URL.revokeObjectURL(prev.dataset.blobUrl); }catch(_){} delete prev.dataset.blobUrl; }

  vipShowUploadProgress(true);
  try { await vipDoImageUpload(file, caption); }
  catch(e){ console.error('vipConfirmImgSend:', e); showToast('فشل رفع الصورة'); }
  finally { vipShowUploadProgress(false); }
}

// ══════════════════════
// رفع فيديو — حد أقصى دقيقة + شاشة تأكيد + Cloudinary
// ══════════════════════
async function vipUploadVideo(input){
  const file = input.files?.[0];
  input.value = '';
  if(!file) return;
  if(!/^video\//.test(file.type)){ showToast('ملف فيديو فقط'); return; }
  if(file.size > 100 * 1024 * 1024){
    showToast(`الحجم كبير جداً (${(file.size/1024/1024).toFixed(1)}MB). الحد 100MB`);
    return;
  }

  // قراءة المدة
  let meta;
  try {
    meta = await getVideoMetadata(file);
  } catch(e){
    showToast('تعذّر قراءة الفيديو');
    return;
  }

  if(!meta.duration || !isFinite(meta.duration)){
    URL.revokeObjectURL(meta.url);
    showToast('فيديو غير صالح');
    return;
  }

  if(meta.duration > 60.5){
    URL.revokeObjectURL(meta.url);
    showToast(`الفيديو ${Math.round(meta.duration)}ث — الحد الأقصى دقيقة`);
    return;
  }

  _vipPendingVidFile = file;
  _vipPendingVidMeta = meta;

  // عرض شاشة التأكيد
  const preview = document.getElementById('vip-vid-confirm-preview');
  const durLbl  = document.getElementById('vip-vid-confirm-duration');
  if(preview){
    preview.src = meta.url;
    preview.muted = true;
    preview.play().catch(()=>{});
  }
  if(durLbl){
    const m = Math.floor(meta.duration/60);
    const s = Math.floor(meta.duration%60).toString().padStart(2,'0');
    durLbl.textContent = `${m}:${s}`;
  }
  const cap = document.getElementById('vip-vid-confirm-caption');
  if(cap) cap.value = '';
  document.getElementById('vip-vid-confirm-overlay')?.classList.add('show');
}

function vipCancelVidSend(){
  if(_vipPendingVidMeta?.url) URL.revokeObjectURL(_vipPendingVidMeta.url);
  _vipPendingVidFile = null;
  _vipPendingVidMeta = null;
  const preview = document.getElementById('vip-vid-confirm-preview');
  if(preview){ preview.pause(); preview.src = ''; }
  document.getElementById('vip-vid-confirm-overlay')?.classList.remove('show');
}

async function vipConfirmVidSend(){
  if(!_vipPendingVidFile || !_vipPendingVidMeta) return;

  const file = _vipPendingVidFile;
  const meta = _vipPendingVidMeta;
  const caption = document.getElementById('vip-vid-confirm-caption')?.value.trim() || '';
  _vipPendingVidFile = null;
  _vipPendingVidMeta = null;

  // أوقف الـ preview واخفي الـ overlay
  const preview = document.getElementById('vip-vid-confirm-preview');
  if(preview){ preview.pause(); preview.src = ''; }
  document.getElementById('vip-vid-confirm-overlay')?.classList.remove('show');

  vipShowUploadProgress(true);
  try {
    // رفع لـ Cloudinary (أسرع وأخف للفيديو من Supabase Storage)
    let _cld;
    try { _cld = await cldUpload(file, null, 'video'); }
    catch(e1){
      try { _cld = await cldUpload(file, null, 'auto'); }
      catch(e2){ throw e2; }
    }

    const url = (typeof cldVid === 'function') ? cldVid(_cld.secure_url) : _cld.secure_url;
    const payload = {
      uid: currentUser.id,
      username: currentProfile?.username || 'guest',
      avatar_url: currentProfile?.avatar_url || null,
      media_url: url, is_video: true, caption, ts: Date.now()
    };
    vipRenderMedia(payload, true);
    vipChannel?.send({type:'broadcast', event:'vip_msg', payload});
    vipBumpActivity(2);
  } catch(e){
    console.error('vipConfirmVidSend:', e);
    showToast('فشل رفع الفيديو');
  } finally {
    URL.revokeObjectURL(meta.url);
    vipShowUploadProgress(false);
  }
}

function vipShowUploadProgress(show, label){
  let bar = document.getElementById('vip-up-progress');
  if(show){
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'vip-up-progress';
      bar.className = 'vip-upload-progress';
      bar.innerHTML = '<span class="vip-up-text">⬆️ يتم الرفع...</span><div class="upbar"><div class="upbar-fill"></div></div>';
      document.getElementById('vip-room').appendChild(bar);
    }
    if(label){
      const t = bar.querySelector('.vip-up-text');
      if(t) t.textContent = `⬆️ يتم الرفع... ${label}`;
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

// عرض الصور/الفيديو داخل قائمة الرسائل كرسالة عادية — بدون stage ولا مؤقت إخفاء
function vipRenderMedia(p, isMine){
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
  bub.className = 'vip-msg-bubble vip-msg-media';

  let mediaEl;
  if(p.is_video){
    mediaEl = document.createElement('video');
    mediaEl.src = p.media_url;
    mediaEl.controls = true;
    mediaEl.playsInline = true;
    mediaEl.preload = 'metadata';
    if(typeof cldVidPoster === 'function'){
      const poster = cldVidPoster(p.media_url, 480);
      if(poster) mediaEl.poster = poster;
    }
  } else {
    mediaEl = document.createElement('img');
    mediaEl.src = p.media_url;
    mediaEl.loading = 'lazy';
  }
  bub.appendChild(mediaEl);

  if(p.caption && p.caption.trim()){
    const capEl = document.createElement('div');
    capEl.className = 'vip-msg-caption';
    capEl.textContent = p.caption;
    bub.appendChild(capEl);
  }

  body.appendChild(bub);
  wrap.appendChild(av);
  wrap.appendChild(body);
  msgs.appendChild(wrap);

  while(msgs.children.length > 80) msgs.removeChild(msgs.firstChild);
  msgs.scrollTop = msgs.scrollHeight;
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
