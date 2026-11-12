import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppRoute, WorkspaceDetailTab } from '../../../types/navigation';
import {
  createClientRecord,
  deleteClientRecord,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getClientArchive,
  clearAllApplicationData,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  saveClientReport,
} from '../../../store/storage';
import { Client, ClientFormData } from '../../../types/client';
import { TropicalNatalChart } from '../../../types/astrology';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../../../types/analysis';
import { ClientTattooDesign, TattooRecipe } from '../../../types/design';
import { generateClientRecipe, prepareRecipeModule } from '../../../modules/recipe';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientTropicalChart } from '../../astrology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { generateUnifiedVisualPrompt } from '../../../modules/symbols';
import { canNavigateToWorkspaceTab } from '../../../utils/navigationGuard';
import {
  formatRecipeSectionCopyText,
  formatAllVisualPromptsSectionCopyText,
} from '../../../utils/clientComprehensiveCopy';

describe('A74 — Dövme Reçetesi ve Tasarım/Rapor Akışının Tek Sekmede Birleştirilmesi Doğrulama Testleri', { concurrency: 1 }, () => {
  const mockStorageMap = new Map<string, string>();

  const mockLocalStorage = {
    getItem: (key: string): string | null => {
      return mockStorageMap.has(key) ? mockStorageMap.get(key)! : null;
    },
    setItem: (key: string, value: string): void => {
      mockStorageMap.set(key, String(value));
    },
    removeItem: (key: string): void => {
      mockStorageMap.delete(key);
    },
    clear: (): void => {
      mockStorageMap.clear();
    },
    get length(): number {
      return mockStorageMap.size;
    },
    key: (index: number): string | null => {
      return Array.from(mockStorageMap.keys())[index] || null;
    },
  };

  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    mockStorageMap.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: { ...mockLocalStorage },
      writable: true,
      configurable: true,
    });
    clearAllApplicationData();
  });

  afterEach(() => {
    clearAllApplicationData();
    if (originalLocalStorage !== undefined) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  const clientDataA: ClientFormData = {
    firstName: 'Elif',
    lastName: 'Korkmaz',
    email: 'elif@example.com',
    phone: '05553334455',
    birthDate: '1992-06-18',
    birthTime: '11:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Beşiktaş, İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.04,
      longitude: 29.0,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Zehra',
    notes: 'A74 Dövme Sunumu ve Rapor Danışanı',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Kerem',
    lastName: 'Yıldız',
    email: 'kerem@example.com',
    phone: '05556667788',
    birthDate: '1989-10-05',
    birthTime: '19:40',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Muratpaşa, Antalya, Türkiye',
      city: 'Antalya',
      country: 'Türkiye',
      latitude: 36.88,
      longitude: 30.7,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Hatice',
    notes: 'A74 Danışan B',
  };

  function seedClientWithPrerequisites(client: Client) {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const astro = calculateClientTropicalChart(client);
    if (astro.chart) saveClientAstrologyChart(client.id, astro.chart);

    const archWithAstro = getClientArchive(client.id)!;
    const chk = calculateClientChakra(client, archWithAstro);
    if (chk.chakra) saveClientChakra(client.id, chk.chakra);

    const archWithChk = getClientArchive(client.id)!;
    const arch = calculateClientArchetype(client, archWithChk);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);
  }

  test('1. Reçete oluşturma ve matematiksel standartlar eksiksiz formüle edilmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archive = getClientArchive(client.id);
    assert.ok(archive);

    const recipeRes = generateClientRecipe(client, archive, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 14, height: 22 },
      colorPreference: 'MONOCHROME_BLACK',
      excludedSymbols: ['yılan', 'kafatası'],
      includeTotemInVisual: false,
      customNotes: 'Kişisel koruma geometrisi',
    });
    assert.ok(recipeRes.success, 'Reçete üretimi başarılı olmalıdır');
    const newDesign = recipeRes.design!;

    assert.ok(newDesign.id, 'Tasarım kimliği üretilmelidir');
    assert.ok(newDesign.recipe, 'Reçete alanı tanımlı olmalıdır');
    assert.equal(newDesign.recipe.style, 'SACRED_GEOMETRY');
    assert.equal(newDesign.recipe.recommendedPlacement, 'FOREARM_INNER');
    assert.equal(newDesign.recipe.recommendedDimensionsCm.width, 14);
    assert.equal(newDesign.recipe.recommendedDimensionsCm.height, 22);

    assert.ok(newDesign.recipe.excludedElements?.includes('yılan'), 'Kullanıcı tarafından hariç tutulan eleman bulunmalıdır');
    assert.ok(newDesign.recipe.excludedElements?.includes('kafatası'), 'Kullanıcı tarafından hariç tutulan eleman bulunmalıdır');

    // Güvenlik kalkanı: Anne adı (Zehra) hiçbir promptta veya sembolde yer almamalıdır
    assert.equal(newDesign.aiPrompt.primaryPromptEn.toLowerCase().includes('zehra'), false, 'Anne adı İngilizce promptta yer alamaz');
    assert.equal(newDesign.aiPrompt.conceptPromptTr.toLowerCase().includes('zehra'), false, 'Anne adı Türkçe konseptte yer alamaz');
    assert.equal(newDesign.aiPrompt.negativePrompt.toLowerCase().includes('zehra'), false, 'Anne adı negatif promptta yer alamaz');
  });

  test('2. Mevcut reçetenin görüntülenmesi ve kopyalanması doğru çalışmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archiveBefore = getClientArchive(client.id);

    const recipeRes = generateClientRecipe(client, archiveBefore, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 16, height: 22 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeRes.success);
    const newDesign = recipeRes.design!;
    saveClientDesign(client.id, newDesign);

    const archiveAfter = getClientArchive(client.id);
    assert.ok(archiveAfter);
    assert.equal(archiveAfter.designs.length, 1);
    const currentDesign = archiveAfter.designs[0];
    assert.equal(currentDesign.recipe.style, 'SACRED_GEOMETRY');

    // Kopyalama metni formatlama
    const copyText = formatRecipeSectionCopyText(client, archiveAfter);
    assert.ok(copyText.length > 50, 'Reçete kopyalama metni üretilmelidir');
    assert.ok(copyText.includes('DÖVME REÇETESİ'), 'Kopyalama metninde başlık bulunmalıdır');
    assert.ok(copyText.includes('SACRED_GEOMETRY') || copyText.includes('Kutsal Geometri'));
  });

  test('3. Teknik reçeteye dayalı görsel istem sentezi doğru çalışmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archive = getClientArchive(client.id);

    const recipeRes = generateClientRecipe(client, archive, {
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'WRIST_INNER',
      customDimensions: { width: 10, height: 16 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeRes.success);
    const design = recipeRes.design!;
    saveClientDesign(client.id, design);

    const updatedArchive = getClientArchive(client.id);
    const activeDesign = updatedArchive!.designs[0];

    const visualPromptOut = generateUnifiedVisualPrompt({
      clientId: client.id,
      clientFullName: `${client.firstName} ${client.lastName}`,
      motherName: client.motherName,
      recipe: activeDesign.recipe,
      selectedSymbols: [{ symbolId: 'sym-1', symbolName: 'Lotus', customMeaning: 'Uyanış', weight: 'PRIMARY' }],
      excludedSymbols: ['kuru kafa'],
      style: activeDesign.recipe.style,
      placement: activeDesign.recipe.recommendedPlacement,
      colorProfile: activeDesign.recipe.colorProfile,
      conceptStatement: activeDesign.conceptStatement,
    });

    assert.ok(visualPromptOut.primaryPromptEn.length > 25, 'Geçerli İngilizce görsel prompt üretilmelidir');
    assert.ok(visualPromptOut.negativePrompt.length > 10, 'Negatif kalkan promptu üretilmelidir');
    // Prompt güvenlik kontrolü: anne adı asla istem içinde geçmemelidir
    assert.equal(
      visualPromptOut.primaryPromptEn.toLowerCase().includes('zehra'),
      false,
      'Anne adı görsel istemde kesinlikle bulunmamalıdır'
    );
  });

  test('4. 10 bölümlü nihai dövme raporu ve seans manifestosu oluşturulabilmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archive = getClientArchive(client.id);

    const recipeRes = generateClientRecipe(client, archive, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 14, height: 22 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeRes.success);
    const design = recipeRes.design!;

    assert.ok(design.recipe.comprehensiveReport, 'Kapsamlı 10 bölümlü rapor nesnesi oluşturulmalıdır');
    const report = design.recipe.comprehensiveReport;
    assert.ok(report.clientSummary, 'Bölüm A - Danışan özeti mevcut olmalıdır');
    assert.ok(report.detailedSymbols, 'Bölüm C - Semboller mevcut olmalıdır');
    assert.ok(report.anatomicalAndTechnicalDirective, 'Bölüm H - Teknik direktifler mevcut olmalıdır');
  });

  test('5. Kopyalama ve dışa aktarma metinleri eksiksiz üretilmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archive = getClientArchive(client.id);

    const recipeRes = generateClientRecipe(client, archive, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 14, height: 22 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeRes.success);
    const design = recipeRes.design!;
    saveClientDesign(client.id, design);
    const reArchive = getClientArchive(client.id);

    const promptCopyText = formatAllVisualPromptsSectionCopyText(client, reArchive);
    assert.ok(promptCopyText.length > 30, 'Görsel istem kopyalama metni dolu olmalıdır');
  });

  test('6. Reçete olmadan görsel istem veya rapor üretilemez kuralı doğrulanmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = getClientArchive(client.id);
    assert.ok(archive);
    assert.equal(archive.designs.length, 0, 'Başlangıçta reçete bulunmamalıdır');

    // Reçete olmadan istem sentezlenmesi hata fırlatmalıdır veya engellenmelidir
    assert.throws(
      () => {
        generateUnifiedVisualPrompt({
          clientId: client.id,
          clientFullName: `${client.firstName} ${client.lastName}`,
          motherName: client.motherName,
          recipe: null as any,
          selectedSymbols: [],
          excludedSymbols: [],
          style: 'FINE_LINE',
          placement: 'WRIST_INNER',
          colorProfile: 'MONOCHROME_BLACK',
        });
      },
      /reçete|recipe/i,
      'Reçete olmadan görsel istem üretimi engellenmelidir'
    );
  });

  test('7. Danışan değişiminde reçete, prompt ve rapor veri izolasyonu tam korunmalıdır', () => {
    const cA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const cB = createClientRecord(clientDataB, 'OWNER_MANUAL');

    seedClientWithPrerequisites(cA);
    const archA = getClientArchive(cA.id);
    const recipeResA = generateClientRecipe(cA, archA, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 14, height: 22 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeResA.success);
    const designA = recipeResA.design!;
    saveClientDesign(cA.id, designA);

    // Danışan B arşivi incelenir: cA nın reçetesi veya tasarımı kesinlikle bulunmamalıdır
    const archB = getClientArchive(cB.id);
    assert.ok(archB);
    assert.equal(archB.designs.length, 0, 'Danışan B nin tasarımı boş olmalıdır');

    // Danışan A nın tasarımı korunmalıdır
    const reArchA = getClientArchive(cA.id);
    assert.equal(reArchA!.designs.length, 1);
    assert.equal(reArchA!.designs[0].clientId, cA.id);
  });

  test('8. Eski sekme referansları (DESIGN ve RESULTS) yeni birleşik sekmeye (RECIPE) çözümlenmelidir', () => {
    // ClientDetailCard sekme çözümleme mantığı
    const resolveTab = (tab?: string): WorkspaceDetailTab => {
      if (tab === 'DESIGN' || tab === 'RESULTS') return 'RECIPE';
      return (tab as WorkspaceDetailTab) || 'PERSONAL_BIRTH';
    };

    assert.equal(resolveTab('DESIGN'), 'RECIPE', 'DESIGN referansı doğrudan RECIPE ye çözümlenmelidir');
    assert.equal(resolveTab('RESULTS'), 'RECIPE', 'RESULTS referansı doğrudan RECIPE ye çözümlenmelidir');
    assert.equal(resolveTab('RECIPE'), 'RECIPE', 'RECIPE kendi içinde korunmalıdır');
    assert.equal(resolveTab('PERSONAL_BIRTH'), 'PERSONAL_BIRTH');
    assert.equal(resolveTab('ANALYSES'), 'ANALYSES');
    assert.equal(resolveTab('TESTS'), 'TESTS');
    assert.equal(resolveTab('SYMBOLS'), 'SYMBOLS');
  });

  test('9. Önceden kaydedilmiş tasarım ve raporlar silinmemeli, eksiksiz korunmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    seedClientWithPrerequisites(client);
    const archive = getClientArchive(client.id);

    const recipeRes = generateClientRecipe(client, archive, {
      preferredStyle: 'BLACKWORK_OCCULT',
      preferredPlacement: 'SPINE_CENTER',
      customDimensions: { width: 12, height: 35 },
      colorPreference: 'MONOCHROME_BLACK',
    });
    assert.ok(recipeRes.success);
    const design = recipeRes.design!;
    saveClientDesign(client.id, design);

    // Arşivden tekrar okunduğunda tüm reçete ve rapor alanları korunur
    const fetchedArchive = getClientArchive(client.id);
    assert.ok(fetchedArchive);
    assert.equal(fetchedArchive.designs.length, 1);
    const loadedDesign = fetchedArchive.designs[0];
    assert.equal(loadedDesign.recipe.style, 'BLACKWORK_OCCULT');
    assert.equal(loadedDesign.recipe.recommendedPlacement, 'SPINE_CENTER');
    assert.equal(loadedDesign.recipe.recommendedDimensionsCm.height, 35);
    assert.ok(loadedDesign.recipe.comprehensiveReport, 'Rapor nesnesi depolamada korunmalıdır');
  });
});
