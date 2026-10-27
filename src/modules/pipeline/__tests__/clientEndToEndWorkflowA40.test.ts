import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '../../../types/client';
import {
  clearAllApplicationData,
  createClientRecord,
  getStoredClients,
  getClientArchive,
  setStoredActiveClientId,
  getStoredActiveClientId,
  saveClientTestResult,
  saveClientDesign,
} from '../../../store/storage';
import { runClientAutoAnalysisChain, getClientAnalysisChainStatus } from '../clientAnalysisPipeline';
import {
  getAstrologyCardData,
  getNumerologyCardData,
  getChakraCardData,
  getArchetypeCardData,
  getEnneagramCardData,
  getTotemCardData,
} from '../../../utils/analysisResultsFormatters';
import { generateClientRecipe } from '../../recipe';
import { generateUnifiedVisualPrompt } from '../../symbols';
import { runAndBuildEnneagramResult, runAndBuildTotemResult } from '../../tests';
import { generateClientDossierText, generateClientDossierJson } from '../../../utils/clientDossierGenerator';

describe('A40 — Tam Uygulama Akışı ve Uçtan Uca Doğrulama Test Paketi', () => {
  // Testler öncesi temizlik
  clearAllApplicationData();

  // Referans Danışan A (Elif Demir - Doğum saati biliniyor)
  const elifFormData = {
    firstName: 'Elif',
    lastName: 'Demir',
    email: 'elif.demir@example.com',
    phone: '05321112233',
    birthDate: '1992-06-15',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      countryCode: 'TR',
      city: 'İstanbul',
      placeName: 'İstanbul, Türkiye',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'A40 Akış Doğrulama Danışanı A',
  };

  // Referans Danışan B (Bilinmeyen Saatli Danışan)
  const zeynepFormData = {
    firstName: 'Zeynep',
    lastName: 'Kaya',
    email: 'zeynep.kaya@example.com',
    phone: '05334445566',
    birthDate: '1988-11-20',
    birthTime: '',
    isBirthTimeUnknown: true,
    birthLocation: {
      country: 'Türkiye',
      countryCode: 'TR',
      city: 'Ankara',
      placeName: 'Ankara, Türkiye',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Emine',
    notes: 'A40 Akış Doğrulama Danışanı B',
  };

  let clientA: Client;
  let clientB: Client;

  // 1. Test: Yeni danışan kaydı sonrası aktif danışanın doğru belirlenmesi
  it('1. Yeni danışan kaydı sonrası aktif danışan doğru belirlenmeli ve storage da yer almalıdır', () => {
    clientA = createClientRecord(elifFormData, 'CLIENT_FORM');
    setStoredActiveClientId(clientA.id);

    assert.ok(clientA.id, 'Danışan kimliği oluşturulmalıdır');
    assert.equal(getStoredActiveClientId(), clientA.id, 'Aktif danışan ID si yeni kayıt ile eşleşmelidir');

    const storedList = getStoredClients();
    assert.ok(storedList.some((c) => c.id === clientA.id), 'Danışan storage listesinde bulunmalıdır');
  });

  // 2. Test: Otomatik dört temel analizin doğru danışana kaydedilmesi
  it('2. Otomatik dört temel analiz (Numeroloji, Astroloji, Çakra, Arketip) hatasız çalışıp doğru danışana kaydedilmelidir', () => {
    const chainRes = runClientAutoAnalysisChain(clientA);

    assert.equal(chainRes.clientId, clientA.id);
    assert.equal(chainRes.numerologyRan, true, 'Numeroloji çalıştırılmalıdır');
    assert.equal(chainRes.astrologyRan, true, 'Astroloji çalıştırılmalıdır');
    assert.equal(chainRes.chakraRan, true, 'Çakra çalıştırılmalıdır');
    assert.equal(chainRes.archetypeRan, true, 'Arketip çalıştırılmalıdır');
    assert.equal(chainRes.errors.length, 0, 'Hiçbir hata oluşmamalıdır');

    const archiveA = getClientArchive(clientA.id);
    assert.ok(archiveA, 'Danışan arşivi bulunmalıdır');
    assert.equal(archiveA?.analyses.length, 1);
    assert.ok(archiveA?.analyses[0]?.numerology?.lifePathNumber, 'Numeroloji kaydedilmiş olmalıdır');
    assert.ok(archiveA?.analyses[0]?.astrology?.sunSign, 'Astroloji kaydedilmiş olmalıdır');
    assert.ok(archiveA?.analyses[0]?.chakra?.dominantChakra, 'Çakra kaydedilmiş olmalıdır');
    assert.ok(archiveA?.analyses[0]?.archetype?.unifiedArchetype?.primary, 'Arketip kaydedilmiş olmalıdır');
  });

  // 3. Test: Güneş/Ay/Yükselen bilgilerinin sonuç ekranına ulaşması
  it('3. Güneş, Ay ve Yükselen bilgileri sonuç kartı formatlayıcısına eksiksiz ulaşmalıdır', () => {
    const archiveA = getClientArchive(clientA.id);
    const astroCard = getAstrologyCardData(clientA, archiveA);

    assert.equal(astroCard.hasRecord, true);
    assert.equal(astroCard.sunSign, 'Gemini');
    assert.equal(astroCard.sunSignTr, 'İkizler');
    assert.equal(astroCard.moonSign, 'Sagittarius');
    assert.equal(astroCard.moonSignTr, 'Yay');
    assert.equal(astroCard.ascendantSign, 'Libra');
    assert.equal(astroCard.ascendantSignTr, 'Terazi');
    assert.equal(astroCard.formattedAscendantTr, "12° Terazi 14'");
    assert.equal(astroCard.isBirthTimeKnown, true);
  });

  // 4. Test: Bilinmeyen doğum saatinde ASC üretilmemesi ve 12:00 varsayımının açıkça gösterilmesi
  it('4. Doğum saati bilinmeyen danışanda (isBirthTimeUnknown: true) ASC üretilmemeli ve 12:00 referansı bildirilmelidir', () => {
    clientB = createClientRecord(zeynepFormData, 'CLIENT_FORM');
    const chainResB = runClientAutoAnalysisChain(clientB);
    assert.equal(chainResB.astrologyRan, true);

    const archiveB = getClientArchive(clientB.id);
    const astroCardB = getAstrologyCardData(clientB, archiveB);

    assert.equal(astroCardB.hasRecord, true);
    assert.equal(astroCardB.isBirthTimeKnown, false);
    assert.equal(astroCardB.ascendantSign, undefined, 'Bilinmeyen saatte ASC üretilmemelidir');
    assert.equal(astroCardB.ascendantSignTr, undefined);
    assert.equal(astroCardB.formattedAscendantTr, undefined);
    assert.ok(
      astroCardB.risingNoteTr?.includes('12:00'),
      'risingNoteTr metninde 12:00 öğle referansı varsayımı açıkça belirtilmelidir'
    );
  });

  // 5. Test: Enneagram cevap verilmeden sonuç oluşmaması
  it('5. Kullanıcı cevap vermeden Enneagram testi sonuç üretmemeli, durum Test hazır veya Kayıt bulunmuyor olmalıdır', () => {
    const archiveA = getClientArchive(clientA.id);
    const enneagramCard = getEnneagramCardData(clientA, archiveA);

    assert.equal(enneagramCard.hasRecord, false, 'Cevaplanmamış Enneagram için kayıt olmamalıdır');
    assert.equal(enneagramCard.primaryType, undefined);

    const chainStatus = getClientAnalysisChainStatus(clientA, archiveA);
    assert.equal(chainStatus.tests.enneagram.status, 'Test hazır');
    assert.equal(chainStatus.tests.enneagram.hasRecord, false);
  });

  // 6. Test: Totem cevap verilmeden sonuç oluşmaması
  it('6. Kullanıcı cevap vermeden Hayvan Totemi testi sonuç üretmemeli, durum Test hazır veya Kayıt bulunmuyor olmalıdır', () => {
    const archiveA = getClientArchive(clientA.id);
    const totemCard = getTotemCardData(clientA, archiveA);

    assert.equal(totemCard.hasRecord, false, 'Cevaplanmamış Totem için kayıt olmamalıdır');
    assert.equal(totemCard.primaryType, undefined);

    const chainStatus = getClientAnalysisChainStatus(clientA, archiveA);
    assert.equal(chainStatus.tests.totem.status, 'Test hazır');
    assert.equal(chainStatus.tests.totem.hasRecord, false);
  });

  // 7. Test: Eksik analiz varsa sahte sonuç oluşmaması
  it('7. Eksik veya geçersiz doğum verisinde sahte analiz sonucu üretilmemeli, hata açıkça bildirilmelidir', () => {
    const invalidClient: Client = {
      id: 'invalid_empty_client',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: '',
      birthTime: '',
      isBirthTimeUnknown: true,
      birthLocation: {
        country: '',
        countryCode: '',
        city: '',
        placeName: '',
        latitude: NaN,
        longitude: NaN,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
      motherName: '',
      notes: '',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      source: 'OWNER_MANUAL',
      status: 'ACTIVE',
    };

    const chainRes = runClientAutoAnalysisChain(invalidClient);
    assert.equal(chainRes.numerologyRan, false, 'Numeroloji sahte çalışmamalıdır');
    assert.equal(chainRes.astrologyRan, false, 'Astroloji sahte çalışmamalıdır');
    assert.ok(chainRes.errors.length > 0, 'Eksik veriler için açık Türkçe uyarı verilmelidir');
  });

  // 8. Test: Danışan değiştirildiğinde önceki danışanın sonuçlarının görünmemesi (Katı veri izolasyonu)
  it('8. Danışan değiştirildiğinde Danışan A nın verileri Danışan B ye asla sızmamalıdır', () => {
    // Danışan B aktif yapılıyor
    setStoredActiveClientId(clientB.id);
    assert.equal(getStoredActiveClientId(), clientB.id);

    const archiveB = getClientArchive(clientB.id);
    assert.ok(archiveB);
    assert.equal(archiveB.client.id, clientB.id);
    assert.equal(archiveB.client.firstName, 'Zeynep');

    // Danışan A verisi sızmamış olmalı
    const astroB = archiveB.analyses[0]?.astrology;
    assert.notEqual(astroB?.sunSign, 'Gemini', 'B danışanında A danışanının Güneş burcu olmamalıdır');
    assert.equal(astroB?.sunSign, 'Scorpio', 'Zeynep Kaya nın gerçek burcu Akrep tir');
    assert.equal(astroB?.ascendantSign, undefined, 'Zeynep Kaya nın ASC si undefined kalmalıdır');
  });

  // 9. Test: Reçete ön koşulları tamamlanmadan A15'in sahte şekilde çalışmaması
  it('9. Zorunlu analizler (Numeroloji, Çakra, Arketip) tamamlanmadan A15 reçete motoru çalışmamalıdır', () => {
    const unanalyzedClient: Client = {
      id: 'no_analysis_client',
      firstName: 'Ham',
      lastName: 'Kullanıcı',
      email: 'ham@example.com',
      phone: '05550001122',
      birthDate: '1995-05-05',
      birthTime: '10:00',
      isBirthTimeUnknown: false,
      birthLocation: elifFormData.birthLocation,
      motherName: 'Fatma',
      notes: '',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      source: 'OWNER_MANUAL',
      status: 'ACTIVE',
    };

    // Arşivi boş danışan
    const emptyArchive = {
      client: unanalyzedClient,
      analyses: [],
      testResults: [],
      symbolAnalyses: [],
      designs: [],
      reports: [],
      historySummary: [],
      meta: {
        totalAnalyses: 0,
        totalTests: 0,
        totalSymbols: 0,
        totalDesigns: 0,
        totalReports: 0,
        lastActivityAt: '',
      },
    } as unknown as import('../../../types/archive').ClientArchiveRecord;

    const res = generateClientRecipe(unanalyzedClient, emptyArchive);
    assert.equal(res.success, false, 'Ön analizler olmadan reçete üretilmemelidir');
    assert.equal(res.design, undefined);
    assert.ok(res.errorMessageTr?.includes('Reçete üretimi engellendi'), 'Açık Türkçe engelleme mesajı verilmelidir');
  });

  // 10. Test: A16'nın A15 reçetesi olmadan sahte istem üretmemesi
  it('10. Geçerli A15 reçetesi olmadan A16 görsel istem motoru prompt üretmemeli, hata vermelidir', () => {
    assert.throws(
      () => {
        generateUnifiedVisualPrompt({
          clientId: clientA.id,
          clientFullName: `${clientA.firstName} ${clientA.lastName}`,
          motherName: clientA.motherName,
          recipe: undefined as any, // Reçete eksik!
          selectedSymbols: [],
          recommendedSymbols: [],
          excludedSymbols: [],
          style: 'SACRED_GEOMETRY',
          placement: 'FOREARM_INNER',
          colorProfile: 'MONOCHROME_BLACK',
        });
      },
      /Eksik reçete/,
      'Reçetesiz görsel prompt üretimi engellenmelidir'
    );
  });

  // 11. Test: Tasarım arşivinin doğru danışana bağlanması ve sürüm geçmişinin korunması
  it('11. Üretilen dövme tasarımı ve reçetesi doğru danışana kaydedilmeli ve sürüm geçmişi korunmalıdır', () => {
    const archiveA = getClientArchive(clientA.id);

    // Kullanıcı gerçek Enneagram ve Totem testlerini tamamlıyor
    const enneagramAns: Record<string, string> = {
      en_q1: 'en_q1_o1',
      en_q2: 'en_q2_o1',
      en_q3: 'en_q3_o1',
      en_q4: 'en_q4_o1',
      en_q5: 'en_q5_o1',
      en_q6: 'en_q6_o1',
      en_q7: 'en_q7_o1',
      en_q8: 'en_q8_o1',
      en_q9: 'en_q9_o1',
      en_q10: 'en_q10_o1',
      en_q11: 'en_q11_o1',
      en_q12: 'en_q12_o1',
      en_q13: 'en_q13_o1',
      en_q14: 'en_q14_o1',
      en_q15: 'en_q15_o1',
    };
    const enneagramRes = runAndBuildEnneagramResult(clientA, archiveA, enneagramAns);
    saveClientTestResult(clientA.id, enneagramRes);

    const totemAns: Record<string, string> = {
      tot_q1: 'tot_q1_o1',
      tot_q2: 'tot_q2_o1',
      tot_q3: 'tot_q3_o1',
      tot_q4: 'tot_q4_o1',
      tot_q5: 'tot_q5_o1',
      tot_q6: 'tot_q6_o1',
      tot_q7: 'tot_q7_o1',
      tot_q8: 'tot_q8_o1',
      tot_q9: 'tot_q9_o1',
      tot_q10: 'tot_q10_o1',
    };
    const totemRes = runAndBuildTotemResult(clientA, archiveA, totemAns);
    saveClientTestResult(clientA.id, totemRes);

    // Güncel arşivle A15 reçetesi üretiliyor
    const updatedArchiveA = getClientArchive(clientA.id);
    const recipeResult = generateClientRecipe(clientA, updatedArchiveA, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 12, height: 18 },
      colorPreference: 'MONOCHROME_BLACK',
      primarySymbol: 'Yaşam Çiçeği',
      selectedSymbols: ['Sri Yantra'],
      excludedSymbols: ['Yılan'],
      includeTotemInVisual: true,
      customNotes: 'A40 Akış Doğrulama Tasarımı',
    });

    assert.equal(recipeResult.success, true);
    assert.ok(recipeResult.design);

    // A16 Görsel istemi sentezleniyor
    const promptOutput = generateUnifiedVisualPrompt({
      clientId: clientA.id,
      clientFullName: `${clientA.firstName} ${clientA.lastName}`,
      motherName: clientA.motherName,
      recipe: recipeResult.design.recipe,
      selectedSymbols: [
        { symbolId: 'sym-1', symbolName: 'Yaşam Çiçeği', customMeaning: 'Evrensel Uyum', weight: 'PRIMARY' },
        { symbolId: 'sym-2', symbolName: 'Sri Yantra', customMeaning: 'Bolluk', weight: 'SECONDARY' },
      ],
      recommendedSymbols: [],
      excludedSymbols: ['Yılan'],
      style: recipeResult.design.recipe.style,
      placement: recipeResult.design.recipe.recommendedPlacement,
      colorProfile: recipeResult.design.recipe.colorProfile,
      includeTotemInVisual: true,
      totemName: totemRes.primaryType,
    });

    assert.ok(promptOutput.primaryPromptEn, 'İngilizce AI istemi üretilmelidir');
    assert.ok(promptOutput.conceptPromptTr, 'Türkçe konsept manifestosu üretilmelidir');
    assert.ok(!promptOutput.primaryPromptEn.includes('Fatma'), 'Anne adı asla isteme sızmamalıdır');

    // Tasarımı arşive kaydet
    const finalDesign = {
      ...recipeResult.design,
      aiPrompt: {
        ...recipeResult.design.aiPrompt,
        primaryPromptEn: promptOutput.primaryPromptEn,
        conceptPromptTr: promptOutput.conceptPromptTr,
        negativePrompt: promptOutput.negativePrompt,
      },
    };
    saveClientDesign(clientA.id, finalDesign);

    // Arşiv kontrolü
    const finalArchiveA = getClientArchive(clientA.id);
    assert.equal(finalArchiveA?.designs.length, 1);
    assert.equal(finalArchiveA?.designs[0]?.clientId, clientA.id);
    assert.equal(finalArchiveA?.designs[0]?.versionNumber, 1);

    // Danışan B nin arşivinde tasarım OLMAMALIDIR
    const archiveB = getClientArchive(clientB.id);
    assert.equal(archiveB?.designs.length, 0, 'Danışan B de tasarım bulunmamalıdır');
  });

  // 12. Test: Danışan dosyasının başka danışanın verisini içermemesi
  it('12. Danışan dosyası dışa aktarıldığında (.txt / .json) diğer danışanlara ait hiçbir veri içermemelidir', () => {
    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    const dossierTextA = generateClientDossierText(clientA, archiveA);
    const dossierJsonA = generateClientDossierJson(clientA, archiveA);

    // Danışan A kontrolü
    assert.ok(dossierTextA.includes('Elif Demir'));
    assert.ok(dossierTextA.includes(clientA.id));
    assert.ok(!dossierTextA.includes('Zeynep Kaya'), 'A danışanının dosyasında B danışanı yer alamaz');
    assert.ok(!dossierTextA.includes(clientB.id));

    // Danışan B kontrolü
    const dossierTextB = generateClientDossierText(clientB, archiveB);
    assert.ok(dossierTextB.includes('Zeynep Kaya'));
    assert.ok(dossierTextB.includes(clientB.id));
    assert.ok(!dossierTextB.includes('Elif Demir'), 'B danışanının dosyasında A danışanı yer alamaz');
    assert.ok(!dossierTextB.includes(clientA.id));

    // JSON format kontrolü
    const parsedA: any = typeof dossierJsonA === 'string' ? JSON.parse(dossierJsonA) : dossierJsonA;
    assert.equal(parsedA.client.id, clientA.id);
    assert.equal(parsedA.client.firstName, 'Elif');
  });
});
