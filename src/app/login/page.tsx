'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { LoginCredentials } from '@/types/user';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export default function LoginPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    phoneNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();
  const { showMessage } = useMessage();
  
  // إدارة التطبيقات
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [showAppSelectionDialog, setShowAppSelectionDialog] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAppVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAppVersions = async (): Promise<AppVersion[]> => {
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
      return visibleApps;
    } catch (error) {
      console.error('خطأ في جلب التطبيقات:', error);
      return [];
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(credentials);
      // بعد تسجيل الدخول، نجلب التطبيقات
      const apps = await fetchAppVersions();
      
      // إذا كان هناك تطبيقات، نعرض نافذة اختيار التطبيق
      // وإلا نوجه للوحة التحكم
      if (apps.length > 0) {
        setShowAppSelectionDialog(true);
      } else {
        router.push('/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAppClick = async () => {
    if (!user) {
      showMessage('يرجى تسجيل الدخول أولاً', 'warning');
      return;
    }
    
    if (appVersions.length === 0) {
      showMessage('لا توجد تطبيقات متاحة للتحميل حالياً', 'info');
      return;
    }
    
    setShowAppSelectionDialog(true);
  };

  const handleAppSelect = async (selectedApp: AppVersion) => {
    setShowAppSelectionDialog(false);
    
    // الحصول على بيانات المستخدم
    const userEmail = user?.email || '';
    const userName = user?.displayName || 'زائر';
    const userPhotoURL = user?.photoURL || '';
    
    // تسجيل تحميل التطبيق في Firebase
    try {
      await recordAppDownload(userEmail, userName, userPhotoURL, selectedApp.downloadUrl);
      showMessage(`تم تسجيل التحميل بنجاح! جاري فتح رابط ${selectedApp.name}...`, 'success');
    } catch (error) {
      console.error('✗ خطأ في تسجيل تحميل التطبيق:', error);
      showMessage('حدث خطأ أثناء تسجيل التحميل', 'error');
    }

    // فتح رابط التحميل
    setTimeout(() => {
      const urlToOpen = selectedApp.downloadUrl;
      const newWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        showMessage('⚠️ تم حجب النافذة المنبثقة. يرجى السماح للنوافذ المنبثقة في متصفحك', 'warning');
        setTimeout(() => {
          window.location.href = urlToOpen;
        }, 1000);
      }
    }, 500);
  };

  const recordAppDownload = async (userEmail: string, userName: string, userPhotoURL: string, appDownloadUrl: string) => {
    try {
      const now = new Date();
      const timestamp = now.toISOString();
      const userIdentifier = user?.uid || userEmail || 'visitor';
      
      const downloadData = {
        timestamp,
        date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        userId: user?.uid || 'غير مسجل',
        userEmail: userEmail || 'غير متوفر',
        userName: userName || 'زائر',
        userPhoto: userPhotoURL || 'غير متوفر',
        isLoggedIn: !!user,
        identifier: userIdentifier,
        downloadUrl: appDownloadUrl,
        createdAt: timestamp,
      };

      // التأكد من وجود الوثيقة الرئيسية
      const userDocRef = firestoreApi.getDocument('app_downloads', userIdentifier);
      const userDoc = await firestoreApi.getData(userDocRef);
      
      if (!userDoc) {
        await firestoreApi.setData(userDocRef, {
          createdAt: timestamp,
          lastDownloadAt: timestamp,
          downloadCount: 0,
          identifier: userIdentifier,
          userId: user?.uid || 'غير مسجل',
          userEmail: userEmail || 'غير مسجل'
        });
      }

      // حفظ البيانات في Firebase
      await firestoreApi.createSubDocument(
        'app_downloads',
        userIdentifier,
        'app_downloads',
        downloadData
      );

      // تحديث عدد التحميلات
      const currentCount = (userDoc?.downloadCount as number) || 0;
      await firestoreApi.updateData(userDocRef, {
        lastDownloadAt: timestamp,
        downloadCount: currentCount + 1
      });
    } catch (error) {
      console.error('✗ حدث خطأ أثناء تسجيل تحميل التطبيق:', error);
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="منصة إختبارات الوحيين"
            width={80}
            height={80}
            className="mx-auto rounded-xl shadow-lg"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            تسجيل الدخول
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            أدخل بياناتك للوصول إلى حسابك
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={credentials.phoneNumber}
                onChange={handleInputChange}
                placeholder="مثال: 966501234567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  placeholder="أدخل كلمة المرور"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">
                      خطأ في تسجيل الدخول
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري تسجيل الدخول...
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </div>

          {/* Actions after login */}
          {user && (
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push('/home')}
                className="w-full btn-primary"
              >
                🏠 الذهاب للوحة التحكم
              </button>
              <button
                onClick={handleDownloadAppClick}
                disabled={loadingApps || appVersions.length === 0}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📱 تحميل التطبيق
              </button>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center mt-4">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
            >
              ← العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </form>
      </div>

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
    </div>
  );
}
