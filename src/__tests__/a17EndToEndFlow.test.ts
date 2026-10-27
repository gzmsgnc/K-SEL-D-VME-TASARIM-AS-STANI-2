import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  getStoredClients,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  getClientDesigns,
  deleteClientDesign,
  clearClientDesigns,
  saveClientSymbolAnalysis,
  getClientSymbolAnalyses,
  clearClientSymbolAnalyses,
  getStoredActiveClientId,
  setStoredActiveClientId,
} from '../store/storage';
import { Client } from '../types/client';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../types/analysis';
import { prepareRecipeModule, generateClientRecipe } from '../modules/recipe';
import {
  prepareSymbolModule,
  generateVisualPromptForClient,
  generateUnifiedVisualPrompt,
} from '../modules/symbols';

function createMockClientData(nameSuffix: string, motherName: string = 'Fatma') {
  return {
    firstName: `Ahmet_${nameSuffix}`,
    lastName: `Yılmaz_${nameSuffix}`,
    email: `ahmet_${nameSuffix.toLowerCase()}@example.com`,
    phone: '5550001122',
    birthDate: '1990-06-15',
    birthTime: '10:30',
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
    motherName,
    notes: 'A17 Uçtan uca test danışanı',
  };
}

describe('A17: Uçtan Uca Danışan → Analiz → Reçete → Tasarım Akışı Testleri', () => {
  // Senaryo 1 & 2: Danışan Oluşturma ve Zorunlu Bilgiler
  it('1 & 2. Yeni danışan oluşturulmalı ve tüm zorunlu temel bilgileri eksiksiz kaydedilmelidir', () => {
    const rawData = createMockClientData('Flow1');
    const client = createClientRecord(rawData, 'OWNER_MANUAL');

    assert.ok(client.id, 'Danışan benzersiz bir ID almalıdır');
    assert.strictEqual(client.firstName, rawData.firstName);
    assert.strictEqual(client.lastName, rawData.lastName);
    assert.strictEqual(client.birthDate, rawData.birthDate);
    assert.strictEqual(client.motherName, rawData.motherName);
    assert.strictEqual(client.status, 'ACTIVE');

    const storedList = getStoredClients();
    const found = storedList.find((c) => c.id === client.id);
    assert.ok(found, 'Yeni danışan localStorage / depolamada bulunmalıdır');
  });

  // Senaryo 3 & 4: Danışan İzolasyonu ve Çapraz Veri Koruması
  it('3 & 4. Danışan değiştirildiğinde önceki danışanın analizleri ve tasarımı yeni danışana taşınmamalıdır (Danışan İzolasyonu)', () => {
    const clientA = createClientRecord(createMockClientData('ClientA'), 'OWNER_MANUAL');
    const clientB = createClientRecord(createMockClientData('ClientB'), 'OWNER_MANUAL');

    // Client A için numeroloji kaydedelim
    const numA: NumerologyAnalysis = {
      lifePathNumber: 7,
      destinyNumber: 7,
      soulUrgeNumber: 7,
      personalityNumber: 7,
      birthdayNumber: 7,
      worldMissionNumber: 5,
      karmicLessons: [],
      masterNumbers: [],
    };
    saveClientNumerology(clientA.id, numA);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.ok(archiveA, 'Client A arşivi açılabilmelidir');
    assert.ok(archiveB, 'Client B arşivi açılabilmelidir');

    assert.strictEqual(archiveA?.analyses.length, 1);
    assert.strictEqual(archiveA?.analyses[0].clientId, clientA.id);
    assert.strictEqual(archiveA?.analyses[0].numerology?.lifePathNumber, 7);

    // Client B'nin analizleri boş olmalı, A'nın verileri B'ye sızmamalıdır
    assert.strictEqual(archiveB?.analyses.length, 0, 'Client A verisi Client B arşivine sızmamalıdır');
  });

  // Senaryo 5: Gerekli Analizler Olmadan Reçete Üretilemez
  it('5. Gerekli temel analizler (Numeroloji, Çakra, Arketip) tamamlanmadan reçete oluşturulamamalıdır', () => {
    const client = createClientRecord(createMockClientData('NoAnalysis'), 'OWNER_MANUAL');
    const archive = getClientArchive(client.id);

    const prep = prepareRecipeModule(client, archive);
    assert.strictEqual(prep.status, 'INPUTS_MISSING');
    assert.ok(prep.warningNotices.length > 0);

    const result = generateClientRecipe(client, archive);
    assert.strictEqual(result.success, false);
    assert.ok(result.errorMessageTr?.includes('Reçete üretimi engellendi'));
  });

  // Senaryo 6: Reçete Olmadan Görsel İstem Üretilemez
  it('6. Reçete oluşmadan görsel istem oluşturulamaz ve sahte prompt üretilmez', () => {
    const client = createClientRecord(createMockClientData('NoRecipe'), 'OWNER_MANUAL');
    const archive = getClientArchive(client.id);

    assert.throws(
      () => {
        generateVisualPromptForClient(client, archive);
      },
      /Eksik reçete/i,
      'Reçete yokken adaptör hata fırlatmalıdır'
    );
  });

  // Senaryo 7–11: Uçtan Uca Tam Akış (Analizler → Reçete → Semboller → Görsel İstem)
  it('7–11. Tam analizli danışanda Reçete → Sembol → Görsel İstem zinciri doğru danışan, stil ve yerleşimle çalışmalı; hariç tutulan sembol ve anne adı sızmamalıdır', () => {
    const motherName = 'Zeynep';
    const client = createClientRecord(createMockClientData('FullChain', motherName), 'OWNER_MANUAL');

    // 1. Numeroloji Kaydet
    const num: NumerologyAnalysis = {
      lifePathNumber: 1,
      destinyNumber: 1,
      soulUrgeNumber: 1,
      personalityNumber: 1,
      birthdayNumber: 1,
      worldMissionNumber: 2,
      karmicLessons: [],
      masterNumbers: [],
    };
    saveClientNumerology(client.id, num);

    // 2. Çakra Kaydet
    const chakra: ChakraAnalysis = {
      chakras: [
        {
          chakra: 'SOLAR_PLEXUS',
          status: 'BLOCKED',
          score: 3,
          focusRecommendations: ['İrade ve ateş sembolleri'],
        },
      ],
      primaryDeficit: 'SOLAR_PLEXUS',
      dominantChakra: 'CROWN',
    };
    saveClientChakra(client.id, chakra);

    // 3. Arketip Kaydet
    const archetype: ArchetypeAnalysis = {
      unifiedArchetype: {
        primary: 'Savaşçı',
        secondary: 'Öncü',
        description: 'Cesur irade ve eyleme geçme gücü.',
      },
      shadowArchetype: {
        shadowName: 'Yıkıcı Savaşçı',
        transformationalSymbol: 'Denge Mührü',
      },
    };
    saveClientArchetype(client.id, archetype);

    // 4. Reçete Üret
    const archiveWithAnalyses = getClientArchive(client.id);
    const recipeResult = generateClientRecipe(client, archiveWithAnalyses, {
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'FOREARM_INNER',
      colorPreference: 'MONOCHROME_BLACK',
      excludedSymbols: ['yılan', 'kuru kafa'],
      includeTotemInVisual: false,
    });

    assert.strictEqual(recipeResult.success, true);
    assert.ok(recipeResult.design);
    saveClientDesign(client.id, recipeResult.design!);

    // 5. Görsel Prompt Zincirini Çalıştır
    const archiveWithDesign = getClientArchive(client.id);
    const promptOutput = generateVisualPromptForClient(client, archiveWithDesign, {
      excludedSymbols: ['yılan'],
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'FOREARM_INNER',
      includeTotemInVisual: false,
    });

    // Doğrulamalar:
    // a. Anne adı asla prompta girmemeli (Kural 9)
    assert.strictEqual(promptOutput.primaryPromptEn.includes(motherName), false);
    assert.strictEqual(promptOutput.conceptPromptTr.includes(motherName), false);
    assert.strictEqual(promptOutput.negativePrompt.includes(motherName), false);

    // b. Hariç tutulan semboller pozitif prompta girmemeli (Kural 8)
    assert.strictEqual(promptOutput.primaryPromptEn.toLowerCase().includes('yılan'), false);
    assert.strictEqual(promptOutput.conceptPromptTr.toLowerCase().includes('yılan'), false);

    // c. Stil ve yerleşim aktarımı (Kural 11)
    assert.ok(promptOutput.conceptPromptTr.includes('İnce Çizgi / Minimalist'));
    assert.ok(promptOutput.conceptPromptTr.includes('İç Ön Kol'));
    assert.ok(promptOutput.primaryPromptEn.includes('fine line'));

    // d. Totem dahil değilse negatif filtrede kalmalı (Kural 10)
    assert.ok(promptOutput.negativePrompt.includes('realistic animal face'));
  });

  // Senaryo 12 & 13: Versiyonlama ve Silme İzolasyonu
  it('12 & 13. Yeni tasarım versiyonu eklendiğinde eski versiyon korunmalı; tasarım silindiğinde analizler silinmemelidir', () => {
    const client = createClientRecord(createMockClientData('Versioning'), 'OWNER_MANUAL');

    // Analiz ekle
    const num: NumerologyAnalysis = {
      lifePathNumber: 3,
      destinyNumber: 3,
      soulUrgeNumber: 3,
      personalityNumber: 3,
      birthdayNumber: 3,
      worldMissionNumber: 6,
      karmicLessons: [],
      masterNumbers: [],
    };
    saveClientNumerology(client.id, num);

    // Versiyon 1 Tasarım
    const design1 = {
      id: 'design_v1_test',
      clientId: client.id,
      versionNumber: 1,
      title: 'Versiyon 1 Tasarımı',
      conceptStatement: 'İlk konsept',
      recipe: {
        style: 'FINE_LINE' as const,
        recommendedPlacement: 'WRIST_INNER' as const,
        placementDescription: 'İç bilek',
        recommendedDimensionsCm: { width: 5, height: 5 },
        colorProfile: 'MONOCHROME_BLACK' as const,
        primarySymbol: 'Yaşam Tohumu',
        keyComponents: ['Tohum'],
        technicalAdviceForArtist: ['1RL'],
      },
      aiPrompt: {
        primaryPromptEn: 'Seed of life fine line tattoo',
        conceptPromptTr: 'Yaşam tohumu dövmesi',
        negativePrompt: 'blur',
        aspectRatio: '1:1' as const,
        artisticModifiers: [],
      },
      createdAt: '2026-10-21T10:00:00Z',
      updatedAt: '2026-10-21T10:00:00Z',
    };
    saveClientDesign(client.id, design1);

    // Versiyon 2 Tasarım
    const design2 = {
      ...design1,
      id: 'design_v2_test',
      versionNumber: 2,
      title: 'Versiyon 2 Tasarımı',
    };
    saveClientDesign(client.id, design2);

    const storedDesigns = getClientDesigns(client.id);
    assert.strictEqual(storedDesigns.length, 2, 'İki versiyon birden saklanmalıdır');
    assert.strictEqual(storedDesigns[0].versionNumber, 1);
    assert.strictEqual(storedDesigns[1].versionNumber, 2);

    // Tasarımlar sıfırlandığında numeroloji analizi silinmemeli
    clearClientDesigns(client.id);
    assert.strictEqual(getClientDesigns(client.id).length, 0, 'Tasarımlar temizlenmelidir');

    const archiveAfterClear = getClientArchive(client.id);
    assert.strictEqual(archiveAfterClear?.analyses.length, 1, 'Analizler KESİNLİKLE silinmemelidir');
    assert.strictEqual(archiveAfterClear?.analyses[0].numerology?.lifePathNumber, 3);
  });

  // Senaryo 14: Sayfa Yenilendiğinde Kayıtlı Danışanın Geri Yüklenmesi
  it('14. Aktif danışan kimliği saklanmalı ve sayfa yenilendiğinde doğru danışan geri yüklenmelidir', () => {
    const client = createClientRecord(createMockClientData('Persist'), 'OWNER_MANUAL');

    setStoredActiveClientId(client.id);
    const restoredId = getStoredActiveClientId();
    assert.strictEqual(restoredId, client.id, 'Aktif danışan kimliği yerel depolamadan doğru geri yüklenmelidir');
  });

  // Senaryo 15: Eksik Veride Sahte Sonuç Yerine Açık Türkçe Uyarı
  it('15. Eksik analiz durumunda sahte veri üretilmemeli, anlaşılır Türkçe uyarı verilmelidir', () => {
    const client = createMockClientData('MissingFields');
    const createdClient = createClientRecord(client, 'OWNER_MANUAL');
    const archive = getClientArchive(createdClient.id);

    const prep = prepareSymbolModule(createdClient, archive);
    assert.strictEqual(prep.status, 'INPUTS_MISSING');
    assert.ok(
      prep.statusMessageTr.includes('temel analizlerin') ||
        prep.warningNotices.some((w) => w.includes('tamamlanmalıdır'))
    );
  });
});
