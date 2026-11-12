import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setSafeStorage,
  getSafeStorage,
  clearAllApplicationData,
  clearMemoryFallback,
  isKeyInMemoryFallback,
  getLastStorageWriteResult,
  combineStorageResults,
  createClientRecord,
  saveClientAstrologyChart,
  saveClientNumerology,
  getClientArchive,
  StorageWriteResult,
} from '../../../store/storage';
import { ClientFormData } from '../../../types/client';
import { TropicalNatalChart } from '../../../types/astrology';
import { NumerologyAnalysis } from '../../../types/analysis';

describe('A70 — Depolama Hata Yönetimi ve Geri Bildirim Doğrulama Test Paketi', () => {
  // Mock localStorage yapısı
  const mockStorageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string): string | null => {
      return mockStorageMap.has(key) ? mockStorageMap.get(key)! : null;
    },
    setItem: (key: string, value: string): void => {
      mockStorageMap.set(key, String(value));
    },
    removeItem: (key: string): void => {
      mockStorageMap.delete(key);
    },
    clear: (): void => {
      mockStorageMap.clear();
    },
    get length(): number {
      return mockStorageMap.size;
    },
    key: (index: number): string | null => {
      return Array.from(mockStorageMap.keys())[index] || null;
    },
  };

  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    mockStorageMap.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: { ...mockLocalStorage },
      writable: true,
      configurable: true,
    });
    clearAllApplicationData();
    clearMemoryFallback();
  });

  afterEach(() => {
    clearAllApplicationData();
    clearMemoryFallback();
    if (originalLocalStorage !== undefined) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  const mockFormDataA: ClientFormData = {
    firstName: 'Zeynep',
    lastName: 'Aksoy',
    email: 'zeynep@example.com',
    phone: '05551234567',
    birthDate: '1995-07-20',
    birthTime: '12:00',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Kadıköy, İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 40.99,
      longitude: 29.02,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Emine',
    notes: 'Test danışanı A',
  };

  const mockFormDataB: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Kaya',
    email: 'baris@example.com',
    phone: '05559876543',
    birthDate: '1990-03-15',
    birthTime: '15:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Çankaya, Ankara, Türkiye',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.92,
      longitude: 32.85,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'Test danışanı B',
  };

  // 1. Normal Başarılı Yazma
  test('1. Normal depolama yazımı status: persisted ve hata içermeyen sonuç döndürür', () => {
    const testKey = 'test_normal_key_v1';
    const payload = { test: true, timestamp: 123456789 };

    const result = setSafeStorage(testKey, payload);

    assert.equal(result.status, 'persisted');
    assert.equal(result.key, testKey);
    assert.equal(result.errorType, undefined);
    assert.equal(isKeyInMemoryFallback(testKey), false);

    const retrieved = getSafeStorage<typeof payload>(testKey, null as any);
    assert.deepEqual(retrieved, payload);
    assert.equal(mockStorageMap.has(testKey), true);
  });

  // 2. QuotaExceededError Yakalama ve memory_only Geçişi
  test('2. QuotaExceededError durumunda yazıcı memory_only durumuna geçer ve quota_exceeded türü bildirir', () => {
    const testKey = 'test_quota_key_v1';
    const payload = { data: 'büyük_veri_simülasyonu' };

    (globalThis as any).localStorage.setItem = () => {
      const error = new Error('Quota exceeded on disk');
      error.name = 'QuotaExceededError';
      (error as any).code = 22;
      throw error;
    };

    const result = setSafeStorage(testKey, payload);

    assert.equal(result.status, 'memory_only');
    assert.equal(result.key, testKey);
    assert.equal(result.errorType, 'quota_exceeded');
    assert.equal(isKeyInMemoryFallback(testKey), true);
    assert.ok(result.errorMessage?.includes('Quota'));
  });

  // 3. SecurityError Yakalama ve memory_only Geçişi
  test('3. SecurityError / erişim engeli durumunda memory_only durumuna geçer ve security_error bildirir', () => {
    const testKey = 'test_security_key_v1';
    const payload = { secure: true };

    (globalThis as any).localStorage.setItem = () => {
      const error = new Error('Security check failed');
      error.name = 'SecurityError';
      (error as any).code = 18;
      throw error;
    };

    const result = setSafeStorage(testKey, payload);

    assert.equal(result.status, 'memory_only');
    assert.equal(result.key, testKey);
    assert.equal(result.errorType, 'security_error');
    assert.equal(isKeyInMemoryFallback(testKey), true);
  });

  // 4. Döngüsel Referans Serileştirme Hatası
  test('4. Döngüsel referans serileştirme hatasında status: failed ve serialization_error üretilir', () => {
    const testKey = 'test_circular_key_v1';
    const circularObj: any = { name: 'Döngüsel Nesne' };
    circularObj.self = circularObj;

    const result = setSafeStorage(testKey, circularObj);

    assert.equal(result.status, 'failed');
    assert.equal(result.key, testKey);
    assert.equal(result.errorType, 'serialization_error');
    assert.equal(isKeyInMemoryFallback(testKey), false);
  });

  // 5. getSafeStorage Bellek Yedeğinden Doğru Okuma
  test('5. getSafeStorage, bellek yedeğindeki veriyi (memoryFallbackKeys) eksiksiz okur', () => {
    const testKey = 'test_fallback_read_key_v1';
    const memoryData = { token: 'secret-xyz', count: 42 };

    (globalThis as any).localStorage.setItem = () => {
      throw new Error('Disk doldu');
    };

    const writeRes = setSafeStorage(testKey, memoryData);
    assert.equal(writeRes.status, 'memory_only');

    const readData = getSafeStorage<typeof memoryData>(testKey, null as any);
    assert.deepEqual(readData, memoryData);
    assert.equal(readData?.count, 42);
  });

  // 6. Bellek Yedeği Bayat localStorage Verisini Geçersiz Kılar
  test('6. Bellek yedeği, localStorage içindeki eski/bayat veriyi geçersiz kılar', () => {
    const testKey = 'test_stale_override_key_v1';
    const staleData = { version: 1, text: 'eski_bayat_veri' };
    const freshData = { version: 2, text: 'yeni_taze_veri' };

    // Önce normal yazma ile staleData yaz
    setSafeStorage(testKey, staleData);
    assert.deepEqual(getSafeStorage<typeof staleData>(testKey, null as any), staleData);
    assert.equal(mockStorageMap.has(testKey), true);

    // Şimdi localStorage yazmasını simüle edilmiş hata ile kesintiye uğrat
    (globalThis as any).localStorage.setItem = () => {
      throw new Error('Yazma kısıtlaması');
    };

    const secondWriteRes = setSafeStorage(testKey, freshData);
    assert.equal(secondWriteRes.status, 'memory_only');

    // getSafeStorage artık localStorage'daki bayat version: 1 verisini DEĞİL, taze version: 2 verisini dönmeli
    const finalRead = getSafeStorage<typeof freshData>(testKey, null as any);
    assert.deepEqual(finalRead, freshData);
    assert.equal(finalRead?.version, 2);
    assert.equal(finalRead?.text, 'yeni_taze_veri');
  });

  // 7. Bellek Yedeği Durumunda Uyarı (Warning) Üretimi
  test('7. Bellek yedeği (memory_only) yazımında yeşil başarı yerine açık uyarı durumu üretilir', () => {
    (globalThis as any).localStorage.setItem = () => {
      const err = new Error('Quota exceeded on disk');
      err.name = 'QuotaExceededError';
      throw err;
    };

    const client = createClientRecord(mockFormDataA);
    const lastRes = getLastStorageWriteResult();

    assert.ok(client, 'Danışan nesnesi oturum belleğinde oluşturuldu');
    assert.equal(lastRes?.status, 'memory_only');
    assert.equal((lastRes as StorageWriteResult)?.errorType, 'quota_exceeded');
    assert.notEqual(lastRes?.status, 'persisted');
  });

  // 8. Tamamen Başarısız Yazmada Hata Fırlatma / failed durumu
  test('8. Tamamen başarısız yazma durumunda setSafeStorage failed ve serialization_error döner', () => {
    const testKey = 'test_complete_fail_key';
    const circularObj: any = { data: 'test' };
    circularObj.loop = circularObj;

    const res = setSafeStorage(testKey, circularObj);
    assert.equal(res.status, 'failed');
    assert.equal(res.errorType, 'serialization_error');
  });

  // 9. Çoklu Anahtar / Cascade İşlemlerinde partial_failure Tespiti
  test('9. combineStorageResults fonksiyonu tekil yazma başarısızlığında partial_failure üretir', () => {
    const successRes: StorageWriteResult = {
      status: 'persisted',
      key: 'key_clients',
    };
    const memoryRes: StorageWriteResult = {
      status: 'memory_only',
      key: 'key_archive',
      errorType: 'quota_exceeded',
      errorMessage: 'Kota aşıldı',
    };
    const failedRes: StorageWriteResult = {
      status: 'failed',
      key: 'key_designs',
      errorType: 'serialization_error',
      errorMessage: 'Serileştirilemedi',
    };

    // Tüm persisted -> persisted
    const allPersisted = combineStorageResults([successRes, successRes]);
    assert.equal(allPersisted.status, 'persisted');

    // Tüm memory_only -> memory_only
    const allMemory = combineStorageResults([memoryRes, memoryRes]);
    assert.equal(allMemory.status, 'memory_only');
    assert.ok(allMemory.warning?.includes('geçici oturum belleğinde'));

    // Tüm failed -> failed
    const allFailed = combineStorageResults([failedRes, failedRes]);
    assert.equal(allFailed.status, 'failed');
    assert.ok(allFailed.error?.includes('Veriler kalıcı depolama alanına yazılamadı'));

    // Persisted + memory_only -> partial_failure
    const persistedAndMemory = combineStorageResults([successRes, memoryRes]);
    assert.equal(persistedAndMemory.status, 'partial_failure');
    assert.ok(persistedAndMemory.warning?.includes('Kısmi depolama'));

    // Persisted + failed -> partial_failure
    const partialFail = combineStorageResults([successRes, failedRes]);
    assert.equal(partialFail.status, 'partial_failure');
    assert.ok(partialFail.warning?.includes('Kısmi depolama'));

    // Memory + failed -> partial_failure
    const memoryAndFailed = combineStorageResults([memoryRes, failedRes]);
    assert.equal(memoryAndFailed.status, 'partial_failure');
  });

  // 10. Bellek Yedeği Modunda Danışan Veri İzolasyonunun Korunması
  test('10. Bellek yedeği modunda danışan verileri (Client A vs Client B) kesinlikle karışmaz ve izoledir', () => {
    // Tüm depolama işlemlerini memory_only moduna al
    (globalThis as any).localStorage.setItem = () => {
      const error = new Error('Disk salt okunur veya dolu');
      error.name = 'QuotaExceededError';
      throw error;
    };

    const clientA = createClientRecord(mockFormDataA);
    const clientB = createClientRecord(mockFormDataB);

    assert.notEqual(clientA.id, clientB.id);

    // Danışan A için astroloji kaydet
    const mockChartA: TropicalNatalChart = {
      zodiacSystem: 'TROPICAL',
      houseSystem: 'PLACIDUS',
      isBirthTimeUnknown: false,
      birthDate: mockFormDataA.birthDate,
      latitude: mockFormDataA.birthLocation.latitude,
      longitude: mockFormDataA.birthLocation.longitude,
      timezone: mockFormDataA.birthLocation.timezone,
      utcOffsetMinutes: mockFormDataA.birthLocation.utcOffsetMinutes,
      sunSign: 'Cancer',
      moonSign: 'Taurus',
      ascendantSign: 'Libra',
    };
    saveClientAstrologyChart(clientA.id, mockChartA);

    // Danışan B için numeroloji kaydet
    const mockNumerologyB: NumerologyAnalysis = {
      fullName: 'Barış Kaya',
      birthDate: '1990-03-15',
      lifePathNumber: 7,
      destinyNumber: 3,
      soulUrgeNumber: 9,
      personalityNumber: 5,
      birthdayNumber: 15,
      worldMissionNumber: 10,
      karmicLessons: [4],
      masterNumbers: [],
    };
    saveClientNumerology(clientB.id, mockNumerologyB);

    // İzolasyon doğrulaması: Client A arşivi Client B verilerini içermemeli
    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.ok(archiveA, 'Archive A oturum belleğinden okunabildi');
    assert.ok(archiveB, 'Archive B oturum belleğinden okunabildi');

    assert.equal(archiveA?.analyses[0]?.astrology?.sunSign, 'Cancer');
    assert.equal(archiveA?.analyses[0]?.numerology, undefined, 'Client A numerolojisi boştur (Client B verisi sızmamıştır)');

    assert.equal(archiveB?.analyses[0]?.astrology, undefined, 'Client B astrolojisi boştur (Client A verisi sızmamıştır)');
    assert.equal(archiveB?.analyses[0]?.numerology?.lifePathNumber, 7);
  });
});
