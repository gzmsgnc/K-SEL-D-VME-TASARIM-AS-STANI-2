import { TropicalNatalChart } from './astrology';

/**
 * Numeroloji Analiz Veri Modeli
 */
export interface NumerologyAnalysis {
  lifePathNumber: number;         // Yaşam Yolu Sayısı (Doğum tarihinden)
  destinyNumber: number;          // Kader / İfade Sayısı (Tam addan)
  soulUrgeNumber: number;         // Ruh Güdüsü / Kalp Arzusu Sayısı (Sesli harflerden)
  personalityNumber: number;      // Kişilik Sayısı (Sessiz harflerden)
  birthdayNumber: number;         // Doğum Günü Sayısı
  worldMissionNumber: number;     // Dünya Misyonu Sayısı (Yaşam Yolu + Kader Sayısı)
  karmicLessons: number[];        // Eksik harf / karmik dersler
  masterNumbers: number[];        // 11, 22, 33 gibi üstat sayılar
}

/**
 * Ebced Analiz Veri Modeli
 */
export interface EbcedAnalysis {
  clientNameValue: number;        // Danışan adının Ebced değeri
  motherNameValue: number;        // Anne adının Ebced değeri
  combinedTotal: number;          // Danışan + Anne toplam ebced değeri
  elementalResonance?: string;    // Ebced unsuru (Ateş, Toprak, Hava, Su)
  planetaryRuler?: string;        // Hükmeden göksel rezonans
  esmaResonance?: string[];       // Rezonanstaki Esma ve sembolik anlamları
}

/**
 * Çakra Analiz Veri Modeli
 */
export type ChakraName =
  | 'ROOT'          // Kök Çakra (Muladhara)
  | 'SACRAL'        // Sakral Çakra (Svadhisthana)
  | 'SOLAR_PLEXUS'  // Solar Pleksus (Manipura)
  | 'HEART'         // Kalp Çakrası (Anahata)
  | 'THROAT'        // Boğaz Çakrası (Vishuddha)
  | 'THIRD_EYE'     // Üçüncü Göz (Ajna)
  | 'CROWN';        // Tepe Çakra (Sahasrara)

export interface ChakraState {
  chakra: ChakraName;
  status: 'BALANCED' | 'UNDERACTIVE' | 'OVERACTIVE' | 'BLOCKED';
  score: number;                  // 1 - 10 ölçeği
  focusRecommendations: string[]; // Dövme sembolizminde güçlendirici öğeler
}

export interface ChakraAnalysis {
  chakras: ChakraState[];
  primaryDeficit?: ChakraName;    // Desteklenmesi gereken öncelikli çakra (Geriye dönük uyumluluk)
  deficitChakras?: ChakraName[];  // A45: Destek ihtiyacı / blokaj olan tüm çakralar (eşit en düşük skorlar dahil)
  dominantChakra?: ChakraName;    // En yüksek akışa sahip çakra
}

/**
 * Arketip Analiz Veri Modeli
 */
export interface ArchetypeAnalysis {
  unifiedArchetype: {
    primary: string;              // örn: Bilge, Savaşçı, Yaratıcı, Mistik
    secondary: string;
    description: string;
  };
  shadowArchetype: {
    shadowName: string;           // örn: Bastırılmış Mistik, Kontrolcü Savaşçı
    transformationalSymbol: string; // Dönüştürücü sembol önerisi
  };
}

/**
 * Hayvan Totemi Veri Modeli
 */
export interface AnimalTotemAnalysis {
  primaryTotem: string;           // Ana ruh hayvanı (örn: Kurt, Şahin, Yılan, Ayı)
  totemElement: string;           // Bağlantılı element
  spiritualMeaning: string;       // Anlam ve ruhsal rehberlik
  tattooAesthetics: string[];     // Dövme için anatomik/figüratif stil önerileri
}

/**
 * Bir Danışana Ait Merkezi Analiz Modeli
 * Birden fazla analiz versiyonunu saklayabilir.
 */
export interface ClientAnalysisRecord {
  id: string;                     // Analiz ID
  clientId: string;               // Bağlı danışan ID
  version: number;                // Versiyon numarası (1, 2, 3...)
  createdAt: string;
  updatedAt: string;
  
  // Modüller (İlerleyen aşamalarda motorlar tarafından doldurulacak şablon alanları)
  astrology?: TropicalNatalChart;
  numerology?: NumerologyAnalysis;
  ebced?: EbcedAnalysis;
  chakra?: ChakraAnalysis;
  archetype?: ArchetypeAnalysis;
  animalTotem?: AnimalTotemAnalysis;
  
  // Entegre Özet
  integratedSummary?: {
    dominantThemes: string[];
    coreKeywords: string[];
    recommendedSymbolicTones: string[];
    synthesizedNarrative?: string;
  };
}
