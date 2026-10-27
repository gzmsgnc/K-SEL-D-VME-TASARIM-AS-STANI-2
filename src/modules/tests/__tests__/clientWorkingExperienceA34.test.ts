import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { ClientTattooDesign } from '../../../types/design';
import {
  evaluateWorkspaceWorkflow,
} from '../../../utils/workspaceWorkflow';
import {
  evaluateTattooDesignStage,
} from '../../../utils/tattooDesignStage';
import {
  calculateClientNumerology,
} from '../../numerology';
import {
  calculateChakraAnalysisFromNumerology,
} from '../../chakra';
import {
  calculateArchetypeAnalysis,
} from '../../archetype';
import {
  generateClientRecipe,
} from '../../recipe';
import {
  generateUnifiedVisualPrompt,
} from '../../symbols';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
} from '../../../utils/tattooDesignFormatters';
import {
  generateClientDossierText,
  generateClientDossierJson,
} from '../../../utils/clientDossierGenerator';

describe('A34 — Uygulama Kullanım Deneyimi ve Çıktı Merkezi Test Paketi', () => {
  // Test danışanları
  const clientA: Client = {
    id: 'CLI-A34-001',
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz@example.com',
    phone: '+90 555 111 2233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    motherName: 'Gülten',
    birthLocation: {
      latitude: 41.0082,
      longitude: 28.9784,
      city: 'İstanbul',
      country: 'Türkiye',
      placeName: 'İstanbul, Türkiye',
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    notes: 'A34 Deneyim Test Danışanı A',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  const clientB: Client = {
    id: 'CLI-A34-002',
    firstName: 'Ece',
    lastName: 'Yıldız',
    email: 'ece@example.com',
    phone: '+90 555 222 3344',
    birthDate: '1995-11-03',
    birthTime: '09:15',
    isBirthTimeUnknown: false,
    motherName: 'Fatma',
    birthLocation: {
      latitude: 38.4192,
      longitude: 27.1287,
      city: 'İzmir',
      country: 'Türkiye',
      placeName: 'İzmir, Türkiye',
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    notes: 'A34 Deneyim Test Danışanı B',
    createdAt: '2026-01-12T10:00:00Z',
    updatedAt: '2026-01-12T10:00:00Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  function makeEmptyArchive(client: Client): ClientArchiveRecord {
    return {
      client,
      analyses: [],
      designs: [],
      symbolAnalyses: [],
      testResults: [],
      reports: [],
      historySummary: {
        totalAnalysesCount: 0,
        totalDesignsCount: 0,
        lastInteractionAt: '2026-01-10T10:00:00Z',
      },
    };
  }

  function createCompletedAnalysesArchive(client: Client): ClientArchiveRecord {
    const numRes = calculateClientNumerology(client);
    if (!numRes.success || !numRes.numerology) {
      throw new Error('Numeroloji hesaplanamadı');
    }
    const num = numRes.numerology;
    const chakra = calculateChakraAnalysisFromNumerology(num);
    const archetype = calculateArchetypeAnalysis(num, chakra);

    return {
      client,
      analyses: [
        {
          id: 'ANA-FULL',
          clientId: client.id,
          version: 1,
          createdAt: '2026-01-10T10:00:00Z',
          updatedAt: '2026-01-10T10:00:00Z',
          numerology: num,
          chakra: chakra,
          archetype: archetype,
        },
      ],
      designs: [],
      symbolAnalyses: [],
      testResults: [],
      reports: [],
      historySummary: {
        totalAnalysesCount: 1,
        totalDesignsCount: 0,
        lastInteractionAt: '2026-01-10T10:00:00Z',
      },
    };
  }

  it('1. Aktif danışanın çalışma özeti doğru hesaplanıyor', () => {
    // Boş arşivli danışan A
    const emptyArchive = makeEmptyArchive(clientA);

    const summary = evaluateWorkspaceWorkflow(clientA, emptyArchive);
    assert.ok(summary, 'Çalışma özeti üretilmelidir');
    assert.equal(summary.clientId, clientA.id);
    assert.equal(summary.clientFullName, 'Deniz Kaya');
    assert.equal(summary.completedAnalysesCount, 0);
    assert.equal(summary.completedTestsCount, 0);
    assert.equal(summary.totalDesignsCount, 0);
    assert.ok(summary.birthInfoTr.includes('1992-05-18'));
  });

  it('2. Eksik analiz doğru şekilde gösteriliyor ve sahte veri üretilmiyor', () => {
    const emptyArchive = makeEmptyArchive(clientA);

    const summary = evaluateWorkspaceWorkflow(clientA, emptyArchive);
    assert.ok(summary);
    // Adım 2: Temel Analizler
    const stepCore = summary.steps.find((s) => s.id === 'CORE_ANALYSES');
    assert.ok(stepCore);
    assert.equal(stepCore.status, 'READY');
    assert.ok(summary.completedAnalysesCount === 0);
  });

  it('3. Eksik adım ilgili sekmeye yönlendiriyor', () => {
    const emptyArchive = makeEmptyArchive(clientA);

    const summary = evaluateWorkspaceWorkflow(clientA, emptyArchive);
    assert.ok(summary);

    const stepRecipe = summary.steps.find((s) => s.id === 'TATTOO_RECIPE');
    assert.ok(stepRecipe);
    assert.equal(stepRecipe.status, 'MISSING');
    assert.equal(stepRecipe.redirectTargetTab, 'ANALYSES');
    assert.ok(stepRecipe.guidanceMessageTr?.includes('analiz'));
  });

  it('4. Tasarım aşaması gerçek kayıt durumunu doğru gösteriyor (9 durum)', () => {
    // Zorunlu analizler eksik olduğunda -> PREREQUISITES_MISSING (Stage 3)
    const stage3 = evaluateTattooDesignStage(clientA, null, {
      currentStep: 1,
    });
    assert.equal(stage3.stageId, 'PREREQUISITES_MISSING');
    assert.equal(stage3.stageNumber, 3);

    // Zorunlu analizleri içeren gerçek arşiv
    const archiveWithAnalyses = createCompletedAnalysesArchive(clientA);

    // Parametreler eksik olduğunda -> PARAMETERS_MISSING (Stage 2)
    const stage2 = evaluateTattooDesignStage(clientA, archiveWithAnalyses, {
      currentStep: 1,
      selectedStyle: undefined,
      selectedPlacement: undefined,
    });
    assert.equal(stage2.stageId, 'PARAMETERS_MISSING');
    assert.equal(stage2.stageNumber, 2);

    // Parametreler tamam ama sembol bekleniyor -> SYMBOL_SELECTION_PENDING (Stage 4)
    const stage4 = evaluateTattooDesignStage(clientA, archiveWithAnalyses, {
      currentStep: 3,
      selectedStyle: 'SACRED_GEOMETRY',
      selectedPlacement: 'FOREARM_INNER',
      customWidth: 10,
      customHeight: 15,
      selectedSymbolsCount: 0,
    });
    assert.equal(stage4.stageId, 'SYMBOL_SELECTION_PENDING');
    assert.equal(stage4.stageNumber, 4);

    // Sembol de seçildi -> READY_FOR_RECIPE (Stage 5)
    const stage5 = evaluateTattooDesignStage(clientA, archiveWithAnalyses, {
      currentStep: 4,
      selectedStyle: 'SACRED_GEOMETRY',
      selectedPlacement: 'FOREARM_INNER',
      customWidth: 10,
      customHeight: 15,
      selectedSymbolsCount: 1,
    });
    assert.equal(stage5.stageId, 'READY_FOR_RECIPE');
    assert.equal(stage5.stageNumber, 5);
  });

  it('5. Reçete mevcutsa sonraki aşama doğru gösteriliyor', () => {
    const archiveWithAnalyses = createCompletedAnalysesArchive(clientA);

    const recipeRes = generateClientRecipe(clientA, archiveWithAnalyses, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 10, height: 16 },
    });
    assert.ok(recipeRes.success && recipeRes.design);

    // Sadece reçete içeren tasarım (görsel istem henüz üretilmedi)
    const designOnlyRecipe: ClientTattooDesign = {
      ...recipeRes.design,
      aiPrompt: undefined as any,
    };

    const archiveWithRecipe: ClientArchiveRecord = {
      ...archiveWithAnalyses,
      designs: [designOnlyRecipe],
    };

    // Reçete mevcut, görsel istem henüz yok (Stage 6)
    const stage6 = evaluateTattooDesignStage(clientA, archiveWithRecipe, {
      currentStep: 4,
    });
    assert.equal(stage6.stageId, 'RECIPE_EXISTS');
    assert.equal(stage6.stageNumber, 6);

    // Kullanıcı görsel istem adımına geçtiğinde -> READY_FOR_VISUAL_PROMPT (Stage 7)
    const stage7 = evaluateTattooDesignStage(clientA, archiveWithRecipe, {
      currentStep: 5,
    });
    assert.equal(stage7.stageId, 'READY_FOR_VISUAL_PROMPT');
    assert.equal(stage7.stageNumber, 7);
  });

  it('6. Görsel istem yalnızca gerçek reçeteden sonra hazır görünüyor', () => {
    const archiveWithAnalyses = createCompletedAnalysesArchive(clientA);

    const recipeRes = generateClientRecipe(clientA, archiveWithAnalyses, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 10, height: 16 },
    });
    assert.ok(recipeRes.success && recipeRes.design);

    // A16 görsel istem motoru çalıştırılıyor
    const promptRes = generateUnifiedVisualPrompt({
      clientId: clientA.id,
      clientFullName: 'Deniz Kaya',
      selectedSymbols: [],
      recipe: recipeRes.design.recipe,
      style: recipeRes.design.recipe.style,
      placement: recipeRes.design.recipe.recommendedPlacement,
    });

    const designWithPrompt: ClientTattooDesign = {
      ...recipeRes.design,
      aiPrompt: {
        primaryPromptEn: promptRes.primaryPromptEn,
        conceptPromptTr: promptRes.conceptPromptTr,
        negativePrompt: promptRes.negativePrompt,
        aspectRatio: '3:4',
        artisticModifiers: ['sacred geometry'],
      },
    };

    const archiveWithPrompt: ClientArchiveRecord = {
      ...archiveWithAnalyses,
      designs: [designWithPrompt],
    };

    // Görsel istem mevcut -> VISUAL_PROMPT_EXISTS (Stage 8)
    const stage8 = evaluateTattooDesignStage(clientA, archiveWithPrompt);
    assert.equal(stage8.stageId, 'VISUAL_PROMPT_EXISTS');
    assert.equal(stage8.stageNumber, 8);
  });

  it('7. Güncel ve arşiv tasarımı birbirinden doğru ayrılıyor', () => {
    const archiveWithAnalyses = createCompletedAnalysesArchive(clientA);

    // Sürüm 1
    const v1Res = generateClientRecipe(clientA, archiveWithAnalyses, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
    });
    assert.ok(v1Res.success && v1Res.design);
    const v1Design: ClientTattooDesign = { ...v1Res.design, id: 'DES-V1', versionNumber: 1 };

    // Sürüm 2
    const v2Res = generateClientRecipe(clientA, archiveWithAnalyses, {
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'SHOULDER_BLADE',
    });
    assert.ok(v2Res.success && v2Res.design);
    const v2Design: ClientTattooDesign = { ...v2Res.design, id: 'DES-V2', versionNumber: 2 };

    const archiveWithTwoDesigns: ClientArchiveRecord = {
      ...archiveWithAnalyses,
      designs: [v1Design, v2Design],
    };

    // Güncel sürüm inceleniyor (V2)
    const currentStage = evaluateTattooDesignStage(clientA, archiveWithTwoDesigns, {
      activeDesignId: v2Design.id,
    });
    assert.notEqual(currentStage.stageId, 'DESIGN_ARCHIVED');
    assert.equal(currentStage.isHistoricalOrArchived, false);

    // Geçmiş sürüm inceleniyor (V1)
    const historicalStage = evaluateTattooDesignStage(clientA, archiveWithTwoDesigns, {
      activeDesignId: v1Design.id,
    });
    assert.equal(historicalStage.stageId, 'DESIGN_ARCHIVED');
    assert.equal(historicalStage.stageNumber, 9);
    assert.equal(historicalStage.isHistoricalOrArchived, true);
    assert.ok(historicalStage.stageTitleTr.includes('Arşivlendi'));
  });

  it('8. Geçmiş sürüm salt okunur kalıyor ve güncel sürümü bozmuyor', () => {
    const v1Design: ClientTattooDesign = {
      id: 'DES-A-V1',
      clientId: clientA.id,
      versionNumber: 1,
      title: 'Geometrik Lotus V1',
      conceptStatement: 'Lotus ve Yaşam Çiçeği merkezli kutsal denge.',
      createdAt: '2026-01-10T11:00:00Z',
      updatedAt: '2026-01-10T11:00:00Z',
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç ön kol aksı boyunca',
        recommendedDimensionsCm: { width: 10, height: 16 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Yaşam Çiçeği',
        secondarySymbols: ['Metatron'],
        keyComponents: ['Yaşam Çiçeği'],
        technicalAdviceForArtist: ['Hassas çizgi'],
      },
      aiPrompt: {
        primaryPromptEn: 'A sacred geometry flower of life tattoo',
        conceptPromptTr: 'Yaşam Çiçeği ve kutsal geometri',
        negativePrompt: 'no blur',
        aspectRatio: '3:4',
        artisticModifiers: ['sacred geometry'],
      },
    };

    const v2Design: ClientTattooDesign = {
      id: 'DES-A-V2',
      clientId: clientA.id,
      versionNumber: 2,
      title: 'Minimal Spiral V2',
      conceptStatement: 'Altın Spiral akışı.',
      createdAt: '2026-01-10T12:00:00Z',
      updatedAt: '2026-01-10T12:00:00Z',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'WRIST_INNER',
        placementDescription: 'İç bilek yatay akışı',
        recommendedDimensionsCm: { width: 6, height: 8 },
        colorProfile: 'BLACK_AND_GREY',
        primarySymbol: 'Altın Spiral',
        secondarySymbols: [],
        keyComponents: ['Altın Spiral'],
        technicalAdviceForArtist: ['0.20mm tek iğne'],
      },
      aiPrompt: {
        primaryPromptEn: 'A minimal golden spiral tattoo',
        conceptPromptTr: 'Minimal altın spiral',
        negativePrompt: 'no blur',
        aspectRatio: '1:1',
        artisticModifiers: ['fine line'],
      },
    };

    // V1 geçmiş sürüm metni oluşturulduğunda V1 verilerini yansıtır
    const v1Text = formatTattooRecipeText(clientA, v1Design);
    assert.ok(v1Text.includes('Yaşam Çiçeği'));
    assert.ok(v1Text.includes('10 cm (Genişlik) x 16 cm (Yükseklik)'));

    // V2 güncel sürüm bağımsızdır ve bozulmaz
    const v2Text = formatTattooRecipeText(clientA, v2Design);
    assert.ok(v2Text.includes('Altın Spiral'));
    assert.ok(v2Text.includes('6 cm (Genişlik) x 8 cm (Yükseklik)'));
    assert.notEqual(v1Text, v2Text);
  });

  it('9. Kopyalama yalnızca aktif danışanın verisini içeriyor', () => {
    const v1DesignA: ClientTattooDesign = {
      id: 'DES-A',
      clientId: clientA.id,
      versionNumber: 1,
      title: 'Tasarım Deniz',
      createdAt: '2026-01-10T11:00:00Z',
      updatedAt: '2026-01-10T11:00:00Z',
      conceptStatement: 'Deniz Kaya için özel derinlik manifestosu.',
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç ön kol aksı boyunca dikey yerleşim',
        recommendedDimensionsCm: { width: 12, height: 18 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Torus',
        secondarySymbols: [],
        keyComponents: ['Torus', 'Geometrik Denge'],
        technicalAdviceForArtist: ['0.25mm 3RL iğne', 'Hassas aks simetrisi'],
        artistVisualDirection: ['Merkezi kompozisyon'],
      },
      aiPrompt: {
        primaryPromptEn: 'A sacred geometry torus tattoo designed for Deniz Kaya',
        conceptPromptTr: 'Deniz Kaya için kozmik akış ve geometrik merkez',
        negativePrompt: 'no distortion, no ugly shading',
        aspectRatio: '3:4',
        artisticModifiers: ['sacred geometry', 'fine lines'],
      },
    };

    const recipeText = formatTattooRecipeText(clientA, v1DesignA);
    const conceptText = formatConceptManifestoText(clientA, v1DesignA);
    const technicalText = formatTechnicalAdviceText(clientA, v1DesignA);
    const promptText = formatVisualPromptText(clientA, v1DesignA);
    const negativeText = formatNegativePromptText(clientA, v1DesignA);
    const fullPackageText = formatFullDesignPackageText(clientA, v1DesignA);

    // Hepsi Danışan A'yı yansıtır, Danışan B (Ece Yıldız) veya anne adı Gülten sızmaz
    assert.ok(recipeText.includes('Deniz Kaya'));
    assert.ok(!recipeText.includes('Ece Yıldız'));
    assert.ok(!recipeText.includes('Gülten'));

    assert.ok(conceptText.includes('Deniz Kaya'));
    assert.ok(promptText.includes('A sacred geometry torus tattoo'));
    assert.ok(negativeText.includes('no distortion'));
    assert.ok(fullPackageText.includes('Deniz Kaya'));
    assert.ok(fullPackageText.includes('CLI-A34-001'));
  });

  it('10. Danışan dosyası yalnızca aktif danışanı içeriyor', () => {
    const archiveA = makeEmptyArchive(clientA);

    const dossierText = generateClientDossierText(clientA, archiveA);
    const dossierJson = generateClientDossierJson(clientA, archiveA) as any;

    assert.ok(dossierText.includes(clientA.id));
    assert.ok(dossierText.includes(clientA.firstName));
    assert.ok(dossierText.includes(clientA.lastName));
    assert.ok(!dossierText.includes('CLI-A34-002'));
    assert.ok(!dossierText.includes('Ece Yıldız'));

    assert.equal(dossierJson.client.id, clientA.id);
    assert.equal(dossierJson.client.firstName, 'Deniz');
  });

  it('11. Boş veri durumunda sahte içerik/istatistik oluşmuyor', () => {
    const emptyArchive = makeEmptyArchive(clientA);

    const summary = evaluateWorkspaceWorkflow(clientA, emptyArchive);
    assert.ok(summary);

    // Boşken sayaçlar 0
    assert.equal(summary.completedAnalysesCount, 0);
    assert.equal(summary.completedTestsCount, 0);
    assert.equal(summary.totalDesignsCount, 0);
    assert.equal(summary.currentRecipeVersionTr, 'Oluşturulmadı');

    // Boş durum tasarım aşaması kontrolü
    const stage = evaluateTattooDesignStage(clientA, emptyArchive);
    assert.equal(stage.stageId, 'PREREQUISITES_MISSING');
    assert.ok(stage.stageDescriptionTr.includes('eksik'));
  });

  it('12. Dar ekran çalışma akışı için gerekli 8 aşama ve görünürlük korunuyor', () => {
    const emptyArchive = makeEmptyArchive(clientA);

    const summary = evaluateWorkspaceWorkflow(clientA, emptyArchive);
    assert.ok(summary);
    assert.equal(summary.steps.length, 8);

    const stepOrder = summary.steps.map((s) => s.order);
    assert.deepEqual(stepOrder, [1, 2, 3, 4, 5, 6, 7, 8]);

    // Her aşamanın açık Türkçe adı ve durumu vardır
    for (const step of summary.steps) {
      assert.ok(step.title.length > 0);
      assert.ok(step.statusLabelTr.length > 0);
      assert.ok(['Tamamlandı', 'Eksik', 'Hazır', 'Henüz başlatılmadı'].includes(step.statusLabelTr));
    }
  });
});
