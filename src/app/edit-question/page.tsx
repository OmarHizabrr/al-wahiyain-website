'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { ReferenceListsService } from '@/lib/referenceListsService';
import { TestTemplates } from '@/lib/testTemplates';
import Image from 'next/image';
import { useMessage } from '@/lib/messageService';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function EditQuestionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showMessage } = useMessage();
  
  const questionId = searchParams.get('questionId');
  const templateId = searchParams.get('templateId');
  const questionDataStr = searchParams.get('data');

  const isEditMode = !!questionId; // إذا كان هناك questionId فإننا في وضع التعديل
  const [isLoading, setIsLoading] = useState(isEditMode); // تحميل فقط عند التعديل
  const [isSaving, setIsSaving] = useState(false);

  // Basic fields
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('fill_blank'); // نوع افتراضي
  const [points, setPoints] = useState('2');
  const [hint, setHint] = useState('');
  const [hadithNumber, setHadithNumber] = useState('');
  const [page, setPage] = useState('');

  // Reference lists
  const [narrators, setNarrators] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [attributions, setAttributions] = useState<string[]>([]);

  // Type-specific fields
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>(['']);
  const [hadithText, setHadithText] = useState('');
  const [correctNarrator, setCorrectNarrator] = useState('');
  const [acceptableNarrators, setAcceptableNarrators] = useState<string[]>(['']);
  const [correctBook, setCorrectBook] = useState('');
  const [acceptableBooks, setAcceptableBooks] = useState<string[]>(['']);
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [proofText, setProofText] = useState('');
  const [correctAttribution, setCorrectAttribution] = useState('');
  const [acceptableAttributions, setAcceptableAttributions] = useState<string[]>(['']);

  useEffect(() => {
    // تحميل بيانات السؤال فقط عند التعديل
    if (isEditMode && questionDataStr) {
      try {
        const data = JSON.parse(questionDataStr);
        loadQuestionData(data);
      } catch (error) {
        console.error('Error parsing question data:', error);
        setIsLoading(false);
      }
    } else if (!isEditMode) {
      // عند الإضافة، لا نحتاج لتحميل بيانات
      setIsLoading(false);
    }
    
    // تحميل القوائم المرجعية دائماً
    loadReferenceLists();
  }, [questionDataStr, isEditMode]);

  const loadQuestionData = (data: Record<string, unknown>) => {
    setType((data.type as string) || 'fill_blank');
    setQuestion((data.question as string) || '');
    setPoints((data.points as number || 2).toString());
    setHint((data.hint as string) || '');
    setHadithNumber((data.hadithNumber as string) || '');
    setPage((data.page as string) || '');

    switch (data.type) {
      case 'specific_answer':
        setCorrectAnswer((data.correctAnswer as string) || '');
        setAcceptableAnswers((data.acceptableAnswers as string[]) || ['']);
        break;
      case 'narrator_reference':
        setHadithText((data.hadithText as string) || '');
        setCorrectNarrator((data.correctNarrator as string) || '');
        setAcceptableNarrators((data.acceptableNarrators as string[]) || ['']);
        break;
      case 'book_reference':
        setHadithText((data.hadithText as string) || '');
        setCorrectBook((data.correctBook as string) || '');
        setAcceptableBooks((data.acceptableBooks as string[]) || ['']);
        break;
      case 'multiple_choice':
        const optionsData = (data.options as Array<Record<string, unknown>>) || [];
        const loadedOptions = optionsData.map((opt: Record<string, unknown>) => (opt.text as string) || '');
        while (loadedOptions.length < 4) loadedOptions.push('');
        setOptions(loadedOptions);
        const correctIndex = optionsData.findIndex((opt: Record<string, unknown>) => opt.isCorrect === true);
        if (correctIndex >= 0) setCorrectOption(`option${correctIndex + 1}`);
        break;
      case 'proof_text':
        setHadithText((data.hadithText as string) || '');
        setProofText((data.proofText as string) || '');
        break;
      case 'hadith_attribution':
        setHadithText((data.hadithText as string) || '');
        setCorrectAttribution((data.correctAttribution as string) || '');
        setAcceptableAttributions((data.acceptableAttributions as string[]) || ['']);
        break;
    }

    setIsLoading(false);
  };

  const loadReferenceLists = async () => {
    try {
      const referenceService = ReferenceListsService.instance;
      const [narratorsList, booksList, attributionsList] = await Promise.all([
        referenceService.getNarrators(),
        referenceService.getBooks(),
        referenceService.getAttributions(),
      ]);
      setNarrators(narratorsList);
      setBooks(booksList);
      setAttributions(attributionsList);
    } catch (error) {
      console.error('Error loading reference lists:', error);
    }
  };

  const handleSave = async () => {
    if (!question.trim()) {
      showMessage('يرجى إدخال نص السؤال', 'warning');
      return;
    }

    if (type === 'multiple_choice' && !correctOption) {
      showMessage('يرجى اختيار الإجابة الصحيحة', 'warning');
      return;
    }

    if (!templateId) {
      showMessage('يرجى اختيار المجلد', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      const data: Record<string, unknown> = {
        question: question.trim(),
        type,
        points: parseInt(points) || 2,
        hint: hint.trim(),
        hadithNumber: hadithNumber.trim(),
        page: page.trim(),
        templateId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      switch (type) {
        case 'specific_answer':
          data.correctAnswer = correctAnswer.trim();
          data.acceptableAnswers = acceptableAnswers.filter(a => a.trim()).map(a => a.trim());
          break;
        case 'narrator_reference':
          data.hadithText = hadithText.trim();
          data.correctNarrator = correctNarrator.trim();
          data.acceptableNarrators = acceptableNarrators.filter(a => a.trim()).map(a => a.trim());
          break;
        case 'book_reference':
          data.hadithText = hadithText.trim();
          data.correctBook = correctBook.trim();
          data.acceptableBooks = acceptableBooks.filter(a => a.trim()).map(a => a.trim());
          break;
        case 'multiple_choice':
          data.options = options.filter(opt => opt.trim()).map((opt, index) => ({
            text: opt.trim(),
            isCorrect: correctOption === `option${index + 1}`,
          }));
          break;
        case 'proof_text':
          data.hadithText = hadithText.trim();
          data.proofText = proofText.trim();
          break;
        case 'hadith_attribution':
          data.hadithText = hadithText.trim();
          data.correctAttribution = correctAttribution.trim();
          data.acceptableAttributions = acceptableAttributions.filter(a => a.trim()).map(a => a.trim());
          break;
      }

      if (isEditMode && questionId) {
        // تعديل سؤال موجود
        const questionDocRef = firestoreApi.getSubDocument('questions', templateId!, 'questions', questionId);
        await firestoreApi.updateData(questionDocRef, data);
        showMessage('تم تحديث السؤال بنجاح', 'success');
      } else {
        // إضافة سؤال جديد
        const newId = firestoreApi.getNewId('questions');
        const questionDocRef = firestoreApi.getSubDocument('questions', templateId!, 'questions', newId);
        const finalData = { ...data, id: newId };
        await firestoreApi.setData(questionDocRef, finalData);
        showMessage('تم إضافة السؤال بنجاح', 'success');
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving question:', error);
      showMessage('حدث خطأ في حفظ السؤال', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (questionType: string): string => {
    const labels: Record<string, string> = {
      'fill_blank': 'املأ الفراغ',
      'specific_answer': 'إجابة محددة',
      'narrator_reference': 'اذكر الراوي',
      'book_reference': 'اذكر الكتاب',
      'multiple_choice': 'اختيار من متعدد',
      'proof_text': 'نص الدليل',
      'hadith_attribution': 'نسبة الحديث',
    };
    return labels[questionType] || 'غير محدد';
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image src="/logo.png" alt="منصة إختبارات الوحيين" width={50} height={50} className="rounded-lg" />
              <h1 className="mr-3 text-xl font-bold text-gray-900">
                {isEditMode ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
              </h1>
            </div>
            <button onClick={() => router.back()} className="btn-secondary">← إلغاء</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📝</span>
              <div>
                <h3 className="font-semibold text-gray-900">المجلد: {templateId ? TestTemplates.getTemplateTitle(templateId) : 'غير محدد'}</h3>
                <p className="text-sm text-gray-600">النوع: {getTypeLabel(type)}</p>
              </div>
            </div>
          </div>

          {/* Question Type - Show only when adding new question */}
          {!isEditMode && (
            <div>
              <label className="label">نوع السؤال *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input"
              >
                <option value="fill_blank">املأ الفراغ</option>
                <option value="specific_answer">إجابة محددة</option>
                <option value="narrator_reference">اذكر الراوي</option>
                <option value="book_reference">اذكر الكتاب</option>
                <option value="multiple_choice">اختيار من متعدد</option>
                <option value="proof_text">نص الدليل</option>
                <option value="hadith_attribution">نسبة الحديث</option>
              </select>
            </div>
          )}

          {/* Question Field */}
          <div>
            <label className="label">نص السؤال *</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="input min-h-[100px]" placeholder="اكتب السؤال..." />
          </div>

          {/* Points, Hadith Number, Page */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">النقاط *</label>
              <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">رقم الحديث</label>
              <input type="text" value={hadithNumber} onChange={(e) => setHadithNumber(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">الصفحة</label>
              <input type="text" value={page} onChange={(e) => setPage(e.target.value)} className="input" />
            </div>
          </div>

          {/* Hint */}
          <div>
            <label className="label">تلميح (اختياري)</label>
            <input type="text" value={hint} onChange={(e) => setHint(e.target.value)} className="input" placeholder="أدخل تلميح للمستخدم..." />
          </div>

          {/* Render type-specific fields based on the question type - simplified for now */}
          {renderTypeSpecificFields()}

          {/* Save Button */}
          <div className="pt-6">
            <button onClick={handleSave} disabled={isSaving} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? 'جاري الحفظ...' : isEditMode ? '💾 حفظ التعديلات' : '➕ إضافة السؤال'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  function renderTypeSpecificFields() {
    switch (type) {
      case 'specific_answer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الإجابة الصحيحة *
              </label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                placeholder="اكتب الإجابة الصحيحة..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                إجابات مقبولة أخرى (اختياري)
              </label>
              {acceptableAnswers.map((answer, index) => (
                <div key={index} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => {
                      const newAnswers = [...acceptableAnswers];
                      newAnswers[index] = e.target.value;
                      setAcceptableAnswers(newAnswers);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                    placeholder={`إجابة مقبولة ${index + 1}`}
                  />
                  {acceptableAnswers.length > 1 && (
                    <button
                      onClick={() => setAcceptableAnswers(acceptableAnswers.filter((_, i) => i !== index))}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAcceptableAnswers([...acceptableAnswers, ''])}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                + إضافة إجابة مقبولة
              </button>
            </div>
          </div>
        );

      case 'narrator_reference':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نص الحديث *
              </label>
              <textarea
                value={hadithText}
                onChange={(e) => setHadithText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 min-h-[80px]"
                placeholder="اكتب نص الحديث..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الراوي الصحيح *
              </label>
              <select
                value={correctNarrator}
                onChange={(e) => setCorrectNarrator(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
              >
                <option value="">اختر الراوي...</option>
                {narrators.map((narrator) => (
                  <option key={narrator} value={narrator}>
                    {narrator}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رواة مقبولون (اختياري)
              </label>
              {acceptableNarrators.map((narrator, index) => (
                <div key={index} className="mb-2 flex gap-2">
                  <select
                    value={narrator}
                    onChange={(e) => {
                      const newNarrators = [...acceptableNarrators];
                      newNarrators[index] = e.target.value;
                      setAcceptableNarrators(newNarrators);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                  >
                    <option value="">اختر راوي مقبول...</option>
                    {narrators.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {acceptableNarrators.length > 1 && (
                    <button
                      onClick={() => setAcceptableNarrators(acceptableNarrators.filter((_, i) => i !== index))}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAcceptableNarrators([...acceptableNarrators, ''])}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                + إضافة راوي مقبول
              </button>
            </div>
          </div>
        );

      case 'book_reference':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نص الحديث *
              </label>
              <textarea
                value={hadithText}
                onChange={(e) => setHadithText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 min-h-[80px]"
                placeholder="اكتب نص الحديث..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الكتاب الصحيح *
              </label>
              <select
                value={correctBook}
                onChange={(e) => setCorrectBook(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
              >
                <option value="">اختر الكتاب...</option>
                {books.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كتب مقبولة (اختياري)
              </label>
              {acceptableBooks.map((book, index) => (
                <div key={index} className="mb-2 flex gap-2">
                  <select
                    value={book}
                    onChange={(e) => {
                      const newBooks = [...acceptableBooks];
                      newBooks[index] = e.target.value;
                      setAcceptableBooks(newBooks);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                  >
                    <option value="">اختر كتاب مقبول...</option>
                    {books.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {acceptableBooks.length > 1 && (
                    <button
                      onClick={() => setAcceptableBooks(acceptableBooks.filter((_, i) => i !== index))}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAcceptableBooks([...acceptableBooks, ''])}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                + إضافة كتاب مقبول
              </button>
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ يجب تحديد الإجابة الصحيحة من الخيارات أدناه
              </p>
            </div>
            {options.map((option, index) => (
              <div key={index} className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                correctOption === `option${index + 1}` 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 bg-white'
              }`}>
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOption === `option${index + 1}`}
                    onChange={() => setCorrectOption(`option${index + 1}`)}
                    className="ml-2"
                  />
                  <label className="font-medium text-gray-700">
                    الخيار {index + 1} {correctOption === `option${index + 1}` && '(✓ صحيح)'}
                  </label>
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = e.target.value;
                    setOptions(newOptions);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                  placeholder={`اكتب الخيار ${index + 1}`}
                />
              </div>
            ))}
          </div>
        );

      case 'proof_text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نص الحديث *
              </label>
              <textarea
                value={hadithText}
                onChange={(e) => setHadithText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 min-h-[100px]"
                placeholder="اكتب نص الحديث..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نص الدليل *
              </label>
              <textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 min-h-[100px]"
                placeholder="اكتب نص الدليل..."
              />
            </div>
          </div>
        );

      case 'hadith_attribution':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نص الحديث *
              </label>
              <textarea
                value={hadithText}
                onChange={(e) => setHadithText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900 min-h-[80px]"
                placeholder="اكتب نص الحديث..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المخرج الصحيح *
              </label>
              <select
                value={correctAttribution}
                onChange={(e) => setCorrectAttribution(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
              >
                <option value="">اختر المخرج...</option>
                {attributions.map((attribution) => (
                  <option key={attribution} value={attribution}>
                    {attribution}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مخارج مقبولة (اختياري)
              </label>
              {acceptableAttributions.map((attribution, index) => (
                <div key={index} className="mb-2 flex gap-2">
                  <select
                    value={attribution}
                    onChange={(e) => {
                      const newAttributions = [...acceptableAttributions];
                      newAttributions[index] = e.target.value;
                      setAcceptableAttributions(newAttributions);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-gray-900"
                  >
                    <option value="">اختر مخرج مقبول...</option>
                    {attributions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {acceptableAttributions.length > 1 && (
                    <button
                      onClick={() => setAcceptableAttributions(acceptableAttributions.filter((_, i) => i !== index))}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAcceptableAttributions([...acceptableAttributions, ''])}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                + إضافة مخرج مقبول
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-500 text-center py-8">
            النوع غير مدعوم حالياً
          </div>
        );
    }
  }
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الصفحة...</p>
        </div>
      </div>
    }>
      <EditQuestionPageContent />
    </Suspense>
  );
}
