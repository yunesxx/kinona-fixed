function openChatInfo(){
  if(!activeChat) return;
  const ci = $('chat-info');
  
  // بيانات المستخدم
  $('ci-av').innerHTML = makeAv(activeChat.username, activeChat.avatar_url, 82);
  $('ci-uname').textContent = activeChat.display_name || activeChat.username;
  const diff = activeChat.last_seen ? (Date.now()-new Date(activeChat.last_seen))/1000 : 99999;
  $('ci-ustatus').textContent = diff < 120 ? 'متصل الآن' : formatLastSeen(activeChat.last_seen);
  
  // ثيمات
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const savedTheme = localStorage.getItem('chat_theme_'+cid) || 'forest';
  $('ci-themes-list').innerHTML = CHAT_THEMES.map(t => {
    const bg = t.url ? `background:url('${t.url}') center/cover` : `background:${t.color}`;
    return `<div class="ci-theme-item ${t.id===savedTheme?'active':''}" 
      onclick="setChatTheme('${t.id}','${cid}')" 
      style="${bg};border-radius:14px;"
      title="${t.name}">
      ${t.id===savedTheme?'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5"/></svg></div>':''}
    </div>`;
  }).join('');
  
  // وسائط مشتركة
  loadSharedMedia(cid);
  
  // كتم
  const isMuted = chatMuted[activeChat.id];
  $('ci-mute-lbl').textContent = isMuted ? 'إلغاء الكتم' : 'كتم';
  
  // أغلق الثيمات عند كل فتح
  $('ci-themes-list').classList.remove('open');
  $('ci-theme-toggle').classList.remove('open');

  ci.classList.add('show');
}

function closeChatInfo(){
  $('chat-info').classList.remove('show');
}

function setChatTheme(themeId, cid){
  localStorage.setItem('chat_theme_'+cid, themeId);
  const theme = CHAT_THEMES.find(t=>t.id===themeId);
  if(!theme) return;
  // طبّق على الشات
  const chatView = $('chat-view');
  if(theme.url){
    chatView.style.background = `url('${theme.url}') center top/cover no-repeat`;
  } else {
    chatView.style.background = theme.color;
  }
  // حدّث الـ UI
  document.querySelectorAll('.ci-theme-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  showToast(`ثيم "${theme.name}" ✓`);
}

function applyChatTheme(userId){
  const cid = [currentUser.id, userId].sort().join('_');
  const themeId = localStorage.getItem('chat_theme_'+cid) || 'forest';
  const theme = CHAT_THEMES.find(t=>t.id===themeId);
  if(!theme) return;
  const chatView = $('chat-view');
  if(theme.url){
    chatView.style.background = `url('${theme.url}') center top/cover no-repeat`;
  } else {
    chatView.style.background = theme.color;
  }
}

function toggleCiSearch(){
  const wrap = $('ci-search-wrap');
  wrap.classList.toggle('open');
  if(wrap.classList.contains('open')) setTimeout(()=>$('ci-search-input').focus(), 320);
}

async function searchInChat(q){
  const results = $('ci-search-results');
  q = (q||'').trim();
  if(!q){ results.innerHTML=''; return; }
  if(!activeChat) return;
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data} = await sb.from('messages')
    .select('text,created_at')
    .eq('chat_id', cid)
    .ilike('text', `%${q}%`)
    .order('created_at',{ascending:false})
    .limit(30);
  if(!data || data.length===0){
    results.innerHTML='<div class="ci-search-empty">لا توجد نتائج</div>';
    return;
  }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re  = new RegExp(`(${esc(q)})`,'gi');
  results.innerHTML = data.map(m=>{
    const highlighted = (m.text||'').replace(re,'<mark>$1</mark>');
    const t = m.created_at ? new Date(m.created_at).toLocaleDateString('ar',{month:'short',day:'numeric'}) : '';
    return `<div class="ci-search-item"><span style="color:#bbb;font-size:11px;float:left">${t}</span>${highlighted}</div>`;
  }).join('');
}

function toggleCiMedia(){
  const btn  = $('ci-media-toggle');
  const wrap = $('ci-media-wrap');
  btn.classList.toggle('open');
  wrap.classList.toggle('open');
}

function toggleCiThemes(){
  const btn = $('ci-theme-toggle');
  const list = $('ci-themes-list');
  btn.classList.toggle('open');
  list.classList.toggle('open');
}

function toggleChatMute(){
  if(!activeChat) return;
  chatMuted[activeChat.id] = !chatMuted[activeChat.id];
  const isMuted = chatMuted[activeChat.id];
  $('ci-mute-lbl').textContent = isMuted ? 'إلغاء الكتم' : 'كتم';
  showToast(isMuted ? '🔕 تم كتم المحادثة' : '🔔 تم إلغاء الكتم');
}

function reportUser(){
  if(!activeChat) return;
  if(!confirm(`هل تريد الإبلاغ عن ${activeChat.display_name||activeChat.username}؟`)) return;
  sb.from('reports').insert({
    reporter_id: currentUser.id,
    reported_id: activeChat.id,
    reason: 'chat',
    created_at: new Date().toISOString()
  }).then(()=>{
    showToast('تم الإبلاغ، سنراجع الأمر قريباً');
    closeChatInfo();
  });
}

async function loadSharedMedia(cid){
  const grid = $('ci-media-grid');
  const {data} = await sb.from('messages')
    .select('media_url,msg_type')
    .eq('chat_id', cid)
    .in('msg_type', ['image','video'])
    .order('created_at',{ascending:false})
    .limit(18);
  
  if(!data || data.length===0){
    grid.innerHTML = '<div style="padding:30px;text-align:center;color:#bbb;font-size:13px;grid-column:1/-1;">لا يوجد وسائط مشتركة بعد</div>';
    return;
  }
  
  grid.innerHTML = data.map(m => {
    const url = escHtml(m.media_url||'');
    if(m.msg_type==='video'){
      return `<div class="ci-media-thumb" onclick="openVideoFull('${url}')">
        <video src="${url}" preload="metadata" muted style="width:100%;height:100%;object-fit:cover;"></video>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>`;
    }
    return `<div class="ci-media-thumb" onclick="openImgFull('${url}')">
      <img src="${url}" loading="lazy">
    </div>`;
  }).join('');
}

function openVideoFull(url){
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML=`<video src="${url}" controls autoplay playsinline style="max-width:100%;max-height:100vh;"></video>
    <button onclick="this.parentNode.remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:24px;width:44px;height:44px;border-radius:50%;cursor:pointer;">✕</button>`;
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
}


