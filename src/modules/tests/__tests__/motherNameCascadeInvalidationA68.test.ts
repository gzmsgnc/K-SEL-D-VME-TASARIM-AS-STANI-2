import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  deleteClientRecord,
  updateClientRecord,
  getClientArchive,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientEbced,
  saveClientChakra,
  saveClientArchetype,
  saveClientSymbolAnalysis,
  saveClientDesign,
  saveClientReport,
  saveClientTestResult,
} from '../../../store/storage';
import { Client } from '../../../types/client';
import { TropicalNatalChart } from '../../../types/astrology';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis, EbcedAnalysis } from '../../../types/analysis';
import { ClientSymbolAnalysis } from '../../../types/symbol';
import { ClientTattooDesign } from '../../../types/design';
import { ClientTattooReport } from '../../../types/report';
import { ClientTestResult } from '../../../types/test';
import { generateUnifiedVisualPrompt } from '../../symbols/visualPromptEngine';

describe('A68: Aşama 2.1 — Anne Adı Değişikliğinde Bağımlı Kayıtların Temizlenmesi ve Veri İzolasyonu Testleri', () => {
  function createSampleClient(suffix: string, motherName: string = 'Fatma'): Client {
    return createClientRecord(
      {
        firstName: `Danisan_${suffix}`,
        lastName: `Soyad_${suffix}`,
        email: `client_${suffix.toLowerCase()}@example.com`,
        phone: '5551234567',
        birthDate: '1992-06-15',
        birthTime: '10:30',
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
        motherName,
        notes: `A68 Anne Adı İzolasyon Testi ${suffix}`,
      },
      'OWNER_MANUAL'
    );
  }

  const mockChart: TropicalNatalChart = {
    zodiacSystem: 'TROPICAL',
    houseSystem: 'PLACIDUS',
    isBirthTimeUnknown: false,
    birthDate: '1992-06-15',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
    sunSign: 'Gemini',
    moonSign: 'Scorpio',
    ascendantSign: 'Virgo',
  };

  const mockNumerology: NumerologyAnalysis = {
    fullName: 'Danisan Test',
    birthDate: '1992-06-15',
    lifePathNumber: 6,
    destinyNumber: 7,
    soulUrgeNumber: 3,
    personalityNumber: 4,
    birthdayNumber: 15,
    worldMissionNumber: 13,
    karmicLessons: [],
    masterNumbers: [],
  };

  const mockChakra: ChakraAnalysis = {
    chakras: [
      { chakra: 'ROOT', status: 'BALANCED', score: 8, focusRecommendations: [] },
      { chakra: 'HEART', status: 'UNDERACTIVE', score: 4, focusRecommendations: [] },
    ],
    dominantChakra: 'ROOT',
    primaryDeficit: 'HEART',
  };

  const mockArchetype: ArchetypeAnalysis = {
    unifiedArchetype: {
      primary: 'Bilge',
      secondary: 'Rehber',
      description: 'Bilgelik ve rehberlik sentezi',
    },
    shadowArchetype: {
      shadowName: 'Kontrolcü Bilge',
      transformationalSymbol: 'Açık Lotus',
    },
  };

  const mockEbcedV1: EbcedAnalysis = {
    clientNameValue: 120,
    motherNameValue: 135, // Fatma
    combinedTotal: 255,
    elementalResonance: 'Ateş',
    planetaryRuler: 'Güneş',
    esmaResonance: ['El-Alim', 'El-Hakim'],
  };

  const mockEbcedV2: EbcedAnalysis = {
    clientNameValue: 120,
    motherNameValue: 240, // Meryem
    combinedTotal: 360,
    elementalResonance: 'Su',
    planetaryRuler: 'Ay',
    esmaResonance: ['El-Vedud', 'En-Nur'],
  };

  const mockSymbolAnalysis = (clientId: string): ClientSymbolAnalysis => ({
    id: `sym_${clientId}_1`,
    clientId,
    version: 1,
    selectedSymbols: [
      {
        symbolId: 'flower_of_life',
        symbolName: 'Yaşam Çiçeği',
        customMeaning: 'Kozmik rezonans ve birlik',
        weight: 'PRIMARY',
      },
    ],
    compositionNarrative: 'Kutsal geometri odaklı kompozisyon',
    createdAt: new Date().toISOString(),
  });

  const mockDesign = (clientId: string): ClientTattooDesign => ({
    id: `des_${clientId}_1`,
    clientId,
    versionNumber: 1,
    title: 'Geometrik Ebced Tasarımı',
    conceptStatement: 'Kozmik rezonans manifestosu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recipe: {
      style: 'FINE_LINE',
      recommendedPlacement: 'FOREARM_INNER',
      placementDescription: 'İç ön kol boyunca akış',
      recommendedDimensionsCm: { width: 10, height: 16 },
      colorProfile: 'MONOCHROME_BLACK',
      primarySymbol: 'Yaşam Çiçeği',
      secondarySymbols: ['Metatron Küpü'],
      keyComponents: ['Yaşam Çiçeği', 'Metatron Küpü'],
      technicalAdviceForArtist: ['Fine line 3RL iğne'],
    },
    aiPrompt: {
      primaryPromptEn: 'Sacred geometry minimalist tattoo flash of flower of life',
      conceptPromptTr: 'Minimal geometrik yaşam çiçeği dövme konsepti',
      negativePrompt: 'color, shading, low quality',
      aspectRatio: '3:4',
      artisticModifiers: ['sacred geometry', 'fine line'],
    },
  });

  const mockReport = (clientId: string): ClientTattooReport => ({
    id: `rep_${clientId}_1`,
    clientId,
    version: 1,
    title: 'Kozmik Dövme Analiz Raporu',
    generatedAt: new Date().toISOString(),
    sections: [],
    confidentialityNote: 'Kişiye özel analiz raporu',
  });

  const mockTestEnneagram = (clientId: string): ClientTestResult => ({
    id: `test_enn_${clientId}`,
    clientId,
    testType: 'ENNEAGRAM',
    version: 1,
    completedAt: new Date().toISOString(),
    answers: [],
    primaryType: 'Tip 5 - Gözlemci/Araştırmacı',
    dominantScores: { 'Tip 5': 8 },
    interpretations: ['Analitik düşünce ve zihinsel derinlik'],
  });

  const mockTestTotem = (clientId: string): ClientTestResult => ({
    id: `test_totem_${clientId}`,
    clientId,
    testType: 'ANIMAL_TOTEM',
    version: 1,
    completedAt: new Date().toISOString(),
    answers: [],
    primaryType: 'Kurt (Canis lupus)',
    dominantScores: { 'Kurt': 7 },
    interpretations: ['Liderlik ve sezgisel sadakat'],
  });

  it('1. Anne adı değiştiğinde eski Ebced kaydı kalıcı olarak silinmeli', () => {
    const client = createSampleClient('T1', 'Fatma');
    saveClientEbced(client.id, mockEbcedV1);

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.analyses[0]?.ebced?.combinedTotal, 255);
    assert.strictEqual(archiveBefore.analyses[0]?.ebced?.motherNameValue, 135);

    // Anne adını değiştir: Fatma -> Zeynep
    const updatedClient: Client = {
      ...client,
      motherName: 'Zeynep',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    assert.strictEqual(
      archiveAfter.analyses[0]?.ebced,
      undefined,
      'Eski anne adına ait Ebced kaydı kalıcı olarak silinmelidir'
    );

    deleteClientRecord(client.id);
  });

  it('2. Anne adı değiştiğinde eski Ebced ile ilişkili sembol analizleri ve seçimleri silinmeli', () => {
    const client = createSampleClient('T2', 'Fatma');
    saveClientEbced(client.id, mockEbcedV1);
    saveClientSymbolAnalysis(client.id, mockSymbolAnalysis(client.id));

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.symbolAnalyses.length, 1);
    assert.strictEqual(archiveBefore.symbolAnalyses[0].selectedSymbols[0].symbolName, 'Yaşam Çiçeği');

    // Anne adını güncelle
    const updatedClient: Client = {
      ...client,
      motherName: 'Emine',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    assert.strictEqual(
      archiveAfter.symbolAnalyses.length,
      0,
      'Anne adı değiştiğinde sembol analizleri ve seçimleri tamamen silinmelidir'
    );

    deleteClientRecord(client.id);
  });

  it('3. Anne adı değiştiğinde eski reçete, tasarım ve raporlar kalıcı olarak silinmeli', () => {
    const client = createSampleClient('T3', 'Fatma');
    saveClientEbced(client.id, mockEbcedV1);
    saveClientDesign(client.id, mockDesign(client.id));
    saveClientReport(client.id, mockReport(client.id));

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.designs.length, 1);
    assert.strictEqual(archiveBefore.reports.length, 1);

    // Anne adını güncelle
    const updatedClient: Client = {
      ...client,
      motherName: 'Gülten',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    assert.strictEqual(archiveAfter.designs.length, 0, 'Eski tasarımlar kalıcı olarak silinmelidir');
    assert.strictEqual(archiveAfter.reports.length, 0, 'Eski raporlar kalıcı olarak silinmelidir');

    deleteClientRecord(client.id);
  });

  it('4. Bağımsız Batı Astrolojisi ve Pisagor Numerolojisi anne adı değişikliğinden ETKİLENMEMELİ ve KORUNMALIDIR', () => {
    const client = createSampleClient('T4', 'Fatma');
    saveClientAstrologyChart(client.id, mockChart);
    saveClientNumerology(client.id, mockNumerology);
    saveClientEbced(client.id, mockEbcedV1);

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.analyses[0]?.astrology?.sunSign, 'Gemini');
    assert.strictEqual(archiveBefore.analyses[0]?.numerology?.lifePathNumber, 6);
    assert.strictEqual(archiveBefore.analyses[0]?.ebced?.combinedTotal, 255);

    // Anne adını güncelle
    const updatedClient: Client = {
      ...client,
      motherName: 'Hatice',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    // Ebced silinmiş olmalı
    assert.strictEqual(archiveAfter.analyses[0]?.ebced, undefined);
    // Astroloji ve numeroloji korunmuş olmalı
    assert.strictEqual(archiveAfter.analyses[0]?.astrology?.sunSign, 'Gemini');
    assert.strictEqual(archiveAfter.analyses[0]?.astrology?.moonSign, 'Scorpio');
    assert.strictEqual(archiveAfter.analyses[0]?.numerology?.lifePathNumber, 6);
    assert.strictEqual(archiveAfter.analyses[0]?.numerology?.destinyNumber, 7);

    deleteClientRecord(client.id);
  });

  it('5. Anne adına bağımlı olmayan mizaç test yanıtları (Enneagram ve Totem) KORUNMALIDIR', () => {
    const client = createSampleClient('T5', 'Fatma');
    saveClientTestResult(client.id, mockTestEnneagram(client.id));
    saveClientTestResult(client.id, mockTestTotem(client.id));
    saveClientEbced(client.id, mockEbcedV1);

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.testResults.length, 2);

    // Anne adını güncelle
    const updatedClient: Client = {
      ...client,
      motherName: 'Zehra',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    assert.strictEqual(archiveAfter.testResults.length, 2, 'Test sonuçları silinmemeli, tam olarak korunmalıdır');
    const enneagram = archiveAfter.testResults.find((t) => t.testType === 'ENNEAGRAM');
    const totem = archiveAfter.testResults.find((t) => t.testType === 'ANIMAL_TOTEM');
    assert.ok(enneagram?.primaryType?.includes('Tip 5'));
    assert.ok(totem?.primaryType?.includes('Kurt'));

    deleteClientRecord(client.id);
  });

  it('6. Arketip analizi anne adına veya Ebced verisine bağımlı olmadığı için KORUNMALIDIR', () => {
    const client = createSampleClient('T6', 'Fatma');
    saveClientNumerology(client.id, mockNumerology);
    saveClientChakra(client.id, mockChakra);
    saveClientArchetype(client.id, mockArchetype);
    saveClientEbced(client.id, mockEbcedV1);

    const archiveBefore = getClientArchive(client.id);
    assert.ok(archiveBefore);
    assert.strictEqual(archiveBefore.analyses[0]?.archetype?.unifiedArchetype.primary, 'Bilge');
    assert.strictEqual(archiveBefore.analyses[0]?.chakra?.dominantChakra, 'ROOT');

    // Anne adını güncelle
    const updatedClient: Client = {
      ...client,
      motherName: 'Leyla',
    };
    updateClientRecord(updatedClient);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    // Ebced silinmeli
    assert.strictEqual(archiveAfter.analyses[0]?.ebced, undefined);
    // Çakra ve Arketip korunmalı
    assert.strictEqual(archiveAfter.analyses[0]?.chakra?.dominantChakra, 'ROOT');
    assert.strictEqual(archiveAfter.analyses[0]?.archetype?.unifiedArchetype.primary, 'Bilge');
    assert.strictEqual(archiveAfter.analyses[0]?.archetype?.shadowArchetype.shadowName, 'Kontrolcü Bilge');

    deleteClientRecord(client.id);
  });

  it('7. Danışanlar arası tam izolasyon: Danışan A nın anne adı değiştiğinde Danışan B nin Ebced ve tasarımlarına ASLA dokunulmamalıdır', () => {
    const clientA = createSampleClient('IsoA', 'Fatma');
    const clientB = createSampleClient('IsoB', 'Ayşe');

    saveClientEbced(clientA.id, mockEbcedV1);
    saveClientDesign(clientA.id, mockDesign(clientA.id));

    saveClientEbced(clientB.id, mockEbcedV2);
    saveClientDesign(clientB.id, mockDesign(clientB.id));

    // Sadece Danışan A'nın anne adını güncelle
    const updatedA: Client = {
      ...clientA,
      motherName: 'Gülseren',
    };
    updateClientRecord(updatedA);

    // Danışan A'nın bağımlılıkları silinmiş olmalı
    const archiveA = getClientArchive(clientA.id);
    assert.ok(archiveA);
    assert.strictEqual(archiveA.analyses[0]?.ebced, undefined);
    assert.strictEqual(archiveA.designs.length, 0);

    // Danışan B'nin verileri BİREBİR KORUNMUŞ OLMALIDIR
    const archiveB = getClientArchive(clientB.id);
    assert.ok(archiveB);
    assert.strictEqual(archiveB.analyses[0]?.ebced?.combinedTotal, 360);
    assert.strictEqual(archiveB.analyses[0]?.ebced?.motherNameValue, 240);
    assert.strictEqual(archiveB.analyses[0]?.ebced?.elementalResonance, 'Su');
    assert.strictEqual(archiveB.designs.length, 1);
    assert.strictEqual(archiveB.designs[0].title, 'Geometrik Ebced Tasarımı');

    deleteClientRecord(clientA.id);
    deleteClientRecord(clientB.id);
  });

  it('8. Yeni anne adıyla hesaplama yapıldığında tekil ve güncel kayıt oluşmalı, eski sürüm birikmemelidir', () => {
    const client = createSampleClient('T8', 'Fatma');
    saveClientEbced(client.id, mockEbcedV1);

    // Anne adı güncellemesi: Fatma -> Meryem
    const updatedClient: Client = {
      ...client,
      motherName: 'Meryem',
    };
    updateClientRecord(updatedClient);

    const archiveMid = getClientArchive(client.id);
    assert.ok(archiveMid);
    assert.strictEqual(archiveMid.analyses[0]?.ebced, undefined);

    // Yeni anne adıyla yeni Ebced kaydı kaydet
    saveClientEbced(client.id, mockEbcedV2);

    const archiveFinal = getClientArchive(client.id);
    assert.ok(archiveFinal);
    assert.strictEqual(archiveFinal.analyses[0]?.ebced?.combinedTotal, 360);
    assert.strictEqual(archiveFinal.analyses[0]?.ebced?.motherNameValue, 240);
    assert.strictEqual(archiveFinal.analyses[0]?.ebced?.elementalResonance, 'Su');

    // Sadece 1 analiz kaydı olmalı
    assert.strictEqual(archiveFinal.analyses.length, 1, 'Mükerrer analiz nesnesi oluşmamalıdır');

    deleteClientRecord(client.id);
  });

  it('9. Anne adı hiçbir görsel üretim istemine (pozitif veya negatif prompt) sızmamalıdır', () => {
    const motherName = 'Zehra';
    const client = createSampleClient('PromptTest', motherName);

    const promptOutput = generateUnifiedVisualPrompt({
      clientId: client.id,
      clientFullName: `${client.firstName} ${client.lastName}`,
      motherName: client.motherName,
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç ön kol',
        recommendedDimensionsCm: { width: 10, height: 16 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Yaşam Çiçeği',
        secondarySymbols: ['Metatron Küpü'],
        keyComponents: ['Yaşam Çiçeği', 'Metatron Küpü'],
        technicalAdviceForArtist: [],
      },
      selectedSymbols: [
        {
          symbolId: 'flower_of_life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Yaşam dengesi',
          weight: 'PRIMARY',
        },
      ],
      recommendedSymbols: [],
      excludedSymbols: [],
      style: 'FINE_LINE',
      colorProfile: 'MONOCHROME_BLACK',
    });

    const mLower = motherName.toLocaleLowerCase('tr-TR');
    assert.strictEqual(promptOutput.primaryPromptEn.toLocaleLowerCase('tr-TR').includes(mLower), false);
    assert.strictEqual(promptOutput.conceptPromptTr.toLocaleLowerCase('tr-TR').includes(mLower), false);
    assert.strictEqual(promptOutput.negativePrompt.toLocaleLowerCase('tr-TR').includes(mLower), false);

    deleteClientRecord(client.id);
  });

  it('10. Anne adı değişmediğinde (yalnızca telefon veya notlar güncellendiğinde) Ebced ve semboller gereksiz yere silinmemelidir', () => {
    const client = createSampleClient('NoChange', 'Fatma');
    saveClientEbced(client.id, mockEbcedV1);
    saveClientSymbolAnalysis(client.id, mockSymbolAnalysis(client.id));
    saveClientDesign(client.id, mockDesign(client.id));

    // Anne adı aynı, yalnızca telefon ve not değişti
    const updatedClient: Client = {
      ...client,
      phone: '5550001122',
      notes: 'Yeni ek not',
    };
    updateClientRecord(updatedClient);

    const archive = getClientArchive(client.id);
    assert.ok(archive);
    assert.ok(archive.analyses[0]?.ebced, 'Anne adı değişmediğinde Ebced kaydı korunmalıdır');
    assert.strictEqual(archive.analyses[0]?.ebced?.combinedTotal, 255);
    assert.strictEqual(archive.symbolAnalyses.length, 1, 'Anne adı değişmediğinde semboller korunmalıdır');
    assert.strictEqual(archive.designs.length, 1, 'Anne adı değişmediğinde tasarım korunmalıdır');

    deleteClientRecord(client.id);
  });
});
