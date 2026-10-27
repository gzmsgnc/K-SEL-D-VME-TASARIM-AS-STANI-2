import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateChakraAnalysisFromNumerology } from '../chakraCalculationEngine';
import { NumerologyAnalysis } from '../../../types/analysis';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { getChakraCardData, formatChakraCopyText } from '../../../utils/analysisResultsFormatters';
import { formatChakraSectionCopyText } from '../../../utils/clientComprehensiveCopy';

describe('A45: Çakra Eşit En Düşük Puan ve Destek Çakraları Doğrulaması', () => {
  // Elif Demir Gerçek Numeroloji Verileri (15.06.1992, İstanbul, Anne: Aylin)
  const elifDemirNumerology: NumerologyAnalysis = {
    lifePathNumber: 6,
    destinyNumber: 9,
    soulUrgeNumber: 1,
    personalityNumber: 8,
    birthdayNumber: 6,
    worldMissionNumber: 6,
    karmicLessons: [1, 2, 7, 8],
    masterNumbers: [33],
  };

  const mockClientElif: Client = {
    id: 'client-elif-demir-a45',
    firstName: 'Elif',
    lastName: 'Demir',
    email: 'elif.demir@example.com',
    phone: '+90 532 999 8877',
    birthDate: '1992-06-15',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      city: 'İstanbul',
      placeName: 'İstanbul, Türkiye',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Aylin',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
    notes: 'A45 Çakra Kabul Testi',
    createdAt: '2026-10-27T10:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  };

  function createMockArchive(client: Client, chakra: ReturnType<typeof calculateChakraAnalysisFromNumerology>, numerology: NumerologyAnalysis): ClientArchiveRecord {
    return {
      client,
      analyses: [
        {
          id: `analysis-${client.id}`,
          clientId: client.id,
          version: 1,
          createdAt: '2026-10-27T10:00:00Z',
          updatedAt: '2026-10-27T10:00:00Z',
          numerology,
          chakra,
        },
      ],
      testResults: [],
      symbolAnalyses: [],
      designs: [],
      reports: [],
      historySummary: {
        totalAnalysesCount: 1,
        totalDesignsCount: 0,
        lastInteractionAt: '2026-10-27T10:00:00Z',
      },
    };
  }

  it('Elif Demir için 2. Sakral ve 6. Üçüncü Göz çakralarının her ikisi de 2/10 BLOCKED olmalıdır', () => {
    const analysis = calculateChakraAnalysisFromNumerology(elifDemirNumerology);

    const sacral = analysis.chakras.find((c) => c.chakra === 'SACRAL');
    const thirdEye = analysis.chakras.find((c) => c.chakra === 'THIRD_EYE');
    const heart = analysis.chakras.find((c) => c.chakra === 'HEART');

    assert.ok(sacral, '2. Sakral Çakra bulunmalıdır');
    assert.strictEqual(sacral.score, 2, '2. Sakral Çakra skoru 2 olmalıdır');
    assert.strictEqual(sacral.status, 'BLOCKED', '2. Sakral Çakra BLOCKED olmalıdır');

    assert.ok(thirdEye, '6. Üçüncü Göz Çakrası bulunmalıdır');
    assert.strictEqual(thirdEye.score, 2, '6. Üçüncü Göz Çakrası skoru 2 olmalıdır');
    assert.strictEqual(thirdEye.status, 'BLOCKED', '6. Üçüncü Göz Çakrası BLOCKED olmalıdır');

    assert.ok(heart, '4. Kalp Çakrası bulunmalıdır');
    assert.strictEqual(heart.score, 10, '4. Kalp Çakrası skoru 10 olmalıdır');
    assert.strictEqual(heart.status, 'OVERACTIVE', '4. Kalp Çakrası OVERACTIVE olmalıdır');
  });

  it('Elif Demir için deficitChakras dizisi SACRAL ve THIRD_EYE içermeli, HEART kesinlikle içermemelidir', () => {
    const analysis = calculateChakraAnalysisFromNumerology(elifDemirNumerology);

    assert.ok(Array.isArray(analysis.deficitChakras), 'deficitChakras dizi olmalıdır');
    assert.strictEqual(analysis.deficitChakras.length, 2, 'Tam olarak 2 destek çakrası olmalıdır');
    assert.deepStrictEqual(
      analysis.deficitChakras,
      ['SACRAL', 'THIRD_EYE'],
      'deficitChakras [SACRAL, THIRD_EYE] olmalıdır'
    );

    // 4. Kalp Çakrası BASKIN çakradır; ASLA destek listesinde olmamalıdır
    assert.strictEqual(analysis.dominantChakra, 'HEART');
    assert.ok(!analysis.deficitChakras.includes('HEART'), 'Kalp Çakrası deficitChakras içinde ASLA yer alamaz');

    // Geriye dönük uyumluluk: primaryDeficit ilk destek çakrasını göstermelidir
    assert.strictEqual(analysis.primaryDeficit, 'SACRAL');
  });

  it('getChakraCardData Elif Demir için hem 2. Sakral hem 6. Üçüncü Gözü destek çakrası olarak formatlamalıdır', () => {
    const chakraResult = calculateChakraAnalysisFromNumerology(elifDemirNumerology);
    const archive = createMockArchive(mockClientElif, chakraResult, elifDemirNumerology);
    const cardData = getChakraCardData(mockClientElif, archive);

    assert.strictEqual(cardData.hasRecord, true);
    assert.strictEqual(cardData.dominantChakra, 'HEART');
    assert.strictEqual(cardData.dominantChakraTr, '4. Kalp Çakrası');
    assert.strictEqual(
      cardData.primaryDeficitTr,
      '2. Sakral Çakra + 6. Üçüncü Göz Çakrası',
      'Birleşik etiket her iki çakrayı numara ve isimle göstermelidir'
    );
    assert.deepStrictEqual(cardData.deficitChakras, ['SACRAL', 'THIRD_EYE']);
    assert.deepStrictEqual(cardData.deficitChakrasTr, ['2. Sakral Çakra', '6. Üçüncü Göz Çakrası']);
  });

  it('Kopyalama metninde Baskın Çakra: 4. Kalp ve Destek: 2. Sakral + 6. Üçüncü Göz açıkça görünmelidir', () => {
    const chakraResult = calculateChakraAnalysisFromNumerology(elifDemirNumerology);
    const archive = createMockArchive(mockClientElif, chakraResult, elifDemirNumerology);

    const cardData = getChakraCardData(mockClientElif, archive);
    const copyText = formatChakraCopyText(mockClientElif, cardData);
    const sectionCopyText = formatChakraSectionCopyText(mockClientElif, archive);

    for (const text of [copyText, sectionCopyText]) {
      assert.ok(text.includes('Baskın Çakra (Dominant): 4. Kalp Çakrası'));
      assert.ok(text.includes('Öncelikli Destek / Blokajlar: 2. Sakral Çakra + 6. Üçüncü Göz Çakrası'));
      assert.ok(text.includes('- Sakral Çakra (Svadhisthana): 2/10 (Tıkalı / Bloke)'));
      assert.ok(text.includes('- Üçüncü Göz Çakrası (Ajna): 2/10 (Tıkalı / Bloke)'));
      assert.ok(text.includes('- Kalp Çakrası (Anahata): 10/10 (Aşırı Aktif)'));
    }
  });

  it('Tekil en düşük çakra durumunda deficitChakras tek elemanlı olmalı ve etiket tekil kalmalıdır', () => {
    const singleDeficitNumerology: NumerologyAnalysis = {
      lifePathNumber: 7,
      destinyNumber: 1,
      soulUrgeNumber: 9,
      personalityNumber: 3,
      birthdayNumber: 6,
      worldMissionNumber: 8,
      karmicLessons: [4], // Sadece 4 eksik (ROOT)
      masterNumbers: [],
    };

    const analysis = calculateChakraAnalysisFromNumerology(singleDeficitNumerology);

    assert.deepStrictEqual(analysis.deficitChakras, ['ROOT']);
    assert.strictEqual(analysis.primaryDeficit, 'ROOT');

    const clientSingle: Client = {
      ...mockClientElif,
      id: 'client-single',
    };
    const archive = createMockArchive(clientSingle, analysis, singleDeficitNumerology);

    const cardData = getChakraCardData(clientSingle, archive);
    assert.strictEqual(cardData.primaryDeficitTr, '1. Kök Çakra');
    assert.deepStrictEqual(cardData.deficitChakras, ['ROOT']);

    const copyText = formatChakraCopyText(clientSingle, cardData);
    assert.ok(copyText.includes('Öncelikli Destek / Blokaj: 1. Kök Çakra'));
  });
});
