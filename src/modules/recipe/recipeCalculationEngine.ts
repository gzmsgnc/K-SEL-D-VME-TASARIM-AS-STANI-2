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
  // A) Ana Sembol (Primary Symbol): Yaşam Yolu geometrisi ve Ana Arketip rezonansı veya kullanıcı seçimi
  const lifePathResonance = NUMBER_RESONANCE_TABLE[numerology.lifePathNumber];
  let primarySymbolCandidate =
    options.primarySymbol && !isExcluded(options.primarySymbol, excludedClean, motherName)
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

  // Astroloji Katkısı
  if (astrology) {
    const sunSign = astrology.sunSign || astrology.planetaryPositions?.find((p) => p.body === 'Sun')?.sign;
    const moonSign = astrology.moonSign || astrology.planetaryPositions?.find((p) => p.body === 'Moon')?.sign;
    const ascSign = astrology.ascendantSign || astrology.planetaryPositions?.find((p) => p.body === 'Ascendant')?.sign;

    if (sunSign && moonSign) {
      const sunMeta = TROPICAL_ZODIAC_SIGNS[sunSign];
      const moonMeta = TROPICAL_ZODIAC_SIGNS[moonSign];
      let astroSymbol = `${sunMeta?.nameTr || sunSign} Güneş (${sunMeta?.symbolGlyph || '☉'}) ve ${moonMeta?.nameTr || moonSign} Ay (${moonMeta?.symbolGlyph || '☽'}) hizalanması`;
      if (ascSign && !astrology.isBirthTimeUnknown) {
        const ascMeta = TROPICAL_ZODIAC_SIGNS[ascSign];
        astroSymbol += ` · ${ascMeta?.nameTr || ascSign} Yükselen (${ascMeta?.symbolGlyph || 'Asc'})`;
      }
      if (!isExcluded(astroSymbol, excludedClean, motherName)) {
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
    safeTransformSymbol = transformationalSymbol;
    candidateSecondary.push(`Dönüştürücü odak: ${transformationalSymbol}`);
  }

  // Kullanıcı tarafından seçilmiş semboller
  if (options.selectedSymbols && options.selectedSymbols.length > 0) {
    for (const sel of options.selectedSymbols) {
      if (!isExcluded(sel, excludedClean, motherName) && !candidateSecondary.includes(sel)) {
        candidateSecondary.push(sel);
      }
    }
  }

  // C) Totem Değerlendirmesi (Kural 7 & 8)
  const totemTest = testResults.find((t) => t.testType === 'ANIMAL_TOTEM');
  let totemAbstractionNotes = '';
  let totemPromptPhrase = '';
  if (totemTest && totemTest.primaryType) {
    const totemName = totemTest.primaryType;
    if (options.includeTotemInVisual && !isExcluded(totemName, excludedClean, motherName)) {
      totemAbstractionNotes = `Ruh hayvanı (${totemName}) kesinlikle doğrudan veya sticker benzeri bir figür olarak değil; kompozisyona gizlenmiş minimalist soyut çizgiler ve geometrik silüet olarak entegre edilmiştir.`;
      const abstractTotemItem = `Soyut ${totemName} silüeti (negatif alan geometrisi)`;
      if (!candidateSecondary.includes(abstractTotemItem)) {
        candidateSecondary.push(abstractTotemItem);
      }
      totemPromptPhrase = `abstract geometric silhouette of ${totemName}`;
    } else {
      totemAbstractionNotes = `Danışanın hayvan totemi (${totemName}) analiz amacıyla kullanıldı, görsel tasarıma dahil edilmedi.`;
    }
  } else {
    totemAbstractionNotes = 'Bu danışan için kayıtlı bir ruh hayvanı totemi bulunmamaktadır; analiz sembolik geometri üzerinden yapılandırılmıştır.';
  }

  // D) Enneagram Değerlendirmesi
  const enneagramTest = testResults.find((t) => t.testType === 'ENNEAGRAM');
  let enneagramInsight = '';
  if (enneagramTest && enneagramTest.primaryType) {
    enneagramInsight = `Enneagram ${enneagramTest.primaryType} mizacı, tasarımın net odaklanmasını ve içsel sınırlarını güçlendirmektedir.`;
  }

  // 4. Sembol Birleşimi ve Hiyerarşi Kuralları
  const symbolCombinationRules = [
    `Merkezi Odak: ${primarySymbolCandidate}`,
    candidateSecondary.length > 0
      ? `Tamamlayıcı Katman: ${candidateSecondary.slice(0, 3).join(' · ')}`
      : 'Tamamlayıcı Katman: Dengeleyici kutsal oran daireleri',
    `Dengeleyici Çevre: ${styleInfo.nameTr} akış hatları ve nefes alan negatif boşluklar`,
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
    styleInfo.lineSpacingAdviceTr,
    styleInfo.antiBlowoutWarningTr,
    `Önerilen Ebat: ${effectiveDimensions.width}cm x ${effectiveDimensions.height}cm (${placementInfo.nameTr} anatomisi için optimize edilmiştir).`,
    `Renk/Mürekkep Uygulaması: ${colorInfo.nameTr} (${colorInfo.rationaleTr}).`,
    'Kompozisyonda en az %30 oranında temiz ten (negatif alan) bırakılarak dövmenin zamanla yaşlanması ve pigment netliği korunmalıdır.',
  ];

  // 6. Felsefi ve Anlamsal Konsept Manifestosu (Concept Statement - Kural 11: Negatif/kötü ifadeler yok)
  const conceptStatement = [
    `Bu kompozisyon, ${client.firstName} ${client.lastName} için "${archetype.unifiedArchetype.primary}" arketipinin ışık potansiyelini yaşam yoluna sabitlemek üzere tasarlanmıştır.`,
    `Yaşam Yolu ${numerology.lifePathNumber} titreşimi ile ${primarySymbolCandidate} merkezde yükselirken, ${archetype.unifiedArchetype.secondary} arketipinin dışavurum gücü kompozisyonu destekler.`,
    deficitChakra
      ? `Tasarım, ${CHAKRA_DEFINITIONS[deficitChakra]?.nameTr} merkezindeki blokajı dönüştürmek için ${safeTransformSymbol} geometrisini koruyucu bir mühür olarak entegre eder.`
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

  const promptSubjects = [
    primarySymbolCandidate,
    candidateSecondary.length > 0 ? candidateSecondary[0] : '',
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

  const primaryPromptEn = `${promptSubject}, ${promptStyleTokens}, ${promptColorTokens}, professional tattoo flash art, vector perfection, sharp edges, pure white background --no ${defaultNoList.join(', ')}`;

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
    ...excludedClean,
  ];
  if (motherName && motherName.trim().length > 1) {
    negativePromptItems.push(motherName.trim());
  }

  const negativePrompt = negativePromptItems.join(', ');

  const now = new Date().toISOString();

  const recipe: TattooRecipe = {
    style: styleKey,
    recommendedPlacement: placementKey,
    placementDescription: `${placementInfo.nameTr} · ${placementInfo.anatomicalFlowTr} (${placementInfo.curvatureAdviceTr})`,
    recommendedDimensionsCm: effectiveDimensions,
    colorProfile: colorProfileKey,
    colorRationale: colorInfo.rationaleTr,
    primarySymbol: primarySymbolCandidate,
    secondarySymbols: candidateSecondary,
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
      `Ölçüler: ${placementInfo.recommendedDimensions.width}x${placementInfo.recommendedDimensions.height} cm`,
      `Sembol Hiyerarşisi: ${symbolCombinationRules.join(' | ')}`,
    ],
    keyComponents: [primarySymbolCandidate, ...candidateSecondary],
    technicalAdviceForArtist,
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
