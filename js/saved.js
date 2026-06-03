async function loadSavedPosts(){
  if(!currentUser) return;
  const {data} = await sb.from('saved_posts').select('post_id').eq('user_id', currentUser.id);
  savedPosts = new Set((data||[]).map(r=>r.post_id));
}

function toggleSavePost(postId){
  const isSaved = savedPosts.has(postId);
  // ── Optimistic: حدّث فوراً ──
  if(isSaved){
    savedPosts.delete(postId);
    showToast('تم إلغاء الحفظ');
    sb.from('saved_posts').delete().eq('user_id', currentUser.id).eq('post_id', postId);
  } else {
    savedPosts.add(postId);
    showToast('تم الحفظ 🔖');
    sb.from('saved_posts').upsert({user_id: currentUser.id, post_id: postId});
  }
  const btn = $('save-btn-'+postId);
  if(btn){
    const saved = savedPosts.has(postId);
    btn.classList.toggle('saved', saved);
    // reel-act: icon داخل span
    const icon = btn.querySelector('.reel-act-icon');
    if(icon){
      icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="${saved?'#fff':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    } else {
      // fallback للأماكن القديمة
      btn.innerHTML = saved ? '🔖' : '🏷️';
    }
  }
}

// ══════════════════════════════════════
// SHARE
// ══════════════════════════════════════
async function sharePost(postId, username){
  // افتح sheet لمشاركة مع مستخدمين داخل التطبيق
  const existing = document.getElementById('share-sheet');
  if(existing) existing.remove();

  const sheet = document.createElement('div');
  sheet.id = 'share-sheet';
  sheet.style.cssText = 'position:fixed;top:0;right:0;left:0;bottom:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:6000;display:flex;align-items:flex-end;justify-content:center;';
  sheet.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:500px;padding:8px 0 28px;max-height:80vh;display:flex;flex-direction:column;">
      <div style="width:36px;height:4px;background:#e0e0e0;border-radius:4px;margin:10px auto 14px;flex-shrink:0;"></div>
      <div style="font-weight:700;font-size:16px;text-align:center;padding:0 16px 12px;border-bottom:1px solid #f0f0f0;flex-shrink:0;">مشاركة مع...</div>
      <div id="share-users-list" style="overflow-y:auto;flex:1;padding:8px 0;">
        <div style="text-align:center;padding:20px;color:#bbb;font-size:14px;">جاري التحميل...</div>
      </div>
      <div style="padding:12px 16px 0;flex-shrink:0;">
        <button onclick="document.getElementById('share-sheet').remove()" style="width:100%;padding:13px;background:#f5f5f5;color:#666;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;">إلغاء</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', e => { if(e.target===sheet) sheet.remove(); });

  // جلب المستخدمين — من cache إذا موجود
  const list = document.getElementById('share-users-list');
  let users = window._shareUsersCache || null;
  if(!users){
    const {data} = await sb.from('profiles').select('id,username,avatar_url,display_name').neq('id', currentUser.id).limit(50);
    users = data;
    window._shareUsersCache = users;
    setTimeout(()=>{ window._shareUsersCache = null; }, 60000); // expire بعد دقيقة
  }
  if(!users||users.length===0){
    list.innerHTML='<div style="text-align:center;padding:20px;color:#bbb;font-size:14px;">لا يوجد مستخدمون</div>';
    return;
  }
  list.innerHTML = users.map(u=>`
    <div onclick="sendShareMsg('${postId}','${u.id}','${escHtml(u.username||'')}');document.getElementById('share-sheet').remove();"
      style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:background .15s;"
      onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background=''">
      ${makeAv(u.display_name||u.username,u.avatar_url,42)}
      <div>
        <div style="font-weight:700;font-size:14px;">${escHtml(u.display_name||u.username||'')}</div>
        <div style="font-size:12px;color:#999;">@${escHtml(u.username||'')}</div>
      </div>
    </div>`).join('');
}

async function sendShareMsg(postId, toUserId, toUsername){
  const cid = [currentUser.id, toUserId].sort().join('_');
  const {data:post} = await sb.from('posts').select('id,caption,image_url,video_url,username').eq('id',postId).single();
  // نخزن postId في نهاية النص بعد separator خاص — بدون column إضافي
  const shareText = post ? `📤 شارك منشور:\n${post.caption||''}||PID:${postId}` : `📤 شارك معك منشوراً||PID:${postId}`;
  const {data:inserted} = await sb.from('messages').insert({
    chat_id: cid,
    from_id: currentUser.id,
    to_id: toUserId,
    text: shareText,
    msg_type: 'share',
    media_url: post?.image_url || post?.video_url || null
  }).select().single();
  if(inserted && activeChat && activeChat.id === toUserId){
    appendMessage(inserted, true);
    bumpChatToTop(toUserId, '📤 منشور مشارك');
  } else if(inserted){
    // لو الشات مش مفتوح معه، رفعه لفوق بعد العودة للقائمة
    setTimeout(()=> bumpChatToTop(toUserId, '📤 منشور مشارك'), 300);
  }
  showToast(`تم الإرسال لـ ${toUsername} ✓`);
}

// ── Bio ──
