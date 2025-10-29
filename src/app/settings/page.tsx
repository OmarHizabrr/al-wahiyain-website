'use client';

import { useMessage } from '@/lib/messageService';
import Image from 'next/image';
import { useState } from 'react';

interface PdfSettings {
  isHeaderVisible: boolean;
  logoBase64: string;
  rightHeader: string;
  leftHeader: string;
  footerText: string;
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
      </div>
    </div>
  );
}

