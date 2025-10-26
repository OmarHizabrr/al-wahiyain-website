'use client';

import { useAuth } from '@/contexts/AuthContext';
import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { TestTemplates } from '@/lib/testTemplates';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Question {
  id: string;
  type: string;
  question: string;
  points: number;
  templateId?: string;
  [key: string]: unknown;
}

export default function QuestionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showMessage, showConfirm } = useMessage();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [templateQuestionCounts, setTemplateQuestionCounts] = useState<Record<string, number>>({});
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      console.log('Loading templates...');
      
      // استخدام القوالب الثابتة من TestTemplates
      const templateIds = TestTemplates.getAvailableCategories();
      console.log('Template IDs:', templateIds);
      setTemplates(templateIds);

      // جلب عدد الأسئلة لكل مجلد من Firebase
      const counts: Record<string, number> = {};
      let totalCount = 0;

      for (const templateId of templateIds) {
        try {
          const questionsRef = firestoreApi.getSubCollection(
            'questions',
            templateId,
            'questions'
          );
          const questionsDocs = await firestoreApi.getDocuments(questionsRef);
          // العدد يأتي من Firebase
          counts[templateId] = questionsDocs.length;
          totalCount += questionsDocs.length;
          console.log(`Template ${templateId}: ${questionsDocs.length} questions from Firebase`);
        } catch (error) {
          console.error(`Error loading questions for template ${templateId}:`, error);
          counts[templateId] = 0;
        }
      }

      setTemplateQuestionCounts(counts);
      setTotalQuestionsCount(totalCount);
      console.log('Templates loaded:', templateIds.length);
    } catch (error) {
      console.error('Error loading templates:', error);
      showMessage('فشل في تحميل المجلدات', 'error');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      loadTemplates();
    }
  }, [user, loading, router, loadTemplates]);

  const loadQuestions = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const questionsRef = firestoreApi.getSubCollection(
        'questions',
        selectedTemplate,
        'questions'
      );
      const docs = await firestoreApi.getDocuments(questionsRef);
      
      let filteredQuestions = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];

      // Apply type filter
      if (selectedType) {
        filteredQuestions = filteredQuestions.filter(q => q.type === selectedType);
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredQuestions = filteredQuestions.filter(q => 
          q.question.toLowerCase().includes(query) ||
          getTypeLabel(q.type).toLowerCase().includes(query)
        );
      }

      setQuestions(filteredQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate, selectedType, searchQuery]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const deleteQuestion = async (questionId: string) => {
    showConfirm(
      'هل أنت متأكد من حذف هذا السؤال؟',
      async () => {
        try {
          const questionRef = firestoreApi.getSubDocument(
            'questions',
            selectedTemplate,
            'questions',
            questionId
          );
          await firestoreApi.deleteData(questionRef);
          loadQuestions();
          // تحديث عدد الأسئلة في المجلد
          setTemplateQuestionCounts(prev => ({
            ...prev,
            [selectedTemplate]: (prev[selectedTemplate] || 0) - 1
          }));
          setTotalQuestionsCount(prev => prev - 1);
          showMessage('تم حذف السؤال بنجاح', 'success');
        } catch (error) {
          console.error('Error deleting question:', error);
          showMessage('حدث خطأ أثناء حذف السؤال', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'fill_blank': 'املأ الفراغ',
      'specific_answer': 'إجابة محددة',
      'narrator_reference': 'اذكر الراوي',
      'book_reference': 'اذكر الكتاب',
      'multiple_choice': 'اختيار متعدد',
      'proof_text': 'نص الدليل',
      'hadith_attribution': 'نسبة الحديث',
    };
    return types[type] || 'غير محدد';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'fill_blank': 'bg-blue-100 text-blue-800',
      'specific_answer': 'bg-green-100 text-green-800',
      'narrator_reference': 'bg-purple-100 text-purple-800',
      'book_reference': 'bg-orange-100 text-orange-800',
      'multiple_choice': 'bg-teal-100 text-teal-800',
      'proof_text': 'bg-brown-100 text-brown-800',
      'hadith_attribution': 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/home')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">إدارة الأسئلة</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">📚</span>
              </div>
              <div className="mr-4">
                <h3 className="text-lg font-semibold text-gray-900">إجمالي المجلدات</h3>
                <p className="text-3xl font-bold text-blue-600">{templates.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">❓</span>
              </div>
              <div className="mr-4">
                <h3 className="text-lg font-semibold text-gray-900">إجمالي الأسئلة</h3>
                <p className="text-3xl font-bold text-green-600">{totalQuestionsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📁 المجلدات</h2>
            {isLoadingTemplates ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3 text-gray-600">جاري تحميل المجلدات من Firebase...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-gray-600 text-lg mb-4">لا توجد مجلدات متاحة</p>
                <p className="text-gray-500 text-sm">يرجى إضافة مجلدات في Firebase تحت مجموعة questions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate === template
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <span className="text-2xl">📁</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{TestTemplates.getTemplateTitle(template)}</h3>
                          <p className="text-xs text-gray-500">{template}</p>
                          <p className="text-sm text-gray-600">
                            {templateQuestionCounts[template] || 0} سؤال
                          </p>
                        </div>
                      </div>
                      {selectedTemplate === template && (
                        <div className="bg-blue-500 text-white rounded-full p-1">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        {selectedTemplate && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="ابحث في الأسئلة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="fill_blank">املأ الفراغ</option>
                  <option value="specific_answer">إجابة محددة</option>
                  <option value="narrator_reference">اذكر الراوي</option>
                  <option value="book_reference">اذكر الكتاب</option>
                  <option value="multiple_choice">اختيار متعدد</option>
                  <option value="proof_text">نص الدليل</option>
                  <option value="hadith_attribution">نسبة الحديث</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        {selectedTemplate && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-600 text-lg">لا توجد أسئلة في هذا المجلد</p>
              </div>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(question.type)}`}>
                            {getTypeLabel(question.type)}
                          </span>
                          <span className="text-sm text-gray-500">{question.points} نقاط</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{question.question}</h3>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const data = encodeURIComponent(JSON.stringify({
                            ...question,
                            templateId: selectedTemplate
                          }));
                          router.push(`/edit-question?questionId=${question.id}&templateId=${selectedTemplate}&data=${data}`);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Question Button */}
        {selectedTemplate && (
          <div className="fixed bottom-8 right-8">
            <button
              onClick={() => router.push(`/edit-question?templateId=${selectedTemplate}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-full shadow-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة سؤال
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
