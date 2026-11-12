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
  updateClientRecord,
  saveClientAstrologyChart,
  clearClientAstrologyChart,
  saveClientNumerology,
  clearClientNumerology,
  saveClientEbced,
  clearClientEbced,
  saveClientChakra,
  clearClientChakra,
  saveClientArchetype,
  clearClientArchetype,
  saveClientDesign,
  clearClientDesigns,
  saveClientReport,
  clearClientReports,
  saveClientSymbolAnalysis,
  clearClientSymbolAnalyses,
  saveClientTestResult,
  clearClientTestResult,
  saveClientTestDraft,
  getClientTestDraft,
  clearClientTestDraft,
  getClientArchive,
  STORAGE_KEYS,
  StorageWriteResult,
} from '../../../store/storage';
import { ClientFormData, Client } from '../../../types/client';
import { ClientSymbolAnalysis } from '../../../types/symbol';
import { ClientTattooDesign } from '../../../types/design';
import { ClientTestResult } from '../../../types/test';

describe('A71 — Kalan Depolama Geri Bildirimi ve Sıfırlama Hata Yönetimi Doğrulama Paketi', () => {
  const mockStorageMap = new Map<string, string>();
  let throwOnSetItemKeys: Set<string> = new Set();
  let throwQuotaOnSetItem = false;
  let throwSecurityOnSetItem = false;

  const mockLocalStorage = {
    getItem: (key: string): string | null => {
      return mockStorageMap.has(key) ? mockStorageMap.get(key)! : null;
    },
    setItem: (key: string, value: string): void => {
      if (throwSecurityOnSetItem) {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
      if (throwQuotaOnSetItem) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      if (throwOnSetItemKeys.has(key)) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
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
    throwOnSetItemKeys = new Set();
    throwQuotaOnSetItem = false;
    throwSecurityOnSetItem = false;
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

  const mockFormData: ClientFormData = {
    firstName: 'Canan',
    lastName: 'Yılmaz',
    email: 'canan@example.com',
    phone: '05551234567',
    birthDate: '1992-05-14',
    birthTime: '10:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Beşiktaş, İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.04,
      longitude: 29.00,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'A71 test danışanı',
  };

  // Senaryo 1: Sembol analizinin persisted / memory_only / partial_failure / failed durumları
  test('1. Sembol analizi: persisted ve memory_only yazma durumlarını doğru raporlar', () => {
    const client = createClientRecord(mockFormData);
    const symbolAnalysis: ClientSymbolAnalysis = {
      id: 'sym-1',
      clientId: client.id,
      version: 1,
      compositionNarrative: 'Test anlatımı',
      selectedSymbols: [
        { symbolId: 'solomon_seal', symbolName: 'Süleyman Mührü', customMeaning: '', weight: 'PRIMARY' },
      ],
      createdAt: new Date().toISOString(),
    };

    // A. Normal koşulda persisted
    saveClientSymbolAnalysis(client.id, symbolAnalysis);
    const writeRes1 = getLastStorageWriteResult();
    assert.ok(writeRes1);
    assert.equal(writeRes1.status, 'persisted');
    assert.equal(isKeyInMemoryFallback(STORAGE_KEYS.SYMBOLS), false);

    // B. localStorage yazma engellendiğinde memory_only
    throwQuotaOnSetItem = true;
    const symbolAnalysis2: ClientSymbolAnalysis = {
      ...symbolAnalysis,
      id: 'sym-2',
      version: 2,
    };
    saveClientSymbolAnalysis(client.id, symbolAnalysis2);
    const writeRes2 = getLastStorageWriteResult();
    assert.ok(writeRes2);
    assert.equal(writeRes2.status, 'memory_only');
    assert.equal(isKeyInMemoryFallback(STORAGE_KEYS.SYMBOLS), true);
  });

  // Senaryo 2: Yeni danışan eklemede persisted vs memory_only / partial_failure
  test('2. Yeni danışan ekleme: persisted ve memory_only durumunu net şekilde ayırır', () => {
    // Normal durum
    const client1 = createClientRecord(mockFormData);
    const res1 = getLastStorageWriteResult();
    assert.ok(res1);
    assert.equal(res1.status, 'persisted');

    // Quota hatası durumunda memory_only
    throwQuotaOnSetItem = true;
    const client2 = createClientRecord({
      ...mockFormData,
      firstName: 'Elif',
      email: 'elif@example.com',
    });
    const res2 = getLastStorageWriteResult();
    assert.ok(res2);
    assert.equal(res2.status, 'memory_only');
    assert.ok(client2.id);
  });

  // Senaryo 3: Danışan profil güncellemede persisted vs memory_only
  test('3. Danışan profil güncelleme: persisted ve memory_only durumunu doğru tespit eder', () => {
    const client = createClientRecord(mockFormData);
    const updatedClient: Client = {
      ...client,
      notes: 'Güncellenmiş notlar',
    };

    // Normal güncelleme -> persisted
    updateClientRecord(updatedClient);
    const res1 = getLastStorageWriteResult();
    assert.ok(res1);
    assert.equal(res1.status, 'persisted');

    // Quota hatası durumunda -> memory_only
    throwQuotaOnSetItem = true;
    updateClientRecord({ ...client, notes: 'Geçici bellek güncellemesi' });
    const res2 = getLastStorageWriteResult();
    assert.ok(res2);
    assert.equal(res2.status, 'memory_only');
  });

  // Senaryo 4: Test tamamlandığında bağlı dövme tasarımının durumu
  test('4. Dövme tasarımı kaydetme: persisted vs memory_only yazımını ayrıntılı bildirir', () => {
    const client = createClientRecord(mockFormData);
    const dummyDesign: ClientTattooDesign = {
      id: 'des-1',
      clientId: client.id,
      title: 'Geometrik Lotus',
      conceptStatement: 'Konsept açıklaması',
      recipe: {} as any,
      aiPrompt: {} as any,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Normal kayıt -> persisted
    saveClientDesign(client.id, dummyDesign);
    const res1 = getLastStorageWriteResult();
    assert.ok(res1);
    assert.equal(res1.status, 'persisted');

    // İkincil tasarım kaydı sırasında DESIGNS anahtarı quota aşımı verirse -> memory_only
    throwOnSetItemKeys.add(STORAGE_KEYS.DESIGNS);
    saveClientDesign(client.id, { ...dummyDesign, id: 'des-2' });
    const res2 = getLastStorageWriteResult();
    assert.ok(res2);
    assert.equal(res2.status, 'memory_only');
  });

  // Senaryo 5: Modül sıfırlama fonksiyonlarının sonuç üretmesi
  test('5. Modül sıfırlama fonksiyonları (clearClient*) getLastStorageWriteResult üretir', () => {
    const client = createClientRecord(mockFormData);

    // Astroloji sıfırlama
    clearClientAstrologyChart(client.id);
    const astroRes = getLastStorageWriteResult();
    assert.ok(astroRes, 'clearClientAstrologyChart sonuç üretmeli');
    assert.notEqual(astroRes.status, 'failed');

    // Numeroloji sıfırlama
    clearClientNumerology(client.id);
    const numRes = getLastStorageWriteResult();
    assert.ok(numRes, 'clearClientNumerology sonuç üretmeli');
    assert.notEqual(numRes.status, 'failed');

    // Ebced sıfırlama
    clearClientEbced(client.id);
    const ebcedRes = getLastStorageWriteResult();
    assert.ok(ebcedRes, 'clearClientEbced sonuç üretmeli');
    assert.notEqual(ebcedRes.status, 'failed');

    // Çakra sıfırlama
    clearClientChakra(client.id);
    const chakraRes = getLastStorageWriteResult();
    assert.ok(chakraRes, 'clearClientChakra sonuç üretmeli');
    assert.notEqual(chakraRes.status, 'failed');

    // Arketip sıfırlama
    clearClientArchetype(client.id);
    const archRes = getLastStorageWriteResult();
    assert.ok(archRes, 'clearClientArchetype sonuç üretmeli');
    assert.notEqual(archRes.status, 'failed');

    // Tasarım sıfırlama
    clearClientDesigns(client.id);
    const desRes = getLastStorageWriteResult();
    assert.ok(desRes, 'clearClientDesigns sonuç üretmeli');
    assert.notEqual(desRes.status, 'failed');

    // Sembol sıfırlama
    clearClientSymbolAnalyses(client.id);
    const symRes = getLastStorageWriteResult();
    assert.ok(symRes, 'clearClientSymbolAnalyses sonuç üretmeli');
    assert.notEqual(symRes.status, 'failed');

    // Test sonucu sıfırlama
    clearClientTestResult(client.id, 'ENNEAGRAM');
    const testRes = getLastStorageWriteResult();
    assert.ok(testRes, 'clearClientTestResult sonuç üretmeli');
    assert.notEqual(testRes.status, 'failed');

    // Test taslağı sıfırlama
    clearClientTestDraft(client.id, 'ENNEAGRAM');
    const draftRes = getLastStorageWriteResult();
    assert.ok(draftRes, 'clearClientTestDraft sonuç üretmeli');
    assert.notEqual(draftRes.status, 'failed');
  });

  // Senaryo 6: clearAllApplicationData çağrısında localStorage başarısızsa clearMemoryFallback() çağrılmaması
  test('6. clearAllApplicationData: kalıcı depolama başarısız olduğunda bellek yedeği korunur', () => {
    // Önce bir danışan oluştur
    const client = createClientRecord(mockFormData);

    // localStorage yazmasını başarısız kıl
    throwQuotaOnSetItem = true;

    // clearAllApplicationData çalıştır
    const ok = clearAllApplicationData();
    assert.equal(ok, true);

    const writeRes = getLastStorageWriteResult();
    assert.ok(writeRes);
    // localStorage yazılamadığı için memory_only olmalı
    assert.equal(writeRes.status, 'memory_only');

    // Fallback store sıfırlanmamalı, çünkü fallback store'da verilerin boş dizi olarak kalması
    // getSafeStorage'ın eski localStorage verilerini geri yüklemesini engeller!
    assert.equal(isKeyInMemoryFallback(STORAGE_KEYS.CLIENTS), true);
  });

  // Senaryo 7: Test taslak kaydetmede persisted / memory_only / failed durumları
  test('7. Test taslak kaydetme: persisted ve memory_only durumlarını doğru ayırır', () => {
    const client = createClientRecord(mockFormData);

    // Normal yazma -> persisted
    saveClientTestDraft(client.id, 'ENNEAGRAM', { 'q-1': 'opt-a' }, 0);
    const res1 = getLastStorageWriteResult();
    assert.ok(res1);
    assert.equal(res1.status, 'persisted');

    // Quota hatası durumunda -> memory_only
    throwQuotaOnSetItem = true;
    saveClientTestDraft(client.id, 'ENNEAGRAM', { 'q-1': 'opt-a', 'q-2': 'opt-b' }, 1);
    const res2 = getLastStorageWriteResult();
    assert.ok(res2);
    assert.equal(res2.status, 'memory_only');

    // Taslak bellekten okunabilmeli
    const draft = getClientTestDraft(client.id, 'ENNEAGRAM');
    assert.ok(draft);
    assert.equal(draft.answers['q-2'], 'opt-b');
  });

  // Senaryo 8: Başarısız kalıcı kayıtta kullanıcıya dürüst depolama durumu bildirilmesi
  test('8. combineStorageResults: tek bir memory_only bile varsa sonucu genel memory_only veya partial_failure yapar', () => {
    const resPersisted: StorageWriteResult = { status: 'persisted', key: STORAGE_KEYS.CLIENTS };
    const resMemory: StorageWriteResult = { status: 'memory_only', key: STORAGE_KEYS.ANALYSES };

    const combined = combineStorageResults([resPersisted, resMemory]);
    assert.equal(combined.status, 'partial_failure');
    assert.ok(combined.warning);
    assert.equal(Object.keys(combined.results).length, 2);
  });

  // Senaryo 9: memoryFallbackStore'un veri izolasyonunu koruması
  test('9. memoryFallbackStore: kalıcı depolama kapalıyken bile danışanlar arasında izolasyonu korur', () => {
    throwQuotaOnSetItem = true;

    // Danışan 1 ve Taslağı
    const client1 = createClientRecord(mockFormData);
    saveClientTestDraft(client1.id, 'ENNEAGRAM', { 'q-1': 'ans-1' }, 0);

    // Danışan 2 ve Taslağı
    const client2 = createClientRecord({
      ...mockFormData,
      firstName: 'Kemal',
      email: 'kemal@example.com',
    });
    saveClientTestDraft(client2.id, 'ENNEAGRAM', { 'q-1': 'ans-2' }, 0);

    // Danışan 1'in taslağı Danışan 2 ile karışmamalı
    const draft1 = getClientTestDraft(client1.id, 'ENNEAGRAM');
    const draft2 = getClientTestDraft(client2.id, 'ENNEAGRAM');

    assert.equal(draft1?.answers['q-1'], 'ans-1');
    assert.equal(draft2?.answers['q-1'], 'ans-2');
    assert.notEqual(draft1?.clientId, draft2?.clientId);
  });
});
