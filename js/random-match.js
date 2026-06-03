// ══════════════════════════════════════
// RANDOM MATCH ROOM — لقاء عشوائي
// ══════════════════════════════════════

let rmQueueChannel   = null;
let rmPrivateChannel = null;
let rmSearching      = false;
let rmMatchRoom      = null;
let rmPartner        = null;

// ── فتح الغرفة ──
function openRandomMatchRoom() {
  document.getElementById('random-match-room').style.display = 'flex';
  document.querySelector('.bottom-nav').style.display = 'none';
  // reset كامل
  _rmResetToSearch();
}

// ── خروج من الغرفة ──
function randomMatchExit() {
  rmCancelSearch();
  _rmLeavePrivate();
  document.getElementById('random-match-room').style.display = 'none';
  document.querySelector('.bottom-nav').style.display = 'flex';
  // أعد تفعيل الغرفة في الـ orbit
  if (typeof activeRoomId !== 'undefined') {
    const prev = document.getElementById('rb-randommatch');
    if (prev) prev.classList.remove('rb-active');
    const orbit = document.getElementById('rooms-orbit');
    if (orbit) orbit.classList.remove('has-active');
    activeRoomId = null;
  }
}

// ── ابدأ البحث ──
function rmStartSearch() {
  if (rmSearching) return;
  rmSearching = true;
  document.getElementById('rm-search-btn').style.display    = 'none';
  document.getElementById('rm-searching-state').style.display = 'flex';
  _rmJoinQueueChannel();
}

// ── إلغاء البحث ──
function rmCancelSearch() {
  rmSearching = false;
  if (rmQueueChannel) {
    rmQueueChannel.untrack();
    sb.removeChannel(rmQueueChannel);
    rmQueueChannel = null;
  }
  document.getElementById('rm-search-btn').style.display      = 'flex';
  document.getElementById('rm-searching-state').style.display = 'none';
}

// ── بحث عشوائي جديد (زر "جديد") ──
function rmNewMatch() {
  _rmLeavePrivate();
  _rmResetToSearch();
}

// ──────────────────────────────────────
// منطق المطابقة
// ──────────────────────────────────────
function _rmJoinQueueChannel() {
  rmQueueChannel = sb.channel('kinona_random_queue', {
    config: { presence: { key: currentUser.id } }
  });

  // حدث انضمام شخص جديد للقائمة
  rmQueueChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
    if (!rmSearching) return;
    newPresences.forEach(p => {
      if (p.user_id === currentUser.id) return;
      // فقط الـ ID الأصغر يبدأ المطابقة لتجنب التكرار
      if (currentUser.id < p.user_id) {
        _rmInitiateMatch(p.user_id, p.username, p.avatar_url);
      }
    });
  });

  // استقبال طلب مطابقة
  rmQueueChannel.on('broadcast', { event: 'rm_match' }, ({ payload }) => {
    if (!rmSearching) return;
    if (payload.partner === currentUser.id) {
      _rmOnMatched(payload.initiator, payload.initiator_name, payload.initiator_avatar, payload.room);
    }
  });

  rmQueueChannel.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') return;
    await rmQueueChannel.track({
      user_id:    currentUser.id,
      username:   currentProfile?.username   || '',
      avatar_url: currentProfile?.avatar_url || '',
      ts:         Date.now()
    });

    // تحقق ممن هو موجود مسبقاً في القائمة
    const state  = rmQueueChannel.presenceState();
    const others = Object.values(state).flat().filter(p => p.user_id && p.user_id !== currentUser.id);
    if (others.length > 0) {
      others.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const partner = others[0];
      if (currentUser.id < partner.user_id) {
        _rmInitiateMatch(partner.user_id, partner.username, partner.avatar_url);
      }
    }
  });
}

function _rmInitiateMatch(partnerId, partnerName, partnerAvatar) {
  if (!rmSearching) return;
  const roomId = [currentUser.id, partnerId].sort().join('').slice(0, 36);
  rmQueueChannel.send({
    type: 'broadcast', event: 'rm_match',
    payload: {
      initiator:        currentUser.id,
      initiator_name:   currentProfile?.username   || '',
      initiator_avatar: currentProfile?.avatar_url || '',
      partner:          partnerId,
      room:             roomId
    }
  });
  _rmOnMatched(partnerId, partnerName, partnerAvatar, roomId);
}

function _rmOnMatched(partnerId, partnerName, partnerAvatar, roomId) {
  if (!rmSearching && rmMatchRoom) return; // تجنب التكرار
  rmSearching = false;
  rmPartner   = { id: partnerId, username: partnerName, avatar_url: partnerAvatar };
  rmMatchRoom = roomId;

  // اترك القائمة
  if (rmQueueChannel) {
    rmQueueChannel.untrack();
    sb.removeChannel(rmQueueChannel);
    rmQueueChannel = null;
  }

  // تحديث واجهة الشريط العلوي
  const avEl = document.getElementById('rm-partner-avatar');
  avEl.innerHTML = partnerAvatar
    ? `<img src="${partnerAvatar}">`
    : `<span>${(partnerName || '?')[0].toUpperCase()}</span>`;
  document.getElementById('rm-partner-name').textContent = partnerName || 'مجهول';

  // إظهار قسم الشات
  document.getElementById('rm-searching-state').style.display = 'none';
  document.getElementById('rm-search-section').style.display  = 'none';
  document.getElementById('rm-chat-section').style.display    = 'flex';

  _rmJoinPrivate(roomId);
}

// ──────────────────────────────────────
// القناة الخاصة — الشات
// ──────────────────────────────────────
function _rmJoinPrivate(roomId) {
  rmPrivateChannel = sb.channel('kinona_private_' + roomId);

  rmPrivateChannel.on('broadcast', { event: 'rm_msg' }, ({ payload }) => {
    if (payload.user_id !== currentUser.id) _rmRenderMsg(payload, false);
  });

  rmPrivateChannel.on('broadcast', { event: 'rm_leave' }, () => {
    _rmAppendSys('غادر الشخص الآخر المحادثة 👋');
    document.getElementById('rm-input').disabled    = true;
    document.getElementById('rm-send-btn').disabled = true;
    document.getElementById('rm-partner-status').textContent = 'غادر المحادثة';
  });

  rmPrivateChannel.subscribe();
}

function _rmLeavePrivate() {
  if (rmPrivateChannel) {
    rmPrivateChannel.send({ type: 'broadcast', event: 'rm_leave', payload: {} });
    sb.removeChannel(rmPrivateChannel);
    rmPrivateChannel = null;
  }
  rmMatchRoom = null;
  rmPartner   = null;
}

// ──────────────────────────────────────
// إرسال واستقبال الرسائل
// ──────────────────────────────────────
function rmSendMsg() {
  const input = document.getElementById('rm-input');
  const text  = input.value.trim();
  if (!text || !rmPrivateChannel) return;
  input.value = '';

  const payload = {
    user_id:  currentUser.id,
    username: currentProfile?.username || '',
    text,
    ts: Date.now()
  };

  _rmRenderMsg(payload, true);
  rmPrivateChannel.send({ type: 'broadcast', event: 'rm_msg', payload });
}

function _rmRenderMsg(payload, isMine) {
  const msgs = document.getElementById('rm-msgs');
  const div  = document.createElement('div');
  div.className = 'rm-msg ' + (isMine ? 'rm-msg-out' : 'rm-msg-in');
  div.innerHTML = `<div class="rm-bub">${_rmEscape(payload.text)}</div>`;
  msgs.appendChild(div);
  // احتفظ بـ 80 رسالة فقط
  while (msgs.children.length > 80) msgs.removeChild(msgs.firstChild);
  msgs.scrollTop = msgs.scrollHeight;
}

function _rmAppendSys(text) {
  const msgs = document.getElementById('rm-msgs');
  const div  = document.createElement('div');
  div.className   = 'rm-sys';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function _rmEscape(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ──────────────────────────────────────
// reset الواجهة
// ──────────────────────────────────────
function _rmResetToSearch() {
  rmSearching = false;
  document.getElementById('rm-search-section').style.display  = 'flex';
  document.getElementById('rm-chat-section').style.display    = 'none';
  document.getElementById('rm-search-btn').style.display      = 'flex';
  document.getElementById('rm-searching-state').style.display = 'none';
  document.getElementById('rm-msgs').innerHTML = '';
  const input = document.getElementById('rm-input');
  input.value    = '';
  input.disabled = false;
  document.getElementById('rm-send-btn').disabled = false;
  document.getElementById('rm-partner-status').textContent = 'متصل الآن 🟢';
}
