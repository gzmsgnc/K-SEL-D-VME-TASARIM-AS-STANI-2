import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { evaluateWorkspaceWorkflow } from '../../../utils/workspaceWorkflow';
import { generateClientRecipe } from '../../recipe';

describe('A27: Danışan Çalışma Alanı Sonuç ve İş Akışı Doğrulama Testleri', () => {
  const mockClientA: Client = {
    id: 'CLI-A27-001',
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz.kaya@example.com',
    phone: '+90 532 111 2233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      city: 'İzmir',
      country: 'Türkiye',
      placeName: 'İzmir, Konak',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülseren',
    notes: 'Geometrik dövme tasarımı istiyor.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const mockClientB: Client = {
    id: 'CLI-A27-002',
    firstName: 'Barış',
    lastName: 'Yılmaz',
    email: 'baris.yilmaz@example.com',
    phone: '+90 555 444 5566',
    birthDate: '1988-11-04',
    birthTime: '00:00',
    isBirthTimeUnknown: true,
    birthLocation: {
      city: 'Ankara',
      country: 'Türkiye',
      placeName: 'Ankara, Çankaya',
      latitude: 39.9208,
      longitude: 32.8541,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: '',
    createdAt: '2026-03-02T12:00:00Z',
    updatedAt: '2026-03-02T12:00:00Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  function createEmptyArchive(client: Client): ClientArchiveRecord {
    return {
      client,
      reports: [],
      historySummary: {
        totalAnalysesCount: 0,
        totalDesignsCount: 0,
        lastInteractionAt: client.createdAt,
      },
      analyses: [],
      testResults: [],
      symbolAnalyses: [],
      designs: [],
    };
  }

  function createFullArchive(client: Client): ClientArchiveRecord {
    return {
      client,
      reports: [],
      historySummary: {
        totalAnalysesCount: 1,
        totalDesignsCount: 1,
        lastInteractionAt: client.createdAt,
      },
      analyses: [
        {
          id: 'ANA-001',
          clientId: client.id,
          version: 1,
          createdAt: '2026-03-01T11:00:00Z',
          updatedAt: '2026-03-01T11:00:00Z',
          astrology: {
            zodiacSystem: 'TROPICAL',
            houseSystem: 'PLACIDUS',
            isBirthTimeUnknown: false,
            birthDate: client.birthDate,
            birthTime: client.birthTime,
            latitude: 38.4,
            longitude: 27.1,
            timezone: 'Europe/Istanbul',
            utcOffsetMinutes: 180,
            sunSign: 'Taurus',
            moonSign: 'Scorpio',
            ascendantSign: 'Virgo',
            planetaryPositions: [
              { body: 'Sun', sign: 'Taurus', degree: 27, minute: 30, houseNumber: 9 },
              { body: 'Moon', sign: 'Scorpio', degree: 14, minute: 12, houseNumber: 3 },
            ],
          },
          numerology: {
            lifePathNumber: 8,
            destinyNumber: 4,
            soulUrgeNumber: 11,
            personalityNumber: 2,
            birthdayNumber: 18,
            worldMissionNumber: 3,
            karmicLessons: [],
            masterNumbers: [11],
          },
          chakra: {
            chakras: [
              { chakra: 'ROOT', score: 8, status: 'BALANCED', focusRecommendations: [] },
              { chakra: 'HEART', score: 4, status: 'UNDERACTIVE', focusRecommendations: [] },
            ],
            dominantChakra: 'ROOT',
            primaryDeficit: 'HEART',
          },
          archetype: {
            unifiedArchetype: {
              primary: 'Bilge & Mimar',
              secondary: 'Gezgin',
              description: 'Derin içgörü',
            },
            shadowArchetype: {
              shadowName: 'İzolasyoncu',
              transformationalSymbol: 'Pusula',
            },
          },
        },
      ],
      testResults: [
        {
          id: 'TEST-ENNEA-001',
          clientId: client.id,
          testType: 'ENNEAGRAM',
          primaryType: 'Tip 5 — Araştırmacı / Gözlemci',
          secondaryType: 'Kanat 4',
          dominantScores: { 'Tip 5': 12 },
          interpretations: ['Odaklanmış zihinsel yapı.'],
          completedAt: '2026-03-01T11:30:00Z',
          version: 1,
          answers: [],
        },
        {
          id: 'TEST-TOTEM-001',
          clientId: client.id,
          testType: 'ANIMAL_TOTEM',
          primaryType: 'Baykuş (Owl) — Gece Bilgeliği',
          secondaryType: 'Kurt',
          dominantScores: { 'Baykuş': 10 },
          interpretations: ['Sezgi ve sessiz tefekkür.'],
          completedAt: '2026-03-01T11:45:00Z',
          version: 1,
          answers: [],
        },
      ],
      symbolAnalyses: [],
      designs: [
        {
          id: 'DES-001',
          clientId: client.id,
          versionNumber: 1,
          title: 'Kozmik Bilge V1',
          conceptStatement: 'Zihnin berraklığı ve geometri',
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          recipe: {
            style: 'SACRED_GEOMETRY',
            recommendedPlacement: 'FOREARM_INNER',
            placementDescription: 'Ön kol iç yüzey',
            recommendedDimensionsCm: { width: 10, height: 16 },
            colorProfile: 'BLACK_AND_GREY',
            primarySymbol: 'Baykuş ve Metatron',
            keyComponents: ['Baykuş figürü', 'Geometrik ızgara'],
            technicalAdviceForArtist: ['3RL ince çizgi'],
          },
          aiPrompt: {
            primaryPromptEn: 'Sacred geometry owl tattoo, black and grey, clean linework',
            conceptPromptTr: 'Kutsal geometri baykuş dövmesi',
            negativePrompt: 'colors, blurry',
            artisticModifiers: ['fine line', 'vector sharp'],
            aspectRatio: '3:4',
          },
        },
      ],
    };
  }

  it('1. Eksik analiz durumunda sonraki aşama (Reçete) eksik olarak işaretlenmeli ve yönlendirme sunulmalıdır', () => {
    const emptyArchive = createEmptyArchive(mockClientA);
    const summary = evaluateWorkspaceWorkflow(mockClientA, emptyArchive);

    assert.ok(summary);
    // 2. Adım (Temel Analizler) Hazır ama Henüz tamamlanmadı
    const stepAnalyses = summary.steps.find((s) => s.id === 'CORE_ANALYSES');
    assert.strictEqual(stepAnalyses?.status, 'READY');

    // 4. Adım (Dövme Reçetesi) EKSİK olmalı ve yönlendirme mesajı içermeli
    const stepRecipe = summary.steps.find((s) => s.id === 'TATTOO_RECIPE');
    assert.strictEqual(stepRecipe?.status, 'MISSING');
    assert.strictEqual(stepRecipe?.statusLabelTr, 'Eksik');
    assert.ok(stepRecipe?.guidanceMessageTr?.includes('Önce'));
    assert.strictEqual(stepRecipe?.redirectTargetTab, 'ANALYSES');

    // Reçete motoru da eksik analizde üretimi engellemeli
    const recipeRes = generateClientRecipe(mockClientA, emptyArchive);
    assert.strictEqual(recipeRes.success, false);
    assert.ok(recipeRes.errorMessageTr?.includes('Reçete üretimi engellendi'));
  });

  it('2. Tam analiz durumunda dövme reçetesi aşaması hazır (READY) görünmelidir', () => {
    const fullArchiveWithoutRecipe = createFullArchive(mockClientA);
    // Tasarımları boşaltalım (reçete henüz üretilmemiş olsun)
    fullArchiveWithoutRecipe.designs = [];

    const summary = evaluateWorkspaceWorkflow(mockClientA, fullArchiveWithoutRecipe);
    assert.ok(summary);

    const stepAnalyses = summary.steps.find((s) => s.id === 'CORE_ANALYSES');
    assert.strictEqual(stepAnalyses?.status, 'COMPLETED');
    assert.strictEqual(stepAnalyses?.statusLabelTr, 'Tamamlandı');

    const stepRecipe = summary.steps.find((s) => s.id === 'TATTOO_RECIPE');
    assert.strictEqual(stepRecipe?.status, 'READY');
    assert.strictEqual(stepRecipe?.statusLabelTr, 'Hazır');
    assert.ok(stepRecipe?.summaryTr.includes('hazır'));
  });

  it('3. Enneagram ve Totem test sonuçları sadece ait olduğu danışana bağlanmalıdır', () => {
    const fullArchiveA = createFullArchive(mockClientA);
    const summaryA = evaluateWorkspaceWorkflow(mockClientA, fullArchiveA);
    assert.ok(summaryA);

    const stepTestsA = summaryA.steps.find((s) => s.id === 'TESTS');
    assert.strictEqual(stepTestsA?.status, 'COMPLETED');
    assert.strictEqual(summaryA.completedTestsCount, 2);

    // Danışan B boş arşiv
    const emptyArchiveB = createEmptyArchive(mockClientB);
    const summaryB = evaluateWorkspaceWorkflow(mockClientB, emptyArchiveB);
    assert.ok(summaryB);

    const stepTestsB = summaryB.steps.find((s) => s.id === 'TESTS');
    assert.strictEqual(stepTestsB?.status, 'READY');
    assert.strictEqual(summaryB.completedTestsCount, 0);
  });

  it('4. Reçete mevcut olduğunda görsel istem aşaması hazır (READY) veya tamamlandı görünmelidir', () => {
    const fullArchive = createFullArchive(mockClientA);
    const summary = evaluateWorkspaceWorkflow(mockClientA, fullArchive);
    assert.ok(summary);

    const stepPrompt = summary.steps.find((s) => s.id === 'VISUAL_PROMPT');
    assert.strictEqual(stepPrompt?.status, 'COMPLETED');
    assert.strictEqual(stepPrompt?.statusLabelTr, 'Tamamlandı');
  });

  it('5. Tasarım sürümü mevcutsa arşiv ve özet kartı durumu doğru ve eksiksiz yansıtmalıdır', () => {
    const fullArchive = createFullArchive(mockClientA);
    const summary = evaluateWorkspaceWorkflow(mockClientA, fullArchive);
    assert.ok(summary);

    assert.strictEqual(summary.clientFullName, 'Deniz Kaya');
    assert.strictEqual(summary.totalDesignsCount, 1);
    assert.strictEqual(summary.currentRecipeVersionTr, 'V1');
    assert.ok(summary.overallProgressPercent > 50);

    const stepArchive = summary.steps.find((s) => s.id === 'DESIGN_ARCHIVE');
    assert.strictEqual(stepArchive?.status, 'COMPLETED');
    assert.ok(stepArchive?.summaryTr.includes('1 kayıtlı tasarım sürümü'));
  });

  it('6. Danışan değiştirildiğinde ilerleme durumu yeni danışanın verilerine göre anında hesaplanmalıdır', () => {
    const fullArchiveA = createFullArchive(mockClientA);
    const emptyArchiveB = createEmptyArchive(mockClientB);

    const summaryA = evaluateWorkspaceWorkflow(mockClientA, fullArchiveA);
    const summaryB = evaluateWorkspaceWorkflow(mockClientB, emptyArchiveB);

    assert.ok(summaryA);
    assert.ok(summaryB);

    assert.strictEqual(summaryA.clientId, 'CLI-A27-001');
    assert.strictEqual(summaryB.clientId, 'CLI-A27-002');

    assert.strictEqual(summaryA.completedAnalysesCount, 4);
    assert.strictEqual(summaryB.completedAnalysesCount, 0);

    assert.strictEqual(summaryA.currentRecipeVersionTr, 'V1');
    assert.strictEqual(summaryB.currentRecipeVersionTr, 'Oluşturulmadı');

    assert.notStrictEqual(summaryA.overallProgressPercent, summaryB.overallProgressPercent);
  });

  it('7. Sayfa yenileme / state yeniden oluşturulmasında aktif danışanın verileri korunmalıdır', () => {
    const fullArchive = createFullArchive(mockClientA);
    const serialized = JSON.stringify(fullArchive);
    const restoredArchive: ClientArchiveRecord = JSON.parse(serialized);

    const summary = evaluateWorkspaceWorkflow(mockClientA, restoredArchive);
    assert.ok(summary);
    assert.strictEqual(summary.completedAnalysesCount, 4);
    assert.strictEqual(summary.completedTestsCount, 2);
    assert.strictEqual(summary.totalDesignsCount, 1);
    assert.strictEqual(summary.steps[0].status, 'COMPLETED');
  });

  it('8. Eksik veride hiçbir sahte sonuç veya varsayılan sonuç üretilmemelidir', () => {
    const emptyArchive = createEmptyArchive(mockClientB);
    const summary = evaluateWorkspaceWorkflow(mockClientB, emptyArchive);
    assert.ok(summary);

    // Hiçbir analiz sahte olarak tamamlandı sayılmamalı
    assert.strictEqual(summary.completedAnalysesCount, 0);
    assert.strictEqual(summary.completedTestsCount, 0);
    assert.strictEqual(summary.totalDesignsCount, 0);
    assert.strictEqual(summary.currentRecipeVersionTr, 'Oluşturulmadı');

    // Reçete adımı açıkça "Eksik" olmalı
    const recipeStep = summary.steps.find((s) => s.id === 'TATTOO_RECIPE');
    assert.strictEqual(recipeStep?.status, 'MISSING');
    assert.strictEqual(recipeStep?.statusLabelTr, 'Eksik');
  });
});
