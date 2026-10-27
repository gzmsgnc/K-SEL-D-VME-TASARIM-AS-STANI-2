import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  getAstrologyCardData,
  getNumerologyCardData,
  getChakraCardData,
  getArchetypeCardData,
  getEnneagramCardData,
  getTotemCardData,
  formatAstrologyCopyText,
  formatNumerologyCopyText,
  formatChakraCopyText,
  formatArchetypeCopyText,
  formatEnneagramCopyText,
  formatTotemCopyText,
} from '../../../utils/analysisResultsFormatters';

describe('A28: Danışan Analiz Sonuçları Ekranı Doğrulama Testleri', () => {
  const mockClientA: Client = {
    id: 'CLI-A28-001',
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz.kaya@example.com',
    phone: '+90 532 111 2233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      city: 'İzmir',
      country: 'Türkiye',
      placeName: 'İzmir, Konak',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülseren',
    notes: 'Geometrik dövme tasarımı arıyor.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const mockClientB: Client = {
    id: 'CLI-A28-002',
    firstName: 'Barış',
    lastName: 'Yılmaz',
    email: 'baris.yilmaz@example.com',
    phone: '+90 555 444 5566',
    birthDate: '1988-11-04',
    birthTime: '00:00',
    isBirthTimeUnknown: true, // Doğum saati belirsiz
    birthLocation: {
      city: 'Ankara',
      country: 'Türkiye',
      placeName: 'Ankara, Çankaya',
      latitude: 39.9208,
      longitude: 32.8541,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: '',
    createdAt: '2026-03-02T12:00:00Z',
    updatedAt: '2026-03-02T12:00:00Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  function createFullArchiveForClientA(): ClientArchiveRecord {
    return {
      client: mockClientA,
      reports: [],
      historySummary: {
        totalAnalysesCount: 4,
        totalDesignsCount: 1,
        lastInteractionAt: '2026-03-01T12:00:00Z',
      },
      analyses: [
        {
          id: 'ANA-A28-001',
          clientId: mockClientA.id,
          version: 1,
          createdAt: '2026-03-01T10:15:00Z',
          updatedAt: '2026-03-01T10:15:00Z',
          astrology: {
            zodiacSystem: 'TROPICAL',
            houseSystem: 'PLACIDUS',
            isBirthTimeUnknown: false,
            birthDate: '1992-05-18',
            latitude: 38.4192,
            longitude: 27.1287,
            timezone: 'Europe/Istanbul',
            utcOffsetMinutes: 180,
            sunSign: 'Taurus',
            moonSign: 'Scorpio',
            ascendantSign: 'Virgo',
            planetaryPositions: [
              { body: 'Sun', sign: 'Taurus', degree: 27.5, minute: 30, houseNumber: 9 },
              { body: 'Moon', sign: 'Scorpio', degree: 14.2, minute: 12, houseNumber: 3 },
              { body: 'Mercury', sign: 'Gemini', degree: 5.1, minute: 6, houseNumber: 10 },
              { body: 'Venus', sign: 'Aries', degree: 19.8, minute: 48, houseNumber: 8 },
              { body: 'Mars', sign: 'Pisces', degree: 2.3, minute: 18, houseNumber: 7 },
              { body: 'Jupiter', sign: 'Virgo', degree: 6.4, minute: 24, houseNumber: 1 },
              { body: 'Saturn', sign: 'Aquarius', degree: 17.9, minute: 54, houseNumber: 6 },
              { body: 'Uranus', sign: 'Capricorn', degree: 17.1, minute: 6, houseNumber: 5 },
              { body: 'Neptune', sign: 'Capricorn', degree: 18.5, minute: 30, houseNumber: 5 },
              { body: 'Pluto', sign: 'Scorpio', degree: 21.7, minute: 42, houseNumber: 3 },
            ],
          },
          numerology: {
            lifePathNumber: 8,
            destinyNumber: 4,
            soulUrgeNumber: 6,
            personalityNumber: 7,
            birthdayNumber: 9,
            worldMissionNumber: 11,
            karmicLessons: [5],
            masterNumbers: [11],
          },
          chakra: {
            dominantChakra: 'SOLAR_PLEXUS',
            primaryDeficit: 'HEART',
            chakras: [
              { chakra: 'ROOT', score: 7, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'SACRAL', score: 6, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'SOLAR_PLEXUS', score: 9, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'HEART', score: 3, status: 'UNDERACTIVE', focusRecommendations: [] },
              { chakra: 'THROAT', score: 7, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'THIRD_EYE', score: 8, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'CROWN', score: 7, status: 'BALANCED', focusRecommendations: [] },
            ],
          },
          archetype: {
            unifiedArchetype: {
              primary: 'Hükümdar / Lider',
              secondary: 'Usta İnşa Edici',
              description: 'Yapılandırma, adalet ve somut başarı odaklı arketipsel denge.',
            },
            shadowArchetype: {
              shadowName: 'Zorba / Kontrolcü',
              transformationalSymbol: 'Kozmik Denge Terazisi & Geometrik Kalkan',
            },
          },
        },
      ],
      testResults: [
        {
          id: 'TEST-A28-ENN',
          clientId: mockClientA.id,
          testType: 'ENNEAGRAM',
          version: 1,
          completedAt: '2026-03-01T11:00:00Z',
          primaryType: 'Tip 8 - Meydan Okuyan',
          secondaryType: 'Tip 7 Kanadı',
          answers: [],
          dominantScores: {
            'Tip 8': 12,
            'Tip 7': 9,
            'Tip 3': 8,
          },
          interpretations: [
            'Kararlı, liderlik vasfı yüksek, sınırlarını korumaya özen gösteren mizaç eğilimi.',
          ],
        },
        {
          id: 'TEST-A28-TOT',
          clientId: mockClientA.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-03-01T11:15:00Z',
          primaryType: 'Kurt',
          secondaryType: 'Kartal',
          answers: [],
          dominantScores: {
            'Kurt': 10,
            'Kartal': 7,
          },
          interpretations: [
            'Sadakat, sezgi ve stratejik rehberlik simgesi olan kurt totemi rezonansı.',
          ],
        },
      ],
      designs: [],
      symbolAnalyses: [],
    };
  }

  function createEmptyArchiveForClientB(): ClientArchiveRecord {
    return {
      client: mockClientB,
      reports: [],
      historySummary: {
        totalAnalysesCount: 0,
        totalDesignsCount: 0,
        lastInteractionAt: mockClientB.createdAt,
      },
      analyses: [],
      testResults: [],
      designs: [],
      symbolAnalyses: [],
    };
  }

  it('1. Kayıtlı analizler danışana doğru şekilde gösteriliyor', () => {
    const archiveA = createFullArchiveForClientA();

    // 1. Astroloji
    const astro = getAstrologyCardData(mockClientA, archiveA);
    assert.strictEqual(astro.hasRecord, true);
    assert.strictEqual(astro.clientId, mockClientA.id);
    assert.strictEqual(astro.sunSign, 'Taurus');
    assert.strictEqual(astro.sunSignTr, 'Boğa');
    assert.strictEqual(astro.moonSign, 'Scorpio');
    assert.strictEqual(astro.moonSignTr, 'Akrep');
    assert.strictEqual(astro.ascendantSignTr, 'Başak');
    assert.strictEqual(astro.isBirthTimeKnown, true);
    assert.strictEqual(astro.planetaryPositions?.length, 10);

    // 2. Numeroloji
    const num = getNumerologyCardData(mockClientA, archiveA);
    assert.strictEqual(num.hasRecord, true);
    assert.strictEqual(num.lifePathNumber, 8);
    assert.strictEqual(num.destinyNumber, 4);
    assert.strictEqual(num.worldMissionNumber, 11);
    assert.deepStrictEqual(num.masterNumbers, [11]);

    // 3. Çakra
    const chakra = getChakraCardData(mockClientA, archiveA);
    assert.strictEqual(chakra.hasRecord, true);
    assert.strictEqual(chakra.dominantChakra, 'SOLAR_PLEXUS');
    assert.strictEqual(chakra.primaryDeficit, 'HEART');
    assert.strictEqual(chakra.chakras?.length, 7);

    // 4. Arketip
    const arch = getArchetypeCardData(mockClientA, archiveA);
    assert.strictEqual(arch.hasRecord, true);
    assert.strictEqual(arch.primaryArchetype, 'Hükümdar / Lider');
    assert.strictEqual(arch.shadowArchetype, 'Zorba / Kontrolcü');

    // 5. Enneagram
    const enn = getEnneagramCardData(mockClientA, archiveA);
    assert.strictEqual(enn.hasRecord, true);
    assert.strictEqual(enn.primaryType, 'Tip 8 - Meydan Okuyan');
    assert.strictEqual(enn.wingType, 'Tip 7 Kanadı');

    // 6. Totem
    const tot = getTotemCardData(mockClientA, archiveA);
    assert.strictEqual(tot.hasRecord, true);
    assert.strictEqual(tot.primaryType, 'Kurt');
    assert.strictEqual(tot.secondaryType, 'Kartal');
  });

  it('2. Eksik analiz "Kayıt bulunmuyor" gösteriyor', () => {
    const archiveB = createEmptyArchiveForClientB();

    const astro = getAstrologyCardData(mockClientB, archiveB);
    assert.strictEqual(astro.hasRecord, false);
    assert.match(astro.sourceNoteTr, /Kayıt bulunmuyor/);

    const num = getNumerologyCardData(mockClientB, archiveB);
    assert.strictEqual(num.hasRecord, false);
    assert.match(num.sourceNoteTr, /Kayıt bulunmuyor/);

    const chakra = getChakraCardData(mockClientB, archiveB);
    assert.strictEqual(chakra.hasRecord, false);
    assert.match(chakra.sourceNoteTr, /Kayıt bulunmuyor/);

    const arch = getArchetypeCardData(mockClientB, archiveB);
    assert.strictEqual(arch.hasRecord, false);
    assert.match(arch.sourceNoteTr, /Kayıt bulunmuyor/);

    const enn = getEnneagramCardData(mockClientB, archiveB);
    assert.strictEqual(enn.hasRecord, false);
    assert.match(enn.sourceNoteTr, /Kayıt bulunmuyor/);

    const tot = getTotemCardData(mockClientB, archiveB);
    assert.strictEqual(tot.hasRecord, false);
    assert.match(tot.sourceNoteTr, /Kayıt bulunmuyor/);
  });

  it('3. Danışan A nın analizleri Danışan B ye asla sızmıyor', () => {
    const archiveA = createFullArchiveForClientA();

    // Danışan B seçildiğinde archiveA gönderilse bile (farklı clientId) veriler filtrelenmeli
    const numForB = getNumerologyCardData(mockClientB, archiveA);
    assert.strictEqual(numForB.hasRecord, false);
    assert.strictEqual(numForB.lifePathNumber, undefined);

    const astroForB = getAstrologyCardData(mockClientB, archiveA);
    assert.strictEqual(astroForB.hasRecord, false);
    assert.strictEqual(astroForB.sunSign, undefined);

    const ennForB = getEnneagramCardData(mockClientB, archiveA);
    assert.strictEqual(ennForB.hasRecord, false);
    assert.strictEqual(ennForB.primaryType, undefined);

    const totForB = getTotemCardData(mockClientB, archiveA);
    assert.strictEqual(totForB.hasRecord, false);
    assert.strictEqual(totForB.primaryType, undefined);
  });

  it('4. Danışan değiştiğinde sonuç kartları hemen güncelleniyor', () => {
    const archiveA = createFullArchiveForClientA();
    const archiveB = createEmptyArchiveForClientB();

    // 1. Adım: Danışan A aktif
    const resA = getNumerologyCardData(mockClientA, archiveA);
    assert.strictEqual(resA.hasRecord, true);
    assert.strictEqual(resA.lifePathNumber, 8);

    // 2. Adım: Danışan B aktif (sayfa yenilemeden geçiş)
    const resB = getNumerologyCardData(mockClientB, archiveB);
    assert.strictEqual(resB.hasRecord, false);
    assert.strictEqual(resB.lifePathNumber, undefined);

    // 3. Adım: Tekrar Danışan A'ya dönüş
    const resA2 = getNumerologyCardData(mockClientA, archiveA);
    assert.strictEqual(resA2.hasRecord, true);
    assert.strictEqual(resA2.lifePathNumber, 8);
  });

  it('5. Sayfa yenilendiğinde (depolama) kayıtlı sonuçlar korunuyor', () => {
    const originalArchive = createFullArchiveForClientA();

    // LocalStorage serileştirmesini simüle et
    const serialized = JSON.stringify(originalArchive);
    const restoredArchive: ClientArchiveRecord = JSON.parse(serialized);

    const astroRestored = getAstrologyCardData(mockClientA, restoredArchive);
    assert.strictEqual(astroRestored.hasRecord, true);
    assert.strictEqual(astroRestored.sunSign, 'Taurus');
    assert.strictEqual(astroRestored.planetaryPositions?.length, 10);

    const numRestored = getNumerologyCardData(mockClientA, restoredArchive);
    assert.strictEqual(numRestored.hasRecord, true);
    assert.strictEqual(numRestored.destinyNumber, 4);

    const chakraRestored = getChakraCardData(mockClientA, restoredArchive);
    assert.strictEqual(chakraRestored.hasRecord, true);
    assert.strictEqual(chakraRestored.dominantChakra, 'SOLAR_PLEXUS');

    const ennRestored = getEnneagramCardData(mockClientA, restoredArchive);
    assert.strictEqual(ennRestored.hasRecord, true);
    assert.strictEqual(ennRestored.primaryType, 'Tip 8 - Meydan Okuyan');
  });

  it('6. Modüller arası veri karışmıyor', () => {
    const archiveA = createFullArchiveForClientA();

    const astro = getAstrologyCardData(mockClientA, archiveA);
    const num = getNumerologyCardData(mockClientA, archiveA);
    const chakra = getChakraCardData(mockClientA, archiveA);
    const arch = getArchetypeCardData(mockClientA, archiveA);

    // Numeroloji verisi astrolojiye sızmamış olmalı
    assert.strictEqual((astro as any).lifePathNumber, undefined);
    assert.strictEqual((num as any).sunSign, undefined);
    assert.strictEqual((chakra as any).primaryArchetype, undefined);
    assert.strictEqual((arch as any).dominantChakra, undefined);
  });

  it('7. Enneagram ve Totem doğru ayrıştırılıyor', () => {
    const archiveA = createFullArchiveForClientA();

    const enn = getEnneagramCardData(mockClientA, archiveA);
    const tot = getTotemCardData(mockClientA, archiveA);

    assert.strictEqual(enn.primaryType, 'Tip 8 - Meydan Okuyan');
    assert.notStrictEqual(enn.primaryType, tot.primaryType);
    assert.strictEqual(tot.primaryType, 'Kurt');

    // Totem nesnesinde Enneagram kanadı olmamalı
    assert.strictEqual((tot as any).wingType, undefined);
  });

  it('8. Her kartın kopyalama metni yalnızca o modüle ait ve tamamen Türkçe', () => {
    const archiveA = createFullArchiveForClientA();

    const astroData = getAstrologyCardData(mockClientA, archiveA);
    const astroText = formatAstrologyCopyText(mockClientA, astroData);
    assert.match(astroText, /BATI \/ TROPICAL ASTROLOJİ ANALİZİ/);
    assert.match(astroText, /Güneş Burcu: Boğa/);
    assert.doesNotMatch(astroText, /Yaşam Yolu/);
    assert.doesNotMatch(astroText, /Çakra/);
    assert.doesNotMatch(astroText, /Kurt/);

    const numData = getNumerologyCardData(mockClientA, archiveA);
    const numText = formatNumerologyCopyText(mockClientA, numData);
    assert.match(numText, /NUMEROLOJİ ANALİZ SONUCU/);
    assert.match(numText, /Yaşam Yolu Sayısı : 8/);
    assert.doesNotMatch(numText, /Boğa/);
    assert.doesNotMatch(numText, /Enneagram/);

    const chakraData = getChakraCardData(mockClientA, archiveA);
    const chakraText = formatChakraCopyText(mockClientA, chakraData);
    assert.match(chakraText, /ÇAKRA ENERJİ VE DENGE ANALİZİ/);
    assert.match(chakraText, /Baskın Çakra/);
    assert.doesNotMatch(chakraText, /Meydan Okuyan/);

    const archData = getArchetypeCardData(mockClientA, archiveA);
    const archText = formatArchetypeCopyText(mockClientA, archData);
    assert.match(archText, /BİRLEŞİK & GÖLGE ARKETİP ÇÖZÜMLEMESİ/);
    assert.match(archText, /Hükümdar \/ Lider/);
    assert.doesNotMatch(archText, /Yaşam Yolu/);

    const ennData = getEnneagramCardData(mockClientA, archiveA);
    const ennText = formatEnneagramCopyText(mockClientA, ennData);
    assert.match(ennText, /ENNEAGRAM MİZAÇ TESTİ SONUCU/);
    assert.match(ennText, /Tip 8 - Meydan Okuyan/);
    assert.doesNotMatch(ennText, /Kurt/);

    const totData = getTotemCardData(mockClientA, archiveA);
    const totText = formatTotemCopyText(mockClientA, totData);
    assert.match(totText, /HAYVAN TOTEMİ TESTİ SONUCU/);
    assert.match(totText, /Kurt/);
    assert.doesNotMatch(totText, /Boğa/);
  });

  it('9. Sahte / varsayılan sonuç üretilmiyor ve doğum saati bilinmiyorsa yükselen uyarısı veriliyor', () => {
    const emptyArchive = createEmptyArchiveForClientB();

    const astro = getAstrologyCardData(mockClientB, emptyArchive);
    assert.strictEqual(astro.hasRecord, false);
    assert.strictEqual(astro.sunSign, undefined);
    assert.strictEqual(astro.sunSignTr, undefined);
    assert.strictEqual(astro.ascendantSign, undefined);
    assert.strictEqual(astro.ascendantSignTr, undefined);

    // ClientB'nin doğum saati belirsiz; eğer kayıt girilseydi bile yükselen burç sahte üretilmemeli
    const partialArchiveWithUnknownTime: ClientArchiveRecord = {
      ...emptyArchive,
      analyses: [
        {
          id: 'ANA-PARTIAL',
          clientId: mockClientB.id,
          version: 1,
          createdAt: '2026-03-02T13:00:00Z',
          updatedAt: '2026-03-02T13:00:00Z',
          astrology: {
            zodiacSystem: 'TROPICAL',
            houseSystem: 'PLACIDUS',
            isBirthTimeUnknown: true,
            birthDate: '1988-11-04',
            latitude: 39.9208,
            longitude: 32.8541,
            timezone: 'Europe/Istanbul',
            utcOffsetMinutes: 180,
            sunSign: 'Scorpio',
            moonSign: 'Virgo',
            planetaryPositions: [
              { body: 'Sun', sign: 'Scorpio', degree: 12.0, minute: 0, houseNumber: 1 },
            ],
          },
        },
      ],
    };

    const astroWithNoTime = getAstrologyCardData(mockClientB, partialArchiveWithUnknownTime);
    assert.strictEqual(astroWithNoTime.hasRecord, true);
    assert.strictEqual(astroWithNoTime.isBirthTimeKnown, false);
    assert.strictEqual(astroWithNoTime.ascendantSignTr, undefined);
    assert.match(astroWithNoTime.risingNoteTr || '', /Doğum saati bilinmediği için Yükselen burç ve kesin ev yerleşimleri hesaplanamaz/);

    const copyText = formatAstrologyCopyText(mockClientB, astroWithNoTime);
    assert.match(copyText, /Doğum saati bilinmediği için hesaplanamaz/);
  });
});
