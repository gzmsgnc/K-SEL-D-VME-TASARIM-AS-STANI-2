import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createClientRecord,
  updateClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientAstrologyChart,
  saveClientSymbolAnalysis,
  saveClientDesign,
  saveClientTestResult,
  clearAllApplicationData,
} from '../../../store/storage';
import {
  calculateClientNumerology,
  isNumerologyStale,
  getStoredNumerology,
} from '../index';
import { calculateClientTropicalChart, isAstrologyChartStale } from '../../astrology';
import { hasActualModuleResults } from '../../../core/clientDataAdapter';
import { getClientAnalysisChainStatus } from '../../pipeline/clientAnalysisPipeline';
import { getNumerologyCardData, getChakraCardData, getArchetypeCardData } from '../../../utils/analysisResultsFormatters';
import { ClientFormData } from '../../../types/client';

function createSampleClientData(suffix: string): ClientFormData {
  return {
    firstName: `Can_${suffix}`,
    lastName: `Demir_${suffix}`,
    email: `can_${suffix.toLowerCase()}@example.com`,
    phone: '5551234567',
    birthDate: '1992-04-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      city: 'Ankara',
      placeName: 'Ankara, Türkiye',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'Numeroloji stale regresyon testi',
  };
}

describe('A64: Numeroloji Stale Data Onarımı ve Regresyon Testleri', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  // --------------------------------------------------------------------------
  // 1. İsim Değişikliği (firstName)
  // --------------------------------------------------------------------------
  it('1. Ad (firstName) değiştiğinde numeroloji ve bağlı analizler geçersiz kılınmalı, astroloji korunmalıdır', () => {
    const client = createClientRecord(createSampleClientData('NameTest'), 'OWNER_MANUAL');

    // Analizleri hesapla ve kaydet
    const numRes = calculateClientNumerology(client);
    assert.ok(numRes.success && numRes.numerology);
    saveClientNumerology(client.id, numRes.numerology);

    const astroRes = calculateClientTropicalChart(client);
    assert.ok(astroRes.success && astroRes.chart);
    saveClientAstrologyChart(client.id, astroRes.chart);

    saveClientChakra(client.id, {
      dominantChakra: 'ROOT',
      primaryDeficit: 'THROAT',
      chakras: [{ chakra: 'ROOT', score: 8, status: 'BALANCED', focusRecommendations: ['Topraklanma'] }],
    });

    saveClientArchetype(client.id, {
      unifiedArchetype: { primary: 'WARRIOR', secondary: 'SAGE', description: '' },
      shadowArchetype: { shadowName: 'DESTROYER', transformationalSymbol: 'PHOENIX' },
    });

    saveClientTestResult(client.id, {
      id: 'test_1',
      clientId: client.id,
      testType: 'ENNEAGRAM',
      version: 1,
      answers: [],
      dominantScores: { Type8: 10 },
      primaryType: 'Tip 8',
      interpretations: ['Güçlü irade'],
      completedAt: new Date().toISOString(),
    });

    let archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), true);
    assert.equal(hasActualModuleResults(archive, 'CHAKRA'), true);
    assert.equal(hasActualModuleResults(archive, 'ARCHETYPE'), true);
    assert.equal(hasActualModuleResults(archive, 'ASTROLOGY'), true);

    // Danışanın ADINI değiştir
    const updatedClient = {
      ...client,
      firstName: 'Kaan_NameTest',
    };
    updateClientRecord(updatedClient);

    // Doğrulamalar:
    archive = getClientArchive(client.id);
    const storedNum = getStoredNumerology(archive, client.id);

    // a) Numeroloji temizlenmiş olmalı ve getStoredNumerology null dönmeli
    assert.equal(storedNum, null, 'Eski numeroloji arşive sızmamalı, getStoredNumerology null dönmeli');
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), false, 'hasActualModuleResults false olmalı');

    // b) Çakra ve Arketip geçersizleşmiş olmalı
    assert.equal(hasActualModuleResults(archive, 'CHAKRA'), false, 'Numeroloji geçersiz olduğunda çakra da geçersiz olmalı');
    assert.equal(hasActualModuleResults(archive, 'ARCHETYPE'), false, 'Numeroloji geçersiz olduğunda arketip de geçersiz olmalı');

    // c) Astroloji haritası KORUNMALI (çünkü doğum tarihi/saati/yeri değişmedi)
    assert.equal(hasActualModuleResults(archive, 'ASTROLOGY'), true, 'İsim değişikliğinde astroloji silinmemeli');

    // d) Enneagram testi KORUNMALI (bağımsız soru formu)
    assert.equal(hasActualModuleResults(archive, 'TESTS'), true, 'Test sonuçları silinmemeli');

    // e) Formatter sonuçları hasRecord: false vermeli
    const numCard = getNumerologyCardData(updatedClient, archive);
    assert.equal(numCard.hasRecord, false);
    assert.ok(numCard.sourceNoteTr.includes('geçersizdir') || numCard.sourceNoteTr.includes('bulunmuyor'));

    // f) Pipeline durum değerlendirmesi 'Eksik veri' veya 'Kayıt bulunmuyor' vermeli
    const pipeStatus = getClientAnalysisChainStatus(updatedClient, archive);
    assert.notEqual(pipeStatus.modules.numerology.status, 'Tamamlandı');
  });

  // --------------------------------------------------------------------------
  // 2. Soyadı Değişikliği (lastName)
  // --------------------------------------------------------------------------
  it('2. Soyad (lastName) değiştiğinde numeroloji geçersiz kılınmalı ve diğer danışanlar etkilenmemelidir', () => {
    const client = createClientRecord(createSampleClientData('LastNameTest'), 'OWNER_MANUAL');

    const numRes = calculateClientNumerology(client);
    saveClientNumerology(client.id, numRes.numerology!);

    let archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), true);

    // Soyadını değiştir
    const updatedClient = {
      ...client,
      lastName: 'Kaya_LastNameTest',
    };
    updateClientRecord(updatedClient);

    archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), false);
    assert.equal(getStoredNumerology(archive, client.id), null);
  });

  // --------------------------------------------------------------------------
  // 3. Doğum Tarihi Değişikliği (birthDate)
  // --------------------------------------------------------------------------
  it('3. Doğum tarihi değiştiğinde hem numeroloji hem de astroloji geçersiz kılınmalıdır', () => {
    const client = createClientRecord(createSampleClientData('BirthDateTest'), 'OWNER_MANUAL');

    const numRes = calculateClientNumerology(client);
    saveClientNumerology(client.id, numRes.numerology!);

    const astroRes = calculateClientTropicalChart(client);
    saveClientAstrologyChart(client.id, astroRes.chart!);

    let archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), true);
    assert.equal(hasActualModuleResults(archive, 'ASTROLOGY'), true);

    // Doğum tarihini değiştir
    const updatedClient = {
      ...client,
      birthDate: '1995-11-20',
    };
    updateClientRecord(updatedClient);

    archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), false, 'Doğum tarihi değişince numeroloji geçersiz olmalı');
    assert.equal(hasActualModuleResults(archive, 'ASTROLOGY'), false, 'Doğum tarihi değişince astroloji de geçersiz olmalı');
  });

  // --------------------------------------------------------------------------
  // 4. Danışan İzolasyonu (Cross-client isolation)
  // --------------------------------------------------------------------------
  it('4. Bir danışanın adı değiştiğinde diğer danışanların verilerine kesinlikle dokunulmamalıdır', () => {
    const clientA = createClientRecord(createSampleClientData('ClientA'), 'OWNER_MANUAL');
    const clientB = createClientRecord(createSampleClientData('ClientB'), 'OWNER_MANUAL');

    // Her iki danışana da numeroloji ve astroloji kaydet
    const numA = calculateClientNumerology(clientA);
    saveClientNumerology(clientA.id, numA.numerology!);

    const numB = calculateClientNumerology(clientB);
    saveClientNumerology(clientB.id, numB.numerology!);

    let archiveA = getClientArchive(clientA.id);
    let archiveB = getClientArchive(clientB.id);

    assert.equal(hasActualModuleResults(archiveA, 'NUMEROLOGY'), true);
    assert.equal(hasActualModuleResults(archiveB, 'NUMEROLOGY'), true);

    // Yalnızca Client A'nın adını değiştir
    const updatedA = { ...clientA, firstName: 'Mehmet_ClientA' };
    updateClientRecord(updatedA);

    archiveA = getClientArchive(clientA.id);
    archiveB = getClientArchive(clientB.id);

    // Client A geçersiz olmalı
    assert.equal(hasActualModuleResults(archiveA, 'NUMEROLOGY'), false);

    // Client B'nin verileri KESİNTİSİZ KORUNMALIDIR
    assert.equal(hasActualModuleResults(archiveB, 'NUMEROLOGY'), true, 'Client B numerolojisi korunmalıdır');
    const storedB = getStoredNumerology(archiveB, clientB.id);
    assert.ok(storedB, 'Client B verisi null olmamalıdır');
    assert.equal(storedB?.lifePathNumber, numB.numerology?.lifePathNumber);
  });

  // --------------------------------------------------------------------------
  // 5. Yeniden Hesaplama Döngüsü (Recomputation Cycle)
  // --------------------------------------------------------------------------
  it('5. Girdi değiştikten sonra yeniden hesaplama yapıldığında sonuçlar başarıyla güncellenmeli ve geçerli olmalıdır', () => {
    const client = createClientRecord(createSampleClientData('RecomputeTest'), 'OWNER_MANUAL');

    // İlk hesaplama
    const oldNum = calculateClientNumerology(client);
    saveClientNumerology(client.id, oldNum.numerology!);

    // İsmi değiştir
    const updatedClient = { ...client, firstName: 'Zeynep_RecomputeTest' };
    updateClientRecord(updatedClient);

    let archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), false);

    // Yeni isme göre tekrar hesapla
    const newNum = calculateClientNumerology(updatedClient);
    assert.ok(newNum.success && newNum.numerology);
    saveClientNumerology(updatedClient.id, newNum.numerology);

    archive = getClientArchive(client.id);
    assert.equal(hasActualModuleResults(archive, 'NUMEROLOGY'), true);

    const storedNew = getStoredNumerology(archive, updatedClient.id);
    assert.ok(storedNew);
    assert.equal(isNumerologyStale(storedNew, updatedClient), false);

    // Kart formatlayıcı da geçerli sonucu göstermeli
    const cardData = getNumerologyCardData(updatedClient, archive);
    assert.equal(cardData.hasRecord, true);
    assert.equal(cardData.destinyNumber, newNum.numerology.destinyNumber);
  });

  // --------------------------------------------------------------------------
  // 6. isNumerologyStale Doğrudan Fonksiyonel Sınır Testleri
  // --------------------------------------------------------------------------
  it('6. isNumerologyStale fonksiyonu whitespace, harf büyüklüğü ve eksik veri durumlarını doğru tespit etmelidir', () => {
    const client = createClientRecord(createSampleClientData('BoundaryTest'), 'OWNER_MANUAL');
    const num = calculateClientNumerology(client).numerology!;

    // Tam eşleşme: bayat değil
    assert.equal(isNumerologyStale(num, client), false);

    // Boşluk toleransı (Ad sonundaki gereksiz boşluk hesaplamayı geçersiz kılmamalı)
    const clientWithSpace = { ...client, firstName: `${client.firstName} ` };
    assert.equal(isNumerologyStale(num, clientWithSpace), false);

    // Farklı harf büyüklüğü (CAN vs Can) - Pisagor büyük/küçük harf bağımsızdır
    const clientUpper = { ...client, firstName: client.firstName.toUpperCase() };
    assert.equal(isNumerologyStale(num, clientUpper), false);

    // Gerçek karakter farkı
    const clientDiff = { ...client, firstName: 'FarkliIsim' };
    assert.equal(isNumerologyStale(num, clientDiff), true);

    // Null veya undefined kontrolleri
    assert.equal(isNumerologyStale(null, client), true);
    assert.equal(isNumerologyStale(num, null), true);
  });
});
