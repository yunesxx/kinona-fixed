// ══════════════════════════════════════
// CHATS LIST — نسخة محسّنة للأداء
// ══════════════════════════════════════

let _chatsCache = null;

async function loadChats(){
  const chatsEl = $('chats-list');

  // ── الطلب الأصلي (موثوق) ──
  const {data:msgs} = await sb.from('messages').select('*')
    .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
    .order('created_at', {ascending:false});

  if(!msgs || msgs.length === 0){
    chatsEl.innerHTML = `<div style="text-align:center;padding:60px;color:#999;font-size:14px;">لا يوجد محادثات بعد</div>`;
    _chatsCache = null;
    return;
  }

  const seen = new Set(), list = [], unreadMap = {};

  msgs.forEach(m => {
    const isOut = m.from_id === currentUser.id;
    const other = isOut ? m.to_id : m.from_id;
    if(!seen.has(other)){
      seen.add(other);
      const lastText =
        m.msg_type === 'image'   ? '🖼️ صورة'  :
        m.msg_type === 'video'   ? '🎥 فيديو' :
        m.msg_type === 'sticker' ? '😊 ستكر'  :
        m.msg_type === 'share'   ? '📤 منشور' :
        m.text || '';
      list.push({id: other, lastText, lastTime: m.created_at});
    }
    if(!isOut && !m.seen){
      unreadMap[m.from_id] = (unreadMap[m.from_id]||0) + 1;
    }
  });

  // ── جلب البروفايلات دفعة واحدة ──
  const {data:profs} = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,last_seen')
    .in('id', list.map(l => l.id));

  const profMap = {};
  (profs||[]).forEach(p => { profMap[p.id] = p; });

  // ── cache check: لو ما تغيّر شيء، لا تعيد رسم الـ DOM ──
  const cacheKey = list
    .map(l => `${l.id}:${unreadMap[l.id]||0}:${l.lastText}:${l.lastTime}`)
    .join('|');
  if(_chatsCache === cacheKey) return;
  _chatsCache = cacheKey;

  // ── بناء الـ DOM بـ DocumentFragment ──
  const frag = document.createDocumentFragment();
  const now  = Date.now();

  list.forEach(({id, lastText, lastTime}) => {
    const p = profMap[id];
    if(!p) return;

    const unread   = unreadMap[p.id] || 0;
    const diffSec  = p.last_seen ? (now - new Date(p.last_seen)) / 1000 : 99999;
    const isOnline = diffSec < 120;
    const timeLabel = lastTime ? _formatChatTime(lastTime) : '';

    const item = document.createElement('div');
    item.className  = 'chat-item';
    item.id         = 'ci-' + p.id;
    item.addEventListener('click', () => openChat(p));

    const onlineLabel = isOnline ? 'متصل الآن' : formatLastSeen(p.last_seen);

    item.innerHTML = `
      <div class="chat-item-av-wrap">
        ${makeAv(p.username, p.avatar_url, 52)}
        <div class="online-dot ${isOnline ? 'show' : ''}"></div>
      </div>
      <div class="chat-item-info">
        <div class="chat-item-top">
          <span class="chat-item-name ${unread > 0 ? 'unread-name' : ''}">${p.display_name||p.username}</span>
        </div>
        <div class="chat-item-presence ${isOnline ? 'online' : ''}">
          ${isOnline ? '<span class="presence-dot"></span>' : ''}${onlineLabel}
        </div>
        <div class="chat-item-bottom">
          <span class="chat-item-last ${unread > 0 ? 'unread-preview' : ''}">${lastText}</span>
          <div class="chat-unread-dot ${unread > 0 ? 'show' : ''}"></div>
        </div>
      </div>`;

    frag.appendChild(item);
  });

  // دفعة DOM واحدة
  chatsEl.innerHTML = '';
  chatsEl.appendChild(frag);

  // long press بعد الـ render
  list.forEach(({id}) => {
    const el = $('ci-' + id);
    if(el) addLongPress(el, () => showChatListOpts(id), 500);
  });

  // ── Cosmetics: طبّق لون الاسم وإطار الأفاتار على قائمة المحادثات ──
  if (typeof applyCosmeticsToElement === 'function') {
    Promise.all(list.map(({id}) => {
      const el = $('ci-' + id);
      if (!el) return Promise.resolve();
      return applyCosmeticsToElement(
        id, el,
        '.chat-item-name',
        '.chat-item-av-wrap img, .chat-item-av-wrap span',
        null
      );
    })).catch(e => console.warn('[Cosmetics] chats-list:', e));
  }
}

// ── تنسيق وقت آخر رسالة ──
function _formatChatTime(iso){
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if(mins < 1)  return 'الآن';
  if(mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if(hrs < 24)  return `${hrs}س`;
  const days = Math.floor(hrs / 24);
  if(days < 7)  return `${days}ي`;
  return d.toLocaleDateString('ar', {month:'short', day:'numeric'});
}

function showChatListOpts(userId){
  selectedChatUserId = userId;
  const overlay = $('chatlist-opt-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
  if(navigator.vibrate) navigator.vibrate(40);
}

function closeChatListOpts(){
  const overlay = $('chatlist-opt-overlay');
  overlay.classList.remove('show');
  setTimeout(() => { overlay.style.display = 'none'; }, 280);
}

async function deleteChatConversation(){
  if(!selectedChatUserId) return;
  const cid = [currentUser.id, selectedChatUserId].sort().join('_');
  await sb.from('messages').delete().eq('chat_id', cid);
  closeChatListOpts();
  showToast('تم حذف المحادثة');
  _chatsCache = null;
  loadChats();
}
