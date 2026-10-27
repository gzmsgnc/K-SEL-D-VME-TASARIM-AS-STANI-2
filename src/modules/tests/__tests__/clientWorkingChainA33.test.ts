import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client, ClientFormData } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  saveClientTestResult,
  clearClientDesigns,
  clearAllApplicationData,
  getStoredActiveClientId,
  setStoredActiveClientId,
} from '../../../store/storage';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { generateClientRecipe, prepareRecipeModule } from '../../recipe';
import { generateUnifiedVisualPrompt } from '../../symbols';
import {
  runAndBuildTotemResult,
  runAndBuildEnneagramResult,
  ENNEAGRAM_QUESTIONS,
  TOTEM_QUESTIONS,
} from '../../tests';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
} from '../../../utils/tattooDesignFormatters';

describe('A33 — Gerçek Danışan Kesintisiz Çalışma Zinciri Test Paketi', () => {
  const sampleLocation = {
    country: 'Türkiye',
    city: 'Bursa',
    placeName: 'Bursa, Nilüfer',
    latitude: 40.2114,
    longitude: 28.9744,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const clientAData: ClientFormData = {
    firstName: 'Can',
    lastName: 'Öztürk',
    email: 'can.ozturk@example.com',
    phone: '5320001122',
    birthDate: '1993-04-10',
    birthTime: '10:30',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Sevgi',
    notes: 'A33 kesintisiz çalışma zinciri testi danışan A.',
  };

  const clientBData: ClientFormData = {
    firstName: 'Selin',
    lastName: 'Aksoy',
    email: 'selin.aksoy@example.com',
    phone: '5339998877',
    birthDate: '1996-11-25',
    birthTime: '15:20',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Meryem',
    notes: 'A33 zincir izolasyon testi danışan B.',
  };

  function setupFullAnalyses(client: Client): ClientArchiveRecord {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const archWithNum = getClientArchive(client.id);
    const ch = calculateClientChakra(client, archWithNum);
    if (ch.chakra) saveClientChakra(client.id, ch.chakra);

    const archWithCh = getClientArchive(client.id);
    const arch = calculateClientArchetype(client, archWithCh);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);

    return getClientArchive(client.id)!;
  }

  function getValidEnneagramAnswers(): Record<string, string> {
    const answers: Record<string, string> = {};
    for (const q of ENNEAGRAM_QUESTIONS) {
      answers[q.id] = q.options[0].id;
    }
    return answers;
  }

  function getValidTotemAnswers(): Record<string, string> {
    const answers: Record<string, string> = {};
    for (const q of TOTEM_QUESTIONS) {
      answers[q.id] = q.options[0].id;
    }
    return answers;
  }

  it('1. Danışan seçimi → Analiz kaynaklarının gerçek verilerle okunması ve eksik analizde reçete engeli', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      // Başlangıçta analizler boş
      const emptyArchive = getClientArchive(client.id);
      const prepBefore = prepareRecipeModule(client, emptyArchive);
      assert.strictEqual(prepBefore.status, 'INPUTS_MISSING', 'Zorunlu analizler eksikken reçete hazırlığı INPUTS_MISSING olmalıdır.');

      const recipeAttempt = generateClientRecipe(client, emptyArchive, {
        preferredStyle: 'FINE_LINE',
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.strictEqual(recipeAttempt.success, false, 'Eksik analizlerde reçete üretimi engellenmelidir.');
      assert.ok(recipeAttempt.errorMessageTr?.includes('Reçete üretimi engellendi'));

      // Analizleri tamamla
      const fullArchive = setupFullAnalyses(client);
      const prepAfter = prepareRecipeModule(client, fullArchive);
      assert.strictEqual(prepAfter.status, 'READY_TO_RUN', 'Analizler tamamlandığında reçete motoru READY_TO_RUN olmalıdır.');
      assert.strictEqual(prepAfter.hasNumerology, true);
      assert.strictEqual(prepAfter.hasChakra, true);
      assert.strictEqual(prepAfter.hasArchetype, true);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('2. Tasarım parametreleri → Reçete → Görsel İstem zincirinde özel ölçülerin korunması', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      const archive = setupFullAnalyses(client);

      // Özel ebat: 8 cm x 13 cm girildi
      const recipeRes = generateClientRecipe(client, archive, {
        preferredStyle: 'MICRO_REALISM',
        preferredPlacement: 'FOREARM_INNER', // Varsayılanı 12x18 cm'dir
        customDimensions: { width: 8, height: 13 },
        colorPreference: 'MONOCHROME_BLACK',
        primarySymbol: 'Hayat Ağacı',
        selectedSymbols: ['Altın Oran Spirali'],
        excludedSymbols: ['yılan'],
      });

      assert.strictEqual(recipeRes.success, true);
      assert.ok(recipeRes.design);

      const recipe = recipeRes.design.recipe;
      // 1. Reçete recommendedDimensionsCm alanında özel ölçü korunmalı
      assert.strictEqual(recipe.recommendedDimensionsCm.width, 8);
      assert.strictEqual(recipe.recommendedDimensionsCm.height, 13);

      // 2. Sanatçı teknik tavsiyesinde 8cm x 13cm yer almalı
      const advice = recipe.technicalAdviceForArtist;
      assert.ok(
        advice.some((a) => a.includes('8cm x 13cm') || a.includes('8 cm x 13 cm')),
        'Sanatçı teknik tavsiyelerinde özel ebat yer almalıdır.'
      );

      // 3. A16 Görsel İstem çıktısında da özel ölçü korunmalı
      const promptOutput = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe,
        selectedSymbols: [{ symbolId: '1', symbolName: 'Hayat Ağacı', customMeaning: '', weight: 'PRIMARY' }],
        excludedSymbols: ['yılan'],
      });

      assert.ok(promptOutput.conceptPromptTr.includes('8x13 cm'));
      assert.ok(promptOutput.technicalDirectives.some((t) => t.includes('8 cm x 13 cm')));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('3. Sembol hiyerarşisi ve anne adı izolasyonu', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData); // motherName: 'Sevgi'

    try {
      const archive = setupFullAnalyses(client);

      const recipeRes = generateClientRecipe(client, archive, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'SPINE_CENTER',
        primarySymbol: 'Metatron Küpü',
        selectedSymbols: ['Sri Yantra', 'Merkaba'],
        excludedSymbols: ['akrep', 'kurukafa'],
      });

      assert.strictEqual(recipeRes.success, true);
      assert.ok(recipeRes.design);

      const recipe = recipeRes.design.recipe;
      assert.strictEqual(recipe.primarySymbol, 'Metatron Küpü', 'Ana sembol korunmalıdır.');
      assert.ok(recipe.secondarySymbols?.includes('Sri Yantra'), 'İkincil sembol listesinde yer almalıdır.');
      assert.ok(!recipe.primarySymbol?.includes('Sevgi'), 'Anne adı ana sembole sızamaz.');

      // Görsel istemde kontrol
      const promptOutput = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe,
        selectedSymbols: [
          { symbolId: '1', symbolName: 'Metatron Küpü', customMeaning: '', weight: 'PRIMARY' },
          { symbolId: '2', symbolName: 'Sri Yantra', customMeaning: '', weight: 'SECONDARY' },
        ],
        excludedSymbols: ['akrep', 'kurukafa'],
      });

      const pEn = promptOutput.primaryPromptEn.toLocaleLowerCase('tr-TR');
      const pTr = promptOutput.conceptPromptTr.toLocaleLowerCase('tr-TR');
      const pNeg = promptOutput.negativePrompt.toLocaleLowerCase('tr-TR');

      assert.ok(!pEn.includes('sevgi'), 'Anne adı İngilizce isteme sızamaz.');
      assert.ok(!pTr.includes('sevgi'), 'Anne adı Türkçe konsepte sızamaz.');
      assert.ok(!pEn.includes('akrep'), 'Hariç tutulan sembol ana isteme giremez.');
      assert.ok(pNeg.includes('akrep'), 'Hariç tutulan sembol negatif isteme eklenmelidir.');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('4. Totem kuralı: Dahil edildiğinde soyut silüet, hariç tutulduğunda sıfır görsel öğe', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      let archive = setupFullAnalyses(client);
      const totemRes = runAndBuildTotemResult(client, archive, getValidTotemAnswers());
      saveClientTestResult(client.id, totemRes);
      archive = getClientArchive(client.id)!;

      // 1. Totem görsel olarak DAHİL
      const recipeWithTotem = generateClientRecipe(client, archive, {
        preferredStyle: 'FINE_LINE',
        preferredPlacement: 'FOREARM_INNER',
        includeTotemInVisual: true,
      });
      assert.strictEqual(recipeWithTotem.success, true);
      assert.ok(
        recipeWithTotem.design?.recipe.secondarySymbols?.some((s) => s.includes('Soyut Silüet') || s.includes(totemRes.primaryType)),
        'Totem dahil edildiğinde ikincil soyut motif eklenmelidir.'
      );

      // 2. Totem görsel olarak HARİÇ
      const recipeWithoutTotem = generateClientRecipe(client, archive, {
        preferredStyle: 'FINE_LINE',
        preferredPlacement: 'FOREARM_INNER',
        includeTotemInVisual: false,
      });
      assert.strictEqual(recipeWithoutTotem.success, true);
      assert.ok(
        !recipeWithoutTotem.design?.recipe.secondarySymbols?.some((s) => s.includes('Soyut Silüet')),
        'Totem hariç bırakıldığında görsel motif eklenmemelidir.'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('5. Reçete → Görsel İstem → Tasarım Sonucu metin formatlayıcılarının tutarlılığı', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      const archive = setupFullAnalyses(client);
      const recipeRes = generateClientRecipe(client, archive, {
        preferredStyle: 'ETCHING_ENGRAVING',
        preferredPlacement: 'SHOULDER_BLADE',
        primarySymbol: 'Kozmik Spiral',
      });
      assert.strictEqual(recipeRes.success, true);
      assert.ok(recipeRes.design);
      saveClientDesign(client.id, recipeRes.design);

      const design = recipeRes.design;
      const recipeText = formatTattooRecipeText(client, design);
      const manifestoText = formatConceptManifestoText(client, design);
      const technicalText = formatTechnicalAdviceText(client, design);
      const promptText = formatVisualPromptText(client, design);

      // Tüm formatlanmış metinler aktif danışan adını ve kimliğini içermelidir
      assert.ok(recipeText.includes(client.firstName) && recipeText.includes(client.lastName));
      assert.ok(manifestoText.includes(client.firstName));
      assert.ok(technicalText.includes(client.firstName));
      assert.ok(promptText.includes(client.firstName));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('6. Sürüm arşivi: Yeni sürüm eskileri korur, tasarım silindiğinde analizler korunur', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      let archive = setupFullAnalyses(client);

      // V1 üret
      const resV1 = generateClientRecipe(client, archive, {
        preferredStyle: 'FINE_LINE',
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.ok(resV1.success && resV1.design);
      saveClientDesign(client.id, resV1.design);

      archive = getClientArchive(client.id)!;
      assert.strictEqual(archive.designs.length, 1);
      assert.strictEqual(archive.designs[0].versionNumber, 1);

      // V2 üret
      const resV2 = generateClientRecipe(client, archive, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'SPINE_CENTER',
      });
      assert.ok(resV2.success && resV2.design);
      saveClientDesign(client.id, resV2.design);

      archive = getClientArchive(client.id)!;
      assert.strictEqual(archive.designs.length, 2, 'V1 ve V2 bir arada saklanmalıdır.');
      assert.strictEqual(archive.designs[0].versionNumber, 1);
      assert.strictEqual(archive.designs[1].versionNumber, 2);

      // Tasarımları sıfırla
      clearClientDesigns(client.id);
      archive = getClientArchive(client.id)!;
      assert.strictEqual(archive.designs.length, 0, 'Tasarımlar sıfırlanmalıdır.');
      assert.strictEqual(archive.analyses.length, 1, 'Analizler KESİNLİKLE korunmalıdır.');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('7. Danışan değiştirme izolasyonu: Danışan A verisi Danışan B ye asla taşınmaz', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(clientAData);
    const clientB = createClientRecord(clientBData);

    try {
      const archA = setupFullAnalyses(clientA);
      const resA = generateClientRecipe(clientA, archA, {
        preferredStyle: 'FINE_LINE',
        preferredPlacement: 'FOREARM_INNER',
        primarySymbol: 'A-Özel Sembol',
      });
      if (resA.design) {
        saveClientDesign(clientA.id, resA.design);
      }

      // Danışan B arşivini kontrol et
      const archB = getClientArchive(clientB.id)!;
      assert.strictEqual(archB.analyses.length, 0, 'Danışan B de analiz olmamalıdır.');
      assert.strictEqual(archB.designs.length, 0, 'Danışan B de reçete olmamalıdır.');
      assert.strictEqual(archB.testResults.length, 0, 'Danışan B de test olmamalıdır.');
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  it('8. Yenileme / Kalıcılık: Aktif danışan ve veriler depolamadan doğru geri yüklenir', () => {
    clearAllApplicationData();
    const client = createClientRecord(clientAData);

    try {
      setStoredActiveClientId(client.id);
      assert.strictEqual(getStoredActiveClientId(), client.id);

      const archive = setupFullAnalyses(client);
      assert.strictEqual(archive.analyses.length, 1);

      // Depolamadan tekrar oku
      const reloadedArchive = getClientArchive(client.id);
      assert.strictEqual(reloadedArchive?.client.id, client.id);
      assert.strictEqual(reloadedArchive?.analyses.length, 1);
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
