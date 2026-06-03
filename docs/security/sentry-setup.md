# Sentry Setup — خطوات سريعة (5 دقائق)

## 1. سجّل حساب
- ادخل https://sentry.io → Sign up (مجاناً)
- اختر: **JavaScript → Browser**

## 2. أنشئ مشروع
- Project name: `kinona`
- Platform: Browser JavaScript
- بيعطيك DSN يشبه: `https://abc123@o456789.ingest.sentry.io/1234567`

## 3. حطّ الـ DSN في الموقع

في [index.html](../../index.html) ضمن السكريبت اللي اسمه `SENTRY`:

```html
<script>
window.__SENTRY_DSN__ = 'https://abc123@o456789.ingest.sentry.io/1234567';
</script>
<script src="https://browser.sentry-cdn.com/..."></script>
```

أو بدّل قيمة `const DSN = ''` بـ DSN بتاعك مباشرة.

## 4. اختبار سريع

في الـ console بالموقع:

```js
Sentry.captureException(new Error('test from kinona'));
```

ادخل dashboard Sentry → لازم تشوف الخطأ ظهر.

## 5. الـ Quota المجانية
- **5,000 خطأ/شهر** — كافي لمليون مستخدم تقريباً
- **500 replay/شهر** — تسجيل فيديو DOM للجلسات اللي صار فيها خطأ
- **10,000 transaction/شهر** — لـ performance monitoring

## ميزات مفعّلة بالكود

- ✅ ربط المستخدم تلقائياً (`Sentry.setUser({id})`) — تعرف لمين الخطأ صار
- ✅ حذف الـ `Authorization` header قبل الإرسال (أمان)
- ✅ تجاهل أخطاء browser extensions
- ✅ Source maps support (لما تعمل minify)
- ✅ Performance: 10% sampling
- ✅ Session replay: 20% من الجلسات اللي فيها أخطاء فقط

## نصائح بعد الإعداد

1. **فعّل الإشعارات**: Settings → Alerts → New Alert → Critical errors → Email
2. **اربط GitHub** (إن وجد): لما يصير خطأ بيقولك أي commit ممكن سبّبه
3. **اقرأ "Issue Owners"**: حدّد مين مسؤول عن كل ملف
