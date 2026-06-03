// ══ SETTINGS DROPDOWN ══
function toggleSettingsMenu(){
  const dd = document.getElementById('settings-dropdown');
  const cb = document.getElementById('settings-toggle-cb');
  const isOpen = dd.classList.toggle('show');
  if(cb) cb.checked = isOpen;
  // sync privacy toggle state
  if(isOpen && currentProfile){
    const pt = document.getElementById('privacy-toggle');
    if(pt) pt.checked = !!currentProfile.is_private;
  }
}
function closeSettingsMenu(){
  const dd = document.getElementById('settings-dropdown');
  const cb = document.getElementById('settings-toggle-cb');
  if(dd) dd.classList.remove('show');
  if(cb) cb.checked = false;
}
document.addEventListener('click', function(e){
  if(!e.target.closest('.topbar-settings-wrap')) closeSettingsMenu();
});

// ══ PRIVACY TOGGLE ══
async function togglePrivacy(isPrivate){
  if(!currentUser) return;
  await sb.from('profiles').update({is_private: isPrivate}).eq('id', currentUser.id);
  if(currentProfile) currentProfile.is_private = isPrivate;
  showToast(isPrivate ? 'الحساب أصبح خاصاً 🔒' : 'الحساب أصبح عاماً 🌐');
}

// ══ BLOCKED USERS LIST ══
async function openBlockedList(){
  const overlay = document.getElementById('blocked-overlay');
  const list = document.getElementById('blocked-list');
  overlay.classList.add('show');
  list.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;">جاري التحميل...</div>';
  const {data, error} = await sb
    .from('blocks')
    .select('blocked_id, profiles:blocked_id(id, username, display_name, avatar_url)')
    .eq('blocker_id', currentUser.id);
  if(error || !data || data.length === 0){
    list.innerHTML = '<div style="padding:32px;text-align:center;color:#aaa;font-size:15px;">لا يوجد مستخدمون محظورون</div>';
    return;
  }
  list.innerHTML = data.map(row => {
    const p = row.profiles;
    if(!p) return '';
    const name = p.display_name || p.username || '؟';
    const avatar = p.avatar_url
      ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-size:16px;font-weight:800;color:#fff;">${name[0].toUpperCase()}</span>`;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f5f5f5;">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
          ${avatar}
        </div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:15px;">${name}</div>
          <div style="font-size:13px;color:#aaa;">@${p.username || ''}</div>
        </div>
        <button onclick="unblockUser('${p.id}',this)" style="background:var(--bg-input);border:none;border-radius:var(--radius-sm);padding:8px 14px;font-family:inherit;font-size:13px;font-weight:700;color:#ff416c;cursor:pointer;">
          إلغاء الحظر
        </button>
      </div>`;
  }).join('');
}
function closeBlockedList(){
  document.getElementById('blocked-overlay').classList.remove('show');
}
async function unblockUser(uid, btn){
  btn.textContent = '...';
  await sb.from('blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', uid);
  blockedUsers.delete(uid);
  btn.closest('div[style]').remove();
  showToast('تم إلغاء الحظر');
  const list = document.getElementById('blocked-list');
  if(!list.querySelector('div[style]'))
    list.innerHTML = '<div style="padding:32px;text-align:center;color:#aaa;font-size:15px;">لا يوجد مستخدمون محظورون</div>';
}

// ══ EDIT PROFILE MODAL ══
const USERNAME_COOLDOWN_DAYS = 19;
const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;

// آخر مرة غيّر فيها المستخدم اسمه — مخزّن في auth.user_metadata
function getUsernameChangedAt(){
  return currentUser?.user_metadata?.username_changed_at || null;
}
// مللي ثانية متبقية على فك القفل (0 = مسموح)
function usernameCooldownRemainingMs(){
  const last = getUsernameChangedAt();
  if(!last) return 0;
  const unlockAt = new Date(last).getTime() + USERNAME_COOLDOWN_DAYS*24*60*60*1000;
  return Math.max(0, unlockAt - Date.now());
}
function formatCooldown(ms){
  const totalMin = Math.ceil(ms/60000);
  const days = Math.floor(totalMin/(60*24));
  const hours = Math.floor((totalMin%(60*24))/60);
  if(days >= 1) return `${days} يوم${days===2?'ين':''} ${hours>0?`و ${hours} ساعة`:''}`.trim();
  if(hours >= 1) return `${hours} ساعة`;
  return `${totalMin} دقيقة`;
}

let _usernameTimer = null;
function openEditProfile(){
  const p = currentProfile;
  // avatar preview
  const epAv = $('ep-av');
  epAv.innerHTML = p.avatar_url
    ? `<img src="${p.avatar_url}">`
    : (p.username||'?')[0].toUpperCase();
  $('ep-display-name').value = p.display_name || '';
  $('ep-bio').value = p.bio || '';
  // username
  const uInput = $('ep-username');
  const hint = $('ep-username-hint');
  uInput.value = p.username || '';
  uInput.classList.remove('ep-input-error','ep-input-ok');
  hint.classList.remove('locked','error','ok');
  const remaining = usernameCooldownRemainingMs();
  if(remaining > 0){
    uInput.disabled = true;
    hint.classList.add('locked');
    hint.textContent = `🔒 يمكنك تغيير اسم المستخدم بعد ${formatCooldown(remaining)}`;
    // تحديث كل دقيقة
    clearInterval(_usernameTimer);
    _usernameTimer = setInterval(() => {
      const r = usernameCooldownRemainingMs();
      if(r <= 0){
        clearInterval(_usernameTimer);
        uInput.disabled = false;
        hint.classList.remove('locked');
        hint.textContent = 'يمكنك تغيير اسم المستخدم الآن';
      } else {
        hint.textContent = `🔒 يمكنك تغيير اسم المستخدم بعد ${formatCooldown(r)}`;
      }
    }, 60000);
  } else {
    uInput.disabled = false;
    hint.textContent = 'يمكنك تغيير اسم المستخدم مرة كل 19 يوماً';
  }
  // التحقق المباشر أثناء الكتابة (debounce بسيط)
  uInput.oninput = debounce(validateUsernameLive, 350);

  const ov = $('edit-profile-overlay');
  ov.style.display = 'flex';
  requestAnimationFrame(()=> ov.classList.add('show'));
}

function debounce(fn, ms){
  let t; return function(){ clearTimeout(t); const a = arguments; t = setTimeout(()=>fn.apply(null,a), ms); };
}

async function validateUsernameLive(){
  const input = $('ep-username');
  const hint = $('ep-username-hint');
  const val = input.value.trim().toLowerCase();
  input.classList.remove('ep-input-error','ep-input-ok');
  hint.classList.remove('error','ok','locked');

  // نفس الاسم الحالي → لا تحقق
  if(val === (currentProfile.username||'').toLowerCase()){
    hint.textContent = 'يمكنك تغيير اسم المستخدم مرة كل 19 يوماً';
    return;
  }
  if(!USERNAME_RE.test(val)){
    input.classList.add('ep-input-error');
    hint.classList.add('error');
    hint.textContent = '✗ 3-20 حرف، أحرف إنجليزية وأرقام و . _ فقط';
    return;
  }
  hint.textContent = 'جاري التحقق...';
  const {data} = await sb.from('profiles').select('id').ilike('username', val).neq('id', currentUser.id).limit(1);
  if(data && data.length > 0){
    input.classList.add('ep-input-error');
    hint.classList.add('error');
    hint.textContent = '✗ اسم المستخدم محجوز';
  } else {
    input.classList.add('ep-input-ok');
    hint.classList.add('ok');
    hint.textContent = '✓ متاح — سيُقفل لمدة 19 يوماً بعد الحفظ';
  }
}

function closeEditProfile(){
  const ov = $('edit-profile-overlay');
  ov.classList.remove('show');
  clearInterval(_usernameTimer);
  setTimeout(()=>{ ov.style.display='none'; }, 300);
}

async function saveEditProfile(){
  const saveBtn = document.querySelector('.ep-save-btn');
  const displayName = $('ep-display-name').value.trim();
  const bio = $('ep-bio').value.trim();
  const newUsername = $('ep-username').value.trim().toLowerCase();
  const oldUsername = (currentProfile.username||'').toLowerCase();
  const usernameChanged = newUsername && newUsername !== oldUsername;

  // التحقق من الـ cooldown لو الاسم اتغيّر
  if(usernameChanged){
    const remaining = usernameCooldownRemainingMs();
    if(remaining > 0){
      showToast(`⏳ يمكنك تغيير اسم المستخدم بعد ${formatCooldown(remaining)}`);
      return;
    }
    if(!USERNAME_RE.test(newUsername)){
      showToast('✗ اسم مستخدم غير صالح');
      return;
    }
    // تحقق من uniqueness مرة أخيرة قبل الحفظ
    const {data:dup} = await sb.from('profiles').select('id').ilike('username', newUsername).neq('id', currentUser.id).limit(1);
    if(dup && dup.length > 0){
      showToast('✗ اسم المستخدم محجوز');
      return;
    }
  }

  if(saveBtn) saveBtn.disabled = true;
  try{
    const updates = {
      display_name: displayName || null,
      bio
    };
    if(usernameChanged) updates.username = newUsername;
    const {error} = await sb.from('profiles').update(updates).eq('id', currentUser.id);
    if(error) throw error;

    if(usernameChanged){
      // سجّل وقت التغيير في user_metadata — يقفل لـ 19 يوم
      const nowIso = new Date().toISOString();
      const {data:upd, error:authErr} = await sb.auth.updateUser({ data: { username_changed_at: nowIso } });
      if(authErr) console.warn('[username] auth metadata update failed:', authErr);
      else if(upd?.user) currentUser = upd.user;
      currentProfile.username = newUsername;
    }
    currentProfile.display_name = displayName;
    currentProfile.bio = bio;
    closeEditProfile();
    showToast('تم الحفظ ✓');
    renderMyProfileInline(currentProfile);
  } catch(e){
    console.error('[saveEditProfile]', e);
    showToast('✗ فشل الحفظ — ' + (e.message||''));
  } finally {
    if(saveBtn) saveBtn.disabled = false;
  }
}

function shareProfile(){
  const url = `${location.origin}${location.pathname}?user=${currentUser.id}`;
  if(navigator.share){
    navigator.share({title:`${currentProfile.username} على Kinona`, url}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(url).then(()=>showToast('تم نسخ الرابط 📋'));
  }
}

function openProfileFollowModal(type){
  profileUserId = currentUser.id;
  openFollowModal(type);
}

// فتح الفيديو فل شاشة
function openVideoFull(url){
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML=`<video src="${url}" controls autoplay playsinline loop style="width:100%;height:100%;object-fit:contain;"></video><button onclick="this.parentNode.remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;width:42px;height:42px;border-radius:50%;cursor:pointer;">✕</button>`;
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
}

// تكبير صورة البروفايل
function zoomAvatar(url, username){
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
  if(url){
    ov.innerHTML=`<img src="${url}" style="width:220px;height:220px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 8px 40px rgba(0,0,0,.5);">`;
  } else {
    ov.innerHTML=`<div style="width:220px;height:220px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:80px;font-weight:800;color:#fff;border:3px solid #fff;">${(username||'?')[0].toUpperCase()}</div>`;
  }
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}

