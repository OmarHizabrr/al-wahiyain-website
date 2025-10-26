# دليل إعداد Firebase للمصادقة مع Google

## المشكلة الحالية

```
FirebaseError: Firebase: Error (auth/unauthorized-domain).
The current domain is not authorized for OAuth operations.
```

هذا يعني أن النطاق `al-wahiyain-website.vercel.app` غير مفعل لمصادقة Google.

## الحل

### 1. الدخول إلى Firebase Console

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر المشروع: `recordepisodes-f7722`

### 2. إضافة النطاق المسموح

1. اذهب إلى **Authentication**
2. افتح **Settings** (الإعدادات)
3. اذهب إلى **Authorized domains** (النطاقات المسموحة)
4. اضغط على **Add domain** (إضافة نطاق)
5. أدخل النطاق: `al-wahiyain-website.vercel.app`
6. احفظ التغييرات

### 3. النطاقات المطلوبة

يجب إضافة:

- `al-wahiyain-website.vercel.app` (للإنتاج)
- `localhost` (للتطوير المحلي - مفعل بالفعل)
- أي نطاقات أخرى تستخدمها (مثل Netlify، إلخ)

## ملاحظات

- بعد إضافة النطاق، قد تحتاج لإعادة تحميل الصفحة
- التغييرات تطبق فوراً بدون حاجة لإعادة النشر
- النطاقات التالية مفعلة افتراضياً:
  - `localhost`
  - نطاق Firebase الافتراضي

## التحقق من الإعدادات

1. في Firebase Console → Authentication → Settings
2. تأكد من وجود النطاق في القائمة
3. يجب أن ترى:
   ```
   ✅ localhost
   ✅ al-wahiyain-website.vercel.app
   ```

## بعد الإصلاح

بعد إضافة النطاق، جرب تحميل التطبيق مرة أخرى. يجب أن تعمل مصادقة Google بشكل صحيح.
