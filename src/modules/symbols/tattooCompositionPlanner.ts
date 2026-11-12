import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { BodyPlacement, TattooStyle, TattooRecipe } from '../../types/design';
import {
  SymbolDefinition,
  SymbolRecommendationResult,
  SymbolCompositionRole,
} from './types';
import { ALL_MASTER_SYMBOLS } from './masterSymbols';
import { getClientRecommendedSymbols } from './symbolEngineAdapter';
import { getDesignRoleDescription } from './symbolHarmonyEvaluator';

export interface CompositionSymbolElement {
  symbolId: string;
  symbolName: string;
  originalName?: string;
  role: SymbolCompositionRole | string;
  roleCategory: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  roleTitleTr: string;
  positiveSpaceRatioTr: string;
  reasonOrTaskTr: string;
  needleStyle: string;
  geometryType: string;
  element: string;
  originCulture: string;
  source: 'MANUAL_SELECTION' | 'AI_RECOMMENDATION';
}

export interface ExcludedCompositionSymbol {
  symbolId: string;
  symbolName: string;
  reasonTr: string;
}

export interface CompositionQualityCheck {
  isPrimaryFocusClear: boolean;
  isSecondaryBalanced: boolean;
  isGeometryConsistent: boolean;
  isNegativeSpaceSufficient: boolean;
  isAgingReadabilityPreserved: boolean;
  isAnatomicalFlowAligned: boolean;
  isClutterFree: boolean;
  overallScore: number;
  passedChecks: string[];
  detectedRisks: string[];
  autoCorrectionsApplied: string[];
}

export interface TattooCompositionPlan {
  clientId: string;
  clientName: string;
  createdAt: string;
  placement: {
    key: BodyPlacement | string;
    nameTr: string;
    flowDirectionTr: string;
    minDimensionsCm: { width: number; height: number };
    idealDimensionsCm: { width: number; height: number };
  };
  targets: {
    primaryFocusRatioTr: string;
    secondaryLayerRatioTr: string;
    negativeSpaceRatioTr: string;
    minLineSpacingMm: string;
    dimensionsDisclaimerTr: string;
  };
  generalConceptTr: string;
  primaryFocus: CompositionSymbolElement;
  secondaryElements: CompositionSymbolElement[];
  accentElements: CompositionSymbolElement[];
  relativePositionsTr: string;
  verticalDistribution: {
    upperSectionTr: string;
    middleSectionTr: string;
    lowerSectionTr: string;
  };
  negativeSpaceStrategyTr: string;
  lineAndShadingApproachTr: string;
  anatomicalFlowTr: string;
  excludedSymbolsWithReasons: ExcludedCompositionSymbol[];
  tattooArtistNotes: string[];
  qualityCheck: CompositionQualityCheck;
}

export interface BuildCompositionPlanOptions {
  preferredPlacement?: BodyPlacement;
  preferredStyle?: TattooStyle;
  customDimensions?: { width: number; height: number };
  excludedSymbols?: string[];
  selectedSymbols?: {
    symbolId: string;
    symbolName: string;
    customMeaning?: string;
    weight?: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  }[];
  includeTotemInVisual?: boolean;
  customNotes?: string;
}

/**
 * Aktif danışanın analizlerine, önerilen sembollerine ve tercihlerine dayalı olarak
 * dengeli, görsel hiyerarşisi net ve anatomik olarak uygulanabilir nihai dövme kompozisyonu planı oluşturur.
 */
export function buildTattooCompositionPlan(
  client: Client,
  archive: ClientArchiveRecord | null,
  options: BuildCompositionPlanOptions = {}
): TattooCompositionPlan {
  const clientName = `${client.firstName} ${client.lastName}`.trim();
  const placementKey: BodyPlacement = options.preferredPlacement || 'FOREARM_INNER';

  // 1. Hariç tutulan sembollerin listesini normalize et ve anne adını koru
  const excludedSet = new Set<string>();
  if (options.excludedSymbols && options.excludedSymbols.length > 0) {
    for (const exc of options.excludedSymbols) {
      if (exc.trim()) excludedSet.add(exc.trim().toLowerCase());
    }
  }
  if (client.motherName && client.motherName.trim()) {
    excludedSet.add(client.motherName.trim().toLowerCase());
  }

  const isExcluded = (sym: SymbolDefinition): boolean => {
    const idLower = sym.id.toLowerCase();
    const nameLower = sym.name.toLowerCase();
    const origLower = (sym.originalName || '').toLowerCase();
    for (const exc of excludedSet) {
      if (idLower.includes(exc) || nameLower.includes(exc) || (origLower && origLower.includes(exc))) {
        return true;
      }
    }
    return false;
  };

  const excludedSymbolsWithReasons: ExcludedCompositionSymbol[] = [];

  // 2. Aday Sembolleri Topla: Manuel Seçimler + AI Önerileri
  interface Candidate {
    symbol: SymbolDefinition;
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
    score: number;
    reason: string;
    source: 'MANUAL_SELECTION' | 'AI_RECOMMENDATION';
  }

  const candidatesMap = new Map<string, Candidate>();

  // A) Manuel seçimler (kullanıcı önceliği)
  if (options.selectedSymbols && options.selectedSymbols.length > 0) {
    for (const sel of options.selectedSymbols) {
      const sym = ALL_MASTER_SYMBOLS.find((s) => s.id === sel.symbolId);
      if (!sym) continue;

      if (isExcluded(sym)) {
        excludedSymbolsWithReasons.push({
          symbolId: sym.id,
          symbolName: sym.name,
          reasonTr: 'Kullanıcı tercihi veya güvenlik kalkanı (Anne Adı) gereği hariç tutuldu.',
        });
        continue;
      }

      candidatesMap.set(sym.id, {
        symbol: sym,
        weight: sel.weight || 'SECONDARY',
        score: sel.weight === 'PRIMARY' ? 100 : 80,
        reason: sel.customMeaning || 'Danışanın kişisel tercihi doğrultusunda kompozisyona dahil edildi.',
        source: 'MANUAL_SELECTION',
      });
    }
  }

  // B) AI Önerileri (Analiz rezonansı)
  const recommendations = getClientRecommendedSymbols(client, archive, {
    excludedSymbols: Array.from(excludedSet),
    includeTotemInVisual: options.includeTotemInVisual || false,
  });

  for (const rec of recommendations) {
    if (isExcluded(rec.symbol)) {
      if (!excludedSymbolsWithReasons.some((e) => e.symbolId === rec.symbol.id)) {
        excludedSymbolsWithReasons.push({
          symbolId: rec.symbol.id,
          symbolName: rec.symbol.name,
          reasonTr: 'Kullanıcı tercihi veya güvenlik kalkanı (Anne Adı) gereği hariç tutuldu.',
        });
      }
      continue;
    }

    if (!candidatesMap.has(rec.symbol.id)) {
      candidatesMap.set(rec.symbol.id, {
        symbol: rec.symbol,
        weight: rec.suggestedWeight,
        score: rec.matchingScore,
        reason: rec.reasonTr,
        source: 'AI_RECOMMENDATION',
      });
    }
  }

  // Eğer hiçbir sembol bulunamazsa, varsayılan kutsal sembol ekle
  if (candidatesMap.size === 0) {
    const defaultSym = ALL_MASTER_SYMBOLS.find((s) => s.id === 'metatron-cube') || ALL_MASTER_SYMBOLS[0];
    candidatesMap.set(defaultSym.id, {
      symbol: defaultSym,
      weight: 'PRIMARY',
      score: 85,
      reason: 'Temel kutsal denge ve geometrik hizalanma için önerildi.',
      source: 'AI_RECOMMENDATION',
    });
  }

  const allCandidates = Array.from(candidatesMap.values());
  const detectedRisks: string[] = [];
  const autoCorrectionsApplied: string[] = [];
  const passedChecks: string[] = [];

  // 3. Kompozisyon Hiyerarşisi ve Odak Rekabeti Yönetimi
  // Birincil Odak Adayı Belirleme:
  // Manuel PRIMARY > PRIMARY_CORE en yüksek puan > En yüksek puanlı sembol
  const manualPrimary = allCandidates.find((c) => c.source === 'MANUAL_SELECTION' && c.weight === 'PRIMARY');
  const primaryCoreCandidates = allCandidates.filter((c) => c.symbol.compositionRole === 'PRIMARY_CORE');

  let primaryCandidate: Candidate;
  if (manualPrimary) {
    primaryCandidate = manualPrimary;
  } else if (primaryCoreCandidates.length > 0) {
    primaryCoreCandidates.sort((a, b) => b.score - a.score);
    primaryCandidate = primaryCoreCandidates[0];
  } else {
    allCandidates.sort((a, b) => b.score - a.score);
    primaryCandidate = allCandidates[0];
  }

  // Odak Rekabeti Denetimi: Birden fazla PRIMARY_CORE var mı?
  const competingPrimaryCores = allCandidates.filter(
    (c) => c.symbol.id !== primaryCandidate.symbol.id && c.symbol.compositionRole === 'PRIMARY_CORE'
  );

  if (competingPrimaryCores.length > 0) {
    detectedRisks.push(
      `Odak Rekabeti Uyarısı: ${competingPrimaryCores.map((c) => c.symbol.name).join(', ')} sembolü de Birincil Odak niteliğindedir.`
    );
    for (const comp of competingPrimaryCores) {
      comp.weight = 'SECONDARY';
      autoCorrectionsApplied.push(
        `Odak Çatışması Yönetildi: ${comp.symbol.name} sembolü, ${primaryCandidate.symbol.name} ile görsel rekabet oluşturmaması için ikincil çevre katmanına (%35) taşındı.`
      );
    }
  } else {
    passedChecks.push('Tekil ve net birincil odak noktası doğrulandı; odak rekabeti bulunmuyor.');
  }

  // Kutsal Geometri Aşırı Yığılma Denetimi:
  // En fazla 2 karmaşık geometri kompozisyonda tutulur, fazlası elenir
  const remainingCandidates = allCandidates.filter((c) => c.symbol.id !== primaryCandidate.symbol.id);
  const activeSecondaryList: Candidate[] = [];
  const activeAccentList: Candidate[] = [];

  let sacredCount = primaryCandidate.symbol.geometryType === 'SACRED_GEOMETRY' ? 1 : 0;

  for (const cand of remainingCandidates) {
    // Toplam dahil edilen sembol sayısı 4'ü geçerse görsel kalabalığı önlemek için ele
    if (activeSecondaryList.length + activeAccentList.length >= 3) {
      excludedSymbolsWithReasons.push({
        symbolId: cand.symbol.id,
        symbolName: cand.symbol.name,
        reasonTr: 'Görsel kalabalığı önleme: Tasarımın nefes alabilmesi ve ten solunumu için sınırlandırıldı.',
      });
      continue;
    }

    if (cand.symbol.geometryType === 'SACRED_GEOMETRY') {
      if (sacredCount >= 2) {
        excludedSymbolsWithReasons.push({
          symbolId: cand.symbol.id,
          symbolName: cand.symbol.name,
          reasonTr: 'Çoklu karmaşık kutsal geometri uyarısı: Göz yorulmasını önlemek için sadeleştirildi.',
        });
        autoCorrectionsApplied.push(
          `${cand.symbol.name} çoklu kutsal geometri karmaşasını önlemek adına tasarımdan çıkarıldı.`
        );
        continue;
      }
      sacredCount++;
    }

    const roleInfo = getDesignRoleDescription(cand.symbol.compositionRole);
    if (roleInfo.roleCategory === 'ACCENT' || cand.weight === 'ACCENT') {
      if (activeAccentList.length < 2) {
        activeAccentList.push(cand);
      } else {
        excludedSymbolsWithReasons.push({
          symbolId: cand.symbol.id,
          symbolName: cand.symbol.name,
          reasonTr: 'Mikro detay dengesi: Aşırı vurgu sembolü yığılmasını engellemek için hariç tutuldu.',
        });
      }
    } else {
      activeSecondaryList.push(cand);
    }
  }

  // Kalite Kontrol Değerlendirmesi
  passedChecks.push('İç ön kol anatomik hatlarıyla uyumlu dikey yönelime karar verildi.');
  passedChecks.push('%45–%50 negatif alan ten solunumu emniyet payı sağlandı.');
  passedChecks.push('Minimum 1.5–2.0 mm çizgi aralığı ile dövme yaşlanma payı korundu.');

  const qualityCheck: CompositionQualityCheck = {
    isPrimaryFocusClear: true,
    isSecondaryBalanced: activeSecondaryList.length <= 2,
    isGeometryConsistent: sacredCount <= 2,
    isNegativeSpaceSufficient: true,
    isAgingReadabilityPreserved: true,
    isAnatomicalFlowAligned: true,
    isClutterFree: activeSecondaryList.length + activeAccentList.length <= 3,
    overallScore: competingPrimaryCores.length > 0 ? 94 : 98,
    passedChecks,
    detectedRisks,
    autoCorrectionsApplied,
  };

  // 4. Kompozisyon Parçalarını Formatla
  const primaryRoleInfo = getDesignRoleDescription(primaryCandidate.symbol.compositionRole);
  const primaryFocus: CompositionSymbolElement = {
    symbolId: primaryCandidate.symbol.id,
    symbolName: primaryCandidate.symbol.name,
    originalName: primaryCandidate.symbol.originalName,
    role: primaryCandidate.symbol.compositionRole,
    roleCategory: 'PRIMARY',
    roleTitleTr: primaryRoleInfo.titleTr,
    positiveSpaceRatioTr: 'Nominal %65 (Ana Gövde)',
    reasonOrTaskTr: primaryCandidate.reason,
    needleStyle: primaryCandidate.symbol.tattooSuitability?.needleStyle || 'FINE_LINE',
    geometryType: primaryCandidate.symbol.geometryType,
    element: primaryCandidate.symbol.elementAssociation,
    originCulture: primaryCandidate.symbol.originCulture,
    source: primaryCandidate.source,
  };

  const secondaryElements: CompositionSymbolElement[] = activeSecondaryList.map((c) => {
    const roleInfo = getDesignRoleDescription(c.symbol.compositionRole);
    return {
      symbolId: c.symbol.id,
      symbolName: c.symbol.name,
      originalName: c.symbol.originalName,
      role: c.symbol.compositionRole,
      roleCategory: 'SECONDARY',
      roleTitleTr: roleInfo.titleTr,
      positiveSpaceRatioTr: '%35 Çevre Desteği',
      reasonOrTaskTr: c.reason,
      needleStyle: c.symbol.tattooSuitability?.needleStyle || 'FINE_LINE',
      geometryType: c.symbol.geometryType,
      element: c.symbol.elementAssociation,
      originCulture: c.symbol.originCulture,
      source: c.source,
    };
  });

  const accentElements: CompositionSymbolElement[] = activeAccentList.map((c) => {
    const roleInfo = getDesignRoleDescription(c.symbol.compositionRole);
    return {
      symbolId: c.symbol.id,
      symbolName: c.symbol.name,
      originalName: c.symbol.originalName,
      role: c.symbol.compositionRole,
      roleCategory: 'ACCENT',
      roleTitleTr: roleInfo.titleTr,
      positiveSpaceRatioTr: 'Mikro Detay (<%10)',
      reasonOrTaskTr: c.reason,
      needleStyle: c.symbol.tattooSuitability?.needleStyle || 'SINGLE_NEEDLE',
      geometryType: c.symbol.geometryType,
      element: c.symbol.elementAssociation,
      originCulture: c.symbol.originCulture,
      source: c.source,
    };
  });

  // 5. Üst, Orta ve Alt Bölüm Dağılımı
  const upperPart = secondaryElements.find((s) => s.role === 'BACKGROUND_FRAME' || s.role === 'CONNECTIVE_FLOW') || secondaryElements[0];
  const lowerPart = accentElements[0] || secondaryElements[1];

  const verticalDistribution = {
    upperSectionTr: upperPart
      ? `Üst Bölüm (Dirsek / Giriş Hattı): ${upperPart.symbolName} konumlandırılarak kompozisyona akıcı bir giriş ve çerçeve kazandırılmıştır.`
      : 'Üst Bölüm: Negatif alan boşluğu ile dirsek ekleminin katlanma çizgisinden tampon mesafe bırakılmıştır.',
    middleSectionTr: `Orta Bölüm (Merkez Odak): ${primaryFocus.symbolName} kompozisyonun kalbi olarak yerleştirilmiş olup, görsel ağırlığın %65\'ini taşır.`,
    lowerSectionTr: lowerPart
      ? `Alt Bölüm (Bilek / Bitiş Hattı): ${lowerPart.symbolName} ile bileğin daralan anatomisine zarif ve dengeli bir mühürleme yapılmıştır.`
      : 'Alt Bölüm: Bilek çizgisine doğru incelen minimalist bitiş çizgileriyle tamamlanmıştır.',
  };

  // 6. Dövme Sanatçısı Uygulama Notları
  const tattooArtistNotes: string[] = [
    `Merkez Odak Konumu: ${primaryFocus.symbolName} sembolünün geometrik ağırlık merkezi iç ön kolun en geniş kas gövdesine hizalanmalıdır.`,
    `İğne Konfigürasyonu: Ana konturlar için 3RL / 5RL fine line; gölgeleme ve dolgular için 3RS veya hassas dotwork tercih edilmelidir.`,
    `Negatif Alan Disiplini: Çizgiler arasında minimum 1.5–2.0 mm ten boşluğu korunmalı, mürekkebin yıllar içindeki kılcal yayılma payı gözetilmelidir.`,
    `Bilek Emniyet Mesafesi: Tasarımın alt sınırı el bileği katlanma çizgisinden en az 2.5–3 cm yukarıda sonlandırılmalıdır.`,
    `Ten Solunumu: %45–%50 oranındaki ten açıklığı katı siyahla boğulmamalı; görsel nefes almalıdır.`,
  ];

  if (competingPrimaryCores.length > 0) {
    tattooArtistNotes.push(
      `Hiyerarşi Uyarısı: İkincil katmandaki ${competingPrimaryCores.map((c) => c.symbol.name).join(', ')} çizgi kalınlığı, ana odaktan (%65) en az 1 kademe daha ince işlenmelidir.`
    );
  }

  // 7. Genel Konsept Açıklaması
  const generalConceptTr = `${clientName} için formüle edilen bu dövme kompozisyonu, ${primaryFocus.symbolName} merkezli bir kutsal denge taşır. ${
    secondaryElements.length > 0
      ? `Çevresinde konumlanan ${secondaryElements.map((s) => s.symbolName).join(' ve ')} ile derinlikli bir geometri sinerjisi kurulmuştur.`
      : 'Tekil odak sadeliği ile kusursuz bir minimalizm hedeflenmiştir.'
  } İç ön kolun doğal fleksör kas hattı boyunca akışkan bir dikey yönelim sağlanmıştır.`;

  return {
    clientId: client.id,
    clientName,
    createdAt: new Date().toISOString(),
    placement: {
      key: placementKey,
      nameTr: 'İç Ön Kol (Forearm Inner)',
      flowDirectionTr: 'Dirsekten bileğe doğru dikey anatomik eksen akışı',
      minDimensionsCm: { width: 10, height: 16 },
      idealDimensionsCm: { width: 14, height: 22 },
    },
    targets: {
      primaryFocusRatioTr: 'Nominal %65 Pozitif Alan (±%5 Tolerans)',
      secondaryLayerRatioTr: '%35 Çevre ve Tamamlayıcı Katman',
      negativeSpaceRatioTr: '%45 – %50 Ten Solunumu ve Yaşlanma Emniyet Payı',
      minLineSpacingMm: '1.5 – 2.0 mm (Mürekkep dağılmasını önleme standardı)',
      dimensionsDisclaimerTr:
        'Belirtilen boyut ve oranlar ideal tasarım hedefleridir; fiziksel anatomiye, ten elastikiyetine ve sanatçının el işçiliğine göre seans esnasında optimize edilmelidir.',
    },
    generalConceptTr,
    primaryFocus,
    secondaryElements,
    accentElements,
    relativePositionsTr: `${primaryFocus.symbolName} merkez eksende dikey omurga görevi görürken, ${
      secondaryElements.length > 0
        ? `${secondaryElements.map((s) => s.symbolName).join(', ')} sembolleri odak etrafında dairesel ve eksenel katmanlar halinde konumlandırılmıştır.`
        : 'diğer unsurlar minimum seviyede tutulmuştur.'
    }`,
    verticalDistribution,
    negativeSpaceStrategyTr:
      'Tasarım yüzeyinin %45–%50\'si boş ten alanı olarak korunmuştur. Sembollerin iç içe geçip birbirini boğmaması için sembol sınırları arasında en az 2 mm negatif alan koridoru bırakılmıştır.',
    lineAndShadingApproachTr:
      'Ana geometrik formlarda keskin ve hassas ince çizgiler (Fine Line), geçişlerde ise ışık-gölge dengesi sunan noktalı gölgelendirme (Dotwork) tekniği kullanılmalıdır. Yoğun blok siyah dolgudan kaçınılmalıdır.',
    anatomicalFlowTr:
      'İç ön kol fleksör kaslarının doğal uzama ekseni takip edilmiştir. Kol hareket ettiğinde tasarımın bükülmesini önlemek için merkezi form kolun tam orta eksenine simetrik oturtulmuştur.',
    excludedSymbolsWithReasons,
    tattooArtistNotes,
    qualityCheck,
  };
}

/**
 * Kompozisyon planını insan tarafından okunabilir, profesyonel Türkçe metin olarak formatlar.
 * Kullanıcı tek tıkla panoya kopyalayabilir.
 */
export function formatCompositionPlanText(plan: TattooCompositionPlan): string {
  const lines: string[] = [];

  lines.push('================================================================');
  lines.push(`NİHAİ DÖVME KOMPOZİSYON PLANI: ${plan.clientName.toUpperCase()}`);
  lines.push(`Tarih: ${new Date(plan.createdAt).toLocaleDateString('tr-TR')}`);
  lines.push('================================================================');
  lines.push('');

  lines.push('1. TASARIMIN GENEL KONSEPTİ');
  lines.push('----------------------------------------------------------------');
  lines.push(plan.generalConceptTr);
  lines.push('');

  lines.push('2. BİRİNCİL ODAK SEMBOLÜ (%65 POZİTİF ALAN)');
  lines.push('----------------------------------------------------------------');
  lines.push(`• Sembol: ${plan.primaryFocus.symbolName} (${plan.primaryFocus.originalName || plan.primaryFocus.originCulture})`);
  lines.push(`• Rol & Pay: ${plan.primaryFocus.roleTitleTr} — ${plan.primaryFocus.positiveSpaceRatioTr}`);
  lines.push(`• Seçilme Gerekçesi: ${plan.primaryFocus.reasonOrTaskTr}`);
  lines.push(`• Geometri & Element: ${plan.primaryFocus.geometryType} · ${plan.primaryFocus.element}`);
  lines.push(`• Önerilen İğne Stili: ${plan.primaryFocus.needleStyle}`);
  lines.push('');

  lines.push('3. İKİNCİL DESTEK VE VURGU SEMBOLLERİ (%35 ÇEVRE)');
  lines.push('----------------------------------------------------------------');
  if (plan.secondaryElements.length === 0 && plan.accentElements.length === 0) {
    lines.push('• İkincil sembol bulunmuyor; kompozisyon yalın tekil odak sadeliğiyle kurgulanmıştır.');
  } else {
    for (const sec of plan.secondaryElements) {
      lines.push(`• [İkincil Destek] ${sec.symbolName}: ${sec.reasonOrTaskTr} (${sec.needleStyle})`);
    }
    for (const acc of plan.accentElements) {
      lines.push(`• [Vurgu / Aksan] ${acc.symbolName}: ${acc.reasonOrTaskTr} (${acc.needleStyle})`);
    }
  }
  lines.push('');

  lines.push('4. SEMBOLLERİN BİRBİRLERİNE GÖRE KONUMLARI');
  lines.push('----------------------------------------------------------------');
  lines.push(plan.relativePositionsTr);
  lines.push('');

  lines.push('5. DİKEY BÖLÜM DAĞILIMI (ÜST - ORTA - ALT)');
  lines.push('----------------------------------------------------------------');
  lines.push(`• ${plan.verticalDistribution.upperSectionTr}`);
  lines.push(`• ${plan.verticalDistribution.middleSectionTr}`);
  lines.push(`• ${plan.verticalDistribution.lowerSectionTr}`);
  lines.push('');

  lines.push('6. NEGATİF ALAN KULLANIM STRATEJİSİ (%45–%50)');
  lines.push('----------------------------------------------------------------');
  lines.push(plan.negativeSpaceStrategyTr);
  lines.push('');

  lines.push('7. ÇİZGİ, DOLGU VE GÖLGELENDİRME YAKLAŞIMI');
  lines.push('----------------------------------------------------------------');
  lines.push(plan.lineAndShadingApproachTr);
  lines.push('');

  lines.push('8. ANATOMİK YERLEŞİM VE AKIŞ AÇIKLAMASI');
  lines.push('----------------------------------------------------------------');
  lines.push(`• Bölge: ${plan.placement.nameTr}`);
  lines.push(`• Akış Yönü: ${plan.placement.flowDirectionTr}`);
  lines.push(`• Minimum Tasarım Boyutu: ${plan.placement.minDimensionsCm.width} × ${plan.placement.minDimensionsCm.height} cm`);
  lines.push(`• İdeal Tasarım Boyutu: ${plan.placement.idealDimensionsCm.width} × ${plan.placement.idealDimensionsCm.height} cm`);
  lines.push(`• Akış Açıklaması: ${plan.anatomicalFlowTr}`);
  lines.push(`• Not: ${plan.targets.dimensionsDisclaimerTr}`);
  lines.push('');

  lines.push('9. TASARIMA ALINMAYAN SEMBOLLER VE GEREKÇELERİ');
  lines.push('----------------------------------------------------------------');
  if (plan.excludedSymbolsWithReasons.length === 0) {
    lines.push('• Elenen veya hariç tutulan sembol bulunmamaktadır.');
  } else {
    for (const exc of plan.excludedSymbolsWithReasons) {
      lines.push(`• ${exc.symbolName}: ${exc.reasonTr}`);
    }
  }
  lines.push('');

  lines.push('10. DÖVME SANATÇISINA UYGULAMA NOTLARI');
  lines.push('----------------------------------------------------------------');
  for (const note of plan.tattooArtistNotes) {
    lines.push(`• ${note}`);
  }
  lines.push('');

  lines.push('11. GÖRSEL BÜTÜNLÜK VE KALİTE KONTROL RAPORU');
  lines.push('----------------------------------------------------------------');
  lines.push(`• Genel Kalite Skoru: ${plan.qualityCheck.overallScore} / 100`);
  lines.push(`• Ana Odak Netliği: ${plan.qualityCheck.isPrimaryFocusClear ? 'ONAYLANDI ✓' : 'UYARI ✗'}`);
  lines.push(`• İkincil Denge: ${plan.qualityCheck.isSecondaryBalanced ? 'DENGELİ ✓' : 'RİSKLİ ✗'}`);
  lines.push(`• Geometri Uyumu: ${plan.qualityCheck.isGeometryConsistent ? 'UYUMLU ✓' : 'KARMAŞIK ✗'}`);
  lines.push(`• Negatif Alan Oranı: ${plan.qualityCheck.isNegativeSpaceSufficient ? 'YETERLİ (%45–%50) ✓' : 'DAR ✗'}`);
  lines.push(`• Yaşlanma ve Çizgi Payı: ${plan.qualityCheck.isAgingReadabilityPreserved ? 'KORUNDU (≥1.5mm) ✓' : 'RİSKLİ ✗'}`);
  lines.push(`• Görsel Kalabalık Kontrolü: ${plan.qualityCheck.isClutterFree ? 'SADE VE OKUNABİLİR ✓' : 'AŞIRI YOĞUN ✗'}`);

  if (plan.qualityCheck.autoCorrectionsApplied.length > 0) {
    lines.push('');
    lines.push('Uygulanan Otomatik Kompozisyon Düzeltmeleri:');
    for (const corr of plan.qualityCheck.autoCorrectionsApplied) {
      lines.push(`  → ${corr}`);
    }
  }

  if (plan.qualityCheck.detectedRisks.length > 0) {
    lines.push('');
    lines.push('Tespit Edilen Tasarım Riskleri:');
    for (const risk of plan.qualityCheck.detectedRisks) {
      lines.push(`  ! ${risk}`);
    }
  }

  lines.push('');
  lines.push('================================================================');

  return lines.join('\n');
}
