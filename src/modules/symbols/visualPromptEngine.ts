import {
  VisualPromptGenerationInput,
  VisualPromptOutput,
} from './types';
import { ALL_MASTER_SYMBOLS } from './masterSymbols';
import { TATTOO_STYLES, BODY_PLACEMENTS, COLOR_PROFILES } from '../recipe/constants';

/**
 * Filtreleme yardımcısı: Bir metnin hariç tutulan sözcükleri veya anne adını içerip içermediğini kontrol eder.
 */
function containsForbiddenWords(
  text: string,
  excludedList: string[],
  motherName?: string
): boolean {
  if (!text) return false;
  const lowerTr = text.toLocaleLowerCase('tr-TR');
  const lowerEn = text.toLowerCase();

  // Kural 5: Anne adı asla sembol seçimine veya görsel tasarıma aktarılmaz
  if (motherName && motherName.trim().length > 1) {
    const motherTr = motherName.trim().toLocaleLowerCase('tr-TR');
    const motherEn = motherName.trim().toLowerCase();
    if (lowerTr.includes(motherTr) || lowerEn.includes(motherEn)) {
      return true;
    }
  }

  // Kural 2: Hariç tutulan semboller (Tam metin ve kelime kökü kontrolü)
  for (const exc of excludedList) {
    const cleanTr = exc.trim().toLocaleLowerCase('tr-TR');
    const cleanEn = exc.trim().toLowerCase();
    if (!cleanTr) continue;

    if (
      lowerTr.includes(cleanTr) ||
      cleanTr.includes(lowerTr) ||
      lowerEn.includes(cleanEn) ||
      cleanEn.includes(lowerEn)
    ) {
      return true;
    }

    // Kelime bazlı kontrol (örn: "Metatron Küpü" -> "metatron", "küp")
    const wordsTr = cleanTr.split(/\s+/).filter((w) => w.length > 2);
    for (const w of wordsTr) {
      if (lowerTr.includes(w) || lowerEn.includes(w)) {
        return true;
      }
    }
  }

  return false;
}

const KNOWN_ANIMAL_TERMS = [
  'kurt', 'wolf', 'şahin', 'sahin', 'hawk', 'falcon', 'kartal', 'eagle',
  'baykuş', 'baykus', 'owl', 'jaguar', 'ayı', 'ayi', 'bear',
  'yılan', 'yilan', 'snake', 'serpent', 'geyik', 'deer', 'stag',
  'yunus', 'dolphin', 'aslan', 'lion', 'kaplan', 'tiger', 'tilki', 'fox',
  'at', 'horse', 'kedi', 'cat', 'köpek', 'dog', 'karga', 'crow', 'raven',
];

interface AbstractTotemMotif {
  promptEn: string;
  accentTr: string;
}

/**
 * AŞAMA 5.4.0.1: Totem hayvanını doğrudan fiziksel biçimi, silüeti veya adıyla değil;
 * temsil ettiği elementel ve arketipik anlamı bağımsız kutsal geometri ve soyut motiflerle ifade eder.
 * Hayvan adı, silüeti, anatomisi, başı, gövdesi, kanadı veya kuyruğu ASLA kullanılmaz.
 * Güvenli bir soyut karşılık bulunamazsa null döndürülerek ilgili görsel öğe dışarıda bırakılır.
 */
function resolveAbstractTotemMotif(totemName?: string): AbstractTotemMotif | null {
  if (!totemName || !totemName.trim()) return null;
  const clean = totemName.trim().toLocaleLowerCase('tr-TR');

  if (clean.includes('yunus')) {
    return {
      promptEn: 'rhythmic flowing wave curves and fluid sinusoidal sacred line geometry',
      accentTr: 'Ritmik akışkan dalga eğrileri ve sinüzoidal çizgi geometrisi',
    };
  }
  if (clean.includes('şahin') || clean.includes('sahin')) {
    return {
      promptEn: 'ascending celestial chevron vectors and sharp radial perspective line geometry',
      accentTr: 'Göksel açısal perspektif vektörleri ve odak geometrisi',
    };
  }
  if (clean.includes('kartal')) {
    return {
      promptEn: 'ascending celestial vector rays and expansive solar geometric lattice',
      accentTr: 'Yükselen göksel ışın vektörleri ve genişleyen güneş geometrisi',
    };
  }
  if (clean.includes('baykuş') || clean.includes('baykus')) {
    return {
      promptEn: 'concentric focal perception rings with intersecting aperture geometry',
      accentTr: 'Eşmerkezli odak halkaları ve kesişen diyafram geometrisi',
    };
  }
  if (clean.includes('jaguar')) {
    return {
      promptEn: 'alchemical dynamic triangular energy vectors and interlocking sharp geometric lines',
      accentTr: 'Dinamik üçgen enerji vektörleri ve keskin geometrik hatlar',
    };
  }
  if (clean.includes('ayı') || clean.includes('ayi')) {
    return {
      promptEn: 'rooted vertical foundation pillar lattice and solid grounding geometric matrix',
      accentTr: 'Köklenmiş dikey temel sütunu ve zemin kafes geometrisi',
    };
  }
  if (clean.includes('yılan') || clean.includes('yilan')) {
    return {
      promptEn: 'concentric interlocking circular renewal loops and infinite cyclical vortex geometry',
      accentTr: 'İç içe geçen dairesel döngü formları ve sonsuzluk girdap geometrisi',
    };
  }
  if (clean.includes('kurt')) {
    return {
      promptEn: 'protective geometric boundary shield lattice with interlocking angle vectors',
      accentTr: 'Koruyucu geometrik kalkan ve açısal sınır matrisi',
    };
  }
  if (clean.includes('geyik')) {
    return {
      promptEn: 'delicate harmonious radial curve motifs and balance-centered organic lines',
      accentTr: 'Ahenkli radyal eğri motifleri ve dengeleyici organik hatlar',
    };
  }

  // Güvenli bir karşılık bulunamazsa hayvan figürü üretmek yerine görsel öğe dışarıda bırakılır
  return null;
}

const TOTEM_ANIMAL_PAIRS: Record<string, string[]> = {
  kurt: ['kurt', 'wolf'],
  şahin: ['şahin', 'sahin', 'hawk', 'falcon'],
  kartal: ['kartal', 'eagle'],
  baykuş: ['baykuş', 'baykus', 'owl'],
  jaguar: ['jaguar'],
  ayı: ['ayı', 'ayi', 'bear'],
  yılan: ['yılan', 'yilan', 'snake', 'serpent'],
  geyik: ['geyik', 'deer', 'stag'],
  yunus: ['yunus', 'dolphin'],
};

/**
 * AŞAMA 5.4.0.1: Totem adı veya hayvan türünün negatif veya pozitif prompta sızmasını engeller.
 * Eğer totemName belirtilmişse, ilgili hayvanın adı ve varyantları negatif prompta ASLA aktarılmaz.
 */
function isAnimalNameOrSpecies(term: string, totemName?: string): boolean {
  if (!term) return false;
  const cleanTr = term.trim().toLocaleLowerCase('tr-TR');
  const cleanEn = term.trim().toLowerCase();

  if (totemName && totemName.trim()) {
    const totemTr = totemName.trim().toLocaleLowerCase('tr-TR');
    if (
      cleanTr === totemTr ||
      cleanTr.includes(totemTr) ||
      cleanTr.split(/\s+/).includes(totemTr)
    ) {
      return true;
    }

    for (const [key, variants] of Object.entries(TOTEM_ANIMAL_PAIRS)) {
      if (totemTr.includes(key)) {
        if (variants.some((v) => cleanTr === v || cleanTr.includes(v) || cleanEn.includes(v))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * 10 Adımlı Veri Zincirini:
 * Danışan → Analiz sonuçları → A15 Dövme Reçetesi → Sembol seçimi → Hariç tutulan semboller
 * → Stil → Yerleşim → Kompozisyon → Teknik tasarım talimatı → Nihai görsel istem
 * sentezleyerek dövme sanatçısının inceleyebileceği, beyaz zemin üzerinde bağımsız
 * dövme tasarım şablonu (tattoo stencil flash sheet) istemini ve Türkçe konsept manifestosunu üretir.
 */
export function generateUnifiedVisualPrompt(
  input: VisualPromptGenerationInput
): VisualPromptOutput {
  const {
    clientId,
    clientFullName,
    motherName,
    recipe,
    selectedSymbols = [],
    recommendedSymbols = [],
    excludedSymbols = [],
    style,
    placement,
    colorProfile,
    compositionNarrative,
    includeTotemInVisual = false,
    totemName,
    conceptStatement,
  } = input;

  // Doğrulama: Danışan kimliği ve geçerli A15 reçetesi zorunludur (Eksik reçete durumunda sahte veri üretilmez)
  if (!clientId || !clientId.trim()) {
    throw new Error('Geçerli bir danışan kimliği (clientId) gereklidir.');
  }

  if (!recipe || !recipe.primarySymbol || !recipe.primarySymbol.trim()) {
    throw new Error('Eksik reçete: Görsel prompt oluşturmak için önce geçerli bir A15 Dövme Reçetesi gereklidir.');
  }

  // Hariç tutulanlar listesi (reçeteden gelenler + kullanıcı tarafından belirtilenler)
  const rawExcluded = [
    ...(excludedSymbols || []),
    ...(recipe.excludedElements || []),
  ];
  const excludedClean = Array.from(new Set(rawExcluded.map((s) => s.trim()).filter(Boolean)));

  const effectiveStyle = style || recipe.style || 'SACRED_GEOMETRY';
  const effectivePlacement = placement || recipe.recommendedPlacement || 'FOREARM_INNER';
  const effectiveColorProfile = colorProfile || recipe.colorProfile || 'MONOCHROME_BLACK';

  const styleMeta = TATTOO_STYLES[effectiveStyle] || TATTOO_STYLES.SACRED_GEOMETRY;
  const placementMeta = BODY_PLACEMENTS[effectivePlacement] || BODY_PLACEMENTS.FOREARM_INNER;
  const colorMeta = COLOR_PROFILES[effectiveColorProfile] || COLOR_PROFILES.MONOCHROME_BLACK;

  // 1. Sembol Hiyerarşisi (Kural 3 & 4: Kullanıcı seçimi ve Reçete önerileri korunur, karıştırılmaz)
  const primarySymbolItems: string[] = [];
  const secondarySymbolItems: string[] = [];
  const accentSymbolItems: string[] = [];

  // Kullanıcının açıkça seçtiği semboller
  for (const sel of selectedSymbols) {
    if (!containsForbiddenWords(sel.symbolName, excludedClean, motherName)) {
      if (sel.weight === 'PRIMARY') {
        if (!primarySymbolItems.includes(sel.symbolName)) {
          primarySymbolItems.push(sel.symbolName);
        }
      } else if (sel.weight === 'SECONDARY') {
        if (!secondarySymbolItems.includes(sel.symbolName)) {
          secondarySymbolItems.push(sel.symbolName);
        }
      } else {
        if (!accentSymbolItems.includes(sel.symbolName)) {
          accentSymbolItems.push(sel.symbolName);
        }
      }
    }
  }

  // Eğer kullanıcı doğrudan bir ana sembol seçmediyse, A15 Reçetesindeki ana sembolü kullan
  if (primarySymbolItems.length === 0) {
    if (recipe.primarySymbol && !containsForbiddenWords(recipe.primarySymbol, excludedClean, motherName)) {
      primarySymbolItems.push(recipe.primarySymbol);
    } else {
      // Reçetedeki ana sembol hariç tutulmuşsa, sistemdeki uygun sembollerden ilkini al
      const validRec = recommendedSymbols.find(
        (rec) => !containsForbiddenWords(rec.name, excludedClean, motherName)
      );
      if (validRec) {
        primarySymbolItems.push(validRec.name);
      } else {
        const fallback = ALL_MASTER_SYMBOLS.find(
          (s) => !containsForbiddenWords(s.name, excludedClean, motherName)
        );
        if (fallback) {
          primarySymbolItems.push(fallback.name);
        } else {
          throw new Error('Tüm semboller hariç tutulduğu için geçerli bir ana sembol belirlenemedi.');
        }
      }
    }
  }

  // Reçetenin ikincil sembolleri
  if (recipe.secondarySymbols) {
    for (const sec of recipe.secondarySymbols) {
      if (
        !containsForbiddenWords(sec, excludedClean, motherName) &&
        !primarySymbolItems.includes(sec) &&
        !secondarySymbolItems.includes(sec)
      ) {
        secondarySymbolItems.push(sec);
      }
    }
  }

  // Önerilen semboller (henüz eklenmemiş olanlar aksan olarak dahil edilebilir)
  for (const rec of recommendedSymbols) {
    if (
      !containsForbiddenWords(rec.name, excludedClean, motherName) &&
      !primarySymbolItems.includes(rec.name) &&
      !secondarySymbolItems.includes(rec.name) &&
      !accentSymbolItems.includes(rec.name)
    ) {
      accentSymbolItems.push(rec.name);
    }
  }

  // 2. Totem Entegrasyonu (AŞAMA 5.4.0.1)
  // Totem hayvanının adı, hayvan silüeti, anatomisi, başı, gövdesi, kanadı, kuyruğu veya tanınabilir fiziksel biçimi
  // görsel prompta ASLA aktarılmaz. Totemin temsil ettiği anlam, bağımsız geometrik veya doğal soyut motiflerle ifade edilir.
  // Güvenli bir soyut karşılık bulunamazsa ilgili görsel öğe tamamen dışarıda bırakılır.
  let totemVisualPromptClause = '';
  if (totemName && !containsForbiddenWords(totemName, excludedClean, motherName)) {
    if (includeTotemInVisual) {
      const abstractMotif = resolveAbstractTotemMotif(totemName);
      if (abstractMotif) {
        totemVisualPromptClause = abstractMotif.promptEn;
        accentSymbolItems.push(abstractMotif.accentTr);
      }
    }
  }

  // 3. Kompozisyon Hiyerarşisi (Reçete Standartları: Nominal %65 Ana Odak, %35 İkincil Katman)
  const compositionHierarchy = [
    `Merkezi Odak (Primary - %65): ${primarySymbolItems.join(' & ')}`,
    secondarySymbolItems.length > 0
      ? `Tamamlayıcı Katman (Secondary - %35): ${secondarySymbolItems.slice(0, 3).join(' · ')}`
      : 'Tamamlayıcı Katman (%35): Dengeleyici kutsal oran çemberleri',
    accentSymbolItems.length > 0
      ? `İnce Detaylar (Accents): ${accentSymbolItems.slice(0, 3).join(' · ')}`
      : 'İnce Detaylar: Mikro yıldız ve glif aksanları',
    `Anatomik Akış: ${placementMeta.nameTr} (${placementMeta.anatomicalFlowTr})`,
  ];

  // 4. Sanatçı Teknik Çizim Talimatları (Kural 13 & 14 & Reçete Standartları)
  const effectiveDimensions =
    recipe.recommendedDimensionsCm &&
    recipe.recommendedDimensionsCm.width > 0 &&
    recipe.recommendedDimensionsCm.height > 0
      ? recipe.recommendedDimensionsCm
      : (recipe.compositionMetrics?.idealDimensionsCm || { width: 22, height: 14 });

  const technicalDirectives: string[] = [
    `Stil: ${styleMeta.nameTr}`,
    `İğne ve Gölgeleme: ${styleMeta.needleRecommendationsTr.join(', ')}`,
    `Çizgi Aralığı ve Nefes Alanı: Minimum 1.5 mm, ideal 2.0 mm çizgi aralığı korunmalıdır (${styleMeta.lineSpacingAdviceTr})`,
    `Blowout Önleme Uyarısı: ${styleMeta.antiBlowoutWarningTr}`,
    `Tasarım Ölçüleri: ${effectiveDimensions.width} cm x ${effectiveDimensions.height} cm (Minimum: 16x10 cm, İdeal: 22x14 cm)`,
    `Renk Profili: ${colorMeta.nameTr} (${colorMeta.rationaleTr})`,
    'Kompozisyon Hiyerarşisi: Pozitif dövme alanında Ana Odak nominal %65, İkincil Tamamlayıcı Katman %35 oranında dengelenmelidir.',
    'Negatif Alan Standardı: Ciltte pigment yığılması ve mürekkep patlamasını (blowout) önlemek için toplam yüzeyde hedef %45–50 temiz negatif alan bırakılmalıdır.',
  ];

  // 5. Görsel İstem (Midjourney / OpenAI GPT Image Sentezi)
  // Aşama 5.4.0: Bağımsız Dövme Şablonu (Tattoo Stencil Flash Sheet) ve Saf Beyaz Arka Plan Direktifleri
  const stencilDirectives = [
    'standalone independent 2D vector tattoo stencil flash sheet design',
    'isolated on pure solid white background, flat clean white backdrop',
    'centered standalone composition, complete design with generous padding margins',
    'no edge clipping, fully contained within frame boundaries',
    'high contrast solid black ink lines, clean vector linework',
    'sharp crisp separated lines with distinct boundaries, immaculate fine line definition',
    'independent graphic design artwork, not applied on skin',
  ];

  const promptSubjectParts = [
    primarySymbolItems[0],
    secondarySymbolItems.length > 0 ? secondarySymbolItems[0] : '',
    totemVisualPromptClause,
    ...stencilDirectives,
    'sacred geometric harmony',
    'nominal 65% primary visual focus',
    '35% secondary geometric layer',
    'target 45-50% clean negative space',
    '1.5mm to 2mm line spacing',
    'balanced vertical anatomical alignment',
  ]
    .filter(Boolean)
    .filter((s) => !containsForbiddenWords(s, excludedClean, motherName))
    .filter((s) => !isAnimalNameOrSpecies(s, totemName));

  const promptSubjects = promptSubjectParts.join(', ');
  const sanitizedStyleKeywords = styleMeta.aestheticPromptKeywords.filter(
    (kw) => !containsForbiddenWords(kw, excludedClean, motherName)
  );
  const promptStyleTokens = sanitizedStyleKeywords.join(', ');
  const promptColorTokens = !containsForbiddenWords(colorMeta.promptModifier, excludedClean, motherName)
    ? colorMeta.promptModifier
    : '';

  // Aşama 5.4.0 Zorunlu Negatif Filtreler:
  // Kol/cilt, insan bedeni, fotoğraf, mockup, kağıt dokusu, gölge, çerçeve ve tipografi yasakları
  const mandatoryMockupAndBodyNegatives = [
    'photorealistic human arm',
    'tattooed skin',
    'human body',
    'skin texture',
    'arm mockup',
    'hand mockup',
    'body photography',
    'lifestyle photography',
    'product photography',
    'table mockup',
    'paper texture',
    'folded paper',
    'frame',
    'border',
    'drop shadow',
    'environmental background',
    'colored background',
    'watermark',
    'text',
    'letters',
    'numbers',
    'typography',
  ];

  const artisticQualityNegatives = [
    'blur',
    'ugly lines',
    'low contrast',
    'color bleeding',
    'cartoonish sticker look',
    'realistic animal face',
    'realistic animal head',
    'deformed geometry',
    'shading noise',
    'color smudge',
    'ugly anatomy',
    'skin pores',
    'no names',
    'no letters',
    'no words',
    'no text',
    'no dates',
    'no personal text',
    'no typography',
  ];

  const combinedNegativeList = Array.from(
    new Set([...mandatoryMockupAndBodyNegatives, ...artisticQualityNegatives])
  );

  const primaryPromptEn = `${promptSubjects}, ${promptStyleTokens}, ${promptColorTokens}, professional tattoo stencil flash sheet, standalone graphic design, pure white background --no ${combinedNegativeList.join(', ')}`;

  const conceptPromptTr = `${clientFullName} için ${styleMeta.nameTr} stilinde, ${placementMeta.nameTr} bölgesine özel (${effectiveDimensions.width}x${effectiveDimensions.height} cm, min 16x10 cm, ideal 22x14 cm), %65 ana odak ve %45–50 negatif alan hedefiyle ${primarySymbolItems[0]} merkezli kişiye özel dövme tasarımı.`;

  // Negatif prompt: Zorunlu yasaklar + kalite filtreleri + hariç tutulan semboller;
  // AŞAMA 5.4.0.1: Anne adı VE hayvan adı/türü negatif prompta da ASLA eklenmez (API'ye hiçbir hayvan adı aktarılmaz)
  const negativePromptList = Array.from(
    new Set([...combinedNegativeList, ...excludedClean])
  ).filter((term) => !isAnimalNameOrSpecies(term, totemName));

  return {
    primaryPromptEn,
    conceptPromptTr,
    negativePrompt: negativePromptList.join(', '),
    compositionHierarchy,
    technicalDirectives,
    excludedSanitized: excludedClean,
  };
}
