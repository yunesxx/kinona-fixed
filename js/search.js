function searchUsers(q){
  clearTimeout(searchTimer);
  if(!q.trim()){ $('users-list').innerHTML=''; return; }
  searchTimer = setTimeout(()=> doSearch(q), 350);
}
async function doSearch(q){
  const {data} = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,bio')
    .ilike('username', `%${q}%`).neq('id', currentUser.id).limit(20);
  if(!data || data.length===0){
    $('users-list').innerHTML=`<div style="text-align:center;padding:40px;color:#999">لا يوجد نتائج</div>`;
    return;
  }
  $('users-list').innerHTML = data.map(u=>`
    <div class="user-item" onclick="openProfile('${u.id}')">
      ${makeAv(u.username, u.avatar_url, 46)}
      <div class="user-item-info">
        <div class="user-item-name">${u.username}</div>
        <div class="user-item-bio">${u.bio||''}</div>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
// PROFILE VIEW
// ══════════════════════════════════════
let profilePostsCache = [];
let currentProfileTab = 'images';
let blockedUsers = new Set();
let savedPosts = new Set(); // IDs المحفوظة للمستخدم الحالي

let profileOpenedFromChat = false;

