/**
 * Test Sistemi Veri Modelleri
 * Danışan testlerinin (Enneagram, Totem, vb.) sonuçlarını ve cevaplarını yapılandırır.
 */

export type TestType = 'ENNEAGRAM' | 'ANIMAL_TOTEM' | 'ARCHETYPE_DISCOVERY';

export interface TestQuestionAnswer {
  questionId: string;
  selectedOptionId: string;
  weight: number;
}

export interface ClientTestResult {
  id: string;                     // Test kaydı ID
  clientId: string;               // Danışan kimliği
  testType: TestType;             // Test türü
  version: number;                // Versiyon
  completedAt: string;            // Tamamlanma tarihi
  answers: TestQuestionAnswer[];
  
  // Test Sonuç Verileri
  primaryType: string;            // Örn: 'Tip 4 - Bireyci' veya 'Şahin'
  secondaryType?: string;         // Örn: 'Kanat 5' veya 'Kurt'
  dominantScores: Record<string, number>;
  interpretations: string[];
}
