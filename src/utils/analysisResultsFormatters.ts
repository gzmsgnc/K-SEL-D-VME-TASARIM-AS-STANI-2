import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { ChakraName } from '../types/analysis';
import { TestQuestionAnswer } from '../types/test';
import { TROPICAL_ZODIAC_SIGNS, CELESTIAL_BODIES_TR } from '../modules/astrology';
import { calculateChakraAnalysisFromNumerology, CHAKRA_DEFINITIONS } from '../modules/chakra';
import { TOTEM_ANIMALS, ENNEAGRAM_QUESTIONS, TOTEM_QUESTIONS } from '../modules/tests';
import { NUMBER_RESONANCE_TABLE } from '../modules/numerology';
import { ZodiacSign } from '../types/astrology';

/**
 * Zodyak anahtarını normalize eden yardımcı fonksiyon (Büyük-küçük harf toleranslı)
 */
function normalizeZodiacKey(sign?: string): ZodiacSign | undefined {
  if (!sign) return undefined;
  if (TROPICAL_ZODIAC_SIGNS[sign as ZodiacSign]) return sign as ZodiacSign;
  const title = (sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()) as ZodiacSign;
  if (TROPICAL_ZODIAC_SIGNS[title]) return title;
  return sign as ZodiacSign;
}

/**
 * A28 — Danışan Analiz Sonuçları Modeli ve Kopyalama Formatlayıcıları
 * Aktif danışanın kayıtlı analiz ve test sonuçlarını izole, güvenli ve
 * tamamen Türkçe olarak ayrıştırır. Hiçbir varsayılan veya sahte sonuç üretmez.
 */

export interface AstrologyCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  sunSign?: string;
  sunSignTr?: string;
  moonSign?: string;
  moonSignTr?: string;
  ascendantSign?: string;
  ascendantSignTr?: string;
  ascendantDegree?: number;
  ascendantMinute?: number;
  formattedAscendantTr?: string;
  isBirthTimeKnown: boolean;
  risingNoteTr?: string;
  planetaryPositions?: Array<{
    body: string;
    sign: string;
    signTr: string;
    degree: number;
    houseNumber?: number;
  }>;
  calculatedAt?: string;
  rawRecordDate?: string;
}

export interface NumerologyCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  lifePathNumber?: number;
  destinyNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
  birthdayNumber?: number;
  worldMissionNumber?: number;
  karmicLessons?: number[];
  masterNumbers?: number[];
  resonanceSummaryTr?: string;
  calculatedAt?: string;
}

export interface ChakraCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  dominantChakra?: string;
  dominantChakraTr?: string;
  dominantColorHex?: string;
  dominantElementTr?: string;
  dominantTraitsTr?: string;
  primaryDeficit?: string;
  primaryDeficitTr?: string;
  deficitChakras?: string[];
  deficitChakrasTr?: string[];
  deficitAdviceTr?: string;
  chakras?: Array<{
    chakra: string;
    nameTr: string;
    sanskritName: string;
    score: number;
    status: 'BALANCED' | 'UNDERACTIVE' | 'OVERACTIVE' | 'BLOCKED';
    statusTr: string;
    colorHex: string;
  }>;
  calculatedAt?: string;
}

export interface ArchetypeCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  primaryArchetype?: string;
  secondaryArchetype?: string;
  archetypeDescriptionTr?: string;
  shadowArchetype?: string;
  transformationalSymbol?: string;
  calculatedAt?: string;
}

export interface EnneagramCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  version?: number;
  primaryType?: string;
  wingType?: string;
  dominantScores?: Record<string, number>;
  interpretations?: string[];
  answers?: TestQuestionAnswer[];
  completedAt?: string;
}

export interface TotemCardData {
  hasRecord: boolean;
  clientId: string;
  sourceNoteTr: string;
  version?: number;
  primaryType?: string;
  secondaryType?: string;
  elementTr?: string;
  spiritualMeaningTr?: string;
  dominantScores?: Record<string, number>;
  interpretations?: string[];
  answers?: TestQuestionAnswer[];
  completedAt?: string;
}

/**
 * 1. Astroloji Sonuç Kartı Verisi Çıkarıcı
 */
export function getAstrologyCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): AstrologyCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
      isBirthTimeKnown: false,
    };
  }

  const clientId = client.id;
  const analysis = archive?.analyses.find((a) => a.clientId === clientId);
  const astro = analysis?.astrology;

  const isRecorded = Boolean(
    astro &&
    astro.sunSign &&
    Array.isArray(astro.planetaryPositions) &&
    astro.planetaryPositions.length > 0
  );

  if (!isRecorded || !astro) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Astroloji analizi henüz kayıtlı değil. Kayıt bulunmuyor.',
      isBirthTimeKnown: !client.isBirthTimeUnknown,
    };
  }

  const isTimeKnown = !client.isBirthTimeUnknown && Boolean(client.birthTime);
  const normSun = normalizeZodiacKey(astro.sunSign);
  const normMoon = normalizeZodiacKey(astro.moonSign);
  const normAsc = normalizeZodiacKey(astro.ascendantSign);

  const sunSignTr = normSun ? (TROPICAL_ZODIAC_SIGNS[normSun]?.nameTr || astro.sunSign) : astro.sunSign;
  const moonSignTr = normMoon ? (TROPICAL_ZODIAC_SIGNS[normMoon]?.nameTr || astro.moonSign) : astro.moonSign;
  const ascTr = (isTimeKnown && normAsc)
    ? (TROPICAL_ZODIAC_SIGNS[normAsc]?.nameTr || astro.ascendantSign)
    : undefined;

  const ascDegree = isTimeKnown ? astro.ascendantDegree : undefined;
  const ascMinute = isTimeKnown ? astro.ascendantMinute : undefined;
  const formattedAscTr = (isTimeKnown && astro.formattedAscendantTr)
    ? astro.formattedAscendantTr
    : (isTimeKnown && ascTr && ascDegree !== undefined && ascMinute !== undefined)
    ? `${ascDegree}° ${ascTr} ${ascMinute}'`
    : ascTr;

  const risingNoteTr = isTimeKnown
    ? (formattedAscTr ? `Yükselen Burç: ${formattedAscTr}` : (ascTr ? `Yükselen Burç: ${ascTr}` : 'Yükselen hesaplanamadı'))
    : 'Doğum saati bilinmediği için Yükselen burç ve kesin ev yerleşimleri hesaplanamaz. Gezegen konumları için 12:00 öğle referansı varsayımı kullanılmıştır.';

  const planets = (astro.planetaryPositions || []).map((p) => {
    const normP = normalizeZodiacKey(p.sign);
    const bodyTr = CELESTIAL_BODIES_TR[p.body]?.nameTr || p.body;
    return {
      body: bodyTr,
      sign: p.sign,
      signTr: normP ? (TROPICAL_ZODIAC_SIGNS[normP]?.nameTr || p.sign) : p.sign,
      degree: Number(p.degree.toFixed(2)),
      houseNumber: p.houseNumber,
    };
  });

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Astroloji Analizi (${analysis?.createdAt ? new Date(analysis.createdAt).toLocaleDateString('tr-TR') : 'Mevcut'})`,
    sunSign: astro.sunSign,
    sunSignTr,
    moonSign: astro.moonSign,
    moonSignTr,
    ascendantSign: isTimeKnown ? astro.ascendantSign : undefined,
    ascendantSignTr: ascTr,
    ascendantDegree: ascDegree,
    ascendantMinute: ascMinute,
    formattedAscendantTr: formattedAscTr,
    isBirthTimeKnown: isTimeKnown,
    risingNoteTr,
    planetaryPositions: planets,
    calculatedAt: analysis?.createdAt,
  };
}

/**
 * 2. Numeroloji Sonuç Kartı Verisi Çıkarıcı
 */
export function getNumerologyCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): NumerologyCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
    };
  }

  const clientId = client.id;
  const analysis = archive?.analyses.find((a) => a.clientId === clientId);
  const num = analysis?.numerology;

  const isRecorded = Boolean(num && typeof num.lifePathNumber === 'number' && num.destinyNumber);

  if (!isRecorded || !num) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Numeroloji sonucu henüz kayıtlı değil. Kayıt bulunmuyor.',
    };
  }

  const lpRes = NUMBER_RESONANCE_TABLE[num.lifePathNumber];
  const destRes = NUMBER_RESONANCE_TABLE[num.destinyNumber];
  const resonanceSummaryTr = lpRes
    ? `Yaşam Yolu (${num.lifePathNumber}): ${lpRes.titleTr} — ${lpRes.keywordTr}${destRes ? ` · Kader (${num.destinyNumber}): ${destRes.titleTr}` : ''}`
    : `Yaşam Yolu: ${num.lifePathNumber}, Kader: ${num.destinyNumber}`;

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Numeroloji Analizi (${analysis?.createdAt ? new Date(analysis.createdAt).toLocaleDateString('tr-TR') : 'Mevcut'})`,
    lifePathNumber: num.lifePathNumber,
    destinyNumber: num.destinyNumber,
    soulUrgeNumber: num.soulUrgeNumber,
    personalityNumber: num.personalityNumber,
    birthdayNumber: num.birthdayNumber,
    worldMissionNumber: num.worldMissionNumber,
    karmicLessons: num.karmicLessons || [],
    masterNumbers: num.masterNumbers || [],
    resonanceSummaryTr,
    calculatedAt: analysis?.createdAt,
  };
}

/**
 * 3. Çakra Sonuç Kartı Verisi Çıkarıcı
 */
export function getChakraCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): ChakraCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
    };
  }

  const clientId = client.id;
  const analysis = archive?.analyses.find((a) => a.clientId === clientId);
  let chakra = analysis?.chakra;

  const isRecorded = Boolean(chakra && Array.isArray(chakra.chakras) && chakra.chakras.length > 0);

  if (!isRecorded || !chakra) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Çakra analizi henüz kayıtlı değil. Kayıt bulunmuyor.',
    };
  }

  // 1. Baskın Çakrayı tespit et (mevcut kayıt varsa onu koru, yoksa en yüksek skoru bul)
  let dominantChakraKey: ChakraName | undefined = chakra.dominantChakra;
  if (!dominantChakraKey) {
    let maxScore = -1;
    for (const c of chakra.chakras) {
      if (c.score > maxScore) {
        maxScore = c.score;
        dominantChakraKey = c.chakra;
      }
    }
  }
  const domDef = dominantChakraKey ? CHAKRA_DEFINITIONS[dominantChakraKey] : undefined;
  
  // 2. Destek Çakraları: score <= 4 olan çakralar arasındaki EN DÜŞÜK puana sahip TÜM çakralar (eşit puanlar dahil)
  let minScore = 11;
  for (const c of chakra.chakras) {
    if (c.score <= 4 && c.score < minScore) {
      minScore = c.score;
    }
  }

  let computedDeficits: ChakraName[] = [];
  if (minScore <= 4) {
    computedDeficits = chakra.chakras
      .filter((c) => c.score === minScore)
      .map((c) => c.chakra);
  }

  // Tüm eşit destek çakralarını kesin olarak topla (eski primaryDeficit tekil kalmışsa bile computedDeficits ile tamamla)
  const rawDeficits: ChakraName[] = (chakra.deficitChakras && chakra.deficitChakras.length >= computedDeficits.length)
    ? chakra.deficitChakras
    : (computedDeficits.length > 0 ? computedDeficits : (chakra.primaryDeficit ? [chakra.primaryDeficit] : []));

  const deficitDefs = rawDeficits.map((c) => CHAKRA_DEFINITIONS[c]).filter(Boolean);
  const defDef = deficitDefs.length > 0
    ? deficitDefs[0]
    : (chakra.primaryDeficit ? CHAKRA_DEFINITIONS[chakra.primaryDeficit] : undefined);

  // Birden fazla destek çakrası varsa döküm: örn. "2. Sakral Çakra + 6. Üçüncü Göz Çakrası"
  const formattedDeficitNamesTr = deficitDefs.length > 0
    ? deficitDefs.map((d) => `${d.order}. ${d.nameTr}`).join(' + ')
    : (defDef ? `${defDef.order}. ${defDef.nameTr}` : (chakra.primaryDeficit ? String(chakra.primaryDeficit) : 'Destek İhtiyacı Yok (Dengeli)'));

  const deficitChakrasTr = deficitDefs.map((d) => `${d.order}. ${d.nameTr}`);

  let deficitAdviceTr = 'Tüm enerji merkezleri dengeli akışta.';
  if (deficitDefs.length > 0) {
    deficitAdviceTr = deficitDefs
      .map((d) => `${d.nameTr}: ${d.imbalanceTraitsTr}`)
      .join(' · ');
  } else if (defDef?.imbalanceTraitsTr) {
    deficitAdviceTr = `Dengeleme odağı: ${defDef.imbalanceTraitsTr}`;
  }

  const mappedChakras = (chakra.chakras || []).map((c) => {
    const def = CHAKRA_DEFINITIONS[c.chakra];
    let statusTr = 'Dengeli';
    if (c.status === 'UNDERACTIVE') statusTr = 'Düşük / Bloke';
    else if (c.status === 'OVERACTIVE') statusTr = 'Aşırı Aktif';
    else if (c.status === 'BLOCKED') statusTr = 'Tıkalı / Bloke';

    return {
      chakra: c.chakra,
      nameTr: def?.nameTr || c.chakra,
      sanskritName: def?.sanskritName || '',
      score: c.score,
      status: c.status,
      statusTr,
      colorHex: def?.colorHex || '#d97706',
    };
  });

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Çakra Analizi (${analysis?.createdAt ? new Date(analysis.createdAt).toLocaleDateString('tr-TR') : 'Mevcut'})`,
    dominantChakra: chakra.dominantChakra,
    dominantChakraTr: domDef ? `${domDef.order}. ${domDef.nameTr}` : chakra.dominantChakra,
    dominantColorHex: domDef?.colorHex,
    dominantElementTr: domDef?.elementTr,
    dominantTraitsTr: domDef?.balancedTraitsTr,
    primaryDeficit: chakra.primaryDeficit,
    primaryDeficitTr: formattedDeficitNamesTr,
    deficitChakras: rawDeficits,
    deficitChakrasTr,
    deficitAdviceTr,
    chakras: mappedChakras,
    calculatedAt: analysis?.createdAt,
  };
}

/**
 * 4. Birleşik Arketip Sonuç Kartı Verisi Çıkarıcı
 */
export function getArchetypeCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): ArchetypeCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
    };
  }

  const clientId = client.id;
  const analysis = archive?.analyses.find((a) => a.clientId === clientId);
  const archetype = analysis?.archetype;

  const isRecorded = Boolean(
    archetype &&
    archetype.unifiedArchetype &&
    archetype.unifiedArchetype.primary &&
    archetype.shadowArchetype
  );

  if (!isRecorded || !archetype) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Arketip analizi henüz kayıtlı değil. Kayıt bulunmuyor.',
    };
  }

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Arketip Analizi (${analysis?.createdAt ? new Date(analysis.createdAt).toLocaleDateString('tr-TR') : 'Mevcut'})`,
    primaryArchetype: archetype.unifiedArchetype.primary,
    secondaryArchetype: archetype.unifiedArchetype.secondary,
    archetypeDescriptionTr: archetype.unifiedArchetype.description,
    shadowArchetype: archetype.shadowArchetype.shadowName,
    transformationalSymbol: archetype.shadowArchetype.transformationalSymbol,
    calculatedAt: analysis?.createdAt,
  };
}

/**
 * 5. Enneagram Sonuç Kartı Verisi Çıkarıcı
 */
export function getEnneagramCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): EnneagramCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
    };
  }

  const clientId = client.id;
  const tests = archive?.testResults.filter((t) => t.clientId === clientId && t.testType === 'ENNEAGRAM') || [];
  const latest = tests.length > 0 ? tests[tests.length - 1] : null;

  const isRecorded = Boolean(latest && latest.primaryType && latest.dominantScores);

  if (!isRecorded || !latest) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Enneagram testi henüz tamamlanmadı. Kayıt bulunmuyor.',
    };
  }

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Enneagram Testi (Sürüm ${latest.version} · ${new Date(latest.completedAt).toLocaleDateString('tr-TR')})`,
    version: latest.version,
    primaryType: latest.primaryType,
    wingType: latest.secondaryType || 'Dengeli / Nötr',
    dominantScores: latest.dominantScores,
    interpretations: latest.interpretations || [],
    answers: latest.answers || [],
    completedAt: latest.completedAt,
  };
}

/**
 * 6. Hayvan Totemi Sonuç Kartı Verisi Çıkarıcı
 */
export function getTotemCardData(
  client: Client | null,
  archive: ClientArchiveRecord | null
): TotemCardData {
  if (!client || !client.id) {
    return {
      hasRecord: false,
      clientId: '',
      sourceNoteTr: 'Kayıt bulunmuyor.',
    };
  }

  const clientId = client.id;
  const tests = archive?.testResults.filter((t) => t.clientId === clientId && t.testType === 'ANIMAL_TOTEM') || [];
  const latest = tests.length > 0 ? tests[tests.length - 1] : null;

  const isRecorded = Boolean(latest && latest.primaryType && latest.dominantScores);

  if (!isRecorded || !latest) {
    return {
      hasRecord: false,
      clientId,
      sourceNoteTr: 'Hayvan Totemi testi henüz tamamlanmadı. Kayıt bulunmuyor.',
    };
  }

  const totemMeta = TOTEM_ANIMALS[latest.primaryType];

  return {
    hasRecord: true,
    clientId,
    sourceNoteTr: `Kayıtlı Hayvan Totemi Testi (Sürüm ${latest.version} · ${new Date(latest.completedAt).toLocaleDateString('tr-TR')})`,
    version: latest.version,
    primaryType: latest.primaryType,
    secondaryType: latest.secondaryType || 'Tekil Ruh Rehberi',
    elementTr: totemMeta?.elementTr || 'Doğa Elementi',
    spiritualMeaningTr: totemMeta?.symbolicMeaningTr || 'Kişisel totem rehberliği',
    dominantScores: latest.dominantScores,
    interpretations: latest.interpretations || [],
    answers: latest.answers || [],
    completedAt: latest.completedAt,
  };
}

// ============================================================================
// "SONUCU KOPYALA" TÜRKÇE METİN ÜRETİCİLERİ
// Başka modüllerden veya başka danışanlardan veri sızması kesinlikle engellenir.
// ============================================================================

export function formatAstrologyCopyText(
  client: Client,
  data: AstrologyCardData
): string {
  if (!data.hasRecord) {
    return `[Astroloji Analiz Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const lines = [
    `=== BATI / TROPICAL ASTROLOJİ ANALİZİ ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Kayıt Tarihi: ${data.calculatedAt ? new Date(data.calculatedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    `Sistem: Tropical Zodyak / Placidus Ev Sistemi`,
    ``,
    `Güneş Burcu: ${data.sunSignTr || '-'}`,
    `Ay Burcu: ${data.moonSignTr || '-'}`,
    data.isBirthTimeKnown && data.ascendantSignTr
      ? `Yükselen Burç: ${data.formattedAscendantTr || data.ascendantSignTr}`
      : `Yükselen Burç: Doğum saati bilinmediği için hesaplanamaz`,
    ``,
    `Gezegen Konumları (Boylam & Ev):`,
  ];

  if (data.planetaryPositions && data.planetaryPositions.length > 0) {
    data.planetaryPositions.forEach((p) => {
      lines.push(`- ${p.body}: ${p.signTr} (${p.degree}°) [Ev: ${p.houseNumber || '-'}]`);
    });
  } else {
    lines.push(`- Gezegen dökümü bulunmuyor.`);
  }

  return lines.join('\n');
}

export function formatNumerologyCopyText(
  client: Client,
  data: NumerologyCardData
): string {
  if (!data.hasRecord) {
    return `[Numeroloji Analiz Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const lines = [
    `=== NUMEROLOJİ ANALİZ SONUCU ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Kayıt Tarihi: ${data.calculatedAt ? new Date(data.calculatedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    ``,
    `Yaşam Yolu Sayısı : ${data.lifePathNumber}`,
    `Kader / İsim Sayısı: ${data.destinyNumber}`,
    `Ruh Güdüsü Sayısı : ${data.soulUrgeNumber}`,
    `Kişilik Sayısı    : ${data.personalityNumber}`,
    `Doğum Günü Sayısı : ${data.birthdayNumber}`,
    `Dünya Görevi Sayısı: ${data.worldMissionNumber}`,
    `Karmik Dersler    : ${data.karmicLessons && data.karmicLessons.length > 0 ? data.karmicLessons.join(', ') : 'Karmik ders bulunmuyor'}`,
    `Ana Sayılar (Master): ${data.masterNumbers && data.masterNumbers.length > 0 ? data.masterNumbers.join(', ') : 'Yok'}`,
    ``,
    `Açıklama: ${data.resonanceSummaryTr || 'Temel Pisagor hesaplama sonucu.'}`,
  ];

  return lines.join('\n');
}

export function formatChakraCopyText(
  client: Client,
  data: ChakraCardData
): string {
  if (!data.hasRecord) {
    return `[Çakra Analiz Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const deficitLabel = (data.deficitChakras && data.deficitChakras.length > 1)
    ? 'Öncelikli Destek / Blokajlar'
    : 'Öncelikli Destek / Blokaj';

  const lines = [
    `=== ÇAKRA ENERJİ VE DENGE ANALİZİ ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Kayıt Tarihi: ${data.calculatedAt ? new Date(data.calculatedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    ``,
    `Baskın Çakra (Dominant): ${data.dominantChakraTr || 'Dengeli'}`,
    `${deficitLabel}: ${data.primaryDeficitTr || 'Belirtilmedi'}`,
    `Tavsiye: ${data.deficitAdviceTr || 'Dengeli akış'}`,
    ``,
    `7 Çakranın Puan ve Durum Dağılımı:`,
  ];

  if (data.chakras && data.chakras.length > 0) {
    data.chakras.forEach((c) => {
      lines.push(`- ${c.nameTr} (${c.sanskritName}): ${c.score}/10 (${c.statusTr})`);
    });
  } else {
    lines.push(`- Çakra dökümü bulunmuyor.`);
  }

  return lines.join('\n');
}

export function formatArchetypeCopyText(
  client: Client,
  data: ArchetypeCardData
): string {
  if (!data.hasRecord) {
    return `[Arketip Analiz Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const lines = [
    `=== BİRLEŞİK & GÖLGE ARKETİP ÇÖZÜMLEMESİ ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Kayıt Tarihi: ${data.calculatedAt ? new Date(data.calculatedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    ``,
    `Ana Arketip       : ${data.primaryArchetype}`,
    `İkincil Arketip   : ${data.secondaryArchetype}`,
    `Arketip Açıklaması: ${data.archetypeDescriptionTr}`,
    `Gölge Arketip     : ${data.shadowArchetype}`,
    `Dönüştürücü Sembol: ${data.transformationalSymbol}`,
  ];

  return lines.join('\n');
}

export function formatEnneagramCopyText(
  client: Client,
  data: EnneagramCardData
): string {
  if (!data.hasRecord) {
    return `[Enneagram Test Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const lines: string[] = [
    `=== ENNEAGRAM ANALİZİ (ENNEAGRAM MİZAÇ TESTİ SONUCU) ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Test Sürümü: V${data.version || 1}`,
    `Tamamlanma Tarihi: ${data.completedAt ? new Date(data.completedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    ``,
  ];

  // Danışanın cevapladığı TÜM sorular ve verdiği cevaplar
  const answersMap = new Map<string, string>();
  if (Array.isArray(data.answers)) {
    for (const a of data.answers) {
      answersMap.set(a.questionId, a.selectedOptionId);
    }
  }

  ENNEAGRAM_QUESTIONS.forEach((q) => {
    const selectedOptionId = answersMap.get(q.id);
    const selectedOpt = q.options.find((o) => o.id === selectedOptionId);

    lines.push(`SORU ${q.order}:`);
    lines.push(q.questionTr);
    lines.push(``);
    lines.push(`DANIŞANIN CEVABI:`);
    lines.push(selectedOpt ? selectedOpt.textTr : (selectedOptionId ? selectedOptionId : '(Cevaplanmadı)'));
    lines.push(``);
  });

  lines.push(`ENNEAGRAM SONUCU:`);
  lines.push(`Tip: ${data.primaryType || 'Belirtilmedi'}`);
  lines.push(`Kanat: ${data.wingType || 'Dengeli / Nötr'}`);
  lines.push(``);
  lines.push(`Puan Dağılımı:`);

  if (data.dominantScores) {
    Object.entries(data.dominantScores).forEach(([tip, score]) => {
      lines.push(`- ${tip}: ${score} puan`);
    });
  }

  if (data.interpretations && data.interpretations.length > 0) {
    lines.push(``, `Sonuç Açıklaması / Yorumlar:`);
    data.interpretations.forEach((i) => {
      lines.push(`* ${i}`);
    });
  }

  return lines.join('\n');
}

export function formatTotemCopyText(
  client: Client,
  data: TotemCardData
): string {
  if (!data.hasRecord) {
    return `[Hayvan Totemi Test Sonucu]\nDanışan: ${client.firstName} ${client.lastName} (${client.id})\nKayıt bulunmuyor.`;
  }

  const lines: string[] = [
    `=== TOTEM ANALİZİ (HAYVAN TOTEMİ TESTİ SONUCU) ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Test Sürümü: V${data.version || 1}`,
    `Tamamlanma Tarihi: ${data.completedAt ? new Date(data.completedAt).toLocaleString('tr-TR') : 'Kayıtlı'}`,
    ``,
  ];

  // Danışanın cevapladığı TÜM Totem soruları ve verdiği cevaplar
  const answersMap = new Map<string, string>();
  if (Array.isArray(data.answers)) {
    for (const a of data.answers) {
      answersMap.set(a.questionId, a.selectedOptionId);
    }
  }

  TOTEM_QUESTIONS.forEach((q) => {
    const selectedOptionId = answersMap.get(q.id);
    const selectedOpt = q.options.find((o) => o.id === selectedOptionId);

    lines.push(`SORU ${q.order}:`);
    lines.push(q.questionTr);
    lines.push(``);
    lines.push(`DANIŞANIN CEVABI:`);
    lines.push(selectedOpt ? selectedOpt.textTr : (selectedOptionId ? selectedOptionId : '(Cevaplanmadı)'));
    lines.push(``);
  });

  const primaryScore = (data.dominantScores && data.primaryType) ? data.dominantScores[data.primaryType] : undefined;

  lines.push(`TOTEM SONUCU:`);
  lines.push(`Birincil Totem: ${data.primaryType || 'Belirtilmedi'}`);
  lines.push(`Skor: ${primaryScore !== undefined ? `${primaryScore} puan` : '-'}`);
  lines.push(`İkincil Totem: ${data.secondaryType || 'Tekil Ruh Rehberi'}`);
  lines.push(`Element: ${data.elementTr || 'Doğa'}`);
  lines.push(`Ruhani Anlam: ${data.spiritualMeaningTr || 'Kişisel koruyucu rehberlik'}`);
  lines.push(``);
  lines.push(`Totem Puan Dağılımı:`);

  if (data.dominantScores) {
    Object.entries(data.dominantScores).forEach(([totem, score]) => {
      lines.push(`- ${totem}: ${score} puan`);
    });
  }

  if (data.interpretations && data.interpretations.length > 0) {
    lines.push(``, `Analiz Açıklaması / Yorumlar:`);
    data.interpretations.forEach((i) => {
      lines.push(`* ${i}`);
    });
  }

  return lines.join('\n');
}
