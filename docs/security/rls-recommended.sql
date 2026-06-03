-- ════════════════════════════════════════════════════════════
-- KINONA — RLS POLICIES المقترحة
-- شغّل هاد بعد ما تشغّل rls-audit.sql وتشوف وين النواقص
-- ⚠️ راجع كل policy قبل ما تشغّلها — مش كل التطبيق نفس المتطلبات
-- ════════════════════════════════════════════════════════════

-- ──────────────── profiles ────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- الكل يقدر يقرأ البروفايلات (عام)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- المستخدم بس يقدر يعدّل بروفايله
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- إنشاء البروفايل (لما يسجّل): id لازم يساوي auth.uid()
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ──────────────── posts ────────────────
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_all" ON posts
  FOR SELECT USING (true);

CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────── messages ────────────────
-- 🚨 هاد الأهم — رسائل خاصة!
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- فقط طرفي المحادثة يقدروا يقروا
CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);

-- المرسل بس يقدر يبعت — ومن نفسه (مش انتحال)
CREATE POLICY "messages_insert_self" ON messages
  FOR INSERT WITH CHECK (auth.uid() = from_id);

-- التحديث (مثل seen_at) من طرفي المحادثة
CREATE POLICY "messages_update_participants" ON messages
  FOR UPDATE USING (auth.uid() = from_id OR auth.uid() = to_id);

-- الحذف فقط لصاحب الرسالة
CREATE POLICY "messages_delete_sender" ON messages
  FOR DELETE USING (auth.uid() = from_id);

-- ──────────────── comments ────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_all" ON comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_self" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────── notifications ────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- المستخدم يشوف إشعاراته فقط
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ينقدر يحدّثها (seen = true)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- الإنشاء: actor (اللي عمل الفعل) يقدر يضيف للـ user_id الثاني
CREATE POLICY "notifications_insert_actor" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- ──────────────── follows ────────────────
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON follows
  FOR SELECT USING (true);

-- المتابِع بس يقدر يعمل follow من نفسه
CREATE POLICY "follows_insert_self" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_self" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ──────────────── blocks ────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- المستخدم يشوف بلوكاته بس
CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocks_insert_self" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_delete_self" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ──────────────── saved_posts ────────────────
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_select_own" ON saved_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_insert_self" ON saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_delete_self" ON saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────── user_cosmetics ────────────────
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

-- الكل يقدر يقرأ (لعرض الديكورات على البروفايلات)
CREATE POLICY "cosmetics_select_all" ON user_cosmetics
  FOR SELECT USING (true);

-- 🚨 الإنشاء/الحذف فقط من خلال backend (Service Role) أو agent — مش من frontend عادي
-- خلِّ هاي العمليات بدون policy للـ public — يعني anon لا يقدر يضيف أو يحذف

-- ──────────────── reports ────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- المستخدم يقدر يبلّغ فقط
CREATE POLICY "reports_insert_self" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- المستخدم العادي ما يقرأ تقارير ثانية — فقط service role

-- ──────────────── cinema_settings ────────────────
-- حسب التصميم: هل cinema settings عامة أم خاصة بصاحبها؟ راجع
ALTER TABLE cinema_settings ENABLE ROW LEVEL SECURITY;

-- مثلاً: الكل يقرأ، صاحب الإعداد يكتب
CREATE POLICY "cinema_select_all" ON cinema_settings
  FOR SELECT USING (true);

CREATE POLICY "cinema_insert_own" ON cinema_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cinema_update_own" ON cinema_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cinema_delete_own" ON cinema_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────── agents / agent_points ────────────────
-- 🚨 هدول حسّاسين — الـ admin بس يلعب بهم
-- لا تعمل policies للـ authenticated/anon
-- استعمل service_role من Edge Function للعمليات الإدارية
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_points ENABLE ROW LEVEL SECURITY;

-- يمكن سماح SELECT للكل إذا الـ agents معلومات عامة
CREATE POLICY "agents_select_all" ON agents
  FOR SELECT USING (true);

CREATE POLICY "agent_points_select_all" ON agent_points
  FOR SELECT USING (true);
