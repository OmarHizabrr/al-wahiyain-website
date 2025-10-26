'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserData {
  id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  isActive: boolean;
  role?: string;
  createdAt?: string;
  lastSignInAt?: string;
  totalTestsCreated?: number;
  totalTestsTaken?: number;
  averageScore?: number;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type?: string;
  currentMembers?: number;
  testCount?: number;
  createdAt?: string;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userGroups, setUserGroups] = useState<GroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'groups'>('info');

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadUserGroups();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userRef = firestoreApi.getDocument('users', userId);
      const data = await firestoreApi.getData(userRef);

      if (data) {
        setUserData({
          id: userId,
          displayName: (data.displayName as string) || 'غير معروف',
          email: (data.email as string) || '',
          phoneNumber: (data.phoneNumber as string) || '',
          photoURL: data.photoURL as string | undefined,
          isActive: (data.isActive as boolean) ?? true,
          role: (data.role as string) || 'student',
          createdAt: data.createdAt as string | undefined,
          lastSignInAt: data.lastSignInAt as string | undefined,
          totalTestsCreated: (data.totalTestsCreated as number) || 0,
          totalTestsTaken: (data.totalTestsTaken as number) || 0,
          averageScore: (data.averageScore as number) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      alert('حدث خطأ في تحميل بيانات المستخدم');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      setIsLoadingGroups(true);
      
      console.log('🔍 جاري جلب مجموعات المستخدم...', userId);
      
      // جلب مجموعات المستخدم من Mygroups/{userId}/Mygroups
      const docs = await firestoreApi.getMyGroups(userId);
      
      console.log('📦 عدد الوثائق من Mygroups:', docs.length);
      console.log('📋 بيانات Mygroups:', docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      const groups: GroupData[] = [];

      for (const doc of docs) {
        // في النظام الجديد، doc.id هو groupId مباشرة
        const groupId = doc.id;

        console.log('🔎 معالجة مجموعة:', groupId);

        if (groupId) {
          // جلب بيانات المجموعة من groups collection
          const groupRef = firestoreApi.getDocument('groups', groupId);
          const groupData = await firestoreApi.getData(groupRef);

          console.log('📄 بيانات المجموعة:', groupId, groupData);

          if (groupData) {
            groups.push({
              id: groupId,
              name: (groupData.name as string) || 'مجموعة غير معروفة',
              description: (groupData.description as string) || '',
              imageUrl: groupData.imageUrl as string | undefined,
              type: (groupData.type as string) || 'عام',
              currentMembers: (groupData.currentMembers as number) || 0,
              testCount: (groupData.testCount as number) || 0,
              createdAt: groupData.createdAt as string | undefined,
            });
          }
        }
      }

      console.log('✅ المجموعات المحملة:', groups.length, groups);
      setUserGroups(groups);
    } catch (error) {
      console.error('❌ خطأ في تحميل مجموعات المستخدم:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const getStatusText = () => {
    if (!userData) return 'غير متصل';

    if (!userData.isActive) {
      return 'غير متصل';
    }

    if (userData.lastSignInAt) {
      try {
        const lastSignIn = new Date(userData.lastSignInAt);
        const now = new Date();
        const diffMs = now.getTime() - lastSignIn.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 5) return 'متصل الآن';
        if (diffMins < 60) return `متصل منذ ${diffMins} دقيقة`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `متصل منذ ${diffHours} ساعة`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `آخر ظهور منذ ${diffDays} يوم`;
      } catch {
        return 'غير متصل';
      }
    }

    return 'غير متصل';
  };

  const getStatusColor = () => {
    if (!userData || !userData.isActive) return 'bg-gray-400';

    if (userData.lastSignInAt) {
      try {
        const lastSignIn = new Date(userData.lastSignInAt);
        const now = new Date();
        const diffMs = now.getTime() - lastSignIn.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 5) return 'bg-green-500';
        if (diffMins < 60) return 'bg-green-500';
        if (diffMins < 1440) return 'bg-yellow-500';
        return 'bg-gray-400';
      } catch {
        return 'bg-gray-400';
      }
    }

    return 'bg-gray-400';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays < 1) return 'اليوم';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
      if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
      return `منذ ${Math.floor(diffDays / 365)} سنوات`;
    } catch {
      return 'غير محدد';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'عام':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'خاص':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'تعليمي':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'اجتماعي':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">المستخدم غير موجود</p>
          <button
            onClick={() => router.push('/users')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة إلى المستخدمين
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pb-32 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/users')}
            className="mb-4 flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة
          </button>

          <div className="text-center mt-8">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              {userData.photoURL ? (
                <Image
                  src={userData.photoURL}
                  alt={userData.displayName}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-xl">
                  <span className="text-5xl font-bold text-white">
                    {userData.displayName.charAt(0)}
                  </span>
                </div>
              )}
              <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${getStatusColor()}`}></div>
            </div>

            {/* Name */}
            <h1 className="text-3xl font-bold mb-2">{userData.displayName}</h1>
            <p className="text-blue-100 mb-4">{userData.email}</p>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm">{getStatusText()}</span>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{userData.totalTestsCreated || 0}</p>
                <p className="text-sm text-blue-100">اختبارات منشأة</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{userData.totalTestsTaken || 0}</p>
                <p className="text-sm text-blue-100">اختبارات محلولة</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(userData.averageScore || 0).toFixed(1)}%</p>
                <p className="text-sm text-blue-100">المتوسط</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'info'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              المعلومات
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'groups'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              المجموعات ({userGroups.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'info' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">البريد الإلكتروني:</span>
                  <span>{userData.email || 'غير محدد'}</span>
                </div>

                {userData.phoneNumber && (
                  <div className="flex items-center gap-4 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium">رقم الهاتف:</span>
                    <span>{userData.phoneNumber}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">حالة الحساب:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    userData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {userData.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>

                {userData.createdAt && (
                  <div className="flex items-center gap-4 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">انضم في:</span>
                    <span>{formatDate(userData.createdAt)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {isLoadingGroups ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل المجموعات...</p>
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-semibold mb-2">لا يوجد مجموعات</p>
                    <p className="text-gray-500 text-sm">المستخدم غير منضم لأي مجموعة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userGroups.map((group) => (
                      <div
                        key={group.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => router.push(`/groups/${group.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Group Image */}
                          <div className="flex-shrink-0">
                            {group.imageUrl ? (
                              <Image
                                src={group.imageUrl}
                                alt={group.name}
                                width={60}
                                height={60}
                                className="rounded-full border-2 border-gray-200"
                              />
                            ) : (
                              <div className={`w-15 h-15 rounded-full flex items-center justify-center text-white font-bold ${
                                group.type === 'عام' ? 'bg-blue-500' :
                                group.type === 'خاص' ? 'bg-purple-500' :
                                group.type === 'تعليمي' ? 'bg-green-500' :
                                group.type === 'اجتماعي' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}>
                                {group.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Group Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
                            
                            {group.type && (
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border mb-2 ${getTypeColor(group.type)}`}>
                                {group.type}
                              </span>
                            )}

                            {group.description && (
                              <p className="text-sm text-gray-600 truncate mb-2">{group.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {group.currentMembers || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {group.testCount || 0}
                              </span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
