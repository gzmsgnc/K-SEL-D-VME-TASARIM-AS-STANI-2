import zlib from 'zlib';

/**
 * Standart 8-baytlık PNG dosya imzası (0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n')
 */
export const PNG_MAGIC_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Resmî olarak desteklenen dövme görsel boyutları
 */
export type SupportedImageSize = '1024x1536' | '1024x1024' | '1536x1024';

/**
 * PNG dosyasından okunan IHDR meta verileri
 */
export interface PngIhdrMetadata {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  colorTypeName: string;
  compressionMethod: number;
  filterMethod: number;
  interlaceMethod: number;
  aspectRatio: string;
  orientation: 'vertical' | 'square' | 'horizontal';
  fileSizeBytes: number;
}

/**
 * PNG doğrulama sonuç nesnesi
 */
export interface PngValidationResult {
  valid: boolean;
  metadata?: PngIhdrMetadata;
  error?: string;
  code?: string;
}

/**
 * Standart PNG renk tipi adları
 */
const COLOR_TYPE_NAMES: Record<number, string> = {
  0: 'Grayscale',
  2: 'Truecolor (RGB)',
  3: 'Indexed-color (Palette)',
  4: 'Grayscale with Alpha',
  6: 'Truecolor with Alpha (RGBA)',
};

/**
 * Desteklenen geçerli bit derinlikleri tablosu
 */
const VALID_BIT_DEPTHS_FOR_COLOR_TYPE: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/**
 * Standart IEEE 802.3 CRC32 hesaplama fonksiyonu
 */
export function calculateCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Standart PNG chunk oluşturucu (uzunluk + tür + veri + crc32)
 */
export function createPngChunk(chunkType: string, chunkData: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(chunkData.length, 0);

  const typeBuf = Buffer.from(chunkType, 'ascii');
  const body = Buffer.concat([typeBuf, chunkData]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(calculateCrc32(body), 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

/**
 * Test ve doğrulama amacıyla geçerli, spesifikasyona %100 uygun minimal PNG bufferı üretir.
 */
export function createValidTestPngBuffer(
  width: number,
  height: number,
  colorType = 0,
  bitDepth = 8
): Buffer {
  const sig = Buffer.from(PNG_MAGIC_HEADER);

  // 13-baytlık IHDR veri bloğu
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(0, 10); // Compression method: 0
  ihdrData.writeUInt8(0, 11); // Filter method: 0
  ihdrData.writeUInt8(0, 12); // Interlace method: 0

  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Minimal IDAT: Her satır için 1 filtre baytı (0) + piksel verisi
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const rawScanlineData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  const idatChunk = createPngChunk('IDAT', zlib.deflateSync(rawScanlineData));

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * PNG dosyasını ve IHDR bölümünü bayt düzeyinde ayrıştırır ve teknik özelliklerini doğrular.
 *
 * Denetlenen durumlar:
 * 1. Geçerli 8-baytlık PNG dosya imzası (0x89504E470D0A1A0A)
 * 2. Kesilmiş veya eksik dosya verisi (minimum 33 bayt IHDR gereksinimi)
 * 3. IHDR blok adı ve uzunluğu (tam 13 bayt olmalıdır)
 * 4. Sıfır genişlik veya yükseklik kontrolü
 * 5. Desteklenen bit derinliği ve renk tipi doğrulaması (Grayscale, RGB, RGBA vb.)
 * 6. İstenen çözünürlük ve oran kontrolü (1024x1536 dikey 2:3, 1024x1024 kare 1:1 vb.)
 */
export function parseAndValidatePng(
  buffer: Buffer,
  expectedSize?: SupportedImageSize | string
): PngValidationResult {
  // 1. Buffer Tür Denetimi
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      valid: false,
      code: 'PNG_INVALID_BUFFER',
      error: 'Geçersiz veri biçimi: Buffer nesnesi bekleniyor.',
    };
  }

  // 2. PNG Dosya İmzası (0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n')
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC_HEADER)) {
    return {
      valid: false,
      code: 'PNG_INVALID_SIGNATURE',
      error: 'Bozuk PNG dosya imzası: Dosya geçerli bir PNG başlığı (0x89504E470D0A1A0A) ile başlamıyor.',
    };
  }

  // 3. Kesilmiş veya Eksik PNG Verisi Kontrolü (İmza 8 + IHDR 25 = 33 bayt)
  if (buffer.length < 33) {
    return {
      valid: false,
      code: 'PNG_TRUNCATED_DATA',
      error: `Kesilmiş veya eksik PNG verisi: Dosya boyutu (${buffer.length} bayt) minimum IHDR başlık uzunluğunun altında.`,
    };
  }

  // 4. IHDR Başlık Uzunluğu ve Türü Denetimi
  const ihdrLength = buffer.readUInt32BE(8);
  const chunkType = buffer.subarray(12, 16).toString('ascii');

  if (chunkType !== 'IHDR') {
    return {
      valid: false,
      code: 'PNG_MISSING_IHDR',
      error: `Eksik veya sırasız IHDR başlığı: İlk blok 'IHDR' olmalıdır, '${chunkType}' bulundu.`,
    };
  }

  if (ihdrLength !== 13) {
    return {
      valid: false,
      code: 'PNG_CORRUPTED_IHDR',
      error: `Bozuk IHDR başlığı: Veri bloğu uzunluğu tam 13 bayt olmalıdır, ${ihdrLength} bayt bulundu.`,
    };
  }

  // 5. Boyut Bilgilerini Oku (Genişlik ve Yükseklik)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width === 0 || height === 0) {
    return {
      valid: false,
      code: 'PNG_ZERO_DIMENSION',
      error: `Geçersiz görsel boyutu: Genişlik (${width}) veya yükseklik (${height}) sıfır olamaz.`,
    };
  }

  // 6. Bit Derinliği ve Renk Tipi
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const compressionMethod = buffer.readUInt8(26);
  const filterMethod = buffer.readUInt8(27);
  const interlaceMethod = buffer.readUInt8(28);

  const colorTypeName = COLOR_TYPE_NAMES[colorType];
  if (!colorTypeName) {
    return {
      valid: false,
      code: 'PNG_UNSUPPORTED_COLOR_TYPE',
      error: `Desteklenmeyen PNG renk tipi: ${colorType}. Yalnızca standart 0 (Grayscale), 2 (RGB), 3 (Indexed), 4 (Grayscale+Alpha) veya 6 (RGBA) kabul edilir.`,
    };
  }

  const validDepths = VALID_BIT_DEPTHS_FOR_COLOR_TYPE[colorType] || [];
  if (!validDepths.includes(bitDepth)) {
    return {
      valid: false,
      code: 'PNG_UNSUPPORTED_BIT_DEPTH',
      error: `Desteklenmeyen bit derinliği: ${bitDepth} (renk tipi ${colorTypeName} için geçerli değerler: ${validDepths.join(', ')}).`,
    };
  }

  if (compressionMethod !== 0 || filterMethod !== 0 || (interlaceMethod !== 0 && interlaceMethod !== 1)) {
    return {
      valid: false,
      code: 'PNG_CORRUPTED_IHDR',
      error: 'Bozuk IHDR parametreleri: Standart dışı sıkıştırma, filtre veya geçiş (interlace) yöntemi.',
    };
  }

  // 7. Yönelim ve En-Boy Oranı Tespiti
  let orientation: 'vertical' | 'square' | 'horizontal';
  let aspectRatio: string;

  if (width === height) {
    orientation = 'square';
    aspectRatio = '1:1';
  } else if (width < height) {
    orientation = 'vertical';
    if (width === 1024 && height === 1536) {
      aspectRatio = '2:3';
    } else {
      aspectRatio = `${width}:${height}`;
    }
  } else {
    orientation = 'horizontal';
    if (width === 1536 && height === 1024) {
      aspectRatio = '3:2';
    } else {
      aspectRatio = `${width}:${height}`;
    }
  }

  const metadata: PngIhdrMetadata = {
    width,
    height,
    bitDepth,
    colorType,
    colorTypeName,
    compressionMethod,
    filterMethod,
    interlaceMethod,
    aspectRatio,
    orientation,
    fileSizeBytes: buffer.length,
  };

  // 8. Beklenen Çözünürlük ve Oran Karşılaştırması
  if (expectedSize) {
    if (expectedSize === '1024x1536') {
      if (width !== 1024 || height !== 1536) {
        return {
          valid: false,
          code: 'PNG_UNEXPECTED_RESOLUTION',
          metadata,
          error: `Beklenmeyen görsel çözünürlüğü: Dikey stencil için 1024x1536 (2:3 oran) beklenirken dosya ${width}x${height} (${aspectRatio} ${orientation}) olarak üretildi.`,
        };
      }
    } else if (expectedSize === '1024x1024') {
      if (width !== 1024 || height !== 1024) {
        return {
          valid: false,
          code: 'PNG_UNEXPECTED_RESOLUTION',
          metadata,
          error: `Beklenmeyen görsel çözünürlüğü: Kare profil için 1024x1024 (1:1 oran) beklenirken dosya ${width}x${height} (${aspectRatio} ${orientation}) olarak üretildi.`,
        };
      }
    } else if (expectedSize === '1536x1024') {
      if (width !== 1536 || height !== 1024) {
        return {
          valid: false,
          code: 'PNG_UNEXPECTED_RESOLUTION',
          metadata,
          error: `Beklenmeyen görsel çözünürlüğü: Yatay profil için 1536x1024 (3:2 oran) beklenirken dosya ${width}x${height} (${aspectRatio} ${orientation}) olarak üretildi.`,
        };
      }
    }
  }

  return {
    valid: true,
    metadata,
  };
}
