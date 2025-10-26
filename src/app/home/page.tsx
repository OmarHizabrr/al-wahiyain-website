'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newDownloadUrl, setNewDownloadUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchDownloadUrl();
    }
  }, [user, loading, router]);

  const fetchDownloadUrl = async () => {
    try {
      const configRef = firestoreApi.getCollection('app_config');
      const docs = await firestoreApi.getDocuments(configRef, undefined, undefined, 1);
      
      if (docs.length > 0) {
        const configData = docs[0].data() as Record<string, unknown>;
        setDownloadUrl((configData.downloadUrl as string) || '');
      } else {
        setDownloadUrl('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing');
      }
    } catch (error) {
      console.error('Error fetching download URL:', error);
      setDownloadUrl('https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing');
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="منصة إختبارات الوحيين"
                width={50}
                height={50}
                className="rounded-lg"
              />
              <h1 className="mr-3 text-xl font-bold text-gray-900">
                منصة إختبارات الوحيين
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              مرحباً بك، {user.displayName}!
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              أهلاً وسهلاً بك في منصة إختبارات الوحيين
            </p>
            
            {/* User Profile Card */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName}
                    width={80}
                    height={80}
                    className="rounded-full border-4 border-white"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold mb-2">{user.displayName}</h3>
              <p className="text-blue-100 mb-1">{user.phoneNumber}</p>
              {user.email && (
                <p className="text-blue-100 mb-1">{user.email}</p>
              )}
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'admin' ? 'bg-red-500' :
                  user.role === 'teacher' ? 'bg-green-500' :
                  'bg-blue-500'
                }`}>
                  {user.role === 'admin' ? 'مدير' :
                   user.role === 'teacher' ? 'معلم' :
                   'طالب'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-white rounded-xl p-6 shadow-lg text-center hover:shadow-xl transition-shadow duration-200">
                   <div className="text-4xl mb-4">👤</div>
                   <h4 className="text-xl font-semibold text-gray-900 mb-2">إدارة الرواة</h4>
                   <p className="text-gray-600 mb-4">
                     إدارة الأسئلة والرواة في النظام
                   </p>
                   <button
                     onClick={() => router.push('/narrators')}
                     className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                   >
                     إدارة الرواة
                   </button>
                 </div>

                 <div className="bg-white rounded-xl p-6 shadow-lg text-center hover:shadow-xl transition-shadow duration-200">
                   <div className="text-4xl mb-4">📚</div>
                   <h4 className="text-xl font-semibold text-gray-900 mb-2">إدارة الكتب</h4>
                   <p className="text-gray-600 mb-4">
                     إدارة الأسئلة والكتب في النظام
                   </p>
                   <button
                     onClick={() => router.push('/books')}
                     className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                   >
                     إدارة الكتب
                   </button>
                 </div>

                                <div className="bg-white rounded-xl p-6 shadow-lg text-center hover:shadow-xl transition-shadow duration-200">
                 <div className="text-4xl mb-4">🔗</div>
                 <h4 className="text-xl font-semibold text-gray-900 mb-2">إدارة المخرجيين</h4>
                 <p className="text-gray-600 mb-4">
                   إدارة الأسئلة والمخرجيين في النظام
                 </p>
                 <button
                   onClick={() => router.push('/attributions')}
                   className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                 >
                   إدارة المخرجيين
                 </button>
               </div>
             </div>

             {/* Reference Lists Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">⚙️</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة القوائم المرجعية</h3>
                 <p className="text-purple-100 mb-6">
                   أضف، عدّل، أو احذف الرواة والكتب والمخارج
                 </p>
                 <button
                   onClick={() => router.push('/reference-lists')}
                   className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                 >
                   🛠️ إدارة القوائم المرجعية
                 </button>
               </div>
             </div>

             {/* Users Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">👥</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة المستخدمين</h3>
                 <p className="text-indigo-100 mb-6">
                   عرض جميع المستخدمين وإدارتهم
                 </p>
                 <button
                   onClick={() => router.push('/users')}
                   className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                 >
                   👥 إدارة المستخدمين
                 </button>
               </div>
             </div>

             {/* Questions Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">❓</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة الأسئلة</h3>
                 <p className="text-cyan-100 mb-6">
                   إضافة وتعديل وحذف الأسئلة
                 </p>
                 <button
                   onClick={() => router.push('/questions')}
                   className="bg-white text-cyan-600 hover:bg-cyan-50 font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                 >
                   ❓ إدارة الأسئلة
                 </button>
               </div>
             </div>

             {/* App Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">📱</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة التطبيق</h3>
                 <p className="text-green-100 mb-6">
                   رفع وتحديث رابط تحميل التطبيق
                 </p>
                 {downloadUrl && (
                   <div className="mb-4 p-4 bg-white/20 rounded-lg">
                     <p className="text-sm text-green-50 mb-2">الرابط الحالي:</p>
                     <p className="text-xs break-all">{downloadUrl}</p>
                   </div>
                 )}
                 <button
                   onClick={() => setShowUploadDialog(true)}
                   className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                 >
                   📱 رفع رابط التطبيق
                 </button>
               </div>
             </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            النشاط الأخير
          </h3>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 text-lg">
              لا يوجد نشاط حديث
            </p>
            <p className="text-gray-400 mt-2">
              ابدأ بإنشاء أو الانضمام إلى اختبار لرؤية نشاطك هنا
            </p>
          </div>
        </div>
      </main>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900"
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-200 transition-all duration-200 active:scale-95 disabled:opacity-50"
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
