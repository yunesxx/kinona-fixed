// ══ Cloudinary ══
const CLD_CLOUD  = 'dzzwjhy8p';
const CLD_PRESET = 'kinona';
const CLD_BASE   = `https://api.cloudinary.com/v1_1/${CLD_CLOUD}`;

// ══════════════════════════════════════
// ضغط الصور قبل الرفع — يقلل الحجم 80-95% بدون فقد جودة ملحوظ
// صورة iPhone 4MB → ~300-500KB
// maxDim: أقصى بُعد (عرض أو طول). 1920 = جودة عالية ممتازة للموبايل والديسكتوب
// quality: 0.85 = توازن مثالي بين الجودة والحجم
// ══════════════════════════════════════
async function compressImage(file, maxDim = 1920, quality = 0.85){
  // لو مش صورة، أو GIF (بفقد الحركة)، أو SVG — رجّعها كما هي
  if(!file || !file.type) return file;
  if(!file.type.startsWith('image/')) return file;
  if(file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  // لو حجمها صغير أصلاً (<300KB) — ما في داعي للضغط
  if(file.size < 300 * 1024) return file;

  try {
    // اقرأ الصورة (بدعم HEIC من iPhone عبر createImageBitmap لو متاح)
    let bitmap;
    if(typeof createImageBitmap === 'function'){
      try { bitmap = await createImageBitmap(file); }
      catch(_){ bitmap = null; }
    }
    if(!bitmap){
      // fallback: عبر FileReader + Image
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      bitmap = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = dataUrl;
      });
    }

    const w0 = bitmap.width || bitmap.naturalWidth;
    const h0 = bitmap.height || bitmap.naturalHeight;
    const ratio = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.round(w0 * ratio);
    const h = Math.round(h0 * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    if(bitmap.close) bitmap.close();

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if(!blob) return file;
    // لو الضغط ما وفّر شي (مثلاً JPEG مضغوط أصلاً) — رجّع الأصلي
    if(blob.size >= file.size * 0.95) return file;

    // اسم نظيف بامتداد jpg
    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch(e){
    console.warn('[compressImage] failed, using original:', e?.message);
    return file;
  }
}

// ══════════════════════════════════════
// قراءة بيانات الفيديو (المدة، الأبعاد) — قبل الرفع
// ══════════════════════════════════════
async function getVideoMetadata(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    const cleanup = () => { URL.revokeObjectURL(url); v.src=''; };
    v.onloadedmetadata = () => {
      const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight, url };
      // ما نمسح الـ URL هنا — العايد رح يستعمله للـ preview
      resolve(meta);
    };
    v.onerror = () => { cleanup(); reject(new Error('failed to read video metadata')); };
    v.src = url;
  });
}

// رفع ملف لـ Cloudinary مع تتبع progress
// resourceType: 'auto' (افتراضي) | 'image' | 'video' | 'raw'
async function cldUpload(file, onProgress, resourceType) {
  // افتراضياً اكتشف من نوع الملف — الفيديوهات لازم تروح على /video/upload
  let rt = resourceType;
  if (!rt) {
    if (file && file.type && file.type.startsWith('video/')) rt = 'video';
    else rt = 'auto';
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLD_PRESET);
  fd.append('folder', 'kinona');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${CLD_BASE}/${rt}/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      let r;
      try { r = JSON.parse(xhr.responseText); } catch(_){ r = {error:{message:xhr.responseText||'invalid response'}}; }
      if (r.secure_url) { resolve(r); }
      else {
        const msg = (r.error && r.error.message) || `HTTP ${xhr.status}`;
        console.error('[cldUpload] failed:', msg, r);
        const err = new Error(msg);
        err.detail = r;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(fd);
  });
}

// صورة محسّنة — ضغط تلقائي + AVIF/WebP + دعم شاشات Retina
//   c_limit: ما يكبّر فوق الأبعاد الأصلية (وفير ع الباندويث)
//   dpr_auto: يطلب أبعاد أعلى تلقائياً على الشاشات عالية الدقة (وضوح أحسن)
//   f_auto: يختار AVIF/WebP حسب المتصفح (أصغر + أحدّ)
//   q_auto: جودة ذكية حسب المحتوى
function cldImg(url, w = 800) {
  if (!url || !url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${w},dpr_auto,f_auto,q_auto/`);
}

// فيديو محسّن — حد أقصى للعرض + codec/format تلقائي + جودة متوازنة
//   c_limit,w_1280: ما يبعت 4K كامل بدون داعي
//   q_auto:good: جودة عالية بحجم أصغر
//   vc_auto + f_auto: codec وformat حسب الجهاز (H.265/AV1 للجدد، H.264 للقدامى)
function cldVid(url) {
  if (!url || !url.includes('cloudinary')) return url;
  return url.replace('/upload/', '/upload/c_limit,w_1280,q_auto:good,vc_auto,f_auto/');
}

// ملصق (poster) للفيديو — صورة من أول إطار للمعاينة السريعة
//   so_0: ثانية رقم 0 (أول إطار)
//   يحوّل الامتداد لـ jpg
function cldVidPoster(url, w = 480) {
  if (!url || !url.includes('cloudinary')) return '';
  return url
    .replace('/video/upload/', `/video/upload/so_0,c_limit,w_${w},f_auto,q_auto/`)
    .replace(/\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i, '.jpg$2');
}

const SUPABASE_URL = "https://eoojsidkxylbbjkvsyuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb2pzaWRreHlsYmJqa3ZzeXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDksImV4cCI6MjA5MDY4MzAwOX0.P9t3L1iRC-rrxh3qj0yI0wt3n4Cc2KDSII9jzKu-kY8";
// RESEND_KEY انتقل لـ Supabase Edge Function — لا أسرار في الـ frontend
// لو احتجت ترسل إيميل: استدعِ /functions/v1/send-email (وثيقة في docs/edge-functions/send-email/)
/*
  ══ SQL لازم تشغله في Supabase → SQL Editor ══
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reaction jsonb DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;
  CREATE TABLE IF NOT EXISTS comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    username text, avatar_url text, text text,
    created_at timestamptz DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id uuid REFERENCES auth.users(id),
    blocked_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
  );
  -- لازم تفعّل Realtime على جدول messages في Supabase:
  -- Database → Replication → supabase_realtime → أضف جدول messages
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  -- لـ آخر ظهور:
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
  -- فعّل Realtime على profiles أيضاً:
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  -- display name + msg type:
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS msg_type text DEFAULT 'text';
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS seen_at timestamptz;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS os_player_id text;
  -- نظام المستويات (XP):
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
  -- جدول المحفوظات:
  CREATE TABLE IF NOT EXISTS saved_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
  );
  -- جدول الإشعارات:
  CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_username text, actor_avatar text,
    type text, -- 'like' | 'follow' | 'comment'
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    post_image text,
    body text,
    seen boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  );
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
*/
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ══════════════════════════════════════
// ONESIGNAL PUSH NOTIFICATIONS
// ══════════════════════════════════════
// OS_APP_ID و OS_API_KEY انتقلوا لـ Supabase Edge Function (send-push)
// لا توجد أسرار في الكود الأمامي

// احفظ OneSignal Player ID عند تسجيل الدخول
async function saveOSPlayerId(){
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal){
      const userId = await OneSignal.User.PushSubscription.id;
      if(userId && currentUser){
        await sb.from('profiles').update({os_player_id: userId}).eq('id', currentUser.id);
      }
    });
  } catch(e){}
}

// إرسال push notification لمستخدم معين — عبر Supabase Edge Function
// الـ OneSignal API key محفوظ كـ Supabase Secret في السيرفر فقط
async function sendOSPush(toUserId, title, message){
  if(!toUserId || toUserId === currentUser?.id) return;
  try {
    const session = await sb.auth.getSession();
    const token = session?.data?.session?.access_token;
    if(!token) return;
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to_user_id: toUserId, title, message })
    });
  } catch(e){}
}

// المتغيرات العامة معرّفة في state.js — لا تكرار هنا
const $ = id => document.getElementById(id);

// ══════════════════════════════════════
