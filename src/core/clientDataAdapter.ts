/**
 * Danışan Veri Bağdaştırıcısı (Client Data Adapter)
 * 
 * Her modülün seçilmiş danışanın kendi kayıt bilgilerine güvenle ve
 * tutarlı bir biçimde erişmesini sağlar.
 * 
 * Temel ilkeler:
 * 1. Kimlik izolasyonu: Veriler sadece aktif danışanın ID'siyle (`clientId`) ilişkilidir.
 * 2. Sahte sonuç yasağı: Henüz hesaplanmamış modüller için ASLA sahte sonuç üretilmez.
 * 3. Canlı güncelleme: Danışan bilgileri güncellendiğinde tüm modüller en güncel veriyi anında görür.
 */

import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { ModuleId, ModuleExecutionStatus, validateModuleInputs } from './moduleRegistry';
import { resolveEffectiveBirthTime, resolveAstrologicalCoordinates, EffectiveBirthTimeContext, AstrologicalCoordinatesContext } from './birthTimeHelper';

export interface ClientModuleContext {
  clientId: string;
  client: Client;
  fullName: string;
  effectiveBirthTime: EffectiveBirthTimeContext;
  astrologicalCoordinates: AstrologicalCoordinatesContext;
  updatedAt: string;
}

/**
 * Seçili danışan verisini modüllerin ortak kullanacağı zenginleştirilmiş bağlama dönüştürür.
 */
export function getClientModuleContext(client: Client): ClientModuleContext {
  const loc = client.birthLocation;
  const birthTimeCtx = resolveEffectiveBirthTime(
    client.birthTime,
    client.isBirthTimeUnknown,
    loc?.utcOffsetMinutes || 0
  );
  const coordsCtx = resolveAstrologicalCoordinates(loc);

  return {
    clientId: client.id,
    client: { ...client }, // Değiştirilemez kopya
    fullName: `${client.firstName} ${client.lastName}`.trim(),
    effectiveBirthTime: birthTimeCtx,
    astrologicalCoordinates: coordsCtx,
    updatedAt: client.updatedAt,
  };
}

/**
 * Bir modülün bu danışan için gerçekten hesaplanmış bir sonucu olup olmadığını denetler.
 * Kesinlikle sahte veya varsayılan analiz üretmez; sonuç yoksa false döner.
 */
export function hasActualModuleResults(archive: ClientArchiveRecord | null, moduleId: ModuleId): boolean {
  if (!archive || !archive.client) return false;

  const currentClientId = archive.client.id;

  switch (moduleId) {
    case 'ASTROLOGY': {
      const activeAnalysis = archive.analyses.find((a) => a.clientId === currentClientId);
      return Boolean(activeAnalysis?.astrology && activeAnalysis.astrology.planetaryPositions && activeAnalysis.astrology.planetaryPositions.length > 0);
    }
    case 'NUMEROLOGY': {
      const activeAnalysis = archive.analyses.find((a) => a.clientId === currentClientId);
      return Boolean(activeAnalysis?.numerology && typeof activeAnalysis.numerology.lifePathNumber === 'number');
    }
    case 'EBCED': {
      const activeAnalysis = archive.analyses.find((a) => a.clientId === currentClientId);
      return Boolean(activeAnalysis?.ebced && typeof activeAnalysis.ebced.combinedTotal === 'number');
    }
    case 'CHAKRA': {
      const activeAnalysis = archive.analyses.find((a) => a.clientId === currentClientId);
      return Boolean(activeAnalysis?.chakra && activeAnalysis.chakra.chakras && activeAnalysis.chakra.chakras.length > 0);
    }
    case 'ARCHETYPE': {
      const activeAnalysis = archive.analyses.find((a) => a.clientId === currentClientId);
      return Boolean(activeAnalysis?.archetype && activeAnalysis.archetype.unifiedArchetype?.primary);
    }
    case 'TESTS': {
      const clientTests = archive.testResults.filter((t) => t.clientId === currentClientId);
      return clientTests.length > 0;
    }
    case 'SYMBOLS': {
      const clientSymbols = archive.symbolAnalyses.filter((s) => s.clientId === currentClientId);
      return clientSymbols.length > 0 && clientSymbols.some((s) => s.selectedSymbols.length > 0);
    }
    case 'TATTOO_DESIGN': {
      const clientDesigns = archive.designs.filter((d) => d.clientId === currentClientId);
      return clientDesigns.length > 0;
    }
    case 'REPORT': {
      const clientReports = archive.reports.filter((r) => r.clientId === currentClientId);
      return clientReports.length > 0;
    }
    default:
      return false;
  }
}

/**
 * Bir modülün danışan için anlık çalışma durumunu belirler.
 */
export function getModuleExecutionStatus(
  client: Client,
  archive: ClientArchiveRecord | null,
  moduleId: ModuleId
): ModuleExecutionStatus {
  // 1. Önce gerçek sonuç var mı kontrol et
  if (hasActualModuleResults(archive, moduleId)) {
    return 'COMPLETED';
  }

  // 2. Girdiler hazır mı kontrol et
  const inputCheck = validateModuleInputs(client, moduleId);
  if (!inputCheck.isReady) {
    return 'INPUTS_MISSING';
  }

  return 'READY_TO_RUN';
}

/**
 * Güvenli modül veri çıkarıcı.
 * Sonuç henüz üretilmemişse kesinlikle null döner, asla sahte veri uydurmaz.
 */
export function getSafeModuleResult<T = unknown>(
  archive: ClientArchiveRecord | null,
  moduleId: ModuleId
): T | null {
  if (!hasActualModuleResults(archive, moduleId) || !archive) {
    return null;
  }

  const clientId = archive.client.id;
  const analysis = archive.analyses.find((a) => a.clientId === clientId);

  switch (moduleId) {
    case 'ASTROLOGY':
      return (analysis?.astrology as unknown as T) || null;
    case 'NUMEROLOGY':
      return (analysis?.numerology as unknown as T) || null;
    case 'EBCED':
      return (analysis?.ebced as unknown as T) || null;
    case 'CHAKRA':
      return (analysis?.chakra as unknown as T) || null;
    case 'ARCHETYPE':
      return (analysis?.archetype as unknown as T) || null;
    case 'TESTS':
      return (archive.testResults.filter((t) => t.clientId === clientId) as unknown as T) || null;
    case 'SYMBOLS':
      return (archive.symbolAnalyses.filter((s) => s.clientId === clientId) as unknown as T) || null;
    case 'TATTOO_DESIGN':
      return (archive.designs.filter((d) => d.clientId === clientId) as unknown as T) || null;
    case 'REPORT':
      return (archive.reports.filter((r) => r.clientId === clientId) as unknown as T) || null;
    default:
      return null;
  }
}
