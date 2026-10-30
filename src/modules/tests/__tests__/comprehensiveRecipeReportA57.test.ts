import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { generateClientRecipe } from '../../recipe/recipeEngineAdapter';
import { runClientAutoAnalysisChain } from '../../pipeline/clientAnalysisPipeline';
import { getClientArchive, getStoredClients, setSafeStorage, STORAGE_KEYS } from '../../../store/storage';
import { formatTattooRecipeText, formatFullDesignPackageText, formatSymbolCompositionText } from '../../../utils/tattooDesignFormatters';
import { generateClientDossierText } from '../../../utils/clientDossierGenerator';
import { formatRecipeSectionCopyText } from '../../../utils/clientComprehensiveCopy';

describe('A57 — Kapsamlı Tasarım Raporu ve Dövme Reçetesi Doğrulama Testleri', () => {
  const gizemClient: Client = {
    id: 'client_gizem_selma_genc_a57',
    firstName: 'Gizem Selma',
    lastName: 'Genç',
    email: 'gizem@example.com',
    phone: '05551112233',
    birthDate: '1991-11-24',
    birthTime: '03:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Fatih',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.0182,
      longitude: 28.9439,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Songül',
    notes: 'A57 test profili',
    createdAt: '2026-03-30T10:00:00.000Z',
    updatedAt: '2026-03-30T10:00:00.000Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  function registerAndAnalyzeClient(client: Client): ClientArchiveRecord {
    const clients = getStoredClients();
    setSafeStorage(STORAGE_KEYS.CLIENTS, [client, ...clients.filter((c) => c.id !== client.id)]);
    runClientAutoAnalysisChain(client);
    const arch = getClientArchive(client.id);
    assert.ok(arch, `Arşiv bulunamadı: ${client.id}`);
    return arch;
  }

  const baseArchive = registerAndAnalyzeClient(gizemClient);

  function getDesign(client: Client, archive: ClientArchiveRecord, options?: any) {
    const res = generateClientRecipe(client, archive, options);
    assert.ok(res.success && res.design, `Reçete üretilemedi: ${res.errorMessageTr}`);
    return res.design;
  }

  it('1. Her sembol (birincil ve ikincil) için 7 zorunlu sorunun tamamı yanıtlanmalıdır', () => {
    const design = getDesign(gizemClient, baseArchive, {
      style: 'FINE_LINE',
      placement: 'FOREARM_INNER',
    });

    const report = design.recipe.comprehensiveReport;
    assert.ok(report, 'comprehensiveReport üretilmiş olmalıdır');
    assert.ok(report.sectionC.symbols.length >= 2, 'En az birincil ve ikincil sembol bulunmalıdır');

    for (const sym of report.sectionC.symbols) {
      assert.ok(sym.symbolName && sym.symbolName.trim().length > 0, '1. Sembolün Adı boş olamaz');
      assert.ok(sym.originAnalysis && sym.originValue, '2. Hangi analizden/değerden geldiği belirtilmelidir');
      assert.ok(sym.personalTheme && sym.personalTheme.trim().length > 0, '3. Danışanın kişisel teması belirtilmelidir');
      assert.ok(sym.compositionRole && sym.compositionRole.trim().length > 0, '4. Kompozisyondaki rolü belirtilmelidir');
      assert.ok(sym.relatedSymbol && sym.relatedSymbol.trim().length > 0, '5. Hangi sembolle ilişkilendirildiği belirtilmelidir');
      assert.ok(sym.visualExecution && sym.visualExecution.trim().length > 0, '6. Görsel olarak nasıl işleneceği belirtilmelidir');
      assert.ok(sym.meaningRiskIfRemoved && sym.meaningRiskIfRemoved.trim().length > 0, '7. Katman kaybında ne kaybedeceği belirtilmelidir');
    }
  });

  it('2. Ekran metni, kopyalama fonksiyonu ve dosya dışa aktarımı %100 senkronize olmalıdır', () => {
    const design = getDesign(gizemClient, baseArchive);
    const archiveWithDesign: ClientArchiveRecord = {
      ...baseArchive,
      designs: [design],
    };

    const recipeCopyText = formatTattooRecipeText(gizemClient, design);
    const sectionCopyText = formatRecipeSectionCopyText(gizemClient, archiveWithDesign, design);
    const dossierText = generateClientDossierText(gizemClient, archiveWithDesign);
    const fullPackageText = formatFullDesignPackageText(gizemClient, design);

    // Bütünsel kopyalama zinciri eşleşmesi
    assert.strictEqual(recipeCopyText, sectionCopyText, 'Kart 4 kopyalama ile genel kopyalama metni birebir aynı olmalıdır');
    assert.ok(dossierText.includes(design.recipe.comprehensiveReport!.sectionA.title), 'Danışan dosyası kapsamlı rapor başlığını içermelidir');
    assert.ok(fullPackageText.includes(recipeCopyText), 'Tüm paket metni kapsamlı rapor metnini içermelidir');
    assert.ok(fullPackageText.includes('[A. DANIŞAN VE REÇETE ÖZETİ]'), 'Bölüm A bulunmalıdır');
    assert.ok(fullPackageText.includes('[J. TEKNİK GÖRSEL ÜRETİM İSTEMİ (AI PROMPTS)]'), 'Bölüm J bulunmalıdır');
  });

  it('3. Totem çözüldüğünde includeTotemInVisual=false ise raporda yer almalı fakat görsel istemden hariç tutulmalıdır', () => {
    const archiveWithTotem: ClientArchiveRecord = {
      ...baseArchive,
      testResults: [
        {
          id: 'totem_1',
          clientId: gizemClient.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          primaryType: 'Kurt (Wolf)',
          secondaryType: 'Kartal (Eagle)',
          completedAt: new Date().toISOString(),
          answers: [],
          dominantScores: { 'Kurt (Wolf)': 12, 'Kartal (Eagle)': 9 },
          interpretations: [],
        },
      ],
    };

    const designExcluded = getDesign(gizemClient, archiveWithTotem, {
      includeTotemInVisual: false,
    });

    const report = designExcluded.recipe.comprehensiveReport!;
    assert.strictEqual(report.sectionF.hasTotemAnalysis, true);
    assert.strictEqual(report.sectionF.includeTotemInVisual, false);
    assert.ok(report.sectionF.primaryTotemTr?.includes('Kurt'));
    assert.ok(report.sectionF.integrationNoteTr.includes('hariç tutulmuştur'));

    // Görsel promptta hayvan totem adı geçmemelidir
    const promptEn = designExcluded.aiPrompt.primaryPromptEn.toLowerCase();
    assert.ok(!promptEn.includes('wolf'), 'includeTotemInVisual=false iken prompt wolf içermemelidir');

    // Şimdi includeTotemInVisual=true durumunu test et
    const designIncluded = getDesign(gizemClient, archiveWithTotem, {
      includeTotemInVisual: true,
    });
    const reportInc = designIncluded.recipe.comprehensiveReport!;
    assert.strictEqual(reportInc.sectionF.includeTotemInVisual, true);
    assert.ok(reportInc.sectionF.integrationNoteTr.includes('geometrik'));
    const promptIncEn = designIncluded.aiPrompt.primaryPromptEn.toLowerCase();
    assert.ok(promptIncEn.includes('wolf') || promptIncEn.includes('spirit animal'), 'includeTotemInVisual=true iken prompt soyut silüeti içermelidir');
  });

  it('4. Totem çözülmediğinde raporda açıkça eksik belirtilmeli, sahte totem uydurulmamalıdır', () => {
    const designNoTotem = getDesign(gizemClient, baseArchive);
    const report = designNoTotem.recipe.comprehensiveReport!;

    assert.strictEqual(report.sectionF.hasTotemAnalysis, false);
    assert.strictEqual(report.sectionF.primaryTotemTr, undefined);
    assert.ok(report.sectionF.integrationNoteTr.includes('tamamlanmadı'));
    assert.ok(report.sectionA.missingModules.includes('Şamanik Hayvan Totemi'));
  });

  it('5. Gölge arketip adı raporda, reçetede ve manifestoda tek ve tutarlı olmalıdır', () => {
    const design = getDesign(gizemClient, baseArchive);
    const report = design.recipe.comprehensiveReport!;

    const expectedShadow = 'Bastırılmış Tutku / Bağımlı Aşık';
    assert.strictEqual(report.sectionE.shadowArchetypeNameTr, expectedShadow);
    assert.ok(design.recipe.shadowTransformationTheme?.includes(expectedShadow), 'Gölge arketip reçetede yer almalıdır');
    assert.ok(report.sectionE.transformationNarrativeTr.length > 20, 'Dönüşüm anlatısı zengin ve şefkatli olmalıdır');
    assert.ok(report.sectionE.transformationSymbolTr.length > 0, 'Dönüşüm sembolü bulunmalıdır');
  });

  it('6. Görsel üretim istemi teknik ve temiz olmalı; anne adı, yükselen, Placidus ve Vedik içermemelidir', () => {
    const design = getDesign(gizemClient, baseArchive);
    const repJ = design.recipe.comprehensiveReport!.sectionJ;
    const promptEn = repJ.primaryPromptEn.toLowerCase();
    const promptTr = design.aiPrompt.conceptPromptTr.toLowerCase();
    const title = design.title.toLowerCase();
    const manifesto = design.conceptStatement.toLowerCase();

    // Anne adı Songül asla yer almamalıdır (yalnızca negatif filtre hariç)
    assert.ok(!promptEn.includes('songül') && !promptEn.includes('songul'), 'Prompt anne adı içermemelidir');
    assert.ok(!promptTr.includes('songül'), 'Türkçe konsept anne adı içermemelidir');
    assert.ok(!title.includes('songül'), 'Başlık anne adı içermemelidir');
    assert.ok(!manifesto.includes('songül'), 'Manifesto anne adı içermemelidir');

    // Yasaklı astroloji terimleri bulunmamalıdır
    const forbiddenTerms = ['ascendant', 'yükselen', 'placidus', 'mc ', 'midheaven', 'house system', 'vedic', 'sidereal'];
    for (const term of forbiddenTerms) {
      assert.ok(!promptEn.includes(term), `Prompt '${term}' içermemelidir`);
      assert.ok(!promptTr.includes(term), `Türkçe konsept '${term}' içermemelidir`);
    }
  });

  it('7. Danışanın özel ölçüleri korunmalı; asgari sınır (16x10 cm) altına inilirse uyarı verilmelidir', () => {
    // Normal ölçü (22x14 cm)
    const normalDesign = getDesign(gizemClient, baseArchive, {
      customDimensions: { width: 22, height: 14 },
    });
    assert.strictEqual(normalDesign.recipe.comprehensiveReport!.sectionA.dimensionWarningTr, undefined);
    assert.strictEqual(normalDesign.recipe.recommendedDimensionsCm.width, 22);
    assert.strictEqual(normalDesign.recipe.recommendedDimensionsCm.height, 14);

    // Asgari altı ölçü (8x5 cm)
    const smallDesign = getDesign(gizemClient, baseArchive, {
      customDimensions: { width: 8, height: 5 },
    });
    assert.strictEqual(smallDesign.recipe.recommendedDimensionsCm.width, 8);
    assert.strictEqual(smallDesign.recipe.recommendedDimensionsCm.height, 5);
    const warning = smallDesign.recipe.comprehensiveReport!.sectionA.dimensionWarningTr;
    assert.ok(warning, 'Asgari altı ölçü için uyarı üretilmelidir');
    assert.ok(
      warning.includes('16 x 10 cm') || warning.includes('16 × 10 cm'),
      'Uyarı asgari 16 x 10 cm sınırını belirtmelidir'
    );
  });

  it('8. Danışan izolasyonu: Danışan A verisi Danışan B reçetesine asla sızmamalıdır', () => {
    const clientB: Client = {
      id: 'client_mert_demir_a57',
      firstName: 'Mert',
      lastName: 'Demir',
      email: 'mert@example.com',
      phone: '05559998877',
      birthDate: '1988-03-15',
      birthTime: '14:20',
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
      motherName: 'Fatma',
      notes: 'Danışan B',
      createdAt: '2026-03-30T10:00:00.000Z',
      updatedAt: '2026-03-30T10:00:00.000Z',
      source: 'CLIENT_FORM',
      status: 'ACTIVE',
    };

    const archiveB = registerAndAnalyzeClient(clientB);

    const designB = getDesign(clientB, archiveB);
    const reportB = designB.recipe.comprehensiveReport!;

    assert.strictEqual(reportB.sectionA.clientId, clientB.id);
    assert.ok(reportB.sectionA.clientSummary.includes('Mert Demir'));
    assert.ok(!reportB.sectionA.clientSummary.includes('Gizem'));
    assert.ok(!reportB.sectionA.clientSummary.includes('Songül'));
  });

  it('9. Çakra bölümünde tıbbi olmayan bildirim ve ≤4 kuralı gerekçesi yer almalıdır', () => {
    const design = getDesign(gizemClient, baseArchive);
    const repD = design.recipe.comprehensiveReport!.sectionD;

    assert.ok(repD.selectedChakras.length <= 4, 'En fazla 4 destek çakrası seçilmelidir');
    assert.ok(!repD.selectedChakras.includes('4. Kalp Çakrası (Anahata) - Güçlü/Baskın'), 'Baskın çakra destek listesine girmemelidir');
    assert.ok(repD.nonMedicalDisclaimerTr.includes('tıbbi veya psikolojik bir teşhis'), 'Tıbbi olmayan feragatname bulunmalıdır');
    assert.ok(repD.rationaleTr.includes('düşük puanlı') || repD.rationaleTr.includes('blokaj'), 'Seçim gerekçesi açıklanmalıdır');
  });

  it('10. Sembol kompozisyonu metninde tüm sembollerin 7 kriteri listelenmelidir', () => {
    const design = getDesign(gizemClient, baseArchive);
    const symbolText = formatSymbolCompositionText(gizemClient, design);

    assert.ok(symbolText.includes('[HER SEMBOL İÇİN AYRINTILI GEREKÇE (7 KRİTER)]'));
    assert.ok(symbolText.includes('1. Sembolün Adı:'));
    assert.ok(symbolText.includes('2. Hangi Analizden / Değerden Geldiği:'));
    assert.ok(symbolText.includes('3. Danışanın Hangi Kişisel Temasını Temsil Ettiği:'));
    assert.ok(symbolText.includes('4. Kompozisyondaki Rolü:'));
    assert.ok(symbolText.includes('5. Hangi Sembolle İlişkilendirildiği:'));
    assert.ok(symbolText.includes('6. Görsel Olarak Nasıl İşleneceği:'));
    assert.ok(symbolText.includes('7. Bu Katman Olmazsa Tasarımın Ne Kaybedeceği:'));
  });
});
