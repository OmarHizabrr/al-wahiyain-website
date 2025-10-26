@echo off
echo ================================
echo   نشر المشروع على Vercel
echo ================================
echo.

echo [1/3] تسجيل الدخول إلى Vercel...
call vercel login

echo.
echo [2/3] بناء المشروع...
call npm run build

echo.
echo [3/3] نشر المشروع على Vercel...
call vercel --prod

echo.
echo ================================
echo   تم النشر بنجاح!
echo ================================
pause
