import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ArchetypeAnalysis } from '../../types/analysis';
import { hasActualModuleResults } from '../../core/clientDataAdapter';
import { ArchetypeModulePreparation, CalculateArchetypeResult } from './types';
import { calculateArchetypeAnalysis } from './archetypeCalculationEngine';

/**
 * Seçili danışanın Arketip modülüne yönelik hesaplama hazırlığını ve doğrulamasını üretir.
 * Arketip analizi, tamamlanmış Numeroloji ve Çakra katmanlarını girdi olarak kabul eder.
 */
export function prepareArchetypeModule(
  client: Client,
  archive: ClientArchiveRecord | null
): ArchetypeModulePreparation {
  const warnings: string[] = [];

  const clientAnalysis = archive?.analyses.find((a) => a.clientId === client.id);
  const hasNumerology = Boolean(
    clientAnalysis?.numerology &&
    typeof clientAnalysis.numerology.lifePathNumber === 'number'
  );
  const hasChakra = Boolean(
    clientAnalysis?.chakra &&
    Array.isArray(clientAnalysis.chakra.chakras) &&
    clientAnalysis.chakra.chakras.length > 0
  );

  const enneagramTest = archive?.testResults.find(
    (t) => t.clientId === client.id && t.testType === 'ENNEAGRAM'
  );
  const hasEnneagram = Boolean(enneagramTest && enneagramTest.primaryType);

  if (!hasNumerology) {
    warnings.push('Bu danışana ait kayıtlı Numeroloji matrisi bulunmamaktadır (Aşama 8).');
  }

  if (!hasChakra) {
    warnings.push('Bu danışana ait kayıtlı Çakra dengesi analizi bulunmamaktadır (Aşama 9).');
  }

  // 1. Zaten hesaplanmış mı kontrol et
  const isCompleted = hasActualModuleResults(archive, 'ARCHETYPE');
  if (isCompleted) {
    return {
      clientId: client.id,
      status: 'COMPLETED',
      hasNumerology,
      hasChakra,
      hasEnneagram,
      statusMessageTr: 'Birleşik ve Gölge Arketip analizi başarıyla tamamlanmış ve arşive kaydedilmiştir.',
      warningNotices: warnings,
    };
  }

  // 2. Girdiler hazır mı?
  if (hasNumerology && hasChakra) {
    return {
      clientId: client.id,
      status: 'READY_TO_RUN',
      hasNumerology: true,
      hasChakra: true,
      hasEnneagram,
      statusMessageTr: hasEnneagram
        ? 'Numeroloji, Çakra ve Enneagram verileri hazır. Arketip çözümlemesi üretilebilir.'
        : 'Numeroloji ve Çakra verileri hazır. Arketip çözümlemesi üretilebilir.',
      warningNotices: [],
    };
  }

  // 3. Eksik girdi
  return {
    clientId: client.id,
    status: 'INPUTS_MISSING',
    hasNumerology,
    hasChakra,
    hasEnneagram,
    statusMessageTr: 'Arketip çözümlemesi için öncelikle Numeroloji ve Çakra analizlerinin tamamlanması gereklidir.',
    warningNotices: warnings,
  };
}

/**
 * Seçili danışanın arşivindeki doğrulanmış Numeroloji ve Çakra çıktılarını kullanarak
 * Birleşik ve Gölge arketip dinamiklerini hesaplar.
 * 
 * Kesin İzolasyon: Yalnızca ve sadece belirtilen danışanın verilerini kullanır.
 */
export function calculateClientArchetype(
  client: Client,
  archive: ClientArchiveRecord | null
): CalculateArchetypeResult {
  if (!client || !client.id) {
    return {
      success: false,
      errorMessageTr: 'Geçersiz danışan verisi.',
      warningNotices: ['Danışan kimliği eksik.'],
    };
  }

  const clientAnalysis = archive?.analyses.find((a) => a.clientId === client.id);
  const numerology = clientAnalysis?.numerology;
  const chakra = clientAnalysis?.chakra;

  if (!numerology || typeof numerology.lifePathNumber !== 'number') {
    return {
      success: false,
      errorMessageTr: 'Danışana ait geçerli Numeroloji analizi bulunamadı. Lütfen önce Numeroloji modülünü çalıştırınız.',
      warningNotices: ['Numeroloji matrisi eksik.'],
    };
  }

  if (!chakra || !Array.isArray(chakra.chakras) || chakra.chakras.length === 0) {
    return {
      success: false,
      errorMessageTr: 'Danışana ait geçerli Çakra analizi bulunamadı. Lütfen önce Çakra modülünü çalıştırınız.',
      warningNotices: ['Çakra dengesi eksik.'],
    };
  }

  const enneagramTest = archive?.testResults.find(
    (t) => t.clientId === client.id && t.testType === 'ENNEAGRAM'
  );

  try {
    const archetype = calculateArchetypeAnalysis(numerology, chakra, enneagramTest);
    return {
      success: true,
      archetype,
      warningNotices: [],
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessageTr: `Arketip hesaplama hatası: ${err?.message || 'Bilinmeyen hata'}`,
      warningNotices: [err?.message || 'Hesaplama motoru hatası'],
    };
  }
}

/**
 * Belirtilen danışanın arşivdeki kayıtlı arketip analizini çeker.
 * Başka bir danışanın verisini asla döndürmez.
 */
export function getStoredArchetypeAnalysis(
  archive: ClientArchiveRecord | null,
  clientId: string
): ArchetypeAnalysis | null {
  if (!archive || !clientId) return null;
  const analysis = archive.analyses.find((a) => a.clientId === clientId);
  return analysis?.archetype || null;
}
