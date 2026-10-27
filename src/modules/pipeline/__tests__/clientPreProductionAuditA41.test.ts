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
  getSafeStorage,
  saveClientTestResult,
  saveClientDesign,
  STORAGE_KEYS,
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

describe('A41 — Gerçek Danışan Öncesi Son Sistem Kontrolü Test Paketi', () => {
  // Test öncesi temiz başlangıç
  clearAllApplicationData();

  const mockClientAData = {
    firstName: 'Deniz',
    lastName: 'Acar',
    email: 'deniz.acar@example.com',
    phone: '05301112233',
    birthDate: '1990-04-12',
    birthTime: '09:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      countryCode: 'TR',
      city: 'İzmir',
      placeName: 'İzmir, Türkiye',
      latitude: 38.4237,
      longitude: 27.1428,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülten',
    notes: 'A41 Doğrulama Danışanı A',
  };

  const mockClientBData = {
    firstName: 'Barış',
    lastName: 'Yılmaz',
    email: 'baris.yilmaz@example.com',
    phone: '05409998877',
    birthDate: '1985-08-25',
    birthTime: '',
    isBirthTimeUnknown: true,
    birthLocation: {
      country: 'Türkiye',
      countryCode: 'TR',
      city: 'Bursa',
      placeName: 'Bursa, Türkiye',
      latitude: 40.1885,
      longitude: 29.0610,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Nermin',
    notes: 'A41 Doğrulama Danışanı B',
  };

  let clientA: Client;
  let clientB: Client;

  // 1. Yeni danışan kaydı ve otomatik pipeline tetiklenmesi
  it('1. Yeni danışan kaydı sonrası pipeline tetiklenmeli ve 4 temel analiz aynı clientId ile üretilmelidir', () => {
    clientA = createClientRecord(mockClientAData, 'CLIENT_FORM');
    setStoredActiveClientId(clientA.id);

    assert.ok(clientA.id.startsWith('client_'));
    assert.equal(getStoredActiveClientId(), clientA.id);

    const pipelineRes = runClientAutoAnalysisChain(clientA);
    assert.equal(pipelineRes.clientId, clientA.id);
    assert.equal(pipelineRes.numerologyRan, true);
    assert.equal(pipelineRes.astrologyRan, true);
    assert.equal(pipelineRes.chakraRan, true);
    assert.equal(pipelineRes.archetypeRan, true);
    assert.equal(pipelineRes.errors.length, 0);

    const archiveA = getClientArchive(clientA.id);
    assert.ok(archiveA);
    assert.equal(archiveA.analyses.length, 1);
    assert.equal(archiveA.analyses[0].clientId, clientA.id);
    assert.ok(archiveA.analyses[0].numerology);
    assert.ok(archiveA.analyses[0].astrology);
    assert.ok(archiveA.analyses[0].chakra);
    assert.ok(archiveA.analyses[0].archetype);
  });

  // 2. Pipeline sonrası aktif danışanın ve danışan kimliğinin korunması
  it('2. Pipeline çalıştırıldıktan sonra aktif danışan ID si korunmalı ve diğer danışanların üzerine yazılmamalıdır', () => {
    assert.equal(getStoredActiveClientId(), clientA.id);

    const clientsBefore = getStoredClients();
    clientB = createClientRecord(mockClientBData, 'CLIENT_FORM');
    const clientsAfter = getStoredClients();

    assert.equal(clientsAfter.length, clientsBefore.length + 1);
    assert.notEqual(clientA.id, clientB.id);
    assert.ok(clientsAfter.some((c) => c.id === clientA.id));
    assert.ok(clientsAfter.some((c) => c.id === clientB.id));
  });

  // 3. Dört temel analiz sonucunun aynı clientId'ye ait olması ve veri izolasyonu
  it('3. Danışan B nin otomatik analizleri Danışan A ya sızmamalı ve her biri kendi clientId sine ait olmalıdır', () => {
    setStoredActiveClientId(clientB.id);
    const pipelineResB = runClientAutoAnalysisChain(clientB);
    assert.equal(pipelineResB.clientId, clientB.id);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.ok(archiveA);
    assert.ok(archiveB);
    assert.equal(archiveA.client.id, clientA.id);
    assert.equal(archiveB.client.id, clientB.id);

    // Astroloji burç kontrolleri (Deniz Acar = Koç Güneş, Barış Yılmaz = Başak Güneş)
    assert.equal(archiveA.analyses[0].astrology?.sunSign, 'Aries');
    assert.equal(archiveB.analyses[0].astrology?.sunSign, 'Virgo');

    // Danışan A nın saati biliniyor (Yükselen hesaplandı), Danışan B nin saati belirsiz (Yükselen undefined)
    assert.ok(archiveA.analyses[0].astrology?.ascendantSign);
    assert.equal(archiveB.analyses[0].astrology?.ascendantSign, undefined);
  });

  // 4. Danışan A -> B geçişinde tüm çalışma zincirinin izolasyonu
  it('4. Danışan A dan B ye geçiş yapıldığında sonuçlar, testler ve arşiv tamamen B ye ait olmalıdır', () => {
    // Danışan A ya test ekleyelim
    const archiveA = getClientArchive(clientA.id);
    const enneagramAns = {
      en_q1: 'en_q1_o1', en_q2: 'en_q2_o1', en_q3: 'en_q3_o1', en_q4: 'en_q4_o1', en_q5: 'en_q5_o1',
      en_q6: 'en_q6_o1', en_q7: 'en_q7_o1', en_q8: 'en_q8_o1', en_q9: 'en_q9_o1', en_q10: 'en_q10_o1',
      en_q11: 'en_q11_o1', en_q12: 'en_q12_o1', en_q13: 'en_q13_o1', en_q14: 'en_q14_o1', en_q15: 'en_q15_o1',
    };
    const ennRes = runAndBuildEnneagramResult(clientA, archiveA, enneagramAns);
    saveClientTestResult(clientA.id, ennRes);

    // Danışan B ye geç
    setStoredActiveClientId(clientB.id);
    const currentActiveId = getStoredActiveClientId();
    assert.equal(currentActiveId, clientB.id);

    const activeArchive = getClientArchive(currentActiveId);
    assert.ok(activeArchive);
    assert.equal(activeArchive.client.id, clientB.id);

    // Danışan B de henüz Enneagram çözülmedi: hasRecord false olmalı
    const ennCardB = getEnneagramCardData(clientB, activeArchive);
    assert.equal(ennCardB.hasRecord, false);

    const chainReportB = getClientAnalysisChainStatus(clientB, activeArchive);
    assert.equal(chainReportB.tests.enneagram.status, 'Test hazır');
    assert.equal(chainReportB.tests.totem.status, 'Test hazır');
  });

  // 5. Sayfa/uygulama yeniden yükleme sonrasında aktif danışan durumunun korunması
  it('5. Sayfa yenilendiğinde storedActiveClientId ve ilişkili arşiv kaydı doğru şekilde geri yüklenmelidir', () => {
    // Simüle edilen sayfa yenileme: State sıfırlanıp sadece storage okunuyor
    const restoredActiveId = getStoredActiveClientId();
    assert.ok(restoredActiveId);
    assert.equal(restoredActiveId, clientB.id);

    const allClients = getStoredClients();
    const restoredClient = allClients.find((c) => c.id === restoredActiveId);
    assert.ok(restoredClient);
    assert.equal(restoredClient.id, clientB.id);
    assert.equal(restoredClient.firstName, 'Barış');

    const restoredArchive = getClientArchive(restoredActiveId);
    assert.ok(restoredArchive);
    assert.equal(restoredArchive.client.id, clientB.id);
  });

  // 6. Export'un storage'ı değiştirmemesi ve mutasyona uğratmaması
  it('6. Danışan dosyası (.txt / .json) dışa aktarımı mevcut storage kayıtlarını asla mutasyona uğratmamalıdır', () => {
    const archiveA = getClientArchive(clientA.id);

    // Storage ın anlık kopyası
    const clientsRawBefore = JSON.stringify(getSafeStorage(STORAGE_KEYS.CLIENTS, []));
    const analysesRawBefore = JSON.stringify(getSafeStorage(STORAGE_KEYS.ANALYSES, []));
    const testsRawBefore = JSON.stringify(getSafeStorage(STORAGE_KEYS.TESTS, []));
    const designsRawBefore = JSON.stringify(getSafeStorage(STORAGE_KEYS.DESIGNS, []));

    // Export çalıştır
    const txtOutput = generateClientDossierText(clientA, archiveA);
    const jsonOutput = generateClientDossierJson(clientA, archiveA);

    assert.ok(txtOutput.length > 100);
    assert.ok(jsonOutput);

    // Storage ın export sonrası hali
    const clientsRawAfter = JSON.stringify(getSafeStorage(STORAGE_KEYS.CLIENTS, []));
    const analysesRawAfter = JSON.stringify(getSafeStorage(STORAGE_KEYS.ANALYSES, []));
    const testsRawAfter = JSON.stringify(getSafeStorage(STORAGE_KEYS.TESTS, []));
    const designsRawAfter = JSON.stringify(getSafeStorage(STORAGE_KEYS.DESIGNS, []));

    assert.equal(clientsRawBefore, clientsRawAfter, 'Clients storage ı değişmemelidir');
    assert.equal(analysesRawBefore, analysesRawAfter, 'Analyses storage ı değişmemelidir');
    assert.equal(testsRawBefore, testsRawAfter, 'Tests storage ı değişmemelidir');
    assert.equal(designsRawBefore, designsRawAfter, 'Designs storage ı değişmemelidir');
  });

  // 7. A15/A16 ön koşullarının korunması ve anne adının görsel isteme sızmaması
  it('7. A15 ve A16 motorları ön koşulları korumalı; anne adı istem veya konsept manifestosuna asla sızmamalıdır', () => {
    const archiveA = getClientArchive(clientA.id);

    // A15 Reçete üretimi
    const recipeRes = generateClientRecipe(clientA, archiveA, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'FOREARM_INNER',
      customDimensions: { width: 14, height: 20 },
      colorPreference: 'MONOCHROME_BLACK',
      primarySymbol: 'Yaşam Çiçeği',
      selectedSymbols: ['Metatron Küpü'],
      excludedSymbols: ['Yılan'],
      customNotes: 'A41 Güvenlik Testi',
    });

    assert.equal(recipeRes.success, true);
    assert.ok(recipeRes.design);
    saveClientDesign(clientA.id, recipeRes.design);

    // A16 Görsel istem üretimi
    const promptRes = generateUnifiedVisualPrompt({
      clientId: clientA.id,
      clientFullName: `${clientA.firstName} ${clientA.lastName}`,
      motherName: clientA.motherName, // Gülten
      recipe: recipeRes.design.recipe,
      selectedSymbols: [
        { symbolId: 'sym-1', symbolName: 'Yaşam Çiçeği', customMeaning: 'Evrensel Geometri', weight: 'PRIMARY' },
      ],
      recommendedSymbols: [],
      excludedSymbols: ['Yılan'],
      style: recipeRes.design.recipe.style,
      placement: recipeRes.design.recipe.recommendedPlacement,
      colorProfile: recipeRes.design.recipe.colorProfile,
    });

    // Anne adı güvenliği denetimi
    assert.ok(
      !promptRes.primaryPromptEn.toLowerCase().includes('gülten') &&
      !promptRes.primaryPromptEn.toLowerCase().includes('gulten'),
      'Anne adı İngilizce AI prompta asla giremez'
    );
    assert.ok(
      !promptRes.conceptPromptTr.toLowerCase().includes('gülten') &&
      !promptRes.conceptPromptTr.toLowerCase().includes('gulten'),
      'Anne adı Türkçe konsept metnine asla giremez'
    );
  });
});
