// ══════════════════════════════════════
// CHAT — نسخة محسّنة للأداء
// ══════════════════════════════════════

let _vvRafId = null;
let _sendingMsg = false; // flag لمنع flash عند الإرسال

function openChat(user){
  activeChat = user;

  const chatView = $('chat-view');
  $('chat-name').textContent   = user.display_name || user.username;
  $('chat-status').textContent = formatLastSeen(user.last_seen);
  $('chat-av').innerHTML       = makeAv(user.username, user.avatar_url, 38);
  $('typing-av').innerHTML     = user.avatar_url
    ? `<img src="${user.avatar_url}">`
    : (user.username||'?')[0].toUpperCase();
  $('msg-input').value = '';
  $('send-btn').classList.add('hidden');
  chatView.style.display = 'flex';
  // علّم الـ body لتصير خلفيته سودا — يمنع البياض من الظهور في أي فراغ
  // بين chat-view والكيبورد على بعض أجهزة أندرويد
  document.body.classList.add('chat-open');

  // interactive-widget=resizes-content في الـ viewport يتكفل بالكيبورد — لا حاجة لـ JS

  if(notifSender && notifSender.id === user.id) hideInAppNotif();

  const cid = [currentUser.id, activeChat.id].sort().join('_');
  if(msgChannel) sb.removeChannel(msgChannel);

  updateLastSeen();
  if(activeChat) setTimeout(() => sendToInbox(activeChat.id, '__warmup__', {}), 1000);

  // mark seen — استدعاء موحّد يمنع الـ race condition والـ 406
  _markSeenOnce(cid);

  msgChannel = sb.channel('c_' + cid, {config:{broadcast:{self:false}}})
    .on('broadcast', {event:'typing'}, p => {
      if(p.payload.uid === currentUser.id) return;
      $('typing-wrap').classList.toggle('show', !!p.payload.isTyping);
    })
    .on('broadcast', {event:'new_msg'}, async payload => {
      const from = payload.payload?.from;
      if(!from || from === currentUser.id) return;
      const msg = payload.payload.msg;
      if(msg){
        if(!msgAlreadyRendered(msg.id)) appendMessage(msg, false);
        const nowIso = new Date().toISOString();
        sb.from('messages').update({seen:true, seen_at:nowIso}).eq('id', msg.id);
        msgChannel?.send({type:'broadcast', event:'msg_seen', payload:{by:currentUser.id, at:nowIso}});
        _clearUnreadUI(activeChat?.id);
      } else {
        const {data:latest} = await sb.from('messages')
          .select('*').eq('chat_id', cid)
          .eq('from_id', activeChat.id)
          .order('created_at', {ascending:false}).limit(1).single();
        if(latest && !msgAlreadyRendered(latest.id)){
          appendMessage(latest, false);
          const nowIso2 = new Date().toISOString();
          sb.from('messages').update({seen:true, seen_at:nowIso2}).eq('id', latest.id);
          msgChannel?.send({type:'broadcast', event:'msg_seen', payload:{by:currentUser.id, at:nowIso2}});
        }
      }
    })
    .on('postgres_changes', {event:'UPDATE', schema:'public', table:'profiles', filter:`id=eq.${user.id}`}, p => {
      const ls = p.new?.last_seen;
      if(ls) $('chat-status').textContent = formatLastSeen(ls);
    })
    .on('broadcast', {event:'msg_seen'}, payload => {
      // فقط اعرض seen إذا اللي بعت الـ broadcast هو الطرف الثاني فعلياً
      const by = payload?.payload?.by;
      if(!by || by === currentUser.id) return;
      if(!activeChat || by !== activeChat.id) return;
      const cid2 = [currentUser.id, activeChat.id].sort().join('_');
      const seenAt = payload?.payload?.at ? new Date(payload.payload.at).getTime() : Date.now();
      seenTimestamps[cid2] = seenAt;
      renderSeenLabel(cid2);
    })
    .subscribe(async status => {
      if(status !== 'SUBSCRIBED') return;
      // بعد الاتصال — أرسل إشعار الـ seen فقط (بدون إعادة update)
      _notifySeenOnly(cid);
    });

  applyChatTheme(activeChat.id);
  loadMessages();
  startSeenPolling();
  startMsgPolling();
}

// ══════════════════════════════════════
// MARK SEEN — دالة موحّدة تمنع race condition و 406
// ══════════════════════════════════════
async function _markSeenOnce(cid){
  // منع الاستدعاء المتزامن
  if(_markSeenOnce._running) return;
  _markSeenOnce._running = true;

  try {
    const nowIso = new Date().toISOString();
    const {data:updated, error} = await sb.from('messages')
      .update({seen:true, seen_at:nowIso})
      .eq('chat_id', cid)
      .eq('to_id', currentUser.id)
      .eq('seen', false)
      .select('id');

    if(error){ console.error('_markSeenOnce:', error); return; }

    _clearUnreadUI(activeChat?.id);

    // لا ترسل broadcast إذا ما في رسائل فعلاً اتقرأت — يمنع seen خاطئ
    if(!updated || updated.length === 0) return;

    try {
      msgChannel?.send({
        type:'broadcast', event:'msg_seen',
        payload:{by:currentUser.id, at:nowIso}
      });
    } catch(e){}

    const otherUid = cid.split('_').find(id => id !== currentUser.id);
    if(otherUid) sendToInbox(otherUid, 'msg_seen_direct', {at:nowIso, by:currentUser.id, cid});

  } finally {
    _markSeenOnce._running = false;
  }
}

// بعد SUBSCRIBED — أرسل إشعار seen فقط إذا في فعلاً رسائل اتقرأت من الطرف الثاني
async function _notifySeenOnly(cid){
  try {
    const otherUid = cid.split('_').find(id => id !== currentUser.id);
    if(!otherUid) return;
    // تحقق من DB: هل في رسائل من الطرف الثاني تم تعليمها مقروءة؟
    const {data} = await sb.from('messages')
      .select('seen_at').eq('chat_id', cid)
      .eq('from_id', otherUid).eq('to_id', currentUser.id)
      .eq('seen', true)
      .order('seen_at', {ascending:false}).limit(1).maybeSingle();
    if(!data) return;
    const at = data.seen_at || new Date().toISOString();
    msgChannel?.send({
      type:'broadcast', event:'msg_seen',
      payload:{by:currentUser.id, at}
    });
    sendToInbox(otherUid, 'msg_seen_direct', {at, by:currentUser.id, cid});
  } catch(e){}
}

function _clearUnreadUI(userId){
  if(!userId) return;
  const el = $('ci-' + userId);
  if(!el) return;
  el.querySelector('.chat-unread-dot')?.classList.remove('show');
  el.querySelector('.chat-item-name')?.classList.remove('unread-name');
  el.querySelector('.chat-item-last')?.classList.remove('unread-preview');
}

