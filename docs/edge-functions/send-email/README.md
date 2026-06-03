# send-email Edge Function

## ⚠️ مهم: مفتاح Resend السابق `re_G2TZmA6m_5y8zfgmfnNPAuHCMhCZRighQ` كان مكشوف بـ frontend

**أول خطوة قبل النشر**:
1. ادخل https://resend.com/api-keys
2. احذف المفتاح القديم
3. ولّد مفتاح جديد
4. لا تحطّه بالكود — يخزّن فقط كـ Supabase Secret

## النشر

```bash
# 1. ضيف الـ secrets
supabase secrets set RESEND_KEY=re_xxx_new_key
supabase secrets set FROM_EMAIL=noreply@yourdomain.com

# 2. انسخ الـ folder للموقع المتوقع من Supabase CLI
mkdir -p supabase/functions/send-email
cp docs/edge-functions/send-email/index.ts supabase/functions/send-email/

# 3. انشر
supabase functions deploy send-email --no-verify-jwt
```

## ميزات الأمان المدمجة

- ✅ يتحقق من تسجيل دخول المستخدم قبل الإرسال (Authorization header)
- ✅ Rate limit: 5 إيميل/ساعة لكل user
- ✅ المفتاح الحقيقي بـ env vars — مش بالكود
- ✅ CORS مضبوط

## الاستدعاء من الـ frontend

```js
async function sendEmail(to, subject, html) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('not_logged_in');
  const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ to, subject, html })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
```
