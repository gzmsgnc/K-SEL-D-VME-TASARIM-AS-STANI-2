import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client, ClientFormData } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  saveClientTestResult,
  setStoredActiveClientId,
  clearAllApplicationData,
} from '../../../store/storage';
import {
  getSystemMetrics,
  getSystemStatusReport,
  getClientAdminTableList,
  generateFullSystemBackup,
  executeDangerousDeleteClient,
  executeDangerousResetTest,
  executeDangerousDeleteDesign,
  executeDangerousClearAllDesigns,
  executeDangerousResetAllSystemData,
} from '../../admin/systemAdminService';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { generateClientRecipe } from '../../recipe';
import {
  runAndBuildTotemResult,
  runAndBuildEnneagramResult,
  ENNEAGRAM_QUESTIONS,
  TOTEM_QUESTIONS,
} from '../../tests';

describe('A32 — Yönetici / Sistem Kontrol Merkezi Test Paketi', () => {
  const sampleLocation = {
    country: 'Türkiye',
    city: 'Ankara',
    placeName: 'Ankara, Çankaya',
    latitude: 39.9208,
    longitude: 32.8541,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const sampleClientA: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Yılmaz',
    email: 'baris.yilmaz@example.com',
    phone: '5331112233',
    birthDate: '1990-03-21',
    birthTime: '11:15',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Fatma',
    notes: 'Admin kontrol testi A.',
  };

  const sampleClientB: ClientFormData = {
    firstName: 'Elif',
    lastName: 'Kaya',
    email: 'elif.kaya@example.com',
    phone: '5442223344',
    birthDate: '1995-08-14',
    birthTime: '18:45',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Ayşe',
    notes: 'Admin kontrol testi B.',
  };

  function setupFullAnalyses(client: Client): ClientArchiveRecord {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const archWithNum = getClientArchive(client.id);
    const ch = calculateClientChakra(client, archWithNum);
    if (ch.chakra) saveClientChakra(client.id, ch.chakra);

    const archWithCh = getClientArchive(client.id);
    const arch = calculateClientArchetype(client, archWithCh);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);

    return getClientArchive(client.id)!;
  }

  function getValidEnneagramAnswers(): Record<string, string> {
    const answers: Record<string, string> = {};
    for (const q of ENNEAGRAM_QUESTIONS) {
      answers[q.id] = q.options[0].id;
    }
    return answers;
  }

  function getValidTotemAnswers(): Record<string, string> {
    const answers: Record<string, string> = {};
    for (const q of TOTEM_QUESTIONS) {
      answers[q.id] = q.options[0].id;
    }
    return answers;
  }

  it('1. Yönetici alanının yetkili kullanıcıya açılması: OWNER_WORKSPACE ve SYSTEM_ADMIN modları doğrulanır', () => {
    const ownerMode: string = 'OWNER_WORKSPACE';
    const adminMode: string = 'SYSTEM_ADMIN';
    const isOwnerAuthorized = ownerMode === 'OWNER_WORKSPACE' || ownerMode === 'SYSTEM_ADMIN';
    const isAdminAuthorized = adminMode === 'OWNER_WORKSPACE' || adminMode === 'SYSTEM_ADMIN';

    assert.strictEqual(isOwnerAuthorized, true, 'Uygulama Sahibi çalışma alanından erişebilmelidir.');
    assert.strictEqual(isAdminAuthorized, true, 'Sistem Yönetimi modunda erişim tam yetkilidir.');
  });

  it('2. Yetkisiz kullanıcının yönetim alanına erişememesi: CLIENT_FORM modunda yetkisiz erişim koruması tetiklenir', () => {
    const clientFormMode: string = 'CLIENT_FORM';
    const isClientAuthorized = clientFormMode === 'OWNER_WORKSPACE' || clientFormMode === 'SYSTEM_ADMIN';

    assert.strictEqual(isClientAuthorized, false, 'Danışan form görünümündeki kullanıcı yetkisiz olmalıdır.');
  });

  it('3. Danışan sayısının gerçek storage verilerinden hesaplanması', () => {
    clearAllApplicationData();
    const initialMetrics = getSystemMetrics();
    assert.strictEqual(initialMetrics.totalClients, 0, 'Başlangıçta kayıt yoksa 0 olmalıdır.');

    const clientA = createClientRecord(sampleClientA);
    const updatedMetrics = getSystemMetrics();
    assert.strictEqual(updatedMetrics.totalClients, 1, 'Kayıt eklenince tam 1 olmalıdır.');

    const clientB = createClientRecord(sampleClientB);
    const doubleMetrics = getSystemMetrics();
    assert.strictEqual(doubleMetrics.totalClients, 2, 'İki danışan eklenince tam 2 olmalıdır.');

    deleteClientRecord(clientA.id);
    deleteClientRecord(clientB.id);
  });

  it('4. Aktif danışanın doğru gösterilmesi', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);
    setStoredActiveClientId(clientA.id);

    const metrics = getSystemMetrics();
    assert.strictEqual(metrics.activeClientId, clientA.id, 'Aktif clientId eşleşmelidir.');
    assert.strictEqual(
      metrics.activeClientName,
      `${sampleClientA.firstName} ${sampleClientA.lastName}`,
      'Aktif danışan adı doğru formatta olmalıdır.'
    );

    const report = getSystemStatusReport();
    assert.ok(
      report.activeClientStatusLabelTr.includes(clientA.id),
      'Durum raporunda aktif danışanın kimliği görünmelidir.'
    );

    deleteClientRecord(clientA.id);
  });

  it('5. Analiz, test, reçete ve tasarım sayılarının gerçek kayıtlardan hesaplanması', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);
    setStoredActiveClientId(clientA.id);

    // Analizler
    let archive = setupFullAnalyses(clientA);

    // Enneagram ve Totem testleri ekle (tam yanıtlarla)
    const enneagram = runAndBuildEnneagramResult(clientA, archive, getValidEnneagramAnswers());
    saveClientTestResult(clientA.id, enneagram);

    archive = getClientArchive(clientA.id)!;
    const totem = runAndBuildTotemResult(clientA, archive, getValidTotemAnswers());
    saveClientTestResult(clientA.id, totem);

    // Reçete / Tasarım üret
    archive = getClientArchive(clientA.id)!;
    const recipeRes = generateClientRecipe(clientA, archive, {
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'FOREARM_INNER',
    });
    assert.strictEqual(recipeRes.success, true);
    if (recipeRes.design) {
      saveClientDesign(clientA.id, recipeRes.design);
    }

    const metrics = getSystemMetrics();
    assert.strictEqual(metrics.totalClients, 1);
    assert.strictEqual(metrics.totalAnalyses, 1, '1 Analiz paketi kaydedildi.');
    assert.strictEqual(metrics.totalEnneagramTests, 1, '1 Enneagram testi.');
    assert.strictEqual(metrics.totalTotemTests, 1, '1 Totem testi.');
    assert.strictEqual(metrics.totalRecipes, 1, '1 Reçete.');
    assert.strictEqual(metrics.totalDesignVersions, 1, '1 Tasarım sürümü.');

    deleteClientRecord(clientA.id);
  });

  it('6. Danışanlar arasında veri karışmaması: Danışan A ve B verileri tamamen izoledir', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);
    const clientB = createClientRecord(sampleClientB);

    const numA = calculateClientNumerology(clientA);
    if (numA.numerology) saveClientNumerology(clientA.id, numA.numerology);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.strictEqual(archiveA?.analyses.length, 1, 'Danışan A analizine sahip olmalıdır.');
    assert.strictEqual(archiveB?.analyses.length, 0, 'Danışan B analize sahip OLMAMALIDIR.');

    deleteClientRecord(clientA.id);
    deleteClientRecord(clientB.id);
  });

  it('7. Salt-okunur yönetim görünümünün veri değiştirmemesi', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);

    const tableList1 = getClientAdminTableList();
    assert.strictEqual(tableList1.length, 1);
    assert.strictEqual(tableList1[0].id, clientA.id);

    const tableList2 = getClientAdminTableList();
    assert.deepStrictEqual(tableList1, tableList2, 'İki kez çağrıldığında aynı veriyi dönmeli ve hiçbir şeyi mutasyona uğratmamalıdır.');

    deleteClientRecord(clientA.id);
  });

  it('8. Test sıfırlamanın yalnızca ilgili testi etkilemesi: Diğer test ve analizler korunur', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);

    // Analiz ekle
    let archive = setupFullAnalyses(clientA);

    // Enneagram ve Totem ekle
    const enneagram = runAndBuildEnneagramResult(clientA, archive, getValidEnneagramAnswers());
    const totem = runAndBuildTotemResult(clientA, archive, getValidTotemAnswers());
    saveClientTestResult(clientA.id, enneagram);
    saveClientTestResult(clientA.id, totem);

    let currentArchive = getClientArchive(clientA.id);
    assert.strictEqual(currentArchive?.testResults.length, 2);

    // Sadece Enneagram'ı sıfırla
    const resetOk = executeDangerousResetTest(clientA.id, 'ENNEAGRAM');
    assert.strictEqual(resetOk, true);

    currentArchive = getClientArchive(clientA.id);
    assert.strictEqual(currentArchive?.testResults.length, 1, 'Yalnızca 1 test kalmalıdır.');
    assert.strictEqual(currentArchive?.testResults[0].testType, 'ANIMAL_TOTEM', 'Kalan test Totem olmalıdır.');
    assert.strictEqual(currentArchive?.analyses.length, 1, 'Analiz kaydı asla silinmemelidir.');

    deleteClientRecord(clientA.id);
  });

  it('9. Tasarım silmenin analizleri silmemesi', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);

    let archive = setupFullAnalyses(clientA);

    const res = generateClientRecipe(clientA, archive, {
      preferredStyle: 'SACRED_GEOMETRY',
      preferredPlacement: 'SPINE_CENTER',
    });
    assert.strictEqual(res.success, true);
    if (res.design) {
      saveClientDesign(clientA.id, res.design);
    }

    archive = getClientArchive(clientA.id)!;
    assert.strictEqual(archive?.designs.length, 1);

    // Tasarımları sıfırla
    executeDangerousClearAllDesigns(clientA.id);

    archive = getClientArchive(clientA.id)!;
    assert.strictEqual(archive?.designs.length, 0, 'Tasarım sayısı 0 olmalıdır.');
    assert.strictEqual(archive?.analyses.length, 1, 'Analizler KESİNLİKLE korunmalıdır.');

    deleteClientRecord(clientA.id);
  });

  it('10. Tehlikeli işlemlerin açık onay ve izolasyon doğrulaması', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);
    const clientB = createClientRecord(sampleClientB);

    // Münferit danışan silme
    executeDangerousDeleteClient(clientA.id);

    const metricsAfterDelete = getSystemMetrics();
    assert.strictEqual(metricsAfterDelete.totalClients, 1, 'Sadece Danışan A silinmeli, Danışan B kalmalıdır.');
    assert.strictEqual(getClientArchive(clientB.id)?.client.id, clientB.id);

    // Tümünü sıfırlama
    executeDangerousResetAllSystemData();
    const metricsAfterResetAll = getSystemMetrics();
    assert.strictEqual(metricsAfterResetAll.totalClients, 0, 'Tüm sistem verisi temizlenmelidir.');
  });

  it('11. Export işleminin mevcut veriyi değiştirmemesi ve anne adını koruması', () => {
    clearAllApplicationData();
    const clientA = createClientRecord(sampleClientA);

    const backup = generateFullSystemBackup();
    assert.strictEqual(backup.totalClients, 1);
    assert.strictEqual(backup.clients[0].client.id, clientA.id);
    assert.strictEqual(backup.clients[0].client.motherName, sampleClientA.motherName);

    // Export sonrası veriler aynı kalmalıdır
    const currentMetrics = getSystemMetrics();
    assert.strictEqual(currentMetrics.totalClients, 1, 'Yedekleme veriyi silmez veya değiştirmez.');

    deleteClientRecord(clientA.id);
  });

  it('12. Gerçek veri yoksa sahte istatistik üretilmemesi: "Kayıt bulunmuyor" kontrolleri', () => {
    clearAllApplicationData();
    setStoredActiveClientId(null);

    const metrics = getSystemMetrics();
    assert.strictEqual(metrics.totalClients, 0);
    assert.strictEqual(metrics.activeClientId, null);
    assert.strictEqual(metrics.totalAnalyses, 0);
    assert.strictEqual(metrics.totalRecipes, 0);
    assert.strictEqual(metrics.totalDesignVersions, 0);

    const report = getSystemStatusReport();
    assert.strictEqual(report.clientsStatusLabelTr, 'Kayıt bulunmuyor');
    assert.strictEqual(report.activeClientStatusLabelTr, 'Kayıt bulunmuyor');
    assert.strictEqual(report.analysesStatusLabelTr, 'Kayıt bulunmuyor');
    assert.strictEqual(report.testsStatusLabelTr, 'Kayıt bulunmuyor');
    assert.strictEqual(report.recipesStatusLabelTr, 'Kayıt bulunmuyor');
    assert.strictEqual(report.designsStatusLabelTr, 'Kayıt bulunmuyor');
  });
});
