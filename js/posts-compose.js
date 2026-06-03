function openNewPost(forcedType){
  $('np-overlay').style.display = 'flex';
  $('np-caption').value = '';
  $('np-img-preview').style.display = 'none';
  $('np-vid-preview').style.display = 'none';
  selectedPostFile = null;
  // لو محدّد نوع (مثلاً 'video' من زر الـ Reels) → خفي اختيار النوع وافتح مباشرة
  const cards = document.querySelector('.np-type-cards');
  const hdrTitle = document.querySelector('.np-hdr-title');
  if(forcedType === 'video'){
    if(cards) cards.style.display = 'none';
    if(hdrTitle) hdrTitle.textContent = 'ريل جديد';
    switchPostType('video', $('np-card-video'));
  } else if(forcedType === 'image'){
    if(cards) cards.style.display = 'none';
    if(hdrTitle) hdrTitle.textContent = 'صورة جديدة';
    switchPostType('image', $('np-card-image'));
  } else {
    if(cards) cards.style.display = 'flex';
    if(hdrTitle) hdrTitle.textContent = 'منشور جديد';
    switchPostType('image', $('np-card-image'));
  }
}
function closeNewPost(){
  $('np-overlay').style.display = 'none';
  $('np-overlay').classList.remove('show');
  cancelPublish(); // اقفل أي تأكيد مفتوح
}

// ── تأكيد النشر ──
function confirmPublish(){
  if(!selectedPostFile){ showToast('اختر فيديو أولاً'); return; }
  const titleEl = $('np-confirm-title');
  const subEl = document.querySelector('#np-confirm .np-confirm-sub');
  const isVideo = currentPostType === 'video';
  if(titleEl) titleEl.textContent = isVideo ? 'تأكيد نشر الريل' : 'تأكيد نشر الصورة';
  if(subEl) subEl.textContent = isVideo
    ? 'هل أنت متأكد من نشر هذا الريل؟ سيظهر لمتابعيك مباشرة.'
    : 'هل أنت متأكد من نشر هذه الصورة؟ سيظهر لمتابعيك مباشرة.';
  const ov = $('np-confirm');
  ov.style.display = 'flex';
  requestAnimationFrame(() => ov.classList.add('show'));
}
function cancelPublish(){
  const ov = $('np-confirm');
  if(!ov) return;
  ov.classList.remove('show');
  setTimeout(() => { ov.style.display = 'none'; }, 220);
}

function switchPostType(type, card){
  currentPostType = type;
  // البطاقتان
  document.querySelectorAll('.np-type-card').forEach(c=>c.classList.remove('active'));
  if(card) card.classList.add('active');
  // أيقونة + نص منطقة الاختيار
  const isImg = type === 'image';
  $('np-file-icon').innerHTML = isImg ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>`;
  $('np-file-label').innerHTML = isImg
    ? 'اضغط لاختيار صورة <small>JPG, PNG, GIF</small>'
    : 'اضغط لاختيار فيديو <small>طولي 9:16 يفضّل · MP4, MOV</small>';
  // إعادة تعيين الملف والمعاينة
  $('np-img-preview').style.display = 'none';
  $('np-vid-preview').style.display = 'none';
  $('np-file-area').classList.remove('has-media');
  selectedPostFile = null;
}

// ── اختيار سريع: للفيديو يفتح المعرض مباشرة، للصور يعرض الـ picker ──
function pickPostMedia(){
  if(currentPostType === 'video'){
    // ريل → افتح معرض الفيديوهات مباشرة
    $('post-vid-input').click();
  } else {
    // صورة → خلي الخيار (كاميرا أو معرض)
    openMediaPick();
  }
}

// ══ MEDIA SOURCE PICKER — بوست (للصور فقط) ══
function openMediaPick(){
  const ov = $('media-pick-overlay');
  const title = $('media-pick-title');
  title.textContent = currentPostType === 'image' ? 'اختر مصدر الصورة' : 'اختر مصدر الفيديو';
  ov.style.display = 'flex';
  requestAnimationFrame(()=> ov.classList.add('show'));
}
function closeMediaPick(){
  const ov = $('media-pick-overlay');
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; }, 300);
}
function triggerCamera(){
  if(currentPostType === 'image') $('post-img-camera').click();
  else $('post-vid-camera').click();
}
function triggerGallery(){
  if(currentPostType === 'image') $('post-img-input').click();
  else $('post-vid-input').click();
}
function triggerMediaPick(){ openMediaPick(); }

// ══ MEDIA SOURCE PICKER — شات ══
function openMsgPick(){
  const ov = $('msg-pick-overlay');
  ov.style.display = 'flex';
  requestAnimationFrame(()=> ov.classList.add('show'));
}
function closeMsgPick(){
  const ov = $('msg-pick-overlay');
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; }, 300);
}

function previewMedia(input, type){
  const file = input.files[0];
  if(!file) return;
  selectedPostFile = file;
  const url = URL.createObjectURL(file);
  $('np-file-area').classList.add('has-media');
  if(type === 'image'){
    $('np-img-preview').src = url;
    $('np-img-preview').style.display = 'block';
    $('np-vid-preview').style.display = 'none';
    $('np-file-icon').style.display = 'none';
    $('np-file-label').style.display = 'none';
  } else {
    $('np-vid-preview').src = url;
    $('np-vid-preview').style.display = 'block';
    $('np-img-preview').style.display = 'none';
    $('np-file-icon').style.display = 'none';
    $('np-file-label').style.display = 'none';
  }
}

async function publishPost(){
  if(!selectedPostFile){ showToast('اختر فيديو أولاً'); return; }
  cancelPublish(); // اقفل ورقة التأكيد
  const caption = $('np-caption').value.trim();
  const btn = $('np-post-btn');
  const confBtn = $('np-confirm-publish-btn');
  btn.disabled = true;
  if(confBtn) confBtn.disabled = true;
  showLoader('جارٍ النشر...');
  // رفع لـ Cloudinary
  let _cldPost;
  try {
    _cldPost = await cldUpload(selectedPostFile);
  } catch(e) {
    hideLoader(); showToast('فشل رفع الملف'); btn.disabled=false;
    if(confBtn) confBtn.disabled = false;
    return;
  }
  const imageUrl = currentPostType==='image' ? cldImg(_cldPost.secure_url, 1080) : null;
  const videoUrl = currentPostType==='video' ? cldVid(_cldPost.secure_url) : null;
  const {error} = await sb.from('posts').insert({
    user_id: currentUser.id,
    username: currentProfile.username,
    avatar_url: currentProfile.avatar_url,
    caption,
    image_url: imageUrl,
    video_url: videoUrl,
    reactions: {}
  });
  hideLoader();
  btn.disabled = false;
  if(confBtn) confBtn.disabled = false;
  if(error){ showToast('فشل النشر، حاول مجدداً'); return; }
  closeNewPost();
  showToast('تم النشر ✨');
  addXP('post');
  loadFeed(true);
}

