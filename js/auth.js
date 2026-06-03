// AUTH TABS
// ══════════════════════════════════════
function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach((t,i)=>{
    t.classList.toggle('active', (i===0 && tab==='login')||(i===1 && tab==='register'));
  });
  $('panel-login').classList.toggle('active', tab==='login');
  $('panel-register').classList.toggle('active', tab==='register');
}

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════

function fakeEmail(username){ return `${username.toLowerCase()}@kinona.app`; }

function validateUsernameInput(input){
  const val = input.value;
  const hint = $('username-hint');
  if(!val){ hint.textContent=''; hint.className='auth-hint'; return; }
  const valid = /^[a-zA-Z0-9._]+$/.test(val);
  const long = val.length >= 4;
  if(!valid){
    hint.textContent = '❌ فقط أحرف إنجليزية وأرقام و . و _';
    hint.className = 'auth-hint err';
  } else if(!long){
    hint.textContent = `❌ ${val.length}/٤ — على الأقل ٤ أحرف`;
    hint.className = 'auth-hint err';
  } else {
    hint.textContent = '✓ يبدو كويس!';
    hint.className = 'auth-hint ok';
  }
}

function validateUsername(username){
  if(username.length < 4) return 'اسم المستخدم يجب أن يكون ٤ أحرف على الأقل';
  if(!/^[a-zA-Z0-9._]+$/.test(username)) return 'فقط أحرف إنجليزية وأرقام و . و _';
  return null;
}

function codeInput(el, nextId){
  el.value = el.value.replace(/[^0-9]/g,'');
  if(el.value && nextId) $(nextId).focus();
  const code = ['v1','v2','v3','v4','v5','v6'].map(id=>$(id)?.value||'').join('');
  if(code.length === 6) verifyCode();
}

// ══════════════════════════════════════
// LOGIN — يقبل اسم المستخدم أو الإيميل
// ══════════════════════════════════════
async function login(){
  const input = $('login-username').value.trim().toLowerCase();
  const pass = $('login-password').value;
  $('login-err').textContent = '';
  if(!input || !pass){ $('login-err').textContent = 'أدخل البيانات كاملة'; return; }
  showLoader('جارٍ تسجيل الدخول...');

  // حدّد إذا الإدخال إيميل أو اسم مستخدم
  const isEmail = input.includes('@');
  let realEmail = isEmail ? input : null;
  let profileEmail = null; // الإيميل المخزّن في profile (للمستخدمين القدامى)

  if(!isEmail){
    // اسم مستخدم → ابحث عن الإيميل في الـ profile
    const {data:profile} = await sb.from('profiles').select('id,email').ilike('username', input).maybeSingle();
    if(!profile){ hideLoader(); $('login-err').textContent = 'اسم المستخدم غير موجود'; return; }
    profileEmail = profile.email;
    realEmail = profile.email || fakeEmail(input);
  }

  // جرّب تسجيل الدخول
  let {error} = await sb.auth.signInWithPassword({email: realEmail, password: pass});

  // المستخدمين القدامى: الـ auth.email لسا fake@kinona.app
  // لو الإيميل الحقيقي فشل وهاد user قديم، جرّب الـ fake email
  if(error && !isEmail && profileEmail){
    const fake = fakeEmail(input);
    const retry = await sb.auth.signInWithPassword({email: fake, password: pass});
    if(!retry.error){
      // نجح بالإيميل القديم — انقل المستخدم على الإيميل الحقيقي
      error = null;
      try {
        await sb.auth.updateUser({ email: profileEmail });
        console.log('[migrate] تم نقل', fake, '→', profileEmail);
      } catch(e){ console.warn('[migrate] فشل النقل:', e); }
    } else {
      error = retry.error;
    }
  }

  hideLoader();
  if(error){
    if(error.message && /confirm/i.test(error.message)){
      $('login-err').textContent = 'تأكد من بريدك الإلكتروني وفعّل الحساب أولاً';
    } else {
      $('login-err').textContent = 'بيانات الدخول غير صحيحة';
    }
  }
}

// ══════════════════════════════════════
// REGISTER — إيميل حقيقي مباشرة، بدون verify code
// ══════════════════════════════════════
async function register(){
  const username = $('reg-username').value.trim().toLowerCase();
  const email = $('reg-email').value.trim().toLowerCase();
  const pass = $('reg-password').value;
  const pass2 = $('reg-password2').value;
  $('reg-err').textContent = '';

  const unErr = validateUsername(username);
  if(unErr){ $('reg-err').textContent = unErr; return; }
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    $('reg-err').textContent = 'أدخل بريداً إلكترونياً صحيحاً';
    return;
  }
  if(!pass){ $('reg-err').textContent = 'أدخل كلمة المرور'; return; }
  if(pass.length < 6){ $('reg-err').textContent = 'كلمة المرور قصيرة جداً'; return; }
  if(pass !== pass2){ $('reg-err').textContent = 'كلمتا المرور غير متطابقتين'; return; }

  showLoader('جارٍ التحقق...');
  const [{data:existU},{data:existE}] = await Promise.all([
    sb.from('profiles').select('id').ilike('username', username).maybeSingle(),
    sb.from('profiles').select('id').eq('email', email).maybeSingle(),
  ]);
  if(existU){ hideLoader(); $('reg-err').textContent = 'اسم المستخدم محجوز ❌'; return; }
  if(existE){ hideLoader(); $('reg-err').textContent = 'البريد الإلكتروني مستخدم بالفعل ❌'; return; }

  // إنشاء الحساب بالإيميل الحقيقي مباشرة
  const {data, error} = await sb.auth.signUp({
    email,
    password: pass,
    options: { data: { username } }
  });
  if(error){
    hideLoader();
    $('reg-err').textContent = error.message || 'فشل إنشاء الحساب';
    return;
  }

  if(data.user){
    await sb.from('profiles').upsert({id: data.user.id, username, bio:'', email});
    hideLoader();

    // إذا Supabase يطلب تأكيد إيميل، session ما يكون موجود لحد ما يضغط الرابط
    if(!data.session){
      showToast('تحقق من بريدك الإلكتروني لتفعيل الحساب 📧');
      $('login-screen').style.display = 'flex';
      switchAuthTab('login');
    } else {
      // تسجيل دخول تلقائي
      $('login-screen').style.display = 'none';
      showToast('تم إنشاء الحساب بنجاح 🎉');
      initApp(data.user);
    }
  } else {
    hideLoader();
    $('reg-err').textContent = 'فشل إنشاء الحساب';
  }
}

// ══════════════════════════════════════
// FORGOT PASSWORD — استعادة كلمة المرور
// ══════════════════════════════════════
function showForgotPassword(){
  $('login-screen').style.display = 'none';
  $('forgot-screen').style.display = 'flex';
  $('forgot-err').textContent = '';
  $('forgot-email').value = '';
  setTimeout(()=>$('forgot-email').focus(), 200);
}

function hideForgotPassword(){
  $('forgot-screen').style.display = 'none';
  $('login-screen').style.display = 'flex';
}

async function sendResetEmail(){
  const input = $('forgot-email').value.trim().toLowerCase();
  $('forgot-err').textContent = '';
  if(!input){ $('forgot-err').textContent = 'أدخل البريد الإلكتروني'; return; }

  // المستخدم ممكن يدخل username بدل email
  let email = input;
  if(!input.includes('@')){
    const {data:profile} = await sb.from('profiles').select('email').ilike('username', input).maybeSingle();
    if(!profile || !profile.email){
      $('forgot-err').textContent = 'لا يوجد بريد مرتبط بهذا الحساب';
      return;
    }
    email = profile.email;
  }

  showLoader('جارٍ الإرسال...');
  // Supabase يضيف #access_token=...&type=recovery تلقائياً للـ URL
  const redirectTo = location.origin + location.pathname;
  const {error} = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  hideLoader();
  if(error){
    $('forgot-err').textContent = error.message || 'فشل الإرسال';
    return;
  }
  showToast('📧 تم إرسال رابط الاستعادة، تحقق من بريدك');
  hideForgotPassword();
}

// ══════════════════════════════════════
// RESET PASSWORD — تعيين كلمة مرور جديدة (من رابط الإيميل)
// ══════════════════════════════════════
async function submitNewPassword(){
  const pass = $('reset-password').value;
  const pass2 = $('reset-password2').value;
  $('reset-err').textContent = '';
  if(!pass || pass.length < 6){ $('reset-err').textContent = 'كلمة المرور قصيرة جداً'; return; }
  if(pass !== pass2){ $('reset-err').textContent = 'كلمتا المرور غير متطابقتين'; return; }

  showLoader('جارٍ الحفظ...');
  const {error} = await sb.auth.updateUser({ password: pass });
  hideLoader();
  if(error){
    $('reset-err').textContent = error.message || 'فشل التحديث';
    return;
  }
  // تنظيف الـ URL
  history.replaceState(null, '', location.pathname);
  $('reset-screen').style.display = 'none';
  $('login-screen').style.display = 'flex';
  showToast('✅ تم تحديث كلمة المرور، سجّل دخولك');
  await sb.auth.signOut();
}

// ══════════════════════════════════════
// كشف رابط استعادة كلمة المرور (من Supabase)
// طريقتين: (1) فحص الـ hash، (2) listener على Supabase auth events
// ══════════════════════════════════════
let _pendingPasswordRecovery = false;

function showResetScreen(){
  const screen = $('reset-screen');
  if(!screen) return;
  // أخفِ كل الشاشات الثانية
  $('login-screen') && ($('login-screen').style.display = 'none');
  $('app-screen') && ($('app-screen').style.display = 'none');
  $('forgot-screen') && ($('forgot-screen').style.display = 'none');
  $('verify-screen') && ($('verify-screen').style.display = 'none');
  screen.style.display = 'flex';
  setTimeout(()=>$('reset-password')?.focus(), 200);
}

// طريقة 1: فحص الـ hash فوراً (URL fragment فيه access_token & type=recovery)
function _checkRecoveryHash(){
  const hash = location.hash || '';
  const search = location.search || '';
  // Supabase ممكن يرسلها كـ hash أو query string
  const inHash = /[#&]type=recovery/i.test(hash) || /access_token=.*type=recovery/i.test(hash);
  const inQuery = /[?&]type=recovery/i.test(search);
  const errorInUrl = /error=|error_description=/i.test(hash) || /error=|error_description=/i.test(search);
  if(errorInUrl){
    // ⚠️ Supabase رفض الرابط
    console.warn('[recovery] error in URL:', hash, search);
    setTimeout(() => {
      showToast('❌ رابط الاستعادة غير صالح أو منتهي الصلاحية');
    }, 500);
    return false;
  }
  if(inHash || inQuery){
    _pendingPasswordRecovery = true;
    return true;
  }
  return false;
}

// طريقة 2: listener على Supabase events — الأكثر موثوقية
// لما المستخدم يضغط رابط الاستعادة، Supabase يطلق حدث PASSWORD_RECOVERY
if(typeof sb !== 'undefined' && sb.auth && sb.auth.onAuthStateChange){
  sb.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
      console.log('[recovery] PASSWORD_RECOVERY event triggered');
      _pendingPasswordRecovery = true;
      showResetScreen();
    }
  });
}

// تشغيل الفحص الأولي
if(_checkRecoveryHash()){
  document.addEventListener('DOMContentLoaded', () => {
    // امهل ثانية للـ Supabase يطلق الـ event، ثم أظهر الشاشة
    setTimeout(() => {
      if(_pendingPasswordRecovery) showResetScreen();
    }, 100);
  });
}

// دوال قديمة محتفظ فيها كـ no-op لتجنّب الأخطاء (الـ verify-screen اتشال)
function verifyCode(){}
function backToRegister(){
  $('forgot-screen').style.display = 'none';
  $('reset-screen').style.display = 'none';
  $('login-screen').style.display = 'flex';
  switchAuthTab('register');
}
function codeInput(){}

async function logout(){
  await sb.auth.signOut();
  appInited = false;
  currentUser = null; currentProfile = null;
  $('app-screen').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('fab-post').style.display = 'none';
  closeProfile();
  // clear saved page
  sessionStorage.removeItem('kPage');
}

