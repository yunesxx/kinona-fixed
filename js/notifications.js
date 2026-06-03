function updateNotifBadge(){
  const b = $('notif-badge2');
  const b2 = $('notif-badge-bell');
  const b3 = $('notif-badge-bell-inline');
  const show = notifUnread > 0;
  const txt = notifUnread > 99 ? '99+' : notifUnread;
  if(b){ if(show){ b.textContent=txt; b.classList.add('show'); } else b.classList.remove('show'); }
  if(b2){ if(show){ b2.textContent=txt; b2.classList.add('show'); } else b2.classList.remove('show'); }
  if(b3){ if(show){ b3.textContent=txt; b3.classList.add('show'); } else b3.classList.remove('show'); }
  ['bell-notif-btn','bell-notif-btn-inline'].forEach(id => {
    const btn = $(id);
    if(!btn) return;
    if(show){
      btn.classList.add('has-notif');
      const bell = btn.querySelector('.bell');
      if(bell){ bell.style.animation='none'; setTimeout(()=>{ bell.style.animation='bellRing .9s both'; },10); }
    } else {
      btn.classList.remove('has-notif');
    }
  });
}

async function loadNotifs(){
  const list = $('notifs-list');
  list.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';

  const {data} = await sb.from('notifications')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', {ascending:false})
    .limit(60);

  // ضع الكل كـ seen
  sb.from('notifications').update({seen:true})
    .eq('user_id', currentUser.id).eq('seen', false).then(()=>{});
  notifUnread = 0;
  updateNotifBadge();

  if(!data || data.length === 0){
    list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><p>لا يوجد إشعارات بعد</p></div>';
    return;
  }

  list.innerHTML = data.map(n => {
    const typeIcon = n.type === 'like'
      ? '<div class="notif-type-icon notif-type-like">❤️</div>'
      : n.type === 'follow'
      ? '<div class="notif-type-icon notif-type-follow">👤</div>'
      : '<div class="notif-type-icon notif-type-comment">💬</div>';

    const action = n.type === 'like' ? 'أعجب بمنشورك'
      : n.type === 'follow' ? 'بدأ بمتابعتك'
      : `علّق: ${n.body||''}`;

    const thumb = n.post_image
      ? `<img class="notif-post-thumb" src="${escHtml(n.post_image)}">`
      : n.type === 'follow' ? '' : `<div class="notif-post-thumb" style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:20px;">📄</div>`;

    const onclick = n.type === 'follow'
      ? `openProfile('${n.actor_id}')`
      : n.post_id ? `openProfile('${n.actor_id}')` : '';

    return `<div class="notif-item ${n.seen?'':'unseen'}" onclick="${onclick}">
      <div class="notif-av-wrap">
        ${makeAv(n.actor_username, n.actor_avatar, 46)}
        ${typeIcon}
      </div>
      <div class="notif-body">
        <span class="notif-actor">${escHtml(n.actor_username||'')}</span>
        <span class="notif-action"> ${escHtml(action)}</span>
        <div class="notif-time-small">${getTimeAgo(n.created_at)}</div>
      </div>
      ${thumb}
    </div>`;
  }).join('');
}

async function createNotif(userId, type, postId, postImage, body){
  if(userId === currentUser.id) return;
  const notifData = {
    user_id: userId,
    actor_id: currentUser.id,
    actor_username: currentProfile.username,
    actor_avatar: currentProfile.avatar_url || null,
    type,
    post_id: postId || null,
    post_image: postImage || null,
    body: body || null,
    seen: false,
    created_at: new Date().toISOString()
  };
  // ١. احفظ في الـ DB + log أي خطأ
  const {error:notifErr} = await sb.from('notifications').insert(notifData);
  if(notifErr) console.error('notifications insert error:', notifErr);
  // ٢. broadcast فوري لـ inbox المستلم بغض النظر عن الـ DB
  broadcastActivityNotif(userId, notifData);
  // ٣. OneSignal push خارجي
  const osTitle = '💬 kinona';
  const osMsg = notifData.type === 'like' ? `${notifData.actor_username} أعجب بمنشورك ❤️`
    : notifData.type === 'follow' ? `${notifData.actor_username} بدأ بمتابعتك 👤`
    : `${notifData.actor_username} علّق على منشورك 💬`;
  sendOSPush(userId, osTitle, osMsg);
}

function startNotifListener(){
  // الإشعارات الآن تُستقبل عبر user_inbox channel في startGlobalMsgListener
  // هذه الدالة مبقية للتوافق
}


// ══════════════════════════════════════
// ONESIGNAL PUSH NOTIFICATIONS
// ══════════════════════════════════════

// حفظ الـ OneSignal Player ID في الـ DB
async function saveOSPlayerId(){
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal){
    const playerId = await OneSignal.User.PushSubscription.id;
    if(playerId && currentUser){
      await sb.from('profiles').update({os_player_id: playerId}).eq('id', currentUser.id);
    }
  });
}

// sendOSPush — تم نقلها للأعلى (السطر ~2228) وتستدعي الـ Edge Function


// ══════════════════════════════════════
// CHAT INFO PAGE
// ══════════════════════════════════════
const CHAT_THEMES = [{"id": "forest", "name": "غابة", "url": "https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/1775252353605.png"}, {"id": "dark", "name": "داكن", "color": "#0d0d0d"}, {"id": "ocean", "name": "محيط", "color": "linear-gradient(160deg,#0f2027,#203a43,#2c5364)"}, {"id": "sunset", "name": "غروب", "color": "linear-gradient(160deg,#ff416c,#ff4b2b)"}, {"id": "mint", "name": "نعناع", "color": "linear-gradient(160deg,#134e5e,#71b280)"}, {"id": "purple", "name": "بنفسجي", "color": "linear-gradient(160deg,#360033,#0b8793)"}, {"id": "sand", "name": "رملي", "color": "linear-gradient(160deg,#c9a96e,#e8d5b0)"}];
let chatMuted = {};

