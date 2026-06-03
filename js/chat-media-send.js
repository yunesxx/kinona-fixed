async function sendVideoMsg(input){
  const file = input.files[0];
  input.value = '';
  if(!file || !activeChat) return;
  if(file.size > 500 * 1024 * 1024){ showToast('حجم الفيديو أكبر من 500MB'); return; }

  // شاشة Progress
  const prog = document.createElement('div');
  prog.id = 'vid-prog-overlay';
  prog.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
  prog.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
    <div style="color:#fff;font-size:16px;font-weight:700;">جارٍ رفع الفيديو...</div>
    <div style="width:260px;background:rgba(255,255,255,.2);border-radius:20px;height:8px;overflow:hidden;">
      <div id="vid-prog-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#ff416c,#ff6b35,#ffd200);border-radius:20px;transition:width .2s;"></div>
    </div>
    <div id="vid-prog-pct" style="color:rgba(255,255,255,.75);font-size:13px;font-weight:600;">0%</div>
    <div style="color:rgba(255,255,255,.45);font-size:11px;">${(file.size/1024/1024).toFixed(1)} MB</div>`;
  document.body.appendChild(prog);

  const updateProg = (pct) => {
    const bar = document.getElementById('vid-prog-bar');
    const lbl = document.getElementById('vid-prog-pct');
    if(bar) bar.style.width = pct + '%';
    if(lbl) lbl.textContent = pct + '%';
  };

  // رفع لـ Cloudinary مع progress — جرّب video أولاً، ثم auto كـ fallback
  let _cldVid;
  console.log('[sendVideoMsg] file:', {name:file.name, type:file.type, size:file.size});
  try {
    _cldVid = await cldUpload(file, updateProg, 'video');
    console.log('[sendVideoMsg] uploaded via /video/upload');
  } catch(e1) {
    console.warn('[sendVideoMsg] /video/upload failed:', e1?.message, e1?.detail);
    // fallback: جرّب auto
    try {
      _cldVid = await cldUpload(file, updateProg, 'auto');
      console.log('[sendVideoMsg] uploaded via /auto/upload (fallback)');
    } catch(e2) {
      console.error('[sendVideoMsg] /auto/upload also failed:', e2?.message, e2?.detail);
      prog.remove();
      const reason = (e2 && e2.message) ? e2.message : (e1 && e1.message) || '';
      showToast('فشل رفع الفيديو' + (reason ? ' — ' + reason : ''));
      return;
    }
  }
  prog.remove();
  const mediaUrl_vid = cldVid(_cldVid.secure_url);
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:activeChat.id,
    text:'', msg_type:'video', media_url:mediaUrl_vid
  }).select().single();
  if(inserted){
    appendMessage(inserted, true);
    bumpChatToTop(activeChat.id, '🎥 فيديو');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
  }
}

function sendImageMsg(input){
  const file = input.files[0];
  input.value = '';
  if(!file || !activeChat) return;
  // لو المختار فيديو من نفس بيك الصور — حوّله لمسار الفيديو
  if(file.type && file.type.startsWith('video/')){
    const fakeInput = { files:[file], value:'' };
    sendVideoMsg(fakeInput);
    return;
  }
  pendingImgFile = file;

  // عرض الصورة في شاشة التأكيد
  const reader = new FileReader();
  reader.onload = e => {
    $('img-confirm-preview').src = e.target.result;
    $('img-confirm-caption').value = '';
    $('img-confirm-overlay').classList.add('show');
    // focus على الـ caption
    setTimeout(()=> $('img-confirm-caption').focus(), 300);
  };
  reader.readAsDataURL(file);
}

function cancelImgSend(){
  pendingImgFile = null;
  $('img-confirm-overlay').classList.remove('show');
  $('img-confirm-preview').src = '';
}

async function confirmImgSend(){
  if(!pendingImgFile || !activeChat) return;
  const caption = $('img-confirm-caption').value.trim();
  const file = pendingImgFile;
  pendingImgFile = null;

  // أغلق شاشة التأكيد فوراً
  $('img-confirm-overlay').classList.remove('show');
  showLoader('جارٍ إرسال الصورة...');

  // رفع لـ Cloudinary
  let _cldImg;
  try {
    _cldImg = await cldUpload(file);
  } catch(e) {
    hideLoader();
    showToast('فشل الرفع');
    return;
  }
  // 1600px عرض كحد أقصى — يكفي شاشات Retina/AMOLED بدون اتلاف الباندويث
  const mediaUrl_img = cldImg(_cldImg.secure_url, 1600);
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:activeChat.id,
    text: caption, msg_type:'image', media_url:mediaUrl_img
  }).select().single();
  hideLoader();
  if(inserted){
    appendMessage(inserted, true);
    bumpChatToTop(activeChat.id, '🖼️ صورة');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
  }
}

// عرض الصورة كاملة — بدقة عالية للعرض الكامل
function openImgFull(url){
  // ارفع الصورة لأعلى دقة وأفضل جودة للعرض الكامل:
  // - يشيل أي transform سابق (w_xxxx,q_auto,..)
  // - يضيف transform مخصّص لعرض الشاشة الكاملة بأقصى دقة
  let fullUrl = url;
  if(url && url.includes('cloudinary')){
    // امسح أي transform بين /upload/ وقبل اسم الملف
    fullUrl = url.replace(/\/upload\/[^\/]*\//, '/upload/')
                 .replace('/upload/', '/upload/c_limit,w_2000,dpr_auto,f_auto,q_auto:best/');
  }
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:9999;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML=`<img src="${fullUrl}" decoding="async" style="max-width:98%;max-height:92vh;border-radius:12px;"><button onclick="this.parentNode.remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:24px;width:44px;height:44px;border-radius:50%;cursor:pointer;">✕</button>`;
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
}

