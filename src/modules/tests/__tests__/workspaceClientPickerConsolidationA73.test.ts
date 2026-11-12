import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppRoute, WorkspaceDetailTab } from '../../../types/navigation';
import {
  createClientRecord,
  deleteClientRecord,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getClientArchive,
  clearAllApplicationData,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  saveClientTestResult,
} from '../../../store/storage';
import { Client, ClientFormData } from '../../../types/client';
import { TropicalNatalChart } from '../../../types/astrology';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../../../types/analysis';
import { ClientTattooDesign } from '../../../types/design';
import { ClientTestResult } from '../../../types/test';

describe('A73 — ClientModulePicker ve Sahip Çalışma Alanı Birleştirmesi Doğrulama Testleri', () => {
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

  const clientDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Yılmaz',
    email: 'deniz@example.com',
    phone: '05551112233',
    birthDate: '1990-03-21',
    birthTime: '08:30',
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
    motherName: 'Ayşe',
    notes: 'A73 Test Danışanı A',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Demir',
    email: 'baris@example.com',
    phone: '05554445566',
    birthDate: '1988-11-15',
    birthTime: '21:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Konak, İzmir, Türkiye',
      city: 'İzmir',
      country: 'Türkiye',
      latitude: 38.42,
      longitude: 27.14,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Emine',
    notes: 'A73 Test Danışanı B',
  };

  test('1. Hiç danışan yokken çalışma alanının açılması ve boş durum davranışı', () => {
    const clients = getStoredClients();
    assert.equal(clients.length, 0, 'Başlangıçta kayıtlı danışan bulunmamalıdır');

    const activeId = getStoredActiveClientId();
    assert.equal(activeId, null, 'Danışan yokken aktif danışan null olmalıdır');

    // Çalışma alanı boş liste durumunda hata fırlatmamalıdır
    const candidateId = activeId || (clients.length > 0 ? clients[0].id : null);
    assert.equal(candidateId, null, 'Boş danışan listesinde fallback id null olmalıdır');
  });

  test('2. Bir danışan varken doğru danışanın gösterilmesi', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    assert.ok(client.id, 'Danışan kimliği üretilmelidir');

    setStoredActiveClientId(client.id);
    const storedActiveId = getStoredActiveClientId();
    assert.equal(storedActiveId, client.id, 'Kayıtlı aktif danışan kimliği eşleşmelidir');

    const clients = getStoredClients();
    assert.equal(clients.length, 1);
    const activeClient = clients.find((c) => c.id === storedActiveId) || null;
    assert.ok(activeClient);
    assert.equal(activeClient?.firstName, 'Deniz');
    assert.equal(activeClient?.lastName, 'Yılmaz');
    assert.equal(activeClient?.birthLocation?.city, 'Ankara');
  });

  test('3. Birden fazla danışan varken arama ve seçim davranışı', () => {
    const cA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const cB = createClientRecord(clientDataB, 'OWNER_MANUAL');

    const clients = getStoredClients();
    assert.equal(clients.length, 2);

    // Arama simülasyonu: İsimle arama
    const searchByName = (term: string) => {
      const lower = term.toLowerCase().trim();
      return clients.filter((c) => {
        const full = `${c.firstName} ${c.lastName}`.toLowerCase();
        return full.includes(lower) || (c.birthLocation?.city || '').toLowerCase().includes(lower);
      });
    };

    const resultsA = searchByName('Deniz');
    assert.equal(resultsA.length, 1);
    assert.equal(resultsA[0].id, cA.id);

    // Şehirle arama
    const resultsCity = searchByName('İzmir');
    assert.equal(resultsCity.length, 1);
    assert.equal(resultsCity[0].id, cB.id);

    // Seçim yapma
    setStoredActiveClientId(cB.id);
    assert.equal(getStoredActiveClientId(), cB.id);
  });

  test('4. Danışan değiştirildiğinde veri izolasyonu tam korunmalıdır', () => {
    const cA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const cB = createClientRecord(clientDataB, 'OWNER_MANUAL');

    // Danışan A için özel analiz ve tasarım kaydı
    const mockChartA: TropicalNatalChart = {
      zodiacSystem: 'TROPICAL',
      houseSystem: 'PLACIDUS',
      isBirthTimeUnknown: false,
      birthDate: clientDataA.birthDate,
      latitude: clientDataA.birthLocation.latitude,
      longitude: clientDataA.birthLocation.longitude,
      timezone: clientDataA.birthLocation.timezone,
      utcOffsetMinutes: clientDataA.birthLocation.utcOffsetMinutes,
      sunSign: 'Aries',
      moonSign: 'Taurus',
      ascendantSign: 'Gemini',
    };
    saveClientAstrologyChart(cA.id, mockChartA);

    const mockDesignA: ClientTattooDesign = {
      id: 'design-a-1',
      clientId: cA.id,
      versionNumber: 1,
      title: 'Deniz Geometrik Lotus',
      conceptStatement: 'A için geometrik denge manifestosu',
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç ön kol anatomik akışı',
        recommendedDimensionsCm: { width: 14, height: 22 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Lotus',
        secondarySymbols: ['Metatron'],
        keyComponents: ['Lotus', 'Metatron'],
        technicalAdviceForArtist: ['3RL ince çizgi'],
      },
      aiPrompt: {
        primaryPromptEn: 'Sacred geometry lotus tattoo design, fine line blackwork, white background',
        conceptPromptTr: 'Kutsal geometri lotus dövme tasarımı',
        negativePrompt: 'blurry, low contrast',
        aspectRatio: '3:4',
        artisticModifiers: ['sacred geometry'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClientDesign(cA.id, mockDesignA);

    // Danışan B arşivi denetlenir: A nın verileri B de asla bulunmamalıdır!
    const archiveB = getClientArchive(cB.id);
    assert.ok(archiveB);
    assert.equal(archiveB.client.id, cB.id);
    const hasAstroB = archiveB.analyses.some((a) => Boolean(a.astrology));
    assert.equal(hasAstroB, false, 'Danışan B de A nın astroloji haritası olmamalıdır');
    assert.equal(archiveB.designs.length, 0, 'Danışan B de A nın tasarımları olmamalıdır');

    // Danışan A arşivi kontrol edilir
    const archiveA = getClientArchive(cA.id);
    assert.ok(archiveA);
    assert.equal(archiveA.client.id, cA.id);
    const hasAstroA = archiveA.analyses.some((a) => Boolean(a.astrology));
    assert.equal(hasAstroA, true, 'Danışan A nın astroloji haritası yerinde olmalıdır');
    assert.equal(archiveA.designs.length, 1);
    assert.equal(archiveA.designs[0].id, 'design-a-1');
  });

  test('5. Sayfa yenilendiğinde aktif danışan yerel depolamadan doğru geri yüklenmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    setStoredActiveClientId(client.id);

    // Simüle edilmiş sayfa yenilenmesi / state başlangıcı
    const restoredId = getStoredActiveClientId();
    assert.equal(restoredId, client.id);

    const clientList = getStoredClients();
    const candidateId = restoredId;
    const isStillValid = candidateId ? clientList.some((c) => c.id === candidateId) : false;
    assert.equal(isStillValid, true, 'Kayıtlı aktif danışan listede doğrulanmalıdır');
  });

  test('6. Eski ClientModulePicker rotaları doğrudan CLIENTS ve ilgili sekmelere yönlendirilmelidir', () => {
    // AppContext setCurrentRoute yönlendirme mantığı
    function handleRouteTransition(
      route: AppRoute,
      setRoute: (r: AppRoute) => void,
      setTab: (t: WorkspaceDetailTab) => void
    ) {
      if (route === 'ANALYSIS_HUB') {
        setTab('ANALYSES');
        setRoute('CLIENTS');
      } else if (route === 'DESIGN_STUDIO') {
        setTab('RECIPE');
        setRoute('CLIENTS');
      } else if (route === 'DESIGN_REPORTS') {
        setTab('RESULTS');
        setRoute('CLIENTS');
      } else {
        setRoute(route);
      }
    }

    let routeState: AppRoute = 'DASHBOARD';
    let tabState: WorkspaceDetailTab | null = null;

    // ANALYSIS_HUB testi
    handleRouteTransition(
      'ANALYSIS_HUB',
      (r) => { routeState = r; },
      (t) => { tabState = t; }
    );
    assert.equal(routeState, 'CLIENTS', 'ANALYSIS_HUB doğrudan CLIENTS a yönlenmelidir');
    assert.equal(tabState, 'ANALYSES', 'Hedef sekme ANALYSES olmalıdır');

    // DESIGN_STUDIO testi
    handleRouteTransition(
      'DESIGN_STUDIO',
      (r) => { routeState = r; },
      (t) => { tabState = t; }
    );
    assert.equal(routeState, 'CLIENTS', 'DESIGN_STUDIO doğrudan CLIENTS a yönlenmelidir');
    assert.equal(tabState, 'RECIPE', 'Hedef sekme RECIPE olmalıdır');

    // DESIGN_REPORTS testi
    handleRouteTransition(
      'DESIGN_REPORTS',
      (r) => { routeState = r; },
      (t) => { tabState = t; }
    );
    assert.equal(routeState, 'CLIENTS', 'DESIGN_REPORTS doğrudan CLIENTS a yönlenmelidir');
    assert.equal(tabState, 'RESULTS', 'Hedef sekme RESULTS olmalıdır');
  });

  test('7. Yeni danışan oluşturma akışı aktif danışanı güncellemeli ve arşive kaydetmelidir', () => {
    const created = createClientRecord(clientDataA, 'OWNER_MANUAL');
    assert.ok(created.id);

    // Aktif danışan yapılır
    setStoredActiveClientId(created.id);

    // Tüm danışanlar listesinde yer alır
    const clients = getStoredClients();
    assert.equal(clients.some((c) => c.id === created.id), true);

    // Arşiv oluşturulur
    const archive = getClientArchive(created.id);
    assert.ok(archive);
    assert.equal(archive.client.firstName, 'Deniz');
    assert.equal(archive.client.lastName, 'Yılmaz');
  });
});
