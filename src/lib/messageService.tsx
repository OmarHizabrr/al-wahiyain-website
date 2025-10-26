'use client';

import { createContext, ReactNode, useContext, useState } from 'react';

// أنواع الرسائل
export type MessageType = 'success' | 'error' | 'warning' | 'info';
export type ConfirmType = 'danger' | 'warning' | 'info';

interface MessageContextType {
  showMessage: (message: string, type: MessageType) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
    type?: ConfirmType
  ) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function useMessage() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return context;
}

interface MessageProviderProps {
  children: ReactNode;
}

interface ToastMessage {
  id: string;
  message: string;
  type: MessageType;
}

interface ConfirmDialog {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText: string;
  cancelText: string;
  type: ConfirmType;
}

export function MessageProvider({ children }: MessageProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const showMessage = (message: string, type: MessageType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // إزالة الرسالة بعد 5 ثوانٍ
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    type: ConfirmType = 'info'
  ) => {
    setConfirmDialog({
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      type,
    });
  };

  const handleConfirm = () => {
    if (confirmDialog) {
      confirmDialog.onConfirm();
      setConfirmDialog(null);
    }
  };

  const handleCancel = () => {
    if (confirmDialog?.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getToastColor = (type: MessageType) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
    }
  };

  const getToastIcon = (type: MessageType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getConfirmColor = (type: ConfirmType) => {
    switch (type) {
      case 'danger': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      case 'info': return 'bg-blue-600';
    }
  };

  return (
    <MessageContext.Provider value={{ showMessage, showConfirm }}>
      {children}
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getToastColor(toast.type)} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in-right`}
          >
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full animate-scale-in">
            {/* Header with Icon */}
            <div className="flex justify-center pt-8 pb-4 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center opacity-10 ${
                confirmDialog.type === 'danger' ? 'bg-red-500' :
                confirmDialog.type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}>
                {confirmDialog.type === 'danger' && (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {confirmDialog.type === 'warning' && (
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {confirmDialog.type === 'info' && (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 pt-4 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {confirmDialog.type === 'danger' ? 'تأكيد الحذف' :
                 confirmDialog.type === 'warning' ? 'تأكيد الإجراء' :
                 'تأكيد'}
              </h2>
              <p className="text-gray-600 mb-4">
                {confirmDialog.message}
              </p>
              
              {/* Buttons */}
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200"
                >
                  {confirmDialog.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-2.5 text-white rounded-lg font-medium transition-all duration-200 ${
                    confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmDialog.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MessageContext.Provider>
  );
}

