// ══════════════════════════════════════
// LOUNGE ROOM — نقطة التجمع (نسخة محسّنة)
// ══════════════════════════════════════
const LOUNGE_CHANNEL = 'kinona_lounge_room';
let lgChannel = null;
let lgOnline   = {};

// ══ Cache الـ Cosmetics — مرة وحدة لكل يوزر ══
const _lgCosmeticsCache = {};

async function _lgGetCosmetics(uid) {
  if (_lgCosmeticsCache[uid] !== undefined) return _lgCosmeticsCache[uid];
  const { data } = await sb.from('user_cosmetics')
    .select('type,value')
    .eq('user_id', uid)
    .gt('expires_at', new Date().toISOString());
  const map = {};
  (data || []).forEach(c => { map[c.type] = c.value; });
  _lgCosmeticsCache[uid] = map;
  return map;
}
function _lgClearCache(uid) { delete _lgCosmeticsCache[uid]; }

// ══ الهدايا ══
const LOUNGE_GIFTS = [
  { id: 'rose',    emoji: '🌹', label: 'وردة',    cost: 5   },
  { id: 'heart',   emoji: '💖', label: 'قلب',      cost: 10  },
  { id: 'fire',    emoji: '🔥', label: 'نار',      cost: 8   },
  { id: 'star',    emoji: '⭐', label: 'نجمة',     cost: 15  },
  { id: 'rocket',  emoji: '🚀', label: 'صاروخ',    cost: 20  },
  { id: 'crown',   emoji: '👑', label: 'تاج',      cost: 30  },
  { id: 'diamond', emoji: '💎', label: 'ماسة',     cost: 50  },
  { id: 'unicorn', emoji: '🦄', label: 'يونيكورن', cost: 100 },
];

// ══════════════════════
// فتح / خروج
// ══════════════════════
async function openLoungeRoom() {
  document.getElementById('lounge-room').classList.add('show');
  document.body.style.overflow = 'hidden';
  document.querySelector('.bottom-nav')?.style.setProperty('display','none','important');
  if (!lgChannel) lgJoinChannel();
}

function loungeExit() {
  lgHideMsgMenu();
  document.getElementById('lounge-gift-picker')?.remove();
  document.getElementById('lounge-room').classList.remove('show');
  document.body.style.overflow = '';
  document.querySelector('.bottom-nav')?.style.removeProperty('display');
  if (lgChannel) {
    lgChannel.send({ type: 'broadcast', event: 'lg_leave',
      payload: { user_id: currentUser.id } }).catch(() => {});
    sb.removeChannel(lgChannel);
    lgChannel = null;
  }
  lgOnline = {};
  _lgRenderPresenceBar();
}

// ══════════════════════
// الاتصال
// ══════════════════════
function lgJoinChannel() {
  lgChannel = sb.channel(LOUNGE_CHANNEL, {
    config: { presence: { key: currentUser.id } }
  })
  .on('broadcast', { event: 'lg_msg' }, ({ payload }) => {
    if (payload?.uid && payload.uid !== currentUser.id) _lgRenderMsgFast(payload, false);
  })
  .on('broadcast', { event: 'lg_gift' }, ({ payload }) => {
    lgShowGiftAnimation(payload);
  })
  .on('broadcast', { event: 'lg_join' }, async ({ payload }) => {
    if (!payload?.user_id || payload.user_id === currentUser.id) return;
    const isNew = !lgOnline[payload.user_id];
    lgOnline[payload.user_id] = { username: payload.username, avatar_url: payload.avatar_url || null };
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
    if (isNew) {
      lgAppendSys(payload.username + ' انضم 👋');
      // ── الظهور السينمائي ──
      const c = await _lgGetCosmetics(payload.user_id);
      if (c?.cinematic_gift && typeof triggerCinematicEntrance === 'function') {
        triggerCinematicEntrance(payload.avatar_url || null, payload.username, c.cinematic_gift);
      }
    }
  })
  .on('broadcast', { event: 'lg_leave' }, ({ payload }) => {
    if (!payload?.user_id) return;
    const name = lgOnline[payload.user_id]?.username;
    delete lgOnline[payload.user_id]; _lgClearCache(payload.user_id);
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
    if (name) lgAppendSys(name + ' غادر');
  })
  .on('presence', { event: 'sync' }, () => {
    const state = lgChannel.presenceState(); lgOnline = {};
    for (const key in state)
      (state[key] || []).forEach(p => { const uid=p.user_id||p.id; if(uid) lgOnline[uid]={username:p.username||uid,avatar_url:p.avatar_url||null}; });
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    newPresences.forEach(p => { const uid=p.user_id||p.id; if(uid) lgOnline[uid]={username:p.username||uid,avatar_url:p.avatar_url||null}; });
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    leftPresences.forEach(p => { const uid=p.user_id||p.id; if(uid){ delete lgOnline[uid]; _lgClearCache(uid); } });
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
  })
  .subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') return;
    // track + broadcast بالتوازي — لا await
    lgChannel.track({ user_id: currentUser.id, username: currentProfile.username, avatar_url: currentProfile.avatar_url||null });
    lgChannel.send({ type:'broadcast', event:'lg_join', payload:{ user_id:currentUser.id, username:currentProfile.username, avatar_url:currentProfile.avatar_url||null } });
    lgOnline[currentUser.id] = { username: currentProfile.username, avatar_url: currentProfile.avatar_url||null };
    _lgRenderPresenceBar(); lgUpdateBubbleSub();
    // ── الظهور السينمائي عند دخول المستخدم نفسه ──
    const myC = await _lgGetCosmetics(currentUser.id);
    if (myC?.cinematic_gift && typeof triggerCinematicEntrance === 'function') {
      triggerCinematicEntrance(currentProfile.avatar_url || null, currentProfile.username, myC.cinematic_gift);
    }
  });
}

// ══════════════════════
// إرسال رسالة — Optimistic UI
// ══════════════════════
function loungeSendMsg() {
  const input = document.getElementById('lounge-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  const payload = { uid: currentUser.id, username: currentProfile.username, avatar_url: currentProfile.avatar_url||null, text, ts: Date.now() };
  _lgRenderMsgFast(payload, true);                                      // عرض فوري
  lgChannel?.send({ type:'broadcast', event:'lg_msg', payload });       // إرسال خلفي
}

// ══════════════════════
// رسم رسالة — sync أولاً + cosmetics بعدين
// ══════════════════════
function _lgRenderMsgFast(p, isMine) {
  const msgs = document.getElementById('lounge-msgs');
  if (!msgs) return;

  const wrap = document.createElement('div');
  wrap.className = 'lounge-msg ' + (isMine ? 'mine' : 'other');
  wrap.dataset.uid = p.uid;

  const avDiv = document.createElement('div');
  avDiv.className = 'lounge-msg-av';
  avDiv.innerHTML = p.avatar_url
    ? '<img src="' + escHtml(p.avatar_url) + '" loading="lazy" alt="">'
    : (p.username||'?').charAt(0).toUpperCase();

  const body = document.createElement('div');
  body.className = 'lounge-msg-body';

  if (!isMine) {
    const nameRow = document.createElement('div');
    nameRow.className = 'lounge-msg-name-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'lounge-msg-name';
    nameEl.textContent = p.username || '?';
    nameRow.appendChild(nameEl);
    body.appendChild(nameRow);
  }

  const bubble = document.createElement('div');
  bubble.className = 'lounge-msg-bubble';
  bubble.textContent = p.text;

  const time = document.createElement('div');
  time.className = 'lounge-msg-time';
  time.textContent = lgFmtTime(p.ts);

  body.appendChild(bubble); body.appendChild(time);
  wrap.appendChild(avDiv);  wrap.appendChild(body);
  lgAttachMsgMenu(wrap, p, isMine);
  msgs.appendChild(wrap);

  while (msgs.children.length > 60) msgs.removeChild(msgs.firstChild);
  lgScrollToBottom();

  // Cosmetics في الخلفية بدون حجب الـ UI
  _lgApplyCosmeticsAsync(wrap, p, isMine, avDiv, body, bubble);
}

async function _lgApplyCosmeticsAsync(wrap, p, isMine, avDiv, body, bubble) {
  const c = await _lgGetCosmetics(p.uid);
  if (!c || !Object.keys(c).length) return;
  if (c.radiance_aura   && typeof applyRadianceAura   === 'function') applyRadianceAura(avDiv, c.radiance_aura);
  if (c.luminous_script && typeof applyLuminousScript === 'function') applyLuminousScript(bubble, c.luminous_script);
  if (c.username_gradient) {
    bubble.style.setProperty('background', c.username_gradient, 'important');
    bubble.style.setProperty('-webkit-background-clip', 'text', 'important');
    bubble.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    bubble.style.setProperty('background-clip', 'text', 'important');
  } else if (c.username_color) {
    bubble.style.setProperty('color', c.username_color, 'important');
    bubble.style.setProperty('-webkit-text-fill-color', c.username_color, 'important');
  }
  if (!isMine) {
    const nameRow = body.querySelector('.lounge-msg-name-row');
    const nameEl  = nameRow?.querySelector('.lounge-msg-name');
    if (!nameRow || !nameEl) return;
    if (c.username_gradient) {
      nameEl.style.background = c.username_gradient;
      nameEl.style.webkitBackgroundClip = 'text';
      nameEl.style.webkitTextFillColor  = 'transparent';
      nameEl.style.backgroundClip = 'text';
    } else if (c.username_color) { nameEl.style.color = c.username_color; }
    if (c.royal_title && !nameRow.querySelector('.lounge-royal-title')) {
      const ts = document.createElement('span'); ts.className='lounge-royal-title'; ts.textContent=c.royal_title; nameRow.appendChild(ts);
    }
    if (c.badge && !nameRow.querySelector('.lounge-badge')) {
      const bs = document.createElement('span'); bs.className='lounge-badge'; bs.textContent=c.badge; nameRow.appendChild(bs);
    }
  }
}

// ══════════════════════
// Presence Bar — sync فوري، cosmetics خلفي
// ══════════════════════
function _lgRenderPresenceBar() {
  const list    = document.getElementById('lounge-presence-list');
  const countEl = document.getElementById('lounge-count-num');
  if (!list) return;
  const users = Object.entries(lgOnline);
  if (countEl) countEl.textContent = users.length;
  if (!users.length) { list.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,.25);">لا أحد هنا بعد...</span>'; return; }
  list.innerHTML = '';
  users.forEach(([uid, info]) => {
    const isMe = uid === currentUser.id;
    const item = document.createElement('div');
    item.className = 'lounge-av'; item.dataset.uid = uid; item.title = info.username||'?';
    const avImg = document.createElement('div');
    avImg.className = 'lounge-av-img';
    avImg.innerHTML = (info.avatar_url ? '<img src="'+escHtml(info.avatar_url)+'" loading="lazy" alt="">' : (info.username||'?').charAt(0).toUpperCase()) + '<div class="lounge-av-online-ring"></div>';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'lounge-av-name'; nameDiv.textContent = isMe ? 'أنت' : (info.username||'?');
    item.appendChild(avImg); item.appendChild(nameDiv); list.appendChild(item);
    _lgApplyPresenceCosmetics(item, uid, avImg);
  });
}
async function _lgApplyPresenceCosmetics(item, uid, avImg) {
  const c = await _lgGetCosmetics(uid);
  if (!c) return;
  if (c.radiance_aura && typeof applyRadianceAura === 'function') applyRadianceAura(avImg, c.radiance_aura);
  if (c.royal_title && !item.querySelector('.lounge-av-title')) {
    const td = document.createElement('div'); td.className='lounge-av-title'; td.textContent=c.royal_title; item.appendChild(td);
  }
}
async function lgUpdatePresence() { _lgRenderPresenceBar(); }

// ══════════════════════
// قائمة الرسالة
// ══════════════════════
let lgMenuTarget=null, lgLongPressTimer=null;

function lgAttachMsgMenu(wrap, p, isMine) {
  const open = (e) => { e.preventDefault(); lgShowMsgMenu(wrap, p, isMine); };
  wrap.addEventListener('touchstart', () => { lgLongPressTimer = setTimeout(() => open({preventDefault:()=>{}}), 480); }, { passive:true });
  wrap.addEventListener('touchend',  () => clearTimeout(lgLongPressTimer));
  wrap.addEventListener('touchmove', () => clearTimeout(lgLongPressTimer));
  wrap.addEventListener('contextmenu', open);
}

function lgShowMsgMenu(wrap, p, isMine) {
  lgHideMsgMenu();
  const menu = document.createElement('div');
  menu.id='lounge-msg-menu'; menu.className='lounge-msg-menu';
  if (!isMine) {
    const gBtn = document.createElement('button'); gBtn.className='lgmm-btn lgmm-gift'; gBtn.textContent='🎁 أرسل هدية';
    gBtn.onclick = () => { lgHideMsgMenu(); lgOpenGiftPicker(p.uid, p.username); };
    menu.appendChild(gBtn);
  }
  const cBtn = document.createElement('button'); cBtn.className='lgmm-btn'; cBtn.textContent='📋 نسخ';
  cBtn.onclick = () => { navigator.clipboard?.writeText(p.text); lgHideMsgMenu(); showToast('تم النسخ ✓'); };
  menu.appendChild(cBtn);
  const xBtn = document.createElement('button'); xBtn.className='lgmm-btn lgmm-cancel'; xBtn.textContent='✕ إلغاء'; xBtn.onclick=lgHideMsgMenu;
  menu.appendChild(xBtn);
  const room=document.getElementById('lounge-room'); room.appendChild(menu);
  const rect=wrap.getBoundingClientRect(), rRect=room.getBoundingClientRect();
  let top=rect.top-rRect.top+wrap.offsetHeight/2;
  menu.style.top = Math.max(60, Math.min(top, rRect.height-170)) + 'px';
  lgMenuTarget=menu;
  setTimeout(() => {
    document.addEventListener('touchstart', lgHideMsgMenu, {once:true});
    document.addEventListener('click',      lgHideMsgMenu, {once:true});
  }, 100);
}
function lgHideMsgMenu() { lgMenuTarget?.remove(); lgMenuTarget=null; }

// ══════════════════════
// Gift Picker
// ══════════════════════
function lgOpenGiftPicker(targetUid, targetUsername) {
  document.getElementById('lounge-gift-picker')?.remove();
  const xp = currentProfile?.xp || 0;
  const sheet = document.createElement('div'); sheet.id='lounge-gift-picker';
  const items = LOUNGE_GIFTS.map(g => {
    const locked = xp < g.cost;
    return `<div class="lgp-item${locked?' lgp-locked':''}" onclick="lgSendGift('${targetUid}','${escHtml(targetUsername)}','${g.id}',${g.cost})">
      <div class="lgp-emoji">${g.emoji}</div><div class="lgp-label">${g.label}</div>
      <div class="lgp-cost${locked?' lgp-cost-low':''}">${g.cost} ⭐</div></div>`;
  }).join('');
  sheet.innerHTML = `<div class="lgp-overlay" onclick="document.getElementById('lounge-gift-picker').remove()"></div>
    <div class="lgp-box">
      <div class="lgp-header"><span class="lgp-title">🎁 هدية لـ <strong>${escHtml(targetUsername)}</strong></span><span class="lgp-points">نقاطك: <strong>${xp}</strong> ⭐</span></div>
      <div class="lgp-grid">${items}</div>
      <button class="lgp-cancel" onclick="document.getElementById('lounge-gift-picker').remove()">إلغاء</button></div>`;
  document.getElementById('lounge-room').appendChild(sheet);
  requestAnimationFrame(() => sheet.querySelector('.lgp-box').classList.add('lgp-show'));
}

async function lgSendGift(targetUid, targetUsername, giftId, cost) {
  const gift = LOUNGE_GIFTS.find(g => g.id === giftId);
  if (!gift) return;
  const xp = currentProfile?.xp || 0;
  if (xp < cost) { showToast('❌ نقاطك غير كافية'); return; }
  document.getElementById('lounge-gift-picker')?.remove();
  currentProfile.xp = xp - cost;   // Optimistic
  const payload = { sender_id:currentUser.id, sender_name:currentProfile.username, sender_avatar:currentProfile.avatar_url||null, target_id:targetUid, target_name:targetUsername, gift_id:giftId, gift_emoji:gift.emoji, gift_label:gift.label, cost, ts:Date.now() };
  lgShowGiftAnimation(payload);
  lgChannel?.send({ type:'broadcast', event:'lg_gift', payload });
  showToast(gift.emoji + ' أرسلت ' + gift.label + ' لـ ' + targetUsername + '!');
  sb.from('profiles').update({ xp: currentProfile.xp }).eq('id', currentUser.id)
    .then(({ error }) => { if (error) currentProfile.xp = xp; });
}

// ══════════════════════
// أنيميشن الهدية
// ══════════════════════
function lgShowGiftAnimation(p) {
  const room=document.getElementById('lounge-room');
  const el=document.createElement('div'); el.className='lounge-gift-fly';
  el.innerHTML=`<div class="lgf-inner"><span class="lgf-who">${escHtml(p.sender_name)}</span><span class="lgf-arr">→</span><span class="lgf-emoji">${p.gift_emoji}</span><span class="lgf-arr">→</span><span class="lgf-who">${escHtml(p.target_name)}</span></div><div class="lgf-sub">${p.gift_label} · ${p.cost} ⭐</div>`;
  room.appendChild(el);
  requestAnimationFrame(() => el.classList.add('lgf-show'));
  setTimeout(() => { el.classList.remove('lgf-show'); setTimeout(() => el.remove(), 500); }, 3000);
  lgAppendSys(p.sender_name + ' أرسل ' + p.gift_emoji + ' لـ ' + p.target_name);
}

// ══════════════════════
// مساعدات
// ══════════════════════
function lgAppendSys(text) {
  const msgs=document.getElementById('lounge-msgs'); if(!msgs) return;
  const div=document.createElement('div'); div.className='lounge-sys-msg'; div.textContent=text;
  msgs.appendChild(div); lgScrollToBottom();
}
function lgUpdateBubbleSub() {
  const sub=document.getElementById('lounge-online-sub'); if(!sub) return;
  const c=Object.keys(lgOnline).length;
  sub.textContent = c > 0 ? c+' متصل الآن · للجميع 💬' : 'دردشة مفتوحة · للجميع 💬';
}
let _lgScrollRaf=null;
function lgScrollToBottom() {
  if (_lgScrollRaf) return;
  _lgScrollRaf = requestAnimationFrame(() => {
    const msgs=document.getElementById('lounge-msgs');
    if(msgs) msgs.scrollTop=msgs.scrollHeight;
    _lgScrollRaf=null;
  });
}
function lgFmtTime(ts) {
  if(!ts) return ''; const d=new Date(ts),h=d.getHours(),m=d.getMinutes();
  return h+':'+(m<10?'0':'')+m;
}

// ══ Patch roomBubbleTap ══
(function () {
  window.roomBubbleTap = function (e, roomId) {
    e.stopPropagation();
    const el=document.getElementById('rb-'+roomId), orbit=document.getElementById('rooms-orbit');
    if (window.activeRoomId === roomId) {
      if      (roomId==='cinema' && typeof openCinemaLock==='function') openCinemaLock();
      else if (roomId==='lounge') openLoungeRoom();
      else if (roomId==='randommatch' && typeof openRandomMatchRoom==='function') openRandomMatchRoom();
      return;
    }
    if (window.activeRoomId) document.getElementById('rb-'+window.activeRoomId)?.classList.remove('rb-active');
    el?.classList.add('rb-active'); orbit?.classList.add('has-active'); window.activeRoomId=roomId;
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof backCloseMap !== 'undefined') {
    backCloseMap.unshift({ check: () => !!document.getElementById('lounge-gift-picker'), close: () => document.getElementById('lounge-gift-picker')?.remove() });
    backCloseMap.unshift({ check: () => document.getElementById('lounge-room')?.classList.contains('show'), close: loungeExit });
  }
});
