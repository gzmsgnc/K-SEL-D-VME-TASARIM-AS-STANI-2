import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  setStoredActiveClientId,
  getStoredActiveClientId,
  saveClientNumerology,
  saveClientAstrologyChart,
  saveClientChakra,
  saveClientArchetype,
  saveClientTestResult,
  saveClientDesign,
  getStoredClients,
} from '../../../store/storage';
import { ClientFormData } from '../../../types/client';
import { calculateClientTropicalChart } from '../../astrology';
import { generateClientRecipe } from '../../recipe';
import {
  getAstrologyCardData,
  getNumerologyCardData,
  getChakraCardData,
  getArchetypeCardData,
} from '../../../utils/analysisResultsFormatters';

describe('A61 — Danışan Geçişi, Veri İzolasyonu ve Sayfa Yenileme Canlı Akış Test Paketi', () => {
  const clientDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Aksoy',
    email: 'deniz.aksoy.a61@test.com',
    phone: '05321110001',
    birthDate: '1992-05-15',
    birthTime: '08:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İzmir, Konak',
      city: 'İzmir',
      country: 'Türkiye',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Nuran',
    notes: 'Geçici Test Profili A',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Demir',
    email: 'baris.demir.a61@test.com',
    phone: '05321110002',
    birthDate: '1988-10-03',
    birthTime: '16:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Ankara, Çankaya',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülten',
    notes: 'Geçici Test Profili B',
  };

  it('Danışan A ve B arasında tam veri izolasyonu, geçiş güvenliği ve sayfa yenileme tutarlılığı', () => {
    // 1. İki ayrı geçici danışan kaydı oluştur
    const clientA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(clientDataB, 'OWNER_MANUAL');

    try {
      // 2. Danışan A'yı aktif danışan yap
      setStoredActiveClientId(clientA.id);
      assert.strictEqual(getStoredActiveClientId(), clientA.id, 'Aktif danışan Client A olmalıdır');

      // Danışan A'ya analizler, testler ve dövme reçetesi kaydet
      const astroA = calculateClientTropicalChart(clientA);
      assert.ok(astroA.chart);
      saveClientAstrologyChart(clientA.id, astroA.chart);

      saveClientNumerology(clientA.id, {
        lifePathNumber: 5,
        destinyNumber: 3,
        soulUrgeNumber: 1,
        personalityNumber: 2,
        birthdayNumber: 6,
        worldMissionNumber: 8,
        karmicLessons: [7],
        masterNumbers: [],
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientChakra(clientA.id, {
        dominantChakra: 'HEART',
        primaryDeficit: 'ROOT',
        deficitChakras: ['ROOT'],
        chakras: [
          { chakra: 'ROOT', score: 3, status: 'BLOCKED', focusRecommendations: [] },
          { chakra: 'HEART', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
        ],
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientArchetype(clientA.id, {
        unifiedArchetype: { primary: 'Kâşif', secondary: 'Âşık', description: 'Özgürlük' },
        shadowArchetype: { shadowName: 'Bağımlı Kaçış', transformationalSymbol: 'Köklenme Çıpası' },
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientTestResult(clientA.id, {
        id: 'test_totem_a',
        clientId: clientA.id,
        testType: 'ANIMAL_TOTEM',
        primaryType: 'Şahin',
        secondaryType: 'Kurt',
        completedAt: new Date().toISOString(),
      } as any);

      const archA = getClientArchive(clientA.id);
      assert.ok(archA);
      const recipeResA = generateClientRecipe(clientA, archA);
      assert.strictEqual(recipeResA.success, true);
      assert.ok(recipeResA.design);
      saveClientDesign(clientA.id, recipeResA.design);

      // Danışan A'nın verileri arşivinde eksiksiz olmalı
      const confirmedArchA = getClientArchive(clientA.id);
      assert.strictEqual(confirmedArchA?.analyses.length, 1);
      assert.strictEqual(confirmedArchA?.testResults.length, 1);
      assert.strictEqual(confirmedArchA?.designs.length, 1);
      assert.strictEqual(confirmedArchA?.analyses[0]?.numerology?.lifePathNumber, 5);

      // 3. Danışan B'ye geç
      setStoredActiveClientId(clientB.id);
      assert.strictEqual(getStoredActiveClientId(), clientB.id, 'Aktif danışan Client B olmalıdır');

      // Danışan B'nin ekranında A'ya ait HİÇBİR veri görünmemelidir
      const archB = getClientArchive(clientB.id);
      assert.ok(archB);
      assert.strictEqual(archB.analyses.length, 0, 'Client B nin henüz analizi olmamalıdır');
      assert.strictEqual(archB.testResults.length, 0, 'Client B nin henüz testi olmamalıdır');
      assert.strictEqual(archB.designs.length, 0, 'Client B nin henüz tasarımı olmamalıdır');

      // Hub ve Kart formatlayıcıları Client B için boş dönmelidir
      const cardAstroB = getAstrologyCardData(clientB, archB);
      const cardNumB = getNumerologyCardData(clientB, archB);
      const cardChakraB = getChakraCardData(clientB, archB);
      const cardArchB = getArchetypeCardData(clientB, archB);

      assert.strictEqual(cardAstroB.hasRecord, false, 'Client B astroloji kaydı görünmemelidir');
      assert.strictEqual(cardNumB.hasRecord, false, 'Client B numeroloji kaydı görünmemelidir');
      assert.strictEqual(cardChakraB.hasRecord, false, 'Client B çakra kaydı görünmemelidir');
      assert.strictEqual(cardArchB.hasRecord, false, 'Client B arketip kaydı görünmemelidir');

      // 4. Danışan B'ye tamamen farklı veriler kaydet
      const astroB = calculateClientTropicalChart(clientB);
      assert.ok(astroB.chart);
      saveClientAstrologyChart(clientB.id, astroB.chart);

      saveClientNumerology(clientB.id, {
        lifePathNumber: 9,
        destinyNumber: 8,
        soulUrgeNumber: 4,
        personalityNumber: 4,
        birthdayNumber: 3,
        worldMissionNumber: 1,
        karmicLessons: [2],
        masterNumbers: [],
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientChakra(clientB.id, {
        dominantChakra: 'SOLAR_PLEXUS',
        primaryDeficit: 'SACRAL',
        deficitChakras: ['SACRAL'],
        chakras: [
          { chakra: 'SOLAR_PLEXUS', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
          { chakra: 'SACRAL', score: 2, status: 'BLOCKED', focusRecommendations: [] },
        ],
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientArchetype(clientB.id, {
        unifiedArchetype: { primary: 'Hükümdar', secondary: 'Kahraman', description: 'Düzen' },
        shadowArchetype: { shadowName: 'Tiran / Kontrolcü', transformationalSymbol: 'Kutsal Akış Nehri' },
        calculatedAt: new Date().toISOString(),
      } as any);

      saveClientTestResult(clientB.id, {
        id: 'test_totem_b',
        clientId: clientB.id,
        testType: 'ANIMAL_TOTEM',
        primaryType: 'Ayı',
        secondaryType: 'Kartal',
        completedAt: new Date().toISOString(),
      } as any);

      const archBWithAnalyses = getClientArchive(clientB.id);
      const recipeResB = generateClientRecipe(clientB, archBWithAnalyses);
      assert.strictEqual(recipeResB.success, true);
      assert.ok(recipeResB.design);
      saveClientDesign(clientB.id, recipeResB.design);

      // Danışan B'nin kendi kayıtları doğrulanır
      const confirmedArchB = getClientArchive(clientB.id);
      assert.strictEqual(confirmedArchB?.analyses[0]?.numerology?.lifePathNumber, 9);
      assert.strictEqual(confirmedArchB?.analyses[0]?.chakra?.dominantChakra, 'SOLAR_PLEXUS');
      assert.strictEqual(confirmedArchB?.testResults[0]?.primaryType, 'Ayı');
      assert.strictEqual(confirmedArchB?.designs.length, 1);

      // 5. Danışan A'ya geri dön ve A'nın kendi kayıtlarının eksiksiz korunduğunu doğrula
      setStoredActiveClientId(clientA.id);
      assert.strictEqual(getStoredActiveClientId(), clientA.id, 'Aktif danışan tekrar Client A olmalıdır');

      const reloadedArchA = getClientArchive(clientA.id);
      assert.ok(reloadedArchA);
      assert.strictEqual(reloadedArchA.analyses.length, 1);
      assert.strictEqual(reloadedArchA.analyses[0]?.numerology?.lifePathNumber, 5, 'Client A Yaşam Yolu 5 olarak korunmalıdır');
      assert.strictEqual(reloadedArchA.analyses[0]?.chakra?.dominantChakra, 'HEART', 'Client A Kalp Çakrası korunmalıdır');
      assert.strictEqual(reloadedArchA.analyses[0]?.archetype?.unifiedArchetype.primary, 'Kâşif', 'Client A Kâşif arketipi korunmalıdır');
      assert.strictEqual(reloadedArchA.testResults[0]?.primaryType, 'Şahin', 'Client A Şahin totemi korunmalıdır');
      assert.strictEqual(reloadedArchA.designs.length, 1);

      // Danışan B'nin hiçbir verisi A'ya karışmamış olmalıdır
      assert.notStrictEqual(reloadedArchA.analyses[0]?.numerology?.lifePathNumber, 9);
      assert.notStrictEqual(reloadedArchA.analyses[0]?.chakra?.dominantChakra, 'SOLAR_PLEXUS');
      assert.notStrictEqual(reloadedArchA.testResults[0]?.primaryType, 'Ayı');

      // 6. Sayfa Yenileme Simülasyonu
      // getStoredActiveClientId() yerel depolamadan son seçili danışanı geri getirmelidir
      const restoredActiveId = getStoredActiveClientId();
      assert.strictEqual(restoredActiveId, clientA.id, 'Sayfa yenilendiğinde aktif danışan ID si A olarak korunmalıdır');
      const activeClientFromStorage = getStoredClients().find((c) => c.id === restoredActiveId);
      assert.strictEqual(activeClientFromStorage?.id, clientA.id);
      assert.strictEqual(activeClientFromStorage?.firstName, 'Deniz');

      const restoredArchA = getClientArchive(restoredActiveId!);
      assert.ok(restoredArchA);
      assert.strictEqual(restoredArchA.analyses[0]?.numerology?.lifePathNumber, 5);
      assert.strictEqual(restoredArchA.designs.length, 1);

      // Aktif danışanı B yapıp sayfa yenileme kontrolü
      setStoredActiveClientId(clientB.id);
      const restoredActiveIdB = getStoredActiveClientId();
      assert.strictEqual(restoredActiveIdB, clientB.id, 'Sayfa yenilendiğinde aktif danışan B olarak korunmalıdır');
      const restoredArchB = getClientArchive(restoredActiveIdB!);
      assert.ok(restoredArchB);
      assert.strictEqual(restoredArchB.analyses[0]?.numerology?.lifePathNumber, 9);
      assert.strictEqual(restoredArchB.designs.length, 1);

    } finally {
      // 7. Yalnızca geçici test danışanlarını ve bunlara bağlı kayıtları temizle
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
      setStoredActiveClientId(null);

      // Temizlik doğrulaması
      assert.strictEqual(getClientArchive(clientA.id), null, 'Client A silinmiş olmalıdır');
      assert.strictEqual(getClientArchive(clientB.id), null, 'Client B silinmiş olmalıdır');
    }
  });
});
