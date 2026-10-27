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

/**
 * 10 Adımlı Veri Zincirini:
 * Danışan → Analiz sonuçları → A15 Dövme Reçetesi → Sembol seçimi → Hariç tutulan semboller
 * → Stil → Yerleşim → Kompozisyon → Teknik tasarım talimatı → Nihai görsel istem
 * sentezleyerek Midjourney / AI görsel üretim istemini ve Türkçe konsept manifestosunu üretir.
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

  // 2. Totem Entegrasyonu (Kural 6, 7 & 10)
  let totemVisualPromptClause = '';
  if (totemName && !containsForbiddenWords(totemName, excludedClean, motherName)) {
    if (includeTotemInVisual) {
      // Kural 7 & 10: Doğrudan hayvan figürü/sticker değil, soyut/geometrik hat entegrasyonu
      totemVisualPromptClause = `abstract minimalist geometric line silhouette of ${totemName} integrated into sacred geometry`;
      accentSymbolItems.push(`Soyut ${totemName} geometrisi`);
    }
  }

  // 3. Kompozisyon Hiyerarşisi
  const compositionHierarchy = [
    `Merkezi Odak (Primary): ${primarySymbolItems.join(' & ')}`,
    secondarySymbolItems.length > 0
      ? `Tamamlayıcı Katman (Secondary): ${secondarySymbolItems.slice(0, 3).join(' · ')}`
      : 'Tamamlayıcı Katman: Dengeleyici kutsal oran çemberleri',
    accentSymbolItems.length > 0
      ? `İnce Detaylar (Accents): ${accentSymbolItems.slice(0, 3).join(' · ')}`
      : 'İnce Detaylar: Mikro yıldız ve glif aksanları',
    `Anatomik Akış: ${placementMeta.nameTr} (${placementMeta.anatomicalFlowTr})`,
  ];

  // 4. Sanatçı Teknik Çizim Talimatları (Kural 13 & 14: Yalnızca teknik alanda)
  const effectiveDimensions =
    recipe.recommendedDimensionsCm &&
    recipe.recommendedDimensionsCm.width > 0 &&
    recipe.recommendedDimensionsCm.height > 0
      ? recipe.recommendedDimensionsCm
      : placementMeta.recommendedDimensions;

  const technicalDirectives: string[] = [
    `Stil: ${styleMeta.nameTr}`,
    `İğne ve Gölgeleme: ${styleMeta.needleRecommendationsTr.join(', ')}`,
    `Çizgi Aralığı ve Nefes Alanı: ${styleMeta.lineSpacingAdviceTr}`,
    `Blowout Önleme Uyarısı: ${styleMeta.antiBlowoutWarningTr}`,
    `Önerilen Ebat: ${effectiveDimensions.width} cm x ${effectiveDimensions.height} cm`,
    `Renk Profili: ${colorMeta.nameTr} (${colorMeta.rationaleTr})`,
    'Ciltte minimum %30 temiz negatif alan bırakılarak uzun ömürlü pigment berraklığı korunmalıdır.',
  ];

  // 5. Görsel İstem (Midjourney / AI Prompt Sentezi)
  const promptSubjectParts = [
    primarySymbolItems[0],
    secondarySymbolItems.length > 0 ? secondarySymbolItems[0] : '',
    totemVisualPromptClause,
    'sacred geometric harmony',
    'vector tattoo flash design',
    'balanced anatomical alignment',
  ]
    .filter(Boolean)
    .filter((s) => !containsForbiddenWords(s, excludedClean, motherName));

  const promptSubjects = promptSubjectParts.join(', ');
  const sanitizedStyleKeywords = styleMeta.aestheticPromptKeywords.filter(
    (kw) => !containsForbiddenWords(kw, excludedClean, motherName)
  );
  const promptStyleTokens = sanitizedStyleKeywords.join(', ');
  const promptColorTokens = !containsForbiddenWords(colorMeta.promptModifier, excludedClean, motherName)
    ? colorMeta.promptModifier
    : '';

  const noParamKeywords = [
    'shading noise',
    'color smudge',
    'ugly anatomy',
    'cartoonish',
    'photo frame',
    'skin pores',
    'realistic animal face',
    'realistic animal head',
  ];

  const primaryPromptEn = `${promptSubjects}, ${promptStyleTokens}, ${promptColorTokens}, professional vector tattoo stencil, sharp crisp lines, immaculate geometry, pure white background --no ${noParamKeywords.join(', ')}`;

  const conceptPromptTr = `${clientFullName} için ${styleMeta.nameTr} stilinde, ${placementMeta.nameTr} bölgesine özel (${effectiveDimensions.width}x${effectiveDimensions.height} cm), ${primarySymbolItems[0]} merkezli kişiye özel dövme tasarımı.`;

  // Negatif prompt: Hariç tutulan semboller dahil edilir, ANNE ADI KESİNLİKLE EKLENMEZ
  const negativePromptList = [
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

  return {
    primaryPromptEn,
    conceptPromptTr,
    negativePrompt: negativePromptList.join(', '),
    compositionHierarchy,
    technicalDirectives,
    excludedSanitized: excludedClean,
  };
}
