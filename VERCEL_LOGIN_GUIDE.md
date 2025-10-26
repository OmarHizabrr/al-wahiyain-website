# 🔑 دليل تسجيل الدخول إلى Vercel - طريقة سهلة

## 🎯 الطريقة الموصى بها (أسهل وأسرع)

### 1. عبر الموقع مباشرة:

1. افتح [vercel.com](https://vercel.com)
2. اضغط على "Login" أو "Sign Up"
3. سجل الدخول بـ GitHub أو Gmail
4. بعد تسجيل الدخول، اذهب إلى:
   - Settings → Tokens
   - اضغط "Create Token"
   - اختر اسم للـ Token
   - انسخ الـ Token

### 2. استخدم الـ Token في Terminal:

```bash
vercel login --token=YOUR_TOKEN_HERE
```

### 3. قم بالنشر:

```bash
vercel --prod
```

---

## 🔄 طريقة بديلة: ربط المشروع عبر GitHub

### الأسهل على الإطلاق:

1. ارفع المشروع إلى GitHub
2. افتح [vercel.com](https://vercel.com)
3. اضغط "Add New Project"
4. اختر المستودع من GitHub
5. اضغط "Import"
6. Vercel سيقوم بالنشر تلقائياً!

**هذه الطريقة لا تحتاج تسجيل دخول في Terminal!**

---

## 💡 نصيحة:

**استخدم ربط GitHub** - أسهل وأسرع ولا تحتاج لأي تسجيل دخول!
