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

export interface TotemPriorityItem {
  rank: number;
  animal: string;
  rawScore: number;
  priorityScore: number;
  percentage: number;
  percentageFormatted: string;
  role: 'PRIMARY_DESIGN' | 'FIRST_ALTERNATIVE' | 'ALTERNATIVE' | 'OUTSIDE_RECOMMENDATION';
  roleLabelTr: string;
  temperamentRoleTr: string;
  isApprovedForDesign?: boolean;
  isDesignCandidate: boolean;
  elementTr: string;
  coreTraitTr: string;
  symbolicMeaningTr: string;
  tieBreakReasonTr?: string;
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

  // A62: Totem Hayvanı Tasarım Önceliklendirme Alanları
  totemPriorityRankings?: TotemPriorityItem[];
  rawScores?: Record<string, number>;
  priorityScores?: Record<string, number>;
  percentageScores?: Record<string, number>;
  selectedTotemAnimal?: string;
  rejectedTotemAnimals?: string[];
}

/**
 * A69: Tamamlanmamış Test Yanıtları Taslak Modeli
 * Kullanıcı testi çözerken her seçimde otomatik kaydedilir.
 * Danışan ve test türü bazında tam izolasyon sağlar.
 */
export interface ClientTestDraft {
  clientId: string;               // Danışan kimliği
  testType: TestType;             // Test türü ('ENNEAGRAM' | 'ANIMAL_TOTEM')
  answers: Record<string, string>; // Soru ID -> Seçilen opsiyon ID
  activeQuestionIndex?: number;   // Kaldığı aktif soru indeksi
  updatedAt: string;              // Son taslak güncellenme zamanı (ISO)
}
