-- ════════════════════════════════════════════════════════════
-- KINONA — RLS AUDIT SCRIPT
-- شغّله في Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════

-- 1️⃣ شو الجداول اللي عليها RLS مش مفعّل أصلاً؟ (خطر شديد)
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ مفعّل' ELSE '🚨 غير مفعّل — أي حدا يقدر يقرأ/يكتب' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles','posts','follows','saved_posts','blocks',
    'agents','agent_points','user_cosmetics',
    'notifications','messages','comments','reports','cinema_settings'
  )
ORDER BY rowsecurity, tablename;

-- 2️⃣ شو الـ policies المعرّفة على كل جدول؟
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual AS using_check,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3️⃣ جداول عندها RLS بس بدون أي policy (= كأنها مغلقة كلياً للجميع)
SELECT
  t.tablename AS "جدول مفعّل بدون policies",
  '⚠️ كل العمليات مرفوضة — تأكد إنك ما محتاج تقرأها' AS warning
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL;

-- 4️⃣ شيك على الجداول المهمة — هل في policies جاهزة لكل عملية؟
WITH expected AS (
  SELECT unnest(ARRAY['profiles','posts','messages','comments','notifications',
                      'follows','blocks','saved_posts','user_cosmetics','reports','cinema_settings']) AS tbl,
         unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS op
),
combos AS (
  SELECT tbl, op FROM expected, (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) AS o(op)
)
SELECT DISTINCT
  c.tbl,
  c.op,
  CASE WHEN p.policyname IS NULL THEN '❌ مفقود' ELSE '✅ موجود' END AS status
FROM combos c
LEFT JOIN pg_policies p
  ON p.tablename = c.tbl
  AND (p.cmd = c.op OR p.cmd = 'ALL')
ORDER BY c.tbl, c.op;
