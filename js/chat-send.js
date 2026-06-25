// ══════════════════════════════════════
// LOAD MESSAGES — DocumentFragment + in-memory cache
// الكاش بيخلّي إعادة فتح نفس الشات فوريّة بدل ما ينتظر network roundtrip
// ══════════════════════════════════════
const _msgCacheByCid = new Map(); // cid -> آخر مصفوفة رسائل تم رسمها

function _msgsSnapshotKey(data){
  if(!data || !data.length) return '0';
  const last = data[data.length - 1];
  return `${data.length}|${last.id}|${last.created_at}|${last.reaction||''}`;
}

function _buildProfileCard(){
  const card = document.createElement('div');
  card.className = 'chat-profile-card';
  card.innerHTML = `
    <div class="chat-profile-av">
      ${activeChat.avatar_url
        ? `<img src="${activeChat.avatar_url}">`
        : `<span>${(activeChat.username||'?')[0].toUpperCase()}</span>`}
    </div>
    <div class="chat-profile-name">${activeChat.display_name || activeChat.username}</div>
    <div class="chat-profile-user">@${activeChat.username} · Kinona</div>
    <button class="chat-profile-btn"
      onclick="closeChat();setTimeout(()=>openProfile('${activeChat.id}'),200)">
      عرض الملف الشخصي
    </button>`;
  return card;
}

function _renderChatMessages(data, msgsEl){
  const frag = document.createDocumentFragment();
  frag.appendChild(_buildProfileCard());

  const rows = [];
  (data||[]).forEach(m => {
    const out       = m.from_id === currentUser.id;
    const reactHtml = _buildReactHtml(m.reaction);
    const hasReact  = !!reactHtml;

    const row = document.createElement('div');
    row.className   = `mrow ${out ? 'out' : 'in'}`;
    row.dataset.id  = m.id;
    row.dataset.own = String(out);
    if(hasReact) row.style.marginBottom = '22px';

    const inAv = (!out && activeChat)
      ? `<div class="msg-av" onclick="openProfile('${activeChat.id}')" style="cursor:pointer;">
           ${activeChat.avatar_url
             ? `<img src="${activeChat.avatar_url}">`
             : (activeChat.username||'?')[0].toUpperCase()}
         </div>`
      : '';

    row.innerHTML = inAv + buildMsgBubble(m, out, reactHtml);
    frag.appendChild(row);
    rows.push({row, id:m.id, own:out});
  });

  msgsEl.innerHTML = '';
  msgsEl.appendChild(frag);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  // أعِد النزول للأسفل بعد تحميل الصور/الفيديو
  msgsEl.querySelectorAll('img, video').forEach(el => {
    const stick = () => { msgsEl.scrollTop = msgsEl.scrollHeight; };
    if(el.tagName === 'IMG'){
      if(!el.complete) el.addEventListener('load', stick, {once:true});
    } else {
      el.addEventListener('loadedmetadata', stick, {once:true});
    }
  });

  rows.forEach(({row, id, own}) => addLongPress(row, () => showChatOpts(id, own)));

  if(activeChat?.id && typeof applyChatCosmetics === 'function'){
    applyChatCosmetics(activeChat.id).catch(e => console.warn('[Cosmetics] chat:', e));
  }
}

async function loadMessages(){
  if(!activeChat) return;
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const msgsEl = $('msgs');

  // ── 1. اعرض الكاش فوراً (لو موجود) — هاد بيخفّض زمن الفتح إلى ~0ms ──
  const cached = _msgCacheByCid.get(cid);
  const cachedKey = cached ? _msgsSnapshotKey(cached) : null;
  if(cached){
    _renderChatMessages(cached, msgsEl);
  } else {
    // ما في كاش → اعرض البطاقة على الأقل عشان الشات ما يبان فاضي
    msgsEl.innerHTML = '';
    msgsEl.appendChild(_buildProfileCard());
  }

  // ── 2. اجلب أحدث 100 رسالة من DB ──
  const {data:_raw, error} = await sb.from('messages')
    .select('*').eq('chat_id', cid)
    .order('created_at', {ascending:false}).limit(100);
  if(error){ console.error('loadMessages:', error); return; }
  const data = (_raw || []).reverse();

  // ── 3. لو المستخدم بدّل المحادثة أثناء الـ fetch، اخرج ──
  if(!activeChat || [currentUser.id, activeChat.id].sort().join('_') !== cid) return;

  // ── 4. حدّث الكاش، وأعِد الرسم فقط لو الـ snapshot اختلف (يمنع flash) ──
  _msgCacheByCid.set(cid, data);
  if(_msgsSnapshotKey(data) !== cachedKey){
    _renderChatMessages(data, msgsEl);
  }

  // اضبط cursor المزامنة على أحدث رسالة محمّلة
  const _lastRow = data.length ? data[data.length - 1] : null;
  _lastMsgSync = _lastRow?.created_at || new Date().toISOString();

  // seen label
  const cid2 = [currentUser.id, activeChat?.id].sort().join('_');
  if(seenTimestamps[cid2]){
    renderSeenLabel(cid2);
  } else {
    const {data:seenRows} = await sb.from('messages')
      .select('seen_at,seen').eq('chat_id', cid2)
      .eq('from_id', currentUser.id).eq('seen', true)
      .order('created_at', {ascending:false}).limit(1);
    const seenMsg = seenRows?.[0];
    if(seenMsg){
      seenTimestamps[cid2] = seenMsg.seen_at
        ? new Date(seenMsg.seen_at).getTime() : Date.now();
      renderSeenLabel(cid2);
    }
  }
}

function _buildReactHtml(r){
  if(!r || r === 'null' || r === '{}' || r === '') return '';
  const emojiMap = {};
  try {
    const parsed = (typeof r === 'string') ? JSON.parse(r) : r;
    if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)){
      Object.values(parsed).forEach(e => {
        if(e && typeof e === 'string') emojiMap[e] = (emojiMap[e]||0) + 1;
      });
    }
  } catch(e){
    if(typeof r === 'string' && r.trim()) emojiMap[r.trim()] = 1;
  }
  const parts = Object.entries(emojiMap)
    .map(([e,c]) => `${e}${c>1 ? `<span class="react-count-bubble"> ${c}</span>` : ''}`)
    .join('');
  return parts ? `<div class="msg-reaction">${parts}</div>` : '';
}

function msgAlreadyRendered(id){
  return !!$('msgs').querySelector(`[data-id="${id}"]`);
}

// ══════════════════════════════════════
// SEND MESSAGE — Optimistic UI
// ══════════════════════════════════════
async function sendMessage(){
  const txt = $('msg-input').value.trim();
  if(!txt || !activeChat) return;

  // منع flash البوكس أثناء الإرسال
  _sendingMsg = true;
  $('msg-input').value = '';
  $('send-btn').classList.add('hidden');
  document.getElementById('iwrap-right-icons')?.classList.remove('hidden-icons');
  $('msg-input').focus();
  stopTyping();
  // أعد تفعيل الـ viewport listener بعد استقرار الكيبورد
  setTimeout(() => { _sendingMsg = false; }, 400);

  const tempId = 'tmp_' + Date.now();
  const tempMsg = {
    id: tempId,
    from_id: currentUser.id,
    to_id:   activeChat.id,
    text:    txt,
    created_at: new Date().toISOString(),
    _pending: true
  };
  appendMessage(tempMsg, true);

  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id: cid, from_id: currentUser.id, to_id: activeChat.id, text: txt
  }).select().single();

  if(inserted){
    // استبدل الـ ID المؤقت بالحقيقي
    const tmpEl = $('msgs').querySelector(`[data-id="${tempId}"]`);
    if(tmpEl) tmpEl.dataset.id = inserted.id;

    bumpChatToTop(activeChat.id, inserted.text || '');
    msgChannel?.send({type:'broadcast', event:'new_msg', payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
    sendOSPush(activeChat.id, `💬 ${currentProfile?.username || 'kinona'}`, inserted.text || '📷 رسالة جديدة');

    // ── زيادة عداد الرسائل + XP — بدون await (fire-and-forget) ──
    // ما في داعي ننتظر التحديث لأنه ما بظهر للمستخدم
    const newMsgCount = (currentProfile?.messages_sent || 0) + 1;
    if(currentProfile) currentProfile.messages_sent = newMsgCount;
    if(typeof _statsCache !== 'undefined' && _statsCache[currentUser.id])
      _statsCache[currentUser.id].msgs = newMsgCount;
    sb.from('profiles')
      .update({ messages_sent: newMsgCount })
      .eq('id', currentUser.id)
      .then(({error}) => { if(error) console.error('messages_sent update:', error); });
    // XP عن إرسال رسالة (عبر addXP في level.js)
    if(typeof addXP === 'function') addXP('message');
  }
}

// ══════════════════════════════════════
// OS PUSH — مع token صحيح لحل الـ 401
// ══════════════════════════════════════
async function sendOSPush(toId, title, body){
  try {
    const { data:{ session } } = await sb.auth.getSession();
    if(!session) return;
    await fetch('/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({toId, title, body})
    });
  } catch(e){ console.error('sendOSPush:', e); }
}

// ══════════════════════════════════════
// CLOSE CHAT
// ══════════════════════════════════════
function closeChat(){
  const chatView = $('chat-view');
  document.activeElement?.blur();
  // إغلاق فوري — بدون تلاشي يظهر الصفحة تحت
  chatView.style.display = 'none';
  chatView.style.opacity = '';
  document.body.classList.remove('chat-open');
  $('typing-wrap').classList.remove('show');
  stopTyping();
  if(seenLabelTimer){ clearInterval(seenLabelTimer); seenLabelTimer = null; }
  stopSeenPolling();
  stopMsgPolling();
  _lastMsgSync = null;
  if(activeChat){
    const cid_ = [currentUser.id, activeChat.id].sort().join('_');
    delete seenTimestamps[cid_];
    const chatUnread = unreadPerChat[activeChat.id] || 0;
    unreadCount = Math.max(0, unreadCount - chatUnread);
    unreadPerChat[activeChat.id] = 0;
    updateBadge();
  }
  if(msgChannel){ sb.removeChannel(msgChannel); msgChannel = null; }
  activeChat = null;
  // reset flag الـ markSeen
  _markSeenOnce._running = false;
  // إذا فُتح الشات من التعليقات → ارجع للتعليقات
  if(_chatOpenedFrom === 'comments' && _chatFromPostId){
    const pid = _chatFromPostId;
    _chatOpenedFrom = null;
    _chatFromPostId = null;
    setTimeout(() => openComments(pid), 200);
  } else {
    _chatOpenedFrom = null;
    _chatFromPostId = null;
  }
}

// ══════════════════════════════════════
// MEDIA PICKER MENU
// ══════════════════════════════════════
function toggleMpMenu(e){
  e.stopPropagation();
  $('mp-menu').classList.toggle('show');
}
function closeMpMenu(){ $('mp-menu').classList.remove('show'); }

// ══════════════════════════════════════
// IMAGE SEND — مع تأكيد قبل الإرسال
// ══════════════════════════════════════
let pendingImgFile = null;
