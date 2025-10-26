'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TestData {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  duration?: number;
  totalPoints?: number;
}

interface QuestionData {
  id: string;
  question: string;
  type: string;
  points?: number;
  options?: Record<string, unknown>;
  correctAnswer?: string | string[];
  [key: string]: unknown;
}

export default function TestDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params?.testId as string;

  const [testData, setTestData] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    if (testId) {
      loadTestData();
      loadQuestions();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      setIsLoading(true);
      // TODO: جلب بيانات الاختبار من مكان مناسب
      // حالياً نستخدم البيانات من العنوان فقط
      setTestData({
        id: testId,
        title: 'اختبار',
        description: '',
      });
    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      
      // جلب الأسئلة من test_questions/{testId}/test_questions
      const questionsRef = firestoreApi.getSubCollection(
        'test_questions',
        testId,
        'test_questions'
      );
      const docs = await firestoreApi.getDocuments(questionsRef);

      const questionsList: QuestionData[] = docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          question: (data.question as string) || 'سؤال بدون نص',
          type: (data.type as string) || 'multiple_choice',
          points: (data.points as number) || 1,
          options: data.options as Record<string, unknown> | undefined,
          correctAnswer: data.correctAnswer as string | string[] | undefined,
          ...data,
        };
      });

      setQuestions(questionsList);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoadingQuestions(false);
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
      }).format(date);
    } catch {
      return 'غير محدد';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الاختبار...</p>
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
                <span className="text-4xl">📝</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{testData?.title || 'اختبار بدون عنوان'}</h1>
            {testData?.description && (
              <p className="text-white text-opacity-90 max-w-2xl mx-auto">{testData.description}</p>
            )}
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
                <p className="text-gray-600 text-sm mb-1">عدد الأسئلة</p>
                <p className="text-3xl font-bold text-gray-900">{questions.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-3xl">❓</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">النقاط الإجمالية</p>
                <p className="text-3xl font-bold text-gray-900">
                  {testData?.totalPoints || questions.reduce((sum, q) => sum + (q.points || 1), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-3xl">⭐</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">تاريخ الإنشاء</p>
                <p className="text-lg font-bold text-gray-900">{formatDate(testData?.createdAt)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-3xl">📅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">الأسئلة</h2>
          
          {isLoadingQuestions ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الأسئلة...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold mb-2">لا يوجد أسئلة</p>
              <p className="text-gray-500 text-sm">لا يوجد أسئلة في هذا الاختبار</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-lg font-bold text-gray-900 flex-1">{question.question}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {question.type === 'multiple_choice' ? 'اختيار متعدد' :
                             question.type === 'fill_blank' ? 'إكمال الفراغات' :
                             question.type === 'true_false' ? 'صح/خطأ' : question.type}
                          </span>
                          {question.points && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              {question.points} نقطة
                            </span>
                          )}
                        </div>
                      </div>

                      {question.options && question.type === 'multiple_choice' && (
                        <div className="space-y-2 mt-4">
                          {Object.entries(question.options).map(([key, option]) => (
                            <div key={key} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                question.correctAnswer === key ? 'border-green-500 bg-green-50' : 'border-gray-300'
                              }`}>
                                {question.correctAnswer === key && (
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                )}
                              </div>
                              <span className="text-gray-700">{option as string}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.correctAnswer && question.type !== 'multiple_choice' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">الإجابة الصحيحة:</p>
                          <p className="font-semibold text-green-700">
                            {Array.isArray(question.correctAnswer) 
                              ? question.correctAnswer.join(', ') 
                              : question.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
