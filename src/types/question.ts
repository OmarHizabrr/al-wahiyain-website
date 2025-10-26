export interface QuestionModel {
  id?: string;
  question: string;
  type: string;
  correctNarrator: string;
  acceptableNarrators: string[];
  difficulty?: string;
  points?: number;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class QuestionModelClass {
  public question: string;
  public type: string;
  public correctNarrator: string;
  public acceptableNarrators: string[];
  public difficulty?: string;
  public points?: number;
  public templateId?: string;
  public createdAt?: string;
  public updatedAt?: string;

  constructor(data: Record<string, any>) {
    this.question = data.question || '';
    this.type = data.type || '';
    this.correctNarrator = data.correctNarrator || '';
    this.acceptableNarrators = data.acceptableNarrators || [];
    this.difficulty = data.difficulty;
    this.points = data.points;
    this.templateId = data.templateId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toObject(): Record<string, any> {
    return {
      question: this.question,
      type: this.type,
      correctNarrator: this.correctNarrator,
      acceptableNarrators: this.acceptableNarrators,
      difficulty: this.difficulty,
      points: this.points,
      templateId: this.templateId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
