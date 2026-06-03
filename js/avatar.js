function triggerAvatarUpload(){
  if(profileUserId !== currentUser.id) return;
  openAvatarPick();
}
function openAvatarPick(){
  const ov = $('avatar-pick-overlay');
  ov.style.display = 'flex';
  requestAnimationFrame(()=> ov.classList.add('show'));
}
function closeAvatarPick(){
  const ov = $('avatar-pick-overlay');
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; }, 300);
}

async function uploadAvatar(input){
  const file = input.files[0];
  input.value = '';
  if(!file) return;

  // تحقق إن الملف صورة فعلاً
  if(!file.type.startsWith('image/')){
    showToast('الملف المختار ليس صورة');
    return;
  }

  showLoader('جارٍ رفع الصورة...');

  // حوّل الصورة لـ JPEG عبر canvas (يحل مشكلة HEIC وغيرها)
  let uploadFile = file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    // حد أقصى 800px للأفاتار
    const MAX = 800;
    const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
    canvas.width  = Math.round(bitmap.width  * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.88));
    uploadFile = new File([blob], 'avatar.jpg', {type:'image/jpeg'});
  } catch(e){ /* لو فشل الـ canvas ارفع الملف الأصلي */ }

  // رفع لـ Cloudinary
  let _cldAv;
  try {
    _cldAv = await cldUpload(uploadFile);
  } catch(e) {
    hideLoader(); showToast('فشل رفع الصورة'); return;
  }
  hideLoader();
  const avatarUrl = cldImg(_cldAv.secure_url, 300);
  await sb.from('profiles').update({avatar_url: avatarUrl}).eq('id', currentUser.id);
  currentProfile.avatar_url = avatarUrl;
  $('my-av').innerHTML = makeAv(currentProfile.username, avatarUrl, 36);
  // تحديث صور البروفايل في كل مكان
  updateNavAvatar(currentProfile);
  const epAv = $('ep-av');
  if(epAv) epAv.innerHTML = `<img src="${avatarUrl}">`;
  renderMyProfileInline(currentProfile);
  showToast('تم تحديث صورة الملف الشخصي ✓');
  openProfile(currentUser.id);
}

// ══════════════════════════════════════
// SEARCH USERS
// ══════════════════════════════════════
let searchTimer = null;
