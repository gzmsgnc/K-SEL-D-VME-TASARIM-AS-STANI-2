/**
 * Batı / Tropical Astroloji Veri Modelleri
 * Yalnızca Batı/Tropical zodyak ve Placidus ev sistemi kullanılır.
 * Vedik veya yan sistemler kesinlikle dahil edilmez.
 */

export type ZodiacSystem = 'TROPICAL';
export type HouseSystem = 'PLACIDUS';

export type ZodiacSign =
  | 'Aries'       // Koç
  | 'Taurus'      // Boğa
  | 'Gemini'      // İkizler
  | 'Cancer'      // Yengeç
  | 'Leo'         // Aslan
  | 'Virgo'       // Başak
  | 'Libra'       // Terazi
  | 'Scorpio'     // Akrep
  | 'Sagittarius' // Yay
  | 'Capricorn'   // Oğlak
  | 'Aquarius'    // Kova
  | 'Pisces';     // Balık

export type ElementType = 'FIRE' | 'EARTH' | 'AIR' | 'WATER';
export type ModalityType = 'CARDINAL' | 'FIXED' | 'MUTABLE';

export interface CelestialBodyPosition {
  body:
    | 'Sun'
    | 'Moon'
    | 'Ascendant'
    | 'Mercury'
    | 'Venus'
    | 'Mars'
    | 'Jupiter'
    | 'Saturn'
    | 'Uranus'
    | 'Neptune'
    | 'Pluto'
    | 'Chiron'
    | 'NorthNode'
    | 'SouthNode'
    | 'Midheaven';
  sign: ZodiacSign;
  degree: number;               // 0 - 29.9999
  minute: number;               // 0 - 59
  second?: number;              // 0 - 59
  houseNumber?: number;         // 1 - 12 (Placidus ev numarası, saat bilinmiyorsa belirsiz olabilir)
  isRetrograde?: boolean;
  eclipticLongitude?: number;   // 0 - 360° ekliptik boylam
  formattedTextTr?: string;     // örn: "14° Koç 23'"
  isNoonReference?: boolean;    // Doğum saati bilinmediğinde öğle 12:00 varsayımı
}

export interface HouseCusp {
  houseNumber: number;          // 1 - 12
  sign: ZodiacSign;
  degree: number;
}

export interface AspectData {
  firstBody: string;
  secondBody: string;
  type: 'CONJUNCTION' | 'OPPOSITION' | 'TRINE' | 'SQUARE' | 'SEXTILE';
  orbDegrees: number;
  isApplying?: boolean;
}

/**
 * Batı Astroloji Doğum Haritası Modeli
 */
export interface TropicalNatalChart {
  zodiacSystem: ZodiacSystem;       // Her zaman 'TROPICAL'
  houseSystem: HouseSystem;         // Her zaman 'PLACIDUS'
  isBirthTimeUnknown: boolean;      // Doğum saati bilinmiyorsa true
  birthDate: string;                // YYYY-MM-DD
  birthTime?: string;               // HH:mm (bilinmiyorsa tanımsız veya varsayılan 12:00 öğle referansı)
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetMinutes: number;
  
  // Yükselen Burç (Saat biliniyorsa hesaplanır, bilinmiyorsa tanımsız)
  ascendantSign?: ZodiacSign;
  ascendantDegree?: number;
  ascendantMinute?: number;
  formattedAscendantTr?: string;
  sunSign?: ZodiacSign;
  moonSign?: ZodiacSign;
  planetaryPositions?: CelestialBodyPosition[];
  houseCusps?: HouseCusp[];
  aspects?: AspectData[];
  elementDominance?: Record<ElementType, number>;
  modalityDominance?: Record<ModalityType, number>;
}
