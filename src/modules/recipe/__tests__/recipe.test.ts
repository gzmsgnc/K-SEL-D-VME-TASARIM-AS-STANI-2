import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateTattooRecipeFromAnalyses, isExcluded } from '../recipeCalculationEngine';
import { prepareRecipeModule, generateClientRecipe } from '../recipeEngineAdapter';
import { TATTOO_STYLES, BODY_PLACEMENTS, COLOR_PROFILES } from '../constants';
import {
  NumerologyAnalysis,
  ChakraAnalysis,
  ArchetypeAnalysis,
} from '../../../types/analysis';
import { TropicalNatalChart } from '../../../types/astrology';
import { ClientTestResult } from '../../../types/test';
import { GlobalLocation } from '../../../types/location';
import { Client } from '../../../types/client';
import {
  createClientRecord,
  getClientArchive,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  clearClientDesigns,
  deleteClientDesign,
} from '../../../store/storage';

const mockLocation: GlobalLocation = {
  country: 'Türkiye',
  city: 'İzmir',
  placeName: 'İzmir, Türkiye',
  latitude: 38.4237,
  longitude: 27.1428,
  timezone: 'Europe/Istanbul',
  utcOffsetMinutes: 180,
};

function createMockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: overrides.id || 'client_mock_default',
    firstName: overrides.firstName || 'Deniz',
    lastName: overrides.lastName || 'Yıldız',
    motherName: overrides.motherName || 'Meryem',
    birthDate: overrides.birthDate || '1995-10-25',
    birthTime: overrides.birthTime || '14:30',
    isBirthTimeUnknown: overrides.isBirthTimeUnknown ?? false,
    birthLocation: overrides.birthLocation || mockLocation,
    email: overrides.email || 'deniz@example.com',
    phone: overrides.phone || '5551112233',
    notes: overrides.notes || '',
    source: overrides.source || 'OWNER_MANUAL',
    status: overrides.status || 'ACTIVE',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    ...overrides,
  };
}

describe('A15: Dövme Reçetesi Motoru Doğrulama ve Entegrasyon Testleri', () => {
  const sampleNumerology: NumerologyAnalysis = {
    lifePathNumber: 7,
    destinyNumber: 1,
    soulUrgeNumber: 3,
    personalityNumber: 4,
    birthdayNumber: 7,
    worldMissionNumber: 8,
    karmicLessons: [4],
    masterNumbers: [],
  };

  const sampleChakra: ChakraAnalysis = {
    chakras: [
      { chakra: 'ROOT', status: 'BLOCKED', score: 3, focusRecommendations: ['Küp', 'Topraklanma'] },
      { chakra: 'SACRAL', status: 'BALANCED', score: 6, focusRecommendations: ['Hilal'] },
      { chakra: 'SOLAR_PLEXUS', status: 'BALANCED', score: 7, focusRecommendations: ['Güneş'] },
      { chakra: 'HEART', status: 'BALANCED', score: 6, focusRecommendations: ['Heksagram'] },
      { chakra: 'THROAT', status: 'BALANCED', score: 6, focusRecommendations: ['Triskele'] },
      { chakra: 'THIRD_EYE', status: 'OVERACTIVE', score: 9, focusRecommendations: ['Üçüncü Göz'] },
      { chakra: 'CROWN', status: 'BALANCED', score: 6, focusRecommendations: ['Lotus'] },
    ],
    dominantChakra: 'THIRD_EYE',
    primaryDeficit: 'ROOT',
  };

  const sampleArchetype: ArchetypeAnalysis = {
    unifiedArchetype: {
      primary: 'Mistik / Bilge',
      secondary: 'Savaşçı / Öncü',
      description: 'Mistik / Bilge ve Savaşçı / Öncü birleşik arketip sentezi.',
    },
    shadowArchetype: {
      shadowName: 'KÖKSÜZ SÜRGÜN',
      transformationalSymbol: 'Kök salmış hayat ağacı ve kübik mühür',
    },
  };

  const sampleAstrology: TropicalNatalChart = {
    zodiacSystem: 'TROPICAL',
    houseSystem: 'PLACIDUS',
    isBirthTimeUnknown: false,
    birthDate: '1995-10-25',
    birthTime: '14:30',
    latitude: 38.4237,
    longitude: 27.1428,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
    sunSign: 'Scorpio',
    moonSign: 'Cancer',
    ascendantSign: 'Sagittarius',
    planetaryPositions: [
      { body: 'Sun', sign: 'Scorpio', degree: 1, minute: 40, houseNumber: 9 },
      { body: 'Moon', sign: 'Cancer', degree: 14, minute: 20, houseNumber: 5 },
      { body: 'Ascendant', sign: 'Sagittarius', degree: 8, minute: 10, houseNumber: 1 },
    ],
  };

  const sampleTests: ClientTestResult[] = [
    {
      id: 'test_enn_1',
      clientId: 'temp_client',
      testType: 'ENNEAGRAM',
      version: 1,
      completedAt: '2026-10-20T10:00:00Z',
      answers: [],
      primaryType: 'Tip 5 - Gözlemci / Araştırmacı',
      dominantScores: { '5': 10 },
      interpretations: ['Zihinsel derinlik'],
    },
    {
      id: 'test_tot_1',
      clientId: 'temp_client',
      testType: 'ANIMAL_TOTEM',
      version: 1,
      completedAt: '2026-10-20T10:05:00Z',
      answers: [],
      primaryType: 'Şahin',
      dominantScores: { bird: 8 },
      interpretations: ['Geniş vizyon'],
    },
  ];

  describe('1. Çok Katmanlı Sentez ve Reçete Bütünlüğü', () => {
    it('Astroloji, numeroloji, çakra, arketip ve test sonuçlarını tek reçetede doğru sentezlemelidir', () => {
      const client = createMockClient({
        id: 'client_synt_1',
        firstName: 'Selin',
        lastName: 'Acar',
        birthDate: '1995-10-25',
        motherName: 'Fatma',
        email: 'selin@example.com',
      });

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        testResults: sampleTests,
        options: {
          preferredStyle: 'SACRED_GEOMETRY',
          preferredPlacement: 'FOREARM_INNER',
        },
        nextVersionNumber: 1,
      });

      assert.ok(design);
      assert.strictEqual(design.clientId, client.id);
      assert.strictEqual(design.versionNumber, 1);
      assert.strictEqual(design.recipe.style, 'SACRED_GEOMETRY');
      assert.strictEqual(design.recipe.recommendedPlacement, 'FOREARM_INNER');

      // Astroloji doğrulaması: Akrep ve Yengeç burçları ikincil sembollerde yer almalı
      const hasAstro = (design.recipe.secondarySymbols || []).some((s) => s.includes('Akrep') || s.includes('Yengeç'));
      assert.ok(hasAstro, 'Astroloji burç ve glifleri ikincil sembollere aktarılmalıdır.');

      // Çakra doğrulaması: Kök Çakra blokajı desteği
      assert.ok(design.recipe.chakraSupportReflection?.includes('Kök Çakra'), 'Çakra desteği reçeteye yansımalıdır.');

      // Arketip doğrulaması: Gölge arketip ve dönüşüm sembolü
      assert.ok(design.recipe.shadowTransformationTheme?.includes('KÖKSÜZ SÜRGÜN'), 'Gölge arketip reçetede yer almalıdır.');
      assert.ok(design.recipe.shadowTransformationTheme?.includes('hayat ağacı'), 'Dönüşüm sembolü reçeteye girmelidir.');

      // Enneagram doğrulaması: manifesto metninde Enneagram etkisi
      assert.ok(design.conceptStatement.includes('Tip 5'), 'Enneagram sonucu manifestoda yer almalıdır.');
    });
  });

  describe('2. Danışan İzolasyonu ve Çapraz Veri Koruması', () => {
    it('İki farklı danışanın (Client A ve Client B) analizleri ve reçeteleri birbirine karışmamalıdır', () => {
      const clientA = createClientRecord({
        firstName: 'Ahmet',
        lastName: 'Kaya',
        motherName: 'Emine',
        birthDate: '1990-05-15',
        birthTime: '10:00',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        email: 'ahmet@test.com',
        phone: '5551110001',
        notes: '',
      });

      const clientB = createClientRecord({
        firstName: 'Buse',
        lastName: 'Demir',
        motherName: 'Gülten',
        birthDate: '1992-09-20',
        birthTime: '18:45',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        email: 'buse@test.com',
        phone: '5551110002',
        notes: '',
      });

      // Client A için numeroloji: Yaşam Yolu 3, Client B için: Yaşam Yolu 8
      saveClientNumerology(clientA.id, {
        ...sampleNumerology,
        lifePathNumber: 3,
      });
      saveClientChakra(clientA.id, sampleChakra);
      saveClientArchetype(clientA.id, sampleArchetype);

      saveClientNumerology(clientB.id, {
        ...sampleNumerology,
        lifePathNumber: 8,
      });
      saveClientChakra(clientB.id, {
        ...sampleChakra,
        primaryDeficit: 'HEART',
      });
      saveClientArchetype(clientB.id, {
        ...sampleArchetype,
        unifiedArchetype: {
          primary: 'Yönetici / Lider',
          secondary: 'Kahraman',
          description: 'Liderlik gücü.',
        },
      });

      const archiveA = getClientArchive(clientA.id);
      const archiveB = getClientArchive(clientB.id);

      const resA = generateClientRecipe(clientA, archiveA);
      const resB = generateClientRecipe(clientB, archiveB);

      assert.ok(resA.success && resA.design);
      assert.ok(resB.success && resB.design);

      assert.strictEqual(resA.design.clientId, clientA.id);
      assert.strictEqual(resB.design.clientId, clientB.id);

      // Client A'nın manifestosu Ahmet'e ait olmalı, Buse'ye ait olmamalı
      assert.ok(resA.design.conceptStatement.includes('Ahmet'));
      assert.ok(!resA.design.conceptStatement.includes('Buse'));
      assert.ok(!resA.design.conceptStatement.includes('Gülten')); // Client B'nin anne adı yok

      // Client B'nin manifestosu Buse'ye ait olmalı
      assert.ok(resB.design.conceptStatement.includes('Buse'));
      assert.ok(!resB.design.conceptStatement.includes('Ahmet'));
      assert.ok(!resB.design.conceptStatement.includes('Emine')); // Client A'nın anne adı yok
    });
  });

  describe('3. Hariç Tutulan Sembol ve Anne Adı Koruması (Kural 5 & 6)', () => {
    it('Kullanıcının hariç tuttuğu sembol hiçbir alana ve prompta girmemelidir', () => {
      const client = createMockClient({
        id: 'client_exc_1',
        firstName: 'Ece',
        lastName: 'Yılmaz',
        birthDate: '1993-04-12',
        motherName: 'Ayşe',
        email: 'ece@test.com',
      });

      const excludedWords = ['kuru kafa', 'yılan', 'karanlık göz'];

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        testResults: sampleTests,
        options: {
          preferredStyle: 'BLACKWORK_OCCULT',
          excludedSymbols: excludedWords,
          selectedSymbols: ['Kutsal Geometri', 'kuru kafa', 'Hilal'], // 'kuru kafa' seçilmiş olsa bile hariç tutulmalıdır!
        },
        nextVersionNumber: 1,
      });

      // 1. İkincil sembollerde 'kuru kafa' veya 'yılan' olmamalı
      assert.ok(!(design.recipe.secondarySymbols || []).some((s) => s.toLowerCase().includes('kuru kafa')));
      assert.ok(!(design.recipe.secondarySymbols || []).some((s) => s.toLowerCase().includes('yılan')));

      // 2. KeyComponents içinde olmamalı
      assert.ok(!design.recipe.keyComponents.some((s) => s.toLowerCase().includes('kuru kafa')));

      // 3. Prompt içindeki subject kısmında olmamalı
      assert.ok(!design.aiPrompt.primaryPromptEn.toLowerCase().includes('kuru kafa'));

      // 4. Hariç tutulanlar listesinde kayıtlı olmalı
      assert.ok(design.recipe.excludedElements?.includes('kuru kafa'));

      // 5. Negative prompt alanında yer almalı
      assert.ok(design.aiPrompt.negativePrompt.includes('kuru kafa'));
    });

    it('Anne adı asla dövme sembolü olarak reçeteye veya prompta dahil edilmemelidir (Kural 6)', () => {
      const motherName = 'Zübeyde';
      const client = createMockClient({
        id: 'client_mom_1',
        firstName: 'Can',
        lastName: 'Öztürk',
        birthDate: '1988-11-03',
        motherName,
        email: 'can@test.com',
      });

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        testResults: sampleTests,
        options: {
          selectedSymbols: ['Zübeyde Mührü', 'Altın Spiral'], // Danışman anne adını sembol olarak seçmeye çalışsa bile filtrelenmelidir
        },
        nextVersionNumber: 1,
      });

      // Anne adı sembol listesinde olmamalı
      const hasMotherInSymbols = (design.recipe.secondarySymbols || []).some((s) => s.includes(motherName));
      assert.strictEqual(hasMotherInSymbols, false, 'Anne adı hiçbir sembol alanına sızmamalıdır.');

      // Negative prompt anne adını koruyucu olarak içerebilir
      assert.ok(design.aiPrompt.negativePrompt.includes(motherName));
    });
  });

  describe('4. Hayvan Totemi Değerlendirmesi (Kural 7 & 8)', () => {
    it('Totem görsel tasarıma dahil edilmediğinde "analiz amacıyla kullanıldı" ifadesi yer almalıdır', () => {
      const client = createMockClient({
        id: 'client_tot_1',
        firstName: 'Mert',
        lastName: 'Kaya',
        birthDate: '1991-07-14',
        motherName: 'Sevim',
        email: 'mert@test.com',
      });

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        testResults: sampleTests, // Şahin totemi var
        options: {
          includeTotemInVisual: false, // Görselde hariç
        },
        nextVersionNumber: 1,
      });

      // Kural 7: Analiz amacıyla kullanıldı, görsel tasarıma dahil edilmedi ifadesi olmalı
      assert.ok(
        design.recipe.totemAbstractionNotes?.includes('analiz amacıyla kullanıldı, görsel tasarıma dahil edilmedi')
      );

      // İkincil sembollerde Şahin olmamalı
      assert.ok(!(design.recipe.secondarySymbols || []).some((s) => s.includes('Şahin')));

      // Promptta şahin silüeti olmamalı
      assert.ok(!design.aiPrompt.primaryPromptEn.includes('abstract geometric silhouette of Şahin'));
    });

    it('Totem görsel tasarıma dahil edildiğinde doğrudan sticker değil, soyut geometri olarak entegre edilmelidir (Kural 8)', () => {
      const client = createMockClient({
        id: 'client_tot_2',
        firstName: 'Mert',
        lastName: 'Kaya',
        birthDate: '1991-07-14',
        motherName: 'Sevim',
        email: 'mert@test.com',
      });

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        testResults: sampleTests, // Şahin
        options: {
          includeTotemInVisual: true,
        },
        nextVersionNumber: 1,
      });

      // Kural 8: Doğrudan veya sticker figür değil, soyut çizgi ve negatif alan
      assert.ok(
        design.recipe.totemAbstractionNotes?.includes('kesinlikle doğrudan veya sticker benzeri bir figür olarak değil')
      );
      assert.ok(
        (design.recipe.secondarySymbols || []).some((s) => s.includes('Soyut Şahin silüeti (negatif alan geometrisi)'))
      );
      assert.ok(design.aiPrompt.primaryPromptEn.includes('abstract geometric silhouette of Şahin'));
    });
  });

  describe('5. Desteklenen Stil ve Yerleşim Parametreleri (Kural 9)', () => {
    it('Tüm 7 stil ve 10 yerleşim kısıtlama olmaksızın doğru teknik ve anatomik ölçülerle çalışmalıdır', () => {
      const styles = Object.keys(TATTOO_STYLES) as (keyof typeof TATTOO_STYLES)[];
      const placements = Object.keys(BODY_PLACEMENTS) as (keyof typeof BODY_PLACEMENTS)[];

      assert.strictEqual(styles.length, 7, 'Tam 7 adet dövme stili desteklenmelidir.');
      assert.strictEqual(placements.length, 10, 'Tam 10 adet anatomik bölge desteklenmelidir.');

      const client = createMockClient({
        id: 'client_style_test',
        firstName: 'Aslı',
        lastName: 'Tekin',
        birthDate: '1994-02-18',
        motherName: 'Hacer',
        email: 'asli@test.com',
      });

      // Her bir stili test et
      for (const style of styles) {
        const design = generateTattooRecipeFromAnalyses({
          client,
          numerology: sampleNumerology,
          chakra: sampleChakra,
          archetype: sampleArchetype,
          options: {
            preferredStyle: style,
            preferredPlacement: 'SPINE_CENTER',
          },
          nextVersionNumber: 1,
        });

        assert.strictEqual(design.recipe.style, style);
        assert.ok(design.recipe.technicalAdviceForArtist.length > 0);
        assert.strictEqual(design.recipe.recommendedPlacement, 'SPINE_CENTER');
        assert.deepStrictEqual(design.recipe.recommendedDimensionsCm, { width: 6, height: 28 });
      }
    });
  });

  describe('6. Eksik Analiz Güvenliği ve Sahte Sonuç Yasağı (Kural 3)', () => {
    it('Zorunlu analizlerden biri (örn. Arketip veya Çakra) eksik olduğunda reçete motoru sahte veri üretmemelidir', () => {
      const client = createClientRecord({
        firstName: 'Barış',
        lastName: 'Kılıç',
        motherName: 'Lale',
        birthDate: '1998-06-10',
        birthTime: '12:00',
        isBirthTimeUnknown: true,
        birthLocation: mockLocation,
        email: 'baris@test.com',
        phone: '5557778899',
        notes: '',
      });

      // Yalnızca numeroloji kaydedilmiş olsun
      saveClientNumerology(client.id, sampleNumerology);

      const archive = getClientArchive(client.id);
      const prep = prepareRecipeModule(client, archive);

      assert.strictEqual(prep.status, 'INPUTS_MISSING');
      assert.ok(prep.warningNotices.some((w) => w.includes('Çakra')));
      assert.ok(prep.warningNotices.some((w) => w.includes('Arketip')));

      const genResult = generateClientRecipe(client, archive);
      assert.strictEqual(genResult.success, false);
      assert.strictEqual(genResult.design, undefined);
      assert.ok(genResult.errorMessageTr?.includes('engellendi') || genResult.errorMessageTr?.includes('eksik'));
    });
  });

  describe('7. Versiyonlama ve Sıfırlama İzolasyonu (Kural 14 & 15)', () => {
    it('Yeni reçete üretildiğinde eski versiyonlar silinmemeli (V1, V2) ve reçete sıfırlama analizleri silmemelidir', () => {
      const client = createClientRecord({
        firstName: 'Defne',
        lastName: 'Şahin',
        motherName: 'Meral',
        birthDate: '1996-03-22',
        birthTime: '15:10',
        isBirthTimeUnknown: false,
        birthLocation: mockLocation,
        email: 'defne@test.com',
        phone: '5558889900',
        notes: '',
      });

      saveClientNumerology(client.id, sampleNumerology);
      saveClientChakra(client.id, sampleChakra);
      saveClientArchetype(client.id, sampleArchetype);

      let archive = getClientArchive(client.id);

      // 1. Versiyon V1'i oluştur ve kaydet
      const resV1 = generateClientRecipe(client, archive, { preferredStyle: 'FINE_LINE' });
      assert.ok(resV1.success && resV1.design);
      assert.strictEqual(resV1.design.versionNumber, 1);
      saveClientDesign(client.id, resV1.design);

      // Arşivi güncelle ve V2'yi üret
      archive = getClientArchive(client.id);
      assert.strictEqual(archive?.designs.length, 1);

      const resV2 = generateClientRecipe(client, archive, { preferredStyle: 'SACRED_GEOMETRY' });
      assert.ok(resV2.success && resV2.design);
      assert.strictEqual(resV2.design.versionNumber, 2);
      saveClientDesign(client.id, resV2.design);

      // İki versiyon da arşivde korunmalıdır (Kural 14)
      archive = getClientArchive(client.id);
      assert.strictEqual(archive?.designs.length, 2);
      assert.strictEqual(archive?.designs[0].versionNumber, 1);
      assert.strictEqual(archive?.designs[1].versionNumber, 2);

      // Kural 15: Reçeteleri sıfırlama yalnızca tasarımları silmeli, analizleri KESİNLİKLE silmemelidir
      clearClientDesigns(client.id);

      const refreshedArchive = getClientArchive(client.id);
      assert.strictEqual(refreshedArchive?.designs.length, 0, 'Tasarımlar sıfırlanmalıdır.');

      // Analizler sapa sağlam durmalıdır
      const refreshedAnalysis = refreshedArchive?.analyses.find((a) => a.clientId === client.id);
      assert.ok(refreshedAnalysis?.numerology, 'Numeroloji analizi silinmemelidir.');
      assert.ok(refreshedAnalysis?.chakra, 'Çakra analizi silinmemelidir.');
      assert.ok(refreshedAnalysis?.archetype, 'Arketip analizi silinmemelidir.');
    });
  });

  describe('8. Negatif İfade Yasağı ve Teknik Ayrım (Kural 10, 11 & 12)', () => {
    it('Reçete ve manifestoda negatif/uğursuz ifadeler kullanılmamalı, teknik bilgiler ayrı alanda tutulmalıdır', () => {
      const client = createMockClient({
        id: 'client_pos_1',
        firstName: 'Tolga',
        lastName: 'Eren',
        birthDate: '1997-12-05',
        motherName: 'Semra',
        email: 'tolga@test.com',
      });

      const design = generateTattooRecipeFromAnalyses({
        client,
        astrology: sampleAstrology,
        numerology: sampleNumerology,
        chakra: sampleChakra,
        archetype: sampleArchetype,
        nextVersionNumber: 1,
      });

      const fullText = JSON.stringify(design).toLowerCase();
      const forbiddenWords = ['lanet', 'uğursuzluk', 'kötü enerji', 'felaket', 'büyü'];

      for (const word of forbiddenWords) {
        assert.ok(!fullText.includes(word), `Yasaklı negatif kelime "${word}" çıktı metninde bulunamaz.`);
      }

      // Kural 10 & 12: Manifesto kişisel ve psikolojiktir, iğne ve teknik jargon buraya karışmaz
      assert.ok(!design.conceptStatement.toLowerCase().includes('bugpin'));
      assert.ok(!design.conceptStatement.toLowerCase().includes('kartuş'));
      assert.ok(!design.conceptStatement.toLowerCase().includes('iğne penetrasyon'));

      // Teknik bilgiler `technicalAdviceForArtist` alanındadır
      assert.ok(design.recipe.technicalAdviceForArtist.some((t) => t.includes('iğne') || t.includes('RL') || t.includes('çizgi')));
    });
  });
});
