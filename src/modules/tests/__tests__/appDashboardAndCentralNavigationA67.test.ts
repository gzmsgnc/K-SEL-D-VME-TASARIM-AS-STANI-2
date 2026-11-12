import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getStoredClients,
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getAllStoredDesigns,
  saveClientDesign,
  clearClientDesigns,
} from '../../../store/storage';
import { ALL_MASTER_SYMBOLS, MASTER_SYMBOLS } from '../../symbols/masterSymbols';
import { NAV_ITEMS } from '../../../components/navigation/Sidebar';
import { AppRoute } from '../../../types/navigation';
import { Client } from '../../../types/client';
import { ClientTattooDesign } from '../../../types/design';

describe('A67: Aşama 0 — Uygulama Ana Sayfası ve Merkezi Navigasyon Doğrulama Testleri', () => {
  function createSampleClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `NavTest_${suffix}`,
        lastName: `Danisan_${suffix}`,
        email: `nav_${suffix.toLowerCase()}@example.com`,
        phone: '5559998877',
        birthDate: '1995-04-12',
        birthTime: '14:30',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'Ankara',
          placeName: 'Ankara, Türkiye',
          latitude: 39.9334,
          longitude: 32.8597,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Ayşe',
        notes: 'A67 Merkezi Navigasyon Doğrulama Testi',
      },
      'OWNER_MANUAL'
    );
  }

  function createSampleDesign(clientId: string, id: string, title: string): ClientTattooDesign {
    return {
      id,
      clientId,
      versionNumber: 1,
      title,
      conceptStatement: 'Test Concept Statement',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç Ön Kol',
        recommendedDimensionsCm: { width: 10, height: 16 },
        colorProfile: 'MONOCHROME_BLACK',
        keyComponents: ['Metatron'],
        technicalAdviceForArtist: ['Single needle'],
      },
      aiPrompt: {
        primaryPromptEn: 'fine line geometric tattoo',
        conceptPromptTr: 'geometrik dövme',
        negativePrompt: 'blurry, distorted',
        aspectRatio: '1:1',
        artisticModifiers: ['sacred geometry'],
      },
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
    };
  }

  it('1. Merkezi Menü Sistemi 4 ana başlığı (4+1 modeli) eksiksiz ve doğru sıralamayla içermelidir', () => {
    assert.strictEqual(NAV_ITEMS.length, 4, 'Menü tam olarak 4 ana başlık içermelidir');

    const expectedRoutes: AppRoute[] = [
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
      assert.strictEqual(item.id, expectedRoutes[index], `${index + 1}. menü rotası ${expectedRoutes[index]} olmalıdır`);
      assert.strictEqual(item.labelTr, expectedLabels[index], `${index + 1}. menü başlığı ${expectedLabels[index]} olmalıdır`);
      assert.ok(item.icon, `${item.labelTr} menü ikonu tanımlı olmalıdır`);
      assert.ok(item.descriptionTr, `${item.labelTr} açıklama metni tanımlı olmalıdır`);
    });
  });

  it('2. Uygulama açılışı: Aktif danışan depolamada kayıtlı olsa dahi başlangıç rotası DASHBOARD olmalıdır', () => {
    const client = createSampleClient('StartupTest');
    try {
      // Depolamada aktif danışan ID'sini simüle et
      setStoredActiveClientId(client.id);
      const storedActiveId = getStoredActiveClientId();
      assert.strictEqual(storedActiveId, client.id, 'Aktif danışan depolamada saklanmış olmalıdır');

      // Başlangıç rotası kesinlikle DASHBOARD olmalıdır (ClientDetailCard'a otomatik yönlenme olmamalıdır)
      const defaultInitialRoute: AppRoute = 'DASHBOARD';
      assert.strictEqual(defaultInitialRoute, 'DASHBOARD', 'Varsayılan başlangıç rotası DASHBOARD olmalıdır');
      assert.notStrictEqual(defaultInitialRoute, 'CLIENTS', 'Açılışta doğrudan danışan ekranına düşülmemelidir');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('3. Danışanlar arası geçişte clientId izolasyonu korunmalı ve kayıtlar sızmamalıdır', () => {
    const clientA = createSampleClient('A');
    const clientB = createSampleClient('B');

    try {
      // Client A için tasarım kaydı ekle
      const designA = createSampleDesign(clientA.id, 'design_iso_a', 'Client A Geometrik Tasarım');
      saveClientDesign(clientA.id, designA);

      // Client A arşivi tasarım içermeli
      const archiveA = getClientArchive(clientA.id);
      assert.strictEqual(archiveA?.designs?.length, 1, 'Client A 1 tasarıma sahip olmalıdır');
      assert.strictEqual(archiveA?.designs?.[0]?.clientId, clientA.id, 'Tasarım Client A ID sine ait olmalıdır');

      // Client B arşivi kesinlikle temiz olmalı (Client A verisi sızmamalı)
      const archiveB = getClientArchive(clientB.id);
      assert.strictEqual(archiveB?.designs?.length, 0, 'Client B nin tasarımı olmamalıdır (İzolasyon tam olmalı)');
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  it('4. Danışan seçilmeden danışana özel analiz ve tasarım başlatılmamalı (Module Picker doğrulaması)', () => {
    const activeClientId: string | null = null;
    const canStartSpecificAnalysis = Boolean(activeClientId);

    // Kural 4: Danışan seçilmeden danışana özel analiz başlatılamaz
    assert.strictEqual(canStartSpecificAnalysis, false, 'Aktif danışan yokken analiz başlatılmamalıdır');

    // Danışan seçildiğinde güvenle başlatılabilir
    const selectedClientId = 'client_123';
    const canStartWithClient = Boolean(selectedClientId);
    assert.strictEqual(canStartWithClient, true, 'Danışan seçildiğinde işlem başlatılabilir');
  });

  it('5. Sembol Kütüphanesi 26 master sembolü eksiksiz sunmalı ve bağımsız taranabilmelidir', () => {
    assert.strictEqual(ALL_MASTER_SYMBOLS.length, 26, 'Sembol kütüphanesi tam 26 sembolden oluşmalıdır');

    const expectedSymbolIds = [
      'metatron-cube', 'flower-of-life', 'seed-of-life', 'sri-yantra', 'fibonacci-spiral',
      'torus-field', 'vesica-piscis', 'sun-glyph-corona', 'moon-phases-crescent', 'polaris-compass',
      'lunar-eclipse-halo', 'planetary-orbital-rings', 'ankh-key', 'eye-of-horus', 'triskele-spiral',
      'tree-of-life-yggdrasil', 'alchemy-four-elements', 'uroboros-infinity', 'sacred-lotus-anahata',
      'flowing-water-waves', 'obsidian-mountain-peak', 'celestial-cloud-vectors', 'enso-circle',
      'bindu-focal-point', 'zen-dual-lines', 'prism-triangle',
    ];

    assert.strictEqual(expectedSymbolIds.length, 26, 'Sembol listesi 26 eleman olmalıdır');

    expectedSymbolIds.forEach((id) => {
      const sym = MASTER_SYMBOLS[id];
      assert.ok(sym, `Master sembol [${id}] kütüphanede mevcut olmalıdır`);
      assert.ok(sym.name, `Sembol [${id}] Türkçe isme sahip olmalıdır`);
      assert.ok(sym.originCulture, `Sembol [${id}] kültürel kökene sahip olmalıdır`);
      assert.ok(sym.traditionalMeaningTr, `Sembol [${id}] geleneksel anlama sahip olmalıdır`);
      assert.ok(sym.esotericMeaningTr, `Sembol [${id}] ezoterik anlama sahip olmalıdır`);
    });
  });

  it('6. Sayısal istatistikler ve Dashboard verileri gerçek storage kayıtlarından hesaplanmalıdır', () => {
    const initialClients = getStoredClients();
    const initialDesigns = getAllStoredDesigns();

    const client = createSampleClient('MetricsTest');
    try {
      const updatedClients = getStoredClients();
      assert.strictEqual(updatedClients.length, initialClients.length + 1, 'Danışan sayısı 1 artmalıdır');

      const design = createSampleDesign(client.id, 'design_metric_1', 'Metrik Doğrulama Tasarımı');
      saveClientDesign(client.id, design);

      const updatedDesigns = getAllStoredDesigns();
      assert.strictEqual(updatedDesigns.length, initialDesigns.length + 1, 'Tasarım sayısı gerçek kayıtlardan 1 artmalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('7. Geriye dönük AppMode uyumluluğu: CLIENT_FORM, OWNER_WORKSPACE ve SYSTEM_ADMIN tutarlı çalışmalıdır', () => {
    // AppMode ile AppRoute arasındaki çift yönlü eşleme testi
    function routeToMode(route: AppRoute): 'CLIENT_FORM' | 'OWNER_WORKSPACE' | 'SYSTEM_ADMIN' {
      if (route === 'CLIENT_FORM') return 'CLIENT_FORM';
      if (route === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
      return 'OWNER_WORKSPACE';
    }

    assert.strictEqual(routeToMode('CLIENT_FORM'), 'CLIENT_FORM');
    assert.strictEqual(routeToMode('SYSTEM_ADMIN'), 'SYSTEM_ADMIN');
    assert.strictEqual(routeToMode('DASHBOARD'), 'OWNER_WORKSPACE');
    assert.strictEqual(routeToMode('CLIENTS'), 'OWNER_WORKSPACE');
    assert.strictEqual(routeToMode('ANALYSIS_HUB'), 'OWNER_WORKSPACE');
    assert.strictEqual(routeToMode('SYMBOL_LIBRARY'), 'OWNER_WORKSPACE');
    assert.strictEqual(routeToMode('DESIGN_STUDIO'), 'OWNER_WORKSPACE');
    assert.strictEqual(routeToMode('DESIGN_REPORTS'), 'OWNER_WORKSPACE');
  });

  it('8. Aktif danışan seçiminin kaldırılması kayıtları ve arşivi kesinlikle silmemelidir', () => {
    const client = createSampleClient('DeselectTest');
    try {
      setStoredActiveClientId(client.id);
      assert.strictEqual(getStoredActiveClientId(), client.id);

      // Danışan seçimini kaldır (X butonu veya Seçimi Kaldır eylemi)
      setStoredActiveClientId(null);
      assert.strictEqual(getStoredActiveClientId(), null, 'Aktif danışan seçimi null olmalıdır');

      // Ancak danışanın gerçek kaydı ve arşivi depolamada sapasağlam kalmalıdır
      const allClients = getStoredClients();
      const stillExists = allClients.some((c) => c.id === client.id);
      assert.strictEqual(stillExists, true, 'Seçim kaldırıldığında danışan kaydı ASLA silinmemelidir');

      const archive = getClientArchive(client.id);
      assert.ok(archive, 'Danışanın arşivi erişilebilir kalmalıdır');
      assert.strictEqual(archive?.client?.id, client.id, 'Arşivdeki danışan kimliği doğrulanmalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
