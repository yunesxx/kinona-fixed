// ══════════════════════════════════════
// AGENT SYSTEM — نظام الوكلاء
// ══════════════════════════════════════
//
// SQL لازم تشغله في Supabase:
// -------------------------------------------------
// -- جدول الوكلاء
// CREATE TABLE IF NOT EXISTS agents (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
//   created_at timestamptz DEFAULT now()
// );
//
// -- جدول الآيتمات المفعّلة
// CREATE TABLE IF NOT EXISTS user_cosmetics (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
//   agent_id uuid REFERENCES auth.users(id),
//   type text, -- 'username_color' | 'username_gradient' | 'avatar_border' | 'badge' | 'flair'
//   value text, -- اللون أو الـ gradient أو نص الـ badge
//   xp_paid integer DEFAULT 0,
//   expires_at timestamptz,
//   created_at timestamptz DEFAULT now()
// );
// ALTER PUBLICATION supabase_realtime ADD TABLE user_cosmetics;
//
// -- كولم الوكيل في profiles
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_agent boolean DEFAULT false;
//
// -- RLS: كل مستخدم يقدر يشوف cosmetics الكل
// ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "read_cosmetics" ON user_cosmetics FOR SELECT USING (true);
// CREATE POLICY "agent_insert_cosmetics" ON user_cosmetics FOR INSERT
//   WITH CHECK (auth.uid() = agent_id);
// CREATE POLICY "agent_delete_cosmetics" ON user_cosmetics FOR DELETE
//   USING (auth.uid() = agent_id);
// ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "read_agents" ON agents FOR SELECT USING (true);
//
// -- جدول نقاط الوكلاء (يشحنها الأدمن)
// CREATE TABLE IF NOT EXISTS agent_points (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
//   points integer DEFAULT 0,
//   updated_at timestamptz DEFAULT now()
// );
// ALTER TABLE agent_points ENABLE ROW LEVEL SECURITY;
// -- الوكيل يقرأ رصيده فقط
// CREATE POLICY "agent_read_own_points" ON agent_points FOR SELECT USING (auth.uid() = agent_id);
// -- السماح للكل بالكتابة (الأدمن يشحن من الـ client)
// CREATE POLICY "admin_write_points" ON agent_points FOR INSERT WITH CHECK (true);
// CREATE POLICY "admin_update_points" ON agent_points FOR UPDATE USING (true) WITH CHECK (true);
// -------------------------------------------------
// ══ الميزات الأسطورية — القيم المقبولة في user_cosmetics.type ══
// 'cinematic_gift'     → value = hex color للتأثير        (50 نقطة)
// 'radiance_aura'      → value = hex color للهالة         (30 نقطة)
// 'royal_title'        → value = نص اللقب                 (40 نقطة)
// 'luminous_script'    → value = hex color للتوهج         (25 نقطة)
// 'signature_reaction' → value = إيموجي التفاعل الحصري    (35 نقطة)
// -------------------------------------------------

// ══ الثوابت ══
const COSMETIC_TYPES = {
  username_color:    { label: 'لون اسم المستخدم',          icon: '🎨' },
  avatar_border:     { label: 'إطار البروفايل',             icon: '🖼️' },
  badge:             { label: 'شارة خاصة (VIP, Legend...)', icon: '🏅' },
  // ══ الميزات الأسطورية الجديدة ══
  cinematic_gift:    { label: '🎬 الظهور السينمائي',        icon: '🎬' },
  radiance_aura:     { label: '✨ هالة النور',               icon: '💫' },
  royal_title:       { label: '👑 اللقب الملكي + دخول ملكي', icon: '👑' },
  luminous_script:   { label: '💡 النص المضيء',             icon: '💡' },
  signature_reaction:{ label: '💎 التفاعل الحصري',          icon: '💎' },
  bubble_style:      { label: '💬 ستايل الفقاعة',           icon: '💬' },
};
const COSMETIC_DURATION_DAYS = 30; // شهر ثابت

// ══ سعر كل آيتم بالنقاط ══
const COSMETIC_PRICES = {
  username_color:    10,
  username_gradient: 20,
  avatar_border:     15,
  badge:             25,
  flair:             10,
  // ══ أسعار الميزات الأسطورية ══
  cinematic_gift:     50,
  radiance_aura:      30,
  royal_title:        40,
  luminous_script:    25,
  signature_reaction: 35,
  bubble_style:       30,
};

// ══ Cache ══
let _agentCache = null; // true/false — هل المستخدم الحالي وكيل؟
const _cosmeticsCache = {}; // userId → cosmetics[]

// ══════════════════════════════════════
// 1. هل المستخدم الحالي وكيل؟
// ══════════════════════════════════════
async function isCurrentUserAgent() {
  if (_agentCache !== null) return _agentCache;
  if (!currentUser) return false;
  const { data, error } = await sb.from('agents').select('id').eq('user_id', currentUser.id).maybeSingle();
  if (error) console.error('[Agent] خطأ في التحقق:', error.message);
  _agentCache = !!data;
  console.log('[Agent] isAgent:', _agentCache, '| user:', currentUser.id);
  return _agentCache;
}

// ══ جلب رصيد نقاط الوكيل الحالي ══
async function getAgentPoints(agentId) {
  const { data } = await sb.from('agent_points')
    .select('points').eq('agent_id', agentId).maybeSingle();
  return data?.points || 0;
}

// ══ خصم نقاط من الوكيل ══
async function deductAgentPoints(agentId, amount) {
  const current = await getAgentPoints(agentId);
  if (current < amount) return false;
  const { error } = await sb.from('agent_points')
    .update({ points: current - amount, updated_at: new Date().toISOString() })
    .eq('agent_id', agentId);
  if (error) { console.error('[Agent] خصم نقاط فشل:', error.message); return false; }
  return true;
}
// ══════════════════════════════════════
const _cosmeticsFetchInFlight = {};
async function fetchUserCosmetics(userId) {
  if (Object.prototype.hasOwnProperty.call(_cosmeticsCache, userId)) return _cosmeticsCache[userId];
  // منع طلبات مكررة لنفس اليوزر في نفس الوقت
  if (_cosmeticsFetchInFlight[userId]) return _cosmeticsFetchInFlight[userId];
  const now = new Date().toISOString();
  _cosmeticsFetchInFlight[userId] = sb.from('user_cosmetics')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      const list = data || [];
      _cosmeticsCache[userId] = list;
      delete _cosmeticsFetchInFlight[userId];
      return list;
    });
  return _cosmeticsFetchInFlight[userId];
}

// ══ جلب أول cosmetic من نوع معين ══
async function getUserCosmetic(userId, type) {
  const list = await fetchUserCosmetics(userId);
  return list.find(c => c.type === type) || null;
}

// ══ مسح cache يوزر (بعد تطبيق آيتم) ══
function clearCosmeticsCache(userId) {
  delete _cosmeticsCache[userId];
}

// ══════════════════════════════════════
// 3. تطبيق الـ cosmetics على عناصر الـ DOM
// ══════════════════════════════════════

// اسم المستخدم — لون أو gradient
async function applyUsernameStyle(el, userId) {
  if (!el) return;
  const color    = await getUserCosmetic(userId, 'username_color');
  const gradient = await getUserCosmetic(userId, 'username_gradient');
  if (gradient && gradient.value) {
    el.style.background       = gradient.value;
    el.style.webkitBackgroundClip = 'text';
    el.style.webkitTextFillColor  = 'transparent';
    el.style.backgroundClip   = 'text';
    el.style.color            = '';
  } else if (color && color.value) {
    el.style.color            = color.value;
    el.style.background       = '';
    el.style.webkitBackgroundClip = '';
    el.style.webkitTextFillColor = '';
    el.style.backgroundClip   = '';
  } else {
    el.style.background       = '';
    el.style.webkitBackgroundClip = '';
    el.style.webkitTextFillColor = '';
    el.style.backgroundClip   = '';
  }
}

// إطار الأفاتار
async function applyAvatarBorder(el, userId) {
  if (!el) return;
  const border = await getUserCosmetic(userId, 'avatar_border');
  if (border) {
    const c = border.value;
    el.style.setProperty('box-shadow', `0 0 0 3px ${c}, 0 0 12px 5px ${c}99, 0 0 24px 10px ${c}44`, 'important');
    el.style.setProperty('border-radius', '50%', 'important');
  }
}

// badge / flair — يرجع HTML
async function getUserBadgeHtml(userId) {
  const [badge, flair] = await Promise.all([
    getUserCosmetic(userId, 'badge'),
    getUserCosmetic(userId, 'flair'),
  ]);
  let html = '';
  if (badge)  html += `<span class="cs-badge cs-badge-${badge.value.toLowerCase().replace(/\s+/g,'-')}">${badge.value}</span>`;
  if (flair)  html += `<span class="cs-flair">${flair.value}</span>`;
  return html;
}

