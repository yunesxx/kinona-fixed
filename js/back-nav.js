// ══ Admin Login Modal Logic ══
let adminLoginCallback = null;

function showAdminLoginModal(callback){
  adminLoginCallback = callback;
  const overlay = document.getElementById('admin-login-overlay');
  const card = document.getElementById('admin-login-card');
  overlay.style.display = 'flex';
  card.style.animation = 'adminModalIn .45s cubic-bezier(0.34,1.56,0.64,1) both';
  document.getElementById('admin-password-field').value = '';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      overlay.classList.add('show');
      setTimeout(()=> document.getElementById('admin-password-field').focus(), 200);
    });
  });
}

function closeAdminLogin(){
  const overlay = document.getElementById('admin-login-overlay');
  overlay.classList.remove('show');
  setTimeout(()=>{ overlay.style.display = 'none'; }, 350);
}

function submitAdminLogin(){
  const pass = document.getElementById('admin-password-field').value.trim();
  const ADMIN_PASS = 'yones1996cv';
  if(pass === ADMIN_PASS){
    closeAdminLogin();
    if(adminLoginCallback) adminLoginCallback();
  } else {
    showToast('❌ كلمة السر خاطئة');
    const card = document.getElementById('admin-login-card');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'adminShake .35s ease';
    document.getElementById('admin-password-field').value = '';
    document.getElementById('admin-password-field').focus();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-password-field')?.addEventListener('keydown', e=>{
    if(e.key === 'Enter') submitAdminLogin();
  });
});
