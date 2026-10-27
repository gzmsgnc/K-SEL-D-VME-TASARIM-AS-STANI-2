/**
 * Batı / Tropical Astroloji Gerçek Astronomik Hesaplama Motoru (Teknik Temel)
 * 
 * Astronomik Altyapı ve Lisans:
 * - Kütüphane: astronomy-engine (v2.1.19)
 * - Lisans: MIT License (Açık kaynak, telif ve ticari kullanım kısıtlaması yok)
 * - Çevrimdışı Çalışma: %100 yerel tarayıcı ve Node.js ortamında çalışır; harici dosya veya API gerektirmez.
 * - Astronomik Modeller:
 *   * Gezegenler (Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton):
 *     VSOP87 analitik gezegen teorisi (IAU 2000B nutasyon, IAU 2006 presesyon)
 *   * Ay: Improved Lunar Ephemeris / Brown ay teorisi
 *   * Zodyak: Batı / Tropical (True Ecliptic of Date - ECT)
 *   * Yıldız Zamanı: Greenwich ve Yerel Görünür Yıldız Zamanı (GAST & LAST)
 * 
 * Kapsam Dışı Özellikler (Mevcut Sürüm):
 * - Kuzey ve Güney Ay Düğümleri
 * - Astrolojik evler ve Placidus ev hesaplamaları
 * - Yükselen burç (ASC) ve Tepe Noktası (MC)
 * Bu özellikler mevcut sürümde hesaplanmaz ve sahte sonuç üretilmez.
 */

import {
  Body,
  GeoVector,
  Ecliptic,
  SunPosition,
  EclipticGeoMoon,
  SiderealTime,
  AstroTime,
  e_tilt,
} from 'astronomy-engine';
import { ZodiacSign } from '../../types/astrology';

export interface AstronomyEngineMetadata {
  libraryName: string;
  version: string;
  license: string;
  isOfflineCapable: boolean;
  planetaryTheory: string;
  lunarTheory: string;
  coordinateFrame: string;
  houseSystem: string;
}

export const ASTRONOMY_ENGINE_METADATA: AstronomyEngineMetadata = {
  libraryName: 'astronomy-engine',
  version: '2.1.19',
  license: 'MIT',
  isOfflineCapable: true,
  planetaryTheory: 'VSOP87 (IAU 2000B nutasyon ve IAU 2006 presesyon)',
  lunarTheory: "Brown's Lunar Theory (Improved Lunar Ephemeris)",
  coordinateFrame: 'True Ecliptic of Date (Tropical / Batı Zodyak)',
  houseSystem: 'Placidus ev sistemi ve MC kapsam dışıdır; Yükselen (ASC) True Ecliptic of Date & LAST ile hesaplanır',
};

/**
 * Tarihsel Zaman ve UTC Çözümleme Çıktısı
 */
export interface HistoricalUtcResult {
  utcDate: Date;
  utcIsoString: string;
  exactUtcOffsetMinutes: number;
  exactUtcOffsetHours: number;
  timeZoneUsed: string;
  julianDate: number;
  gastHours: number;          // Greenwich Apparent Sidereal Time (0 - 24 saat)
  lastDegrees: number;        // Local Apparent Sidereal Time (0 - 360 derece / RAMC)
  isDaylightSavingTime?: boolean;
  isAmbiguousTransition?: boolean;
  transitionNoticeTr?: string;
}

/**
 * Yerel doğum tarihini, saatini ve konumunu tarihsel IANA zaman dilimi kurallarını
 * dikkate alarak kesin UTC ve yıldız zamanına dönüştürür.
 * 
 * Güvenlik ve Doğruluk Kuralları:
 * 1. Saat dilimi ileri alınırken hiç yaşanmayan (gap) saatlerde sessiz dönüşüm yapılmaz; açık hata fırlatılır.
 * 2. Saat dilimi geri alınırken iki farklı UTC karşılığı olan (overlap) saatlerde belirsizlik açıkça işaretlenir.
 * 3. Yılın minimum UTC farkı her koşulda standart saat kabul edilmez; ofset değişimleri tarafsız olarak çözümlenir.
 */
export function resolveHistoricalUtcDateTime(
  birthDate: string,
  birthTime: string,
  timezone: string,
  longitude: number
): HistoricalUtcResult {
  if (!birthDate || !birthTime) {
    throw new Error('Geçerli bir doğum tarihi (YYYY-MM-DD) ve doğum saati (HH:mm) gereklidir.');
  }

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    throw new Error('Doğum tarihi veya saati sayısal olarak geçerli bir biçimde değildir.');
  }

  // 1. IANA Zaman Dilimi Doğrulaması
  let validTz = timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: validTz });
  } catch {
    throw new Error(`Geçersiz veya tanınmayan IANA zaman dilimi: ${timezone}`);
  }

  // 2. Hedef zaman diliminde yerel bileşenleri çözümleyici (hourCycle h23 ile 0-23 garantisi)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  const getLocalParts = (d: Date) => {
    const parts = dtf.formatToParts(d);
    const findVal = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    return {
      year: findVal('year'),
      month: findVal('month'),
      day: findVal('day'),
      hour: findVal('hour'),
      minute: findVal('minute'),
    };
  };

  // 3. Hedef yerel zamanı yaklaşık UTC olarak başlat ve kesin UTC'yi çöz
  const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const approxUtc = new Date(targetLocalMs);

  const p1 = getLocalParts(approxUtc);
  const localObservedMs = Date.UTC(p1.year, p1.month - 1, p1.day, p1.hour, p1.minute, 0);
  const initialOffsetMs = localObservedMs - approxUtc.getTime();

  const exactUtcDate = new Date(targetLocalMs - initialOffsetMs);

  // Kalıntı fark kontrolü ve hassas yakınsama
  const pFinal = getLocalParts(exactUtcDate);
  const localFinalMs = Date.UTC(pFinal.year, pFinal.month - 1, pFinal.day, pFinal.hour, pFinal.minute, 0);
  const residualDiffMs = targetLocalMs - localFinalMs;
  const finalizedUtcDate = new Date(exactUtcDate.getTime() + residualDiffMs);

  // 4. Doğrulama 1: Atlanan / Yaşanmayan Saat Kontrolü (Spring-Forward Gap)
  // Yaz saati geçişinde saat 02:00'den 03:00'e atladığında 02:30 hiç yaşanmaz.
  const checkParts = getLocalParts(finalizedUtcDate);
  const isExactLocalMatch =
    checkParts.year === year &&
    checkParts.month === month &&
    checkParts.day === day &&
    checkParts.hour === hour &&
    checkParts.minute === minute;

  if (!isExactLocalMatch) {
    throw new Error(
      `Girilen yerel saat (${birthDate} ${birthTime}), '${validTz}' zaman diliminde saat dilimi veya yaz saati geçişi (ileri alma) nedeniyle yaşanmamış (atlanan) bir saat aralığına denk gelmektedir. Doğru bir hesaplama için bu saat güvenilir biçimde UTC'ye dönüştürülemez.`
    );
  }

  const exactUtcOffsetMinutes = Math.round((targetLocalMs - finalizedUtcDate.getTime()) / (60 * 1000));
  const exactUtcOffsetHours = Number((exactUtcOffsetMinutes / 60).toFixed(2));

  // 5. Doğrulama 2: İki Farklı UTC Karşılığı Olan Saat Kontrolü (Fall-Back Overlap / Ambiguity)
  // Saatler geri alındığında (ör. 03:00 -> 02:00), 02:30 iki kez yaşanır.
  const testDeltas = [-120, -90, -60, -30, 30, 60, 90, 120];
  let isAmbiguousTransition = false;
  let alternateOffsetMinutes: number | null = null;

  for (const delta of testDeltas) {
    const probeUtc = new Date(finalizedUtcDate.getTime() + delta * 60 * 1000);
    const probeParts = getLocalParts(probeUtc);
    if (
      probeParts.year === year &&
      probeParts.month === month &&
      probeParts.day === day &&
      probeParts.hour === hour &&
      probeParts.minute === minute
    ) {
      isAmbiguousTransition = true;
      alternateOffsetMinutes = Math.round((targetLocalMs - probeUtc.getTime()) / (60 * 1000));
      break;
    }
  }

  let transitionNoticeTr: string | undefined;
  if (isAmbiguousTransition && alternateOffsetMinutes !== null) {
    const altHours = Number((alternateOffsetMinutes / 60).toFixed(2));
    transitionNoticeTr = `Girilen yerel saat (${birthTime}), '${validTz}' zaman diliminde saatlerin geri alınması aralığında yer almakta olup iki farklı geçerli UTC karşılığına sahiptir (Ofsetler: UTC${exactUtcOffsetHours >= 0 ? '+' : ''}${exactUtcOffsetHours} ve UTC${altHours >= 0 ? '+' : ''}${altHours}). Standart akış sürdürülmüş ve durum işaretlenmiştir.`;
  }

  // 6. Yaz Saati (DST) ve Sezon Analizi
  // Kural: Yılın minimum ofseti körü körüne standart saat kabul edilmez; ofset çeşitliliği doğrulanır.
  const sampleMonths = [0, 2, 4, 6, 8, 10];
  const sampleOffsets = sampleMonths.map((m) => {
    const probe = new Date(Date.UTC(year, m, 15, 12, 0, 0));
    const parts = getLocalParts(probe);
    return Math.round((Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - probe.getTime()) / (60 * 1000));
  });
  const hasSeasonalVariation = sampleOffsets.some((o) => o !== sampleOffsets[0]);
  let isDaylightSavingTime: boolean | undefined = undefined;

  if (!hasSeasonalVariation) {
    // Yıl boyunca hiçbir mevzuat/yaz saati farkı yok (ör. kalıcı saat uygulayan bölgeler)
    isDaylightSavingTime = false;
  } else {
    // Sezonsal varyasyon var; doğum anının ofseti yılın en küçük ofsetinden büyükse olası yaz saati
    const minOffset = Math.min(...sampleOffsets);
    if (exactUtcOffsetMinutes > minOffset) {
      isDaylightSavingTime = true;
    } else if (exactUtcOffsetMinutes === minOffset) {
      isDaylightSavingTime = false;
    }
  }

  // 7. Astronomik Zaman ve Yıldız Zamanı (Sidereal Time)
  const astroTime = new AstroTime(finalizedUtcDate);

  // Julian Date: J2000 epoch'tan itibaren geçen gün + 2451545.0
  const julianDate = Number((astroTime.ut + 2451545.0).toFixed(6));

  // Greenwich Apparent Sidereal Time (GAST) saat cinsinden [0, 24)
  const gastHours = SiderealTime(astroTime);

  // Local Apparent Sidereal Time (LAST) derece cinsinden [0, 360) - RAMC
  const gastDegrees = gastHours * 15;
  const lastDegrees = ((gastDegrees + longitude) % 360 + 360) % 360;

  return {
    utcDate: finalizedUtcDate,
    utcIsoString: finalizedUtcDate.toISOString(),
    exactUtcOffsetMinutes,
    exactUtcOffsetHours,
    isDaylightSavingTime,
    isAmbiguousTransition,
    transitionNoticeTr,
    timeZoneUsed: validTz,
    julianDate,
    gastHours: Number(gastHours.toFixed(4)),
    lastDegrees: Number(lastDegrees.toFixed(4)),
  };
}

/**
 * Mevcut sürümde gerçekten kullanılacak göksel cisimler:
 * Güneş, Ay ve 8 gezegen.
 * 
 * Kapsam Dışı: Ay Düğümleri (Kuzey/Güney), ASC, MC ve Evler bu sürümde hesaplanmaz.
 */
export type AstrologicalBodyId =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

/**
 * Ekliptik Boylam Koordinat Çıktısı (0 - 360 derece)
 */
export interface RawEclipticCoordinate {
  bodyId: AstrologicalBodyId;
  eclipticLongitude: number;  // 0 - 360°
  eclipticLatitude: number;   // -90 - +90°
  distanceAu: number;
}

/**
 * Verilen UTC anında bir göksel cismin gerçek jeosantrik ekliptik boylamını hesaplar.
 * Yalnızca mevcut kapsamdaki 10 göksel cisim için gerçek astronomik hesaplama yapar.
 */
export function calculateRawBodyEcliptic(
  bodyId: AstrologicalBodyId,
  utcDate: Date
): RawEclipticCoordinate {
  const time = new AstroTime(utcDate);

  if (bodyId === 'Sun') {
    const sun = SunPosition(time);
    return {
      bodyId: 'Sun',
      eclipticLongitude: (sun.elon % 360 + 360) % 360,
      eclipticLatitude: sun.elat,
      distanceAu: sun.vec.Length(),
    };
  }

  if (bodyId === 'Moon') {
    const moon = EclipticGeoMoon(time);
    return {
      bodyId: 'Moon',
      eclipticLongitude: (moon.lon % 360 + 360) % 360,
      eclipticLatitude: moon.lat,
      distanceAu: moon.dist,
    };
  }

  const astroBodyMap: Record<string, Body> = {
    Mercury: Body.Mercury,
    Venus: Body.Venus,
    Mars: Body.Mars,
    Jupiter: Body.Jupiter,
    Saturn: Body.Saturn,
    Uranus: Body.Uranus,
    Neptune: Body.Neptune,
    Pluto: Body.Pluto,
  };

  const targetBody = astroBodyMap[bodyId];
  if (!targetBody) {
    throw new Error(
      `Desteklenmeyen veya kapsam dışı göksel cisim: ${bodyId}. Mevcut sürümde yalnızca Güneş, Ay ve 8 gezegen hesaplanır.`
    );
  }

  // Geocentric J2000 vektörü (ışık süresi ve sapma düzeltmeli) -> True Ecliptic of Date (ECT)
  const geoVec = GeoVector(targetBody, time, true);
  const eclipticCoords = Ecliptic(geoVec);

  return {
    bodyId,
    eclipticLongitude: (eclipticCoords.elon % 360 + 360) % 360,
    eclipticLatitude: eclipticCoords.elat,
    distanceAu: geoVec.Length(),
  };
}

/**
 * Ekliptik boylamı (0-360°) Tropical Zodyak burcuna, derece ve dakikasına dönüştürür.
 */
export function eclipticLongitudeToZodiac(longitudeDegrees: number): {
  sign: ZodiacSign;
  degree: number;
  minute: number;
  formattedText: string;
} {
  const norm = ((longitudeDegrees % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const signs: ZodiacSign[] = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];
  const signNamesTr: Record<ZodiacSign, string> = {
    Aries: 'Koç',
    Taurus: 'Boğa',
    Gemini: 'İkizler',
    Cancer: 'Yengeç',
    Leo: 'Aslan',
    Virgo: 'Başak',
    Libra: 'Terazi',
    Scorpio: 'Akrep',
    Sagittarius: 'Yay',
    Capricorn: 'Oğlak',
    Aquarius: 'Kova',
    Pisces: 'Balık',
  };

  const sign = signs[signIndex] || 'Aries';
  const degInSign = norm - signIndex * 30;
  const deg = Math.floor(degInSign);
  const min = Math.floor((degInSign - deg) * 60);

  return {
    sign,
    degree: deg,
    minute: min,
    formattedText: `${deg}° ${signNamesTr[sign]} ${min}'`,
  };
}

/**
 * Yükselen Burç (ASC) Hesaplama Çıktısı
 */
export interface AscendantCalculationResult {
  eclipticLongitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  second: number;
  formattedText: string;
}

/**
 * A39: Yerel doğum anı UTC tarihi, gözlemci enlemi ve boylamı için
 * Batı / Tropical Yükselen Burcu (Ascendant / ASC) ve kesin derece/dakikasını hesaplar.
 * 
 * Astronomik Matematik:
 * 1. GAST (Greenwich Apparent Sidereal Time) hesaplanır ve boylam eklenerek LAST (RAMC) bulunur.
 * 2. e_tilt fonksiyonu ile tarihe ait gerçek ekliptik eğimi (true obliquity / tobl) alınır.
 * 3. Ekliptiğin doğu ufku ile kesiştiği Yükselen noktası küresel trigonometri ile çözülür:
 *    y = cos(RAMC)
 *    x = -sin(RAMC)*cos(eps) - tan(lat)*sin(eps)
 *    ASC = atan2(y, x) (Doğu ufku yönelimi)
 * 4. Çıkan ekliptik boylam Tropical Zodyak burç ve derece/dakikasına dönüştürülür.
 */
export function calculateAscendant(
  utcDate: Date,
  latitude: number,
  longitude: number
): AscendantCalculationResult {
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Geçersiz enlem değeri: Enlem -90 ile +90 derece arasında olmalıdır.');
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Geçersiz boylam değeri: Boylam -180 ile +180 derece arasında olmalıdır.');
  }

  const time = new AstroTime(utcDate);
  const gastHours = SiderealTime(time);
  const gastDegrees = gastHours * 15;
  const lastDegrees = ((gastDegrees + longitude) % 360 + 360) % 360;

  const tilt = e_tilt(time);
  const obliquityDegrees = tilt.tobl;

  const thetaRad = lastDegrees * (Math.PI / 180);
  const epsRad = obliquityDegrees * (Math.PI / 180);
  const phiRad = latitude * (Math.PI / 180);

  const y = Math.cos(thetaRad);
  const x = -Math.sin(thetaRad) * Math.cos(epsRad) - Math.tan(phiRad) * Math.sin(epsRad);

  const ascRad = Math.atan2(y, x);
  const ascDegrees = ((ascRad * (180 / Math.PI)) % 360 + 360) % 360;

  const zodiac = eclipticLongitudeToZodiac(ascDegrees);
  const second = Math.floor((ascDegrees * 3600) % 60);

  return {
    eclipticLongitude: Number(ascDegrees.toFixed(4)),
    sign: zodiac.sign,
    degree: zodiac.degree,
    minute: zodiac.minute,
    second,
    formattedText: zodiac.formattedText,
  };
}

/**
 * Motor Hazırlık ve Entegrasyon Durumu
 */
export interface AstrologyEngineStatusReport {
  isReady: boolean;
  metadata: AstronomyEngineMetadata;
  selfTestPassed: boolean;
  statusMessageTr: string;
}

/**
 * Astronomi motorunun geçerliliğini ve çalışabilirliğini denetleyen öz sınama.
 * Yalnızca mevcut kapsamdaki cisimlerin (Güneş ve gezegenler) doğru API ile hesaplandığını teyit eder.
 */
export function verifyAstrologyEngineIntegrity(): AstrologyEngineStatusReport {
  try {
    // Referans anı testi: J2000 epoch'u (2000-01-01 12:00 UTC)
    const testDate = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const sunCoord = calculateRawBodyEcliptic('Sun', testDate);
    const jupiterCoord = calculateRawBodyEcliptic('Jupiter', testDate);

    // 2000-01-01 12:00'de Güneş ~280° Oğlak civarındadır (279°-282°)
    const isSunAccurate = sunCoord.eclipticLongitude >= 279 && sunCoord.eclipticLongitude <= 282;

    // 2000-01-01 12:00'de Jüpiter ~55° civarındadır (Boğa burcu, 50°-60°)
    const isJupiterAccurate = jupiterCoord.eclipticLongitude >= 50 && jupiterCoord.eclipticLongitude <= 60;

    if (!isSunAccurate || !isJupiterAccurate) {
      return {
        isReady: false,
        metadata: ASTRONOMY_ENGINE_METADATA,
        selfTestPassed: false,
        statusMessageTr: 'Astronomi motoru hesaplama doğrulaması başarısız oldu.',
      };
    }

    return {
      isReady: true,
      metadata: ASTRONOMY_ENGINE_METADATA,
      selfTestPassed: true,
      statusMessageTr:
        'Astronomi motoru (astronomy-engine v2.1.19 / VSOP87 & IAU 2006) başarıyla doğrulandı ve çevrimdışı çalışmaya hazırdır.',
    };
  } catch (err) {
    return {
      isReady: false,
      metadata: ASTRONOMY_ENGINE_METADATA,
      selfTestPassed: false,
      statusMessageTr: `Astronomi motoru başlatılamadı: ${(err as Error).message}`,
    };
  }
}
