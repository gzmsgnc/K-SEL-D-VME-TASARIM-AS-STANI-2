import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client, ClientFormData } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientAstrologyChart,
  saveClientChakra,
  saveClientArchetype,
  saveClientTestResult,
  clearClientTestResult,
  saveClientDesign,
} from '../../../store/storage';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientTropicalChart } from '../../astrology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { generateClientRecipe } from '../../recipe';
import {
  formatTattooRecipeText,
  formatFullDesignPackageText,
} from '../../../utils/tattooDesignFormatters';
import { generateClientDossierText } from '../../../utils/clientDossierGenerator';
import {
  formatFullClientAnalysisCopyText,
  formatRecipeSectionCopyText,
} from '../../../utils/clientComprehensiveCopy';

describe('A59 — Reçete Kalite Düzeltmesi ve Son Tutarlılık Denetim Testleri', () => {
  const sampleLocation = {
    placeName: 'İstanbul, Fatih',
    city: 'İstanbul',
    country: 'Türkiye',
    latitude: 41.0182,
    longitude: 28.9439,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const clientGizemData: ClientFormData = {
    firstName: 'Gizem Selma',
    lastName: 'Genç',
    email: 'gizem.genc.a59@example.com',
    phone: '05551234567',
    birthDate: '1991-11-24',
    birthTime: '03:15',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Songül',
    notes: 'A59 kalite ve tutarlılık profili',
  };

  function setupFullArchive(client: Client): ClientArchiveRecord {
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

    return getClientArchive(client.id)!;
  }

  // 1. Totem Görsel İzolasyonu (includeTotemInVisual=false)
  it('1. includeTotemInVisual=false iken hayvan figürü promptta yer almaz ve negatif alan iması yapılmaz', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const totemResult = {
        id: 'totem_gizem_a59',
        clientId: client.id,
        testType: 'ANIMAL_TOTEM' as const,
        version: 1,
        primaryType: 'Baykuş (Owl)',
        secondaryType: 'Geyik (Deer)',
        completedAt: new Date().toISOString(),
        answers: [],
        dominantScores: { 'Baykuş (Owl)': 12, 'Geyik (Deer)': 9 },
        interpretations: [],
      };
      saveClientTestResult(client.id, totemResult as any);

      const archWithTotem = getClientArchive(client.id)!;
      const res = generateClientRecipe(client, archWithTotem, {
        includeTotemInVisual: false,
      });
      assert.ok(res.success && res.design);
      const rep = res.design.recipe.comprehensiveReport!;

      // Prompt ve ikincil sembol kontrolü
      const promptEn = res.design.aiPrompt.primaryPromptEn.toLowerCase();
      assert.ok(!promptEn.includes('owl'), 'Görsel promptta Owl yer almamalıdır');
      assert.ok(!promptEn.includes('deer'), 'Görsel promptta Deer yer almamalıdır');
      assert.ok(!promptEn.includes('baykuş'), 'Görsel promptta Baykuş yer almamalıdır');
      assert.ok(!promptEn.includes('geyik'), 'Görsel promptta Geyik yer almamalıdır');

      // Bölüm F kontrolü
      assert.strictEqual(rep.sectionF.includeTotemInVisual, false);
      assert.ok(
        rep.sectionF.symbolicGuidanceTr.includes('Felsefi ve analitik rehberlik'),
        'Rehberlik metni felsefi rehberlik olarak etiketlenmelidir'
      );
      assert.ok(
        !rep.sectionF.symbolicGuidanceTr.includes('konturlarla ima edilir'),
        'includeTotemInVisual=false iken konturlarla ima önerilmemelidir'
      );
      assert.ok(
        rep.sectionF.integrationNoteTr.includes('görsel tasarımdan ve negatif alandan hariç tutulmuştur'),
        'Negatif alandan da hariç tutulduğu açıkça belirtilmelidir'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 2. Ölçü Standardı Tutarlılığı
  it('2. İç ön kol varsayılanı (14x22 cm), İdeal (22x14 cm) ve Asgari (16x10 cm) etiketleri tutarlı olmalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);
      const rep = res.design.recipe.comprehensiveReport!;

      // Section A ve Section H ebat kontrolü
      assert.strictEqual(rep.sectionA.recommendedDimensions, '14 cm Genişlik × 22 cm Yükseklik');
      assert.ok(
        rep.sectionH.recommendedDimensionsTr.includes('14 cm Genişlik × 22 cm Yükseklik'),
        'Bölüm H genişlik ve yükseklik sırasını doğru göstermelidir'
      );
      assert.ok(
        rep.sectionH.recommendedDimensionsTr.includes('İdeal: 22 cm Yükseklik × 14 cm Genişlik'),
        'İdeal ölçü 22 cm Yükseklik × 14 cm Genişlik olarak etiketlenmelidir'
      );
      assert.ok(
        rep.sectionH.recommendedDimensionsTr.includes('Asgari: 16 cm Yükseklik × 10 cm Genişlik'),
        'Asgari ölçü 16 cm Yükseklik × 10 cm Genişlik olarak etiketlenmelidir'
      );

      // Özel ölçü korunumu
      const customRes = generateClientRecipe(client, arch, {
        customDimensions: { width: 18, height: 26 },
      });
      assert.ok(customRes.success && customRes.design);
      assert.strictEqual(
        customRes.design.recipe.comprehensiveReport!.sectionA.customDimensions,
        '18 cm Genişlik × 26 cm Yükseklik'
      );
      assert.strictEqual(
        customRes.design.recipe.recommendedDimensionsCm.width,
        18
      );
      assert.strictEqual(
        customRes.design.recipe.recommendedDimensionsCm.height,
        26
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 3. Reçete Metin Kalitesi ve Dilbilgisi
  it('3. Reçete metinlerinde noktalama ve ekleme kalıntıları bulunmamalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);
      const rep = res.design.recipe.comprehensiveReport!;

      // Çift nokta / bozuk ek kontrolü
      const narrative = rep.sectionE.transformationNarrativeTr;
      assert.ok(!narrative.includes('..'), 'Gölge anlatısında çift nokta olmamalıdır');
      assert.ok(!narrative.includes('. geometrisi'), 'Gölge anlatısında ". geometrisi" kalıntısı olmamalıdır');
      assert.ok(!narrative.includes('. geometrisini'), 'Gölge anlatısında ". geometrisini" kalıntısı olmamalıdır');

      // Manifesto metni kontrolü
      const manifesto = rep.sectionI.manifestoTr;
      assert.ok(!manifesto.includes('. geometrisi'), 'Manifesto metninde ". geometrisi" kalıntısı olmamalıdır');
      assert.ok(!manifesto.includes('. geometrisini'), 'Manifesto metninde ". geometrisini" kalıntısı olmamalıdır');

      // Section G merkezi odak tekrarı olmamalı
      assert.ok(!rep.sectionG.centralFocusRationaleTr.startsWith('Merkezi Odak: Merkezi Odak:'));
      assert.ok(!rep.sectionG.secondaryTransitionsTr.startsWith('İkincil Semboller: İkincil Semboller:'));

      // Sembollerde ayrıntılı 7 kriter mevcut olmalıdır
      rep.sectionC.symbols.forEach((sym) => {
        assert.ok(sym.symbolName && sym.symbolName.length > 2);
        assert.ok(sym.personalTheme && sym.personalTheme.length > 5);
        assert.ok(sym.compositionRole && sym.compositionRole.length > 3);
        assert.ok(sym.meaningRiskIfRemoved && sym.meaningRiskIfRemoved.length > 5);
      });
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 4. Enneagram Tamamlanma ve Canlı Senkronizasyon Durumu
  it('4. Enneagram tamamlandığında reçeteye entegre edilmeli, tamamlanmadığında eksik gösterilmelidir', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);

      // 4A. Henüz tamamlanmadığında
      const resBefore = generateClientRecipe(client, arch);
      assert.ok(resBefore.success && resBefore.design);
      const repBefore = resBefore.design.recipe.comprehensiveReport!;
      assert.ok(
        repBefore.sectionA.missingModules.some((m) => m.includes('Enneagram')),
        'Enneagram çözülmediğinde eksik modüllerde yer almalıdır'
      );

      // 4B. Enneagram tamamlandığında
      const enneagramResult = {
        id: 'enneagram_gizem_a59',
        clientId: client.id,
        testType: 'ENNEAGRAM' as const,
        version: 1,
        primaryType: 'Tip 7 (Maceracı / İstekli)',
        secondaryType: 'Kanat 8 (Meydan Okuyan)',
        completedAt: new Date().toISOString(),
        answers: [],
        dominantScores: { 'Tip 7': 15, 'Tip 8': 12 },
        interpretations: [],
      };
      saveClientTestResult(client.id, enneagramResult as any);

      const archWithEnneagram = getClientArchive(client.id)!;
      const resAfter = generateClientRecipe(client, archWithEnneagram);
      assert.ok(resAfter.success && resAfter.design);
      const repAfter = resAfter.design.recipe.comprehensiveReport!;

      assert.ok(
        repAfter.sectionA.completedModules.some((m) => m.includes('Tip 7')),
        'Enneagram tamamlandığında tamamlanan modüllerde Tip 7 görünmelidir'
      );
      assert.ok(
        repAfter.sectionB.thematicKeywords.some((k) => k.includes('Tip 7') || k.includes('Mizaç')) ||
          resAfter.design.conceptStatement.includes('Tip 7') ||
          resAfter.design.conceptStatement.includes('Maceracı'),
        'Enneagram çıktısı temalara veya manifestoya yansıtılmalıdır'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 5. Danışan İzolasyonu
  it('5. Danışan A nın Enneagram veya Totem verisi Danışan B nin reçetesine asla sızmamalıdır', () => {
    const clientA = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    const clientBData: ClientFormData = {
      firstName: 'Can',
      lastName: 'Öztürk',
      email: 'can.ozturk.a59@example.com',
      phone: '05553332211',
      birthDate: '1985-06-10',
      birthTime: '10:00',
      isBirthTimeUnknown: false,
      birthLocation: sampleLocation,
      motherName: 'Emine',
      notes: 'Danışan B',
    };
    const clientB = createClientRecord(clientBData, 'OWNER_MANUAL');

    try {
      const archA = setupFullArchive(clientA);
      const archB = setupFullArchive(clientB);

      // Client A ya Enneagram ve Totem ekle
      saveClientTestResult(clientA.id, {
        id: 'totem_a',
        clientId: clientA.id,
        testType: 'ANIMAL_TOTEM',
        version: 1,
        primaryType: 'Kurt (Wolf)',
        completedAt: new Date().toISOString(),
        answers: [],
        dominantScores: { 'Kurt (Wolf)': 10 },
        interpretations: [],
      } as any);

      const archAFull = getClientArchive(clientA.id)!;
      const archBFull = getClientArchive(clientB.id)!;

      const resA = generateClientRecipe(clientA, archAFull);
      const resB = generateClientRecipe(clientB, archBFull);

      assert.ok(resA.success && resA.design);
      assert.ok(resB.success && resB.design);

      // Client B nin reçetesinde Kurt olmamalıdır
      const bReport = resB.design.recipe.comprehensiveReport!;
      assert.strictEqual(bReport.sectionF.hasTotemAnalysis, false);
      assert.ok(!resB.design.recipe.placementDescription.includes(clientA.firstName));
      assert.ok(!resB.design.conceptStatement.includes(clientA.firstName));
      assert.ok(!resB.design.aiPrompt.primaryPromptEn.includes('Wolf'));
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 6. Çıktı Senkronizasyonu
  it('6. Reçete metni, kopyalama, danışan dosyası ve tam paket %100 aynı güncel reçeteyi kullanmalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);

      const design = res.design;
      saveClientDesign(client.id, design);
      const archWithDesign = getClientArchive(client.id)!;

      const recipeText = formatTattooRecipeText(client, design);
      const sectionCopy = formatRecipeSectionCopyText(client, archWithDesign, design);
      const fullAnalysisCopy = formatFullClientAnalysisCopyText(client, archWithDesign);
      const fullPackage = formatFullDesignPackageText(client, design);
      const dossier = generateClientDossierText(client, archWithDesign);

      // Birebir senkronizasyon kontrolleri
      assert.strictEqual(recipeText, sectionCopy);
      assert.ok(fullAnalysisCopy.includes(design.title));
      assert.ok(fullAnalysisCopy.includes('[A. DANIŞAN VE REÇETE ÖZETİ]'));
      assert.ok(fullPackage.includes(recipeText));
      assert.ok(dossier.includes(design.title));
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
