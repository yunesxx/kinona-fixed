async function renderMyProfileInline(profile){
  const uid = profile.id;
  // جيب الإحصائيات
  const [{data:posts},{data:followers},{data:following}] = await Promise.all([
    sb.from('posts').select('id').eq('user_id', uid),
    sb.from('follows').select('id').eq('following_id', uid),
    sb.from('follows').select('id').eq('follower_id', uid),
  ]);
  const postsCount = posts?.length || 0;
  const followersCount = followers?.length || 0;
  const followingCount = following?.length || 0;

  const avHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}">`
    : `<span>${(profile.username||'?')[0].toUpperCase()}</span>`;

  $('my-profile-inline').innerHTML = `
    <div class="mpi-hero">
      <div class="mpi-hero-inner">
        <div class="mpi-av-wrap" onclick="$('avatar-file-input').click()">
          <div class="mpi-av">${avHtml}</div>
          <div class="mpi-av-edit">＋</div>
        </div>
      </div>
    </div>
    <div class="mpi-info">
      <div class="olive-tree-wrap">${renderOliveTree(getLevelInfo(profile.xp||0, profile.messages_sent||0).level)}</div>
      <div class="mpi-display-name">${profile.display_name || profile.username}</div>
      <div class="mpi-username">@${profile.username}</div>
      <div style="margin:6px 0 2px;" onclick="showLevelCard('${profile.id}')">${makeLevelBadge(profile.xp||0, profile.messages_sent||0, 28)}</div>
      ${profile.bio ? `<div class="mpi-bio">${escHtml(profile.bio)}</div>` : ''}
    </div>
    <div class="mpi-stats">
      <div class="mpi-stat">
        <span class="mpi-stat-num">${postsCount}</span>
        <span class="mpi-stat-lbl">منشور</span>
      </div>
      <div class="mpi-stat" onclick="openProfileFollowModal('followers')">
        <span class="mpi-stat-num">${followersCount}</span>
        <span class="mpi-stat-lbl">متابع</span>
      </div>
      <div class="mpi-stat" onclick="openProfileFollowModal('following')">
        <span class="mpi-stat-num">${followingCount}</span>
        <span class="mpi-stat-lbl">يتابع</span>
      </div>
    </div>
    <div class="mpi-highlights"></div>
    <div class="mpi-actions">
      <button class="mpi-btn mpi-btn-primary" onclick="openEditProfile()">تعديل الملف الشخصي</button>
      <button class="mpi-btn" onclick="shareProfile()">مشاركة</button>
      <button class="mpi-btn mpi-btn-icon" id="bell-notif-btn-inline" onclick="showPage('notifs',null)" title="الإشعارات" aria-label="الإشعارات">
        <svg class="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-badge" id="notif-badge-bell-inline"></span>
      </button>
    </div>
    ${profile.username === '7r.9' ? `
    <div style="padding:0 18px 10px;display:flex;justify-content:flex-end;">
      <button onclick="checkAdminAndOpen()" class="mpi-admin-uv-btn" title="تحكم السينما">
        <span class="mpi-uv-sign">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z" fill="white"/>
            <path d="M19 8l1.5-1.5M20.5 8H20M5 8L3.5 6.5M3.5 8h.5" stroke="rgba(255,220,120,1)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="mpi-uv-text">تحكم السينما</span>
      </button>
    </div>` : ''}

    <div class="mpi-tabs">
      <button class="mpi-tab active" id="mpi-tab-img" onclick="switchMyTab('all',this)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      </button>
      <button class="mpi-tab" id="mpi-tab-saved" onclick="switchMyTab('saved',this)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
    <div class="mpi-grid" id="mpi-grid"></div>
  `;
  loadMyPosts(uid);

  // ── Cosmetics: طبّق على بروفايلي الشخصي ──
  if (typeof fetchUserCosmetics === 'function') {
    (async () => {
      await fetchUserCosmetics(uid);
      const [gradC, colorC, borderC, titleC, auraC] = await Promise.all([
        getUserCosmetic(uid, 'username_gradient'),
        getUserCosmetic(uid, 'username_color'),
        getUserCosmetic(uid, 'avatar_border'),
        getUserCosmetic(uid, 'royal_title'),
        getUserCosmetic(uid, 'radiance_aura'),
      ]);
      const mpiWrap = $('my-profile-inline');
      if (!mpiWrap) return;

      // الاسم
      const nameEl = mpiWrap.querySelector('.mpi-display-name');
      if (nameEl) {
        if (gradC) {
          nameEl.style.setProperty('background', gradC.value, 'important');
          nameEl.style.setProperty('-webkit-background-clip', 'text', 'important');
          nameEl.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
          nameEl.style.setProperty('background-clip', 'text', 'important');
        } else if (colorC) {
          nameEl.style.setProperty('color', colorC.value, 'important');
          nameEl.style.setProperty('-webkit-text-fill-color', colorC.value, 'important');
          nameEl.style.removeProperty('background');
        }
        // اللقب الملكي بجانب الاسم
        if (titleC && typeof applyRoyalTitle === 'function') {
          applyRoyalTitle(nameEl, titleC.value);
        }
      }

      // الأفاتار
      const avEl = mpiWrap.querySelector('.mpi-av');
      if (avEl) {
        if (borderC) {
          avEl.style.setProperty('border', '3px solid transparent', 'important');
          avEl.style.setProperty('border-radius', '50%', 'important');
          avEl.style.setProperty('background', `${borderC.value} border-box`, 'important');
          avEl.style.setProperty('-webkit-mask', 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', 'important');
          avEl.style.setProperty('-webkit-mask-composite', 'destination-out', 'important');
          avEl.style.setProperty('mask-composite', 'exclude', 'important');
          avEl.style.setProperty('box-sizing', 'border-box', 'important');
        }
        // هالة النور على الأفاتار
        if (auraC && typeof applyRadianceAura === 'function') {
          applyRadianceAura(avEl, auraC.value);
        }
      }
    })().catch(e => console.warn('[Cosmetics] my-profile:', e));
  }
}

async function loadMyPosts(uid){
  const {data} = await sb.from('posts').select('*').eq('user_id', uid).order('created_at',{ascending:false});
  renderMyTab(myProfileTab, data||[]);
}

function switchMyTab(tab, btn){
  myProfileTab = tab;
  document.querySelectorAll('.mpi-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(tab === 'saved'){
    loadMySavedGrid();
  } else {
    const uid = currentUser.id;
    sb.from('posts').select('*').eq('user_id', uid).order('created_at',{ascending:false})
      .then(({data})=> renderMyTab('all', data||[]));
  }
}

function renderMyTab(tab, posts){
  const grid = $('mpi-grid');
  if(!grid) return;
  let filtered = posts.filter(p=>p.image_url || p.video_url);
  if(!filtered.length){
    grid.innerHTML=`<div class="mpi-empty">📷 لا يوجد صور بعد</div>`;
    return;
  }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(filtered))));
  grid.innerHTML = filtered.map((p,i)=>{
    const thumb = p.image_url
      ? `<img src="${p.image_url}" loading="lazy">`
      : `<video src="${p.video_url}" muted playsinline preload="metadata"></video><div class="mpi-reel-badge">▶</div>`;
    return `<div class="mpi-thumb" onclick="openPostViewer('${b64}',${i})">${thumb}</div>`;
  }).join('');
}

async function loadMySavedGrid(){
  const grid = $('mpi-grid');
  if(!grid) return;
  grid.innerHTML = `<div class="mpi-empty">⏳</div>`;
  const {data} = await sb.from('saved_posts').select('post_id, posts(*)').eq('user_id', currentUser.id).order('created_at',{ascending:false});
  const posts = (data||[]).map(r=>r.posts).filter(Boolean);
  if(!posts.length){ grid.innerHTML=`<div class="mpi-empty">🔖 لا يوجد منشورات محفوظة</div>`; return; }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(posts))));
  grid.innerHTML = posts.map((p,i)=>{
    const thumb = p.image_url
      ? `<img src="${p.image_url}" loading="lazy">`
      : `<video src="${p.video_url}" muted playsinline preload="metadata"></video><div class="mpi-reel-badge">▶</div>`;
    return `<div class="mpi-thumb" onclick="openPostViewer('${b64}',${i})">${thumb}</div>`;
  }).join('');
}

function updateNavAvatar(profile){
  const el = $('nav-profile-av');
  if(!el) return;
  if(profile.avatar_url){
    el.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    el.textContent = (profile.username||'?')[0].toUpperCase();
  }
}

