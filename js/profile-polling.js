// ══════════════════════════════════════
// MESSAGE POLLING — شبكة أمان للرسائل الواردة
// تضمن ظهور الرسائل خلال ثوانٍ حتى لو فشل الـ broadcast
// (بدون أي تحديث يدوي من المستخدم)
// ══════════════════════════════════════
let _msgPollBusy = false;
function startMsgPolling(){
  stopMsgPolling();
  _msgPollTimer = setInterval(async () => {
    if(!activeChat || !currentUser || document.hidden) return;
    if(_msgPollBusy) return;                 // امنع التداخل بين الدورات
    _msgPollBusy = true;
    const cid = [currentUser.id, activeChat.id].sort().join('_');
    const PAGE = 50;
    let appended = false, nowIso = new Date().toISOString();
    try {
      // لاحِق كل الدفعة حتى لو تراكمت رسائل كثيرة (drain) — لا نكتفي بـ 50
      while(true){
        let q = sb.from('messages').select('*')
          .eq('chat_id', cid)
          .eq('from_id', activeChat.id)        // رسائلي تُعرض فوراً بالـ optimistic
          .order('created_at', {ascending:true})
          .limit(PAGE);
        if(_lastMsgSync) q = q.gt('created_at', _lastMsgSync);
        const {data, error} = await q;
        if(error || !data || !data.length) break;

        data.forEach(m => {
          if(m.created_at && (!_lastMsgSync || m.created_at > _lastMsgSync)) _lastMsgSync = m.created_at;
          if(msgAlreadyRendered(m.id)) return;
          appendMessage(m, false);
          appended = true;
        });

        if(data.length < PAGE) break;          // وصلنا لآخر الرسائل
        if(!activeChat) break;                  // أُغلقت المحادثة أثناء السحب
      }
    } catch(e){ console.warn('msgPoll:', e); }
    finally { _msgPollBusy = false; }

    if(appended && activeChat){
      // علّم كمقروء + أبلغ المُرسِل
      sb.from('messages').update({seen:true, seen_at:nowIso})
        .eq('chat_id', cid).eq('from_id', activeChat.id).eq('seen', false);
      msgChannel?.send({type:'broadcast', event:'msg_seen', payload:{by:currentUser.id, at:nowIso}});
      _clearUnreadUI(activeChat.id);
    }
  }, 2500);
}

function stopMsgPolling(){
  if(_msgPollTimer){ clearInterval(_msgPollTimer); _msgPollTimer = null; }
}

function buildMsgBubble(msg, isOut, reactHtml){
  const r = reactHtml || '';
  const type = msg.msg_type || 'text';

  // رسالة صوتية
  if(msg.audio_url || type === 'audio'){
    const url = escHtml(msg.audio_url || msg.media_url || '');
    const color = isOut ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)';
    return `<div class="bub" style="min-width:180px;padding:10px 14px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button onclick="toggleAudio(this)" style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
          <svg class="play-ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          <svg class="pause-ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <div style="flex:1;">
          <input type="range" min="0" max="100" value="0" class="audio-seek" style="width:100%;accent-color:#fff;cursor:pointer;">
          <audio src="${url}" preload="none" style="display:none"></audio>
        </div>
        <span class="audio-time" style="font-size:12px;color:${color};font-family:monospace;min-width:32px;">0:00</span>
      </div>
      ${r}
    </div>`;
  }
  if(type === 'image'){
    const url = escHtml(msg.media_url||'');
    const cap = msg.text ? `<div style="padding:6px 10px 2px;font-size:14px;color:${isOut?'rgba(255,255,255,.9)':'#fff'}">${escHtml(msg.text)}</div>` : '';
    return `<div class="bub media-bub" style="position:relative"><img src="${url}" class="msg-img" loading="lazy" decoding="async" onclick="openImgFull('${url}')">${cap}${r}</div>`;
  }
  if(type === 'video'){
    const url = escHtml(msg.media_url||'');
    const poster = escHtml((typeof cldVidPoster==='function') ? cldVidPoster(msg.media_url||'', 480) : '');
    const posterAttr = poster ? ` poster="${poster}"` : '';
    return `<div class="bub media-bub" style="position:relative;padding:4px;">
      <div style="position:relative;width:220px;max-width:100%;border-radius:10px;overflow:hidden;background:#000;cursor:pointer;"
        onclick="const v=this.querySelector('video');const ic=this.querySelector('.vplay-ic');if(v.paused){v.play();ic.style.opacity='0';}else{v.pause();ic.style.opacity='1';}">
        <video src="${url}"${posterAttr} playsinline preload="metadata"
          style="width:100%;display:block;max-height:320px;object-fit:cover;"
          onended="this.parentNode.querySelector('.vplay-ic').style.opacity='1'">
        </video>
        <div class="vplay-ic" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);opacity:1;transition:opacity .2s;pointer-events:none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity=".9"><circle cx="12" cy="12" r="12" fill="rgba(0,0,0,.4)"/><polygon points="10,8 17,12 10,16" fill="white"/></svg>
        </div>
      </div>
      ${r}
    </div>`;
  }
  if(type === 'sticker'){
    return `<div class="bub media-bub" style="position:relative"><span class="msg-sticker-emoji">${escHtml(msg.text)}</span>${r}</div>`;
  }
  if(type === 'img_sticker'){
    const url = escHtml(msg.media_url||'');
    return `<div style="background:none;border:none;padding:4px;cursor:pointer" onclick="openImgFull('${url}')">
      <img src="${url}" style="width:120px;height:120px;object-fit:contain;border-radius:12px;display:block;" loading="lazy">
      ${r}
    </div>`;
  }
  if(type === 'share'){
    const rawText = msg.text || '';
    const pidMatch = rawText.match(/\|\|PID:([a-f0-9\-]{36})$/);
    const pid = pidMatch ? pidMatch[1] : '';
    const cleanCaption = rawText.replace(/^📤 شارك منشور:\n/,'').replace(/\|\|PID:[a-f0-9\-]{36}$/,'').trim();
    const murl = escHtml(msg.media_url||'');
    const isVid = murl && (murl.endsWith('.mp4')||murl.endsWith('.mov')||murl.endsWith('.webm')||murl.includes('video'));
    let mediaHtml;
    if(isVid){
      mediaHtml = `<div class="share-reel-media">
        <video src="${murl}" playsinline preload="metadata" muted></video>
        <div class="share-reel-overlay"></div>
        <div class="share-reel-play">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span class="share-reel-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
          ريل
        </span>
      </div>`;
    } else if(murl){
      mediaHtml = `<div class="share-reel-media">
        <img src="${murl}" loading="lazy">
        <div class="share-reel-overlay"></div>
      </div>`;
    } else {
      mediaHtml = `<div class="share-reel-media" style="background:linear-gradient(135deg,#ff416c,#ff6b35);">
        <div style="font-size:36px;display:flex;align-items:center;justify-content:center;height:100%;">📤</div>
      </div>`;
    }
    const clickAct = pid ? `openSharedPost('${pid}')` : '';
    return `<div class="bub share-reel-card" ${clickAct?`onclick="${clickAct}"`:''} ${clickAct?'style="cursor:pointer;"':''}>
      ${mediaHtml}
      ${cleanCaption ? `<div class="share-reel-caption">${escHtml(cleanCaption.substring(0,90))}${cleanCaption.length>90?'…':''}</div>` : ''}
      <div class="share-reel-footer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        <span>${pid ? 'منشور مشارك · افتحه' : 'منشور مشارك'}</span>
      </div>
      ${r}
    </div>`;
  }
  return `<div class="bub">${escHtml(msg.text)}${r}</div>`;
}

// حدّث بند في القائمة
function updateChatItemRealtime(fromId, sender, text, hasUnread){
  const el = $('ci-'+fromId);
  if(!el){ loadChats(); return; }
  const lastEl = el.querySelector('.chat-item-last');
  if(lastEl){ lastEl.textContent = text; lastEl.classList.toggle('unread-preview', hasUnread); delete lastEl.dataset.origText; }
  const dot = el.querySelector('.chat-unread-dot');
  if(dot && hasUnread) dot.classList.add('show');
  const parent = el.parentNode;
  parent.insertBefore(el, parent.firstChild);
}

// رفع محادثة لفوق القائمة عند الإرسال
function bumpChatToTop(toUserId, previewText){
  const el = $('ci-'+toUserId);
  if(!el){ return; } // سيُحدَّث في loadChats القادم
  const lastEl = el.querySelector('.chat-item-last');
  if(lastEl){ lastEl.textContent = previewText; delete lastEl.dataset.origText; }
  const parent = el.parentNode;
  if(parent && el !== parent.firstChild) parent.insertBefore(el, parent.firstChild);
}

let notifDelayTimer = null;

function updateBadge(){
  const badge = $('msg-badge');
  if(unreadCount > 0){
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

async function loadUnreadCount(){
  // احسب الرسائل غير المقروءة مباشرة من seen=false
  const {data} = await sb.from('messages')
    .select('from_id')
    .eq('to_id', currentUser.id)
    .eq('seen', false);
  if(data){
    data.forEach(m => {
      unreadPerChat[m.from_id] = (unreadPerChat[m.from_id]||0) + 1;
    });
    unreadCount = data.length;
  }
  updateBadge();
}

function showInAppNotif(name, avatarUrl, text){
  const card = $('notif-card');
  $('notif-name').textContent = name;
  $('notif-msg').textContent = text || '📷 صورة';
  $('notif-av').innerHTML = avatarUrl
    ? `<img src="${avatarUrl}">`
    : `<span>${(name||'?')[0].toUpperCase()}</span>`;
  card.classList.add('show');
  if(notifHideTimer) clearTimeout(notifHideTimer);
  notifHideTimer = setTimeout(hideInAppNotif, 4500);
}

function hideInAppNotif(){
  $('notif-card').classList.remove('show');
}

function onNotifClick(){
  hideInAppNotif();
  if(notifSender){
    // افتح صفحة الدردشة
    showPage('messages', $('nav-messages'));
    // افتح المحادثة بعد ثانية
    setTimeout(async ()=>{
      const {data:p} = await sb.from('profiles').select('*').eq('id', notifSender.id).single();
      if(p) openChat(p);
    }, 300);
  }
}

function sendPushNotif(name, text, senderId){
  if(!('Notification' in window)) return;
  if(Notification.permission !== 'granted') return;
  // لا ترسل إشعار لو الشات مفتوح مع المُرسل والتطبيق نشط
  if(!document.hidden && activeChat && activeChat.id === senderId) return;
  try {
    const n = new Notification(`💬 ${name}`, {
      body: text || '📷 صورة',
      icon: 'https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/kinona_icon.png',
      tag: 'kinona-msg-' + (senderId||Date.now()),
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200]
    });
    n.onclick = () => { window.focus(); onNotifClick(); n.close(); };
  } catch(e){ console.log('notif err',e); }
}

// ══════════════════════════════════════
// PAGE NAVIGATION — يبقى عند ريفريش
// ══════════════════════════════════════
