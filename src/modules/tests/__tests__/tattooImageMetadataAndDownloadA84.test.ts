import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  generateSafeTattooDownloadFileName,
  formatByteSize,
  getOrientationLabelTr,
  calculateHypotheticalPrintSize,
  slugifyText,
} from '../../../utils/tattooImageFileName';
import {
  saveGeneratedTattooImage,
  getClientStorageDir,
  getTattooImageFile,
} from '../../../server/tattooImageStorage';
import { createValidTestPngBuffer } from '../../../server/pngValidator';
import { tattooImageRouter } from '../../../server/tattooImageRouter';
import { setMockImageGenerator, OpenAiApiError } from '../../../server/openaiImageService';
import { TattooImageDimensions, ClientTattooDesign } from '../../../types/design';

describe('AŞAMA 5.4.2 — İstemci Arayüzünde Görsel Çözünürlük, Oran ve Bütünlük Metaverisi Testleri', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const TEST_CLIENT_ID = 'test-client-a84-meta';
  const OTHER_CLIENT_ID = 'test-client-other-999';

  beforeEach(() => {
    setMockImageGenerator(null);
    process.env.OPENAI_API_KEY = 'sk-proj-test-mock-key';

    const dirA = getClientStorageDir(TEST_CLIENT_ID);
    if (fs.existsSync(dirA)) fs.rmSync(dirA, { recursive: true, force: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    setMockImageGenerator(null);

    const dirA = getClientStorageDir(TEST_CLIENT_ID);
    if (fs.existsSync(dirA)) fs.rmSync(dirA, { recursive: true, force: true });
  });

  describe('1. Güvenli Dosya Adı Oluşturma ve Sıfır PII Doğrulaması', () => {
    test('İndirilen dosya adında danışanın adı, soyadı veya anne adı KESİNLİKLE yer almamalıdır', () => {
      const client = {
        id: 'client-uuid-1234',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        motherName: 'Fatma',
      };

      const fileName = generateSafeTattooDownloadFileName({
        clientId: client.id,
        conceptOrSymbol: 'Kutsal Geometri & Metatron',
        date: '2026-11-12T10:00:00Z',
      });

      // İsim, soyisim ve anne adı sızıntısı olmamalı
      assert.strictEqual(fileName.toLowerCase().includes('ayse'), false);
      assert.strictEqual(fileName.toLowerCase().includes('yilmaz'), false);
      assert.strictEqual(fileName.toLowerCase().includes('fatma'), false);

      // Güvenli clientId, temiz slug ve tarih içermeli
      assert.ok(fileName.includes('client-uuid-1234'));
      assert.ok(fileName.includes('kutsal-geometri'));
      assert.ok(fileName.includes('20261112'));
      assert.ok(fileName.endsWith('.png'));
    });

    test('Path traversal karakterleri (../, /) içeren clientId güvenli biçimde temizlenmelidir', () => {
      const maliciousId = '../../etc/passwd';
      const fileName = generateSafeTattooDownloadFileName({
        clientId: maliciousId,
        conceptOrSymbol: 'Wolf',
      });

      assert.strictEqual(fileName.includes('..'), false);
      assert.strictEqual(fileName.includes('/'), false);
      assert.ok(fileName.startsWith('dovme-sablonu_'));
      assert.ok(fileName.endsWith('.png'));
    });

    test('Türkçe karakterler ve boşluklar slugify ile standart dosya formatına dönüştürülmelidir', () => {
      const slug = slugifyText('Yaşam Çiçeği & Işık Şebekesi!');
      assert.strictEqual(slug, 'yasam-cicegi-isik-sebekesi');
    });
  });

  describe('2. Metadata Varlığı ve Eksikliği Durumları', () => {
    test('Metadata mevcutken teknik alanlar eksiksiz ve doğru değerleri taşır', () => {
      const dims: TattooImageDimensions = {
        width: 1024,
        height: 1536,
        aspectRatio: '2:3',
        orientation: 'vertical',
        bitDepth: 8,
        colorType: 'Truecolor (RGB)',
        fileSizeBytes: 1572864, // 1.5 MB
        format: 'PNG',
        verified: true,
      };

      assert.strictEqual(dims.width, 1024);
      assert.strictEqual(dims.height, 1536);
      assert.strictEqual(dims.aspectRatio, '2:3');
      assert.strictEqual(getOrientationLabelTr(dims.orientation), 'Dikey (Portrait)');
      assert.strictEqual(formatByteSize(dims.fileSizeBytes), '1.50 MB');
      assert.strictEqual(dims.verified, true);
    });

    test('Metadata eksik olduğunda sahte veya uydurma değer üretilmez', () => {
      const emptySize = formatByteSize(undefined);
      assert.strictEqual(emptySize, '—', 'Eksik boyut için tire dönmelidir.');

      const nullSize = formatByteSize(null as any);
      assert.strictEqual(nullSize, '—');

      const zeroSize = formatByteSize(0);
      assert.strictEqual(zeroSize, '—');

      const unknownOrientation = getOrientationLabelTr(undefined);
      assert.strictEqual(unknownOrientation, 'Belirtilmedi');
    });

    test('Eski metadata içermeyen kayıtlar arayüz veri modelini bozmaz', () => {
      // imageDimensions alanı olmayan eski tasarım nesnesi
      const legacyDesign: ClientTattooDesign = {
        id: 'design-legacy-1',
        clientId: TEST_CLIENT_ID,
        versionNumber: 1,
        title: 'Eski Tasarım',
        conceptStatement: 'Açıklama',
        recipe: {} as any,
        aiPrompt: {} as any,
        imageUrl: `/api/tattoo-images/${TEST_CLIENT_ID}/legacy-file`,
        imageFileId: 'legacy-file',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      assert.strictEqual(legacyDesign.imageDimensions, undefined);
      assert.ok(legacyDesign.imageUrl);
      assert.ok(legacyDesign.imageFileId);
    });
  });

  describe('3. Dikey ve Kare Görsellerin Oranları', () => {
    test('1024x1536 dikey şablon 2:3 oranı ve dikey yönelim olarak tanımlanır', () => {
      const dims: TattooImageDimensions = {
        width: 1024,
        height: 1536,
        aspectRatio: '2:3',
        orientation: 'vertical',
        bitDepth: 8,
        colorType: 'Truecolor with Alpha (RGBA)',
        fileSizeBytes: 2097152,
        format: 'PNG',
        verified: true,
      };

      assert.strictEqual(dims.aspectRatio, '2:3');
      assert.strictEqual(dims.orientation, 'vertical');
      assert.strictEqual(getOrientationLabelTr(dims.orientation), 'Dikey (Portrait)');
    });

    test('1024x1024 kare şablon 1:1 oranı ve kare yönelim olarak tanımlanır', () => {
      const dims: TattooImageDimensions = {
        width: 1024,
        height: 1024,
        aspectRatio: '1:1',
        orientation: 'square',
        bitDepth: 8,
        colorType: 'Grayscale',
        fileSizeBytes: 524288,
        format: 'PNG',
        verified: true,
      };

      assert.strictEqual(dims.aspectRatio, '1:1');
      assert.strictEqual(dims.orientation, 'square');
      assert.strictEqual(getOrientationLabelTr(dims.orientation), 'Kare (Square)');
    });
  });

  describe('4. DPI ve Varsayımsal Baskı Ölçeği Hesaplaması', () => {
    test('DPI hesaplaması teorik olarak işaretlenmeli ve açık sorumluluk reddi metni içermelidir', () => {
      const result = calculateHypotheticalPrintSize(1024, 1536, 300);

      assert.strictEqual(result.isTheoretical, true);
      assert.strictEqual(result.assumedDpi, 300);
      // 1024 / 300 * 2.54 = ~8.7 cm
      assert.strictEqual(result.widthCm, 8.7);
      // 1536 / 300 * 2.54 = ~13.0 cm
      assert.strictEqual(result.heightCm, 13.0);
      assert.strictEqual(result.formatted, '~8.7 × 13 cm');

      // Gerçek dosya DPI'ı iddiası taşımamalı, açık feragatname içermeli
      assert.ok(result.disclaimerTr.includes('teorik referans'));
      assert.ok(result.disclaimerTr.includes('gömülü fiziksel DPI etiketi bulunmamaktadır'));
      assert.ok(result.disclaimerTr.includes('Dövme sanatçısı'));
    });

    test('1024x1024 kare şablon için 300 DPI baskı ölçüsü ~8.7 × 8.7 cm olmalıdır', () => {
      const result = calculateHypotheticalPrintSize(1024, 1024, 300);
      assert.strictEqual(result.widthCm, 8.7);
      assert.strictEqual(result.heightCm, 8.7);
      assert.strictEqual(result.formatted, '~8.7 × 8.7 cm');
    });
  });

  describe('5. İndirilen PNG Orijinal Dosya Bütünlüğü ve Boyut Başlığı', () => {
    test('Sunucu GET endpointi dosyayı sıkıştırmadan orijinal bayt boyutuyla ve Content-Length başlığıyla sunmalıdır', async () => {
      const originalPng = createValidTestPngBuffer(1024, 1536);
      const saved = await saveGeneratedTattooImage(TEST_CLIENT_ID, originalPng, 'png', '1024x1536');

      let capturedHeaders: Record<string, string> = {};
      let streamData = Buffer.alloc(0);

      const req: any = {
        method: 'GET',
        url: `/tattoo-images/${TEST_CLIENT_ID}/${saved.fileId}`,
        params: { clientId: TEST_CLIENT_ID, fileId: saved.fileId },
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      };

      await new Promise<void>((resolve, reject) => {
        const res: any = {
          setHeader(name: string, value: string) {
            capturedHeaders[name] = value;
            return this;
          },
          status(_code: number) {
            return this;
          },
          json(data: any) {
            reject(new Error(JSON.stringify(data)));
            return this;
          },
          // pipe stream
          write(chunk: any) {
            streamData = Buffer.concat([streamData, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
          },
          end() {
            resolve();
          },
          emit(_event: string) {},
          on(_event: string, _fn: any) {
            return this;
          },
          once(_event: string, _fn: any) {
            return this;
          },
        };

        tattooImageRouter(req, res, () => resolve());
      });

      assert.strictEqual(capturedHeaders['Content-Type'], 'image/png');
      assert.strictEqual(capturedHeaders['Content-Length'], String(originalPng.length));
      assert.strictEqual(streamData.length, originalPng.length);
      assert.deepStrictEqual(streamData, originalPng, 'İndirilen veri orijinal PNG bufferı ile birebir aynı olmalıdır.');
    });
  });

  describe('6. Danışanlar Arası Dosya İzolasyonu', () => {
    test('Danışan A ya ait görsel Danışan B kimliğiyle kesinlikle indirilemez (404)', async () => {
      const pngBuffer = createValidTestPngBuffer(1024, 1536);
      const saved = await saveGeneratedTattooImage(TEST_CLIENT_ID, pngBuffer, 'png', '1024x1536');

      const lookupOther = await getTattooImageFile(OTHER_CLIENT_ID, saved.fileId, 'png');
      assert.strictEqual(lookupOther.exists, false);

      const lookupSelf = await getTattooImageFile(TEST_CLIENT_ID, saved.fileId, 'png');
      assert.strictEqual(lookupSelf.exists, true);
    });
  });

  describe('7. Sunucu Yanıtında Doğrulanmış Dimensions Alanı', () => {
    test('POST /api/generate-tattoo-image yanıtında dimensions nesnesi eksiksiz dönmelidir', async () => {
      const validPng = createValidTestPngBuffer(1024, 1536, 6, 8);
      setMockImageGenerator(async () => validPng);

      let capturedJson: any = null;
      let capturedStatus = 0;

      const req: any = {
        method: 'POST',
        url: '/generate-tattoo-image',
        headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
        body: {
          clientId: TEST_CLIENT_ID,
          prompt: 'Fine line sacred geometry mandala tattoo stencil',
          recipe: {
            style: 'SACRED_GEOMETRY',
            placementArea: 'FOREARM_INNER',
          },
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      await new Promise<void>((resolve) => {
        const res: any = {
          status(code: number) {
            capturedStatus = code;
            return this;
          },
          json(data: any) {
            capturedJson = data;
            resolve();
            return this;
          },
        };
        tattooImageRouter(req, res, () => resolve());
      });

      assert.strictEqual(capturedStatus, 200);
      assert.strictEqual(capturedJson.success, true);
      assert.ok(capturedJson.data.dimensions);
      assert.strictEqual(capturedJson.data.dimensions.width, 1024);
      assert.strictEqual(capturedJson.data.dimensions.height, 1536);
      assert.strictEqual(capturedJson.data.dimensions.aspectRatio, '2:3');
      assert.strictEqual(capturedJson.data.dimensions.orientation, 'vertical');
      assert.strictEqual(capturedJson.data.dimensions.bitDepth, 8);
      assert.strictEqual(capturedJson.data.dimensions.format, 'PNG');
      assert.strictEqual(capturedJson.data.dimensions.verified, true);
      assert.ok(capturedJson.data.dimensions.fileSizeBytes > 0);
    });
  });
});
