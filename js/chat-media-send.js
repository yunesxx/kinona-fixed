// ══════════════════════════════════════
// VIDEO SEND — حد أقصى دقيقة + Optimistic UI + رفع بالخلفية
// ══════════════════════════════════════
const MAX_VIDEO_DURATION = 60; // ثانية
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB (سقف معقول لدقيقة)

async function sendVideoMsg(input){
  const file = input.files[0];
  input.value = '';
  if(!file || !activeChat) return;

  // 1) فحص الحجم
  if(file.size > MAX_VIDEO_SIZE){
    showToast(`حجم الفيديو كبير جداً (${(file.size/1024/1024).toFixed(1)}MB). الحد الأقصى 100MB`);
    return;
  }

  // 2) فحص المدة — قراءة metadata قبل أي شي
  let meta;
  try {
    meta = await getVideoMetadata(file);
  } catch(e){
    showToast('تعذّر قراءة الفيديو');
    return;
  }

  if(!meta.duration || !isFinite(meta.duration)){
    URL.revokeObjectURL(meta.url);
    showToast('فيديو غير صالح');
    return;
  }

  if(meta.duration > MAX_VIDEO_DURATION + 0.5){
    URL.revokeObjectURL(meta.url);
    const secs = Math.round(meta.duration);
    showToast(`الفيديو ${secs}ث — الحد الأقصى دقيقة واحدة`);
    return;
  }

  const chatAtSend = activeChat;

  // 3) Optimistic UI: اعرض الفيديو فوراً في الدردشة
  const tempId = 'tmp_vid_' + Date.now();
  const tempMsg = {
    id: tempId,
    from_id: currentUser.id,
    to_id: chatAtSend.id,
    text: '',
    msg_type: 'video',
    media_url: meta.url, // blob URL محلي
    created_at: new Date().toISOString(),
    _pending: true
  };
  appendMessage(tempMsg, true);

  // overlay صغير "جارٍ الرفع" + شريط تقدم فوق الفيديو
  const tmpRow = $('msgs')?.querySelector(`[data-id="${tempId}"]`);
  if(tmpRow){
    const bub = tmpRow.querySelector('.media-bub');
    if(bub){
      const overlay = document.createElement('div');
      overlay.className = 'msg-uploading-badge';
      overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.55);border-radius:inherit;color:#fff;pointer-events:none;gap:8px;';
      overlay.innerHTML = `
        <div style="font-size:12px;font-weight:700;">⏳ جارٍ الرفع…</div>
        <div style="width:140px;height:5px;background:rgba(255,255,255,.25);border-radius:10px;overflow:hidden;">
          <div class="vup-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#ff416c,#ff6b35,#ffd200);transition:width .2s;"></div>
        </div>
        <div class="vup-pct" style="font-size:11px;opacity:.8;">0%</div>`;
      bub.appendChild(overlay);
    }
  }

  const updateProg = (pct) => {
    const bar = tmpRow?.querySelector('.vup-bar');
    const lbl = tmpRow?.querySelector('.vup-pct');
    if(bar) bar.style.width = pct + '%';
    if(lbl) lbl.textContent = pct + '%';
  };

  // 4) رفع لـ Cloudinary بالخلفية
  let _cldVid;
  try {
    _cldVid = await cldUpload(file, updateProg, 'video');
  } catch(e1) {
    console.warn('[sendVideoMsg] /video/upload failed:', e1?.message);
    try {
      _cldVid = await cldUpload(file, updateProg, 'auto');
    } catch(e2) {
      console.error('[sendVideoMsg] both endpoints failed:', e2?.message);
      URL.revokeObjectURL(meta.url);
      tmpRow?.remove();
      showToast('فشل رفع الفيديو' + (e2?.message ? ' — ' + e2.message : ''));
      return;
    }
  }

  const mediaUrl_vid = cldVid(_cldVid.secure_url);
  const cid = [currentUser.id, chatAtSend.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:chatAtSend.id,
    text:'', msg_type:'video', media_url:mediaUrl_vid
  }).select().single();

  if(inserted){
    if(tmpRow){
      tmpRow.dataset.id = inserted.id;
      const vid = tmpRow.querySelector('video');
      if(vid){
        // غيّر الـ src للنسخة المحسّنة من Cloudinary
        vid.src = mediaUrl_vid;
        // poster من Cloudinary للمعاينة السريعة
        if(typeof cldVidPoster === 'function'){
          const poster = cldVidPoster(_cldVid.secure_url, 480);
          if(poster) vid.poster = poster;
        }
        // نظّف الـ blob URL بعد ما الفيديو يحمل من Cloudinary
        vid.addEventListener('loadeddata', () => URL.revokeObjectURL(meta.url), {once:true});
      } else {
        URL.revokeObjectURL(meta.url);
      }
      tmpRow.querySelector('.msg-uploading-badge')?.remove();
    } else {
      appendMessage(inserted, true);
      URL.revokeObjectURL(meta.url);
    }
    bumpChatToTop(chatAtSend.id, '🎥 فيديو');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(chatAtSend.id, inserted);
  } else {
    URL.revokeObjectURL(meta.url);
    tmpRow?.remove();
    showToast('فشل الإرسال');
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
  let file = pendingImgFile;
  pendingImgFile = null;
  const chatAtSend = activeChat; // قد يفتح المستخدم محادثة ثانية أثناء الرفع

  // أغلق شاشة التأكيد فوراً — بدون loader يحجب الواجهة
  $('img-confirm-overlay').classList.remove('show');

  // 1) Optimistic UI: اعرض الصورة فوراً بـ blob URL محلي
  const localUrl = URL.createObjectURL(file);
  const tempId = 'tmp_img_' + Date.now();
  const tempMsg = {
    id: tempId,
    from_id: currentUser.id,
    to_id: chatAtSend.id,
    text: caption,
    msg_type: 'image',
    media_url: localUrl,
    created_at: new Date().toISOString(),
    _pending: true
  };
  appendMessage(tempMsg, true);
  // علامة "جاري الرفع" — overlay شفاف فوق الصورة
  const tmpRow = $('msgs')?.querySelector(`[data-id="${tempId}"]`);
  if(tmpRow){
    const bub = tmpRow.querySelector('.media-bub');
    if(bub){
      const badge = document.createElement('div');
      badge.className = 'msg-uploading-badge';
      badge.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);border-radius:inherit;color:#fff;font-size:12px;font-weight:700;pointer-events:none;backdrop-filter:blur(2px);';
      badge.innerHTML = '<span style="background:rgba(0,0,0,.55);padding:6px 12px;border-radius:12px;">⏳ جارٍ الرفع…</span>';
      bub.appendChild(badge);
    }
  }

  // 2) ضغط الصورة قبل الرفع (يقلل الحجم 80-90%)
  try { file = await compressImage(file, 1920, 0.85); }
  catch(_){ /* استخدم الأصلية لو فشل الضغط */ }

  // 3) رفع لـ Cloudinary بالخلفية
  let _cldImg;
  try {
    _cldImg = await cldUpload(file);
  } catch(e) {
    URL.revokeObjectURL(localUrl);
    tmpRow?.remove();
    showToast('فشل الرفع');
    return;
  }

  // 900px عرض كافٍ للدردشة (مع dpr_auto بيطلع 1800px لشاشات retina تلقائياً)
  const mediaUrl_img = cldImg(_cldImg.secure_url, 900);
  const cid = [currentUser.id, chatAtSend.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:chatAtSend.id,
    text: caption, msg_type:'image', media_url:mediaUrl_img
  }).select().single();

  if(inserted){
    // بدّل الصورة المؤقتة بالحقيقية (نفس المكان، بدون animation أو scroll)
    if(tmpRow){
      tmpRow.dataset.id = inserted.id;
      const img = tmpRow.querySelector('img.msg-img');
      if(img){
        // غيّر الـ src للـ Cloudinary URL
        img.onload = () => URL.revokeObjectURL(localUrl);
        img.src = mediaUrl_img;
        // عدّل onclick عشان يفتح الصورة الكاملة (مش الـ blob)
        img.setAttribute('onclick', `openImgFull('${mediaUrl_img}')`);
      } else {
        URL.revokeObjectURL(localUrl);
      }
      // شيل overlay "جاري الرفع"
      tmpRow.querySelector('.msg-uploading-badge')?.remove();
    } else {
      appendMessage(inserted, true);
      URL.revokeObjectURL(localUrl);
    }
    bumpChatToTop(chatAtSend.id, '🖼️ صورة');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(chatAtSend.id, inserted);
  } else {
    // فشل insert
    URL.revokeObjectURL(localUrl);
    tmpRow?.remove();
    showToast('فشل الإرسال');
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

