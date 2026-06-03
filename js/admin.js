function checkAdminAndOpen(){
  showAdminLoginModal(() => { openAdminPage(); });
}


// تفاعلات السينما — تطير على الشاشة
function ciReact(emoji){
  if(ciChannel) ciChannel.send({type:'broadcast', event:'ci_msg', payload:{
    uid: currentUser?.id, username: currentProfile?.username || '?',
    text: emoji, is_admin: false, ts: Date.now(), is_react: true
  }});
  ciShowFlyReact(emoji);
}

function ciShowFlyReact(emoji){
  const container = document.getElementById('ci-reactions-fly');
  if(!container) return;

  // نرسل عدة إيموجيات تتفجر بكل الشاشة
  const count = 6 + Math.floor(Math.random() * 5); // 6-10 إيموجيات
  const W = window.innerWidth;
  const H = window.innerHeight;

  for(let i = 0; i < count; i++){
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'fly-emoji';
      el.textContent = emoji;

      // نقطة البداية عشوائية في الثلث الأسفل
      const sx = Math.random() * W;
      const sy = H * 0.6 + Math.random() * H * 0.3;

      // نقطة النهاية عشوائية في أي مكان بالشاشة
      const ex = Math.random() * W - sx;
      const ey = -(Math.random() * H * 0.8 + H * 0.1) - (H - sy);

      el.style.left = '0';
      el.style.top  = '0';
      el.style.setProperty('--sx', sx + 'px');
      el.style.setProperty('--sy', sy + 'px');
      el.style.setProperty('--ex', (sx + ex) + 'px');
      el.style.setProperty('--ey', (sy + ey) + 'px');

      container.appendChild(el);
      setTimeout(() => el.remove(), 3100);
    }, i * 80);
  }
}


function toggleAudio(btn){
  const bub = btn.closest('.bub');
  const audio = bub.querySelector('audio');
  const seek = bub.querySelector('.audio-seek');
  const timeEl = bub.querySelector('.audio-time');
  const playIc = btn.querySelector('.play-ic');
  const pauseIc = btn.querySelector('.pause-ic');

  if(audio.paused){
    // أوقف كل الصوتيات الثانية
    document.querySelectorAll('audio').forEach(a => { if(a !== audio) a.pause(); });
    document.querySelectorAll('.play-ic').forEach(i => i.style.display = '');
    document.querySelectorAll('.pause-ic').forEach(i => i.style.display = 'none');

    audio.play();
    playIc.style.display = 'none';
    pauseIc.style.display = '';

    audio.ontimeupdate = () => {
      if(audio.duration){
        seek.value = (audio.currentTime / audio.duration) * 100;
        const m = Math.floor(audio.currentTime/60);
        const s = Math.floor(audio.currentTime%60);
        timeEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
      }
    };
    audio.onended = () => {
      playIc.style.display = '';
      pauseIc.style.display = 'none';
      seek.value = 0;
    };
    seek.oninput = () => {
      if(audio.duration) audio.currentTime = (seek.value/100) * audio.duration;
    };
  } else {
    audio.pause();
    playIc.style.display = '';
    pauseIc.style.display = 'none';
  }
}

function filterChats(val){
  const q = val.trim().toLowerCase();
  document.querySelectorAll('#chats-list .chat-item').forEach(item => {
    const name = item.querySelector('.chat-item-name')?.textContent?.toLowerCase() || '';
    const last = item.querySelector('.chat-item-last,.chat-item-online-label')?.textContent?.toLowerCase() || '';
    item.style.display = (!q || name.includes(q) || last.includes(q)) ? '' : 'none';
  });
}

// ══════════ VOICE RECORDING ══════════
let mediaRecorder = null;
let audioChunks = [];
let voiceTimer = null;
let voiceSeconds = 0;
let isRecording = false;

function startVoiceRecord(){
  if(isRecording){ stopVoiceRecord(); return; }
  if(!activeChat){ showToast('افتح محادثة أولاً'); return; }

  navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
    isRecording = true;
    audioChunks = [];
    // اختَر mime مدعوم — webm/opus على كروم، mp4/aac على سفاري iOS
    const candidates = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];
    let chosenMime = '';
    if(window.MediaRecorder && MediaRecorder.isTypeSupported){
      chosenMime = candidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
    }
    try {
      mediaRecorder = chosenMime ? new MediaRecorder(stream, {mimeType:chosenMime}) : new MediaRecorder(stream);
    } catch(e){
      console.error('[startVoiceRecord] MediaRecorder failed:', e);
      stream.getTracks().forEach(t=>t.stop());
      isRecording = false;
      showToast('❌ المتصفح ما بيدعم تسجيل الصوت');
      return;
    }
    const actualMime = mediaRecorder.mimeType || chosenMime || 'audio/webm';

    mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      isRecording = false;
      hideVoiceUI();
      if(audioChunks.length === 0){ showToast('❌ ما تم تسجيل أي صوت'); return; }
      const blob = new Blob(audioChunks, {type:actualMime});
      await uploadVoiceMsg(blob);
    };

    mediaRecorder.start();
    showVoiceUI();

  }).catch(err => {
    console.error('[startVoiceRecord] getUserMedia:', err);
    showToast('❌ لا يوجد إذن للميكروفون');
  });
}

function stopVoiceRecord(){
  if(mediaRecorder && isRecording){
    mediaRecorder.stop();
  }
}

function cancelVoiceRecord(){
  audioChunks = [];
  if(mediaRecorder && isRecording){
    mediaRecorder.onstop = () => { isRecording = false; hideVoiceUI(); };
    mediaRecorder.stop();
  }
}

function showVoiceUI(){
  voiceSeconds = 0;
  let overlay = document.getElementById('voice-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'voice-overlay';
    overlay.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:9999;
      background:rgba(0,0,0,0.95);
      padding:20px;display:flex;align-items:center;
      justify-content:space-between;gap:16px;
      border-top:1px solid rgba(255,255,255,0.1);
    `;
    overlay.innerHTML = `
      <button onclick="cancelVoiceRecord()" style="background:none;border:none;color:#ff4444;font-size:28px;cursor:pointer;">🗑️</button>
      <div style="display:flex;align-items:center;gap:10px;flex:1;justify-content:center;">
        <div id="voice-dot" style="width:10px;height:10px;border-radius:50%;background:#ff4444;animation:voicePulse 1s infinite;"></div>
        <span id="voice-time" style="color:#fff;font-size:18px;font-weight:700;font-family:monospace;">0:00</span>
      </div>
      <button onclick="stopVoiceRecord()" style="width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(135deg,#7b2ff7,#5b13d6);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
      </button>
    `;
    document.body.appendChild(overlay);

    // أضف CSS للأنيميشن
    if(!document.getElementById('voice-style')){
      const s = document.createElement('style');
      s.id = 'voice-style';
      s.textContent = '@keyframes voicePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}';
      document.head.appendChild(s);
    }
  }
  overlay.style.display = 'flex';

  voiceTimer = setInterval(() => {
    voiceSeconds++;
    const m = Math.floor(voiceSeconds/60);
    const s = voiceSeconds % 60;
    const el = document.getElementById('voice-time');
    if(el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if(voiceSeconds >= 120) stopVoiceRecord(); // حد أقصى دقيقتين
  }, 1000);
}

function hideVoiceUI(){
  clearInterval(voiceTimer);
  const overlay = document.getElementById('voice-overlay');
  if(overlay) overlay.style.display = 'none';
}

async function uploadVoiceMsg(blob){
  if(!activeChat) return;
  showToast('⏳ جارٍ إرسال الصوت...');
  // اختَر امتداد مناسب حسب الـ mime اللي طلع من MediaRecorder
  const mime = blob.type || 'audio/webm';
  const ext = mime.includes('mp4') ? 'mp4'
            : mime.includes('mpeg') ? 'mp3'
            : mime.includes('ogg') ? 'ogg'
            : 'webm';
  const path = `voice_${Date.now()}_${currentUser.id}.${ext}`;
  const {error} = await sb.storage.from('posts').upload(path, blob, {contentType:mime, upsert:true});
  if(error){
    console.error('[uploadVoiceMsg] storage error:', error);
    showToast('❌ فشل رفع الصوت — ' + (error.message||''));
    return;
  }
  const url = sb.storage.from('posts').getPublicUrl(path).data.publicUrl;
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted, error:insErr} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:activeChat.id,
    text:'', msg_type:'audio', media_url:url
  }).select().single();
  if(insErr){
    console.error('[uploadVoiceMsg] insert error:', insErr);
    showToast('❌ فشل حفظ الرسالة — ' + (insErr.message||''));
    return;
  }
  if(inserted){
    appendMessage(inserted, true);
    bumpChatToTop(activeChat.id, '🎤 رسالة صوتية');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
  }
}

$('msg-input').addEventListener('input', onMsgInput, {passive:true});
$('msg-input').addEventListener('keydown', e=>{ if(e.key==='Enter') sendMessage(); });
$('img-confirm-caption').addEventListener('keydown', e=>{ if(e.key==='Enter') confirmImgSend(); });

// passive scroll listeners للسرعة
document.addEventListener('touchstart', ()=>{}, {passive:true});
document.addEventListener('touchmove', ()=>{}, {passive:true});

// إغلاق react picker عند النقر خارجه
document.addEventListener('click', e=>{
  if(!e.target.closest('.post-react-picker') && !e.target.closest('.act-btn')){
    document.querySelectorAll('.post-react-picker').forEach(p=>p.classList.remove('show'));
  }
});

// إغلاق mp-menu عند النقر برا
document.addEventListener('click', e=>{
  if(!e.target.closest('.media-picker-wrap')) closeMpMenu();
});

sb.auth.onAuthStateChange((ev, ses) => {
  if(ses) initApp(ses.user);
});

// ══════════════════════════════════════
// GLOBAL LOADER HELPERS
// ══════════════════════════════════════
function showLoader(label){
  const el = $('global-loader');
  $('global-loader-label').textContent = label || '';
  el.style.display = 'flex';
  requestAnimationFrame(()=> el.classList.add('show'));
}
function hideLoader(){
  const el = $('global-loader');
  el.classList.remove('show');
  setTimeout(()=>{ el.style.display = 'none'; }, 380);
}
