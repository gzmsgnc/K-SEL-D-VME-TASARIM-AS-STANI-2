import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ClientSymbolAnalysis } from '../../types/symbol';
import { hasActualModuleResults } from '../../core/clientDataAdapter';
import { generateId } from '../../utils/id';
import {
  SymbolModulePreparation,
  SymbolRecommendationOptions,
  SymbolRecommendationResult,
  VisualPromptOutput,
} from './types';
import { TattooStyle, BodyPlacement, TattooRecipe } from '../../types/design';
import { recommendSymbolsForClient, isSymbolExcluded } from './symbolRecommendationEngine';
import { generateUnifiedVisualPrompt } from './visualPromptEngine';
import { MASTER_SYMBOLS } from './masterSymbols';

/**
 * Sembol Modülü Hazırlık ve Durum Değerlendirmesi
 */
export function prepareSymbolModule(
  client: Client,
  archive: ClientArchiveRecord | null
): SymbolModulePreparation {
  if (!client || !client.id) {
    return {
      clientId: '',
      status: 'INPUTS_MISSING',
      hasAstrology: false,
      hasNumerology: false,
      hasChakra: false,
      hasArchetype: false,
      hasRecipe: false,
      statusMessageTr: 'Danışan seçilmedi veya kimlik geçersiz.',
      warningNotices: ['Lütfen önce geçerli bir danışan seçin.'],
      existingAnalysesCount: 0,
    };
  }

  const clientId = client.id;
  const isArchiveForClient = archive && archive.client && archive.client.id === clientId;

  const hasAstrology = isArchiveForClient ? hasActualModuleResults(archive, 'ASTROLOGY') : false;
  const hasNumerology = isArchiveForClient ? hasActualModuleResults(archive, 'NUMEROLOGY') : false;
  const hasChakra = isArchiveForClient ? hasActualModuleResults(archive, 'CHAKRA') : false;
  const hasArchetype = isArchiveForClient ? hasActualModuleResults(archive, 'ARCHETYPE') : false;
  const hasRecipe = isArchiveForClient ? (archive.designs.filter((d) => d.clientId === clientId).length > 0) : false;

  const clientSymbols = isArchiveForClient
    ? archive.symbolAnalyses.filter((s) => s.clientId === clientId)
    : [];
  const existingAnalysesCount = clientSymbols.length;

  const warningNotices: string[] = [];
  if (!hasNumerology) {
    warningNotices.push('Numeroloji analizi (A12) tamamlanmalıdır.');
  }
  if (!hasChakra) {
    warningNotices.push('Çakra dengesi analizi (A13) tamamlanmalıdır.');
  }
  if (!hasArchetype) {
    warningNotices.push('Arketip analizi (A14) tamamlanmalıdır.');
  }

  const isMandatoryComplete = hasNumerology && hasChakra && hasArchetype;

  let status: SymbolModulePreparation['status'];
  let statusMessageTr: string;

  if (!isMandatoryComplete) {
    status = 'INPUTS_MISSING';
    statusMessageTr = 'Sembol analizi ve seçimi için temel analizlerin (Numeroloji, Çakra, Arketip) tamamlanması gereklidir.';
  } else if (existingAnalysesCount > 0) {
    status = 'COMPLETED';
    statusMessageTr = `Bu danışan için ${existingAnalysesCount} adet kayıtlı sembol analizi mevcuttur.`;
  } else {
    status = 'READY_TO_RUN';
    statusMessageTr = 'Analiz verileri hazır. Kutsal geometri ve kadim sembol kütüphanesinden seçim yapılabilir.';
  }

  return {
    clientId,
    status,
    hasAstrology,
    hasNumerology,
    hasChakra,
    hasArchetype,
    hasRecipe,
    statusMessageTr,
    warningNotices,
    existingAnalysesCount,
  };
}

/**
 * Danışan için akıllı sembol önerilerini getirir.
 */
export function getClientRecommendedSymbols(
  client: Client,
  archive: ClientArchiveRecord | null,
  options?: SymbolRecommendationOptions
): SymbolRecommendationResult[] {
  if (!client || !archive) return [];

  const analysisRecord = archive.analyses.find((a) => a.clientId === client.id);
  const clientTests = archive.testResults.filter((t) => t.clientId === client.id);

  return recommendSymbolsForClient({
    numerology: analysisRecord?.numerology || null,
    chakra: analysisRecord?.chakra || null,
    archetype: analysisRecord?.archetype || null,
    astrology: analysisRecord?.astrology || null,
    testResults: clientTests,
    motherName: client.motherName,
    options,
  });
}

/**
 * Kullanıcı tarafından seçilmiş ve kompozisyon haline getirilmiş sembol analizini oluşturur.
 */
export function buildClientSymbolAnalysis(
  client: Client,
  archive: ClientArchiveRecord | null,
  selectedSymbols: ClientSymbolAnalysis['selectedSymbols'],
  compositionNarrative?: string
): ClientSymbolAnalysis {
  if (!client || !client.id) {
    throw new Error('Geçerli bir danışan kaydı gereklidir.');
  }

  const clientAnalyses = archive?.symbolAnalyses.filter((s) => s.clientId === client.id) || [];
  const nextVersion = clientAnalyses.length + 1;

  // Kural 5: Anne adını içeren sembol seçimi varsa filtrele
  const sanitizedSelected = selectedSymbols.filter((s) => {
    if (client.motherName && client.motherName.trim().length > 1) {
      const lower = s.symbolName.toLocaleLowerCase('tr-TR');
      const mLower = client.motherName.trim().toLocaleLowerCase('tr-TR');
      if (lower.includes(mLower)) return false;
    }
    return true;
  });

  const now = new Date().toISOString();

  return {
    id: generateId('symbol'),
    clientId: client.id,
    version: nextVersion,
    selectedSymbols: sanitizedSelected,
    compositionNarrative:
      compositionNarrative ||
      `${client.firstName} için seçilen ${sanitizedSelected.length} temel sembolün kutsal geometri ve rezonans sentezi.`,
    createdAt: now,
  };
}

/**
 * Danışan ve arşiv verilerinden 10 adımlı görsel istem zincirini güvenle çalıştırır.
 * Eksik reçete durumunda sahte veri üretmez, hata fırlatır.
 */
export function generateVisualPromptForClient(
  client: Client,
  archive: ClientArchiveRecord | null,
  options?: {
    selectedSymbols?: ClientSymbolAnalysis['selectedSymbols'];
    excludedSymbols?: string[];
    preferredStyle?: TattooStyle;
    preferredPlacement?: BodyPlacement;
    colorPreference?: TattooRecipe['colorProfile'];
    includeTotemInVisual?: boolean;
    compositionNarrative?: string;
  }
): VisualPromptOutput {
  if (!client || !client.id) {
    throw new Error('Geçerli bir danışan kaydı gereklidir.');
  }

  const clientDesigns = archive?.designs.filter((d) => d.clientId === client.id) || [];
  const latestDesign = clientDesigns[clientDesigns.length - 1];

  if (!latestDesign || !latestDesign.recipe) {
    throw new Error('Eksik reçete: Görsel prompt oluşturmak için önce geçerli bir A15 Dövme Reçetesi gereklidir.');
  }

  const recommended = getClientRecommendedSymbols(client, archive, {
    excludedSymbols: options?.excludedSymbols,
    includeTotemInVisual: options?.includeTotemInVisual,
  });

  const totemTest = archive?.testResults.find(
    (t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM'
  );

  return generateUnifiedVisualPrompt({
    clientId: client.id,
    clientFullName: `${client.firstName} ${client.lastName}`.trim(),
    motherName: client.motherName,
    recipe: latestDesign.recipe,
    selectedSymbols: options?.selectedSymbols || [],
    recommendedSymbols: recommended.map((r) => r.symbol),
    excludedSymbols: options?.excludedSymbols,
    style: options?.preferredStyle || latestDesign.recipe.style,
    placement: options?.preferredPlacement || latestDesign.recipe.recommendedPlacement,
    colorProfile: options?.colorPreference || latestDesign.recipe.colorProfile,
    compositionNarrative: options?.compositionNarrative,
    includeTotemInVisual: options?.includeTotemInVisual,
    totemName: totemTest?.primaryType,
    conceptStatement: latestDesign.conceptStatement,
  });
}

