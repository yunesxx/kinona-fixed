// ══════════════════════════════════════
// TYPING INDICATOR
// ══════════════════════════════════════
function onMsgInput(){
  const val = $('msg-input').value.trim();
  const btn = $('send-btn');
  const rightIcons = document.getElementById('iwrap-right-icons');
  if(val.length > 0){
    btn.classList.remove('hidden');
    rightIcons.classList.add('hidden-icons');
  } else {
    btn.classList.add('hidden');
    rightIcons.classList.remove('hidden-icons');
  }

  if(!msgChannel || !activeChat) return;
  if(!isTyping){
    isTyping = true;
    msgChannel.send({type:'broadcast',event:'typing',payload:{isTyping:true, uid:currentUser.id}});
    // أرسل typing للقائمة عند الطرف الثاني
    globalMsgChannel?.send({type:'broadcast',event:'typing_global',payload:{isTyping:true, uid:currentUser.id, username:currentProfile?.username}});
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1500);
}

function stopTyping(){
  clearTimeout(typingTimer);
  if(isTyping && msgChannel){
    isTyping = false;
    msgChannel.send({type:'broadcast',event:'typing',payload:{isTyping:false, uid:currentUser.id}});
    globalMsgChannel?.send({type:'broadcast',event:'typing_global',payload:{isTyping:false, uid:currentUser.id}});
  }
}

// ══════════════════════════════════════
// CHAT MESSAGE OPTIONS (Long Press)
// ══════════════════════════════════════
function showChatOpts(id, own){
  selectedMsgId = id;
  selectedMsgIsOwn = own;
  // الحذف فقط لرسائلك، لكن التفاعل متاح على كل الرسائل
  $('opt-delete-msg-btn').style.display = own ? 'flex' : 'none';
  const overlay = $('chat-opt-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
  if(navigator.vibrate) navigator.vibrate(40);
}

function closeChatOpts(){
  const overlay = $('chat-opt-overlay');
  overlay.classList.remove('show');
  setTimeout(() => { overlay.style.display = 'none'; }, 280);
}

async function setMsgReact(emoji){
  closeChatOpts();
  const {data:msg} = await sb.from('messages').select('reaction').eq('id', selectedMsgId).single();
  let reaction = {};
  const r = msg?.reaction;
  if(r && r !== 'null') {
    try {
      const parsed = (typeof r === 'string') ? JSON.parse(r) : r;
      if(parsed && typeof parsed === 'object') reaction = parsed;
    } catch(e) {}
  }
  if(reaction[currentUser.id] === emoji) delete reaction[currentUser.id];
  else reaction[currentUser.id] = emoji;

  const {error} = await sb.from('messages').update({reaction}).eq('id', selectedMsgId);
  if(error){
    const simpleEmoji = Object.values(reaction).join('') || null;
    await sb.from('messages').update({reaction: simpleEmoji}).eq('id', selectedMsgId);
  }

  // حدّث الـ reaction في الـ DOM مباشرة بدون reload
  const row = $('msgs')?.querySelector(`[data-id="${selectedMsgId}"]`);
  if(row){
    let emojiMap = {};
    Object.values(reaction).forEach(e=>{ if(e) emojiMap[e]=(emojiMap[e]||0)+1; });
    const parts = Object.entries(emojiMap).map(([e,c])=>`${e}${c>1?'<span class="react-count-bubble"> '+c+'</span>':''}`).join('');
    let reactEl = row.querySelector('.msg-reaction');
    if(parts){
      if(!reactEl){
        reactEl = document.createElement('div');
        reactEl.className = 'msg-reaction';
        row.querySelector('.bub')?.appendChild(reactEl);
        row.style.marginBottom = '22px';
      }
      reactEl.innerHTML = parts;
    } else if(reactEl){
      reactEl.remove();
      row.style.marginBottom = '0';
    }
  }
}

async function deleteMsg(){
  if(!selectedMsgIsOwn) return;
  await sb.from('messages').delete().eq('id', selectedMsgId).eq('from_id', currentUser.id);
  closeChatOpts();
  // احذف من الـ DOM مباشرة بدون reload
  const row = $('msgs')?.querySelector(`[data-id="${selectedMsgId}"]`);
  if(row) row.remove();
  showToast('تم حذف الرسالة');
}

