-- ════════════════════════════════════════════════════════════
-- KINONA — RLS لاحترام الحسابات الخاصة (is_private)
-- ────────────────────────────────────────────────────────────
-- المنطق: لو الحساب خاص، البوستات والمتابعين/المتابَعين تظهر فقط لـ:
--   1. صاحب الحساب نفسه
--   2. المتابعين الذين قبلهم (موجودين في جدول follows)
--
-- ⚠️ تنبيه: شغّل هذا بعد ما تتأكد إن:
--   - عمود profiles.is_private موجود (boolean default false)
--   - جدول follows فيه (follower_id, following_id) عمود uuid لكل واحد
--
-- ⚠️ هذه السياسات تستبدل posts_select_all الموجودة في rls-recommended.sql
--    لازم تحذف القديمة أولاً (DROP POLICY) قبل تنفيذ الجديدة
-- ════════════════════════════════════════════════════════════

-- ──────────────── إضافة العمود لو ما موجود ────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_private ON profiles(is_private) WHERE is_private = true;
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);

-- ──────────────── helper function ────────────────
-- ترجع true لو المستخدم الحالي مسموح له يشوف محتوى target_user
-- أسرع من تكرار EXISTS في كل policy (PostgreSQL يحفظها)
CREATE OR REPLACE FUNCTION can_view_user(target_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- أنا أشوف نفسي
    auth.uid() = target_user
    OR
    -- الحساب عام (مش خاص)
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = target_user AND is_private = true
    )
    OR
    -- أنا من المتابعين
    EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = target_user
    );
$$;

-- ──────────────── posts ────────────────
DROP POLICY IF EXISTS "posts_select_all" ON posts;

CREATE POLICY "posts_respect_privacy" ON posts FOR SELECT
  USING (can_view_user(user_id));

-- ──────────────── follows ────────────────
-- قائمة المتابعين/المتابَعين تظهر فقط لمن يقدر يشوف هذا اليوزر
-- (لازم تحذف أي policy قديمة على follows أولاً)
DROP POLICY IF EXISTS "follows_select_all" ON follows;

CREATE POLICY "follows_respect_privacy" ON follows FOR SELECT
  USING (
    -- أنا متابع أو متابَع — أشوف علاقاتي دائماً
    follower_id = auth.uid()
    OR following_id = auth.uid()
    -- أو أقدر أشوف الـ following_id (لقائمة المتابعين الخاصين به)
    OR can_view_user(following_id)
    -- أو أقدر أشوف الـ follower_id (لقائمة المتابَعين)
    OR can_view_user(follower_id)
  );

-- ──────────────── saved_posts ────────────────
-- البوستات المحفوظة تتبع نفس قاعدة البوست الأصلي
DROP POLICY IF EXISTS "saved_posts_select_own" ON saved_posts;

CREATE POLICY "saved_posts_select_own" ON saved_posts FOR SELECT
  USING (user_id = auth.uid());

-- ──────────────── comments ────────────────
-- التعليقات تظهر فقط لو يقدر يشوف صاحب البوست
DROP POLICY IF EXISTS "comments_select_all" ON comments;

CREATE POLICY "comments_respect_privacy" ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND can_view_user(p.user_id)
    )
  );

-- ════════════════════════════════════════════════════════════
-- اختبار سريع بعد التطبيق
-- ────────────────────────────────────────────────────────────
-- 1. سجل دخول بحساب A، حدد is_private = true
-- 2. سجل دخول بحساب B (مش متابع)، نفّذ:
--      SELECT * FROM posts WHERE user_id = '<A_id>';
--    → لازم ترجع 0 صفوف
-- 3. تابع B → A، أعد نفس الاستعلام → لازم ترجع البوستات
-- 4. ألغِ المتابعة → لازم ترجع 0 صفوف مرة أخرى
-- ════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- TROUBLESHOOTING
-- ────────────────────────────────────────────────────────────
-- لو الـ frontend يعرض "0 منشور" حتى لصاحب الحساب:
--   • تأكد أن auth.uid() يرجع UUID صحيح (المستخدم مسجل دخول)
--   • نفّذ: SELECT auth.uid(); داخل SQL Editor → لازم يرجع UUID
--
-- لو الـ realtime ما يشتغل للحسابات الخاصة:
--   • Supabase realtime يحترم RLS — هذا متوقع
--   • للحل: المشترك لازم يكون متابعاً أو صاحب الحساب
--
-- لو بدك تحذف الـ policies كلياً والرجوع للقديم:
--   DROP POLICY "posts_respect_privacy" ON posts;
--   DROP POLICY "follows_respect_privacy" ON follows;
--   DROP POLICY "comments_respect_privacy" ON comments;
--   DROP FUNCTION can_view_user(uuid);
--   CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);
--   CREATE POLICY "follows_select_all" ON follows FOR SELECT USING (true);
-- ════════════════════════════════════════════════════════════
