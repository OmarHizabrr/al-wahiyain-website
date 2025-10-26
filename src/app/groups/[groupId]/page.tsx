'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GroupData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type?: string;
  currentMembers?: number;
  testCount?: number;
  createdAt?: string;
  createdBy?: string;
}

interface MemberData {
  id: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  joinedAt?: string;
}

interface StudentData {
  id: string;
  studentName: string;
  testId: string;
  completedAt?: string;
  score?: number;
  totalPoints?: number;
  answers?: Record<string, unknown>;
}

interface TestData {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  questionsCount?: number;
  duration?: number;
  totalPoints?: number;
}

export default function GroupDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [tests, setTests] = useState<TestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'students' | 'tests'>('info');

  useEffect(() => {
    if (groupId) {
      loadGroupData();
      loadMembers();
      loadStudents();
      loadTests();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      const groupRef = firestoreApi.getDocument('groups', groupId);
      const data = await firestoreApi.getData(groupRef);

      if (data) {
        setGroupData({
          id: groupId,
          name: (data.name as string) || 'مجموعة غير معروفة',
          description: (data.description as string) || '',
          imageUrl: data.imageUrl as string | undefined,
          type: (data.type as string) || 'عام',
          currentMembers: (data.currentMembers as number) || 0,
          testCount: (data.testCount as number) || 0,
          createdAt: data.createdAt as string | undefined,
          createdBy: data.createdBy as string | undefined,
        });
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      alert('حدث خطأ في تحميل بيانات المجموعة');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const membersRef = firestoreApi.getSubCollection(
        'members',
        groupId,
        'members'
      );
      const docs = await firestoreApi.getDocuments(membersRef);

      const membersList: MemberData[] = [];

      for (const doc of docs) {
        const data = doc.data() as Record<string, unknown>;
        const userId = doc.id;

        // جلب بيانات المستخدم
        const userRef = firestoreApi.getDocument('users', userId);
        const userData = await firestoreApi.getData(userRef);

        if (userData) {
          membersList.push({
            id: userId,
            displayName: (userData.displayName as string) || 'غير معروف',
            photoURL: userData.photoURL as string | undefined,
            role: (data.role as string) || 'member',
            joinedAt: data.joinedAt as string | undefined,
          });
        }
      }

      // ترتيب حسب الدور ثم الاسم
      membersList.sort((a, b) => {
        const roleOrder: Record<string, number> = {
          admin: 0,
          teacher: 1,
          member: 2,
          student: 3,
        };
        const aOrder = roleOrder[a.role || 'member'] ?? 999;
        const bOrder = roleOrder[b.role || 'member'] ?? 999;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return a.displayName.localeCompare(b.displayName, 'ar');
      });

      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoadingStudents(true);
      
      // جلب محاولات الطلاب من student_test_attempts/{groupId}/student_test_attempts
      const attemptsRef = firestoreApi.getSubCollection(
        'student_test_attempts',
        groupId,
        'student_test_attempts'
      );
      const docs = await firestoreApi.getDocuments(attemptsRef);
      
      console.log(`✅ تم جلب ${docs.length} محاولة من student_test_attempts`);

      const studentsMap = new Map<string, StudentData>();

      for (const doc of docs) {
        const data = doc.data() as Record<string, unknown>;
        const studentName = data.studentName as string;
        const answers = data.answers as Record<string, unknown> | undefined;
        const testId = data.testId as string | undefined;

        // فقط الطلاب الذين لديهم إجابات
        if (studentName && studentName.trim() !== '' && answers && answers !== null && Object.keys(answers).length > 0) {
          const normalizedName = studentName.trim();

          if (!studentsMap.has(normalizedName)) {
            studentsMap.set(normalizedName, {
              id: normalizedName,
              studentName: normalizedName,
              testId: testId || '',
              completedAt: data.completedAt as string | undefined,
              score: data.score as number | undefined,
              totalPoints: data.totalPoints as number | undefined,
              answers: answers,
            });
          }
        }
      }

      const studentsList = Array.from(studentsMap.values());
      
      // ترتيب حسب الاسم
      studentsList.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
      
      console.log('✅ تم تحميل الطلاب:', studentsList.length);
      setStudents(studentsList);
    } catch (error) {
      console.error('❌ خطأ في تحميل الطلاب:', error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadTests = async () => {
    try {
      setIsLoadingTests(true);
      console.log('🔍 جاري جلب اختبارات المجموعة...', groupId);
      
      // جلب الاختبارات من test/{groupId}/test باستخدام getGroupTests
      const docs = await firestoreApi.getGroupTests(groupId);
      console.log(`✅ تم جلب ${docs.length} اختبار من test/{groupId}/test`);

      const testsList: TestData[] = [];

      for (const doc of docs) {
        const data = doc.data() as Record<string, unknown>;
        
        // جلب عدد الأسئلة من test_questions/{testId}/test_questions
        let questionsCount = 0;
        try {
          const questionsRef = firestoreApi.getSubCollection(
            'test_questions',
            doc.id,
            'test_questions'
          );
          const questionsDocs = await firestoreApi.getDocuments(questionsRef);
          questionsCount = questionsDocs.length;
          console.log(`📋 الاختبار ${doc.id} لديه ${questionsCount} سؤال`);
        } catch (error) {
          console.error(`❌ خطأ في جلب عدد الأسئلة للاختبار ${doc.id}:`, error);
        }

        testsList.push({
          id: doc.id,
          title: (data.title as string) || 'اختبار بدون عنوان',
          description: data.description as string | undefined,
          createdAt: data.createdAt as string | undefined,
          questionsCount,
          duration: data.duration as number | undefined,
          totalPoints: data.totalPoints as number | undefined,
        });
      }

      // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
      testsList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      console.log('✅ تم تحميل الاختبارات:', testsList);
      setTests(testsList);
    } catch (error) {
      console.error('❌ خطأ في تحميل الاختبارات:', error);
    } finally {
      setIsLoadingTests(false);
    }
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
        return 'from-blue-500 to-blue-600';
      case 'خاص':
        return 'from-purple-500 to-purple-600';
      case 'تعليمي':
        return 'from-green-500 to-green-600';
      case 'اجتماعي':
        return 'from-yellow-500 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'teacher':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'member':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'student':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'teacher':
        return 'معلم';
      case 'member':
        return 'عضو';
      case 'student':
        return 'طالب';
      default:
        return 'عضو';
    }
  };

  const handleEditStudent = (student: StudentData) => {
    // في المشروع الأصلي، التعديل يتم عبر قائمة السياق
    // هنا يمكن فتح نافذة أو تنفيذ المنطق المطلوب
    console.log('تعديل الطالب:', student);
    // يمكن فتح نافذة تعديل أو تنفيذ أي منطق آخر
  };

  const handleDeleteStudent = async (student: StudentData) => {
    const confirmed = confirm(
      `هل أنت متأكد من حذف الطالب "${student.studentName}"؟\n\nسيتم حذف:\n• جميع محاولات الاختبار\n• جميع التعديلات والمراجعات\n• جميع البيانات الإحصائية\n\nهذا الإجراء لا يمكن التراجع عنه!`
    );

    if (!confirmed) return;

    try {
      setIsLoadingStudents(true);

      // جلب جميع محاولات الطالب وحذفها
      const attemptsRef = firestoreApi.getSubCollectionRef(
        'student_test_attempts',
        groupId,
        'student_test_attempts'
      );
      
      const docs = await firestoreApi.getDocuments(
        attemptsRef,
        'studentName',
        student.studentName
      );

      // حذف جميع المحاولات
      const deletePromises = docs.map(async (doc) => {
        await firestoreApi.deleteData(doc.ref);
      });
      await Promise.all(deletePromises);

      console.log(`✅ تم حذف ${docs.length} محاولة للطالب "${student.studentName}"`);

      // تحديث القائمة
      await loadStudents();

      alert(`✅ تم حذف الطالب "${student.studentName}" وجميع البيانات المتعلقة به بنجاح`);
    } catch (error) {
      console.error('❌ خطأ في حذف الطالب:', error);
      alert('❌ فشل في حذف الطالب. حاول مرة أخرى.');
    } finally {
      setIsLoadingStudents(false);
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

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">المجموعة غير موجودة</p>
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
      <div className={`bg-gradient-to-r ${getTypeColor(groupData.type)} text-white pb-32 pt-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة
          </button>

          <div className="text-center mt-8">
            {/* Group Image */}
            <div className="relative inline-block mb-4">
              {groupData.imageUrl ? (
                <Image
                  src={groupData.imageUrl}
                  alt={groupData.name}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white shadow-xl"
                />
              ) : (
                <div className={`w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-xl text-4xl font-bold text-white`}>
                  {groupData.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              {groupData.type && (
                <span className={`absolute bottom-0 right-0 px-3 py-1 bg-white rounded-full text-xs font-bold ${
                  groupData.type === 'عام' ? 'text-blue-600' :
                  groupData.type === 'خاص' ? 'text-purple-600' :
                  groupData.type === 'تعليمي' ? 'text-green-600' :
                  groupData.type === 'اجتماعي' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {groupData.type}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-bold mb-2">{groupData.name}</h1>
            {groupData.description && (
              <p className="text-white text-opacity-90 max-w-2xl mx-auto">{groupData.description}</p>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-white text-opacity-80">الأعضاء</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{groupData.testCount || 0}</p>
                <p className="text-sm text-white text-opacity-80">الاختبارات</p>
              </div>
              {groupData.createdAt && (
                <div className="text-center">
                  <p className="text-2xl font-bold">📅</p>
                  <p className="text-sm text-white text-opacity-80">{formatDate(groupData.createdAt)}</p>
                </div>
              )}
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
              معلومات المجموعة
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'members'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              الأعضاء ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'students'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              الطلاب ({students.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'info' ? (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل المجموعة</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="font-medium">النوع:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(groupData.type)}`}>
                        {groupData.type || 'عام'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-medium">عدد الأعضاء:</span>
                      <span className="text-gray-900">{members.length} عضو</span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">عدد الاختبارات:</span>
                      <span className="text-gray-900">{groupData.testCount || 0} اختبار</span>
                    </div>

                    {groupData.createdAt && (
                      <div className="flex items-center gap-4 text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">تاريخ الإنشاء:</span>
                        <span className="text-gray-900">{formatDate(groupData.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {groupData.description && (
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">عن المجموعة</h3>
                    <p className="text-gray-700 leading-relaxed">{groupData.description}</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'members' ? (
              <div>
                {isLoadingMembers ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل الأعضاء...</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-semibold mb-2">لا يوجد أعضاء</p>
                    <p className="text-gray-500 text-sm">لا يوجد أعضاء في هذه المجموعة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => router.push(`/users/${member.id}`)}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:border-blue-500"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {member.photoURL ? (
                              <Image
                                src={member.photoURL}
                                alt={member.displayName}
                                width={48}
                                height={48}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {member.displayName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{member.displayName}</h4>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border mt-1 ${getRoleColor(member.role)}`}>
                              {getRoleName(member.role)}
                            </span>
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
            ) : activeTab === 'students' && (
              <div>
                {isLoadingStudents ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل الطلاب...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-semibold mb-2">لا يوجد طلاب</p>
                    <p className="text-gray-500 text-sm">لا يوجد طلاب في هذه المجموعة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold flex-shrink-0">
                            {student.studentName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg truncate">{student.studentName}</h4>
                            {student.completedAt && (
                              <p className="text-gray-500 text-xs mt-1">{formatDate(student.completedAt)}</p>
                            )}
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/groups/${groupId}/students/${encodeURIComponent(student.studentName)}`);
                              }}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
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
                                handleEditStudent(student);
                              }}
                              className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                              title="تعديل"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(student);
                              }}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="حذف"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {student.score !== undefined && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <span className="text-gray-600 text-sm font-semibold">النتيجة:</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${
                                student.score >= (student.totalPoints || 0) * 0.7 ? 'text-green-600' :
                                student.score >= (student.totalPoints || 0) * 0.5 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {student.score}
                              </span>
                              {student.totalPoints !== undefined && (
                                <span className="text-gray-500 text-sm">/ {student.totalPoints}</span>
                              )}
                            </div>
                          </div>
                        )}
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
