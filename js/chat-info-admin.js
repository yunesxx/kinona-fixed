// ══ Admin from Profile ══
async function ciAdminSetVideoFromProfile(){
  const url = document.getElementById('ci-profile-url')?.value?.trim();
  if(!url){ showToast('أدخل رابط الفيلم'); return; }
  await sb.from('cinema_settings').upsert({key:'video_url', value:url});
  // أرسل لكل المشاهدين عبر channel
  const ch = sb.channel('kinona_cinema_room');
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'load', url}});
  showToast('تم تشغيل الفيلم للجميع ✓');
}

async function ciAdminChangePwFromProfile(){
  const pw = document.getElementById('ci-profile-pw')?.value?.trim();
  if(!pw || pw.length < 4){ showToast('كلمة السر قصيرة جداً'); return; }
  await sb.from('cinema_settings').upsert({key:'password', value:pw});
  document.getElementById('ci-profile-pw').value = '';
  showToast('تم تغيير كلمة السر ✓');
}

function ciAdminKickAllFromProfile(){
  const ch = sb.channel('kinona_cinema_room');
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick_all'}});
  showToast('تم طرد الجميع 🚫');
}

function ciAdminKickFromProfile(uid){
  const ch = sb.channel('kinona_cinema_room');
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick', target:uid}});
  showToast('تم الطرد 🚫');
}

// تحديث قائمة المشاهدين في البروفايل
function ciUpdateProfileViewers(viewers){
  const list = document.getElementById('ci-profile-viewers');
  if(!list) return;
  const entries = Object.entries(viewers);
  if(entries.length === 0){
    list.innerHTML = '<div style="font-size:12px;color:#bbb;text-align:center;padding:8px;">لا يوجد مشاهدون حالياً</div>';
    return;
  }
  list.innerHTML = entries.map(([uid, v]) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0;">
      <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff416c,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${(v.username||'?')[0].toUpperCase()}</div>
      <span style="flex:1;font-size:13px;font-weight:600;">${escHtml(v.username||'?')}</span>
      <button onclick="ciAdminKickFromProfile('${uid}')" style="background:rgba(255,65,108,.1);color:#ff416c;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">طرد</button>
    </div>`).join('');
}


// ══ Admin Cinema Modal ══
const ADMIN_CINEMA_PASS = 'yones1996cv';

function openAdminCinemaModal(){
  showAdminLoginModal(()=>{
    const modal = document.getElementById('admin-cinema-modal');
    modal.style.display = 'flex';
    acmRefreshViewers();
  });
}

function closeAdminCinemaModal(){
  document.getElementById('admin-cinema-modal').style.display = 'none';
}

async function acmSetVideo(){
  const url = document.getElementById('acm-url').value.trim();
  if(!url){ showToast('أدخل رابط الفيلم'); return; }
  await sb.from('cinema_settings').upsert({key:'video_url', value:url});
  const ch = sb.channel('kinona_cinema_room');
  await ch.subscribe();
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'load', url}});
  setTimeout(()=> sb.removeChannel(ch), 3000);
  showToast('تم تشغيل الفيلم للجميع ✓');
  document.getElementById('acm-url').value = '';
}

async function acmChangePw(){
  const pw = document.getElementById('acm-pw').value.trim();
  if(!pw || pw.length < 3){ showToast('كلمة السر قصيرة جداً'); return; }
  await sb.from('cinema_settings').upsert({key:'password', value:pw});
  document.getElementById('acm-pw').value = '';
  showToast('تم تغيير كلمة السر ✓');
}

async function acmKickAll(){
  const ch = sb.channel('kinona_cinema_room');
  await ch.subscribe();
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick_all'}});
  setTimeout(()=> sb.removeChannel(ch), 2000);
  showToast('تم طرد الجميع 🚫');
}

async function acmKick(uid){
  const ch = sb.channel('kinona_cinema_room');
  await ch.subscribe();
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick', target:uid}});
  setTimeout(()=> sb.removeChannel(ch), 2000);
  showToast('تم الطرد 🚫');
  acmRefreshViewers();
}

async function acmRefreshViewers(){
  // اقرأ المشاهدين من الـ channel presence
  const viewers = ciViewers || {};
  const entries = Object.entries(viewers);
  document.getElementById('acm-count').textContent = entries.length;
  const list = document.getElementById('acm-viewers');
  if(entries.length === 0){
    list.innerHTML = '<div style="font-size:12px;color:#bbb;text-align:center;padding:8px;">لا يوجد مشاهدون</div>';
    return;
  }
  list.innerHTML = entries.map(([uid, v]) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f5f5f5;">
      <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ff416c,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;">${(v.username||'?')[0].toUpperCase()}</div>
      <span style="flex:1;font-size:13px;font-weight:600;">${escHtml(v.username||'?')}</span>
      <button onclick="acmKick('${uid}')" style="background:rgba(255,65,108,.1);color:#ff416c;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">طرد</button>
    </div>`).join('');
}


