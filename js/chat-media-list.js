// ══════════════════════════════════════
// CHATS LIST + LONG PRESS DELETE
// ══════════════════════════════════════
async function loadChats(){
  const chatsEl = $('chats-list');
  const currentScroll = window.scrollY || document.documentElement.scrollTop;
  const isAtTop = currentScroll < 60;
  const savedScroll = isAtTop ? 0 : currentScroll;

  // query واحدة لكل الرسائل
  const {data:msgs} = await sb.from('messages').select('*')
    .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
    .order('created_at',{ascending:false});

  if(!msgs || msgs.length===0){
    chatsEl.innerHTML = `<div style="text-align:center;padding:60px;color:#999">لا يوجد محادثات بعد</div>`;
    return;
  }

  // بناء قائمة المحادثات + حساب الـ unread من الرسائل الموجودة (بدون queries إضافية)
  const seen = new Set(), list = [];
  const unreadMap = {}; // { userId: count }

  msgs.forEach(m => {
    const other = m.from_id===currentUser.id ? m.to_id : m.from_id;
    if(!seen.has(other)){
      seen.add(other);
      list.push({id:other, last: m.msg_type==='image'?'🖼️ صورة': m.msg_type==='video'?'🎥 فيديو': m.msg_type==='sticker'?'😊 ستكر': m.msg_type==='share'?'📤 منشور مشارك': m.text||''});
    }
    // احسب الـ unread من الـ data الموجودة
    if(m.to_id===currentUser.id && !m.seen){
      unreadMap[m.from_id] = (unreadMap[m.from_id]||0) + 1;
    }
  });

  // جيب البروفايلات — query واحدة
  const {data:profs} = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,last_seen')
    .in('id', list.map(l=>l.id));

  // رتّب البروفايلات بنفس ترتيب list (الأحدث رسالة أولاً)
  const profMap = {};
  (profs||[]).forEach(p => { profMap[p.id] = p; });

  chatsEl.innerHTML = list.map(l => {
    const p = profMap[l.id];
    if(!p) return '';
    const lastText = l.last || '';
    const unread = unreadMap[p.id] || 0;
    const diff = p.last_seen ? (Date.now()-new Date(p.last_seen))/1000 : 99999;
    const isOnline = diff < 120;
    const timeLabel = isOnline ? 'متصل الآن' : formatLastSeen(p.last_seen);

    return `
    <div class="chat-item" id="ci-${p.id}" onclick="openChat(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <div class="chat-item-av-wrap">
        ${makeAv(p.username, p.avatar_url, 52)}
        <div class="online-dot ${isOnline?'show':''}"></div>
      </div>
      <div class="chat-item-info">
        <div class="chat-item-top">
          <span class="chat-item-name ${unread>0?'unread-name':''}">${p.display_name||p.username}</span>
          <span class="chat-item-time">${isOnline ? '' : ''}</span>
        </div>
        <div class="chat-item-bottom">
          ${isOnline 
            ? `<span class="chat-item-online-label">متصل الآن</span>` 
            : `<span class="chat-item-online-label">${formatLastSeen(p.last_seen)}</span>`}
          <div class="chat-unread-dot ${unread>0?'show':''}"></div>
        </div>
      </div>
    </div>`;
  }).join('');

  (profs||[]).forEach(p => {
    const el = $('ci-'+p.id);
    if(el) addLongPress(el, () => showChatListOpts(p.id), 500);
  });

  requestAnimationFrame(()=>{
    window.scrollTo(0, savedScroll);
  });
}

// ══════════════════════════════════════
// LONG PRESS DELETE for chat list
// ══════════════════════════════════════
function showChatListOpts(userId){
  selectedChatUserId = userId;
  const overlay = $('chatlist-opt-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(()=> overlay.classList.add('show'));
  if(navigator.vibrate) navigator.vibrate(40);
}
function closeChatListOpts(){
  const overlay = $('chatlist-opt-overlay');
  overlay.classList.remove('show');
  setTimeout(()=>{ overlay.style.display='none'; }, 280);
}
async function deleteChatConversation(){
  if(!selectedChatUserId) return;
  const cid = [currentUser.id, selectedChatUserId].sort().join('_');
  await sb.from('messages').delete().eq('chat_id', cid);
  closeChatListOpts();
  showToast('تم حذف المحادثة');
  loadChats();
}

// ══════════════════════════════════════
// LONG PRESS HELPER — with visual feedback
// ══════════════════════════════════════
