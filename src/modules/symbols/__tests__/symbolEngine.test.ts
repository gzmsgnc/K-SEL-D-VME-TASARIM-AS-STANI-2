import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MASTER_SYMBOLS,
  ALL_MASTER_SYMBOLS,
  SYMBOL_CATEGORIES_METADATA,
} from '../masterSymbols';
import {
  recommendSymbolsForClient,
  isSymbolExcluded,
} from '../symbolRecommendationEngine';
import {
  generateUnifiedVisualPrompt,
} from '../visualPromptEngine';
import {
  prepareSymbolModule,
  getClientRecommendedSymbols,
  buildClientSymbolAnalysis,
  generateVisualPromptForClient,
} from '../symbolEngineAdapter';
import {
  saveClientSymbolAnalysis,
  getClientSymbolAnalyses,
  deleteClientSymbolAnalysis,
  clearClientSymbolAnalyses,
  saveClientDesign,
  createClientRecord,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  getClientArchive,
} from '../../../store/storage';
import { Client } from '../../../types/client';
import { ClientTattooDesign, TattooRecipe } from '../../../types/design';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../../../types/analysis';

function createMockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: overrides.id || 'client_mock_sym_1',
    firstName: overrides.firstName || 'Cem',
    lastName: overrides.lastName || 'Kaya',
    motherName: overrides.motherName || 'Fatma',
    birthDate: overrides.birthDate || '1992-04-18',
    birthTime: overrides.birthTime || '11:15',
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
    email: overrides.email || 'cem@example.com',
    phone: overrides.phone || '5559998877',
    notes: overrides.notes || '',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    ...overrides,
  };
}

function createSampleRecipe(overrides: Partial<TattooRecipe> = {}): TattooRecipe {
  return {
    primarySymbol: 'Yaşam Çiçeği',
    secondarySymbols: ['Altın Oran Spirali (Fibonacci)', 'Kutup Yıldızı & Göksel Pusula'],
    symbolCombinationRules: [
      'Merkezi odakta Yaşam Çiçeği aksı yer alır.',
      'Dışa doğru Fibonacci spirali genişleme dinamizmi sunar.',
    ],
    recommendedPlacement: 'FOREARM_INNER',
    placementDescription: 'İç ön kol boyunca dikey altın oran yerleşimi.',
    recommendedDimensionsCm: { width: 8, height: 16 },
    style: 'SACRED_GEOMETRY',
    colorProfile: 'MONOCHROME_BLACK',
    colorRationale: 'Siyah pigment zamansız netlik ve geometrik keskinlik sağlar.',
    shadowTransformationTheme: 'Işık ve gölgenin kabulüyle gelen dinginlik',
    chakraSupportReflection: 'Kalp Çakrası genişleme rezonansı',
    totemAbstractionNotes: 'Analiz amacıyla değerlendirildi, görsel tasarıma dahil edilmedi.',
    excludedElements: ['yılan', 'kuru kafa'],
    keyComponents: ['Yaşam Çiçeği', 'Fibonacci Spirali'],
    technicalAdviceForArtist: [
      '0.25mm 3RL tek iğne ile mikro-geometri çalışılmalıdır.',
      'Ciltte %30 negatif alan bırakılmalıdır.',
    ],
    ...overrides,
  };
}

describe('A16: Sembol Kütüphanesi ve Görsel Tasarım Motoru Doğrulama Testleri', () => {
  // Test 1: Sembol Kütüphanesinden Gerçek Kayıt Seçimi
  describe('1. Sembol Kütüphanesi ve Gerçek Kayıt Güvencesi', () => {
    it('MASTER_SYMBOLS 5 geometrik kategoride doğrulanmış gerçek kayıtlar içermelidir', () => {
      assert.ok(ALL_MASTER_SYMBOLS.length >= 15, 'En az 15 master sembol bulunmalıdır');
      const sample = MASTER_SYMBOLS['flower-of-life'];
      assert.ok(sample, 'flower-of-life kütüphanede mevcut olmalıdır');
      assert.strictEqual(sample.geometryType, 'SACRED_GEOMETRY');
      assert.ok(sample.meaning.length > 20);
      assert.ok(sample.tattooSuitability.recommendedScales.length > 0);

      const categories = Object.keys(SYMBOL_CATEGORIES_METADATA);
      assert.strictEqual(categories.length, 5, '5 geometrik kategori bulunmalıdır');
    });

    it('Danışanın analizlerine göre MASTER_SYMBOLS içinden gerçek ve puanlanmış semboller önerilmelidir', () => {
      const mockNum: NumerologyAnalysis = {
        lifePathNumber: 4,
        destinyNumber: 4,
        soulUrgeNumber: 4,
        personalityNumber: 4,
        birthdayNumber: 4,
        worldMissionNumber: 8,
        karmicLessons: [],
        masterNumbers: [],
      };
      const mockChakra: ChakraAnalysis = {
        chakras: [],
        primaryDeficit: 'HEART',
        dominantChakra: 'ROOT',
      };

      const recs = recommendSymbolsForClient({
        numerology: mockNum,
        chakra: mockChakra,
      });

      assert.ok(recs.length > 0, 'Önerilen semboller boş olmamalıdır');
      for (const rec of recs) {
        assert.ok(MASTER_SYMBOLS[rec.symbol.id], 'Önerilen tüm semboller MASTER_SYMBOLS içinde kayıtlı olmalıdır');
        assert.ok(rec.matchingScore > 0, 'Puanlama pozitif olmalıdır');
      }
      // Yaşam Yolu 4 için Metatron Küpü veya Kalp için Lotus rezonansı bulunmalı
      const ids = recs.map((r) => r.symbol.id);
      assert.ok(
        ids.includes('metatron-cube') || ids.includes('sacred-lotus-anahata'),
        'Numeroloji 4 ve Kalp çakrası için rezonans sembolleri önerilmelidir'
      );
    });
  });

  // Test 2: Hariç Tutulan Sembol Koruması
  describe('2. Hariç Tutulan Sembol Koruması (Kural 2)', () => {
    it('Hariç tutulan semboller öneri listesine, reçeteye ve prompta ASLA girmemelidir', () => {
      const excluded = ['Metatron', 'yılan', 'küp'];
      const sym = MASTER_SYMBOLS['metatron-cube'];
      assert.strictEqual(isSymbolExcluded(sym, excluded), true, 'Metatron hariç tutulmalıdır');

      const mockNum: NumerologyAnalysis = {
        lifePathNumber: 4,
        destinyNumber: 4,
        soulUrgeNumber: 4,
        personalityNumber: 4,
        birthdayNumber: 4,
        worldMissionNumber: 8,
        karmicLessons: [],
        masterNumbers: [],
      };

      const recs = recommendSymbolsForClient({
        numerology: mockNum,
        options: { excludedSymbols: ['metatron-cube', 'Küp'] },
      });

      const hasMetatron = recs.some((r) => r.symbol.id === 'metatron-cube');
      assert.strictEqual(hasMetatron, false, 'Hariç tutulan Metatron önerilmemelidir');

      const recipe = createSampleRecipe({ excludedElements: ['yılan', 'Metatron Küpü'] });
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_sym_test',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [],
        excludedSymbols: ['yılan'],
      });

      assert.strictEqual(promptOut.primaryPromptEn.toLowerCase().includes('metatron'), false);
      assert.strictEqual(promptOut.conceptPromptTr.toLowerCase().includes('metatron'), false);
      assert.strictEqual(promptOut.primaryPromptEn.toLowerCase().includes('yılan'), false);
      assert.ok(promptOut.negativePrompt.includes('yılan'));
    });
  });

  // Test 3: Kullanıcı Seçiminin Korunması
  describe('3. Kullanıcı Seçiminin Korunması ve Ayrımı (Kural 3 & 4)', () => {
    it('Kullanıcının seçtiği semboller önceliklendirilmeli ve kompozisyon hiyerarşisinde korunmalıdır', () => {
      const recipe = createSampleRecipe({ primarySymbol: 'Yaşam Çiçeği' });
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_user_choice',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [
          {
            symbolId: 'triskele-spiral',
            symbolName: 'Triskele (Üçlü Kelt Spirali)',
            customMeaning: 'Döngüsel yenilenme ve üçlü güç',
            weight: 'PRIMARY',
          },
          {
            symbolId: 'bindu-focal-point',
            symbolName: 'Bindu (Kaynak Noktası)',
            customMeaning: 'İçsel dinginlik',
            weight: 'ACCENT',
          },
        ],
      });

      // Kullanıcı bir PRIMARY seçtiği için merkezi odak kullanıcının seçtiği sembol olmalıdır
      assert.ok(
        promptOut.compositionHierarchy[0].includes('Triskele'),
        'Kullanıcının seçtiği ana sembol merkezi odakta yer almalıdır'
      );
      assert.ok(
        promptOut.primaryPromptEn.includes('Triskele'),
        'Kullanıcı sembolü prompta aktarılmalıdır'
      );
    });
  });

  // Test 4: Totem Dahil / Hariç Durumu
  describe('4. Hayvan Totemi Değerlendirmesi (Kural 6, 7 & 10)', () => {
    it('Totem görsel olarak hariç tutulduğunda prompta hayvan figürü eklenmemeli, negatif parametreye alınmalıdır', () => {
      const recipe = createSampleRecipe();
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_totem_ex',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [],
        includeTotemInVisual: false,
        totemName: 'Kartal',
      });

      // Pozitif promptta veya Türkçe özette kartal olmamalıdır
      assert.strictEqual(
        promptOut.primaryPromptEn.includes('Kartal'),
        false,
        'Totem dahil edilmediğinde promptta yer almamalıdır'
      );
      assert.strictEqual(
        promptOut.conceptPromptTr.includes('Kartal'),
        false,
        'Totem dahil edilmediğinde Türkçe konseptte yer almamalıdır'
      );
      assert.ok(
        promptOut.negativePrompt.includes('realistic animal face'),
        'Negatif filtreler hayvan çıkartması ve realist hayvan yüzünü engellemelidir'
      );
    });

    it('Totem görsel olarak dahil edildiğinde doğrudan sticker değil soyut geometrik silüet olarak eklenmelidir', () => {
      const recipe = createSampleRecipe();
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_totem_inc',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [],
        includeTotemInVisual: true,
        totemName: 'Kurt',
      });

      assert.ok(
        promptOut.primaryPromptEn.includes('abstract minimalist geometric line silhouette of Kurt'),
        'Totem soyut geometrik silüet olarak eklenmelidir'
      );
      // Asla sticker veya realist hayvan yüzü olmamalı
      assert.ok(
        promptOut.primaryPromptEn.includes('realistic animal face') &&
          promptOut.primaryPromptEn.includes('cartoonish'),
        'Negatif filtreler realist hayvan kafası veya çıkartma görünümünü engellemelidir'
      );
    });
  });

  // Test 5: Anne Adı Koruması
  describe('5. Anne Adı Koruması (Kural 5)', () => {
    it('Anne adı hiçbir şekilde görsel prompta, konsept özeline veya negatif listeye girmemelidir', () => {
      const recipe = createSampleRecipe();
      const motherName = 'Fatma';

      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_mother_test',
        clientFullName: 'Cem Kaya',
        motherName,
        recipe,
        selectedSymbols: [],
      });

      assert.strictEqual(
        promptOut.primaryPromptEn.includes(motherName),
        false,
        'Anne adı ana promptta bulunmamalıdır'
      );
      assert.strictEqual(
        promptOut.conceptPromptTr.includes(motherName),
        false,
        'Anne adı Türkçe konsept özetinde bulunmamalıdır'
      );
      assert.strictEqual(
        promptOut.negativePrompt.includes(motherName),
        false,
        'Anne adı negatif prompta sızmamalıdır'
      );
      for (const directive of promptOut.technicalDirectives) {
        assert.strictEqual(directive.includes(motherName), false);
      }
    });

    it('Anne adını içeren sembol seçimi reddedilmeli veya temizlenmelidir', () => {
      const client = createMockClient({ motherName: 'Fatma' });
      const analysis = buildClientSymbolAnalysis(client, null, [
        {
          symbolId: 'custom-1',
          symbolName: 'Fatma Çiçeği',
          customMeaning: 'Geçersiz sembol',
          weight: 'PRIMARY',
        },
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Kutsal geometri',
          weight: 'SECONDARY',
        },
      ]);

      assert.strictEqual(analysis.selectedSymbols.length, 1);
      assert.strictEqual(analysis.selectedSymbols[0].symbolId, 'flower-of-life');
    });
  });

  // Test 6: Stil ve Yerleşim Aktarımı
  describe('6. Stil ve Yerleşim Aktarımı (Kural 11 & 12)', () => {
    it('Seçilen stil ve vücut yerleşimi prompt ve teknik talimatlara eksiksiz aktarılmalıdır', () => {
      const recipe = createSampleRecipe({
        style: 'MICRO_REALISM',
        recommendedPlacement: 'SPINE_CENTER',
      });

      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_style_test',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [],
        style: 'MICRO_REALISM',
        placement: 'SPINE_CENTER',
      });

      assert.ok(
        promptOut.conceptPromptTr.includes('Omurga Hattı'),
        'Yerleşim adı Türkçe özette bulunmalıdır'
      );
      assert.ok(
        promptOut.conceptPromptTr.includes('Mikro Gerçekçilik'),
        'Stil adı Türkçe özette bulunmalıdır'
      );

      const hasPlacementTech = promptOut.technicalDirectives.some((d) =>
        d.includes('Omurga') || d.includes('cm')
      );
      assert.ok(hasPlacementTech, 'Teknik talimatlarda anatomik ebat ve yerleşim bulunmalıdır');
    });
  });

  // Test 7: Danışan İzolasyonu
  describe('7. Danışan İzolasyonu ve Veri Ayrımı (Kural 17)', () => {
    it('İki farklı danışanın sembol analizleri ve kayıtları birbirine karışmamalıdır', () => {
      const clientA = createMockClient({ id: 'client_sym_iso_A', firstName: 'Ahmet' });
      const clientB = createMockClient({ id: 'client_sym_iso_B', firstName: 'Burcu' });

      createClientRecord(clientA);
      createClientRecord(clientB);

      const analysisA = buildClientSymbolAnalysis(clientA, null, [
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Ahmet için özel anlam',
          weight: 'PRIMARY',
        },
      ]);
      saveClientSymbolAnalysis(clientA.id, analysisA);

      const analysisB = buildClientSymbolAnalysis(clientB, null, [
        {
          symbolId: 'sri-yantra',
          symbolName: 'Sri Yantra',
          customMeaning: 'Burcu için özel anlam',
          weight: 'PRIMARY',
        },
      ]);
      saveClientSymbolAnalysis(clientB.id, analysisB);

      const storedA = getClientSymbolAnalyses(clientA.id);
      const storedB = getClientSymbolAnalyses(clientB.id);

      assert.strictEqual(storedA.length, 1);
      assert.strictEqual(storedB.length, 1);
      assert.strictEqual(storedA[0].clientId, clientA.id);
      assert.strictEqual(storedB[0].clientId, clientB.id);
      assert.strictEqual(storedA[0].selectedSymbols[0].symbolId, 'flower-of-life');
      assert.strictEqual(storedB[0].selectedSymbols[0].symbolId, 'sri-yantra');

      // Client A sıfırlandığında Client B etkilenmemelidir
      clearClientSymbolAnalyses(clientA.id);
      assert.strictEqual(getClientSymbolAnalyses(clientA.id).length, 0);
      assert.strictEqual(getClientSymbolAnalyses(clientB.id).length, 1);
    });
  });

  // Test 8: Versiyonlama ve Arşiv Koruması
  describe('8. Versiyonlama ve Arşiv Koruması (Kural 18)', () => {
    it('Yeni sembol analizi oluşturulduğunda önceki versiyonlar korunmalı ve V1, V2 olarak artmalıdır', () => {
      const client = createClientRecord(createMockClient());
      clearClientSymbolAnalyses(client.id);

      const v1 = buildClientSymbolAnalysis(client, null, [
        {
          symbolId: 'enso-circle',
          symbolName: 'Ensō Çemberi',
          customMeaning: 'İlk deneme',
          weight: 'PRIMARY',
        },
      ]);
      assert.strictEqual(v1.version, 1);
      saveClientSymbolAnalysis(client.id, v1);

      const archiveAfterV1 = getClientArchive(client.id);
      const v2 = buildClientSymbolAnalysis(client, archiveAfterV1, [
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'İkinci versiyon',
          weight: 'PRIMARY',
        },
      ]);
      assert.strictEqual(v2.version, 2);
      saveClientSymbolAnalysis(client.id, v2);

      const stored = getClientSymbolAnalyses(client.id);
      assert.strictEqual(stored.length, 2);
      assert.strictEqual(stored[0].version, 1);
      assert.strictEqual(stored[1].version, 2);
    });
  });

  // Test 9: Eksik Reçete Durumunda Sahte Veri Yasağı
  describe('9. Eksik Reçete Güvenliği (Kural: Eksik reçete varsa sahte görsel prompt oluşturulmuyor)', () => {
    it('Reçete yokken veya eksikken görsel prompt motoru hata fırlatmalı, sahte prompt üretmemelidir', () => {
      assert.throws(
        () => {
          generateUnifiedVisualPrompt({
            clientId: 'client_no_recipe',
            clientFullName: 'Cem Kaya',
            recipe: undefined as any,
            selectedSymbols: [],
          });
        },
        /Eksik reçete/i,
        'Eksik reçete durumunda motor hata fırlatmalıdır'
      );

      assert.throws(
        () => {
          generateUnifiedVisualPrompt({
            clientId: 'client_empty_recipe',
            clientFullName: 'Cem Kaya',
            recipe: { primarySymbol: '' } as any,
            selectedSymbols: [],
          });
        },
        /Eksik reçete/i,
        'Boş birincil sembol durumunda motor hata fırlatmalıdır'
      );
    });

    it('generateVisualPromptForClient danışanın kayıtlı reçetesi yoksa güvenli hata fırlatmalıdır', () => {
      const client = createMockClient({ id: 'client_no_recipe_adapter' });
      const archive = {
        client,
        analyses: [],
        testResults: [],
        symbolAnalyses: [],
        designs: [],
        reports: [],
        historySummary: { totalAnalysesCount: 0, totalDesignsCount: 0, lastInteractionAt: '2026-10-20T10:00:00Z' },
      };

      assert.throws(
        () => {
          generateVisualPromptForClient(client, archive);
        },
        /Eksik reçete/i,
        'Arşivde tasarım yoksa adaptör hata fırlatmalıdır'
      );
    });
  });
});
