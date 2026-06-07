// ══════════════════════════════════════
// KEYBOARD INSET — يرفع شريط الكتابة فوق الكيبورد
// ══════════════════════════════════════
(function(){
  const vv = window.visualViewport;
  if(!vv) return;
  const root = document.documentElement;
  let raf = 0;
  function update(){
    raf = 0;
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--kb', kb + 'px');
    // ثبّت آخر رسالة بالمرأى لما يطلع/ينزل الكيبورد
    const active = document.activeElement;
    const activeId = active?.id || '';
    if(activeId === 'msg-input'){
      const msgs = document.getElementById('msgs');
      if(msgs) msgs.scrollTop = msgs.scrollHeight;
    } else if(activeId === 'vip-input'){
      const vipMsgs = document.getElementById('vip-msgs');
      if(vipMsgs) vipMsgs.scrollTop = vipMsgs.scrollHeight;
    }
  }
  function schedule(){ if(!raf) raf = requestAnimationFrame(update); }
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  update();
})();

function addLongPress(el, cb, delay=520){
  let timer, moved=false, startX, startY;
  el.addEventListener('touchstart', e=>{
    moved=false;
    startX=e.touches[0].clientX;
    startY=e.touches[0].clientY;
    timer=setTimeout(()=>{
      if(!moved){ if(navigator.vibrate)navigator.vibrate(40); cb(); }
    }, delay);
  },{passive:true});
  el.addEventListener('touchmove', e=>{
    const dx=Math.abs(e.touches[0].clientX-startX);
    const dy=Math.abs(e.touches[0].clientY-startY);
    if(dx>8||dy>8){moved=true;clearTimeout(timer);}
  },{passive:true});
  el.addEventListener('touchend',()=>clearTimeout(timer),{passive:true});
  el.addEventListener('contextmenu',e=>{e.preventDefault();cb();});
}

// ══════════════════════════════════════
// UTILS
// ══════════════════════════════════════
function makeAv(name, url, size){
  const s = size || 40;
  if(url) return `<img src="${url}" class="av" style="width:${s}px;height:${s}px;object-fit:cover;border-radius:50%;flex-shrink:0">`;
  return `<div class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.38)}px;">${(name||'?')[0].toUpperCase()}</div>`;
}

function escHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, dur=2200){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
document.addEventListener('selectstart', e=>{
  if(!e.target.matches('input,textarea')) e.preventDefault();
});


// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════
let notifUnread = 0;
let notifsChannel = null;

