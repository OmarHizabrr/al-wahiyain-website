'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showMessage, showConfirm } = useMessage();
  const [appDownloads, setAppDownloads] = useState<Record<string, string | number | boolean>[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [totalDownloads, setTotalDownloads] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchAppDownloads();
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const fetchAppDownloads = async () => {
    try {
      setLoadingDownloads(true);
      console.log('بدء جلب تحميلات التطبيق...');
      
      // جلب جميع الوثائق من collection الرئيسية app_downloads
      const appDownloadsRef = firestoreApi.getCollection('app_downloads');
      const users = await firestoreApi.getAllDocuments(appDownloadsRef);
      
      console.log('عدد المستخدمين الذين حملوا التطبيق:', users.length);
      
      const allDownloads: Record<string, string | number | boolean>[] = [];
      let totalCount = 0;

      // جلب تحميلات كل مستخدم
      for (const userDoc of users) {
        const userId = userDoc.id;
        console.log('جاري جلب تحميلات المستخدم:', userId);
        
        try {
          const downloadsRef = firestoreApi.getSubCollection('app_downloads', userId, 'app_downloads');
          const downloads = await firestoreApi.getAllDocuments(downloadsRef);
          
          console.log(`تم جلب ${downloads.length} تحميل للمستخدم ${userId}`);
          
          // إضافة معلومات المستخدم لكل تحميل
          const userDownloads = downloads.map(doc => ({
            id: doc.id,
            userId: userId,
            ...doc.data()
          }));
          
          allDownloads.push(...userDownloads);
          totalCount += downloads.length;
        } catch (error) {
          console.error(`خطأ في جلب تحميلات المستخدم ${userId}:`, error);
        }
      }

      console.log('إجمالي التحميلات:', totalCount);
      console.log('جميع التحميلات:', allDownloads);

      // ترتيب حسب التاريخ (الأحدث أولاً)
      allDownloads.sort((a, b) => {
        const dateA = String(a.createdAt || a.timestamp || '');
        const dateB = String(b.createdAt || b.timestamp || '');
        return dateB.localeCompare(dateA);
      });

      setAppDownloads(allDownloads);
      setTotalDownloads(totalCount);
      
      console.log('✓ تم جلب التحميلات بنجاح');
    } catch (error) {
      console.error('خطأ في جلب تحميلات التطبيق:', error);
    } finally {
      setLoadingDownloads(false);
    }
  };

  // دالة لحذف تحميل معين
  const handleDeleteDownload = async (downloadId: string, identifier: string) => {
    showConfirm(
      'هل تريد حذف هذا التحميل؟',
      async () => {
        try {
          console.log('حذف التحميل:', downloadId);
          console.log('معرف المستخدم:', identifier);
          const docRef = firestoreApi.getSubDocument('app_downloads', identifier, 'app_downloads', downloadId);
          await firestoreApi.deleteData(docRef);
          console.log('✓ تم حذف التحميل بنجاح');
          showMessage('تم حذف التحميل بنجاح', 'success');
          // إعادة تحميل القائمة
          fetchAppDownloads();
        } catch (error) {
          console.error('خطأ في حذف التحميل:', error);
          showMessage('حدث خطأ أثناء حذف التحميل', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  // دالة لحذف جميع التحميلات
  const handleDeleteAll = async () => {
    showConfirm(
      'هل أنت متأكد من حذف جميع التحميلات؟ هذا الإجراء لا يمكن التراجع عنه!',
      async () => {
        try {
          console.log('حذف جميع التحميلات...');
          setLoadingDownloads(true);
          
          // جلب جميع المستخدمين
          const appDownloadsRef = firestoreApi.getCollection('app_downloads');
          const users = await firestoreApi.getAllDocuments(appDownloadsRef);
          
          // حذف كل تحميل لكل مستخدم
          for (const userDoc of users) {
            const userId = userDoc.id;
            try {
              const downloadsRef = firestoreApi.getSubCollection('app_downloads', userId, 'app_downloads');
              const downloads = await firestoreApi.getAllDocuments(downloadsRef);
              
              for (const download of downloads) {
                const docRef = download.ref;
                await firestoreApi.deleteData(docRef);
              }
            } catch (error) {
              console.error(`خطأ في حذف تحميلات المستخدم ${userId}:`, error);
            }
          }

          showMessage('تم حذف جميع التحميلات بنجاح', 'success');
          
          // إعادة تحميل القائمة
          fetchAppDownloads();
        } catch (error) {
          console.error('خطأ في حذف جميع التحميلات:', error);
          showMessage('حدث خطأ أثناء حذف التحميلات', 'error');
          setLoadingDownloads(false);
        }
      },
      undefined,
      'حذف الكل',
      'إلغاء',
      'danger'
    );
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
              className="btn-danger"
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
                     className="btn-secondary"
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
                     className="btn-secondary"
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
                   className="btn-secondary"
                 >
                   إدارة المخرجيين
                 </button>
               </div>
             </div>

             {/* Reference Lists Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">⚙️</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة القوائم المرجعية</h3>
                 <p className="text-purple-100 mb-6">
                   أضف، عدّل، أو احذف الرواة والكتب والمخارج
                 </p>
                 <button
                   onClick={() => router.push('/reference-lists')}
                   className="btn-secondary"
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
                   className="btn-secondary"
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
                   className="btn-secondary"
                 >
                   ❓ إدارة الأسئلة
                 </button>
               </div>
             </div>

             {/* Dashboard */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-indigo-500 via-blue-600 to-slate-700 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">📊</div>
                 <h3 className="text-2xl font-bold mb-2">لوحة التحكم</h3>
                 <p className="text-blue-100 mb-6">
                   عرض إحصائيات النظام والبيانات الشاملة
                 </p>
                 <button
                   onClick={() => router.push('/dashboard')}
                   className="btn-secondary"
                 >
                   📊 عرض لوحة التحكم
                 </button>
               </div>
             </div>

             {/* App Management */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">📱</div>
                 <h3 className="text-2xl font-bold mb-2">إدارة التطبيقات</h3>
                 <p className="text-green-100 mb-6">
                   إضافة وتعديل تطبيقات التحميل المتعددة
                 </p>
                <button
                  onClick={() => router.push('/apps-management')}
                  className="btn-secondary"
                >
                  📱 إدارة التطبيقات
                </button>
               </div>
             </div>

             {/* Settings */}
             <div className="mt-8">
               <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-8 shadow-lg text-center text-white">
                 <div className="text-5xl mb-4">⚙️</div>
                 <h3 className="text-2xl font-bold mb-2">إعدادات PDF</h3>
                 <p className="text-violet-100 mb-6">
                   تعديل إعدادات الطباعة والتقارير
                 </p>
                 <button
                   onClick={() => router.push('/settings')}
                   className="btn-secondary"
                 >
                   ⚙️ فتح الإعدادات
                 </button>
               </div>
             </div>

        {/* App Downloads Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                محملي التطبيق
              </h3>
              <p className="text-gray-600">
                إجمالي التحميلات: <span className="font-bold text-blue-600">{totalDownloads}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAppDownloads}
                disabled={loadingDownloads}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className={`w-5 h-5 ${loadingDownloads ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                تحديث
              </button>
              {appDownloads.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={loadingDownloads}
                  className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  حذف الكل
                </button>
              )}
            </div>
          </div>

          {loadingDownloads ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : appDownloads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ والوقت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الجهاز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appDownloads.slice(0, 50).map((download) => (
                    <tr key={String(download.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{download.date}</div>
                        <div className="text-xs text-gray-500">{download.time}</div>
                        <div className="text-xs text-gray-400">{download.dayOfWeek}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {download.userPhoto && download.userPhoto !== 'غير متوفر' && (
                            <div className="relative w-10 h-10">
                              <Image 
                                src={String(download.userPhoto)} 
                                alt={String(download.userName) || 'User'} 
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-100"
                                unoptimized
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {download.userName || 'غير مسجل'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {download.isLoggedIn ? (
                                <span className="text-green-600 font-medium">✅ مسجل دخول</span>
                              ) : (
                                <span className="text-orange-600 font-medium">👤 زائر</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {download.userEmail || 'غير متوفر'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {download.userPhone || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{download.platform}</div>
                        <div className="text-xs text-gray-500">{download.language}</div>
                        <div className="text-xs text-gray-400">{download.screenWidth} × {download.screenHeight}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className={`px-2 py-1 rounded-full ${download.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {download.isOnline ? 'متصل' : 'غير متصل'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteDownload(String(download.id), String(download.identifier))}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200 p-2 hover:bg-red-50 rounded-lg"
                          title="حذف هذا التحميل"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-gray-500 text-lg">
                لا توجد تحميلات حتى الآن
              </p>
              <p className="text-gray-400 mt-2">
                سيتم عرض التحميلات هنا عند تحميل المستخدمين للتطبيق
              </p>
            </div>
          )}
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

    </div>
  );
}
