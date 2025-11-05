'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { QuestionData, QuestionType, formatUserAnswer, isAnswerCorrect } from '@/lib/scoreCalculator';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface AttemptDoc {
  studentName?: string;
  testTitle?: string;
  answers?: AnyRecord;
  testData?: { questions: AnyRecord | AnyRecord[] } & AnyRecord;
  finalScore?: number;
  totalQuestions?: number;
  percentage?: number;
  isPassed?: boolean;
  timeSpent?: number;
  modifications?: Array<AnyRecord>;
}

function toQuestionsMap(testData: AttemptDoc['testData']): AnyRecord {
  const q = testData?.questions as unknown;
  if (!q) return {};
  if (Array.isArray(q)) {
    const m: AnyRecord = {};
    q.forEach((item: AnyRecord, idx: number) => {
      const id = item?.id || String(idx);
      m[id] = item;
    });
    return m;
  }
  return q as AnyRecord;
}

export default function StudentEditAnswersPage() {
  const params = useParams<{ groupId: string; studentId: string; testId: string }>();
  const router = useRouter();
  const { groupId, studentId, testId } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState<AttemptDoc | null>(null);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [editorName, setEditorName] = useState('المستخدم');

  const [modifiedAnswers, setModifiedAnswers] = useState<AnyRecord>({});
  const [earnedPoints, setEarnedPoints] = useState<AnyRecord>({});
  const [earnedNotes, setEarnedNotes] = useState<AnyRecord>({});
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [narratorOptions, setNarratorOptions] = useState<string[]>([]);
  const [bookOptions, setBookOptions] = useState<string[]>([]);
  const [attributionOptions, setAttributionOptions] = useState<string[]>([]);

  // تعيين سريع للصواب/الخطأ
  const setAnswerCorrect = (qid: string) => {
    const q = questionsMap[qid] as QuestionData;
    const pts = Number(q?.points || 0);
    setEarnedPoints((prev: AnyRecord) => ({ ...prev, [qid]: pts }));
  };

  const setAnswerWrong = (qid: string) => {
    setEarnedPoints((prev: AnyRecord) => ({ ...prev, [qid]: 0 }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        // مطابق للمشروع الأصلي: student_test_attempts/{groupId}/student_test_attempts/{attemptId}
        const docRef = firestoreApi.getSubDocument('student_test_attempts', groupId, 'student_test_attempts', testId);
        const data = await firestoreApi.getData(docRef);
        const at = (data as AttemptDoc) || null;
        setAttempt(at);
        // تهيئة الإجابات المعدلة والملاحظات والنقاط من آخر تعديل إن وجد
        const latestMod = Array.isArray(at?.modifications) && at!.modifications!.length > 0
          ? at!.modifications![at!.modifications!.length - 1] as AnyRecord
          : null;

        if (latestMod?.afterModification?.modifiedAnswers) {
          setModifiedAnswers({ ...(latestMod.afterModification.modifiedAnswers as AnyRecord) });
        } else if (at?.answers) {
          setModifiedAnswers({ ...(at.answers as AnyRecord) });
        }

        if (latestMod?.afterModification?.earnedPoints) {
          setEarnedPoints({ ...(latestMod.afterModification.earnedPoints as AnyRecord) });
        }
        if (latestMod?.afterModification?.earnedNotes) {
          setEarnedNotes({ ...(latestMod.afterModification.earnedNotes as AnyRecord) });
        }

        // جلب القوائم المرجعية (الرواة/الكتب/المخرجين) كما في الأصل
        // narrators
        try {
          const narratorsRef = firestoreApi.getCollection('narrators');
          const narrDocs = await firestoreApi.getAllDocuments(narratorsRef);
          setNarratorOptions(narrDocs.map((d) => String(d.data()?.name || d.id)));
        } catch {}
        // books
        try {
          const booksRef = firestoreApi.getCollection('books');
          const bookDocs = await firestoreApi.getAllDocuments(booksRef);
          setBookOptions(bookDocs.map((d) => String(d.data()?.name || d.id)));
        } catch {}
        // attributions (المخرّجين)
        try {
          const attrRef = firestoreApi.getCollection('hadith_attributions');
          const attrDocs = await firestoreApi.getAllDocuments(attrRef);
          setAttributionOptions(attrDocs.map((d) => String(d.data()?.name || d.id)));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, studentId, testId]);

  const questionsMap = useMemo(() => toQuestionsMap(attempt?.testData), [attempt]);

  // حسابات فورية للملخص (بعد تعريف questionsMap)
  const totals = useMemo(() => {
    let totalEarned = 0;
    let totalPossible = 0;
    let correctCount = 0;
    Object.keys(questionsMap).forEach((qid) => {
      const q = questionsMap[qid] as QuestionData;
      const pts = Number(q?.points || 0);
      totalPossible += pts;
      const earned = Number(earnedPoints[qid] ?? 0);
      totalEarned += earned;
      if (earned > pts / 2) correctCount += 1;
    });
    const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
    return { totalEarned, totalPossible, correctCount, percentage };
  }, [questionsMap, earnedPoints]);

  // قائمة معرفات العرض (فلترة الخاطئة فقط عند الحاجة)
  const visibleQuestionIds = useMemo(() => {
    const ids = Object.keys(questionsMap);
    if (!showOnlyIncorrect) return ids;
    return ids.filter((qid) => {
      const q = questionsMap[qid] as QuestionData;
      const pts = Number(q?.points || 0);
      const earned = Number(earnedPoints[qid] ?? 0);
      return earned <= pts / 2; // يعتبر خاطئ أو غير مكتمل
    });
  }, [questionsMap, showOnlyIncorrect, earnedPoints]);

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(Math.max(visibleQuestionIds.length - 1, 0), i + 1));

  const onSave = async () => {
    if (!attempt) return;
    if (!authorized) return;
    setSaving(true);
    try {
      // حساب النسب والنجاح بناء على earnedPoints
      let totalEarned = 0;
      let totalPossible = 0;
      let correctCount = 0;
      Object.keys(questionsMap).forEach((qid) => {
        const q = questionsMap[qid] as QuestionData;
        const pts = Number(q?.points || 0);
        totalPossible += pts;
        const earned = Number(earnedPoints[qid] ?? (isAnswerCorrect(modifiedAnswers[qid], q, (q.type as QuestionType) || 'multiple_choice') ? pts : 0));
        totalEarned += earned;
        if (earned > pts / 2) correctCount += 1;
      });
      const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

      // تحميل attempt الحالي لتجميع modifications (مطابق لمسار Flutter)
      const docRef = firestoreApi.getSubDocument('student_test_attempts', groupId, 'student_test_attempts', testId);
      const current = (await firestoreApi.getData(docRef)) as AnyRecord | null;
      const currentMods: AnyRecord[] = (current?.modifications as AnyRecord[]) || [];

      const modification = {
        modifiedBy: editorName || 'المستخدم',
        modifiedAt: new Date().toISOString(),
        beforeModification: {
          correctAnswers: attempt.finalScore,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          originalAnswers: attempt.answers || {},
        },
        afterModification: {
          modifiedAnswers,
          earnedPoints,
          earnedNotes,
          isPassed: percentage >= 60,
        },
      };

      const updatedMods = [...currentMods, modification];

      await firestoreApi.updateData(docRef, {
        modifications: updatedMods,
        finalScore: correctCount,
        percentage,
        isPassed: percentage >= 60,
        answers: modifiedAnswers,
        totalEarnedPoints: totalEarned,
        totalPossiblePoints: totalPossible,
        updatedAt: new Date().toISOString(),
      });

      // حفظ إجابات الطالب المعدّلة لكل سؤال في student_answers/{groupId}/student_answers/{attemptId+questionId}
      for (const qid of Object.keys(questionsMap)) {
        const q = questionsMap[qid] as QuestionData;
        const pts = Number(q?.points || 0);
        const earned = Number(earnedPoints[qid] ?? (isAnswerCorrect(modifiedAnswers[qid], q, (q.type as QuestionType) || 'multiple_choice') ? pts : 0));
        const answerRef = firestoreApi.getSubDocument('student_answers', groupId, 'student_answers', `${testId}${qid}`);
        await firestoreApi.setData(answerRef, {
          questionId: qid,
          questionType: q.type || 'multiple_choice',
          studentAnswer: modifiedAnswers[qid],
          isCorrect: earned > pts / 2,
          pointsAwarded: earned,
          totalPoints: pts,
          reviewedAt: new Date().toISOString(),
          reviewedBy: editorName,
          studentId,
          attemptId: testId,
        });
      }

      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="p-6">
        <p className="text-red-600">تعذر جلب بيانات المحاولة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">تعديل الإجابات</h1>
          <p className="text-sm text-gray-600">{attempt.studentName} • {attempt.testTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!authorized || saving}
            onClick={onSave}
            className={`px-4 py-2 rounded ${authorized ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'} text-white`}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>

      {/* ملخص فوري */}
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-gray-500">الإجابات الصحيحة</div><div className="font-bold text-gray-900">{totals.correctCount}</div></div>
        <div><div className="text-gray-500">النقاط المكتسبة</div><div className="font-bold text-gray-900">{totals.totalEarned}/{totals.totalPossible}</div></div>
        <div><div className="text-gray-500">النسبة</div><div className="font-bold text-gray-900">{totals.percentage.toFixed(1)}%</div></div>
        <div><div className="text-gray-500">الحالة</div><div className={`font-bold ${totals.percentage >= 60 ? 'text-green-700' : 'text-red-700'}`}>{totals.percentage >= 60 ? 'نجح' : 'راسب'}</div></div>
      </div>

      {/* شريط أدوات التصفية والتنقل */}
      <div className="card flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-blue-600" checked={showOnlyIncorrect} onChange={(e) => { setShowOnlyIncorrect(e.target.checked); setCurrentIndex(0); }} />
            <span className="text-gray-800">عرض الأسئلة الخاطئة فقط</span>
          </label>
          <span className="text-gray-500">({visibleQuestionIds.length} سؤال)</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800" disabled={currentIndex <= 0}>سابق</button>
          <div className="text-gray-600">{visibleQuestionIds.length === 0 ? '0/0' : `${currentIndex + 1}/${visibleQuestionIds.length}`}</div>
          <button type="button" onClick={goNext} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800" disabled={currentIndex >= Math.max(visibleQuestionIds.length - 1, 0)}>التالي</button>
        </div>
      </div>

      {!authorized && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="font-bold text-amber-700 mb-2">تأكيد الهوية</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">الرقم السري</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded px-3 py-2 text-gray-900"
                placeholder="أدخل الرقم السري"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">اسم المعدل</label>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                className="border rounded px-3 py-2 text-gray-900"
                placeholder="اسم المعدل"
              />
            </div>
            <button
              onClick={() => setAuthorized(password === '123456')}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              تأكيد
            </button>
          </div>
          {password && password !== '123456' && (
            <div className="text-sm text-red-600 mt-2">الرقم السري غير صحيح</div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visibleQuestionIds.map((qid, idx) => {
          const q = questionsMap[qid] as QuestionData;
          const type = (q.type as QuestionType) || 'multiple_choice';
          const pts = Number(q.points || 0);

          return (
            <div key={qid} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700" aria-label={`سؤال ${idx + 1}`}>{idx + 1}</div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {type === 'multiple_choice' ? 'اختيار متعدد' :
                       type === 'fill_blank' ? 'املأ الفراغ' :
                       type === 'book_reference' ? 'اذكر الكتاب' :
                       type === 'narrator_reference' ? 'اذكر الراوي' :
                       type === 'hadith_attribution' ? 'نسبة الحديث' :
                       type === 'proof_text' ? 'دلل على (نص)' :
                       type === 'specific_answer' ? 'أجب عن' : 'غير محدد'}
                    </div>
                    <div className="text-gray-900 font-semibold leading-7">{q.question}</div>
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">{pts} نقطة</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1">إجابة الطالب (معدلة)</label>
                  <input
                    type="text"
                    value={String(modifiedAnswers[qid] ?? '')}
                    onChange={(e) => setModifiedAnswers((prev: AnyRecord) => ({ ...prev, [qid]: e.target.value }))}
                    className="border rounded px-3 py-2 text-gray-900"
                    placeholder="أدخل الإجابة"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => setAnswerCorrect(qid)} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">تعيين صحيح</button>
                    <button type="button" onClick={() => setAnswerWrong(qid)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">تعيين خطأ</button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1">النقاط المكتسبة</label>
                  <input
                    type="number"
                    step="0.5"
                    value={earnedPoints[qid] ?? ''}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const clamped = Math.max(0, Math.min(raw, pts));
                      setEarnedPoints((prev: AnyRecord) => ({ ...prev, [qid]: clamped }));
                    }}
                    className="border rounded px-3 py-2 text-gray-900"
                    placeholder={`0 - ${pts}`}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1">ملاحظة التصحيح</label>
                  <textarea
                    value={String(earnedNotes[qid] ?? '')}
                    onChange={(e) => setEarnedNotes((prev: AnyRecord) => ({ ...prev, [qid]: e.target.value }))}
                    className="border rounded px-3 py-2 text-gray-900 min-h-20"
                    placeholder="اكتب ملاحظة (اختياري)"
                  />
                </div>
              </div>

              {/* حقول مرجعية خاصة بأنواع الأسئلة: الراوي/الكتاب/المخرّج */}
              {(type === 'narrator_reference' || type === 'book_reference' || type === 'hadith_attribution') && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {type === 'narrator_reference' && (
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-600 mb-1">اختيار الراوي</label>
                      <select
                        className="border rounded px-3 py-2 text-gray-900"
                        value={String(modifiedAnswers[qid] ?? '')}
                        onChange={(e) => setModifiedAnswers((prev: AnyRecord) => ({ ...prev, [qid]: e.target.value }))}
                      >
                        <option value="">— اختر —</option>
                        {narratorOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {type === 'book_reference' && (
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-600 mb-1">اختيار الكتاب</label>
                      <select
                        className="border rounded px-3 py-2 text-gray-900"
                        value={String(modifiedAnswers[qid] ?? '')}
                        onChange={(e) => setModifiedAnswers((prev: AnyRecord) => ({ ...prev, [qid]: e.target.value }))}
                      >
                        <option value="">— اختر —</option>
                        {bookOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {type === 'hadith_attribution' && (
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-600 mb-1">اختيار المخرّج</label>
                      <select
                        className="border rounded px-3 py-2 text-gray-900"
                        value={String(modifiedAnswers[qid] ?? '')}
                        onChange={(e) => setModifiedAnswers((prev: AnyRecord) => ({ ...prev, [qid]: e.target.value }))}
                      >
                        <option value="">— اختر —</option>
                        {attributionOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500">الإجابة الأصلية: {formatUserAnswer(attempt.answers?.[qid], type)}</div>
            </div>
          );
        })}
      </div>

      {/* شريط حفظ ثابت أسفل الصفحة */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          disabled={!authorized || saving}
          onClick={onSave}
          className={`px-5 py-2 rounded shadow ${authorized ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'} text-white`}
        >
          {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>
    </div>
  );
}


