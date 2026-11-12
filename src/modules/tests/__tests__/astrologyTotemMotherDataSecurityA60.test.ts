import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateClientTropicalChart } from '../../astrology';
import { generateClientRecipe } from '../../recipe';
import { recommendSymbolsForClient } from '../../symbols';
import {
  createClientRecord,
  getStoredClients,
  saveClientNumerology,
  saveClientAstrologyChart,
  saveClientChakra,
  saveClientArchetype,
  saveClientTestResult,
  deleteClientRecord,
  purgeDemoDataIfPresent,
  isDemoRecord,
  getClientArchive,
  setSafeStorage,
  STORAGE_KEYS,
} from '../../../store/storage';
import { Client, ClientFormData } from '../../../types/client';

describe('A60 — Astroloji, Totem, Anne Adı ve Veri Güvenliği Doğrulama Test Paketi', () => {
  // Test danışanı (Gizem Selma Genç profili)
  const clientGizemData: ClientFormData = {
    firstName: 'Gizem Selma',
    lastName: 'Genç',
    email: 'gizem.genc.a60@test.com',
    phone: '05321112233',
    birthDate: '1991-11-24',
    birthTime: '03:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Fatih',
      city: 'İstanbul',
      district: 'Fatih',
      country: 'Türkiye',
      latitude: 41.0182,
      longitude: 28.9497,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 120,
    },
    motherName: 'Songül',
    notes: 'A60 Test Profili',
  };

  it('1. Astroloji: Reçetede Güneş, Ay ve Yükselen burçları yer almalı; MC, evler ve Vedik astroloji bulunmamalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      // Astroloji hesapla
      const astroRes = calculateClientTropicalChart(client);
      assert.strictEqual(astroRes.success, true);
      assert.ok(astroRes.chart);
      assert.strictEqual(astroRes.chart.moonSign, 'Gemini');
      assert.strictEqual(astroRes.chart.ascendantSign, 'Libra');
      assert.strictEqual(astroRes.chart.isAscendantDefinitive, true);

      saveClientAstrologyChart(client.id, astroRes.chart);
      saveClientNumerology(client.id, {
        lifePathNumber: 1,
        destinyNumber: 7,
        soulUrgeNumber: 9,
        personalityNumber: 7,
        birthdayNumber: 6,
        worldMissionNumber: 8,
        karmicLessons: [4],
        masterNumbers: [],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientChakra(client.id, {
        dominantChakra: 'THIRD_EYE',
        primaryDeficit: 'THROAT',
        deficitChakras: ['THROAT'],
        chakras: [
          { chakra: 'ROOT', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SACRAL', score: 6, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SOLAR_PLEXUS', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'HEART', score: 8, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'THROAT', score: 2, status: 'BLOCKED', focusRecommendations: [] },
          { chakra: 'THIRD_EYE', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
          { chakra: 'CROWN', score: 8, status: 'BALANCED', focusRecommendations: [] },
        ],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientArchetype(client.id, {
        unifiedArchetype: { primary: 'Bilge', secondary: 'Mistik', description: 'Rezonans' },
        shadowArchetype: {
          shadowName: 'Bastırılmış Tutku / Bağımlı Âşık',
          transformationalSymbol: 'Kutsal Boğaz Spirali',
        },
        calculatedAt: new Date().toISOString(),
      } as any);

      const arch = getClientArchive(client.id);
      const recipeRes = generateClientRecipe(client, arch);
      assert.strictEqual(recipeRes.success, true);
      assert.ok(recipeRes.design);

      const secondary = recipeRes.design.recipe.secondarySymbols || [];
      const primaryPrompt = recipeRes.design.aiPrompt.primaryPromptEn;

      // Ay ve Yükselen mevcut
      const hasMoonAsc = secondary.some((s) => s.includes('Ay') && s.includes('Yükselen'));
      assert.strictEqual(hasMoonAsc, true, 'İkincil sembollerde Ay ve Yükselen burcu hizalanması bulunmalıdır');

      // Güneş burcu dahil edilmelidir (eski hariç tutma kuralı kaldırıldı)
      const hasSun = secondary.some((s) => s.includes('Güneş'));
      assert.strictEqual(hasSun, true, 'İkincil sembollerde Güneş burcu bulunmalıdır');

      // MC, evler ve Vedik astroloji bulunmamalıdır
      assert.ok(!primaryPrompt.includes('Placidus'), 'AI promptta Placidus bulunmamalıdır');
      assert.ok(!primaryPrompt.includes('Midheaven'), 'AI promptta MC bulunmamalıdır');
      assert.ok(!primaryPrompt.includes('Vedic'), 'AI promptta Vedik bulunmamalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('1.1. Astroloji: Doğum saati bilinmiyorsa 12:00 varsayımı bildirilmeli ve Yükselen sonucunun kesin olmadığı belirtilmelidir', () => {
    const unknownTimeClient: Client = createClientRecord(
      {
        ...clientGizemData,
        email: 'gizem.unknown@test.com',
        birthTime: '',
        isBirthTimeUnknown: true,
      },
      'OWNER_MANUAL'
    );

    try {
      const astroRes = calculateClientTropicalChart(unknownTimeClient);
      assert.strictEqual(astroRes.success, true);
      assert.ok(astroRes.chart);
      // Doğum saati bilinmediğinde 12:00 varsayımı uyarısı
      assert.strictEqual(astroRes.chart.isBirthTimeUnknown, true);
      assert.strictEqual(astroRes.chart.isAscendantDefinitive, false);
      assert.ok(astroRes.chart.ascendantNoticeTr);
      assert.ok(
        astroRes.chart.ascendantNoticeTr.includes('12:00 varsayımı') &&
        astroRes.chart.ascendantNoticeTr.includes('kesin değildir'),
        'Doğum saati bilinmediğinde 12:00 varsayımı ve kesin olmadığı açıkça belirtilmelidir'
      );
      assert.ok(
        astroRes.warningNotices.some((w) => w.includes('12:00 varsayımı') && w.includes('kesin değildir')),
        'Warning notices içinde 12:00 varsayımı ve kesin olmama uyarısı yer almalıdır'
      );
    } finally {
      deleteClientRecord(unknownTimeClient.id);
    }
  });

  it('2. Totem: Varsayılan olarak reçeteye, sembollere veya prompta eklenmemeli; reçete üretimini engellememelidir', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      // Totem testi kaydedilmiş olsun
      saveClientTestResult(client.id, {
        id: 'test_totem_a60',
        clientId: client.id,
        testType: 'ANIMAL_TOTEM',
        primaryType: 'Baykuş',
        secondaryType: 'Geyik',
        completedAt: new Date().toISOString(),
      } as any);

      // Zorunlu analizleri ekle
      saveClientNumerology(client.id, {
        lifePathNumber: 1,
        destinyNumber: 7,
        soulUrgeNumber: 9,
        personalityNumber: 7,
        birthdayNumber: 6,
        worldMissionNumber: 8,
        karmicLessons: [4],
        masterNumbers: [],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientChakra(client.id, {
        dominantChakra: 'THIRD_EYE',
        primaryDeficit: 'THROAT',
        deficitChakras: ['THROAT'],
        chakras: [
          { chakra: 'ROOT', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SACRAL', score: 6, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SOLAR_PLEXUS', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'HEART', score: 8, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'THROAT', score: 2, status: 'BLOCKED', focusRecommendations: [] },
          { chakra: 'THIRD_EYE', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
          { chakra: 'CROWN', score: 8, status: 'BALANCED', focusRecommendations: [] },
        ],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientArchetype(client.id, {
        unifiedArchetype: { primary: 'Bilge', secondary: 'Mistik', description: 'Rezonans' },
        shadowArchetype: {
          shadowName: 'Bastırılmış Tutku / Bağımlı Âşık',
          transformationalSymbol: 'Kutsal Boğaz Spirali',
        },
        calculatedAt: new Date().toISOString(),
      } as any);

      const arch = getClientArchive(client.id);

      // Durum A: includeTotemInVisual belirtilmedi (varsayılan)
      const resDefault = generateClientRecipe(client, arch);
      assert.strictEqual(resDefault.success, true, 'Totem olmadan veya varsayılan ayarlarda reçete başarıyla üretilmelidir');
      assert.ok(resDefault.design);

      const secSymbols = resDefault.design.recipe.secondarySymbols || [];
      const hasTotemInSymbols = secSymbols.some((s) => s.includes('Baykuş') || s.includes('Geyik') || s.includes('silüeti'));
      assert.strictEqual(hasTotemInSymbols, false, 'Varsayılan olarak hayvan totemi reçete sembollerine eklenmemelidir');

      const promptDefault = resDefault.design.aiPrompt.primaryPromptEn.toLowerCase();
      assert.strictEqual(promptDefault.includes('owl'), false, 'Varsayılan olarak promptta Baykuş (owl) bulunmamalıdır');
      assert.strictEqual(promptDefault.includes('deer'), false, 'Varsayılan olarak promptta Geyik (deer) bulunmamalıdır');

      // Sembol öneri motorunda da varsayılan olarak totem eklenmemelidir
      const recSymbols = recommendSymbolsForClient({
        testResults: arch?.testResults || [],
        options: {}, // includeTotemInVisual yok
      });
      const hasTotemInRecommendations = recSymbols.some((r) => r.sourceModule === 'TOTEM');
      assert.strictEqual(hasTotemInRecommendations, false, 'Varsayılan olarak sembol önerilerine TOTEM eklenmemelidir');

      // Durum B: Açıkça includeTotemInVisual = true verildiğinde dahil edilmeli
      const resEnabled = generateClientRecipe(client, arch, { includeTotemInVisual: true });
      assert.strictEqual(resEnabled.success, true);
      assert.ok(resEnabled.design);
      const secEnabled = resEnabled.design.recipe.secondarySymbols || [];
      const hasTotemWhenEnabled = secEnabled.some((s) => s.includes('Baykuş') || s.includes('silüeti'));
      assert.strictEqual(hasTotemWhenEnabled, true, 'Açıkça talep edildiğinde soyut totem silüeti ikincil sembollere eklenmelidir');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('3. Anne adı: Yalnızca Ebced hesabında kullanılmalı; astroloji, numeroloji, çakra, arketip, sembol ve görsel promptlara aktarılmamalıdır', () => {
    const testMotherName = 'Songül';
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      saveClientNumerology(client.id, {
        lifePathNumber: 1,
        destinyNumber: 7,
        soulUrgeNumber: 9,
        personalityNumber: 7,
        birthdayNumber: 6,
        worldMissionNumber: 8,
        karmicLessons: [4],
        masterNumbers: [],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientChakra(client.id, {
        dominantChakra: 'THIRD_EYE',
        primaryDeficit: 'THROAT',
        deficitChakras: ['THROAT'],
        chakras: [
          { chakra: 'ROOT', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SACRAL', score: 6, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'SOLAR_PLEXUS', score: 7, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'HEART', score: 8, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'THROAT', score: 2, status: 'BLOCKED', focusRecommendations: [] },
          { chakra: 'THIRD_EYE', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
          { chakra: 'CROWN', score: 8, status: 'BALANCED', focusRecommendations: [] },
        ],
        calculatedAt: new Date().toISOString(),
      } as any);
      saveClientArchetype(client.id, {
        unifiedArchetype: { primary: 'Bilge', secondary: 'Mistik', description: 'Rezonans' },
        shadowArchetype: {
          shadowName: 'Bastırılmış Tutku',
          transformationalSymbol: 'Kutsal Boğaz Spirali',
        },
        calculatedAt: new Date().toISOString(),
      } as any);

      const arch = getClientArchive(client.id);
      const res = generateClientRecipe(client, arch);
      assert.strictEqual(res.success, true);
      assert.ok(res.design);

      // Primary prompt kontrolü
      assert.strictEqual(
        res.design.aiPrompt.primaryPromptEn.toLowerCase().includes(testMotherName.toLowerCase()),
        false,
        'İngilizce promptta anne adı yer almamalıdır'
      );
      // Concept prompt kontrolü
      assert.strictEqual(
        res.design.aiPrompt.conceptPromptTr.toLowerCase().includes(testMotherName.toLowerCase()),
        false,
        'Türkçe konsept promptunda anne adı yer almamalıdır'
      );
      // Negative prompt kontrolü: Anne adı hiçbir prompt metnine aktarılmaz, genel isim/metin yasağı kuralı kullanılır
      assert.strictEqual(
        res.design.aiPrompt.negativePrompt.toLowerCase().includes(testMotherName.toLowerCase()),
        false,
        'Anne adı negatif prompt dahil hiçbir görsel istem metnine aktarılmamalıdır'
      );
      assert.strictEqual(
        res.design.aiPrompt.negativePrompt.includes('no names'),
        true,
        'Genel isim ve metin engelleme kuralı negatif istemde yer almalıdır'
      );
      // Sembol listesi kontrolü
      const allSymbols = [
        res.design.recipe.primarySymbol,
        ...(res.design.recipe.secondarySymbols || []),
      ];
      const hasMotherInSymbols = allSymbols.some((s) => s && s.toLowerCase().includes(testMotherName.toLowerCase()));
      assert.strictEqual(hasMotherInSymbols, false, 'Dövme sembollerinde anne adı bulunmamalıdır');

      // Anne adı boşken sahte isim uydurulmadığı kontrolü
      const emptyMotherClient = createClientRecord(
        {
          ...clientGizemData,
          email: 'no.mother@test.com',
          motherName: '',
        },
        'OWNER_MANUAL'
      );
      assert.strictEqual(emptyMotherClient.motherName, '', 'Boş anne adı yerine değer üretilmemelidir');
      deleteClientRecord(emptyMotherClient.id);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('4. Veri güvenliği: Demo kayıtları temizlenmeli; gerçek danışan verileri izole kalmalı ve asla silinmemelidir', () => {
    // 1. Gerçek danışan oluştur
    const realClient = createClientRecord(clientGizemData, 'OWNER_MANUAL');

    // 2. Sentetik bir demo kaydı ekle
    const demoClient: Client = {
      id: 'demo_client_1',
      firstName: 'Demo',
      lastName: 'Kullanıcı',
      email: 'deniz.yildiz@example.com',
      phone: '05000000000',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      isBirthTimeUnknown: false,
      birthLocation: {
        placeName: 'Ankara, Türkiye',
        city: 'Ankara',
        country: 'Türkiye',
        latitude: 39.9334,
        longitude: 32.8597,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
      motherName: 'DemoAnne',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'CLIENT_FORM',
      status: 'ACTIVE',
    };

    assert.strictEqual(isDemoRecord(demoClient), true, 'Demo kaydı doğru tespit edilmelidir');
    assert.strictEqual(isDemoRecord(realClient), false, 'Gerçek danışan demo olarak işaretlenmemelidir');

    // Storage'a demo kaydı enjekte et
    const currentClients = getStoredClients();
    setSafeStorage(STORAGE_KEYS.CLIENTS, [...currentClients, demoClient]);

    // purgeDemoDataIfPresent çalıştır
    purgeDemoDataIfPresent();

    const storedClientsAfterPurge = getStoredClients();
    const hasDemo = storedClientsAfterPurge.some((c) => c.id === 'demo_client_1');
    const hasReal = storedClientsAfterPurge.some((c) => c.id === realClient.id);

    assert.strictEqual(hasDemo, false, 'Demo kayıtları storage üzerinden temizlenmelidir');
    assert.strictEqual(hasReal, true, 'Gerçek danışan kaydı korunmalıdır');

    deleteClientRecord(realClient.id);
  });
});
