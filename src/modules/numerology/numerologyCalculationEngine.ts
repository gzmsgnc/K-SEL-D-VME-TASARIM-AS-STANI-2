import { NumerologyAnalysis } from '../../types/analysis';
import {
  PYTHAGOREAN_MAP,
  TURKISH_CHAR_MAP,
  VOWEL_SET,
  MASTER_NUMBERS,
} from './constants';

/**
 * Sayıyı tek basamağa (1-9) indirger.
 * `preserveMaster = true` olduğunda 11, 22 ve 33 sayıları korunur.
 */
export function reduceNumber(n: number, preserveMaster = true): number {
  if (!Number.isFinite(n) || n <= 0) return 0;

  let current = Math.floor(n);

  if (preserveMaster && MASTER_NUMBERS.includes(current)) {
    return current;
  }

  while (current > 9) {
    let sum = 0;
    while (current > 0) {
      sum += current % 10;
      current = Math.floor(current / 10);
    }
    current = sum;
    if (preserveMaster && MASTER_NUMBERS.includes(current)) {
      return current;
    }
  }

  return current;
}

/**
 * Tek bir Türkçe veya Latin harfinin Pisagor tablosundaki sayısal değerini döner.
 * Harf dışı karakterler için `null` döner.
 */
export function getLetterValue(rawChar: string): number | null {
  if (!rawChar || rawChar.trim() === '') return null;

  const upper = rawChar.toLocaleUpperCase('tr-TR');
  const mapped = TURKISH_CHAR_MAP[upper] || upper;

  return PYTHAGOREAN_MAP[mapped] ?? null;
}

/**
 * Verilen karakterin sesli harf olup olmadığını doğrular.
 */
export function isVowel(rawChar: string): boolean {
  if (!rawChar) return false;
  const upper = rawChar.toLocaleUpperCase('tr-TR');
  return VOWEL_SET.has(upper);
}

/**
 * Doğum Tarihinden (YYYY-MM-DD) Yaşam Yolu Sayısını hesaplar.
 * YALNIZCA doğum tarihini kullanır; isim verisiyle karışmaz.
 * Gün, Ay ve Yıl ayrı ayrı indirgenip toplanır, ardından nihai indirgeme yapılır (Master 11, 22, 33 korunur).
 */
export function calculateLifePathNumber(birthDateStr: string): number {
  if (!birthDateStr || typeof birthDateStr !== 'string') {
    throw new Error('Geçersiz doğum tarihi: Değer boş olamaz.');
  }

  const parts = birthDateStr.trim().split('-');
  if (parts.length !== 3) {
    throw new Error(`Geçersiz doğum tarihi biçimi: "${birthDateStr}". YYYY-MM-DD bekleniyor.`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    year < 1000 || year > 2500 ||
    month < 1 || month > 12 ||
    day < 1 || day > 31
  ) {
    throw new Error(`Geçersiz takvim değerleri: Yıl: ${parts[0]}, Ay: ${parts[1]}, Gün: ${parts[2]}`);
  }

  const dayReduced = reduceNumber(day, true);
  const monthReduced = reduceNumber(month, true);
  const yearReduced = reduceNumber(year, true);

  const total = dayReduced + monthReduced + yearReduced;
  return reduceNumber(total, true);
}

/**
 * Doğum Günü Sayısını hesaplar.
 * YALNIZCA doğum tarihinin gün hanesini (1-31) kullanır (Master 11 ve 22 korunur).
 */
export function calculateBirthdayNumber(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const parts = birthDateStr.trim().split('-');
  if (parts.length !== 3) return 0;

  const day = parseInt(parts[2], 10);
  if (isNaN(day) || day < 1 || day > 31) return 0;

  return reduceNumber(day, true);
}

/**
 * Tam Addan Kader / İfade Sayısını (Destiny / Expression Number) hesaplar.
 * YALNIZCA ad ve soyadı kullanır; doğum tarihiyle karışmaz.
 */
export function calculateDestinyNumber(fullName: string): number {
  if (!fullName || typeof fullName !== 'string') return 0;

  let total = 0;
  for (const char of fullName) {
    const val = getLetterValue(char);
    if (val !== null) {
      total += val;
    }
  }

  return reduceNumber(total, true);
}

/**
 * Tam Adın Sesli Harflerinden Ruh Arzusu / Kalp Güdüsü Sayısını (Soul Urge) hesaplar.
 */
export function calculateSoulUrgeNumber(fullName: string): number {
  if (!fullName || typeof fullName !== 'string') return 0;

  let total = 0;
  for (const char of fullName) {
    if (isVowel(char)) {
      const val = getLetterValue(char);
      if (val !== null) {
        total += val;
      }
    }
  }

  return reduceNumber(total, true);
}

/**
 * Tam Adın Sessiz Harflerinden Kişilik Sayısını (Personality Number) hesaplar.
 */
export function calculatePersonalityNumber(fullName: string): number {
  if (!fullName || typeof fullName !== 'string') return 0;

  let total = 0;
  for (const char of fullName) {
    const val = getLetterValue(char);
    if (val !== null && !isVowel(char)) {
      total += val;
    }
  }

  return reduceNumber(total, true);
}

/**
 * Dünya Misyonu Sayısını (World Mission / Maturity Number) hesaplar.
 * Yaşam Yolu + Kader Sayısı toplamının indirgenmesiyle elde edilir (Master 11, 22, 33 korunur).
 */
export function calculateWorldMissionNumber(lifePathNumber: number, destinyNumber: number): number {
  if (!lifePathNumber || !destinyNumber) return 0;
  return reduceNumber(lifePathNumber + destinyNumber, true);
}

/**
 * Tam adda hiç bulunmayan sayıları (1-9) tespit ederek Karmik Dersleri döner.
 */
export function calculateKarmicLessons(fullName: string): number[] {
  if (!fullName) return [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const presentNumbers = new Set<number>();
  for (const char of fullName) {
    const val = getLetterValue(char);
    if (val !== null) {
      presentNumbers.add(val);
    }
  }

  const missing: number[] = [];
  for (let i = 1; i <= 9; i++) {
    if (!presentNumbers.has(i)) {
      missing.push(i);
    }
  }

  return missing;
}

/**
 * Verilen temel sayılardan master sayıları (11, 22, 33) listeler.
 */
export function extractMasterNumbers(...numbers: number[]): number[] {
  const set = new Set<number>();
  for (const n of numbers) {
    if (MASTER_NUMBERS.includes(n)) {
      set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Tüm numeroloji matrisini eksiksiz, tutarlı ve bağımsız olarak hesaplar.
 */
export function calculateNumerologyMatrix(
  fullName: string,
  birthDateStr: string
): NumerologyAnalysis {
  const cleanName = fullName.trim();
  const cleanBirthDate = birthDateStr.trim();

  const lifePathNumber = calculateLifePathNumber(cleanBirthDate);
  const destinyNumber = calculateDestinyNumber(cleanName);
  const soulUrgeNumber = calculateSoulUrgeNumber(cleanName);
  const personalityNumber = calculatePersonalityNumber(cleanName);
  const birthdayNumber = calculateBirthdayNumber(cleanBirthDate);
  const worldMissionNumber = calculateWorldMissionNumber(lifePathNumber, destinyNumber);
  const karmicLessons = calculateKarmicLessons(cleanName);
  const masterNumbers = extractMasterNumbers(
    lifePathNumber,
    destinyNumber,
    soulUrgeNumber,
    personalityNumber,
    worldMissionNumber,
    birthdayNumber
  );

  return {
    lifePathNumber,
    destinyNumber,
    soulUrgeNumber,
    personalityNumber,
    birthdayNumber,
    worldMissionNumber,
    karmicLessons,
    masterNumbers,
  };
}
