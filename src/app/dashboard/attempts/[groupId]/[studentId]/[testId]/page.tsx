'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { formatUserAnswer, getCorrectAnswerLabel, isAnswerCorrect, QuestionData, QuestionType } from '@/lib/scoreCalculator';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface AttemptDoc {
  studentName?: string;
  testTitle?: string;
  answers?: AnyRecord; // questionId -> answer
  testData?: { questions: AnyRecord | AnyRecord[] } & AnyRecord;
  finalScore?: number;
  totalQuestions?: number;
  percentage?: number;
  isPassed?: boolean;
  timeSpent?: number;
  attemptDate?: string;
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

function getLatestModification(modifications: Array<AnyRecord> = []): AnyRecord | null {
  if (!modifications || modifications.length === 0) return null;
  // تفضيل وجود earnedPoints/earnedNotes ثم الأحدث زمنياً
  let best = modifications[0];
  let bestScore = -1;
  let bestDate = 0;
  for (const mod of modifications) {
    const afterMod = mod?.afterModification || {};
    let score = 0;
    if (afterMod?.earnedNotes && Object.keys(afterMod.earnedNotes).length > 0) score += 10;
    if (afterMod?.earnedPoints && Object.keys(afterMod.earnedPoints).length > 0) score += 10;
    if (mod?.modifiedBy) score += 5;
    const dRaw = mod?.modifiedAt;
    const ts = dRaw ? (typeof dRaw === 'string' ? Date.parse(dRaw) : new Date(dRaw).getTime()) : 0;
    if (score > bestScore || (score === bestScore && ts > bestDate)) {
      bestScore = score;
      bestDate = ts;
      best = mod;
    }
  }
  return best || modifications[modifications.length - 1] || null;
}

export default function StudentTestDetailsPage() {
  const params = useParams<{ groupId: string; studentId: string; testId: string }>();
  const router = useRouter();
  const { groupId, studentId, testId } = params;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptDoc | null>(null);
  const [activeTab, setActiveTab] = useState<'original' | 'updated'>('original');

  useEffect(() => {
    const load = async () => {
      try {
        // مطابق للمشروع الأصلي: student_test_attempts/{groupId}/student_test_attempts/{attemptId}
        const docRef = firestoreApi.getSubDocument('student_test_attempts', groupId, 'student_test_attempts', testId);
        const data = await firestoreApi.getData(docRef);
        setAttempt((data as AttemptDoc) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, studentId, testId]);

  const latestMod = useMemo(() => getLatestModification((attempt?.modifications as AnyRecord[]) || []), [attempt]);

  const { header } = useMemo((): { header: null | { originalCorrect: number; originalPercentage: number; originalIsPassed: boolean; newCorrect: number; newPercentage: number; newIsPassed: boolean } } => {
    if (!attempt) return { header: null };
    // القيم الأصلية
    const before = (latestMod?.beforeModification || {}) as AnyRecord;
    const originalCorrect = (before.correctAnswers ?? attempt.finalScore) || 0;
    const originalPercentage = (before.percentage ?? attempt.percentage) || 0;
    const originalIsPassed = (before.isPassed ?? attempt.isPassed) || false;

    // القيم المحدثة
    let newCorrect = attempt.finalScore || 0;
    let newPercentage = attempt.percentage || 0;
    let newIsPassed = attempt.isPassed || false;

    const questionsMap = toQuestionsMap(attempt.testData);
    const after = (latestMod?.afterModification || {}) as AnyRecord;
    if (after.earnedPoints && typeof after.earnedPoints === 'object') {
      let totalEarned = 0;
      let totalPossible = 0;
      let correctCount = 0;
      Object.keys(questionsMap).forEach((qid) => {
        const q = questionsMap[qid] as QuestionData;
        const pts = Number(q?.points || 0);
        totalPossible += pts;
        const earned = Number(after.earnedPoints?.[qid] || 0);
        totalEarned += earned;
        if (earned > pts / 2) correctCount += 1;
      });
      newCorrect = correctCount;
      newPercentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      newIsPassed = after.isPassed ?? newPercentage >= 60;
    }
    return { header: { originalCorrect, originalPercentage, originalIsPassed, newCorrect, newPercentage, newIsPassed } };
  }, [attempt, latestMod]);

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

  const questionsMap = toQuestionsMap(attempt.testData);

  const originalAnswers: AnyRecord = (latestMod?.beforeModification?.originalAnswers as AnyRecord) || {};
  const modifiedAnswers: AnyRecord = (() => {
    const after = latestMod?.afterModification;
    if (after?.modifiedAnswers && typeof after.modifiedAnswers === 'object') {
      return { ...(after.modifiedAnswers as AnyRecord) };
    }
    return attempt.answers || {};
  })();

  const editorName: string = latestMod?.modifiedBy || 'غير محدد';

  const goToEdit = () => {
    router.push(`/dashboard/attempts/${groupId}/${studentId}/${testId}/edit`);
  };

  const improvementCount = header ? Math.max(0, header.newCorrect - header.originalCorrect) : 0;
  const hasImprovement = improvementCount > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">مقارنة الإجابات</h1>
          <p className="text-sm text-gray-600">الطالب: {attempt.studentName} • المعدل: {editorName}</p>
          <p className="text-xs text-gray-500">{attempt.testTitle}</p>
          {attempt.attemptDate && (
            <p className="text-xs text-gray-500">تاريخ المحاولة: {new Date(attempt.attemptDate).toLocaleDateString('ar-SA')}</p>
          )}
        </div>
        <button onClick={goToEdit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">تعديل الإجابات</button>
      </div>

      {header && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-gray-900">
              <p className="text-xs text-red-600 font-semibold">النتيجة الأصلية</p>
              <p className="text-lg font-bold text-red-700">{header.originalCorrect}/{attempt.totalQuestions}</p>
              <p className="text-sm font-bold text-red-600">{header.originalPercentage.toFixed(1)}%</p>
              <span className={`text-xs px-2 py-1 rounded ${header.originalIsPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{header.originalIsPassed ? 'نجح' : 'راسب'}</span>
            </div>
            <div className="hidden md:flex items-center justify-center text-gray-400">→</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-gray-900">
              <p className="text-xs text-green-600 font-semibold">النتيجة المعدلة</p>
              <p className="text-lg font-bold text-green-700">{header.newCorrect}/{attempt.totalQuestions}</p>
              <p className="text-sm font-bold text-green-600">{header.newPercentage.toFixed(1)}%</p>
              <span className={`text-xs px-2 py-1 rounded ${header.newIsPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{header.newIsPassed ? 'نجح' : 'راسب'}</span>
            </div>
          </div>
          {hasImprovement && (
            <div className="mt-3 flex justify-end">
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">+{improvementCount} إجابة</span>
            </div>
          )}
        </div>
      )}

      {!latestMod && (
        <div className="card bg-amber-50 border-amber-200 text-amber-800">
          <div className="text-sm font-bold mb-1">لا توجد تعديلات متاحة</div>
          <div className="text-sm">هذه المحاولة لم يتم تعديلها أو اعتمادها بعد</div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('original')} className={`px-3 py-2 rounded ${activeTab === 'original' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>الإجابات الأصلية</button>
        <button onClick={() => setActiveTab('updated')} className={`px-3 py-2 rounded ${activeTab === 'updated' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>الإجابات المحدثة</button>
      </div>

      <div className="space-y-3">
        {Object.keys(questionsMap).length === 0 ? (
          <div className="text-center text-gray-500 py-10">لا توجد بيانات أسئلة</div>
        ) : (
          (Object.keys(questionsMap)
            // في تبويب "الإجابات الأصلية" نعرض فقط الأسئلة التي لها إجابة أصلية
            .filter((qid) => (activeTab === 'original' ? originalAnswers[qid] !== undefined : true))
            ).map((qid, idx) => {
            const q = questionsMap[qid] as QuestionData;
            const type = (q.type as QuestionType) || 'multiple_choice';
            const baseAnswer = activeTab === 'original' ? originalAnswers[qid] : modifiedAnswers[qid];
            const correct = isAnswerCorrect(baseAnswer, q, type);
            const pts = Number(q.points || 0);

            let earnedPoints = 0;
            if (activeTab === 'updated' && latestMod?.afterModification?.earnedPoints) {
              earnedPoints = Number(latestMod.afterModification.earnedPoints[qid] || (correct ? pts : 0));
            } else {
              earnedPoints = correct ? pts : 0;
            }

            const originalAnswerLabel = formatUserAnswer(originalAnswers[qid], type);
            const modifiedAnswerLabel = formatUserAnswer(modifiedAnswers[qid], type);
            const hasChanged = activeTab === 'updated' && originalAnswerLabel !== modifiedAnswerLabel;

            // معالجة الملاحظات كما في المشروع الأصلي
            const notesMap = (latestMod?.afterModification?.earnedNotes as AnyRecord) || {};
            let rawNote = notesMap[qid];
            if (rawNote && typeof rawNote === 'object' && 'text' in rawNote) {
              rawNote = (rawNote as AnyRecord).text;
            }
            const noteText = (rawNote ?? '').toString().trim();
            const hasNote = activeTab === 'updated' && noteText.length > 0;

            return (
              <div key={qid} className={`card ${hasChanged ? 'border-amber-300' : correct ? 'border-green-300' : 'border-red-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${hasChanged ? 'bg-amber-50 text-amber-600' : correct ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`} aria-label={hasChanged ? 'معدل' : `سؤال ${idx + 1}`}>{hasChanged ? '✎' : idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {type === 'multiple_choice' ? 'اختيار متعدد' :
                           type === 'fill_blank' ? 'املأ الفراغ' :
                           type === 'book_reference' ? 'اذكر الكتاب' :
                           type === 'narrator_reference' ? 'اذكر الراوي' :
                           type === 'hadith_attribution' ? 'نسبة الحديث' :
                           type === 'proof_text' ? 'دلل على (نص)' :
                           type === 'specific_answer' ? 'أجب عن' : 'غير محدد'}
                        </span>
                        {q.hadithNumber && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">حديث {q.hadithNumber}</span>
                        )}
                        {hasChanged && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">معدل</span>
                        )}
                        {hasNote && (
                          <span className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-700">ملاحظة</span>
                        )}
                      </div>
                      <p className="text-gray-900 font-semibold mt-1 leading-7">{q.question}</p>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{earnedPoints}/{pts}</div>
                </div>

                {(type === 'book_reference' || type === 'narrator_reference') && q.hadithText && (
                  <div className="mt-3 p-3 border rounded bg-gray-50 text-gray-800 text-sm leading-7">{q.hadithText}</div>
                )}

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`p-3 rounded border ${correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className={`text-sm font-bold mb-1 ${correct ? 'text-green-700' : 'text-red-700'}`}>إجابة الطالب:</div>
                    <div className="text-sm text-gray-900">{formatUserAnswer(baseAnswer, type)}</div>
                  </div>
                  <div className="p-3 rounded border border-blue-200 bg-blue-50">
                    <div className="text-sm font-bold mb-1 text-blue-700">الإجابة الصحيحة:</div>
                    <div className="text-sm text-gray-900">{getCorrectAnswerLabel(q, type)}</div>
                  </div>
                </div>

                {hasNote && (
                  <div className="mt-3 p-3 rounded border border-cyan-200 bg-cyan-50 text-sm">
                    <div className="font-bold text-cyan-700 mb-1">ملاحظة التصحيح:</div>
                    <div className="text-gray-900">{noteText}</div>
                  </div>
                )}

                {activeTab === 'updated' && hasChanged && (
                  <div className="mt-3 p-3 rounded border border-amber-200 bg-amber-50 text-sm text-gray-900">
                    <div className="flex flex-col gap-1">
                      <div className="line-through text-red-700">الإجابة الأصلية: {originalAnswerLabel}</div>
                      <div className="font-bold text-green-700">الإجابة المعدلة: {modifiedAnswerLabel}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


