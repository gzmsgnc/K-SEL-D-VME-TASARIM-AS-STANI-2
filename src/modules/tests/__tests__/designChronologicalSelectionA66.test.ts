import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  selectLatestClientDesign,
  getClientDesigns,
  getClientArchive,
  setSafeStorage,
  STORAGE_KEYS,
  createClientRecord,
  deleteClientRecord,
} from '../../../store/storage';
import { ClientTattooDesign } from '../../../types/design';
import { Client } from '../../../types/client';

describe('A66: Tasarım Modülü — Eski Tasarım Kayıtlarında Kronolojik Seçim Doğrulama Testleri', () => {
  function createSampleClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `Chrono_${suffix}`,
        lastName: `Danisan_${suffix}`,
        email: `chrono_${suffix.toLowerCase()}@example.com`,
        phone: '5551112233',
        birthDate: '1992-07-15',
        birthTime: '12:00',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'İzmir',
          placeName: 'İzmir, Türkiye',
          latitude: 38.4192,
          longitude: 27.1287,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Emine',
        notes: 'A66 Kronolojik Tasarım Testi',
      },
      'OWNER_MANUAL'
    );
  }

  function createMockDesign(
    clientId: string,
    id: string,
    title: string,
    updatedAt?: string | null,
    createdAt?: string | null
  ): ClientTattooDesign {
    return {
      id,
      clientId,
      versionNumber: 1,
      title,
      conceptStatement: `${title} konsepti`,
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'Ön kol',
        recommendedDimensionsCm: { width: 14, height: 22 },
        colorProfile: 'MONOCHROME_BLACK',
        colorRationale: 'Siyah mürekkep',
        primarySymbol: 'Yaşam Çiçeği',
        secondarySymbols: ['Metatron Küpü'],
        keyComponents: ['Geometri'],
        technicalAdviceForArtist: ['3RL'],
      },
      aiPrompt: {
        primaryPromptEn: 'Sacred geometry tattoo',
        conceptPromptTr: 'Kutsal geometri',
        negativePrompt: 'blurry',
        aspectRatio: '3:4',
        artisticModifiers: ['fineline'],
      },
      createdAt: createdAt ?? '2026-04-01T10:00:00.000Z',
      updatedAt: updatedAt ?? '2026-04-01T10:00:00.000Z',
    };
  }

  // SENARYO 1: Tarih sırası doğru olan eski çoklu kayıtlar
  it('1. Tarih sırası doğru olan eski çoklu kayıtlarda en son güncellenen kayıt seçilmelidir', () => {
    const client = createSampleClient('Senaryo1');
    try {
      const d1 = createMockDesign(client.id, 'des_1', 'Eski Tasarım', '2026-04-01T10:00:00.000Z');
      const d2 = createMockDesign(client.id, 'des_2', 'Yeni Tasarım', '2026-04-05T12:00:00.000Z');

      setSafeStorage(STORAGE_KEYS.DESIGNS, [d1, d2]);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1, 'Yalnızca 1 kayıt dönmelidir');
      assert.strictEqual(designs[0].id, 'des_2', 'En güncel tarihli d2 seçilmelidir');
      assert.strictEqual(designs[0].title, 'Yeni Tasarım');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 2: Tarih sırası ters olan eski çoklu kayıtlar
  it('2. Tarih sırası ters (yeni kayıt başta, eski kayıt sonda) olan depolamada da en güncel kayıt seçilmelidir', () => {
    const client = createSampleClient('Senaryo2');
    try {
      const dNewer = createMockDesign(client.id, 'des_newer', 'Daha Yeni Tasarım', '2026-04-10T15:00:00.000Z');
      const dOlder = createMockDesign(client.id, 'des_older', 'Daha Eski Tasarım', '2026-04-02T08:00:00.000Z');

      // Dizide daha yeni olan dNewer başta, daha eski olan dOlder sonda
      setSafeStorage(STORAGE_KEYS.DESIGNS, [dNewer, dOlder]);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1);
      assert.strictEqual(designs[0].id, 'des_newer', 'Ters sıralı dizide dNewer seçilmelidir');
      assert.strictEqual(designs[0].title, 'Daha Yeni Tasarım');

      // getClientArchive ile de doğrulama
      const arch = getClientArchive(client.id);
      assert.ok(arch);
      assert.strictEqual(arch.designs.length, 1);
      assert.strictEqual(arch.designs[0].id, 'des_newer');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 3: Karışık tarih sırası
  it('3. Karışık tarih sıralı 4 eski kayıtta en güncel kayıt seçilmelidir', () => {
    const client = createSampleClient('Senaryo3');
    try {
      const d1 = createMockDesign(client.id, 'des_apr03', 'Tasarım 3 Nisan', '2026-04-03T10:00:00.000Z');
      const d2 = createMockDesign(client.id, 'des_apr01', 'Tasarım 1 Nisan', '2026-04-01T10:00:00.000Z');
      const d3 = createMockDesign(client.id, 'des_apr08', 'Tasarım 8 Nisan (En Yeni)', '2026-04-08T18:00:00.000Z');
      const d4 = createMockDesign(client.id, 'des_apr05', 'Tasarım 5 Nisan', '2026-04-05T12:00:00.000Z');

      setSafeStorage(STORAGE_KEYS.DESIGNS, [d1, d2, d3, d4]);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1);
      assert.strictEqual(designs[0].id, 'des_apr08');
      assert.strictEqual(designs[0].title, 'Tasarım 8 Nisan (En Yeni)');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 4: updatedAt eksik, createdAt mevcut kayıt
  it('4. Bir kayıtta updatedAt eksikken createdAt güncel ise doğru kronolojik seçim yapılmalıdır', () => {
    const client = createSampleClient('Senaryo4');
    try {
      // d1 updatedAt var ama 2 Nisan
      const d1 = createMockDesign(client.id, 'des_updated_earlier', '2 Nisan Güncellemesi', '2026-04-02T10:00:00.000Z');
      // d2 updatedAt yok (undefined), createdAt 6 Nisan (daha yeni)
      const d2 = createMockDesign(client.id, 'des_created_later', '6 Nisan Oluşturması', undefined, '2026-04-06T14:00:00.000Z');
      (d2 as any).updatedAt = undefined;

      setSafeStorage(STORAGE_KEYS.DESIGNS, [d1, d2]);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1);
      assert.strictEqual(designs[0].id, 'des_created_later', 'createdAt daha yeni olan d2 seçilmelidir');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 5: Her iki tarih alanı da eksik veya geçersiz kayıt
  it('5. Tarihi geçersiz veya eksik olan kayıtlar, geçerli tarihli kayıtlardan daha güncel kabul edilmemelidir', () => {
    const client = createSampleClient('Senaryo5');
    try {
      // dValid: Geçerli tarih (1 Nisan)
      const dValid = createMockDesign(client.id, 'des_valid', 'Geçerli Tarihli', '2026-04-01T10:00:00.000Z');
      // dCorrupt: Geçersiz tarih ('invalid-date-string')
      const dCorrupt = createMockDesign(client.id, 'des_corrupt', 'Bozuk Tarihli', 'not-a-date', 'also-not-a-date');
      // dMissing: Tarih alanı tamamen boş
      const dMissing = createMockDesign(client.id, 'des_missing', 'Eksik Tarihli', '', '');
      (dMissing as any).updatedAt = undefined;
      (dMissing as any).createdAt = undefined;

      // Bozuk ve eksik kayıtlar dizide geçerli kayıttan sonra gelse bile:
      setSafeStorage(STORAGE_KEYS.DESIGNS, [dValid, dCorrupt, dMissing]);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1);
      assert.strictEqual(designs[0].id, 'des_valid', 'Geçersiz/eksik tarihler geçerli tarihten daha güncel kabul edilemez');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 6: Aynı tarihli kayıtlar (deterministik tie-break)
  it('6. Aynı tarihli kayıtlarda deterministik tie-break kuralı uygulanmalı ve kararlı seçim sağlanmalıdır', () => {
    const client = createSampleClient('Senaryo6');
    try {
      const sameDate = '2026-04-05T12:00:00.000Z';
      const dA = createMockDesign(client.id, 'des_alpha', 'Tasarım Alpha', sameDate);
      const dB = createMockDesign(client.id, 'des_beta', 'Tasarım Beta', sameDate);

      // Farklı dizi sıralarında iki kez test et
      setSafeStorage(STORAGE_KEYS.DESIGNS, [dA, dB]);
      const res1 = getClientDesigns(client.id);

      setSafeStorage(STORAGE_KEYS.DESIGNS, [dB, dA]);
      const res2 = getClientDesigns(client.id);

      assert.strictEqual(res1.length, 1);
      assert.strictEqual(res2.length, 1);
      assert.strictEqual(res1[0].id, res2[0].id, 'Dizi sırası değişse bile deterministik sonuç aynı olmalıdır');
      assert.strictEqual(res1[0].id, 'des_beta', 'localeCompare(b.id, a.id) ile beta seçilmelidir');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // SENARYO 7: Danışan A ve B kayıtlarının birbirinden bağımsız kalması
  it('7. Danışan A ve Danışan B nin eski çoklu kayıtları birbirinden tamamen izole kalmalıdır', () => {
    const clientA = createSampleClient('Senaryo7A');
    const clientB = createSampleClient('Senaryo7B');
    try {
      const dA_old = createMockDesign(clientA.id, 'dA_old', 'A Eski', '2026-04-01T10:00:00.000Z');
      const dA_new = createMockDesign(clientA.id, 'dA_new', 'A Yeni', '2026-04-06T10:00:00.000Z');

      const dB_old = createMockDesign(clientB.id, 'dB_old', 'B Eski', '2026-04-02T10:00:00.000Z');
      const dB_new = createMockDesign(clientB.id, 'dB_new', 'B Yeni', '2026-04-07T10:00:00.000Z');

      // Karışık şekilde depola
      setSafeStorage(STORAGE_KEYS.DESIGNS, [dA_new, dB_old, dA_old, dB_new]);

      const resA = getClientDesigns(clientA.id);
      const resB = getClientDesigns(clientB.id);

      assert.strictEqual(resA.length, 1);
      assert.strictEqual(resB.length, 1);
      assert.strictEqual(resA[0].id, 'dA_new', 'Danışan A nın en günceli dA_new seçilmelidir');
      assert.strictEqual(resB[0].id, 'dB_new', 'Danışan B nin en günceli dB_new seçilmelidir');
      assert.strictEqual(resA[0].clientId, clientA.id);
      assert.strictEqual(resB[0].clientId, clientB.id);
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // SENARYO 8: Storage dan tekrar okunduğunda aynı güncel kaydın seçilmesi (idempotency)
  it('8. Storage dan ardışık okumalarda ve orijinal diziyi mutate etmeden aynı güncel kayıt seçilmelidir', () => {
    const client = createSampleClient('Senaryo8');
    try {
      const d1 = createMockDesign(client.id, 'd_1', '1 Nisan', '2026-04-01T10:00:00.000Z');
      const d2 = createMockDesign(client.id, 'd_2', '3 Nisan', '2026-04-03T10:00:00.000Z');
      const d3 = createMockDesign(client.id, 'd_3', '5 Nisan', '2026-04-05T10:00:00.000Z');

      const originalArray = [d2, d1, d3];
      setSafeStorage(STORAGE_KEYS.DESIGNS, originalArray);

      // 1. okuma
      const read1 = getClientDesigns(client.id);
      // 2. okuma
      const read2 = getClientDesigns(client.id);
      // 3. getClientArchive ile okuma
      const archiveRead = getClientArchive(client.id);

      assert.strictEqual(read1[0].id, 'd_3');
      assert.strictEqual(read2[0].id, 'd_3');
      assert.strictEqual(archiveRead?.designs[0].id, 'd_3');

      // selectLatestClientDesign doğrudan çağrıldığında orijinal diziyi mutate etmediğini kontrol et
      const directArray = [d2, d1, d3];
      selectLatestClientDesign(directArray, client.id);
      assert.strictEqual(directArray[0].id, 'd_2', 'Orijinal dizi mutate edilmemelidir');
      assert.strictEqual(directArray[1].id, 'd_1');
      assert.strictEqual(directArray[2].id, 'd_3');
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
