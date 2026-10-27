import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ChakraAnalysis } from '../../types/analysis';
import { hasActualModuleResults } from '../../core/clientDataAdapter';
import { ChakraModulePreparation, CalculateChakraResult } from './types';
import { calculateChakraAnalysisFromNumerology } from './chakraCalculationEngine';

/**
 * Seçili danışanın Çakra modülüne yönelik hesaplama hazırlığını ve doğrulamasını üretir.
 * Çakra analizi numeroloji matrisini zorunlu girdi olarak kabul eder.
 */
export function prepareChakraModule(
  client: Client,
  archive: ClientArchiveRecord | null
): ChakraModulePreparation {
  const warnings: string[] = [];

  // Danışanın kayıtlı numeroloji analizi var mı kontrol et
  const clientAnalysis = archive?.analyses.find((a) => a.clientId === client.id);
  const hasNumerology = Boolean(
    clientAnalysis?.numerology &&
    typeof clientAnalysis.numerology.lifePathNumber === 'number'
  );

  if (!hasNumerology) {
    warnings.push('Bu danışana ait kayıtlı Numeroloji matrisi bulunmamaktadır. Önce Numeroloji analizini (Aşama 8) çalıştırınız.');
  }

  // 1. Zaten hesaplanmış mı kontrol et
  const isCompleted = hasActualModuleResults(archive, 'CHAKRA');
  if (isCompleted) {
    return {
      clientId: client.id,
      status: 'COMPLETED',
      hasNumerology,
      statusMessageTr: '7 Temel Çakra analizi başarıyla hesaplanmış ve danışan arşivine kaydedilmiştir.',
      warningNotices: warnings,
    };
  }

  // 2. Girdiler hazır mı?
  if (hasNumerology) {
    return {
      clientId: client.id,
      status: 'READY_TO_RUN',
      hasNumerology: true,
      statusMessageTr: 'Numeroloji matrisi mevcut. Çakra enerji dengesi hesaplanabilir.',
      warningNotices: [],
    };
  }

  // 3. Eksik girdi
  return {
    clientId: client.id,
    status: 'INPUTS_MISSING',
    hasNumerology: false,
    statusMessageTr: 'Çakra analizi için öncelikle tamamlanmış bir Numeroloji analizi gereklidir.',
    warningNotices: warnings,
  };
}

/**
 * Seçili danışanın arşivindeki doğrulanmış Numeroloji verisini kullanarak
 * 7 temel çakranın enerji dengesini hesaplar.
 * 
 * Kesin İzolasyon: Yalnızca belirtilen danışanın kendi numeroloji çıktısını kullanır.
 */
export function calculateClientChakra(
  client: Client,
  archive: ClientArchiveRecord | null
): CalculateChakraResult {
  if (!client || !client.id) {
    return {
      success: false,
      errorMessageTr: 'Geçersiz danışan verisi.',
      warningNotices: ['Danışan kimliği eksik.'],
    };
  }

  const clientAnalysis = archive?.analyses.find((a) => a.clientId === client.id);
  const numerology = clientAnalysis?.numerology;

  if (!numerology || typeof numerology.lifePathNumber !== 'number') {
    return {
      success: false,
      errorMessageTr: 'Danışana ait kayıtlı Numeroloji analizi bulunamadı. Lütfen önce Numeroloji analizini tamamlayınız.',
      warningNotices: ['Numeroloji matrisi eksik.'],
    };
  }

  try {
    const chakra = calculateChakraAnalysisFromNumerology(numerology);
    return {
      success: true,
      chakra,
      warningNotices: [],
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessageTr: `Çakra hesaplama hatası: ${err?.message || 'Bilinmeyen hata'}`,
      warningNotices: [err?.message || 'Hesaplama motoru hatası'],
    };
  }
}

/**
 * Belirtilen danışanın arşivdeki kayıtlı çakra analizini güvenle çeker.
 * Başka bir danışanın verisini asla döndürmez.
 */
export function getStoredChakraAnalysis(
  archive: ClientArchiveRecord | null,
  clientId: string
): ChakraAnalysis | null {
  if (!archive || !clientId) return null;
  const analysis = archive.analyses.find((a) => a.clientId === clientId);
  return analysis?.chakra || null;
}
