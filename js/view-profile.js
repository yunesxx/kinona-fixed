async function openProfile(uid){
  if(!uid) return;
  // تتبع من أين فتح البروفايل
  profileOpenedFromChat = $('chat-view')?.style.display === 'flex';
  profileUserId = uid;
  $('profile-view').style.display = 'flex';

  const isMe = uid === currentUser.id;
  // إظهار الأزرار الصحيحة
  $('profile-action-row').style.display = isMe ? 'none' : 'flex';
  const myActions = $('pv-my-actions');
  if(myActions) myActions.style.display = isMe ? 'flex' : 'none';
  $('logout-btn').style.display = isMe ? 'inline-block' : 'none';
  const adminBtn = $('pv-admin-btn');
  if(adminBtn) adminBtn.style.display = (isMe && currentProfile?.username === '7r.9') ? 'flex' : 'none';
  $('p-av-edit').style.display = isMe ? 'flex' : 'none';

  currentProfileTab = 'images';
  document.querySelectorAll('.pv-new-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  const savedTab = $('saved-tab');
  if(savedTab) savedTab.style.display = isMe ? 'flex' : 'none';

  const cached = profileCache[uid];
  const queries = [
    cached ? Promise.resolve({data:cached}) : sb.from('profiles').select('*').eq('id', uid).single(),
    sb.from('posts').select('id').eq('user_id', uid),
    sb.from('follows').select('id').eq('following_id', uid),
    sb.from('follows').select('id').eq('follower_id', uid),
    sb.from('posts').select('id,image_url,video_url,caption,reactions,created_at').eq('user_id', uid).order('created_at',{ascending:false}),
  ];
  if(!isMe){
    queries.push(sb.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', uid).single());
    queries.push(sb.from('follows').select('id').eq('follower_id', uid).eq('following_id', currentUser.id).single());
  }

  const results = await Promise.all(queries);
  const u = results[0].data;
  if(!u) return;
  profileCache[uid] = u;

  // header username
  const hdr = $('pv-username-hdr');
  if(hdr) hdr.textContent = u.username;

  $('p-username').textContent = u.username;
  $('p-display-name').textContent = u.display_name || u.username;
  $('p-bio').textContent = u.bio || '';

  // ── Level badge في البروفايل ──
  const xpVal = u.xp || 0;
  const lvlBadgeEl = $('pv-level-badge');
  if(lvlBadgeEl){
    lvlBadgeEl.innerHTML = makeLevelBadge(xpVal, 28);
    lvlBadgeEl.onclick = () => showLevelCard(uid);
  }

  $('p-big-av').innerHTML = u.avatar_url
    ? `<img src="${u.avatar_url}" loading="lazy" onclick="openImgFull('${u.avatar_url}')" style="cursor:pointer;">`
    : `<span>${(u.username||'?')[0].toUpperCase()}</span>`;

  const myFollow = !isMe ? results[5]?.data : null;
  const theyFollow = !isMe ? results[6]?.data : null;

  // ── منطق الخصوصية ──
  // الحساب مقفل إذا: u.is_private = true && ليس أنا && لست متابعاً له
  const isLocked = !!u.is_private && !isMe && !myFollow;

  if(isLocked){
    // أخفي العدادات والبوستات
    $('p-posts-count').textContent = '—';
    $('p-followers-count').textContent = '—';
    $('p-following-count').textContent = '—';
    profilePostsCache = [];
    const grid = $('p-post-grid');
    if(grid){
      grid.innerHTML = `
        <div class="profile-private-locked">
          <div class="ppl-icon">🔒</div>
          <div class="ppl-title">هذا الحساب خاص</div>
          <div class="ppl-desc">تابع <b>@${escHtml(u.username||'')}</b> لرؤية المنشورات والمتابعين</div>
        </div>`;
    }
    // عطّل التابات (لا تنفع)
    document.querySelectorAll('.pv-new-tab').forEach(t => t.style.pointerEvents='none');
  } else {
    $('p-posts-count').textContent = results[1].data?.length || 0;
    $('p-followers-count').textContent = results[2].data?.length || 0;
    $('p-following-count').textContent = results[3].data?.length || 0;
    profilePostsCache = results[4].data || [];
    renderProfileTab('images');
    document.querySelectorAll('.pv-new-tab').forEach(t => t.style.pointerEvents='');
  }

  if(!isMe){
    const fb = $('p-follow-btn');
    if(myFollow){
      fb.textContent = 'إلغاء المتابعة';
      fb.className = 'pv-follow-btn following';
    } else if(theyFollow){
      fb.textContent = 'رد المتابعة';
      fb.className = 'pv-follow-btn follow-back';
    } else {
      fb.textContent = 'متابعة';
      fb.className = 'pv-follow-btn not-following';
    }
    const isBlocked = blockedUsers.has(uid);
    const bb = $('p-block-btn');
    if (bb) {
      bb.classList.toggle('blocked', isBlocked);
      bb.innerHTML = isBlocked
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`;
    }
  }

  // ── Cosmetics: طبّق كل التأثيرات (لون + هالة + لقب + إطار + شارة) ──
  if (typeof applyProfilePageCosmetics === 'function') {
    applyProfilePageCosmetics(uid).catch(e => console.warn('[Cosmetics] profile:', e));
  }
}

function switchProfileTab(tab, btn){
  currentProfileTab = tab;
  document.querySelectorAll('.pv-new-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderProfileTab(tab);
}

async function renderProfileTab(tab){
  const grid = $('p-post-grid');
  if(tab === 'saved'){
    grid.innerHTML = `<div class="profile-saved-empty">⏳ جارٍ التحميل...</div>`;
    const {data:savedData} = await sb.from('saved_posts')
      .select('post_id, posts(*)')
      .eq('user_id', profileUserId)
      .order('created_at',{ascending:false});
    const posts = (savedData||[]).map(r=>r.posts).filter(Boolean);
    if(!posts.length){
      grid.innerHTML=`<div class="profile-saved-empty">🔖 لا يوجد منشورات محفوظة</div>`;
      return;
    }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(posts))));
    grid.innerHTML = posts.map((p,i)=>{
      const thumb = p.image_url
        ? `<img src="${p.image_url}" loading="lazy">`
        : `<video src="${p.video_url}" muted playsinline preload="metadata"></video><div class="profile-reel-badge">▶</div>`;
      return `<div class="profile-post-thumb" onclick="openPostViewer('${b64}',${i})">${thumb}</div>`;
    }).join('');
    return;
  }

  let filtered;
  if(tab==='images') filtered = profilePostsCache.filter(p=>p.image_url && !p.video_url);
  else filtered = profilePostsCache.filter(p=>p.video_url);

  if(!filtered.length){
    grid.innerHTML=`<div class="profile-saved-empty">${tab==='images'?'لا يوجد صور':'لا يوجد ريلز'}</div>`;
    return;
  }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(filtered))));
  grid.innerHTML = filtered.map((p,i)=>{
    const thumb = tab==='images'
      ? `<img src="${p.image_url}" loading="lazy">`
      : `<video src="${p.video_url}" muted playsinline preload="metadata"></video><div class="profile-reel-badge">▶</div>`;
    return `<div class="profile-post-thumb" onclick="openPostViewer('${b64}',${i})">${thumb}</div>`;
  }).join('');
}

function closeProfile(){
  $('profile-view').style.display='none';
  profileUserId=null;
  cancelBioEdit();
  // إذا فتح البروفايل من الشات، ارجع للشات
  if(profileOpenedFromChat && $('chat-view')?.style.display !== 'flex' && activeChat){
    $('chat-view').style.display = 'flex';
  }
  profileOpenedFromChat = false;
}

// ══════════════════════════════════════
// SAVED POSTS
// ══════════════════════════════════════

function startBioEdit(){
  $('bio-display-wrap').style.display='none';
  $('bio-edit-wrap').style.display='block';
  $('dn-edit-wrap').style.display='none';
  $('bio-input').focus();
}
function cancelBioEdit(){
  $('bio-display-wrap').style.display='block';
  $('bio-edit-wrap').style.display='none';
  $('dn-edit-wrap').style.display='none';
}
async function saveBio(){
  const bio=$('bio-input').value.trim();
  const {error} = await sb.from('profiles').update({bio}).eq('id',currentUser.id);
  if(error){ showToast('❌ فشل الحفظ: ' + error.message); return; }
  currentProfile.bio=bio;
  const bioEl=$('p-bio');
  if(bioEl) bioEl.textContent=bio;
  cancelBioEdit();
  showToast('تم تحديث البايو ✓');
}

// ══ Display Name ══
function startDnEdit(){
  $('bio-display-wrap').style.display='none';
  $('dn-edit-wrap').style.display='block';
  $('dn-input').focus();
  onDnInput();
}
function cancelDnEdit(){
  $('bio-display-wrap').style.display='block';
  $('dn-edit-wrap').style.display='none';
}
function onDnInput(){
  const val = $('dn-input').value;
  // احسب الأحرف الحقيقية (الإيموجي = حرف واحد)
  const chars = [...val];
  const count = chars.filter(c => {
    const cp = c.codePointAt(0);
    return cp < 0x1F000; // حروف عادية
  }).length + chars.filter(c => c.codePointAt(0) >= 0x1F000).length;
  $('dn-counter').textContent = `${Math.min(count,10)} / 10`;
  if(count > 10) $('dn-counter').style.color='#ff453a';
  else $('dn-counter').style.color='#bbb';
}
function addDnEmoji(emoji){
  const input = $('dn-input');
  const chars = [...input.value];
  if(chars.length < 10){ input.value += emoji; onDnInput(); }
}
async function saveDn(){
  const raw = $('dn-input').value.trim();
  const chars = [...raw].slice(0,10);
  const dn = chars.join('');
  if(!dn){ showToast('اكتب اسماً أولاً'); return; }
  const {error} = await sb.from('profiles').update({display_name:dn}).eq('id',currentUser.id);
  if(error){ showToast('❌ فشل الحفظ: ' + error.message); return; }
  currentProfile.display_name=dn;
  const dnEl=$('p-display-name');
  if(dnEl) dnEl.textContent=dn;
  cancelDnEdit();
  showToast('تم تحديث الاسم ✓');
}

// ── Cover upload ──
async function uploadCover(input){
  const file=input.files[0]; if(!file) return;
  showToast('جارٍ رفع الغلاف...');
  const path=`cover_${currentUser.id}_${Date.now()}.${file.name.split('.').pop()}`;
  const {error}=await sb.storage.from('posts').upload(path,file,{upsert:true});
  if(error){showToast('فشل رفع الغلاف');return;}
  const {data:pub}=sb.storage.from('posts').getPublicUrl(path);
  await sb.from('profiles').update({cover_url:pub.publicUrl}).eq('id',currentUser.id);
  currentProfile.cover_url=pub.publicUrl;
  const ci=$('p-cover-img');
  ci.src=pub.publicUrl; ci.style.display='block';
  showToast('تم تحديث الغلاف ✓');
}

// ── Block ──
function confirmBlock(){
  const isBlocked=blockedUsers.has(profileUserId);
  $('block-modal-icon').innerHTML=isBlocked?`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`:`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`;
  $('block-modal-title').textContent=isBlocked?'إلغاء الحظر؟':'حظر المستخدم؟';
  $('block-modal-desc').textContent=isBlocked
    ?'سيتمكن من رؤية ملفك الشخصي مجدداً.'
    :'لن يتمكن من رؤية ملفك الشخصي أو مراسلتك.';
  $('block-confirm-btn').textContent=isBlocked?'إلغاء الحظر':'حظر';
  $('block-confirm-btn').className='block-confirm-btn '+(isBlocked?'cancel':'danger');
  $('block-modal').classList.add('show');
}
function closeBlockModal(){$('block-modal').classList.remove('show');}
async function executeBlock(){
  const isBlocked=blockedUsers.has(profileUserId);
  if(isBlocked){
    blockedUsers.delete(profileUserId);
    await sb.from('blocks').delete().eq('blocker_id',currentUser.id).eq('blocked_id',profileUserId);
    showToast('تم إلغاء الحظر');
  } else {
    blockedUsers.add(profileUserId);
    await sb.from('blocks').upsert({blocker_id:currentUser.id,blocked_id:profileUserId});
    showToast('تم حظر المستخدم 🚫');
  }
  closeBlockModal();
  // update button
  const bb=$('p-block-btn');
  bb.classList.toggle('blocked',blockedUsers.has(profileUserId));
  bb.innerHTML=blockedUsers.has(profileUserId)?`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`;
}

async function profileToChat(){
  if(!profileUserId) return;
  const {data:u} = await sb.from('profiles').select('*').eq('id', profileUserId).single();
  if(!u) return;
  closeProfile();
  showPage('messages', $('nav-messages'));
  openChat(u);
}

async function toggleFollow(){
  if(!profileUserId || profileUserId===currentUser.id) return;
  const btn=$('p-follow-btn');
  const isFollowing=btn.classList.contains('following');
  const targetUid = profileUserId;
  if(isFollowing){
    await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',targetUid);
    const {data:theyFollow}=await sb.from('follows').select('id').eq('follower_id',targetUid).eq('following_id',currentUser.id).single();
    if(theyFollow){
      btn.textContent='رد المتابعة'; btn.className='pv-follow-btn follow-back';
    } else {
      btn.textContent='متابعة'; btn.className='pv-follow-btn not-following';
    }
    showToast('تم إلغاء المتابعة');
  } else {
    await sb.from('follows').insert({follower_id:currentUser.id,following_id:targetUid});
    btn.textContent='إلغاء المتابعة'; btn.className='pv-follow-btn following';
    showToast('تمت المتابعة ✓');
    createNotif(targetUid, 'follow', null, null, null);
    addXP('follow');
  }
  // لو الحساب خاص — أعد تحميل البروفايل ليتحدث القفل/الفتح
  const cached = profileCache[targetUid];
  if(cached?.is_private){
    delete profileCache[targetUid];
    openProfile(targetUid);
    return;
  }
  const {data:followers}=await sb.from('follows').select('id').eq('following_id',targetUid);
  $('p-followers-count').textContent=followers?.length||0;
}

// ══════════════════════════════════════
// POST VIEWER — Reel style vertical scroll
// ══════════════════════════════════════
let viewerPosts=[];

