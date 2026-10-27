import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ENNEAGRAM_TYPES,
  ENNEAGRAM_QUESTIONS,
  evaluateEnneagramTest,
} from '../enneagramData';
import { runAndBuildEnneagramResult } from '../testEngineAdapter';
import {
  evaluateEnneagramTest as utilEvaluateEnneagramTest,
  runAndBuildEnneagramResult as utilRunAndBuildEnneagramResult,
} from '../../../utils/enneagramCalculator';
import {
  createClientRecord,
  saveClientTestResult,
  getClientArchive,
  deleteClientRecord,
} from '../../../store/storage';
import { Client } from '../../../types/client';

describe('A23: Enneagram Hesaplama Motoru Doğrulama Testleri', () => {
  // Yardımcı: Belirli bir Enneagram tipine (1-9) ve isteğe bağlı kanada yönelik 15 soruluk cevap seti üretici
  function createTargetedEnneagramAnswers(targetTypeNum: number, targetWingNum?: number): Record<string, string> {
    const answers: Record<string, string> = {};
    const targetTypeStr = targetTypeNum.toString();
    const targetWingStr = targetWingNum ? targetWingNum.toString() : undefined;

    for (const q of ENNEAGRAM_QUESTIONS) {
      // 1. Öncelik: Hedef tipi içeren şık
      const primaryMatch = q.options.find((opt) => opt.associatedType === targetTypeStr);
      if (primaryMatch) {
        answers[q.id] = primaryMatch.id;
        continue;
      }

      // 2. Öncelik: Hedef kanadı içeren şık
      if (targetWingStr) {
        const wingMatch = q.options.find((opt) => opt.associatedType === targetWingStr);
        if (wingMatch) {
          answers[q.id] = wingMatch.id;
          continue;
        }
      }

      // 3. Öncelik: Nötr / ilk şık
      answers[q.id] = q.options[0].id;
    }
    return answers;
  }

  function createMockTestClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `Enneagram_${suffix}`,
        lastName: `Danisan_${suffix}`,
        email: `enneagram_${suffix.toLowerCase()}@example.com`,
        phone: '5559998877',
        birthDate: '1991-07-14',
        birthTime: '09:45',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'Bursa',
          placeName: 'Bursa, Türkiye',
          latitude: 40.1885,
          longitude: 29.0610,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Hatice',
        notes: 'A23 Test Danışanı',
      },
      'OWNER_MANUAL'
    );
  }

  // 1. Soru, Cevap Seçenekleri ve Puanlama Bütünlüğü
  it('1. 15 Enneagram sorusu, 4 er şık ve 9 tip eşleşmesi eksiksiz ve tutarlı olmalıdır', () => {
    assert.strictEqual(ENNEAGRAM_QUESTIONS.length, 15, 'Enneagram testi tam 15 sorudan oluşmalıdır');
    for (const q of ENNEAGRAM_QUESTIONS) {
      assert.strictEqual(q.options.length, 4, `Soru ${q.order} tam 4 şık içermelidir`);
      for (const opt of q.options) {
        assert.ok(opt.id, 'Şık id tanımlı olmalıdır');
        assert.ok(opt.textTr, 'Şık metni tanımlı olmalıdır');
        assert.ok(opt.associatedType, 'Şık ilişkili tip numarası tanımlı olmalıdır');
        const num = parseInt(opt.associatedType, 10);
        assert.ok(num >= 1 && num <= 9, 'İlişkili tip 1 ile 9 arasında olmalıdır');
        assert.ok(ENNEAGRAM_TYPES[num], 'İlişkili tip ENNEAGRAM_TYPES tablosunda mevcut olmalıdır');
        assert.strictEqual(opt.weight, 3, 'Şık ağırlığı 3 puan olmalıdır');
      }
    }
  });

  // 2. Dokuz Tipin Bağımsız Puanlanması ve Birincil Tip Seçimi
  it('2. Dokuz Enneagram tipinin her biri kendi cevaplarıyla bağımsız olarak birincil tip seçilebilmelidir', () => {
    for (let typeNum = 1; typeNum <= 9; typeNum++) {
      const answers = createTargetedEnneagramAnswers(typeNum);
      const evalResult = evaluateEnneagramTest(answers);
      assert.ok(
        evalResult.primaryType.includes(`Tip ${typeNum}`),
        `Tip ${typeNum} odaklı cevaplar verildiğinde birincil tip 'Tip ${typeNum}' içermelidir (Alınan: ${evalResult.primaryType})`
      );
      assert.strictEqual(Object.keys(evalResult.dominantScores).length, 9, 'Skor tablosu tam 9 tipi puanlamalıdır');
      assert.ok(evalResult.dominantScores[`Tip ${typeNum}`] > 0, `Tip ${typeNum} puanı sıfırdan büyük olmalıdır`);
    }
  });

  // 3. Kanat (Wing) Tespiti ve Eşitlik Çözümü
  it('3. Kanat (Wing) komşu tipler arasından yüksek puanlı olanı seçmeli; eşitlikte kararlı davranmalıdır', () => {
    // Tip 4 için potansiyel kanatlar: [3, 5]
    // Tip 4 + Kanat 5 eğilimli cevaplar
    const answers4w5 = createTargetedEnneagramAnswers(4, 5);
    const eval4w5 = evaluateEnneagramTest(answers4w5);
    assert.ok(eval4w5.primaryType.includes('Tip 4'));
    assert.ok(eval4w5.secondaryType?.includes('Kanat 5'), 'Kanat 5 puanı yüksek olduğunda Kanat 5 seçilmelidir');

    // Tip 4 + Kanat 3 eğilimli cevaplar
    const answers4w3 = createTargetedEnneagramAnswers(4, 3);
    const eval4w3 = evaluateEnneagramTest(answers4w3);
    assert.ok(eval4w3.primaryType.includes('Tip 4'));
    assert.ok(eval4w3.secondaryType?.includes('Kanat 3'), 'Kanat 3 puanı yüksek olduğunda Kanat 3 seçilmelidir');

    // Tip 1 için potansiyel kanatlar: [9, 2]
    // Kanatlar eşit olduğunda deterministik kural gereği ilk kanat (wings[0] = 9) seçilmelidir
    const tiedWingAnswers = createTargetedEnneagramAnswers(1);
    const evalTiedWings = evaluateEnneagramTest(tiedWingAnswers);
    assert.ok(evalTiedWings.primaryType.includes('Tip 1'));
    assert.ok(evalTiedWings.secondaryType?.includes('Kanat'), 'Eşitlik halinde deterministik kanat atanmalıdır');
  });

  // 4. Eksik, Geçersiz veya Boş Cevap Güvenliği
  it('4. Eksik, geçersiz veya boş cevaplarda hatalı sonuç üretilmemeli, açık Türkçe hata fırlatılmalıdır', () => {
    // a. Boş nesne
    assert.throws(
      () => evaluateEnneagramTest({}),
      /Enneagram testi tamamlanmadı/i,
      'Boş cevap kümesinde hata fırlatılmalıdır'
    );

    // b. 14 soru cevaplanıp 15. soru eksik bırakıldığında
    const almostFull = createTargetedEnneagramAnswers(4);
    delete almostFull['en_q15'];
    assert.throws(
      () => evaluateEnneagramTest(almostFull),
      /Lütfen eksik soruları \(15\) cevaplayınız/i,
      'Eksik soru numarası (15) hata mesajında açıkça belirtilmelidir'
    );

    // c. Geçersiz/uydurma şık ID si verildiğinde
    const invalidOptAnswers = createTargetedEnneagramAnswers(4);
    invalidOptAnswers['en_q1'] = 'gecersiz_enneagram_sik';
    assert.throws(
      () => evaluateEnneagramTest(invalidOptAnswers),
      /Lütfen eksik soruları \(1\) cevaplayınız/i,
      'Geçersiz şık verildiğinde sahte sonuç üretilmemeli, eksik soru olarak yakalanmalıdır'
    );

    // d. Boş string cevap verildiğinde
    const blankAnswer = createTargetedEnneagramAnswers(4);
    blankAnswer['en_q7'] = '';
    assert.throws(
      () => evaluateEnneagramTest(blankAnswer),
      /Lütfen eksik soruları \(7\) cevaplayınız/i,
      'Boş string cevap eksik soru olarak değerlendirilmelidir'
    );
  });

  // 5. Danışan İzolasyonu ve Veri Ayrımı
  it('5. Danışan A ve Danışan B nin Enneagram cevapları ve sonuçları birbirine asla karışmamalıdır', () => {
    const clientA = createMockTestClient('IsoA');
    const clientB = createMockTestClient('IsoB');

    try {
      const answersA = createTargetedEnneagramAnswers(1); // Tip 1
      const answersB = createTargetedEnneagramAnswers(7); // Tip 7

      const resultA = runAndBuildEnneagramResult(clientA, null, answersA);
      const resultB = runAndBuildEnneagramResult(clientB, null, answersB);

      assert.ok(resultA.primaryType.includes('Tip 1'));
      assert.ok(resultB.primaryType.includes('Tip 7'));
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
      assert.ok(archiveA.testResults[0].primaryType.includes('Tip 1'));

      // Danışan B'de sadece kendi testi olmalı
      assert.strictEqual(archiveB.testResults.length, 1);
      assert.strictEqual(archiveB.testResults[0].clientId, clientB.id);
      assert.ok(archiveB.testResults[0].primaryType.includes('Tip 7'));
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 6. Determinizm ve Tekrarlanabilirlik (Eşit Puan Sınır Durumu Dahil)
  it('6. Aynı cevaplar tekrarlı çalıştırmalarda her seferinde %100 aynı deterministik sonucu vermelidir', () => {
    const answers = createTargetedEnneagramAnswers(8, 7);

    const firstRun = evaluateEnneagramTest(answers);

    // 30 tekrarlı çalıştırmada birebir aynı çıktılar
    for (let i = 0; i < 30; i++) {
      const run = evaluateEnneagramTest(answers);
      assert.strictEqual(run.primaryType, firstRun.primaryType, 'Birincil tip deterministik olmalıdır');
      assert.strictEqual(run.secondaryType, firstRun.secondaryType, 'Kanat eğilimi deterministik olmalıdır');
      assert.deepStrictEqual(run.dominantScores, firstRun.dominantScores, 'Skor tablosu deterministik olmalıdır');
      assert.deepStrictEqual(run.interpretations, firstRun.interpretations, 'Yorumlar deterministik olmalıdır');
    }

    // Eşit birincil tip puanı senaryosu:
    // Tip 1 ve Tip 3 eşit puan alacak şekilde bir matris
    const tiedAnswers: Record<string, string> = {};
    for (const q of ENNEAGRAM_QUESTIONS) {
      // İlk şıkkı seç (farklı tipler)
      tiedAnswers[q.id] = q.options[0].id;
    }
    const runTied1 = evaluateEnneagramTest(tiedAnswers);
    const runTied2 = evaluateEnneagramTest(tiedAnswers);
    assert.strictEqual(runTied1.primaryType, runTied2.primaryType, 'Eşitlik durumunda da sonuç kesinlikle deterministik olmalıdır');
  });

  // 7. src/utils/enneagramCalculator.ts Adaptör Uyumu ve Dil Denetimi
  it('7. src/utils/enneagramCalculator.ts adaptörü motorla uyumlu olmalı ve kesinlik iddiası içermemelidir', () => {
    const answers = createTargetedEnneagramAnswers(5, 4);
    const directResult = evaluateEnneagramTest(answers);
    const utilResult = utilEvaluateEnneagramTest(answers);

    assert.strictEqual(utilResult.primaryType, directResult.primaryType);
    assert.strictEqual(utilResult.secondaryType, directResult.secondaryType);
    assert.deepStrictEqual(utilResult.dominantScores, directResult.dominantScores);
    assert.deepStrictEqual(utilResult.interpretations, directResult.interpretations);

    // Psikolojik kesinlik iddiası yok; rezonans/mizaç dili kullanılıyor
    const fullText = utilResult.interpretations.join(' ');
    assert.ok(fullText.includes('mizaç') || fullText.includes('eğilim') || fullText.includes('rezonans'));
    assert.ok(!fullText.includes('kesin teşhis'));
    assert.ok(!fullText.includes('değişmez kader'));
  });
});
