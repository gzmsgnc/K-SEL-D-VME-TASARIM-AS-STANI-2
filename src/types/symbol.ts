/**
 * Sembol ve Sembol Kütüphanesi Veri Modelleri
 */

export type GeometryType =
  | 'SACRED_GEOMETRY'     // Kutsal Geometri (Metatron, Yaşam Çiçeği, Torus vb.)
  | 'ORGANIC_NATURAL'     // Doğal / Organik (Bitki, Hayvan, Element, Su vb.)
  | 'CELESTIAL_ASTRONOMY' // Astronomik / Göksel (Gezegen glifleri, Ay döngüsü, Takımyıldız)
  | 'ANCIENT_GLYPHIC'     // Kadim Glifler (Simya sembolleri, Rünler, Sümer/Mısır)
  | 'ABSTRACT_MINIMAL';   // Soyut Minimal Çizgiler

export interface SymbolDefinition {
  id: string;
  name: string;                   // Sembolün Adı (Türkçe)
  originalName?: string;          // Orijinal / Kültürel Adı
  originCulture: string;          // Köken Kültür (Kadim Mısır, Mezopotamya, İskandinav, vb.)
  geometryType: GeometryType;     // Geometrik sınıfı
  elementAssociation: string;     // Bağlantılı element
  keywords: string[];             // Anahtar kelimeler
  meaning: string;                // Derin ezoterik / felsefi anlamı
  tattooSuitability: {
    recommendedScales: ('SMALL' | 'MEDIUM' | 'LARGE')[];
    needleStyle: 'FINE_LINE' | 'SINGLE_NEEDLE' | 'BOLD_LINE' | 'DOTWORK';
    placementSuggestions: string[]; // Vücut yerleşim önerileri
  };
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
