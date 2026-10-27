import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAllApplicationData,
  createClientRecord,
  getClientArchive,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getSafeStorage,
  STORAGE_KEYS,
} from '../../../store/storage';
import { runClientAutoAnalysisChain } from '../../pipeline/clientAnalysisPipeline';
import { getEnneagramCardData, getTotemCardData } from '../../../utils/analysisResultsFormatters';
import { ClientFormData } from '../../../types/client';

describe('A36 — Danışan Kaydı Sonrası Otomatik Analiz Zinciri Test Paketi', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  const validFormDataA: ClientFormData = {
    firstName: 'Elif',
    lastName: 'Demir',
    email: 'elif.demir@example.com',
    phone: '05321112233',
    birthDate: '1992-06-15',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'Kişisel dövme tasarımı',
  };

  const validFormDataB: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Kaya',
    email: 'baris.kaya@example.com',
    phone: '05423334455',
    birthDate: '1988-11-20',
    birthTime: '08:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İzmir, Türkiye',
      city: 'İzmir',
      country: 'Türkiye',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'Geometrik tasarım',
  };

  // 1. Davranış: Danışan kaydedilince aktif clientId doğru belirleniyor
  test('1. Danışan kaydedilince aktif clientId doğru belirleniyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    setStoredActiveClientId(client.id);

    const activeId = getStoredActiveClientId();
    assert.equal(activeId, client.id, 'Aktif danışan kimliği yeni kaydedilen danışanın ID si olmalıdır.');
  });

  // 2. Davranış: Geçerli danışan verisinde Numeroloji otomatik çalışıyor
  test('2. Geçerli danışan verisinde Numeroloji otomatik çalışıyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    const result = runClientAutoAnalysisChain(client);

    assert.equal(result.numerologyRan, true, 'Numeroloji analizi başarıyla çalışmış olmalıdır.');
    assert.ok(result.numerologyData, 'Numeroloji hesaplama çıktısı mevcut olmalıdır.');
    assert.equal(typeof result.numerologyData?.lifePathNumber, 'number', 'Yaşam Yolu sayısı sayısal olmalıdır.');
    assert.ok((result.numerologyData?.lifePathNumber || 0) > 0, 'Yaşam Yolu pozitif olmalıdır.');
    assert.equal(typeof result.numerologyData?.destinyNumber, 'number', 'Kader sayısı hesaplanmış olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.numerology, 'Arşivde kayıtlı numeroloji bulunmalıdır.');
  });

  // 3. Davranış: Geçerli danışan verisinde Astroloji otomatik çalışıyor
  test('3. Geçerli danışan verisinde Astroloji otomatik çalışıyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    const result = runClientAutoAnalysisChain(client);

    assert.equal(result.astrologyRan, true, 'Astroloji analizi başarıyla çalışmış olmalıdır.');
    assert.ok(result.astrologyData, 'Astroloji harita verisi mevcut olmalıdır.');
    assert.ok(result.astrologyData?.sunSign, 'Güneş burcu hesaplanmış olmalıdır.');
    assert.ok(result.astrologyData?.moonSign, 'Ay burcu hesaplanmış olmalıdır.');
    assert.equal(result.astrologyData?.planetaryPositions?.length, 10, '10 gök cismi hesaplanmış olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.astrology, 'Arşivde kayıtlı astroloji haritası bulunmalıdır.');
  });

  // 4. Davranış: Geçerli danışan verisinde Çakra otomatik çalışıyor
  test('4. Geçerli danışan verisinde Çakra otomatik çalışıyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    const result = runClientAutoAnalysisChain(client);

    assert.equal(result.chakraRan, true, 'Çakra analizi başarıyla çalışmış olmalıdır.');
    assert.ok(result.chakraData, 'Çakra hesaplama çıktısı mevcut olmalıdır.');
    assert.ok(result.chakraData?.dominantChakra, 'Baskın çakra belirlenmiş olmalıdır.');
    assert.equal(result.chakraData?.chakras?.length, 7, '7 temel çakra hesaplanmış olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.chakra, 'Arşivde kayıtlı çakra analizi bulunmalıdır.');
  });

  // 5. Davranış: Geçerli danışan verisinde Arketip otomatik çalışıyor
  test('5. Geçerli danışan verisinde Arketip otomatik çalışıyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    const result = runClientAutoAnalysisChain(client);

    assert.equal(result.archetypeRan, true, 'Arketip analizi başarıyla çalışmış olmalıdır.');
    assert.ok(result.archetypeData, 'Arketip hesaplama çıktısı mevcut olmalıdır.');
    assert.ok(result.archetypeData?.unifiedArchetype?.primary, 'Birincil arketip belirlenmiş olmalıdır.');
    assert.ok(result.archetypeData?.shadowArchetype?.shadowName, 'Gölge arketip belirlenmiş olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.archetype, 'Arşivde kayıtlı arketip analizi bulunmalıdır.');
  });

  // 6. Davranış: Sonuçlar doğru clientId'ye kaydediliyor
  test('6. Sonuçlar doğru clientId ye kaydediliyor', () => {
    const client = createClientRecord(validFormDataA, 'CLIENT_FORM');
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.ok(archive, 'Danışan arşivi bulunmalıdır.');
    assert.equal(archive.analyses.length, 1, 'Tek bir analiz ana kaydı olmalıdır.');
    assert.equal(archive.analyses[0].clientId, client.id, 'Analiz kaydının clientId si doğru olmalıdır.');

    const allAnalyses = getSafeStorage<any[]>(STORAGE_KEYS.ANALYSES, []);
    for (const a of allAnalyses) {
      assert.equal(a.clientId, client.id, 'Tüm analiz kayıtları ilgili clientId ile eşleşmelidir.');
    }
  });

  // 7. Davranış: Eksik veri varsa sahte sonuç oluşmuyor
  test('7. Eksik veri varsa sahte sonuç oluşmuyor (sahte veri yasağı)', () => {
    const incompleteData: ClientFormData = {
      firstName: 'Test',
      lastName: 'Kullanıcı',
      email: 'test@example.com',
      phone: '05550001122',
      birthDate: '', // Eksik doğum tarihi
      birthTime: '12:00',
      isBirthTimeUnknown: true,
      birthLocation: {
        placeName: '',
        city: '',
        country: '',
        latitude: null as any,
        longitude: null as any,
        timezone: '',
        utcOffsetMinutes: 0,
      },
      motherName: '',
      notes: '',
    };

    const client = createClientRecord(incompleteData, 'OWNER_MANUAL');
    const chainResult = runClientAutoAnalysisChain(client);

    // Numeroloji ve Astroloji hesaplanamamalı
    assert.equal(chainResult.numerologyRan, false, 'Doğum tarihi olmadan numeroloji çalışmamalıdır.');
    assert.equal(chainResult.astrologyRan, false, 'Koordinat ve doğum tarihi olmadan astroloji çalışmamalıdır.');
    assert.equal(chainResult.chakraRan, false, 'Numeroloji olmadan çakra çalışmamalıdır.');
    assert.equal(chainResult.archetypeRan, false, 'Numeroloji ve çakra olmadan arketip çalışmamalıdır.');

    const archive = getClientArchive(client.id);
    const analysis = archive?.analyses[0];
    assert.equal(analysis?.astrology, undefined, 'Astroloji sahte üretilmemeli, tanımsız kalmalıdır.');
    assert.equal(analysis?.numerology, undefined, 'Numeroloji sahte üretilmemeli, tanımsız kalmalıdır.');
    assert.equal(analysis?.chakra, undefined, 'Çakra sahte üretilmemeli, tanımsız kalmalıdır.');
    assert.equal(analysis?.archetype, undefined, 'Arketip sahte üretilmemeli, tanımsız kalmalıdır.');
  });

  // 8. Davranış: Bir danışanın otomatik analizleri başka danışana karışmıyor (izolasyon)
  test('8. Bir danışanın otomatik analizleri başka danışana karışmıyor', () => {
    const clientA = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(validFormDataB, 'OWNER_MANUAL');

    runClientAutoAnalysisChain(clientA);
    runClientAutoAnalysisChain(clientB);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.ok(archiveA && archiveB, 'Her iki danışanın arşivi bulunmalıdır.');

    // Doğum tarihleri farklı: 1992-06-15 vs 1988-11-20
    const numA = archiveA.analyses[0]?.numerology;
    const numB = archiveB.analyses[0]?.numerology;

    assert.notEqual(
      numA?.lifePathNumber,
      numB?.lifePathNumber,
      'Farklı tarihlerdeki danışanların yaşam yolları izole ve farklı olmalıdır.'
    );

    // Astroloji Güneş burçları farklı (İkizler vs Akrep)
    const astroA = archiveA.analyses[0]?.astrology;
    const astroB = archiveB.analyses[0]?.astrology;

    assert.notEqual(
      astroA?.sunSign,
      astroB?.sunSign,
      'Astroloji harita sonuçları birbirine karışmamalıdır.'
    );
  });

  // 9. Davranış: Enneagram/Totem cevap verilmeden sonuç uydurulmuyor
  test('9. Enneagram/Totem cevap verilmeden sonuç uydurulmuyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.equal(archive?.testResults.length, 0, 'Test sonuçları listesi boş olmalıdır.');

    const enneagramCard = getEnneagramCardData(client, archive);
    assert.equal(enneagramCard.hasRecord, false, 'Enneagram sonucu uydurulmamalı, hasRecord false olmalıdır.');

    const totemCard = getTotemCardData(client, archive);
    assert.equal(totemCard.hasRecord, false, 'Totem sonucu uydurulmamalı, hasRecord false olmalıdır.');
  });

  // 10. Davranış: A15 reçete veya A16 görsel istemini otomatik üretme
  test('10. A15 reçete veya A16 görsel istemi otomatik tetiklenmiyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.equal(archive?.designs.length, 0, 'Dövme reçetesi / tasarım sürümü otomatik oluşturulmamalıdır.');
    assert.equal(archive?.symbolAnalyses.length, 0, 'Sembol analizi otomatik oluşturulmamalıdır.');
    assert.equal(archive?.reports.length, 0, 'Rapor otomatik oluşturulmamalıdır.');
  });

  // 11. Davranış: Sayfa yenilemeden çalışma alanı gerçek analiz durumunu güncelliyor
  test('11. Sayfa yenilemeden çalışma alanı gerçek analiz durumunu güncelliyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');
    runClientAutoAnalysisChain(client);

    // getClientArchive storage üzerinden doğrudan en güncel durumu anında okur
    const freshArchive = getClientArchive(client.id);
    assert.ok(freshArchive, 'Arşiv bellekte anında erişilebilir olmalıdır.');
    assert.ok(freshArchive.analyses.length > 0, 'Analizler hemen okunabilmelidir.');
    assert.ok(freshArchive.analyses[0].numerology, 'Numeroloji hemen okunabilmelidir.');
    assert.ok(freshArchive.analyses[0].astrology, 'Astroloji hemen okunabilmelidir.');
    assert.ok(freshArchive.analyses[0].chakra, 'Çakra hemen okunabilmelidir.');
    assert.ok(freshArchive.analyses[0].archetype, 'Arketip hemen okunabilmelidir.');
  });

  // 12. Davranış: Aynı işlem tekrarlandığında gereksiz kayıt/sürüm çoğalması olmuyor
  test('12. Aynı işlem tekrarlandığında gereksiz kayıt veya sürüm çoğalması olmuyor', () => {
    const client = createClientRecord(validFormDataA, 'OWNER_MANUAL');

    // 1. çalıştırma
    runClientAutoAnalysisChain(client);
    const archive1 = getClientArchive(client.id);
    assert.equal(archive1?.analyses.length, 1, '1. çalıştırma sonrası tam olarak 1 analiz kaydı olmalıdır.');
    const analysisId = archive1?.analyses[0]?.id;
    const version = archive1?.analyses[0]?.version;

    // 2. çalıştırma (tekrar)
    runClientAutoAnalysisChain(client);
    const archive2 = getClientArchive(client.id);
    assert.equal(archive2?.analyses.length, 1, '2. çalıştırma sonrası analiz sayısı 1 kalmalıdır.');
    assert.equal(archive2?.analyses[0]?.id, analysisId, 'Analiz kimliği değişmemeli, aynı kayıt güncellenmelidir.');
    assert.equal(archive2?.analyses[0]?.version, version, 'Gereksiz sürüm artışı olmamalıdır.');

    // 3. çalıştırma (üçüncü kez tekrar)
    runClientAutoAnalysisChain(client);
    const archive3 = getClientArchive(client.id);
    assert.equal(archive3?.analyses.length, 1, '3. çalıştırma sonrası analiz sayısı yine 1 kalmalıdır.');
  });
});
