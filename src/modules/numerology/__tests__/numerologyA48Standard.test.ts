import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PYTHAGOREAN_MAP,
  TURKISH_CHAR_MAP,
  VOWEL_SET,
  MASTER_NUMBERS,
} from '../constants';
import {
  reduceNumber,
  getLetterValue,
  isVowel,
  calculateLifePathNumber,
  calculateBirthdayNumber,
  calculateDestinyNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  calculateWorldMissionNumber,
  calculateKarmicLessons,
  extractMasterNumbers,
  calculateNumerologyMatrix,
} from '../numerologyCalculationEngine';

describe('A48: Modern Standart Pisagor Numeroloji Motoru Denetim ve Doğrulama', () => {
  describe('1. Standart Pisagor 1-9 Harf Tablosu Birebir Doğrulaması', () => {
    it('1: A, J, S olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['A'], 1);
      assert.strictEqual(PYTHAGOREAN_MAP['J'], 1);
      assert.strictEqual(PYTHAGOREAN_MAP['S'], 1);
    });

    it('2: B, K, T olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['B'], 2);
      assert.strictEqual(PYTHAGOREAN_MAP['K'], 2);
      assert.strictEqual(PYTHAGOREAN_MAP['T'], 2);
    });

    it('3: C, L, U olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['C'], 3);
      assert.strictEqual(PYTHAGOREAN_MAP['L'], 3);
      assert.strictEqual(PYTHAGOREAN_MAP['U'], 3);
    });

    it('4: D, M, V olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['D'], 4);
      assert.strictEqual(PYTHAGOREAN_MAP['M'], 4);
      assert.strictEqual(PYTHAGOREAN_MAP['V'], 4);
    });

    it('5: E, N, W olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['E'], 5);
      assert.strictEqual(PYTHAGOREAN_MAP['N'], 5);
      assert.strictEqual(PYTHAGOREAN_MAP['W'], 5);
    });

    it('6: F, O, X olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['F'], 6);
      assert.strictEqual(PYTHAGOREAN_MAP['O'], 6);
      assert.strictEqual(PYTHAGOREAN_MAP['X'], 6);
    });

    it('7: G, P, Y olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['G'], 7);
      assert.strictEqual(PYTHAGOREAN_MAP['P'], 7);
      assert.strictEqual(PYTHAGOREAN_MAP['Y'], 7);
    });

    it('8: H, Q, Z olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['H'], 8);
      assert.strictEqual(PYTHAGOREAN_MAP['Q'], 8);
      assert.strictEqual(PYTHAGOREAN_MAP['Z'], 8);
    });

    it('9: I, R olmalıdır', () => {
      assert.strictEqual(PYTHAGOREAN_MAP['I'], 9);
      assert.strictEqual(PYTHAGOREAN_MAP['R'], 9);
    });
  });

  describe('2. Türkçe Karakter Normalizasyonu ve Sesli/Sessiz Ayrımı', () => {
    it('Tüm Türkçe özel karakterler doğru Pisagor sayılarına eşlenmelidir', () => {
      assert.strictEqual(getLetterValue('ç'), 3);
      assert.strictEqual(getLetterValue('Ç'), 3);
      assert.strictEqual(getLetterValue('ğ'), 7);
      assert.strictEqual(getLetterValue('Ğ'), 7);
      assert.strictEqual(getLetterValue('ı'), 9);
      assert.strictEqual(getLetterValue('I'), 9);
      assert.strictEqual(getLetterValue('i'), 9);
      assert.strictEqual(getLetterValue('İ'), 9);
      assert.strictEqual(getLetterValue('ö'), 6);
      assert.strictEqual(getLetterValue('Ö'), 6);
      assert.strictEqual(getLetterValue('ş'), 1);
      assert.strictEqual(getLetterValue('Ş'), 1);
      assert.strictEqual(getLetterValue('ü'), 3);
      assert.strictEqual(getLetterValue('Ü'), 3);
    });

    it('Sesli harfler eksiksiz 8 Türkçe sesliyi kapsamalıdır', () => {
      const vowels = ['A', 'a', 'E', 'e', 'I', 'ı', 'İ', 'i', 'O', 'ö', 'U', 'ü'];
      for (const v of vowels) {
        assert.strictEqual(isVowel(v), true, `${v} sesli harf olmalıdır`);
      }
    });

    it('Sessiz harfler doğru ayrıştırılmalıdır', () => {
      const consonants = ['b', 'c', 'ç', 'd', 'f', 'g', 'ğ', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 'ş', 't', 'v', 'y', 'z'];
      for (const c of consonants) {
        assert.strictEqual(isVowel(c), false, `${c} sessiz harf olmalıdır`);
      }
    });
  });

  describe('3. Master Sayılar (11, 22, 33) ve İndirgeme Kuralları', () => {
    it('11, 22 ve 33 korunmalı, diğer iki basamaklılar tek haneye indirgenmelidir', () => {
      assert.strictEqual(reduceNumber(11, true), 11);
      assert.strictEqual(reduceNumber(22, true), 22);
      assert.strictEqual(reduceNumber(33, true), 33);

      // 29 -> 2+9 = 11 (Master 11 olarak korunmalı)
      assert.strictEqual(reduceNumber(29, true), 11);
      // 38 -> 3+8 = 11 (Master 11 olarak korunmalı)
      assert.strictEqual(reduceNumber(38, true), 11);
      // 47 -> 4+7 = 11 (Master 11 olarak korunmalı)
      assert.strictEqual(reduceNumber(47, true), 11);

      // Standart indirgemeler
      assert.strictEqual(reduceNumber(14, true), 5);
      assert.strictEqual(reduceNumber(28, true), 1); // 28 -> 10 -> 1
      assert.strictEqual(reduceNumber(54, true), 9); // 54 -> 9
    });
  });

  describe('4. 8 Temel Numeroloji Sayısının Formül Doğrulaması', () => {
    // Test Örneği: "AHMET YILMAZ", 1985-11-22
    // A(1) H(8) M(4) E(5) T(2) = 20 -> 2
    // Y(7) I(9) L(3) M(4) A(1) Z(8) = 32 -> 5
    // Toplam İsim: 20 + 32 = 52 -> 7 (Kader Sayısı = 7)
    // Sesliler: A(1) + E(5) + I(9) + A(1) = 16 -> 7 (Ruh Güdüsü = 7)
    // Sessizler: H(8) + M(4) + T(2) + Y(7) + L(3) + M(4) + Z(8) = 36 -> 9 (Kişilik Sayısı = 9)
    // Doğrulama: Ruh(7) + Kişilik(9) = 16 -> 7 (Kader ile tam uyumlu)
    // Doğum Tarihi: 1985-11-22:
    // Gün: 22 (Master 22)
    // Ay: 11 (Master 11)
    // Yıl: 1985 -> 1+9+8+5 = 23 -> 5
    // Yaşam Yolu Toplam: 22 + 11 + 5 = 38 -> 3+8 = 11 (Master 11)
    // Doğum Günü Sayısı: 22 (Master 22)
    // Dünya Görevi: Yaşam Yolu(11) + Kader(7) = 18 -> 9
    // İsim Harf Kümesi: {1, 2, 3, 4, 5, 7, 8, 9} -> Eksik: [6]

    const testName = 'AHMET YILMAZ';
    const testDate = '1985-11-22';

    it('Kader Sayısı formülü tüm harflerin toplamını doğru indirgemelidir', () => {
      const destiny = calculateDestinyNumber(testName);
      assert.strictEqual(destiny, 7);
    });

    it('Ruh Güdüsü formülü yalnızca sesli harfleri doğru toplamalıdır', () => {
      const soul = calculateSoulUrgeNumber(testName);
      assert.strictEqual(soul, 7);
    });

    it('Kişilik Sayısı formülü yalnızca sessiz harfleri doğru toplamalıdır', () => {
      const personality = calculatePersonalityNumber(testName);
      assert.strictEqual(personality, 9);
    });

    it('Yaşam Yolu Sayısı 3 döngü yöntemiyle Master 11 i koruyarak hesaplamalıdır', () => {
      const lp = calculateLifePathNumber(testDate);
      assert.strictEqual(lp, 11);
    });

    it('Doğum Günü Sayısı gün hanesini Master 22 yi koruyarak hesaplamalıdır', () => {
      const bday = calculateBirthdayNumber(testDate);
      assert.strictEqual(bday, 22);
    });

    it('Dünya Görevi formülü Yaşam Yolu + Kader Sayısını doğru toplamalıdır', () => {
      const mission = calculateWorldMissionNumber(11, 7);
      assert.strictEqual(mission, 9); // 11 + 7 = 18 -> 1+8 = 9
    });

    it('Karmik Dersler isimde hiç bulunmayan sayıyı ([6]) doğru tespit etmelidir', () => {
      const karmic = calculateKarmicLessons(testName);
      assert.deepStrictEqual(karmic, [6]);
    });

    it('Master Sayılar kümesi 11 ve 22 yi eksiksiz listelemelidir', () => {
      const masters = extractMasterNumbers(11, 7, 7, 9, 9, 22);
      assert.deepStrictEqual(masters, [11, 22]);
    });

    it('calculateNumerologyMatrix tüm matrisi tek seferde tutarlı üretmelidir', () => {
      const matrix = calculateNumerologyMatrix(testName, testDate);
      assert.strictEqual(matrix.destinyNumber, 7);
      assert.strictEqual(matrix.soulUrgeNumber, 7);
      assert.strictEqual(matrix.personalityNumber, 9);
      assert.strictEqual(matrix.lifePathNumber, 11);
      assert.strictEqual(matrix.birthdayNumber, 22);
      assert.strictEqual(matrix.worldMissionNumber, 9);
      assert.deepStrictEqual(matrix.karmicLessons, [6]);
      assert.deepStrictEqual(matrix.masterNumbers, [11, 22]);
    });
  });
});
