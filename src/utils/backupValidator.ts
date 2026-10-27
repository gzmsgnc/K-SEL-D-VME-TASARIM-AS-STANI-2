import { FullSystemBackup } from '../modules/admin/systemAdminService';

export type IntegrityStatus = 'READY' | 'EMPTY' | 'MISSING' | 'CORRUPTED';

export interface IntegrityStatusItem {
  key: string;
  nameTr: string;
  status: IntegrityStatus;
  statusLabelTr: 'Hazır' | 'Kayıt bulunmuyor' | 'Eksik' | 'Veri okunamadı';
  detailTr: string;
}

export interface BackupValidationResult {
  isValid: boolean;
  status: IntegrityStatus;
  statusLabelTr: 'Hazır' | 'Kayıt bulunmuyor' | 'Eksik' | 'Veri okunamadı';
  summaryTr: string;
  totalClientsFound: number;
  totalAnalysesFound: number;
  totalDesignsFound: number;
  totalTestsFound: number;
  detailsTr: string[];
  errorsTr: string[];
}

/**
 * Bir yedek nesnesinin veya JSON metninin salt-okunur doğrulamasını yapar.
 * Kesinlikle storage'a yazmaz, mevcut veriyi değiştirmez, geri yükleme yapmaz.
 */
export function validateBackupData(data: unknown): BackupValidationResult {
  const detailsTr: string[] = [];
  const errorsTr: string[] = [];

  // 1. JSON metni verilmişse güvenle parse et
  let parsed: any = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return {
        isValid: false,
        status: 'CORRUPTED',
        statusLabelTr: 'Veri okunamadı',
        summaryTr: 'Yedek verisi geçerli bir JSON formatında değil.',
        totalClientsFound: 0,
        totalAnalysesFound: 0,
        totalDesignsFound: 0,
        totalTestsFound: 0,
        detailsTr: ['JSON ayrıştırma hatası oluştu.'],
        errorsTr: ['JSON yapısı bozuk veya ayrıştırılamıyor.'],
      };
    }
  }

  // 2. Temel nesne kontrolü
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      status: 'CORRUPTED',
      statusLabelTr: 'Veri okunamadı',
      summaryTr: 'Yedek kök nesnesi geçersiz.',
      totalClientsFound: 0,
      totalAnalysesFound: 0,
      totalDesignsFound: 0,
      totalTestsFound: 0,
      detailsTr: ['Kök nesne geçersiz.'],
      errorsTr: ['Yedek verisi bir nesne olmalıdır.'],
    };
  }

  // 3. Başlık ve versiyon alanları
  const hasTitle = typeof parsed.systemTitle === 'string' && parsed.systemTitle.trim().length > 0;
  const hasVersion = typeof parsed.schemaVersion === 'string' && parsed.schemaVersion.trim().length > 0;
  const hasExportedAt = typeof parsed.exportedAt === 'string' && !isNaN(Date.parse(parsed.exportedAt));

  if (!hasTitle || !hasVersion || !hasExportedAt) {
    errorsTr.push('Yedek üstbilgileri (systemTitle, schemaVersion veya exportedAt) eksik ya da bozuk.');
  } else {
    detailsTr.push(`Yedek şema sürümü: ${parsed.schemaVersion}, Dışa aktarma tarihi: ${parsed.exportedAt}`);
  }

  // 4. Danışanlar listesi kontrolü
  if (!Array.isArray(parsed.clients)) {
    return {
      isValid: false,
      status: 'CORRUPTED',
      statusLabelTr: 'Veri okunamadı',
      summaryTr: 'Danışanlar listesi dizi formatında değil.',
      totalClientsFound: 0,
      totalAnalysesFound: 0,
      totalDesignsFound: 0,
      totalTestsFound: 0,
      detailsTr,
      errorsTr: [...errorsTr, 'clients alanı bir dizi olmalıdır.'],
    };
  }

  const clientsArray = parsed.clients;
  if (clientsArray.length === 0) {
    return {
      isValid: true,
      status: 'EMPTY',
      statusLabelTr: 'Kayıt bulunmuyor',
      summaryTr: 'Yedek geçerli ancak içinde kayıtlı danışan bulunmuyor.',
      totalClientsFound: 0,
      totalAnalysesFound: 0,
      totalDesignsFound: 0,
      totalTestsFound: 0,
      detailsTr: [...detailsTr, 'Sistemde kayıtlı danışan bulunmuyor (boş yedek).'],
      errorsTr: [],
    };
  }

  let totalAnalysesCount = 0;
  let totalDesignsCount = 0;
  let totalTestsCount = 0;
  let hasMissingRequiredFields = false;
  let hasCrossContamination = false;

  for (let i = 0; i < clientsArray.length; i++) {
    const entry = clientsArray[i];
    if (!entry || typeof entry !== 'object') {
      errorsTr.push(`${i + 1}. danışan girdisi bozuk veya nesne değil.`);
      hasMissingRequiredFields = true;
      continue;
    }

    const client = entry.client;
    if (!client || typeof client !== 'object' || typeof client.id !== 'string' || !client.id.trim()) {
      errorsTr.push(`${i + 1}. danışanın temel kimlik bilgisi (id) eksik.`);
      hasMissingRequiredFields = true;
      continue;
    }

    const clientId = client.id;
    const archive = entry.archive;

    if (archive && typeof archive === 'object') {
      // Arşiv client.id doğrulaması
      if (archive.client && archive.client.id !== clientId) {
        errorsTr.push(`Danışan (${clientId}) arşivinde kimlik uyuşmazlığı tespit edildi (${archive.client.id}).`);
        hasCrossContamination = true;
      }

      // Analizler
      if (Array.isArray(archive.analyses)) {
        totalAnalysesCount += archive.analyses.length;
        for (const a of archive.analyses) {
          if (!a || a.clientId !== clientId) {
            errorsTr.push(`Danışan (${clientId}) arşivinde başka danışana ait analiz bulundu.`);
            hasCrossContamination = true;
          }
        }
      }

      // Testler
      if (Array.isArray(archive.testResults)) {
        totalTestsCount += archive.testResults.length;
        for (const t of archive.testResults) {
          if (!t || t.clientId !== clientId) {
            errorsTr.push(`Danışan (${clientId}) arşivinde başka danışana ait test sonucu bulundu.`);
            hasCrossContamination = true;
          }
        }
      }

      // Tasarımlar
      if (Array.isArray(archive.designs)) {
        totalDesignsCount += archive.designs.length;
        for (const d of archive.designs) {
          if (!d || d.clientId !== clientId) {
            errorsTr.push(`Danışan (${clientId}) arşivinde başka danışana ait dövme tasarımı bulundu.`);
            hasCrossContamination = true;
          }
        }
      }
    }
  }

  const isValid = errorsTr.length === 0;
  let status: IntegrityStatus = 'READY';
  let statusLabelTr: 'Hazır' | 'Kayıt bulunmuyor' | 'Eksik' | 'Veri okunamadı' = 'Hazır';

  if (hasCrossContamination) {
    status = 'CORRUPTED';
    statusLabelTr = 'Veri okunamadı';
  } else if (hasMissingRequiredFields || errorsTr.length > 0) {
    status = 'MISSING';
    statusLabelTr = 'Eksik';
  } else {
    status = 'READY';
    statusLabelTr = 'Hazır';
  }

  detailsTr.push(
    `${clientsArray.length} danışan, ${totalAnalysesCount} analiz, ${totalTestsCount} test, ${totalDesignsCount} tasarım kaydı incelendi.`
  );

  const summaryTr = isValid
    ? `Yedek yapısı geçerli ve bütünlüğü doğrulanmıştır (${clientsArray.length} Danışan).`
    : `Yedek yapısında ${errorsTr.length} adet tutarsızlık veya eksiklik tespit edildi.`;

  return {
    isValid,
    status,
    statusLabelTr,
    summaryTr,
    totalClientsFound: clientsArray.length,
    totalAnalysesFound: totalAnalysesCount,
    totalDesignsFound: totalDesignsCount,
    totalTestsFound: totalTestsCount,
    detailsTr,
    errorsTr,
  };
}
