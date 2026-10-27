import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ENNEAGRAM_QUESTIONS,
  ENNEAGRAM_TYPES,
  evaluateEnneagramTest,
  TOTEM_QUESTIONS,
  TOTEM_ANIMALS,
  evaluateTotemTest,
  prepareTestsModule,
  runAndBuildEnneagramResult,
  runAndBuildTotemResult,
} from '../index';
import {
  createClientRecord,
  getClientArchive,
  saveClientTestResult,
  getClientTestResults,
  clearClientTestResult,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
} from '../../../store/storage';
import { Client } from '../../../types/client';
import { NumerologyAnalysis, ChakraAnalysis } from '../../../types/analysis';
import { calculateArchetypeAnalysis } from '../../archetype/archetypeCalculationEngine';
import { generateTattooRecipeFromAnalyses } from '../../recipe/recipeCalculationEngine';
import { recommendSymbolsForClient } from '../../symbols/symbolRecommendationEngine';

function createMockTestClient(nameSuffix: string, motherName: string = 'Emine'): Client {
  return createClientRecord(
    {
      firstName: `Banu_${nameSuffix}`,
      lastName: `Demir_${nameSuffix}`,
      email: `banu_${nameSuffix.toLowerCase()}@example.com`,
      phone: '5552223344',
      birthDate: '1992-09-21',
      birthTime: '14:15',
      isBirthTimeUnknown: false,
      birthLocation: {
        country: 'Türkiye',
        city: 'Ankara',
        placeName: 'Ankara, Türkiye',
        latitude: 39.9334,
        longitude: 32.8597,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
      motherName,
      notes: 'A18 Testi Danışanı',
    },
    'OWNER_MANUAL'
  );
}

// 15 Soruluk Enneagram Cevapları (Tip 4 ve Kanat 5 eğilimli)
function createFullEnneagramAnswers(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const q of ENNEAGRAM_QUESTIONS) {
    // Tip 4 veya 5 içeren şıkkı tercih et, yoksa ilk şıkkı seç
    const prefOpt =
      q.options.find((o) => o.associatedType === '4') ||
      q.options.find((o) => o.associatedType === '5') ||
      q.options[0];
    map[q.id] = prefOpt.id;
  }
  return map;
}

// 10 Soruluk Totem Cevapları (Kurt ve Şahin eğilimli)
function createFullTotemAnswers(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const q of TOTEM_QUESTIONS) {
    const prefOpt =
      q.options.find((o) => o.associatedType === 'Kurt') ||
      q.options.find((o) => o.associatedType === 'Şahin') ||
      q.options[0];
    map[q.id] = prefOpt.id;
  }
  return map;
}

describe('A18: Enneagram ve Hayvan Totemi Test Akışı Doğrulama Testleri', () => {
  // 1. Enneagram Soru Bütünlüğü ve Veri Yapısı (Kural 1)
  it('1. Enneagram testi tam olarak 15 gerçek soru ve 4 şıklı mizaç yapısıyla yapılandırılmış olmalıdır', () => {
    assert.strictEqual(ENNEAGRAM_QUESTIONS.length, 15, 'Enneagram testi tam 15 soru olmalıdır');
    for (const q of ENNEAGRAM_QUESTIONS) {
      assert.ok(q.id, 'Soru ID olmalıdır');
      assert.ok(q.questionTr && q.questionTr.length > 10, 'Soru Türkçe metin içermelidir');
      assert.strictEqual(q.options.length, 4, 'Her soru 4 şık içermelidir');
      for (const opt of q.options) {
        assert.ok(opt.id, 'Şık ID olmalıdır');
        assert.ok(opt.textTr, 'Şık metni olmalıdır');
        assert.ok(opt.associatedType, 'Şık Enneagram tipi ile eşleşmelidir');
        assert.ok(opt.weight > 0, 'Şık ağırlığı pozitif olmalıdır');
      }
    }
    assert.strictEqual(Object.keys(ENNEAGRAM_TYPES).length, 9, '9 Enneagram tipi tanımlı olmalıdır');
  });

  // 2. Hayvan Totemi Soru Bütünlüğü ve Veri Yapısı (Kural 2)
  it('2. Hayvan Totemi testi tam olarak 10 soru ve 4 şıklı yapılandırılmış olmalıdır', () => {
    assert.strictEqual(TOTEM_QUESTIONS.length, 10, 'Totem testi tam 10 soru olmalıdır');
    for (const q of TOTEM_QUESTIONS) {
      assert.ok(q.id, 'Soru ID olmalıdır');
      assert.ok(q.questionTr && q.questionTr.length > 10, 'Soru Türkçe metin içermelidir');
      assert.strictEqual(q.options.length, 4, 'Her soru 4 şık içermelidir');
      for (const opt of q.options) {
        assert.ok(opt.id, 'Şık ID olmalıdır');
        assert.ok(opt.textTr, 'Şık metni olmalıdır');
        assert.ok(opt.associatedType, 'Şık hayvan totemi ile eşleşmelidir');
        assert.ok(TOTEM_ANIMALS[opt.associatedType], 'Şık geçerli bir totem hayvanına işaret etmelidir');
      }
    }
    assert.ok(Object.keys(TOTEM_ANIMALS).length >= 8, 'En az 8 totem hayvanı tanımlı olmalıdır');
  });

  // 3. Eksik Cevap Güvenliği ve Sahte Sonuç Yasağı (Kural 7 & 8)
  it('3. Eksik zorunlu cevap olduğunda Enneagram ve Totem testleri sonuç üretmemeli, açık Türkçe hata vermelidir', () => {
    const partialEnneagram: Record<string, string> = {
      en_q1: 'en_q1_o1',
      en_q2: 'en_q2_o1',
    };

    assert.throws(
      () => evaluateEnneagramTest(partialEnneagram),
      /Enneagram testi tamamlanmadı/i,
      'Eksik sorularda Enneagram hata fırlatmalıdır'
    );

    const partialTotem: Record<string, string> = {
      tot_q1: 'tot_q1_o1',
    };

    assert.throws(
      () => evaluateTotemTest(partialTotem),
      /Totem testi tamamlanmadı/i,
      'Eksik sorularda Totem hata fırlatmalıdır'
    );
  });

  // 4. Enneagram Tip ve Kanat Hesaplama Doğruluğu (Kural 1 & 17)
  it('4. Enneagram testi doğru baskın tipi ve kanat eğilimini kesinlik iddiası olmadan hesaplamalıdır', () => {
    const fullAnswers = createFullEnneagramAnswers();
    const result = evaluateEnneagramTest(fullAnswers);

    assert.ok(result.primaryType, 'Birincil tip bulunmalıdır');
    assert.ok(result.secondaryType, 'Kanat (Wing) belirlenmelidir');
    assert.ok(result.dominantScores['Tip 4'] !== undefined, 'Skor tablosu 9 tipi içermelidir');
    assert.ok(result.interpretations.length >= 3, 'Türkçe yorumlar üretilmelidir');

    // Kural 17: Kesinlik iddiası yok, mizaç ve rezonans dili
    const joinedInterp = result.interpretations.join(' ');
    assert.ok(joinedInterp.includes('mizaç') || joinedInterp.includes('eğilim') || joinedInterp.includes('rezonans'));
    assert.ok(!joinedInterp.includes('kesin kader') && !joinedInterp.includes('değişmez lanet'));
  });

  // 5. Hayvan Totemi Hesaplama Doğruluğu ve Sembolizm (Kural 2 & 18)
  it('5. Hayvan Totemi testi ana rehber hayvanı ve elementini belirlemeli, Kural 18 tasarım uyarısını içermelidir', () => {
    const fullAnswers = createFullTotemAnswers();
    const result = evaluateTotemTest(fullAnswers);

    assert.ok(result.primaryType, 'Birincil totem hayvanı belirlenmelidir');
    assert.ok(TOTEM_ANIMALS[result.primaryType], 'Belirlenen hayvan meta tablosunda bulunmalıdır');
    assert.ok(result.interpretations.some((i) => i.includes('Tasarım Entegrasyon Notu')), 'Kural 18 entegrasyon notu bulunmalıdır');
  });

  // 6. Danışan İzolasyonu ve Kimlik Bağlantısı (Kural 6, 9 & 10)
  it('6. Test sonuçları doğru clientId ile kaydedilmeli ve farklı danışanlara asla sızmamalıdır', () => {
    const clientA = createMockTestClient('IsoA');
    const clientB = createMockTestClient('IsoB');

    const ennResultA = runAndBuildEnneagramResult(clientA, null, createFullEnneagramAnswers());
    saveClientTestResult(clientA.id, ennResultA);

    const testsA = getClientTestResults(clientA.id);
    const testsB = getClientTestResults(clientB.id);

    assert.strictEqual(testsA.length, 1, 'Client A 1 teste sahip olmalıdır');
    assert.strictEqual(testsA[0].clientId, clientA.id);
    assert.strictEqual(testsB.length, 0, 'Client B hiçbir teste sahip olmamalıdır');

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);
    assert.strictEqual(archiveA?.testResults.length, 1);
    assert.strictEqual(archiveB?.testResults.length, 0);
  });

  // 7. Testlerin Birbirini Etkilememesi ve Bağımsız Sıfırlama (Kural 11, 12 & 13)
  it('7. Enneagram ve Totem birbirinin sonucunu değiştirmemeli; test sıfırlama diğer testleri ve analizleri silmemelidir', () => {
    const client = createMockTestClient('Reset');

    // Numeroloji ve Çakra ekleyelim
    saveClientNumerology(client.id, {
      lifePathNumber: 4,
      destinyNumber: 5,
      soulUrgeNumber: 9,
      personalityNumber: 5,
      birthdayNumber: 3,
      worldMissionNumber: 4,
      karmicLessons: [],
      masterNumbers: [],
    });

    saveClientChakra(client.id, {
      chakras: [],
      dominantChakra: 'ROOT',
      primaryDeficit: 'HEART',
    });

    // Enneagram ve Totem testlerini kaydedelim
    const ennResult = runAndBuildEnneagramResult(client, null, createFullEnneagramAnswers());
    saveClientTestResult(client.id, ennResult);

    const totResult = runAndBuildTotemResult(client, null, createFullTotemAnswers());
    saveClientTestResult(client.id, totResult);

    let archive = getClientArchive(client.id);
    assert.strictEqual(archive?.testResults.length, 2, '2 test kaydedilmiş olmalıdır');

    // SADECE Enneagram'ı sıfırla
    clearClientTestResult(client.id, 'ENNEAGRAM');

    archive = getClientArchive(client.id);
    assert.strictEqual(archive?.testResults.length, 1, 'Enneagram silinmeli, Totem kalmalıdır');
    assert.strictEqual(archive?.testResults[0].testType, 'ANIMAL_TOTEM');

    // Numeroloji ve Çakra analizlerinin KESİNLİKLE silinmediğini doğrula
    assert.ok(archive?.analyses[0].numerology, 'Numeroloji analizi silinmemelidir');
    assert.ok(archive?.analyses[0].chakra, 'Çakra analizi silinmemelidir');
  });

  // 8. Kalıcılık, Sayfa Yenileme ve Versiyonlama (Kural 14, 15 & 18)
  it('8. Test sonuçları depolamada kalıcı olmalı, yeni versiyon üretildiğinde önceki versiyon korunmalıdır', () => {
    const client = createMockTestClient('Vers');

    const v1 = runAndBuildEnneagramResult(client, null, createFullEnneagramAnswers());
    assert.strictEqual(v1.version, 1, 'İlk versiyon V1 olmalıdır');
    saveClientTestResult(client.id, v1);

    const archive1 = getClientArchive(client.id);
    const v2 = runAndBuildEnneagramResult(client, archive1, createFullEnneagramAnswers());
    assert.strictEqual(v2.version, 2, 'İkinci versiyon V2 olmalıdır');
    saveClientTestResult(client.id, v2);

    const prep = prepareTestsModule(client, getClientArchive(client.id));
    assert.strictEqual(prep.hasEnneagram, true);
    assert.strictEqual(prep.enneagramResult?.version, 2, 'prepareTestsModule en güncel versiyonu (V2) getirmelidir');
  });

  // 9. Arketip ve Reçete / Sembol Entegrasyonu (Kural 9 & 10)
  it('9. Enneagram ve Totem sonuçları Arketip, Reçete ve Sembol Motoruna doğru şekilde entegre olmalıdır', () => {
    const client = createMockTestClient('Integ');

    const num: NumerologyAnalysis = {
      lifePathNumber: 1,
      destinyNumber: 4,
      soulUrgeNumber: 5,
      personalityNumber: 8,
      birthdayNumber: 3,
      worldMissionNumber: 1,
      karmicLessons: [],
      masterNumbers: [],
    };

    const chakra: ChakraAnalysis = {
      chakras: [
        { chakra: 'ROOT', status: 'BLOCKED', score: 3, focusRecommendations: ['Küp'] },
        { chakra: 'THIRD_EYE', status: 'OVERACTIVE', score: 9, focusRecommendations: ['Üçüncü Göz'] },
      ],
      dominantChakra: 'THIRD_EYE',
      primaryDeficit: 'ROOT',
    };

    const ennResult = runAndBuildEnneagramResult(client, null, createFullEnneagramAnswers());
    const totResult = runAndBuildTotemResult(client, null, createFullTotemAnswers());

    // 1. Arketip Entegrasyonu: Enneagram tipi ikincil unvana zenginlik katar
    const archetype = calculateArchetypeAnalysis(num, chakra, ennResult);
    assert.ok(
      archetype.unifiedArchetype.secondary.includes(ennResult.primaryType),
      'Arketip analizi Enneagram tipini taşımalıdır'
    );

    // 2. Reçete Entegrasyonu
    const design = generateTattooRecipeFromAnalyses({
      client,
      astrology: null,
      numerology: num,
      chakra,
      archetype,
      testResults: [ennResult, totResult],
      nextVersionNumber: 1,
    });

    assert.ok(design.recipe, 'Reçete üretilmelidir');
    assert.ok(design.conceptStatement.includes(ennResult.primaryType), 'Konsept manifestosu Enneagram tipini yansıtmalıdır');
    assert.ok(design.recipe.totemAbstractionNotes?.includes(totResult.primaryType), 'Reçete totem notunu yansıtmalıdır');

    // 3. Sembol Kütüphanesi Entegrasyonu:
    const symbols = recommendSymbolsForClient({
      numerology: num,
      chakra,
      archetype,
      astrology: null,
      testResults: [ennResult, totResult],
      motherName: client.motherName,
      options: { includeTotemInVisual: true },
    });

    assert.ok(symbols.length > 0, 'Semboller önerilmelidir');
  });
});
