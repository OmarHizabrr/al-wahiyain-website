// حاسبة الدرجات ومنفذ التحقق من صحة الإجابات

export type QuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'book_reference'
  | 'narrator_reference'
  | 'hadith_attribution'
  | 'proof_text'
  | 'specific_answer';

export interface QuestionData {
  id?: string;
  question?: string;
  type?: QuestionType;
  points?: number;
  options?: Array<{ text: string; isCorrect?: boolean }>; // multiple_choice
  blanks?: Array<{ correctAnswer: string }>; // fill_blank
  correctBook?: string; // book_reference
  correctNarrator?: string; // narrator_reference
  correctAttribution?: string; // hadith_attribution
  proofText?: string; // proof_text
  acceptableAnswers?: string[]; // specific_answer
  hadithNumber?: string;
  hadithText?: string;
}

function normalizeText(text: unknown): string {
  if (text == null) return '';
  return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isAnswerCorrect(
  userAnswer: unknown,
  question: QuestionData,
  type: QuestionType
): boolean {
  switch (type) {
    case 'multiple_choice': {
      const options = question.options || [];
      const correct = options.find((o) => o.isCorrect);
      if (!correct) return false;
      return normalizeText(userAnswer) === normalizeText(correct.text);
    }
    case 'fill_blank': {
      const blanks = question.blanks || [];
      if (Array.isArray(userAnswer)) {
        const ua = userAnswer.map((x) => normalizeText(x));
        const ca = blanks.map((b) => normalizeText(b.correctAnswer));
        if (ua.length !== ca.length) return false;
        for (let i = 0; i < ca.length; i++) {
          if (ua[i] !== ca[i]) return false;
        }
        return true;
      }
      return normalizeText(userAnswer) === normalizeText((blanks[0]?.correctAnswer) || '');
    }
    case 'book_reference':
      return normalizeText(userAnswer) === normalizeText(question.correctBook);
    case 'narrator_reference':
      return normalizeText(userAnswer) === normalizeText(question.correctNarrator);
    case 'hadith_attribution':
      return normalizeText(userAnswer) === normalizeText(question.correctAttribution);
    case 'specific_answer': {
      const list = question.acceptableAnswers || [];
      const ua = normalizeText(userAnswer);
      return list.some((a) => normalizeText(a) === ua);
    }
    case 'proof_text':
      // أسئلة الدليل نص حر — لا نتحقق تلقائياً
      return false;
    default:
      return false;
  }
}

export function formatUserAnswer(userAnswer: unknown, type: QuestionType): string {
  if (userAnswer == null) return 'لم يجب';
  if (type === 'fill_blank' && Array.isArray(userAnswer)) {
    return (userAnswer as unknown[]).map((x) => String(x)).join(', ');
  }
  return String(userAnswer);
}

export function getCorrectAnswerLabel(question: QuestionData, type: QuestionType): string {
  switch (type) {
    case 'multiple_choice': {
      const options = question.options || [];
      const correct = options.find((o) => o.isCorrect);
      return correct?.text || 'غير محدد';
    }
    case 'fill_blank':
      return (question.blanks || []).map((b) => b.correctAnswer).join(', ');
    case 'book_reference':
      return question.correctBook || 'غير محدد';
    case 'narrator_reference':
      return question.correctNarrator || 'غير محدد';
    case 'hadith_attribution':
      return question.correctAttribution || 'غير محدد';
    case 'proof_text':
      return question.proofText || '';
    case 'specific_answer':
      return (question.acceptableAnswers || []).join(' أو ');
    default:
      return 'غير محدد';
  }
}


