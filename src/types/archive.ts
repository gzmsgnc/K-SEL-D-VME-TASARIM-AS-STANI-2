import { Client } from './client';
import { ClientAnalysisRecord } from './analysis';
import { ClientTestResult } from './test';
import { ClientSymbolAnalysis } from './symbol';
import { ClientTattooDesign } from './design';
import { ClientTattooReport } from './report';

/**
 * Danışan Arşivi ve Bütünleşik Geçmiş İlişki Modeli
 * Her bir danışanın tüm veri ilişkilerini (analizler, tasarımlar, testler, raporlar)
 * tek bir tutarlı hiyerarşide bağlar.
 * Yeni versiyonlar eklendiğinde eski sonuçlar ASLA silinmez.
 */
export interface ClientArchiveRecord {
  client: Client;
  analyses: ClientAnalysisRecord[];
  testResults: ClientTestResult[];
  symbolAnalyses: ClientSymbolAnalysis[];
  designs: ClientTattooDesign[];
  reports: ClientTattooReport[];
  historySummary: {
    totalAnalysesCount: number;
    totalDesignsCount: number;
    lastInteractionAt: string;
  };
}
