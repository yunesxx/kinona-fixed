// ══════════════════════════════════════
// FEED
// ══════════════════════════════════════
let feedLoading = false;
let _feedLastLoad = 0;
async function loadFeed(force = false){
  if(feedLoading) return;
  // تجاهل إعادة التحميل إذا تحمّل قبل أقل من 30 ثانية (ما لم يكن إجبارياً)
  const now = Date.now();
  const feedEl = $('feed-list');
  const isFirstLoad = feedEl.children.length === 0;
  if(!force && !isFirstLoad && now - _feedLastLoad < 30000) return;
  feedLoading = true;
  _feedLastLoad = now;

  // احفظ موضع السكرول الحالي
  const savedScroll = window.scrollY || document.documentElement.scrollTop;

  if(isFirstLoad){
    feedEl.innerHTML = `<div class="feed-loading"><div class="spinner"></div><br>جارٍ التحميل...</div>`;
  }

  const {data: follows} = await sb.from('follows')
    .select('following_id').eq('follower_id', currentUser.id);
  const ids = follows ? follows.map(f => f.following_id) : [];
  ids.push(currentUser.id);
  feedLoading = false;

  if(ids.length === 1 && ids[0] === currentUser.id){
    $('feed-list').innerHTML = `<div class="empty-feed"><div>🌱</div><p>تابع أشخاصاً لترى منشوراتهم هنا!</p></div>`;
    return;
  }

  const {data} = await sb.from('posts')
    .select('id,user_id,username,avatar_url,caption,image_url,video_url,reactions,created_at')
    .in('user_id', ids).order('created_at',{ascending:false}).limit(30);
  if(!data || data.length === 0){
    $('feed-list').innerHTML = `<div class="empty-feed"><div>📭</div><p>لا توجد منشورات بعد</p></div>`;
    return;
  }

  $('feed-list').innerHTML = data.map(p => {
    const reactions = p.reactions || {};
    const emojiCounts = {};
    Object.entries(reactions).forEach(([emoji, users])=>{
      if(typeof users === 'object') emojiCounts[emoji] = Object.keys(users).length;
      else emojiCounts[emoji] = Number(users||0);
    });
    const totalReacts = Object.values(emojiCounts).reduce((s,v)=>s+v,0);

    const myReactEntry = Object.entries(reactions).find(([e,users])=>typeof users==='object' && users[currentUser.id]);
    const liked = !!myReactEntry;
    const isOwn = p.user_id === currentUser.id;
    const timeAgo = getTimeAgo(p.created_at);
    const isSaved = savedPosts.has(p.id);

    // الميديا — صورة أو فيديو
    let mediaHtml = '';
    if(p.video_url){
      const posterUrl = cldVidPoster(p.video_url, 720);
      const posterEl = posterUrl
        ? `<img src="${posterUrl}" class="reel-vid-poster" loading="lazy" alt="">`
        : `<video src="${p.video_url}#t=0.1" class="reel-vid-poster" preload="metadata" muted playsinline></video>`;
      mediaHtml = `
        <div class="reel-media-wrap" data-vidurl="${p.video_url}" data-postid="${p.id}" onclick="event.stopPropagation();playPostVideo('${p.id}','${p.video_url}')">
          ${posterEl}
          <button class="reel-play" aria-label="تشغيل">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>`;
    } else if(p.image_url){
      mediaHtml = `<div class="reel-media-wrap"><img src="${cldImg(p.image_url, 800)}" class="reel-img" loading="lazy"></div>`;
    }

    return `<div class="reel-card post-card" id="post-${p.id}" data-postid="${p.id}" data-own="${isOwn}">
      ${mediaHtml}

      <div class="reel-gradient top"></div>
      <div class="reel-gradient bottom"></div>

      <!-- معلومات أسفل الـ reel -->
      <div class="reel-info">
        <div class="reel-user-row" onclick="openProfile('${p.user_id}')">
          <div class="reel-av post-av-zoom" onclick="event.stopPropagation();zoomAvatar('${p.avatar_url||''}','${escHtml(p.username)}')">
            ${p.avatar_url ? `<img src="${p.avatar_url}">` : (p.username||'?')[0].toUpperCase()}
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <span class="post-username reel-username">${escHtml(p.username)}</span>
            <span class="reel-time">${timeAgo}</span>
          </div>
        </div>
        ${p.caption ? `<div class="reel-caption">${escHtml(p.caption)}</div>` : ''}
      </div>

      <!-- أزرار التفاعل العمودية -->
      <div class="reel-actions">
        <button class="reel-act ${liked?'liked':''}" id="like-btn-${p.id}" onclick="quickLike('${p.id}', this)" aria-label="إعجاب">
          <span class="reel-act-icon">
            <svg class="heart-svg" width="22" height="22" viewBox="0 0 24 24" fill="${liked?'#fff':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          <span class="reel-act-lbl">${totalReacts || ''}</span>
        </button>
        <button class="reel-act" id="cmt-btn-${p.id}" data-count="${p.comments_count||0}" onclick="openComments('${p.id}')" aria-label="تعليقات">
          <span class="reel-act-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span class="reel-act-lbl">${p.comments_count||''}</span>
        </button>
        <button class="reel-act" onclick="sharePost('${p.id}','${escHtml(p.username)}')" aria-label="مشاركة">
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
        ${isOwn ? `<button class="reel-act" onclick="showPostOpts('${p.id}')" aria-label="خيارات">
          <span class="reel-act-icon" style="font-weight:800;font-size:20px;">···</span>
        </button>` : ''}
      </div>

    </div>`;
  }).join('');

  // Long press على كل بوست للحذف (للمالك فقط)
  data.forEach(p => {
    if(p.user_id !== currentUser.id) return;
    const el = $('post-'+p.id);
    if(el) addLongPress(el, () => showPostOpts(p.id), 600);
  });

  // ── Level badges: جيب xp + messages_sent لكل يوزر فريد وحقن الـ badge ──
  const uniqueUserIds = [...new Set(data.map(p => p.user_id))];
  const { data: statsRows } = await sb.from('profiles').select('id,xp,messages_sent').in('id', uniqueUserIds);
  const statsMap = {};
  (statsRows || []).forEach(r => { statsMap[r.id] = { xp: r.xp || 0, msgs: r.messages_sent || 0 }; });
  data.forEach(p => {
    const s = statsMap[p.user_id] || { xp:0, msgs:0 };
    const badge = makeLevelBadge(s.xp, s.msgs, 22);
    const card = $('post-' + p.id);
    if (!card) return;
    const usernameEl = card.querySelector('.post-username');
    if (usernameEl && !usernameEl.querySelector('.level-badge')) {
      usernameEl.insertAdjacentHTML('afterend', badge);
      const badgeEl = usernameEl.nextElementSibling;
      if (badgeEl && badgeEl.classList.contains('level-badge')) {
        badgeEl.addEventListener('click', e => { e.stopPropagation(); showLevelCard(p.user_id); });
      }
    }
  });

  // ── Cosmetics: طبّق كل التأثيرات على الفيد (لون + هالة + لقب + إطار) ──
  if (typeof applyPostsCosmetics === 'function') {
    applyPostsCosmetics(data).catch(e => console.warn('[Cosmetics] posts:', e));
  }

  // ── راقب الـ reels (autoplay لما يدخل، pause لما يطلع) ──
  _initReelObserver();
  document.querySelectorAll('.reel-media-wrap[data-vidurl]').forEach(w => window._reelObs.observe(w));

  // ابدأ تشغيل أول reel تلقائياً (لو هي صفحة المنشورات الحالية)
  setTimeout(() => {
    if(document.getElementById('page-posts')?.classList.contains('active')){
      const first = document.querySelector('.reel-media-wrap[data-vidurl]');
      if(first){
        const postId = first.dataset.postid;
        const url = first.dataset.vidurl;
        if(postId && url) playPostVideo(postId, url, /*muted=*/true);
      }
    }
  }, 200);
}

// تشغيل فيديو الـ reel — يستبدل الـ poster بـ video element حقيقي
function playPostVideo(postId, videoUrl, autoMuted){
  const wrap = document.querySelector(`.reel-media-wrap[data-postid="${postId}"]`);
  if(!wrap || wrap.dataset.playing === '1') return;
  wrap.dataset.playing = '1';

  // أوقف أي فيديو آخر شغّال
  document.querySelectorAll('.reel-media-wrap[data-playing="1"]').forEach(w => {
    if(w === wrap) return;
    const v = w.querySelector('video');
    if(v) v.pause();
    w.dataset.playing = '0';
    w.querySelector('video')?.remove();
    const poster = w.querySelector('.reel-vid-poster');
    const playBtn = w.querySelector('.reel-play');
    if(poster) poster.style.display = 'block';
    if(playBtn) playBtn.classList.remove('hidden');
  });

  const poster = wrap.querySelector('.reel-vid-poster');
  const playBtn = wrap.querySelector('.reel-play');
  const posterSrc = poster?.src || '';
  const video = document.createElement('video');
  video.src = cldVid(videoUrl);
  video.className = 'reel-vid-el';
  video.playsInline = true;
  video.loop = true;
  video.muted = !!autoMuted;
  video.autoplay = true;
  video.preload = 'auto';
  if(posterSrc) video.poster = posterSrc;
  wrap.appendChild(video);
  if(poster) poster.style.display = 'none';
  if(playBtn) playBtn.classList.add('hidden');
  video.play().catch(()=>{
    // فشل التشغيل التلقائي — أظهر زر التشغيل ثاني
    if(playBtn) playBtn.classList.remove('hidden');
  });
}

// راقب الـ reels: شغّل تلقائياً اللي في الـ view، وقّف اللي خارج
function _initReelObserver(){
  if(window._reelObs) return;
  window._reelObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const wrap = e.target;
      const v = wrap.querySelector('video');
      if(e.isIntersecting && e.intersectionRatio > 0.6){
        if(v){
          v.play().catch(()=>{});
        } else {
          const postId = wrap.dataset.postid;
          const url = wrap.dataset.vidurl;
          if(postId && url) playPostVideo(postId, url, /*muted=*/true);
        }
      } else if(v && !v.paused){
        v.pause();
      }
    });
  }, { threshold: [0, 0.6, 0.9] });
}

// ضغطة قلب سريعة — instant toggle، بدون انتظار DB
async function quickLike(postId, btn){
  const willLike = !btn.classList.contains('liked');

  // ── UI فوراً ──
  btn.classList.toggle('liked', willLike);
  btn.classList.remove('pop');
  void btn.offsetWidth; // restart animation
  btn.classList.add('pop');
  if(navigator.vibrate) navigator.vibrate(willLike ? 15 : 0);
  const heart = btn.querySelector('.heart-svg');
  if(heart) heart.setAttribute('fill', willLike ? '#fff' : 'none');
  // count فوراً
  const lbl = btn.querySelector('.reel-act-lbl');
  if(lbl){
    const cur = parseInt(lbl.textContent, 10) || 0;
    const next = willLike ? cur + 1 : Math.max(0, cur - 1);
    lbl.textContent = next || '';
  }

  // ── الكتابة على DB في الخلفية ──
  if(!window._reactCache) window._reactCache = {};
  let reactions = window._reactCache[postId] ? JSON.parse(JSON.stringify(window._reactCache[postId])) : null;
  if(!reactions){
    const {data:post} = await sb.from('posts').select('reactions').eq('id', postId).single();
    reactions = post?.reactions || {};
  }
  // امسح أي ريأكشن قديم لليوزر (لو رمز تاني)
  Object.keys(reactions).forEach(e => {
    if(typeof reactions[e]==='object' && reactions[e][currentUser.id]) delete reactions[e][currentUser.id];
  });
  // toggle حقيقي على ❤️
  if(willLike){
    if(!reactions['❤️']) reactions['❤️'] = {};
    reactions['❤️'][currentUser.id] = true;
  }
  // إذا willLike=false → خلّيها مسحوة (ما تضيفها تاني)

  window._reactCache[postId] = JSON.parse(JSON.stringify(reactions));
  sb.from('posts').update({reactions}).eq('id', postId);

  if(willLike){
    // إشعار + xp بالخلفية
    sb.from('posts').select('user_id,image_url').eq('id', postId).single().then(({data:post}) => {
      if(post && post.user_id !== currentUser.id) createNotif(post.user_id, 'like', postId, post.image_url, '❤️');
    });
    addXP('like');
  }
}

async function reactToPost(postId, emoji){
  // ── Optimistic: اقرأ الـ cache المحلي أولاً ──
  if(!window._reactCache) window._reactCache = {};
  let reactions = window._reactCache[postId] ? JSON.parse(JSON.stringify(window._reactCache[postId])) : null;

  // إذا ما في cache اقرأ من DB مرة واحدة
  if(!reactions){
    const {data:post} = await sb.from('posts').select('reactions').eq('id', postId).single();
    reactions = post?.reactions || {};
  }

  // remove old reaction
  Object.keys(reactions).forEach(e => {
    if(typeof reactions[e]==='object' && reactions[e][currentUser.id]) delete reactions[e][currentUser.id];
  });
  // toggle
  if(!reactions[emoji]) reactions[emoji] = {};
  if(reactions[emoji][currentUser.id]) delete reactions[emoji][currentUser.id];
  else reactions[emoji][currentUser.id] = true;

  // حفظ في الـ cache فوراً
  window._reactCache[postId] = JSON.parse(JSON.stringify(reactions));

  // ── حدّث UI فوراً (count فقط — الـ heart اتحدّث بالفعل في quickLike) ──
  const myReact = Object.entries(reactions).find(([e,u])=>typeof u==='object'&&u[currentUser.id]);
  const emojiCounts = {};
  Object.entries(reactions).forEach(([e,u])=>{ if(typeof u==='object') emojiCounts[e]=Object.keys(u).length; });
  const total = Object.values(emojiCounts).reduce((s,v)=>s+v,0);
  const likeBtn = $('like-btn-'+postId);
  if(likeBtn){
    const lbl  = likeBtn.querySelector('.reel-act-lbl');
    if(lbl)  lbl.textContent = total || '';
    likeBtn.classList.toggle('liked', !!myReact);
    // تأكد إن الـ heart fill مطابق للحالة
    const heart = likeBtn.querySelector('.heart-svg');
    if(heart) heart.setAttribute('fill', myReact ? '#fff' : 'none');
  }

  // ── ابعت للـ DB بالخلفية ──
  sb.from('posts').update({reactions}).eq('id', postId);
  // إشعار فوري بدون انتظار الـ DB
  if(myReact){
    const {data:post} = await sb.from('posts').select('user_id,image_url').eq('id',postId).single();
    if(post) createNotif(post.user_id, 'like', postId, post.image_url, emoji);
    addXP('like');
  }
}

// ── حذف البوست ──
function showPostOpts(postId){
  selectedPostId = postId;
  const overlay = $('post-opt-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(()=> overlay.classList.add('show'));
  if(navigator.vibrate) navigator.vibrate(40);
}
function closePostOpts(){
  const overlay = $('post-opt-overlay');
  overlay.classList.remove('show');
  setTimeout(()=>{ overlay.style.display='none'; }, 280);
}
async function deletePost(){
  if(!selectedPostId) return;
  await sb.from('posts').delete().eq('id', selectedPostId).eq('user_id', currentUser.id);
  // also delete comments
  await sb.from('comments').delete().eq('post_id', selectedPostId);
  closePostOpts();
  showToast('تم حذف المنشور 🗑️');
  // إزالة فورية من الـ DOM
  const el = $('post-'+selectedPostId);
  if(el) el.remove();
  selectedPostId = null;
}

