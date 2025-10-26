// نماذج الاختبارات الثابتة لكل فئة
// يمكن تعديل الأسئلة لاحقاً من Firebase

export interface TestTemplate {
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  passingScore: number;
  questions: Record<string, unknown>[];
}

export class TestTemplates {
  static readonly templates: Record<string, TestTemplate> = {
    'ج1ص': {
      "title": "المتفق عليه (1)",
      "description": "اختبار شامل للمتفق عليه (1)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج2ص': {
      "title": "المتفق عليه (2)",
      "description": "اختبار شامل للمتفق عليه (2)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج3ص': {
      "title": "المتفق عليه (3)",
      "description": "اختبار شامل للمتفق عليه (3)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج4ص': {
      "title": "المتفق عليه (4)",
      "description": "اختبار شامل للمتفق عليه (4)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج5ص': {
      "title": "مفردات البخاري",
      "description": "اختبار شامل لمفردات البخاري",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج6ص': {
      "title": "مفردات مسلم",
      "description": "اختبار شامل لمفردات مسلم",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج1س': {
      "title": "زوائد السنن (1)",
      "description": "اختبار شامل لزوائد السنن (1)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج2س': {
      "title": "زوائد السنن (2)",
      "description": "اختبار شامل لزوائد السنن (2)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج3س': {
      "title": "زوائد السنن (3)",
      "description": "اختبار شامل لزوائد السنن (3)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج4س': {
      "title": "زوائد السنن (4)",
      "description": "اختبار شامل لزوائد السنن (4)",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج1م': {
      "title": "زوائد المسانيد",
      "description": "اختبار شامل لزوائد المسانيد",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },

    'ج2م': {
      "title": "زوائد المعاجم والصحاح",
      "description": "اختبار شامل لزوائد المعاجم والصحاح",
      "duration": 100,
      "difficulty": "متوسط",
      "passingScore": 65,
      "questions": [],
    },
  };

  /// الحصول على مجلد اختبار حسب الفئة
  static getTemplate(category: string): TestTemplate | undefined {
    return this.templates[category];
  }

  /// الحصول على جميع الفئات المتاحة
  static getAvailableCategories(): string[] {
    return Object.keys(this.templates);
  }

  /// الحصول على عنوان المجلد
  static getTemplateTitle(category: string): string {
    return this.templates[category]?.title ?? 'مجلد غير محدد';
  }

  /// الحصول على وصف المجلد
  static getTemplateDescription(category: string): string {
    return this.templates[category]?.description ?? 'وصف غير متوفر';
  }

  /// الحصول على مدة المجلد
  static getTemplateDuration(category: string): number {
    return this.templates[category]?.duration ?? 120;
  }

  /// الحصول على صعوبة المجلد
  static getTemplateDifficulty(category: string): string {
    return this.templates[category]?.difficulty ?? 'متوسط';
  }

  /// الحصول على درجة النجاح
  static getTemplatePassingScore(category: string): number {
    return this.templates[category]?.passingScore ?? 60;
  }

  /// الحصول على أسئلة المجلد
  static getTemplateQuestions(category: string): Record<string, unknown>[] {
    return this.templates[category]?.questions ?? [];
  }

  /// الحصول على عدد الأسئلة في المجلد
  static getTemplateQuestionCount(category: string): number {
    return this.getTemplateQuestions(category).length;
  }

  /// الحصول على إجمالي النقاط في المجلد
  static getTemplateTotalPoints(category: string): number {
    const questions = this.getTemplateQuestions(category);
    return questions.reduce((sum, question) => sum + ((question.points as number) || 0), 0);
  }
}
