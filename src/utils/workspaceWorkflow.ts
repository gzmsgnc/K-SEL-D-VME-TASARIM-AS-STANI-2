import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { hasActualModuleResults } from '../core/clientDataAdapter';

export type WorkflowStepId =
  | 'CLIENT_INFO'       // Danışan Bilgileri
  | 'CORE_ANALYSES'     // Temel Analizler
  | 'TESTS'             // Enneagram / Totem Testleri
  | 'TATTOO_RECIPE'     // Dövme Reçetesi
  | 'SYMBOL_SELECTION'  // Sembol Seçimi
  | 'VISUAL_PROMPT'     // Görsel İstem
  | 'DESIGN_ARCHIVE'    // Tasarım Arşivi
  | 'CLIENT_DOSSIER';   // Danışan Dosyası

export type WorkflowStepStatus =
  | 'COMPLETED'         // Tamamlandı
  | 'MISSING'           // Eksik
  | 'READY'             // Hazır
  | 'NOT_STARTED';      // Henüz başlatılmadı

export interface WorkflowStep {
  id: WorkflowStepId;
  order: number;
  title: string;
  status: WorkflowStepStatus;
  statusLabelTr: 'Tamamlandı' | 'Eksik' | 'Hazır' | 'Henüz başlatılmadı';
  summaryTr: string;
  targetTab: 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'DESIGN' | 'EXPORT_MODAL' | 'RESULTS';
  isClickable: boolean;
  missingPrerequisites: string[];
  guidanceMessageTr?: string;
  redirectTargetTab?: 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'DESIGN' | 'RESULTS';
}

export interface WorkspaceSummary {
  clientId: string;
  clientFullName: string;
  birthInfoTr: string;
  completedAnalysesCount: number;
  totalAnalysesCount: number;
  analysesStatusTr: string;
  completedTestsCount: number;
  totalTestsCount: number;
  testsStatusTr: string;
  currentRecipeVersionTr: string;
  totalDesignsCount: number;
  overallProgressPercent: number;
  overallStatusLabelTr: string;
  nextRecommendedStep?: WorkflowStep;
  steps: WorkflowStep[];
}

/**
 * Aktif danışanın mevcut kayıtlarını inceleyerek 8 aşamalı iş akışı durumunu hesaplar.
 * Hiçbir varsayılan, sahte veya başka danışana ait veri kullanmaz.
 */
export function evaluateWorkspaceWorkflow(
  client: Client | null,
  archive: ClientArchiveRecord | null
): WorkspaceSummary | null {
  if (!client || !client.id) {
    return null;
  }

  const clientId = client.id;
  const isArchiveForClient = archive && archive.client && archive.client.id === clientId;

  // 1. Danışan Bilgileri Durumu
  const loc = client.birthLocation;
  const hasValidLocation = Boolean(
    loc &&
    typeof loc.latitude === 'number' &&
    !isNaN(loc.latitude) &&
    typeof loc.longitude === 'number' &&
    !isNaN(loc.longitude) &&
    (loc.city || loc.country || loc.placeName)
  );
  const isClientInfoComplete = Boolean(
    client.firstName?.trim() &&
    client.lastName?.trim() &&
    client.birthDate &&
    hasValidLocation &&
    client.motherName?.trim()
  );

  // 2. Temel Analizler Durumu (Astroloji, Numeroloji, Çakra, Arketip)
  const hasAstrology = isArchiveForClient ? hasActualModuleResults(archive, 'ASTROLOGY') : false;
  const hasNumerology = isArchiveForClient ? hasActualModuleResults(archive, 'NUMEROLOGY') : false;
  const hasChakra = isArchiveForClient ? hasActualModuleResults(archive, 'CHAKRA') : false;
  const hasArchetype = isArchiveForClient ? hasActualModuleResults(archive, 'ARCHETYPE') : false;

  const completedAnalysesCount = [hasAstrology, hasNumerology, hasChakra, hasArchetype].filter(Boolean).length;
  const missingAnalysesList: string[] = [];
  if (!hasAstrology) missingAnalysesList.push('Astroloji');
  if (!hasNumerology) missingAnalysesList.push('Numeroloji');
  if (!hasChakra) missingAnalysesList.push('Çakra');
  if (!hasArchetype) missingAnalysesList.push('Arketip');

  // 3. Testler Durumu (Enneagram, Hayvan Totemi)
  const clientTests = isArchiveForClient ? archive.testResults.filter((t) => t.clientId === clientId) : [];
  const hasEnneagram = clientTests.some((t) => t.testType === 'ENNEAGRAM' && Boolean(t.primaryType));
  const hasTotem = clientTests.some((t) => t.testType === 'ANIMAL_TOTEM' && Boolean(t.primaryType));
  const completedTestsCount = (hasEnneagram ? 1 : 0) + (hasTotem ? 1 : 0);

  // 4. Dövme Reçetesi & Tasarımlar
  const clientDesigns = isArchiveForClient ? archive.designs.filter((d) => d.clientId === clientId) : [];
  const latestDesign = clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null;
  const hasRecipe = Boolean(latestDesign && latestDesign.recipe);

  // 5. Sembol Seçimi
  const clientSymbols = isArchiveForClient ? archive.symbolAnalyses.filter((s) => s.clientId === clientId) : [];
  const hasSymbols = clientSymbols.length > 0 || Boolean(latestDesign?.recipe?.primarySymbol);

  // 6. Görsel İstem
  const hasVisualPrompt = Boolean(latestDesign?.aiPrompt?.primaryPromptEn);

  // 7. Tasarım Arşivi
  const totalDesignsCount = clientDesigns.length;

  // 8 Aşamalı Akış Kuralları
  const steps: WorkflowStep[] = [];

  // Adım 1: Danışan Bilgileri
  steps.push({
    id: 'CLIENT_INFO',
    order: 1,
    title: 'Danışan Bilgileri',
    status: isClientInfoComplete ? 'COMPLETED' : 'MISSING',
    statusLabelTr: isClientInfoComplete ? 'Tamamlandı' : 'Eksik',
    summaryTr: isClientInfoComplete
      ? 'Doğum ve kimlik bilgileri eksiksiz'
      : 'Eksik kişisel veya doğum parametreleri mevcut',
    targetTab: 'PERSONAL_BIRTH',
    isClickable: true,
    missingPrerequisites: isClientInfoComplete ? [] : ['Doğum veya Anne Adı Bilgisi'],
  });

  // Adım 2: Temel Analizler
  let coreAnalysesStatus: WorkflowStepStatus = 'NOT_STARTED';
  if (completedAnalysesCount === 4) {
    coreAnalysesStatus = 'COMPLETED';
  } else if (completedAnalysesCount > 0) {
    coreAnalysesStatus = 'MISSING';
  } else if (isClientInfoComplete) {
    coreAnalysesStatus = 'READY';
  }

  steps.push({
    id: 'CORE_ANALYSES',
    order: 2,
    title: 'Temel Analizler',
    status: coreAnalysesStatus,
    statusLabelTr:
      coreAnalysesStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : coreAnalysesStatus === 'MISSING'
        ? 'Eksik'
        : coreAnalysesStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr:
      completedAnalysesCount === 4
        ? 'Astroloji, Numeroloji, Çakra ve Arketip hazır (4/4)'
        : completedAnalysesCount > 0
        ? `${completedAnalysesCount}/4 analiz yapıldı (Eksikler: ${missingAnalysesList.join(', ')})`
        : 'Doğum verileri hazır, analizler çalıştırılabilir',
    targetTab: 'ANALYSES',
    isClickable: true,
    missingPrerequisites: missingAnalysesList,
    guidanceMessageTr:
      missingAnalysesList.length > 0
        ? `Analizlerin tamamlanması gerekiyor: ${missingAnalysesList.join(', ')}.`
        : undefined,
  });

  // Adım 3: Enneagram / Totem Testleri
  let testsStatus: WorkflowStepStatus = 'NOT_STARTED';
  if (completedTestsCount === 2) {
    testsStatus = 'COMPLETED';
  } else if (completedTestsCount === 1) {
    testsStatus = 'MISSING';
  } else if (isClientInfoComplete) {
    testsStatus = 'READY';
  }

  const missingTests: string[] = [];
  if (!hasEnneagram) missingTests.push('Enneagram');
  if (!hasTotem) missingTests.push('Hayvan Totemi');

  steps.push({
    id: 'TESTS',
    order: 3,
    title: 'Enneagram / Totem Testleri',
    status: testsStatus,
    statusLabelTr:
      testsStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : testsStatus === 'MISSING'
        ? 'Eksik'
        : testsStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr:
      completedTestsCount === 2
        ? 'Enneagram ve Hayvan Totemi tamamlandı'
        : completedTestsCount === 1
        ? `${hasEnneagram ? 'Enneagram tamamlandı' : 'Totem tamamlandı'} (1 test eksik)`
        : 'Kişilik ve ruh hayvanı testleri başlatılmaya hazır',
    targetTab: 'TESTS',
    isClickable: true,
    missingPrerequisites: missingTests,
  });

  // Adım 4: Dövme Reçetesi
  // Zorunlu analizler: Numeroloji, Çakra, Arketip
  const isRecipePrerequisiteMet = hasNumerology && hasChakra && hasArchetype;
  let recipeStatus: WorkflowStepStatus = 'NOT_STARTED';
  let recipeGuidance: string | undefined;

  if (hasRecipe) {
    recipeStatus = 'COMPLETED';
  } else if (isRecipePrerequisiteMet) {
    recipeStatus = 'READY';
  } else {
    recipeStatus = 'MISSING';
    const missingForRecipe: string[] = [];
    if (!hasNumerology) missingForRecipe.push('Numeroloji');
    if (!hasChakra) missingForRecipe.push('Çakra');
    if (!hasArchetype) missingForRecipe.push('Arketip');
    recipeGuidance = `Önce ${missingForRecipe.join(', ')} analizlerini tamamlamanız gerekiyor.`;
  }

  steps.push({
    id: 'TATTOO_RECIPE',
    order: 4,
    title: 'Dövme Reçetesi',
    status: recipeStatus,
    statusLabelTr:
      recipeStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : recipeStatus === 'MISSING'
        ? 'Eksik'
        : recipeStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr: hasRecipe
      ? `Reçete V${latestDesign?.versionNumber || 1} oluşturuldu`
      : isRecipePrerequisiteMet
      ? 'Zorunlu analizler tamamlandı, reçete üretilmeye hazır'
      : 'Ön analizler eksik olduğu için reçete üretilemez',
    targetTab: 'DESIGN',
    isClickable: true,
    missingPrerequisites: isRecipePrerequisiteMet ? [] : missingAnalysesList,
    guidanceMessageTr: recipeGuidance,
    redirectTargetTab: !isRecipePrerequisiteMet ? 'ANALYSES' : undefined,
  });

  // Adım 5: Sembol Seçimi
  let symbolStatus: WorkflowStepStatus = 'NOT_STARTED';
  if (hasSymbols) {
    symbolStatus = 'COMPLETED';
  } else if (hasRecipe || isRecipePrerequisiteMet) {
    symbolStatus = 'READY';
  } else {
    symbolStatus = 'NOT_STARTED';
  }

  steps.push({
    id: 'SYMBOL_SELECTION',
    order: 5,
    title: 'Sembol Seçimi',
    status: symbolStatus,
    statusLabelTr:
      symbolStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : symbolStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr: hasSymbols
      ? `${clientSymbols.length > 0 ? `${clientSymbols.length} sembol kaydı` : 'Reçete sembolü seçili'}`
      : 'Kutsal geometri ve ezoterik sembol kütüphanesi hazır',
    targetTab: 'SYMBOLS',
    isClickable: true,
    missingPrerequisites: [],
  });

  // Adım 6: Görsel İstem
  let promptStatus: WorkflowStepStatus = 'NOT_STARTED';
  let promptGuidance: string | undefined;

  if (hasVisualPrompt) {
    promptStatus = 'COMPLETED';
  } else if (hasRecipe) {
    promptStatus = 'READY';
  } else {
    promptStatus = 'MISSING';
    promptGuidance = 'Görsel istem üretmek için önce Dövme Reçetesi oluşturmanız gerekiyor.';
  }

  steps.push({
    id: 'VISUAL_PROMPT',
    order: 6,
    title: 'Görsel İstem',
    status: promptStatus,
    statusLabelTr:
      promptStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : promptStatus === 'MISSING'
        ? 'Eksik'
        : promptStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr: hasVisualPrompt
      ? 'AI görsel üretim istemi ve negatif filtre hazır'
      : hasRecipe
      ? 'Reçete hazır, görsel istem üretilebilir'
      : 'Dövme reçetesi bulunmuyor',
    targetTab: 'DESIGN',
    isClickable: true,
    missingPrerequisites: hasRecipe ? [] : ['Dövme Reçetesi'],
    guidanceMessageTr: promptGuidance,
    redirectTargetTab: !hasRecipe ? 'DESIGN' : undefined,
  });

  // Adım 7: Tasarım Arşivi
  let archiveStatus: WorkflowStepStatus = 'NOT_STARTED';
  if (totalDesignsCount > 0) {
    archiveStatus = 'COMPLETED';
  } else if (isRecipePrerequisiteMet) {
    archiveStatus = 'READY';
  } else {
    archiveStatus = 'NOT_STARTED';
  }

  steps.push({
    id: 'DESIGN_ARCHIVE',
    order: 7,
    title: 'Tasarım Arşivi',
    status: archiveStatus,
    statusLabelTr:
      archiveStatus === 'COMPLETED'
        ? 'Tamamlandı'
        : archiveStatus === 'READY'
        ? 'Hazır'
        : 'Henüz başlatılmadı',
    summaryTr: totalDesignsCount > 0
      ? `${totalDesignsCount} kayıtlı tasarım sürümü mevcut`
      : 'Henüz kayıtlı sürüm bulunmuyor',
    targetTab: 'DESIGN',
    isClickable: true,
    missingPrerequisites: [],
  });

  // Adım 8: Danışan Dosyası
  const hasDossierContent = Boolean(isClientInfoComplete && (completedAnalysesCount > 0 || hasRecipe));
  steps.push({
    id: 'CLIENT_DOSSIER',
    order: 8,
    title: 'Danışan Dosyası',
    status: hasDossierContent ? 'COMPLETED' : 'READY',
    statusLabelTr: hasDossierContent ? 'Tamamlandı' : 'Hazır',
    summaryTr: 'Metin (.txt) ve JSON olarak dışa aktarılabilir',
    targetTab: 'EXPORT_MODAL',
    isClickable: true,
    missingPrerequisites: [],
  });

  // İlerleme yüzdesi hesabı (8 adım üzerinden)
  const completedStepsCount = steps.filter((s) => s.status === 'COMPLETED').length;
  const overallProgressPercent = Math.round((completedStepsCount / steps.length) * 100);

  // Genel ilerleme etiketi
  let overallStatusLabelTr = 'Başlangıç Aşaması';
  if (completedStepsCount === 8) {
    overallStatusLabelTr = 'Süreç Tamamlandı (Dosya Hazır)';
  } else if (hasRecipe && hasVisualPrompt) {
    overallStatusLabelTr = 'Tasarım ve Görsel Hazır';
  } else if (hasRecipe) {
    overallStatusLabelTr = 'Reçete Oluşturuldu';
  } else if (completedAnalysesCount === 4 && completedTestsCount === 2) {
    overallStatusLabelTr = 'Tüm Analiz ve Testler Tamam';
  } else if (completedAnalysesCount > 0) {
    overallStatusLabelTr = 'Analizler Yürütülüyor';
  }

  // Sonraki önerilen adım
  const nextRecommendedStep = steps.find((s) => s.status === 'READY' || s.status === 'MISSING');

  // Doğum bilgisi dökümü
  const birthInfoTr = `${client.birthDate} ${
    client.isBirthTimeUnknown ? '(Saat Bilinmiyor)' : client.birthTime
  } · ${loc?.placeName || loc?.city || 'Konum Belirtilmedi'}`;

  return {
    clientId,
    clientFullName: `${client.firstName} ${client.lastName}`.trim(),
    birthInfoTr,
    completedAnalysesCount,
    totalAnalysesCount: 4,
    analysesStatusTr: `${completedAnalysesCount}/4 Analiz`,
    completedTestsCount,
    totalTestsCount: 2,
    testsStatusTr: `${completedTestsCount}/2 Test`,
    currentRecipeVersionTr: latestDesign ? `V${latestDesign.versionNumber}` : 'Oluşturulmadı',
    totalDesignsCount,
    overallProgressPercent,
    overallStatusLabelTr,
    nextRecommendedStep,
    steps,
  };
}
