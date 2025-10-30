'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import Image from 'next/image';
import { useMessage } from '@/lib/messageService';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL?: string;
  isActive: boolean;
  role?: string;
  createdAt?: string;
  lastLogin?: string;
  password?: string;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const { showMessage, showConfirm } = useMessage();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
    isActive: true,
    role: 'student',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = firestoreApi.getCollection('users');
      const docs = await firestoreApi.getDocuments(usersRef);
      
      const loadedUsers = docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          displayName: (data['displayName'] as string) || 'غير معروف',
          email: (data['email'] as string) || '',
          phoneNumber: (data['phoneNumber'] as string) || '',
          photoURL: data['photoURL'] as string | undefined,
          isActive: (data['isActive'] as boolean) ?? true,
          role: (data['role'] as string) || 'student',
          createdAt: data['createdAt'] as string | undefined,
          lastLogin: data['lastLogin'] as string | undefined,
          password: data['password'] as string | undefined,
        };
      });

      // Sort by display name
      loadedUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showMessage('حدث خطأ في تحميل المستخدمين', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: user.password || '',
      isActive: user.isActive,
      role: user.role || 'student',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const updateData: Record<string, unknown> = {
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim(),
        isActive: editForm.isActive,
        role: editForm.role,
        updatedAt: new Date().toISOString(),
      };

      // رقم الهاتف اختياري
      if (editForm.phoneNumber.trim() !== '') {
        updateData.phoneNumber = editForm.phoneNumber.trim();
      }

      // Only update password if it was changed
      if (editForm.password.trim() !== '') {
        updateData.password = editForm.password.trim();
        updateData.passwordUpdatedAt = new Date().toISOString();
      }

      const userRef = firestoreApi.getDocument('users', editingUser.id);
      await firestoreApi.updateData(userRef, updateData);

      setEditModalOpen(false);
      setEditingUser(null);
      loadUsers();
      showMessage('تم تحديث بيانات المستخدم بنجاح', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showMessage('حدث خطأ في تحديث المستخدم', 'error');
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    showConfirm(
      `هل أنت متأكد من حذف المستخدم "${displayName}"؟`,
      async () => {
        try {
          const userRef = firestoreApi.getDocument('users', userId);
          await firestoreApi.deleteData(userRef);
          loadUsers();
          showMessage('تم حذف المستخدم بنجاح', 'success');
        } catch (error) {
          console.error('Error deleting user:', error);
          showMessage('حدث خطأ في حذف المستخدم', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.phoneNumber.toLowerCase().includes(query)
    );
  });

  const activeUsers = users.filter((u) => u.isActive).length;

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
                إدارة المستخدمين
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={loadUsers}
                className="btn-primary"
              >
                🔄 تحديث
              </button>
              <button
                onClick={() => router.push('/home')}
                className="btn-secondary"
              >
                🏠 العودة
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">إجمالي المستخدمين</p>
                <p className="text-4xl font-bold">{users.length}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                <span className="text-4xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">المستخدمون النشطون</p>
                <p className="text-4xl font-bold">{activeUsers}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                <span className="text-4xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">النتائج المعروضة</p>
                <p className="text-4xl font-bold">{filteredUsers.length}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                <span className="text-4xl">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن المستخدمين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-12"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="مسح البحث"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لا يوجد مستخدمين</h3>
              <p className="text-gray-500">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين في النظام'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => router.push(`/users/${user.id}`)}
                  className="p-6 hover:bg-gray-50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 space-x-reverse flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL}
                            alt={user.displayName}
                            width={56}
                            height={56}
                            className="rounded-full border-2 border-gray-200 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-2xl font-bold text-white">
                              {user.displayName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            user.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {user.displayName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            user.isActive
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                            {user.isActive ? '✓ نشط' : '✗ غير نشط'}
                          </span>
                          <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold shadow-sm">
                            {user.role === 'admin' ? '👑 مدير' : user.role === 'teacher' ? '👨‍🏫 معلم' : '👤 طالب'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                          {user.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{user.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 space-x-reverse flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/users/${user.id}`);
                        }}
                        className="btn-secondary p-3 !px-3 !py-3"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(user);
                        }}
                        className="btn-primary p-3 !px-3 !py-3"
                        title="تعديل"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(user.id, user.displayName);
                        }}
                        className="btn-danger p-3 !px-3 !py-3"
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
      </main>

      {/* Edit Modal */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">تعديل المستخدم</h2>

            <div className="space-y-4">
              <div>
                <label className="label">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  كلمة المرور (اتركه فارغاً إذا لم تريد التغيير)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="أدخل كلمة مرور جديدة..."
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    الدور
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="input"
                  >
                    <option value="student">طالب</option>
                    <option value="teacher">معلم</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    الحالة
                  </label>
                  <select
                    value={editForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                    className="input"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingUser(null);
                }}
                className="btn-ghost flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-primary flex-1"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
