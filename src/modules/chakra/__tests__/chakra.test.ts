import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateChakraAnalysisFromNumerology,
} from '../chakraCalculationEngine';
import {
  prepareChakraModule,
  calculateClientChakra,
  getStoredChakraAnalysis,
} from '../chakraEngineAdapter';
import { CHAKRA_DEFINITIONS, CHAKRA_ORDER, CHAKRA_STATUS_CONFIG } from '../constants';
import { NumerologyAnalysis } from '../../../types/analysis';
import { Client } from '../../../types/client';
import { GlobalLocation } from '../../../types/location';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  saveClientChakra,
  clearClientChakra,
  saveClientNumerology,
  getClientArchive,
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

describe('A13: Çakra Modülü Doğrulama ve Entegrasyon Testleri', () => {
  describe('1. Çakra Hesaplama Motoru ve 7 Temel Çakra Akışı', () => {
    const sampleNumerology: NumerologyAnalysis = {
      lifePathNumber: 7,       // THIRD_EYE rezonansı
      destinyNumber: 1,        // SOLAR_PLEXUS rezonansı
      soulUrgeNumber: 9,       // CROWN rezonansı
      personalityNumber: 3,    // THROAT rezonansı
      birthdayNumber: 6,       // HEART rezonansı
      worldMissionNumber: 8,   // SOLAR_PLEXUS rezonansı
      karmicLessons: [4],      // ROOT (4) eksik -> Karmik Blokaj
      masterNumbers: [11],     // THIRD_EYE (11) ek katkı
    };

    it('Tam olarak 7 temel çakrayı doğru anatomik hiyerarşide üretmelidir', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      assert.ok(result);
      assert.strictEqual(result.chakras.length, 7);

      const returnedNames = result.chakras.map((c) => c.chakra);
      assert.deepStrictEqual(returnedNames, CHAKRA_ORDER);
    });

    it('Tüm çakra skorları 1 ile 10 arasında tam sayı olmalıdır', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      for (const state of result.chakras) {
        assert.ok(Number.isInteger(state.score), `Skor tam sayı olmalıdır: ${state.score}`);
        assert.ok(state.score >= 1 && state.score <= 10, `Skor [1, 10] aralığında olmalıdır: ${state.score}`);
      }
    });

    it('Yaşam Yolu ve Master sayı rezonansına sahip çakra yüksek akış/açık olmalıdır', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      // 7 ve 11 -> THIRD_EYE
      const thirdEye = result.chakras.find((c) => c.chakra === 'THIRD_EYE');
      assert.ok(thirdEye);
      assert.ok(thirdEye.score >= 8, `Üçüncü Göz skoru yüksek olmalıdır: ${thirdEye.score}`);
      assert.strictEqual(thirdEye.status, 'OVERACTIVE');
    });

    it('Karmik derse (eksik sayı) denk gelen çakra blokaj veya destek ihtiyacı olarak etiketlenmelidir', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      // 4 eksik -> ROOT
      const rootChakra = result.chakras.find((c) => c.chakra === 'ROOT');
      assert.ok(rootChakra);
      assert.ok(rootChakra.score <= 4, `Kök çakra skoru düşük olmalıdır: ${rootChakra.score}`);
      assert.ok(
        rootChakra.status === 'BLOCKED' || rootChakra.status === 'UNDERACTIVE',
        `Kök çakra durumu BLOCKED veya UNDERACTIVE olmalıdır: ${rootChakra.status}`
      );
      assert.strictEqual(result.primaryDeficit, 'ROOT');
    });

    it('Baskın çakra en yüksek skora sahip çakra olarak belirlenmelidir', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      assert.ok(result.dominantChakra);
      const dominantState = result.chakras.find((c) => c.chakra === result.dominantChakra);
      assert.ok(dominantState);

      for (const c of result.chakras) {
        assert.ok(dominantState.score >= c.score);
      }
    });

    it('Her çakra için dövme güçlendirici sembolizm önerileri üretilmelidir', () => {
      const result = calculateChakraAnalysisFromNumerology(sampleNumerology);

      for (const state of result.chakras) {
        assert.ok(Array.isArray(state.focusRecommendations));
        assert.ok(state.focusRecommendations.length > 0);
        assert.ok(state.focusRecommendations[0].length > 0);
      }
    });
  });

  describe('2. Durum Sınıflarının Korunması (Açık, Dengeli, Destek İhtiyacı / Blokaj)', () => {
    it('Durum sınıfları yalnızca BALANCED, UNDERACTIVE, OVERACTIVE veya BLOCKED olmalıdır', () => {
      const validStatuses = new Set(['BALANCED', 'UNDERACTIVE', 'OVERACTIVE', 'BLOCKED']);
      const numerology: NumerologyAnalysis = {
        lifePathNumber: 6,
        destinyNumber: 2,
        soulUrgeNumber: 4,
        personalityNumber: 5,
        birthdayNumber: 3,
        worldMissionNumber: 8,
        karmicLessons: [7, 9],
        masterNumbers: [],
      };

      const result = calculateChakraAnalysisFromNumerology(numerology);
      for (const s of result.chakras) {
        assert.ok(validStatuses.has(s.status), `Geçersiz durum: ${s.status}`);
        // Arayüz yapılandırmasının eşleştiğini doğrula
        const conf = CHAKRA_STATUS_CONFIG[s.status];
        assert.ok(conf, `Durum yapılandırması eksik: ${s.status}`);
        assert.ok(
          conf.categoryTr === 'Açık' ||
          conf.categoryTr === 'Dengeli' ||
          conf.categoryTr === 'Destek İhtiyacı / Blokaj'
        );
      }
    });
  });

  describe('3. Motor Adaptörü, Girdi Doğrulaması ve Danışan İzolasyonu', () => {
    it('Numeroloji analizi olmayan danışan için INPUTS_MISSING dönmelidir', () => {
      const clientWithoutNum = createClientRecord({
        firstName: 'Can',
        lastName: 'Demir',
        email: 'can.demir@example.com',
        phone: '+90 532 111 2233',
        birthDate: '1988-07-24',
        birthTime: '14:30',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Ayşe',
        notes: '',
      }, 'OWNER_MANUAL');

      const emptyArchive = getClientArchive(clientWithoutNum.id);
      const prep = prepareChakraModule(clientWithoutNum, emptyArchive);
      assert.strictEqual(prep.status, 'INPUTS_MISSING');
      assert.strictEqual(prep.hasNumerology, false);

      const calcRes = calculateClientChakra(clientWithoutNum, emptyArchive);
      assert.strictEqual(calcRes.success, false);
      assert.ok(calcRes.errorMessageTr?.includes('Numeroloji'));
    });

    it('Danışanın numerolojisi kaydedildiğinde READY_TO_RUN olmalıdır ve hesaplanmalıdır', () => {
      const clientA = createClientRecord({
        firstName: 'Bora',
        lastName: 'Yılmaz',
        email: 'bora.yilmaz@example.com',
        phone: '+90 532 222 3344',
        birthDate: '1990-05-15',
        birthTime: '11:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Emine',
        notes: '',
      }, 'OWNER_MANUAL');

      const sampleNumA: NumerologyAnalysis = {
        lifePathNumber: 3,
        destinyNumber: 5,
        soulUrgeNumber: 1,
        personalityNumber: 4,
        birthdayNumber: 6,
        worldMissionNumber: 8,
        karmicLessons: [7],
        masterNumbers: [],
      };

      saveClientNumerology(clientA.id, sampleNumA);
      const archiveA = getClientArchive(clientA.id);
      assert.ok(archiveA);

      const prep = prepareChakraModule(clientA, archiveA);
      assert.strictEqual(prep.status, 'READY_TO_RUN');
      assert.strictEqual(prep.hasNumerology, true);

      // Hesapla
      const calcRes = calculateClientChakra(clientA, archiveA);
      assert.strictEqual(calcRes.success, true);
      assert.ok(calcRes.chakra);
      assert.strictEqual(calcRes.chakra.chakras.length, 7);

      // Kaydet
      saveClientChakra(clientA.id, calcRes.chakra);
      const updatedArchiveA = getClientArchive(clientA.id);
      const prepCompleted = prepareChakraModule(clientA, updatedArchiveA);
      assert.strictEqual(prepCompleted.status, 'COMPLETED');

      // Doğrudan arşivden çek
      const stored = getStoredChakraAnalysis(updatedArchiveA, clientA.id);
      assert.ok(stored);
      assert.strictEqual(stored.chakras.length, 7);
    });

    it('Client A nın çakra kaydı Client B ye sızmamalı ve sıfırlama izole çalışmalıdır', () => {
      const clientA = createClientRecord({
        firstName: 'Kemal',
        lastName: 'Öztürk',
        email: 'kemal@example.com',
        phone: '+90 532 333 4455',
        birthDate: '1985-04-10',
        birthTime: '08:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Gül',
        notes: '',
      }, 'OWNER_MANUAL');

      const clientB = createClientRecord({
        firstName: 'Zeynep',
        lastName: 'Aydın',
        email: 'zeynep@example.com',
        phone: '+90 532 444 5566',
        birthDate: '1992-12-05',
        birthTime: '16:45',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Hatice',
        notes: '',
      }, 'OWNER_MANUAL');

      const sampleNumA: NumerologyAnalysis = {
        lifePathNumber: 1,
        destinyNumber: 8,
        soulUrgeNumber: 6,
        personalityNumber: 2,
        birthdayNumber: 1,
        worldMissionNumber: 9,
        karmicLessons: [4],
        masterNumbers: [],
      };

      saveClientNumerology(clientA.id, sampleNumA);
      const archiveA = getClientArchive(clientA.id);
      const calcResA = calculateClientChakra(clientA, archiveA);
      assert.strictEqual(calcResA.success, true);
      saveClientChakra(clientA.id, calcResA.chakra!);

      // Client B nin henüz çakra kaydı olmamalıdır
      const archiveB = getClientArchive(clientB.id);
      const storedB = getStoredChakraAnalysis(archiveB, clientB.id);
      assert.strictEqual(storedB, null);

      // Client A nın çakra kaydını sıfırla
      clearClientChakra(clientA.id);
      const archiveAAfterClear = getClientArchive(clientA.id);
      const storedAAfterClear = getStoredChakraAnalysis(archiveAAfterClear, clientA.id);
      assert.strictEqual(storedAAfterClear, null);

      // Numeroloji kaydının silinmediğini doğrula (modüller birbirinin verisini bozmaz)
      const clientAnalysis = archiveAAfterClear?.analyses.find((a) => a.clientId === clientA.id);
      assert.ok(clientAnalysis?.numerology);
      assert.strictEqual(clientAnalysis.numerology.lifePathNumber, 1);
    });
  });
});
