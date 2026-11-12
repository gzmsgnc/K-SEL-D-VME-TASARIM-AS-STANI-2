/**
 * Sembol ve Sembol Kütüphanesi Veri Modelleri
 */

export type GeometryType =
  | 'SACRED_GEOMETRY'     // Kutsal Geometri (Metatron, Yaşam Çiçeği, Torus vb.)
  | 'ORGANIC_NATURAL'     // Doğal / Organik (Bitki, Hayvan, Element, Su vb.)
  | 'CELESTIAL_ASTRONOMY' // Astronomik / Göksel (Gezegen glifleri, Ay döngüsü, Takımyıldız)
  | 'ANCIENT_GLYPHIC'     // Kadim Glifler (Simya sembolleri, Rünler, Sümer/Mısır)
  | 'ABSTRACT_MINIMAL';   // Soyut Minimal Çizgiler

export type SymbolCompositionRole =
  | 'PRIMARY_CORE'          // Ana görsel odak (%65 pozitif alan çıpası)
  | 'SECONDARY_LAYER'       // Tamamlayıcı katman (%35 çevre desteği)
  | 'ACCENT_DETAIL'         // Mikro vurgu ve geçiş detayı
  | 'CONNECTIVE_FLOW'       // Akış ve bağlantı çizgisi
  | 'BACKGROUND_FRAME';     // Çerçeve / arka plan geometrisi

export interface SymbolAnalysisAssociation {
  module: 'NUMEROLOGY' | 'CHAKRA' | 'ARCHETYPE' | 'ASTROLOGY' | 'TOTEM' | 'SACRED_BALANCE';
  target: string;            // Örn: 'Yaşam Yolu 4', 'Kök Çakra', 'Güneş Burcu', 'Bilge Arketipi'
  rationaleTr: string;       // İlişkilendirme gerekçesi
}

export interface SymbolDefinition {
  id: string;
  name: string;                   // Sembolün Adı (Türkçe)
  originalName?: string;          // Orijinal / Kültürel Adı
  originCulture: string;          // Köken Kültür (Kadim Mısır, Mezopotamya, İskandinav, vb.)
  geometryType: GeometryType;     // Geometrik sınıfı
  elementAssociation: string;     // Bağlantılı element
  keywords: string[];             // Anahtar kelimeler
  meaning: string;                // Derin ezoterik / felsefi anlamı (geriye dönük uyumluluk)
  tattooSuitability: {
    recommendedScales: ('SMALL' | 'MEDIUM' | 'LARGE')[];
    needleStyle: 'FINE_LINE' | 'SINGLE_NEEDLE' | 'BOLD_LINE' | 'DOTWORK';
    placementSuggestions: string[]; // Vücut yerleşim önerileri
  };

  // ADIM 2A: Genişletilmiş Profesyonel Sembol Bilgi Alanları
  visualDescriptionTr: string;    // Sembolün görsel tanımı
  geometricStructureTr: string;   // Geometrik çizim ve yapısal özellikleri
  traditionalMeaningTr: string;   // Geleneksel / tarihsel anlamı
  esotericMeaningTr: string;      // Modern ezoterik veya ruhsal yorum
  compositionRole: SymbolCompositionRole | string; // Dövme kompozisyonundaki olası işlevi
  culturalGuidelinesTr: string;   // Kültürel kullanım, bağlam ve dikkat edilmesi gereken hususlar
  analysisAssociations: SymbolAnalysisAssociation[]; // İlgili analiz modülleri ve bağlantı gerekçeleri
}

/**
 * Danışana Özel Sembol Analizi
 */
export interface ClientSymbolAnalysis {
  id: string;                     // Sembol analiz kaydı ID
  clientId: string;               // Danışan ID
  version: number;                // Versiyon
  selectedSymbols: {
    symbolId: string;
    symbolName: string;
    customMeaning: string;        // Bu danışanın haritası/hayatı için özel anlamı
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  }[];
  compositionNarrative: string;   // Sembollerin birlikte oluşturduğu kompozisyon hikayesi
  createdAt: string;
}
