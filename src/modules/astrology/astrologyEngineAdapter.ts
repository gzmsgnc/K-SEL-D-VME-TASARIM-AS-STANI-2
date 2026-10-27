/**
 * Batı / Tropical Astroloji Motor Bağdaştırıcısı (Astrology Engine Adapter)
 * 
 * Kurallar:
 * 1. Zodyak: Batı / Tropical, Ev Sistemi: Placidus.
 * 2. Koordinat Güvenliği: Geçerli koordinat yoksa ASLA hesaplama yapmaz; 0,0 koordinatını uydurmaz.
 * 3. Doğum Saati Ayrımı: Saat bilinmiyorsa 12:00 yalnızca açıkça işaretlenmiş hesaplama referansıdır.
 *    Yükselen burç (Ascendant), Tepe Noktası (MC) ve Placidus evleri ASLA üretilemez.
 * 4. Sahte Sonuç Yasağı: Gerçek hesaplama motoru verisi yoksa sonuç uydurmaz; modülü beklemede belirtir.
 */

import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { TropicalNatalChart, CelestialBodyPosition } from '../../types/astrology';
import { resolveEffectiveBirthTime, resolveAstrologicalCoordinates } from '../../core/birthTimeHelper';
import { hasActualModuleResults, getSafeModuleResult } from '../../core/clientDataAdapter';
import { AstrologyModulePreparation, AstrologyStatus } from './types';
import {
  resolveHistoricalUtcDateTime,
  verifyAstrologyEngineIntegrity,
  calculateRawBodyEcliptic,
  eclipticLongitudeToZodiac,
  calculateAscendant,
  AstrologicalBodyId,
} from './astrologyCalculationEngine';

/**
 * Seçili danışanın Batı Astroloji modülüne yönelik hesaplama hazırlığını ve doğrulamasını üretir.
 */
export function prepareAstrologyModule(
  client: Client,
  archive: ClientArchiveRecord | null
): AstrologyModulePreparation {
  const loc = client.birthLocation;
  const coords = resolveAstrologicalCoordinates(loc);
  const timeCtx = resolveEffectiveBirthTime(
    client.birthTime,
    client.isBirthTimeUnknown,
    loc?.utcOffsetMinutes || 0
  );

  const warnings: string[] = [];

  // 1. Koordinat Kontrolü
  if (!coords.isValid || coords.latitude === null || coords.longitude === null) {
    warnings.push(
      'Doğum yeri koordinatları eksik veya geçersiz olduğu için Batı / Tropical astroloji haritası ve Placidus evleri hesaplanamaz. Lütfen geçerli bir konum seçiniz.'
    );

    if (!client.birthDate) {
      warnings.push('Doğum tarihi bilgisi eksiktir.');
    }

    return {
      clientId: client.id,
      status: 'MISSING_COORDINATES',
      zodiacSystem: 'TROPICAL',
      houseSystem: 'PLACIDUS',
      birthDate: client.birthDate || '',
      isBirthTimeKnown: timeCtx.isTimeKnown,
      rawBirthTime: timeCtx.rawBirthTime,
      calculationTimeString: timeCtx.calculationTimeString,
      isNoonReference: timeCtx.isNoonReference,
      hasValidCoordinates: false,
      latitude: null,
      longitude: null,
      timezone: coords.timezone,
      utcOffsetMinutes: coords.utcOffsetMinutes,
      utcOffsetHours: coords.utcOffsetHours,
      canCalculateHousesAndAscendant: false,
      statusMessageTr: 'Doğum yeri koordinatları eksik veya geçersiz. Harita hesaplanamaz.',
      warningNotices: warnings,
    };
  }

  // 2. Doğum Tarihi Kontrolü
  if (!client.birthDate) {
    warnings.push('Doğum tarihi bilgisi eksiktir.');
    return {
      clientId: client.id,
      status: 'MISSING_BIRTH_DATE',
      zodiacSystem: 'TROPICAL',
      houseSystem: 'PLACIDUS',
      birthDate: '',
      isBirthTimeKnown: timeCtx.isTimeKnown,
      rawBirthTime: timeCtx.rawBirthTime,
      calculationTimeString: timeCtx.calculationTimeString,
      isNoonReference: timeCtx.isNoonReference,
      hasValidCoordinates: true,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: coords.timezone,
      utcOffsetMinutes: coords.utcOffsetMinutes,
      utcOffsetHours: coords.utcOffsetHours,
      canCalculateHousesAndAscendant: false,
      statusMessageTr: 'Doğum tarihi eksik. Harita hesaplanamaz.',
      warningNotices: warnings,
    };
  }

  // 3. Mevcut Sürüm Kapsam Sınırı (Placidus evleri ve MC kapsam dışıdır; ASC saat biliniyorsa hesaplanabilir)
  const canCalculateHouses = false;
  const canCalculateAscendant = timeCtx.isTimeKnown && Boolean(client.birthDate);
  if (!timeCtx.isTimeKnown) {
    warnings.push(
      'Doğum saati bilinmediği için Yükselen burç (ASC) hesaplanamaz; gezegen konumları öğle 12:00 referansıyla değerlendirilir.'
    );
  }

  // 4. A7: Gerçek Astronomik Hesaplama Motoru ve Tarihsel UTC Çözümlemesi
  let historicalUtc: ReturnType<typeof resolveHistoricalUtcDateTime> | null = null;
  let engineCheck = verifyAstrologyEngineIntegrity();

  let finalUtcOffsetMinutes = coords.utcOffsetMinutes;
  let finalUtcOffsetHours = coords.utcOffsetHours;

  try {
    historicalUtc = resolveHistoricalUtcDateTime(
      client.birthDate,
      timeCtx.calculationTimeString,
      coords.timezone,
      coords.longitude
    );
    finalUtcOffsetMinutes = historicalUtc.exactUtcOffsetMinutes;
    finalUtcOffsetHours = historicalUtc.exactUtcOffsetHours;

    if (historicalUtc.transitionNoticeTr) {
      warnings.push(historicalUtc.transitionNoticeTr);
    } else if (historicalUtc.isDaylightSavingTime) {
      warnings.push(
        `Doğum tarihinde ilgili bölgede Yaz Saati Uygulaması (DST) aktif tespit edilmiştir (Tarihsel kesin sapma: UTC${finalUtcOffsetHours >= 0 ? '+' : ''}${finalUtcOffsetHours} saat).`
      );
    }
  } catch (err) {
    warnings.push(`Tarihsel yerel saat dönüşümünde uyarı: ${(err as Error).message}`);
  }

  if (!engineCheck.isReady) {
    warnings.push(engineCheck.statusMessageTr);
  }

  // 5. Gerçek Sonuç Kontrolü (Sahte sonuç uydurma engeli ve Danışan Kimliği İzolasyonu)
  const isMatchingClient = Boolean(archive && archive.client && archive.client.id === client.id);
  const isCalculated = isMatchingClient ? hasActualModuleResults(archive, 'ASTROLOGY') : false;
  const status: AstrologyStatus = isCalculated ? 'CALCULATED' : 'READY_FOR_CALCULATION';

  const statusMessageTr = isCalculated
    ? 'Batı / Tropical doğum haritası hesaplanmış ve danışan arşivine kaydedilmiştir.'
    : engineCheck.isReady
    ? `Doğum koordinatları ve tarihsel UTC zamanı (${historicalUtc?.utcIsoString || 'Hazır'}) doğrulandı. astronomy-engine (v2.1.19 / MIT) hesaplamaya hazırdır.`
    : 'Astronomik hesaplama motoru başlatılamadı.';

  return {
    clientId: client.id,
    status,
    zodiacSystem: 'TROPICAL',
    houseSystem: 'PLACIDUS',
    birthDate: client.birthDate,
    isBirthTimeKnown: timeCtx.isTimeKnown,
    rawBirthTime: timeCtx.rawBirthTime,
    calculationTimeString: timeCtx.calculationTimeString,
    isNoonReference: timeCtx.isNoonReference,
    hasValidCoordinates: true,
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone: coords.timezone,
    utcOffsetMinutes: finalUtcOffsetMinutes,
    utcOffsetHours: finalUtcOffsetHours,
    canCalculateHousesAndAscendant: canCalculateAscendant,
    statusMessageTr,
    warningNotices: warnings,

    // A7 Teknik Temel Alanları
    astronomyEngineReady: engineCheck.isReady,
    astronomyEngineLicense: engineCheck.metadata.license,
    astronomyEngineTheory: engineCheck.metadata.planetaryTheory,
    historicalUtcIso: historicalUtc?.utcIsoString,
    isDaylightSavingTime: historicalUtc?.isDaylightSavingTime,
    julianDate: historicalUtc?.julianDate,
    gastHours: historicalUtc?.gastHours,
    lastDegrees: historicalUtc?.lastDegrees,
  };
}

/**
 * Bu danışana ait kayıtlı gerçek TropicalNatalChart sonucunu çeker (varsa).
 * Danışan kimliği uyuşmuyorsa veya sonuç yoksa kesinlikle null döner.
 */
export function getStoredTropicalChart(
  archive: ClientArchiveRecord | null,
  expectedClientId?: string
): TropicalNatalChart | null {
  if (!archive || (expectedClientId && archive.client?.id !== expectedClientId)) {
    return null;
  }
  return getSafeModuleResult<TropicalNatalChart>(archive, 'ASTROLOGY');
}

/**
 * A8: 10 Gök Cisminin Gerçek Astronomik Hesaplama Çıktı Arayüzü
 */
export interface CalculateTropicalChartResult {
  success: boolean;
  chart?: TropicalNatalChart;
  errorMessageTr?: string;
  isNoonReference: boolean;
  warningNotices: string[];
}

/**
 * A8: Seçili danışan için 10 gök cisminin (Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton)
 * gerçek ekliptik boylamlarını, Tropical burçlarını, derece ve dakikalarını hesaplar.
 * 
 * Güvenlik Kuralları:
 * 1. Geçerli koordinat veya doğum tarihi yoksa hesaplama yapılmaz; açık hata döndürülür.
 * 2. Doğum saati bilinmiyorsa 12:00 öğle referansı kullanılır ve saat varsayımı açıkça işaretlenir.
 * 3. Kuzey/Güney Ay Düğümleri, ASC, MC ve evler hesaplanmaz (kapsam dışı).
 * 4. Başarısızlık durumunda asla sahte sonuç uydurulmaz.
 */
export function calculateClientTropicalChart(
  client: Client
): CalculateTropicalChartResult {
  // 1. Doğum Tarihi Kontrolü
  if (!client.birthDate) {
    return {
      success: false,
      errorMessageTr: 'Doğum tarihi eksik olduğundan Batı / Tropical doğum haritası hesaplanamaz.',
      isNoonReference: false,
      warningNotices: ['Doğum tarihi eksiktir.'],
    };
  }

  // 2. Doğum Saati ve Referans Kontrolü
  const loc = client.birthLocation;
  const timeCtx = resolveEffectiveBirthTime(
    client.birthTime,
    client.isBirthTimeUnknown,
    loc?.utcOffsetMinutes || 0
  );

  // 3. Doğrulanmış Koordinat Kontrolü
  const coords = resolveAstrologicalCoordinates(loc);
  if (!coords.isValid || coords.latitude === null || coords.longitude === null) {
    return {
      success: false,
      errorMessageTr:
        'Doğum yeri koordinatları eksik veya geçersiz olduğundan astronomik hesaplama yapılamaz. Lütfen harita üzerinden geçerli bir konum belirleyiniz.',
      isNoonReference: timeCtx.isNoonReference,
      warningNotices: ['Doğrulanmış koordinat bulunamadı.'],
    };
  }

  // 4. Tarihsel IANA Yerel Saat -> UTC Dönüşümü
  let historicalUtc: ReturnType<typeof resolveHistoricalUtcDateTime>;
  try {
    historicalUtc = resolveHistoricalUtcDateTime(
      client.birthDate,
      timeCtx.calculationTimeString,
      coords.timezone,
      coords.longitude
    );
  } catch (err) {
    return {
      success: false,
      errorMessageTr: `Tarihsel UTC dönüşüm hatası: ${(err as Error).message}`,
      isNoonReference: timeCtx.isNoonReference,
      warningNotices: [(err as Error).message],
    };
  }

  const warnings: string[] = [];

  // Doğum saati bilinmiyorsa uyarıyı ekle
  if (timeCtx.isNoonReference) {
    warnings.push(
      'Doğum saati kesin bilinmediği için gezegen konumları öğle 12:00 referansıyla hesaplanmıştır. Gerçek doğum anına göre özellikle Ay konumu birkaç derece farklılık gösterebilir.'
    );
  }

  if (historicalUtc.transitionNoticeTr) {
    warnings.push(historicalUtc.transitionNoticeTr);
  } else if (historicalUtc.isDaylightSavingTime) {
    warnings.push(
      `Doğum tarihinde ilgili bölgede Yaz Saati Uygulaması (DST) aktif tespit edilmiştir (Tarihsel kesin sapma: UTC${historicalUtc.exactUtcOffsetHours >= 0 ? '+' : ''}${historicalUtc.exactUtcOffsetHours} saat).`
    );
  }

  // 5. A8 Kapsamındaki 10 Gök Cisminin Gerçek Hesaplanması
  const BODIES: AstrologicalBodyId[] = [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
  ];

  const positions: CelestialBodyPosition[] = [];

  try {
    for (const bodyId of BODIES) {
      const raw = calculateRawBodyEcliptic(bodyId, historicalUtc.utcDate);
      const zodiac = eclipticLongitudeToZodiac(raw.eclipticLongitude);

      // Retrograd (Geri Hareket) Hesabı (Güneş ve Ay hariç gezegenler için)
      let isRetrograde = false;
      if (bodyId !== 'Sun' && bodyId !== 'Moon') {
        const probeBefore = new Date(historicalUtc.utcDate.getTime() - 3600 * 1000);
        const probeAfter = new Date(historicalUtc.utcDate.getTime() + 3600 * 1000);
        const lonBefore = calculateRawBodyEcliptic(bodyId, probeBefore).eclipticLongitude;
        const lonAfter = calculateRawBodyEcliptic(bodyId, probeAfter).eclipticLongitude;
        let diff = lonAfter - lonBefore;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        isRetrograde = diff < 0;
      }

      positions.push({
        body: bodyId,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
        second: Math.floor(((raw.eclipticLongitude * 3600) % 60)),
        isRetrograde,
        eclipticLongitude: Number(raw.eclipticLongitude.toFixed(4)),
        formattedTextTr: zodiac.formattedText,
        isNoonReference: timeCtx.isNoonReference,
      });
    }
  } catch (calcErr) {
    return {
      success: false,
      errorMessageTr: `Gezegen konumları hesaplanırken astronomik motor hatası oluştu: ${(calcErr as Error).message}`,
      isNoonReference: timeCtx.isNoonReference,
      warningNotices: [(calcErr as Error).message],
    };
  }

  const sunSign = positions.find((p) => p.body === 'Sun')?.sign;
  const moonSign = positions.find((p) => p.body === 'Moon')?.sign;

  // A39: Yükselen Burç (ASC) YALNIZCA doğum saati kesin biliniyorsa hesaplanır
  let ascendantSign: typeof sunSign = undefined;
  let ascendantDegree: number | undefined = undefined;
  let ascendantMinute: number | undefined = undefined;
  let formattedAscendantTr: string | undefined = undefined;

  if (timeCtx.isTimeKnown && !client.isBirthTimeUnknown) {
    try {
      const ascRes = calculateAscendant(
        historicalUtc.utcDate,
        coords.latitude,
        coords.longitude
      );
      ascendantSign = ascRes.sign;
      ascendantDegree = ascRes.degree;
      ascendantMinute = ascRes.minute;
      formattedAscendantTr = ascRes.formattedText;
    } catch (ascErr) {
      warnings.push(`Yükselen burç hesaplanamadı: ${(ascErr as Error).message}`);
    }
  }

  const chart: TropicalNatalChart = {
    zodiacSystem: 'TROPICAL',
    houseSystem: 'PLACIDUS',
    isBirthTimeUnknown: client.isBirthTimeUnknown,
    birthDate: client.birthDate,
    birthTime: client.isBirthTimeUnknown ? undefined : client.birthTime,
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone: coords.timezone,
    utcOffsetMinutes: historicalUtc.exactUtcOffsetMinutes,
    ascendantSign,
    ascendantDegree,
    ascendantMinute,
    formattedAscendantTr,
    sunSign,
    moonSign,
    planetaryPositions: positions,
  };

  return {
    success: true,
    chart,
    isNoonReference: timeCtx.isNoonReference,
    warningNotices: warnings,
  };
}

