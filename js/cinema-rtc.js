// ── Supabase Realtime Channel ──
function ciJoinChannel(){
  if(ciChannel) sb.removeChannel(ciChannel);

  ciChannel = sb.channel(CINEMA_CHANNEL, {config:{presence:{key: currentUser.id}}})
    // Chat messages
    .on('broadcast', {event:'ci_msg'}, p => {
      ciAppendMsg(p.payload);
    })
    // Admin commands
    .on('broadcast', {event:'ci_cmd'}, p => {
      const cmd = p.payload;
      if(cmd.type === 'play'){ ciRemotePlay(cmd.time); }
      else if(cmd.type === 'pause'){ ciRemotePause(cmd.time); }
      else if(cmd.type === 'seek'){ ciRemoteSeek(cmd.time); }
      else if(cmd.type === 'load'){ ciLoadVideo(cmd.url); }
      else if(cmd.type === 'kick' && cmd.target === currentUser.id && !ciIsAdmin){
        ciExit(); showToast('🚫 تم طردك من السينما');
      }
      else if(cmd.type === 'kick_all' && !ciIsAdmin){
        ciExit(); showToast('🚫 تم إغلاق السينما');
      }
      else if(cmd.type === 'announce'){
        ciShowAnnouncement(cmd.text);
      }
    })
    // ── نظام المشاهدين عبر broadcast ──
    .on('broadcast', {event:'ci_join'}, ({payload}) => {
      if(payload?.user_id){
        ciViewers[payload.user_id] = { username: payload.username, avatar_url: payload.avatar_url||null };
        ciUpdateViewers();
      }
    })
    .on('broadcast', {event:'ci_leave'}, ({payload}) => {
      if(payload?.user_id){
        delete ciViewers[payload.user_id];
        ciUpdateViewers();
      }
    })
    .on('broadcast', {event:'ci_ping'}, ({payload}) => {
      // رد على طلب قائمة المشاهدين من الأدمن
      if(!ciIsAdmin){
        ciChannel.send({type:'broadcast', event:'ci_join', payload:{
          user_id: currentUser.id,
          username: currentProfile.username,
          avatar_url: currentProfile.avatar_url||null
        }});
      }
    })
    // Presence كـ fallback إضافي
    .on('presence', {event:'sync'}, () => {
      const state = ciChannel.presenceState();
      for(const key in state){
        const arr = state[key];
        if(!Array.isArray(arr)) continue;
        arr.forEach(p => {
          const uid = p.user_id || p.id;
          if(uid && !p._ghost){
            ciViewers[uid] = { username: p.username||uid, avatar_url: p.avatar_url||null };
          }
        });
      }
      ciUpdateViewers();
    })
    .on('presence', {event:'join'}, ({newPresences}) => {
      newPresences.forEach(p => {
        const uid = p.user_id || p.id;
        if(uid && !p._ghost) ciViewers[uid] = { username: p.username||uid, avatar_url: p.avatar_url||null };
      });
      ciUpdateViewers();
    })
    .on('presence', {event:'leave'}, ({leftPresences}) => {
      leftPresences.forEach(p => {
        const uid = p.user_id || p.id;
        if(uid) delete ciViewers[uid];
      });
      ciUpdateViewers();
    })
    .subscribe(async (status) => {
      if(status === 'SUBSCRIBED'){
        await ciChannel.track({
          user_id: currentUser.id,
          username: currentProfile.username,
          avatar_url: currentProfile.avatar_url || null,
          is_admin: ciIsAdmin
        });
        if(!ciIsAdmin){
          ciChannel.send({type:'broadcast', event:'ci_join', payload:{
            user_id: currentUser.id,
            username: currentProfile.username,
            avatar_url: currentProfile.avatar_url||null
          }});
          ciViewers[currentUser.id] = { username: currentProfile.username, avatar_url: currentProfile.avatar_url||null };
          ciUpdateViewers();
          // ── جلب الوقت الحالي من DB مباشرة للتزامن ──
          setTimeout(async () => {
            const [{data:vd},{data:td}] = await Promise.all([
              sb.from('cinema_settings').select('value').eq('key','video_url').single(),
              sb.from('cinema_settings').select('value').eq('key','current_time').single(),
            ]);
            if(vd?.value){
              const vid = $('cinema-video');
              const savedTime = parseFloat(td?.value || 0);
              // لو الفيديو نفسه — اضبط الوقت فقط
              if(vid.src && vid.src.includes(vd.value.split('/').pop())){
                if(Math.abs(vid.currentTime - savedTime) > 3){
                  vid.currentTime = savedTime;
                  vid.play().catch(()=>{});
                }
              } else {
                // فيديو مختلف أو ما في فيديو — حمّله
                ciLoadVideo(vd.value, savedTime);
              }
            }
          }, 1500);
        }
        if(ciIsAdmin){
          setTimeout(() => {
            ciChannel.send({type:'broadcast', event:'ci_ping', payload:{}});
          }, 500);
        }
      }
    });
}

// ── تحديث قائمة المشاهدين ──
// 1. العقل المدبر لتحديث المشاهدين في كل مكان
function ciUpdateViewers(){
  const count = Object.keys(ciViewers).length;
  const countEl = document.getElementById('ci-viewers-count');
  if(countEl) countEl.textContent = count;
  // تحديث اللوحة الصغيرة (التي تظهر داخل شاشة السينما)
  if(ciIsAdmin){
    const list = document.getElementById('cinema-viewers-list');
    if(list){
      if(count === 0){
        list.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,.3);text-align:center;padding:8px 0;">لا أحد هنا بعد</div>';
      } else {
        list.innerHTML = Object.entries(ciViewers).map(([uid, info]) =>
          `<div class="cinema-viewer-item">
            <span class="cinema-viewer-name">${info.username || '?'}</span>
            <button class="cinema-kick-btn" onclick="ciKick('${uid}')">طرد</button>
          </div>`
        ).join('');
      }
    }
  }
  // ★ تحديث صفحة الإدارة الفخمة فوراً — سواء كانت مفتوحة أو لا
  if(typeof acpRefreshUI === 'function') acpRefreshUI();
  // تحديث قائمة البروفايل (إذا كنت فاتح البروفايل)
  if(currentProfile?.username === '7r.9' && typeof ciUpdateProfileViewers === 'function') {
      ciUpdateProfileViewers(ciViewers);
  }
}

