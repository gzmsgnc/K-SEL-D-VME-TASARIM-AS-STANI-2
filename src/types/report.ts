/**
 * Raporlama Sistemi Veri Modelleri
 */

export interface ReportSection {
  sectionKey: 'PERSONAL_PROFILE' | 'ASTROLOGY' | 'NUMEROLOGY' | 'EBCED' | 'CHAKRA' | 'SYMBOLS' | 'TATTOO_RECIPE' | 'AI_PROMPT';
  title: string;
  summaryText: string;
  keyTakeaways: string[];
}

export interface ClientTattooReport {
  id: string;                     // Rapor ID
  clientId: string;               // Danışan kimliği
  version: number;                // Versiyon
  title: string;                  // Rapor Başlığı
  generatedAt: string;            // Üretilme zamanı
  sections: ReportSection[];
  confidentialityNote: string;    // Gizlilik ve kişiye özel kullanım uyarısı
}
