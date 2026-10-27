import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { hasActualModuleResults } from '../core/clientDataAdapter';
import { TattooStyle, BodyPlacement } from '../types/design';

export type TattooDesignStageId =
  | 'NOT_STARTED'               // 1. Tasarım başlamadı
  | 'PARAMETERS_MISSING'         // 2. Parametreler eksik
  | 'PREREQUISITES_MISSING'      // 3. Zorunlu analizler eksik
  | 'SYMBOL_SELECTION_PENDING'   // 4. Sembol seçimi bekleniyor
  | 'READY_FOR_RECIPE'           // 5. Reçete oluşturulmaya hazır
  | 'RECIPE_EXISTS'              // 6. Reçete mevcut
  | 'READY_FOR_VISUAL_PROMPT'    // 7. Görsel istem oluşturulmaya hazır
  | 'VISUAL_PROMPT_EXISTS'       // 8. Görsel istem mevcut
  | 'DESIGN_ARCHIVED';           // 9. Tasarım arşivlendi

export interface TattooDesignStageInfo {
  stageId: TattooDesignStageId;
  stageNumber: number; // 1 to 9
  stageTitleTr: string;
  stageDescriptionTr: string;
  nextActionTitleTr: string;
  nextActionDescriptionTr: string;
  badgeColorClass: string;
  isHistoricalOrArchived: boolean;
}

export interface TattooStageEvaluationParams {
  selectedStyle?: TattooStyle;
  selectedPlacement?: BodyPlacement;
  customWidth?: number;
  customHeight?: number;
  selectedSymbolsCount?: number;
  activeDesignId?: string | null;
  currentStep?: number;
}

/**
 * Aktif danışanın mevcut kayıtlarını inceleyerek dövme tasarımı alanındaki
 * 9 durumu ve sonraki adımı deterministik olarak hesaplar.
 * Sahte veri veya varsayılan üretmez.
 */
export function evaluateTattooDesignStage(
  client: Client | null,
  archive: ClientArchiveRecord | null,
  params?: TattooStageEvaluationParams
): TattooDesignStageInfo {
  if (!client || !client.id) {
    return {
      stageId: 'NOT_STARTED',
      stageNumber: 1,
      stageTitleTr: 'Tasarım Başlamadı',
      stageDescriptionTr: 'Aktif bir danışan kaydı seçilmediğinden tasarım süreci başlatılamaz.',
      nextActionTitleTr: 'Danışan Seçiniz',
      nextActionDescriptionTr: 'Lütfen listeden üzerinde çalışmak istediğiniz danışanı seçiniz.',
      badgeColorClass: 'bg-stone-900 text-stone-400 border-stone-800',
      isHistoricalOrArchived: false,
    };
  }

  const clientId = client.id;
  const isArchiveForClient = Boolean(archive && archive.client && archive.client.id === clientId);

  // Danışana ait tasarımlar
  const clientDesigns = isArchiveForClient && archive?.designs
    ? archive.designs.filter((d) => d.clientId === clientId)
    : [];
  const latestDesign = clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null;

  // Geçmiş sürüm veya arşivlenmiş sürüm inceleniyor mu?
  const isHistorical = Boolean(
    params?.activeDesignId &&
    latestDesign &&
    params.activeDesignId !== latestDesign.id
  );

  if (isHistorical) {
    return {
      stageId: 'DESIGN_ARCHIVED',
      stageNumber: 9,
      stageTitleTr: 'Tasarım Arşivlendi (Geçmiş Sürüm — Salt Okunur)',
      stageDescriptionTr: 'İncelenen tasarım geçmiş bir arşiv sürümüdür. Güncel reçeteyi değiştirmez.',
      nextActionTitleTr: 'Güncel Sürüme Dön',
      nextActionDescriptionTr: 'Güncel tasarım üzerinde işlem yapmak için "Güncel Sürüme Dön" butonuna tıklayınız.',
      badgeColorClass: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
      isHistoricalOrArchived: true,
    };
  }

  // Zorunlu Analizler Kontrolü (Numeroloji, Çakra, Arketip)
  const hasNumerology = isArchiveForClient ? hasActualModuleResults(archive, 'NUMEROLOGY') : false;
  const hasChakra = isArchiveForClient ? hasActualModuleResults(archive, 'CHAKRA') : false;
  const hasArchetype = isArchiveForClient ? hasActualModuleResults(archive, 'ARCHETYPE') : false;

  const missingPrerequisites: string[] = [];
  if (!hasNumerology) missingPrerequisites.push('Numeroloji analizi eksik.');
  if (!hasChakra) missingPrerequisites.push('Çakra analizi eksik.');
  if (!hasArchetype) missingPrerequisites.push('Arketip analizi eksik.');

  // Eğer danışanın henüz hiç tasarımı yoksa ve zorunlu analizler eksikse
  if (clientDesigns.length === 0 && missingPrerequisites.length > 0) {
    return {
      stageId: 'PREREQUISITES_MISSING',
      stageNumber: 3,
      stageTitleTr: 'Zorunlu Analizler Eksik',
      stageDescriptionTr: `Reçete motoru için zorunlu olan temel analizler henüz tamamlanmadı: ${missingPrerequisites.join(' ')}`,
      nextActionTitleTr: 'Temel Analizlere Git',
      nextActionDescriptionTr: 'Dövme reçetesi oluşturabilmek için önce Analizler sekmesinden eksik modülleri tamamlayınız.',
      badgeColorClass: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
      isHistoricalOrArchived: false,
    };
  }

  // Eğer mevcut kayıtlı bir tasarım varsa:
  if (latestDesign && latestDesign.recipe) {
    const hasVisualPrompt = Boolean(latestDesign.aiPrompt && latestDesign.aiPrompt.primaryPromptEn?.trim());

    if (hasVisualPrompt) {
      return {
        stageId: 'VISUAL_PROMPT_EXISTS',
        stageNumber: 8,
        stageTitleTr: 'Görsel İstem Mevcut',
        stageDescriptionTr: `V${latestDesign.versionNumber} için Midjourney görsel istemi ve negatif filtre başarıyla üretildi.`,
        nextActionTitleTr: 'Tasarım Paketini Kullan veya Arşivle',
        nextActionDescriptionTr: 'İstemleri kopyalayabilir, danışan dosyasını dışa aktarabilir veya yeni bir sürüm üretebilirsiniz.',
        badgeColorClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
        isHistoricalOrArchived: false,
      };
    }

    // Reçete var ama görsel istem henüz oluşturulmadı
    if (params?.currentStep === 5 || params?.currentStep === 6) {
      return {
        stageId: 'READY_FOR_VISUAL_PROMPT',
        stageNumber: 7,
        stageTitleTr: 'Görsel İstem Oluşturulmaya Hazır',
        stageDescriptionTr: `V${latestDesign.versionNumber} reçetesi mevcut. 10 aşamalı A16 senteziyle görsel istem üretilebilir.`,
        nextActionTitleTr: 'Görsel İstemi Sentezle',
        nextActionDescriptionTr: '"Görsel İstemi Oluştur" butonuna basarak Midjourney komutunu ve negatif istemi üretiniz.',
        badgeColorClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
        isHistoricalOrArchived: false,
      };
    }

    return {
      stageId: 'RECIPE_EXISTS',
      stageNumber: 6,
      stageTitleTr: 'Reçete Mevcut',
      stageDescriptionTr: `V${latestDesign.versionNumber} teknik dövme reçetesi oluşturulmuş durumda.`,
      nextActionTitleTr: 'Görsel İstem Aşamasına Geç',
      nextActionDescriptionTr: 'Reçeteden AI görsel üretim komutunu sentezlemek için Adım 5\'e ilerleyiniz.',
      badgeColorClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80',
      isHistoricalOrArchived: false,
    };
  }

  // Henüz kayıtlı tasarım yok, üretim adımları kontrol ediliyor:
  const hasValidPlacement = Boolean(params?.selectedPlacement);
  const hasValidStyle = Boolean(params?.selectedStyle);
  const hasValidDimensions = Boolean(
    typeof params?.customWidth === 'number' &&
    params.customWidth > 0 &&
    typeof params?.customHeight === 'number' &&
    params.customHeight > 0
  );

  if (!hasValidPlacement || !hasValidStyle || !hasValidDimensions) {
    return {
      stageId: 'PARAMETERS_MISSING',
      stageNumber: 2,
      stageTitleTr: 'Parametreler Eksik',
      stageDescriptionTr: 'Tasarım stili, vücut yerleşimi veya santimetre ölçüleri henüz belirlenmedi.',
      nextActionTitleTr: 'Parametreleri Belirle',
      nextActionDescriptionTr: 'Adım 1 ve Adım 2 üzerinden stil, yerleşim ve en-boy ölçülerini giriniz.',
      badgeColorClass: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
      isHistoricalOrArchived: false,
    };
  }

  const symbolsCount = params?.selectedSymbolsCount || 0;
  if (symbolsCount === 0 && (params?.currentStep === 3 || params?.currentStep === 4)) {
    return {
      stageId: 'SYMBOL_SELECTION_PENDING',
      stageNumber: 4,
      stageTitleTr: 'Sembol Seçimi Bekleniyor',
      stageDescriptionTr: 'Tasarım kompozisyonu için kutsal geometri veya ezoterik kütüphaneden ana sembol seçilmelidir.',
      nextActionTitleTr: 'Ana Sembolü Seç',
      nextActionDescriptionTr: 'Kütüphaneden danışanın analizlerine uygun ana sembolü işaretleyiniz.',
      badgeColorClass: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
      isHistoricalOrArchived: false,
    };
  }

  if (params?.currentStep === 4 || symbolsCount > 0) {
    return {
      stageId: 'READY_FOR_RECIPE',
      stageNumber: 5,
      stageTitleTr: 'Reçete Oluşturulmaya Hazır',
      stageDescriptionTr: 'Tüm analizler, parametreler ve sembol tercihleri hazır. Dövme reçetesi üretilebilir.',
      nextActionTitleTr: 'Dövme Reçetesini Üret',
      nextActionDescriptionTr: '"Dövme Reçetesini Oluştur" butonuna basarak teknik reçeteyi hesaplayınız.',
      badgeColorClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
      isHistoricalOrArchived: false,
    };
  }

  return {
    stageId: 'NOT_STARTED',
    stageNumber: 1,
    stageTitleTr: 'Tasarım Başlamadı',
    stageDescriptionTr: 'Aktif danışan için henüz tasarım süreci başlatılmadı.',
    nextActionTitleTr: 'Tasarım Parametrelerini Başlat',
    nextActionDescriptionTr: 'Adım 1\'den başlayarak anatomik yerleşim ve görsel stil tercihlerini seçiniz.',
    badgeColorClass: 'bg-stone-900 text-stone-400 border-stone-800',
    isHistoricalOrArchived: false,
  };
}
