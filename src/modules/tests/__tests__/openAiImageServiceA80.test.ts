import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  generateTattooImageWithOpenAi,
  normalizeQuality,
  normalizeImageSize,
  isEligibleForBackupModel,
  OpenAiApiError,
  PRIMARY_IMAGE_MODEL,
  BACKUP_IMAGE_MODEL,
  OPENAI_IMAGES_ENDPOINT,
  PNG_MAGIC_HEADER,
  setMockImageGenerator,
} from '../../../server/openaiImageService';

import { createValidTestPngBuffer } from '../../../server/pngValidator';

describe('AŞAMA 5.3.2.2 — Görsel Boyutu ve API Anahtarı Durumu Son Düzeltme Testleri', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const FAKE_SECRET_KEY = 'sk-proj-super-secret-test-key-xyz987';

  // 1024x1536 ve 1024x1024 geçerli PNG fixtures (IHDR ve CRC32 uyumlu)
  const valid1024x1536PngB64 = createValidTestPngBuffer(1024, 1536).toString('base64');
  const valid1024x1024PngB64 = createValidTestPngBuffer(1024, 1024).toString('base64');

  beforeEach(() => {
    setMockImageGenerator(null);
    process.env.OPENAI_API_KEY = FAKE_SECRET_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    setMockImageGenerator(null);
  });

  describe('1. Resmî Görsel Boyutu Uyumluluğu (1024x1536 ve 1024x1024)', () => {
    test('Dikey dövme tasarımlarında 1024x1792 yerine resmî desteklenen 1024x1536 boyutu kullanılmalıdır', () => {
      assert.strictEqual(normalizeImageSize('1024x1536'), '1024x1536');
      assert.strictEqual(normalizeImageSize(undefined), '1024x1536', 'Varsayılan dikey boyut 1024x1536 olmalıdır.');
      assert.strictEqual(
        normalizeImageSize('1024x1792'),
        '1024x1536',
        'Eski/desteklenmeyen 1024x1792 dikey boyutu 1024x1536 olarak normalleştirilmelidir.'
      );
    });

    test('Kare dövme tasarımlarında 1024x1024 boyutu korunmalıdır', () => {
      assert.strictEqual(normalizeImageSize('1024x1024'), '1024x1024');
    });

    test('Modelin desteklemediği geçersiz boyutlar (ör. 800x600) APIye gönderilmeden 1024x1536ya dönüştürülmelidir', () => {
      assert.strictEqual(normalizeImageSize('800x600'), '1024x1536');
      assert.strictEqual(normalizeImageSize('invalid-size'), '1024x1536');
    });

    test('OpenAI API isteğinde size: 1024x1536, quality: high iletilmeli ve response_format gönderilmemelidir', async () => {
      let interceptedUrl = '';
      let interceptedHeaders: any = {};
      let interceptedBody: any = null;

      globalThis.fetch = (async (url: any, options: any) => {
        interceptedUrl = String(url);
        interceptedHeaders = options.headers;
        interceptedBody = JSON.parse(options.body);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ b64_json: valid1024x1536PngB64, revised_prompt: 'Sanatsal dövme istemi' }],
          }),
        } as any;
      }) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Sacred geometry fine line tattoo stencil, high contrast vector',
        size: '1024x1792', // Eski format verilse bile 1024x1536 gitmeli
        quality: 'standard', // standard verilse bile high gitmeli
      });

      assert.strictEqual(interceptedUrl, OPENAI_IMAGES_ENDPOINT);
      assert.strictEqual(interceptedHeaders['Authorization'], `Bearer ${FAKE_SECRET_KEY}`);
      assert.strictEqual(interceptedHeaders['Content-Type'], 'application/json');

      assert.strictEqual(interceptedBody.model, PRIMARY_IMAGE_MODEL);
      assert.strictEqual(
        interceptedBody.size,
        '1024x1536',
        'OpenAI API isteğine 1024x1792 yerine kesinlikle 1024x1536 gitmelidir.'
      );
      assert.strictEqual(interceptedBody.quality, 'high', 'quality parametresi standard değil high olmalıdır.');
      assert.strictEqual(interceptedBody.n, 1);
      assert.strictEqual(
        interceptedBody.response_format,
        undefined,
        'GPT Image modellerinde gereksiz/desteklenmeyen response_format gönderilmemelidir.'
      );

      assert.strictEqual(result.modelUsed, PRIMARY_IMAGE_MODEL);
      assert.strictEqual(result.size, '1024x1536');
      assert.strictEqual(result.format, 'png');
      assert.ok(result.imageBuffer instanceof Buffer);
    });

    test('Kare boyutta OpenAI API isteğine size: 1024x1024 iletilmelidir', async () => {
      let interceptedBody: any = null;

      globalThis.fetch = (async (_url: any, options: any) => {
        interceptedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ b64_json: valid1024x1024PngB64 }],
          }),
        } as any;
      }) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Mandala chest tattoo stencil',
        size: '1024x1024',
      });

      assert.strictEqual(interceptedBody.size, '1024x1024');
      assert.strictEqual(result.size, '1024x1024');
    });
  });

  describe('2. API Anahtarı Durumlarının Ayrıştırılması (503 vs 401 vs 429)', () => {
    test('OPENAI_API_KEY tanımsız veya boşsa OpenAI isteği yapılmadan derhal 503 dönmelidir', async () => {
      delete process.env.OPENAI_API_KEY;

      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return {} as any;
      }) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Test tattoo prompt' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 503);
          assert.strictEqual(err.code, 'OPENAI_API_KEY_NOT_CONFIGURED');
          assert.strictEqual(err.retryable, false);
          assert.ok(err.message.includes('yapılandırılmamış'));
          return true;
        }
      );

      assert.strictEqual(
        fetchCalled,
        false,
        'API anahtarı eksikken OpenAI API sunucusuna hiçbir HTTP isteği yapılmamalıdır.'
      );
    });

    test('OPENAI_API_KEY boşluk dizgisinden oluşuyorsa da 503 dönmeli ve fetch çağrılmamalıdır', async () => {
      process.env.OPENAI_API_KEY = '     ';

      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return {} as any;
      }) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Test tattoo prompt' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 503);
          assert.strictEqual(err.code, 'OPENAI_API_KEY_NOT_CONFIGURED');
          return true;
        }
      );

      assert.strictEqual(fetchCalled, false);
    });

    test('Anahtar mevcut ancak OpenAI 401 döndürüyorsa OPENAI_AUTHENTICATION_FAILED (401) dönmelidir', async () => {
      process.env.OPENAI_API_KEY = 'sk-invalid-demo-key-12345';
      let fetchCallCount = 0;

      globalThis.fetch = (async () => {
        fetchCallCount++;
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { message: 'Incorrect API key provided', code: 'invalid_api_key' },
          }),
        };
      }) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Test' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 401);
          assert.strictEqual(err.code, 'OPENAI_AUTHENTICATION_FAILED');
          assert.strictEqual(err.retryable, false);
          assert.ok(err.message.includes('geçersiz'));
          return true;
        }
      );

      assert.strictEqual(fetchCallCount, 1, '401 hatasında yedek model denenmemeli, tek çağrıda sonlandırılmalıdır.');
    });

    test('Kota veya hız sınırı aşıldığında OPENAI_RATE_LIMIT_EXCEEDED (429) dönmeli ve yedek denenmemelidir', async () => {
      let fetchCallCount = 0;

      globalThis.fetch = (async () => {
        fetchCallCount++;
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: { message: 'You exceeded your current quota', code: 'insufficient_quota' },
          }),
        };
      }) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Test' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 429);
          assert.strictEqual(err.code, 'OPENAI_RATE_LIMIT_EXCEEDED');
          return true;
        }
      );

      assert.strictEqual(fetchCallCount, 1, '429 hatasında yedek model denenmemelidir.');
    });
  });

  describe('3. Model ve Hata Yönetimi (Yedek Model Fallback)', () => {
    test('Ana model 500 / 503 döndürdüğünde yedek model (gpt-image-2.5-sunburst) otomatik denenmelidir', async () => {
      const calls: string[] = [];

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options.body);
        calls.push(body.model);

        if (body.model === PRIMARY_IMAGE_MODEL) {
          return {
            ok: false,
            status: 503,
            json: async () => ({
              error: { message: 'Primary model temporary capacity issue', code: 'service_unavailable' },
            }),
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ b64_json: valid1024x1536PngB64 }],
          }),
        };
      }) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Sacred geometry mandala vector stencil',
      });

      assert.strictEqual(calls.length, 2, 'İki model sırayla çağrılmalıdır.');
      assert.strictEqual(calls[0], PRIMARY_IMAGE_MODEL, 'Önce ana model çağrılmalıdır.');
      assert.strictEqual(calls[1], BACKUP_IMAGE_MODEL, 'Ardından yedek model çağrılmalıdır.');
      assert.strictEqual(result.modelUsed, BACKUP_IMAGE_MODEL, 'Kullanılan model yedek model olarak işaretlenmelidir.');
      assert.strictEqual(result.size, '1024x1536');
    });

    test('400 Geçersiz istek durumunda yedek model KESİNLİKLE denenmemelidir', async () => {
      let callCount = 0;

      globalThis.fetch = (async () => {
        callCount++;
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: { message: 'Invalid prompt formatting', code: 'invalid_request_error' },
          }),
        };
      }) as any;

      await assert.rejects(
        async () => {
          await generateTattooImageWithOpenAi({ prompt: 'Bad prompt' });
        },
        (err: any) => {
          assert.strictEqual(err.status, 400);
          return true;
        }
      );

      assert.strictEqual(callCount, 1, '400 hatasında yedek model denenmemelidir.');
    });

    test('isEligibleForBackupModel mantığı doğru sınıflandırma yapmalıdır', () => {
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Auth', 401)), false);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Quota', 429)), false);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Bad Req', 400)), false);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Forbidden', 403)), false);
      assert.strictEqual(
        isEligibleForBackupModel(new OpenAiApiError('Key Missing', 503, 'OPENAI_API_KEY_NOT_CONFIGURED')),
        false
      );

      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Model 404', 404)), true);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Internal 500', 500)), true);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Bad Gateway 502', 502)), true);
      assert.strictEqual(isEligibleForBackupModel(new OpenAiApiError('Unavailable 503', 503)), true);
      assert.strictEqual(
        isEligibleForBackupModel(new OpenAiApiError('Timeout', 504, 'OPENAI_TIMEOUT')),
        true
      );
    });
  });

  describe('4. Görsel Veri Bütünlüğü ve Bozuk Veri Denetimi', () => {
    test('Geçerli b64_json verisi başarıyla ikili PNG verisine dönüştürülmelidir', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: valid1024x1536PngB64 }],
        }),
      })) as any;

      const result = await generateTattooImageWithOpenAi({
        prompt: 'Geometric Wolf fine line stencil',
      });

      assert.ok(result.imageBuffer.length > 8);
      assert.deepStrictEqual(
        result.imageBuffer.subarray(0, 8),
        PNG_MAGIC_HEADER,
        'İlk 8 bayt PNG sihirli başlığı ile eşleşmelidir.'
      );
    });

    test('PNG başlığı taşımayan bozuk veri OPENAI_CORRUPTED_IMAGE (502) ile reddedilmelidir', async () => {
      const invalidHtmlB64 = Buffer.from('<html><body>Error Page</body></html>').toString('base64');

      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: invalidHtmlB64 }],
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

  describe('5. Güvenlik ve Sıfır Sızıntı İlkesi (Zero Leakage)', () => {
    test('Hata mesajları veya nesneleri API anahtarını kesinlikle içermemelidir', async () => {
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { message: `Auth error with key ${FAKE_SECRET_KEY}` },
          }),
        };
      }) as any;

      try {
        await generateTattooImageWithOpenAi({ prompt: 'Test' });
        assert.fail('Hata fırlatılmalıydı.');
      } catch (err: any) {
        assert.strictEqual(err.message.includes(FAKE_SECRET_KEY), false, 'Hata mesajı anahtarı içermemelidir.');
        assert.strictEqual(JSON.stringify(err).includes(FAKE_SECRET_KEY), false, 'JSON serileştirmesinde anahtar olmamalıdır.');
      }
    });
  });
});
