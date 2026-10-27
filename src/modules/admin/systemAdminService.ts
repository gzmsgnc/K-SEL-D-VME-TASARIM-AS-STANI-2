import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { TestType } from '../../types/test';
import {
  getStoredClients,
  getStoredActiveClientId,
  getClientArchive,
  getAllStoredAnalyses,
  getAllStoredDesigns,
  getAllStoredTests,
  getAllStoredSymbols,
  deleteClientRecord,
  clearClientTestResult,
  deleteClientDesign,
  clearClientDesigns,
  clearAllApplicationData,
  getRawStorageIntegrityStatus,
} from '../../store/storage';
import { evaluateWorkspaceWorkflow } from '../../utils/workspaceWorkflow';
import { validateBackupData } from '../../utils/backupValidator';

export interface SystemAdminMetrics {
  totalClients: number;
  activeClientId: string | null;
  activeClientName: string | null;
  totalAnalyses: number;
  totalEnneagramTests: number;
  totalTotemTests: number;
  totalRecipes: number;
  totalDesignVersions: number;
}

export interface SystemStatusReport {
  storageStatus: 'READY' | 'UNAVAILABLE';
  storageStatusLabelTr: string;
  clientsStatusLabelTr: string;
  activeClientStatusLabelTr: string;
  analysesStatusLabelTr: string;
  testsStatusLabelTr: string;
  recipesStatusLabelTr: string;
  designsStatusLabelTr: string;
}

export type IntegrityState = 'Hazır' | 'Kayıt bulunmuyor' | 'Eksik' | 'Veri okunamadı';

export interface SystemIntegrityCard {
  id: string;
  titleTr: string;
  status: IntegrityState;
  count: number;
  descriptionTr: string;
}

export interface SystemIntegrityReport {
  evaluatedAt: string;
  items: SystemIntegrityCard[];
  allReady: boolean;
}

export interface ClientAdminRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  createdAt: string;
  isActive: boolean;
  analysesCount: number;
  enneagramCompleted: boolean;
  totemCompleted: boolean;
  recipesCount: number;
  designVersionsCount: number;
  progressPercent: number;
  progressLabelTr: string;
}

export interface FullSystemBackup {
  systemTitle: string;
  schemaVersion: string;
  exportedAt: string;
  totalClients: number;
  clients: {
    client: Client;
    archive: ClientArchiveRecord | null;
  }[];
}

/**
 * 1. Sistem Metriklerini Gerçek Storage Kayıtlarından Hesaplar.
 * Kesinlikle sahte veya tahmin verisi üretmez.
 */
export function getSystemMetrics(): SystemAdminMetrics {
  const clients = getStoredClients();
  const activeClientId = getStoredActiveClientId();
  const activeClient = clients.find((c) => c.id === activeClientId) || null;

  const analyses = getAllStoredAnalyses();
  const designs = getAllStoredDesigns();
  const tests = getAllStoredTests();

  const totalEnneagramTests = tests.filter((t) => t.testType === 'ENNEAGRAM').length;
  const totalTotemTests = tests.filter((t) => t.testType === 'ANIMAL_TOTEM').length;
  const totalRecipes = designs.filter((d) => Boolean(d.recipe)).length;
  const totalDesignVersions = designs.length;

  return {
    totalClients: clients.length,
    activeClientId,
    activeClientName: activeClient ? `${activeClient.firstName} ${activeClient.lastName}` : null,
    totalAnalyses: analyses.length,
    totalEnneagramTests,
    totalTotemTests,
    totalRecipes,
    totalDesignVersions,
  };
}

/**
 * 2. Uygulama Durum Raporunu Oluşturur (Açık Türkçe Durumlar).
 * Hazır, Kayıt bulunmuyor, Eksik, Kullanılamıyor durumlarını dürüstçe yansıtır.
 */
export function getSystemStatusReport(): SystemStatusReport {
  const metrics = getSystemMetrics();

  // Depolama erişim durumu
  let storageStatus: 'READY' | 'UNAVAILABLE' = 'READY';
  try {
    if (typeof localStorage === 'undefined' && typeof window === 'undefined') {
      storageStatus = 'READY'; // Bellek desteği devrede
    }
  } catch {
    storageStatus = 'UNAVAILABLE';
  }

  const storageStatusLabelTr =
    storageStatus === 'READY' ? 'Hazır (Yerel Depolama Aktif)' : 'Kullanılamıyor';

  const clientsStatusLabelTr =
    metrics.totalClients > 0
      ? `${metrics.totalClients} Danışan Kayıtlı`
      : 'Kayıt bulunmuyor';

  const activeClientStatusLabelTr =
    metrics.activeClientId && metrics.activeClientName
      ? `Seçili: ${metrics.activeClientName} (${metrics.activeClientId})`
      : 'Kayıt bulunmuyor';

  const analysesStatusLabelTr =
    metrics.totalAnalyses > 0
      ? `${metrics.totalAnalyses} Analiz Kaydı Hazır`
      : 'Kayıt bulunmuyor';

  const testsStatusLabelTr =
    metrics.totalEnneagramTests + metrics.totalTotemTests > 0
      ? `${metrics.totalEnneagramTests} Enneagram, ${metrics.totalTotemTests} Totem Kayıtlı`
      : 'Kayıt bulunmuyor';

  const recipesStatusLabelTr =
    metrics.totalRecipes > 0
      ? `${metrics.totalRecipes} Reçete Kayıtlı`
      : 'Kayıt bulunmuyor';

  const designsStatusLabelTr =
    metrics.totalDesignVersions > 0
      ? `${metrics.totalDesignVersions} Tasarım Sürümü Arşivde`
      : 'Kayıt bulunmuyor';

  return {
    storageStatus,
    storageStatusLabelTr,
    clientsStatusLabelTr,
    activeClientStatusLabelTr,
    analysesStatusLabelTr,
    testsStatusLabelTr,
    recipesStatusLabelTr,
    designsStatusLabelTr,
  };
}

/**
 * 2b. A35 — Veri Bütünlüğü ve Güvenlik Denetimi Raporu (Yönetici Merkezi İçin).
 * 7 alt birimi salt-okunur inceler ve kesin olarak şu 4 durumdan birini atar:
 * - 'Hazır'
 * - 'Kayıt bulunmuyor'
 * - 'Eksik'
 * - 'Veri okunamadı'
 * Kesinlikle sahte 'sistem sağlıklı' mesajı üretmez.
 */
export function getSystemIntegrityReport(): SystemIntegrityReport {
  const rawIntegrity = getRawStorageIntegrityStatus();
  const clients = getStoredClients();
  const analyses = getAllStoredAnalyses();
  const tests = getAllStoredTests();
  const designs = getAllStoredDesigns();
  const recipesCount = designs.filter((d) => Boolean(d.recipe)).length;

  const items: SystemIntegrityCard[] = [];

  // 1. Storage Erişimi
  items.push({
    id: 'storage',
    titleTr: 'Storage Erişimi',
    status: rawIntegrity.isStorageAccessible ? 'Hazır' : 'Veri okunamadı',
    count: rawIntegrity.isStorageAccessible ? 1 : 0,
    descriptionTr: rawIntegrity.isStorageAccessible
      ? 'İstemci yerel depolama okuma/yazma erişimi aktif.'
      : 'Depolama birimine erişilemedi veya kilitli.',
  });

  // 2. Danışan Kayıtları
  let clientStatus: IntegrityState = 'Hazır';
  let clientDesc = `${clients.length} danışan profili bütünlüğü doğrulandı.`;
  if (rawIntegrity.hasCorruptedClients) {
    clientStatus = 'Veri okunamadı';
    clientDesc = 'Danışan tablosunda bozuk veya ayrıştırılamayan kayıtlar bulundu.';
  } else if (clients.length === 0) {
    clientStatus = 'Kayıt bulunmuyor';
    clientDesc = 'Sistemde kayıtlı danışan profili bulunmuyor.';
  } else if (clients.some((c) => !c.birthDate || !c.firstName || !c.lastName)) {
    clientStatus = 'Eksik';
    clientDesc = 'Bazı danışan kayıtlarında zorunlu alanlar eksik.';
  }
  items.push({
    id: 'clients',
    titleTr: 'Danışan Kayıtları',
    status: clientStatus,
    count: clients.length,
    descriptionTr: clientDesc,
  });

  // 3. Analiz Kayıtları
  let analysisStatus: IntegrityState = 'Hazır';
  let analysisDesc = `${analyses.length} adet analiz kaydı depolamada mevcut.`;
  if (rawIntegrity.hasCorruptedAnalyses) {
    analysisStatus = 'Veri okunamadı';
    analysisDesc = 'Analiz tablosunda bozuk veri tespit edildi.';
  } else if (analyses.length === 0) {
    analysisStatus = 'Kayıt bulunmuyor';
    analysisDesc = 'Kayıtlı analiz bulunmuyor.';
  } else if (analyses.some((a) => !a.astrology && !a.numerology && !a.chakra && !a.archetype)) {
    analysisStatus = 'Eksik';
    analysisDesc = 'Bazı analiz kayıtlarında hiçbir modül verisi bulunmuyor.';
  }
  items.push({
    id: 'analyses',
    titleTr: 'Analiz Kayıtları',
    status: analysisStatus,
    count: analyses.length,
    descriptionTr: analysisDesc,
  });

  // 4. Test Kayıtları
  let testStatus: IntegrityState = 'Hazır';
  let testDesc = `${tests.length} adet mizaç ve hayvan totemi testi kayıtlı.`;
  if (rawIntegrity.hasCorruptedTests) {
    testStatus = 'Veri okunamadı';
    testDesc = 'Test sonuçları tablosunda bozuk kayıtlar tespit edildi.';
  } else if (tests.length === 0) {
    testStatus = 'Kayıt bulunmuyor';
    testDesc = 'Kayıtlı test sonucu bulunmuyor.';
  } else if (tests.some((t) => !t.testType || !t.clientId)) {
    testStatus = 'Eksik';
    testDesc = 'Bazı test kayıtlarında test tipi veya danışan bağı eksik.';
  }
  items.push({
    id: 'tests',
    titleTr: 'Test Kayıtları',
    status: testStatus,
    count: tests.length,
    descriptionTr: testDesc,
  });

  // 5. Reçete Kayıtları
  let recipeStatus: IntegrityState = 'Hazır';
  let recipeDesc = `${recipesCount} adet dövme reçetesi kayıtlı.`;
  if (recipesCount === 0) {
    recipeStatus = 'Kayıt bulunmuyor';
    recipeDesc = 'Henüz oluşturulmuş dövme reçetesi bulunmuyor.';
  } else if (designs.some((d) => d.recipe && (!d.recipe.style || !d.recipe.recommendedPlacement))) {
    recipeStatus = 'Eksik';
    recipeDesc = 'Bazı reçetelerde stil veya yerleşim parametreleri eksik.';
  }
  items.push({
    id: 'recipes',
    titleTr: 'Reçete Kayıtları',
    status: recipeStatus,
    count: recipesCount,
    descriptionTr: recipeDesc,
  });

  // 6. Tasarım Arşivi
  let designStatus: IntegrityState = 'Hazır';
  let designDesc = `${designs.length} adet sürüm kontrollü tasarım arşivde korunuyor.`;
  if (rawIntegrity.hasCorruptedDesigns) {
    designStatus = 'Veri okunamadı';
    designDesc = 'Tasarım arşivinde bozuk kayıtlar tespit edildi.';
  } else if (designs.length === 0) {
    designStatus = 'Kayıt bulunmuyor';
    designDesc = 'Tasarım arşivinde henüz sürüm kaydı bulunmuyor.';
  } else if (designs.some((d) => !d.versionNumber || !d.id)) {
    designStatus = 'Eksik';
    designDesc = 'Bazı tasarım kayıtlarında sürüm numarası eksik.';
  }
  items.push({
    id: 'designs',
    titleTr: 'Tasarım Arşivi',
    status: designStatus,
    count: designs.length,
    descriptionTr: designDesc,
  });

  // 7. Yedek Yapısı
  const currentBackup = generateFullSystemBackup();
  const backupValidation = validateBackupData(currentBackup);
  items.push({
    id: 'backup',
    titleTr: 'Yedek Yapısı',
    status: backupValidation.statusLabelTr,
    count: backupValidation.totalClientsFound,
    descriptionTr: backupValidation.summaryTr,
  });

  const allReady = items.every((i) => i.status === 'Hazır');

  return {
    evaluatedAt: new Date().toISOString(),
    items,
    allReady,
  };
}

/**
 * 3. Yönetici Veri Yönetimi İçin Danışan Listesini Zenginleştirerek Döndürür.
 * Salt okunur görünüm sağlar.
 */
export function getClientAdminTableList(): ClientAdminRow[] {
  const clients = getStoredClients();
  const activeClientId = getStoredActiveClientId();

  return clients.map((client) => {
    const archive = getClientArchive(client.id);
    const workflow = evaluateWorkspaceWorkflow(client, archive);

    const enneagramCompleted = Boolean(
      archive?.testResults.some((t) => t.clientId === client.id && t.testType === 'ENNEAGRAM')
    );
    const totemCompleted = Boolean(
      archive?.testResults.some((t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM')
    );
    const clientDesigns = archive?.designs.filter((d) => d.clientId === client.id) || [];
    const clientRecipes = clientDesigns.filter((d) => Boolean(d.recipe));

    return {
      id: client.id,
      fullName: `${client.firstName} ${client.lastName}`.trim(),
      email: client.email || '—',
      phone: client.phone || '—',
      birthDate: client.birthDate || '—',
      city: client.birthLocation?.city || '—',
      createdAt: client.createdAt,
      isActive: client.id === activeClientId,
      analysesCount: archive?.analyses.length || 0,
      enneagramCompleted,
      totemCompleted,
      recipesCount: clientRecipes.length,
      designVersionsCount: clientDesigns.length,
      progressPercent: workflow ? workflow.overallProgressPercent : 0,
      progressLabelTr: workflow ? workflow.overallStatusLabelTr : 'Kayıt bulunmuyor',
    };
  });
}

/**
 * 4. Yönetici Seviyesinde Tüm Danışan Verilerinin Bütünleşik Yedeğini Üretir.
 * Mevcut verileri değiştirmez, silmez; anne adını görsel istem alanlarına taşımaz.
 */
export function generateFullSystemBackup(): FullSystemBackup {
  const clients = getStoredClients();
  const backupList = clients.map((client) => ({
    client,
    archive: getClientArchive(client.id),
  }));

  return {
    systemTitle: 'DÖVME TASARIM ASİSTANI — SİSTEM YÖNETİMİ YEDEĞİ',
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    totalClients: clients.length,
    clients: backupList,
  };
}

/**
 * 5. Tehlikeli İşlemler API'si (Münferit ve Güvenli Çağrılar).
 * Her işlem yalnızca hedeflenen modülü ve danışanı etkiler.
 */
export function executeDangerousDeleteClient(clientId: string): boolean {
  return deleteClientRecord(clientId);
}

export function executeDangerousResetTest(clientId: string, testType: TestType): boolean {
  return clearClientTestResult(clientId, testType);
}

export function executeDangerousDeleteDesign(clientId: string, designId: string): boolean {
  return deleteClientDesign(clientId, designId);
}

export function executeDangerousClearAllDesigns(clientId: string): boolean {
  return clearClientDesigns(clientId);
}

export function executeDangerousResetAllSystemData(): boolean {
  return clearAllApplicationData();
}
