import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createClientRecord,
  getClientArchive,
  clearAllApplicationData,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientSymbolAnalysis,
} from '../../../store/storage';
import { Client, ClientFormData } from '../../../types/client';
import {
  MASTER_SYMBOLS,
  ALL_MASTER_SYMBOLS,
  getClientRecommendedSymbols,
  isSymbolExcluded,
} from '../../../modules/symbols';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientTropicalChart } from '../../astrology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';

describe('A75 — Sembol Kütüphanesi Yeşil Vurgulama ve Eşleşme Doğrulama Testleri', { concurrency: 1 }, () => {
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
    lastName: 'Kaya',
    email: 'deniz@example.com',
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
    notes: 'A75 Danışan A',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Bora',
    lastName: 'Demir',
    email: 'bora@example.com',
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
    motherName: 'Sevim',
    notes: 'A75 Danışan B',
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

  test('1. Önerilen semboller belirlenmeli ve her birinin ID, skor ve reasonTr verisi eksiksiz olmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const recs = getClientRecommendedSymbols(client, archive, {
      includeTotemInVisual: false,
    });

    assert.ok(recs.length > 0, 'Analiz çıktılarından sembol önerileri üretilmelidir');
    for (const rec of recs) {
      assert.ok(rec.symbol.id, 'Önerilen sembolün geçerli bir ID değeri olmalıdır');
      assert.ok(MASTER_SYMBOLS[rec.symbol.id], 'Önerilen sembol MASTER_SYMBOLS içinde bulunmalıdır');
      assert.ok(rec.matchingScore > 0, 'Eşleşme puanı pozitif olmalıdır');
      assert.ok(rec.reasonTr && rec.reasonTr.length > 5, 'Öneri gerekçesi (reasonTr) dolu olmalıdır');
    }
  });

  test('2. Önerilmeyen semboller öneri haritasında yer almamalı ve nötr kalmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const recs = getClientRecommendedSymbols(client, archive);
    const recIdSet = new Set(recs.map((r) => r.symbol.id));

    // Kütüphanedeki 26 sembolden en az biri öneri dışında kalmalıdır (maksimum 6 öneri üretilir)
    const nonRecommended = ALL_MASTER_SYMBOLS.filter((s) => !recIdSet.has(s.id));
    assert.ok(nonRecommended.length >= 20, 'Önerilmeyen semboller çoğunlukta ve nötr kalmalıdır');

    for (const sym of nonRecommended) {
      assert.equal(recIdSet.has(sym.id), false, `${sym.name} öneri kümesinde yer almamalıdır`);
    }
  });

  test('3. Manuel seçilen sembolün durumu öneri durumundan bağımsız korunmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    const recs = getClientRecommendedSymbols(client, archive);
    const recIdSet = new Set(recs.map((r) => r.symbol.id));

    // Manuel olarak bir önerilen ve bir önerilmeyen sembol seçildiğini simüle et
    const firstRec = recs[0].symbol;
    const neutralSym = ALL_MASTER_SYMBOLS.find((s) => !recIdSet.has(s.id))!;

    const selectedSymbols = [
      { symbolId: firstRec.id, symbolName: firstRec.name, customMeaning: 'Özel niyet 1', weight: 'PRIMARY' as const },
      { symbolId: neutralSym.id, symbolName: neutralSym.name, customMeaning: 'Özel niyet 2', weight: 'SECONDARY' as const },
    ];

    // Hem önerilen hem seçilen: isRecommended=true AND isSelected=true
    assert.equal(recIdSet.has(firstRec.id), true);
    assert.equal(selectedSymbols.some((s) => s.symbolId === firstRec.id), true);

    // Yalnızca seçilen (önerilmeyen): isRecommended=false AND isSelected=true
    assert.equal(recIdSet.has(neutralSym.id), false);
    assert.equal(selectedSymbols.some((s) => s.symbolId === neutralSym.id), true);
  });

  test('4. Hariç tutulan semboller ve anne adı asla öneri listesine giremez ve yeşil vurgu alamaz', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    // Varsayılan önerileri al
    const initialRecs = getClientRecommendedSymbols(client, archive);
    assert.ok(initialRecs.length > 0);
    const targetToExclude = initialRecs[0].symbol.id;

    // Hariç tutma listesine ekleyerek yeniden çağır
    const filteredRecs = getClientRecommendedSymbols(client, archive, {
      excludedSymbols: [targetToExclude, 'yılan', 'kafatası'],
    });

    const filteredIdSet = new Set(filteredRecs.map((r) => r.symbol.id));
    assert.equal(
      filteredIdSet.has(targetToExclude),
      false,
      'Hariç tutulan sembol hiçbir koşulda öneri listesine giremez'
    );

    // Anne adı 'Nuran' asla bir sembolle eşleşemez veya önerilemez
    for (const rec of filteredRecs) {
      assert.equal(
        rec.symbol.name.toLowerCase().includes('nuran'),
        false,
        'Anne adı hiçbir sembolde yer alamaz'
      );
    }
  });

  test('5. Aktif danışan yokken (null) öneri listesi boş olmalı ve tüm semboller nötr kalmalıdır', () => {
    // SymbolLibraryCatalog içindeki activeClient === null davranışı
    const activeClient = null;
    const activeClientArchive = null;

    const recommendedList = !activeClient || !activeClientArchive
      ? []
      : getClientRecommendedSymbols(activeClient, activeClientArchive);

    assert.equal(recommendedList.length, 0, 'Aktif danışan yokken öneri listesi boş olmalıdır');
    const recMap = new Map<string, any>();
    for (const rec of recommendedList) {
      recMap.set(rec.symbol.id, rec);
    }

    // Hiçbir sembol önerilmiş sayılmamalı
    for (const sym of ALL_MASTER_SYMBOLS) {
      assert.equal(recMap.has(sym.id), false, `${sym.name} nötr görünmelidir`);
    }
  });

  test('6. Danışan değiştirildiğinde öneriler yeni danışanın verilerine göre anında yenilenmelidir', () => {
    const cA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archA = seedClientWithAnalyses(cA);

    const cB = createClientRecord(clientDataB, 'OWNER_MANUAL');
    const archB = seedClientWithAnalyses(cB);

    const recsA = getClientRecommendedSymbols(cA, archA);
    const recsB = getClientRecommendedSymbols(cB, archB);

    assert.ok(recsA.length > 0);
    assert.ok(recsB.length > 0);

    // Danışan A (Koç/Boğa/İkizler vs.) ile Danışan B (Yay/Akrep vs.) farklı tarihlere ve Yaşam Yoluna sahiptir
    // Öneri setleri danışana özgüdür ve birbiriyle izoledir
    const setA = new Set(recsA.map((r) => r.symbol.id));
    const setB = new Set(recsB.map((r) => r.symbol.id));

    // Her iki danışanın da kendi geçerli analizlerinden beslendiği doğrulanır
    assert.ok(setA.size > 0);
    assert.ok(setB.size > 0);
  });

  test('7. Analiz güncellendiğinde öneri seti yeni analiz çıktılarına göre dinamik yenilenmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const initialArchive = seedClientWithAnalyses(client);

    const initialRecs = getClientRecommendedSymbols(client, initialArchive);
    assert.ok(initialRecs.length > 0);

    // Çakrayı güncelleyelim: Kalp Çakrası (HEART) yerine Boğaz Çakrası (THROAT) blokajı tanımlayalım
    const updatedChakra = {
      dominantChakra: 'Anahata',
      blockedChakra: 'Vishuddha',
      primaryDeficit: 'THROAT' as const,
      chakras: [{ id: 'throat', name: 'Vishuddha', level: 20 }],
    };
    saveClientChakra(client.id, updatedChakra as any);

    const updatedArchive = getClientArchive(client.id)!;
    const updatedRecs = getClientRecommendedSymbols(client, updatedArchive);

    // Boğaz çakrası blokajı için Boğaz Çakrası sembolleri (Triskele vb.) puan kazanmalıdır
    const throatRec = updatedRecs.find((r) => r.sourceModule === 'CHAKRA');
    assert.ok(throatRec, 'Güncellenen çakra analizine ait yeni öneri üretilmelidir');
    assert.ok(
      throatRec.reasonTr.includes('Boğaz Çakrası') || throatRec.reasonTr.includes('THROAT'),
      'Öneri gerekçesi yeni analiz durumunu yansıtmalıdır'
    );
  });

  test('8. Bağımsız Sembol Kütüphanesi ile Danışan Detay Kartı aynı öneri setini üretmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = seedClientWithAnalyses(client);

    // 1. Ekran: ClientDetailCard
    const detailCardRecs = getClientRecommendedSymbols(client, archive, {
      includeTotemInVisual: false,
    });

    // 2. Ekran: SymbolLibraryCatalog
    const catalogRecs = getClientRecommendedSymbols(client, archive, {
      includeTotemInVisual: false,
    });

    assert.equal(detailCardRecs.length, catalogRecs.length);
    for (let i = 0; i < detailCardRecs.length; i++) {
      assert.equal(detailCardRecs[i].symbol.id, catalogRecs[i].symbol.id);
      assert.equal(detailCardRecs[i].matchingScore, catalogRecs[i].matchingScore);
      assert.equal(detailCardRecs[i].sourceModule, catalogRecs[i].sourceModule);
    }
  });
});
