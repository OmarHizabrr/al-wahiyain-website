'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { addAppConfig } from '@/lib/appConfig';
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

export default function HomePage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newDownloadUrl, setNewDownloadUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchUpdates();
    fetchDownloadUrl();
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
        setDownloadUrl('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing');
      }
    } catch (error) {
      console.error('Error fetching download URL:', error);
      // رابط افتراضي في حالة الخطأ
      setDownloadUrl('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing');
    }
  };

  const downloadApp = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else {
      // رابط احتياطي إذا لم يتم تحميل الرابط بعد
      window.open('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing', '_blank');
    }
  };

  const addAppConfigData = async () => {
    try {
      await addAppConfig();
      await fetchDownloadUrl();
      alert('تم إضافة تكوين التطبيق بنجاح!');
    } catch (error) {
      console.error('خطأ في إضافة تكوين التطبيق:', error);
      alert('حدث خطأ في إضافة تكوين التطبيق');
    }
  };

  const handleSaveDownloadUrl = async () => {
    if (!newDownloadUrl.trim()) {
      alert('يرجى إدخال رابط التحميل');
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
      alert('تم حفظ رابط التحميل بنجاح!');
    } catch (error) {
      console.error('خطأ في حفظ رابط التحميل:', error);
      alert('حدث خطأ أثناء حفظ رابط التحميل');
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