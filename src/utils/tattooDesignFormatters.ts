import { Client } from '../types/client';
import { ClientTattooDesign, TattooStyle, BodyPlacement, TattooRecipe } from '../types/design';
import { TATTOO_STYLES, BODY_PLACEMENTS, COLOR_PROFILES } from '../modules/recipe/constants';

export interface DesignPreviewParams {
  client: Client;
  style: TattooStyle;
  placement: BodyPlacement;
  widthCm: number;
  heightCm: number;
  colorProfile: TattooRecipe['colorProfile'];
  primarySymbol?: string;
  secondarySymbols: string[];
  excludedSymbols: string[];
  includeTotemInVisual: boolean;
  totemName?: string;
  customNotes?: string;
}

/**
 * Tasarım parametreleri önizleme özeti (Reçete oluşturulmadan önce gösterilir)
 */
export function formatDesignPreviewSummary(params: DesignPreviewParams): string {
  const {
    client,
    style,
    placement,
    widthCm,
    heightCm,
    colorProfile,
    primarySymbol,
    secondarySymbols,
    excludedSymbols,
    includeTotemInVisual,
    totemName,
    customNotes,
  } = params;

  const styleMeta = TATTOO_STYLES[style] || TATTOO_STYLES.FINE_LINE;
  const placementMeta = BODY_PLACEMENTS[placement] || BODY_PLACEMENTS.FOREARM_INNER;
  const colorMeta = COLOR_PROFILES[colorProfile] || COLOR_PROFILES.MONOCHROME_BLACK;

  const lines: string[] = [
    `DANIŞAN: ${client.firstName} ${client.lastName}`.trim(),
    `STİL: ${styleMeta.nameTr}`,
    `ANATOMİK YERLEŞİM: ${placementMeta.nameTr} (${placementMeta.anatomicalFlowTr})`,
    `ÖLÇÜ: ${widthCm} cm x ${heightCm} cm`,
    `RENK PROFİLİ: ${colorMeta.nameTr} — ${colorMeta.rationaleTr}`,
    `ANA SEMBOL: ${primarySymbol || 'Analiz rezonansına göre otomatik belirlenecek'}`,
    `İKİNCİL SEMBOLLER: ${secondarySymbols.length > 0 ? secondarySymbols.join(', ') : 'Analiz katmanlarından otomatik seçilecek'}`,
    `HARİÇ TUTULANLAR: ${excludedSymbols.length > 0 ? excludedSymbols.join(', ') : 'Belirtilmedi'}`,
    `TOTEM GÖRSEL ENTEGRASYONU: ${includeTotemInVisual ? `Dahil (${totemName || 'Ruh hayvanı'} soyut silüeti)` : 'Hariç (Yalnızca analiz düzeyinde)'}`,
  ];

  if (customNotes && customNotes.trim()) {
    lines.push(`KOMPOZİSYON NOTU: ${customNotes.trim()}`);
  }

  return lines.join('\n');
}

/**
 * 1. Dövme Reçetesi & Kapsamlı Tasarım Raporu Metni (A57)
 */
export function formatTattooRecipeText(client: Client, design: ClientTattooDesign): string {
  const r = design.recipe;
  const rep = r.comprehensiveReport;

  if (rep) {
    const lines: string[] = [
      `=== DÖVME REÇETESİ VE KAPSAMLI TASARIM RAPORU (V${design.versionNumber}) ===`,
      `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
      `Tasarım Başlığı: ${design.title}`,
      `Oluşturulma Tarihi: ${new Date(design.createdAt).toLocaleDateString('tr-TR')}`,
      '',
      `[A. DANIŞAN VE REÇETE ÖZETİ] [STİL VE YERLEŞİM]`,
      `• Danışan: ${rep.sectionA.clientSummary}`,
      `• Danışan Kimliği: ${rep.sectionA.clientId}`,
      `• Reçete Sürümü: V${rep.sectionA.recipeVersion}`,
      `• Tasarım Başlığı: ${rep.sectionA.title}`,
      `• Stil: ${rep.sectionA.styleTr}`,
      `• Yerleşim: ${rep.sectionA.placementTr} (${rep.sectionA.placementDetailTr})`,
      `• Önerilen Ölçüler: ${rep.sectionA.recommendedDimensions}`,
      rep.sectionA.customDimensions ? `• Danışan Özel Ölçüsü: ${rep.sectionA.customDimensions}` : '',
      rep.sectionA.dimensionWarningTr ? `• ÖLÇÜ UYARISI: ${rep.sectionA.dimensionWarningTr}` : '',
      `• Renk Profili: ${rep.sectionA.colorProfileTr}`,
      rep.sectionA.colorRationaleTr ? `• Renk Gerekçesi: ${rep.sectionA.colorRationaleTr}` : '',
      `• Ana Sembol: ${r.primarySymbol}`,
      `• İkincil Semboller: ${(r.secondarySymbols || []).join(', ')}`,
      `• Tamamlanan Analizler (${rep.sectionA.completedModules.length}): ${rep.sectionA.completedModules.join(', ')}`,
      `• Eksik / Tamamlanmamış Modüller (${rep.sectionA.missingModules.length}): ${rep.sectionA.missingModules.join(', ')}`,
      `• Aktif Analiz Sonuçları Özeti:`,
      ...(rep.sectionA.activeAnalysisModulesSummary || rep.sectionA.completedModules || []).map((s) => `  - ${s}`),
      '',
      `[B. KİŞİSEL ANALİZDEN TASARIMA GEÇİŞ]`,
      `• Analiz Veri Kaynakları:`,
      ...rep.sectionB.originAnalysesSummary.map((s) => `  - ${s}`),
      `• Tasarıma Aktarılan Tematik Anahtarlar: ${rep.sectionB.thematicKeywords.join(', ')}`,
      `• Uygulanan Haritalama Kuralları:`,
      ...rep.sectionB.mappingRulesUsed.map((rule) => `  - ${rule}`),
      `• Veri Doğrulama Notu: ${rep.sectionB.dataVerificationNoteTr}`,
      '',
      `[C. HER SEMBOL İÇİN AYRINTILI GEREKÇE VE AÇIKLAMA] [SEMBOL KATMANLARI]`,
      ...rep.sectionC.symbols.map((sym, i) => [
        `--- Sembol ${i + 1}: ${sym.symbolName} [${sym.weight === 'PRIMARY' ? 'BİRİNCİL MERKEZİ ODAK' : 'İKİNCİL / AKIŞ ELEMANI'}] ---`,
        `1. Sembolün Adı: ${sym.symbolName}`,
        `2. Hangi Analizden / Değerden Geldiği: ${sym.originAnalysis} (${sym.originValue})`,
        `3. Danışanın Hangi Kişisel Temasını Temsil Ettiği: ${sym.personalTheme}`,
        `4. Kompozisyondaki Rolü: ${sym.compositionRole}`,
        `5. Hangi Sembolle İlişkilendirildiği: ${sym.relatedSymbol}`,
        `6. Görsel Olarak Nasıl İşleneceği: ${sym.visualExecution}`,
        `7. Bu Katman Olmazsa Tasarımın Ne Kaybedeceği: ${sym.meaningRiskIfRemoved}`,
      ].join('\n')),
      '',
      `[D. ÇAKRA VE DESTEK TEMALARININ TASARIMA AKTARILMASI]`,
      `• Seçilen Destek Çakraları: ${rep.sectionD.selectedChakras.join(', ')}`,
      `• Seçim Gerekçesi (≤4 Kuralı & Baskın Çakra Ayrımı): ${rep.sectionD.rationaleTr}`,
      `• Sembolik Form İşlevi: ${rep.sectionD.symbolicFormFunctionTr}`,
      `• Tıbbi Olmayan Bildirim: ${rep.sectionD.nonMedicalDisclaimerTr}`,
      '',
      `[E. ARKETİP VE GÖLGE DÖNÜŞÜM ANLATISI]`,
      `• Baskın Arketip: ${rep.sectionE.primaryArchetypeTr}${rep.sectionE.secondaryArchetypeTr ? ` | İkincil Arketip: ${rep.sectionE.secondaryArchetypeTr}` : ''}`,
      `• Gölge Arketip Adı: ${rep.sectionE.shadowArchetypeNameTr}`,
      `• Dönüşüm Sembolü: ${rep.sectionE.transformationSymbolTr}`,
      `• Şefkatli Dönüşüm Anlatısı:`,
      `  ${rep.sectionE.transformationNarrativeTr}`,
      '',
      `[F. TOTEM ENTEGRASYONU]`,
      `• Totem Analizi Durumu: ${rep.sectionF.hasTotemAnalysis ? 'Tamamlandı' : 'Henüz tamamlanmadı'}`,
      rep.sectionF.hasTotemAnalysis
        ? `• Birincil Totem: ${rep.sectionF.primaryTotemTr || '-'}${rep.sectionF.secondaryTotemTr ? ` | İkincil Totem: ${rep.sectionF.secondaryTotemTr}` : ''}`
        : '',
      `• Görsel Entegrasyon Tercihi: ${rep.sectionF.includeTotemInVisual ? 'Görsele Dahil Edildi (Soyut Geometrik Silüet)' : 'Görselden Hariç Tutuldu (Yalnızca felsefi analiz düzeyinde)'}`,
      `• Entegrasyon ve Temsil Notu: ${rep.sectionF.integrationNoteTr}`,
      `• Sembolik Rehberlik: ${rep.sectionF.symbolicGuidanceTr}`,
      '',
      `[G. BÜTÜNSEL KOMPOZİSYON AÇIKLAMASI]`,
      `• Merkezi Odak Gerekçesi: ${rep.sectionG.centralFocusRationaleTr}`,
      `• İkincil Geçişler ve Akış: ${rep.sectionG.secondaryTransitionsTr}`,
      `• Negatif Alan İlkesi: ${rep.sectionG.negativeSpaceRatioTr}`,
      `• Kompozisyon Bütünlüğü ve Kenetlenme İlkeleri:`,
      ...rep.sectionG.holisticIntegrationRules.map((rule) => `  - ${rule}`),
      '',
      `[H. ANATOMİK VE TEKNİK DÖVME TALİMATI]`,
      `• Vücut Bölgesi ve Akış: ${rep.sectionH.anatomicalPlacementTr}`,
      `• Ölçü ve Ölçek Standartları: ${rep.sectionH.recommendedDimensionsTr}`,
      `• İğne ve Uygulama Tavsiyeleri:`,
      ...rep.sectionH.needleAndTechniqueGuidance.map((g) => `  - ${g}`),
      `• Cilt Yaşlanması ve Çizgi Aralığı Kuralı: ${rep.sectionH.agingAndLineSpacingTr}`,
      '',
      `[I. KİŞİSEL TASARIM MANİFESTOSU]`,
      rep.sectionI.manifestoTr,
      '',
      `[J. TEKNİK GÖRSEL ÜRETİM İSTEMİ (AI PROMPTS)]`,
      `• Birincil İngilizce İstem (Midjourney / SD):`,
      rep.sectionJ.primaryPromptEn,
      '',
      `• Negatif Filtre İstemleri:`,
      rep.sectionJ.negativePromptEn,
      '',
      `• En / Boy Oranı: ${rep.sectionJ.aspectRatio}`,
      rep.sectionJ.artisticModifiers && rep.sectionJ.artisticModifiers.length > 0
        ? `• Sanatsal Modifikatörler: ${rep.sectionJ.artisticModifiers.join(', ')}`
        : '',
      `• Teknik Temizlik Bildirimi: ${rep.sectionJ.technicalCleanlinessNoteTr}`,
    ];

    return lines.filter(Boolean).join('\n');
  }

  // Geriye dönük uyumluluk (Legacy fallback)
  const styleMeta = TATTOO_STYLES[r.style] || TATTOO_STYLES.FINE_LINE;
  const placementMeta = BODY_PLACEMENTS[r.recommendedPlacement] || BODY_PLACEMENTS.FOREARM_INNER;
  const colorMeta = COLOR_PROFILES[r.colorProfile] || COLOR_PROFILES.MONOCHROME_BLACK;

  const lines: string[] = [
    `=== DÖVME REÇETESİ (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Danışan Kimliği: ${client.id}`,
    `Tasarım Başlığı: ${design.title}`,
    `Oluşturulma Tarihi: ${new Date(design.createdAt).toLocaleDateString('tr-TR')}`,
    '',
    `[STİL VE YERLEŞİM]`,
    `• Stil: ${styleMeta.nameTr}`,
    `• Yerleşim: ${r.placementDescription || placementMeta.nameTr}`,
    `• Önerilen Ölçü: ${r.recommendedDimensionsCm.width} cm (Genişlik) x ${r.recommendedDimensionsCm.height} cm (Yükseklik)`,
    `• Anatomik Eğrilik Tavsiyesi: ${placementMeta.curvatureAdviceTr}`,
    '',
    `[RENK DİREKTİFİ]`,
    `• Renk Profili: ${colorMeta.nameTr}`,
    `• Palet Açıklaması: ${colorMeta.rationaleTr}`,
    r.colorRationale ? `• Gerekçe: ${r.colorRationale}` : '',
    '',
    `[SEMBOL KATMANLARI]`,
    `• Ana Sembol: ${r.primarySymbol || 'Kutsal geometri mandala'}`,
    r.secondarySymbols && r.secondarySymbols.length > 0
      ? `• İkincil Semboller: ${r.secondarySymbols.join(' · ')}`
      : '• İkincil Semboller: Bulunmuyor',
    r.shadowTransformationTheme ? `• Gölge Dönüşüm Odakları: ${r.shadowTransformationTheme}` : '',
    r.chakraSupportReflection ? `• Çakra Yansıması: ${r.chakraSupportReflection}` : '',
    r.totemAbstractionNotes ? `• Totem Entegrasyonu: ${r.totemAbstractionNotes}` : '',
    r.excludedElements && r.excludedElements.length > 0
      ? `• Hariç Tutulan Öğeler: ${r.excludedElements.join(', ')}`
      : '',
    '',
    `[BİLEŞENLER VE KURALLAR]`,
    ...(r.symbolCombinationRules && r.symbolCombinationRules.length > 0
      ? r.symbolCombinationRules.map((rule) => `• ${rule}`)
      : []),
    ...(r.keyComponents && r.keyComponents.length > 0
      ? ['', `[TEMEL TASARIM UNSURLARI]`, ...r.keyComponents.map((c) => `• ${c}`)]
      : []),
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * 2. Türkçe Konsept / Manifesto Metni
 */
export function formatConceptManifestoText(client: Client, design: ClientTattooDesign): string {
  const lines: string[] = [
    `=== DÖVME KONSEPT MANİFESTOSU (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Tasarım: ${design.title}`,
    '',
    `[FELSEFİ VE RUHSAL KONSEPT]`,
    design.conceptStatement,
    '',
    `[GÖRSEL ANLATI VE SEMBOLİK DİL]`,
    design.aiPrompt?.conceptPromptTr || 'Kişiye özel enerji alanlarını dengeleyen kadim sembolizm.',
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * 3. Sanatçı Teknik Talimatları Metni
 */
export function formatTechnicalAdviceText(client: Client, design: ClientTattooDesign): string {
  const r = design.recipe;
  const placementMeta = BODY_PLACEMENTS[r.recommendedPlacement] || BODY_PLACEMENTS.FOREARM_INNER;

  const lines: string[] = [
    `=== DÖVME SANATÇISI TEKNİK TALİMATLARI (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Tasarım: ${design.title}`,
    '',
    `[ANATOMİK UYUM VE EĞRİLİK]`,
    `• Bölge: ${placementMeta.nameTr}`,
    `• Akış Dinamiği: ${placementMeta.anatomicalFlowTr}`,
    `• Eğrilik Uyarısı: ${placementMeta.curvatureAdviceTr}`,
    `• Boyut: ${r.recommendedDimensionsCm.width} x ${r.recommendedDimensionsCm.height} cm`,
    '',
    `[İĞNE VE TEKNİK TAVSİYELER]`,
    ...(r.technicalAdviceForArtist && r.technicalAdviceForArtist.length > 0
      ? r.technicalAdviceForArtist.map((t) => `• ${t}`)
      : ['• İnce kontur ve dengeli doygunluk']),
    '',
    `[GÖRSEL YÖNLENDİRMELER]`,
    ...(r.artistVisualDirection && r.artistVisualDirection.length > 0
      ? r.artistVisualDirection.map((v) => `• ${v}`)
      : ['• Geometrik aks simetrisi korunmalıdır']),
  ];

  return lines.join('\n');
}

/**
 * 4. Görsel İstem (AI Prompt) Metni
 */
export function formatVisualPromptText(client: Client, design: ClientTattooDesign): string {
  const p = design.aiPrompt;

  const lines: string[] = [
    `=== YAPAY ZEKA GÖRSEL İSTEMİ (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Tasarım: ${design.title}`,
    '',
    `[PRIMARY AI PROMPT (ENGLISH)]`,
    p.primaryPromptEn,
    '',
    `[NEGATIVE PROMPT]`,
    p.negativePrompt,
    '',
    `[TEKNİK PARAMETRELER]`,
    `• Aspect Ratio: --ar ${p.aspectRatio}`,
    p.artisticModifiers && p.artisticModifiers.length > 0
      ? `• Modifiers: ${p.artisticModifiers.join(', ')}`
      : '',
    p.seed !== undefined ? `• Seed: ${p.seed}` : '',
    '',
    `[TÜRKÇE KONSEPT ÖZETİ]`,
    p.conceptPromptTr,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * 5. Tüm Tasarım Paketi Metni
 */
export function formatFullDesignPackageText(client: Client, design: ClientTattooDesign): string {
  if (design.recipe.comprehensiveReport) {
    return [
      `=======================================================`,
      `KİŞİYE ÖZEL DÖVME TASARIM VE UYGULAMA PAKETİ (V${design.versionNumber})`,
      `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
      `Oluşturulma Tarihi: ${new Date(design.createdAt).toLocaleString('tr-TR')}`,
      `=======================================================`,
      '',
      formatTattooRecipeText(client, design),
      '',
      `=======================================================`,
      `© Dövme Tasarım Asistanı — Kişiselleştirilmiş Bütünsel Tasarım Raporu`,
      `=======================================================`,
    ].join('\n');
  }

  return [
    `=======================================================`,
    `KİŞİYE ÖZEL DÖVME TASARIM VE UYGULAMA PAKETİ (V${design.versionNumber})`,
    `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
    `Oluşturulma Tarihi: ${new Date(design.createdAt).toLocaleString('tr-TR')}`,
    `=======================================================`,
    '',
    formatConceptManifestoText(client, design),
    '',
    `-------------------------------------------------------`,
    '',
    formatTattooRecipeText(client, design),
    '',
    `-------------------------------------------------------`,
    '',
    formatTechnicalAdviceText(client, design),
    '',
    `-------------------------------------------------------`,
    '',
    formatVisualPromptText(client, design),
  ].join('\n');
}

/**
 * 6. Negatif İstem Metni (A30: Negatif İstemi Kopyala)
 */
export function formatNegativePromptText(client: Client, design: ClientTattooDesign): string {
  const p = design.aiPrompt;
  return [
    `=== NEGATİF İSTEM (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
    `Tasarım: ${design.title}`,
    '',
    `[NEGATIVE PROMPT]`,
    p?.negativePrompt || 'Kayıt bulunmuyor.',
  ].join('\n');
}

/**
 * 7. Tasarım Özeti Metni (A30 Kart 1)
 */
export function formatDesignSummaryText(client: Client, design: ClientTattooDesign): string {
  const r = design.recipe;
  const styleMeta = TATTOO_STYLES[r.style] || TATTOO_STYLES.FINE_LINE;
  const placementMeta = BODY_PLACEMENTS[r.recommendedPlacement] || BODY_PLACEMENTS.FOREARM_INNER;
  const colorMeta = COLOR_PROFILES[r.colorProfile] || COLOR_PROFILES.MONOCHROME_BLACK;

  return [
    `=== DÖVME TASARIM ÖZETİ (V${design.versionNumber}) ===`,
    `Danışan Adı: ${client.firstName} ${client.lastName}`,
    `Danışan Kimliği: ${client.id}`,
    `Tasarım Başlığı: ${design.title}`,
    `Tasarım Sürümü: V${design.versionNumber}`,
    `Stil: ${styleMeta.nameTr}`,
    `Anatomik Yerleşim: ${placementMeta.nameTr}`,
    `Ölçüler: ${r.recommendedDimensionsCm.width} cm x ${r.recommendedDimensionsCm.height} cm`,
    `Renk Profili: ${colorMeta.nameTr}`,
    `Oluşturulma Tarihi: ${new Date(design.createdAt).toLocaleString('tr-TR')}`,
  ].join('\n');
}

/**
 * 8. Sembol Kompozisyonu Metni (A30 Kart 2)
 */
export function formatSymbolCompositionText(client: Client, design: ClientTattooDesign): string {
  const r = design.recipe;
  const rep = r.comprehensiveReport;

  if (rep && rep.sectionC && rep.sectionC.symbols.length > 0) {
    const lines: string[] = [
      `=== SEMBOL KOMPOZİSYONU VE GEREKÇELERİ (V${design.versionNumber}) ===`,
      `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
      `Tasarım: ${design.title}`,
      '',
      `[ANA SEMBOL]`,
      r.primarySymbol || 'Kayıt bulunmuyor.',
      '',
      `[İKİNCİL SEMBOLLER]`,
      r.secondarySymbols && r.secondarySymbols.length > 0
        ? r.secondarySymbols.map((s) => `• ${s}`).join('\n')
        : 'Kayıt bulunmuyor.',
      '',
      `[HARİÇ TUTULAN SEMBOLLER]`,
      r.excludedElements && r.excludedElements.length > 0
        ? r.excludedElements.join(', ')
        : 'Hariç tutulan sembol bulunmuyor.',
      '',
      `[TOTEM GÖRSEL ENTEGRASYON DURUMU]`,
      r.totemAbstractionNotes || 'Totem görsel olarak dahil edilmedi.',
      '',
      `[HER SEMBOL İÇİN AYRINTILI GEREKÇE (7 KRİTER)]`,
      ...rep.sectionC.symbols.map((sym, i) => [
        `--- Sembol ${i + 1}: ${sym.symbolName} [${sym.weight === 'PRIMARY' ? 'BİRİNCİL MERKEZİ ODAK' : 'İKİNCİL / AKIŞ ELEMANI'}] ---`,
        `1. Sembolün Adı: ${sym.symbolName}`,
        `2. Hangi Analizden / Değerden Geldiği: ${sym.originAnalysis} (${sym.originValue})`,
        `3. Danışanın Hangi Kişisel Temasını Temsil Ettiği: ${sym.personalTheme}`,
        `4. Kompozisyondaki Rolü: ${sym.compositionRole}`,
        `5. Hangi Sembolle İlişkilendirildiği: ${sym.relatedSymbol}`,
        `6. Görsel Olarak Nasıl İşleneceği: ${sym.visualExecution}`,
        `7. Bu Katman Olmazsa Tasarımın Ne Kaybedeceği: ${sym.meaningRiskIfRemoved}`,
      ].join('\n')),
    ];

    return lines.join('\n');
  }

  const lines: string[] = [
    `=== SEMBOL KOMPOZİSYONU (V${design.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName} (${client.id})`,
    `Tasarım: ${design.title}`,
    '',
    `[ANA SEMBOL]`,
    r.primarySymbol || 'Kayıt bulunmuyor.',
    '',
    `[İKİNCİL SEMBOLLER]`,
    r.secondarySymbols && r.secondarySymbols.length > 0
      ? r.secondarySymbols.map((s) => `• ${s}`).join('\n')
      : 'Kayıt bulunmuyor.',
    '',
    `[HARİÇ TUTULAN SEMBOLLER]`,
    r.excludedElements && r.excludedElements.length > 0
      ? r.excludedElements.join(', ')
      : 'Hariç tutulan sembol bulunmuyor.',
    '',
    `[TOTEM GÖRSEL ENTEGRASYON DURUMU]`,
    r.totemAbstractionNotes || 'Totem görsel olarak dahil edilmedi.',
  ];

  return lines.join('\n');
}

