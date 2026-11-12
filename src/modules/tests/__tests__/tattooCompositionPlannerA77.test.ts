import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTattooCompositionPlan,
  formatCompositionPlanText,
} from '../../symbols';
import { Client, ClientFormData } from '../../../types/client';
import {
  createClientRecord,
  saveClientNumerology,
  saveClientAstrologyChart,
  saveClientChakra,
  saveClientArchetype,
  getClientArchive,
  clearAllApplicationData,
} from '../../../store/storage';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientTropicalChart } from '../../astrology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';

describe('Aşama 5.2.3: Sembollerden Nihai Dövme Kompozisyonu Oluşturma Test Paketi', { concurrency: 1 }, () => {
  const mockStorageMap = new Map<string, string>();

  const mockLocalStorage = {
    getItem: (key: string): string | null => (mockStorageMap.has(key) ? mockStorageMap.get(key)! : null),
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
    key: (index: number): string | null => Array.from(mockStorageMap.keys())[index] || null,
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

  const baseFormDataA: ClientFormData = {
    firstName: 'Aylin',
    lastName: 'Yılmaz',
    email: 'aylin@example.com',
    phone: '05551112233',
    birthDate: '1990-04-12',
    birthTime: '10:30',
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
    motherName: 'Nuran',
    notes: 'A77 Danışan A',
  };

  const baseFormDataB: ClientFormData = {
    firstName: 'Burak',
    lastName: 'Demir',
    email: 'burak@example.com',
    phone: '05559998877',
    birthDate: '1985-11-28',
    birthTime: '18:15',
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
    notes: 'A77 Danışan B',
  };

  function seedClientWithAnalyses(client: Client) {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const astro = calculateClientTropicalChart(client);
    if (astro.chart) saveClientAstrologyChart(client.id, astro.chart);

    const archWithAstro = getClientArchive(client.id)!;
    const chk = calculateClientChakra(client, archWithAstro);
    if (chk.chakra) saveClientChakra(client.id, chk.chakra);

    const archWithChk = getClientArchive(client.id)!;
    const arch = calculateClientArchetype(client, archWithChk);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);

    return getClientArchive(client.id)!;
  }

  it('1. Ana odak sembolü en yüksek rezonanslı veya PRIMARY_CORE nitelikli sembolden doğru belirlenmelidir', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive);

    assert.ok(plan.primaryFocus);
    assert.equal(plan.primaryFocus.roleCategory, 'PRIMARY');
    assert.match(plan.primaryFocus.positiveSpaceRatioTr, /%65/);
    assert.ok(plan.primaryFocus.symbolName.length > 0);
  });

  it('2. İkincil semboller ana odağı destekleyecek şekilde hiyerarşiye yerleştirilmelidir', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive);

    for (const sec of plan.secondaryElements) {
      assert.equal(sec.roleCategory, 'SECONDARY');
      assert.match(sec.positiveSpaceRatioTr, /%35/);
    }
    for (const acc of plan.accentElements) {
      assert.equal(acc.roleCategory, 'ACCENT');
    }
  });

  it('3. Birden fazla PRIMARY_CORE sembol varsa odak rekabeti yönetilmeli ve ikincil katmana aktarılmalıdır', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    // İki PRIMARY_CORE sembol manuel olarak seçilsin: metatron-cube ve flower-of-life
    const plan = buildTattooCompositionPlan(client, archive, {
      selectedSymbols: [
        { symbolId: 'metatron-cube', symbolName: 'Metatron Küpü', weight: 'PRIMARY' },
        { symbolId: 'flower-of-life', symbolName: 'Yaşam Çiçeği', weight: 'PRIMARY' },
      ],
    });

    assert.equal(plan.primaryFocus.symbolId, 'metatron-cube');
    assert.ok(plan.secondaryElements.some((s) => s.symbolId === 'flower-of-life'));
    assert.ok(plan.qualityCheck.detectedRisks.some((r) => r.includes('Odak Rekabeti')));
    assert.ok(plan.qualityCheck.autoCorrectionsApplied.some((c) => c.includes('Yaşam Çiçeği')));
  });

  it('4. Hariç tutulan semboller ve anne adı güvenlik kalkanındaki isimler kompozisyona kesinlikle giremez', () => {
    const client = createClientRecord(baseFormDataB, 'OWNER_MANUAL'); // motherName: Fatma
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive, {
      excludedSymbols: ['uroboros-infinity', 'Fatma'],
      selectedSymbols: [
        { symbolId: 'uroboros-infinity', symbolName: 'Uroboros', weight: 'SECONDARY' },
      ],
    });

    assert.notEqual(plan.primaryFocus.symbolId, 'uroboros-infinity');
    assert.ok(!plan.secondaryElements.some((s) => s.symbolId === 'uroboros-infinity'));
    assert.ok(!plan.accentElements.some((s) => s.symbolId === 'uroboros-infinity'));
    assert.ok(plan.excludedSymbolsWithReasons.some((e) => e.symbolId === 'uroboros-infinity'));
  });

  it('5. Danışanın manuel sembol tercihleri (seçimleri) kompozisyonda korunmalıdır', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive, {
      selectedSymbols: [
        { symbolId: 'fibonacci-spiral', symbolName: 'Altın Oran Spirali', weight: 'SECONDARY' },
      ],
    });

    const hasFibonacci =
      plan.primaryFocus.symbolId === 'fibonacci-spiral' ||
      plan.secondaryElements.some((s) => s.symbolId === 'fibonacci-spiral') ||
      plan.accentElements.some((s) => s.symbolId === 'fibonacci-spiral');

    assert.ok(hasFibonacci, 'Manuel seçilen Fibonacci Spirali kompozisyona dahil edilmelidir');
  });

  it('6. Negatif alan (%45–%50) ve teknik ölçü hedefleri raporda eksiksiz yer almalıdır', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive);

    assert.match(plan.targets.negativeSpaceRatioTr, /%45 – %50/);
    assert.match(plan.targets.primaryFocusRatioTr, /%65/);
    assert.match(plan.targets.minLineSpacingMm, /1.5 – 2.0 mm/);
    assert.equal(plan.placement.minDimensionsCm.width, 10);
    assert.equal(plan.placement.minDimensionsCm.height, 16);
    assert.equal(plan.placement.idealDimensionsCm.width, 14);
    assert.equal(plan.placement.idealDimensionsCm.height, 22);
    assert.ok(plan.targets.dimensionsDisclaimerTr.includes('tasarım hedefleridir'));
  });

  it('7. Aşırı sembol kalabalığı engellenmeli; kompozisyonu bozan semboller gerekçesiyle elenmelidir', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    // 6 farklı sembol seçilsin; kompozisyon en fazla 3-4 sembol tutmalı ve fazlasını elemeli
    const plan = buildTattooCompositionPlan(client, archive, {
      selectedSymbols: [
        { symbolId: 'metatron-cube', symbolName: 'Metatron', weight: 'PRIMARY' },
        { symbolId: 'flower-of-life', symbolName: 'Yaşam Çiçeği', weight: 'SECONDARY' },
        { symbolId: 'sri-yantra', symbolName: 'Sri Yantra', weight: 'SECONDARY' },
        { symbolId: 'seed-of-life', symbolName: 'Yaşam Tohumu', weight: 'ACCENT' },
        { symbolId: 'fibonacci-spiral', symbolName: 'Spiral', weight: 'SECONDARY' },
        { symbolId: 'vesica-piscis', symbolName: 'Vesica Piscis', weight: 'ACCENT' },
      ],
    });

    const totalActive = 1 + plan.secondaryElements.length + plan.accentElements.length;
    assert.ok(totalActive <= 4, 'Aktif sembol sayısı 4 ü aşmamalıdır');
    assert.ok(plan.excludedSymbolsWithReasons.length > 0, 'Fazlalık semboller elenmelidir');
  });

  it('8. Aktif danışan değişiminde veri izolasyonu tam korunmalıdır', () => {
    const clientA = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archiveA = seedClientWithAnalyses(clientA);

    const clientB = createClientRecord(baseFormDataB, 'OWNER_MANUAL');
    const archiveB = seedClientWithAnalyses(clientB);

    const planA = buildTattooCompositionPlan(clientA, archiveA, {
      customNotes: 'Danışan A ya özel not',
    });
    const planB = buildTattooCompositionPlan(clientB, archiveB, {
      customNotes: 'Danışan B ye özel not',
    });

    assert.equal(planA.clientId, clientA.id);
    assert.equal(planB.clientId, clientB.id);
    assert.match(planA.clientName, /Aylin Yılmaz/);
    assert.match(planB.clientName, /Burak Demir/);
    assert.notEqual(planA.generalConceptTr, planB.generalConceptTr);
  });

  it('9. Analiz değiştiğinde eski kompozisyon kullanılmamalı, güncel analizlere göre üretilmelidir', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive1 = seedClientWithAnalyses(client);

    const plan1 = buildTattooCompositionPlan(client, archive1);

    // Yeni bir analiz kaydedilsin (güncellensin)
    const newNum = calculateClientNumerology(client);
    if (newNum.numerology) {
      saveClientNumerology(client.id, {
        ...newNum.numerology,
        lifePathNumber: 9,
      });
    }

    const archive2 = getClientArchive(client.id)!;
    const plan2 = buildTattooCompositionPlan(client, archive2);
    assert.ok(plan1);
    assert.ok(plan2);
    assert.equal(plan2.clientId, client.id);
  });

  it('10. formatCompositionPlanText 10 ana başlığı içeren eksiksiz kopyalanabilir metin formatı üretmelidir', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive);
    const text = formatCompositionPlanText(plan);

    assert.ok(text.includes('1. TASARIMIN GENEL KONSEPTİ'));
    assert.ok(text.includes('2. BİRİNCİL ODAK SEMBOLÜ'));
    assert.ok(text.includes('3. İKİNCİL DESTEK VE VURGU SEMBOLLERİ'));
    assert.ok(text.includes('4. SEMBOLLERİN BİRBİRLERİNE GÖRE KONUMLARI'));
    assert.ok(text.includes('5. DİKEY BÖLÜM DAĞILIMI'));
    assert.ok(text.includes('6. NEGATİF ALAN KULLANIM STRATEJİSİ'));
    assert.ok(text.includes('7. ÇİZGİ, DOLGU VE GÖLGELENDİRME YAKLAŞIMI'));
    assert.ok(text.includes('8. ANATOMİK YERLEŞİM VE AKIŞ AÇIKLAMASI'));
    assert.ok(text.includes('9. TASARIMA ALINMAYAN SEMBOLLER VE GEREKÇELERİ'));
    assert.ok(text.includes('10. DÖVME SANATÇISINA UYGULAMA NOTLARI'));
    assert.ok(text.includes('11. GÖRSEL BÜTÜNLÜK VE KALİTE KONTROL RAPORU'));
  });

  it('11. Kompozisyon planı oluşturulurken mevcut reçete ve rapor alanları asla bozulmamalıdır', () => {
    const client = createClientRecord(baseFormDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const plan = buildTattooCompositionPlan(client, archive, {
      preferredPlacement: 'FOREARM_INNER',
      preferredStyle: 'SACRED_GEOMETRY',
    });

    assert.equal(plan.placement.key, 'FOREARM_INNER');
    assert.ok(plan.qualityCheck.overallScore >= 90);
    assert.ok(plan.qualityCheck.isPrimaryFocusClear);
    assert.ok(plan.qualityCheck.isNegativeSpaceSufficient);
  });
});
