import { describe, it } from 'node:test';
import assert from 'node:assert';
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
import {
  prepareNumerologyModule,
  calculateClientNumerology,
} from '../numerologyEngineAdapter';
import { Client } from '../../../types/client';
import { GlobalLocation } from '../../../types/location';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  saveClientNumerology,
  clearClientNumerology,
  getClientArchive,
  getStoredClients,
  createClientRecord,
} from '../../../store/storage';

const mockLocation: GlobalLocation = {
  country: 'Türkiye',
  city: 'İstanbul',
  placeName: 'İstanbul, Türkiye',
  latitude: 41.0082,
  longitude: 28.9784,
  timezone: 'Europe/Istanbul',
  utcOffsetMinutes: 180,
};

describe('A12: Numeroloji Modülü Doğrulama ve Regresyon Testleri', () => {
  describe('1. Pisagor Harf Dönüşümleri ve Türkçe Karakter Normalizasyonu', () => {
    it('Standart Latin harflerini doğru Pisagor değerlerine dönüştürmelidir', () => {
      assert.strictEqual(getLetterValue('A'), 1);
      assert.strictEqual(getLetterValue('B'), 2);
      assert.strictEqual(getLetterValue('C'), 3);
      assert.strictEqual(getLetterValue('D'), 4);
      assert.strictEqual(getLetterValue('E'), 5);
      assert.strictEqual(getLetterValue('F'), 6);
      assert.strictEqual(getLetterValue('G'), 7);
      assert.strictEqual(getLetterValue('H'), 8);
      assert.strictEqual(getLetterValue('I'), 9);
      assert.strictEqual(getLetterValue('R'), 9);
      assert.strictEqual(getLetterValue('Z'), 8);
    });

    it('Türkçe özel karakterleri (Ç, Ğ, I, İ, Ö, Ş, Ü) standart Pisagor tablosuna eşlemelidir', () => {
      // Ç -> C (3)
      assert.strictEqual(getLetterValue('Ç'), 3);
      assert.strictEqual(getLetterValue('ç'), 3);
      // Ğ -> G (7)
      assert.strictEqual(getLetterValue('Ğ'), 7);
      assert.strictEqual(getLetterValue('ğ'), 7);
      // I / İ -> I (9)
      assert.strictEqual(getLetterValue('I'), 9);
      assert.strictEqual(getLetterValue('ı'), 9);
      assert.strictEqual(getLetterValue('İ'), 9);
      assert.strictEqual(getLetterValue('i'), 9);
      // Ö -> O (6)
      assert.strictEqual(getLetterValue('Ö'), 6);
      assert.strictEqual(getLetterValue('ö'), 6);
      // Ş -> S (1)
      assert.strictEqual(getLetterValue('Ş'), 1);
      assert.strictEqual(getLetterValue('ş'), 1);
      // Ü -> U (3)
      assert.strictEqual(getLetterValue('Ü'), 3);
      assert.strictEqual(getLetterValue('ü'), 3);
    });

    it('Boşluk veya harf dışı karakterler için null dönmelidir', () => {
      assert.strictEqual(getLetterValue(' '), null);
      assert.strictEqual(getLetterValue('-'), null);
      assert.strictEqual(getLetterValue('1'), null);
    });

    it('Sesli harf ayrımı Türkçe karakterleri (A, E, I, İ, O, Ö, U, Ü) doğru tanımalıdır', () => {
      assert.strictEqual(isVowel('A'), true);
      assert.strictEqual(isVowel('e'), true);
      assert.strictEqual(isVowel('ı'), true);
      assert.strictEqual(isVowel('İ'), true);
      assert.strictEqual(isVowel('ö'), true);
      assert.strictEqual(isVowel('Ü'), true);

      assert.strictEqual(isVowel('B'), false);
      assert.strictEqual(isVowel('ç'), false);
      assert.strictEqual(isVowel('ğ'), false);
      assert.strictEqual(isVowel('ş'), false);
    });
  });

  describe('2. Master Sayı ve İndirgeme Kuralları', () => {
    it('11, 22 ve 33 üstat sayılarını korumalıdır', () => {
      assert.strictEqual(reduceNumber(11, true), 11);
      assert.strictEqual(reduceNumber(22, true), 22);
      assert.strictEqual(reduceNumber(33, true), 33);
      assert.strictEqual(reduceNumber(29, true), 11); // 2+9 = 11 (üstat)
      assert.strictEqual(reduceNumber(38, true), 11); // 3+8 = 11 (üstat)
      assert.strictEqual(reduceNumber(47, true), 11); // 4+7 = 11 (üstat)
    });

    it('Standart sayıları tek basamağa (1-9) indirgemelidir', () => {
      assert.strictEqual(reduceNumber(10, true), 1);
      assert.strictEqual(reduceNumber(12, true), 3);
      assert.strictEqual(reduceNumber(15, true), 6);
      assert.strictEqual(reduceNumber(25, true), 7);
      assert.strictEqual(reduceNumber(99, false), 9); // 9+9=18 -> 1+8=9
    });
  });

  describe('3. 5 Temel Çıktının Matematiksel Doğruluğu', () => {
    // Örnek Danışan: "DENİZ YILDIZ", Doğum Tarihi: 1990-06-21
    // D(4) E(5) N(5) İ(9) Z(8) -> 4+5+5+9+8 = 31 -> 3+1 = 4
    // Y(7) I(9) L(3) D(4) I(9) Z(8) -> 7+9+3+4+9+8 = 40 -> 4+0 = 4
    // Toplam İsim = 31 + 40 = 71 -> 7+1 = 8 (Kader Sayısı = 8)
    // Sesliler: E(5) + İ(9) + I(9) + I(9) = 32 -> 3+2 = 5 (Ruh Arzusu = 5)
    // Sessizler: D(4) + N(5) + Z(8) + Y(7) + L(3) + D(4) + Z(8) = 39 -> 3+9 = 12 -> 1+2 = 3 (Kişilik = 3)
    // Doğrulama: Ruh(5) + Kişilik(3) = 8 (Kader(8) ile tam uyumlu!)
    // Yaşam Yolu: 1990-06-21 -> Gün: 21->3, Ay: 6, Yıl: 1990->19->10->1. Toplam: 3+6+1 = 10 -> 1+0 = 1.
    // Dünya Misyonu: Yaşam Yolu(1) + Kader(8) = 9.

    it('Deniz Yıldız için Yaşam Yolu = 1 hesaplanmalıdır', () => {
      const lp = calculateLifePathNumber('1990-06-21');
      assert.strictEqual(lp, 1);
    });

    it('Deniz Yıldız için Kader Sayısı = 8 hesaplanmalıdır', () => {
      const destiny = calculateDestinyNumber('DENİZ YILDIZ');
      assert.strictEqual(destiny, 8);
    });

    it('Deniz Yıldız için Ruh Arzusu = 5 hesaplanmalıdır', () => {
      const soul = calculateSoulUrgeNumber('DENİZ YILDIZ');
      assert.strictEqual(soul, 5);
    });

    it('Deniz Yıldız için Kişilik Sayısı = 3 hesaplanmalıdır', () => {
      const personality = calculatePersonalityNumber('DENİZ YILDIZ');
      assert.strictEqual(personality, 3);
    });

    it('Deniz Yıldız için Dünya Misyonu = 9 hesaplanmalıdır', () => {
      const lp = calculateLifePathNumber('1990-06-21');
      const destiny = calculateDestinyNumber('DENİZ YILDIZ');
      const mission = calculateWorldMissionNumber(lp, destiny);
      assert.strictEqual(mission, 9);
    });

    it('Doğum Günü Sayısı 21 -> 3 olarak hesaplanmalıdır', () => {
      const bday = calculateBirthdayNumber('1990-06-21');
      assert.strictEqual(bday, 3);
    });

    it('Karmic Lessons (İsimde eksik sayılar) doğru tespit edilmelidir', () => {
      // DENİZ YILDIZ harf değerleri: 4, 5, 5, 9, 8, 7, 9, 3, 4, 9, 8
      // Mevcut değerler: 3, 4, 5, 7, 8, 9
      // Eksik değerler: 1, 2, 6
      const lessons = calculateKarmicLessons('DENİZ YILDIZ');
      assert.deepStrictEqual(lessons, [1, 2, 6]);
    });
  });

  describe('4. İsim ve Doğum Tarihi Veri Ayrımı Güvencesi', () => {
    it('Ad değiştirildiğinde Yaşam Yolu ve Doğum Günü ASLA değişmemelidir', () => {
      const date = '1985-11-22';
      const matrix1 = calculateNumerologyMatrix('ALİ KAYA', date);
      const matrix2 = calculateNumerologyMatrix('ZEYNEP ÖZTÜRK', date);

      // Yaşam yolu ve doğum günü tamamen aynı kalmalıdır
      assert.strictEqual(matrix1.lifePathNumber, matrix2.lifePathNumber);
      assert.strictEqual(matrix1.birthdayNumber, matrix2.birthdayNumber);

      // İsimden gelen değerler ise farklı olmalıdır
      assert.notStrictEqual(matrix1.destinyNumber, matrix2.destinyNumber);
    });

    it('Doğum tarihi değiştirildiğinde Kader, Ruh Arzusu ve Kişilik ASLA değişmemelidir', () => {
      const name = 'CANAN ÇETİN';
      const matrix1 = calculateNumerologyMatrix(name, '1992-04-15');
      const matrix2 = calculateNumerologyMatrix(name, '2001-12-30');

      // İsimden türeyen sayılar tamamen aynı kalmalıdır
      assert.strictEqual(matrix1.destinyNumber, matrix2.destinyNumber);
      assert.strictEqual(matrix1.soulUrgeNumber, matrix2.soulUrgeNumber);
      assert.strictEqual(matrix1.personalityNumber, matrix2.personalityNumber);
      assert.deepStrictEqual(matrix1.karmicLessons, matrix2.karmicLessons);

      // Doğum tarihinden türeyenler farklı olmalıdır
      assert.notStrictEqual(matrix1.lifePathNumber, matrix2.lifePathNumber);
    });
  });

  describe('5. Danışan İzolasyonu ve Arşiv Akışı', () => {
    it('Farklı iki danışan için hesaplama ve kayıt izolasyonunu korumalıdır', () => {
      const client1 = createClientRecord({
        firstName: 'Ahmet',
        lastName: 'Demir',
        email: 'ahmet@example.com',
        phone: '5551112233',
        birthDate: '1988-03-12',
        birthTime: '10:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Ayşe',
        notes: '',
      }, 'OWNER_MANUAL');

      const client2 = createClientRecord({
        firstName: 'Selin',
        lastName: 'Güneş',
        email: 'selin@example.com',
        phone: '5554445566',
        birthDate: '1995-09-29',
        birthTime: '14:30',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Fatma',
        notes: '',
      }, 'OWNER_MANUAL');

      const res1 = calculateClientNumerology(client1);
      const res2 = calculateClientNumerology(client2);

      assert.strictEqual(res1.success, true);
      assert.strictEqual(res2.success, true);
      assert.ok(res1.numerology);
      assert.ok(res2.numerology);

      // İki danışanın sonuçları kaydedildiğinde izole olmalıdır
      saveClientNumerology(client1.id, res1.numerology);
      saveClientNumerology(client2.id, res2.numerology);

      const archive1 = getClientArchive(client1.id);
      const archive2 = getClientArchive(client2.id);

      const record1 = archive1?.analyses.find((a) => a.clientId === client1.id)?.numerology;
      const record2 = archive2?.analyses.find((a) => a.clientId === client2.id)?.numerology;

      assert.strictEqual(record1?.lifePathNumber, res1.numerology.lifePathNumber);
      assert.strictEqual(record2?.lifePathNumber, res2.numerology.lifePathNumber);

      // Danışan 1 sıfırlandığında Danışan 2 etkilenmemelidir
      clearClientNumerology(client1.id);

      const archive1After = getClientArchive(client1.id);
      const archive2After = getClientArchive(client2.id);

      const record1After = archive1After?.analyses.find((a) => a.clientId === client1.id)?.numerology;
      const record2After = archive2After?.analyses.find((a) => a.clientId === client2.id)?.numerology;

      assert.strictEqual(record1After, undefined);
      assert.strictEqual(record2After?.lifePathNumber, res2.numerology.lifePathNumber);
    });
  });

  describe('6. Eksik ve Hatalı Girdi Güvenliği', () => {
    it('Doğum tarihi eksik olduğunda hesaplama reddedilmelidir', () => {
      const clientWithoutDate: Client = {
        id: 'no_date',
        firstName: 'Mehmet',
        lastName: 'Yılmaz',
        email: 'm@example.com',
        phone: '555',
        birthDate: '',
        birthTime: '',
        isBirthTimeUnknown: true,
        birthLocation: mockLocation,
        motherName: 'Emine',
        notes: '',
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      };

      const res = calculateClientNumerology(clientWithoutDate);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.numerology, undefined);
    });

    it('Ad veya soyad eksik olduğunda hesaplama reddedilmelidir', () => {
      const clientWithoutName: Client = {
        id: 'no_name',
        firstName: '',
        lastName: '',
        email: 'x@example.com',
        phone: '555',
        birthDate: '1990-01-01',
        birthTime: '',
        isBirthTimeUnknown: true,
        birthLocation: mockLocation,
        motherName: 'Emine',
        notes: '',
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      };

      const res = calculateClientNumerology(clientWithoutName);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.numerology, undefined);
    });

    it('Geçersiz tarih formatında motor güvenli hata fırlatmalı veya reddetmelidir', () => {
      assert.throws(() => {
        calculateLifePathNumber('gecersiz-tarih');
      }, /Geçersiz doğum tarihi/);
    });
  });
});
