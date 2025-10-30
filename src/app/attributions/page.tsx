'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { ReferenceListsService } from '@/lib/referenceListsService';
import { TestTemplates } from '@/lib/testTemplates';
import { QuestionModelClass } from '@/types/question';
import Image from 'next/image';
import { useMessage } from '@/lib/messageService';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AttributionType {
  value: string | null;
  label: string;
  icon: string;
  color: string;
  count: number;
}

interface QuestionInfo {
  id: string;
  data: Record<string, unknown>;
  templateId: string;
}

export default function AttributionsManagementPage() {
  const router = useRouter();
  const referenceService = ReferenceListsService.instance;
  const { showMessage, showConfirm } = useMessage();

  const [allAttributions, setAllAttributions] = useState<string[]>([]);
  const [attributionQuestionCounts, setAttributionQuestionCounts] = useState<Record<string, number>>({});
  const [attributionQuestions, setAttributionQuestions] = useState<Record<string, QuestionInfo[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAttributions = async () => {
    setIsLoading(true);

    try {
      const attributions = await referenceService.getAttributions();
      const questionCounts: Record<string, number> = {};
      const questions: Record<string, QuestionInfo[]> = {};

      const templates = TestTemplates.getAvailableCategories();

      const futures = templates.map(async (templateId) => {
        try {
          const questionsSubCollection = firestoreApi.getSubCollectionRef(
            'questions',
            templateId,
            'questions'
          );
          const questionsSnapshot = await firestoreApi.getDocuments(questionsSubCollection);

          const questionFutures = questionsSnapshot.map(async (questionDoc) => {
            const questionData = questionDoc.data() as Record<string, unknown>;
            const question = new QuestionModelClass(questionData);

            const questionAttributions = new Set<string>();

            const correctAttribution = (questionData.correctAttribution as string) || '';
            if (correctAttribution !== '' && attributions.includes(correctAttribution)) {
              questionAttributions.add(correctAttribution);
            }

            const acceptableAttributions = (questionData.acceptableAttributions as string[]) || [];
            for (const acceptableAttribution of acceptableAttributions) {
              if (attributions.includes(acceptableAttribution)) {
                questionAttributions.add(acceptableAttribution);
              }
            }

            return {
              questionAttributions: questionAttributions,
              questionInfo: {
                id: questionDoc.id,
                data: questionData,
                templateId: templateId,
              },
            };
          });

          const questionResults = await Promise.all(questionFutures);

          for (const result of questionResults) {
            const questionAttributions = result['questionAttributions'] as Set<string>;
            const questionInfo = result['questionInfo'] as QuestionInfo;

            for (const attribution of questionAttributions) {
              questionCounts[attribution] = (questionCounts[attribution] || 0) + 1;
              if (!questions[attribution]) {
                questions[attribution] = [];
              }
              questions[attribution].push(questionInfo);
            }
          }
        } catch (error) {
          console.error(`Error processing template ${templateId}:`, error);
        }
      });

      await Promise.all(futures);

      setAllAttributions(attributions);
      setAttributionQuestionCounts(questionCounts);
      setAttributionQuestions(questions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading attributions:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttributions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAttributionTypes = (): AttributionType[] => {
    const attributionTypes: AttributionType[] = [
      { value: null, label: 'جميع المخارج', icon: 'all_inclusive', color: 'blue', count: 0 }
    ];

    const filteredAttributions = searchQuery === ''
      ? allAttributions
      : allAttributions.filter(attribution => 
          attribution.toLowerCase().includes(searchQuery.toLowerCase())
        );

    for (const attribution of filteredAttributions) {
      const questionCount = attributionQuestionCounts[attribution] || 0;
      attributionTypes.push({
        value: attribution,
        label: attribution,
        icon: 'link',
        color: 'teal',
        count: questionCount,
      });
    }

    return attributionTypes;
  };

  const searchAttributions = (query: string) => {
    setSearchQuery(query);
  };

  const applyAttributionFilter = () => {
    // Apply filter logic if needed
  };

  const getFilteredQuestions = (): QuestionInfo[] => {
    let questions: QuestionInfo[] = [];

    if (selectedType === null) {
      questions = Object.values(attributionQuestions).flat();
    } else {
      questions = attributionQuestions[selectedType] || [];
    }

    if (searchQuery !== '') {
      questions = questions.filter(questionInfo => {
        const questionData = questionInfo.data;
        const questionText = (questionData.question as string || '').toLowerCase();
        const correctAttributionText = (questionData.correctAttribution as string || '').toLowerCase();
        return questionText.includes(searchQuery.toLowerCase()) ||
               correctAttributionText.includes(searchQuery.toLowerCase());
      });
    }

    return questions;
  };

  const editQuestion = async (questionInfo: QuestionInfo) => {
    const data = encodeURIComponent(JSON.stringify({
      ...questionInfo.data,
      id: questionInfo.id,
      templateId: questionInfo.templateId
    }));
    router.push(`/edit-question?questionId=${questionInfo.id}&templateId=${questionInfo.templateId}&data=${data}`);
  };

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
          loadAttributions();
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

  const getQuestionTypeColor = (type: string | undefined): string => {
    switch (type) {
      case 'fill_blank': return 'bg-blue-500';
      case 'specific_answer': return 'bg-green-500';
      case 'narrator_reference': return 'bg-purple-500';
      case 'book_reference': return 'bg-orange-500';
      case 'hadith_attribution': return 'bg-teal-500';
      case 'multiple_choice': return 'bg-indigo-500';
      case 'proof_text': return 'bg-brown-500';
      default: return 'bg-gray-500';
    }
  };

  const getQuestionTypeIcon = (type: string | undefined): string => {
    switch (type) {
      case 'fill_blank': return '✏️';
      case 'specific_answer': return '📝';
      case 'narrator_reference': return '👤';
      case 'book_reference': return '📚';
      case 'hadith_attribution': return '🔗';
      case 'multiple_choice': return '✅';
      case 'proof_text': return '📄';
      default: return '❓';
    }
  };

  const getQuestionTypeLabel = (type: string | undefined): string => {
    switch (type) {
      case 'fill_blank': return 'املأ الفراغ';
      case 'specific_answer': return 'إجابة محددة';
      case 'narrator_reference': return 'اذكر الراوي';
      case 'book_reference': return 'اذكر الكتاب';
      case 'hadith_attribution': return 'اذكر المخرج';
      case 'multiple_choice': return 'اختيار من متعدد';
      case 'proof_text': return 'نص الدليل';
      default: return 'غير محدد';
    }
  };

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
                إدارة المخرجيين
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={loadAttributions}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                🔄 تحديث البيانات
              </button>
              <button
                onClick={() => router.push('/home')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
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
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                البحث في المخارج والأسئلة
              </label>
              <input
                id="search"
                type="text"
                placeholder="ابحث في المخارج..."
                value={searchQuery}
                onChange={(e) => searchAttributions(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Attribution Filter */}
            <div>
              <label htmlFor="attribution-filter" className="block text-sm font-medium text-gray-700 mb-2">
                فلترة حسب المخرج
              </label>
              <select
                id="attribution-filter"
                value={selectedType || ''}
                onChange={(e) => {
                  setSelectedType(e.target.value || null);
                  applyAttributionFilter();
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
              >
                {getAttributionTypes().map((attribution) => (
                  <option key={attribution.value || 'all'} value={attribution.value || ''}>
                    {attribution.label} ({attribution.count})
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
                  {Object.values(attributionQuestions).flat().length}
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
                {selectedType === null ? 'لا توجد أسئلة للمخارج' : 'لا توجد أسئلة لهذا المخرج'}
              </h3>
              <p className="text-gray-500">
                {selectedType === null 
                  ? 'لم يتم العثور على أي أسئلة مرتبطة بالمخارج'
                  : `لم يتم العثور على أسئلة للمخرج: ${selectedType}`
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
                      <div className={`p-3 rounded-full text-white ${getQuestionTypeColor(questionData.type as string)}`}>
                        <span className="text-xl">{getQuestionTypeIcon(questionData.type as string)}</span>
                      </div>

                      {/* Question Content */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {questionData.question as string || 'سؤال بدون نص'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {TestTemplates.getTemplateTitle(questionInfo.templateId)}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            {getQuestionTypeLabel(questionData.type as string)}
                          </span>
                          {(questionData.correctAttribution as string) && (
                            <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                              🔗 {questionData.correctAttribution as string}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => editQuestion(questionInfo)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteQuestion(questionInfo)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
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
