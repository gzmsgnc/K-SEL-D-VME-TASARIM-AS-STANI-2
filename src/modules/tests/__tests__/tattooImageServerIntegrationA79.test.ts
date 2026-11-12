import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  saveGeneratedTattooImage,
  getTattooImageFile,
  getClientStorageDir,
  validateSafeClientId,
  validateSafeFileId,
  TATTOOS_STORAGE_ROOT,
} from '../../../server/tattooImageStorage';
import {
  setMockImageGenerator,
  isOpenAiKeyConfigured,
  OpenAiApiError,
  generateTattooImageWithOpenAi,
} from '../../../server/openaiImageService';
import { tattooImageRouter } from '../../../server/tattooImageRouter';

import { createValidTestPngBuffer } from '../../../server/pngValidator';

describe('AŞAMA 5.3.2 — Gerçek Dövme Görseli Üretimi İçin Sunucu Entegrasyonu Testleri', () => {
  const testClientIdA = 'test-client-alpha-001';
  const testClientIdB = 'test-client-beta-002';
  const sample1x1PngBuffer = createValidTestPngBuffer(1024, 1536);

  after(async () => {
    // Test dizinlerini temizle
    try {
      const dirA = path.resolve(TATTOOS_STORAGE_ROOT, testClientIdA);
      const dirB = path.resolve(TATTOOS_STORAGE_ROOT, testClientIdB);
      if (fs.existsSync(dirA)) await fs.promises.rm(dirA, { recursive: true, force: true });
      if (fs.existsSync(dirB)) await fs.promises.rm(dirB, { recursive: true, force: true });
    } catch {
      // yoksay
    }
    setMockImageGenerator(null);
  });

  describe('1. Özel Depolama Dizini ve Path Traversal Güvenliği', () => {
    test('Kök dizin public klasörü dışında, "storage/tattoos" altında olmalıdır', () => {
      assert.ok(TATTOOS_STORAGE_ROOT.endsWith(path.join('storage', 'tattoos')));
      assert.strictEqual(TATTOOS_STORAGE_ROOT.includes('public'), false);
    });

    test('Geçerli clientId için kanonik dizin yolu üretilmelidir', () => {
      const clientDir = getClientStorageDir(testClientIdA);
      assert.strictEqual(clientDir, path.resolve(TATTOOS_STORAGE_ROOT, testClientIdA));
    });

    test('Path traversal (../../) içeren clientId kesinlikle reddedilmelidir', () => {
      assert.strictEqual(validateSafeClientId('../../etc'), false);
      assert.strictEqual(validateSafeClientId('../outside'), false);
      assert.strictEqual(validateSafeClientId('client/subdir'), false);
      assert.strictEqual(validateSafeClientId('client\\subdir'), false);

      assert.throws(() => {
        getClientStorageDir('../../etc');
      }, /Geçersiz veya güvensiz clientId/);
    });

    test('File ID doğrulayıcı yalnızca güvenli alfanümerik/UUID karakterleri kabul etmelidir', () => {
      assert.strictEqual(validateSafeFileId('valid-uuid-12345'), true);
      assert.strictEqual(validateSafeFileId('../secret.png'), false);
      assert.strictEqual(validateSafeFileId('file.png; rm -rf'), false);
    });
  });

  describe('2. Görsel Kaydetme ve Dosya İsimlendirme Güvenliği', () => {
    test('Görsel crypto.randomUUID() ile oluşturulan dosya adıyla kaydedilmelidir', async () => {
      const saved = await saveGeneratedTattooImage(testClientIdA, sample1x1PngBuffer, 'png');

      assert.ok(saved.fileId, 'fileId üretilmelidir.');
      assert.ok(saved.fileName.endsWith('.png'), 'Dosya adı .png ile bitmelidir.');
      assert.strictEqual(saved.fileName, `${saved.fileId}.png`);
      assert.strictEqual(saved.relativeUrl, `/api/tattoo-images/${testClientIdA}/${saved.fileId}`);

      // Fiziksel dosya storage/tattoos/{clientId}/ içinde var olmalıdır
      assert.ok(fs.existsSync(saved.filePath), 'Dosya fiziksel diskte mevcut olmalıdır.');
      const fileContent = await fs.promises.readFile(saved.filePath);
      assert.deepStrictEqual(fileContent, sample1x1PngBuffer);

      // public dizininde ASLA bulunmamalıdır
      const publicPath = path.resolve(process.cwd(), 'public', saved.fileName);
      assert.strictEqual(fs.existsSync(publicPath), false, 'Görsel public klasörüne yazılmamalıdır.');
    });
  });

  describe('3. Danışanlar Arası Dosya İzolasyonu', () => {
    test('Danışan A ya ait dosyaya Danışan B nin clientId si ile erişilemez (404)', async () => {
      // Danışan A için dosya oluştur
      const savedA = await saveGeneratedTattooImage(testClientIdA, sample1x1PngBuffer, 'png');

      // Danışan A kendi dosyasını bulabilmeli
      const lookupA = await getTattooImageFile(testClientIdA, savedA.fileId, 'png');
      assert.strictEqual(lookupA.exists, true);
      assert.strictEqual(lookupA.filePath, savedA.filePath);

      // Danışan B, Danışan A'nın fileId'sini kullansa bile bulamamalıdır!
      const lookupB = await getTattooImageFile(testClientIdB, savedA.fileId, 'png');
      assert.strictEqual(lookupB.exists, false, 'Danışan B Danışan A nın görseline erişememelidir.');
    });
  });

  describe('4. OpenAI API Anahtarı ve Hata Davranışı', () => {
    test('OPENAI_API_KEY yokken POST /api/generate-tattoo-image HTTP 503 dönmelidir', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      setMockImageGenerator(null);

      let capturedStatus = 0;
      let capturedJson: any = null;

      const req: any = {
        method: 'POST',
        url: '/generate-tattoo-image',
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        },
        body: {
          clientId: testClientIdA,
          prompt: 'Sacred geometry Flower of Life vector tattoo stencil, fine line',
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

      assert.strictEqual(capturedStatus, 503);
      assert.strictEqual(capturedJson.code, 'OPENAI_API_KEY_NOT_CONFIGURED');
      assert.strictEqual(capturedJson.success, false);
      assert.ok(capturedJson.message.includes('yapılandırılmamış'));

      // Anahtarı geri yükle
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    test('Mock sağlayıcı ile başarılı görsel üretimi diske yazılmalı ve HTTP 200 dönmelidir', async () => {
      // Mock jeneratörü aktif et
      setMockImageGenerator(async () => sample1x1PngBuffer);
      process.env.OPENAI_API_KEY = 'test-mock-key';

      let capturedStatus = 0;
      let capturedJson: any = null;

      const req: any = {
        method: 'POST',
        url: '/generate-tattoo-image',
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        },
        body: {
          clientId: testClientIdA,
          prompt: 'Vector tattoo stencil of sacred geometry seed of life, immaculate fine line',
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
      assert.ok(capturedJson.data.fileId);
      assert.strictEqual(capturedJson.data.clientId, testClientIdA);
      assert.strictEqual(capturedJson.data.size, '1024x1536', 'İç ön kol dikey 1024x1536 seçilmelidir.');
      assert.ok(capturedJson.data.imageUrl.startsWith(`/api/tattoo-images/${testClientIdA}/`));

      // Diske yazıldığını doğrula
      const fileInfo = await getTattooImageFile(testClientIdA, capturedJson.data.fileId);
      assert.strictEqual(fileInfo.exists, true);

      setMockImageGenerator(null);
    });
  });

  describe('5. GET /api/tattoo-images/:clientId/:fileId Endpoint Güvenliği', () => {
    test('Var olan dosya stream olarak sunulmalıdır', async () => {
      const saved = await saveGeneratedTattooImage(testClientIdA, sample1x1PngBuffer, 'png');

      const headers: Record<string, string> = {};

      const req: any = {
        method: 'GET',
        url: `/tattoo-images/${testClientIdA}/${saved.fileId}`,
        params: {
          clientId: testClientIdA,
          fileId: saved.fileId,
        },
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        },
      };

      await new Promise<void>((resolve) => {
        const res: any = {
          status(code: number) {
            return this;
          },
          setHeader(name: string, val: string) {
            headers[name] = val;
            return this;
          },
          json(_data: any) {
            resolve();
            return this;
          },
          // Stream pipe mock
          emit() {},
          on(evt: string, fn: any) {
            if (evt === 'finish' || evt === 'close') fn();
            return this;
          },
          once(evt: string, fn: any) {
            if (evt === 'finish' || evt === 'close') fn();
            return this;
          },
          write(_chunk: any) {
            return true;
          },
          end() {
            resolve();
          },
        };

        tattooImageRouter(req, res, () => resolve());
      });

      assert.strictEqual(headers['Content-Type'], 'image/png');
      assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
    });

    test('Bulunamayan görsel için HTTP 404 dönmelidir', async () => {
      let capturedStatus = 0;
      let capturedJson: any = null;

      const req: any = {
        method: 'GET',
        url: `/tattoo-images/${testClientIdA}/non-existent-uuid-999`,
        params: {
          clientId: testClientIdA,
          fileId: 'non-existent-uuid-999',
        },
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        },
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

      assert.strictEqual(capturedStatus, 404);
      assert.strictEqual(capturedJson.code, 'IMAGE_NOT_FOUND');
    });

    test('Geçersiz clientId veya fileId için HTTP 400 dönmelidir (Path Traversal Engeli)', async () => {
      let capturedStatus = 0;
      let capturedJson: any = null;

      const req: any = {
        method: 'GET',
        url: `/tattoo-images/invalid..traversal/passwd-123`,
        params: {
          clientId: 'invalid..traversal',
          fileId: 'passwd-123',
        },
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        },
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

      assert.strictEqual(capturedStatus, 400);
      assert.strictEqual(capturedJson.code, 'INVALID_CLIENT_ID');
    });
  });
});
