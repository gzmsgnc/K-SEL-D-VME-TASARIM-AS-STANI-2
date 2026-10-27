import { Client, ClientFormData } from '../types/client';
import { ClientAnalysisRecord, NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../types/analysis';
import { ClientTestResult, TestType } from '../types/test';
import { ClientSymbolAnalysis } from '../types/symbol';
import { ClientTattooDesign } from '../types/design';
import { ClientTattooReport } from '../types/report';
import { ClientArchiveRecord } from '../types/archive';
import { TropicalNatalChart } from '../types/astrology';
import { generateId } from '../utils/id';
import { calculateChakraAnalysisFromNumerology } from '../modules/chakra';

export const STORAGE_KEYS = {
  CLIENTS: 'dovme_asistani_clients_v1',
  ANALYSES: 'dovme_asistani_analyses_v1',
  TESTS: 'dovme_asistani_tests_v1',
  SYMBOLS: 'dovme_asistani_symbols_v1',
  DESIGNS: 'dovme_asistani_designs_v1',
  REPORTS: 'dovme_asistani_reports_v1',
  ACTIVE_CLIENT: 'dovme_asistani_active_client_v1',
};

// Demo kayıtlarını tespit etmek için bilinen ID ve e-postalar
const KNOWN_DEMO_IDS = new Set(['demo_client_1', 'demo_client_2']);
const KNOWN_DEMO_EMAILS = new Set(['deniz.yildiz@example.com', 'efe.kaya@example.com']);

function isDemoRecord(client: Client): boolean {
  if (!client || !client.id) return false;
  return (
    KNOWN_DEMO_IDS.has(client.id) ||
    client.id.startsWith('demo_') ||
    KNOWN_DEMO_EMAILS.has(client.email)
  );
}

const memoryFallbackStore = new Map<string, string>();

/**
 * Güvenli Storage Okuyucu:
 * Bozuk JSON, geçersiz tipler veya beklenmeyen değerler durumunda uygulamanın çökmesini engeller.
 * defaultValue dizi ise, okunan değerin mutlaka dizi olduğunu garanti eder.
 */
export function getSafeStorage<T>(key: string, defaultValue: T): T {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(key);
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

export function setSafeStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    } else {
      memoryFallbackStore.set(key, serialized);
    }
  } catch (e) {
    console.error('Storage save error:', e);
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

/**
 * Tarayıcı hafızasında kalmış olabilecek eski demo ve sahte verileri güvenle temizler.
 * Gerçek kullanıcı kayıtlarına (client_* kimlikli) asla dokunmaz.
 */
function purgeDemoDataIfPresent(): void {
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
  setSafeStorage(STORAGE_KEYS.CLIENTS, updated);
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
  const clientDesigns = (Array.isArray(allDesigns) ? allDesigns : []).filter(
    (d) => isValidDesign(d) && d.clientId === clientId
  );
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

  const clients = getStoredClients();
  const updatedClients = clients.filter((c) => c.id !== clientId);
  setSafeStorage(STORAGE_KEYS.CLIENTS, updatedClients);

  // İlişkisel kayıtları da sadece bu clientId için temizle
  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  setSafeStorage(
    STORAGE_KEYS.ANALYSES,
    allAnalyses.filter((a) => a.clientId !== clientId)
  );

  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  setSafeStorage(
    STORAGE_KEYS.TESTS,
    allTests.filter((t) => t.clientId !== clientId)
  );

  const allSymbols = getSafeStorage<ClientSymbolAnalysis[]>(STORAGE_KEYS.SYMBOLS, []);
  setSafeStorage(
    STORAGE_KEYS.SYMBOLS,
    allSymbols.filter((s) => s.clientId !== clientId)
  );

  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  setSafeStorage(
    STORAGE_KEYS.DESIGNS,
    allDesigns.filter((d) => d.clientId !== clientId)
  );

  const allReports = getSafeStorage<ClientTattooReport[]>(STORAGE_KEYS.REPORTS, []);
  setSafeStorage(
    STORAGE_KEYS.REPORTS,
    allReports.filter((r) => r.clientId !== clientId)
  );

  return true;
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

  const clientToSave: Client = {
    ...updatedClient,
    updatedAt: new Date().toISOString(),
  };

  const newClients = [...clients];
  newClients[index] = clientToSave;
  setSafeStorage(STORAGE_KEYS.CLIENTS, newClients);
  return clientToSave;
}

/**
 * Bir danışana ait Batı / Tropical astroloji hesaplama sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
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
    savedRecord = {
      ...existing,
      updatedAt: now,
      astrology: chart,
    };
    validAnalyses[existingIndex] = savedRecord;
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
  }

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return savedRecord;
}

/**
 * Bir danışana ait astroloji analiz sonucunu temizler.
 */
export function clearClientAstrologyChart(clientId: string): boolean {
  if (!clientId) return false;

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index === -1) return false;

  const existing = validAnalyses[index];
  const { astrology, ...rest } = existing;
  validAnalyses[index] = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return true;
}

/**
 * Bir danışana ait Numeroloji analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
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
    savedRecord = {
      ...existing,
      updatedAt: now,
      numerology,
    };
    validAnalyses[existingIndex] = savedRecord;
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
  }

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return savedRecord;
}

/**
 * Bir danışana ait numeroloji analiz sonucunu temizler.
 */
export function clearClientNumerology(clientId: string): boolean {
  if (!clientId) return false;

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index === -1) return false;

  const existing = validAnalyses[index];
  const { numerology, ...rest } = existing;
  validAnalyses[index] = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return true;
}

/**
 * Bir danışana ait Çakra analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
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
    savedRecord = {
      ...existing,
      updatedAt: now,
      chakra,
    };
    validAnalyses[existingIndex] = savedRecord;
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
  }

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return savedRecord;
}

/**
 * Bir danışana ait çakra analiz sonucunu temizler.
 */
export function clearClientChakra(clientId: string): boolean {
  if (!clientId) return false;

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index === -1) return false;

  const existing = validAnalyses[index];
  const { chakra, ...rest } = existing;
  validAnalyses[index] = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return true;
}

/**
 * Bir danışana ait Birleşik ve Gölge Arketip analiz sonucunu arşive güvenle kaydeder.
 * Yalnızca belirtilen clientId ile ilişkili analiz kaydına işler.
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
    savedRecord = {
      ...existing,
      updatedAt: now,
      archetype,
    };
    validAnalyses[existingIndex] = savedRecord;
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
  }

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return savedRecord;
}

/**
 * Bir danışana ait arketip analiz sonucunu temizler.
 */
export function clearClientArchetype(clientId: string): boolean {
  if (!clientId) return false;

  const allAnalyses = getSafeStorage<ClientAnalysisRecord[]>(STORAGE_KEYS.ANALYSES, []);
  const validAnalyses = Array.isArray(allAnalyses) ? allAnalyses.filter(isValidAnalysis) : [];
  const index = validAnalyses.findIndex((a) => a.clientId === clientId);
  if (index === -1) return false;

  const existing = validAnalyses[index];
  const { archetype, ...rest } = existing;
  validAnalyses[index] = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };

  setSafeStorage(STORAGE_KEYS.ANALYSES, validAnalyses);
  return true;
}

/**
 * Bir danışana ait dövme tasarımı/reçetesini güvenle kaydeder.
 * Yeni versiyon eklendiğinde önceki versiyonları korur (arşiv yapısı).
 * Başka bir danışanın tasarımı üzerine yazılmasını ve ID çakışmalarını engeller.
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
    updatedAt: new Date().toISOString(),
  };

  const index = validDesigns.findIndex((d) => d.id === designToSave.id && d.clientId === clientId);

  if (index >= 0) {
    validDesigns[index] = designToSave;
  } else {
    validDesigns.push(designToSave);
  }

  setSafeStorage(STORAGE_KEYS.DESIGNS, validDesigns);
  return designToSave;
}

/**
 * Bir danışana ait tüm dövme tasarımlarını getirir.
 */
export function getClientDesigns(clientId: string): ClientTattooDesign[] {
  if (!clientId) return [];
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  return (Array.isArray(allDesigns) ? allDesigns : []).filter(
    (d) => isValidDesign(d) && d.clientId === clientId
  );
}

/**
 * Bir danışana ait belirli bir dövme tasarımını siler.
 */
export function deleteClientDesign(clientId: string, designId: string): boolean {
  if (!clientId || !designId) return false;
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];
  const filtered = validDesigns.filter((d) => !(d.clientId === clientId && d.id === designId));
  if (filtered.length !== validDesigns.length) {
    setSafeStorage(STORAGE_KEYS.DESIGNS, filtered);
    return true;
  }
  return false;
}

/**
 * Bir danışana ait TÜM dövme tasarımlarını temizler (sıfırlar).
 * Kural 15: Danışanın astroloji, numeroloji, çakra veya arketip sonuçlarını KESİNLİKLE silmez.
 */
export function clearClientDesigns(clientId: string): boolean {
  if (!clientId) return false;
  const allDesigns = getSafeStorage<ClientTattooDesign[]>(STORAGE_KEYS.DESIGNS, []);
  const validDesigns = Array.isArray(allDesigns) ? allDesigns.filter(isValidDesign) : [];
  const filtered = validDesigns.filter((d) => d.clientId !== clientId);
  setSafeStorage(STORAGE_KEYS.DESIGNS, filtered);
  return true;
}

/**
 * Bir danışana ait sembol analizi ve kompozisyonunu güvenle kaydeder.
 * Yeni versiyon eklendiğinde önceki versiyonları korur.
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
  };

  const index = validSymbols.findIndex((s) => s.id === analysisToSave.id && s.clientId === clientId);

  if (index >= 0) {
    validSymbols[index] = analysisToSave;
  } else {
    validSymbols.push(analysisToSave);
  }

  setSafeStorage(STORAGE_KEYS.SYMBOLS, validSymbols);
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
  setSafeStorage(STORAGE_KEYS.SYMBOLS, filtered);
  return true;
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

  setSafeStorage(STORAGE_KEYS.TESTS, validTests);
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
 */
export function clearClientTestResult(clientId: string, testType?: TestType): boolean {
  if (!clientId) return false;
  const allTests = getSafeStorage<ClientTestResult[]>(STORAGE_KEYS.TESTS, []);
  const validTests = Array.isArray(allTests) ? allTests.filter(isValidTest) : [];
  const filtered = validTests.filter((t) => {
    if (t.clientId !== clientId) return true;
    if (testType) {
      return t.testType !== testType;
    }
    return false;
  });
  setSafeStorage(STORAGE_KEYS.TESTS, filtered);
  return true;
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
  setSafeStorage(STORAGE_KEYS.CLIENTS, []);
  setSafeStorage(STORAGE_KEYS.ANALYSES, []);
  setSafeStorage(STORAGE_KEYS.TESTS, []);
  setSafeStorage(STORAGE_KEYS.SYMBOLS, []);
  setSafeStorage(STORAGE_KEYS.DESIGNS, []);
  setSafeStorage(STORAGE_KEYS.REPORTS, []);
  setSafeStorage(STORAGE_KEYS.ACTIVE_CLIENT, null);
  return true;
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

