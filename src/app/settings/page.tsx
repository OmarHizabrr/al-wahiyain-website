'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { DocumentSnapshot } from 'firebase/firestore';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface PdfSettings {
  isHeaderVisible: boolean;
  logoBase64: string;
  rightHeader: string;
  leftHeader: string;
  footerText: string;
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

const defaultSettings: PdfSettings = {
  isHeaderVisible: true,
  logoBase64: '',
  rightHeader: 'مؤسسة الوحيين الخيرية\nلجنة الإختبارات والتقييم',
  leftHeader: 'Al-Wahiyain Charitable Foundation\nExamination and Assessment Committee',
  footerText: 'اسم الطالب\nالحلقة\nمكان الحلقة\nالمدرس',
};

export default function SettingsPage() {
  const { showMessage, showConfirm } = useMessage();
  const [settings, setSettings] = useState<PdfSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdf_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  // إدارة التطبيقات
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [showAddAppDialog, setShowAddAppDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<AppVersion | null>(null);
  const [appForm, setAppForm] = useState({
    name: '',
    downloadUrl: '',
    version: '',
    size: '',
    description: '',
    icon: '',
    isVisible: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdf_settings', JSON.stringify(settings));
      setTimeout(() => {
        setIsSaving(false);
        showMessage('تم حفظ الإعدادات بنجاح', 'success');
      }, 500);
    }
  };

  const handleReset = () => {
    showConfirm(
      'هل تريد استعادة جميع الإعدادات إلى القيم الافتراضية؟',
      () => {
        setSettings(defaultSettings);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pdf_settings', JSON.stringify(defaultSettings));
        }
        showMessage('تم استعادة الإعدادات بنجاح', 'success');
      },
      undefined,
      'استعادة',
      'إلغاء',
      'warning'
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSettings({ ...settings, logoBase64: base64 });
        setLogoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const showEditDialog = (
    title: string,
    value: string,
    onSave: (newValue: string) => void
  ) => {
    const newValue = prompt(title, value);
    if (newValue !== null) {
      onSave(newValue);
    }
  };

  // جلب التطبيقات من Firebase
  useEffect(() => {
    fetchAppVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إعدادات PDF</h1>
          <p className="text-gray-600">قم بتعديل إعدادات الطباعة والتقارير</p>
        </div>

        {/* إظهار/إخفاء الرأس */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                إظهار الرأس والتذييل في التقارير
              </h2>
              <p className="text-sm text-gray-600">تفعيل لإظهار الشعار والمعلومات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.isHeaderVisible}
                onChange={(e) => setSettings({ ...settings, isHeaderVisible: e.target.checked })}
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* صورة الشعار */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">صورة الشعار</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoPreview || settings.logoBase64 ? (
                <Image
                  src={logoPreview || settings.logoBase64}
                  alt="الشعار"
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-lg object-cover border-4 border-blue-500"
                  unoptimized
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-400">
                  <span className="text-gray-500">لا توجد صورة</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                اختر صورة الشعار
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* الرأس الأيمن */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">الرأس الأيمن (العربي)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{settings.rightHeader}</p>
            </div>
            <button
              onClick={() => showEditDialog('تحرير الرأس الأيمن', settings.rightHeader, (v) => 
                setSettings({ ...settings, rightHeader: v })
              )}
              className="ml-4 p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>

        {/* الرأس الأيسر */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">الرأس الأيسر (English)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{settings.leftHeader}</p>
            </div>
            <button
              onClick={() => showEditDialog('تحرير الرأس الأيسر', settings.leftHeader, (v) => 
                setSettings({ ...settings, leftHeader: v })
              )}
              className="ml-4 p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>

        {/* التذييل */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">التذييل (التوقيعات)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{settings.footerText}</p>
            </div>
            <button
              onClick={() => showEditDialog('تحرير التذييل', settings.footerText, (v) => 
                setSettings({ ...settings, footerText: v })
              )}
              className="ml-4 p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>

        {/* أزرار الحفظ */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSaving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              🔄 استعادة الإعدادات الافتراضية
            </button>
          </div>
        </div>

        {/* إدارة التطبيقات */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">إدارة التطبيقات</h2>
              <p className="text-sm text-gray-600">إضافة وتعديل وحذف روابط تحميل التطبيقات</p>
            </div>
            <button
              onClick={handleAddApp}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة تطبيق
            </button>
          </div>

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
              <p className="mt-4 text-gray-600">لا توجد تطبيقات مضافة بعد</p>
              <button
                onClick={handleAddApp}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                إضافة تطبيق جديد
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appVersions.map((app) => (
                <div
                  key={app.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    app.isVisible ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {app.icon ? (
                      <Image
                        src={app.icon}
                        alt={app.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover border-2 border-gray-300"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                        {!app.isVisible && (
                          <span className="px-2 py-0.5 bg-gray-300 text-gray-700 text-xs rounded-full font-medium">
                            مخفي
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{app.downloadUrl}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
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
                        <p className="text-sm text-gray-600 mt-2">{app.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEditApp(app)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(app)}
                        className={`p-2 rounded-lg transition-colors ${
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
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>

        {/* نافذة إضافة/تعديل تطبيق */}
        {showAddAppDialog && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingApp ? 'تعديل التطبيق' : 'إضافة تطبيق جديد'}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم التطبيق <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={appForm.name}
                    onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: تطبيق الوحيين"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط التحميل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={appForm.downloadUrl}
                    onChange={(e) => setAppForm({ ...appForm, downloadUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الإصدار
                    </label>
                    <input
                      type="text"
                      value={appForm.version}
                      onChange={(e) => setAppForm({ ...appForm, version: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: 1.0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحجم
                    </label>
                    <input
                      type="text"
                      value={appForm.size}
                      onChange={(e) => setAppForm({ ...appForm, size: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: 25 MB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط الأيقونة (اختياري)
                  </label>
                  <input
                    type="url"
                    value={appForm.icon}
                    onChange={(e) => setAppForm({ ...appForm, icon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/icon.png"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    value={appForm.description}
                    onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="text-sm font-medium text-gray-700">
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
                  className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveApp}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

