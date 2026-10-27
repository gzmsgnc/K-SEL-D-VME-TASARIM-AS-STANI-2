import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { hasActualModuleResults } from '../../core/clientDataAdapter';
import {
  RecipeModulePreparation,
  RecipeGenerationOptions,
  GenerateRecipeResult,
} from './types';
import { generateTattooRecipeFromAnalyses } from './recipeCalculationEngine';

/**
 * Dövme Reçetesi Modülü Hazırlık ve Durum Değerlendirmesi
 * Danışanın analiz zincirindeki ön koşullarını (Numeroloji, Çakra, Arketip) inceler.
 */
export function prepareRecipeModule(
  client: Client,
  archive: ClientArchiveRecord | null
): RecipeModulePreparation {
  if (!client || !client.id) {
    return {
      clientId: '',
      status: 'INPUTS_MISSING',
      hasAstrology: false,
      hasNumerology: false,
      hasChakra: false,
      hasArchetype: false,
      hasEnneagram: false,
      hasTotem: false,
      statusMessageTr: 'Danışan seçilmedi veya kimlik geçersiz.',
      warningNotices: ['Lütfen önce geçerli bir danışan seçin.'],
      existingDesignCount: 0,
    };
  }

  const clientId = client.id;
  const isArchiveForClient = archive && archive.client && archive.client.id === clientId;

  const hasAstrology = isArchiveForClient ? hasActualModuleResults(archive, 'ASTROLOGY') : false;
  const hasNumerology = isArchiveForClient ? hasActualModuleResults(archive, 'NUMEROLOGY') : false;
  const hasChakra = isArchiveForClient ? hasActualModuleResults(archive, 'CHAKRA') : false;
  const hasArchetype = isArchiveForClient ? hasActualModuleResults(archive, 'ARCHETYPE') : false;

  const clientTests = isArchiveForClient ? archive.testResults.filter((t) => t.clientId === clientId) : [];
  const hasEnneagram = clientTests.some((t) => t.testType === 'ENNEAGRAM' && Boolean(t.primaryType));
  const hasTotem = clientTests.some((t) => t.testType === 'ANIMAL_TOTEM' && Boolean(t.primaryType));

  const existingDesigns = isArchiveForClient ? archive.designs.filter((d) => d.clientId === clientId) : [];
  const existingDesignCount = existingDesigns.length;

  const warningNotices: string[] = [];

  if (!hasNumerology) {
    warningNotices.push('Numeroloji analizi (A12) tamamlanmalıdır.');
  }
  if (!hasChakra) {
    warningNotices.push('Çakra dengesi analizi (A13) tamamlanmalıdır.');
  }
  if (!hasArchetype) {
    warningNotices.push('Birleşik ve Gölge Arketip analizi (A14) tamamlanmalıdır.');
  }
  if (!hasAstrology) {
    warningNotices.push('Tropical Astroloji haritası henüz hesaplanmamış (isteğe bağlı zenginleştirici girdi).');
  }

  const isMandatoryComplete = hasNumerology && hasChakra && hasArchetype;

  let statusMessageTr: string;
  let status: RecipeModulePreparation['status'];

  if (!isMandatoryComplete) {
    status = 'INPUTS_MISSING';
    statusMessageTr = 'Dövme reçetesi için zorunlu modül çıktıları (Numeroloji, Çakra ve Arketip) henüz eksiksiz değil.';
  } else if (existingDesignCount > 0) {
    status = 'COMPLETED';
    statusMessageTr = `Bu danışan için ${existingDesignCount} adet kayıtlı dövme reçetesi/tasarımı mevcuttur. Yeni versiyon eklenebilir.`;
  } else {
    status = 'READY_TO_RUN';
    statusMessageTr = 'Tüm zorunlu analiz çıktıları hazır. Kişiye özel dövme reçetesi üretilmeye hazırdır.';
  }

  return {
    clientId,
    status,
    hasAstrology,
    hasNumerology,
    hasChakra,
    hasArchetype,
    hasEnneagram,
    hasTotem,
    statusMessageTr,
    warningNotices,
    existingDesignCount,
  };
}

/**
 * Danışanın gerçek analiz verilerinden dövme reçetesini ve AI tasarım promptunu üretir.
 * Kesinlikle sahte veya başka danışana ait veri kullanmaz.
 */
export function generateClientRecipe(
  client: Client,
  archive: ClientArchiveRecord | null,
  options?: RecipeGenerationOptions
): GenerateRecipeResult {
  const prep = prepareRecipeModule(client, archive);

  if (prep.status === 'INPUTS_MISSING' || !archive) {
    return {
      success: false,
      errorMessageTr: `Reçete üretimi engellendi: ${prep.warningNotices.join(' ')}`,
      warningNotices: prep.warningNotices,
    };
  }

  const clientId = client.id;
  const analysisRecord = archive.analyses.find((a) => a.clientId === clientId);

  if (!analysisRecord) {
    return {
      success: false,
      errorMessageTr: 'Danışana ait analiz kaydı arşivde bulunamadı.',
      warningNotices: ['Analiz kaydı eksik.'],
    };
  }

  const numerology = analysisRecord.numerology;
  const chakra = analysisRecord.chakra;
  const archetype = analysisRecord.archetype;
  const astrology = analysisRecord.astrology || null;

  if (!numerology || !chakra || !archetype) {
    return {
      success: false,
      errorMessageTr: 'Zorunlu analiz verilerinden biri veya birkaçı eksik olduğu için sahte reçete üretilmez.',
      warningNotices: prep.warningNotices,
    };
  }

  const clientTests = archive.testResults.filter((t) => t.clientId === clientId);
  const existingDesigns = archive.designs.filter((d) => d.clientId === clientId);
  const nextVersionNumber = existingDesigns.length + 1;

  try {
    const design = generateTattooRecipeFromAnalyses({
      client,
      astrology,
      numerology,
      chakra,
      archetype,
      testResults: clientTests,
      options,
      nextVersionNumber,
    });

    return {
      success: true,
      design,
      warningNotices: prep.warningNotices,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessageTr: err?.message || 'Dövme reçetesi üretilirken beklenmeyen bir hata oluştu.',
      warningNotices: prep.warningNotices,
    };
  }
}
