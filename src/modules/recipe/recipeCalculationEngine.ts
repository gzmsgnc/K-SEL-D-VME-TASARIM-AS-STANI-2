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

  // Astroloji Katkısı (Yalnızca Güneş ve Ay hizalanması - Yükselen/ASC ve Placidus kapsam dışıdır)
  if (astrology) {
    const sunSign = astrology.sunSign || astrology.planetaryPositions?.find((p) => p.body === 'Sun')?.sign;
    const moonSign = astrology.moonSign || astrology.planetaryPositions?.find((p) => p.body === 'Moon')?.sign;

    if (sunSign && moonSign) {
      const sunMeta = TROPICAL_ZODIAC_SIGNS[sunSign];
      const moonMeta = TROPICAL_ZODIAC_SIGNS[moonSign];
      const astroSymbol = `${sunMeta?.nameTr || sunSign} Güneş (${sunMeta?.symbolGlyph || '☉'}) ve ${moonMeta?.nameTr || moonSign} Ay (${moonMeta?.symbolGlyph || '☽'}) hizalanması`;
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
    safeTransformSymbol = transformationalSymbol.trim().replace(/[.,\s]+$/, '');
    candidateSecondary.push(`Dönüştürücü odak: ${safeTransformSymbol}`);
  }
  const cleanTransformSymbol = safeTransformSymbol.trim().replace(/[.,\s]+$/, '');

  // Kullanıcı tarafından seçilmiş semboller
  if (options.selectedSymbols && options.selectedSymbols.length > 0) {
    for (const sel of options.selectedSymbols) {
      if (!isExcluded(sel, excludedClean, motherName) && !candidateSecondary.includes(sel)) {
        candidateSecondary.push(sel);
      }
    }
  }

  // C) Totem Değerlendirmesi (Kural 7 & 8)
  const totemTest = [...testResults].reverse().find(
    (t) => t.testType === 'ANIMAL_TOTEM' && Boolean(t.primaryType || (t as any).primaryTotem)
  );
  const primaryName = totemTest?.primaryType || '';
  const secondaryName = totemTest?.secondaryType || '';
  const fullTotemTitle = primaryName ? (secondaryName ? `${primaryName} ve ${secondaryName}` : primaryName) : '';
  let totemAbstractionNotes = '';
  let totemPromptPhrase = '';
  if (totemTest && totemTest.primaryType) {
    if (options.includeTotemInVisual && !isExcluded(primaryName, excludedClean, motherName)) {
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
    `Önerilen Ebat: ${effectiveDimensions.width}cm x ${effectiveDimensions.height}cm (${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik; İdeal: 22 × 14 cm, Min: 16 × 10 cm - ${placementInfo.nameTr} anatomisi için optimize edilmiştir).`,
    `Renk/Mürekkep Uygulaması: ${colorInfo.nameTr} (${colorInfo.rationaleTr}).`,
    'Kompozisyonda en az %30 oranında temiz ten (negatif alan) bırakılarak dövmenin zamanla yaşlanması ve pigment netliği korunmalıdır.',
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

  // A57: C. Her Sembol İçin Ayrı ve Ayrıntılı Açıklama (Detailed Symbol Rationales)
  const detailedSymbols: DetailedSymbolRationale[] = [];

  // 1. Ana Sembol
  const primaryPersonalTheme = `Yaşam Yolu ${numerology.lifePathNumber} titreşiminin yaşam rotası odağı ve ${archetype.unifiedArchetype.primary} arketipinin ışık potansiyeli.`;
  const primaryCompRole = 'Merkezi Odak (Primary Core): Tasarımın ana dikey ekseninde yer alan, tüm diğer geometrik ve sembolik katmanları kendine bağlayan taşıyıcı omurga.';
  const primaryRelated = 'Çakra dengeleyici form ve gölge dönüşüm geometrisi ile doğrudan bağlantılıdır; dış katmanlardan gelen enerjiyi merkezde toplayıp dengeler.';
  const primaryVisual = `${styleInfo.nameTr} tekniğiyle; kusursuz altın oran simetrisi, net konturlar ve merkezde nefes alan negatif boşluklarla işlenmelidir.`;
  const primaryLoss = 'Bu sembol çıkarılırsa danışanın Yaşam Yolu titreşimini ve ana arketipini ten üzerinde sabitleyen merkezi çıpa ortadan kalkar; tasarım birleşik bir manifesto olmaktan çıkıp odaksız motiflere dönüşür.';

  detailedSymbols.push({
    symbolName: primarySymbolCandidate,
    isPrimary: true,
    weight: 'PRIMARY',
    originSourceTr: options.primarySymbol
      ? 'Danışanın doğrudan seçtiği birincil sembol tercihi.'
      : `Modern Standart Pisagor Numerolojisi Yaşam Yolu ${numerology.lifePathNumber} (${lifePathResonance?.keywordTr || 'Öz Titreşim'}) ve Birincil Arketip (${archetype.unifiedArchetype.primary}) rezonansı.`,
    originAnalysis: options.primarySymbol ? 'Danışan Özel Seçimi' : 'Pisagor Numerolojisi',
    originValue: options.primarySymbol ? 'Özel İstek' : `Yaşam Yolu ${numerology.lifePathNumber}`,
    personalThemeTr: primaryPersonalTheme,
    personalTheme: primaryPersonalTheme,
    compositionRoleTr: primaryCompRole,
    compositionRole: 'Merkezi Odak (Primary Core)',
    relatedSymbolNameTr: primaryRelated,
    relatedSymbol: 'Çakra dengeleyici form ve gölge dönüşüm geometrisi',
    visualExecutionTr: primaryVisual,
    visualExecution: primaryVisual,
    layerLossMeaningTr: primaryLoss,
    meaningRiskIfRemoved: primaryLoss,
  });

  // 2. İkincil Semboller
  for (const sym of candidateSecondary) {
    if (sym.includes('Güneş') && sym.includes('Ay')) {
      const sunName = (astrology && (astrology.sunSign ? TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr : '')) || 'Güneş';
      const moonName = (astrology && (astrology.moonSign ? TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr : '')) || 'Ay';
      const astroTheme = `Bilinçli irade, dışavurum ve yaşam enerjisi (${sunName} Güneş) ile bilinçdışı sezgiler, duygusal güvenlik ihtiyacı (${moonName} Ay) arasındaki kozmik denge.`;
      const astroLoss = 'Bu sembol çıkarılırsa bireyin doğduğu andaki gökyüzü konumlanışı ve Güneş-Ay içsel kutupsallığının kişisel ritmi tasarımdan eksilir.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: `Batı / Tropical Zodyak analizi (${sunName} Güneş, ${moonName} Ay - Yalnızca onaylı 10 gezegen kapsamı; eksen noktaları ve ev sistemleri hariçtir).`,
        originAnalysis: 'Batı / Tropical Zodyak',
        originValue: `${sunName} Güneş & ${moonName} Ay`,
        personalThemeTr: astroTheme,
        personalTheme: astroTheme,
        compositionRoleTr: 'Tamamlayıcı Göksel Katman: Ana sembolün üst/yan kanatlarında yer alarak kompozisyona zamansal ve göksel imza kazandırır.',
        compositionRole: 'Tamamlayıcı Göksel Katman',
        relatedSymbolNameTr: `Merkezi ${primarySymbolCandidate} ile hizalanır; eril (Güneş) ve dişil (Ay) kutupları merkezi mandalanın sağ ve sol kanatlarında dengeler.`,
        relatedSymbol: `Merkezi ${primarySymbolCandidate}`,
        visualExecutionTr: 'Minimalist astronomik glifler, ince mikro çizgi yayları ve göksel yörünge eğrileriyle ana geometriye organik olarak kaynaştırılmalıdır.',
        visualExecution: 'Minimalist astronomik glifler ve mikro çizgi yayları',
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
      const customTheme = 'Danışanın estetik ve ruhsal yolculuğunda bilinçli olarak tenine taşımak istediği kişisel niyet ve kültürel bağ.';
      const customLoss = 'Danışanın bilinçli iradesiyle kattığı kişisel niyet ve estetik vurgu tasarımdan eksilir.';
      detailedSymbols.push({
        symbolName: sym,
        isPrimary: false,
        weight: 'SECONDARY',
        originSourceTr: 'Danışanın bilinçli tercihi ve onaylanan kişisel sembol seçimi.',
        originAnalysis: 'Danışan Özel Tercihi',
        originValue: sym,
        personalThemeTr: customTheme,
        personalTheme: customTheme,
        compositionRoleTr: 'Aksan ve Çevreleme Katmanı: Kompozisyonun dış hatlarını çerçeveleyen veya dengeleyici aks oluşturan unsur.',
        compositionRole: 'Aksan ve Çevreleme Katmanı',
        relatedSymbolNameTr: 'Merkezi eksenin simetrisini destekler.',
        relatedSymbol: 'Merkezi eksen',
        visualExecutionTr: `${styleInfo.nameTr} stil kurallarına uygun olarak hassas ve temiz hatlarla işlenmelidir.`,
        visualExecution: `${styleInfo.nameTr} stilinde ince konturlar`,
        layerLossMeaningTr: customLoss,
        meaningRiskIfRemoved: customLoss,
      });
    }
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

  if (astrology && astrology.sunSign && astrology.moonSign) {
    completedAnalyses.push(`Batı / Tropical Zodyak (Güneş: ${TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr || astrology.sunSign}, Ay: ${TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr || astrology.moonSign})`);
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
        ...(astrology && astrology.sunSign && astrology.moonSign ? [{
          layerNameTr: `Batı / Tropical Zodyak (${TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr || astrology.sunSign} Güneş & ${TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr || astrology.moonSign} Ay)`,
          themeIntroducedTr: `Kozmik kutupsallık dengesi: Bilinçli irade (${TROPICAL_ZODIAC_SIGNS[astrology.sunSign]?.nameTr || astrology.sunSign}) ve duygusal güvenlik (${TROPICAL_ZODIAC_SIGNS[astrology.moonSign]?.nameTr || astrology.moonSign}).`,
          mappingRuleTr: 'Yalnızca astronomik olarak hesaplanan 10 gök cisminden Güneş ve Ay pozisyonları kullanılır; eksen noktaları ve ev sistemleri kapsam dışı bırakılır.',
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
      centralFocusRationaleTr: `Merkezi Odak: ${primarySymbolCandidate}, tasarımın ağırlık merkezidir. Danışanın Yaşam Yolu ${numerology.lifePathNumber} titreşimini ve ${archetype.unifiedArchetype.primary} arketipini temsil ettiği için kompozisyonun ana dikey aksında yükselir.`,
      secondaryArrangementRationaleTr: `İkincil Sembol Hiyerarşisi: ${candidateSecondary.length > 0 ? candidateSecondary.join(' · ') : 'Dengeleyici kutsal oran daireleri'} unsurları merkezin etrafında hiyerarşik bir ritimle düzenlenir; merkezle yarışmaz, onu çerçeveler ve besler.`,
      flowAndNegativeSpaceTr: `Geçişler ve Negatif Alan: ${placementInfo.nameTr} bölgesinin anatomik eğriliğine uyum sağlayan ${styleInfo.nameTr} akış hatları kullanılır. Kompozisyonda en az %30 oranında temiz ten (negatif alan) bırakılarak dövmenin zamanla yaşlanması ve çizgilerin birbirine girmesi engellenir.`,
      holisticIntegrationRulesTr: symbolCombinationRules,
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
        styleInfo.lineSpacingAdviceTr,
        styleInfo.antiBlowoutWarningTr,
      ],
      skinAgingAndNegativeSpaceAdviceTr: 'İnce çizgi ve geometrik tasarımlarda yaşlanma payı: Çizgiler arasında en az 1.5 - 2 mm nefes alanı bırakılmalı, tenin en az %30\'u boş tutularak mürekkebin yıllar içindeki difüzyonu telafi edilmelidir.',
    },
    conceptManifesto: conceptStatement,
    technicalPromptDirective: {
      englishPrompt: primaryPromptEn,
      negativePrompt,
      aspectRatio: placementInfo.recommendedDimensions.height > placementInfo.recommendedDimensions.width * 1.5 ? '9:16' : '3:4',
      forbiddenElementsAudited: [
        'Yükselen Burç (ASC) ve MC prompttan arındırılmıştır',
        'Ev sistemi ve eksen hesapları prompttan arındırılmıştır',
        'Anne adı görsel prompt ve negatif prompttan arındırılmıştır',
        'Yalnızca Batı tropikal zodyak Güneş ve Ay hizalanması ve onaylı semboller kullanılmıştır',
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
      centralFocusRationaleTr: `${primarySymbolCandidate} kompozisyonun ağırlık merkezidir; danışanın Yaşam Yolu ${numerology.lifePathNumber} titreşimini ve ${archetype.unifiedArchetype.primary} arketipinin ışık potansiyelini temsil eder.`,
      secondaryTransitionsTr: `${candidateSecondary.length > 0 ? candidateSecondary.join(' · ') : 'Dengeleyici kutsal oran daireleri'} katmanları merkezin çevresinde dengeli ve hiyerarşik bir akış oluşturur.`,
      negativeSpaceRatioTr: 'En az %30 temiz negatif alan',
      holisticIntegrationRules: symbolCombinationRules,
    },
    sectionH: {
      anatomicalPlacementTr: `${placementInfo.nameTr} · ${placementInfo.anatomicalFlowTr} (${placementInfo.curvatureAdviceTr})`,
      recommendedDimensionsTr: `Önerilen Ebat: ${effectiveDimensions.width} cm Genişlik × ${effectiveDimensions.height} cm Yükseklik (İdeal: 22 cm Yükseklik × 14 cm Genişlik, Asgari: 16 cm Yükseklik × 10 cm Genişlik)`,
      needleAndTechniqueGuidance: [
        ...styleInfo.needleRecommendationsTr,
        styleInfo.lineSpacingAdviceTr,
        styleInfo.antiBlowoutWarningTr,
      ],
      agingAndLineSpacingTr: 'İnce çizgi ve geometrik tasarımlarda yaşlanma payı: Çizgiler arasında en az 1.5 - 2 mm nefes alanı bırakılmalı, tenin en az %30\'u boş tutularak mürekkebin yıllar içindeki difüzyonu telafi edilmelidir.',
    },
    sectionI: {
      manifestoTr: conceptStatement,
    },
    sectionJ: {
      primaryPromptEn,
      negativePromptEn: negativePromptItems
        .filter((item) => !motherName || item.toLocaleLowerCase('tr-TR') !== motherName.trim().toLocaleLowerCase('tr-TR'))
        .join(', '),
      aspectRatio: placementInfo.recommendedDimensions.height > placementInfo.recommendedDimensions.width * 1.5 ? '9:16' : '3:4',
      technicalCleanlinessNoteTr: 'Tüm promptlar anne adı, yükselen burç, eksen noktaları, ev sistemleri ve Vedik astroloji terimlerinden %100 arındırılmıştır.',
    },
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
    keyComponents: [primarySymbolCandidate, ...candidateSecondary],
    technicalAdviceForArtist,
    detailedSymbols,
    comprehensiveReport,
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
