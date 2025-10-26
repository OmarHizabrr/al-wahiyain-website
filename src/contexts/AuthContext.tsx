'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { AuthUser, LoginCredentials } from '@/types/user';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من وجود بيانات المستخدم في localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // البحث عن المستخدم في جدول users
      const usersRef = firestoreApi.getCollection('users');
      const docs = await firestoreApi.getDocuments(
        usersRef,
        'phoneNumber',
        credentials.phoneNumber,
        10 // احضر أول 10 مستخدمين لنفس الرقم
      );

      if (docs.length === 0) {
        throw new Error('رقم الهاتف غير مسجل');
      }

      // البحث عن المستخدم الذي لديه كلمة مرور
      let userData: Record<string, unknown> | null = null;
      for (const doc of docs) {
        const data = doc.data() as Record<string, unknown>;
        if (data.password && data.password.toString().trim() !== '') {
          userData = data;
          break; // استخدم المستخدم الأول الذي لديه كلمة مرور
        }
      }

      // إذا لم نجد مستخدماً لديه كلمة مرور، استخدم الأول
      if (!userData) {
        userData = docs[0].data() as Record<string, unknown>;
      }
      
      // التحقق من وجود كلمة المرور
      const storedPassword = (userData.password as string) || '';
      
      if (!storedPassword || storedPassword.trim() === '') {
        throw new Error('هذا المستخدم ليس لديه كلمة مرور. يرجى تحديث كلمة المرور في Firebase');
      }
      
      // التحقق من كلمة المرور
      const inputPassword = credentials.password || '';
      
      // للتشخيص (يُحذف في الإنتاج)
      console.log('Login attempt:', {
        phoneNumber: credentials.phoneNumber,
        storedPasswordLength: storedPassword.length,
        inputPasswordLength: inputPassword.length,
        storedPasswordValue: storedPassword.substring(0, 2) + '***', // لأمان العرض
        inputPasswordValue: inputPassword.substring(0, 2) + '***',
      });
      
      if (storedPassword.trim() !== inputPassword.trim()) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // التحقق من حالة المستخدم
      if (!userData.isActive) {
        throw new Error('حسابك غير مفعل');
      }

      // إنشاء كائن المستخدم
      const authUser: AuthUser = {
        uid: docs[0].id,
        displayName: userData.displayName as string,
        email: userData.email as string,
        phoneNumber: userData.phoneNumber as string,
        photoURL: userData.photoURL as string,
        isActive: userData.isActive as boolean,
        role: userData.role as 'admin' | 'teacher' | 'student',
      };

      // حفظ بيانات المستخدم في localStorage
      localStorage.setItem('user', JSON.stringify(authUser));
      setUser(authUser);

      // تحديث آخر تسجيل دخول
      const userRef = firestoreApi.getDocument('users', docs[0].id);
      await firestoreApi.updateData(userRef, {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
