import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  updateClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientAstrologyChart,
  saveClientDesign,
  saveClientReport,
  saveClientSymbolAnalysis,
  getClientSymbolAnalyses,
  getClientDesigns,
  getClientReports,
} from '../../../store/storage';
import {
  generateTattooRecipeFromAnalyses,
  validateRecipeCompositionTechnicalRules,
} from '../recipeCalculationEngine';
import { generateClientRecipe } from '../recipeEngineAdapter';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../../../types/analysis';
import { TropicalNatalChart } from '../../../types/astrology';
import { ClientTattooReport } from '../../../types/report';
import { GlobalLocation } from '../../../types/location';
import { Client } from '../../../types/client';

const testLocation: GlobalLocation = {
  country: 'Türkiye',
  city: 'Ankara',
  placeName: 'Ankara, Çankaya',
  latitude: 39.9334,
  longitude: 32.8597,
  timezone: 'Europe/Istanbul',
  utcOffsetMinutes: 180,
};

function createNumerologyForClient(client: Client, lifePath = 8): NumerologyAnalysis {
  return {
    fullName: `${client.firstName} ${client.lastName}`.trim(),
    birthDate: client.birthDate,
    lifePathNumber: lifePath,
    destinyNumber: 1,
    soulUrgeNumber: 4,
    personalityNumber: 6,
    birthdayNumber: 15,
    worldMissionNumber: 9,
    karmicLessons: [],
    masterNumbers: [],
  };
}

function createAstrologyForClient(client: Client): TropicalNatalChart {
  return {
    zodiacSystem: 'TROPICAL',
    houseSystem: 'PLACIDUS',
    birthDate: client.birthDate,
    birthTime: client.birthTime,
    isBirthTimeUnknown: client.isBirthTimeUnknown,
    latitude: client.birthLocation?.latitude || 39.9334,
    longitude: client.birthLocation?.longitude || 32.8597,
    timezone: client.birthLocation?.timezone || 'Europe/Istanbul',
    utcOffsetMinutes: client.birthLocation?.utcOffsetMinutes || 180,
    sunSign: 'Aries',
    moonSign: 'Virgo',
    ascendantSign: 'Cancer',
    planetaryPositions: [
      { body: 'Sun', sign: 'Aries', degree: 25, minute: 10, houseNumber: 10 },
      { body: 'Moon', sign: 'Virgo', degree: 8, minute: 40, houseNumber: 3 },
      { body: 'Ascendant', sign: 'Cancer', degree: 14, minute: 20, houseNumber: 1 },
    ],
  };
}

describe('Dövme Reçetesi: Astroloji Kapsamı ve Bağımlı Kayıtların Otomatik Silinmesi Testleri', () => {
  const sampleChk: ChakraAnalysis = {
    chakras: [
      { chakra: 'ROOT', status: 'BALANCED', score: 7, focusRecommendations: [] },
      { chakra: 'SACRAL', status: 'BALANCED', score: 6, focusRecommendations: [] },
      { chakra: 'SOLAR_PLEXUS', status: 'BALANCED', score: 7, focusRecommendations: [] },
      { chakra: 'HEART', status: 'BLOCKED', score: 3, focusRecommendations: ['Lotus'] },
      { chakra: 'THROAT', status: 'BALANCED', score: 7, focusRecommendations: [] },
      { chakra: 'THIRD_EYE', status: 'BALANCED', score: 8, focusRecommendations: [] },
      { chakra: 'CROWN', status: 'BALANCED', score: 8, focusRecommendations: [] },
    ],
    dominantChakra: 'THIRD_EYE',
    primaryDeficit: 'HEART',
  };

  const sampleArch: ArchetypeAnalysis = {
    unifiedArchetype: {
      primary: 'Hükümdar / Lider',
      secondary: 'Şifacı',
      description: 'Liderlik ve şefkat sentezi.',
    },
    shadowArchetype: {
      shadowName: 'Tiran / Kontrolcü',
      transformationalSymbol: 'Kozmik Kalp ve Gül Kristali',
    },
  };

  it('1. Astroloji Kapsamı: Güneş, Ay ve Yükselen burçlarının tamamı reçetede yer almalı, Güneş hariç tutulmamalıdır', () => {
    const client = createClientRecord({
      firstName: 'Ali',
      lastName: 'Demir',
      birthDate: '1992-04-15',
      birthTime: '10:30',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Zehra',
      email: 'ali.demir@example.com',
      phone: '5551112244',
      notes: '',
    });

    const astro = createAstrologyForClient(client);
    const num = createNumerologyForClient(client, 8);

    const design = generateTattooRecipeFromAnalyses({
      client,
      astrology: astro,
      numerology: num,
      chakra: sampleChk,
      archetype: sampleArch,
      nextVersionNumber: 1,
    });

    // İkincil sembollerde Güneş (Koç), Ay (Başak) ve Yükselen (Yengeç) bulunmalıdır
    const astroSecondary = (design.recipe.secondarySymbols || []).find(
      (s) => s.includes('Güneş') && s.includes('Ay') && s.includes('Yükselen')
    );
    assert.ok(astroSecondary, 'Güneş, Ay ve Yükselen birlikte kozmik hizalanma olarak yer almalıdır.');
    assert.ok(astroSecondary.includes('Koç Güneş'), 'Koç Güneş burcu dahil edilmelidir.');
    assert.ok(astroSecondary.includes('Başak Ay'), 'Başak Ay burcu dahil edilmelidir.');
    assert.ok(astroSecondary.includes('Yengeç Yükselen'), 'Yengeç Yükselen burcu dahil edilmelidir.');

    // Prompt içerisinde Güneş glifi ('solar glyph') yer almalıdır
    assert.ok(
      design.aiPrompt.primaryPromptEn.toLowerCase().includes('solar') ||
      design.aiPrompt.primaryPromptEn.toLowerCase().includes('sun'),
      'Güneş promptta yer almalıdır'
    );

    // Kapsam denetimi: Vedik sistem dahil edilmemiştir
    assert.ok(design.recipe.comprehensiveReport?.technicalPromptDirective?.forbiddenElementsAudited.some(
      (item) => item.includes('Vedik') || item.includes('MC')
    ), 'Kapsam dışı sistemler denetlenmelidir');
  });

  it('2. Astroloji Kapsamı: Doğum saati bilinmiyorsa 12:00 varsayımı ve kesin olmama uyarısı belirtilmelidir', () => {
    const client = createClientRecord({
      firstName: 'Banu',
      lastName: 'Kaya',
      birthDate: '1992-04-15',
      birthTime: '12:00',
      isBirthTimeUnknown: true,
      birthLocation: testLocation,
      motherName: 'Nermin',
      email: 'banu@example.com',
      phone: '5552223344',
      notes: '',
    });

    const astroUnknownTime = {
      ...createAstrologyForClient(client),
      isBirthTimeUnknown: true,
      birthTime: '12:00',
    };
    const num = createNumerologyForClient(client, 8);

    const design = generateTattooRecipeFromAnalyses({
      client,
      astrology: astroUnknownTime,
      numerology: num,
      chakra: sampleChk,
      archetype: sampleArch,
      nextVersionNumber: 1,
    });

    const astroSecondary = (design.recipe.secondarySymbols || []).find((s) => s.includes('Yükselen'));
    assert.ok(astroSecondary?.includes('12:00 varsayımlı, kesin değil'), '12:00 varsayım uyarısı bulunmalıdır.');
  });

  it('3. Numeroloji Değişimi: Numeroloji değiştiğinde çakra, arketip, tasarım ve raporlar otomatik silinmelidir', () => {
    const client = createClientRecord({
      firstName: 'Can',
      lastName: 'Öz',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Fatma',
      email: 'can.oz@example.com',
      phone: '5553334455',
      notes: '',
    });

    const num = createNumerologyForClient(client, 8);

    // Analiz zincirini kaydet
    saveClientNumerology(client.id, num);
    saveClientChakra(client.id, sampleChk);
    saveClientArchetype(client.id, sampleArch);

    let archive = getClientArchive(client.id);
    const recipeRes = generateClientRecipe(client, archive);
    assert.ok(recipeRes.success && recipeRes.design);
    saveClientDesign(client.id, recipeRes.design);

    const report: ClientTattooReport = {
      id: `report_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      title: 'Can Raporu',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Gizli',
      sections: [],
    };
    saveClientReport(client.id, report);

    // Başlangıçta hepsi mevcut
    assert.strictEqual(getClientDesigns(client.id).length, 1);
    assert.strictEqual(getClientReports(client.id).length, 1);
    assert.ok(getClientArchive(client.id)?.analyses[0].chakra);
    assert.ok(getClientArchive(client.id)?.analyses[0].archetype);

    // Şimdi numeroloji değişiyor:
    saveClientNumerology(client.id, {
      ...num,
      lifePathNumber: 3,
    });

    const updatedArchive = getClientArchive(client.id);
    const updatedAnalysis = updatedArchive?.analyses.find((a) => a.clientId === client.id);

    // Numeroloji güncel olmalı
    assert.strictEqual(updatedAnalysis?.numerology?.lifePathNumber, 3);

    // Bağımlı çakra, arketip, tasarımlar ve raporlar silinmiş olmalı
    assert.strictEqual(updatedAnalysis?.chakra, undefined, 'Çakra silinmelidir');
    assert.strictEqual(updatedAnalysis?.archetype, undefined, 'Arketip silinmelidir');
    assert.strictEqual(getClientDesigns(client.id).length, 0, 'Eski tasarımlar silinmelidir');
    assert.strictEqual(getClientReports(client.id).length, 0, 'Eski raporlar silinmelidir');
  });

  it('4. Çakra Değişimi: Çakra değiştiğinde arketip, tasarım ve raporlar silinmeli, numeroloji korunmalıdır', () => {
    const client = createClientRecord({
      firstName: 'Derya',
      lastName: 'Ak',
      birthDate: '1993-05-10',
      birthTime: '14:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Hatice',
      email: 'derya.ak@example.com',
      phone: '5554445566',
      notes: '',
    });

    const num = createNumerologyForClient(client, 8);
    saveClientNumerology(client.id, num);
    saveClientChakra(client.id, sampleChk);
    saveClientArchetype(client.id, sampleArch);

    const archive = getClientArchive(client.id);
    const recipeRes = generateClientRecipe(client, archive);
    assert.ok(recipeRes.success && recipeRes.design);
    saveClientDesign(client.id, recipeRes.design);

    assert.strictEqual(getClientDesigns(client.id).length, 1);

    // Çakra güncelleniyor:
    saveClientChakra(client.id, {
      ...sampleChk,
      primaryDeficit: 'ROOT',
    });

    const refreshedArchive = getClientArchive(client.id);
    const refreshedAnalysis = refreshedArchive?.analyses.find((a) => a.clientId === client.id);

    // Numeroloji korunmalı
    assert.strictEqual(refreshedAnalysis?.numerology?.lifePathNumber, 8);
    // Çakra güncellenmiş olmalı
    assert.strictEqual(refreshedAnalysis?.chakra?.primaryDeficit, 'ROOT');
    // Arketip, tasarım ve raporlar silinmiş olmalı
    assert.strictEqual(refreshedAnalysis?.archetype, undefined, 'Arketip silinmelidir');
    assert.strictEqual(getClientDesigns(client.id).length, 0, 'Tasarımlar silinmelidir');
  });

  it('5. Arketip Değişimi: Arketip değiştiğinde tasarım ve raporlar silinmeli, numeroloji ve çakra korunmalıdır', () => {
    const client = createClientRecord({
      firstName: 'Efe',
      lastName: 'Güneş',
      birthDate: '1991-08-20',
      birthTime: '09:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Gül',
      email: 'efe.gunes@example.com',
      phone: '5555556677',
      notes: '',
    });

    const num = createNumerologyForClient(client, 8);
    saveClientNumerology(client.id, num);
    saveClientChakra(client.id, sampleChk);
    saveClientArchetype(client.id, sampleArch);

    const archive = getClientArchive(client.id);
    const recipeRes = generateClientRecipe(client, archive);
    assert.ok(recipeRes.success && recipeRes.design);
    saveClientDesign(client.id, recipeRes.design);

    assert.strictEqual(getClientDesigns(client.id).length, 1);

    // Arketip güncelleniyor:
    saveClientArchetype(client.id, {
      ...sampleArch,
      unifiedArchetype: {
        primary: 'Bilge',
        secondary: 'Gezgin',
        description: 'Bilge arketip.',
      },
    });

    const refreshedArchive = getClientArchive(client.id);
    const refreshedAnalysis = refreshedArchive?.analyses.find((a) => a.clientId === client.id);

    // Numeroloji ve çakra korunmalı
    assert.ok(refreshedAnalysis?.numerology);
    assert.ok(refreshedAnalysis?.chakra);
    // Arketip güncellenmiş olmalı
    assert.strictEqual(refreshedAnalysis?.archetype?.unifiedArchetype.primary, 'Bilge');
    // Tasarımlar silinmiş olmalı
    assert.strictEqual(getClientDesigns(client.id).length, 0, 'Tasarımlar silinmelidir');
  });

  it('6. Astroloji ve Doğum Bilgileri Değişimi: Doğum saati veya yeri değiştiğinde tasarımlar ve raporlar silinmelidir', () => {
    const client = createClientRecord({
      firstName: 'Gamze',
      lastName: 'Koç',
      birthDate: '1994-11-12',
      birthTime: '08:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Aysel',
      email: 'gamze.koc@example.com',
      phone: '5556667788',
      notes: '',
    });

    const num = createNumerologyForClient(client, 8);
    const astro = createAstrologyForClient(client);

    saveClientNumerology(client.id, num);
    saveClientChakra(client.id, sampleChk);
    saveClientArchetype(client.id, sampleArch);
    saveClientAstrologyChart(client.id, astro);

    // Sembol analizi kaydet
    saveClientSymbolAnalysis(client.id, {
      id: `symbol_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      selectedSymbols: [{ symbolId: 'moon-phases-crescent', symbolName: 'Hilal Ay', customMeaning: 'Ay hizalanması', weight: 'SECONDARY' }],
      compositionNarrative: 'Astroloji rezonanslı sembol seçimi',
      createdAt: new Date().toISOString(),
    });

    const archive = getClientArchive(client.id);
    const recipeRes = generateClientRecipe(client, archive);
    assert.ok(recipeRes.success && recipeRes.design);
    saveClientDesign(client.id, recipeRes.design);

    assert.strictEqual(getClientDesigns(client.id).length, 1);
    assert.strictEqual(getClientSymbolAnalyses(client.id).length, 1);

    // Doğum saatini güncelle
    updateClientRecord({
      ...client,
      birthTime: '17:45',
    });

    const refreshedArchive = getClientArchive(client.id);
    const refreshedAnalysis = refreshedArchive?.analyses.find((a) => a.clientId === client.id);

    // Astroloji, sembol analizi ve tasarım silinmiş olmalı
    assert.strictEqual(refreshedAnalysis?.astrology, undefined, 'Astroloji haritası silinmelidir');
    assert.strictEqual(getClientSymbolAnalyses(client.id).length, 0, 'Astrolojiye bağlı sembol analizleri silinmelidir');
    assert.strictEqual(getClientDesigns(client.id).length, 0, 'Tasarımlar silinmelidir');
    // Numeroloji, çakra ve arketip korunmalıdır (çünkü ad/soyad/tarih değişmedi)
    assert.ok(refreshedAnalysis?.numerology, 'Numeroloji korunmalıdır');
    assert.ok(refreshedAnalysis?.chakra, 'Çakra korunmalıdır');
    assert.ok(refreshedAnalysis?.archetype, 'Arketip korunmalıdır');

    // saveClientAstrologyChart güncellendiğinde de sembol ve tasarımın geçersizleştiğini doğrula
    saveClientSymbolAnalysis(client.id, {
      id: `symbol_${client.id}_v2`,
      clientId: client.id,
      version: 2,
      selectedSymbols: [{ symbolId: 'polaris-compass', symbolName: 'Kutup Yıldızı', customMeaning: 'Yükselen pusulası', weight: 'SECONDARY' }],
      compositionNarrative: 'Yeni astroloji sembol seçimi',
      createdAt: new Date().toISOString(),
    });
    assert.strictEqual(getClientSymbolAnalyses(client.id).length, 1);

    // Yeni astroloji haritası kaydet (Güneş burcu değişti)
    saveClientAstrologyChart(client.id, {
      ...astro,
      sunSign: 'Taurus',
    });

    assert.strictEqual(getClientSymbolAnalyses(client.id).length, 0, 'Astroloji haritası değiştiğinde sembol analizi silinmelidir');
    // Numeroloji, çakra ve arketip yine korunmalıdır
    const finalRefreshed = getClientArchive(client.id)?.analyses.find((a) => a.clientId === client.id);
    assert.ok(finalRefreshed?.numerology, 'Numeroloji korunmalıdır');
    assert.ok(finalRefreshed?.chakra, 'Çakra korunmalıdır');
    assert.ok(finalRefreshed?.archetype, 'Arketip korunmalıdır');
  });

  it('7. Danışan İzolasyonu: Danışan A nın verileri silindiğinde Danışan B nin verileri asla etkilenmemelidir', () => {
    const clientA = createClientRecord({
      firstName: 'Hakan',
      lastName: 'Tepe',
      birthDate: '1985-02-14',
      birthTime: '11:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Şerife',
      email: 'hakan@example.com',
      phone: '5557770001',
      notes: '',
    });

    const clientB = createClientRecord({
      firstName: 'İpek',
      lastName: 'Sarı',
      birthDate: '1987-07-22',
      birthTime: '16:30',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Emel',
      email: 'ipek@example.com',
      phone: '5557770002',
      notes: '',
    });

    const numA = createNumerologyForClient(clientA, 8);
    const numB = createNumerologyForClient(clientB, 1);

    // Her iki danışana da tam analiz ve tasarım kaydet
    saveClientNumerology(clientA.id, numA);
    saveClientChakra(clientA.id, sampleChk);
    saveClientArchetype(clientA.id, sampleArch);
    const archA = getClientArchive(clientA.id);
    const desA = generateClientRecipe(clientA, archA);
    assert.ok(desA.success && desA.design);
    saveClientDesign(clientA.id, desA.design);

    saveClientNumerology(clientB.id, numB);
    saveClientChakra(clientB.id, sampleChk);
    saveClientArchetype(clientB.id, sampleArch);
    const archB = getClientArchive(clientB.id);
    const desB = generateClientRecipe(clientB, archB);
    assert.ok(desB.success && desB.design);
    saveClientDesign(clientB.id, desB.design);

    assert.strictEqual(getClientDesigns(clientA.id).length, 1);
    assert.strictEqual(getClientDesigns(clientB.id).length, 1);

    // Danışan A nın numerolojisini değiştir (zincirleme silmeyi tetikle)
    saveClientNumerology(clientA.id, { ...numA, lifePathNumber: 9 });

    // Danışan A nın tasarımları silinmiş olmalı
    assert.strictEqual(getClientDesigns(clientA.id).length, 0);

    // Danışan B nin tasarımı ve tüm analizleri KESİNLİKLE KORUNMALI
    const finalArchB = getClientArchive(clientB.id);
    assert.strictEqual(getClientDesigns(clientB.id).length, 1, 'Danışan B nin tasarımı korunmalıdır');
    assert.ok(finalArchB?.analyses[0].numerology, 'Danışan B nin numerolojisi korunmalıdır');
    assert.ok(finalArchB?.analyses[0].chakra, 'Danışan B nin çakrası korunmalıdır');
    assert.ok(finalArchB?.analyses[0].archetype, 'Danışan B nin arketipi korunmalıdır');
  });

  it('8. Tasarım Kompozisyonu: %65 ana odak, %45-50 negatif alan, 1.5-2 mm çizgi aralığı ve 16x10 / 22x14 standartları', () => {
    const client = createClientRecord({
      firstName: 'Kerem',
      lastName: 'Vural',
      birthDate: '1989-06-25',
      birthTime: '12:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Emine',
      email: 'kerem.vural@example.com',
      phone: '5558889900',
      notes: '',
    });

    const num = createNumerologyForClient(client, 7);
    const astro = createAstrologyForClient(client);

    const design = generateTattooRecipeFromAnalyses({
      client,
      astrology: astro,
      numerology: num,
      chakra: sampleChk,
      archetype: sampleArch,
      nextVersionNumber: 1,
    });

    // 1. Programatik kompozisyon doğrulama fonksiyonu ile denetim
    const validation = validateRecipeCompositionTechnicalRules(design);
    assert.strictEqual(validation.isValid, true, 'Reçete tüm teknik kompozisyon kurallarına uymalıdır');
    assert.strictEqual(validation.nominalTargetFocusWeightPercent, 65, 'Nominal hedef %65 olmalıdır');
    assert.deepStrictEqual(validation.focusWeightToleranceRange, [60, 70], 'Tasarım esnekliği toleransı %60-70 olmalıdır');
    assert.strictEqual(validation.primaryFocusWeightPercent, 65, 'Ana görsel odak gerçekleşen pozitif alan %65 olmalıdır');
    assert.deepStrictEqual(validation.negativeSpaceTargetRange, [45, 50], 'Negatif alan hedefi %45–50 olmalıdır');
    assert.strictEqual(validation.minLineSpacingMm, 1.5, 'Minimum çizgi aralığı 1.5 mm olmalıdır');
    assert.strictEqual(validation.isDimensionsCompliant, true, 'Ebatlar asgari standardı karşılamalıdır');
    assert.strictEqual(validation.isMathematicalModelConsistent, true, 'Matematiksel alan modeli tutarlı olmalıdır');

    // 2. Metin açıklamalarında eski %30 sınırının bulunmadığının ve %45-50'nin yer aldığının teyidi
    const report = design.recipe.comprehensiveReport;
    assert.ok(report);
    assert.ok(
      report.compositionPhilosophy.flowAndNegativeSpaceTr.includes('%45–50') ||
      report.compositionPhilosophy.flowAndNegativeSpaceTr.includes('%45-50'),
      'Felsefede %45–50 negatif alan hedefi bulunmalıdır'
    );
    assert.ok(
      !report.compositionPhilosophy.flowAndNegativeSpaceTr.includes('%30'),
      'Eski %30 negatif alan sınırı artık felsefede yer almamalıdır'
    );

    // 3. Section G ve Section H alanlarının kontrolü
    assert.ok(
      report.sectionG.negativeSpaceRatioTr.includes('45–50') ||
      report.sectionG.negativeSpaceRatioTr.includes('45-50'),
      'Section G negatif alan oranı %45–50 olmalıdır'
    );
    assert.ok(
      !report.sectionG.negativeSpaceRatioTr.includes('%30'),
      'Section G eski %30 ifadesini içermemelidir'
    );
    assert.ok(
      report.sectionH.agingAndLineSpacingTr.includes('1.5–2') ||
      report.sectionH.agingAndLineSpacingTr.includes('1.5 - 2') ||
      report.sectionH.agingAndLineSpacingTr.includes('1.5–2.0'),
      'Section H çizgi aralığı 1.5–2 mm kuralını içermelidir'
    );

    // 4. Teknik promptta %65 core, %45-50 negative space ve 1.5-2mm linework direktiflerinin bulunması
    const prompt = design.aiPrompt.primaryPromptEn;
    assert.ok(prompt.includes('65% dominant central visual core weight'), 'Promptta %65 ana odak bulunmalıdır');
    assert.ok(prompt.includes('45-50% clean skin negative space'), 'Promptta %45-50 negatif alan bulunmalıdır');
    assert.ok(prompt.includes('1.5-2.0mm fine linework spacing'), 'Promptta 1.5-2 mm çizgi aralığı bulunmalıdır');

    // 5. Boyut standartları (İdeal 22x14, Asgari 16x10)
    assert.ok(
      report.anatomicalAndTechnicalDirective.dimensionsExplicit.minimumDimensionsNoticeTr.includes('22 cm Yükseklik × 14 cm Genişlik') ||
      report.anatomicalAndTechnicalDirective.dimensionsExplicit.minimumDimensionsNoticeTr.includes('22') &&
      report.anatomicalAndTechnicalDirective.dimensionsExplicit.minimumDimensionsNoticeTr.includes('16'),
      'Boyut standartları ideal 22x14 ve asgari 16x10 olarak yer almalıdır'
    );
  });

  it('9. Ebat Uyarısı: 16x10 cm altındaki özel ölçülerde asgari boyut uyarısı aktif olmalıdır', () => {
    const client = createClientRecord({
      firstName: 'Leyla',
      lastName: 'Aydın',
      birthDate: '1995-10-10',
      birthTime: '15:00',
      isBirthTimeUnknown: false,
      birthLocation: testLocation,
      motherName: 'Sevim',
      email: 'leyla@example.com',
      phone: '5559990011',
      notes: '',
    });

    const num = createNumerologyForClient(client, 1);
    const astro = createAstrologyForClient(client);

    // 8x6 cm gibi yetersiz bir özel ebat girildiğinde
    const designSmall = generateTattooRecipeFromAnalyses({
      client,
      astrology: astro,
      numerology: num,
      chakra: sampleChk,
      archetype: sampleArch,
      options: {
        customDimensions: { width: 6, height: 8 },
      },
      nextVersionNumber: 1,
    });

    const validation = validateRecipeCompositionTechnicalRules(designSmall);
    assert.strictEqual(validation.isDimensionsCompliant, false, '8x6 cm boyutu minimum standart olan 16x10 altındadır');
    assert.ok(designSmall.recipe.comprehensiveReport?.clientSummary.dimensionWarningTr, 'Ebat uyarısı üretilmelidir');
  });
});
