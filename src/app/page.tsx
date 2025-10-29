'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { useMessage } from '@/lib/messageService';
import { signInWithPopup, signOut } from 'firebase/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Update {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'feature' | 'fix' | 'improvement';
}

interface AppVersion {
  id: string;
  name: string;
  downloadUrl: string;
  version?: string;
  size?: string;
  description?: string;
  icon?: string;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
  order?: number;
}

export default function HomePage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newDownloadUrl, setNewDownloadUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { showMessage } = useMessage();
  
  // إدارة التطبيقات
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [showAppSelectionDialog, setShowAppSelectionDialog] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    fetchUpdates();
    fetchDownloadUrl();
    fetchAppVersions();
  }, []);

  const fetchUpdates = async () => {
    try {
      const updatesRef = firestoreApi.getCollection('updates');
      const docs = await firestoreApi.getDocuments(
        updatesRef,
        undefined,
        undefined,
        5
      );
      
      // ترتيب المستندات حسب التاريخ (الأحدث أولاً)
      const sortedDocs = docs.sort((a, b) => {
        const dataA = a.data();
        const dataB = b.data();
        const dateA = dataA?.date ? new Date(dataA.date).getTime() : 0;
        const dateB = dataB?.date ? new Date(dataB.date).getTime() : 0;
        return dateB - dateA;
      });
      
      const updatesData = sortedDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Update[];
      
      setUpdates(updatesData);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadUrl = async () => {
    try {
      const configRef = firestoreApi.getCollection('app_config');
      const docs = await firestoreApi.getDocuments(configRef, undefined, undefined, 1);
      
      if (docs.length > 0) {
        const configData = docs[0].data() as Record<string, unknown>;
        setDownloadUrl((configData.downloadUrl as string) || '');
      } else {
        // رابط افتراضي إذا لم يوجد في Firebase
        setDownloadUrl('https://drive.google.com/file/d/1lv5MXhnfUEtpLVeSbCTAaUrx_-9U04Ol/view?usp=sharing');
      }
    } catch (error) {
      console.error('Error fetching download URL:', error);
      // رابط افتراضي في حالة الخطأ
      setDownloadUrl('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing');
    }
  };

  const fetchAppVersions = async () => {
    try {
      setLoadingApps(true);
      const appsRef = firestoreApi.getCollection('app_versions');
      const docs = await firestoreApi.getDocuments(appsRef);
      
      const visibleApps = docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AppVersion))
        .filter((app) => app.isVisible !== false)
        .sort((a, b) => {
          const orderA = a.order || 0;
          const orderB = b.order || 0;
          if (orderA !== orderB) return orderB - orderA;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      
      setAppVersions(visibleApps);
    } catch (error) {
      console.error('خطأ في جلب التطبيقات:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const downloadApp = async () => {
    console.log('تم النقر على زر تحميل التطبيق');
    
    // إذا لم يكن هناك تطبيقات، نستخدم النظام القديم
    if (appVersions.length === 0) {
      await downloadAppLegacy();
      return;
    }

    // إظهار نافذة اختيار التطبيق
    setShowAppSelectionDialog(true);
  };

  const downloadAppLegacy = async () => {
    let userEmail = '';
    let userName = '';
    let userPhotoURL = '';
    
    // إذا كان المستخدم غير مسجل دخول، نطلب المصادقة من Google
    if (!user) {
      try {
        console.log('🔐 جاري طلب مصادقة Google...');
        showMessage('جارٍ طلب المصادقة من Google...', 'info');
        
        const result = await signInWithPopup(auth, googleAuthProvider);
        const googleUser = result.user;
        
        console.log('✅ تمت المصادقة بنجاح:', googleUser.email);
        console.log('👤 الاسم:', googleUser.displayName);
        console.log('📷 الصورة:', googleUser.photoURL);
        
        userEmail = googleUser.email || '';
        userName = googleUser.displayName || '';
        userPhotoURL = googleUser.photoURL || '';
        
        // حفظ البريد والصورة في الكوكيز
        if (userEmail) {
          document.cookie = `user_email=${encodeURIComponent(userEmail)}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
        }
        if (userPhotoURL) {
          document.cookie = `user_photo=${encodeURIComponent(userPhotoURL)}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
        }
        
        showMessage(`مرحباً ${userName}! شكراً لتسجيلك`, 'success');
        
        // تسجيل الخروج تلقائياً بعد الحصول على البيانات
        await signOut(auth);
        console.log('🔄 تم تسجيل الخروج تلقائياً');
      } catch (error) {
        console.error('⚠️ خطأ في مصادقة Google:', error);
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : '';
        
        if (errorCode === 'auth/unauthorized-domain') {
          showMessage('⚠️ النطاق غير مسموح في Firebase. يرجى إضافة النطاق al-wahiyain-website.vercel.app في Firebase Console', 'error');
          console.error('❌ يجب إضافة النطاق إلى Firebase Console:');
          console.error('1. اذهب إلى Firebase Console');
          console.error('2. Authentication → Settings → Authorized domains');
          console.error('3. أضف: al-wahiyain-website.vercel.app');
        } else if (errorCode !== 'auth/popup-closed-by-user') {
          showMessage('تم إلغاء المصادقة. سيتم المتابعة بدون بريد إلكتروني', 'warning');
        }
      }
    }
    
    // تسجيل تحميل التطبيق في Firebase مع البيانات
    try {
      await recordAppDownload(userEmail, userName, userPhotoURL, downloadUrl);
      console.log('تم إكمال عملية التسجيل');
      showMessage('تم تسجيل التحميل بنجاح! جاري فتح رابط التحميل...', 'success');
    } catch (error) {
      console.error('✗ خطأ في تسجيل تحميل التطبيق:', error);
      showMessage('حدث خطأ أثناء تسجيل التحميل', 'error');
    }

    // فتح رابط التحميل بعد تأخير صغير للتأكد من اكتمال العملية
    setTimeout(() => {
      console.log('جاري فتح رابط التحميل...');
      const urlToOpen = downloadUrl || 'https://drive.google.com/file/d/1lv5MXhnfUEtpLVeSbCTAaUrx_-9U04Ol/view?usp=sharing';
      
      // محاولة فتح النافذة مع معالجة إذا تم الحجب
      const newWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // إذا فشل فتح النافذة بسبب الحجب، نعرض رسالة للمستخدم
        console.error('⚠️ تم حجب النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة');
        showMessage('⚠️ تم حجب النافذة المنبثقة. يرجى السماح للنوافذ المنبثقة في متصفحك', 'warning');
        
        // محاولة أخرى بديلة - نافذة منبثقة بالكامل
        setTimeout(() => {
          window.location.href = urlToOpen;
        }, 1000);
      } else {
        console.log('✅ تم فتح رابط التحميل بنجاح');
      }
    }, 500);
  };

  const handleAppSelect = async (selectedApp: AppVersion) => {
    setShowAppSelectionDialog(false);
    
    let userEmail = '';
    let userName = '';
    let userPhotoURL = '';
    
    // إذا كان المستخدم غير مسجل دخول، نطلب المصادقة من Google
    if (!user) {
      try {
        console.log('🔐 جاري طلب مصادقة Google...');
        showMessage('جارٍ طلب المصادقة من Google...', 'info');
        
        const result = await signInWithPopup(auth, googleAuthProvider);
        const googleUser = result.user;
        
        console.log('✅ تمت المصادقة بنجاح:', googleUser.email);
        console.log('👤 الاسم:', googleUser.displayName);
        console.log('📷 الصورة:', googleUser.photoURL);
        
        userEmail = googleUser.email || '';
        userName = googleUser.displayName || '';
        userPhotoURL = googleUser.photoURL || '';
        
        // حفظ البريد والصورة في الكوكيز
        if (userEmail) {
          document.cookie = `user_email=${encodeURIComponent(userEmail)}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
        }
        if (userPhotoURL) {
          document.cookie = `user_photo=${encodeURIComponent(userPhotoURL)}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
        }
        
        showMessage(`مرحباً ${userName}! شكراً لتسجيلك`, 'success');
        
        // تسجيل الخروج تلقائياً بعد الحصول على البيانات
        await signOut(auth);
        console.log('🔄 تم تسجيل الخروج تلقائياً');
      } catch (error) {
        console.error('⚠️ خطأ في مصادقة Google:', error);
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : '';
        
        if (errorCode === 'auth/unauthorized-domain') {
          showMessage('⚠️ النطاق غير مسموح في Firebase. يرجى إضافة النطاق al-wahiyain-website.vercel.app في Firebase Console', 'error');
          console.error('❌ يجب إضافة النطاق إلى Firebase Console:');
          console.error('1. اذهب إلى Firebase Console');
          console.error('2. Authentication → Settings → Authorized domains');
          console.error('3. أضف: al-wahiyain-website.vercel.app');
        } else if (errorCode !== 'auth/popup-closed-by-user') {
          showMessage('تم إلغاء المصادقة. سيتم المتابعة بدون بريد إلكتروني', 'warning');
        }
      }
    }
    
    // تسجيل تحميل التطبيق في Firebase مع البيانات
    try {
      await recordAppDownload(userEmail, userName, userPhotoURL, selectedApp.downloadUrl);
      console.log('تم إكمال عملية التسجيل');
      showMessage(`تم تسجيل التحميل بنجاح! جاري فتح رابط ${selectedApp.name}...`, 'success');
    } catch (error) {
      console.error('✗ خطأ في تسجيل تحميل التطبيق:', error);
      showMessage('حدث خطأ أثناء تسجيل التحميل', 'error');
    }

    // فتح رابط التحميل بعد تأخير صغير للتأكد من اكتمال العملية
    setTimeout(() => {
      console.log('جاري فتح رابط التحميل...');
      const urlToOpen = selectedApp.downloadUrl;
      
      // محاولة فتح النافذة مع معالجة إذا تم الحجب
      const newWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // إذا فشل فتح النافذة بسبب الحجب، نعرض رسالة للمستخدم
        console.error('⚠️ تم حجب النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة');
        showMessage('⚠️ تم حجب النافذة المنبثقة. يرجى السماح للنوافذ المنبثقة في متصفحك', 'warning');
        
        // محاولة أخرى بديلة - نافذة منبثقة بالكامل
        setTimeout(() => {
          window.location.href = urlToOpen;
        }, 1000);
      } else {
        console.log('✅ تم فتح رابط التحميل بنجاح');
      }
    }, 500);
  };

  // دالة للحصول على أو إنشاء معرف المستخدم من الكوكيز
  const getUserIdentifier = (): string => {
    // إذا كان المستخدم مسجل دخول، استخدم uid
    if (user?.uid) {
      return user.uid;
    }

    // محاولة الحصول على visitor_id من الكوكيز
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'visitor_id') {
        return value;
      }
      if (name === 'user_email' && value) {
        return value;
      }
    }

    // إنشاء معرف جديد للزائر
    const newVisitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // حفظه في الكوكيز لمدة 365 يوم
    document.cookie = `visitor_id=${newVisitorId}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
    return newVisitorId;
  };

  // دالة للحصول على الإيميل من الكوكيز إذا كان متوفراً
  const getUserEmailFromCookies = (): string => {
    if (user?.email) {
      return user.email;
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'visitor_email' && value) {
        return decodeURIComponent(value);
      }
      if (name === 'user_email' && value) {
        return decodeURIComponent(value);
      }
    }
    return '';
  };

  // محاولة جلب البريد الإلكتروني من المتصفح (Autofill data)
  const tryGetEmailFromBrowser = async (): Promise<string> => {
    try {
      // محاولة استخدام Credential Management API (يعمل فقط مع HTTPS)
      if ('credentials' in navigator && navigator.credentials) {
        try {
          const credential = await navigator.credentials.get({
            mediation: 'optional',
          });
          
          if (credential && 'id' in credential) {
            console.log('✅ تم اختيار حساب:', credential.id);
            if (credential.id.includes('@')) {
              return credential.id;
            }
          }
        } catch {
          // تجاهل الخطأ - المتصفح لا يدعم على localhost
        }
      }

      // البحث في localStorage عن بريد إلكتروني
      if (typeof Storage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key || '');
          if (value && value.includes('@') && value.includes('.')) {
            const emailMatch = value.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (emailMatch) {
              return emailMatch[0];
            }
          }
        }
        
        // البحث في sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key || '');
          if (value && value.includes('@') && value.includes('.')) {
            const emailMatch = value.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (emailMatch) {
              return emailMatch[0];
            }
          }
        }
      }
    } catch {
      // تجاهل الأخطاء
    }
    return '';
  };

  // محاولة جلب الاسم من المتصفح
  const tryGetNameFromBrowser = (): string => {
    try {
      // محاولة البحث عن اسم في البيانات المحلية
      if (typeof Storage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key || '');
          if (value && (key?.includes('name') || key?.includes('user') || key?.includes('display'))) {
            console.log('تم العثور على اسم من localStorage:', value);
            return value;
          }
        }
      }
    } catch {
      console.log('لا يمكن الوصول إلى البيانات المحلية');
    }
    return '';
  };

  // محاولة جلب رقم الهاتف من المتصفح
  const tryGetPhoneFromBrowser = (): string => {
    try {
      if (typeof Storage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key || '');
          if (value && (key?.includes('phone') || key?.includes('mobile') || key?.includes('tel'))) {
            // التحقق من أن القيمة تبدو كرقم هاتف
            if (/^[\d\s\+\-\(\)]+$/.test(value)) {
              console.log('تم العثور على رقم هاتف من localStorage:', value);
              return value;
            }
          }
        }
      }
    } catch {
      console.log('لا يمكن الوصول إلى البيانات المحلية');
    }
    return '';
  };

  // دوال لجلب معلومات المتصفح
  const getBrowserName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  };

  const getBrowserVersion = (): string => {
    const match = navigator.userAgent.match(/(?:chrome|firefox|safari|edge|opera)[\s\/](\d+(\.\d+)?)/i);
    return match ? match[1] : 'Unknown';
  };

  const getOSName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Windows NT')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  const getOSVersion = (): string => {
    const ua = navigator.userAgent;
    const match = ua.match(/(?:Windows|Android|iOS|macOS)[\s\/]?(\d+(?:\.\d+)?)/);
    return match ? match[1] : 'Unknown';
  };

  const detectDeviceType = (): string => {
    const width = window.screen.width;
    if (width <= 768) return 'Mobile';
    if (width <= 1024) return 'Tablet';
    return 'Desktop';
  };

  const recordAppDownload = async (credentialEmail: string = '', credentialName: string = '', credentialPhoto: string = '', appDownloadUrl: string = '') => {
    try {
      console.log('بدء تسجيل تحميل التطبيق...');
      
      const now = new Date();
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const language = navigator.language;
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const timestamp = now.toISOString();
      const date = now.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const time = now.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

      // الحصول على معرف المستخدم (uid أو visitor_id أو email)
      const userIdentifier = getUserIdentifier();
      const userEmailFromCookies = getUserEmailFromCookies();
      
      console.log('معرف المستخدم:', userIdentifier);
      console.log('إيميل المستخدم من الكوكيز:', userEmailFromCookies);

      // الحصول على بيانات الزائر من المتصفح
      const browserEmail = await tryGetEmailFromBrowser();
      const emailFromCookies = getUserEmailFromCookies();
      
      // استخدام البيانات من Credential Manager إذا كانت متاحة
      const userEmailValue = user?.email || credentialEmail || emailFromCookies || browserEmail || 'غير متوفر';
      const userName = user?.displayName || credentialName || tryGetNameFromBrowser() || 'زائر';
      const userPhone = user?.phoneNumber || tryGetPhoneFromBrowser() || '';
      
      // الحصول على الصورة من الكوكيز
      const cookies = document.cookie.split(';');
      let userPhotoFromCookies = '';
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'user_photo' && value) {
          userPhotoFromCookies = decodeURIComponent(value);
          break;
        }
      }
      const userPhotoValue = user?.photoURL || credentialPhoto || userPhotoFromCookies || '';
      
      // محاولة الحصول على معلومات إضافية من المتصفح
      const browserInfo = {
        browserName: getBrowserName(),
        browserVersion: getBrowserVersion(),
        osName: getOSName(),
        osVersion: getOSVersion(),
        deviceType: detectDeviceType(),
        referrer: document.referrer || 'direct',
        pageUrl: window.location.href,
      };
      
      // الحصول على معلومات إضافية إذا كانت متاحة
      const downloadData = {
        timestamp,
        date,
        time,
        userAgent,
        platform,
        language,
        screenWidth,
        screenHeight,
        // معلومات المستخدم
        userId: user?.uid || 'غير مسجل',
        userEmail: userEmailValue || 'غير متوفر',
        userName: userName || 'زائر',
        userPhone: userPhone || 'غير متوفر',
        userPhoto: userPhotoValue || 'غير متوفر',
        isLoggedIn: !!user,
        identifier: userIdentifier,
        downloadUrl: appDownloadUrl || downloadUrl || 'https://drive.google.com/file/d/1lv5MXhnfUEtpLVeSbCTAaUrx_-9U04Ol/view?usp=sharing',
        createdAt: timestamp,
        // معلومات المتصفح الإضافية
        browserName: browserInfo.browserName,
        browserVersion: browserInfo.browserVersion,
        osName: browserInfo.osName,
        osVersion: browserInfo.osVersion,
        deviceType: browserInfo.deviceType,
        referrer: browserInfo.referrer,
        pageUrl: browserInfo.pageUrl,
        // معلومات عن المتصفح
        isOnline: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
        // معلومات عن التاريخ
        dayOfWeek: now.toLocaleDateString('ar-SA', { weekday: 'long' }),
        hour: now.getHours(),
        minute: now.getMinutes(),
      };

      console.log('بيانات التحميل:', downloadData);

      // التأكد من وجود الوثيقة الرئيسية في app_downloads
      console.log('التحقق من وجود الوثيقة الرئيسية للمستخدم...');
      const userDocRef = firestoreApi.getDocument('app_downloads', userIdentifier);
      const userDoc = await firestoreApi.getData(userDocRef);
      console.log('نتيجة الوثيقة الرئيسية:', userDoc);
      
      if (!userDoc) {
        console.log('إنشاء وثيقة رئيسية جديدة للمستخدم...');
        await firestoreApi.setData(userDocRef, {
          createdAt: timestamp,
          lastDownloadAt: timestamp,
          downloadCount: 0,
          identifier: userIdentifier,
          userId: user?.uid || 'غير مسجل',
          userEmail: user?.email || userEmailFromCookies || 'غير مسجل'
        });
        console.log('✓ تم إنشاء الوثيقة الرئيسية بنجاح');
      } else {
        console.log('الوثيقة الرئيسية موجودة بالفعل');
      }

      // حفظ البيانات في Firebase باستخدام المسار المتداخل
      // المسار: app_downloads/{userIdentifier}/app_downloads/{downloadId}
      console.log('محاولة حفظ البيانات في Firebase...');
      const docId = await firestoreApi.createSubDocument(
        'app_downloads',
        userIdentifier,
        'app_downloads',
        downloadData
      );

      // تحديث عدد التحميلات في الوثيقة الرئيسية
      const currentCount = (userDoc?.downloadCount as number) || 0;
      await firestoreApi.updateData(userDocRef, {
        lastDownloadAt: timestamp,
        downloadCount: currentCount + 1
      });

      console.log('✓ تم تسجيل تحميل التطبيق بنجاح:', docId);
      console.log('المسار:', `app_downloads/${userIdentifier}/app_downloads/${docId}`);
      
      // حفظ الإيميل في الكوكيز للزوار غير المسجلين
      if (!user && userEmailFromCookies) {
        document.cookie = `user_email=${encodeURIComponent(userEmailFromCookies)}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
      }
    } catch (error) {
      console.error('✗ حدث خطأ أثناء تسجيل تحميل التطبيق:', error);
      showMessage('حدث خطأ أثناء تسجيل التحميل', 'error');
    }
  };

 

  const handleSaveDownloadUrl = async () => {
    if (!newDownloadUrl.trim()) {
      showMessage('يرجى إدخال رابط التحميل', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      
      // البحث عن مستند التكوين الحالي
      const configRef = firestoreApi.getCollection('app_config');
      const docs = await firestoreApi.getDocuments(configRef, undefined, undefined, 1);
      
      let docRef;
      if (docs.length > 0) {
        // تحديث المستند الموجود
        docRef = docs[0].ref;
        await firestoreApi.updateData(docRef, {
          downloadUrl: newDownloadUrl,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // إنشاء مستند جديد
        const newDocId = await firestoreApi.createDocument('app_config', {
          downloadUrl: newDownloadUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        docRef = firestoreApi.getDocument('app_config', newDocId);
      }

      // تحديث رابط التحميل
      setDownloadUrl(newDownloadUrl);
      setShowUploadDialog(false);
      setNewDownloadUrl('');
      showMessage('تم حفظ رابط التحميل بنجاح!', 'success');
    } catch (error) {
      console.error('خطأ في حفظ رابط التحميل:', error);
      showMessage('حدث خطأ أثناء حفظ رابط التحميل', 'error');
    } finally {
      setIsSaving(false);
    }
  };





  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-green-100 text-green-800';
      case 'fix': return 'bg-red-100 text-red-800';
      case 'improvement': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUpdateTypeText = (type: string) => {
    switch (type) {
      case 'feature': return 'ميزة جديدة';
      case 'fix': return 'إصلاح';
      case 'improvement': return 'تحسين';
      default: return 'تحديث';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
        <Image
              src="/logo.png"
              alt="منصة إختبارات الوحيين"
              width={60}
              height={60}
              className="rounded-lg"
            />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">
              منصة إختبارات الوحيين
          </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="منصة إختبارات الوحيين"
              width={120}
              height={120}
              className="mx-auto rounded-2xl shadow-lg"
            />
          </div>
          
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            مرحباً بك في منصة إختبارات الوحيين
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            منصة شاملة لإدارة المجموعات والاختبارات مع نظام إشعارات متقدم، 
            مصممة لتوفير تجربة تعليمية تفاعلية ومتطورة
          </p>

                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <button
                     onClick={downloadApp}
                     className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                   >
                     📱 تحميل التطبيق
                   </button>
                   {user ? (
                     <>
                       <button
                         onClick={() => router.push('/home')}
                         className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                       >
                         🏠 الذهاب للوحة التحكم
                       </button>
                       <button
                         onClick={() => router.push('/dashboard')}
                         className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                       >
                         📊 عرض الإحصائيات
                       </button>
                     </>
                   ) : (
                     <button
                       onClick={() => router.push('/login')}
                       className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                     >
                       🔐 تسجيل الدخول
                     </button>
                   )}
                   {user && (
                     <button
                       onClick={() => setShowUploadDialog(true)}
                       className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                     >
                       🔗 إدارة التطبيق
                     </button>
                   )}
                 </div>
        </div>

        {/* Updates Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              التحديثات الجديدة
            </h3>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">محدث الآن</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : updates.length > 0 ? (
            <div className="space-y-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUpdateTypeColor(update.type)}`}>
                          {getUpdateTypeText(update.type)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(update.date).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {update.title}
                      </h4>
                      <p className="text-gray-600">
                        {update.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد تحديثات متاحة حالياً</p>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-all duration-200 transform hover:scale-105">
            <div className="text-6xl mb-6">📚</div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">إدارة الاختبارات</h4>
            <p className="text-gray-700 leading-relaxed">
              أنواع متعددة من الأسئلة مع تصحيح تلقائي ويدوي شامل
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-all duration-200 transform hover:scale-105">
            <div className="text-6xl mb-6">👥</div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">نظام المجموعات</h4>
            <p className="text-gray-700 leading-relaxed">
              إنشاء وإدارة المجموعات التعليمية مع دعوة الأعضاء
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-all duration-200 transform hover:scale-105">
            <div className="text-6xl mb-6">🔔</div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">الإشعارات المتقدمة</h4>
            <p className="text-gray-700 leading-relaxed">
              نظام إشعارات محلي وسحابي للأحداث المهمة
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">
            تم تطوير هذا المشروع من قبل مؤسسة الوحيين الخيرية
          </p>
        </div>
      </footer>

      {/* نافذة اختيار التطبيق */}
      {showAppSelectionDialog && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">اختر تطبيق للتحميل</h3>
              <button
                onClick={() => setShowAppSelectionDialog(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {loadingApps ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">جاري جلب التطبيقات...</p>
                </div>
              ) : appVersions.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-gray-600">لا توجد تطبيقات متاحة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appVersions.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleAppSelect(app)}
                      className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        {app.icon ? (
                          <Image
                            src={app.icon}
                            alt={app.name}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-md"
                            unoptimized
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1">{app.name}</h4>
                          {app.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{app.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {app.version && (
                              <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {app.version}
                              </span>
                            )}
                            {app.size && (
                              <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                {app.size}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-blue-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">رفع رابط التطبيق</h2>
                    <p className="text-sm text-white/80">أدخل رابط تحميل التطبيق</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadDialog(false);
                    setNewDownloadUrl('');
                  }}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Current Download URL */}
              {downloadUrl && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm font-semibold text-blue-600">الرابط الحالي:</span>
                  </div>
                  <p className="text-sm text-blue-700 break-all">{downloadUrl}</p>
                </div>
              )}

              {/* Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  رابط التحميل الجديد
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newDownloadUrl}
                    onChange={(e) => setNewDownloadUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveDownloadUrl();
                      }
                    }}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900"
                    autoFocus
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-2">أدخل رابط التحميل من Google Drive أو أي مصدر آخر</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadDialog(false);
                    setNewDownloadUrl('');
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveDownloadUrl}
                  disabled={isSaving || !newDownloadUrl.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </span>
                  ) : (
                    'حفظ'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}