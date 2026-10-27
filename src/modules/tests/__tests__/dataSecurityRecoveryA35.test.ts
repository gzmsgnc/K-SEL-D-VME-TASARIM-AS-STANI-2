import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredClients,
  createClientRecord,
  getClientArchive,
  updateClientRecord,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientDesign,
  getClientDesigns,
  saveClientTestResult,
  getClientTestResults,
  clearAllApplicationData,
} from '../../../store/storage';
import {
  generateFullSystemBackup,
  getSystemIntegrityReport,
} from '../../admin/systemAdminService';
import { validateBackupData } from '../../../utils/backupValidator';
import { generateClientDossierText } from '../../../utils/clientDossierGenerator';
import { Client, ClientFormData } from '../../../types/client';
import { ClientTattooDesign } from '../../../types/design';
import { ClientTestResult } from '../../../types/test';
import { TropicalNatalChart } from '../../../types/astrology';

describe('A35 — Üretim Öncesi Veri Güvenliği ve Geri Kazanım İnşası Test Paketi', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  const mockFormDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Yıldız',
    email: 'deniz@example.com',
    phone: '05321112233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
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
    notes: 'Özel danışan A',
  };

  const mockFormDataB: ClientFormData = {
    firstName: 'Efe',
    lastName: 'Kaya',
    email: 'efe@example.com',
    phone: '05423334455',
    birthDate: '1988-11-04',
    birthTime: '09:15',
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
    motherName: 'Fatma',
    notes: 'Özel danışan B',
  };

  function createTestMockDesign(clientId: string, versionNumber: number, title: string, customId?: string): ClientTattooDesign {
    return {
      id: customId || `design_${clientId}_v${versionNumber}`,
      clientId,
      versionNumber,
      title,
      conceptStatement: `Versiyon ${versionNumber} konsept manifestosu.`,
      recipe: {
        style: versionNumber === 1 ? 'FINE_LINE' : 'SACRED_GEOMETRY',
        recommendedPlacement: versionNumber === 1 ? 'FOREARM_INNER' : 'SPINE_CENTER',
        placementDescription: 'Anatomik akış açıklaması.',
        recommendedDimensionsCm: { width: 10 + versionNumber, height: 15 + versionNumber },
        colorProfile: 'MONOCHROME_BLACK',
        colorRationale: 'Siyah mürekkep derinliği.',
        primarySymbol: versionNumber === 1 ? 'Lotus' : 'Metatron Küpü',
        secondarySymbols: ['Ay Fazları', 'Spiral'],
        keyComponents: ['Ana Geometri', 'Hassas Çizgiler'],
        technicalAdviceForArtist: ['3RL iğne grubu', 'Sabit el açısı'],
      },
      aiPrompt: {
        primaryPromptEn: `Tattoo design version ${versionNumber}, minimalist sacred geometry`,
        conceptPromptTr: `Türkçe konsept özeti sürüm ${versionNumber}`,
        negativePrompt: 'blurry, ugly, watermark, text',
        aspectRatio: '3:4',
        artisticModifiers: ['fineline', 'vector art'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function createTestMockResult(clientId: string, testType: 'ENNEAGRAM' | 'ANIMAL_TOTEM', customId?: string): ClientTestResult {
    return {
      id: customId || `test_${clientId}_${testType.toLowerCase()}`,
      clientId,
      testType,
      version: 1,
      completedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', selectedOptionId: 'opt_a', weight: 1 },
      ],
      primaryType: testType === 'ENNEAGRAM' ? 'Tip 4 - Bireyci' : 'Şahin',
      dominantScores: { 'Tip 4': 8 },
      interpretations: ['Yorum metni'],
    };
  }

  test('1. Boş depolamada sistemin çökmeden boş liste ve güvenli boş durum dönmesi', () => {
    const clients = getStoredClients();
    assert.equal(Array.isArray(clients), true);
    assert.equal(clients.length, 0);

    const archive = getClientArchive('olmayan_id');
    assert.equal(archive, null);

    const designs = getClientDesigns('olmayan_id');
    assert.deepEqual(designs, []);

    const tests = getClientTestResults('olmayan_id');
    assert.deepEqual(tests, []);
  });

  test('2. Depolamadaki bozuk JSON kayıtlarının getStoredClients ve getClientArchive çağrılarını çökertmemesi', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dovme_asistani_clients_v1', '{ bozuk_json_metni... ');
      localStorage.setItem('dovme_asistani_analyses_v1', '### gecersiz json %%');
    }

    const clients = getStoredClients();
    assert.equal(Array.isArray(clients), true);
    assert.equal(clients.length, 0);

    const archive = getClientArchive('test_id');
    assert.equal(archive, null);
  });

  test('3. Depolamada dizi yerine nesne veya metin bulunması durumunda uygulamanın çökmemesi', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dovme_asistani_clients_v1', JSON.stringify({ notAnArray: true }));
      localStorage.setItem('dovme_asistani_designs_v1', JSON.stringify('sadece_metin'));
    }

    const clients = getStoredClients();
    assert.equal(Array.isArray(clients), true);
    assert.equal(clients.length, 0);

    const designs = getClientDesigns('test_id');
    assert.equal(Array.isArray(designs), true);
    assert.equal(designs.length, 0);
  });

  test('4. Dizi içinde bozuk veya null girdiler olduğunda diğer geçerli danışanların korunması', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');

    if (typeof localStorage !== 'undefined') {
      const current = JSON.parse(localStorage.getItem('dovme_asistani_clients_v1') || '[]');
      current.push(null);
      current.push('bozuk_eleman');
      current.push({ id: '', firstName: 123 });
      localStorage.setItem('dovme_asistani_clients_v1', JSON.stringify(current));
    }

    const clients = getStoredClients();
    assert.equal(clients.length, 1);
    assert.equal(clients[0].id, clientA.id);
    assert.equal(clients[0].firstName, 'Deniz');
  });

  test('5. Danışan A ve Danışan B veri izolasyonu: Kayıtlar kesinlikle karışmaz', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(mockFormDataB, 'CLIENT_FORM');

    saveClientNumerology(clientA.id, {
      lifePathNumber: 7,
      destinyNumber: 3,
      soulUrgeNumber: 5,
      personalityNumber: 4,
      birthdayNumber: 18,
      worldMissionNumber: 1,
      karmicLessons: [],
      masterNumbers: [],
    });

    const designA = createTestMockDesign(clientA.id, 1, 'A Tasarımı', 'design_a_1');
    saveClientDesign(clientA.id, designA);

    const archiveB = getClientArchive(clientB.id);
    assert.ok(archiveB);
    assert.equal(archiveB.analyses.length, 0);
    assert.equal(archiveB.designs.length, 0);

    const archiveA = getClientArchive(clientA.id);
    assert.ok(archiveA);
    assert.equal(archiveA.analyses.length, 1);
    assert.equal(archiveA.analyses[0].clientId, clientA.id);
    assert.equal(archiveA.designs.length, 1);
    assert.equal(archiveA.designs[0].clientId, clientA.id);
  });

  function createTestMockNatalChart(): TropicalNatalChart {
    return {
      zodiacSystem: 'TROPICAL',
      houseSystem: 'PLACIDUS',
      isBirthTimeUnknown: false,
      birthDate: '1992-05-18',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
      sunSign: 'Taurus',
      moonSign: 'Scorpio',
      ascendantSign: 'Virgo',
      planetaryPositions: [],
    };
  }

  test('6. Boş veya geçersiz clientId ile kayıt yapıldığında açık Türkçe hata fırlatılması', () => {
    assert.throws(
      () => {
        saveClientAstrologyChart('', createTestMockNatalChart());
      },
      (err: any) => {
        return err?.message?.includes('Geçerli bir clientId gereklidir');
      }
    );

    assert.throws(
      () => {
        saveClientDesign('   ', createTestMockDesign('   ', 1, 'Tasarım X', 'des_x'));
      },
      (err: any) => {
        return err?.message?.includes('Geçerli bir clientId gereklidir');
      }
    );
  });

  test('7. Danışan profil güncelleme işlemi: Sadece hedef danışanı günceller, diğer danışanı bozmaz', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(mockFormDataB, 'CLIENT_FORM');

    const updatedA: Client = {
      ...clientA,
      firstName: 'Deniz Güncel',
      notes: 'Yeni not',
    };
    updateClientRecord(updatedA);

    const clientsAfter = getStoredClients();
    const fetchedA = clientsAfter.find((c) => c.id === clientA.id);
    const fetchedB = clientsAfter.find((c) => c.id === clientB.id);

    assert.equal(fetchedA?.firstName, 'Deniz Güncel');
    assert.equal(fetchedA?.notes, 'Yeni not');
    assert.equal(fetchedB?.firstName, 'Efe');
    assert.equal(fetchedB?.notes, 'Özel danışan B');
  });

  test('8. Tasarım sürüm arşiv koruması: Yeni sürüm eklendiğinde eski sürüm silinmez ve korunur', () => {
    const client = createClientRecord(mockFormDataA, 'OWNER_MANUAL');

    const designV1 = createTestMockDesign(client.id, 1, 'Tasarım V1', 'design_v1');
    saveClientDesign(client.id, designV1);

    const designV2 = createTestMockDesign(client.id, 2, 'Tasarım V2', 'design_v2');
    saveClientDesign(client.id, designV2);

    const designs = getClientDesigns(client.id);
    assert.equal(designs.length, 2);
    assert.equal(designs[0].versionNumber, 1);
    assert.equal(designs[0].recipe?.primarySymbol, 'Lotus');
    assert.equal(designs[1].versionNumber, 2);
    assert.equal(designs[1].recipe?.primarySymbol, 'Metatron Küpü');
  });

  test('9. Dövme tasarımı kaydederken başka danışanın ID si ile çakışma durumunda otomatik ID atanması', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(mockFormDataB, 'CLIENT_FORM');

    const designA = createTestMockDesign(clientA.id, 1, 'Tasarım A', 'shared_id_conflict');
    saveClientDesign(clientA.id, designA);

    const designB = createTestMockDesign(clientB.id, 1, 'Tasarım B', 'shared_id_conflict');
    const savedB = saveClientDesign(clientB.id, designB);

    assert.notEqual(savedB.id, 'shared_id_conflict');
    const designsA = getClientDesigns(clientA.id);
    const designsB = getClientDesigns(clientB.id);

    assert.equal(designsA.length, 1);
    assert.equal(designsA[0].id, 'shared_id_conflict');
    assert.equal(designsB.length, 1);
    assert.equal(designsB[0].id, savedB.id);
  });

  test('10. Test sonucu kaydederken başka danışanın ID si ile çakışma durumunda otomatik ID atanması', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(mockFormDataB, 'CLIENT_FORM');

    const testA = createTestMockResult(clientA.id, 'ENNEAGRAM', 'test_shared_conflict');
    saveClientTestResult(clientA.id, testA);

    const testB = createTestMockResult(clientB.id, 'ANIMAL_TOTEM', 'test_shared_conflict');
    const savedB = saveClientTestResult(clientB.id, testB);

    assert.notEqual(savedB.id, 'test_shared_conflict');
    const testsA = getClientTestResults(clientA.id);
    const testsB = getClientTestResults(clientB.id);

    assert.equal(testsA.length, 1);
    assert.equal(testsA[0].id, 'test_shared_conflict');
    assert.equal(testsB.length, 1);
    assert.equal(testsB[0].id, savedB.id);
  });

  test('11. Danışan dosyası dışa aktarma (A26): Salt-okunur çalışır, depolamayı ve aktif danışanı değiştirmez', () => {
    const client = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const archive = getClientArchive(client.id);

    const dossierText = generateClientDossierText(client, archive);
    assert.ok(dossierText.includes('DÖVME TASARIM ASİSTANI — BÜTÜNLEŞİK DANIŞAN DOSYASI'));
    assert.ok(dossierText.includes(client.firstName));
    assert.ok(dossierText.includes(client.lastName));

    assert.ok(dossierText.includes('tasarıma sızmaz'));

    const clientsAfter = getStoredClients();
    assert.equal(clientsAfter.length, 1);
    assert.equal(clientsAfter[0].id, client.id);
  });

  test('12. Toplu sistem yedeği oluşturma (A32): Salt-okunur çalışır ve tüm danışanları barındırır', () => {
    const clientA = createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(mockFormDataB, 'CLIENT_FORM');

    const backup = generateFullSystemBackup();
    assert.equal(backup.totalClients, 2);
    assert.equal(backup.clients.length, 2);
    assert.equal(backup.schemaVersion, '1.0');
    assert.equal(backup.clients[0].client.id, clientB.id);
    assert.equal(backup.clients[1].client.id, clientA.id);

    const clientsAfter = getStoredClients();
    assert.equal(clientsAfter.length, 2);
  });

  test('13. validateBackupData fonksiyonu: Geçerli, boş, eksik ve bozuk yedekleri doğru tespit eder', () => {
    const emptyBackup = generateFullSystemBackup();
    const emptyResult = validateBackupData(emptyBackup);
    assert.equal(emptyResult.isValid, true);
    assert.equal(emptyResult.status, 'EMPTY');
    assert.equal(emptyResult.statusLabelTr, 'Kayıt bulunmuyor');

    createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const validBackup = generateFullSystemBackup();
    const validResult = validateBackupData(validBackup);
    assert.equal(validResult.isValid, true);
    assert.equal(validResult.status, 'READY');
    assert.equal(validResult.statusLabelTr, 'Hazır');
    assert.equal(validResult.totalClientsFound, 1);

    const corruptJsonResult = validateBackupData('{ bozuk json ...');
    assert.equal(corruptJsonResult.isValid, false);
    assert.equal(corruptJsonResult.status, 'CORRUPTED');
    assert.equal(corruptJsonResult.statusLabelTr, 'Veri okunamadı');

    const missingHeadersResult = validateBackupData({ clients: [] });
    assert.equal(missingHeadersResult.status, 'EMPTY');

    const corruptedBackupData = {
      systemTitle: 'TEST',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      totalClients: 1,
      clients: [
        {
          client: { id: 'client_1', firstName: 'Test', lastName: 'User' },
          archive: {
            client: { id: 'client_1' },
            analyses: [{ clientId: 'baska_danisan_id' }],
            testResults: [],
            designs: [],
          },
        },
      ],
    };
    const leakResult = validateBackupData(corruptedBackupData);
    assert.equal(leakResult.isValid, false);
    assert.equal(leakResult.status, 'CORRUPTED');
    assert.equal(leakResult.statusLabelTr, 'Veri okunamadı');
  });

  test('14. getSystemIntegrityReport fonksiyonu: Gerçek durumları (Hazır, Kayıt bulunmuyor, Eksik, Veri okunamadı) döndürür', () => {
    const emptyReport = getSystemIntegrityReport();
    assert.ok(emptyReport.items.length >= 7);

    const storageCard = emptyReport.items.find((i) => i.id === 'storage');
    const clientCard = emptyReport.items.find((i) => i.id === 'clients');
    const analysisCard = emptyReport.items.find((i) => i.id === 'analyses');
    const backupCard = emptyReport.items.find((i) => i.id === 'backup');

    assert.equal(storageCard?.status, 'Hazır');
    assert.equal(clientCard?.status, 'Kayıt bulunmuyor');
    assert.equal(analysisCard?.status, 'Kayıt bulunmuyor');
    assert.equal(backupCard?.status, 'Kayıt bulunmuyor');

    createClientRecord(mockFormDataA, 'OWNER_MANUAL');
    const activeReport = getSystemIntegrityReport();

    const clientCardAfter = activeReport.items.find((i) => i.id === 'clients');
    const backupCardAfter = activeReport.items.find((i) => i.id === 'backup');

    assert.equal(clientCardAfter?.status, 'Hazır');
    assert.equal(clientCardAfter?.count, 1);
    assert.equal(backupCardAfter?.status, 'Hazır');
  });
});
