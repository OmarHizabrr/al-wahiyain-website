'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { ReferenceListsService } from '@/lib/referenceListsService';
import { TestTemplates } from '@/lib/testTemplates';
import { QuestionModelClass } from '@/types/question';
import Image from 'next/image';
import { useMessage } from '@/lib/messageService';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NarratorType {
  value: string | null;
  label: string;
  icon: string;
  color: string;
  count: number;
}

interface QuestionInfo {
  id: string;
  data: Record<string, any>;
  templateId: string;
}

export default function NarratorsManagementPage() {
  const router = useRouter();
  const referenceService = ReferenceListsService.instance;
  const { showMessage, showConfirm } = useMessage();

  const [allNarrators, setAllNarrators] = useState<string[]>([]);
  const [narratorQuestionCounts, setNarratorQuestionCounts] = useState<Record<string, number>>({});
  const [narratorQuestions, setNarratorQuestions] = useState<Record<string, QuestionInfo[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // قائمة الرواة مع الأيقونات والألوان (مع فلترة البحث)
  const getNarratorTypes = (): NarratorType[] => {
    const narratorTypes: NarratorType[] = [
      { value: null, label: 'جميع الرواة', icon: 'all_inclusive', color: 'blue', count: 0 }
    ];

    // فلترة الرواة حسب البحث إذا كان موجوداً
    const filteredNarrators = searchQuery === ''
      ? allNarrators
      : allNarrators.filter(narrator => 
          narrator.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // إضافة كل راوي مع عدد أسئلته
    for (const narrator of filteredNarrators) {
      const questionCount = narratorQuestionCounts[narrator] || 0;
      narratorTypes.push({
        value: narrator,
        label: narrator,
        icon: 'person',
        color: 'purple',
        count: questionCount,
      });
    }

    return narratorTypes;
  };

  useEffect(() => {
    loadNarrators();
  }, []);

  /// تحميل جميع الرواة من القائمة المرجعية
  const loadNarrators = async () => {
    setIsLoading(true);

    try {
      // جلب الرواة من القائمة المرجعية
      const narrators = await referenceService.getNarrators();
      const questionCounts: Record<string, number> = {};
      const questions: Record<string, QuestionInfo[]> = {};

      // استخدام قوالب الاختبارات المعرفة في TestTemplates
      const templates = TestTemplates.getAvailableCategories();

      // معالجة كل قالب اختبار بشكل متوازي لتحسين الأداء
      const futures = templates.map(async (templateId) => {
        try {
          // جلب أسئلة القالب الفرعية
          const questionsSubCollection = firestoreApi.getSubCollectionRef(
            'questions',
            templateId,
            'questions'
          );
          const questionsSnapshot = await firestoreApi.getDocuments(questionsSubCollection);

          // معالجة الأسئلة بشكل متوازي أيضاً
          const questionFutures = questionsSnapshot.map(async (questionDoc) => {
            const questionData = questionDoc.data() as Record<string, unknown>;
            const question = new QuestionModelClass(questionData);

            // جمع جميع الرواة المرتبطين بهذا السؤال (الصحيح والمقبولين)
            const questionNarrators = new Set<string>();

            // إضافة الراوي الصحيح إذا كان موجوداً
            if (question.correctNarrator && 
                question.correctNarrator !== '' &&
                narrators.includes(question.correctNarrator)) {
              questionNarrators.add(question.correctNarrator);
            }

            // إضافة الرواة المقبولين
            for (const acceptableNarrator of question.acceptableNarrators) {
              if (narrators.includes(acceptableNarrator)) {
                questionNarrators.add(acceptableNarrator);
              }
            }

            return {
              questionNarrators,
              questionInfo: {
                id: questionDoc.id,
                data: questionData,
                templateId: templateId,
              },
            };
          });

          // انتظار اكتمال معالجة جميع الأسئلة في هذا القالب
          const questionResults = await Promise.all(questionFutures);

          // تجميع النتائج
          for (const result of questionResults) {
            const questionNarrators = result.questionNarrators as Set<string>;
            const questionInfo = result.questionInfo as QuestionInfo;

            for (const narrator of questionNarrators) {
              questionCounts[narrator] = (questionCounts[narrator] || 0) + 1;
              if (!questions[narrator]) {
                questions[narrator] = [];
              }
              questions[narrator].push(questionInfo);
            }
          }
        } catch (error) {
          console.error(`Error processing template ${templateId}:`, error);
          // المتابعة مع القوالب الأخرى
        }
      });

      // انتظار اكتمال جميع العمليات المتوازية
      await Promise.all(futures);

      setAllNarrators(narrators);
      setNarratorQuestionCounts(questionCounts);
      setNarratorQuestions(questions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading narrators:', error);
      setIsLoading(false);
    }
  };

  /// البحث في الرواة مع الفلترة حسب الراوي المحدد
  const searchNarrators = (query: string) => {
    setSearchQuery(query.toLowerCase());
  };

  /// تطبيق الفلترة حسب الراوي المحدد
  const applyNarratorFilter = () => {
    // إعادة تحديث الواجهة
  };

  /// الحصول على الأسئلة المفلترة حسب الراوي المحدد والبحث
  const getFilteredQuestions = (): QuestionInfo[] => {
    let questions: QuestionInfo[];

    if (selectedType === null) {
      // إرجاع جميع الأسئلة من جميع الرواة
      questions = Object.values(narratorQuestions).flat();
    } else {
      // إرجاع أسئلة الراوي المحدد فقط
      questions = narratorQuestions[selectedType] || [];
    }

    // تطبيق البحث إذا كان موجوداً
    if (searchQuery !== '') {
      questions = questions.filter((questionInfo) => {
        const questionData = questionInfo.data;
        const questionText = (questionData.question || '').toLowerCase();
        const narratorText = (questionData.correctNarrator || '').toLowerCase();
        return questionText.includes(searchQuery) || narratorText.includes(searchQuery);
      });
    }

    return questions;
  };

  /// الحصول على عنوان المجلد من معرف القالب
  const getTemplateTitle = (templateId: string | null): string => {
    if (!templateId) return 'غير محدد';
    return TestTemplates.getTemplateTitle(templateId);
  };

  /// الحصول على لون نوع السؤال
  const getQuestionTypeColor = (type: string | null): string => {
    switch (type) {
      case 'fill_blank':
        return 'bg-blue-500';
      case 'specific_answer':
        return 'bg-green-500';
      case 'narrator_reference':
        return 'bg-purple-500';
      case 'book_reference':
        return 'bg-orange-500';
      case 'hadith_attribution':
        return 'bg-teal-500';
      case 'multiple_choice':
        return 'bg-indigo-500';
      case 'proof_text':
        return 'bg-brown-500';
      default:
        return 'bg-blue-500';
    }
  };

  /// الحصول على أيقونة نوع السؤال
  const getQuestionTypeIcon = (type: string | null): string => {
    switch (type) {
      case 'fill_blank':
        return '✏️';
      case 'specific_answer':
        return '📝';
      case 'narrator_reference':
        return '👤';
      case 'book_reference':
        return '📚';
      case 'hadith_attribution':
        return '🔗';
      case 'multiple_choice':
        return '❓';
      case 'proof_text':
        return '📄';
      default:
        return '❓';
    }
  };

  /// الحصول على تسمية نوع السؤال
  const getQuestionTypeLabel = (type: string | null): string => {
    switch (type) {
      case 'fill_blank':
        return 'املأ الفراغ';
      case 'specific_answer':
        return 'إجابة محددة';
      case 'narrator_reference':
        return 'اذكر الراوي';
      case 'book_reference':
        return 'اذكر الكتاب';
      case 'hadith_attribution':
        return 'اذكر المخرج';
      case 'multiple_choice':
        return 'اختيار من متعدد';
      case 'proof_text':
        return 'نص الدليل';
      default:
        return 'غير محدد';
    }
  };

  /// تعديل سؤال
  const editQuestion = async (questionInfo: QuestionInfo) => {
    // Navigate to edit page with question data
    const data = encodeURIComponent(JSON.stringify({
      ...questionInfo.data,
      id: questionInfo.id,
      templateId: questionInfo.templateId
    }));
    router.push(`/edit-question?questionId=${questionInfo.id}&templateId=${questionInfo.templateId}&data=${data}`);
  };

  /// حذف سؤال
  const deleteQuestion = async (questionInfo: QuestionInfo) => {
    showConfirm(
      'هل أنت متأكد من حذف هذا السؤال؟',
      async () => {
        try {
          const questionDocRef = firestoreApi.getSubDocument(
            'questions',
            questionInfo.templateId,
            'questions',
            questionInfo.id
          );
          await firestoreApi.deleteData(questionDocRef);
          showMessage('تم حذف السؤال بنجاح', 'success');
          loadNarrators();
        } catch (error) {
          console.error('Error deleting question:', error);
          showMessage('فشل في حذف السؤال', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  const filteredQuestions = getFilteredQuestions();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

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
                إدارة الرواة
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={loadNarrators}
                className="btn-primary"
              >
                🔄 تحديث البيانات
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            {/* Search Field */}
            <div>
              <label htmlFor="search" className="label">
                البحث في الرواة والأسئلة
              </label>
              <input
                id="search"
                type="text"
                placeholder="ابحث في الرواة..."
                value={searchQuery}
                onChange={(e) => searchNarrators(e.target.value)}
                className="input"
              />
            </div>

            {/* Narrator Filter */}
            <div>
              <label htmlFor="narrator-filter" className="label">
                فلترة حسب الراوي
              </label>
              <select
                id="narrator-filter"
                value={selectedType || ''}
                onChange={(e) => {
                  setSelectedType(e.target.value || null);
                  applyNarratorFilter();
                }}
                className="input"
              >
                {getNarratorTypes().map((narrator) => (
                  <option key={narrator.value || 'all'} value={narrator.value || ''}>
                    {narrator.label} ({narrator.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="mr-4">
                <h3 className="text-lg font-semibold text-gray-900">إجمالي الأسئلة</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {Object.values(narratorQuestions).flat().length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <div className="mr-4">
                <h3 className="text-lg font-semibold text-gray-900">الأسئلة المعروضة</h3>
                <p className="text-3xl font-bold text-green-600">
                  {filteredQuestions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-lg">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedType === null ? 'لا توجد أسئلة للرواة' : 'لا توجد أسئلة لهذا الراوي'}
              </h3>
              <p className="text-gray-500">
                {selectedType === null 
                  ? 'لم يتم العثور على أي أسئلة مرتبطة بالرواة'
                  : `لم يتم العثور على أسئلة للراوي: ${selectedType}`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredQuestions.map((questionInfo, index) => {
                const questionData = questionInfo.data;
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-start space-x-4 space-x-reverse">
                      {/* Question Icon */}
                      <div className={`p-3 rounded-full text-white ${getQuestionTypeColor(questionData.type)}`}>
                        <span className="text-xl">{getQuestionTypeIcon(questionData.type)}</span>
                      </div>

                      {/* Question Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {questionData.question || 'سؤال بدون نص'}
                        </h4>

                        <div className="space-y-2">
                          {/* Template Info */}
                          {questionInfo.templateId && (
                            <div className="inline-block">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                المجلد: {getTemplateTitle(questionInfo.templateId)}
                              </span>
                            </div>
                          )}

                          {/* Question Type */}
                          <div className="text-sm text-gray-600">
                            النوع: {getQuestionTypeLabel(questionData.type)}
                          </div>

                          {/* Correct Narrator */}
                          {questionData.correctNarrator && (
                            <div className="text-sm text-gray-600">
                              الراوي: {questionData.correctNarrator}
                            </div>
                          )}

                          {/* Acceptable Narrators */}
                          {questionData.acceptableNarrators && questionData.acceptableNarrators.length > 0 && (
                            <div className="text-sm text-gray-500">
                              رواة مقبولون: {questionData.acceptableNarrators.join(', ')}
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {questionData.difficulty && (
                              <span>الصعوبة: {questionData.difficulty}</span>
                            )}
                            {questionData.points && (
                              <span>النقاط: {questionData.points}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => editQuestion(questionInfo)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteQuestion(questionInfo)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
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
