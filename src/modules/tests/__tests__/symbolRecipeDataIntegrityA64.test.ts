import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { generateClientRecipe } from '../../recipe/recipeEngineAdapter';
import { runClientAutoAnalysisChain } from '../../pipeline/clientAnalysisPipeline';
import { getClientArchive, getStoredClients, setSafeStorage, STORAGE_KEYS, saveClientDesign, getClientDesigns } from '../../../store/storage';
import { MASTER_SYMBOLS } from '../../symbols/masterSymbols';
import { formatSymbolCompositionText, formatTattooRecipeText } from '../../../utils/tattooDesignFormatters';

describe('A64 (ADIM 2B) — Sembol–Reçete Veri Bütünlüğü Doğrulama Testleri', () => {
  const testClient: Client = {
    id: 'client_test_a64_integrity',
    firstName: 'Deniz',
    lastName: 'Aksoy',
    email: 'deniz@example.com',
    phone: '05553334455',
    birthDate: '1993-05-18',
    birthTime: '14:30',
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
    notes: 'ADIM 2B veri bütünlüğü test danışanı',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  function setupClient(client: Client): ClientArchiveRecord {
    const clients = getStoredClients();
    setSafeStorage(STORAGE_KEYS.CLIENTS, [client, ...clients.filter((c) => c.id !== client.id)]);
    runClientAutoAnalysisChain(client);
    const arch = getClientArchive(client.id);
    assert.ok(arch, `Arşiv bulunamadı: ${client.id}`);
    return arch;
  }

  const archive = setupClient(testClient);

  // SENARYO 1: BİRİNCİL Sembol Aktarımı
  it('1. BİRİNCİL sembol kütüphane kimliği (symbolId) ve detaylarıyla reçeteye aktarılmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'metatron-cube',
          symbolName: 'Metatron Küpü',
          customMeaning: 'Evrensel düzen ve yüksek zihinsel berraklık niyetim',
          weight: 'PRIMARY',
        },
      ],
    });

    assert.ok(res.success && res.design, 'Reçete başarıyla üretilmelidir');
    const recipe = res.design.recipe;
    assert.strictEqual(recipe.primarySymbol, 'Metatron Küpü', 'Ana sembol Metatron Küpü olmalıdır');

    const primaryRationale = recipe.detailedSymbols?.find((s) => s.isPrimary);
    assert.ok(primaryRationale, 'Birincil gerekçe bulunmalıdır');
    assert.strictEqual(primaryRationale.symbolId, 'metatron-cube', 'symbolId metatron-cube olarak korunmalıdır');
    assert.strictEqual(primaryRationale.weight, 'PRIMARY', 'Ağırlık PRIMARY olmalıdır');
    assert.strictEqual(primaryRationale.customMeaning, 'Evrensel düzen ve yüksek zihinsel berraklık niyetim', 'Kişisel anlam korunmalıdır');
    assert.ok(primaryRationale.traditionalMeaningTr && primaryRationale.traditionalMeaningTr.length > 10, 'Geleneksel anlam master kütüphaneden gelmelidir');
    assert.ok(primaryRationale.esotericMeaningTr && primaryRationale.esotericMeaningTr.length > 10, 'Ezoterik anlam master kütüphaneden gelmelidir');
  });

  // SENARYO 2: İKİNCİL Sembol Aktarımı
  it('2. İKİNCİL sembol kütüphane kimliği ve tamamlayıcı katman rolüyle reçeteye aktarılmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Bütünlük ve yaşam döngüsü bağı',
          weight: 'SECONDARY',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const recipe = res.design.recipe;
    assert.ok(recipe.secondarySymbols?.includes('Yaşam Çiçeği'), 'İkincil sembollerde Yaşam Çiçeği bulunmalıdır');

    const flowerRationale = recipe.detailedSymbols?.find((s) => s.symbolName === 'Yaşam Çiçeği');
    assert.ok(flowerRationale, 'Yaşam Çiçeği gerekçesi bulunmalıdır');
    assert.strictEqual(flowerRationale.symbolId, 'flower-of-life', 'symbolId korunmalıdır');
    assert.strictEqual(flowerRationale.weight, 'SECONDARY', 'Ağırlık SECONDARY olmalıdır');
    assert.strictEqual(flowerRationale.customMeaning, 'Bütünlük ve yaşam döngüsü bağı', 'Kişisel anlam korunmalıdır');
    assert.ok(flowerRationale.traditionalMeaningTr && flowerRationale.traditionalMeaningTr.length > 10, 'Geleneksel anlam bulunmalıdır');
  });

  // SENARYO 3: VURGU Sembolü Aktarımı (ASLA İKİNCİLE DÖNÜŞTÜRÜLEMEZ)
  it('3. VURGU sembolü reçeteye aktarılmalı ve KESİNLİKLE İKİNCİL olarak dönüştürülmemelidir', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'uroboros-infinity',
          symbolName: 'Ouroboros Sonsuzluk Döngüsü',
          customMeaning: 'Sonsuz yenilenme ve mikro dönüşüm',
          weight: 'ACCENT',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const recipe = res.design.recipe;

    // VURGU sembolü accentSymbols alanında bulunmalı
    assert.ok(recipe.accentSymbols, 'accentSymbols dizisi bulunmalıdır');
    assert.ok(recipe.accentSymbols.includes('Ouroboros Sonsuzluk Döngüsü'), 'Ouroboros accentSymbols içinde yer almalıdır');

    // KESİNLİKLE secondarySymbols içine hapsedilmemelidir
    assert.ok(
      !recipe.secondarySymbols?.includes('Ouroboros Sonsuzluk Döngüsü'),
      'VURGU sembolü secondarySymbols içine dönüştürülmemelidir (İki ağırlık birbirinden bağımsızdır)'
    );

    // detailedSymbols içindeki ağırlığı ACCENT olmalıdır
    const ouroRationale = recipe.detailedSymbols?.find((s) => s.symbolName === 'Ouroboros Sonsuzluk Döngüsü');
    assert.ok(ouroRationale, 'Ouroboros gerekçesi bulunmalıdır');
    assert.strictEqual(ouroRationale.weight, 'ACCENT', 'Ağırlık strictly ACCENT olmalıdır');
    assert.strictEqual(ouroRationale.symbolId, 'uroboros-infinity');
    assert.strictEqual(ouroRationale.customMeaning, 'Sonsuz yenilenme ve mikro dönüşüm');
    assert.ok(ouroRationale.compositionRoleTr.includes('Vurgu ve Mikro Detay'), 'Kompozisyon rolü Vurgu ve Mikro Detay olmalıdır');
  });

  // SENARYO 4: Üç Ağırlığın Eşzamanlı Olarak Bağımsız Korunması
  it('4. BİRİNCİL, İKİNCİL ve VURGU sembolleri aynı reçetede hiyerarşik olarak bağımsız korunmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'metatron-cube',
          symbolName: 'Metatron Küpü',
          customMeaning: 'Merkezi eksen ve koruma',
          weight: 'PRIMARY',
        },
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Çevreleyen kutsal oranlar',
          weight: 'SECONDARY',
        },
        {
          symbolId: 'uroboros-infinity',
          symbolName: 'Ouroboros Sonsuzluk Döngüsü',
          customMeaning: 'Kuyruk birleşiminde mikro aksan',
          weight: 'ACCENT',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const recipe = res.design.recipe;

    assert.strictEqual(recipe.primarySymbol, 'Metatron Küpü');
    assert.ok(recipe.secondarySymbols?.includes('Yaşam Çiçeği'));
    assert.ok(!recipe.secondarySymbols?.includes('Ouroboros Sonsuzluk Döngüsü'));
    assert.ok(recipe.accentSymbols?.includes('Ouroboros Sonsuzluk Döngüsü'));

    const primaryItem = recipe.detailedSymbols?.find((s) => s.symbolName === 'Metatron Küpü');
    const secondaryItem = recipe.detailedSymbols?.find((s) => s.symbolName === 'Yaşam Çiçeği');
    const accentItem = recipe.detailedSymbols?.find((s) => s.symbolName === 'Ouroboros Sonsuzluk Döngüsü');

    assert.strictEqual(primaryItem?.weight, 'PRIMARY');
    assert.strictEqual(secondaryItem?.weight, 'SECONDARY');
    assert.strictEqual(accentItem?.weight, 'ACCENT');
  });

  // SENARYO 5: symbolId Değerinin Değişmeden Korunması
  it('5. symbolId master kütüphanedeki özgün kimliğini korumalı, bozulmamalı veya düşürülmemelidir', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'sri-yantra',
          symbolName: 'Sri Yantra',
          weight: 'SECONDARY',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const item = res.design.recipe.detailedSymbols?.find((s) => s.symbolName === 'Sri Yantra');
    assert.ok(item);
    assert.strictEqual(item.symbolId, 'sri-yantra', 'symbolId sri-yantra olarak korunmalıdır');
    assert.strictEqual(item.symbolName, MASTER_SYMBOLS['sri-yantra'].name);
  });

  // SENARYO 6: Danışanın Kişisel Anlamının (customMeaning) Korunması
  it('6. Danışanın girdiği kişisel anlam (customMeaning) eksiksiz aktarılmalı ve saklanmalıdır', () => {
    const specialMeaning = 'Dedemin anısına ve kendi içsel uyanış yolculuğuma adadığım özel mühür.';
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'tree-of-life-yggdrasil',
          symbolName: 'Yggdrasil Yaşam Ağacı',
          customMeaning: specialMeaning,
          weight: 'SECONDARY',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const item = res.design.recipe.detailedSymbols?.find((s) => s.symbolId === 'tree-of-life-yggdrasil');
    assert.ok(item);
    assert.strictEqual(item.customMeaning, specialMeaning, 'customMeaning eksiksiz aktarılmalıdır');
    assert.strictEqual(item.personalThemeTr, specialMeaning, 'personalThemeTr danışanın kişisel anlamını yansıtmalıdır');
  });

  // SENARYO 7: Boş Kişisel Anlamda Sahte/Jenerik Metin Uydurulmaması
  it('7. Danışan kişisel anlam girmediğinde jenerik uydurma metin yazılmamalı, master kütüphane anlamı kullanılmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'seed-of-life',
          symbolName: 'Yaşam Tohumu',
          customMeaning: '', // Boş bırakılmış
          weight: 'SECONDARY',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const item = res.design.recipe.detailedSymbols?.find((s) => s.symbolId === 'seed-of-life');
    assert.ok(item);
    assert.strictEqual(item.customMeaning, undefined, 'customMeaning boş olduğunda undefined olmalıdır');
    assert.ok(
      !item.personalThemeTr.includes('Danışanın estetik ve ruhsal yolculuğunda bilinçli olarak tenine taşımak istediği'),
      'Eski jenerik uydurma kalıp metin KESİNLİKLE kullanılmamalıdır'
    );
    assert.ok(item.traditionalMeaningTr && item.traditionalMeaningTr.length > 10, 'Master geleneksel anlamı doldurulmalıdır');
  });

  // SENARYO 8: Reçete Raporunda (Section C) Master Verilerin Eksiksiz Yer Alması
  it('8. Kapsamlı raporda (Section C) geleneksel, ezoterik ve analiz bağlantıları eksiksiz bulunmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'metatron-cube',
          symbolName: 'Metatron Küpü',
          weight: 'PRIMARY',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const report = res.design.recipe.comprehensiveReport;
    assert.ok(report?.sectionC?.symbols, 'sectionC.symbols mevcut olmalıdır');

    const primaryInReport = report.sectionC.symbols.find((s) => s.symbolName === 'Metatron Küpü');
    assert.ok(primaryInReport);
    assert.strictEqual(primaryInReport.symbolId, 'metatron-cube');
    assert.ok(primaryInReport.traditionalMeaningTr, 'traditionalMeaningTr bulunmalıdır');
    assert.ok(primaryInReport.esotericMeaningTr, 'esotericMeaningTr bulunmalıdır');
    assert.ok(Array.isArray(primaryInReport.analysisAssociations), 'analysisAssociations dizi olmalıdır');
    assert.ok(primaryInReport.analysisAssociations.length > 0, 'Metatron Küpü için analiz bağlantısı bulunmalıdır');

    // Formatter çıktısında da bu alanların göründüğünü doğrula
    const formattedText = formatSymbolCompositionText(testClient, res.design);
    assert.ok(formattedText.includes('Sembol Kimliği (ID): metatron-cube'));
    assert.ok(formattedText.includes('Geleneksel Anlamı'));
    assert.ok(formattedText.includes('Modern Ezoterik Anlamı'));
  });

  // SENARYO 9: Kayıt ve Geri Yükleme Kalıcılığı
  it('9. Dövme tasarımı arşive kaydedilip tekrar okunduğunda zenginleştirilmiş sembol verileri korunmalıdır', () => {
    const res = generateClientRecipe(testClient, archive, {
      selectedSymbolObjects: [
        {
          symbolId: 'uroboros-infinity',
          symbolName: 'Ouroboros Sonsuzluk Döngüsü',
          customMeaning: 'Döngüsel şifa',
          weight: 'ACCENT',
        },
      ],
    });

    assert.ok(res.success && res.design);
    const saved = saveClientDesign(testClient.id, res.design);
    assert.ok(saved && saved.id, 'Tasarım kaydedilebilmelidir');

    const reloadedDesigns = getClientDesigns(testClient.id);
    const latest = reloadedDesigns[reloadedDesigns.length - 1];
    assert.ok(latest, 'Kaydedilen tasarım tekrar okunabilmelidir');

    assert.ok(latest.recipe.accentSymbols?.includes('Ouroboros Sonsuzluk Döngüsü'), 'accentSymbols kalıcı olmalıdır');
    const ouroItem = latest.recipe.detailedSymbols?.find((s) => s.symbolName === 'Ouroboros Sonsuzluk Döngüsü');
    assert.ok(ouroItem);
    assert.strictEqual(ouroItem.symbolId, 'uroboros-infinity', 'symbolId kalıcı olmalıdır');
    assert.strictEqual(ouroItem.weight, 'ACCENT', 'ACCENT ağırlığı kalıcı olmalıdır');
    assert.strictEqual(ouroItem.customMeaning, 'Döngüsel şifa', 'customMeaning kalıcı olmalıdır');
  });

  // SENARYO 10: Eski (Legacy) Kayıtlarla Geriye Dönük Uyumluluk
  it('10. Yeni alanları içermeyen eski reçete kayıtları hatasız okunmalı ve formatlanmalıdır', () => {
    // Eski tip recipe: accentSymbols yok, symbolId yok, weight yalnızca PRIMARY veya SECONDARY
    const legacyDesign: any = {
      id: 'design_legacy_v0',
      clientId: testClient.id,
      versionNumber: 1,
      title: 'Eski Sürüm Test Tasarımı',
      conceptStatement: 'Klasik konsept açıklaması',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç Ön Kol',
        recommendedDimensionsCm: { width: 14, height: 22 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Yaşam Ağacı',
        secondarySymbols: ['Hilal'],
        symbolCombinationRules: ['Kural 1'],
        keyComponents: ['Yaşam Ağacı', 'Hilal'],
        technicalAdviceForArtist: ['Tavsiye 1'],
        detailedSymbols: [
          {
            symbolName: 'Yaşam Ağacı',
            isPrimary: true,
            weight: 'PRIMARY',
            originSourceTr: 'Eski kaynak',
            personalThemeTr: 'Eski tema',
            compositionRoleTr: 'Merkezi odak',
            relatedSymbolNameTr: 'Hilal',
            visualExecutionTr: 'İnce hatlar',
            layerLossMeaningTr: 'Kayıp riski',
          },
          {
            symbolName: 'Hilal',
            isPrimary: false,
            weight: 'SECONDARY',
            originSourceTr: 'Eski kaynak 2',
            personalThemeTr: 'Eski tema 2',
            compositionRoleTr: 'İkincil akış',
            relatedSymbolNameTr: 'Yaşam Ağacı',
            visualExecutionTr: 'İnce hatlar',
            layerLossMeaningTr: 'Kayıp riski 2',
          },
        ],
      },
      aiPrompt: {
        primaryPromptEn: 'test prompt',
        conceptPromptTr: 'test konsept',
        negativePrompt: 'test negative',
        aspectRatio: '3:4',
        artisticModifiers: [],
      },
    };

    // Formatlayıcılar hata vermeden çalışmalı
    const recipeText = formatTattooRecipeText(testClient, legacyDesign);
    assert.ok(recipeText.includes('Eski Sürüm Test Tasarımı'), 'Eski reçete metni başarıyla formatlanmalıdır');

    const symbolText = formatSymbolCompositionText(testClient, legacyDesign);
    assert.ok(symbolText.includes('Yaşam Ağacı'), 'Eski sembol metni başarıyla formatlanmalıdır');
  });
});
