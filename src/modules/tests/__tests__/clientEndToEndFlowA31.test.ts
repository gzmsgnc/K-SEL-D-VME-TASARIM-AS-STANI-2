import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client, ClientFormData } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getStoredClients,
  getClientArchive,
  getStoredActiveClientId,
  setStoredActiveClientId,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  deleteClientDesign,
  clearClientDesigns,
  saveClientTestResult,
} from '../../../store/storage';
import { generateClientRecipe, prepareRecipeModule } from '../../recipe';
import { generateUnifiedVisualPrompt } from '../../symbols';
import {
  generateClientDossierText,
  generateClientDossierJson,
  getRecipeSummaryText,
  getVisualPromptText,
} from '../../../utils/clientDossierGenerator';
import { evaluateWorkspaceWorkflow } from '../../../utils/workspaceWorkflow';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
} from '../../../utils/tattooDesignFormatters';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { calculateClientTropicalChart } from '../../astrology';
import { runAndBuildEnneagramResult, runAndBuildTotemResult } from '../../tests';

describe('A31: Uygulama Genel Kullanıcı Akışı ve Son İşlem Güvenliği Testleri', () => {
  const sampleLocation = {
    country: 'Türkiye',
    city: 'İzmir',
    placeName: 'İzmir, Konak',
    latitude: 38.4192,
    longitude: 27.1287,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const sampleFormDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz.kaya@example.com',
    phone: '5321112233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Gülseren',
    notes: 'Kişisel dövme konsepti arıyor.',
  };

  const sampleFormDataB: ClientFormData = {
    firstName: 'Cem',
    lastName: 'Demir',
    email: 'cem.demir@example.com',
    phone: '5559998877',
    birthDate: '1989-10-12',
    birthTime: '09:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      ...sampleLocation,
      city: 'Ankara',
      placeName: 'Ankara, Çankaya',
      latitude: 39.9208,
      longitude: 32.8541,
    },
    motherName: 'Zehra',
    notes: 'Geometrik ve minimalist tarz.',
  };

  // Yardımcı fonksiyon: Danışan için zorunlu analizleri (Numeroloji, Çakra, Arketip) hesaplar ve arşivi döndürür
  function setupClientWithAnalyses(client: Client): ClientArchiveRecord {
    // 1. Numeroloji hesapla ve kaydet
    const numRes = calculateClientNumerology(client);
    assert.ok(numRes.success && numRes.numerology);
    saveClientNumerology(client.id, numRes.numerology);

    // 2. Çakra hesapla (kayıtlı numerolojiyi içeren arşiv ile) ve kaydet
    const archWithNum = getClientArchive(client.id);
    const chRes = calculateClientChakra(client, archWithNum);
    assert.ok(chRes.success && chRes.chakra);
    saveClientChakra(client.id, chRes.chakra);

    // 3. Arketip hesapla (kayıtlı numeroloji + çakra içeren arşiv ile) ve kaydet
    const archWithChakra = getClientArchive(client.id);
    const archRes = calculateClientArchetype(client, archWithChakra);
    assert.ok(archRes.success && archRes.archetype);
    saveClientArchetype(client.id, archRes.archetype);

    return getClientArchive(client.id)!;
  }

  // 1. Yeni danışan oluşturma → aktif danışan seçimi
  it('1. Yeni danışan oluşturma → aktif danışan seçimi', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      assert.ok(clientA.id, 'Danışan benzersiz bir kimliğe sahip olmalıdır');
      setStoredActiveClientId(clientA.id);

      const activeId = getStoredActiveClientId();
      assert.strictEqual(activeId, clientA.id, 'Aktif danışan kimliği storage içinde kaydedilmeli ve okunmalıdır');

      const archive = getClientArchive(clientA.id);
      assert.ok(archive, 'Yeni danışanın arşivi oluşturulmuş olmalıdır');
      assert.strictEqual(archive.client.firstName, 'Deniz');
      assert.strictEqual(archive.designs.length, 0, 'Başlangıçta tasarım bulunmamalıdır');
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 2. Aktif danışan → analizler → testler → tasarım akışının doğru clientId ile ilerlemesi
  it('2. Aktif danışan → analizler → testler → tasarım akışının doğru clientId ile ilerlemesi', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      // 1. Astroloji
      const astroRes = calculateClientTropicalChart(clientA);
      assert.ok(astroRes.success && astroRes.chart, 'Astroloji hesaplanabilmelidir');
      saveClientAstrologyChart(clientA.id, astroRes.chart);

      // 2, 3, 4. Numeroloji, Çakra, Arketip
      const archiveWithAnalyses = setupClientWithAnalyses(clientA);

      // 5. Enneagram
      const mockEnneagramAnswers: Record<string, string> = {};
      for (let i = 1; i <= 15; i++) mockEnneagramAnswers[`en_q${i}`] = `en_q${i}_o1`;
      const enneagramResult = runAndBuildEnneagramResult(clientA, archiveWithAnalyses, mockEnneagramAnswers);
      saveClientTestResult(clientA.id, enneagramResult);

      // 6. Totem
      const mockTotemAnswers: Record<string, string> = {};
      for (let i = 1; i <= 10; i++) mockTotemAnswers[`tot_q${i}`] = `tot_q${i}_o1`;
      const totemResult = runAndBuildTotemResult(clientA, archiveWithAnalyses, mockTotemAnswers);
      saveClientTestResult(clientA.id, totemResult);

      const fullArchive = getClientArchive(clientA.id);
      assert.ok(fullArchive);
      assert.strictEqual(fullArchive.analyses.length, 1);
      assert.strictEqual(fullArchive.testResults.length, 2);

      // 7. Tasarım ve Reçete Üretimi
      const recipeRes = generateClientRecipe(clientA, fullArchive, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 10, height: 15 },
        colorPreference: 'MONOCHROME_BLACK',
      });
      assert.ok(recipeRes.success && recipeRes.design, 'Reçete başarıyla üretilmelidir');
      assert.strictEqual(recipeRes.design.clientId, clientA.id, 'Tasarım doğru clientId taşımalıdır');

      saveClientDesign(clientA.id, recipeRes.design);

      const updatedArchive = getClientArchive(clientA.id);
      assert.strictEqual(updatedArchive?.designs.length, 1);
      assert.strictEqual(updatedArchive?.designs[0].clientId, clientA.id);
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 3. Eksik ön koşulda sonraki aşamanın engellenmesi
  it('3. Eksik ön koşulda sonraki aşamanın engellenmesi', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const emptyArchive = getClientArchive(clientA.id);

      // Reçete hazırlığı kontrolü
      const recipePrep = prepareRecipeModule(clientA, emptyArchive);
      assert.strictEqual(recipePrep.status, 'INPUTS_MISSING', 'Girdi eksik olmalıdır');
      assert.ok(recipePrep.warningNotices.length > 0, 'Açık Türkçe uyarı bildirimi verilmelidir');

      // Reçete motoru çağrıldığında başarısız olmalı ve açık Türkçe hata döndürmelidir
      const res = generateClientRecipe(clientA, emptyArchive, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.strictEqual(res.success, false, 'Eksik ön koşulda reçete üretilmemelidir');
      assert.ok(res.errorMessageTr, 'Hata mesajı Türkçe olmalıdır');

      // Workflow değerlendirmesinde de eksik durum doğru yansıtılmalı
      const workflow = evaluateWorkspaceWorkflow(clientA, emptyArchive);
      const recipeStep = workflow?.steps.find((s) => s.id === 'TATTOO_RECIPE');
      assert.strictEqual(recipeStep?.status, 'MISSING');
      assert.ok(recipeStep?.guidanceMessageTr?.includes('analiz'));
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 4. Reçetesiz görsel istem üretilememesi
  it('4. Reçetesiz görsel istem üretilememesi', () => {
    // Reçete olmaksızın generateUnifiedVisualPrompt çağrılırsa hata fırlatmalı veya engellenmeli
    assert.throws(
      () => {
        generateUnifiedVisualPrompt({
          clientId: 'CLI-A31-NO-RECIPE',
          clientFullName: 'Deniz Kaya',
          motherName: 'Gülseren',
          recipe: null as any,
          selectedSymbols: [],
          recommendedSymbols: [],
          excludedSymbols: [],
          style: 'SACRED_GEOMETRY',
          placement: 'FOREARM_INNER',
          colorProfile: 'MONOCHROME_BLACK',
        });
      },
      (err: any) => {
        return err instanceof Error && err.message.length > 0;
      },
      'Reçete yokken görsel istem üretimi engellenmelidir'
    );
  });

  // 5. Aktif danışan değişiminde hiçbir verinin sızmaması
  it('5. Aktif danışan değişiminde hiçbir verinin sızmaması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(sampleFormDataB, 'OWNER_MANUAL');

    try {
      // Client A'ya analiz ve tasarım ekle
      const archA = setupClientWithAnalyses(clientA);
      const recipeRes = generateClientRecipe(clientA, archA, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.ok(recipeRes.success && recipeRes.design);
      saveClientDesign(clientA.id, recipeRes.design);

      // Aktif danışanı B yap
      setStoredActiveClientId(clientB.id);
      const archB = getClientArchive(clientB.id);

      assert.ok(archB);
      assert.strictEqual(archB.analyses.length, 0, 'Client B nin analizleri boş olmalıdır');
      assert.strictEqual(archB.designs.length, 0, 'Client B nin tasarımları boş olmalıdır');
      assert.strictEqual(archB.testResults.length, 0, 'Client B nin testleri boş olmalıdır');

      // Client A verilerini tekrar oku, bozulmamış olmalı
      const reArchA = getClientArchive(clientA.id);
      assert.strictEqual(reArchA?.designs.length, 1, 'Client A nın tasarımı korunmalıdır');
      assert.strictEqual(reArchA?.designs[0].clientId, clientA.id);
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 6. Sayfa yenileme sonrası aktif danışanın korunması
  it('6. Sayfa yenileme sonrası aktif danışanın korunması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      setStoredActiveClientId(clientA.id);
      const readId = getStoredActiveClientId();
      assert.strictEqual(readId, clientA.id, 'Aktif danışan kimliği storage içinde saklanmalı');

      const allClients = getStoredClients();
      const matched = allClients.find((c) => c.id === readId);
      assert.ok(matched, 'Kayıtlı danışanlar listesinde aktif danışan bulunmalıdır');
      assert.strictEqual(matched.firstName, 'Deniz');
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 7. Geçmiş tasarım sürümünün salt okunur kalması
  it('7. Geçmiş tasarım sürümünün salt okunur kalması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      let arch = setupClientWithAnalyses(clientA);

      // V1 üret
      const resV1 = generateClientRecipe(clientA, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.ok(resV1.success && resV1.design);
      saveClientDesign(clientA.id, resV1.design);

      // V2 üret
      arch = getClientArchive(clientA.id)!;
      const resV2 = generateClientRecipe(clientA, arch, {
        preferredStyle: 'DOTWORK_WHIPSHADING',
        preferredPlacement: 'UPPER_ARM_BICEP',
      });
      assert.ok(resV2.success && resV2.design);
      saveClientDesign(clientA.id, resV2.design);

      const latestArch = getClientArchive(clientA.id);
      assert.strictEqual(latestArch?.designs.length, 2);

      const v1Design = latestArch?.designs.find((d) => d.versionNumber === 1);
      const v2Design = latestArch?.designs.find((d) => d.versionNumber === 2);

      assert.ok(v1Design && v2Design);
      assert.strictEqual(v1Design.recipe.style, 'SACRED_GEOMETRY');
      assert.strictEqual(v2Design.recipe.style, 'DOTWORK_WHIPSHADING');

      // V1 geçmiş sürüm olarak incelenirken V2 etkilenmemelidir
      assert.notStrictEqual(v1Design.id, v2Design.id);
      assert.strictEqual(v1Design.versionNumber, 1);
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 8. Yeni tasarım sürümünün eski sürümleri koruması
  it('8. Yeni tasarım sürümünün eski sürümleri koruması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      let arch = setupClientWithAnalyses(clientA);
      const d1 = generateClientRecipe(clientA, arch, { preferredStyle: 'SACRED_GEOMETRY', preferredPlacement: 'FOREARM_INNER' }).design!;
      saveClientDesign(clientA.id, d1);

      arch = getClientArchive(clientA.id)!;
      const d2 = generateClientRecipe(clientA, arch, { preferredStyle: 'FINE_LINE', preferredPlacement: 'WRIST_INNER' }).design!;
      saveClientDesign(clientA.id, d2);

      arch = getClientArchive(clientA.id)!;
      const d3 = generateClientRecipe(clientA, arch, { preferredStyle: 'ETCHING_ENGRAVING', preferredPlacement: 'SHOULDER_BLADE' }).design!;
      saveClientDesign(clientA.id, d3);

      const finalArch = getClientArchive(clientA.id);
      assert.strictEqual(finalArch?.designs.length, 3, 'Tüm 3 sürüm arşivde korunmalıdır');
      assert.deepStrictEqual(finalArch?.designs.map((d) => d.versionNumber), [1, 2, 3]);
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 9. Tasarım silindiğinde analizlerin korunması
  it('9. Tasarım silindiğinde analizlerin korunması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const arch = setupClientWithAnalyses(clientA);
      const d1 = generateClientRecipe(clientA, arch, { preferredStyle: 'SACRED_GEOMETRY', preferredPlacement: 'FOREARM_INNER' }).design!;
      saveClientDesign(clientA.id, d1);

      // Tasarımı sil (tekil veya tümünü temizle)
      clearClientDesigns(clientA.id);

      const updatedArch = getClientArchive(clientA.id);
      assert.strictEqual(updatedArch?.designs.length, 0, 'Tasarımlar silinmiş olmalıdır');
      assert.strictEqual(updatedArch?.analyses.length, 1, 'Analiz kaydı korunmalıdır');
      assert.ok(updatedArch?.analyses[0].numerology, 'Numeroloji analizi korunmalıdır');
      assert.ok(updatedArch?.analyses[0].chakra, 'Çakra analizi korunmalıdır');
      assert.ok(updatedArch?.analyses[0].archetype, 'Arketip analizi korunmalıdır');
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 10. Bölüm bazlı kopyalamanın doğru danışana ait olması
  it('10. Bölüm bazlı kopyalamanın doğru danışana ait olması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const arch = setupClientWithAnalyses(clientA);
      const d1 = generateClientRecipe(clientA, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        excludedSymbols: ['yılan', 'kurukafa'],
      }).design!;

      const recipeText = formatTattooRecipeText(clientA, d1);
      const conceptText = formatConceptManifestoText(clientA, d1);
      const adviceText = formatTechnicalAdviceText(clientA, d1);
      const promptText = formatVisualPromptText(clientA, d1);
      const negPromptText = formatNegativePromptText(clientA, d1);
      const packageText = formatFullDesignPackageText(clientA, d1);

      // Danışan kimliği ve adı doğrulaması
      assert.ok(recipeText.includes(clientA.firstName));
      assert.ok(recipeText.includes(clientA.id));
      assert.ok(conceptText.includes(clientA.firstName));
      assert.ok(adviceText.includes(clientA.firstName));
      assert.ok(promptText.includes('geometric') || promptText.includes('geometry'));
      assert.ok(negPromptText.includes('yılan') || negPromptText.includes('kurukafa'));
      assert.ok(packageText.includes(clientA.firstName) && packageText.includes(clientA.id));
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 11. Danışan dosyası dışa aktarımının doğru clientId kullanması
  it('11. Danışan dosyası dışa aktarımının doğru clientId kullanması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const numRes = calculateClientNumerology(clientA);
      if (numRes.numerology) saveClientNumerology(clientA.id, numRes.numerology);

      const arch = getClientArchive(clientA.id);
      const dossierText = generateClientDossierText(clientA, arch);
      const dossierJson = generateClientDossierJson(clientA, arch) as any;

      assert.ok(dossierText.includes(clientA.id), 'Metin dosyasında clientId bulunmalı');
      assert.ok(dossierText.includes(clientA.firstName), 'Metin dosyasında ad bulunmalı');
      assert.strictEqual(dossierJson.client.id, clientA.id, 'JSON dosyasında doğru clientId bulunmalı');
      assert.strictEqual(dossierJson.client.firstName, 'Deniz');
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 12. Eksik veride sahte/default sonuç üretilmemesi
  it('12. Eksik veride sahte/default sonuç üretilmemesi', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const emptyArch = getClientArchive(clientA.id);

      const recipeSummary = getRecipeSummaryText(clientA, emptyArch);
      assert.strictEqual(recipeSummary, 'Bu danışana ait kayıtlı dövme reçetesi bulunmuyor.');

      const promptSummary = getVisualPromptText(clientA, emptyArch);
      assert.strictEqual(promptSummary, 'Bu danışana ait kayıtlı görsel istem bulunmuyor.');

      const dossier = generateClientDossierText(clientA, emptyArch);
      assert.ok(dossier.includes('Kayıt bulunmuyor. (Astroloji analizi henüz çalıştırılmadı)'));
      assert.ok(dossier.includes('Kayıt bulunmuyor. (Numeroloji analizi henüz çalıştırılmadı)'));
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 13. Aynı kayıtla tekrar çalıştırıldığında sonuçların değişmemesi (Determinizm)
  it('13. Aynı kayıtla tekrar çalıştırıldığında sonuçların değişmemesi', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const arch = setupClientWithAnalyses(clientA);

      const run1 = generateClientRecipe(clientA, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 12, height: 18 },
        colorPreference: 'MONOCHROME_BLACK',
      });

      const run2 = generateClientRecipe(clientA, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 12, height: 18 },
        colorPreference: 'MONOCHROME_BLACK',
      });

      assert.strictEqual(run1.design?.recipe.primarySymbol, run2.design?.recipe.primarySymbol);
      assert.deepStrictEqual(run1.design?.recipe.secondarySymbols, run2.design?.recipe.secondarySymbols);
      assert.strictEqual(run1.design?.recipe.style, run2.design?.recipe.style);
      assert.strictEqual(run1.design?.recipe.recommendedPlacement, run2.design?.recipe.recommendedPlacement);
      assert.strictEqual(run1.design?.aiPrompt?.primaryPromptEn, run2.design?.aiPrompt?.primaryPromptEn);
    } finally {
      deleteClientRecord(clientA.id);
    }
  });

  // 14. Dar ekran çalışma alanı geçişlerinin mevcut bileşenlerle uyumlu olması
  it('14. Dar ekran çalışma alanı geçişlerinin mevcut bileşenlerle uyumlu olması', () => {
    const clientA = createClientRecord(sampleFormDataA, 'OWNER_MANUAL');
    try {
      const arch = getClientArchive(clientA.id);
      const workflow = evaluateWorkspaceWorkflow(clientA, arch);
      assert.ok(workflow, 'İş akışı değerlendirmesi yapılabilmelidir');
      assert.strictEqual(workflow.steps.length, 8, '8 aşamalı iş akışı tam olmalıdır');

      // Her aşama tıklanabilir olmalı ve geçerli bir hedef sekmeye işaret etmelidir
      workflow.steps.forEach((step) => {
        assert.ok(step.isClickable);
        assert.ok(step.targetTab);
        assert.ok(step.title);
        assert.ok(step.statusLabelTr);
      });
    } finally {
      deleteClientRecord(clientA.id);
    }
  });
});
