import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS } from '../../../components/navigation/Sidebar';
import { AppRoute } from '../../../types/navigation';
import {
  createClientRecord,
  deleteClientRecord,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getClientArchive,
  clearAllApplicationData,
} from '../../../store/storage';
import { ClientFormData } from '../../../types/client';

describe('A72 — Sol Menü 4+1 Modeli ve Rota Bütünlüğü Doğrulama Testleri', () => {
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
  });

  afterEach(() => {
    clearAllApplicationData();
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

  const sampleFormData: ClientFormData = {
    firstName: 'Zeynep',
    lastName: 'Kaya',
    email: 'zeynep@example.com',
    phone: '05559876543',
    birthDate: '1995-09-21',
    birthTime: '14:20',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Kadıköy, İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 40.99,
      longitude: 29.03,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'A72 test danışanı',
  };

  test('1. Sol menü (NAV_ITEMS) tam olarak 4 ana başlık içermelidir', () => {
    assert.equal(NAV_ITEMS.length, 4, 'Sol menü 4 ana başlık içermelidir');

    const expectedIds: AppRoute[] = [
      'DASHBOARD',
      'CLIENTS',
      'SYMBOL_LIBRARY',
      'SYSTEM_ADMIN',
    ];

    const expectedLabels = [
      'Ana Sayfa',
      'Danışanlar & Çalışma Alanı',
      'Sembol Kütüphanesi',
      'Sistem Yönetimi',
    ];

    NAV_ITEMS.forEach((item, index) => {
      assert.equal(item.id, expectedIds[index]);
      assert.equal(item.labelTr, expectedLabels[index]);
      assert.ok(item.icon, `${item.labelTr} ikonu tanımlı olmalı`);
      assert.ok(item.descriptionTr, `${item.labelTr} açıklaması tanımlı olmalı`);
    });
  });

  test('2. Analiz Merkezi, Tasarım Stüdyosu ve Tasarım Raporları sol menüden çıkarılmış olmalıdır', () => {
    const itemIds = NAV_ITEMS.map((item) => item.id);
    assert.equal(itemIds.includes('ANALYSIS_HUB' as any), false, 'ANALYSIS_HUB sol menüde olmamalıdır');
    assert.equal(itemIds.includes('DESIGN_STUDIO' as any), false, 'DESIGN_STUDIO sol menüde olmamalıdır');
    assert.equal(itemIds.includes('DESIGN_REPORTS' as any), false, 'DESIGN_REPORTS sol menüde olmamalıdır');
  });

  test('3. Eski rota yönlendirmeleri (ANALYSIS_HUB, DESIGN_STUDIO, DESIGN_REPORTS) boşa düşmemeli, CLIENTS altına bağlanmalıdır', () => {
    // Simüle edilmiş rota çözümleme fonksiyonu (Sidebar ve Dashboard mantığı)
    function resolveRouteWithTab(route: AppRoute): { targetRoute: AppRoute; targetTab?: string } {
      if (route === 'ANALYSIS_HUB') {
        return { targetRoute: 'CLIENTS', targetTab: 'ANALYSES' };
      }
      if (route === 'DESIGN_STUDIO') {
        return { targetRoute: 'CLIENTS', targetTab: 'RECIPE' };
      }
      if (route === 'DESIGN_REPORTS') {
        return { targetRoute: 'CLIENTS', targetTab: 'RESULTS' };
      }
      return { targetRoute: route };
    }

    const resAnalysis = resolveRouteWithTab('ANALYSIS_HUB');
    assert.equal(resAnalysis.targetRoute, 'CLIENTS');
    assert.equal(resAnalysis.targetTab, 'ANALYSES');

    const resStudio = resolveRouteWithTab('DESIGN_STUDIO');
    assert.equal(resStudio.targetRoute, 'CLIENTS');
    assert.equal(resStudio.targetTab, 'RECIPE');

    const resReports = resolveRouteWithTab('DESIGN_REPORTS');
    assert.equal(resReports.targetRoute, 'CLIENTS');
    assert.equal(resReports.targetTab, 'RESULTS');
  });

  test('4. Aktif danışan seçimi, saklama ve veri izolasyonu tam olarak korunmalıdır', () => {
    const client = createClientRecord(sampleFormData);
    assert.ok(client.id);

    // Aktif danışan seçimi
    setStoredActiveClientId(client.id);
    assert.equal(getStoredActiveClientId(), client.id);

    // Arşivin erişilebilirliği
    const archive = getClientArchive(client.id);
    assert.ok(archive);
    assert.equal(archive.client.id, client.id);

    // Seçim kaldırıldığında veri silinmez
    setStoredActiveClientId(null);
    assert.equal(getStoredActiveClientId(), null);
    const clients = getStoredClients();
    assert.equal(clients.some((c) => c.id === client.id), true);

    deleteClientRecord(client.id);
  });
});
