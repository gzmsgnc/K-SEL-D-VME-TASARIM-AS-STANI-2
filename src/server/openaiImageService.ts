/**
 * OpenAI GPT Image API Entegrasyon Servisi (Yalnızca Sunucu Tarafı)
 *
 * Güvenlik ve API Standartları (Aşama 5.3.2.2):
 * - Resmî Dokümantasyon: https://developers.openai.com/api/docs/guides/image-generation
 * - Model: 'gpt-image-2.6-sunburst' (ana) ve 'gpt-image-2.5-sunburst' (yedek)
 * - Endpoint: POST https://api.openai.com/v1/images/generations
 * - Resmî Boyutlar: Dikey tasarımlar için '1024x1536', kare tasarımlar için '1024x1024'.
 *   Desteklenmeyen veya geçersiz boyutlar engellenir ve otomatik olarak '1024x1536' değerine normalleştirilir.
 * - Kalite: Yalnızca 'medium' veya 'high' ('standard' kesinlikle gönderilmez).
 * - GPT Image modellerinde 'b64_json' varsayılan yanıt biçimidir; 'response_format' parametresi gönderilmez.
 * - Yanıt doğrulaması: 'data[0].b64_json' alanı ve standart 8-baytlık PNG başlığı (0x89504E47) doğrulanır.
 * - API Anahtarı Durum Ayrıştırması:
 *   * OPENAI_API_KEY tanımsız veya boşsa OpenAI isteği yapılmadan derhal 503 (OPENAI_API_KEY_NOT_CONFIGURED) döndürülür.
 *   * Anahtar mevcut ancak OpenAI tarafından reddedilirse 401 (OPENAI_AUTHENTICATION_FAILED) döndürülür.
 *   * Kota veya hız sınırı aşıldığında 429 (OPENAI_RATE_LIMIT_EXCEEDED) döndürülür.
 * - Sıfır Sızıntı: API anahtarı hiçbir koşulda loglara, hata çıktılarına veya istemciye aktarılmaz.
 */

import {
  PNG_MAGIC_HEADER,
  parseAndValidatePng,
} from './pngValidator';
import type {
  SupportedImageSize,
  PngIhdrMetadata,
} from './pngValidator';

export { PNG_MAGIC_HEADER, parseAndValidatePng };
export type { SupportedImageSize, PngIhdrMetadata };

export const PRIMARY_IMAGE_MODEL = 'gpt-image-2.6-sunburst';
export const BACKUP_IMAGE_MODEL = 'gpt-image-2.5-sunburst';
export const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';

/** Resmî olarak desteklenen görsel boyutları */
export const SUPPORTED_IMAGE_SIZES: readonly SupportedImageSize[] = ['1024x1536', '1024x1024', '1536x1024'] as const;

export interface OpenAiImageGenerationOptions {
  prompt: string;
  size?: SupportedImageSize | string;
  quality?: 'medium' | 'high' | string;
  model?: string;
  timeoutMs?: number;
  validateDimensions?: boolean;
}

export interface OpenAiImageGenerationResult {
  imageBuffer: Buffer;
  modelUsed: string;
  revisedPrompt?: string;
  format: 'png';
  size: SupportedImageSize;
  metadata?: PngIhdrMetadata;
}

export class OpenAiApiError extends Error {
  public status: number;
  public code: string;
  public retryable: boolean;

  constructor(message: string, status = 500, code = 'OPENAI_API_ERROR', retryable = false) {
    super(message);
    this.name = 'OpenAiApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Görsel boyutu parametresini resmî belgelere göre doğrular.
 * Dikey tasarımlar için '1024x1536', kare tasarımlar için '1024x1024'.
 * Modelin desteklemediği veya eski '1024x1792' gibi boyutlar '1024x1536' değerine normalleştirilir.
 */
export function normalizeImageSize(size?: string): SupportedImageSize {
  if (size === '1024x1024') return '1024x1024';
  if (size === '1536x1024') return '1536x1024';
  // Dikey önkol ve dövme tasarımları için geçerli resmî boyut 1024x1536
  return '1024x1536';
}

/**
 * Kalite parametresini resmî belgelere göre doğrular.
 * 'standard' veya geçersiz değerleri reddedip 'high' veya 'medium' döner.
 */
export function normalizeQuality(q?: string): 'medium' | 'high' {
  if (q === 'medium') return 'medium';
  return 'high'; // Dövme şablonu ve ince çizgi vektörleri için varsayılan 'high'
}

/**
 * Hatanın yedek model (backup model) denemesine uygun olup olmadığını kontrol eder.
 * 401, 403, 429, 400 veya yapılandırılmamış anahtar (503) durumlarında yedek modele geçiş yapılmaz.
 */
export function isEligibleForBackupModel(error: OpenAiApiError): boolean {
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 429 ||
    error.status === 400 ||
    error.code === 'OPENAI_API_KEY_NOT_CONFIGURED'
  ) {
    return false;
  }

  // Sunucu hataları (5xx), zaman aşımı veya model bulunamadı (404) durumunda yedek model denenir
  if (error.status === 404 || error.status >= 500) {
    return true;
  }
  if (error.code === 'OPENAI_TIMEOUT' || error.code === 'OPENAI_NETWORK_ERROR') {
    return true;
  }

  return false;
}

/**
 * Test veya çevrimdışı geliştirme için enjekte edilebilir mock sağlayıcı
 */
let mockImageGenerator: ((options: OpenAiImageGenerationOptions) => Promise<Buffer>) | null = null;

export function setMockImageGenerator(
  fn: ((options: OpenAiImageGenerationOptions) => Promise<Buffer>) | null
): void {
  mockImageGenerator = fn;
}

/**
 * OpenAI API anahtarının yapılandırılıp yapılandırılmadığını kontrol eder.
 */
export function isOpenAiKeyConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.length > 5);
}

/**
 * Tekil bir model için OpenAI API isteğini yürütür ve dönen veriyi doğrular.
 */
async function executeSingleOpenAiRequest(
  targetModel: string,
  prompt: string,
  size: SupportedImageSize,
  quality: 'medium' | 'high',
  apiKey: string,
  timeoutMs: number,
  validateDimensions: boolean = true
): Promise<{ imageBuffer: Buffer; revisedPrompt?: string; metadata?: PngIhdrMetadata }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Resmî API sözleşmesi:
    // GPT Image modellerinde 'response_format' parametresi gönderilmez ('b64_json' varsayılandır).
    // 'quality' parametresi yalnızca 'medium' veya 'high' olabilir ('standard' KESİNLİKLE gönderilmez).
    // 'size' parametresi dikeyde '1024x1536', karede '1024x1024' olmalıdır.
    const requestBody = {
      model: targetModel,
      prompt,
      n: 1,
      size,
      quality,
    };

    const response = await fetch(OPENAI_IMAGES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let rawErrorMessage = '';
      let errorCode = 'OPENAI_REQUEST_FAILED';

      try {
        const errorJson = (await response.json()) as any;
        if (errorJson?.error?.message) {
          rawErrorMessage = String(errorJson.error.message);
        }
        if (errorJson?.error?.code) {
          errorCode = `OPENAI_${String(errorJson.error.code).toUpperCase()}`;
        }
      } catch {
        rawErrorMessage = `HTTP ${response.status}`;
      }

      // 401 Kimlik Doğrulama Hatası
      if (response.status === 401) {
        throw new OpenAiApiError(
          'OpenAI API anahtarı geçersiz veya yetkilendirilemedi. Lütfen sunucu .env dosyasındaki OPENAI_API_KEY anahtarını kontrol edin.',
          401,
          'OPENAI_AUTHENTICATION_FAILED',
          false
        );
      }

      // 429 Kota veya Hız Sınırı
      if (response.status === 429) {
        throw new OpenAiApiError(
          'OpenAI API kullanım kotası veya hız sınırı aşıldı. Lütfen daha sonra tekrar deneyin.',
          429,
          'OPENAI_RATE_LIMIT_EXCEEDED',
          false
        );
      }

      // 400 Geçersiz İstek veya Güvenlik İhlali
      if (response.status === 400) {
        throw new OpenAiApiError(
          `OpenAI görsel üretim isteği reddedildi: ${rawErrorMessage || 'Geçersiz parametre veya istem kuralları ihlali.'}`,
          400,
          errorCode,
          false
        );
      }

      // 404 Model Bulunamadı / Erişilemez
      if (response.status === 404) {
        throw new OpenAiApiError(
          `Belirtilen model (${targetModel}) OpenAI API üzerinde bulunamadı veya erişilemez durumda.`,
          404,
          'OPENAI_MODEL_NOT_FOUND',
          true
        );
      }

      // 5xx ve diğer sunucu hataları
      throw new OpenAiApiError(
        `OpenAI sunucu hatası (${response.status}): ${rawErrorMessage || 'Hizmet geçici olarak yanıt vermiyor.'}`,
        response.status,
        errorCode,
        true
      );
    }

    const data = (await response.json()) as any;

    if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new OpenAiApiError(
        'OpenAI API geçerli bir görsel veri dizisi döndürmedi (boş yanıt).',
        502,
        'OPENAI_EMPTY_RESPONSE',
        false
      );
    }

    const firstItem = data.data[0];
    let imageBuffer: Buffer;

    if (firstItem.b64_json && typeof firstItem.b64_json === 'string' && firstItem.b64_json.trim().length > 0) {
      const b64Clean = firstItem.b64_json.trim();
      // Geçersiz Base64 formatı denetimi (sadece geçerli Base64 karakterleri ve 4'ün katı uzunluk)
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64Clean) || b64Clean.length % 4 !== 0) {
        throw new OpenAiApiError(
          'OpenAI yanıtındaki Base64 görsel verisi geçersiz karakter veya hatalı dolgu içeriyor.',
          502,
          'OPENAI_CORRUPTED_IMAGE',
          false
        );
      }
      try {
        imageBuffer = Buffer.from(b64Clean, 'base64');
        if (imageBuffer.length === 0) {
          throw new Error('Boş buffer');
        }
      } catch {
        throw new OpenAiApiError(
          'OpenAI yanıtındaki Base64 görsel verisi çözümlenemedi (bozuk veri).',
          502,
          'OPENAI_CORRUPTED_IMAGE',
          false
        );
      }
    } else if (firstItem.url && typeof firstItem.url === 'string') {
      const downloadRes = await fetch(firstItem.url);
      if (!downloadRes.ok) {
        throw new OpenAiApiError(
          'OpenAI tarafından döndürülen görsel bağlantısından dosya indirilemedi.',
          502,
          'OPENAI_DOWNLOAD_FAILED',
          false
        );
      }
      imageBuffer = Buffer.from(await downloadRes.arrayBuffer());
    } else {
      throw new OpenAiApiError(
        'OpenAI yanıtında geçerli b64_json veya görsel verisi bulunamadı.',
        502,
        'OPENAI_INVALID_DATA_FORMAT',
        false
      );
    }

    // PNG Doğrulaması: Sihirli imza, IHDR başlığı, boyut, oran ve renk tipi doğrulaması (Aşama 5.4.1)
    const pngValidation = parseAndValidatePng(
      imageBuffer,
      validateDimensions ? size : undefined
    );
    if (!pngValidation.valid) {
      const errorCode =
        pngValidation.code === 'PNG_UNEXPECTED_RESOLUTION'
          ? 'OPENAI_UNEXPECTED_RESOLUTION'
          : 'OPENAI_CORRUPTED_IMAGE';

      throw new OpenAiApiError(
        `OpenAI görsel bütünlük doğrulaması başarısız (${pngValidation.code || 'PNG_ERROR'}): ${pngValidation.error || 'Bozuk dosya.'}`,
        502,
        errorCode,
        false
      );
    }

    return {
      imageBuffer,
      revisedPrompt: firstItem.revised_prompt,
      metadata: pngValidation.metadata,
    };
  } catch (err: any) {
    clearTimeout(timer);

    if (err instanceof OpenAiApiError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new OpenAiApiError(
        'Görsel üretim isteği zaman aşımına uğradı (60 saniye). Sunucu veya model yanıt vermedi.',
        504,
        'OPENAI_TIMEOUT',
        true
      );
    }

    throw new OpenAiApiError(
      `OpenAI bağlantı hatası: ${err.message || 'Bilinmeyen ağ hatası'}`,
      500,
      'OPENAI_NETWORK_ERROR',
      true
    );
  }
}

/**
 * OpenAI Image Generation API çağrısı gerçekleştirir.
 * Ana model ('gpt-image-2.6-sunburst') başarısız olduğunda uygun hatalarda yedek modeli ('gpt-image-2.5-sunburst') devreye alır.
 */
export async function generateTattooImageWithOpenAi(
  options: OpenAiImageGenerationOptions
): Promise<OpenAiImageGenerationResult> {
  const {
    prompt,
    size: rawSize,
    quality: rawQuality,
    model: customModel,
    timeoutMs = 60000,
    validateDimensions = true,
  } = options;

  const size = normalizeImageSize(rawSize);
  const quality = normalizeQuality(rawQuality);
  const primaryModel = customModel || process.env.OPENAI_IMAGE_MODEL || PRIMARY_IMAGE_MODEL;
  const backupModel = process.env.OPENAI_BACKUP_IMAGE_MODEL || BACKUP_IMAGE_MODEL;

  // 1. Mock Jeneratör Kontrolü (Test ve çevrimdışı ortam için)
  if (mockImageGenerator) {
    const mockBuffer = await mockImageGenerator(options);
    const pngValidation = parseAndValidatePng(
      mockBuffer,
      validateDimensions ? size : undefined
    );
    if (!pngValidation.valid) {
      const errorCode =
        pngValidation.code === 'PNG_UNEXPECTED_RESOLUTION'
          ? 'OPENAI_UNEXPECTED_RESOLUTION'
          : 'OPENAI_CORRUPTED_IMAGE';

      throw new OpenAiApiError(
        `Mock görsel bütünlük doğrulaması başarısız (${pngValidation.code}): ${pngValidation.error}`,
        502,
        errorCode,
        false
      );
    }

    return {
      imageBuffer: mockBuffer,
      modelUsed: `${primaryModel}-mock`,
      format: 'png',
      size,
      metadata: pngValidation.metadata,
    };
  }

  // 2. API Anahtarı Durumu Ayrıştırması:
  // OPENAI_API_KEY tanımsız veya boşsa OpenAI isteği yapılmadan derhal 503 döndürülür.
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAiApiError(
      'OpenAI API anahtarı (OPENAI_API_KEY) sunucu ortamında yapılandırılmamış. Lütfen .env dosyasına geçerli bir anahtar ekleyin.',
      503,
      'OPENAI_API_KEY_NOT_CONFIGURED',
      false
    );
  }

  // 3. Ana Model ile Üretim Denemesi
  try {
    const result = await executeSingleOpenAiRequest(
      primaryModel,
      prompt,
      size,
      quality,
      apiKey,
      timeoutMs,
      validateDimensions
    );

    return {
      imageBuffer: result.imageBuffer,
      modelUsed: primaryModel,
      revisedPrompt: result.revisedPrompt,
      format: 'png',
      size,
      metadata: result.metadata,
    };
  } catch (primaryErr: any) {
    // 4. Yedek Model Değerlendirmesi
    // Yalnızca geçici/sunucu hatalarında ve model erişim sorunlarında yedek model denenir.
    // 401, 403, 429, 400 ve 503 (key eksik) gibi kullanıcı/hesap hatalarında yedek modele geçilmez.
    if (primaryErr instanceof OpenAiApiError && isEligibleForBackupModel(primaryErr)) {
      if (primaryModel !== backupModel) {
        // Güvenli konsol uyarısı (API anahtarı ve hassas istem kesinlikle loglanmaz)
        console.warn(
          `[OpenAI Görsel Servisi] Ana model (${primaryModel}) başarısız oldu (${primaryErr.status} - ${primaryErr.code}). Yedek model (${backupModel}) deneniyor...`
        );

        try {
          const backupResult = await executeSingleOpenAiRequest(
            backupModel,
            prompt,
            size,
            quality,
            apiKey,
            timeoutMs,
            validateDimensions
          );

          return {
            imageBuffer: backupResult.imageBuffer,
            modelUsed: backupModel,
            revisedPrompt: backupResult.revisedPrompt,
            format: 'png',
            size,
            metadata: backupResult.metadata,
          };
        } catch (backupErr: any) {
          // Yedek model de başarısız olursa temiz hata fırlat
          if (backupErr instanceof OpenAiApiError) {
            throw new OpenAiApiError(
              `Hem ana model (${primaryModel}) hem de yedek model (${backupModel}) ile görsel üretilemedi: ${backupErr.message}`,
              backupErr.status,
              backupErr.code,
              backupErr.retryable
            );
          }
          throw backupErr;
        }
      }
    }

    // Yedek modele uygun olmayan hatalar (401, 429, 400, 503-key, 502 bütünlük hataları) doğrudan fırlatılır
    throw primaryErr;
  }
}
