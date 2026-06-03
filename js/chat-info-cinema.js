// ══ Admin Cinema Page - Dashboard ══
let acpPeak = 0;
let acpTotalJoined = 0;
let acpAdminChannel = null; // قناة مستقلة للأدمن عند فتح اللوحة بدون دخول الغرفة

let peakViewers = 0;
let joinedSession = 0;
// 2. دالة فتح لوحة التحكم — الداتا جاهزة دايماً من قناة الشبح
let acpRefreshInterval = null;

function openAdminPage(){
  document.getElementById('admin-cinema-page').style.display = 'flex';
  acpRefreshUI();

  // اطلب من الكل يعرّف نفسه
  const ch = ciChannel || ciGhostChannel;
  if(ch) ch.send({type:'broadcast', event:'ci_ping', payload:{}});

  if(acpRefreshInterval) clearInterval(acpRefreshInterval);
  acpRefreshInterval = setInterval(() => {
    const ch2 = ciChannel || ciGhostChannel;
    if(ch2) ch2.send({type:'broadcast', event:'ci_ping', payload:{}});
    acpRefreshUI();
  }, 10000);
}

function closeAdminPage(){
  document.getElementById('admin-cinema-page').style.display = 'none';
  if(acpRefreshInterval){ clearInterval(acpRefreshInterval); acpRefreshInterval = null; }
  if(acpAdminChannel){ sb.removeChannel(acpAdminChannel); acpAdminChannel = null; }
}

let ciIsRotated = false;
async function ciRotateScreen(){
  const room = document.getElementById('cinema-room');
  try {
    // ادخل fullscreen أولاً
    if(!document.fullscreenElement){
      await room.requestFullscreen().catch(()=>{});
    }
    // بعدين دوّر
    if(screen.orientation && screen.orientation.lock){
      const type = screen.orientation.type;
      if(type.includes('portrait')){
        await screen.orientation.lock('landscape-primary');
      } else {
        await screen.orientation.lock('portrait-primary');
      }
    }
  } catch(e){
    showToast('التدوير غير مدعوم على هذا الجهاز');
  }
}

function ciCssRotate(room){}


// ── رسالة الأدمن المضيئة ──
function acpSendAnnouncement(){
  const txt = document.getElementById('acp-announce-text')?.value?.trim();
  if(!txt){ showToast('اكتب رسالة أولاً'); return; }
  const ch = ciChannel || ciGhostChannel;
  if(!ch){ showToast('غير متصل بالقناة'); return; }
  ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'announce', text: txt}});
  document.getElementById('acp-announce-text').value = '';
  showToast('✅ تم إرسال الرسالة');
  // الأدمن يشوفها كمان
  ciShowAnnouncement(txt);
}

let ciAnnounceTimer = null;
function ciShowAnnouncement(text){
  const overlay = document.getElementById('ci-announce-overlay');
  const textEl  = document.getElementById('ci-announce-text');
  if(!overlay || !textEl) return;
  textEl.textContent = text;
  overlay.style.opacity = '1';
  if(ciAnnounceTimer) clearTimeout(ciAnnounceTimer);
  ciAnnounceTimer = setTimeout(() => {
    overlay.style.opacity = '0';
  }, 3000);
}

async function acpSetVideo(){
  const url = document.getElementById('acp-url').value.trim();
  if(!url){ showToast('أدخل رابط الفيلم'); return; }
  await sb.from('cinema_settings').upsert({key:'video_url', value:url});
  // استخدم أي قناة متاحة
  const ch = ciChannel || acpAdminChannel;
  if(ch) ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'load', url}});
  showToast('تم تشغيل الفيلم للجميع ✓');
  document.getElementById('acp-url').value = '';
}

async function acpChangePw(){
  const pw = document.getElementById('acp-pw').value.trim();
  if(!pw || pw.length < 3){ showToast('كلمة السر قصيرة'); return; }
  await sb.from('cinema_settings').upsert({key:'password', value:pw});
  document.getElementById('acp-pw').value = '';
  showToast('تم تغيير كلمة السر ✓');
}

// 3. دالة بناء واجهة المشاهدين في اللوحة الفخمة
function acpRefreshUI(){
  const viewers = ciViewers || {};
  const entries = Object.entries(viewers);
  const count = entries.length;

  // إحصائيات — أعلى رقم واللي انضموا
  if (count > peakViewers) peakViewers = count;
  joinedSession = Math.max(joinedSession, count);

  // ── العدادات (IDs الصحيحة من الـ HTML) ──
  const peakEl   = document.getElementById('acp-peak');
  const joinedEl = document.getElementById('acp-total-joined');
  const countEl  = document.getElementById('acp-count');
  const badgeEl  = document.getElementById('acp-crew-badge');
  const dotEl    = document.getElementById('acp-live-dot');
  const txtEl    = document.getElementById('acp-live-txt');

  if(peakEl)   peakEl.textContent   = peakViewers;
  if(joinedEl) joinedEl.textContent = joinedSession;
  if(countEl)  countEl.textContent  = count;
  if(badgeEl)  badgeEl.textContent  = count + ' ONLINE';

  // نقطة LIVE
  if(dotEl && txtEl){
    if(count > 0){
      dotEl.style.background = '#22c55e';
      dotEl.style.boxShadow  = '0 0 8px #22c55e';
      txtEl.textContent      = count + ' WATCHING';
    } else {
      dotEl.style.background = '#555';
      dotEl.style.boxShadow  = 'none';
      txtEl.textContent      = 'LIVE';
    }
  }

  // Gauge arc SVG (452 = محيط الدائرة r=72)
  const arc = document.getElementById('acp-gauge-arc');
  if(arc){
    const filled = Math.min(count / 20, 1) * 452;
    arc.style.strokeDashoffset = 452 - filled;
  }

  // ── قائمة المشاهدين (ID الصحيح: acp-viewers) ──
  const list = document.getElementById('acp-viewers');
  if(!list) return;

  if(count === 0){
    list.innerHTML = '<div class="acp-crew-empty" style="text-align:center;padding:28px;color:rgba(255,255,255,.3);font-size:12px;">لا يوجد مشاهدون حالياً</div>';
    return;
  }

  list.innerHTML = entries.map(([uid, info]) => `
    <div class="acp-crew-item" id="crew-${uid}" style="transition:opacity .3s,transform .3s;">
      <div class="acp-crew-avatar">${(info.username||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0;">
        <div class="acp-crew-name">${escHtml(info.username||'?')}</div>
        <div class="acp-crew-status">● CONNECTED</div>
      </div>
      <button class="acp-eject-btn" onclick="acpKickIndividual('${uid}','${escHtml(info.username||'?')}')">⏏ طرد</button>
    </div>`).join('');
}
// زر الـ refresh اليدوي
function acpRefreshAnim(){
  const btn = document.querySelector('.acp-refresh-btn');
  if(btn){ btn.classList.add('spinning'); setTimeout(()=>btn.classList.remove('spinning'),500); }
  acpRefreshUI();
}
// طرد الجميع (يشتغل سواء داخل الغرفة أو برا)
function acpKickAll(){
  if(!confirm('طرد جميع المشاهدين؟')) return;
  const ch = ciChannel || ciGhostChannel;
  if(ch) ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick_all'}});
  showToast('تم طرد الجميع 🚫');
}
// 4. دالة الطرد الفردي (يشتغل سواء داخل الغرفة أو برا)
function acpKickIndividual(uid, username) {
  if(!confirm(`هل تريد طرد ${username} من الغرفة؟`)) return;
  const ch = ciChannel || ciGhostChannel;
  if(ch){
    ch.send({type:'broadcast', event:'ci_cmd', payload:{type:'kick', target:uid}});
    showToast(`تم طرد ${username} 🚫`);
    const el = document.getElementById('crew-' + uid);
    if(el){ el.style.opacity='0'; el.style.transform='translateX(40px)'; setTimeout(()=>el.remove(),300); }
    if(ciViewers) delete ciViewers[uid];
  }
}

