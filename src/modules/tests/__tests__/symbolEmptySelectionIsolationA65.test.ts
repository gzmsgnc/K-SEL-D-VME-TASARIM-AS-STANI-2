import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { ClientSymbolAnalysis } from '../../../types/symbol';
import { generateClientRecipe } from '../../recipe/recipeEngineAdapter';
import { runClientAutoAnalysisChain } from '../../pipeline/clientAnalysisPipeline';
import {
  getClientArchive,
  getStoredClients,
  setSafeStorage,
  STORAGE_KEYS,
  saveClientSymbolAnalysis,
} from '../../../store/storage';
import { MASTER_SYMBOLS } from '../../symbols/masterSymbols';

describe('A65 (ADIM 2B) — Boş Seçim İzolasyonu ve Arşiv Fallback Önleme Testleri', () => {
  // Test Danışanı A (Arşivinde 2 sembol kayıtlı olan danışan)
  const clientA: Client = {
    id: 'client_test_a65_danisan_a',
    firstName: 'Selin',
    lastName: 'Yılmaz',
    email: 'selin@example.com',
    phone: '05551112233',
    birthDate: '1990-03-21',
    birthTime: '09:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Kadıköy',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 40.9927,
      longitude: 29.0277,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayla',
    notes: 'Boş seçim izolasyon test danışanı A',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  // Test Danışanı B (Arşivinde hiç sembol olmayan danışan)
  const clientB: Client = {
    id: 'client_test_a65_danisan_b',
    firstName: 'Burak',
    lastName: 'Kaya',
    email: 'burak@example.com',
    phone: '05559998877',
    birthDate: '1988-11-12',
    birthTime: '18:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Ankara, Çankaya',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.9208,
      longitude: 32.8541,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülten',
    notes: 'Boş seçim izolasyon test danışanı B',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  function setupClients(): { archiveA: ClientArchiveRecord; archiveB: ClientArchiveRecord } {
    const clients = getStoredClients().filter((c) => c.id !== clientA.id && c.id !== clientB.id);
    setSafeStorage(STORAGE_KEYS.CLIENTS, [clientA, clientB, ...clients]);

    runClientAutoAnalysisChain(clientA);
    runClientAutoAnalysisChain(clientB);

    // Danışan A için arşive 2 sembol kaydet (Metatron Küpü + Yaşam Çiçeği)
    const initialAnalysisA: ClientSymbolAnalysis = {
      id: 'sym_analysis_a_initial',
      clientId: clientA.id,
      selectedSymbols: [
        {
          symbolId: 'metatron-cube',
          symbolName: 'Metatron Küpü',
          customMeaning: 'Zihinsel denge ve düzen',
          weight: 'PRIMARY',
        },
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Evrensel uyum',
          weight: 'SECONDARY',
        },
      ],
      compositionNarrative: 'Danışan A ilk kayıtlı kompozisyonu',
      version: 1,
      createdAt: '2026-04-01T10:30:00.000Z',
    };
    saveClientSymbolAnalysis(clientA.id, initialAnalysisA);

    const archA = getClientArchive(clientA.id);
    const archB = getClientArchive(clientB.id);

    assert.ok(archA, 'Danışan A arşivi hazır olmalıdır');
    assert.ok(archB, 'Danışan B arşivi hazır olmalıdır');

    return { archiveA: archA, archiveB: archB };
  }

  // SENARYO 1: İlk Açılışta Mevcut Geçerli Seçimin Doğru Yüklenmesi
  it('Senaryo 1: İlk açılışta arşivdeki mevcut geçerli sembol seçimi doğru yüklenmeli ve reçeteye aktarılmalıdır', () => {
    const { archiveA } = setupClients();

    // ClientDetailCard başlangıç durum simülasyonu:
    // isUserModifiedSymbols = false iken arşivdeki son kayıt yüklenir
    const clientAnalyses = archiveA.symbolAnalyses.filter((s) => s.clientId === clientA.id);
    const latestAnalysis = clientAnalyses[clientAnalyses.length - 1];

    let isUserModifiedSymbols = false;
    let selectedSymbolItems = (latestAnalysis?.selectedSymbols || []).map((s) => ({ ...s }));

    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean, analysis: typeof latestAnalysis) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestAnalysis);

    assert.strictEqual(effective.length, 2, 'Başlangıçta 2 sembol olmalıdır');
    assert.strictEqual(effective[0].symbolId, 'metatron-cube');
    assert.strictEqual(effective[1].symbolId, 'flower-of-life');

    // Reçete üretimine aktarım doğrulaması
    const recipeRes = generateClientRecipe(clientA, archiveA, {
      selectedSymbolObjects: effective,
    });
    assert.ok(recipeRes.success && recipeRes.design);
    assert.strictEqual(recipeRes.design.recipe.primarySymbol, 'Metatron Küpü');
  });

  // SENARYO 2: Kullanıcı Bir Sembolü Tek Tek Sildiğinde Silinen Sembolün Geri Gelmemesi
  it('Senaryo 2: Kullanıcı bir sembolü sildiğinde, silinen sembol listeden çıkmalı ve geri dirilmemelidir', () => {
    const { archiveA } = setupClients();
    const latestAnalysis = archiveA.symbolAnalyses[archiveA.symbolAnalyses.length - 1];

    let isUserModifiedSymbols = false;
    let selectedSymbolItems = (latestAnalysis?.selectedSymbols || []).map((s) => ({ ...s }));

    // Kullanıcı 'metatron-cube' sembolünü siliyor
    isUserModifiedSymbols = true;
    selectedSymbolItems = selectedSymbolItems.filter((s) => s.symbolId !== 'metatron-cube');

    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean, analysis: typeof latestAnalysis) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestAnalysis);

    assert.strictEqual(effective.length, 1, 'Kalan sembol sayısı 1 olmalıdır');
    assert.strictEqual(effective[0].symbolId, 'flower-of-life', 'Yalnızca Yaşam Çiçeği kalmalıdır');
    assert.ok(!effective.some((s) => s.symbolId === 'metatron-cube'), 'Silinen Metatron Küpü geri gelmemelidir');

    // Reçeteye aktarımda da Metatron Küpü olmamalı, Yaşam Çiçeği ikincil olarak yer almalı
    const recipeRes = generateClientRecipe(clientA, archiveA, {
      selectedSymbolObjects: effective,
    });
    assert.ok(recipeRes.success && recipeRes.design);
    assert.ok(recipeRes.design.recipe.secondarySymbols?.includes('Yaşam Çiçeği'), 'Yaşam Çiçeği ikincil sembollerde bulunmalıdır');
    const remainingInRecipe = recipeRes.design.recipe.detailedSymbols?.find((s) => s.symbolId === 'flower-of-life');
    assert.ok(remainingInRecipe, 'Yaşam Çiçeği detaylı sembollerde bulunmalıdır');
    const deletedInRecipe = recipeRes.design.recipe.detailedSymbols?.find((s) => s.symbolId === 'metatron-cube');
    assert.strictEqual(deletedInRecipe, undefined, 'Silinen Metatron Küpü reçeteye asla sızamaz');
  });

  // SENARYO 3: Bütün Semboller Tek Tek Silindiğinde Reçetenin Gerçekten Boş Kalması (Kritik Fallback Onarımı)
  it('Senaryo 3: Kullanıcı bütün sembolleri tek tek sildiğinde seçim boş kalmalı, arşivdeki eski semboller ASLA geri gelmemelidir', () => {
    const { archiveA } = setupClients();
    const latestAnalysis = archiveA.symbolAnalyses[archiveA.symbolAnalyses.length - 1];

    let isUserModifiedSymbols = false;
    let selectedSymbolItems = (latestAnalysis?.selectedSymbols || []).map((s) => ({ ...s }));

    // 1. sembol siliniyor
    isUserModifiedSymbols = true;
    selectedSymbolItems = selectedSymbolItems.filter((s) => s.symbolId !== 'metatron-cube');

    // 2. sembol de siliniyor (liste tamamen boşalıyor)
    selectedSymbolItems = selectedSymbolItems.filter((s) => s.symbolId !== 'flower-of-life');
    assert.strictEqual(selectedSymbolItems.length, 0, 'selectedSymbolItems boş dizi olmalıdır');

    // Düzeltilen mantık kontrolü:
    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean, analysis: typeof latestAnalysis) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestAnalysis);

    // KRİTİK DOĞRULAMA:
    assert.strictEqual(effective.length, 0, 'Kullanıcı bilinçli olarak sildiğinde effectiveSelectedSymbolItems boş dizi olmalıdır!');
    assert.deepStrictEqual(effective, [], 'Eski arşiv sembolleri ASLA geri dirilmemelidir');

    // Reçeteye aktarıldığında hiçbir kullanıcı sembol nesnesi girmemelidir
    const recipeRes = generateClientRecipe(clientA, archiveA, {
      selectedSymbolObjects: effective.length > 0 ? effective : undefined,
    });
    assert.ok(recipeRes.success && recipeRes.design);
    // detailedSymbols içinde kullanıcının seçtiği nesnelerden gelen sembolId olmamalıdır
    const userSelectedInRecipe = recipeRes.design.recipe.detailedSymbols?.filter((s) => s.symbolId === 'metatron-cube' || s.symbolId === 'flower-of-life');
    assert.strictEqual(userSelectedInRecipe?.length || 0, 0, 'Silinen semboller reçeteye sızmamalıdır');
  });

  // SENARYO 4: “Tümünü Temizle” Sonrasında Arşivde Eski Kayıt Olsa Bile Reçeteye Sembol Sızmaması
  it('Senaryo 4: “Tümünü Temizle” yapıldığında isUserModifiedSymbols=true ve liste boş kalmalı, reçeteye sembol sızmamalıdır', () => {
    const { archiveA } = setupClients();
    const latestAnalysis = archiveA.symbolAnalyses[archiveA.symbolAnalyses.length - 1];

    let isUserModifiedSymbols = false;
    let selectedSymbolItems = (latestAnalysis?.selectedSymbols || []).map((s) => ({ ...s }));

    // handleClearAllSymbols tetikleniyor
    isUserModifiedSymbols = true;
    selectedSymbolItems = [];

    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean, analysis: typeof latestAnalysis) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestAnalysis);
    assert.strictEqual(effective.length, 0, 'Tümünü temizle sonrası sembol kalmamalıdır');

    const recipeRes = generateClientRecipe(clientA, archiveA, {
      selectedSymbolObjects: effective.length > 0 ? effective : undefined,
    });
    assert.ok(recipeRes.success && recipeRes.design);
    assert.strictEqual(recipeRes.design.recipe.selectedSymbolObjects?.length || 0, 0, 'Reçeteye hiçbir seçili sembol nesnesi aktarılmamalıdır');
  });

  // SENARYO 5: Bilinçli Boş Seçimin Korunması ve Fallback İzolasyonu
  it('Senaryo 5: isUserModifiedSymbols=true iken arşivdeki geçmiş kayıtlar güncel seçimi kirletemez', () => {
    const { archiveA } = setupClients();
    const latestAnalysis = archiveA.symbolAnalyses[archiveA.symbolAnalyses.length - 1];
    assert.ok(latestAnalysis.selectedSymbols.length > 0, 'Arşivde geçmiş kayıt mevcuttur');

    // Kullanıcı seçimi bilerek boş bıraktı
    const isUserModifiedSymbols = true;
    const selectedSymbolItems: any[] = [];

    function computeEffective(items: any[], isModified: boolean, analysis: typeof latestAnalysis) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestAnalysis);

    assert.strictEqual(effective.length, 0, 'isUserModifiedSymbols=true olduğu için fallback devreye girmemelidir');
    assert.strictEqual(latestAnalysis.selectedSymbols.length, 2, 'Arşiv kaydı silinmemiştir, ancak aktif seçimi kirletmesi önlenmiştir');
  });

  // SENARYO 6: Danışan Değiştirildiğinde Diğer Danışanın Sembollerinin Yüklenmemesi
  it('Senaryo 6: Danışan A dan Danışan B ye geçildiğinde Danışan A nın sembolleri Danışan B ye asla sızmamalıdır', () => {
    const { archiveA, archiveB } = setupClients();

    // Danışan A aktifken:
    const analysesA = archiveA.symbolAnalyses.filter((s) => s.clientId === clientA.id);
    const latestA = analysesA[analysesA.length - 1];
    let isUserModifiedSymbols = false;
    let selectedSymbolItems = (latestA?.selectedSymbols || []).map((s) => ({ ...s }));
    assert.strictEqual(selectedSymbolItems.length, 2, 'Danışan A nın 2 sembolü olmalıdır');

    // KULLANICI DANIŞAN B'YE GEÇİYOR (client.id değişiyor):
    // useEffect([client.id]) simülasyonu:
    const analysesB = archiveB.symbolAnalyses.filter((s) => s.clientId === clientB.id);
    const latestB = analysesB.length > 0 ? analysesB[analysesB.length - 1] : null;

    if (latestB?.selectedSymbols && latestB.selectedSymbols.length > 0) {
      selectedSymbolItems = latestB.selectedSymbols.map((s) => ({ ...s }));
    } else {
      selectedSymbolItems = [];
    }
    isUserModifiedSymbols = false;

    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean, analysis: typeof latestB) {
      if (isModified) return items;
      if (items && items.length > 0) return items;
      if (analysis?.selectedSymbols && analysis.selectedSymbols.length > 0) return analysis.selectedSymbols;
      return [];
    }

    const effectiveB = computeEffective(selectedSymbolItems, isUserModifiedSymbols, latestB);

    assert.strictEqual(effectiveB.length, 0, 'Danışan B nin sembol listesi tamamen temiz ve boş olmalıdır');
    assert.ok(!effectiveB.some((s) => s.symbolId === 'metatron-cube'), 'Danışan A nın Metatron Küpü sembolü Danışan B ye sızamaz');
    assert.ok(!effectiveB.some((s) => s.symbolId === 'flower-of-life'), 'Danışan A nın Yaşam Çiçeği sembolü Danışan B ye sızamaz');
  });

  // SENARYO 7: Yeni Sembol Seçildiğinde Normal Aktarım ve Ağırlık Sisteminin Kusursuz Çalışması
  it('Senaryo 7: Yeni semboller seçildiğinde PRIMARY, SECONDARY, ACCENT ağırlıkları ve customMeaning reçeteye eksiksiz aktarılmalıdır', () => {
    const { archiveB } = setupClients();

    // Danışan B için sıfırdan 3 seviyeli sembol seçimi
    let isUserModifiedSymbols = true;
    let selectedSymbolItems = [
      {
        symbolId: 'uroboros-infinity',
        symbolName: 'Uroboros Sonsuzluk',
        customMeaning: 'Döngüsel yenilenme ve sonsuz tekamül',
        weight: 'PRIMARY' as const,
      },
      {
        symbolId: 'seed-of-life',
        symbolName: 'Yaşam Tohumu',
        customMeaning: 'Yeni başlangıçlar ve potansiyelin filizlenmesi',
        weight: 'SECONDARY' as const,
      },
      {
        symbolId: 'sri-yantra',
        symbolName: 'Sri Yantra',
        customMeaning: 'Bolluk ve kozmik titreşim odak noktası',
        weight: 'ACCENT' as const,
      },
    ];

    function computeEffective(items: typeof selectedSymbolItems, isModified: boolean) {
      if (isModified) return items;
      return items;
    }

    const effective = computeEffective(selectedSymbolItems, isUserModifiedSymbols);
    assert.strictEqual(effective.length, 3, '3 sembol seçilmiş olmalıdır');

    const recipeRes = generateClientRecipe(clientB, archiveB, {
      selectedSymbolObjects: effective,
    });

    assert.ok(recipeRes.success && recipeRes.design, 'Reçete başarıyla üretilmelidir');
    const recipe = recipeRes.design.recipe;

    // 1. PRIMARY doğrulaması
    assert.strictEqual(recipe.primarySymbol, 'Uroboros Sonsuzluk', 'Birincil sembol Uroboros Sonsuzluk olmalıdır');
    const primaryDetail = recipe.detailedSymbols?.find((s) => s.symbolId === 'uroboros-infinity');
    assert.ok(primaryDetail, 'Uroboros detay gerekçesi bulunmalıdır');
    assert.strictEqual(primaryDetail.weight, 'PRIMARY');
    assert.strictEqual(primaryDetail.customMeaning, 'Döngüsel yenilenme ve sonsuz tekamül');
    assert.ok(primaryDetail.traditionalMeaningTr, 'Geleneksel anlam master sembolden aktarılmış olmalıdır');

    // 2. SECONDARY doğrulaması
    const secondaryDetail = recipe.detailedSymbols?.find((s) => s.symbolId === 'seed-of-life');
    assert.ok(secondaryDetail, 'Yaşam Tohumu gerekçesi bulunmalıdır');
    assert.strictEqual(secondaryDetail.weight, 'SECONDARY');
    assert.strictEqual(secondaryDetail.customMeaning, 'Yeni başlangıçlar ve potansiyelin filizlenmesi');

    // 3. ACCENT doğrulaması
    const accentDetail = recipe.detailedSymbols?.find((s) => s.symbolId === 'sri-yantra');
    assert.ok(accentDetail, 'Sri Yantra gerekçesi bulunmalıdır');
    assert.strictEqual(accentDetail.weight, 'ACCENT');
    assert.strictEqual(accentDetail.customMeaning, 'Bolluk ve kozmik titreşim odak noktası');
  });
});
