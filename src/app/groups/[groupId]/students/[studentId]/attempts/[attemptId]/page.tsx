'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TestAttempt {
  id: string;
  testId: string;
  testTitle?: string;
  studentName?: string;
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
  testData?: Record<string, unknown>;
}

export default function AttemptDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;
  const studentId = params?.studentId as string;
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'original' | 'modified'>('original');
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (groupId && attemptId) {
      loadAttemptData();
    }
  }, [groupId, attemptId]);

  const loadAttemptData = async () => {
    try {
      setIsLoading(true);
      
      // جلب المحاولة من student_test_attempts/{groupId}/student_test_attempts/{attemptId}
      // نحتاج لاستخدام getSubDocument للحصول على المستند الفرعي
      const attemptRef = firestoreApi.getSubDocument(
        'student_test_attempts',  // collectionName
        groupId,                  // documentId
        'student_test_attempts',  // subCollectionName
        attemptId                 // subDocumentId
      );
      const attemptData = await firestoreApi.getData(attemptRef);
      
      if (!attemptData) {
        console.error('❌ لم يتم العثور على المحاولة');
        return;
      }

      console.log('📋 بيانات المحاولة:', attemptData);

      setAttempt({
        id: attemptId,
        testId: attemptData.testId as string || '',
        testTitle: attemptData.testTitle as string || 'اختبار بدون عنوان',
        studentName: attemptData.studentName as string | undefined,
        category: attemptData.category as string | undefined,
        score: attemptData.originalScore as number | undefined,
        finalScore: attemptData.finalScore as number | undefined,
        totalPoints: attemptData.totalQuestions as number | undefined,
        totalQuestions: attemptData.totalQuestions as number | undefined,
        percentage: attemptData.percentage as number | undefined,
        isPassed: attemptData.isPassed as boolean | undefined,
        isApproved: attemptData.isApproved as boolean | undefined,
        timeSpent: attemptData.timeSpent as number | undefined,
        duration: attemptData.duration as number | undefined,
        attemptDate: attemptData.attemptDate as string | undefined,
        completedAt: attemptData.completedAt as string | undefined,
        answers: attemptData.answers as Record<string, unknown> | undefined,
        modifications: attemptData.modifications as Record<string, unknown>[] | undefined,
        testData: attemptData.testData as Record<string, unknown> | undefined,
      });
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات المحاولة:', error);
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

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'غير محدد';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLatestModification = () => {
    if (!attempt?.modifications || attempt.modifications.length === 0) return null;
    return attempt.modifications[attempt.modifications.length - 1];
  };

  const getModifiedAnswers = () => {
    const modification = getLatestModification();
    if (!modification) return attempt?.answers || {};
    
    const afterMod = modification['afterModification'] as Record<string, unknown> | undefined;
    return afterMod?.['modifiedAnswers'] as Record<string, unknown> || attempt?.answers || {};
  };

  const getOriginalAnswers = () => {
    const modification = getLatestModification();
    if (!modification) return attempt?.answers || {};
    
    const beforeMod = modification['beforeModification'] as Record<string, unknown> | undefined;
    return beforeMod?.['originalAnswers'] as Record<string, unknown> || attempt?.answers || {};
  };

  const getQuestions = () => {
    const testData = attempt?.testData;
    if (!testData) return {};
    
    const questions = testData['questions'];
    if (!questions) return {};
    
    // إذا كانت List، نحولها إلى Map
    if (Array.isArray(questions)) {
      const questionsMap: Record<string, unknown> = {};
      questions.forEach((q, index) => {
        questionsMap[index.toString()] = q;
      });
      return questionsMap;
    }
    
    return questions as Record<string, unknown>;
  };

  const formatUserAnswer = (userAnswer: unknown, questionType: string) => {
    if (!userAnswer) return 'لم يجب';

    switch (questionType) {
      case 'fill_blank':
        if (Array.isArray(userAnswer)) {
          return userAnswer.join(', ');
        }
        return String(userAnswer);
      default:
        return String(userAnswer);
    }
  };

  const getCorrectAnswer = (questionData: Record<string, unknown>, questionType: string): string => {
    switch (questionType) {
      case 'multiple_choice':
        const options = questionData['options'] as unknown[] | undefined;
        if (options) {
          for (const option of options) {
            if ((option as Record<string, unknown>)['isCorrect']) {
              const text = (option as Record<string, unknown>)['text'];
              return typeof text === 'string' ? text : 'غير محدد';
            }
          }
        }
        return 'غير محدد';
      
      case 'fill_blank':
        const blanks = questionData['blanks'] as unknown[] | undefined;
        if (blanks) {
          const answers = blanks.map((blank) => {
            const blankData = blank as Record<string, unknown>;
            const answer = blankData['correctAnswer'];
            return typeof answer === 'string' ? answer : '';
          }).filter(a => a);
          return answers.length > 0 ? answers.join(', ') : 'غير محدد';
        }
        return 'غير محدد';
      
      case 'book_reference':
        const correctBook = questionData['correctBook'];
        return typeof correctBook === 'string' ? correctBook : 'غير محدد';
      
      case 'narrator_reference':
        const correctNarrator = questionData['correctNarrator'];
        return typeof correctNarrator === 'string' ? correctNarrator : 'غير محدد';
      
      case 'hadith_attribution':
        const correctAttribution = questionData['correctAttribution'];
        return typeof correctAttribution === 'string' ? correctAttribution : 'غير محدد';
      
      case 'proof_text':
        const proofText = questionData['proofText'];
        return typeof proofText === 'string' ? proofText : 'غير محدد';
      
      case 'specific_answer':
        const acceptableAnswers = questionData['acceptableAnswers'] as unknown[] | undefined;
        if (acceptableAnswers && acceptableAnswers.length > 0) {
          const validAnswers = acceptableAnswers.filter(a => typeof a === 'string');
          return validAnswers.length > 0 ? validAnswers.join(' أو ') : 'غير محدد';
        }
        const correctAnswer = questionData['correctAnswer'];
        return typeof correctAnswer === 'string' ? correctAnswer : 'غير محدد';
      
      default:
        const defaultAnswer = questionData['correctAnswer'];
        return typeof defaultAnswer === 'string' ? defaultAnswer : 'غير محدد';
    }
  };

  const isAnswerCorrect = (userAnswer: unknown, questionData: Record<string, unknown>, questionType: string) => {
    if (!userAnswer) return false;
    
    const correctAnswer = getCorrectAnswer(questionData, questionType);
    return String(userAnswer) === String(correctAnswer);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المحاولة...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">المحاولة غير موجودة</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  const modification = getLatestModification();
  const hasModifications = modification !== null;
  
  const originalAnswers = getOriginalAnswers();
  const modifiedAnswers = getModifiedAnswers();
  const questions = getQuestions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white pb-20 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة
            </button>

            <button
              onClick={() => setShowUnlockDialog(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="font-medium">تعديل الإجابات</span>
            </button>
          </div>

          <div className="text-center mt-8">
            <h1 className="text-3xl font-bold mb-2">{attempt.testTitle}</h1>
            <p className="text-white text-opacity-90">
              {attempt.studentName || decodeURIComponent(studentId)} - {formatDate(attempt.attemptDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        {/* Comparison Header */}
        {hasModifications && modification && (() => {
          const beforeMod = modification['beforeModification'] as Record<string, unknown> | undefined;
          const afterMod = modification['afterModification'] as Record<string, unknown> | undefined;
          
          const originalScore = (beforeMod?.['finalScore'] || beforeMod?.['correctAnswers']) as number || attempt.score || 0;
          const originalIsPassed = (beforeMod?.['isPassed']) as boolean || attempt.isPassed || false;
          
          const newScore = attempt.finalScore || attempt.score || 0;
          const newIsPassed = attempt.isPassed || false;
          const totalQuestions = attempt.totalQuestions || 0;
          
          // حساب النسبة المئوية بشكل صحيح: (عدد الإجابات الصحيحة / إجمالي الأسئلة) × 100
          const originalPercentage = totalQuestions > 0 ? Math.round((originalScore / totalQuestions) * 100 * 10) / 10 : 0;
          const newPercentage = totalQuestions > 0 ? Math.round((newScore / totalQuestions) * 100 * 10) / 10 : 0;
          
          const hasImprovement = newScore > originalScore;
          const improvementCount = newScore - originalScore;
          const modifiedBy = modification['modifiedBy'] as string || 'غير محدد';
          
          return (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              {/* معلومات الطالب والمعدل */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  hasImprovement ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {hasImprovement ? (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-900">الطالب: {attempt.studentName || decodeURIComponent(studentId)}</p>
                  <p className="text-sm text-gray-600">المعدل: {modifiedBy}</p>
                  <p className="text-xs text-gray-500">{attempt.testTitle}</p>
                </div>
                {hasImprovement && (
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
                    +{improvementCount} إجابة
                  </div>
                )}
              </div>

              {/* مقارنة النتائج */}
              <div className="flex items-center gap-4">
                {/* النتيجة الأصلية */}
                <div className="flex-1 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-red-600">النتيجة الأصلية</h3>
                  </div>
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {originalScore}/{totalQuestions}
                  </div>
                  <div className="text-lg font-bold text-red-600 mb-2">
                    {originalPercentage.toFixed(1)}%
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                    originalIsPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {originalIsPassed ? 'نجح' : 'راسب'}
                  </div>
                </div>

                {/* السهم */}
                <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>

                {/* النتيجة المعدلة */}
                <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-green-600">النتيجة المعدلة</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {newScore}/{totalQuestions}
                  </div>
                  <div className="text-lg font-bold text-green-600 mb-2">
                    {newPercentage.toFixed(1)}%
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                    newIsPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {newIsPassed ? 'نجح' : 'راسب'}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'original'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              الإجابات الأصلية
            </button>
            <button
              onClick={() => setActiveTab('modified')}
              className={`flex-1 py-4 text-center font-semibold transition-colors ${
                activeTab === 'modified'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              الإجابات المعدلة
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {Object.keys(questions).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">لا توجد أسئلة متاحة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* تصفية الأسئلة حسب التبويب */}
                {Object.entries(questions).filter(([questionId]) => {
                  // في التبويب "الإجابات الأصلية": نعرض فقط الأسئلة التي لها إجابات
                  // في التبويب "الإجابات المحدثة": نعرض جميع الأسئلة
                  if (activeTab === 'original') {
                    return originalAnswers.hasOwnProperty(questionId);
                  } else {
                    return true; // عرض جميع الأسئلة
                  }
                }).map(([questionId, questionData], index) => {
                  const qData = questionData as Record<string, unknown>;
                  const questionType = (qData['type'] as string) || 'multiple_choice';
                  const questionText = qData['question'] as string || '';
                  
                  const answers = activeTab === 'modified' ? modifiedAnswers : originalAnswers;
                  const userAnswer = answers[questionId];
                  const isCorrect = isAnswerCorrect(userAnswer, qData, questionType);
                  const correctAnswer = getCorrectAnswer(qData, questionType);

                  // مقارنة الإجابة الأصلية والمعدلة
                  let originalAnswer = '';
                  let modifiedAnswer = '';
                  let hasChanged = false;

                  if (activeTab === 'modified') {
                    // في تبويب "الإجابات المحدثة": نأخذ الإجابة الأصلية من سجل التعديلات
                    const modification = getLatestModification();
                    if (modification) {
                      const beforeMod = modification['beforeModification'] as Record<string, unknown> | undefined;
                      const originalAnswersRaw = beforeMod?.['originalAnswers'] as Record<string, unknown> | undefined;
                      const originalAnswerRaw = originalAnswersRaw?.[questionId];
                      
                      originalAnswer = formatUserAnswer(originalAnswerRaw, questionType);
                      modifiedAnswer = formatUserAnswer(userAnswer, questionType);
                      hasChanged = originalAnswer !== modifiedAnswer;
                      
                      // إذا كان السؤال لم يجب عليه في الأصل وأصبح له إجابة في التعديل
                      const wasNotAnswered = originalAnswer === 'لم يجب' || !originalAnswer;
                      const isNowAnswered = modifiedAnswer !== 'لم يجب' && modifiedAnswer;
                      
                      if (wasNotAnswered && isNowAnswered) {
                        hasChanged = true;
                      }
                    }
                  } else {
                    // في تبويب "الإجابات الأصلية": نجلب من originalAnswers مباشرة
                    const originalAnswerRaw = originalAnswers[questionId];
                    originalAnswer = formatUserAnswer(originalAnswerRaw, questionType);
                    modifiedAnswer = ''; // لا توجد إجابة معدلة في هذا التبويب
                    hasChanged = false;
                  }

                  return (
                    <div 
                      key={questionId} 
                      className={`border rounded-lg p-5 ${
                        hasChanged && activeTab === 'modified'
                          ? 'border-yellow-400 border-2'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`${
                          hasChanged && activeTab === 'modified' 
                            ? 'bg-yellow-500' 
                            : 'bg-blue-500'
                        } text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0`}>
                          {hasChanged && activeTab === 'modified' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {questionType === 'narrator_reference' ? 'راوي' :
                               questionType === 'book_reference' ? 'كتاب' :
                               questionType === 'hadith_attribution' ? 'مخرج' :
                               questionType === 'multiple_choice' ? 'اختيار متعدد' :
                               questionType === 'fill_blank' ? 'املأ الفراغ' :
                               questionType === 'proof_text' ? 'دلل على (نص)' :
                               questionType === 'specific_answer' ? 'أجب عن' :
                               questionType}
                            </span>
                            {hasChanged && activeTab === 'modified' && (
                              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded font-semibold">
                                معدل
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-3">{questionText}</p>
                          
                          {/* User Answer */}
                          <div className={`p-4 rounded-lg mb-3 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <span className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                إجابة الطالب:
                              </span>
                            </div>
                            <p className={`text-gray-700 ${isCorrect ? 'text-green-700' : 'text-red-700'} font-semibold`}>
                              {activeTab === 'original' ? originalAnswer : modifiedAnswer}
                            </p>
                          </div>

                          {/* Show modification if exists and on modified tab */}
                          {hasChanged && activeTab === 'modified' && (
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                </svg>
                                <span className="font-semibold text-yellow-600">مقارنة التعديلات:</span>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-red-600 line-through">
                                  الإجابة الأصلية: {originalAnswer}
                                </p>
                                <p className="text-sm text-green-700 font-bold">
                                  الإجابة المعدلة: {modifiedAnswer}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Correct Answer */}
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-blue-600">الإجابة الصحيحة:</span>
                            </div>
                            <p className="text-blue-700 font-semibold">{correctAnswer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Unlock Dialog */}
      {showUnlockDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">إدخال رمز التعديل</h2>
                    <p className="text-sm text-white/80">أدخل الرمز للمتابعة</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUnlockDialog(false);
                    setUnlockPin('');
                    setUnlockError('');
                  }}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
                             <div className="mb-6">
                 <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                   الرمز السري للتعديل
                 </label>
                 <div className="relative">
                   <input
                     type={showPassword ? "text" : "password"}
                     value={unlockPin}
                     onChange={(e) => {
                       setUnlockPin(e.target.value);
                       setUnlockError('');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         handleUnlock();
                       }
                     }}
                     placeholder="••••••"
                     maxLength={6}
                     className="w-full px-4 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-2xl tracking-[0.5em] font-mono text-gray-900 transition-all"
                     autoFocus
                   />
                   <button
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     {showPassword ? (
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                       </svg>
                     ) : (
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                       </svg>
                     )}
                   </button>
                 </div>
                 {unlockError && (
                   <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     <span>{unlockError}</span>
                   </div>
                 )}
               </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnlockDialog(false);
                    setUnlockPin('');
                    setUnlockError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUnlock}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-200 transition-all duration-200 active:scale-95"
                >
                  فتح
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleUnlock() {
    // هذا رمز التعديل - يمكنك تغييره
    const MODIFY_PIN = '123456';
    
    if (unlockPin === MODIFY_PIN) {
      setShowUnlockDialog(false);
      setUnlockPin('');
      setUnlockError('');
      router.push(`/groups/${groupId}/students/${studentId}/attempts/${attemptId}/edit`);
    } else {
      setUnlockError('الرمز غير صحيح');
      setUnlockPin('');
    }
  }
}
