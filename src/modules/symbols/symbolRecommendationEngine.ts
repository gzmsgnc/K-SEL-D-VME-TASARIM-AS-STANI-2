import { SymbolDefinition } from './types';
import { MASTER_SYMBOLS, ALL_MASTER_SYMBOLS } from './masterSymbols';
import {
  SymbolRecommendationOptions,
  SymbolRecommendationResult,
} from './types';
import {
  NumerologyAnalysis,
  ChakraAnalysis,
  ArchetypeAnalysis,
} from '../../types/analysis';
import { TropicalNatalChart } from '../../types/astrology';
import { ClientTestResult } from '../../types/test';

/**
 * Hariç tutulan semboller ve anne adını kontrol eden filtre
 */
export function isSymbolExcluded(
  symbol: SymbolDefinition,
  excludedList: string[],
  motherName?: string
): boolean {
  if (!symbol) return true;

  const symbolTokensTr = [
    symbol.id,
    symbol.name,
    symbol.originalName || '',
    ...symbol.keywords,
    symbol.originCulture,
    symbol.meaning,
  ]
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  const symbolTokensEn = [
    symbol.id,
    symbol.name,
    symbol.originalName || '',
    ...symbol.keywords,
    symbol.originCulture,
    symbol.meaning,
  ]
    .join(' ')
    .toLowerCase();

  // Kural 5: Anne adı asla sembol olamaz
  if (motherName && motherName.trim().length > 1) {
    const motherCleanTr = motherName.trim().toLocaleLowerCase('tr-TR');
    const motherCleanEn = motherName.trim().toLowerCase();
    if (symbolTokensTr.includes(motherCleanTr) || symbolTokensEn.includes(motherCleanEn)) {
      return true;
    }
  }

  // Kural 2: Reçetede hariç tutulan hiçbir sembol
  for (const exc of excludedList) {
    const cleanExcTr = exc.trim().toLocaleLowerCase('tr-TR');
    const cleanExcEn = exc.trim().toLowerCase();
    if (
      cleanExcTr &&
      (symbolTokensTr.includes(cleanExcTr) ||
        cleanExcTr.includes(symbol.id.toLowerCase()) ||
        cleanExcTr.includes(symbol.name.toLocaleLowerCase('tr-TR')) ||
        symbolTokensEn.includes(cleanExcEn))
    ) {
      return true;
    }
  }

  return false;
}

export interface RecommendationEngineInputs {
  numerology?: NumerologyAnalysis | null;
  chakra?: ChakraAnalysis | null;
  archetype?: ArchetypeAnalysis | null;
  astrology?: TropicalNatalChart | null;
  testResults?: ClientTestResult[];
  motherName?: string;
  options?: SymbolRecommendationOptions;
}

/**
 * Gerçek danışan analiz verilerinden MASTER_SYMBOLS kütüphanesinden
 * en yüksek rezonansa sahip sembolleri puanlayarak önerir.
 */
export function recommendSymbolsForClient(
  inputs: RecommendationEngineInputs
): SymbolRecommendationResult[] {
  const {
    numerology,
    chakra,
    archetype,
    astrology,
    testResults = [],
    motherName,
    options = {},
  } = inputs;

  const rawExcluded = options.excludedSymbols || [];
  const excludedClean = rawExcluded.map((s) => s.trim()).filter(Boolean);
  const maxResults = options.maxRecommendations || 6;

  const results: SymbolRecommendationResult[] = [];
  const scoredIds = new Map<string, { score: number; reason: string; source: SymbolRecommendationResult['sourceModule'] }>();

  function addScore(
    id: string,
    score: number,
    reason: string,
    source: SymbolRecommendationResult['sourceModule']
  ) {
    const existing = scoredIds.get(id);
    if (!existing || score > existing.score) {
      scoredIds.set(id, { score: (existing?.score || 0) + score, reason, source });
    }
  }

  // 1. Numeroloji Rezonansı (Yaşam Yolu ve Kader)
  if (numerology && typeof numerology.lifePathNumber === 'number') {
    const lp = numerology.lifePathNumber;
    if (lp === 1) {
      addScore('sun-glyph-corona', 25, 'Yaşam Yolu 1 (Öncü İrade & Güneş)', 'NUMEROLOGY');
      addScore('bindu-focal-point', 18, 'Tekil odak ve başlangıç noktası', 'NUMEROLOGY');
    } else if (lp === 2) {
      addScore('vesica-piscis', 25, 'Yaşam Yolu 2 (İkili Denge & Sezgi)', 'NUMEROLOGY');
      addScore('zen-dual-lines', 18, 'Çift akış ve dinginlik', 'NUMEROLOGY');
    } else if (lp === 3) {
      addScore('triskele-spiral', 25, 'Yaşam Yolu 3 (Üçlü Yaratıcı İfade)', 'NUMEROLOGY');
      addScore('prism-triangle', 18, 'Işık prizması ve dışavurum', 'NUMEROLOGY');
    } else if (lp === 4) {
      addScore('metatron-cube', 25, 'Yaşam Yolu 4 (Kutsal Düzen & Sağlam Temel)', 'NUMEROLOGY');
      addScore('alchemy-four-elements', 20, 'Dört elementin kararlı dengesi', 'NUMEROLOGY');
    } else if (lp === 5) {
      addScore('fibonacci-spiral', 25, 'Yaşam Yolu 5 (Dinamik Akış & Değişim)', 'NUMEROLOGY');
      addScore('celestial-cloud-vectors', 18, 'Özgür hareket ve rüzgar', 'NUMEROLOGY');
    } else if (lp === 6) {
      addScore('flower-of-life', 25, 'Yaşam Yolu 6 (Evrensel Uyum & Şefkat)', 'NUMEROLOGY');
      addScore('sacred-lotus-anahata', 20, 'Kalp çiçeği ve sevgi bağı', 'NUMEROLOGY');
    } else if (lp === 7) {
      addScore('tree-of-life-yggdrasil', 25, 'Yaşam Yolu 7 (Mistik Arayış & Kök Bilgelik)', 'NUMEROLOGY');
      addScore('polaris-compass', 20, 'İçsel rehberlik ve kutup yıldızı', 'NUMEROLOGY');
      addScore('enso-circle', 18, 'Zen aydınlanması ve derin içgörü', 'NUMEROLOGY');
    } else if (lp === 8) {
      addScore('torus-field', 25, 'Yaşam Yolu 8 (Sonsuz Enerji & Maddi-Ruhsal Tezahür)', 'NUMEROLOGY');
      addScore('uroboros-infinity', 20, 'Sonsuz döngü ve kudret', 'NUMEROLOGY');
    } else if (lp === 9) {
      addScore('sri-yantra', 25, 'Yaşam Yolu 9 (Evrensel Bilinç & Tamamlanma)', 'NUMEROLOGY');
      addScore('seed-of-life', 20, 'Kutsal yaşam tohumu', 'NUMEROLOGY');
    } else if ([11, 22, 33].includes(lp)) {
      addScore('metatron-cube', 30, `Üstat Sayı ${lp} (Kozmik Geometri & Yüksek Titreşim)`, 'NUMEROLOGY');
      addScore('flower-of-life', 25, 'Yaşam Çiçeği fraktal rezonansı', 'NUMEROLOGY');
    }
  }

  // 2. Çakra Destek ve Blokaj Rezonansı
  if (chakra && chakra.primaryDeficit) {
    const deficit = chakra.primaryDeficit;
    if (deficit === 'ROOT') {
      addScore('tree-of-life-yggdrasil', 24, 'Kök Çakra Blokajı için Derin Topraklanma', 'CHAKRA');
      addScore('obsidian-mountain-peak', 22, 'Kök merkezini sabitleyen sarsılmaz zirve', 'CHAKRA');
    } else if (deficit === 'SACRAL') {
      addScore('flowing-water-waves', 24, 'Sakral Çakra için Akışkan Su Geometrisi', 'CHAKRA');
      addScore('moon-phases-crescent', 20, 'Duygusal akış ve hilal ritmi', 'CHAKRA');
    } else if (deficit === 'SOLAR_PLEXUS') {
      addScore('sun-glyph-corona', 24, 'Solar Pleksus için İçsel Güneş Koronası', 'CHAKRA');
      addScore('sri-yantra', 20, 'İrade ve cesaret üçgenleri', 'CHAKRA');
    } else if (deficit === 'HEART') {
      addScore('sacred-lotus-anahata', 26, 'Kalp Çakrası için 12 Yapraklı Lotus Mührü', 'CHAKRA');
      addScore('flower-of-life', 20, 'Koşulsuz şefkat geometrisi', 'CHAKRA');
    } else if (deficit === 'THROAT') {
      addScore('triskele-spiral', 24, 'Boğaz Çakrası için İfade ve Nefes Spirali', 'CHAKRA');
      addScore('celestial-cloud-vectors', 18, 'Özgür ses ve hava akışı', 'CHAKRA');
    } else if (deficit === 'THIRD_EYE') {
      addScore('eye-of-horus', 26, 'Üçüncü Göz için Berrak Sezgi ve Wadjet Glifi', 'CHAKRA');
      addScore('prism-triangle', 20, 'Zihinsel berraklık prizması', 'CHAKRA');
    } else if (deficit === 'CROWN') {
      addScore('metatron-cube', 26, 'Tepe Çakrası için Kozmik Bağlantı Küpü', 'CHAKRA');
      addScore('enso-circle', 20, 'Birlik bilinci ve boşluk', 'CHAKRA');
    }
  }

  // 3. Arketip Rezonansı (Birleşik ve Gölge)
  if (archetype && archetype.unifiedArchetype) {
    const primaryArch = archetype.unifiedArchetype.primary;
    if (primaryArch.includes('Bilge') || primaryArch.includes('Mistik')) {
      addScore('tree-of-life-yggdrasil', 20, 'Mistik / Bilge arketipinin kök bilgeliği', 'ARCHETYPE');
      addScore('enso-circle', 18, 'Zen ve derin içgörü', 'ARCHETYPE');
    }
    if (primaryArch.includes('Savaşçı') || primaryArch.includes('Öncü')) {
      addScore('sun-glyph-corona', 20, 'Savaşçı iradesi ve zafer güneşi', 'ARCHETYPE');
      addScore('obsidian-mountain-peak', 18, 'Sarsılmaz duruş', 'ARCHETYPE');
    }
    if (primaryArch.includes('Yaratıcı') || primaryArch.includes('Sanatçı')) {
      addScore('fibonacci-spiral', 20, 'Yaratıcı ilham spirali', 'ARCHETYPE');
      addScore('prism-triangle', 18, 'Fikirlerin ışık prizması', 'ARCHETYPE');
    }
    if (primaryArch.includes('Lider') || primaryArch.includes('Hükümdar')) {
      addScore('metatron-cube', 20, 'Liderlik mimarisi ve koruma', 'ARCHETYPE');
      addScore('torus-field', 18, 'Manyetik etki alanı', 'ARCHETYPE');
    }

    if (archetype.shadowArchetype) {
      addScore('lunar-eclipse-halo', 22, `Gölge Arketip Dönüşümü (${archetype.shadowArchetype.shadowName})`, 'ARCHETYPE');
    }
  }

  // 4. Astroloji Rezonansı (Güneş & Ay Burç Elementleri)
  if (astrology) {
    if (astrology.sunSign || astrology.moonSign) {
      addScore('sun-glyph-corona', 16, 'Astrolojik Güneş hizalanması', 'ASTROLOGY');
      addScore('moon-phases-crescent', 16, 'Astrolojik Ay fazı hizalanması', 'ASTROLOGY');
    }
  }

  // 5. Hayvan Totemi Değerlendirmesi (Kural 6, 7 & 10)
  // Kural 10: Doğrudan hayvan figürü ana sembol yapılmaz; eğer görselde istenmişse soyut doğal semboller desteklenir
  const totemTest = testResults.find((t) => t.testType === 'ANIMAL_TOTEM');
  if (totemTest && totemTest.primaryType) {
    const totemName = totemTest.primaryType;
    const isTotemExcluded = excludedClean.some(
      (exc) =>
        totemName.toLocaleLowerCase('tr-TR').includes(exc.toLocaleLowerCase('tr-TR')) ||
        exc.toLocaleLowerCase('tr-TR').includes(totemName.toLocaleLowerCase('tr-TR'))
    );
    if (options.includeTotemInVisual && !isTotemExcluded) {
      addScore('obsidian-mountain-peak', 15, `Totem (${totemName}) için soyut yeryüzü topraklanması`, 'TOTEM');
    }
  }

  // Puanlanmış sembolleri filtrele ve sırala
  const sortedIds = Array.from(scoredIds.entries()).sort((a, b) => b[1].score - a[1].score);

  for (const [id, meta] of sortedIds) {
    const sym = MASTER_SYMBOLS[id];
    if (!sym) continue;

    // Kural 2 & 5: Hariç tutulanları ve anne adını ele
    if (isSymbolExcluded(sym, excludedClean, motherName)) {
      continue;
    }

    // Kategori tercihi varsa filtrele
    if (options.preferredCategories && options.preferredCategories.length > 0) {
      if (!options.preferredCategories.includes(sym.geometryType)) {
        continue;
      }
    }

    let suggestedWeight: SymbolRecommendationResult['suggestedWeight'] = 'SECONDARY';
    if (results.length === 0) {
      suggestedWeight = 'PRIMARY';
    } else if (results.length > 2) {
      suggestedWeight = 'ACCENT';
    }

    results.push({
      symbol: sym,
      matchingScore: meta.score,
      reasonTr: meta.reason,
      sourceModule: meta.source,
      suggestedWeight,
    });

    if (results.length >= maxResults) break;
  }

  // Eğer filtreler sonrası sonuç azsa, MASTER_SYMBOLS içindeki kutsal geometri sembollerinden takviye et
  if (results.length === 0) {
    for (const sym of ALL_MASTER_SYMBOLS) {
      if (!isSymbolExcluded(sym, excludedClean, motherName)) {
        results.push({
          symbol: sym,
          matchingScore: 10,
          reasonTr: 'Temel harmonik kutsal geometri rezonansı',
          sourceModule: 'SACRED_BALANCE',
          suggestedWeight: results.length === 0 ? 'PRIMARY' : 'SECONDARY',
        });
        if (results.length >= 3) break;
      }
    }
  }

  return results;
}
