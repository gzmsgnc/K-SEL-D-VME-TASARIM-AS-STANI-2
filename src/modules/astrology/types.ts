/**
 * Batı / Tropical Astroloji Modülü Veri Tipleri
 * Yalnızca Batı/Tropical zodyak ve Placidus ev sistemi kullanılır.
 */

import { ZodiacSign, ElementType, ModalityType, CelestialBodyPosition, HouseCusp, AspectData } from '../../types/astrology';

export type AstrologyStatus =
  | 'MISSING_COORDINATES'       // Doğum yeri koordinatları eksik veya geçersiz (hesaplama yapılamaz)
  | 'MISSING_BIRTH_DATE'        // Doğum tarihi eksik
  | 'READY_FOR_CALCULATION'     // Girdiler doğrulanmış, hesaplamaya hazır
  | 'CALCULATED';               // Gerçek hesaplama tamamlanmış

export interface ZodiacSignMetadata {
  sign: ZodiacSign;
  nameTr: string;
  symbolGlyph: string;
  element: ElementType;
  elementNameTr: string;
  modality: ModalityType;
  modalityNameTr: string;
  rulerTr: string;
  degreeStart: number;
  degreeEnd: number;
}

export interface AstrologyModulePreparation {
  clientId: string;
  status: AstrologyStatus;
  zodiacSystem: 'TROPICAL';
  houseSystem: 'PLACIDUS';
  birthDate: string;
  
  // Zaman ve Referans Ayrımı
  isBirthTimeKnown: boolean;
  rawBirthTime: string | null;
  calculationTimeString: string;
  isNoonReference: boolean;
  
  // Koordinat Güvenliği
  hasValidCoordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  utcOffsetMinutes: number;
  utcOffsetHours: number;

  // Ev ve Yükselen Kısıtlaması (Doğum saati bilinmiyorsa kesinlikle üretilemez)
  canCalculateHousesAndAscendant: boolean;
  
  // Bilgilendirme ve Hata Notları
  statusMessageTr: string;
  warningNotices: string[];

  // A7: Gerçek Astronomik Hesaplama Motoru Teknik Temeli (astronomy-engine v2.1.19)
  astronomyEngineReady?: boolean;
  astronomyEngineLicense?: string;
  astronomyEngineTheory?: string;
  historicalUtcIso?: string;
  isDaylightSavingTime?: boolean;
  julianDate?: number;
  gastHours?: number;
  lastDegrees?: number;
}

export interface TropicalChartResult {
  clientId: string;
  zodiacSystem: 'TROPICAL';
  houseSystem: 'PLACIDUS';
  isBirthTimeUnknown: boolean;
  calculationReferenceTime: string;
  sunSign?: ZodiacSign;
  moonSign?: ZodiacSign;
  ascendantSign?: ZodiacSign; // Yalnızca saat biliniyorsa mevcuttur
  midheavenSign?: ZodiacSign; // Yalnızca saat biliniyorsa mevcuttur
  planetaryPositions: CelestialBodyPosition[];
  houseCusps?: HouseCusp[];   // Yalnızca saat biliniyorsa mevcuttur
  aspects?: AspectData[];
  calculatedAt: string;
}
