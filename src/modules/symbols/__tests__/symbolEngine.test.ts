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
  deleteClientRecord,
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

    it('Totem görsel olarak dahil edildiğinde hayvan adı/silüeti değil, bağımsız soyut geometrik motif olarak eklenmelidir (AŞAMA 5.4.0.1)', () => {
      const recipe = createSampleRecipe();
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_totem_inc',
        clientFullName: 'Cem Kaya',
        recipe,
        selectedSymbols: [],
        includeTotemInVisual: true,
        totemName: 'Kurt',
      });

      // AŞAMA 5.4.0.1: Pozitif promptta hayvan adı veya silüeti bulunmamalıdır
      assert.strictEqual(
        promptOut.primaryPromptEn.includes('Kurt'),
        false,
        'Pozitif promptta hayvan adı bulunmamalıdır'
      );
      assert.strictEqual(
        promptOut.primaryPromptEn.toLowerCase().includes('silhouette'),
        false,
        'Pozitif promptta silüet ifadesi bulunmamalıdır'
      );
      // Negatif promptta hayvan adı bulunmamalıdır
      assert.strictEqual(
        promptOut.negativePrompt.includes('Kurt'),
        false,
        'Negatif promptta hayvan adı bulunmamalıdır'
      );
      // Kurt için soyut geometrik kalkan motifi bulunmalıdır
      assert.ok(
        promptOut.primaryPromptEn.includes('protective geometric boundary shield lattice with interlocking angle vectors'),
        'Totem için bağımsız soyut geometrik kalkan motifi eklenmelidir'
      );
      // Realist hayvan yüzü engeli bulunmalıdır
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

  // Test 8: Tek Güncel Sembol Analizi Kaydı ve İzolasyon (Standart 4)
  describe('8. Tek Güncel Sembol Analizi Kaydı ve İzolasyon (Standart 4)', () => {
    it('Yeni sembol analizi kaydedildiğinde aynı danışanın eski kaydı silinmeli, tek bir güncel analiz tutulmalı ve başka danışanların kayıtları korunmalıdır', () => {
      const clientA = createClientRecord(createMockClient({ id: 'client_single_rec_A', firstName: 'Deniz' }));
      const clientB = createClientRecord(createMockClient({ id: 'client_single_rec_B', firstName: 'Ece' }));
      clearClientSymbolAnalyses(clientA.id);
      clearClientSymbolAnalyses(clientB.id);

      // Client A için ilk sembol analizi
      const aV1 = buildClientSymbolAnalysis(clientA, null, [
        {
          symbolId: 'enso-circle',
          symbolName: 'Ensō Çemberi',
          customMeaning: 'İlk deneme',
          weight: 'PRIMARY',
        },
      ]);
      assert.strictEqual(aV1.version, 1);
      saveClientSymbolAnalysis(clientA.id, aV1);

      // Client B için sembol analizi
      const bV1 = buildClientSymbolAnalysis(clientB, null, [
        {
          symbolId: 'sri-yantra',
          symbolName: 'Sri Yantra',
          customMeaning: 'Ece için sembol',
          weight: 'PRIMARY',
        },
      ]);
      saveClientSymbolAnalysis(clientB.id, bV1);

      // Client A için yeni bir analiz kaydedildiğinde eski analiz ezilmeli/silinmeli, tek kayıt kalmalı
      const aV2 = buildClientSymbolAnalysis(clientA, null, [
        {
          symbolId: 'flower-of-life',
          symbolName: 'Yaşam Çiçeği',
          customMeaning: 'Güncel analiz',
          weight: 'PRIMARY',
        },
      ]);
      assert.strictEqual(aV2.version, 1);
      saveClientSymbolAnalysis(clientA.id, aV2);

      const storedA = getClientSymbolAnalyses(clientA.id);
      const storedB = getClientSymbolAnalyses(clientB.id);

      // Client A'da eski sürüm birikmemeli, tam 1 güncel kayıt olmalı
      assert.strictEqual(storedA.length, 1, 'Client A için sadece 1 güncel analiz tutulmalıdır');
      assert.strictEqual(storedA[0].version, 1, 'Versiyon 1 olarak tutulmalıdır');
      assert.strictEqual(storedA[0].selectedSymbols[0].symbolId, 'flower-of-life', 'Yeni analiz eskisinin yerini almalıdır');

      // Client B'nin kaydı aynen korunmalıdır
      assert.strictEqual(storedB.length, 1, 'Client B nin kaydı korunmalıdır');
      assert.strictEqual(storedB[0].selectedSymbols[0].symbolId, 'sri-yantra');

      // Danışan silindiğinde sembol analizi de silinmelidir
      deleteClientRecord(clientA.id);
      assert.strictEqual(getClientSymbolAnalyses(clientA.id).length, 0, 'Danışan silindiğinde sembol analizi de silinmelidir');
      assert.strictEqual(getClientSymbolAnalyses(clientB.id).length, 1, 'Diğer danışanın analizi silinmemelidir');
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

  // Test 10: Aşama 2 Doğrulama Testleri (Astroloji, Totem, Negatif Alan, Determinizm, Enneagram)
  describe('10. Aşama 2: Teknik Standartlar, Astroloji, Totem ve Determinizm Doğrulama', () => {
    it('Güneş, Ay ve Yükselen bağımsız olarak puanlanmalı ve eksik veri uydurulmamalıdır', () => {
      // 1. Üçü de mevcutken
      const recFull = recommendSymbolsForClient({
        astrology: {
          zodiacSystem: 'TROPICAL',
          houseSystem: 'PLACIDUS',
          isBirthTimeUnknown: false,
          birthDate: '1990-08-10',
          latitude: 41.0,
          longitude: 29.0,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
          sunSign: 'Leo',
          moonSign: 'Aries',
          ascendantSign: 'Scorpio',
        },
      });

      const sunMatch = recFull.find((r) => r.symbol.id === 'sun-glyph-corona');
      const moonMatch = recFull.find((r) => r.symbol.id === 'moon-phases-crescent');
      const ascMatch = recFull.find((r) => r.symbol.id === 'polaris-compass');

      assert.ok(sunMatch, 'Güneş burcu için sun-glyph-corona önerilmelidir');
      assert.strictEqual(sunMatch?.sourceModule, 'ASTROLOGY');
      assert.ok(sunMatch?.matchingScore && sunMatch.matchingScore >= 18);

      assert.ok(moonMatch, 'Ay burcu için moon-phases-crescent önerilmelidir');
      assert.strictEqual(moonMatch?.sourceModule, 'ASTROLOGY');

      assert.ok(ascMatch, 'Yükselen burç için polaris-compass önerilmelidir');
      assert.strictEqual(ascMatch?.sourceModule, 'ASTROLOGY');
      assert.ok(!ascMatch?.reasonTr.includes('Kesin Değil'), 'Saati bilinen yükselen kesin olarak sunulmalıdır');

      // 2. Doğum saati bilinmediğinde 12:00 öğle varsayımı açıkça belirtilmelidir
      const recNoon = recommendSymbolsForClient({
        astrology: {
          zodiacSystem: 'TROPICAL',
          houseSystem: 'PLACIDUS',
          isBirthTimeUnknown: true,
          birthDate: '1990-08-10',
          latitude: 41.0,
          longitude: 29.0,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
          sunSign: 'Leo',
          ascendantSign: 'Scorpio',
        },
      });
      const ascNoonMatch = recNoon.find((r) => r.symbol.id === 'polaris-compass');
      assert.ok(
        ascNoonMatch?.reasonTr.includes('12:00 Öğle Varsayımı') || ascNoonMatch?.reasonTr.includes('Kesin Değil'),
        'Doğum saati bilinmediğinde yükselenin kesin olmadığı belirtilmelidir'
      );

      // 3. Güneş veya Ay verisi yokken sahte puan üretilmemelidir
      const recNoSun = recommendSymbolsForClient({
        astrology: {
          zodiacSystem: 'TROPICAL',
          houseSystem: 'PLACIDUS',
          isBirthTimeUnknown: false,
          birthDate: '1990-08-10',
          latitude: 41.0,
          longitude: 29.0,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
          moonSign: 'Aries',
        },
      });
      const sunInNoSun = recNoSun.find((r) => r.symbol.id === 'sun-glyph-corona' && r.sourceModule === 'ASTROLOGY');
      assert.strictEqual(sunInNoSun, undefined, 'Güneş burcu yokken astroloji kaynaklı puan verilmemelidir');
    });

    it('Görsel promptta eski %30 negatif alan olmamalı; %45–50 negatif alan ve reçete teknik standartları yer almalıdır', () => {
      const recipe = createSampleRecipe({
        recommendedDimensionsCm: { width: 22, height: 14 },
      });
      const promptOut = generateUnifiedVisualPrompt({
        clientId: 'client_tech_std',
        clientFullName: 'Murat Arslan',
        recipe,
        selectedSymbols: [{ symbolId: 'flower-of-life', symbolName: 'Yaşam Çiçeği', customMeaning: '', weight: 'PRIMARY' }],
      });

      // Eski %30 talimatı hiçbir yerde bulunmamalıdır
      assert.strictEqual(
        promptOut.technicalDirectives.some((d) => d.includes('%30')),
        false,
        'Teknik direktiflerde eski %30 yer almamalıdır'
      );
      assert.strictEqual(
        promptOut.primaryPromptEn.includes('30%'),
        false,
        'Görsel promptta 30% yer almamalıdır'
      );

      // Yeni %45–50 standardı, %65 ana odak ve teknik direktifler bulunmalıdır
      assert.ok(
        promptOut.technicalDirectives.some((d) => d.includes('%45–50') || d.includes('%45-50')),
        'Teknik direktiflerde %45–50 negatif alan standardı bulunmalıdır'
      );
      assert.ok(
        promptOut.technicalDirectives.some((d) => d.includes('%65')),
        'Teknik direktiflerde %65 ana odak kuralı bulunmalıdır'
      );
      assert.ok(
        promptOut.technicalDirectives.some((d) => d.includes('1.5 mm') && d.includes('2.0 mm')),
        'Teknik direktiflerde 1.5 - 2 mm çizgi aralığı bulunmalıdır'
      );
      assert.ok(
        promptOut.technicalDirectives.some((d) => d.includes('16x10') || d.includes('22x14')),
        'Teknik direktiflerde 16x10 cm min ve 22x14 cm ideal ebat bulunmalıdır'
      );

      // Prompt tokenlarında negatif alan ve hiyerarşi bulunmalıdır
      assert.ok(
        promptOut.primaryPromptEn.includes('45-50% clean negative space'),
        'AI promptu 45-50% negative space içermelidir'
      );
      assert.ok(
        promptOut.primaryPromptEn.includes('65% primary visual focus'),
        'AI promptu nominal 65% primary focus içermelidir'
      );
    });

    it('Eşit puanlarda alfabetik deterministik ikincil sıralama kuralı uygulanmalıdır', () => {
      // Sadece iki sembole eşit puan üretecek girdi verelim
      const sampleChakra: ChakraAnalysis = {
        chakras: [
          { chakra: 'ROOT', status: 'BLOCKED', score: 2, focusRecommendations: [] },
          { chakra: 'CROWN', status: 'BALANCED', score: 8, focusRecommendations: [] },
        ],
        primaryDeficit: 'ROOT',
      };

      const recs1 = recommendSymbolsForClient({
        chakra: sampleChakra,
      });

      const recs2 = recommendSymbolsForClient({
        chakra: sampleChakra,
      });

      // Birebir aynı sıralama
      assert.strictEqual(recs1.length, recs2.length);
      for (let i = 0; i < recs1.length; i++) {
        assert.strictEqual(recs1[i].symbol.id, recs2[i].symbol.id);
        assert.strictEqual(recs1[i].matchingScore, recs2[i].matchingScore);
      }

      // Eşit puan alan semboller alfabetik olarak sıralanmalıdır
      for (let i = 0; i < recs1.length - 1; i++) {
        if (recs1[i].matchingScore === recs1[i + 1].matchingScore) {
          assert.ok(
            recs1[i].symbol.id.localeCompare(recs1[i + 1].symbol.id) <= 0,
            `Eşit puanlarda (${recs1[i].matchingScore}) ${recs1[i].symbol.id} ${recs1[i + 1].symbol.id} den önce gelmelidir`
          );
        }
      }
    });

    it('Totem hayvanları tür ve elemente göre anlamlı kutsal geometri ve sembollere eşleştirilmelidir', () => {
      // 1. Yunus (Su) -> flowing-water-waves
      const recYunus = recommendSymbolsForClient({
        testResults: [{
          id: 't1',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Yunus',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const yunusSym = recYunus.find((r) => r.symbol.id === 'flowing-water-waves' && r.sourceModule === 'TOTEM');
      assert.ok(yunusSym, 'Yunus Su elementi olarak flowing-water-waves sembolüne eşleşmelidir');

      // 2. Şahin (Hava) -> celestial-cloud-vectors
      const recSahin = recommendSymbolsForClient({
        testResults: [{
          id: 't2',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Şahin',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const sahinSym = recSahin.find((r) => r.symbol.id === 'celestial-cloud-vectors' && r.sourceModule === 'TOTEM');
      assert.ok(sahinSym, 'Şahin Hava elementi olarak celestial-cloud-vectors sembolüne eşleşmelidir');

      // 3. Baykuş (Hava/Gece) -> eye-of-horus
      const recBaykus = recommendSymbolsForClient({
        testResults: [{
          id: 't3',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Baykuş',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const baykusSym = recBaykus.find((r) => r.symbol.id === 'eye-of-horus' && r.sourceModule === 'TOTEM');
      assert.ok(baykusSym, 'Baykuş gece vizyonu olarak eye-of-horus sembolüne eşleşmelidir');

      // 4. Jaguar (Ateş) -> alchemy-four-elements
      const recJaguar = recommendSymbolsForClient({
        testResults: [{
          id: 't4',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Jaguar',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const jaguarSym = recJaguar.find((r) => r.symbol.id === 'alchemy-four-elements' && r.sourceModule === 'TOTEM');
      assert.ok(jaguarSym, 'Jaguar Ateş/Simya olarak alchemy-four-elements sembolüne eşleşmelidir');

      // 5. Ayı (Toprak) -> tree-of-life-yggdrasil
      const recAyi = recommendSymbolsForClient({
        testResults: [{
          id: 't5',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Ayı',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const ayiSym = recAyi.find((r) => r.symbol.id === 'tree-of-life-yggdrasil' && r.sourceModule === 'TOTEM');
      assert.ok(ayiSym, 'Ayı Toprak elementi olarak tree-of-life-yggdrasil sembolüne eşleşmelidir');

      // 6. Yılan (Dönüşüm) -> uroboros-infinity
      const recYilan = recommendSymbolsForClient({
        testResults: [{
          id: 't6',
          clientId: 'c',
          testType: 'ANIMAL_TOTEM',
          version: 1,
          answers: [],
          primaryType: 'Yılan',
          dominantScores: {},
          interpretations: [],
          completedAt: '2026-10-20T10:00:00Z',
        }],
        options: { includeTotemInVisual: true },
      });
      const yilanSym = recYilan.find((r) => r.symbol.id === 'uroboros-infinity' && r.sourceModule === 'TOTEM');
      assert.ok(yilanSym, 'Yılan döngüsel yenilenme olarak uroboros-infinity sembolüne eşleşmelidir');
    });

    it('Totem görsel olarak hariç tutulduğunda totem sembolü eklenmemeli ve Enneagram için gerekçesiz puan üretilmemelidir', () => {
      const recExcluded = recommendSymbolsForClient({
        testResults: [
          {
            id: 't1',
            clientId: 'c',
            testType: 'ANIMAL_TOTEM',
            version: 1,
            answers: [],
            primaryType: 'Kurt',
            dominantScores: {},
            interpretations: [],
            completedAt: '2026-10-20T10:00:00Z',
          },
          {
            id: 't2',
            clientId: 'c',
            testType: 'ENNEAGRAM',
            version: 1,
            answers: [],
            primaryType: 'Tip 5',
            dominantScores: {},
            interpretations: [],
            completedAt: '2026-10-20T10:00:00Z',
          },
        ],
        options: { includeTotemInVisual: false },
      });

      // Totem kaynaklı sembol bulunmamalıdır
      const totemMatches = recExcluded.filter((r) => r.sourceModule === 'TOTEM');
      assert.strictEqual(totemMatches.length, 0, 'Totem görselde hariç tutulduğunda TOTEM kaynaklı sembol eklenmemelidir');

      // Enneagram kaynaklı sembol bulunmamalıdır (rastgele puan üretilmez)
      const enneagramMatches = recExcluded.filter((r) => (r.sourceModule as string) === 'ENNEAGRAM');
      assert.strictEqual(enneagramMatches.length, 0, 'Enneagram için gerekçesiz puan üretilmemelidir');
    });
  });
});
