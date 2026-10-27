/**
 * Doğum Yeri ve Zaman Altyapısı
 * 
 * Doğum saatinin bilinip bilinmemesi ile hesaplamalarda kullanılan
 * 12:00 öğle varsayımını birbirinden kesin çizgilerle ayırır.
 * İlerideki Batı/Tropical astroloji ve Placidus hesaplamalarında
 * doğru zaman ve koordinat girdilerini hazırlar.
 */

import { GlobalLocation } from '../types/location';

export interface EffectiveBirthTimeContext {
  isTimeKnown: boolean;                 // Danışan doğum saatini biliyor mu?
  rawBirthTime: string | null;          // Danışanın beyan ettiği ham saat (örn: "14:35" veya bilinmiyorsa null)
  calculationTimeString: string;       // Hesaplama motorunun baz alacağı saat (biliniyorsa tam saat, bilinmiyorsa "12:00")
  isNoonReference: boolean;             // Hesaplama 12:00 öğle referansı mı kullanıyor?
  localHour: number;                    // 0 - 23 arası yerel saat
  localMinute: number;                  // 0 - 59 arası yerel dakika
  utcDecimalHour: number;               // UTC karşılığı ondalık saat (örn: 14:30 ve UTC+3 için 11.5)
  warningNotice?: string;               // Bilinmeyen saat durumunda hesaplama motoruna ve kullanıcıya yönelik Türkçe uyarı
}

export interface AstrologicalCoordinatesContext {
  isValid: boolean;                     // Koordinatlar gerçek ve doğrulanmış mı? (Eksik veri 0,0 olarak kabul edilmez)
  latitude: number | null;              // Ondalık enlem (-90 ile +90), geçersizse null
  longitude: number | null;             // Ondalık boylam (-180 ile +180), geçersizse null
  formattedCoordinates: string;         // Örn: "41.0082° K, 28.9784° D" veya "Konum Belirtilmedi"
  timezone: string;                     // IANA formatı (örn: "Europe/Istanbul")
  utcOffsetMinutes: number;             // UTC sapması dakika
  utcOffsetHours: number;               // UTC sapması saat (örn: 3)
  warningNotice?: string;               // Eksik koordinat uyarısı
}

/**
 * Doğum saatini ve bilinmeyen saat durumunu ayrıştırarak hesaplama bağlamını üretir.
 */
export function resolveEffectiveBirthTime(
  birthTime: string | undefined | null,
  isBirthTimeUnknown: boolean,
  utcOffsetMinutes: number = 0
): EffectiveBirthTimeContext {
  if (isBirthTimeUnknown || !birthTime || !/^\d{2}:\d{2}$/.test(birthTime)) {
    // Saat bilinmiyor: Kesin olarak 12:00 öğle varsayımı uygulanır, ancak bu durum açıkça bayraklandırılır.
    const noonLocalHour = 12;
    const noonLocalMinute = 0;
    const noonUtcHour = 12 - (utcOffsetMinutes || 0) / 60;
    const normalizedUtcHour = ((noonUtcHour % 24) + 24) % 24;

    return {
      isTimeKnown: false,
      rawBirthTime: null,
      calculationTimeString: '12:00',
      isNoonReference: true,
      localHour: noonLocalHour,
      localMinute: noonLocalMinute,
      utcDecimalHour: Number(normalizedUtcHour.toFixed(4)),
      warningNotice:
        'Doğum saati bilinmediği için hesaplamalar öğle 12:00 referansıyla değerlendirilecektir. Yükselen burç (Ascendant) ve ev sınırları (Placidus cusps) kesinlik taşımadığından yorumlarda ev bazlı yargılardan kaçınılmalıdır.',
    };
  }

  // Doğum saati biliniyor
  const [hStr, mStr] = birthTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const localDecimalHour = h + m / 60;
  const rawUtcHour = localDecimalHour - (utcOffsetMinutes || 0) / 60;
  const normalizedUtcHour = ((rawUtcHour % 24) + 24) % 24;

  return {
    isTimeKnown: true,
    rawBirthTime: birthTime,
    calculationTimeString: birthTime,
    isNoonReference: false,
    localHour: h,
    localMinute: m,
    utcDecimalHour: Number(normalizedUtcHour.toFixed(4)),
  };
}

/**
 * Global lokasyon verisini astrolojik hesaplamaya hazır koordinat bağlamına dönüştürür.
 * Konum eksik veya geçersizse bunu açıkça belirtir; asla 0,0 koordinatını doğrulanmış gibi kabul etmez.
 */
export function resolveAstrologicalCoordinates(location?: GlobalLocation | null): AstrologicalCoordinatesContext {
  const isInvalid =
    !location ||
    typeof location.latitude !== 'number' ||
    typeof location.longitude !== 'number' ||
    isNaN(location.latitude) ||
    isNaN(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180 ||
    (!location.city && !location.country && !location.placeName);

  if (isInvalid) {
    return {
      isValid: false,
      latitude: null,
      longitude: null,
      formattedCoordinates: 'Konum Belirtilmedi',
      timezone: location?.timezone || 'Bilinmiyor',
      utcOffsetMinutes: location?.utcOffsetMinutes || 0,
      utcOffsetHours: Number(((location?.utcOffsetMinutes || 0) / 60).toFixed(2)),
      warningNotice: 'Geçerli bir doğum yeri seçilmediği için Batı / Tropical astroloji haritası ve Placidus evleri hesaplanamaz.',
    };
  }

  const lat = location.latitude;
  const lng = location.longitude;
  const latDir = lat >= 0 ? 'K' : 'G';
  const lngDir = lng >= 0 ? 'D' : 'B';
  const offsetMin = location.utcOffsetMinutes || 0;

  return {
    isValid: true,
    latitude: lat,
    longitude: lng,
    formattedCoordinates: `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`,
    timezone: location.timezone || 'UTC',
    utcOffsetMinutes: offsetMin,
    utcOffsetHours: Number((offsetMin / 60).toFixed(2)),
  };
}
