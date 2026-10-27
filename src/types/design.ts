/**
 * Dövme Tasarım ve Tarif Veri Modelleri
 * Bir danışanın birden fazla tasarım versiyonu ve dövme tarifi olabilir.
 */

export type TattooStyle =
  | 'FINE_LINE'             // İnce Çizgi / Minimalist
  | 'MICRO_REALISM'         // Mikro Gerçekçilik
  | 'SACRED_GEOMETRY'       // Kutsal Geometri / Mandallik
  | 'DOTWORK_WHIPSHADING'   // Noktalama ve Whip Shading
  | 'BLACKWORK_OCCULT'      // Blackwork & Okült İllüstrasyon
  | 'ETCHING_ENGRAVING'     // Gravür / Klasik Ahşap Baskı
  | 'WATERCOLOR_ABSTRACT';  // Suluboya / Soyut

export type BodyPlacement =
  | 'FOREARM_INNER'         // İç Ön Kol
  | 'FOREARM_OUTER'         // Dış Ön Kol
  | 'UPPER_ARM_BICEP'       // Üst Kol / Biceps
  | 'SHOULDER_BLADE'        // Kürek Kemiği
  | 'SPINE_CENTER'          // Omurga Hattı
  | 'RIBS_SIDE'             // Kaburga / Yan Gövde
  | 'CHEST_CENTER'          // Göğüs Ortası / Sternum
  | 'WRIST_INNER'           // İç Bilek
  | 'CALF'                  // Baldır
  | 'COLLARBONE';           // Köprücük Kemiği

export interface TattooRecipe {
  style: TattooStyle;
  recommendedPlacement: BodyPlacement;
  placementDescription: string;   // Anatomik akış ve yerleşim açıklaması
  recommendedDimensionsCm: {
    width: number;
    height: number;
  };
  colorProfile: 'MONOCHROME_BLACK' | 'BLACK_AND_GREY' | 'MINIMAL_RED_ACCENT' | 'MUTED_EARTH_TONES';
  colorRationale?: string;        // Renk profili ve sembolik gerekçesi
  primarySymbol?: string;         // Ana sembol
  secondarySymbols?: string[];    // İkincil semboller
  symbolCombinationRules?: string[]; // Sembollerin kompozisyondaki hiyerarşisi
  shadowTransformationTheme?: string; // Gölge arketipin dönüştürücü teması
  chakraSupportReflection?: string;   // Çakra desteğinin tasarıma yansıması
  totemAbstractionNotes?: string;     // Totem entegrasyonu veya analiz-yalnızca notu
  excludedElements?: string[];        // Hariç tutulan öğeler listesi
  artistVisualDirection?: string[];   // Tasarımcıya yönelik görsel yönlendirmeler
  keyComponents: string[];        // Dövmede yer alacak temel unsurlar ve semboller
  technicalAdviceForArtist: string[]; // Dövme sanatçısına yönelik teknik tavsiyeler (iğne no, gölgeleme derinliği vb.)
}

export interface AIPromptData {
  primaryPromptEn: string;        // Görsel üretim motoru için ana İngilizce prompt
  conceptPromptTr: string;        // Türkçe konsept açıklaması
  negativePrompt: string;         // İstenmeyen unsurlar (blur, ugly lines, low contrast, text watermark)
  aspectRatio: '1:1' | '3:4' | '9:16' | '16:9';
  artisticModifiers: string[];    // Sanatçı referansları, ışık ve doku belirteçleri
  seed?: number;
}

/**
 * Danışan Dövme Tasarımı
 */
export interface ClientTattooDesign {
  id: string;                     // Tasarım kimliği
  clientId: string;               // Danışan kimliği
  versionNumber: number;          // Versiyon (1, 2, 3...)
  title: string;                  // Tasarım Başlığı (örn: 'Gölge Şahin ve Kutsal Metatron Kompozisyonu')
  conceptStatement: string;       // Felsefi ve ruhsal konsept manifestosu
  recipe: TattooRecipe;           // Detaylı Dövme Tarifi
  aiPrompt: AIPromptData;         // Yapay Zekâ Görsel Üretim İstemleri
  createdAt: string;              // Oluşturulma tarihi
  updatedAt: string;
  notes?: string;                 // Tasarımcı / Danışman notları
}
