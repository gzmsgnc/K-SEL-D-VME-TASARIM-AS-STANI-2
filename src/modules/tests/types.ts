import { TestType, TestQuestionAnswer, ClientTestResult } from '../../types/test';

export * from '../../types/test';

export interface TestOption {
  id: string;
  textTr: string;
  associatedType: string; // e.g. 'Tip 1', 'Kurt', etc.
  weight: number;
}

export interface TestQuestion {
  id: string;
  order: number;
  questionTr: string;
  categoryTr?: string;
  options: TestOption[];
}

export interface TestEvaluationResult {
  primaryType: string;
  secondaryType?: string;
  dominantScores: Record<string, number>;
  interpretations: string[];
}
