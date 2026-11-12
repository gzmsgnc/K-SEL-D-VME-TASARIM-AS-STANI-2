import { Client, ClientFormData } from '../types/client';
import { ClientAnalysisRecord, NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis, EbcedAnalysis } from '../types/analysis';
import { ClientTestResult, TestType, ClientTestDraft } from '../types/test';
import { ClientSymbolAnalysis } from '../types/symbol';
import { ClientTattooDesign } from '../types/design';
import { ClientTattooReport } from '../types/report';
import { ClientArchiveRecord } from '../types/archive';
import { TropicalNatalChart } from '../types/astrology';
import { generateId } from '../utils/id';

export const STORAGE_KEYS = {
  CLIENTS: 'dovme_asistani_clients_v1',
  ANALYSES: 'dovme_asistani_analyses_v1',
  TESTS: 'dovme_asistani_tests_v1',
  SYMBOLS: 'dovme_asistani_symbols_v1',
  DESIGNS: 'dovme_asistani_designs_v1',
  REPORTS: 'dovme_asistani_reports_v1',
  ACTIVE_CLIENT: 'dovme_asistani_active_client_v1',
  TEST_DRAFTS: 'dovme_asistani_test_drafts_v1',
};

// Demo kayıtlarını tespit etmek için bilinen ID ve e-postalar
const KNOWN_DEMO_IDS = new Set(['demo_client_1', 'demo_client_2']);
const KNOWN_DEMO_EMAILS = new Set(['deniz.yildiz@example.com', 'efe.kaya@example.com']);

export function isDemoRecord(client: Client): boolean {
  if (!client || !client.id) return false;
  return (
    KNOWN_DEMO_IDS.has(client.id) ||
    client.id.startsWith('demo_') ||
    KNOWN_DEMO_EMAILS.has(client.email)
  );
}

export type StorageWriteStatus = 'persisted' | 'memory_only' | 'failed';

export type StorageErrorType =
  | 'quota_exceeded'
  | 'security_error'
  | 'serialization_error'
  | 'access_denied'
  | 'unknown';

export interface StorageWriteResult {
  status: StorageWriteStatus;
  key: string;
  errorType?: StorageErrorType;
  errorMessage?: string;
}

export type MultiStorageWriteStatus = 'persisted' | 'memory_only' | 'partial_failure' | 'failed';

export interface MultiStorageWriteResult {
  status: MultiStorageWriteStatus;
  results: Record<string, StorageWriteResult>;
  warning?: string;
  error?: string;
}

const memoryFallbackStore = new Map<string, string>();
const memoryFallbackKeys = new Set<string>();
let lastStorageWriteResult: StorageWriteResult | MultiStorageWriteResult | null = null;

export function getLastStorageWriteResult(): StorageWriteResult | MultiStorageWriteResult | null {
  return lastStorageWriteResult;
}

export function clearMemoryFallback(): void {
  memoryFallbackStore.clear();
  memoryFallbackKeys.clear();
  lastStorageWriteResult = null;
}

export function isKeyInMemoryFallback(key: string): boolean {
  return memoryFallbackKeys.has(key);
}

export function getMemoryFallbackKeys(): string[] {
  return Array.from(memoryFallbackKeys);
}

export function classifyStorageError(err: any): StorageErrorType {
  if (!err) return 'unknown';
  const name = err.name || '';
  const message = String(err.message || '').toLowerCase();
  const code = err.code;

  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    message.includes('quota') ||
    message.includes('exceeded') ||
    message.includes('storage full')
  ) {
    return 'quota_exceeded';
  }

  if (
    name === 'SecurityError' ||
    code === 18 ||
    message.includes('security') ||
    message.includes('permission denied') ||
    message.includes('insecure')
  ) {
    return 'security_error';
  }

  if (message.includes('access') || message.includes('disabled') || message.includes('denied')) {
    return 'access_denied';
  }

  return 'unknown';
}

export function combineStorageResults(results: (StorageWriteResult | MultiStorageWriteResult)[]): MultiStorageWriteResult {
  const flattened: StorageWriteResult[] = [];
  for (const item of results) {
    if (!item) continue;
    if ('results' in item && typeof item.results === 'object') {
      flattened.push(...Object.values(item.results));
    } else if ('status' in item && 'key' in item) {
      flattened.push(item as StorageWriteResult);
    }
  }

  const map: Record<string, StorageWriteResult> = {};
  let persistedCount = 0;
  let memoryCount = 0;
  let failedCount = 0;

  for (const r of flattened) {
    map[r.key] = r;
    if (r.status === 'persisted') persistedCount++;
    else if (r.status === 'memory_only') memoryCount++;
    else if (r.status === 'failed') failedCount++;
  }

  const total = flattened.length;
  let status: MultiStorageWriteStatus = 'persisted';

  if (total === 0) {
    status = 'persisted';
  } else if (persistedCount === total) {
    status = 'persisted';
  } else if (failedCount === total) {
    status = 'failed';
  } else if (memoryCount === total) {
    status = 'memory_only';
  } else {
    status = 'partial_failure';
  }

  let warning: string | undefined;
  let error: string | undefined;

  if (status === 'failed') {
    error = 'Veriler kalıcı depolama alanına yazılamadı ve oturum belleğinde de saklanamadı.';
  } else if (status === 'memory_only') {
    warning = 'Kalıcı depolama alanı yetersiz veya kısıtlı. Veriler yalnızca geçici oturum belleğinde saklanmaktadır (sayfa yenilendiğinde kaybolabilir).';
  } else if (status === 'partial_failure') {
    warning = 'Bazı kayıtlar kalıcı depolamaya yazılamadı veya geçici belleğe alındı (Kısmi depolama uyarısı).';
  }

  return { status, results: map, warning, error };
}

/**
 * Güvenli Storage Okuyucu:
 * Bellek yedeği (memoryFallbackKeys) aktifse öncelikli olarak bellekten güncel veriyi okur,
 * böylece localStorage'daki eski bayat veri okunmaz.
 * Bozuk JSON veya geçersiz tiplerde defaultValue döner.
 */
export function getSafeStorage<T>(key: string, defaultValue: T): T {
  try {
    let raw: string | null = null;
    if (memoryFallbackKeys.has(key)) {
      raw = memoryFallbackStore.get(key) || null;
    } else if (typeof localStorage !== 'undefined') {
      try {
        raw = localStorage.getItem(key);
      } catch {
        raw = memoryFallbackStore.get(key) || null;
      }
    } else {
      raw = memoryFallbackStore.get(key) || null;
    }

    if (!raw || typeof raw !== 'string') return defaultValue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      return defaultValue;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Merkezi Güvenli Depolama Yazıcısı:
 * Yazma sonucunu açıkça bildiren StorageWriteResult döner.
 * 'persisted' | 'memory_only' | 'failed' durumlarını ve QuotaExceeded/SecurityError/SerializationError hatalarını ayırır.
 */
export function setSafeStorage<T>(key: string, value: T): StorageWriteResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (serializationErr: any) {
    console.error(`Serialization error for key "${key}":`, serializationErr);
    const result: StorageWriteResult = {
      status: 'failed',
      key,
      errorType: 'serialization_error',
      errorMessage: serializationErr?.message || 'JSON serileştirme hatası (döngüsel referans veya geçersiz yapı).',
    };
    lastStorageWriteResult = result;
    return result;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, serialized);
      memoryFallbackKeys.delete(key);
      memoryFallbackStore.delete(key);
      const result: StorageWriteResult = {
        status: 'persisted',
        key,
      };
      lastStorageWriteResult = result;
      return result;
    } catch (storageErr: any) {
      const errorType = classifyStorageError(storageErr);
      console.warn(`localStorage.setItem başarısız oldu [${key}] (${errorType}):`, storageErr);
      try {
        memoryFallbackStore.set(key, serialized);
        memoryFallbackKeys.add(key);
        const result: StorageWriteResult = {
          status: 'memory_only',
          key,
          errorType,
          errorMessage: storageErr?.message || 'Veri yalnızca geçici oturum belleğine yazıldı.',
        };
        lastStorageWriteResult = result;
        return result;
      } catch (memErr: any) {
        const result: StorageWriteResult = {
          status: 'failed',
          key,
          errorType,
          errorMessage: `Hem kalıcı depolama hem de bellek yedeği başarısız: ${memErr?.message || memErr}`,
        };
        lastStorageWriteResult = result;
        return result;
      }
    }
  } else {
    try {
      memoryFallbackStore.set(key, serialized);
      const result: StorageWriteResult = {
        status: 'persisted',
        key,
      };
      lastStorageWriteResult = result;
      return result;
    } catch (memErr: any) {
      const result: StorageWriteResult = {
        status: 'failed',
        key,
        errorType: 'unknown',
        errorMessage: String(memErr?.message || memErr),
      };
      lastStorageWriteResult = result;
      return result;
    }
  }
}

// Bozuk veya uyumsuz kayıtları güvenle eleyen doğrulayıcılar
function isValidClient(item: any): item is Client {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    typeof item.firstName === 'string'
  );
}

function isValidAnalysis(item: any): item is ClientAnalysisRecord {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0
  );
}

function isValidTest(item: any): item is ClientTestResult {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0 &&
    typeof item.testType === 'string'
  );
}

function isValidSymbol(item: any): item is ClientSymbolAnalysis {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0
  );
}

function isValidDesign(item: any): item is ClientTattooDesign {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0 &&
    typeof item.id === 'string'
  );
}

function isValidReport(item: any): item is ClientTattooReport {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0
  );
}

function isValidTestDraft(item: any): item is ClientTestDraft {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.clientId === 'string' &&
    item.clientId.trim().length > 0 &&
    (item.testType === 'ENNEAGRAM' || item.testType === 'ANIMAL_TOTEM' || item.testType === 'ARCHETYPE_DISCOVERY') &&
    item.answers !== null &&
    typeof item.answers === 'object' &&
    !Array.isArray(item.answers)
  );
}

/**
 * Tarayıcı hafızasında kalmış olabilecek eski demo ve sahte verileri güvenle temizler.
 * Gerçek kullanıcı kayıtlarına (client_* kimlikli) asla dokunmaz.
 */
export function purgeDemoDataIfPresent(): void {
  try {
    const rawClients = getSafeStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
    const filteredClients = (Array.isArray(rawClients) ? rawClients : []).filter(
      (c) => isValidClient(c) && !isDemoRecord(c)
    );
    if (filteredClients.length !== rawClients.length) {
      setSafeStorage(STORAGE_KEYS.CLIENTS, filteredClients);
    }

    // Demo kimliklerine bağlı ilişkisel kayıtları da temizle
    const demoIdMatch = (clientId: string) =>
      KNOWN_DEMO_IDS.has(clientId) || clientId.startsWith('demo_');

    const rawAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
    const cleanAnalyses = (Array.isArray(rawAnalyses) ? rawAnalyses : []).filter(
      (a) => isValidAnalysis(a) && !demoIdMatch(a.clientId)
    );
    if (cleanAnalyses.length !== rawAnalyses.length) {
      setSafeStorage(STORAGE_KEYS.ANALYSES, cleanAnalyses);
    }

    const rawTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
    const cleanTests = (Array.isArray(rawTests) ? rawTests : []).filter(
      (t) => isValidTest(t) && !demoIdMatch(t.clientId)
    );
    if (cleanTests.length !== rawTests.length) {
      setSafeStorage(STORAGE_KEYS.TESTS, cleanTests);
    }

    const rawSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
    const cleanSymbols = (Array.isArray(rawSymbols) ? rawSymbols : []).filter(
      (s) => isValidSymbol(s) && !demoIdMatch(s.clientId)
    );
    if (cleanSymbols.length !== rawSymbols.length) {
      setSafeStorage(STORAGE_KEYS.SYMBOLS, cleanSymbols);
    }

    const rawDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
    const cleanDesigns = (Array.isArray(rawDesigns) ? rawDesigns : []).filter(
      (d) => isValidDesign(d) && !demoIdMatch(d.clientId)
    );
    if (cleanDesigns.length !== rawDesigns.length) {
      setSafeStorage(STORAGE_KEYS.DESIGNS, cleanDesigns);
    }

    const rawReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
    const cleanReports = (Array.isArray(rawReports) ? rawReports : []).filter(
      (r) => isValidReport(r) && !demoIdMatch(r.clientId)
    );
    if (cleanReports.length !== rawReports.length) {
      setSafeStorage(STORAGE_KEYS.REPORTS, cleanReports);
    }

    const rawDrafts = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
    const cleanDrafts = (Array.isArray(rawDrafts) ? rawDrafts : []).filter(
      (d) => isValidTestDraft(d) && !demoIdMatch(d.clientId)
    );
    if (cleanDrafts.length !== rawDrafts.length) {
      setSafeStorage(STORAGE_KEYS.TEST_DRAFTS, cleanDrafts);
    }
  } catch (err) {
    console.error('Demo purge check failed:', err);
  }
}

// Modül yüklendiğinde eski demo verisi kalıntısı varsa temizle
purgeDemoDataIfPresent();

/**
 * Tüm Danışanları Getirir.
 * Kesinlikle demo/örnek veri eklemez; bozuk veya eksik nesneleri güvenle eler.
 */
export function getStoredClients(): Client[] {
  const clients = getSafeStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
  if (!Array.isArray(clients)) return [];
  // Geçerli ve demo olmayan gerçek danışanlar
  const validRealClients = clients.filter((c) => isValidClient(c) && !isDemoRecord(c));
  if (validRealClients.length !== clients.length) {
    setSafeStorage(STORAGE_KEYS.CLIENTS, validRealClients);
  }
  return validRealClients;
}

/**
 * Danışan Formundan Yeni ve Benzersiz Bağımsız Kayıt Ekle.
 * Her kayıt bağımsız bir kimlik (UUID) alır ve diğer danışanlardan tamamen izole tutulur.
 */
export function createClientRecord(
  formData: ClientFormData,
  source: 'CLIENT_FORM' | 'OWNER_MANUAL' = 'CLIENT_FORM'
): Client {
  const clients = getStoredClients();
  const now = new Date().toISOString();

  const newClient: Client = {
    id: generateId('client'),
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    birthDate: formData.birthDate,
    birthTime: formData.isBirthTimeUnknown ? '12:00' : formData.birthTime,
    isBirthTimeUnknown: formData.isBirthTimeUnknown,
    birthLocation: formData.birthLocation,
    motherName: formData.motherName.trim(),
    notes: formData.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
    source,
    status: 'ACTIVE',
  };

  const updated = [newClient, ...clients];
  const writeRes = setSafeStorage(STORAGE_KEYS.CLIENTS, updated);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Danışan kaydı depolanamadı.');
  }
  return newClient;
}

/**
 * Bir Danışana Ait Bütünleşik İlişkisel Arşiv Verilerini Çeker.
 * Yalnızca ve sadece belirtilen clientId ile eşleşen geçerli kayıtları getirir.
 * Bilgiler diğer danışanların verileriyle asla birleştirilmez.
 * Bozuk veya eksik kayıtlar uygulamayı çökertmez.
 */
export function getClientArchive(clientId: string): ClientArchiveRecord | null {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') return null;

  const clients = getStoredClients();
  const client = clients.find((c) => c && c.id === clientId);
  if (!client) return null;

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);

  // Kesin izolasyon ve bozuk veri koruması: Yalnızca geçerli nesneler ve bu danışanın kayıtları
  const clientAnalyses = (Array.isArray(allAnalyses) ? allAnalyses : []).filter(
    (a) => isValidAnalysis(a) && a.clientId === clientId
  );

  const clientTests = (Array.isArray(allTests) ? allTests : []).filter(
    (t) => isValidTest(t) && t.clientId === clientId
  );
  const clientSymbols = (Array.isArray(allSymbols) ? allSymbols : []).filter(
    (s) => isValidSymbol(s) && s.clientId === clientId
  );
  const latestDesign = selectLatestClientDesign(Array.isArray(allDesigns) ? allDesigns : [], clientId);
  const clientDesigns = latestDesign ? [latestDesign] : [];
  const clientReports = (Array.isArray(allReports) ? allReports : []).filter(
    (r) => isValidReport(r) && r.clientId === clientId
  );

  return {
    client,
    analyses: clientAnalyses,
    testResults: clientTests,
    symbolAnalyses: clientSymbols,
    designs: clientDesigns,
    reports: clientReports,
    historySummary: {
      totalAnalysesCount: clientAnalyses.length,
      totalDesignsCount: clientDesigns.length,
      lastInteractionAt: client.updatedAt || client.createdAt || new Date().toISOString(),
    },
  };
}

/**
 * Bir Danışanı ve Yalnızca Kendisine Ait Arşiv Verilerini Güvenle Siler.
 * Başka hiçbir danışanın verisine dokunmaz.
 */
export function deleteClientRecord(clientId: string): boolean {
  if (!clientId) return false;

  const results: StorageWriteResult[] = [];

  const clients = getStoredClients();
  const updatedClients = clients.filter((c) => c.id !== clientId);
  results.push(setSafeStorage(STORAGE_KEYS.CLIENTS, updatedClients));

  // İlişkisel kayıtları da sadece bu clientId için temizle
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.ANALYSES,
      allAnalyses.filter((a) => a.clientId !== clientId)
    )
  );

  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.TESTS,
      allTests.filter((t) => t.clientId !== clientId)
    )
  );

  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.SYMBOLS,
      allSymbols.filter((s) => s.clientId !== clientId)
    )
  );

  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.DESIGNS,
      allDesigns.filter((d) => d.clientId !== clientId)
    )
  );

  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.REPORTS,
      allReports.filter((r) => r.clientId !== clientId)
    )
  );

  const allDrafts = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
  results.push(
    setSafeStorage(
      STORAGE_KEYS.TEST_DRAFTS,
      allDrafts.filter((d) => d.clientId !== clientId)
    )
  );

  const combined = combineStorageResults(results);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Mevcut Bir Danışanın Bilgilerini Günceller.
 */
export function updateClientRecord(updatedClient: Client): Client {
  const clients = getStoredClients();
  const index = clients.findIndex((c) => c.id === updatedClient.id);
  if (index === -1) {
    throw new Error('Danışan kaydı bulunamadı.');
  }

  const existingClient = clients[index];

  // Doğum tarihi, saati veya konumu değişti mi kontrol et
  const birthDateChanged = (existingClient.birthDate || '').trim() !== (updatedClient.birthDate || '').trim();
  const birthTimeChanged = (existingClient.birthTime || '').trim() !== (updatedClient.birthTime || '').trim();
  const timeUnknownChanged = Boolean(existingClient.isBirthTimeUnknown) !== Boolean(updatedClient.isBirthTimeUnknown);
  const latChanged = existingClient.birthLocation?.latitude !== updatedClient.birthLocation?.latitude;
  const lonChanged = existingClient.birthLocation?.longitude !== updatedClient.birthLocation?.longitude;
  const tzChanged = existingClient.birthLocation?.timezone !== updatedClient.birthLocation?.timezone;

  const birthInfoChanged = birthDateChanged || birthTimeChanged || timeUnknownChanged || latChanged || lonChanged || tzChanged;

  // Ad, soyad veya doğum tarihi değişti mi kontrol et (Numeroloji ve türetilmiş analizler için)
  const firstNameChanged = (existingClient.firstName || '').trim() !== (updatedClient.firstName || '').trim();
  const lastNameChanged = (existingClient.lastName || '').trim() !== (updatedClient.lastName || '').trim();
  const numerologyInputsChanged = firstNameChanged || lastNameChanged || birthDateChanged;

  // Anne adı değişti mi kontrol et (Ebced ve türetilmiş sembol/reçete/tasarım/raporlar için)
  const motherNameChanged =
    (existingClient.motherName || '').trim().toLocaleLowerCase('tr-TR') !==
    (updatedClient.motherName || '').trim().toLocaleLowerCase('tr-TR');

  const clientToSave: Client = {
    ...updatedClient,
    updatedAt: new Date().toISOString(),
  };

  const newClients = [...clients];
  newClients[index] = clientToSave;
  const writeRes = setSafeStorage(STORAGE_KEYS.CLIENTS, newClients);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Danışan kaydı güncellenemedi.');
  }

  // Doğum verileri değiştiğinde eski astroloji hesaplamasını ve ona bağlı reçete/tasarımları sil
  if (birthInfoChanged) {
    clearClientAstrologyChart(updatedClient.id);
    clearClientSymbolAnalyses(updatedClient.id);
    clearClientDesigns(updatedClient.id);
    clearClientReports(updatedClient.id);
  }

  // Ad, soyad veya doğum tarihi değiştiğinde numeroloji, ebced ve ona bağımlı analizleri geçersiz kıl
  // SADECE değişen danışanın clientId kaydı üzerinde uygulanır, diğer danışanlar korunur.
  if (numerologyInputsChanged) {
    clearClientNumerology(updatedClient.id);
    clearClientEbced(updatedClient.id);
    clearClientChakra(updatedClient.id);
    clearClientArchetype(updatedClient.id);
    clearClientSymbolAnalyses(updatedClient.id);
    clearClientDesigns(updatedClient.id);
    clearClientReports(updatedClient.id);
  }

  // Anne adı değiştiğinde eski anne adına bağlı Ebced analizini, sembol seçimlerini, reçete ve tasarımları kalıcı olarak sil
  // Astroloji, numeroloji, çakra, arketip ve test yanıtları KORUNUR (anne adına bağımlı değillerdir).
  // SADECE değişen danışanın clientId kaydı üzerinde uygulanır, diğer danışanlar korunur.
  if (motherNameChanged) {
    clearClientEbced(updatedClient.id);
  }

  return clientToSave;
}

/**
 * Bir danışana ait Batı / Tropical astroloji hesaplama sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
 * Astroloji değiştiğinde astrolojiye bağlı reçete ve tasarım sonuçlarını otomatik siler.
 */
export function saveClientAstrologyChart(
  clientId: string,
  chart: TropicalNatalChart
): ClientAnalysisRecord {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const now = new Date().toISOString();

  const existingIndex = validAnalyses.findIndex((a) => a.clientId === clientId);

  let savedRecord: ClientAnalysisRecord;
  if (existingIndex >= 0) {
    const existing = validAnalyses[existingIndex];
    const existingAstro = existing.astrology;
    const hasChanged = !existingAstro ||
      existingAstro.sunSign !== chart.sunSign ||
      existingAstro.moonSign !== chart.moonSign ||
      existingAstro.ascendantSign !== chart.ascendantSign ||
      existingAstro.birthDate !== chart.birthDate ||
      existingAstro.birthTime !== chart.birthTime;

    savedRecord = {
      ...existing,
      updatedAt: now,
      astrology: chart,
    };
    validAnalyses[existingIndex] = savedRecord;

    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Astroloji analiz kaydı saklanamadı.');
    }

    if (hasChanged) {
      // Astroloji değiştiğinde astrolojiye bağlı sembol, reçete, tasarım ve raporları sil
      clearClientSymbolAnalyses(clientId);
      clearClientDesigns(clientId);
      clearClientReports(clientId);
    }
  } else {
    savedRecord = {
      id: generateId('analysis'),
      clientId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      astrology: chart,
    };
    validAnalyses.push(savedRecord);
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Astroloji analiz kaydı saklanamadı.');
    }
  }

  return savedRecord;
}

/**
 * Bir danışana ait astroloji analiz sonucunu temizler.
 * Astroloji silindiğinde ona bağlı sembol, reçete, tasarım ve raporlar da otomatik temizlenir.
 */
export function clearClientAstrologyChart(clientId: string): boolean {
  if (!clientId) return false;

  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index !== -1) {
    const existing = validAnalyses[index];
    const { astrology, ...rest } = existing;
    validAnalyses[index] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    results.push(setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses));
  }

  clearClientSymbolAnalyses(clientId);
  const symRes = getLastStorageWriteResult();
  if (symRes) results.push(symRes);

  clearClientDesigns(clientId);
  const desRes = getLastStorageWriteResult();
  if (desRes) results.push(desRes);

  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results.length > 0 ? results : [{ status: 'persisted', key: STORAGE_KEYS.ANALYSES }]);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait Numeroloji analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
 * Numeroloji değiştiğinde çakra, arketip, sembol, reçete ve raporları otomatik siler.
 */
export function saveClientNumerology(
  clientId: string,
  numerology: NumerologyAnalysis
): ClientAnalysisRecord {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const now = new Date().toISOString();

  const existingIndex = validAnalyses.findIndex((a) => a.clientId === clientId);

  let savedRecord: ClientAnalysisRecord;
  if (existingIndex >= 0) {
    const existing = validAnalyses[existingIndex];
    const existingNum = existing.numerology;
    const hasChanged = !existingNum ||
      existingNum.lifePathNumber !== numerology.lifePathNumber ||
      existingNum.destinyNumber !== numerology.destinyNumber ||
      existingNum.soulUrgeNumber !== numerology.soulUrgeNumber ||
      existingNum.personalityNumber !== numerology.personalityNumber ||
      existingNum.birthdayNumber !== numerology.birthdayNumber ||
      existingNum.worldMissionNumber !== numerology.worldMissionNumber;

    if (hasChanged) {
      // Çakra ve arketip eski numerolojiye bağlı olduğundan geçersiz kılınır ve temizlenir
      const { chakra, archetype, ...rest } = existing;
      savedRecord = {
        ...rest,
        updatedAt: now,
        numerology,
      };
      validAnalyses[existingIndex] = savedRecord;
      const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
      if (writeRes.status === 'failed') {
        throw new Error(writeRes.errorMessage || 'Numeroloji analiz kaydı saklanamadı.');
      }

      // Bağımlı reçeteleri, sembolleri ve raporları sil
      clearClientSymbolAnalyses(clientId);
      clearClientDesigns(clientId);
      clearClientReports(clientId);
    } else {
      savedRecord = {
        ...existing,
        updatedAt: now,
        numerology,
      };
      validAnalyses[existingIndex] = savedRecord;
      const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
      if (writeRes.status === 'failed') {
        throw new Error(writeRes.errorMessage || 'Numeroloji analiz kaydı saklanamadı.');
      }
    }
  } else {
    savedRecord = {
      id: generateId('analysis'),
      clientId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      numerology,
    };
    validAnalyses.push(savedRecord);
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Numeroloji analiz kaydı saklanamadı.');
    }
  }

  return savedRecord;
}

/**
 * Bir danışana ait numeroloji analiz sonucunu temizler.
 * Numeroloji temizlendiğinde ona bağımlı çakra, arketip, sembol, reçete ve raporlar da silinir.
 */
export function clearClientNumerology(clientId: string): boolean {
  if (!clientId) return false;

  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index !== -1) {
    const existing = validAnalyses[index];
    const { numerology, chakra, archetype, ...rest } = existing;
    validAnalyses[index] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    results.push(setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses));
  }

  clearClientSymbolAnalyses(clientId);
  const symRes = getLastStorageWriteResult();
  if (symRes) results.push(symRes);

  clearClientDesigns(clientId);
  const desRes = getLastStorageWriteResult();
  if (desRes) results.push(desRes);

  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results.length > 0 ? results : [{ status: 'persisted', key: STORAGE_KEYS.ANALYSES }]);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait Ebced analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
 * Ebced değiştiğinde ona bağımlı sembol analizleri, reçete, tasarım ve raporları otomatik siler.
 * Bağımsız kayıtlar (astroloji, numeroloji, çakra, arketip, testler) KORUNUR.
 */
export function saveClientEbced(
  clientId: string,
  ebced: EbcedAnalysis
): ClientAnalysisRecord {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const now = new Date().toISOString();

  const existingIndex = validAnalyses.findIndex((a) => a.clientId === clientId);

  let savedRecord: ClientAnalysisRecord;
  if (existingIndex >= 0) {
    const existing = validAnalyses[existingIndex];
    const existingEbced = existing.ebced;
    const hasChanged =
      !existingEbced ||
      existingEbced.clientNameValue !== ebced.clientNameValue ||
      existingEbced.motherNameValue !== ebced.motherNameValue ||
      existingEbced.combinedTotal !== ebced.combinedTotal ||
      existingEbced.elementalResonance !== ebced.elementalResonance ||
      existingEbced.planetaryRuler !== ebced.planetaryRuler;

    savedRecord = {
      ...existing,
      updatedAt: now,
      ebced,
    };
    validAnalyses[existingIndex] = savedRecord;
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Ebced analiz kaydı saklanamadı.');
    }

    if (hasChanged) {
      // Ebced değiştiğinde ona bağımlı sembol, reçete, tasarım ve raporları kalıcı olarak sil
      clearClientSymbolAnalyses(clientId);
      clearClientDesigns(clientId);
      clearClientReports(clientId);
    }
  } else {
    savedRecord = {
      id: generateId('analysis'),
      clientId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ebced,
    };
    validAnalyses.push(savedRecord);
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Ebced analiz kaydı saklanamadı.');
    }
  }

  return savedRecord;
}

/**
 * Bir danışana ait Ebced analiz sonucunu temizler.
 * Ebced temizlendiğinde ona bağımlı sembol analizleri, reçete, tasarım ve raporlar da kalıcı olarak silinir.
 * Bağımsız kayıtlar (astroloji, numeroloji, çakra, arketip, testler) KORUNUR.
 */
export function clearClientEbced(clientId: string): boolean {
  if (!clientId) return false;

  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index !== -1) {
    const existing = validAnalyses[index];
    const { ebced, ...rest } = existing;
    validAnalyses[index] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    results.push(setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses));
  }

  clearClientSymbolAnalyses(clientId);
  const symRes = getLastStorageWriteResult();
  if (symRes) results.push(symRes);

  clearClientDesigns(clientId);
  const desRes = getLastStorageWriteResult();
  if (desRes) results.push(desRes);

  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results.length > 0 ? results : [{ status: 'persisted', key: STORAGE_KEYS.ANALYSES }]);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait Çakra analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
 * Çakra değiştiğinde arketip, sembol, reçete ve raporları otomatik siler.
 */
export function saveClientChakra(
  clientId: string,
  chakra: ChakraAnalysis
): ClientAnalysisRecord {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const now = new Date().toISOString();

  const existingIndex = validAnalyses.findIndex((a) => a.clientId === clientId);

  let savedRecord: ClientAnalysisRecord;
  if (existingIndex >= 0) {
    const existing = validAnalyses[existingIndex];
    const existingChk = existing.chakra;
    const hasChanged = !existingChk ||
      existingChk.dominantChakra !== chakra.dominantChakra ||
      existingChk.primaryDeficit !== chakra.primaryDeficit ||
      JSON.stringify(existingChk.chakras) !== JSON.stringify(chakra.chakras);

    if (hasChanged) {
      // Arketip eski çakraya bağlı olduğundan temizlenir
      const { archetype, ...rest } = existing;
      savedRecord = {
        ...rest,
        updatedAt: now,
        chakra,
      };
      validAnalyses[existingIndex] = savedRecord;
      const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
      if (writeRes.status === 'failed') {
        throw new Error(writeRes.errorMessage || 'Çakra analiz kaydı saklanamadı.');
      }

      // Bağımlı arketip, sembol, reçete ve raporları sil
      clearClientSymbolAnalyses(clientId);
      clearClientDesigns(clientId);
      clearClientReports(clientId);
    } else {
      savedRecord = {
        ...existing,
        updatedAt: now,
        chakra,
      };
      validAnalyses[existingIndex] = savedRecord;
      const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
      if (writeRes.status === 'failed') {
        throw new Error(writeRes.errorMessage || 'Çakra analiz kaydı saklanamadı.');
      }
    }
  } else {
    savedRecord = {
      id: generateId('analysis'),
      clientId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      chakra,
    };
    validAnalyses.push(savedRecord);
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Çakra analiz kaydı saklanamadı.');
    }
  }

  return savedRecord;
}

/**
 * Bir danışana ait çakra analiz sonucunu temizler.
 * Çakra temizlendiğinde ona bağımlı arketip, sembol, reçete ve raporlar da silinir.
 */
export function clearClientChakra(clientId: string): boolean {
  if (!clientId) return false;

  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index !== -1) {
    const existing = validAnalyses[index];
    const { chakra, archetype, ...rest } = existing;
    validAnalyses[index] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    results.push(setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses));
  }

  clearClientSymbolAnalyses(clientId);
  const symRes = getLastStorageWriteResult();
  if (symRes) results.push(symRes);

  clearClientDesigns(clientId);
  const desRes = getLastStorageWriteResult();
  if (desRes) results.push(desRes);

  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results.length > 0 ? results : [{ status: 'persisted', key: STORAGE_KEYS.ANALYSES }]);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait Birleşik ve Gölge Arketip analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
 * Arketip değiştiğinde sembol, reçete ve raporları otomatik siler.
 */
export function saveClientArchetype(
  clientId: string,
  archetype: ArchetypeAnalysis
): ClientAnalysisRecord {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const now = new Date().toISOString();

  const existingIndex = validAnalyses.findIndex((a) => a.clientId === clientId);

  let savedRecord: ClientAnalysisRecord;
  if (existingIndex >= 0) {
    const existing = validAnalyses[existingIndex];
    const existingArch = existing.archetype;
    const existingBaseSecondary = existingArch?.unifiedArchetype?.secondary?.split('·')[0].trim();
    const newBaseSecondary = archetype.unifiedArchetype?.secondary?.split('·')[0].trim();
    const hasChanged = !existingArch ||
      existingArch.unifiedArchetype?.primary !== archetype.unifiedArchetype?.primary ||
      existingBaseSecondary !== newBaseSecondary ||
      existingArch.shadowArchetype?.shadowName !== archetype.shadowArchetype?.shadowName;

    savedRecord = {
      ...existing,
      updatedAt: now,
      archetype,
    };
    validAnalyses[existingIndex] = savedRecord;
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Arketip analiz kaydı saklanamadı.');
    }

    if (hasChanged) {
      // Arketip değiştiğinde sembol, reçete ve raporları sil
      clearClientSymbolAnalyses(clientId);
      clearClientDesigns(clientId);
      clearClientReports(clientId);
    }
  } else {
    savedRecord = {
      id: generateId('analysis'),
      clientId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      archetype,
    };
    validAnalyses.push(savedRecord);
    const writeRes = setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
    if (writeRes.status === 'failed') {
      throw new Error(writeRes.errorMessage || 'Arketip analiz kaydı saklanamadı.');
    }
  }

  return savedRecord;
}

/**
 * Bir danışana ait arketip analiz sonucunu temizler.
 * Arketip temizlendiğinde ona bağımlı sembol, reçete ve raporlar da silinir.
 */
export function clearClientArchetype(clientId: string): boolean {
  if (!clientId) return false;

  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index !== -1) {
    const existing = validAnalyses[index];
    const { archetype, ...rest } = existing;
    validAnalyses[index] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    results.push(setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses));
  }

  clearClientSymbolAnalyses(clientId);
  const symRes = getLastStorageWriteResult();
  if (symRes) results.push(symRes);

  clearClientDesigns(clientId);
  const desRes = getLastStorageWriteResult();
  if (desRes) results.push(desRes);

  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results.length > 0 ? results : [{ status: 'persisted', key: STORAGE_KEYS.ANALYSES }]);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait dövme tasarımı/reçetesini güvenle kaydeder.
 * Kural (Tekil Güncel Kayıt İlkesi): Her danışan için yalnızca tek bir güncel ve geçerli tasarım kaydı tutulur.
 * Eski tasarımlar arşivlenmez, versiyon olarak saklanmaz ve geçmiş kayıt olarak biriktirilmez.
 * Yeni tasarım kaydedildiğinde aynı danışanın önceki tüm tasarım kayıtları tamamen kaldırılır.
 * Diğer danışanların kayıtlarına kesinlikle dokunulmaz.
 */
export function saveClientDesign(
  clientId: string,
  design: ClientTattooDesign
): ClientTattooDesign {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];

  // ID çakışması koruması: Başka danışana ait bir tasarım ID'si varsa yeni ID ata
  let targetDesignId = design.id;
  const isOtherClientDesign = validDesigns.some(
    (d) => d.id === targetDesignId && d.clientId !== clientId
  );
  if (isOtherClientDesign || !targetDesignId) {
    targetDesignId = generateId('design');
  }

  const designToSave: ClientTattooDesign = {
    ...design,
    id: targetDesignId,
    clientId,
    versionNumber: 1, // Tekil güncel kayıt ilkesi: versiyon biriktirme kaldırıldı, her zaman aktif tekil sürüm 1
    updatedAt: new Date().toISOString(),
  };

  // Tekil güncel kayıt ilkesi: İlgili danışanın önceki TÜM tasarımlarını kaldır, diğer danışanları koru
  const otherClientsDesigns = validDesigns.filter((d) => d.clientId !== clientId);
  const updatedDesigns = [...otherClientsDesigns, designToSave];

  const writeRes = setSafeStorage(STORAGE_KEYS.DESIGNS, updatedDesigns);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Dövme reçetesi saklanamadı.');
  }
  return designToSave;
}

/**
 * Tarih dizesini güvenle milisaniyeye çevirir. Geçersiz veya eksik ise -1 döner.
 */
function parseSafeDate(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return -1;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? -1 : parsed;
}

/**
 * Tasarımın efektif tarih damgasını belirler.
 * Öncelik sırası: updatedAt -> createdAt. İkisi de yoksa veya geçersizse -1 döner.
 */
function getDesignEffectiveTimestamp(design: ClientTattooDesign): number {
  const updatedTs = parseSafeDate(design.updatedAt);
  if (updatedTs >= 0) return updatedTs;
  const createdTs = parseSafeDate(design.createdAt);
  if (createdTs >= 0) return createdTs;
  return -1;
}

/**
 * Danışana ait tasarımlar arasından en güncel olan tekil tasarımı kronolojik olarak seçer.
 * 1. Geçerlilik ve clientId kontrolü
 * 2. updatedAt, yoksa createdAt tarihine göre en yeniden en eskiye sıralama (azalan)
 * 3. Geçersiz veya eksik tarihler geçerli tarihlerden sonra gelir
 * 4. Eşitlik durumunda deterministik id karşılaştırması
 * 5. Orijinal diziyi mutate etmez
 */
export function selectLatestClientDesign(
  designs: ClientTattooDesign[],
  clientId: string
): ClientTattooDesign | null {
  if (!clientId || !Array.isArray(designs) || designs.length === 0) return null;
  const clientDesigns = designs.filter((d) => isValidDesign(d) && d.clientId === clientId);
  if (clientDesigns.length === 0) return null;
  if (clientDesigns.length === 1) return clientDesigns[0];

  const sorted = [...clientDesigns].sort((a, b) => {
    const timeA = getDesignEffectiveTimestamp(a);
    const timeB = getDesignEffectiveTimestamp(b);
    if (timeB !== timeA) {
      return timeB - timeA; // En yeni tarih en başta (azalan sıralama)
    }
    // Deterministik eşitlik çözümü
    return (b.id || '').localeCompare(a.id || '');
  });

  return sorted[0] || null;
}

/**
 * Bir danışana ait dövme tasarımını getirir.
 * Tekil güncel kayıt ilkesi: Her danışan için en fazla 1 adet güncel tasarım kaydı döner.
 * Eski depolama verilerinde birden fazla kayıt varsa kronolojik olarak en güncelini seçer.
 */
export function getClientDesigns(clientId: string): ClientTattooDesign[] {
  if (!clientId) return [];
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const latest = selectLatestClientDesign(allDesigns, clientId);
  return latest ? [latest] : [];
}

/**
 * Bir danışana ait belirli bir dövme tasarımını siler.
 * Veri Tutarlılığı: Silinen tasarıma ait ilişkili tamamlanma raporunu (REPORTS) da senkronize siler.
 */
export function deleteClientDesign(clientId: string, designId: string): boolean {
  if (!clientId || !designId) return false;
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];
  const targetDesign = validDesigns.find((d) => d.clientId === clientId && d.id === designId);
  const filtered = validDesigns.filter((d) => !(d.clientId === clientId && d.id === designId));
  
  if (filtered.length !== validDesigns.length) {
    setSafeStorage(STORAGE_KEYS.DESIGNS, filtered);

    // SENKRONİZASYON: Silinen tasarıma ait raporu da temizle
    if (targetDesign) {
      clearClientReports(clientId);
    }
    return true;
  }
  return false;
}

/**
 * Bir danışana ait TÜM dövme tasarımlarını temizler (sıfırlar).
 * Kural 15: Danışanın astroloji, numeroloji, çakra veya arketip sonuçlarını KESİNLİKLE silmez.
 * Veri Tutarlılığı: Tasarımlar silindiğinde ilişkili tamamlanma raporlarını da senkronize temizler.
 */
export function clearClientDesigns(clientId: string): boolean {
  if (!clientId) return false;
  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];
  const filtered = validDesigns.filter((d) => d.clientId !== clientId);
  results.push(setSafeStorage(STORAGE_KEYS.DESIGNS, filtered));

  // İlişkili raporları da temizle
  clearClientReports(clientId);
  const repRes = getLastStorageWriteResult();
  if (repRes) results.push(repRes);

  const combined = combineStorageResults(results);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait dövme tasarım sürecinin nihai raporunu / tamamlanma kaydını kalıcı olarak saklar.
 * İdempotent: Aynı clientId ve version/id için tekrar çağrıldığında mükerrer kayıt oluşturmaz, günceller.
 * Danışan İzolasyonu: Sadece ilgili clientId ile ilişkilendirir.
 */
export function saveClientReport(
  clientId: string,
  report: ClientTattooReport
): ClientTattooReport {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
  const validReports = Array.isArray(allReports) ? allReports.filter(isValidReport) : [];

  let targetReportId = report.id;
  const isOtherClient = validReports.some(
    (r) => r.id === targetReportId && r.clientId !== clientId
  );
  if (isOtherClient || !targetReportId) {
    targetReportId = generateId('report');
  }

  const reportToSave: ClientTattooReport = {
    ...report,
    id: targetReportId,
    clientId,
    generatedAt: report.generatedAt || new Date().toISOString(),
  };

  // Tekil güncel kayıt ilkesi: İlgili danışanın önceki tamamlanma raporunu kaldır, diğer danışanları koru
  const otherClientsReports = validReports.filter((r) => r.clientId !== clientId);
  const updatedReports = [...otherClientsReports, reportToSave];

  const writeRes = setSafeStorage(STORAGE_KEYS.REPORTS, updatedReports);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Dövme raporu saklanamadı.');
  }
  return reportToSave;
}

/**
 * Bir danışana ait kayıtlı nihai raporları getirir.
 * Tekil güncel kayıt ilkesi: Her danışan için en fazla 1 adet güncel rapor döner.
 */
export function getClientReports(clientId: string): ClientTattooReport[] {
  if (!clientId) return [];
  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
  const clientReports = (Array.isArray(allReports) ? allReports : []).filter(
    (r) => isValidReport(r) && r.clientId === clientId
  );
  return clientReports.length > 1 ? [clientReports[clientReports.length - 1]] : clientReports;
}

/**
 * Bir danışanın tasarım sürecinin kalıcı olarak tamamlanıp tamamlanmadığını sorgular.
 * Merkezi Doğruluk Kaynağı: Hem arşive işlenmiş rapor hem de tasarımdaki isCompleted bayrağı doğrulanır.
 */
export function isClientDesignCompleted(clientId: string, designId?: string): boolean {
  if (!clientId) return false;
  const reports = getClientReports(clientId);
  const designs = getClientDesigns(clientId);

  if (designId) {
    const targetDesign = designs.find((d) => d.id === designId);
    if (!targetDesign) return false;
    return (
      Boolean(targetDesign.isCompleted) &&
      reports.some((r) => r.version === targetDesign.versionNumber)
    );
  }

  // Genel danışan düzeyinde kontrol: En az bir tasarım ve ona ait tamamlanma raporu eşleşmeli
  return designs.some(
    (d) => Boolean(d.isCompleted) && reports.some((r) => r.version === d.versionNumber)
  );
}

/**
 * Bir danışana ait tüm nihai raporları temizler.
 * Veri Tutarlılığı: Raporlar silindiğinde tasarımlardaki isCompleted ve completedAt alanlarını da sıfırlar.
 */
export function clearClientReports(clientId: string): boolean {
  if (!clientId) return false;
  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
  const validReports = Array.isArray(allReports) ? allReports.filter(isValidReport) : [];
  const filtered = validReports.filter((r) => r.clientId !== clientId);
  results.push(setSafeStorage(STORAGE_KEYS.REPORTS, filtered));

  // SENKRONİZASYON: Tasarımlardaki tamamlanma durumunu da sıfırla
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];
  let modified = false;
  const updatedDesigns = validDesigns.map((d) => {
    if (d.clientId === clientId && d.isCompleted) {
      modified = true;
      return {
        ...d,
        isCompleted: false,
        completedAt: undefined,
      };
    }
    return d;
  });

  if (modified) {
    results.push(setSafeStorage(STORAGE_KEYS.DESIGNS, updatedDesigns));
  }

  const combined = combineStorageResults(results);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * Bir danışana ait sembol analizi ve kompozisyonunu güvenle kaydeder.
 * Her danışan için tek bir güncel ve geçerli sembol analizi tutulur.
 * Yeni analiz kaydedildiğinde aynı danışanın önceki sembol analizi silinir, başka danışanların kayıtları korunur.
 */
export function saveClientSymbolAnalysis(
  clientId: string,
  analysis: ClientSymbolAnalysis
): ClientSymbolAnalysis {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  const validSymbols = Array.isArray(allSymbols) ? allSymbols.filter(isValidSymbol) : [];

  let targetSymbolId = analysis.id;
  const isOtherClientSymbol = validSymbols.some(
    (s) => s.id === targetSymbolId && s.clientId !== clientId
  );
  if (isOtherClientSymbol || !targetSymbolId) {
    targetSymbolId = generateId('symbol');
  }

  const analysisToSave: ClientSymbolAnalysis = {
    ...analysis,
    id: targetSymbolId,
    clientId,
    version: 1, // Her danışan için tek güncel kayıt
  };

  // Aynı danışana ait eski sembol analizini sil; diğer danışanların kayıtlarını aynen koru
  const remainingSymbols = validSymbols.filter((s) => s.clientId !== clientId);
  remainingSymbols.push(analysisToSave);

  const writeRes = setSafeStorage(STORAGE_KEYS.SYMBOLS, remainingSymbols);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Sembol analizi saklanamadı.');
  }
  return analysisToSave;
}

/**
 * Bir danışana ait tüm sembol analizlerini getirir.
 */
export function getClientSymbolAnalyses(clientId: string): ClientSymbolAnalysis[] {
  if (!clientId) return [];
  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  return (Array.isArray(allSymbols) ? allSymbols : []).filter(
    (s) => isValidSymbol(s) && s.clientId === clientId
  );
}

/**
 * Bir danışana ait belirli bir sembol analiz kaydını siler.
 */
export function deleteClientSymbolAnalysis(clientId: string, analysisId: string): boolean {
  if (!clientId || !analysisId) return false;
  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  const validSymbols = Array.isArray(allSymbols) ? allSymbols.filter(isValidSymbol) : [];
  const filtered = validSymbols.filter((s) => !(s.clientId === clientId && s.id === analysisId));
  if (filtered.length !== validSymbols.length) {
    setSafeStorage(STORAGE_KEYS.SYMBOLS, filtered);
    return true;
  }
  return false;
}

/**
 * Bir danışana ait TÜM sembol analizlerini temizler (sıfırlar).
 * Diğer analizleri ve reçeteleri KESİNLİKLE silmez.
 */
export function clearClientSymbolAnalyses(clientId: string): boolean {
  if (!clientId) return false;
  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  const validSymbols = Array.isArray(allSymbols) ? allSymbols.filter(isValidSymbol) : [];
  const filtered = validSymbols.filter((s) => s.clientId !== clientId);
  const writeRes = setSafeStorage(STORAGE_KEYS.SYMBOLS, filtered);
  lastStorageWriteResult = writeRes;
  return writeRes.status !== 'failed';
}

/**
 * Sayfa yenilendiğinde son seçili danışanı geri yüklemek için kayıtlı ID'yi çeker.
 */
export function getStoredActiveClientId(): string | null {
  return getSafeStorage<string | null>(STORAGE_KEYS.ACTIVE_CLIENT, null);
}

/**
 * Aktif danışan kimliğini yerel depolamada saklar.
 */
export function setStoredActiveClientId(clientId: string | null): void {
  setSafeStorage(STORAGE_KEYS.ACTIVE_CLIENT, clientId);
}

/**
 * Bir danışana ait test sonucunu (Enneagram, Totem) güvenle kaydeder.
 * Yeni versiyon eklendiğinde önceki versiyonları korur.
 * Başka bir danışanın test sonucu üzerine yazılmasını ve ID çakışmalarını engeller.
 */
export function saveClientTestResult(
  clientId: string,
  testResult: ClientTestResult
): ClientTestResult {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }

  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  const validTests = Array.isArray(allTests) ? allTests.filter(isValidTest) : [];

  let targetTestId = testResult.id;
  const isOtherClientTest = validTests.some(
    (t) => t.id === targetTestId && t.clientId !== clientId
  );
  if (isOtherClientTest || !targetTestId) {
    targetTestId = generateId('test');
  }

  const testToSave: ClientTestResult = {
    ...testResult,
    id: targetTestId,
    clientId,
  };

  const index = validTests.findIndex((t) => t.id === testToSave.id && t.clientId === clientId);

  if (index >= 0) {
    validTests[index] = testToSave;
  } else {
    validTests.push(testToSave);
  }

  const writeRes = setSafeStorage(STORAGE_KEYS.TESTS, validTests);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Test sonucu saklanamadı.');
  }
  // A69: Test tamamlandığında bu test türüne ait yarım kalmış taslağı otomatik temizle
  clearClientTestDraft(clientId, testResult.testType);
  return testToSave;
}

/**
 * Bir danışana ait tüm test sonuçlarını getirir.
 */
export function getClientTestResults(clientId: string): ClientTestResult[] {
  if (!clientId) return [];
  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  return (Array.isArray(allTests) ? allTests : []).filter(
    (t) => isValidTest(t) && t.clientId === clientId
  );
}

/**
 * Bir danışana ait belirli bir test sonucunu ID'ye göre siler.
 */
export function deleteClientTestResult(clientId: string, testId: string): boolean {
  if (!clientId || !testId) return false;
  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  const validTests = Array.isArray(allTests) ? allTests.filter(isValidTest) : [];
  const filtered = validTests.filter((t) => !(t.clientId === clientId && t.id === testId));
  if (filtered.length !== validTests.length) {
    setSafeStorage(STORAGE_KEYS.TESTS, filtered);
    return true;
  }
  return false;
}

/**
 * Bir danışana ait test sonuçlarını temizler (sıfırlar).
 * Eğer testType belirtilmişse sadece o test tipini (ENNEAGRAM veya ANIMAL_TOTEM) temizler.
 * Diğer test tipini, analizleri veya reçeteleri KESİNLİKLE silmez.
 * A69: Test sıfırlandığında ilişkili taslak yanıtı da temizler.
 */
export function clearClientTestResult(clientId: string, testType?: TestType): boolean {
  if (!clientId) return false;
  const results: (StorageWriteResult | MultiStorageWriteResult)[] = [];
  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  const validTests = Array.isArray(allTests) ? allTests.filter(isValidTest) : [];
  const filtered = validTests.filter((t) => {
    if (t.clientId !== clientId) return true;
    if (testType) {
      return t.testType !== testType;
    }
    return false;
  });
  results.push(setSafeStorage(STORAGE_KEYS.TESTS, filtered));
  // A69: Test sıfırlandığında ilgili taslak yanıtları da temizle
  clearClientTestDraft(clientId, testType);
  const draftRes = getLastStorageWriteResult();
  if (draftRes) results.push(draftRes);

  const combined = combineStorageResults(results);
  lastStorageWriteResult = combined;
  return combined.status !== 'failed';
}

/**
 * A69: Danışanın tamamlanmamış test taslak yanıtlarını kaydeder.
 * Her danışan ve test türü için tek bir güncel taslak tutulur.
 * answers nesnesi içindeki geçersiz veri tiplerini ayıklar.
 */
export function saveClientTestDraft(
  clientId: string,
  testType: TestType,
  answers: Record<string, string>,
  activeQuestionIndex: number = 0
): ClientTestDraft {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Geçerli bir clientId gereklidir.');
  }
  if (!testType || typeof testType !== 'string') {
    throw new Error('Geçerli bir testType gereklidir.');
  }

  // Güvenli answers ayıklama
  const sanitizedAnswers: Record<string, string> = {};
  if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    for (const [k, v] of Object.entries(answers)) {
      if (typeof k === 'string' && typeof v === 'string') {
        sanitizedAnswers[k] = v;
      }
    }
  }

  const allDrafts = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
  const validDrafts = Array.isArray(allDrafts) ? allDrafts.filter(isValidTestDraft) : [];

  const draftToSave: ClientTestDraft = {
    clientId: clientId.trim(),
    testType,
    answers: sanitizedAnswers,
    activeQuestionIndex:
      typeof activeQuestionIndex === 'number' && !isNaN(activeQuestionIndex) && activeQuestionIndex >= 0
        ? activeQuestionIndex
        : 0,
    updatedAt: new Date().toISOString(),
  };

  // İzolasyon: Bu danışanın ve bu test türünün eski taslağını çıkar, diğerlerini aynen koru
  const remainingDrafts = validDrafts.filter(
    (d) => !(d.clientId === clientId && d.testType === testType)
  );
  remainingDrafts.push(draftToSave);

  const writeRes = setSafeStorage(STORAGE_KEYS.TEST_DRAFTS, remainingDrafts);
  if (writeRes.status === 'failed') {
    throw new Error(writeRes.errorMessage || 'Test taslağı saklanamadı.');
  }
  return draftToSave;
}

/**
 * A69: Danışana ve test türüne ait kayıtlı test taslağını getirir.
 * Bozuk veri durumunda güvenle null döner ve sisteme zarar vermez.
 */
export function getClientTestDraft(clientId: string, testType: TestType): ClientTestDraft | null {
  if (!clientId || !testType) return null;
  const allDrafts = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
  if (!Array.isArray(allDrafts)) return null;

  const validDrafts = allDrafts.filter(isValidTestDraft);
  const found = validDrafts.find((d) => d.clientId === clientId && d.testType === testType);
  if (!found) return null;

  // Answers nesnesini de derin doğrula
  if (!found.answers || typeof found.answers !== 'object' || Array.isArray(found.answers)) {
    return null;
  }

  return {
    clientId: found.clientId,
    testType: found.testType,
    answers: { ...found.answers },
    activeQuestionIndex: typeof found.activeQuestionIndex === 'number' ? found.activeQuestionIndex : 0,
    updatedAt: found.updatedAt || new Date().toISOString(),
  };
}

/**
 * A69: Danışana ait test taslaklarını temizler.
 * testType belirtilmişse yalnızca o test türüne ait taslak silinir.
 * Diğer danışanların ve diğer test türlerinin taslaklarına DOKUNMAZ.
 */
export function clearClientTestDraft(clientId: string, testType?: TestType): boolean {
  if (!clientId) return false;
  const allDrafts = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
  const validDrafts = Array.isArray(allDrafts) ? allDrafts.filter(isValidTestDraft) : [];

  const filtered = validDrafts.filter((d) => {
    if (d.clientId !== clientId) return true;
    if (testType) {
      return d.testType !== testType;
    }
    return false;
  });

  const writeRes = setSafeStorage(STORAGE_KEYS.TEST_DRAFTS, filtered);
  lastStorageWriteResult = writeRes;
  return writeRes.status !== 'failed';
}

/**
 * A69: Tüm kayıtlı test taslaklarını getirir (Yönetici denetimi için).
 */
export function getAllStoredTestDrafts(): ClientTestDraft[] {
  const all = getSafeStorage<ClientTestDraft[]>(STORAGE_KEYS.TEST_DRAFTS, []);
  return (Array.isArray(all) ? all : []).filter(isValidTestDraft);
}

/**
 * Tüm kayıtlı analiz kayıtlarını getirir (Yönetici denetimi için).
 */
export function getAllStoredAnalyses(): ClientAnalysisRecord[] {
  const all = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  return (Array.isArray(all) ? all : []).filter(isValidAnalysis);
}

/**
 * Tüm kayıtlı dövme tasarımı kayıtlarını getirir (Yönetici denetimi için).
 */
export function getAllStoredDesigns(): ClientTattooDesign[] {
  const all = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  return (Array.isArray(all) ? all : []).filter(isValidDesign);
}

/**
 * Tüm kayıtlı test sonuçlarını getirir (Yönetici denetimi için).
 */
export function getAllStoredTests(): ClientTestResult[] {
  const all = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  return (Array.isArray(all) ? all : []).filter(isValidTest);
}

/**
 * Tüm kayıtlı sembol analizi kayıtlarını getirir (Yönetici denetimi için).
 */
export function getAllStoredSymbols(): ClientSymbolAnalysis[] {
  const all = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  return (Array.isArray(all) ? all : []).filter(isValidSymbol);
}

/**
 * Tüm uygulama verilerini güvenle sıfırlar.
 * Yalnızca açık yönetici onayı ile çağrılır.
 */
export function clearAllApplicationData(): boolean {
  const results: StorageWriteResult[] = [
    setSafeStorage(STORAGE_KEYS.CLIENTS, []),
    setSafeStorage(STORAGE_KEYS.ANALYSES, []),
    setSafeStorage(STORAGE_KEYS.TESTS, []),
    setSafeStorage(STORAGE_KEYS.SYMBOLS, []),
    setSafeStorage(STORAGE_KEYS.DESIGNS, []),
    setSafeStorage(STORAGE_KEYS.REPORTS, []),
    setSafeStorage(STORAGE_KEYS.ACTIVE_CLIENT, null),
    setSafeStorage(STORAGE_KEYS.TEST_DRAFTS, []),
  ];
  const combined = combineStorageResults(results);
  lastStorageWriteResult = combined;
  if (combined.status === 'persisted') {
    clearMemoryFallback();
  }
  return combined.status !== 'failed';
}

/**
 * A35 — Depolama Bütünlüğü ve Güvenlik Denetimi Durumu
 * Ham depolama anahtarlarını denetler, bozuk veya eksik veri olup olmadığını tespit eder.
 */
export function getRawStorageIntegrityStatus(): {
  isStorageAccessible: boolean;
  hasCorruptedClients: boolean;
  hasCorruptedAnalyses: boolean;
  hasCorruptedTests: boolean;
  hasCorruptedDesigns: boolean;
  clientsCount: number;
  analysesCount: number;
  testsCount: number;
  designsCount: number;
} {
  let isAccessible = true;
  try {
    const testKey = '__integrity_test_key__';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    }
  } catch {
    isAccessible = false;
  }

  const rawClients = getSafeStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
  const rawAnalyses = getSafeStorage<any[]>(STORAGE_KEYS.ANALYSES, []);
  const rawTests = getSafeStorage<any[]>(STORAGE_KEYS.TESTS, []);
  const rawDesigns = getSafeStorage<any[]>(STORAGE_KEYS.DESIGNS, []);

  const hasCorruptedClients = Array.isArray(rawClients) && rawClients.some((c) => !isValidClient(c));
  const hasCorruptedAnalyses = Array.isArray(rawAnalyses) && rawAnalyses.some((a) => !isValidAnalysis(a));
  const hasCorruptedTests = Array.isArray(rawTests) && rawTests.some((t) => !isValidTest(t));
  const hasCorruptedDesigns = Array.isArray(rawDesigns) && rawDesigns.some((d) => !isValidDesign(d));

  const validClients = (Array.isArray(rawClients) ? rawClients : []).filter(isValidClient);
  const validAnalyses = (Array.isArray(rawAnalyses) ? rawAnalyses : []).filter(isValidAnalysis);
  const validTests = (Array.isArray(rawTests) ? rawTests : []).filter(isValidTest);
  const validDesigns = (Array.isArray(rawDesigns) ? rawDesigns : []).filter(isValidDesign);

  return {
    isStorageAccessible: isAccessible,
    hasCorruptedClients,
    hasCorruptedAnalyses,
    hasCorruptedTests,
    hasCorruptedDesigns,
    clientsCount: validClients.length,
    analysesCount: validAnalyses.length,
    testsCount: validTests.length,
    designsCount: validDesigns.length,
  };
}

