import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Proje kökündeki özel yerel görsel depolama kök dizini:
 * 'storage/tattoos' (public klasörü DIŞINDA!)
 */
export const TATTOOS_STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'tattoos');

/**
 * Güvenli Client ID kontrolü
 * Yalnızca alfanümerik, tire ve alt çizgi karakterlerine izin verilir (Path traversal önleme).
 */
export function validateSafeClientId(clientId: string): boolean {
  if (!clientId || typeof clientId !== 'string') return false;
  const clean = clientId.trim();
  if (clean.length === 0 || clean.length > 120) return false;
  return /^[a-zA-Z0-9_-]+$/.test(clean);
}

/**
 * Güvenli File ID kontrolü
 * UUID v4 veya alfanümerik kimlik doğrulaması.
 */
export function validateSafeFileId(fileId: string): boolean {
  if (!fileId || typeof fileId !== 'string') return false;
  const clean = fileId.trim();
  if (clean.length === 0 || clean.length > 120) return false;
  return /^[a-zA-Z0-9_-]+$/.test(clean);
}

/**
 * Danışana özel depolama dizin yolunu hesaplar ve path traversal kontrolü yapar.
 */
export function getClientStorageDir(clientId: string): string {
  if (!validateSafeClientId(clientId)) {
    throw new Error(`Geçersiz veya güvensiz clientId: '${clientId}'. Yalnızca alfanümerik karakterler kabul edilir.`);
  }

  const cleanId = clientId.trim();
  const clientDir = path.resolve(TATTOOS_STORAGE_ROOT, cleanId);

  // path.resolve ve path.relative ile dizin atlatma (path traversal) kontrolü
  const rel = path.relative(TATTOOS_STORAGE_ROOT, clientDir);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.includes('..') || rel !== cleanId) {
    throw new Error('Dizin atlatma (path traversal) teşebbüsü tespit edildi.');
  }

  return clientDir;
}

import {
  parseAndValidatePng,
  PngIhdrMetadata,
  SupportedImageSize,
} from './pngValidator';

/**
 * Üretilen dövme görselini sunucu tarafında oluşturulan benzersiz bir UUID dosya adıyla
 * danışanın özel dizinine kaydeder.
 * Kayıt öncesinde PNG format, IHDR bütünlüğü ve çözünürlük doğrulaması yapılır.
 * Hatalı, bozuk veya beklenmeyen boyuttaki görseller kesinlikle diske yazılmaz!
 */
export async function saveGeneratedTattooImage(
  clientId: string,
  imageBuffer: Buffer,
  extension: 'png' | 'svg' = 'png',
  expectedSize?: SupportedImageSize | string
): Promise<{
  fileId: string;
  fileName: string;
  filePath: string;
  relativeUrl: string;
  metadata?: PngIhdrMetadata;
}> {
  const clientDir = getClientStorageDir(clientId);

  // PNG Dosya Bütünlüğü ve Boyut Doğrulaması (Aşama 5.4.1)
  let metadata: PngIhdrMetadata | undefined;
  if (extension === 'png') {
    const pngValidation = parseAndValidatePng(imageBuffer, expectedSize);
    if (!pngValidation.valid) {
      throw new Error(
        `Kayıt öncesi PNG bütünlük doğrulaması başarısız (${pngValidation.code || 'PNG_ERROR'}): ${pngValidation.error || 'Bozuk dosya.'}`
      );
    }
    metadata = pngValidation.metadata;
  }

  // Dizin mevcut değilse oluştur
  await fs.promises.mkdir(clientDir, { recursive: true });

  // Dosya adı kesinlikle sunucu tarafında rastgele UUID ile üretilir
  const fileId = crypto.randomUUID();
  const fileName = `${fileId}.${extension}`;
  const targetFilePath = path.resolve(clientDir, fileName);

  // Güvenli göreli yol denetimi
  const rel = path.relative(clientDir, targetFilePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel !== fileName) {
    throw new Error('Dosya yolu güvenlik ihlali tespit edildi.');
  }

  await fs.promises.writeFile(targetFilePath, imageBuffer);

  return {
    fileId,
    fileName,
    filePath: targetFilePath,
    relativeUrl: `/api/tattoo-images/${clientId}/${fileId}`,
    metadata,
  };
}

/**
 * Belirtilen danışan ve dosya kimliğine ait görselin fiziksel yolunu doğrular ve döner.
 * Danışanlar arası izolasyon sağlar: Dosya yalnızca talep edilen clientId dizini içinde aranır.
 */
export async function getTattooImageFile(
  clientId: string,
  fileId: string,
  extension: 'png' | 'svg' = 'png'
): Promise<{
  exists: boolean;
  filePath: string;
  sizeBytes?: number;
}> {
  if (!validateSafeClientId(clientId) || !validateSafeFileId(fileId)) {
    return { exists: false, filePath: '' };
  }

  const clientDir = getClientStorageDir(clientId);
  const fileName = `${fileId.trim()}.${extension}`;
  const targetFilePath = path.resolve(clientDir, fileName);

  // Göreli yol kanonik doğrulaması
  const rel = path.relative(clientDir, targetFilePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel !== fileName) {
    return { exists: false, filePath: '' };
  }

  try {
    const stat = await fs.promises.stat(targetFilePath);
    if (!stat.isFile()) {
      return { exists: false, filePath: targetFilePath };
    }
    return { exists: true, filePath: targetFilePath, sizeBytes: stat.size };
  } catch {
    return { exists: false, filePath: targetFilePath };
  }
}
