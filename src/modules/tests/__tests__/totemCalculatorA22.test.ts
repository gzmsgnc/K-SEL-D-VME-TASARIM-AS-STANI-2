import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TOTEM_ANIMALS,
  TOTEM_QUESTIONS,
  evaluateTotemTest,
} from '../totemData';
import { runAndBuildTotemResult } from '../testEngineAdapter';
import {
  evaluateTotemTest as utilEvaluateTotemTest,
  runAndBuildTotemResult as utilRunAndBuildTotemResult,
} from '../../../utils/totemCalculator';
import {
  createClientRecord,
  saveClientTestResult,
  getClientArchive,
  deleteClientRecord,
} from '../../../store/storage';
import { Client } from '../../../types/client';

describe('A22: Totem Hesaplama Motoru Doğrulama Testleri', () => {
  // Yardımcı: Belirli bir hayvana odaklı 10 soruluk cevap seti üretici
  function createTargetedAnswers(targetAnimal: string): Record<string, string> {
    const answers: Record<string, string> = {};
    for (const q of TOTEM_QUESTIONS) {
      // Hedef hayvanın olduğu şıkkı bul
      const matched = q.options.find((opt) => opt.associatedType === targetAnimal);
      if (matched) {
        answers[q.id] = matched.id;
      } else {
        // Hedef hayvan yoksa nötr/başka bir ilk şıkkı seç
        answers[q.id] = q.options[0].id;
      }
    }
    return answers;
  }

  function createMockTestClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `Totem_${suffix}`,
        lastName: `Danisan_${suffix}`,
        email: `totem_${suffix.toLowerCase()}@example.com`,
        phone: '5551112233',
        birthDate: '1993-04-12',
        birthTime: '11:00',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'İzmir',
          placeName: 'İzmir, Türkiye',
          latitude: 38.4237,
          longitude: 27.1428,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Zeynep',
        notes: 'A22 Test Danışanı',
      },
      'OWNER_MANUAL'
    );
  }

  // 1. Soru, Cevap, Puanlama ve Sıralama Mantığı
  it('1. Soru, cevap, puanlama ve sıralama mantığı eksiksiz ve tutarlı olmalıdır', () => {
    assert.strictEqual(TOTEM_QUESTIONS.length, 10, 'Totem testi tam 10 sorudan oluşmalıdır');
    for (const q of TOTEM_QUESTIONS) {
      assert.strictEqual(q.options.length, 4, `Soru ${q.order} tam 4 şık içermelidir`);
      for (const opt of q.options) {
        assert.ok(opt.id, 'Şık id tanımlı olmalıdır');
        assert.ok(opt.textTr, 'Şık metni tanımlı olmalıdır');
        assert.ok(opt.associatedType, 'Şık ilişkili hayvanı belirtmelidir');
        assert.ok(TOTEM_ANIMALS[opt.associatedType], 'İlişkili hayvan TOTEM_ANIMALS listesinde olmalıdır');
        assert.strictEqual(opt.weight, 3, 'Şık ağırlığı 3 puan olmalıdır');
      }
    }
  });

  // 2. Sabit veya Varsayılan Hayvan Atanmama Doğrulaması
  it('2. Sabit/varsayılan hayvan atanmamalı; farklı cevaplar farklı baskın totemleri üretmelidir', () => {
    const animalsToTest = ['Kurt', 'Şahin', 'Ayı', 'Baykuş', 'Yılan', 'Geyik', 'Jaguar', 'Kartal', 'Yunus'];
    const results = new Set<string>();

    for (const animal of animalsToTest) {
      const answers = createTargetedAnswers(animal);
      const evalResult = evaluateTotemTest(answers);
      assert.strictEqual(
        evalResult.primaryType,
        animal,
        `${animal} odaklı cevaplar verildiğinde sonuç ${animal} olmalıdır`
      );
      results.add(evalResult.primaryType);
    }

    // Hiçbir sonucun tek bir varsayılana takılı kalmadığını teyit et
    assert.strictEqual(results.size, animalsToTest.length, 'Tüm 9 totem hayvanı kendi cevaplarıyla bağımsız üretilebilmelidir');
  });

  // 3. Danışan İzolasyonu ve Veri Ayrımı
  it('3. Danışan A nın cevapları Danışan B nin sonucunu veya arşivini asla etkilememelidir', () => {
    const clientA = createMockTestClient('IsoA');
    const clientB = createMockTestClient('IsoB');

    try {
      const answersA = createTargetedAnswers('Kurt');
      const answersB = createTargetedAnswers('Kartal');

      const resultA = runAndBuildTotemResult(clientA, null, answersA);
      const resultB = runAndBuildTotemResult(clientB, null, answersB);

      assert.strictEqual(resultA.primaryType, 'Kurt');
      assert.strictEqual(resultB.primaryType, 'Kartal');
      assert.strictEqual(resultA.clientId, clientA.id);
      assert.strictEqual(resultB.clientId, clientB.id);

      saveClientTestResult(clientA.id, resultA);
      saveClientTestResult(clientB.id, resultB);

      const archiveA = getClientArchive(clientA.id);
      const archiveB = getClientArchive(clientB.id);

      assert.ok(archiveA, 'Danışan A arşivi mevcut olmalıdır');
      assert.ok(archiveB, 'Danışan B arşivi mevcut olmalıdır');

      // Danışan A'da sadece kendi testi olmalı
      assert.strictEqual(archiveA.testResults.length, 1);
      assert.strictEqual(archiveA.testResults[0].clientId, clientA.id);
      assert.strictEqual(archiveA.testResults[0].primaryType, 'Kurt');

      // Danışan B'de sadece kendi testi olmalı
      assert.strictEqual(archiveB.testResults.length, 1);
      assert.strictEqual(archiveB.testResults[0].clientId, clientB.id);
      assert.strictEqual(archiveB.testResults[0].primaryType, 'Kartal');
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 4. Eksik ve Geçersiz Cevap Güvenliği
  it('4. Eksik veya geçersiz cevaplarda geçerli sonuç varmış gibi davranılmamalı, Türkçe hata fırlatılmalıdır', () => {
    // a. Hiçbir cevap verilmediğinde
    assert.throws(
      () => evaluateTotemTest({}),
      /Totem testi tamamlanmadı/i,
      'Boş cevap seti hata fırlatmalıdır'
    );

    // b. 9 soru cevaplanıp 10. soru eksik bırakıldığında
    const almostFull = createTargetedAnswers('Kurt');
    delete almostFull['tot_q10'];
    assert.throws(
      () => evaluateTotemTest(almostFull),
      /Lütfen eksik soruları \(10\) cevaplayınız/i,
      'Eksik soru numarası hata mesajında açıkça belirtilmelidir'
    );

    // c. Geçersiz veya uydurma şık ID si verildiğinde
    const invalidAnswers = createTargetedAnswers('Kurt');
    invalidAnswers['tot_q1'] = 'gecersiz_sik_id';
    assert.throws(
      () => evaluateTotemTest(invalidAnswers),
      /Lütfen eksik soruları \(1\) cevaplayınız/i,
      'Geçersiz şık verildiğinde sahte sonuç üretilmemeli, eksik soru olarak yakalanmalıdır'
    );

    // d. Boş string verildiğinde
    const emptyAnswer = createTargetedAnswers('Kurt');
    emptyAnswer['tot_q5'] = '';
    assert.throws(
      () => evaluateTotemTest(emptyAnswer),
      /Lütfen eksik soruları \(5\) cevaplayınız/i,
      'Boş string cevap eksik kabul edilmelidir'
    );
  });

  // 5. Eşit Puanlar ve Sınır Durumlarında Deterministik Kural
  it('5. Eşit puan durumlarında tekrarlanabilir, kararlı ve deterministik sıralama kuralı uygulanmalıdır', () => {
    // Eşit puan senaryosu:
    // Kurt ve Şahin eşit puan alacak şekilde bir cevap kombinasyonu kurgulayalım
    // Kurt: q1, q2 (2 x 3 = 6 puan)
    // Şahin: q3, q7 (2 x 3 = 6 puan)
    // Diğer sorular farklı hayvanlara dağıtılmış (her biri 3 puan)
    const tiedAnswers: Record<string, string> = {
      tot_q1: 'tot_q1_o1', // Kurt (+3)
      tot_q2: 'tot_q2_o1', // Kurt (+3) -> Kurt toplam 6
      tot_q3: 'tot_q3_o3', // Şahin (+3)
      tot_q4: 'tot_q4_o1', // Yılan (+3)
      tot_q5: 'tot_q5_o4', // Yunus (+3)
      tot_q6: 'tot_q6_o2', // Geyik (+3)
      tot_q7: 'tot_q7_o2', // Şahin (+3) -> Şahin toplam 6
      tot_q8: 'tot_q8_o1', // Baykuş (+3)
      tot_q9: 'tot_q9_o2', // Ayı (+3)
      tot_q10: 'tot_q10_o1', // Jaguar (+3)
    };

    // Kurt (6) ve Şahin (6) eşit. Türkçe alfabetik kurala göre 'Kurt' (K), 'Şahin' (Ş)'den önce gelir.
    const run1 = evaluateTotemTest(tiedAnswers);
    assert.strictEqual(run1.dominantScores['Kurt'], 6);
    assert.strictEqual(run1.dominantScores['Şahin'], 6);
    assert.strictEqual(run1.primaryType, 'Kurt');
    assert.strictEqual(run1.secondaryType, 'Şahin');

    // Arka arkaya 30 kez çalıştırarak determinizmi kanıtla
    for (let i = 0; i < 30; i++) {
      const run = evaluateTotemTest(tiedAnswers);
      assert.strictEqual(run.primaryType, 'Kurt', 'Deterministik birincil hayvan her çalıştırmada aynı olmalıdır');
      assert.strictEqual(run.secondaryType, 'Şahin', 'Deterministik ikincil hayvan her çalıştırmada aynı olmalıdır');
    }
  });

  // 6. src/utils/totemCalculator.ts ve modül uyumu
  it('6. src/utils/totemCalculator.ts adaptörü mevcut motorla birebir aynı deterministik sonuçları vermelidir', () => {
    const answers = createTargetedAnswers('Baykuş');
    const directResult = evaluateTotemTest(answers);
    const utilResult = utilEvaluateTotemTest(answers);

    assert.strictEqual(utilResult.primaryType, directResult.primaryType);
    assert.strictEqual(utilResult.secondaryType, directResult.secondaryType);
    assert.deepStrictEqual(utilResult.dominantScores, directResult.dominantScores);
    assert.deepStrictEqual(utilResult.interpretations, directResult.interpretations);

    const client = createMockTestClient('UtilCheck');
    try {
      const resultDirect = runAndBuildTotemResult(client, null, answers);
      const resultUtil = utilRunAndBuildTotemResult(client, null, answers);
      assert.strictEqual(resultDirect.primaryType, resultUtil.primaryType);
      assert.strictEqual(resultDirect.clientId, resultUtil.clientId);
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
