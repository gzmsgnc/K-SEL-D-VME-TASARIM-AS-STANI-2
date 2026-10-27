import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateArchetypeAnalysis } from '../archetypeCalculationEngine';
import {
  prepareArchetypeModule,
  calculateClientArchetype,
  getStoredArchetypeAnalysis,
} from '../archetypeEngineAdapter';
import { ARCHETYPE_DEFINITIONS, CHAKRA_SHADOW_MAP } from '../constants';
import { NumerologyAnalysis, ChakraAnalysis } from '../../../types/analysis';
import { ClientTestResult } from '../../../types/test';
import { GlobalLocation } from '../../../types/location';
import {
  createClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  clearClientArchetype,
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

describe('A14: Arketip Modülü Doğrulama ve Entegrasyon Testleri', () => {
  describe('1. Arketip Hesaplama Motoru ve Dinamik Sentez', () => {
    const sampleNumerology: NumerologyAnalysis = {
      lifePathNumber: 7,       // 'Mistik / Bilge'
      destinyNumber: 1,        // 'Savaşçı / Öncü'
      soulUrgeNumber: 3,       // 'Sanatçı / Yaratıcı'
      personalityNumber: 4,
      birthdayNumber: 7,
      worldMissionNumber: 8,
      karmicLessons: [4],
      masterNumbers: [],
    };

    const sampleChakra: ChakraAnalysis = {
      chakras: [
        { chakra: 'ROOT', status: 'BLOCKED', score: 3, focusRecommendations: ['Küp'] },
        { chakra: 'SACRAL', status: 'BALANCED', score: 6, focusRecommendations: ['Hilal'] },
        { chakra: 'SOLAR_PLEXUS', status: 'BALANCED', score: 7, focusRecommendations: ['Güneş'] },
        { chakra: 'HEART', status: 'BALANCED', score: 6, focusRecommendations: ['Heksagram'] },
        { chakra: 'THROAT', status: 'BALANCED', score: 6, focusRecommendations: ['Triskele'] },
        { chakra: 'THIRD_EYE', status: 'OVERACTIVE', score: 9, focusRecommendations: ['Üçüncü Göz'] },
        { chakra: 'CROWN', status: 'BALANCED', score: 6, focusRecommendations: ['Lotus'] },
      ],
      dominantChakra: 'THIRD_EYE',
      primaryDeficit: 'ROOT',
    };

    it('Yaşam Yolu ve Kader sayılarına göre Birincil ve İkincil arketipleri doğru eşlemelidir', () => {
      const result = calculateArchetypeAnalysis(sampleNumerology, sampleChakra);

      assert.ok(result);
      assert.ok(result.unifiedArchetype);
      assert.strictEqual(result.unifiedArchetype.primary, 'Mistik / Bilge');
      assert.strictEqual(result.unifiedArchetype.secondary, 'Savaşçı / Öncü');
      assert.ok(result.unifiedArchetype.description.includes('Mistik / Bilge'));
      assert.ok(result.unifiedArchetype.description.includes('Savaşçı / Öncü'));
    });

    it('Çakradaki öncelikli blokaj (primaryDeficit) üzerinden doğru Gölge Arketip türetmelidir', () => {
      const result = calculateArchetypeAnalysis(sampleNumerology, sampleChakra);

      assert.ok(result.shadowArchetype);
      // ROOT deficit -> CHAKRA_SHADOW_MAP['ROOT']
      const expectedShadow = CHAKRA_SHADOW_MAP['ROOT'];
      assert.strictEqual(result.shadowArchetype.shadowName, expectedShadow.shadowName);
      assert.strictEqual(result.shadowArchetype.transformationalSymbol, expectedShadow.transformationalSymbol);
    });

    it('Kader sayısı Yaşam Yolu ile aynı olduğunda Ruh Arzusu sayısını ikincil arketip olarak almalıdır', () => {
      const sameNum: NumerologyAnalysis = {
        ...sampleNumerology,
        lifePathNumber: 7,
        destinyNumber: 7, // Yaşam Yolu ile aynı
        soulUrgeNumber: 3, // 'Sanatçı / Yaratıcı'
      };

      const result = calculateArchetypeAnalysis(sameNum, sampleChakra);
      assert.strictEqual(result.unifiedArchetype.primary, 'Mistik / Bilge');
      assert.strictEqual(result.unifiedArchetype.secondary, 'Sanatçı / Yaratıcı');
    });

    it('Enneagram testi mevcutsa ikincil arketip unvanına derin psikolojik katkı eklenmelidir', () => {
      const enneagramTest: ClientTestResult = {
        id: 'test_enn_1',
        clientId: 'client_sample',
        testType: 'ENNEAGRAM',
        version: 1,
        completedAt: new Date().toISOString(),
        answers: [],
        primaryType: 'Tip 5 - Araştırmacı',
        dominantScores: { '5': 18 },
        interpretations: ['Zihinsel derinlik'],
      };

      const result = calculateArchetypeAnalysis(sampleNumerology, sampleChakra, enneagramTest);
      assert.ok(result.unifiedArchetype.secondary.includes('Tip 5 - Araştırmacı'));
    });

    it('Eksik girdi durumunda hata fırlatmalıdır', () => {
      assert.throws(() => {
        calculateArchetypeAnalysis(null as any, sampleChakra);
      }, /Numeroloji matrisi/);

      assert.throws(() => {
        calculateArchetypeAnalysis(sampleNumerology, null as any);
      }, /Çakra analizi/);
    });
  });

  describe('2. Motor Adaptörü, Girdi Doğrulaması ve Danışan İzolasyonu', () => {
    it('Numeroloji veya Çakra eksik olduğunda INPUTS_MISSING dönmelidir', () => {
      const client = createClientRecord({
        firstName: 'Derya',
        lastName: 'Aksoy',
        email: 'derya@example.com',
        phone: '5551112233',
        birthDate: '1991-03-20',
        birthTime: '12:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Sevgi',
        notes: '',
      }, 'OWNER_MANUAL');

      const archive = getClientArchive(client.id);
      const prep = prepareArchetypeModule(client, archive);
      assert.strictEqual(prep.status, 'INPUTS_MISSING');
      assert.strictEqual(prep.hasNumerology, false);
      assert.strictEqual(prep.hasChakra, false);

      const calc = calculateClientArchetype(client, archive);
      assert.strictEqual(calc.success, false);
      assert.ok(calc.errorMessageTr?.includes('Numeroloji'));
    });

    it('Girdiler tamamlandığında READY_TO_RUN olmalı, hesaplanıp kaydedilebilmelidir', () => {
      const clientA = createClientRecord({
        firstName: 'Sarp',
        lastName: 'Eren',
        email: 'sarp@example.com',
        phone: '5552223344',
        birthDate: '1989-08-14',
        birthTime: '15:20',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Nermin',
        notes: '',
      }, 'OWNER_MANUAL');

      const clientB = createClientRecord({
        firstName: 'Aslı',
        lastName: 'Kaya',
        email: 'asli@example.com',
        phone: '5553334455',
        birthDate: '1994-01-22',
        birthTime: '09:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        motherName: 'Gülseren',
        notes: '',
      }, 'OWNER_MANUAL');

      const numA: NumerologyAnalysis = {
        lifePathNumber: 1, // Savaşçı / Öncü
        destinyNumber: 8,  // Hükümdar / Büyücü
        soulUrgeNumber: 5,
        personalityNumber: 3,
        birthdayNumber: 5,
        worldMissionNumber: 9,
        karmicLessons: [7],
        masterNumbers: [],
      };

      const chakraA: ChakraAnalysis = {
        chakras: [
          { chakra: 'ROOT', status: 'BALANCED', score: 6, focusRecommendations: [] },
          { chakra: 'SACRAL', status: 'BALANCED', score: 6, focusRecommendations: [] },
          { chakra: 'SOLAR_PLEXUS', status: 'OVERACTIVE', score: 9, focusRecommendations: [] },
          { chakra: 'HEART', status: 'BALANCED', score: 6, focusRecommendations: [] },
          { chakra: 'THROAT', status: 'BALANCED', score: 6, focusRecommendations: [] },
          { chakra: 'THIRD_EYE', status: 'BLOCKED', score: 2, focusRecommendations: [] },
          { chakra: 'CROWN', status: 'BALANCED', score: 6, focusRecommendations: [] },
        ],
        dominantChakra: 'SOLAR_PLEXUS',
        primaryDeficit: 'THIRD_EYE',
      };

      saveClientNumerology(clientA.id, numA);
      saveClientChakra(clientA.id, chakraA);

      const archiveA = getClientArchive(clientA.id);
      const prepA = prepareArchetypeModule(clientA, archiveA);
      assert.strictEqual(prepA.status, 'READY_TO_RUN');
      assert.strictEqual(prepA.hasNumerology, true);
      assert.strictEqual(prepA.hasChakra, true);

      // Hesapla
      const calcRes = calculateClientArchetype(clientA, archiveA);
      assert.strictEqual(calcRes.success, true);
      assert.ok(calcRes.archetype);
      assert.strictEqual(calcRes.archetype.unifiedArchetype.primary, 'Savaşçı / Öncü');
      assert.strictEqual(calcRes.archetype.unifiedArchetype.secondary, 'Hükümdar / Büyücü');
      assert.strictEqual(calcRes.archetype.shadowArchetype.shadowName, CHAKRA_SHADOW_MAP['THIRD_EYE'].shadowName);

      // Kaydet
      saveClientArchetype(clientA.id, calcRes.archetype);
      const updatedArchiveA = getClientArchive(clientA.id);
      const prepCompleted = prepareArchetypeModule(clientA, updatedArchiveA);
      assert.strictEqual(prepCompleted.status, 'COMPLETED');

      // Client B'nin arketip kaydı boş olmalıdır
      const archiveB = getClientArchive(clientB.id);
      const storedB = getStoredArchetypeAnalysis(archiveB, clientB.id);
      assert.strictEqual(storedB, null);

      // Client A sıfırlandığında sadece arketip silinmelidir, numeroloji ve çakra korunmalıdır
      clearClientArchetype(clientA.id);
      const clearedArchiveA = getClientArchive(clientA.id);
      const storedACleared = getStoredArchetypeAnalysis(clearedArchiveA, clientA.id);
      assert.strictEqual(storedACleared, null);

      const analysisRecordA = clearedArchiveA?.analyses.find((a) => a.clientId === clientA.id);
      assert.ok(analysisRecordA?.numerology);
      assert.strictEqual(analysisRecordA.numerology.lifePathNumber, 1);
      assert.ok(analysisRecordA?.chakra);
      assert.strictEqual(analysisRecordA.chakra.dominantChakra, 'SOLAR_PLEXUS');
    });
  });
});
