// ── Admin Actions ──
function ciToggleAdminPanel(e){
  e.stopPropagation();
  $('cinema-admin-panel').classList.toggle('show');
}

async function ciAdminSetVideo(){
  const url = $('cinema-url-input').value.trim();
  if(!url){ showToast('أدخل رابط الفيلم'); return; }
  // حفظ في DB + إعادة ضبط الوقت للصفر
  await Promise.all([
    sb.from('cinema_settings').upsert({key:'video_url', value:url}),
    sb.from('cinema_settings').upsert({key:'current_time', value:'0'}),
  ]);
  // أرسل لكل المشاهدين
  ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'load', url}});
  ciLoadVideo(url, 0);
  showToast('تم تحميل الفيلم للجميع ✓');
}

async function ciAdminChangePw(){
  const pw = $('cinema-new-pw').value.trim();
  if(!pw || pw.length < 4){ showToast('كلمة السر قصيرة جداً'); return; }
  await sb.from('cinema_settings').upsert({key:'password', value:pw});
  $('cinema-new-pw').value = '';
  showToast('تم تغيير كلمة السر ✓');
}

function ciKick(uid){
  ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick', target:uid}});
  showToast('تم طرد المستخدم 🚫');
}

function ciKickAll(){
  ciChannel?.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick_all'}});
  showToast('تم طرد الجميع');
}

let newWorker = null;

function doUpdate(){
  if(newWorker) newWorker.postMessage({type:'SKIP_WAITING'});
  window.location.reload();
}

function dismissUpdate(){
  document.getElementById('update-banner').style.display = 'none';
}

function showUpdateBanner(){
  const b = document.getElementById('update-banner');
  b.style.display = 'flex';
}

