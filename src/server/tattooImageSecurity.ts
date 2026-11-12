/**
 * Yerel Sunucu ve Görsel Üretim API Güvenlik Modülü (AŞAMA 5.3.1.1 Son Kontrolü)
 *
 * Sorumluluklar:
 * 1. Katı Yerel Host ve Origin Doğrulaması (Yalnızca 127.0.0.1 ve localhost; DNS rebinding ve CSRF engeli)
 * 2. İstek Gövdesi Doğrulaması (Katı şema, anne adı dahil tanınmayan alanların kesin reddi)
 * 3. İstem (Prompt) Güvenlik Kalkanı (Kişisel kimlik/iletişim ifadeleri ve hariç tutulan semboller)
 * 4. Hafif Bellek İçi İstek Sınırlayıcı (In-Memory Rate Limiting)
 */

export interface GenerateTattooImagePayload {
  clientId: string;
  prompt: string;
  recipe?: {
    style?: string;
    placementArea?: string;
    primarySymbol?: string;
    secondarySymbols?: string[];
    colorProfile?: string;
    dimensions?: { width?: number; height?: number };
  };
  excludedSymbols?: string[];
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  data?: T;
}

export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
  violationType?: 'FORBIDDEN_PERSONAL_DATA' | 'EXCLUDED_SYMBOL' | 'PII_DETECTED' | 'PROMPT_LENGTH';
}

/**
 * 1. Katı Yerel Host ve Origin Güvenlik Doğrulaması
 * Yalnızca yerel 127.0.0.1 ve localhost adreslerine izin verir.
 * DNS rebinding, CSRF ve harici ağlardan gelen tüm istekleri derhal keser.
 * Harici veya bulut kapsayıcısı istisnası barındırmaz.
 */
export function validateHostAndOrigin(
  host?: string,
  origin?: string
): { allowed: boolean; reason?: string } {
  // Host başlığı zorunludur (HTTP/1.1 standardı)
  if (!host) {
    return { allowed: false, reason: 'Eksik Host başlığı (Host header is required).' };
  }

  const cleanHost = host.trim().toLowerCase();
  // Yalnızca yerel loopback adresleri (DNS Rebinding engeli)
  const isLocalHost =
    cleanHost === '127.0.0.1' ||
    cleanHost.startsWith('127.0.0.1:') ||
    cleanHost === 'localhost' ||
    cleanHost.startsWith('localhost:');

  if (!isLocalHost) {
    return {
      allowed: false,
      reason: `Yetkisiz Host: '${host}'. Uygulama yalnızca yerel (127.0.0.1 / localhost) üzerinde çalışır. Harici ağ ve DNS rebinding erişimleri engellenmiştir.`,
    };
  }

  // Origin başlığı denetimi (tarayıcı fetch/XHR isteklerinde gönderilir)
  if (origin) {
    const cleanOrigin = origin.trim().toLowerCase();
    try {
      const parsedUrl = new URL(cleanOrigin);
      const originHost = parsedUrl.hostname.toLowerCase();
      const isAllowedOriginHost = originHost === '127.0.0.1' || originHost === 'localhost';

      if (!isAllowedOriginHost) {
        return {
          allowed: false,
          reason: `Yetkisiz Origin: '${origin}'. Çapraz kaynaklı dış isteklere (CORS/CSRF) izin verilmez.`,
        };
      }
    } catch {
      return { allowed: false, reason: `Geçersiz Origin biçimi: '${origin}'.` };
    }
  }

  return { allowed: true };
}

/**
 * 2. İstek Gövdesi Doğrulaması (Katı Şema)
 * Beklenmeyen/tanınmayan alanları doğrudan reddeder (Mass assignment önleme).
 * "motherName" alanı şemadan tamamen çıkarılmıştır; gönderilmesi durumunda istek anında reddedilir.
 */
export function validateGenerateTattooImagePayload(
  body: any
): ValidationResult<GenerateTattooImagePayload> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      errors: ['İstek gövdesi geçerli bir JSON nesnesi olmalıdır.'],
    };
  }

  // Tanımlı alanlar beyaz listesi — "motherName" ASLA kabul edilmez!
  const allowedKeys = new Set(['clientId', 'prompt', 'recipe', 'excludedSymbols']);
  const actualKeys = Object.keys(body);
  const unexpectedKeys = actualKeys.filter((k) => !allowedKeys.has(k));

  if (unexpectedKeys.length > 0) {
    errors.push(
      `Beklenmeyen veya tanınmayan alan(lar) tespit edildi: [${unexpectedKeys.join(', ')}]. İstek reddedildi.`
    );
  }

  // clientId doğrulaması (Path traversal koruması için sıkı regex)
  if (!body.clientId || typeof body.clientId !== 'string' || !body.clientId.trim()) {
    errors.push('clientId alanı zorunludur ve boş olamaz.');
  } else {
    const cleanId = body.clientId.trim();
    if (cleanId.length > 120) {
      errors.push('clientId 120 karakterden uzun olamaz.');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      errors.push('clientId yalnızca alfanümerik karakterler, tire (-) ve alt çizgi (_) içerebilir.');
    }
  }

  // prompt doğrulaması
  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    errors.push('prompt alanı zorunludur ve metin olmalıdır.');
  } else {
    const cleanPrompt = body.prompt.trim();
    if (cleanPrompt.length < 10) {
      errors.push('prompt en az 10 karakter uzunluğunda olmalıdır.');
    }
    if (cleanPrompt.length > 2500) {
      errors.push('prompt en fazla 2500 karakter olabilir (güvenli limit aşıldı).');
    }
  }

  // recipe (isteğe bağlı)
  if (body.recipe !== undefined) {
    if (typeof body.recipe !== 'object' || body.recipe === null || Array.isArray(body.recipe)) {
      errors.push('recipe alanı geçerli bir nesne olmalıdır.');
    } else {
      const allowedRecipeKeys = new Set([
        'style',
        'placementArea',
        'primarySymbol',
        'secondarySymbols',
        'colorProfile',
        'dimensions',
      ]);
      const unexpectedRecipeKeys = Object.keys(body.recipe).filter((k) => !allowedRecipeKeys.has(k));
      if (unexpectedRecipeKeys.length > 0) {
        errors.push(`recipe nesnesinde tanınmayan alanlar: [${unexpectedRecipeKeys.join(', ')}].`);
      }
    }
  }

  // excludedSymbols (isteğe bağlı dizi)
  if (body.excludedSymbols !== undefined) {
    if (!Array.isArray(body.excludedSymbols)) {
      errors.push('excludedSymbols alanı bir metin dizisi olmalıdır.');
    } else {
      const nonString = body.excludedSymbols.some((s: any) => typeof s !== 'string');
      if (nonString) {
        errors.push('excludedSymbols içindeki tüm elemanlar metin olmalıdır.');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      clientId: body.clientId.trim(),
      prompt: body.prompt.trim(),
      recipe: body.recipe,
      excludedSymbols: body.excludedSymbols?.map((s: string) => s.trim()).filter(Boolean),
    },
  };
}

/**
 * 3. İstem (Prompt) Güvenlik Kalkanı
 * - Anne Adı / PII sızmasını önleme
 * - Hariç tutulan sembollerin modele gitmesini önleme
 * - TC Kimlik veya telefon numarası gibi kişisel verilerin prompta yazılmasını önleme
 * - "Mother Earth", "Mother Nature" gibi meşru sanatsal dövme ifadelerini yanlışlıkla engellemez.
 */
export function checkPromptSecurity(
  prompt: string,
  excludedSymbols: string[] = []
): SecurityCheckResult {
  if (!prompt || typeof prompt !== 'string') {
    return { safe: false, reason: 'İstem içeriği boş olamaz.' };
  }

  const promptLowerTr = prompt.toLocaleLowerCase('tr-TR');
  const promptLowerEn = prompt.toLowerCase();

  // A) Yasaklı kişisel veri anahtar kelimeleri (Tam öbek eşleşmesi)
  // "mother earth" veya "mother nature" gibi geçerli sanatsal ifadeleri engellemez
  const forbiddenPersonalPhrases = [
    'anne adı',
    'annemin adı',
    'anne adi',
    'annemın adı',
    'mother name',
    "mother's name",
    'doğum yeri',
    'dogum yeri',
    'tckn',
    'tc kimlik',
    'telefon:',
    'gsm:',
  ];

  for (const phrase of forbiddenPersonalPhrases) {
    if (promptLowerTr.includes(phrase) || promptLowerEn.includes(phrase)) {
      return {
        safe: false,
        violationType: 'FORBIDDEN_PERSONAL_DATA',
        reason: `Güvenlik Kalkanı Engeli: İstem kişisel gizlilik ifadesi ('${phrase}') içeremez.`,
      };
    }
  }

  // B) 11 haneli kimlik numarası deseni kontrolü (TCKN tespiti)
  if (/\b[1-9][0-9]{10}\b/.test(prompt)) {
    return {
      safe: false,
      violationType: 'PII_DETECTED',
      reason: 'Güvenlik Kalkanı Engeli: İstemde 11 haneli kimlik numarası deseni tespit edildi.',
    };
  }

  // C) Hariç tutulan semboller denetimi
  if (excludedSymbols && excludedSymbols.length > 0) {
    for (const exc of excludedSymbols) {
      if (!exc || !exc.trim()) continue;
      const excTr = exc.trim().toLocaleLowerCase('tr-TR');
      const excEn = exc.trim().toLowerCase();

      // Tam eşleşme kontrolü
      if (promptLowerTr.includes(excTr) || promptLowerEn.includes(excEn)) {
        return {
          safe: false,
          violationType: 'EXCLUDED_SYMBOL',
          reason: `Güvenlik Kalkanı Engeli: Danışanın hariç tuttuğu sembol ('${exc}') istem içeriğinde yer alamaz.`,
        };
      }

      // 3 harften uzun anahtar kök sözcük denetimi
      const words = excTr.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (promptLowerTr.includes(w) || promptLowerEn.includes(w)) {
          return {
            safe: false,
            violationType: 'EXCLUDED_SYMBOL',
            reason: `Güvenlik Kalkanı Engeli: Hariç tutulan sembol kökü ('${w}') istemde tespit edildi.`,
          };
        }
      }
    }
  }

  return { safe: true };
}

/**
 * 4. Hafif Bellek İçi İstek Sınırlayıcı (In-Memory Rate Limiter)
 * Tek kullanıcılı yerel stüdyoda arayüzden çift tıklama ve döngüsel istek patlamalarını önler.
 */
export interface RateLimiterInstance {
  isAllowed: (clientKey: string) => { allowed: boolean; remaining: number; resetInMs: number };
  reset: () => void;
}

export function createInMemoryRateLimiter(
  windowMs = 60000,
  maxRequests = 15
): RateLimiterInstance {
  const requestHistory = new Map<string, number[]>();

  return {
    isAllowed(clientKey: string) {
      const now = Date.now();
      const timestamps = requestHistory.get(clientKey) || [];

      // Pencere dışındaki eski istekleri temizle
      const recent = timestamps.filter((t) => now - t < windowMs);

      if (recent.length >= maxRequests) {
        const oldest = recent[0];
        const resetInMs = Math.max(0, windowMs - (now - oldest));
        requestHistory.set(clientKey, recent);
        return { allowed: false, remaining: 0, resetInMs };
      }

      recent.push(now);
      requestHistory.set(clientKey, recent);
      return {
        allowed: true,
        remaining: maxRequests - recent.length,
        resetInMs: windowMs,
      };
    },
    reset() {
      requestHistory.clear();
    },
  };
}
