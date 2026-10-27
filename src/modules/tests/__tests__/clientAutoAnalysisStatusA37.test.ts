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
  saveClientTestResult,
} from '../../../store/storage';
import {
  runClientAutoAnalysisChain,
  getClientAnalysisChainStatus,
  AutoAnalysisChainResult,
} from '../../pipeline/clientAnalysisPipeline';
import { ClientFormData } from '../../../types/client';
import { runAndBuildEnneagramResult } from '../../tests';

describe('A37 — Otomatik Analiz Zinciri Durum ve Hata Yönetimi Test Paketi', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  const validClientFormA: ClientFormData = {
    firstName: 'Zeynep',
    lastName: 'Aydın',
    email: 'zeynep.aydin@example.com',
    phone: '05332223344',
    birthDate: '1990-04-12',
    birthTime: '10:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Ankara, Türkiye',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Emine',
    notes: 'Kişisel analiz isteği',
  };

  const validClientFormB: ClientFormData = {
    firstName: 'Can',
    lastName: 'Yıldız',
    email: 'can.yildiz@example.com',
    phone: '05441112233',
    birthDate: '1985-09-25',
    birthTime: '18:00',
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
    motherName: 'Hatice',
    notes: 'Mitolojik tasarım',
  };

  // 1. Davranış: Dört otomatik analizin tamamlandığı durumda doğru durumların gösterilmesi
  test('1. Dört otomatik analizin tamamlandığı durumda doğru durumların gösterilmesi', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    const chainRes = runClientAutoAnalysisChain(client);
    assert.equal(chainRes.errors.length, 0, 'Zincir hatasız çalışmalıdır.');

    const archive = getClientArchive(client.id);
    const report = getClientAnalysisChainStatus(client, archive, chainRes);

    assert.equal(report.clientId, client.id);
    assert.equal(report.completedAnalysesCount, 4, '4 otomatik analiz tamamlanmış olmalıdır.');
    assert.equal(report.modules.numerology.status, 'Tamamlandı');
    assert.equal(report.modules.numerology.hasRecord, true);
    assert.equal(report.modules.astrology.status, 'Tamamlandı');
    assert.equal(report.modules.astrology.hasRecord, true);
    assert.equal(report.modules.chakra.status, 'Tamamlandı');
    assert.equal(report.modules.chakra.hasRecord, true);
    assert.equal(report.modules.archetype.status, 'Tamamlandı');
    assert.equal(report.modules.archetype.hasRecord, true);
    assert.equal(report.hasErrors, false);
  });

  // 2. Davranış: Eksik doğum verisinde sahte sonuç oluşmaması
  test('2. Eksik doğum verisinde sahte sonuç oluşmaması', () => {
    const incompleteForm: ClientFormData = {
      firstName: 'Mehmet',
      lastName: 'Öz',
      email: 'mehmet@example.com',
      phone: '05559998877',
      birthDate: '', // Boş doğum tarihi
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
      motherName: 'Fatma',
      notes: '',
    };

    const client = createClientRecord(incompleteForm, 'OWNER_MANUAL');
    const chainRes = runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    const report = getClientAnalysisChainStatus(client, archive, chainRes);

    assert.equal(report.completedAnalysesCount, 0, 'Hiçbir analiz tamamlanmamalıdır.');
    assert.equal(report.modules.numerology.status, 'Eksik veri');
    assert.equal(report.modules.astrology.status, 'Eksik veri');
    assert.equal(report.modules.chakra.status, 'Eksik veri');
    assert.equal(report.modules.archetype.status, 'Eksik veri');

    // Sahte kayıt üretilmediği arşivden teyit edilir
    assert.equal(archive?.analyses[0]?.numerology, undefined);
    assert.equal(archive?.analyses[0]?.astrology, undefined);
    assert.equal(archive?.analyses[0]?.chakra, undefined);
    assert.equal(archive?.analyses[0]?.archetype, undefined);
  });

  // 3. Davranış: Bir analiz başarısız olduğunda diğer başarılı analizlerin korunması
  test('3. Bir analiz başarısız olduğunda diğer başarılı analizlerin korunması', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');

    // Astroloji motorunda simüle edilen çalışma hatası ile zinciri tetikle
    const chainRes = runClientAutoAnalysisChain(client, { simulateFaultInModule: 'astrology' });

    assert.equal(chainRes.astrologyRan, false, 'Astroloji çalışmamış olmalıdır.');
    assert.equal(chainRes.numerologyRan, true, 'Numeroloji başarılı olmalıdır.');
    assert.equal(chainRes.chakraRan, true, 'Çakra başarılı olmalıdır.');
    assert.equal(chainRes.archetypeRan, true, 'Arketip başarılı olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.numerology, 'Numeroloji arşive yazılmış ve korunmuş olmalıdır.');
    assert.ok(archive?.analyses[0]?.chakra, 'Çakra korunmuş olmalıdır.');
    assert.ok(archive?.analyses[0]?.archetype, 'Arketip korunmuş olmalıdır.');
    assert.equal(archive?.analyses[0]?.astrology, undefined, 'Astroloji kaydı bozulmamış / oluşturulmamış olmalıdır.');

    const report = getClientAnalysisChainStatus(client, archive, chainRes);
    assert.equal(report.modules.astrology.status, 'Hata');
    assert.equal(report.modules.numerology.status, 'Tamamlandı');
    assert.equal(report.modules.chakra.status, 'Tamamlandı');
    assert.equal(report.modules.archetype.status, 'Tamamlandı');
    assert.equal(report.completedAnalysesCount, 3, '3 başarılı analiz korunmalıdır.');
  });

  // 4. Davranış: Enneagram/Totem cevaplanmadan sonuç uydurulmaması
  test('4. Enneagram/Totem cevaplanmadan sonuç uydurulmaması', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    const chainRes = runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    const report = getClientAnalysisChainStatus(client, archive, chainRes);

    // Testler cevaplanmadı, otomatik doldurulmamalı
    assert.equal(report.tests.enneagram.status, 'Test hazır');
    assert.equal(report.tests.enneagram.hasRecord, false);
    assert.equal(report.tests.totem.status, 'Test hazır');
    assert.equal(report.tests.totem.hasRecord, false);

    assert.equal(archive?.testResults.length, 0, 'Test arşivi boş olmalıdır; sonuç uydurulmamalıdır.');
  });

  // 5. Davranış: A15 reçetenin otomatik tetiklenmemesi
  test('5. A15 reçetenin otomatik tetiklenmemesi', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.equal(archive?.designs.length, 0, 'Dövme reçetesi otomatik oluşturulmamalıdır.');
  });

  // 6. Davranış: A16 görsel istemin otomatik tetiklenmemesi
  test('6. A16 görsel istemin otomatik tetiklenmemesi', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.equal(archive?.symbolAnalyses.length, 0, 'Sembol analizi ve görsel istem otomatik tetiklenmemelidir.');
  });

  // 7. Davranış: Zincir durumunun doğru clientId'ye ait olması
  test('7. Zincir durumunun doğru clientId ye ait olması', () => {
    const client = createClientRecord(validClientFormA, 'CLIENT_FORM');
    const chainRes = runClientAutoAnalysisChain(client);

    const report = getClientAnalysisChainStatus(client, getClientArchive(client.id), chainRes);
    assert.equal(report.clientId, client.id, 'Rapor clientId si danışan ID si ile kesinlikle eşleşmelidir.');
  });

  // 8. Davranış: Danışan değişiminde durumların karışmaması
  test('8. Danışan değişiminde durumların karışmaması', () => {
    const clientA = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    const clientB = createClientRecord(validClientFormB, 'OWNER_MANUAL');

    // Sadece Danışan A için zincir çalıştır
    const chainResA = runClientAutoAnalysisChain(clientA);

    const reportA = getClientAnalysisChainStatus(clientA, getClientArchive(clientA.id), chainResA);
    const reportB = getClientAnalysisChainStatus(clientB, getClientArchive(clientB.id), null);

    assert.equal(reportA.completedAnalysesCount, 4, 'Danışan A tüm analizlere sahip olmalıdır.');
    assert.equal(reportB.completedAnalysesCount, 0, 'Danışan B henüz zinciri çalıştırmamıştır; analizleri 0 olmalıdır.');
    assert.equal(reportB.modules.numerology.status, 'Kayıt bulunmuyor');
    assert.equal(reportB.modules.astrology.status, 'Kayıt bulunmuyor');
  });

  // 9. Davranış: Sayfa yenilemeden durumun güncellenmesi
  test('9. Sayfa yenilemeden durumun güncellenmesi', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');

    // Zincir öncesi durum
    const initialReport = getClientAnalysisChainStatus(client, getClientArchive(client.id), null);
    assert.equal(initialReport.completedAnalysesCount, 0);

    // Zincir çalıştırılır
    const chainRes = runClientAutoAnalysisChain(client);

    // Anlık hafıza/storage üzerinden yeni rapor alınır
    const updatedReport = getClientAnalysisChainStatus(client, getClientArchive(client.id), chainRes);
    assert.equal(updatedReport.completedAnalysesCount, 4, 'Sayfa yenilemeye gerek kalmadan durum güncellenmelidir.');

    // Ardından danışan Enneagram testini tamamlarsa
    const allEnneagramAnswers: Record<string, string> = {
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
    const enneagramRes = runAndBuildEnneagramResult(client, getClientArchive(client.id), allEnneagramAnswers);
    saveClientTestResult(client.id, enneagramRes);

    const reportWithTest = getClientAnalysisChainStatus(client, getClientArchive(client.id), chainRes);
    assert.equal(reportWithTest.tests.enneagram.status, 'Test tamamlandı');
    assert.equal(reportWithTest.tests.enneagram.hasRecord, true);
    assert.equal(reportWithTest.tests.totem.status, 'Test hazır');
  });

  // 10. Davranış: Aynı zincirin tekrar çalıştırılmasında gereksiz kayıt/sürüm oluşmaması
  test('10. Aynı zincirin tekrar çalıştırılmasında gereksiz kayıt/sürüm oluşmaması', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');

    // Zinciri 3 defa art arda çalıştır
    runClientAutoAnalysisChain(client);
    runClientAutoAnalysisChain(client);
    runClientAutoAnalysisChain(client);

    const archive = getClientArchive(client.id);
    assert.equal(archive?.analyses.length, 1, 'Tek bir analiz kaydı bulunmalıdır; analiz çoğalmamalıdır.');

    const allAnalyses = getSafeStorage<any[]>(STORAGE_KEYS.ANALYSES, []);
    const clientAnalyses = allAnalyses.filter((a) => a.clientId === client.id);
    assert.equal(clientAnalyses.length, 1, 'Storage da danışana ait yalnızca tek bir analiz kaydı bulunmalıdır.');

    const allDesigns = getSafeStorage<any[]>(STORAGE_KEYS.DESIGNS, []);
    assert.equal(allDesigns.length, 0, 'Reçete sürümü oluşmamalıdır.');
  });

  // 11. Davranış: Gerçek hata durumunun kullanıcıya açıkça aktarılması
  test('11. Gerçek hata durumunun kullanıcıya açıkça aktarılması (teknik yığın olmadan)', () => {
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    const chainRes = runClientAutoAnalysisChain(client, { simulateFaultInModule: 'numerology' });

    assert.ok(chainRes.errors.length >= 1, 'En az bir hata kaydı bulunmalıdır.');
    const numError = chainRes.errors.find((e) => e.includes('Numeroloji'));
    assert.ok(numError, 'Numeroloji hata mesajı bulunmalıdır.');

    // Teknik stack trace kelimeleri içermemeli
    assert.equal(numError.includes('at Object'), false, 'Teknik stack trace satırı içermemelidir.');
    assert.equal(numError.includes('node:internal'), false, 'node:internal referansı içermemelidir.');
    assert.ok(numError.includes('Numeroloji'), 'Türkçe modül adını belirtmelidir.');

    const report = getClientAnalysisChainStatus(client, getClientArchive(client.id), chainRes);
    assert.equal(report.modules.numerology.status, 'Hata');
    assert.ok(report.hasErrors, 'Rapor hata durumunu doğrulamalıdır.');
    assert.ok(report.userFacingErrors.length > 0, 'Kullanıcı dostu hata açıklaması sunmalıdır.');
  });

  // 12. Davranış: Gerçek veri yokken "başarılı" durumunun gösterilmemesi
  test('12. Gerçek veri yokken "başarılı" veya "Tamamlandı" durumunun gösterilmemesi', () => {
    // Danışan var ancak hiçbir analiz çalıştırılmadı
    const client = createClientRecord(validClientFormA, 'OWNER_MANUAL');
    const report = getClientAnalysisChainStatus(client, getClientArchive(client.id), null);

    assert.notEqual(report.modules.numerology.status, 'Tamamlandı');
    assert.notEqual(report.modules.astrology.status, 'Tamamlandı');
    assert.notEqual(report.modules.chakra.status, 'Tamamlandı');
    assert.notEqual(report.modules.archetype.status, 'Tamamlandı');
    assert.notEqual(report.tests.enneagram.status, 'Test tamamlandı');
    assert.notEqual(report.tests.totem.status, 'Test tamamlandı');

    assert.equal(report.completedAnalysesCount, 0, 'Tamamlanan analiz sayısı 0 olmalıdır.');

    // Boş danışan kontrolü
    const nullReport = getClientAnalysisChainStatus(null, null, null);
    assert.equal(nullReport.completedAnalysesCount, 0);
    assert.equal(nullReport.modules.numerology.status, 'Kayıt bulunmuyor');
  });
});
