import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validateHostAndOrigin,
  validateGenerateTattooImagePayload,
  checkPromptSecurity,
  createInMemoryRateLimiter,
} from '../../../server/tattooImageSecurity';
import { tattooImageRouter } from '../../../server/tattooImageRouter';

describe('AŞAMA 5.3.1.1 — Yerel Sunucu Güvenlik Son Kontrolü Testleri', () => {
  describe('1. Katı Yerel Host ve Origin Güvenlik Doğrulaması (DNS Rebinding Koruması)', () => {
    test('127.0.0.1 ve localhost erişimlerine izin verilmelidir', () => {
      assert.strictEqual(validateHostAndOrigin('127.0.0.1:3000').allowed, true);
      assert.strictEqual(validateHostAndOrigin('localhost:3000').allowed, true);
      assert.strictEqual(validateHostAndOrigin('127.0.0.1').allowed, true);
      assert.strictEqual(validateHostAndOrigin('localhost').allowed, true);
    });

    test('Yetkili yerel Origin değerlerine izin verilmelidir', () => {
      const res127 = validateHostAndOrigin('127.0.0.1:3000', 'http://127.0.0.1:3000');
      assert.strictEqual(res127.allowed, true);

      const resLocal = validateHostAndOrigin('localhost:3000', 'http://localhost:3000');
      assert.strictEqual(resLocal.allowed, true);
    });

    test('Yetkisiz dış Host adresleri ve harici istisnalar kesinlikle reddedilmelidir', () => {
      // Dış saldırgan domaini
      const resAttacker = validateHostAndOrigin('attacker.com:3000');
      assert.strictEqual(resAttacker.allowed, false);
      assert.ok(resAttacker.reason?.includes('Yetkisiz Host'));

      // Yerel ağ IP'si
      const resLan = validateHostAndOrigin('192.168.1.150:3000');
      assert.strictEqual(resLan.allowed, false);

      // Bulut kapsayıcısı host istisnası kaldırılmış olmalı (sadece yerel loopback serbest)
      const resCloud = validateHostAndOrigin('my-app-xyz.run.app');
      assert.strictEqual(resCloud.allowed, false);
    });

    test('Yetkisiz dış Origin (CORS/CSRF) adresleri kesinlikle reddedilmelidir', () => {
      const res = validateHostAndOrigin('127.0.0.1:3000', 'https://malicious-website.com');
      assert.strictEqual(res.allowed, false);
      assert.ok(res.reason?.includes('Yetkisiz Origin'));
    });

    test('Eksik Host başlığı reddedilmelidir', () => {
      const res = validateHostAndOrigin(undefined);
      assert.strictEqual(res.allowed, false);
      assert.ok(res.reason?.includes('Eksik Host başlığı'));
    });
  });

  describe('2. İstek Gövdesi Doğrulaması ve Anne Adının Şemadan Tamamen Çıkarılması', () => {
    test('Geçerli ve anne adı içermeyen istek başarıyla doğrulanmalıdır', () => {
      const payload = {
        clientId: 'client-12345',
        prompt: 'Minimalist sacred geometry tattoo, clean fine line, 1.5mm line spacing',
        recipe: {
          style: 'SACRED_GEOMETRY',
          placementArea: 'FOREARM_INNER',
          primarySymbol: 'Yaşam Çiçeği',
        },
        excludedSymbols: ['Metatron Küpü'],
      };

      const result = validateGenerateTattooImagePayload(payload);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.data?.clientId, 'client-12345');
      assert.strictEqual((result.data as any)?.motherName, undefined);
    });

    test('İstek gövdesine motherName alanı eklenirse istek derhal reddedilmelidir', () => {
      const payloadWithMother = {
        clientId: 'client-123',
        prompt: 'Tattoo design prompt valid length test',
        motherName: 'Ayşe', // Şemadan çıkarıldı, kesinlikle reddedilmeli
      };

      const result = validateGenerateTattooImagePayload(payloadWithMother);
      assert.strictEqual(result.valid, false);
      assert.ok(
        result.errors.some((e) => e.includes('Beklenmeyen veya tanınmayan alan(lar) tespit edildi: [motherName]')),
        'motherName alanı tanınmayan alan olarak tespit edilmeli ve reddedilmelidir.'
      );
    });

    test('Tanınmayan veya beklenmeyen alanlar (Mass Assignment) doğrudan reddedilmelidir', () => {
      const payload = {
        clientId: 'client-123',
        prompt: 'Tattoo design prompt valid length test',
        unexpectedField: 'malicious payload injection',
        role: 'admin',
      };

      const result = validateGenerateTattooImagePayload(payload);
      assert.strictEqual(result.valid, false);
      assert.ok(
        result.errors.some((e) => e.includes('Beklenmeyen veya tanınmayan alan(lar) tespit edildi'))
      );
    });

    test('Eksik veya boş clientId reddedilmelidir', () => {
      const resEmpty = validateGenerateTattooImagePayload({
        clientId: '   ',
        prompt: 'Valid prompt line design test',
      });
      assert.strictEqual(resEmpty.valid, false);
      assert.ok(resEmpty.errors.some((e) => e.includes('clientId alanı zorunludur')));
    });

    test('Path traversal riski taşıyan karakterler içeren clientId reddedilmelidir', () => {
      const resTraversal = validateGenerateTattooImagePayload({
        clientId: '../../etc/passwd',
        prompt: 'Valid prompt line design test',
      });
      assert.strictEqual(resTraversal.valid, false);
      assert.ok(resTraversal.errors.some((e) => e.includes('alfanümerik karakterler')));
    });

    test('Çok kısa (<10 karakter) veya güvenli sınırı (>2500) aşan prompt reddedilmelidir', () => {
      const resShort = validateGenerateTattooImagePayload({
        clientId: 'client-123',
        prompt: 'short',
      });
      assert.strictEqual(resShort.valid, false);
      assert.ok(resShort.errors.some((e) => e.includes('en az 10 karakter')));

      const longPrompt = 'a'.repeat(2505);
      const resLong = validateGenerateTattooImagePayload({
        clientId: 'client-123',
        prompt: longPrompt,
      });
      assert.strictEqual(resLong.valid, false);
      assert.ok(resLong.errors.some((e) => e.includes('en fazla 2500 karakter')));
    });

    test('recipe nesnesi içindeki bilinmeyen alanlar reddedilmelidir', () => {
      const payload = {
        clientId: 'client-123',
        prompt: 'Valid prompt line design test',
        recipe: {
          style: 'SACRED_GEOMETRY',
          injectedConfig: 'danger',
        },
      };
      const result = validateGenerateTattooImagePayload(payload);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('recipe nesnesinde tanınmayan alanlar')));
    });
  });

  describe('3. İkinci Katman Prompt Güvenlik Kalkanı ve Geçerli Promptların Korunması', () => {
    test('Gizlilik ifadeleri ("anne adı", "tckn", "doğum yeri") promptta tespit edilirse reddedilmelidir', () => {
      const prompt = 'Tattoo pattern with client anne adı: Emine written';
      const result = checkPromptSecurity(prompt, []);

      assert.strictEqual(result.safe, false);
      assert.strictEqual(result.violationType, 'FORBIDDEN_PERSONAL_DATA');
      assert.ok(result.reason?.includes('kişisel gizlilik ifadesi'));
    });

    test('11 haneli kimlik numarası deseni tespit edilirse engellenmelidir', () => {
      const prompt = 'Tattoo stencil with number 12345678901 in fine line';
      const result = checkPromptSecurity(prompt, []);

      assert.strictEqual(result.safe, false);
      assert.strictEqual(result.violationType, 'PII_DETECTED');
      assert.ok(result.reason?.includes('11 haneli kimlik numarası'));
    });

    test('Hariç tutulan semboller istem içinde tespit edilirse engellenmelidir', () => {
      const prompt = 'Fine line tattoo containing Metatron Küpü and sacred geometry';
      const result = checkPromptSecurity(prompt, ['Metatron Küpü']);

      assert.strictEqual(result.safe, false);
      assert.strictEqual(result.violationType, 'EXCLUDED_SYMBOL');
      assert.ok(result.reason?.includes('hariç tuttuğu sembol'));
    });

    test('Geçerli sanatsal dövme ifadeleri ("Mother Earth", "Mother Nature") YANLIŞLIKLA ENGELLENMEMELİDİR', () => {
      const promptEarth =
        'Vector tattoo stencil of Mother Earth surrounded by sacred geometry, crisp fine lines, pure white background';
      const resultEarth = checkPromptSecurity(promptEarth, ['Metatron']);

      assert.strictEqual(resultEarth.safe, true, '"Mother Earth" ifadesi meşru bir sanatsal ifadedir ve engellenmemelidir.');
      assert.strictEqual(resultEarth.violationType, undefined);

      const promptNature =
        'Symbolic representation of Mother Nature with leaves, dotwork stippling, 1.5mm line spacing';
      const resultNature = checkPromptSecurity(promptNature, []);
      assert.strictEqual(resultNature.safe, true, '"Mother Nature" meşru sanatsal dövme istemi olarak geçmelidir.');
    });

    test('Teknik dövme ölçüleri ve iğne boyutları ("22x14 cm", "1.5mm", "3RL", "5RL") PII olarak algılanmamalıdır', () => {
      const technicalPrompt =
        'Tattoo design 22x14 cm dimensions, 1.5mm to 2.0mm spacing, 3RL and 5RL needles, nominal 65% primary focus';
      const result = checkPromptSecurity(technicalPrompt, []);

      assert.strictEqual(result.safe, true, 'Teknik dövme ölçü ve iğne belirteçleri güvenli olarak kabul edilmelidir.');
    });
  });

  describe('4. Bellek İçi İstek Sınırlayıcı (Rate Limiter)', () => {
    test('Tanımlı limit içindeki isteklere izin verilmeli, limiti aşanlar bloke edilmelidir', () => {
      const limiter = createInMemoryRateLimiter(5000, 3);
      const clientIp = '127.0.0.1';

      assert.strictEqual(limiter.isAllowed(clientIp).allowed, true);
      assert.strictEqual(limiter.isAllowed(clientIp).allowed, true);
      assert.strictEqual(limiter.isAllowed(clientIp).allowed, true);

      // 4. istek bloklanmalıdır
      const blocked = limiter.isAllowed(clientIp);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.remaining, 0);
      assert.ok(blocked.resetInMs > 0);

      // Farklı IP etkilenmemelidir
      assert.strictEqual(limiter.isAllowed('127.0.0.2').allowed, true);
    });
  });

  describe('5. Express Router Uç Noktası Davranışı (Geçerli İstek Güvenliği ve Redler)', () => {
    test('Router geçerli bir istek aldığında güvenlik kalkanını geçmeli ve anahtar kontrolüne ilerlemelidir', async () => {
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
          clientId: 'client-secure-001',
          prompt: 'Sacred geometry Flower of Life tattoo stencil, fine line 1.5mm',
          recipe: {
            style: 'SACRED_GEOMETRY',
            placementArea: 'FOREARM_INNER',
          },
          excludedSymbols: ['Yılan'],
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

      // Güvenlik doğrulamaları başarılı; anahtar yoksa 503, varsa 200 döner
      assert.ok(
        capturedStatus === 503 || capturedStatus === 200,
        `Beklenen durum 503 veya 200, alınan: ${capturedStatus}`
      );
      if (capturedStatus === 503) {
        assert.strictEqual(capturedJson.code, 'OPENAI_API_KEY_NOT_CONFIGURED');
      }
    });

    test('İstek gövdesinde motherName alanı gönderilirse router HTTP 400 ile reddetmelidir', async () => {
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
          clientId: 'client-secure-001',
          prompt: 'Valid prompt line design test',
          motherName: 'Fatma',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedJson = data;
          return this;
        },
      };

      await new Promise<void>((resolve) => {
        tattooImageRouter(req, res, () => {
          resolve();
        });
        if (capturedStatus !== 0) resolve();
      });

      assert.strictEqual(capturedStatus, 400, 'motherName içeren istek HTTP 400 ile reddedilmelidir.');
      assert.strictEqual(capturedJson.code, 'INVALID_REQUEST_PAYLOAD');
      assert.ok(capturedJson.errors.some((e: string) => e.includes('motherName')));
    });

    test('Yetkisiz origin ile gelen istek router tarafından HTTP 403 ile reddedilmelidir', async () => {
      let capturedStatus = 0;
      let capturedJson: any = null;

      const req: any = {
        method: 'POST',
        url: '/generate-tattoo-image',
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://hacker-website.xyz',
        },
        body: {
          clientId: 'client-001',
          prompt: 'Sacred geometry tattoo test',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedJson = data;
          return this;
        },
      };

      await new Promise<void>((resolve) => {
        tattooImageRouter(req, res, () => {
          resolve();
        });
        if (capturedStatus !== 0) resolve();
      });

      assert.strictEqual(capturedStatus, 403, 'Yetkisiz origin HTTP 403 Forbidden dönmelidir.');
      assert.strictEqual(capturedJson.code, 'FORBIDDEN_ORIGIN_OR_HOST');
    });
  });
});
