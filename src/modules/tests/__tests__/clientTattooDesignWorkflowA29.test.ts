import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  prepareRecipeModule,
  generateClientRecipe,
} from '../../recipe';
import {
  generateUnifiedVisualPrompt,
  getClientRecommendedSymbols,
} from '../../symbols';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatFullDesignPackageText,
  formatDesignPreviewSummary,
} from '../../../utils/tattooDesignFormatters';
import { ClientTattooDesign } from '../../../types/design';

describe('A29: Dövme Tasarımı Üretim Akışı Entegrasyon Testleri', () => {
  const mockClientA: Client = {
    id: 'CLI-A29-001',
    firstName: 'Zeynep',
    lastName: 'Demir',
    email: 'zeynep.demir@example.com',
    phone: '+90 533 111 2233',
    birthDate: '1994-06-21',
    birthTime: '10:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      city: 'İstanbul',
      country: 'Türkiye',
      placeName: 'İstanbul, Kadıköy',
      latitude: 40.9819,
      longitude: 29.0576,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'Kutsal geometri ve spiral akışlı tasarım talep ediyor.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const mockClientB: Client = {
    id: 'CLI-A29-002',
    firstName: 'Kerem',
    lastName: 'Yıldız',
    email: 'kerem.yildiz@example.com',
    phone: '+90 544 999 8877',
    birthDate: '1989-12-14',
    birthTime: '00:00',
    isBirthTimeUnknown: true,
    birthLocation: {
      city: 'İzmir',
      country: 'Türkiye',
      placeName: 'İzmir, Konak',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'Sırt omurga boyunca uzanan minimalist dövme.',
    createdAt: '2026-03-02T11:00:00Z',
    updatedAt: '2026-03-02T11:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  // Mock Archive for Client A (Complete Analyses)
  const mockArchiveA: ClientArchiveRecord = {
    client: mockClientA,
    analyses: [
      {
        id: 'ana-001',
        clientId: mockClientA.id,
        version: 1,
        createdAt: '2026-03-01T11:00:00Z',
        updatedAt: '2026-03-01T11:00:00Z',
        astrology: {
          sunSign: 'CANCER',
          moonSign: 'SCORPIO',
          ascendantSign: 'LEO',
          isBirthTimeUnknown: false,
          planetaryPositions: [
            { body: 'Sun', sign: 'CANCER', longitude: 110, formattedPosition: '20° Yengeç' },
            { body: 'Moon', sign: 'SCORPIO', longitude: 220, formattedPosition: '10° Akrep' },
            { body: 'Ascendant', sign: 'LEO', longitude: 130, formattedPosition: '10° Aslan' },
          ],
        } as any,
        numerology: {
          lifePathNumber: 5,
          expressionDestinyNumber: 7,
          soulUrgeNumber: 3,
          personalityNumber: 4,
          worldMissionNumber: 9,
          dominantNumbers: [5, 7],
          missingNumbers: [2],
          karmicLessons: [2],
          universalYear: 2026,
          personalYear: 1,
          pinCode: '5734-9',
          summaryTr: '5 Yaşam Yolu: Özgürlük, dönüşüm ve kutsal hareket.',
        } as any,
        chakra: {
          dominantChakra: 'HEART',
          primaryDeficit: 'THROAT',
          chakras: [
            { chakra: 'ROOT', status: 'BALANCED', score: 7, focusRecommendations: [] },
            { chakra: 'SACRAL', status: 'BALANCED', score: 7, focusRecommendations: [] },
            { chakra: 'SOLAR_PLEXUS', status: 'BALANCED', score: 6, focusRecommendations: [] },
            { chakra: 'HEART', status: 'OVERACTIVE', score: 9, focusRecommendations: [] },
            { chakra: 'THROAT', status: 'UNDERACTIVE', score: 4, focusRecommendations: ['İfade turkuazı'] },
            { chakra: 'THIRD_EYE', status: 'BALANCED', score: 8, focusRecommendations: [] },
            { chakra: 'CROWN', status: 'BALANCED', score: 8, focusRecommendations: [] },
          ],
          summaryTr: 'Boğaz çakrası desteklenmeli; Kalp çakrası merkezdedir.',
        } as any,
        archetype: {
          unifiedArchetype: {
            primary: 'Asi / Özgürleştirici',
            secondary: 'Bilge',
            description: 'Asi ve Bilge arketip dengesi.',
          },
          shadowArchetype: {
            shadowName: 'Gölge Tutsak',
            transformationalSymbol: 'Kozmik Spiral ve Açılan Kanatlar',
          },
          summaryTr: 'Asi ve Bilge arketip dengesi.',
        } as any,
      },
    ],
    symbolAnalyses: [],
    testResults: [
      {
        id: 'test-001',
        clientId: mockClientA.id,
        testType: 'ANIMAL_TOTEM',
        version: 1,
        completedAt: '2026-03-01T12:00:00Z',
        primaryType: 'Kurt (Canis lupus)',
        answers: [],
        dominantScores: { 'Kurt (Canis lupus)': 18 },
        interpretations: ['Kurt Totemi: Sezgi, sürü koruyuculuğu ve bağımsızlık.'],
      },
      {
        id: 'test-002',
        clientId: mockClientA.id,
        testType: 'ENNEAGRAM',
        version: 1,
        completedAt: '2026-03-01T12:30:00Z',
        primaryType: 'Tip 5 - Araştırmacı / Gözlemci',
        secondaryType: 'Kanat 4 (5w4)',
        answers: [],
        dominantScores: { 'Tip 5': 24 },
        interpretations: ['Tip 5w4: Entelektüel derinlik ve özgün ifade.'],
      },
    ],
    designs: [],
    reports: [],
    historySummary: { totalAnalysesCount: 1, totalDesignsCount: 0, lastInteractionAt: '2026-03-01T12:30:00Z' },
  };

  // Mock Archive for Client B (Missing Chakra & Archetype)
  const mockArchiveB_Incomplete: ClientArchiveRecord = {
    client: mockClientB,
    analyses: [
      {
        id: 'ana-002',
        clientId: mockClientB.id,
        version: 1,
        createdAt: '2026-03-02T11:00:00Z',
        updatedAt: '2026-03-02T11:00:00Z',
        numerology: {
          lifePathNumber: 9,
          expressionDestinyNumber: 1,
          soulUrgeNumber: 8,
          personalityNumber: 2,
          worldMissionNumber: 3,
          dominantNumbers: [9],
          missingNumbers: [],
          karmicLessons: [],
          universalYear: 2026,
          personalYear: 9,
          pinCode: '9182-3',
          summaryTr: '9 Yaşam Yolu.',
        } as any,
        chakra: null as any, // EKSİK
        archetype: null as any, // EKSİK
      },
    ],
    symbolAnalyses: [],
    testResults: [],
    designs: [],
    reports: [],
    historySummary: { totalAnalysesCount: 1, totalDesignsCount: 0, lastInteractionAt: '2026-03-02T11:00:00Z' },
  };

  it('1. Aktif danışanın tasarım parametreleri doğru okunuyor', () => {
    const summary = formatDesignPreviewSummary({
      client: mockClientA,
      style: 'FINE_LINE',
      placement: 'COLLARBONE',
      widthCm: 14,
      heightCm: 6,
      colorProfile: 'MINIMAL_RED_ACCENT',
      primarySymbol: 'Yaşam Ağacı Fraktalı',
      secondarySymbols: ['Hilal Glifi', 'Altın Oran Sarmalı'],
      excludedSymbols: ['yılan', 'kuru kafa'],
      includeTotemInVisual: true,
      totemName: 'Kurt (Canis lupus)',
      customNotes: 'Boyun kavisini takip eden zarif akış.',
    });

    assert.ok(summary.includes('Zeynep Demir'), 'Danışan adı içermeli');
    assert.ok(summary.includes('İnce Çizgi'), 'Stil adı Türkçe içermeli');
    assert.ok(summary.includes('Köprücük Kemiği'), 'Yerleşim adı içermeli');
    assert.ok(summary.includes('14 cm x 6 cm'), 'Ölçüler doğru formatlanmalı');
    assert.ok(summary.includes('Minimal Kırmızı Vurgulu'), 'Renk profili içermeli');
    assert.ok(summary.includes('Yaşam Ağacı Fraktalı'), 'Ana sembol içermeli');
    assert.ok(summary.includes('Hilal Glifi'), 'İkincil sembolleri içermeli');
    assert.ok(summary.includes('yılan, kuru kafa'), 'Hariç tutulanları içermeli');
    assert.ok(summary.includes('Kurt (Canis lupus)'), 'Totem görsel entegrasyonu içermeli');
    assert.ok(summary.includes('Boyun kavisini takip eden zarif akış'), 'Kompozisyon notu içermeli');
  });

  it('2. Eksik zorunlu analizde reçete üretimi engelleniyor', () => {
    const prep = prepareRecipeModule(mockClientB, mockArchiveB_Incomplete);
    assert.strictEqual(prep.status, 'INPUTS_MISSING');
    assert.strictEqual(prep.hasNumerology, true);
    assert.strictEqual(prep.hasChakra, false);
    assert.strictEqual(prep.hasArchetype, false);

    const result = generateClientRecipe(mockClientB, mockArchiveB_Incomplete, {
      preferredStyle: 'SACRED_GEOMETRY',
    });

    assert.strictEqual(result.success, false, 'Eksik analizle reçete oluşturulmamalı');
    assert.ok(result.errorMessageTr?.includes('Reçete üretimi engellendi'), 'Açık Türkçe hata vermeli');
    assert.strictEqual(result.design, undefined);
  });

  it('3. Geçerli tasarım parametreleriyle A15 reçetesi oluşturuluyor', () => {
    const result = generateClientRecipe(mockClientA, mockArchiveA, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 10, height: 16 },
      colorPreference: 'MONOCHROME_BLACK',
      primarySymbol: 'Kutsal Metatron Küpü',
      selectedSymbols: ['Kozmik Spiral'],
      excludedSymbols: ['hançer'],
      includeTotemInVisual: false,
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.design, 'Reçete üretilmeli');
    const d = result.design!;
    assert.strictEqual(d.clientId, mockClientA.id);
    assert.strictEqual(d.versionNumber, 1);
    assert.strictEqual(d.recipe.style, 'SACRED_GEOMETRY');
    assert.strictEqual(d.recipe.recommendedPlacement, 'FOREARM_INNER');
    assert.strictEqual(d.recipe.recommendedDimensionsCm.width, 10);
    assert.strictEqual(d.recipe.recommendedDimensionsCm.height, 16);
    assert.strictEqual(d.recipe.primarySymbol, 'Kutsal Metatron Küpü');
    assert.ok(d.recipe.keyComponents.length > 0, 'Temel unsurlar bulunmalı');
  });

  it('4. Reçete olmadan A16 görsel istemi oluşturulamıyor', () => {
    assert.throws(
      () => {
        generateUnifiedVisualPrompt({
          clientId: mockClientA.id,
          clientFullName: `${mockClientA.firstName} ${mockClientA.lastName}`,
          recipe: undefined, // EKSİK REÇETE
          selectedSymbols: [],
        });
      },
      (err: any) => {
        return err.message.includes('Eksik reçete');
      },
      'Reçetesiz görsel istem üretimi engellenmeli'
    );
  });

  it('5. Hariç tutulan sembol nihai isteme girmiyor', () => {
    const recipeResult = generateClientRecipe(mockClientA, mockArchiveA, {
      excludedSymbols: ['yılan', 'kurukafa'],
    });
    assert.strictEqual(recipeResult.success, true);
    const design = recipeResult.design!;

    const promptOut = generateUnifiedVisualPrompt({
      clientId: mockClientA.id,
      clientFullName: `${mockClientA.firstName} ${mockClientA.lastName}`,
      recipe: design.recipe,
      selectedSymbols: [
        { symbolId: '1', symbolName: 'Büyük Yılan Formu', customMeaning: 'test', weight: 'PRIMARY' },
        { symbolId: '2', symbolName: 'Kutsal Sri Yantra', customMeaning: 'denge', weight: 'SECONDARY' },
      ],
      excludedSymbols: ['yılan', 'kurukafa'],
    });

    const lowerPrompt = promptOut.primaryPromptEn.toLowerCase();
    const lowerConcept = promptOut.conceptPromptTr.toLowerCase();

    assert.ok(!lowerPrompt.includes('snake') && !lowerPrompt.includes('yılan'), 'Yılan prompta girmemeli');
    assert.ok(!lowerConcept.includes('yılan'), 'Yılan Türkçe konsepte girmemeli');
    assert.ok(!lowerPrompt.includes('skull') && !lowerPrompt.includes('kurukafa'), 'Kurukafa prompta girmemeli');
    assert.ok(promptOut.negativePrompt.includes('yılan'), 'Hariç tutulanlar negatif prompta eklenmeli');
  });

  it('6. Anne adı nihai isteme girmiyor', () => {
    // mockClientA.motherName === 'Ayşe'
    const recipeResult = generateClientRecipe(mockClientA, mockArchiveA);
    assert.strictEqual(recipeResult.success, true);
    const design = recipeResult.design!;

    const promptOut = generateUnifiedVisualPrompt({
      clientId: mockClientA.id,
      clientFullName: `${mockClientA.firstName} ${mockClientA.lastName}`,
      motherName: mockClientA.motherName,
      recipe: design.recipe,
      selectedSymbols: [
        { symbolId: '1', symbolName: 'Ayşe Sembolik Çiçeği', customMeaning: 'test', weight: 'PRIMARY' },
        { symbolId: '2', symbolName: 'Lotus Çiçeği', customMeaning: 'arınma', weight: 'SECONDARY' },
      ],
    });

    const promptText = promptOut.primaryPromptEn.toLocaleLowerCase('tr-TR');
    const conceptText = promptOut.conceptPromptTr.toLocaleLowerCase('tr-TR');

    assert.ok(!promptText.includes('ayşe') && !promptText.includes('ayse'), 'Anne adı İngilizce prompta girmemeli');
    assert.ok(!conceptText.includes('ayşe') && !conceptText.includes('ayse'), 'Anne adı Türkçe konsepte girmemeli');
  });

  it('7. Totem dahil/hariç davranışı mevcut kurala uygun', () => {
    // 1) Totem HARIÇ (Varsayılan)
    const resExcluded = generateClientRecipe(mockClientA, mockArchiveA, {
      includeTotemInVisual: false,
    });
    assert.strictEqual(resExcluded.success, true);
    const designExcluded = resExcluded.design!;
    assert.ok(
      designExcluded.recipe.totemAbstractionNotes?.includes('görsel tasarıma dahil edilmedi'),
      'Hariç tutulduğunda analiz-yalnızca notu içermeli'
    );
    assert.ok(
      !designExcluded.recipe.secondarySymbols?.some((s) => s.includes('Soyut Kurt')),
      'Hariç tutulduğunda ikincil sembollere eklenmemeli'
    );

    // 2) Totem DAHİL
    const resIncluded = generateClientRecipe(mockClientA, mockArchiveA, {
      includeTotemInVisual: true,
    });
    assert.strictEqual(resIncluded.success, true);
    const designIncluded = resIncluded.design!;
    assert.ok(
      designIncluded.recipe.totemAbstractionNotes?.includes('kesinlikle doğrudan veya sticker benzeri bir figür olarak değil'),
      'Dahil edildiğinde soyut negatif alan uyarısı bulunmalı'
    );
    assert.ok(
      designIncluded.recipe.secondarySymbols?.some((s) => s.includes('Soyut Kurt')),
      'Dahil edildiğinde soyut silüet olarak eklenmeli'
    );
  });

  it('8. Yeni reçete eski tasarım sürümünü silmiyor', () => {
    const archiveWithV1: ClientArchiveRecord = {
      ...mockArchiveA,
      designs: [
        {
          id: 'des-001',
          clientId: mockClientA.id,
          versionNumber: 1,
          title: 'V1 Tasarımı',
          conceptStatement: 'İlk konsept.',
          recipe: {
            style: 'FINE_LINE',
            recommendedPlacement: 'FOREARM_INNER',
            placementDescription: 'İç Ön Kol',
            recommendedDimensionsCm: { width: 8, height: 12 },
            colorProfile: 'MONOCHROME_BLACK',
            primarySymbol: 'Tohum',
            keyComponents: ['Tohum'],
            technicalAdviceForArtist: ['3RL'],
          },
          aiPrompt: {
            primaryPromptEn: 'Seed prompt',
            conceptPromptTr: 'Tohum konsept',
            negativePrompt: 'blur',
            aspectRatio: '3:4',
            artisticModifiers: [],
          },
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
        },
      ],
    };

    const resV2 = generateClientRecipe(mockClientA, archiveWithV1, {
      preferredStyle: 'SACRED_GEOMETRY',
    });
    assert.strictEqual(resV2.success, true);
    const designV2 = resV2.design!;

    assert.strictEqual(designV2.versionNumber, 2, 'Sürüm numarası 2 olmalı');
    assert.notStrictEqual(designV2.id, 'des-001', 'Yeni tasarımın kimliği farklı olmalı');
    assert.strictEqual(archiveWithV1.designs[0].versionNumber, 1, 'Eski sürüm bozulmadan korunmalı');
  });

  it('9. Danışan değişiminde tasarım verileri karışmıyor', () => {
    // Client A için tasarım
    const resA = generateClientRecipe(mockClientA, mockArchiveA);
    assert.strictEqual(resA.success, true);

    const clientADesigns = [resA.design!];

    // Client B arşivi
    const archiveBWithClientADataAttempt = {
      ...mockArchiveB_Incomplete,
      designs: clientADesigns, // Başka danışana ait tasarım
    };

    // Client B için hazırlanma: Client A'nın tasarımları filtrelenmeli
    const prepB = prepareRecipeModule(mockClientB, archiveBWithClientADataAttempt);
    assert.strictEqual(prepB.clientId, mockClientB.id);
    assert.strictEqual(prepB.existingDesignCount, 0, 'Client B, Client A tasarımlarını kendi tasarımı saymamalı');
  });

  it('10. Aynı tasarım girdileriyle üretim deterministik davranıyor', () => {
    const options = {
      preferredStyle: 'SACRED_GEOMETRY' as const,
      preferredPlacement: 'FOREARM_INNER' as const,
      colorPreference: 'MONOCHROME_BLACK' as const,
      primarySymbol: 'Metatron Küpü',
      selectedSymbols: ['Altın Oran Sarmalı'],
      excludedSymbols: ['yılan'],
    };

    const run1 = generateClientRecipe(mockClientA, mockArchiveA, options);
    const run2 = generateClientRecipe(mockClientA, mockArchiveA, options);

    assert.strictEqual(run1.success, true);
    assert.strictEqual(run2.success, true);
    assert.strictEqual(run1.design!.recipe.style, run2.design!.recipe.style);
    assert.strictEqual(run1.design!.recipe.primarySymbol, run2.design!.recipe.primarySymbol);
    assert.deepStrictEqual(run1.design!.recipe.secondarySymbols, run2.design!.recipe.secondarySymbols);
    assert.deepStrictEqual(run1.design!.recipe.excludedElements, run2.design!.recipe.excludedElements);
  });

  it('11. Reçete, teknik talimat ve görsel istem birbirinden doğru ayrılıyor', () => {
    const res = generateClientRecipe(mockClientA, mockArchiveA);
    assert.strictEqual(res.success, true);
    const design = res.design!;

    const recipeText = formatTattooRecipeText(mockClientA, design);
    const techText = formatTechnicalAdviceText(mockClientA, design);
    const visualText = formatVisualPromptText(mockClientA, design);

    // Reçete metni sembol ve stil detaylarını içerir
    assert.ok(recipeText.includes('DÖVME REÇETESİ'), 'Reçete başlığı olmalı');
    assert.ok(recipeText.includes('[STİL VE YERLEŞİM]'), 'Stil ve yerleşim bölümü olmalı');
    assert.ok(recipeText.includes('[SEMBOL KATMANLARI]'), 'Sembol katmanları olmalı');

    // Teknik talimat metni iğne ve eğrilik tavsiyelerini içerir
    assert.ok(techText.includes('DÖVME SANATÇISI TEKNİK TALİMATLARI'), 'Teknik başlık olmalı');
    assert.ok(techText.includes('[İĞNE VE TEKNİK TAVSİYELER]'), 'İğne bölümü olmalı');
    assert.ok(techText.includes('[GÖRSEL YÖNLENDİRMELER]'), 'Görsel yönlendirme olmalı');

    // Görsel istem metni Midjourney promptunu içerir
    assert.ok(visualText.includes('YAPAY ZEKA GÖRSEL İSTEMİ'), 'Görsel istem başlığı olmalı');
    assert.ok(visualText.includes('[PRIMARY AI PROMPT (ENGLISH)]'), 'İngilizce prompt alanı olmalı');
    assert.ok(visualText.includes('[NEGATIVE PROMPT]'), 'Negatif prompt alanı olmalı');
  });

  it('12. Kopyalama yalnızca aktif danışanın verisini içeriyor', () => {
    const res = generateClientRecipe(mockClientA, mockArchiveA);
    assert.strictEqual(res.success, true);
    const design = res.design!;

    const fullPackage = formatFullDesignPackageText(mockClientA, design);

    // Aktif danışan (Zeynep Demir) verisi içermeli
    assert.ok(fullPackage.includes('Zeynep Demir'), 'Aktif danışan adı içermeli');
    assert.ok(fullPackage.includes(mockClientA.id), 'Aktif danışan ID içermeli');

    // Başka danışan (Kerem Yıldız) verisi ASLA içermemeli
    assert.ok(!fullPackage.includes('Kerem Yıldız'), 'Başka danışan adı sızmamalı');
    assert.ok(!fullPackage.includes('CLI-A29-002'), 'Başka danışan ID sızmamalı');
    assert.ok(!fullPackage.includes('Fatma'), 'Başka danışanın anne adı sızmamalı');
  });
});
