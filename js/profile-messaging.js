function sendToInbox(toUserId, event, payload){
  if(!toUserId || toUserId === currentUser.id) return;
  
  const key = 'user_inbox_' + toUserId;
  
  // لو عندنا channel مفتوح ومشترك — ابعث مباشرة
  if(_inboxChannels[key]){
    try {
      _inboxChannels[key].send({type:'broadcast', event, payload});
      return;
    } catch(e) {
      delete _inboxChannels[key];
    }
  }
  
  // أنشئ channel جديد واحتفظ به
  const ch = sb.channel(key, {config:{broadcast:{self:false}}});
  ch.subscribe((status) => {
    if(status === 'SUBSCRIBED'){
      _inboxChannels[key] = ch;
      ch.send({type:'broadcast', event, payload});
      // أغلقه بعد 30 ثانية لو ما استخدم
      setTimeout(() => {
        if(_inboxChannels[key] === ch){
          delete _inboxChannels[key];
          try { sb.removeChannel(ch); } catch(e){}
        }
      }, 30000);
    } else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
      delete _inboxChannels[key];
    }
  });
}

function broadcastToInbox(toUserId, msg){
  sendToInbox(toUserId, 'new_direct_msg', {
    msg,
    sender: {
      id: currentUser.id,
      username: currentProfile?.username,
      avatar_url: currentProfile?.avatar_url || null,
      last_seen: null
    }
  });
}

function broadcastActivityNotif(toUserId, notifData){
  if(!toUserId || toUserId === currentUser.id) return;
  sendToInbox(toUserId, 'activity_notif', notifData);
}

function startGlobalMsgListener(){
  if(globalMsgChannel) sb.removeChannel(globalMsgChannel);
  // نستمع على channel خاص بالمستخدم — broadcast مباشر من المُرسِل
  globalMsgChannel = sb.channel('user_inbox_' + currentUser.id, {
    config: { broadcast: { self: false } }
  })
    .on('broadcast', {event:'new_direct_msg'}, async (payload) => {
      const msg = payload.payload?.msg;
      const sender = payload.payload?.sender;
      if(!msg || !sender) return;
      if(msg.__type === '__warmup__') return;

      if(activeChat && activeChat.id === msg.from_id){
        // الشات مفتوح — أضف الرسالة مباشرة
        appendMessage(msg, false);
        const nowIso = new Date().toISOString();
        await sb.from('messages').update({seen:true, seen_at: nowIso}).eq('id', msg.id);
        // أبلغ المُرسل بالـ seen
        // إبلاغ المُرسِل عبر chat channel إذا مفتوح، وإلا عبر global inbox
        if(msgChannel){
          msgChannel.send({type:'broadcast',event:'msg_seen',payload:{by:currentUser.id, at: nowIso}});
        }
        return;
      }

      clearChatListTyping(msg.from_id);
      notifSender = {id: msg.from_id, ...sender};
      unreadCount++;
      unreadPerChat[msg.from_id] = (unreadPerChat[msg.from_id]||0) + 1;
      updateBadge();

      const preview = msg.msg_type === 'image' ? '🖼️ صورة'
        : msg.msg_type === 'video' ? '🎥 فيديو'
        : msg.msg_type === 'sticker' ? '😊 ستكر'
        : msg.msg_type === 'img_sticker' ? '🖼️ ستكر'
        : msg.msg_type === 'share' ? '📤 منشور مشارك'
        : (msg.text || '');
      updateChatItemRealtime(msg.from_id, sender, preview, true);

      clearTimeout(notifDelayTimer);
      notifDelayTimer = setTimeout(()=>{
        showInAppNotif(sender.username, sender.avatar_url, preview);
        sendPushNotif(sender.username, preview, msg.from_id);
        // OneSignal push خارجي
        sendOSPush(currentUser.id, `💬 ${sender.username}`, preview);
      }, 800);
    })
    .on('broadcast', {event:'typing_global'}, (p) => {
      const {uid, isTyping: t, username} = p.payload;
      if(uid === currentUser.id) return;
      if(activeChat && activeChat.id === uid) return;
      if(t) showChatListTyping(uid, username);
      else clearChatListTyping(uid);
    })
    .on('broadcast', {event:'msg_seen_direct'}, (payload) => {
      const {at, by, cid} = payload.payload || {};
      if(!cid || !by || by === currentUser.id) return;
      // فقط اقبل seen من الطرف الثاني للشات (مو من نفسك أو من شخص ثالث)
      const expectedCid = [currentUser.id, by].sort().join('_');
      if(cid !== expectedCid) return;
      const seenAt = at ? new Date(at).getTime() : Date.now();
      seenTimestamps[cid] = seenAt;
      if(activeChat && activeChat.id === by) renderSeenLabel(cid);
    })
    .on('broadcast', {event:'activity_notif'}, (payload) => {
      const n = payload.payload;
      if(!n) return;
      notifUnread++;
      updateNotifBadge();
      const action = n.type === 'like' ? 'أعجب بمنشورك ❤️'
        : n.type === 'follow' ? 'بدأ بمتابعتك 👤'
        : 'علّق على منشورك 💬';
      showInAppNotif(n.actor_username, n.actor_avatar, action);
      sendPushNotif(n.actor_username, action, n.actor_id);
      // أعد تحميل القائمة فوراً
      setTimeout(() => loadNotifs(), 800);
    })
    .subscribe((status) => {
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        // أعد المحاولة بعد ثانيتين
        setTimeout(startGlobalMsgListener, 2000);
      }
    });
}

// إظهار "يكتب..." في قائمة الشاتات
function showChatListTyping(uid, username){
  const el = $('ci-'+uid);
  if(!el) return;
  const lastEl = el.querySelector('.chat-item-last');
  if(!lastEl) return;
  if(!lastEl.dataset.origText) lastEl.dataset.origText = lastEl.textContent;
  lastEl.classList.add('typing-preview');
  lastEl.innerHTML = `يكتب<span class="chat-typing-dots"><span></span><span></span><span></span></span>`;
  // إخفاء تلقائي بعد 4 ثواني
  if(chatListTyping[uid]) clearTimeout(chatListTyping[uid]);
  chatListTyping[uid] = setTimeout(()=> clearChatListTyping(uid), 4000);
}

function clearChatListTyping(uid){
  if(chatListTyping[uid]){ clearTimeout(chatListTyping[uid]); delete chatListTyping[uid]; }
  const el = $('ci-'+uid);
  if(!el) return;
  const lastEl = el.querySelector('.chat-item-last');
  if(!lastEl || !lastEl.dataset.origText) return;
  lastEl.classList.remove('typing-preview');
  lastEl.textContent = lastEl.dataset.origText;
  delete lastEl.dataset.origText;
}

// أضف رسالة للشاشة مباشرة — مع حماية من التكرار
function appendMessage(msg, isOut){
  const msgs = $('msgs');
  if(!msgs) return;
  if(msgAlreadyRendered(msg.id)) return;
  const div = document.createElement('div');
  div.className = `mrow ${isOut?'out':'in'}`;
  div.dataset.id = msg.id;
  div.dataset.own = isOut;
  const inAv = !isOut && activeChat
    ? `<div class="msg-av" onclick="openProfile('${activeChat.id}')" style="cursor:pointer;">${activeChat.avatar_url?`<img src="${activeChat.avatar_url}">`:(activeChat.username||'?')[0].toUpperCase()}</div>`
    : '';
  div.innerHTML = inAv + buildMsgBubble(msg, isOut);
  msgs.appendChild(div);
  addLongPress(div, () => showChatOpts(msg.id, isOut));

  // طبّق cosmetics على الرسالة الجديدة
  if (activeChat?.id && typeof applyChatCosmetics === 'function') {
    applyChatCosmetics(activeChat.id).catch(() => {});
  }

  // ننزل للأسفل تلقائياً بس إذا:
  // 1. أنا اللي أرسلت، أو
  // 2. المستخدم قريب من الأسفل (أقل من 120px)
  const distFromBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
  const shouldStick = isOut || distFromBottom < 120;
  if(shouldStick){
    msgs.scrollTop = msgs.scrollHeight;
  } else {
    // أظهر إشعار "رسالة جديدة"
    showNewMsgBadge();
  }

  // الصور/الفيديو تُحمَّل لاحقاً وتكبر بعد النزول للأسفل — فتختفي تحت الشاشة.
  // أعِد النزول بعد تحميل الوسائط حتى تظهر الرسالة كاملة.
  if(shouldStick){
    div.querySelectorAll('img, video').forEach(el => {
      const stick = () => { msgs.scrollTop = msgs.scrollHeight; };
      if(el.tagName === 'IMG'){
        if(!el.complete) el.addEventListener('load', stick, {once:true});
      } else {
        el.addEventListener('loadedmetadata', stick, {once:true});
        el.addEventListener('loadeddata', stick, {once:true});
      }
      el.addEventListener('error', stick, {once:true});
    });
  }
}

function showNewMsgBadge(){
  let badge = $('new-msg-badge');
  if(!badge){
    badge = document.createElement('div');
    badge.id = 'new-msg-badge';
    badge.style.cssText = 'position:absolute;bottom:70px;left:50%;transform:translateX(-50%);background:var(--grad);color:#fff;font-size:13px;font-weight:700;padding:7px 18px;border-radius:20px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.25);z-index:20;white-space:nowrap;';
    badge.textContent = '↓ رسالة جديدة';
    badge.onclick = () => {
      const msgs = $('msgs');
      msgs.scrollTop = msgs.scrollHeight;
      badge.remove();
    };
    $('chat-view').appendChild(badge);
  }
  // اخفيه تلقائياً لو نزل للأسفل
  const msgs = $('msgs');
  const onScroll = () => {
    const dist = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
    if(dist < 80){ badge.remove(); msgs.removeEventListener('scroll', onScroll); }
  };
  msgs.addEventListener('scroll', onScroll, {passive:true});
}

async function openSharedPost(postId){
  if(!postId) return;
  showLoader('جارٍ تحميل المنشور...');
  const {data:post} = await sb.from('posts').select('*').eq('id', postId).single();
  hideLoader();
  if(!post){ showToast('المنشور غير متاح'); return; }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify([post]))));
  // الـ post-viewer لازم يكون فوق الـ chat-view
  const viewer = $('post-viewer');
  viewer.style.zIndex = '6000';
  openPostViewer(b64, 0);
}

function renderSeenLabel(cid){
  const msgs = $('msgs');
  if(!msgs) return;
  const outRows = msgs.querySelectorAll('.mrow.out');
  if(!outRows.length) return;
  const last = outRows[outRows.length - 1];

  msgs.querySelectorAll('.seen-label').forEach(el => { el.closest('div[style*="justify-content"]')?.remove() || el.remove(); });
  if(seenLabelTimer){ clearInterval(seenLabelTimer); seenLabelTimer = null; }

  const seenAt = seenTimestamps[cid];
  if(!seenAt) return;

  const seenEl = document.createElement('div');
  seenEl.className = 'seen-label';
  // أبيض شفاف — يظهر فوق خلفية الشات الداكنة
  seenEl.style.cssText = 'text-align:left;font-size:11px;color:rgba(255,255,255,0.85);padding:1px 14px 8px;display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-shrink:0;';

  const eyeSvg = `<svg width="11" height="11" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

  const update = () => {
    const sec = Math.floor((Date.now() - seenAt) / 1000);
    const min = Math.floor(sec / 60);
    const hr  = Math.floor(min / 60);
    let label;
    if(sec < 60)       label = 'Seen just now';
    else if(min === 1) label = 'Seen 1 min ago';
    else if(min < 60)  label = `Seen ${min} mins ago`;
    else if(hr === 1)  label = 'Seen 1 hour ago';
    else               label = `Seen ${hr} hours ago`;
    seenEl.innerHTML = `${eyeSvg} ${label}`;
  };

  update();
  // ضع الـ seen في row مستقل محاذي لليسار (جهة الـ out)
  const seenRow = document.createElement('div');
  seenRow.style.cssText = 'display:flex;justify-content:flex-start;padding:0 8px 4px;';
  seenRow.appendChild(seenEl);
  last.after(seenRow);
  msgs.scrollTop = msgs.scrollHeight;

  // تحديث كل 30 ثانية — يستمر حتى تغلق المحادثة
  seenLabelTimer = setInterval(()=>{
    if(!document.contains(seenEl)){ clearInterval(seenLabelTimer); seenLabelTimer = null; return; }
    update();
  }, 30000);
}

// polling كل 5 ثواني للـ seen من الـ DB
function startSeenPolling(){
  stopSeenPolling();
  seenPollTimer = setInterval(async ()=>{
    if(!activeChat || !currentUser) return;
    const cid = [currentUser.id, activeChat.id].sort().join('_');
    // هل في رسائل أرسلتها وشافها الطرف الثاني؟
    const {data} = await sb.from('messages')
      .select('seen_at, seen, created_at')
      .eq('chat_id', cid)
      .eq('from_id', currentUser.id)
      .eq('seen', true)
      .order('created_at', {ascending:false})
      .limit(1)
      .single();
    if(data){
      const ts = data.seen_at
        ? new Date(data.seen_at).getTime()
        : Date.now();
      // بس اعرض لو أحدث من اللي موجود
      if(!seenTimestamps[cid] || ts > seenTimestamps[cid]){
        seenTimestamps[cid] = ts;
        renderSeenLabel(cid);
      }
    }
  }, 5000);
}

function stopSeenPolling(){
  if(seenPollTimer){ clearInterval(seenPollTimer); seenPollTimer = null; }
}

