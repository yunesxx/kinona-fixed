function openPostViewer(b64, startIndex){
  try{ viewerPosts=JSON.parse(decodeURIComponent(escape(atob(b64)))); }catch(e){return;}
  const viewer=$('post-viewer');
  const scroll=$('post-viewer-scroll');
  viewer.classList.add('show');
  document.body.style.overflow='hidden';

  scroll.innerHTML=viewerPosts.map((p,i)=>{
    const reactions=p.reactions||{};
    const total=Object.values(reactions).reduce((s,u)=>s+(typeof u==='object'?Object.keys(u).length:0),0);
    const myR=Object.entries(reactions).find(([e,u])=>typeof u==='object'&&u[currentUser.id]);
    const liked = !!myR;
    const isSaved = savedPosts.has(p.id);
    const isOwn = p.user_id === currentUser.id;

    let mediaHtml='';
    if(p.video_url){
      mediaHtml=`<div class="reel-media-wrap" data-vidurl="${p.video_url}" data-postid="${p.id}">
        <video src="${p.video_url}" class="reel-vid-el" playsinline loop muted preload="auto"></video>
        <button class="reel-play" aria-label="تشغيل" style="display:none;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>`;
    } else if(p.image_url){
      mediaHtml=`<div class="reel-media-wrap"><img src="${p.image_url}" class="reel-img" loading="lazy"></div>`;
    } else {
      mediaHtml=`<div class="reel-media-wrap" style="background:linear-gradient(160deg,#fff5f0,#e8f0ff);"><div style="font-size:20px;font-weight:700;color:#333;text-align:center;line-height:1.6;padding:30px;max-width:90%;">${escHtml(p.caption||'')}</div></div>`;
    }

    return `<div class="pv-slide reel-card" id="pvs-${p.id}">
      ${mediaHtml}

      <div class="reel-gradient top"></div>
      <div class="reel-gradient bottom"></div>

      <!-- زر رجوع أعلى الشاشة -->
      <button class="pv-close-btn" onclick="closePostViewer()" aria-label="رجوع">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <!-- معلومات المستخدم -->
      <div class="reel-info">
        <div class="reel-user-row" onclick="closePostViewer();setTimeout(()=>openProfile('${p.user_id}'),100)">
          <div class="reel-av">
            ${p.avatar_url ? `<img src="${p.avatar_url}">` : (p.username||'?')[0].toUpperCase()}
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <span class="post-username reel-username">${escHtml(p.username||'')}</span>
            <span class="reel-time">${p.created_at?getTimeAgo(p.created_at):''}</span>
          </div>
        </div>
        ${p.caption?`<div class="reel-caption">${escHtml(p.caption)}</div>`:''}
      </div>

      <!-- أزرار التفاعل -->
      <div class="reel-actions">
        <button class="reel-act ${liked?'liked':''}" id="pvlike-btn-${p.id}" onclick="pvQuickLike('${p.id}', this)" aria-label="إعجاب">
          <span class="reel-act-icon">
            <svg class="heart-svg" width="22" height="22" viewBox="0 0 24 24" fill="${liked?'#fff':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          <span class="reel-act-lbl">${total||''}</span>
        </button>
        <button class="reel-act" onclick="openComments('${p.id}')" aria-label="تعليقات">
          <span class="reel-act-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span class="reel-act-lbl"></span>
        </button>
        <button class="reel-act" onclick="sharePost('${p.id}','${escHtml(p.username||'')}')" aria-label="مشاركة">
          <span class="reel-act-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </span>
          <span class="reel-act-lbl"></span>
        </button>
        <button class="reel-act ${isSaved?'saved':''}" id="save-btn-${p.id}" onclick="toggleSavePost('${p.id}')" aria-label="حفظ">
          <span class="reel-act-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved?'#fff':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span class="reel-act-lbl"></span>
        </button>
      </div>
    </div>`;
  }).join('');

  requestAnimationFrame(()=>{
    scroll.scrollTop = startIndex * viewer.clientHeight;
    // autoplay الفيديو عند الدخول
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        const vid = e.target.querySelector('video');
        if(!vid) return;
        if(e.isIntersecting){ vid.play().catch(()=>{}); }
        else { vid.pause(); vid.currentTime=0; }
      });
    },{threshold:0.6});
    scroll.querySelectorAll('.pv-slide').forEach(s=>observer.observe(s));
    scroll._pvObserver = observer;
  });
}

// Quick like في الـ post viewer — نفس quickLike بس بـ خاص بالـ viewer
async function pvQuickLike(postId, btn){
  // وحدّث UI فوراً (نفس quickLike)
  if(typeof quickLike === 'function'){
    return quickLike(postId, btn);
  }
}

function closePostViewer(){
  const viewer = $('post-viewer');
  viewer.classList.remove('show');
  viewer.style.zIndex = '';
  document.body.style.overflow='';
  const scroll = $('post-viewer-scroll');
  if(scroll._pvObserver){ scroll._pvObserver.disconnect(); delete scroll._pvObserver; }
  scroll.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0;});
}

function togglePvReactPicker(postId,e){
  if(e)e.stopPropagation();
  const picker=$('pvr-'+postId);
  const isOpen=picker.classList.contains('show');
  document.querySelectorAll('.pv-react-picker').forEach(p=>p.classList.remove('show'));
  if(!isOpen)picker.classList.add('show');
}

async function pvReact(postId,emoji){
  document.querySelectorAll('.pv-react-picker').forEach(p=>p.classList.remove('show'));
  const {data:post}=await sb.from('posts').select('reactions').eq('id',postId).single();
  const reactions=post.reactions||{};
  Object.keys(reactions).forEach(e=>{ if(typeof reactions[e]==='object'&&reactions[e][currentUser.id]) delete reactions[e][currentUser.id]; });
  if(!reactions[emoji])reactions[emoji]={};
  if(reactions[emoji][currentUser.id]) delete reactions[emoji][currentUser.id];
  else reactions[emoji][currentUser.id]=true;
  await sb.from('posts').update({reactions}).eq('id',postId);
  const total=Object.values(reactions).reduce((s,u)=>s+(typeof u==='object'?Object.keys(u).length:0),0);
  const myR=Object.entries(reactions).find(([e,u])=>typeof u==='object'&&u[currentUser.id]);
  const iconEl=$('pvlike-icon-'+postId);
  const countEl=$('pvlike-count-'+postId);
  if(iconEl)iconEl.textContent=myR?myR[0]:'🤍';
  if(countEl)countEl.textContent=total||'';
  // إشعار لو أضفت react
  if(myR){
    const {data:p2}=await sb.from('posts').select('user_id,image_url').eq('id',postId).single();
    if(p2) createNotif(p2.user_id,'like',postId,p2.image_url,emoji);
  }
}

// ══════════════════════════════════════
// FOLLOW MODAL
// ══════════════════════════════════════
async function openFollowModal(type){
  if(!profileUserId) return;
  if(type === 'posts') return;

  // ── منع فتح قائمة المتابعين/المتابَعين لو الحساب خاص ولست متابعاً ──
  const isMyProfile = profileUserId === currentUser.id;
  if(!isMyProfile){
    const target = profileCache[profileUserId];
    if(target?.is_private){
      const {data:myFollow} = await sb.from('follows').select('id')
        .eq('follower_id', currentUser.id).eq('following_id', profileUserId).maybeSingle();
      if(!myFollow){
        showToast('🔒 هذا الحساب خاص — تابعه أولاً');
        return;
      }
    }
  }

  const modal = $('follow-modal');
  const body = $('follow-modal-body');
  const title = $('follow-modal-title');
  modal.classList.add('show');
  body.innerHTML = '<div style="padding:30px;text-align:center;color:#999">جارٍ التحميل...</div>';

  // جلب IDs اللي أنا أتابعهم
  const {data:myFollows} = await sb.from('follows').select('following_id').eq('follower_id', currentUser.id);
  const myFollowSet = new Set((myFollows||[]).map(r=>r.following_id));

  if(type === 'followers'){
    title.textContent = 'المتابعون';
    const {data} = await sb.from('follows').select('follower_id').eq('following_id', profileUserId);
    if(!data || data.length===0){ body.innerHTML = '<div style="padding:30px;text-align:center;color:#999">لا يوجد متابعون</div>'; return; }
    const ids = data.map(r => r.follower_id);
    const {data:profs} = await sb.from('profiles').select('*').in('id', ids);
    body.innerHTML = profs.map(u=>{
      const isMe = u.id === currentUser.id;
      const iFollow = myFollowSet.has(u.id);
      return `
      <div class="follow-list-item" id="fli-${u.id}">
        <div onclick="closeFollowModal();openProfile('${u.id}')" style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;min-width:0;">
          ${makeAv(u.username, u.avatar_url, 44)}
          <div style="min-width:0;">
            <div class="follow-list-name">${u.display_name||u.username}</div>
            <div style="font-size:12px;color:#aaa;">@${u.username}</div>
          </div>
        </div>
        ${isMe ? '' : isMyProfile
          ? `<button class="remove-follower-btn" onclick="removeFollower('${u.id}')">حذف</button>`
          : `<button class="fml-follow-btn ${iFollow?'following':''}" id="flbtn-${u.id}" onclick="toggleFollowInModal('${u.id}',this)">${iFollow?'يتابع':'متابعة'}</button>`
        }
      </div>`;
    }).join('');
  } else {
    title.textContent = 'يتابع';
    const {data} = await sb.from('follows').select('following_id').eq('follower_id', profileUserId);
    if(!data || data.length===0){ body.innerHTML = '<div style="padding:30px;text-align:center;color:#999">لا يتابع أحداً</div>'; return; }
    const ids = data.map(r => r.following_id);
    const {data:profs} = await sb.from('profiles').select('*').in('id', ids);
    body.innerHTML = profs.map(u=>{
      const isMe = u.id === currentUser.id;
      const iFollow = myFollowSet.has(u.id);
      return `
      <div class="follow-list-item" id="fli-${u.id}">
        <div onclick="closeFollowModal();openProfile('${u.id}')" style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;min-width:0;">
          ${makeAv(u.username, u.avatar_url, 44)}
          <div style="min-width:0;">
            <div class="follow-list-name">${u.display_name||u.username}</div>
            <div style="font-size:12px;color:#aaa;">@${u.username}</div>
          </div>
        </div>
        ${isMe ? '' : `<button class="fml-follow-btn ${iFollow?'following':''}" id="flbtn-${u.id}" onclick="toggleFollowInModal('${u.id}',this)">${iFollow?'يتابع':'متابعة'}</button>`}
      </div>`;
    }).join('');
  }
}

async function toggleFollowInModal(uid, btn){
  const iFollow = btn.classList.contains('following');
  if(iFollow){
    await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',uid);
    btn.textContent='متابعة'; btn.classList.remove('following');
  } else {
    await sb.from('follows').insert({follower_id:currentUser.id,following_id:uid});
    btn.textContent='يتابع'; btn.classList.add('following');
    createNotif(uid,'follow',null,null,null);
  }
}
function closeFollowModal(){ $('follow-modal').classList.remove('show'); }

async function removeFollower(uid){
  if(!confirm('تريد حذف هذا المتابع؟')) return;
  await sb.from('follows').delete().eq('follower_id', uid).eq('following_id', currentUser.id);
  const el = document.getElementById('fli-' + uid);
  if(el) el.remove();
  const count = $('p-followers-count');
  if(count) count.textContent = Math.max(0, parseInt(count.textContent||0) - 1);
  showToast('تم حذف المتابع');
}

// ══════════════════════════════════════
// CHAT
// ══════════════════════════════════════
