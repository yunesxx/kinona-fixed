// ── التعليقات ──
async function openComments(postId){
  activeCommentsPostId = postId;
  const overlay = $('comments-overlay');
  $('comment-input').value = '';
  $('comments-list').innerHTML = `<div class="no-comments"><div class="spinner"></div></div>`;
  overlay.style.display = 'flex';
  requestAnimationFrame(()=> overlay.classList.add('show'));
  await loadComments();
}
function closeComments(){
  const overlay = $('comments-overlay');
  overlay.classList.remove('show');
  setTimeout(()=>{ overlay.style.display='none'; activeCommentsPostId=null; }, 280);
}

async function loadComments(){
  if(!activeCommentsPostId) return;
  const {data} = await sb.from('comments')
    .select('*').eq('post_id', activeCommentsPostId)
    .order('created_at', {ascending:true});
  if(!data || data.length===0){
    $('comments-list').innerHTML = `<div class="no-comments">لا يوجد تعليقات بعد 💬</div>`;
    return;
  }
  $('comments-list').innerHTML = data.map(c=>`
    <div class="comment-item">
      <div onclick="openChatFromComments('${c.user_id}')" style="cursor:pointer;flex-shrink:0">
        ${makeAv(c.username, c.avatar_url, 36)}
      </div>
      <div style="flex:1">
        <div class="comment-bubble">
          <div class="comment-user">${escHtml(c.username)}</div>
          <div class="comment-text">${escHtml(c.text)}</div>
        </div>
        <div class="comment-time">${getTimeAgo(c.created_at)}</div>
      </div>
    </div>
  `).join('');
  // scroll to bottom
  const list = $('comments-list');
  list.scrollTop = list.scrollHeight;
}

async function sendComment(){
  const txt = $('comment-input').value.trim();
  if(!txt || !activeCommentsPostId) return;
  $('comment-input').value = '';

  // ── Optimistic: أضف التعليق فوراً ──
  const list = $('comments-list');
  const tempId = 'tmp-' + Date.now();
  const noComments = list.querySelector('.no-comments');
  if(noComments) noComments.remove();
  const tempEl = document.createElement('div');
  tempEl.id = tempId;
  tempEl.className = 'comment-item';
  tempEl.innerHTML = `
    ${makeAv(currentProfile.username, currentProfile.avatar_url, 36)}
    <div style="flex:1">
      <div class="comment-bubble">
        <div class="comment-user">${escHtml(currentProfile.username)}</div>
        <div class="comment-text">${escHtml(txt)}</div>
      </div>
      <div class="comment-time">الآن</div>
    </div>`;
  list.appendChild(tempEl);
  list.scrollTop = list.scrollHeight;

  // حدّث عداد التعليقات فوراً
  const cmtBtn = $('cmt-btn-'+activeCommentsPostId);
  if(cmtBtn){
    const cur = parseInt(cmtBtn.dataset.count||'0') + 1;
    cmtBtn.dataset.count = cur;
    cmtBtn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${cur||''}`;
  }

  // ── ابعت للـ DB بالخلفية ──
  sb.from('comments').insert({
    post_id: activeCommentsPostId,
    user_id: currentUser.id,
    username: currentProfile.username,
    avatar_url: currentProfile.avatar_url,
    text: txt
  }).then(async ()=>{
    const {data:post} = await sb.from('posts').select('user_id,image_url').eq('id',activeCommentsPostId).single();
    if(post) createNotif(post.user_id, 'comment', activeCommentsPostId, post.image_url, txt.substring(0,60));
    addXP('comment');
  });
}

// Enter لإرسال التعليق
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && document.activeElement===$('comment-input')) sendComment();
});

// فتح الشات من التعليقات — زر الرجوع يعيد للتعليقات
async function openChatFromComments(userId){
  if(!userId || userId === currentUser.id) return;
  const savedPostId = activeCommentsPostId;
  const {data:u} = await sb.from('profiles').select('*').eq('id', userId).single();
  if(!u) return;
  closeComments();
  _chatOpenedFrom = 'comments';
  _chatFromPostId = savedPostId;
  openChat(u);
}

function getTimeAgo(ts){
  const diff = (Date.now() - new Date(ts)) / 1000;
  if(diff < 60) return 'الآن';
  if(diff < 3600) return `${Math.floor(diff/60)} د`;
  if(diff < 86400) return `${Math.floor(diff/3600)} س`;
  return `${Math.floor(diff/86400)} ي`;
}

// ══════════════════════════════════════
// AVATAR UPLOAD
// ══════════════════════════════════════
