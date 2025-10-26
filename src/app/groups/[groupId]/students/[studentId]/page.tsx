'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TestAttempt {
  id: string;
  testId: string;
  testTitle?: string;
  category?: string;
  score?: number;
  finalScore?: number;
  totalPoints?: number;
  totalQuestions?: number;
  percentage?: number;
  isPassed?: boolean;
  isApproved?: boolean;
  timeSpent?: number;
  duration?: number;
  attemptDate?: string;
  completedAt?: string;
  answers?: Record<string, unknown>;
  modifications?: Record<string, unknown>[];
}

export default function StudentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;
  const studentId = params?.studentId as string;

  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (groupId && studentId) {
      loadStudentData();
    }
  }, [groupId, studentId]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      
      // جلب محاولات الطالب من student_test_attempts/{groupId}/student_test_attempts
      const attemptsRef = firestoreApi.getSubCollectionRef(
        'student_test_attempts',
        groupId,
        'student_test_attempts'
      );
      
      // جلب جميع المحاولات ثم فلترة
      const allDocs = await firestoreApi.getDocuments(attemptsRef);
      
      // فلترة المحاولات الخاصة بهذا الطالب
      const docs = allDocs.filter(doc => {
        const data = doc.data() as Record<string, unknown>;
        return data.studentName === decodeURIComponent(studentId);
      });
      
      console.log(`✅ تم جلب ${docs.length} محاولة للطالب`);

      const attempts: TestAttempt[] = [];

      for (const doc of docs) {
        const data = doc.data() as Record<string, unknown>;
        
        // استخدام testTitle من البيانات مباشرة (كما في المشروع الأصلي)
        const testTitle = data.testTitle as string | undefined;
        const testId = data.testId as string | undefined;
        
        console.log('📋 معالجة محاولة:', {
          id: doc.id,
          testId,
          testTitle,
          studentName: data.studentName,
          score: data.finalScore || data.originalScore,
          totalQuestions: data.totalQuestions,
        });

        attempts.push({
          id: doc.id,
          testId: testId || '',
          testTitle: testTitle || 'اختبار بدون عنوان',
          category: data.category as string | undefined,
          score: data.originalScore as number | undefined,
          finalScore: data.finalScore as number | undefined,
          totalPoints: data.totalQuestions as number | undefined,
          totalQuestions: data.totalQuestions as number | undefined,
          percentage: data.percentage as number | undefined,
          isPassed: data.isPassed as boolean | undefined,
          isApproved: data.isApproved as boolean | undefined,
          timeSpent: data.timeSpent as number | undefined,
          duration: data.duration as number | undefined,
          attemptDate: data.attemptDate as string | undefined,
          completedAt: data.completedAt as string | undefined,
          answers: data.answers as Record<string, unknown> | undefined,
          modifications: data.modifications as Record<string, unknown>[] | undefined,
        });
      }

      // ترتيب حسب تاريخ الإكمال (الأحدث أولاً)
      attempts.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });

      console.log('✅ تم تحميل محاولات الطالب:', attempts);
      setTestAttempts(attempts);
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات الطالب:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return 'غير محدد';
    }
  };

  const getPercentage = (score?: number, total?: number) => {
    if (!score || !total) return 0;
    return Math.round((score / total) * 100);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'غير محدد';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteAttempt = async (attempt: TestAttempt) => {
    const confirmed = confirm(
      `هل أنت متأكد من حذف محاولة الاختبار "${attempt.testTitle}"؟\n\nسيتم حذف جميع بيانات هذه المحاولة.\n\nهذا الإجراء لا يمكن التراجع عنه!`
    );

    if (!confirmed) return;

    try {
      // حذف المحاولة
      const attemptRef = firestoreApi.getDocument('student_test_attempts', attempt.id);
      await firestoreApi.deleteData(attemptRef);

      console.log(`✅ تم حذف المحاولة "${attempt.testTitle}"`);

      // تحديث القائمة
      await loadStudentData();

      alert('✅ تم حذف المحاولة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حذف المحاولة:', error);
      alert('❌ فشل في حذف المحاولة. حاول مرة أخرى.');
    }
  };

  const handleViewAttempt = (attempt: TestAttempt) => {
    router.push(`/groups/${groupId}/students/${encodeURIComponent(studentId)}/attempts/${attempt.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الطالب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white pb-20 pt-8">
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
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-xl">
                <span className="text-4xl">{decodeURIComponent(studentId).charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{decodeURIComponent(studentId)}</h1>
            <p className="text-white text-opacity-90">محاولات الطالب في الاختبارات</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">عدد المحاولات</p>
                <p className="text-3xl font-bold text-gray-900">{testAttempts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-3xl">📝</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المتوسط</p>
                <p className="text-3xl font-bold text-gray-900">
                  {testAttempts.length > 0
                    ? Math.round(
                        testAttempts.reduce((sum, attempt) => {
                          const percentage = getPercentage(attempt.score, attempt.totalPoints);
                          return sum + percentage;
                        }, 0) / testAttempts.length
                      )
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">آخر نشاط</p>
                <p className="text-lg font-bold text-gray-900">
                  {testAttempts[0]?.completedAt ? formatDate(testAttempts[0].completedAt) : 'غير محدد'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-3xl">⏰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Attempts */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">محاولات الاختبارات</h2>
          
          {testAttempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold mb-2">لا توجد محاولات</p>
              <p className="text-gray-500 text-sm">لم يقم الطالب بأي محاولات اختبار بعد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testAttempts.map((attempt) => {
                const percentage = attempt.percentage !== undefined 
                  ? Math.round(attempt.percentage) 
                  : getPercentage(attempt.finalScore || attempt.score, attempt.totalPoints);
                const dateStr = attempt.attemptDate || attempt.completedAt;
                
                return (
                  <div key={attempt.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-gray-900">{attempt.testTitle}</h4>
                          {attempt.isApproved && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              معتمد
                            </span>
                          )}
                        </div>
                        {dateStr && (
                          <p className="text-gray-500 text-sm mt-1">{formatDate(dateStr)}</p>
                        )}
                        {attempt.timeSpent && (
                          <p className="text-gray-500 text-xs mt-1">الوقت المستغرق: {formatTime(attempt.timeSpent)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                          {percentage}%
                        </span>
                        {attempt.isPassed !== undefined && (
                          <span className={`text-2xl ${attempt.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.isPassed ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="text-gray-700 text-sm">
                          {attempt.finalScore !== undefined ? attempt.finalScore : attempt.score || 0} / {attempt.totalPoints || 0} نقطة
                        </span>
                      </div>
                      {attempt.totalQuestions && (
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700 text-sm">{attempt.totalQuestions} سؤال</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleViewAttempt(attempt)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        معاينة المحاولة
                      </button>
                      <button
                        onClick={() => handleDeleteAttempt(attempt)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
