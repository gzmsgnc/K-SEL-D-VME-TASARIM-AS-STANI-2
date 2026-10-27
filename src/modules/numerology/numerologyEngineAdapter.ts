import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { hasActualModuleResults } from '../../core/clientDataAdapter';
import { NumerologyModulePreparation, CalculateNumerologyResult } from './types';
import { calculateNumerologyMatrix } from './numerologyCalculationEngine';

/**
 * Seçili danışanın Numeroloji modülüne yönelik hesaplama hazırlığını ve doğrulamasını üretir.
 */
export function prepareNumerologyModule(
  client: Client,
  archive: ClientArchiveRecord | null
): NumerologyModulePreparation {
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  const birthDate = client.birthDate?.trim() || '';

  const hasValidFullName = fullName.length > 0;
  const hasValidBirthDate = Boolean(birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate));

  const warnings: string[] = [];

  if (!hasValidFullName) {
    warnings.push('Danışanın ad ve soyad bilgisi eksiktir. Kader, Ruh Arzusu ve Kişilik sayıları hesaplanamaz.');
  }

  if (!hasValidBirthDate) {
    warnings.push('Danışanın geçerli bir doğum tarihi (YYYY-MM-DD) eksiktir. Yaşam Yolu sayısı hesaplanamaz.');
  }

  // 1. Zaten hesaplanmış mı kontrol et
  const isCompleted = hasActualModuleResults(archive, 'NUMEROLOGY');
  if (isCompleted) {
    return {
      clientId: client.id,
      status: 'COMPLETED',
      fullName,
      birthDate,
      hasValidFullName,
      hasValidBirthDate,
      statusMessageTr: 'Numeroloji analizi başarıyla hesaplanmış ve danışan arşivine kaydedilmiştir.',
      warningNotices: warnings,
    };
  }

  // 2. Girdiler hazır mı?
  if (hasValidFullName && hasValidBirthDate) {
    return {
      clientId: client.id,
      status: 'READY_TO_RUN',
      fullName,
      birthDate,
      hasValidFullName: true,
      hasValidBirthDate: true,
      statusMessageTr: 'Ad-soyad ve doğum tarihi hazır. Numeroloji matrisi hesaplanabilir.',
      warningNotices: [],
    };
  }

  // 3. Eksik girdi
  return {
    clientId: client.id,
    status: 'INPUTS_MISSING',
    fullName,
    birthDate,
    hasValidFullName,
    hasValidBirthDate,
    statusMessageTr: 'Numeroloji analizi için ad-soyad ve doğum tarihi eksiksiz girilmelidir.',
    warningNotices: warnings,
  };
}

/**
 * Seçili danışan için numeroloji matrisini (Yaşam Yolu, Kader, Ruh Arzusu, Kişilik, Dünya Misyonu) hesaplar.
 * Sonuç asla sahte uydurulmaz; girdi eksikse açık hata döndürülür.
 */
export function calculateClientNumerology(
  client: Client
): CalculateNumerologyResult {
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  const birthDate = client.birthDate?.trim() || '';

  if (!fullName) {
    return {
      success: false,
      errorMessageTr: 'Danışanın ad ve soyad bilgisi eksik olduğundan numeroloji analizi yapılamaz.',
      warningNotices: ['Ad ve soyad alanı boş olamaz.'],
    };
  }

  if (!birthDate) {
    return {
      success: false,
      errorMessageTr: 'Danışanın doğum tarihi bilgisi eksik olduğundan numeroloji analizi yapılamaz.',
      warningNotices: ['Doğum tarihi alanı boş olamaz.'],
    };
  }

  try {
    const numerology = calculateNumerologyMatrix(fullName, birthDate);
    return {
      success: true,
      numerology,
      warningNotices: [],
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessageTr: `Numeroloji hesaplama hatası: ${err?.message || 'Bilinmeyen hata'}`,
      warningNotices: [err?.message || 'Hesaplama motoru hatası'],
    };
  }
}
