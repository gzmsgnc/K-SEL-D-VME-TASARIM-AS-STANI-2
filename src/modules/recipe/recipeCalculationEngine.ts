import { Client } from '../../types/client';
import { TropicalNatalChart } from '../../types/astrology';
import {
  NumerologyAnalysis,
  ChakraAnalysis,
  ArchetypeAnalysis,
} from '../../types/analysis';
import { ClientTestResult } from '../../types/test';
import {
  ClientTattooDesign,
  TattooRecipe,
  AIPromptData,
  TattooStyle,
  BodyPlacement,
  DetailedSymbolRationale,
  ComprehensiveDesignReport,
  RecipeCompositionMetrics,
} from '../../types/design';
import { generateId } from '../../utils/id';
import { TROPICAL_ZODIAC_SIGNS } from '../astrology/constants';
import { NUMBER_RESONANCE_TABLE } from '../numerology/constants';
import { CHAKRA_DEFINITIONS } from '../chakra/constants';
import {
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from './constants';
import { RecipeGenerationOptions } from './types';
import { MASTER_SYMBOLS, ALL_MASTER_SYMBOLS } from '../symbols/masterSymbols';

export interface RecipeEngineInput {
  client: Client;
  astrology?: TropicalNatalChart | null;
  numerology: NumerologyAnalysis;
  chakra: ChakraAnalysis;
  archetype: ArchetypeAnalysis;
  testResults?: ClientTestResult[];
  options?: RecipeGenerationOptions;
  nextVersionNumber: number;
}

/**
 * Filtreleme yardımcısı: Hariç tutulan sembolleri ve anne adını kontrol eder.
 * Hariç tutulan bir kelime içeriyorsa `true` döner (yani sembol reddedilir).
 */
export function isExcluded(
  candidateText: string,
  excludedList: string[],
  motherName?: string
): boolean {
  if (!candidateText) return false;
  const lower = candidateText.toLocaleLowerCase('tr-TR');

  // Kural 6: Anne adı yalnızca Ebced amacıyla kullanılabilir; dövme sembolü olarak reçeteye taşınamaz
  if (motherName && motherName.trim().length > 1) {
    const motherLower = motherName.trim().toLocaleLowerCase('tr-TR');
    if (lower.includes(motherLower)) {
      return true;
    }
  }

  // Kural 5: Kullanıcının özellikle hariç tuttuğu semboller
  for (const exc of excludedList) {
    const cleanExc = exc.trim().toLocaleLowerCase('tr-TR');
    if (cleanExc && lower.includes(cleanExc)) {
      return true;
    }
  }

  return false;
}

/**
 * Danışanın tüm doğrulanmış analiz katmanlarını (Astroloji, Numeroloji, Çakra, Arketip ve Testler)
 * sentezleyerek kişiye özel nihai dövme reçetesini ve AI tasarım promptunu üretir.
 */
export function generateTattooRecipeFromAnalyses(
  input: RecipeEngineInput
): ClientTattooDesign {
  const {
    client,
    astrology,
    numerology,
    chakra,
    archetype,
    testResults = [],
    options = {},
    nextVersionNumber,
  } = input;

  // 1. Temel Doğrulamalar ve Danışan İzolasyonu
  if (!client || !client.id) {
    throw new Error('Geçerli bir danışan kaydı gereklidir.');
  }
  if (!numerology || typeof numerology.lifePathNumber !== 'number') {
    throw new Error('Dövme reçetesi için geçerli bir Numeroloji analizi gereklidir.');
  }
  if (!chakra || !Array.isArray(chakra.chakras) || chakra.chakras.length === 0) {
    throw new Error('Dövme reçetesi için geçerli bir Çakra analizi gereklidir.');
  }
  if (!archetype || !archetype.unifiedArchetype || !archetype.shadowArchetype) {
    throw new Error('Dövme reçetesi için geçerli bir Arketip analizi gereklidir.');
  }

  const rawExcluded = options.excludedSymbols || [];
  const excludedClean = rawExcluded.map((s) => s.trim()).filter(Boolean);
  const motherName = client.motherName;

  // 2. Seçilen Stil, Yerleşim ve Renk Profili (Kural 9: Hiçbir stil sınırlandırılmaz)
  const styleKey: TattooStyle = options.preferredStyle || 'SACRED_GEOMETRY';
  const styleInfo = TATTOO_STYLES[styleKey] || TATTOO_STYLES.SACRED_GEOMETRY;

  const placementKey: BodyPlacement = options.preferredPlacement || 'FOREARM_INNER';
  const placementInfo = BODY_PLACEMENTS[placementKey] || BODY_PLACEMENTS.FOREARM_INNER;

  const colorProfileKey: TattooRecipe['colorProfile'] =
    options.colorPreference || 'MONOCHROME_BLACK';
  const colorInfo = COLOR_PROFILES[colorProfileKey] || COLOR_PROFILES.MONOCHROME_BLACK;

  // 3. Sembol Katmanlarının Oluşturulması
  // A) Yapılandırılmış Sembol Nesneleri (ADIM 2B: BİRİNCİL, İKİNCİL, VURGU hiyerarşisi)
  const selectedSymbolObjects = options.selectedSymbolObjects || [];
  const primarySelectedObj = selectedSymbolObjects.find((s) => s.weight === 'PRIMARY');
  const secondarySelectedObjs = selectedSymbolObjects.filter((s) => s.weight === 'SECONDARY');
  const accentSelectedObjs = selectedSymbolObjects.filter((s) => s.weight === 'ACCENT');

  // Ana Sembol (Primary Symbol): Yaşam Yolu geometrisi ve Ana Arketip rezonansı veya kullanıcı seçimi
  const lifePathResonance = NUMBER_RESONANCE_TABLE[numerology.lifePathNumber];
  let primarySymbolCandidate =
    primarySelectedObj?.symbolName && !isExcluded(primarySelectedObj.symbolName, excludedClean, motherName)
      ? primarySelectedObj.symbolName
      : options.primarySymbol && !isExcluded(options.primarySymbol, excludedClean, motherName)
        ? options.primarySymbol
        : `${lifePathResonance?.tattooSymbolTheme || 'Altın oran dairesel mandala ve kutsal yaşam tohumu'}`;

  if (isExcluded(primarySymbolCandidate, excludedClean, motherName)) {
    primarySymbolCandidate = 'Kutsal oranlı geometrik güneş ekseni ve denge halkası';
    if (isExcluded(primarySymbolCandidate, excludedClean, motherName)) {
      primarySymbolCandidate = 'Merkezi harmonik simetri ve yaşam tohumu formu';
    }
  }

  // B) İkincil Semboller (Secondary Symbols):
  // - Astroloji: Güneş, Ay ve Yükselen glifleri
  // - Çakra: Destek gereken çakranın güçlendirici formu ve baskın çakra
  // - Arketip: Gölge arketipin dönüştürücü sembolü
  const candidateSecondary: string[] = [];

  // Astroloji Katkısı: Batı tropikal zodyak analiziyle Güneş, Ay ve Yükselen burçları dahil edilir.
  // MC, astrolojik evler, düğümler ve Vedik sistemler tasarıma dahil edilmez.
  if (astrology) {
    const sunSign = astrology.sunSign || astrology.planetaryPositions?.find((p) => p.body === 'Sun')?.sign;
    const moonSign = astrology.moonSign || astrology.planetaryPositions?.find((p) => p.body === 'Moon')?.sign;
    const ascSign = astrology.ascendantSign || astrology.planetaryPositions?.find((p) => p.body === 'Ascendant')?.sign;

    const sunMeta = sunSign ? TROPICAL_ZODIAC_SIGNS[sunSign] : null;
    const moonMeta = moonSign ? TROPICAL_ZODIAC_SIGNS[moonSign] : null;
    const ascMeta = ascSign ? TROPICAL_ZODIAC_SIGNS[ascSign] : null;
    const isAscApprox = Boolean(astrology.isBirthTimeUnknown);
    const ascSuffix = isAscApprox ? ' (12:00 varsayımlı, kesin değil - doğum saati bilinmiyor)' : '';

    const astroParts: string[] = [];
    if (sunSign) {
      astroParts.push(`${sunMeta?.nameTr || sunSign} Güneş (${sunMeta?.symbolGlyph || '☉'})`);
    }
    if (moonSign) {
      astroParts.push(`${moonMeta?.nameTr || moonSign} Ay (${moonMeta?.symbolGlyph || '☽'})`);
    }
    if (ascSign) {
      astroParts.push(`${ascMeta?.nameTr || ascSign} Yükselen (ASC${ascSuffix})`);
    }

    if (astroParts.length > 0) {
      const astroSymbol = `${astroParts.join(', ')} kozmik hizalanması`;
      if (!isExcluded(astroSymbol, excludedClean)) {
        candidateSecondary.push(astroSymbol);
      }
    }
  }

  // Çakra Destek Katkısı (Tüm eşit destek/blokaj çakraları için sembolik destek)
  const deficitList = (chakra.deficitChakras && chakra.deficitChakras.length > 0)
    ? chakra.deficitChakras
    : (chakra.primaryDeficit ? [chakra.primaryDeficit] : []);
  const deficitChakra = deficitList[0];

  for (const defKey of deficitList) {
    if (CHAKRA_DEFINITIONS[defKey]) {
      const chakraDef = CHAKRA_DEFINITIONS[defKey];
      const chakraItem = `${chakraDef.nameTr} desteği için ${chakraDef.tattooStrengtheningTheme.split(',')[0]}`;
      if (!isExcluded(chakraItem, excludedClean, motherName) && !candidateSecondary.includes(chakraItem)) {
        candidateSecondary.push(chakraItem);
      }
    }
  }

  // Gölge Arketip Dönüştürücü Sembolü
  const transformationalSymbol = archetype.shadowArchetype.transformationalSymbol;
  let safeTransformSymbol = 'Dengeleyici Kutsal Geometri';
  if (transformationalSymbol && !isExcluded(transformationalSymbol, excludedClean, motherName)) {
    safeTransformSymbol = transformationalSymbol.trim().replace(/[.,\s]+$/, '');
    candidateSecondary.push(`Dönüştürücü odak: ${safeTransformSymbol}`);
  }
  const cleanTransformSymbol = safeTransformSymbol.trim().replace(/[.,\s]+$/, '');

  // Kullanıcı tarafından seçilmiş İKİNCİL semboller (Yapılandırılmış listeden)
  for (const sObj of secondarySelectedObjs) {
    if (!isExcluded(sObj.symbolName, excludedClean, motherName) && !candidateSecondary.includes(sObj.symbolName)) {
      candidateSecondary.push(sObj.symbolName);
    }
  }

  // Geriye dönük uyumluluk: options.selectedSymbols dizisi
  if (options.selectedSymbols && options.selectedSymbols.length > 0) {
    for (const sel of options.selectedSymbols) {
      if (!isExcluded(sel, excludedClean, motherName) && !candidateSecondary.includes(sel)) {
        candidateSecondary.push(sel);
      }
    }
  }

  // C) Vurgu Sembolleri (Accent Symbols - Asla İKİNCİL'e dönüştürülmez!)
  const candidateAccent: string[] = [];
  for (const aObj of accentSelectedObjs) {
    if (!isExcluded(aObj.symbolName, excludedClean, motherName) && !candidateAccent.includes(aObj.symbolName)) {
      candidateAccent.push(aObj.symbolName);
    }
  }
  if (options.accentSymbols && options.accentSymbols.length > 0) {
    for (const acc of options.accentSymbols) {
      if (!isExcluded(acc, excludedClean, motherName) && !candidateAccent.includes(acc)) {
        candidateAccent.push(acc);
      }
    }
  }

  // C) Totem Değerlendirmesi (Kural 7, 8 & A62)
  const totemTest = [...testResults].reverse().find(
    (t) => t.testType === 'ANIMAL_TOTEM' && Boolean(t.primaryType || (t as any).primaryTotem)
  );

  let effectiveTotemAnimal = '';
  let effectiveTotemRole = '';
  if (totemTest) {
    if (totemTest.selectedTotemAnimal && !isExcluded(totemTest.selectedTotemAnimal, excludedClean, motherName)) {
      effectiveTotemAnimal = totemTest.selectedTotemAnimal;
      effectiveTotemRole = 'Danışan Tarafından Seçilen Totem';
    } else if (totemTest.totemPriorityRankings && totemTest.totemPriorityRankings.length > 0) {
      const rejectedList = totemTest.rejectedTotemAnimals || [];
      const candidate = totemTest.totemPriorityRankings.find(
        (item) =>
          item.isDesignCandidate &&
          item.rawScore > 0 &&
          !rejectedList.includes(item.animal) &&
          !isExcluded(item.animal, excludedClean, motherName)
      );
      if (candidate) {
        effectiveTotemAnimal = candidate.animal;
        effectiveTotemRole = candidate.roleLabelTr;
      }
    }
    if (!effectiveTotemAnimal && totemTest.primaryType) {
      const isExplicitZero =
        totemTest.dominantScores &&
        totemTest.dominantScores[totemTest.primaryType] !== undefined &&
        totemTest.dominantScores[totemTest.primaryType] === 0;

      if (!isExplicitZero && !isExcluded(totemTest.primaryType, excludedClean, motherName)) {
        effectiveTotemAnimal = totemTest.primaryType;
        effectiveTotemRole = 'Ana Tasarım Önceliği';
      }
    }
  }

  const primaryName = effectiveTotemAnimal;
  const secondaryName =
    totemTest && totemTest.secondaryType && totemTest.secondaryType !== primaryName && !isExcluded(totemTest.secondaryType, excludedClean, motherName)
      ? totemTest.secondaryType
      : '';
  const fullTotemTitle = primaryName ? (secondaryName ? `${primaryName} ve ${secondaryName}` : primaryName) : '';
  let totemAbstractionNotes = '';
  let totemPromptPhrase = '';
  if (primaryName) {
    if (options.includeTotemInVisual) {
      totemAbstractionNotes = `Ruh hayvanı (${fullTotemTitle}) kesinlikle doğrudan veya sticker benzeri bir figür olarak değil; kompozisyona gizlenmiş minimalist soyut çizgiler ve geometrik silüet olarak entegre edilmiştir.`;
      const abstractTotemItem = `Soyut ${fullTotemTitle} silüeti (negatif alan geometrisi)`;
      if (!candidateSecondary.includes(abstractTotemItem)) {
        candidateSecondary.push(abstractTotemItem);
      }
      totemPromptPhrase = `abstract geometric silhouette of ${primaryName}${secondaryName ? ` and ${secondaryName}` : ''}`;
    } else {
      totemAbstractionNotes = `Danışanın hayvan totemi (${fullTotemTitle}) analiz amacıyla kullanıldı, görsel tasarıma dahil edilmedi.`;
    }
  } else {
    totemAbstractionNotes = 'Bu danışan için tamamlanmış bir ruh hayvanı totemi analizi bulunmamaktadır; analiz sembolik geometri ve elementel rezonans üzerinden yapılandırılmıştır.';
  }

  // D) Enneagram Değerlendirmesi
  const enneagramTest = testResults.find((t) => t.testType === 'ENNEAGRAM');
  let enneagramInsight = '';
  if (enneagramTest && enneagramTest.primaryType) {
    enneagramInsight = `Enneagram ${enneagramTest.primaryType} mizacı, tasarımın net odaklanmasını ve içsel sınırlarını güçlendirmektedir.`;
  }

  // 4. Sembol Birleşimi ve Hiyerarşi Kuralları
  const symbolCombinationRules = [
    `Ana Görsel Odak (~%65 Pozitif Form): ${primarySymbolCandidate}`,
    candidateSecondary.length > 0
      ? `Tamamlayıcı Katman (~%35 Pozitif Form): ${candidateSecondary.slice(0, 3).join(' · ')}`
      : 'Tamamlayıcı Katman (~%35 Pozitif Form): Dengeleyici kutsal oran daireleri',
    ...(candidateAccent.length > 0
      ? [`Vurgu ve Mikro Detay Katmanı: ${candidateAccent.join(' · ')}`]
      : []),
    `Negatif Alan Hedefi: %45–50 temiz ten boşluğu, ${styleInfo.nameTr} akış hatları ve asgari 1.5–2 mm çizgi aralığı`,
    'Tüm sembolik öğeler parçalı yamalar halinde değil, tek bir akıcı ve bütünsel kompozisyonda eritilmelidir.',
  ];

  // 4.5. Ebat ve Ölçü Hesaplaması (Özel ölçüler veya anatomik varsayılanlar)
  const customDims = options.customDimensions;
  const effectiveDimensions =
    customDims && customDims.width > 0 && customDims.height > 0
      ? { width: customDims.width, height: customDims.height }
      : placementInfo.recommendedDimensions;

  // 5. Sanatçıya Yönelik Teknik Uygulama Talimatları (Kural 10 & 12)
  const technicalAdviceForArtist: string[] = [
    ...styleInfo.needleRecommendationsTr,
    'Hassas Çizgi Güvenlik Aralığı: Çizgiler arasında asgari 1.5–2.0 mm mesafe bırakılarak pigment yayılması (blowout) ve hatların kaynaşması önlenmelidir.',
    styleInfo.lineSpacingAdviceTr,
    styleInfo.antiBlowoutWarningTr,
    `Önerilen Ebat: ${effectiveDimensions.width}cm x ${effectiveDimensions.height}cm (${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik; İdeal: 22 × 14 cm, Asgari: 16 × 10 cm - ${placementInfo.nameTr} anatomisi için optimize edilmiştir).`,
    `Renk/Mürekkep Uygulaması: ${colorInfo.nameTr} (${colorInfo.rationaleTr}).`,
    'Kompozisyon ve Negatif Alan Hedefi: Toplam yerleşim alanının %45–50\'si temiz ten (negatif alan) olarak korunmalı, pozitif dövme formunun ~%65\'i ana görsel odağa (Yaşam Yolu & Birincil Arketip çıpası), kalan ~%35\'i ikincil göksel/çakra katmanlarına ayrılmalıdır.',
    ...(candidateAccent.length > 0
      ? [`Vurgu Sembolleri: ${candidateAccent.join(', ')} mikro detay ve tek iğne hassasiyetiyle ana odağı gölgelemeden işlenmelidir.`]
      : []),
  ];

  // 6. Felsefi ve Anlamsal Konsept Manifestosu (Concept Statement - Kural 11: Negatif/kötü ifadeler yok)
  const conceptStatement = [
    `Bu kompozisyon, ${client.firstName} ${client.lastName} için "${archetype.unifiedArchetype.primary}" arketipinin ışık potansiyelini yaşam yoluna sabitlemek üzere tasarlanmıştır.`,
    `Yaşam Yolu ${numerology.lifePathNumber} titreşimi ile ${primarySymbolCandidate} merkezde yükselirken, ${archetype.unifiedArchetype.secondary} arketipinin dışavurum gücü kompozisyonu destekler.`,
    deficitChakra
      ? `Tasarım, ${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr} merkezindeki blokajı dönüştürmek için ${cleanTransformSymbol} geometrisini koruyucu bir mühür olarak entegre eder.`
      : 'Tüm çakra merkezleri dengeli akışta olup tasarım saf ahenk ve koruyucu geometriye odaklanır.',
    enneagramInsight,
    'Tasarım, bireyin kendi öz gücünü, içsel şefkatini ve sarsılmaz dengesini daima hatırlatan kalıcı bir görsel pusuladır.',
  ]
    .filter(Boolean)
    .join(' ');

  // 7. Tasarım Başlığı
  const title = `${archetype.unifiedArchetype.primary} & ${styleInfo.nameTr.split('(')[0].trim()} Reçetesi (V${nextVersionNumber})`;

  // 8. Görsel Üretim İstemleri (AIPromptData)
  // Kural 5: Hariç tutulan semboller ASLA prompta girmez.
  // Kural 6: Anne adı ASLA prompta girmez (Negatif prompt dahil hiçbir alana sızdırılmaz).
  // Kural 8: Hayvan doğrudan önerilmez, soyut geometrik kılavuz.
  const promptStyleTokens = styleInfo.aestheticPromptKeywords.join(', ');
  const promptColorTokens = colorInfo.promptModifier;

  const safeSecondaryForPrompt = candidateSecondary.length > 0
    ? candidateSecondary[0]
        .replace(/Yükselen/gi, 'celestial horizon')
        .replace(/\(ASC[^)]*\)/gi, '')
        .replace(/Ay/gi, 'lunar crescent')
        .replace(/Güneş/gi, 'solar glyph')
        .replace(/hizalanması/gi, 'alignment')
        .replace(/kozmik/gi, 'cosmic')
        .replace(/[()]/g, '')
        .trim()
    : '';

  const promptSubjects = [
    primarySymbolCandidate,
    safeSecondaryForPrompt,
    totemPromptPhrase,
    'mystical sacred geometry',
    'balanced anatomical composition',
    'tattoo stencil design',
  ]
    .filter(Boolean)
    .filter((s) => !isExcluded(s, excludedClean, motherName));

  const promptSubject = promptSubjects.join(', ');

  const defaultNoList = [
    'shading noise',
    'color smudge',
    'ugly anatomy',
    'cartoon',
    'photo frame',
    'skin pores',
    'realistic animal face',
  ];

  const technicalCompositionTokens = '65% dominant central visual core weight, 35% surrounding complementary accents, 45-50% clean skin negative space, minimum 1.5-2.0mm fine linework spacing';
  const primaryPromptEn = `${promptSubject}, ${technicalCompositionTokens}, ${promptStyleTokens}, ${promptColorTokens}, professional tattoo flash art, vector perfection, sharp edges, pure white background --no ${defaultNoList.join(', ')}`;

  const conceptPromptTr = `${client.firstName} için ${styleInfo.nameTr} stilinde, ${placementInfo.nameTr} bölgesine uygun ${primarySymbolCandidate} ve dönüştürücü geometri içeren profesyonel dövme tasarımı.`;

  const negativePromptItems = [
    'blur',
    'ugly lines',
    'low contrast',
    'color bleeding',
    'cartoonish sticker look',
    'realistic animal face',
    'text watermark',
    'deformed geometry',
    'no names',
    'no letters',
    'no words',
    'no text',
    'no dates',
    'no personal text',
    'no typography',
    ...excludedClean,
  ];

  const negativePrompt = negativePromptItems.join(', ');

  const now = new Date().toISOString();

  // A57: C. Her Sembol İçin Ayrı ve Ayrıntılı Açıklama (Detailed Symbol Rationales)
  const detailedSymbols: DetailedSymbolRationale[] = [];

  // 1. Ana Sembol
  const primaryMaster = primarySelectedObj
    ? (MASTER_SYMBOLS[primarySelectedObj.symbolId] || ALL_MASTER_SYMBOLS.find((s) => s.id === primarySelectedObj.symbolId || s.name === primarySelectedObj.symbolName))
    : ALL_MASTER_SYMBOLS.find((s) => s.name === primarySymbolCandidate || s.id === primarySymbolCandidate);

  const primaryCustomMeaningClean = primarySelectedObj?.customMeaning?.trim() || undefined;
  const primaryPersonalTheme = primaryCustomMeaningClean
    ? primaryCustomMeaningClean
    : (primaryMaster?.traditionalMeaningTr || `Yaşam Yolu ${numerology.lifePathNumber} titreşiminin yaşam rotası odağı ve ${archetype.unifiedArchetype.primary} arketipinin ışık potansiyeli.`);
  const primaryCompRole = primaryMaster?.compositionRole
    ? `Merkezi Odak (Primary Core): ${primaryMaster.compositionRole}. Tasarımın ana dikey ekseninde yer alan, tüm diğer geometrik ve sembolik katmanları kendine bağlayan taşıyıcı omurga.`
    : 'Merkezi Odak (Primary Core): Tasarımın ana dikey ekseninde yer alan, tüm diğer geometrik ve sembolik katmanları kendine bağlayan taşıyıcı omurga.';
  const primaryRelated = 'Çakra dengeleyici form ve gölge dönüşüm geometrisi ile doğrudan bağlantılıdır; dış katmanlardan gelen enerjiyi merkezde toplayıp dengeler.';
  const primaryVisual = `${styleInfo.nameTr} tekniğiyle; kusursuz altın oran simetrisi, net konturlar ve merkezde nefes alan negatif boşluklarla işlenmelidir.`;
  const primaryLoss = 'Bu sembol çıkarılırsa danışanın Yaşam Yolu titreşimini ve ana arketipini ten üzerinde sabitleyen merkezi çıpa ortadan kalkar; tasarım birleşik bir manifesto olmaktan çıkıp odaksız motiflere dönüşür.';

  detailedSymbols.push({
    symbolName: primarySymbolCandidate,
    symbolId: primaryMaster?.id || primarySelectedObj?.symbolId,
    isPrimary: true,
    weight: 'PRIMARY',
    originSourceTr: primarySelectedObj
      ? 'Danışanın Sembol Kütüphanesinden seçtiği birincil sembol tercihi.'
      : (options.primarySymbol
          ? 'Danışanın doğrudan seçtiği birincil sembol tercihi.'
          : `Modern Standart Pisagor Numerolojisi Yaşam Yolu ${numerology.lifePathNumber} (${lifePathResonance?.keywordTr || 'Öz Titreşim'}) ve Birincil Arketip (${archetype.unifiedArchetype.primary}) rezonansı.`),
    originAnalysis: primarySelectedObj ? 'Sembol Kütüphanesi (Birincil)' : (options.primarySymbol ? 'Danışan Özel Seçimi' : 'Pisagor Numerolojisi'),
    originValue: primarySelectedObj?.symbolName || (options.primarySymbol ? 'Özel İstek' : `Yaşam Yolu ${numerology.lifePathNumber}`),
    customMeaning: primaryCustomMeaningClean,
    traditionalMeaningTr: primaryMaster?.traditionalMeaningTr,
    esotericMeaningTr: primaryMaster?.esotericMeaningTr,
    analysisAssociations: primaryMaster?.analysisAssociations || [],
    compositionRole: primaryMaster?.compositionRole || 'PRIMARY_CORE',
    personalThemeTr: primaryPersonalTheme,
    personalTheme: primaryPersonalTheme,
    compositionRoleTr: primaryCompRole,
    relatedSymbolNameTr: primaryRelated,
    relatedSymbol: 'Çakra dengeleyici form ve gölge dönüşüm geometrisi',
    visualExecutionTr: primaryVisual,
    visualExecution: primaryVisual,
    layerLossMeaningTr: primaryLoss,
    meaningRiskIfRemoved: primaryLoss,
  });

  // 2. İkincil Semboller
  for (const sym of candidateSecondary) {
    if (sym.includes('Güneş') || sym.includes('Ay') || sym.includes('Yükselen') || sym.includes('ASC')) {
      const sunName = (astrology && astrology.sunSign ? TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr : '') || 'Güneş';
      const moonName = (astrology && astrology.moonSign ? TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr : '') || 'Ay';
      const ascName = (astrology && astrology.ascendantSign ? TROPICAL_ZODIAC_SIGNS[astrology.ascendantSign]?.nameTr : '') || 'Yükselen';
      const isAscApprox = Boolean(astrology?.isBirthTimeUnknown);
      const astroTheme = `Bilinçli öz irade ve yaşam enerjisi (${sunName} Güneş), bilinçdışı sezgiler ve duygusal güvenlik (${moonName} Ay) ile dış dünyayla kurulan temas tarzı (${ascName} Yükselen) arasındaki kozmik denge.${isAscApprox ? ' (Doğum saati bilinmediği için 12:00 varsayımı kullanılmıştır; Yükselen burç sonucu kesin değildir).' : ''}`;
      const astroLoss = 'Bu sembol çıkarılırsa bireyin Güneş öz iradesi, Ay sezgisel derinliği ve dış dünyaya açılan yükselen ekseninin göksel rezonansı tasarımdan eksilir.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: `Batı / Tropical Zodyak analizi (${sunName} Güneş, ${moonName} Ay, ${ascName} Yükselen - Güneş, Ay ve Yükselen burçları dahil edilmiş; MC, evler, düğümler ve Vedik sistem hariç tutulmuştur.${isAscApprox ? ' Doğum saati bilinmediği için 12:00 varsayımı kullanılmıştır, Yükselen kesin değildir.' : ''})`,
        originAnalysis: 'Batı / Tropical Zodyak',
        originValue: `${sunName} Güneş, ${moonName} Ay & ${ascName} Yükselen${isAscApprox ? ' (12:00 varsayımlı, kesin değil)' : ''}`,
        personalThemeTr: astroTheme,
        personalTheme: astroTheme,
        compositionRoleTr: 'Tamamlayıcı Göksel Katman: Ana sembolün üst/yan kanatlarında yer alarak kompozisyona zamansal ve göksel imza kazandırır.',
        compositionRole: 'Tamamlayıcı Göksel Katman',
        relatedSymbolNameTr: `Merkezi ${primarySymbolCandidate} ile hizalanır; Güneş iradesi, Ay sezgisi ve Yükselen eksenini merkezi mandalanın kanatlarında dengeler.`,
        relatedSymbol: `Merkezi ${primarySymbolCandidate}`,
        visualExecutionTr: 'Minimalist astronomik güneş, ay ve yükselen glifleri, ince mikro çizgi yaylarıyla ana geometriye kaynaştırılmalıdır.',
        visualExecution: 'Minimalist güneş, ay ve yükselen glifleri ve mikro çizgi yayları',
        layerLossMeaningTr: astroLoss,
        meaningRiskIfRemoved: astroLoss,
      });
    } else if (sym.includes('desteği için')) {
      const defDef = deficitChakra ? CHAKRA_DEFINITIONS[deficitChakra] : undefined;
      const chName = defDef?.nameTr || 'Destek Çakrası';
      const chElem = defDef?.elementTr || 'Doğal';
      const chTheme = `Enerji akışının tıkandığı veya desteğe ihtiyaç duyduğu ${chName} merkezini (${chElem} elementi) sembolik olarak besleme, akışı canlandırma ve güçlendirme niyeti.`;
      const chLoss = 'Bu sembol çıkarılırsa dövmenin en önemli fonksiyonel amacı olan enerjetik destek ve blokaj dengeleme niyet katmanı tasarımdan eksilir.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: `7 Temel Çakra analizi (Uygulamanın puanlama kurallarına göre 4 veya altında tespit edilen en düşük puanlı destek/blokaj çakrası; baskın çakra hariç tutulmuştur).`,
        originAnalysis: '7 Temel Çakra Dengesi',
        originValue: `${chName} (${chElem} Elementi)`,
        personalThemeTr: chTheme,
        personalTheme: chTheme,
        compositionRoleTr: 'Destekleyici ve Akışkan Katman: Kompozisyonun alt veya yan akış hatlarında yer alarak merkeze doğru canlandırıcı enerji kanalları açar.',
        compositionRole: 'Destekleyici ve Akışkan Katman',
        relatedSymbolNameTr: `Gölge arketip dönüşüm geometrisi (${cleanTransformSymbol}) ve merkezi odakla kenetlenir.`,
        relatedSymbol: `Gölge arketip dönüşüm geometrisi (${cleanTransformSymbol})`,
        visualExecutionTr: 'Yumuşak geçişli eğriler, ritmik dalga veya hilal yayları ve ten boşluklarıyla (negatif alan) hafifletilerek işlenmelidir.',
        visualExecution: 'Yumuşak geçişli eğriler ve negatif alan boşlukları',
        layerLossMeaningTr: chLoss,
        meaningRiskIfRemoved: chLoss,
      });
    } else if (sym.includes('Dönüştürücü odak:')) {
      const shadowTheme = `Bilinçdışı savunma kalıbını (${archetype.shadowArchetype.shadowName}) şefkatle fark edip sağlıklı yaratıcı güce ve öz sevgiye dönüştürme simyası.`;
      const shadowLoss = 'Bu sembol çıkarılırsa tasarımın bireyin içsel engellerini aşmasını ve gölgesini kucaklamasını temsil eden simyasal dönüşüm katmanı eksilir.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: `Arketip motoru (${archetype.shadowArchetype.shadowName} gölge dinamiklerinin dönüştürücü geometrisi).`,
        originAnalysis: 'Birleşik ve Gölge Arketip',
        originValue: archetype.shadowArchetype.shadowName,
        personalThemeTr: shadowTheme,
        personalTheme: shadowTheme,
        compositionRoleTr: 'Koruyucu Mühür (Transformational Seal): Ana sembol ile çakra destek formu arasındaki geçiş kapısı vazifesi görür.',
        compositionRole: 'Koruyucu Mühür (Transformational Seal)',
        relatedSymbolNameTr: 'Çakra destek formu ile birebir örtüşür; gölgenin ışığa evrilmesini görselleştirir.',
        relatedSymbol: 'Çakra destek formu',
        visualExecutionTr: 'Kutsal geometri oranları (iç içe geçen kutsal halkalar, orantılı lensler), ince konturlar ve yüksek negatif boşlukla zarifçe yerleştirilmelidir.',
        visualExecution: 'Kutsal geometri oranları, ince konturlar ve yüksek negatif boşluk',
        layerLossMeaningTr: shadowLoss,
        meaningRiskIfRemoved: shadowLoss,
      });
    } else if (sym.includes('Soyut') && sym.includes('silüeti')) {
      const totemTheme = `Doğal içgüdüsel bilgelik, ruhsal rehberlik ve ${fullTotemTitle} toteminin temsil ettiği koruyucu doğal frekans.`;
      const totemLoss = 'Bu sembol çıkarılırsa danışanın doğayla ve ruh hayvanıyla kurduğu sezgisel bağın görsel rezonansı tasarımdan çıkar.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: `Hayvan Totemi Testi (${fullTotemTitle}) ve danışanın görsel entegrasyon tercihi (includeTotemInVisual = true).`,
        originAnalysis: 'Şamanik Ruh Hayvanı Totemi',
        originValue: fullTotemTitle,
        personalThemeTr: totemTheme,
        personalTheme: totemTheme,
        compositionRoleTr: 'Gizli Arka Plan Katmanı: Doğrudan bir figür olarak değil, geometrinin oluşturduğu negatif boşlukta keşfedilen ikinci bir algı katmanı.',
        compositionRole: 'Gizli Arka Plan Katmanı',
        relatedSymbolNameTr: 'Merkezi kutsal geometri hatlarıyla kaynaştırılmıştır; çizgilerin kesişim noktaları hayvanın soyut hatlarını ima eder.',
        relatedSymbol: 'Merkezi kutsal geometri',
        visualExecutionTr: 'Kesinlikle doğrudan veya sticker benzeri bir figür olarak değil; kompozisyona gizlenmiş minimalist soyut çizgiler ve geometrik silüet olarak işlenmelidir.',
        visualExecution: 'Minimalist soyut çizgiler ve negatif alan silüeti',
        layerLossMeaningTr: totemLoss,
        meaningRiskIfRemoved: totemLoss,
      });
    } else {
      const selObj = selectedSymbolObjects.find((s) => s.symbolName === sym || s.symbolId === sym);
      const masterSym = selObj
        ? (MASTER_SYMBOLS[selObj.symbolId] || ALL_MASTER_SYMBOLS.find((s) => s.id === selObj.symbolId || s.name === selObj.symbolName))
        : ALL_MASTER_SYMBOLS.find((s) => s.name === sym || s.id === sym);

      const secondaryCustomMeaningClean = selObj?.customMeaning?.trim() || undefined;
      const secondaryTheme = secondaryCustomMeaningClean
        ? secondaryCustomMeaningClean
        : (masterSym?.traditionalMeaningTr || `${sym} tamamlayıcı katmanı.`);
      const secondaryLoss = `Bu sembol çıkarılırsa tasarımın ${masterSym?.originCulture ? `${masterSym.originCulture} kökenli ` : ''}tamamlayıcı katmanı ve estetik dengesi eksilir.`;

      detailedSymbols.push({
        symbolName: sym,
        symbolId: masterSym?.id || selObj?.symbolId,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: selObj
          ? 'Danışanın Sembol Kütüphanesinden seçtiği ikincil sembol tercihi.'
          : 'Danışanın bilinçli tercihi ve onaylanan kişisel sembol seçimi.',
        originAnalysis: 'Sembol Kütüphanesi (İkincil)',
        originValue: masterSym?.name || sym,
        customMeaning: secondaryCustomMeaningClean,
        traditionalMeaningTr: masterSym?.traditionalMeaningTr,
        esotericMeaningTr: masterSym?.esotericMeaningTr,
        analysisAssociations: masterSym?.analysisAssociations || [],
        compositionRole: masterSym?.compositionRole || 'SECONDARY_LAYER',
        personalThemeTr: secondaryTheme,
        personalTheme: secondaryTheme,
        compositionRoleTr: masterSym?.compositionRole
          ? `Tamamlayıcı Katman: ${masterSym.compositionRole}. Ana sembolik odağı çevreleyen ve dengeleyen ikincil form.`
          : 'Tamamlayıcı Katman: Kompozisyonun dış hatlarını çerçeveleyen veya dengeleyici aks oluşturan unsur.',
        relatedSymbolNameTr: `Merkezi ${primarySymbolCandidate} odağını simetrik olarak dengeler.`,
        relatedSymbol: `Merkezi ${primarySymbolCandidate}`,
        visualExecutionTr: `${styleInfo.nameTr} stil kurallarına uygun olarak hassas ve temiz hatlarla işlenmelidir.`,
        visualExecution: `${styleInfo.nameTr} stilinde ince konturlar`,
        layerLossMeaningTr: secondaryLoss,
        meaningRiskIfRemoved: secondaryLoss,
      });
    }
  }

  // 3. Vurgu Sembolleri (Accent Symbols - Asla İKİNCİL'e dönüştürülmez!)
  for (const sym of candidateAccent) {
    const selObj = selectedSymbolObjects.find((s) => (s.symbolName === sym || s.symbolId === sym) && s.weight === 'ACCENT')
      || selectedSymbolObjects.find((s) => s.symbolName === sym || s.symbolId === sym);
    const masterSym = selObj
      ? (MASTER_SYMBOLS[selObj.symbolId] || ALL_MASTER_SYMBOLS.find((s) => s.id === selObj.symbolId || s.name === selObj.symbolName))
      : ALL_MASTER_SYMBOLS.find((s) => s.name === sym || s.id === sym);

    const accentCustomMeaningClean = selObj?.customMeaning?.trim() || undefined;
    const accentTheme = accentCustomMeaningClean
      ? accentCustomMeaningClean
      : (masterSym?.traditionalMeaningTr || `${sym} mikro vurgu katmanı.`);
    const accentLoss = `Bu vurgu sembolü çıkarılırsa kompozisyona karakter ve incelik katan mikro detay zenginliği tasarımdan eksilir.`;

    detailedSymbols.push({
      symbolName: sym,
      symbolId: masterSym?.id || selObj?.symbolId,
      isPrimary: false,
      weight: 'ACCENT',
      originSourceTr: selObj
        ? 'Danışanın Sembol Kütüphanesinden seçtiği vurgu ve mikro detay sembolü.'
        : 'Danışanın bilinçli tercihi ve onaylanan vurgu sembolü seçimi.',
      originAnalysis: 'Sembol Kütüphanesi (Vurgu)',
      originValue: masterSym?.name || sym,
      customMeaning: accentCustomMeaningClean,
      traditionalMeaningTr: masterSym?.traditionalMeaningTr,
      esotericMeaningTr: masterSym?.esotericMeaningTr,
      analysisAssociations: masterSym?.analysisAssociations || [],
      compositionRole: masterSym?.compositionRole || 'ACCENT_DETAIL',
      personalThemeTr: accentTheme,
      personalTheme: accentTheme,
      compositionRoleTr: masterSym?.compositionRole
        ? `Vurgu ve Mikro Detay: ${masterSym.compositionRole}. Kompozisyona karakter ve geçiş zarafeti katan mikro dokunuş.`
        : 'Vurgu ve Mikro Detay: Kompozisyona karakter, derinlik ve ince geçiş zarafeti katan mikro dokunuş.',
      relatedSymbolNameTr: `Merkezi ${primarySymbolCandidate} ve tamamlayıcı katmanlarla uyum içinde mikro vurgu sağlar.`,
      relatedSymbol: `Merkezi ${primarySymbolCandidate}`,
      visualExecutionTr: 'Mikro çizgi (single needle / fine line) tekniğiyle, ana kompozisyonu boğmadan ve negatif alanı koruyarak ince detay olarak işlenmelidir.',
      visualExecution: 'Mikro çizgi ve ince detay vurgusu',
      layerLossMeaningTr: accentLoss,
      meaningRiskIfRemoved: accentLoss,
    });
  }

  // A57: A. Danışan ve Reçete Özeti Analiz Durumları
  const completedAnalyses: string[] = [];
  const missingAnalyses: string[] = [];

  if (numerology && typeof numerology.lifePathNumber === 'number') {
    completedAnalyses.push(`Modern Pisagor Numerolojisi (Yaşam Yolu: ${numerology.lifePathNumber}, Kader: ${numerology.destinyNumber}, Ruh: ${numerology.soulUrgeNumber})`);
  } else {
    missingAnalyses.push('Numeroloji Analizi');
  }

  if (chakra && Array.isArray(chakra.chakras) && chakra.chakras.length > 0) {
    completedAnalyses.push(`7 Temel Çakra Dengesi (Baskın: ${chakra.dominantChakra ? CHAKRA_DEFINITIONS[chakra.dominantChakra]?.nameTr : 'Dengeli'}, Destek: ${deficitList.map((c) => CHAKRA_DEFINITIONS[c]?.nameTr).join(', ') || 'Yok'})`);
  } else {
    missingAnalyses.push('Çakra Analizi');
  }

  if (archetype && archetype.unifiedArchetype) {
    completedAnalyses.push(`Birleşik & Gölge Arketip (Birincil: ${archetype.unifiedArchetype.primary}, Gölge: ${archetype.shadowArchetype.shadowName})`);
  } else {
    missingAnalyses.push('Arketip Analizi');
  }

  if (astrology && (astrology.sunSign || astrology.moonSign || astrology.ascendantSign)) {
    const sunName = astrology.sunSign ? TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr || astrology.sunSign : '';
    const moonName = astrology.moonSign ? TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr || astrology.moonSign : '';
    const ascName = astrology.ascendantSign ? TROPICAL_ZODIAC_SIGNS[astrology.ascendantSign]?.nameTr || astrology.ascendantSign : '';
    const isAscApprox = Boolean(astrology.isBirthTimeUnknown);
    const parts = [
      sunName ? `Güneş: ${sunName}` : '',
      moonName ? `Ay: ${moonName}` : '',
      ascName ? `Yükselen: ${ascName}${isAscApprox ? ' [12:00 varsayımı - kesin değil]' : ''}` : '',
    ].filter(Boolean);
    completedAnalyses.push(`Batı / Tropical Zodyak (${parts.join(', ')})`);
  } else {
    missingAnalyses.push('Astroloji Haritası (Kayıt bulunmuyor / Kapsam dışı)');
  }

  if (enneagramTest && enneagramTest.primaryType) {
    completedAnalyses.push(`Enneagram Mizaç Testi (${enneagramTest.primaryType}${enneagramTest.secondaryType ? ` - ${enneagramTest.secondaryType}` : ''})`);
  } else {
    missingAnalyses.push('Enneagram Mizaç Testi (Henüz tamamlanmadı)');
  }

  if (totemTest && totemTest.primaryType) {
    completedAnalyses.push(`Şamanik Hayvan Totemi (${fullTotemTitle})`);
  } else {
    missingAnalyses.push('Şamanik Hayvan Totemi');
  }

  // Ölçü Kontrolü ve Asgari Boyut Uyarısı (Genişlik: X cm × Yükseklik: Y cm)
  const maxDim = Math.max(effectiveDimensions.width, effectiveDimensions.height);
  const minDim = Math.min(effectiveDimensions.width, effectiveDimensions.height);
  const isBelowMinimum = maxDim < 16 || minDim < 10;
  const dimensionWarningTr = isBelowMinimum
    ? `Dikkat: Belirtilen özel ölçü (${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik), ${placementInfo.nameTr} anatomisi için önerilen asgari okunabilirlik ölçüsünün (16 cm Yükseklik × 10 cm Genişlik / 16 x 10 cm / 16 × 10 cm) altındadır. İnce çizgilerin zamanla dağılmasını (blowout) önlemek için ideal 22 cm Yükseklik × 14 cm Genişlik veya en az 16 cm Yükseklik × 10 cm Genişlik (16 x 10 cm) boyut tavsiye edilir.`
    : undefined;

  // A57: Kapsamlı Kişisel Tasarım Raporu (Bölüm A - J)
  const comprehensiveReport: ComprehensiveDesignReport = {
    clientSummary: {
      clientId: client.id,
      clientFullName: `${client.firstName} ${client.lastName}`,
      versionNumber: nextVersionNumber,
      title,
      styleTr: styleInfo.nameTr,
      placementTr: placementInfo.nameTr,
      dimensionsFormatted: `${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik`,
      dimensionWarningTr,
      colorProfileTr: `${colorInfo.nameTr} — ${colorInfo.rationaleTr}`,
      completedAnalyses,
      missingAnalyses,
    },
    analysisTransitionNarrative: {
      sourceAnalysesUsed: completedAnalyses,
      transitionPoints: [
        {
          layerNameTr: `Modern Standart Pisagor Numerolojisi (Yaşam Yolu ${numerology.lifePathNumber})`,
          themeIntroducedTr: `Yaşam rotası ve temel titreşim: ${lifePathResonance?.keywordTr || 'Öz Titreşim'}; ${lifePathResonance?.tattooSymbolTheme || 'Geometrik denge motifleri.'}`,
          mappingRuleTr: 'Modern Standart Pisagor 1-9 tablosuyla hesaplanan Yaşam Yolu sayısı doğrudan merkezi mandala eksenine bağlanır.',
          isSupportedByData: true,
        },
        {
          layerNameTr: deficitChakra ? `Çakra Dengesi (${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr} Desteği)` : 'Çakra Dengesi (Tüm Merkezler Dengeli)',
          themeIntroducedTr: deficitChakra ? `${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr} merkezindeki blokajı dönüştürme ve ${CHAKRA_DEFINITIONS[deficitChakra]?.elementTr} elementini canlandırma.` : 'Tüm çakralar dengeli; koruyucu simetri esas alınmıştır.',
          mappingRuleTr: 'Puanı 4 veya altında olan en düşük puanlı merkezler tespit edilir; dominant merkez hariç tutularak güçlendirici form seçilir.',
          isSupportedByData: Boolean(deficitChakra),
        },
        {
          layerNameTr: `Birleşik Arketip (${archetype.unifiedArchetype.primary}) & Gölge (${archetype.shadowArchetype.shadowName})`,
          themeIntroducedTr: `Gölge dinamiklerini dönüştürme: ${safeTransformSymbol} geometrisi ile mühürleme.`,
          mappingRuleTr: 'Çakra blokajının rezonans tablosundan üretilen gölge arketip, dönüşüm sembolü ile eşleştirilerek kompozisyona entegre edilir.',
          isSupportedByData: true,
        },
        ...(astrology && (astrology.sunSign || astrology.moonSign || astrology.ascendantSign) ? [{
          layerNameTr: `Batı / Tropical Zodyak (${[
            astrology.sunSign ? `${TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr || astrology.sunSign} Güneş` : '',
            astrology.moonSign ? `${TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr || astrology.moonSign} Ay` : '',
            astrology.ascendantSign ? `${TROPICAL_ZODIAC_SIGNS[astrology.ascendantSign]?.nameTr || astrology.ascendantSign} Yükselen` : '',
          ].filter(Boolean).join(', ')})`,
          themeIntroducedTr: `Kozmik üçlü dengesi: Bilinçli irade (${astrology.sunSign ? TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr : 'Güneş'}), duygusal güvenlik ve sezgi (${astrology.moonSign ? TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr : 'Ay'}) ile dışa yansıyan kimlik (${astrology.ascendantSign ? TROPICAL_ZODIAC_SIGNS[astrology.ascendantSign]?.nameTr : 'Yükselen'}).${astrology.isBirthTimeUnknown ? ' (Doğum saati bilinmediği için 12:00 varsayımı kullanılmıştır; Yükselen kesin değildir).' : ''}`,
          mappingRuleTr: 'Batı / Tropical Zodyak analiziyle Güneş, Ay ve Yükselen burçları dahil edilmiş; MC, evler, düğümler ve Vedik sistem hariç tutulmuştur.',
          isSupportedByData: true,
        }] : []),
        ...(totemTest && totemTest.primaryType ? [{
          layerNameTr: `Ruh Hayvanı Totemi (${fullTotemTitle})`,
          themeIntroducedTr: options.includeTotemInVisual
            ? 'Doğal rehberlik ve sezgisel içgüdülerin negatif alan geometrisiyle tasarıma entegrasyonu.'
            : 'Hayvan totemi felsefi ve analitik düzeyde değerlendirilmiş olup danışan tercihiyle görsel tasarımdan ve negatif alandan hariç tutulmuştur.',
          mappingRuleTr: options.includeTotemInVisual
            ? '10 soruluk testin baskın element ve puan sıralamasına göre soyut geometrik silüet üretilir; doğrudan figür kullanılmaz.'
            : 'includeTotemInVisual = false kuralı gereğince görsel üretim promptuna, ikincil sembollere ve negatif alana hiçbir hayvan figürü veya iması dahil edilmez; yalnızca felsefi düzeyde tutulur.',
          isSupportedByData: true,
        }] : []),
        ...(enneagramTest && enneagramTest.primaryType ? [{
          layerNameTr: `Enneagram Mizaç Testi (${enneagramTest.primaryType})`,
          themeIntroducedTr: enneagramInsight,
          mappingRuleTr: '15 soruluk test sonucu belirlenen mizaç tipi, tasarımın sınır netliğini ve odak disiplinini belirler.',
          isSupportedByData: true,
        }] : []),
      ],
    },
    detailedSymbols,
    chakraIntegration: {
      targetedChakras: deficitList.map((k) => CHAKRA_DEFINITIONS[k]?.nameTr || k),
      selectionRationaleTr: deficitList.length > 0 ? `Uygulamanın standart çakra motorunda 10 puan üzerinden 4 veya altında kalan en düşük puanlı merkezler (Skor: ${chakra.chakras.find(c => c.chakra === deficitList[0])?.score || 2}) destek/blokaj ihtiyacı olarak belirlenmiştir. Baskın çakra hiçbir koşulda destek çakrası içine dahil edilmez.` : 'Tüm çakra merkezleri dengeli puan aralığındadır.',
      formFunctionsTr: deficitList.length > 0 ? `${CHAKRA_DEFINITIONS[deficitList[0]]?.nameTr || 'Destek çakrası'} için tanımlanan ${CHAKRA_DEFINITIONS[deficitList[0]]?.tattooStrengtheningTheme || 'güçlendirici geometri'}, kompozisyonda akışı canlandıran ve blokajı çözen sembolik bir enerji köprüsü vazifesi görür.` : 'Tasarım saf ahenk ve merkezi koruyucu geometriye odaklanır.',
      symbolicContextNoticeTr: 'ÖNEMLİ BİLGİLENDİRME: Uygulamada sunulan çakra puanları ve yorumları tıbbi bir teşhis, klinik tedavi veya nesnel fiziksel enerji ölçümü DEĞİLDİR; bireyin kişisel farkındalığına yönelik sembolik ve ezoterik bir görsel tasarım kılavuzudur.',
    },
    archetypeNarrative: {
      primaryArchetypeTr: archetype.unifiedArchetype.primary,
      secondaryArchetypeTr: archetype.unifiedArchetype.secondary,
      shadowArchetypeTr: archetype.shadowArchetype.shadowName,
      transformationSymbolTr: safeTransformSymbol,
      compassionatePerspectiveTr: `Gölge arketip (${archetype.shadowArchetype.shadowName}), korkulacak veya suçlanacak bir kusur değil; bilincin ışığıyla aydınlatılmayı bekleyen bastırılmış bir yaratıcı potansiyeldir. Tasarım, bu potansiyeli ${safeTransformSymbol} geometrisi ile mühürleyerek danışanın kendi içsel gücü ve öz sevgisiyle buluşmasını destekler.`,
    },
    totemIntegration: {
      hasCompletedTotem: Boolean(totemTest && totemTest.primaryType),
      primaryTotemTr: totemTest?.primaryType,
      secondaryTotemTr: totemTest?.secondaryType,
      isVisualIncluded: Boolean(options.includeTotemInVisual),
      totemStatusExplanationTr: totemTest && totemTest.primaryType
        ? (options.includeTotemInVisual
            ? `Danışanın hayvan totemi (${fullTotemTitle}) tasarıma soyut bir silüet olarak dahil edilmiştir. Kural gereğince kesinlikle doğrudan, karikatürize veya sticker benzeri bir hayvan figürü çizilmez; kompozisyona gizlenmiş minimalist soyut çizgiler ve negatif alan silüeti kullanılır.`
            : `Danışanın hayvan totemi (${fullTotemTitle}) analiz arşivinde başarıyla kayıtlıdır ve anlam dünyası değerlendirilmiştir; ancak görsel tasarım tercihi gereğince dövme kompozisyonuna ve görsel üretim promptuna hayvan figürü dahil edilmemiştir.`)
        : 'Bu danışan için henüz tamamlanmış bir Ruh Hayvanı Totemi testi bulunmamaktadır. Reçete, aktif danışanın gerçek verilerine sadık kalarak totemsiz sembolik geometri ve elementel rezonans üzerinden yapılandırılmıştır.',
      abstractionGuidelineTr: 'Onaylanmış soyut temsil kuralı: Hayvan formu kutsal geometrinin negatif alanında, ancak dikkatle bakıldığında sezilen akıcı konturlarla ima edilir.',
    },
    compositionPhilosophy: {
      centralFocusRationaleTr: `Merkezi Odak: ${primarySymbolCandidate}, pozitif dövme alanının yaklaşık %65'lik ağırlık merkezini oluşturur. Danışanın Yaşam Yolu ${numerology.lifePathNumber} titreşimini ve ${archetype.unifiedArchetype.primary} arketipini temsil ettiği için kompozisyonun ana dikey aksında baskın taşıyıcı çıpa olarak yükselir.`,
      secondaryArrangementRationaleTr: `İkincil Sembol Hiyerarşisi: Pozitif dövme formunun kalan %35'lik bölümü ${candidateSecondary.length > 0 ? candidateSecondary.join(' · ') : 'Dengeleyici kutsal oran daireleri'} katmanına ayrılır; merkezin etrafında hiyerarşik bir ritimle düzenlenir; merkezle yarışmaz, onu çerçeveler ve besler.`,
      flowAndNegativeSpaceTr: `Geçişler ve Negatif Alan: Toplam yerleşim alanında %45–50 hedefiyle temiz ten (negatif alan) bırakılır. Çizgiler arasında asgari 1.5–2 mm güvenlik payı bırakılarak ${placementInfo.nameTr} bölgesinin anatomik eğriliğinde ${styleInfo.nameTr} akış hatlarıyla dövmenin zamanla yaşlanması ve çizgilerin birbirine girmesi engellenir.`,
      holisticIntegrationRulesTr: symbolCombinationRules,
      metrics: {
        primaryFocusWeightPercent: 65,
        secondaryLayerWeightPercent: 35,
        negativeSpaceTargetPercentMin: 45,
        negativeSpaceTargetPercentMax: 50,
        minLineSpacingMm: 1.5,
        idealLineSpacingMm: 2.0,
        minDimensionsCm: { width: 10, height: 16 },
        idealDimensionsCm: { width: 14, height: 22 },
        areaDefinitionTr:
          'Toplam yerleşim alanının %45–50\'si temiz ten (negatif alan); kalan %50–55\'lik pozitif dövme alanının yaklaşık %65\'i ana görsel odak (Yaşam Yolu ve Birincil Arketip), %35\'i ikincil göksel/çakra katmanlarıdır.',
      },
    },
    compositionMetrics: {
      primaryFocusWeightPercent: 65,
      secondaryLayerWeightPercent: 35,
      negativeSpaceTargetPercentMin: 45,
      negativeSpaceTargetPercentMax: 50,
      minLineSpacingMm: 1.5,
      idealLineSpacingMm: 2.0,
      minDimensionsCm: { width: 10, height: 16 },
      idealDimensionsCm: { width: 14, height: 22 },
      areaDefinitionTr:
        'Toplam yerleşim alanının %45–50\'si temiz ten (negatif alan); kalan %50–55\'lik pozitif dövme alanının yaklaşık %65\'i ana görsel odak (Yaşam Yolu ve Birincil Arketip), %35\'i ikincil göksel/çakra katmanlarıdır.',
    },
    anatomicalAndTechnicalDirective: {
      placementAndFlowTr: `${placementInfo.nameTr} · ${placementInfo.anatomicalFlowTr} (${placementInfo.curvatureAdviceTr})`,
      dimensionsExplicit: {
        widthCm: effectiveDimensions.width,
        heightCm: effectiveDimensions.height,
        orientationOrderTr: `Genişlik: ${effectiveDimensions.width} cm × Yükseklik: ${effectiveDimensions.height} cm`,
        isBelowMinimum,
        minimumDimensionsNoticeTr: `Önerilen Ebat: ${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik (İdeal: 22 cm Yükseklik × 14 cm Genişlik, Asgari: 16 cm Yükseklik × 10 cm Genişlik - ${placementInfo.nameTr} anatomisi için optimize edilmiştir).`,
      },
      lineworkAndNeedleAdviceTr: [
        ...styleInfo.needleRecommendationsTr,
        'Hassas Çizgi Güvenlik Aralığı: Çizgiler arasında asgari 1.5–2.0 mm mesafe bırakılmalıdır.',
        styleInfo.lineSpacingAdviceTr,
        styleInfo.antiBlowoutWarningTr,
      ],
      skinAgingAndNegativeSpaceAdviceTr: 'İnce çizgi ve geometrik tasarımlarda yaşlanma payı ve negatif alan: Çizgiler arasında en az 1.5–2.0 mm nefes alanı bırakılmalı, toplam yerleşim alanının %45–50\'si temiz ten (negatif alan) olarak tutularak mürekkebin yıllar içindeki difüzyonu telafi edilmeli ve pozitif dövme alanının yaklaşık %65\'i ana odağa ayrılmalıdır.',
    },
    conceptManifesto: conceptStatement,
    technicalPromptDirective: {
      englishPrompt: primaryPromptEn,
      negativePrompt,
      aspectRatio: placementInfo.recommendedDimensions.height > placementInfo.recommendedDimensions.width * 1.5 ? '9:16' : '3:4',
      forbiddenElementsAudited: [
        'Batı tropikal zodyak Güneş, Ay ve Yükselen burçları kullanılmıştır',
        'MC, astrolojik evler, düğümler ve Vedik sistemler tasarıma dahil edilmemiştir',
        'Anne adı görsel prompt ve negatif prompttan arındırılmıştır',
        'Doğum saati bilinmediğinde 12:00 varsayımı ve kesin olmama uyarısı bildirilmiştir',
        'Kompozisyon teknik kuralları (%65 ana odak ağırlığı, %45–50 negatif alan hedefi, asgari 1.5–2 mm çizgi aralığı, min 16×10 cm / ideal 22×14 cm) doğrulanmıştır',
      ],
    },
    // A57 Bölüm Eşleşmeleri (Section Aliases A - J)
    sectionA: {
      clientSummary: `${client.firstName} ${client.lastName}`,
      clientId: client.id,
      recipeVersion: nextVersionNumber,
      title,
      styleTr: styleInfo.nameTr,
      placementTr: placementInfo.nameTr,
      placementDetailTr: placementInfo.anatomicalFlowTr,
      recommendedDimensions: `${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik`,
      customDimensions: options.customDimensions ? `${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik` : undefined,
      dimensionWarningTr,
      colorProfileTr: `${colorInfo.nameTr} — ${colorInfo.rationaleTr}`,
      colorRationaleTr: colorInfo.rationaleTr,
      activeAnalysisModulesSummary: completedAnalyses,
      completedModules: completedAnalyses,
      missingModules: missingAnalyses,
    },
    sectionB: {
      originAnalysesSummary: completedAnalyses,
      thematicKeywords: [
        `Yaşam Yolu ${numerology.lifePathNumber}`,
        `Kader ${numerology.destinyNumber}`,
        `Gölge: ${archetype.shadowArchetype.shadowName}`,
        deficitChakra ? `Çakra Desteği: ${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr}` : 'Çakra Dengesi',
      ],
      mappingRulesUsed: symbolCombinationRules,
      dataVerificationNoteTr: 'Tasarım yalnızca aktif danışanın doğrulanmış Pisagor Numerolojisi, Çakra dengesi ve Arketip çıktılarından üretilmiştir; sahte veri veya harici varsayım kullanılmamıştır.',
    },
    sectionC: {
      symbols: detailedSymbols,
    },
    sectionD: {
      selectedChakras: deficitList.map((k) => CHAKRA_DEFINITIONS[k]?.nameTr || k),
      rationaleTr: deficitList.length > 0
        ? `Uygulamanın standart çakra motorunda 10 puan üzerinden 4 veya altında kalan en düşük puanlı merkezler (Skor: ${chakra.chakras.find(c => c.chakra === deficitList[0])?.score || 2}) destek/blokaj ihtiyacı olarak belirlenmiştir. Baskın çakra hiçbir koşulda destek çakrası içine dahil edilmez.`
        : 'Tüm çakra merkezleri dengeli puan aralığındadır.',
      symbolicFormFunctionTr: deficitList.length > 0
        ? `${CHAKRA_DEFINITIONS[deficitList[0]]?.nameTr || 'Destek çakrası'} için tanımlanan ${CHAKRA_DEFINITIONS[deficitList[0]]?.tattooStrengtheningTheme || 'güçlendirici geometri'}, kompozisyonda akışı canlandıran sembolik bir enerji köprüsü vazifesi görür.`
        : 'Tasarım saf ahenk ve merkezi koruyucu geometriye odaklanır.',
      nonMedicalDisclaimerTr: 'ÖNEMLİ BİLGİLENDİRME: Uygulamada sunulan çakra puanları ve yorumları tıbbi veya psikolojik bir teşhis, klinik tedavi veya nesnel fiziksel enerji ölçümü DEĞİLDİR; bireyin kişisel farkındalığına yönelik sembolik ve ezoterik bir görsel tasarım kılavuzudur.',
    },
    sectionE: {
      primaryArchetypeTr: archetype.unifiedArchetype.primary,
      secondaryArchetypeTr: archetype.unifiedArchetype.secondary,
      shadowArchetypeNameTr: archetype.shadowArchetype.shadowName,
      transformationSymbolTr: cleanTransformSymbol,
      transformationNarrativeTr: `Gölge arketip (${archetype.shadowArchetype.shadowName}), korkulacak veya suçlanacak bir kusur değil; bilincin ışığıyla aydınlatılmayı bekleyen bastırılmış bir yaratıcı potansiyeldir. Tasarım, bu potansiyeli ${cleanTransformSymbol} geometrisi ile mühürleyerek danışanın kendi içsel gücü ve öz sevgisiyle buluşmasını destekler.`,
    },
    sectionF: {
      hasTotemAnalysis: Boolean(totemTest && totemTest.primaryType),
      primaryTotemTr: totemTest?.primaryType,
      secondaryTotemTr: totemTest?.secondaryType,
      includeTotemInVisual: Boolean(options.includeTotemInVisual),
      integrationNoteTr: totemTest && totemTest.primaryType
        ? (options.includeTotemInVisual
            ? `Danışanın hayvan totemi (${fullTotemTitle}) tasarıma soyut bir geometrik silüet olarak dahil edilmiştir. Asla karikatür veya sticker benzeri doğrudan figür kullanılmaz.`
            : `Danışanın hayvan totemi (${fullTotemTitle}) felsefi ve analitik düzeyde değerlendirilmiş olup danışan tercihiyle görsel tasarımdan ve negatif alandan hariç tutulmuştur.`)
        : 'Bu danışan için henüz tamamlanmış bir Ruh Hayvanı Totemi testi bulunmamaktadır (test tamamlanmadı). Reçetede sahte hayvan totemi uydurulmamıştır.',
      symbolicGuidanceTr: totemTest && totemTest.primaryType
        ? (options.includeTotemInVisual
            ? 'Onaylanmış soyut temsil kuralı: Hayvan formu doğrudan bir figür olarak değil, kutsal geometrinin negatif alanında sezilen akıcı konturlar ve soyut geometrik silüet ile ima edilir.'
            : 'Felsefi ve analitik rehberlik: Danışan tercihi doğrultusunda görsel tasarıma hiçbir hayvan formu, negatif alan iması veya kontur dahil edilmemiştir; totem enerjisi yalnızca kavramsal ve felsefi düzeyde ele alınmıştır.')
        : 'Onaylanmış soyut temsil kuralı: Tamamlanmış totem testi bulunmadığından tasarıma hiçbir hayvan formu veya iması dahil edilmemiştir.',
    },
    sectionG: {
      centralFocusRationaleTr: `${primarySymbolCandidate} pozitif dövme alanının yaklaşık %65'ini oluşturan ağırlık merkezidir; danışanın Yaşam Yolu ${numerology.lifePathNumber} titreşimini ve ${archetype.unifiedArchetype.primary} arketipinin ışık potansiyelini temsil eder.`,
      secondaryTransitionsTr: `Pozitif formun kalan %35'lik bölümünde ${candidateSecondary.length > 0 ? candidateSecondary.join(' · ') : 'Dengeleyici kutsal oran daireleri'} katmanları hiyerarşik bir akış oluşturur.`,
      negativeSpaceRatioTr: '%45–50 hedefli temiz negatif alan (asgari 1.5–2 mm çizgi aralığı ile)',
      holisticIntegrationRules: symbolCombinationRules,
    },
    sectionH: {
      anatomicalPlacementTr: `${placementInfo.nameTr} · ${placementInfo.anatomicalFlowTr} (${placementInfo.curvatureAdviceTr})`,
      recommendedDimensionsTr: `Önerilen Ebat: ${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik (İdeal: 22 cm Yükseklik × 14 cm Genişlik, Asgari: 16 cm Yükseklik × 10 cm Genişlik)`,
      needleAndTechniqueGuidance: [
        ...styleInfo.needleRecommendationsTr,
        'Hassas Çizgi Güvenlik Aralığı: Çizgiler arasında asgari 1.5–2.0 mm mesafe bırakılmalıdır.',
        styleInfo.lineSpacingAdviceTr,
        styleInfo.antiBlowoutWarningTr,
      ],
      agingAndLineSpacingTr: 'İnce çizgi ve geometrik tasarımlarda yaşlanma payı: Çizgiler arasında asgari 1.5–2.0 mm nefes alanı bırakılmalı, toplam yerleşim alanının %45–50\'si temiz ten (negatif alan) olarak tutularak mürekkebin yıllar içindeki difüzyonu telafi edilmelidir.',
    },
    sectionI: {
      manifestoTr: conceptStatement,
    },
    sectionJ: {
      primaryPromptEn,
      negativePromptEn: negativePromptItems.join(', '),
      aspectRatio: placementInfo.recommendedDimensions.height > placementInfo.recommendedDimensions.width * 1.5 ? '9:16' : '3:4',
      technicalCleanlinessNoteTr: 'Tüm promptlar genel metin yasağı kuralıyla ("İsim, harf, yazı, tarih veya kişisel metin ekleme") korunmaktadır; anne adı hiçbir prompta (pozitif veya negatif) aktarılmaz. Batı tropikal Güneş, Ay ve Yükselen burçları kullanılmış; MC, astrolojik evler, düğümler ve Vedik sistemler tasarıma dahil edilmemiştir.',
    },
  };

  const compositionMetrics: RecipeCompositionMetrics = {
    primaryFocusWeightPercent: 65,
    secondaryLayerWeightPercent: 35,
    negativeSpaceTargetPercentMin: 45,
    negativeSpaceTargetPercentMax: 50,
    minLineSpacingMm: 1.5,
    idealLineSpacingMm: 2.0,
    minDimensionsCm: { width: 10, height: 16 },
    idealDimensionsCm: { width: 14, height: 22 },
    areaDefinitionTr:
      'Toplam yerleşim alanının (tuval) %45–50\'si temiz ten (negatif alan) olarak korunur; kalan %50–55\'lik pozitif dövme alanının yaklaşık %65\'i ana görsel odağa (Yaşam Yolu ve Birincil Arketip), %35\'i ikincil göksel/çakra katmanlarına ayrılır. Çizgiler arasında asgari 1.5–2 mm güvenlik payı korunur.',
  };

  const recipe: TattooRecipe = {
    style: styleKey,
    recommendedPlacement: placementKey,
    placementDescription: `${placementInfo.nameTr} · ${placementInfo.anatomicalFlowTr} (${placementInfo.curvatureAdviceTr})`,
    recommendedDimensionsCm: effectiveDimensions,
    colorProfile: colorProfileKey,
    colorRationale: colorInfo.rationaleTr,
    primarySymbol: primarySymbolCandidate,
    secondarySymbols: candidateSecondary,
    accentSymbols: candidateAccent,
    symbolCombinationRules,
    shadowTransformationTheme: `Gölge: ${archetype.shadowArchetype.shadowName} → Dönüşüm Sembolü: ${safeTransformSymbol}`,
    chakraSupportReflection: deficitChakra
      ? `${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr} desteği ve güçlendirme odakları.`
      : (chakra.dominantChakra ? `Baskın merkez: ${CHAKRA_DEFINITIONS[chakra.dominantChakra]?.nameTr} akışı.` : 'Tüm çakralar dengeli; koruyucu simetri esas alınmıştır.'),
    totemAbstractionNotes,
    excludedElements: excludedClean,
    artistVisualDirection: [
      `Yerleşim: ${placementInfo.nameTr} - ${placementInfo.anatomicalFlowTr}`,
      `Stil: ${styleInfo.nameTr}`,
      `Ölçüler: ${effectiveDimensions.width}x${effectiveDimensions.height} cm`,
      `Sembol Hiyerarşisi: ${symbolCombinationRules.join(' | ')}`,
    ],
    keyComponents: [primarySymbolCandidate, ...candidateSecondary, ...candidateAccent],
    technicalAdviceForArtist,
    detailedSymbols,
    selectedSymbolObjects: detailedSymbols.filter((s) => Boolean(s.symbolId || s.customMeaning || s.traditionalMeaningTr)),
    comprehensiveReport,
    compositionMetrics,
  };

  const aiPrompt: AIPromptData = {
    primaryPromptEn,
    conceptPromptTr,
    negativePrompt,
    aspectRatio: placementInfo.recommendedDimensions.height > placementInfo.recommendedDimensions.width * 1.5 ? '9:16' : '3:4',
    artisticModifiers: [
      'masterful linework',
      'sacred geometry precision',
      'museum quality engraving',
      'fine line tattoo vector',
    ],
  };

  return {
    id: generateId('design'),
    clientId: client.id,
    versionNumber: nextVersionNumber,
    title,
    conceptStatement,
    recipe,
    aiPrompt,
    createdAt: now,
    updatedAt: now,
    notes: options.customNotes || '',
  };
}

export interface RecipeCompositionValidationResult {
  isValid: boolean;
  nominalTargetFocusWeightPercent: number; // 65 (Nominal hedef)
  focusWeightToleranceRange: [number, number]; // [60, 70] (Tasarım esnekliği kabul aralığı)
  primaryFocusWeightPercent: number; // Gerçekleşen değer
  negativeSpaceTargetRange: [number, number];
  minLineSpacingMm: number;
  isDimensionsCompliant: boolean;
  isNegativeSpaceCompliant: boolean;
  isFocusRatioCompliant: boolean;
  isLineSpacingCompliant: boolean;
  isMathematicalModelConsistent: boolean;
  diagnostics: string[];
}

/**
 * Dövme reçetesinin kompozisyon oranlarını, negatif alan payını,
 * çizgi aralığını ve ebat standartlarını programatik olarak doğrular.
 */
export function validateRecipeCompositionTechnicalRules(
  recipeOrDesign: TattooRecipe | ClientTattooDesign
): RecipeCompositionValidationResult {
  const recipe: TattooRecipe = 'recipe' in recipeOrDesign ? recipeOrDesign.recipe : recipeOrDesign;
  const metrics: RecipeCompositionMetrics = recipe.compositionMetrics || {
    primaryFocusWeightPercent: 65,
    secondaryLayerWeightPercent: 35,
    negativeSpaceTargetPercentMin: 45,
    negativeSpaceTargetPercentMax: 50,
    minLineSpacingMm: 1.5,
    idealLineSpacingMm: 2.0,
    minDimensionsCm: { width: 10, height: 16 },
    idealDimensionsCm: { width: 14, height: 22 },
    areaDefinitionTr: '',
  };

  const dims = recipe.recommendedDimensionsCm;
  const maxDim = Math.max(dims.width, dims.height);
  const minDim = Math.min(dims.width, dims.height);
  const isDimensionsCompliant = maxDim >= 16 && minDim >= 10;
  const isNegativeSpaceCompliant =
    metrics.negativeSpaceTargetPercentMin >= 45 &&
    metrics.negativeSpaceTargetPercentMax <= 50;
  
  // Nominal hedef %65'tir; anatomik yerleşim ve kişisel sembol kompozisyon esnekliği için ±%5 (%60–%70) tolerans kabul edilir
  const isFocusRatioCompliant =
    metrics.primaryFocusWeightPercent >= 60 &&
    metrics.primaryFocusWeightPercent <= 70;
  const isLineSpacingCompliant = metrics.minLineSpacingMm >= 1.5;
  const isMathematicalModelConsistent =
    metrics.primaryFocusWeightPercent + metrics.secondaryLayerWeightPercent === 100 &&
    metrics.negativeSpaceTargetPercentMin + 55 === 100;

  const diagnostics: string[] = [];
  if (!isDimensionsCompliant) {
    diagnostics.push(`Ölçü (${dims.width}x${dims.height} cm) minimum standart olan 16x10 cm'nin altındadır.`);
  } else {
    diagnostics.push(`Ölçü (${dims.width}x${dims.height} cm) asgari 16x10 cm ve ideal 22x14 cm standartlarına uygundur.`);
  }

  if (!isNegativeSpaceCompliant) {
    diagnostics.push(`Negatif alan hedefi (%${metrics.negativeSpaceTargetPercentMin}-%${metrics.negativeSpaceTargetPercentMax}) %45-50 kuralına uymuyor.`);
  } else {
    diagnostics.push(`Negatif alan hedefi (%${metrics.negativeSpaceTargetPercentMin}-%${metrics.negativeSpaceTargetPercentMax}) %45-50 kuralına uygundur; eski %30 sınırı aşılmıştır.`);
  }

  if (!isFocusRatioCompliant) {
    diagnostics.push(`Ana odak ağırlığı (%${metrics.primaryFocusWeightPercent}) nominal hedef olan %65 standardının dışındadır (kabul edilebilir esneklik aralığı: %60–%70).`);
  } else {
    diagnostics.push(`Ana görsel odak nominal hedefi %65'tir (kabul edilebilir esneklik aralığı: %60–%70). Gerçekleşen değer: %${metrics.primaryFocusWeightPercent}.`);
  }

  if (!isLineSpacingCompliant) {
    diagnostics.push(`Çizgi aralığı (${metrics.minLineSpacingMm} mm) minimum 1.5 mm'nin altındadır.`);
  } else {
    diagnostics.push(`Çizgi aralığı (${metrics.minLineSpacingMm} mm) minimum 1.5–2.0 mm güvenlik kuralına uygundur.`);
  }

  if (!isMathematicalModelConsistent) {
    diagnostics.push('Kompozisyon oranları matematiksel modelle çelişmektedir.');
  } else {
    diagnostics.push('Matematiksel model tutarlıdır: Tuval %45-50 negatif alan + %50-55 pozitif alan; Pozitif alan %65 ana odak + %35 tamamlayıcı katmandır.');
  }

  const isValid =
    isDimensionsCompliant &&
    isNegativeSpaceCompliant &&
    isFocusRatioCompliant &&
    isLineSpacingCompliant &&
    isMathematicalModelConsistent;

  return {
    isValid,
    nominalTargetFocusWeightPercent: 65,
    focusWeightToleranceRange: [60, 70],
    primaryFocusWeightPercent: metrics.primaryFocusWeightPercent,
    negativeSpaceTargetRange: [
      metrics.negativeSpaceTargetPercentMin,
      metrics.negativeSpaceTargetPercentMax,
    ],
    minLineSpacingMm: metrics.minLineSpacingMm,
    isDimensionsCompliant,
    isNegativeSpaceCompliant,
    isFocusRatioCompliant,
    isLineSpacingCompliant,
    isMathematicalModelConsistent,
    diagnostics,
  };
}

