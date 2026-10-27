import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  getStoredClients,
  updateClientRecord,
  deleteClientRecord,
  getClientArchive,
  getStoredActiveClientId,
  setStoredActiveClientId,
  saveClientTestResult,
} from '../../../store/storage';
import { validateClientFormData } from '../../../validation/clientValidation';
import { Client, ClientFormData } from '../../../types/client';
import { GlobalLocation } from '../../../types/location';

describe('A24: Danışan Yönetimi ve Çalışma Alanı Doğrulama Testleri', () => {
  const sampleLocation: GlobalLocation = {
    country: 'Türkiye',
    city: 'İstanbul',
    placeName: 'İstanbul, Türkiye',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const createSampleFormData = (suffix: string): ClientFormData => ({
    firstName: `Elif_${suffix}`,
    lastName: `Kaya_${suffix}`,
    email: `elif_${suffix.toLowerCase()}@example.com`,
    phone: '5551234567',
    birthDate: '1994-06-15',
    birthTime: '10:30',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Meryem',
    notes: 'A24 Danışan Yönetim Testi',
  });

  // 1. Yeni Danışan Oluşturma ve Zorunlu Alan Doğrulaması
  it('1. Geçerli verilerle yeni danışan oluşturulmalı; benzersiz ID ve arşive sahip olmalıdır', () => {
    const formData = createSampleFormData('Valid1');
    const valResult = validateClientFormData(formData);
    assert.strictEqual(valResult.isValid, true, 'Form geçerli olmalıdır');

    const created = createClientRecord(formData, 'OWNER_MANUAL');
    try {
      assert.ok(created.id, 'Danışan benzersiz ID ye sahip olmalıdır');
      assert.strictEqual(created.firstName, 'Elif_Valid1');
      assert.strictEqual(created.status, 'ACTIVE');

      const archive = getClientArchive(created.id);
      assert.ok(archive, 'Oluşturulan danışanın bağımsız arşivi mevcut olmalıdır');
      assert.strictEqual(archive.client.id, created.id);
      assert.strictEqual(archive.analyses.length, 0);
      assert.strictEqual(archive.testResults.length, 0);
    } finally {
      deleteClientRecord(created.id);
    }
  });

  // 2. Eksik ve Geçersiz Bilgilerin Engellenmesi ve Açık Türkçe Hata Geri Bildirimi
  it('2. Eksik veya geçersiz zorunlu bilgilerde form reddedilmeli ve açık Türkçe hata verilmelidir', () => {
    // a. Eksik Ad ve Soyad
    const badName = createSampleFormData('Bad1');
    badName.firstName = '';
    badName.lastName = ' ';
    const res1 = validateClientFormData(badName);
    assert.strictEqual(res1.isValid, false);
    assert.ok(res1.errors.firstName?.includes('geçerli bir ad'));
    assert.ok(res1.errors.lastName?.includes('geçerli bir soyad'));

    // b. Geçersiz E-posta
    const badEmail = createSampleFormData('Bad2');
    badEmail.email = 'gecersiz-eposta-adresi';
    const res2 = validateClientFormData(badEmail);
    assert.strictEqual(res2.isValid, false);
    assert.ok(res2.errors.email?.includes('geçerli bir e-posta'));

    // c. Gelecekte Doğum Tarihi
    const futureDate = createSampleFormData('Bad3');
    futureDate.birthDate = '2099-01-01';
    const res3 = validateClientFormData(futureDate);
    assert.strictEqual(res3.isValid, false);
    assert.ok(res3.errors.birthDate?.includes('gelecekte'));

    // d. Eksik Anne Adı (Ebced için zorunlu)
    const badMother = createSampleFormData('Bad4');
    badMother.motherName = '';
    const res4 = validateClientFormData(badMother);
    assert.strictEqual(res4.isValid, false);
    assert.ok(res4.errors.motherName?.includes('anne adı'));
  });

  // 3. Danışan Bilgilerinin Güncellenmesi ve Diğer Danışanlara Sızmaması
  it('3. Danışan bilgileri güncellenebilmeli; güncelleme yalnızca ilgili danışanı etkilemelidir', () => {
    const client1 = createClientRecord(createSampleFormData('Update1'), 'OWNER_MANUAL');
    const client2 = createClientRecord(createSampleFormData('Update2'), 'OWNER_MANUAL');

    try {
      const updatedData: Client = {
        ...client1,
        firstName: 'Elif_Guncel',
        notes: 'Yeni özel not eklendi.',
      };

      const saved = updateClientRecord(updatedData);
      assert.strictEqual(saved.firstName, 'Elif_Guncel');
      assert.strictEqual(saved.notes, 'Yeni özel not eklendi.');

      // Diğer danışanın etkilenmediğini doğrula
      const c2Archive = getClientArchive(client2.id);
      assert.strictEqual(c2Archive?.client.firstName, 'Elif_Update2');
      assert.strictEqual(c2Archive?.client.notes, 'A24 Danışan Yönetim Testi');
    } finally {
      deleteClientRecord(client1.id);
      deleteClientRecord(client2.id);
    }
  });

  // 4. Danışanlar Arası Geçiş ve Aktif Danışan Durumunun Korunması
  it('4. Aktif danışan seçimi kalıcı olarak depolanmalı ve doğru danışanın arşivi açılmalıdır', () => {
    const clientA = createClientRecord(createSampleFormData('SwitchA'), 'OWNER_MANUAL');
    const clientB = createClientRecord(createSampleFormData('SwitchB'), 'OWNER_MANUAL');

    try {
      // Client A'yı aktif yap
      setStoredActiveClientId(clientA.id);
      assert.strictEqual(getStoredActiveClientId(), clientA.id);

      // Client B'ye geç
      setStoredActiveClientId(clientB.id);
      assert.strictEqual(getStoredActiveClientId(), clientB.id);

      // Client B silindiğinde veya bulunamadığında fallback kontrolü
      const archiveB = getClientArchive(clientB.id);
      assert.strictEqual(archiveB?.client.id, clientB.id);
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
      setStoredActiveClientId(null);
    }
  });

  // 5. Danışan Silme ve İlişkisel Arşiv İzolasyonu
  it('5. Danışan silindiğinde yalnızca kendisine ait arşiv silinmeli; diğer danışanlar korunmalıdır', () => {
    const clientToKeep = createClientRecord(createSampleFormData('KeepMe'), 'OWNER_MANUAL');
    const clientToDelete = createClientRecord(createSampleFormData('DeleteMe'), 'OWNER_MANUAL');

    try {
      // Her ikisine de birer test kaydedelim
      saveClientTestResult(clientToKeep.id, {
        id: 'test_k1',
        clientId: clientToKeep.id,
        testType: 'ANIMAL_TOTEM',
        version: 1,
        completedAt: new Date().toISOString(),
        answers: [],
        primaryType: 'Kurt',
        dominantScores: { Kurt: 15 },
        interpretations: ['Kurt testi'],
      });

      saveClientTestResult(clientToDelete.id, {
        id: 'test_d1',
        clientId: clientToDelete.id,
        testType: 'ANIMAL_TOTEM',
        version: 1,
        completedAt: new Date().toISOString(),
        answers: [],
        primaryType: 'Şahin',
        dominantScores: { Şahin: 12 },
        interpretations: ['Şahin testi'],
      });

      // Silme işlemi
      const deleted = deleteClientRecord(clientToDelete.id);
      assert.strictEqual(deleted, true);

      // Silinen danışanın arşivi null olmalı
      assert.strictEqual(getClientArchive(clientToDelete.id), null);

      // Korunan danışan ve arşivi tamamen sağlam durmalı
      const keepArchive = getClientArchive(clientToKeep.id);
      assert.ok(keepArchive, 'Korunan danışanın arşivi sağlam kalmalıdır');
      assert.strictEqual(keepArchive.client.id, clientToKeep.id);
      assert.strictEqual(keepArchive.testResults.length, 1);
      assert.strictEqual(keepArchive.testResults[0].primaryType, 'Kurt');
    } finally {
      deleteClientRecord(clientToKeep.id);
    }
  });
});
