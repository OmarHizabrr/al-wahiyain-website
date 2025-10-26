'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TestAttempt {
  id: string;
  testId: string;
  testTitle?: string;
  studentName?: string;
  totalQuestions?: number;
  finalScore?: number;
  answers?: Record<string, unknown>;
  modifications?: Record<string, unknown>[];
  testData?: Record<string, unknown>;
  groupId?: string;
}

interface Question {
  id: string;
  data: Record<string, unknown>;
}

export default function EditAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;
  const studentId = params?.studentId as string;
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, unknown>>({});
  const [earnedPoints, setEarnedPoints] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [originalAnswers, setOriginalAnswers] = useState<Record<string, unknown>>({});
  const [showQuestionsList, setShowQuestionsList] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [manualScore, setManualScore] = useState<number>(0);

  useEffect(() => {
    if (groupId && attemptId) {
      loadAttemptData();
    }
  }, [groupId, attemptId]);

  const checkAnswerCorrectness = (
    userAnswer: unknown,
    questionData: Record<string, unknown>,
    questionType: string
  ): boolean => {
    if (!userAnswer) return false;

    switch (questionType) {
      case 'multiple_choice':
        const options = questionData.options as Array<Record<string, unknown>> | undefined;
        if (options) {
          for (const option of options) {
            if (option.isCorrect && option.text === userAnswer) {
              return true;
            }
          }
        }
        return false;

      case 'specific_answer':
        const correctAnswer = questionData.correctAnswer as string || '';
        const normalizedUser = String(userAnswer).trim().toLowerCase();
        const normalizedCorrect = correctAnswer.trim().toLowerCase();
        return normalizedUser === normalizedCorrect;

      case 'book_reference':
        const correctBook = questionData.correctBook as string || '';
        return String(userAnswer).trim().toLowerCase() === correctBook.trim().toLowerCase();

      case 'narrator_reference':
        const correctNarrator = questionData.correctNarrator as string || '';
        return String(userAnswer).trim().toLowerCase() === correctNarrator.trim().toLowerCase();

      case 'hadith_attribution':
        const correctAttribution = questionData.correctAttribution as string || '';
        return String(userAnswer).trim().toLowerCase() === correctAttribution.trim().toLowerCase();

      case 'proof_text':
        const proofText = questionData.proofText as string || '';
        return String(userAnswer).trim().toLowerCase().includes(proofText.trim().toLowerCase());

      case 'fill_blank':
        const blanks = questionData.blanks as Array<Record<string, unknown>> | undefined;
        if (!blanks || !Array.isArray(userAnswer)) return false;
        
        for (let i = 0; i < blanks.length; i++) {
          const blank = blanks[i];
          const correctAnswer = String(blank.correctAnswer || '').trim().toLowerCase();
          const userText = String(userAnswer[i] || '').trim().toLowerCase();
          if (correctAnswer !== userText) return false;
        }
        return true;

      default:
        return false;
    }
  };

  const loadAttemptData = async () => {
    try {
      setIsLoading(true);
      
      const attemptRef = firestoreApi.getSubDocument(
        'student_test_attempts',
        groupId,
        'student_test_attempts',
        attemptId
      );
      const attemptData = await firestoreApi.getData(attemptRef);
      
      if (!attemptData) {
        console.error('❌ لم يتم العثور على المحاولة');
        return;
      }

      setAttempt({
        id: attemptId,
        testId: attemptData.testId as string || '',
        testTitle: attemptData.testTitle as string || 'اختبار بدون عنوان',
        studentName: attemptData.studentName as string | undefined,
        totalQuestions: attemptData.totalQuestions as number | undefined,
        finalScore: attemptData.finalScore as number | undefined,
        answers: attemptData.answers as Record<string, unknown> | undefined,
        modifications: attemptData.modifications as Record<string, unknown>[] | undefined,
        testData: attemptData.testData as Record<string, unknown> | undefined,
        groupId,
      });

      // استخراج الأسئلة من testData
      const testDataQuestions = (attemptData.testData as Record<string, unknown>)?.questions;
      console.log('📋 testDataQuestions:', testDataQuestions);
      console.log('📋 هل هي مصفوفة؟', Array.isArray(testDataQuestions));
      
      let questionsList: Question[] = [];
      
      // التحقق من نوع testDataQuestions
      if (Array.isArray(testDataQuestions)) {
        // إذا كانت مصفوفة
        questionsList = testDataQuestions.map((q, index) => ({
          id: index.toString(),
          data: q as Record<string, unknown>,
        }));
      } else if (testDataQuestions && typeof testDataQuestions === 'object') {
        // إذا كانت كائن (Map)
        questionsList = Object.entries(testDataQuestions).map(([key, value], index) => ({
          id: key,
          data: value as Record<string, unknown>,
        }));
      }
      
      console.log('📋 questionsList:', questionsList);
      console.log('📋 عدد الأسئلة:', questionsList.length);
      
      if (questionsList.length > 0) {
        setQuestions(questionsList);
        
        // تهيئة البيانات
        const initialAnswers = attemptData.answers as Record<string, unknown> || {};
        const initialPoints: Record<string, number> = {};
        
        questionsList.forEach((q) => {
          const qData = q.data;
          const questionId = q.id;
          const questionType = (qData.type as string) || 'multiple_choice';
          const userAnswer = initialAnswers[questionId];
          const points = (qData.points as number) || 0;
          
          // حساب الدرجة الأصلية بناءً على الإجابة
          const isCorrect = checkAnswerCorrectness(userAnswer, qData, questionType);
          initialPoints[questionId] = isCorrect ? points : 0;
        });
        
        setOriginalAnswers(initialAnswers);
        setEditedAnswers({ ...initialAnswers });
        setEarnedPoints(initialPoints);
      }

    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات المحاولة:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showResultsPreview = () => {
    // حساب النتائج الجديدة
    let newCorrectAnswers = 0;
    let totalEarnedPoints = 0;
    let totalPossiblePoints = 0;

    questions.forEach((q) => {
      const qData = q.data;
      const points = (qData.points as number) || 0;
      totalPossiblePoints += points;
      
      const earned = earnedPoints[q.id] || 0;
      totalEarnedPoints += earned;
      
      if (earned === points) {
        newCorrectAnswers++;
      }
    });

    const newPercentage = totalPossiblePoints > 0 
      ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100 * 10) / 10 
      : 0;

    const newIsPassed = newPercentage >= 60;

    const message = `معاينة النتائج:
    
الإجابات الصحيحة: ${newCorrectAnswers} / ${questions.length}
الدرجات: ${totalEarnedPoints.toFixed(1)} / ${totalPossiblePoints.toFixed(1)}
النسبة المئوية: ${newPercentage}%
النتيجة: ${newIsPassed ? 'نجح ✅' : 'راسب ❌'}

هل تريد حفظ هذه التعديلات؟`;

    return confirm(message);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!attempt) {
        console.error('❌ لا توجد محاولة للحفظ');
        return;
      }

      // إظهار معاينة النتائج
      if (!showResultsPreview()) {
        setIsSaving(false);
        return;
      }

      // حساب النتائج الجديدة
      let newCorrectAnswers = 0;
      let totalEarnedPoints = 0;
      let totalPossiblePoints = 0;

      questions.forEach((q) => {
        const qData = q.data;
        const points = (qData.points as number) || 0;
        totalPossiblePoints += points;
        
        const earned = earnedPoints[q.id] || 0;
        totalEarnedPoints += earned;
        
        if (earned === points) {
          newCorrectAnswers++;
        }
      });

      const newPercentage = totalPossiblePoints > 0 
        ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100 * 10) / 10 
        : 0;

      // حساب النتائج الأصلية
      const originalScore = attempt.finalScore || 0;
      const originalCorrectAnswers = Math.round(originalScore / ((totalPossiblePoints / questions.length) || 1));
      const originalPercentage = totalPossiblePoints > 0 
        ? Math.round((originalScore / totalPossiblePoints) * 100 * 10) / 10 
        : 0;

      // تحديث المحاولة في Firebase
      const attemptRef = firestoreApi.getSubDocument(
        'student_test_attempts',
        groupId,
        'student_test_attempts',
        attemptId
      );

      // إنشاء سجل التعديل
      const modification = {
        modifiedBy: 'admin', // يمكن استبدالها بمعلومات المستخدم الحالي
        modifiedAt: new Date().toISOString(),
        beforeModification: {
          finalScore: originalScore,
          correctAnswers: originalCorrectAnswers,
          percentage: originalPercentage,
          isPassed: originalPercentage >= 60,
          originalAnswers: originalAnswers,
        },
        afterModification: {
          finalScore: Math.round(totalEarnedPoints),
          correctAnswers: newCorrectAnswers,
          percentage: newPercentage,
          isPassed: newPercentage >= 60,
          modifiedAnswers: editedAnswers,
        },
      };

      // إضافة التعديل الجديد إلى مصفوفة التعديلات
      const existingModifications = attempt.modifications || [];
      const updatedModifications = [...existingModifications, modification];

      await firestoreApi.updateData(attemptRef, {
        answers: editedAnswers,
        finalScore: Math.round(totalEarnedPoints),
        correctAnswers: newCorrectAnswers,
        percentage: newPercentage,
        isPassed: newPercentage >= 60,
        modifications: updatedModifications,
        lastModified: new Date().toISOString(),
      });

      // إظهار رسالة نجاح
      alert('تم حفظ التعديلات بنجاح!');
      
      // العودة لصفحة تفاصيل المحاولة
      router.push(`/groups/${groupId}/students/${studentId}/attempts/${attemptId}`);
    } catch (error) {
      console.error('❌ خطأ في حفظ التعديلات:', error);
      alert('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleApproveCorrectAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionData = currentQuestion.data;
    const points = questionData.points as number || 0;
    
    // تعيين الدرجة الافتراضية
    setManualScore(points);
    
    // إظهار نافذة الاعتماد
    setShowApprovalDialog(true);
  };

  const handleCancelApproval = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion.id;
    
    // استعادة الإجابة الأصلية
    setEditedAnswers(prev => ({
      ...prev,
      [questionId]: originalAnswers[questionId]
    }));
    
    // إعادة تعيين الدرجة إلى 0
    setEarnedPoints(prev => ({
      ...prev,
      [questionId]: 0
    }));
    
    setHasChanges(true);
  };

  const handleConfirmApproval = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionData = currentQuestion.data;
    const questionType = (questionData.type as string) || 'multiple_choice';
    const questionId = currentQuestion.id;

    let correctAnswer: string | string[] = '';

    switch (questionType) {
      case 'multiple_choice':
        const options = questionData.options as Array<Record<string, unknown>> | undefined;
        if (options) {
          for (const option of options) {
            if (option.isCorrect) {
              correctAnswer = option.text as string;
              break;
            }
          }
        }
        break;
      case 'fill_blank':
        const blanks = questionData.blanks as Array<Record<string, unknown>> | undefined;
        if (blanks) {
          correctAnswer = blanks.map(b => (b.correctAnswer as string) || '');
        }
        break;
      case 'book_reference':
        correctAnswer = questionData.correctBook as string || '';
        break;
      case 'narrator_reference':
        correctAnswer = questionData.correctNarrator as string || '';
        break;
      case 'hadith_attribution':
        correctAnswer = questionData.correctAttribution as string || '';
        break;
      case 'proof_text':
        correctAnswer = questionData.proofText as string || '';
        break;
      case 'specific_answer':
        correctAnswer = questionData.correctAnswer as string || '';
        break;
    }

    if (correctAnswer !== undefined && correctAnswer !== '') {
      // حفظ الإجابة الصحيحة في حقل الإجابات المعدلة
      setEditedAnswers(prev => ({
        ...prev,
        [questionId]: correctAnswer
      }));
      
      // استخدام الدرجة اليدوية
      setEarnedPoints(prev => ({
        ...prev,
        [questionId]: manualScore
      }));
      
      setHasChanges(true);
      setShowApprovalDialog(false);
      
      // الانتقال للسؤال التالي بعد التعديل
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }, 300);
    }
  };

  const getCorrectAnswer = () => {
    if (!questions[currentQuestionIndex]) return 'غير محدد';
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionData = currentQuestion.data;
    const questionType = (questionData.type as string) || 'multiple_choice';

    switch (questionType) {
      case 'multiple_choice':
        const options = questionData.options as Array<Record<string, unknown>> | undefined;
        if (options) {
          for (const option of options) {
            if (option.isCorrect) {
              return option.text as string;
            }
          }
        }
        return 'غير محدد';
      case 'fill_blank':
        const blanks = questionData.blanks as Array<Record<string, unknown>> | undefined;
        if (blanks) {
          return blanks.map(b => (b.correctAnswer as string) || '').join(', ');
        }
        return 'غير محدد';
      case 'book_reference':
        return (questionData.correctBook as string) || 'غير محدد';
      case 'narrator_reference':
        return (questionData.correctNarrator as string) || 'غير محدد';
      case 'hadith_attribution':
        return (questionData.correctAttribution as string) || 'غير محدد';
      case 'proof_text':
        return (questionData.proofText as string) || 'غير محدد';
      case 'specific_answer':
        return (questionData.correctAnswer as string) || 'غير محدد';
      default:
        return 'غير محدد';
    }
  };

  const formatOriginalAnswer = () => {
    if (!questions[currentQuestionIndex]) return 'لم يُجب';
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionData = currentQuestion.data;
    const questionType = (questionData.type as string) || 'multiple_choice';
    const questionId = currentQuestion.id;
    const originalAnswer = originalAnswers[questionId];

    if (!originalAnswer) return 'لم يُجب';

    switch (questionType) {
      case 'fill_blank':
        if (Array.isArray(originalAnswer)) {
          return originalAnswer.join(', ');
        }
        return String(originalAnswer);
      default:
        return String(originalAnswer);
    }
  };

  const renderAnswerEditor = () => {
    if (!questions[currentQuestionIndex]) return null;
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionData = currentQuestion.data;
    const questionType = (questionData.type as string) || 'multiple_choice';
    const questionId = currentQuestion.id;

    switch (questionType) {
      case 'multiple_choice':
        const options = questionData.options as Array<Record<string, unknown>> | undefined;
        const selectedAnswer = editedAnswers[questionId];
        
        if (!options) return null;

        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              const optionText = option.text as string;
              const isCorrect = option.isCorrect as boolean;
              const isSelected = selectedAnswer === optionText;

              return (
                <button
                  key={index}
                  onClick={() => {
                    setEditedAnswers(prev => ({ ...prev, [questionId]: optionText }));
                    // حساب الدرجة تلقائياً
                    const answerIsCorrect = isCorrect;
                    const points = questionData.points as number || 0;
                    setEarnedPoints(prev => ({
                      ...prev,
                      [questionId]: answerIsCorrect ? points : 0
                    }));
                    setHasChanges(true);
                  }}
                  className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1 text-gray-900">{optionText}</span>
                    {isCorrect && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'fill_blank':
        const blanks = questionData.blanks as Array<Record<string, unknown>> | undefined;
        
        if (!blanks) return null;

        // معالجة الإجابة الحالية
        const currentAnswer = editedAnswers[questionId];
        let blankAnswers: string[] = [];
        
        if (Array.isArray(currentAnswer)) {
          blankAnswers = currentAnswer.map(a => a.toString());
        } else if (typeof currentAnswer === 'string') {
          blankAnswers = currentAnswer.split(',').map(a => a.trim());
        }
        
        // التأكد من أن العدد صحيح
        while (blankAnswers.length < blanks.length) {
          blankAnswers.push('');
        }
        blankAnswers = blankAnswers.slice(0, blanks.length);

        return (
          <div className="space-y-4">
            {blanks.map((blank, index) => {
              const position = blank.position as number ?? index;
              
              return (
                <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-semibold text-blue-700 mb-2">
                    الفراغ {position + 1}:
                  </label>
                  <input
                    type="text"
                    value={blankAnswers[position] || ''}
                    onChange={(e) => {
                      const newAnswers = [...blankAnswers];
                      newAnswers[position] = e.target.value;
                      setEditedAnswers(prev => ({ ...prev, [questionId]: newAnswers }));
                      
                      // حساب الدرجة تلقائياً
                      const isCorrect = checkAnswerCorrectness(newAnswers, questionData, questionType);
                      const points = questionData.points as number || 0;
                      setEarnedPoints(prev => ({
                        ...prev,
                        [questionId]: isCorrect ? points : 0
                      }));
                      
                      setHasChanges(true);
                    }}
                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                    placeholder={`أدخل الإجابة للفراغ ${position + 1}...`}
                    dir="rtl"
                  />
                  {(blank.correctAnswer !== undefined && blank.correctAnswer !== null && blank.correctAnswer !== '') ? (
                    <p className="text-xs text-gray-600 mt-1">
                      الإجابة الصحيحة: <span className="font-semibold text-green-600">{String(blank.correctAnswer)}</span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        );

      case 'specific_answer':
      case 'proof_text':
        return (
          <textarea
            value={editedAnswers[questionId] as string || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditedAnswers(prev => ({ ...prev, [questionId]: newValue }));
              
              // حساب الدرجة تلقائياً
              const isCorrect = checkAnswerCorrectness(newValue, questionData, questionType);
              const points = questionData.points as number || 0;
              setEarnedPoints(prev => ({
                ...prev,
                [questionId]: isCorrect ? points : 0
              }));
              
              setHasChanges(true);
            }}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            rows={4}
            placeholder="أدخل الإجابة..."
            dir="rtl"
          />
        );

      case 'book_reference':
      case 'narrator_reference':
      case 'hadith_attribution':
        return (
          <input
            type="text"
            value={editedAnswers[questionId] as string || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditedAnswers(prev => ({ ...prev, [questionId]: newValue }));
              
              // حساب الدرجة تلقائياً
              const isCorrect = checkAnswerCorrectness(newValue, questionData, questionType);
              const points = questionData.points as number || 0;
              setEarnedPoints(prev => ({
                ...prev,
                [questionId]: isCorrect ? points : 0
              }));
              
              setHasChanges(true);
            }}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            placeholder="أدخل الإجابة..."
            dir="rtl"
          />
        );

      default:
        return (
          <input
            type="text"
            value={editedAnswers[questionId] as string || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditedAnswers(prev => ({ ...prev, [questionId]: newValue }));
              
              // حساب الدرجة تلقائياً
              const isCorrect = checkAnswerCorrectness(newValue, questionData, questionType);
              const points = questionData.points as number || 0;
              setEarnedPoints(prev => ({
                ...prev,
                [questionId]: isCorrect ? points : 0
              }));
              
              setHasChanges(true);
            }}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            placeholder="أدخل الإجابة..."
            dir="rtl"
          />
        );
    }
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

  if (!attempt || questions.length === 0) {
    console.log('⚠️ فشل العرض:', { attempt: !!attempt, questionsLength: questions.length, isLoading });
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-2">المحاولة غير موجودة</p>
          <p className="text-sm text-gray-600 mb-4">
            attempt: {attempt ? 'موجود' : 'غير موجود'} | 
            عدد الأسئلة: {questions.length} | 
            isLoading: {isLoading ? 'نعم' : 'لا'}
          </p>
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
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span className="font-medium">جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-8">
            <h1 className="text-3xl font-bold mb-2">تعديل الإجابات</h1>
            <p className="text-white text-opacity-90">
              {attempt?.studentName || decodeURIComponent(studentId)} - {attempt?.testTitle || 'جاري التحميل...'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        {/* Questions List Toggle Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowQuestionsList(!showQuestionsList)}
            className="w-full px-4 py-3 bg-white rounded-xl shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium text-gray-700">قائمة الأسئلة</span>
              <span className="text-sm text-gray-500">({questions.length} سؤال)</span>
            </div>
            <svg className={`w-5 h-5 text-gray-500 transition-transform ${showQuestionsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Questions List */}
        {showQuestionsList && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">أسئلة الاختبار</h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 gap-2">
              {questions.map((q, index) => {
                const qPoints = earnedPoints[q.id] || 0;
                const qMaxPoints = (q.data.points as number) || 0;
                const isCorrect = qPoints >= qMaxPoints;
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`p-3 rounded-lg font-bold transition-all ${
                      isCurrent
                        ? 'bg-orange-500 text-white shadow-lg scale-110'
                        : isCorrect
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">تقدم الأسئلة</span>
                <span className="text-sm font-bold text-blue-600">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="border-r border-l border-gray-200 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">السؤال الحالي</span>
                <span className="text-lg font-bold text-gray-900">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">الدرجة الحالية: </span>
                <span className="text-lg font-bold text-green-600">
                  {Object.values(earnedPoints).reduce((sum, points) => sum + points, 0).toFixed(1)} / {questions.reduce((sum, q) => sum + ((q.data.points as number) || 0), 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        {questions.length > 0 && (() => {
          const currentQuestion = questions[currentQuestionIndex];
          if (!currentQuestion) return null;
          
          const questionData = currentQuestion.data;
          const questionType = (questionData.type as string) || 'multiple_choice';
          
          return (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6" key={currentQuestion.id}>
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold flex-shrink-0">
                  {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded mb-2 inline-block">
                    {questionType === 'narrator_reference' ? 'راوي' :
                     questionType === 'book_reference' ? 'كتاب' :
                     questionType === 'hadith_attribution' ? 'مخرج' :
                     questionType === 'multiple_choice' ? 'اختيار متعدد' :
                     questionType === 'fill_blank' ? 'املأ الفراغ' :
                     questionType === 'proof_text' ? 'دلل على (نص)' :
                     questionType === 'specific_answer' ? 'أجب عن' :
                     questionType}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">
                    {questionData.question as string}
                  </h2>
              {(questionData.hadithNumber && String(questionData.hadithNumber).trim() !== '') ? (
                <span className="inline-block mt-2 text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  حديث {String(questionData.hadithNumber)}
                </span>
              ) : null}
              {(questionData.hadithText && String(questionData.hadithText).trim() !== '') ? (
                <div className="mt-3 p-3 bg-gray-50 border-r-4 border-orange-500 rounded">
                  <p className="text-sm text-gray-700 italic leading-relaxed">
                    {String(questionData.hadithText)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Original Answer */}
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-red-600">إجابة الطالب الأصلية:</span>
            </div>
            <p className="text-gray-900 mb-3">{formatOriginalAnswer()}</p>
            
            {/* Show correct answer below student's answer */}
            <div className="mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-green-600">الإجابة الصحيحة:</span>
              </div>
              <p className="text-green-700 font-medium">{getCorrectAnswer()}</p>
            </div>
            
            {/* Show edited answer if exists and different from correct */}
            {(() => {
              const editedAnswer = editedAnswers[questions[currentQuestionIndex].id];
              const currentCorrectAnswer = getCorrectAnswer();
              const isMatch = editedAnswer && String(editedAnswer).trim() === String(currentCorrectAnswer).trim();
              
              if (editedAnswer && !isMatch) {
                return (
                  <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold text-yellow-600">⚠ الإجابة الحالية:</span>
                    </div>
                    <p className="text-yellow-700 font-medium">
                      {typeof editedAnswer === 'object' ? JSON.stringify(editedAnswer) : String(editedAnswer)}
                    </p>
                  </div>
                );
              }
              
              if (isMatch) {
                return (
                  <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold text-blue-600">✓ الإجابة الحالية مطابقة للإجابة الصحيحة</span>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>

          {/* Approve Correct Answer Button */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900">اعتماد الإجابة الصحيحة مباشرة</p>
                  <p className="text-sm text-gray-600">سيتم منح الدرجة الكاملة للسؤال</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApproveCorrectAnswer}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                اعتماد
              </button>
              <button
                onClick={handleCancelApproval}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                إلغاء الاعتماد
              </button>
            </div>
          </div>

          {/* Points Display */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">درجة السؤال الحالي:</span>
              <span className={`font-bold ${
                earnedPoints[questions[currentQuestionIndex].id] >= (questionData.points as number || 0)
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {earnedPoints[questions[currentQuestionIndex].id] || 0} / {(questionData.points as number) || 0}
              </span>
            </div>
          </div>

          {/* Answer Editor */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              محرر الإجابة الجديدة:
            </label>
            {renderAnswerEditor()}
          </div>

          {/* Correct Answer */}
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-green-600">الإجابة الصحيحة:</span>
            </div>
            <p className="text-gray-900">{getCorrectAnswer()}</p>
          </div>
        </div>
          );
        })()}

        {/* Navigation Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(earnedPoints).filter(points => points > 0).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">إجابات صحيحة</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(earnedPoints).reduce((sum, points) => sum + points, 0).toFixed(0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">نقاط الحالية</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((Object.values(earnedPoints).reduce((sum, points) => sum + points, 0) / 
                 (questions.reduce((sum, q) => sum + ((q.data.points as number) || 0), 0))) * 100)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">النسبة المئوية</div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              السابق
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                التالي
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">اعتماد الإجابة</h2>
                    <p className="text-sm text-white/80">حدد الدرجة المستحقة</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApprovalDialog(false)}
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
              {/* Current Question Info */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">السؤال الحالي: {currentQuestionIndex + 1} من {questions.length}</p>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">
                    {questions[currentQuestionIndex]?.data.question as string}
                  </p>
                </div>
              </div>

              {/* Score Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  الدرجة المستحقة
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    min="0"
                    max={questions[currentQuestionIndex]?.data.points as number || 0}
                    step="0.5"
                    value={manualScore}
                    onChange={(e) => setManualScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-2xl font-bold text-gray-900 transition-all"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>من {questions[currentQuestionIndex]?.data.points as number || 0} نقطة</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setManualScore(0)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  0
                </button>
                <button
                  onClick={() => setManualScore((questions[currentQuestionIndex]?.data.points as number || 0) / 2)}
                  className="px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors font-medium text-sm"
                >
                  نصف
                </button>
                <button
                  onClick={() => setManualScore(questions[currentQuestionIndex]?.data.points as number || 0)}
                  className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
                >
                  كامل
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalDialog(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-200 transition-all duration-200 active:scale-95"
                >
                  اعتماد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
