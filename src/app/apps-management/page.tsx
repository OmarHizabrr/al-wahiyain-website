'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { DocumentSnapshot } from 'firebase/firestore';
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

export default function AppsManagementPage() {
  const { showMessage, showConfirm } = useMessage();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [showAddAppDialog, setShowAddAppDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<AppVersion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [appForm, setAppForm] = useState({
    name: '',
    downloadUrl: '',
    version: '',
    size: '',
    description: '',
    icon: '',
    isVisible: true,
  });

  useEffect(() => {
    // انتظر حتى تكتمل حالة التحميل قبل اتخاذ قرار الحماية
    if (loading) return;
    if (!user) {
      showMessage('يرجى تسجيل الدخول للوصول إلى إدارة التطبيقات', 'warning');
      router.push('/login');
      return;
    }
    fetchAppVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchAppVersions = async () => {
    try {
      setLoadingApps(true);
      const appsRef = firestoreApi.getCollection('app_versions');
      const docs = await firestoreApi.getDocuments(appsRef);
      
      const appsData = docs
        .map((doc: DocumentSnapshot) => ({
          id: doc.id,
          ...doc.data(),
        } as AppVersion))
        .sort((a, b) => {
          const orderA = a.order || 0;
          const orderB = b.order || 0;
          if (orderA !== orderB) return orderB - orderA;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      
      setAppVersions(appsData);
    } catch (error) {
      console.error('خطأ في جلب التطبيقات:', error);
      showMessage('حدث خطأ أثناء جلب التطبيقات', 'error');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleAddApp = () => {
    setEditingApp(null);
    setAppForm({
      name: '',
      downloadUrl: '',
      version: '',
      size: '',
      description: '',
      icon: '',
      isVisible: true,
    });
    setShowAddAppDialog(true);
  };

  const handleEditApp = (app: AppVersion) => {
    setEditingApp(app);
    setAppForm({
      name: app.name || '',
      downloadUrl: app.downloadUrl || '',
      version: app.version || '',
      size: app.size || '',
      description: app.description || '',
      icon: app.icon || '',
      isVisible: app.isVisible !== false,
    });
    setShowAddAppDialog(true);
  };

  const handleSaveApp = async () => {
    if (!appForm.name.trim() || !appForm.downloadUrl.trim()) {
      showMessage('يرجى إدخال اسم التطبيق ورابط التحميل', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const timestamp = new Date().toISOString();
      const appData = {
        name: appForm.name.trim(),
        downloadUrl: appForm.downloadUrl.trim(),
        version: appForm.version.trim() || undefined,
        size: appForm.size.trim() || undefined,
        description: appForm.description.trim() || undefined,
        icon: appForm.icon.trim() || undefined,
        isVisible: appForm.isVisible,
        updatedAt: timestamp,
      };

      if (editingApp) {
        // تحديث تطبيق موجود
        const appRef = firestoreApi.getDocument('app_versions', editingApp.id);
        await firestoreApi.updateData(appRef, appData);
        showMessage('تم تحديث التطبيق بنجاح', 'success');
      } else {
        // إضافة تطبيق جديد
        const appDataWithCreatedAt = {
          ...appData,
          createdAt: timestamp,
        };
        await firestoreApi.createDocument('app_versions', appDataWithCreatedAt);
        showMessage('تم إضافة التطبيق بنجاح', 'success');
      }

      setShowAddAppDialog(false);
      setEditingApp(null);
      fetchAppVersions();
    } catch (error) {
      console.error('خطأ في حفظ التطبيق:', error);
      showMessage('حدث خطأ أثناء حفظ التطبيق', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApp = (app: AppVersion) => {
    showConfirm(
      `هل أنت متأكد من حذف "${app.name}"؟`,
      async () => {
        try {
          const appRef = firestoreApi.getDocument('app_versions', app.id);
          await firestoreApi.deleteData(appRef);
          showMessage('تم حذف التطبيق بنجاح', 'success');
          fetchAppVersions();
        } catch (error) {
          console.error('خطأ في حذف التطبيق:', error);
          showMessage('حدث خطأ أثناء حذف التطبيق', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  const handleToggleVisibility = async (app: AppVersion) => {
    try {
      const appRef = firestoreApi.getDocument('app_versions', app.id);
      await firestoreApi.updateData(appRef, {
        isVisible: !app.isVisible,
        updatedAt: new Date().toISOString(),
      });
      showMessage(
        app.isVisible ? 'تم إخفاء التطبيق' : 'تم إظهار التطبيق',
        'success'
      );
      fetchAppVersions();
    } catch (error) {
      console.error('خطأ في تحديث حالة التطبيق:', error);
      showMessage('حدث خطأ أثناء تحديث حالة التطبيق', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة التطبيقات</h1>
              <p className="text-gray-600">إضافة وتعديل وحذف وإخفاء تطبيقات التحميل</p>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              العودة
            </button>
          </div>
        </div>

        {/* Add App Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleAddApp}
            className="btn-success flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة تطبيق جديد
          </button>
        </div>

        {/* Apps List */}
        {loadingApps ? (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">جاري جلب التطبيقات...</p>
            </div>
          </div>
        ) : appVersions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="mt-4 text-gray-600 text-lg">لا توجد تطبيقات مضافة بعد</p>
              <button
                onClick={handleAddApp}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                إضافة تطبيق جديد
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {appVersions.map((app) => (
              <div
                key={app.id}
                className={`bg-white rounded-xl shadow-lg p-6 transition-all ${
                  app.isVisible ? 'border-2 border-blue-200' : 'border-2 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {app.icon ? (
                    <Image
                      src={app.icon}
                      alt={app.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-gray-300"
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{app.name}</h3>
                      {!app.isVisible && (
                        <span className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-full font-medium">
                          مخفي
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 break-all">{app.downloadUrl}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                      {app.version && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          الإصدار: {app.version}
                        </span>
                      )}
                      {app.size && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          الحجم: {app.size}
                        </span>
                      )}
                    </div>
                    {app.description && (
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg">{app.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEditApp(app)}
                      className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(app)}
                      className={`p-2.5 rounded-lg transition-colors ${
                        app.isVisible
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={app.isVisible ? 'إخفاء' : 'إظهار'}
                    >
                      {app.isVisible ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteApp(app)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* نافذة إضافة/تعديل تطبيق */}
        {showAddAppDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingApp ? 'تعديل التطبيق' : 'إضافة تطبيق جديد'}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">
                    اسم التطبيق <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={appForm.name}
                    onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                    className="input"
                    placeholder="مثال: تطبيق الوحيين"
                  />
                </div>
                <div>
                  <label className="label">
                    رابط التحميل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={appForm.downloadUrl}
                    onChange={(e) => setAppForm({ ...appForm, downloadUrl: e.target.value })}
                    className="input"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      الإصدار
                    </label>
                    <input
                      type="text"
                      value={appForm.version}
                      onChange={(e) => setAppForm({ ...appForm, version: e.target.value })}
                      className="input"
                      placeholder="مثال: 1.0.0"
                    />
                  </div>
                  <div>
                    <label className="label">
                      الحجم
                    </label>
                    <input
                      type="text"
                      value={appForm.size}
                      onChange={(e) => setAppForm({ ...appForm, size: e.target.value })}
                      className="input"
                      placeholder="مثال: 25 MB"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">
                    رابط الأيقونة (اختياري)
                  </label>
                  <input
                    type="url"
                    value={appForm.icon}
                    onChange={(e) => setAppForm({ ...appForm, icon: e.target.value })}
                    className="input"
                    placeholder="https://example.com/icon.png"
                  />
                </div>
                <div>
                  <label className="label">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    value={appForm.description}
                    onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="وصف مختصر للتطبيق..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appForm.isVisible}
                    onChange={(e) => setAppForm({ ...appForm, isVisible: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-800">
                    إظهار التطبيق في قائمة التحميل
                  </label>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddAppDialog(false);
                    setEditingApp(null);
                  }}
                  className="btn-ghost"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveApp}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'جاري الحفظ...' : editingApp ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

