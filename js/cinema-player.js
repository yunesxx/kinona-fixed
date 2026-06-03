// ── تحميل فيديو ──
function ciLoadVideo(url, startTime = 0){
  const vid = $('cinema-video');
  vid.src = url;
  vid.muted = true;
  vid.load();
  // نضبط الوقت بعد ما يتحمل metadata — أدق من oncanplay
  vid.onloadedmetadata = () => {
    if(startTime > 1){
      vid.currentTime = startTime;
    }
    vid.onloadedmetadata = null;
    vid.play().then(() => {
      ciShowUnmuteBtn(vid);
    }).catch(()=>{});
  };
}

function ciShowUnmuteBtn(vid){
  if(ciIsAdmin) return;
  let btn = document.getElementById('ci-unmute-btn');
  if(btn) return;
  btn = document.createElement('div');
  btn.id = 'ci-unmute-btn';
  btn.style.cssText = 'position:absolute;bottom:80px;right:16px;z-index:50;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);border-radius:20px;padding:8px 16px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.2);';
  btn.textContent = '🔇 اضغط لفتح الصوت';
  btn.onclick = () => { vid.muted = false; btn.remove(); };
  document.getElementById('cinema-room').appendChild(btn);
}

function ciSeekFromClick(e){
  const wrap = $('ci-progress-wrap');
  const r = wrap.getBoundingClientRect();
  const pct = (e.clientX - r.left) / r.width;
  const vid = $('cinema-video');
  if(!vid.duration) return;
  vid.currentTime = pct * vid.duration;
  if(ciIsAdmin) ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'seek', time: vid.currentTime}});
}

// ── تحكم الفيديو ──
function ciPlayPause(){
  const vid = $('cinema-video');
  if(!vid.src){ showToast('لا يوجد فيلم بعد'); return; }
  if(ciIsAdmin){
    if(vid.paused){
      vid.play();
      ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'play', time: vid.currentTime}});
    } else {
      vid.pause();
      ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'pause', time: vid.currentTime}});
    }
  } else {
    // المشاهد العادي يلعب/يوقف محلياً فقط
    vid.paused ? vid.play() : vid.pause();
  }
}

function ciSkip(sec){
  const vid = $('cinema-video');
  if(!vid.src) return;
  vid.currentTime = Math.max(0, vid.currentTime + sec);
  if(ciIsAdmin){
    ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'seek', time: vid.currentTime}});
  }
}

function ciSeek(e){
  const vid = $('cinema-video');
  if(!vid.src || !vid.duration) return;
  const wrap = $('ci-progress-wrap');
  const rect = wrap.getBoundingClientRect();
  const ratio = 1 - (e.clientX - rect.left) / rect.width; // RTL
  const t = ratio * vid.duration;
  vid.currentTime = t;
  if(ciIsAdmin){
    ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'seek', time: t}});
  }
}

function ciSetVol(v){ $('cinema-video').volume = v; }

function ciFullscreen(){
  const wrap = $('cinema-video-wrap');
  if(document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen?.() || wrap.webkitRequestFullscreen?.();
}

// ── Remote commands (للمشاهدين) ──
function ciRemotePlay(time){ const v=$('cinema-video'); v.currentTime=time; v.play(); }
function ciRemotePause(time){ const v=$('cinema-video'); v.currentTime=time; v.pause(); }
function ciRemoteSeek(time){ $('cinema-video').currentTime=time; }

// ── Progress bar ──
function ciUpdateProgress(){
  const vid = $('cinema-video');
  if(!vid.duration) return;
  const pct = (vid.currentTime / vid.duration) * 100;
  $('ci-progress-fill').style.width = pct + '%';
  $('ci-progress-thumb').style.right = (100 - pct) + '%';
  $('ci-time').textContent = ciFormatTime(vid.currentTime) + ' / ' + ciFormatTime(vid.duration);
}

function ciFormatTime(s){
  if(!s || isNaN(s)) return '0:00';
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// ── Controls auto-hide ──
function ciShowControls(){
  const ctrl = $('cinema-controls');
  ctrl.classList.add('visible');
  clearTimeout(ciControlsTimer);
  ciControlsTimer = setTimeout(()=> ctrl.classList.remove('visible'), 4000);
}
function ciToggleControls(){
  const ctrl = $('cinema-controls');
  if(ctrl.classList.contains('visible')){
    ctrl.classList.remove('visible');
  } else {
    ciShowControls();
  }
}

// ── Chat ──
function ciSendMsg(){
  const input = $('cinema-chat-input');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  const payload = {
    uid: currentUser.id,
    username: currentProfile.username,
    text,
    is_admin: ciIsAdmin,
    ts: Date.now()
  };
  ciChannel?.send({type:'broadcast', event:'ci_msg', payload});
  ciAppendMsg(payload); // أضف لنفسك فوراً
}

function ciAppendMsg(p){
  // لو reaction — فقط طيّره
  if(p.is_react){ ciShowFlyReact(p.text); return; }

  const msgs = $('cinema-chat-msgs');
  const div = document.createElement('div');
  div.className = 'cinema-chat-msg' + (p.is_admin ? ' cinema-msg-admin' : '');
  div.style.cssText = 'display:flex;align-items:flex-start;gap:5px;max-width:100%;';
  div.innerHTML = `<span class="cinema-msg-name" style="font-size:12px;font-weight:800;color:${p.is_admin?'#ffd200':'#ff6b35'};flex-shrink:0;white-space:nowrap;">${escHtml(p.username||'?')}:</span>
    <span style="font-size:12px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.9);line-height:1.4;word-break:break-word;">${escHtml(p.text)}</span>`;
  msgs.appendChild(div);
  while(msgs.children.length > 30) msgs.removeChild(msgs.firstChild);
  // أخفِ بعد 7 ثواني
  setTimeout(()=>{ div.style.opacity='0'; div.style.transition='opacity 1s'; }, 7000);
  setTimeout(()=>{ div.remove(); }, 8000);
}

