import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  parseAndValidatePng,
  createValidTestPngBuffer,
  createPngChunk,
  PNG_MAGIC_HEADER,
} from '../../../server/pngValidator';
import {
  generateTattooImageWithOpenAi,
  OpenAiApiError,
  setMockImageGenerator,
} from '../../../server/openaiImageService';
import {
  saveGeneratedTattooImage,
  getClientStorageDir,
  getTattooImageFile,
  TATTOOS_STORAGE_ROOT,
} from '../../../server/tattooImageStorage';

describe('AŞAMA 5.4.1 — Sunucu Tarafı PNG Boyut, Format ve Görüntü Bütünlüğü Doğrulaması', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const FAKE_API_KEY = 'sk-proj-test-secure-api-key-999';
  const TEST_CLIENT_ID = 'test-client-a83-integrity';

  beforeEach(() => {
    setMockImageGenerator(null);
    process.env.OPENAI_API_KEY = FAKE_API_KEY;

    // Temiz test dizini
    const clientDir = getClientStorageDir(TEST_CLIENT_ID);
    if (fs.existsSync(clientDir)) {
      fs.rmSync(clientDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    setMockImageGenerator(null);

    const clientDir = getClientStorageDir(TEST_CLIENT_ID);
    if (fs.existsSync(clientDir)) {
      fs.rmSync(clientDir, { recursive: true, force: true });
    }
  });

  describe('1. Geçerli 1024×1536 PNG ve IHDR Meta Veri Çıkarımı', () => {
    test('Geçerli 1024x1536 PNG dosyası kabul edilmeli ve dikey stencil (2:3 oran) olarak doğrulanmalıdır', () => {
      const validPng = createValidTestPngBuffer(1024, 1536, 6, 8); // RGBA, 8-bit
      const validation = parseAndValidatePng(validPng, '1024x1536');

      assert.strictEqual(validation.valid, true);
      assert.ok(validation.metadata);
      assert.strictEqual(validation.metadata.width, 1024);
      assert.strictEqual(validation.metadata.height, 1536);
      assert.strictEqual(validation.metadata.orientation, 'vertical');
      assert.strictEqual(validation.metadata.aspectRatio, '2:3');
      assert.strictEqual(validation.metadata.bitDepth, 8);
      assert.strictEqual(validation.metadata.colorType, 6);
      assert.strictEqual(validation.metadata.colorTypeName, 'Truecolor with Alpha (RGBA)');
    });

    test('generateTattooImageWithOpenAi geçerli 1024x1536 PNG yanıtını başarıyla kabul edip metadata eklemelidir', async () => {
      const validPng = createValidTestPngBuffer(1024, 1536, 2, 8); // RGB, 8-bit
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: validPng.toString('base64') }],
        }),
      })) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Sacred geometry fine line tattoo stencil',
        size: '1024x1536',
      });

      assert.strictEqual(result.format, 'png');
      assert.strictEqual(result.size, '1024x1536');
      assert.ok(result.metadata);
      assert.strictEqual(result.metadata.width, 1024);
      assert.strictEqual(result.metadata.height, 1536);
      assert.strictEqual(result.metadata.aspectRatio, '2:3');
      assert.strictEqual(result.metadata.orientation, 'vertical');
    });
  });

  describe('2. Geçerli 1024×1024 PNG Kare Profil Uyumluluğu', () => {
    test('Geçerli 1024x1024 PNG dosyası kare profilde kabul edilmeli ve 1:1 oran doğrulanmalıdır', () => {
      const validSquarePng = createValidTestPngBuffer(1024, 1024, 0, 8); // Grayscale, 8-bit
      const validation = parseAndValidatePng(validSquarePng, '1024x1024');

      assert.strictEqual(validation.valid, true);
      assert.ok(validation.metadata);
      assert.strictEqual(validation.metadata.width, 1024);
      assert.strictEqual(validation.metadata.height, 1024);
      assert.strictEqual(validation.metadata.orientation, 'square');
      assert.strictEqual(validation.metadata.aspectRatio, '1:1');
    });

    test('Kare profil isteğinde (1024x1024) dönen geçerli PNG başarıyla sonuç üretmelidir', async () => {
      const validSquarePng = createValidTestPngBuffer(1024, 1024, 6, 8);
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: validSquarePng.toString('base64') }],
        }),
      })) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Mandala tattoo stencil',
        size: '1024x1024',
      });

      assert.strictEqual(result.size, '1024x1024');
      assert.strictEqual(result.metadata?.width, 1024);
      assert.strictEqual(result.metadata?.height, 1024);
      assert.strictEqual(result.metadata?.aspectRatio, '1:1');
    });
  });

  describe('3. Beklenmeyen Boyut ve Oran Reddi (1024×1792 veya Farklı Çözünürlük)', () => {
    test('1024x1536 beklenirken 1024x1792 boyutunda üretilen dosya PNG_UNEXPECTED_RESOLUTION ile reddedilmelidir', () => {
      const wrongSizePng = createValidTestPngBuffer(1024, 1792);
      const validation = parseAndValidatePng(wrongSizePng, '1024x1536');

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_UNEXPECTED_RESOLUTION');
      assert.ok(validation.error?.includes('1024x1536'));
      assert.ok(validation.error?.includes('1024x1792'));
    });

    test('1024x1024 (kare) beklenirken 1024x1536 boyutunda gelen görsel reddedilmelidir', () => {
      const verticalPng = createValidTestPngBuffer(1024, 1536);
      const validation = parseAndValidatePng(verticalPng, '1024x1024');

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_UNEXPECTED_RESOLUTION');
    });

    test('OpenAI servis katmanında beklenmeyen çözünürlük 502 (OPENAI_UNEXPECTED_RESOLUTION) fırlatmalıdır', async () => {
      const unexpectedSizePng = createValidTestPngBuffer(800, 600);
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: unexpectedSizePng.toString('base64') }],
        }),
      })) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({
            prompt: 'Test',
            size: '1024x1536',
          });
        },
        (err: any) => {
          assert.strictEqual(err.status, 502);
          assert.strictEqual(err.code, 'OPENAI_UNEXPECTED_RESOLUTION');
          assert.ok(err.message.includes('PNG_UNEXPECTED_RESOLUTION'));
          return true;
        }
      );
    });
  });

  describe('4. Bozuk PNG Dosya İmzası (Magic Header) Reddi', () => {
    test('İlk 8 baytı bozulmuş dosya PNG_INVALID_SIGNATURE ile reddedilmelidir', () => {
      const validPng = createValidTestPngBuffer(1024, 1536);
      const corruptedSig = Buffer.from(validPng);
      corruptedSig[0] = 0x00; // 0x89 -> 0x00

      const validation = parseAndValidatePng(corruptedSig);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_INVALID_SIGNATURE');
    });

    test('JPEG veya HTML verisi sunulduğunda bozuk imza tespit edilmelidir', () => {
      const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const validation = parseAndValidatePng(fakeJpeg);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_INVALID_SIGNATURE');
    });
  });

  describe('5. Eksik veya Bozuk IHDR Başlığı Reddi', () => {
    test('İlk veri bloğu IHDR yerine farklı bir blok olan dosya PNG_MISSING_IHDR ile reddedilmelidir', () => {
      const sig = Buffer.from(PNG_MAGIC_HEADER);
      const fakeChunk = createPngChunk('tEXt', Buffer.alloc(25)); // Toplam > 33 bayt
      const fakePng = Buffer.concat([sig, fakeChunk]);

      const validation = parseAndValidatePng(fakePng);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_MISSING_IHDR');
    });

    test('IHDR uzunluğu 13 bayttan farklı olan dosya PNG_CORRUPTED_IHDR ile reddedilmelidir', () => {
      const sig = Buffer.from(PNG_MAGIC_HEADER);
      // 15 baytlık veri bloğu (IHDR 13 yerine 15 bayt)
      const badIhdr = createPngChunk('IHDR', Buffer.alloc(15));
      const fakePng = Buffer.concat([sig, badIhdr]);

      const validation = parseAndValidatePng(fakePng);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_CORRUPTED_IHDR');
    });
  });

  describe('6. Sıfır Genişlik veya Sıfır Yükseklik Reddi', () => {
    test('Genişliği 0 olan dosya PNG_ZERO_DIMENSION ile reddedilmelidir', () => {
      const zeroWidthPng = createValidTestPngBuffer(0, 1536);
      const validation = parseAndValidatePng(zeroWidthPng);

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_ZERO_DIMENSION');
    });

    test('Yüksekliği 0 olan dosya PNG_ZERO_DIMENSION ile reddedilmelidir', () => {
      const zeroHeightPng = createValidTestPngBuffer(1024, 0);
      const validation = parseAndValidatePng(zeroHeightPng);

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_ZERO_DIMENSION');
    });
  });

  describe('7. Desteklenmeyen Renk Tipi veya Bit Derinliği Reddi', () => {
    test('Standart dışı renk tipi (ör. 5) PNG_UNSUPPORTED_COLOR_TYPE ile reddedilmelidir', () => {
      const invalidColorPng = createValidTestPngBuffer(1024, 1536, 5, 8);
      const validation = parseAndValidatePng(invalidColorPng);

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_UNSUPPORTED_COLOR_TYPE');
    });

    test('Renk tipi için geçersiz bit derinliği (ör. RGBA tipi için 1-bit) PNG_UNSUPPORTED_BIT_DEPTH ile reddedilmelidir', () => {
      // Color type 6 (RGBA) yalnızca 8 veya 16 bit destekler; 1-bit geçersizdir
      const invalidDepthPng = createValidTestPngBuffer(1024, 1536, 6, 1);
      const validation = parseAndValidatePng(invalidDepthPng);

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_UNSUPPORTED_BIT_DEPTH');
    });
  });

  describe('8. Kesilmiş veya Tamamlanmamış PNG Verisi Reddi', () => {
    test('33 bayttan kısa olan kesilmiş veri PNG_TRUNCATED_DATA ile reddedilmelidir', () => {
      const validPng = createValidTestPngBuffer(1024, 1536);
      const truncated = validPng.subarray(0, 20); // IHDR ortasında kesilmiş

      const validation = parseAndValidatePng(truncated);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.code, 'PNG_TRUNCATED_DATA');
    });
  });

  describe('9. Geçersiz Base64 Verisi Reddi', () => {
    test('Geçersiz Base64 karakterleri veya biçimi içeren yanıt OPENAI_CORRUPTED_IMAGE ile reddedilmelidir', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: '!!!bu_gecersiz_bir_base64_dizgisidir???' }],
        }),
      })) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Test' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 502);
          assert.strictEqual(err.code, 'OPENAI_CORRUPTED_IMAGE');
          return true;
        }
      );
    });
  });

  describe('10. Hatalı Dosyanın Diske Hiçbir Koşulda Kaydedilmemesi ve Depolama İzolasyonu', () => {
    test('Bozuk PNG verisi saveGeneratedTattooImage tarafından diske yazılmadan reddedilmelidir', async () => {
      const corruptedBuffer = Buffer.from('Bozuk-PNG-olmayan-veri');
      const clientDir = getClientStorageDir(TEST_CLIENT_ID);

      await assert.rejects(
        async () => {
          await saveGeneratedTattooImage(TEST_CLIENT_ID, corruptedBuffer, 'png', '1024x1536');
        },
        (err: any) => {
          assert.ok(err.message.includes('PNG bütünlük doğrulaması başarısız'));
          return true;
        }
      );

      const filesExist = fs.existsSync(clientDir) && fs.readdirSync(clientDir).length > 0;
      assert.strictEqual(
        filesExist,
        false,
        'Bozuk veri storage/tattoos/{clientId}/ altına KESİNLİKLE yazılmamalıdır.'
      );
    });

    test('Boyut uyumsuzluğu olan (örn. 800x600) görsel saveGeneratedTattooImage tarafından engellenmelidir', async () => {
      const mismatchedPng = createValidTestPngBuffer(800, 600);
      const clientDir = getClientStorageDir(TEST_CLIENT_ID);

      await assert.rejects(
        async () => {
          await saveGeneratedTattooImage(TEST_CLIENT_ID, mismatchedPng, 'png', '1024x1536');
        },
        (err: any) => {
          assert.ok(err.message.includes('PNG_UNEXPECTED_RESOLUTION'));
          return true;
        }
      );

      const filesExist = fs.existsSync(clientDir) && fs.readdirSync(clientDir).length > 0;
      assert.strictEqual(filesExist, false);
    });

    test('Geçerli 1024x1536 PNG yalnızca doğru danışan dizinine (storage/tattoos/{clientId}/) kaydedilmelidir', async () => {
      const validPng = createValidTestPngBuffer(1024, 1536);
      const saveResult = await saveGeneratedTattooImage(TEST_CLIENT_ID, validPng, 'png', '1024x1536');

      assert.ok(fs.existsSync(saveResult.filePath));
      assert.ok(saveResult.filePath.includes(TEST_CLIENT_ID));
      assert.ok(saveResult.relativeUrl.includes(saveResult.fileId));

      const fileOnDisk = fs.readFileSync(saveResult.filePath);
      const reValidation = parseAndValidatePng(fileOnDisk, '1024x1536');
      assert.strictEqual(reValidation.valid, true);
      assert.strictEqual(reValidation.metadata?.width, 1024);
      assert.strictEqual(reValidation.metadata?.height, 1536);

      // Başka danışan ID'si bu görsel kimliğini sorguladığında dosya bulunamamalıdır
      const otherCheck = await getTattooImageFile('other-different-client-id', saveResult.fileId);
      assert.strictEqual(otherCheck.exists, false, 'Başka danışan kimliğiyle dosyaya erişilememelidir.');

      // Doğru danışan dosyayı okuyabilmelidir
      const clientCheck = await getTattooImageFile(TEST_CLIENT_ID, saveResult.fileId);
      assert.strictEqual(clientCheck.exists, true);
      assert.strictEqual(clientCheck.filePath, saveResult.filePath);
    });

    test('Dizin aşımı (path traversal) girişimleri engellenmelidir', () => {
      const maliciousId = '../../etc/shadow';
      assert.throws(() => {
        getClientStorageDir(maliciousId);
      });
    });
  });
});
