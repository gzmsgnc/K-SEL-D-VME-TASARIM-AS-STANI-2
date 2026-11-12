import { Router, Request, Response } from 'express';
import fs from 'fs';
import {
  validateHostAndOrigin,
  validateGenerateTattooImagePayload,
  checkPromptSecurity,
  createInMemoryRateLimiter,
} from './tattooImageSecurity';
import {
  saveGeneratedTattooImage,
  getTattooImageFile,
  validateSafeClientId,
  validateSafeFileId,
} from './tattooImageStorage';
import {
  generateTattooImageWithOpenAi,
  isOpenAiKeyConfigured,
  OpenAiApiError,
} from './openaiImageService';

export const tattooImageRouter = Router();

// Yerel stüdyo için bellek içi rate limiter: Dakikada en fazla 15 istek
export const defaultImageApiRateLimiter = createInMemoryRateLimiter(60000, 15);

/**
 * POST /api/generate-tattoo-image
 *
 * Gerçek dövme görseli üretim uç noktası (Aşama 5.3.2).
 * 1. Host/Origin ve DNS Rebinding kontrolü
 * 2. Rate Limiter kontrolü
 * 3. Katı Şema kontrolü (motherName ve beklenmeyen alanların engeli)
 * 4. Prompt Güvenlik Kalkanı (PII, kimlik no, hariç tutulan semboller)
 * 5. OpenAI API çağrısı ve diske özel depolama ('storage/tattoos/{clientId}/')
 */
tattooImageRouter.post(
  '/generate-tattoo-image',
  async (req: Request, res: Response): Promise<void> => {
    // 1. Host ve Origin Doğrulaması (Yalnızca yerel 127.0.0.1 ve localhost)
    const hostHeader = (req.headers.host || '').toString();
    const originHeader = (req.headers.origin || '').toString();

    const hostCheck = validateHostAndOrigin(hostHeader, originHeader);
    if (!hostCheck.allowed) {
      res.status(403).json({
        success: false,
        status: 403,
        code: 'FORBIDDEN_ORIGIN_OR_HOST',
        message: hostCheck.reason || 'Yetkisiz erişim kaynağı.',
      });
      return;
    }

    // 2. Bellek İçi İstek Sınırlaması (Rate Limiting)
    const clientKey = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();
    const rateCheck = defaultImageApiRateLimiter.isAllowed(clientKey);
    if (!rateCheck.allowed) {
      res.status(429).json({
        success: false,
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Çok fazla istek gönderildi. Lütfen ${Math.ceil(rateCheck.resetInMs / 1000)} saniye bekleyin.`,
        retryAfterSeconds: Math.ceil(rateCheck.resetInMs / 1000),
      });
      return;
    }

    // 3. İstek Gövdesi Doğrulaması (Katı Şema Kontrolü)
    const validation = validateGenerateTattooImagePayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        success: false,
        status: 400,
        code: 'INVALID_REQUEST_PAYLOAD',
        message: 'İstek gövdesi doğrulanamadı.',
        errors: validation.errors,
      });
      return;
    }

    const { clientId, prompt, recipe, excludedSymbols } = validation.data;

    // 4. İkinci Katman Prompt Güvenlik Denetimi (PII, Gizlilik İfadeleri ve Hariç Tutulan Semboller)
    const securityCheck = checkPromptSecurity(prompt, excludedSymbols);
    if (!securityCheck.safe) {
      res.status(400).json({
        success: false,
        status: 400,
        code: `SECURITY_VIOLATION_${securityCheck.violationType || 'GENERIC'}`,
        message: securityCheck.reason || 'İstem güvenlik kurallarını ihlal ediyor.',
      });
      return;
    }

    // 5. OpenAI API Anahtarı Kontrolü
    if (!isOpenAiKeyConfigured()) {
      res.status(503).json({
        success: false,
        status: 503,
        code: 'OPENAI_API_KEY_NOT_CONFIGURED',
        message:
          'OpenAI API anahtarı (OPENAI_API_KEY) sunucu ortamında yapılandırılmamış. Dövme görseli üretmek için lütfen sunucunun .env dosyasına geçerli bir anahtar ekleyin.',
        retryable: false,
      });
      return;
    }

    // 6. Görsel Boyutu Seçimi (İç ön kol için dikey 1024x1536, diğer bölgeler için 1024x1024)
    const isVerticalForearm =
      !recipe?.placementArea ||
      recipe.placementArea === 'FOREARM_INNER' ||
      recipe.placementArea.includes('FOREARM') ||
      recipe.placementArea.includes('ARM');

    const imageSize: '1024x1536' | '1024x1024' = isVerticalForearm ? '1024x1536' : '1024x1024';

    // 7. OpenAI Görsel Üretimi ve Özel Yerel Depolama
    try {
      const generated = await generateTattooImageWithOpenAi({
        prompt,
        size: imageSize,
        quality: 'high',
      });

      // Görseli proje kökündeki storage/tattoos/{clientId}/ dizinine doğrulanmış olarak kaydet
      const saved = await saveGeneratedTattooImage(clientId, generated.imageBuffer, 'png', imageSize);

      res.status(200).json({
        success: true,
        status: 200,
        data: {
          fileId: saved.fileId,
          clientId,
          imageUrl: saved.relativeUrl,
          fileName: saved.fileName,
          modelUsed: generated.modelUsed,
          size: imageSize,
          dimensions: saved.metadata
            ? {
                width: saved.metadata.width,
                height: saved.metadata.height,
                aspectRatio: saved.metadata.aspectRatio,
                orientation: saved.metadata.orientation,
                bitDepth: saved.metadata.bitDepth,
                colorType: saved.metadata.colorTypeName,
                fileSizeBytes: saved.metadata.fileSizeBytes,
                format: 'PNG' as const,
                verified: true,
              }
            : undefined,
          createdAt: new Date().toISOString(),
          securityChecksPassed: true,
        },
      });
    } catch (err: any) {
      if (err instanceof OpenAiApiError) {
        res.status(err.status).json({
          success: false,
          status: err.status,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
        return;
      }

      res.status(500).json({
        success: false,
        status: 500,
        code: 'IMAGE_GENERATION_FAILED',
        message: `Dövme görseli üretimi sırasında beklenmeyen bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}`,
        retryable: true,
      });
    }
  }
);

/**
 * GET /api/tattoo-images/:clientId/:fileId
 *
 * Güvenli ve izole görsel okuma uç noktası.
 * - Host ve Origin doğrulaması uygulanır.
 * - Sadece talep edilen clientId dizini altındaki dosya okunabilir.
 * - Bir danışanın dosyasına başka bir danışanın clientId değeriyle erişilemez.
 * - Path traversal karakterleri engellenir.
 */
tattooImageRouter.get(
  '/tattoo-images/:clientId/:fileId',
  async (req: Request, res: Response): Promise<void> => {
    // 1. Host ve Origin Doğrulaması
    const hostHeader = (req.headers.host || '').toString();
    const originHeader = (req.headers.origin || '').toString();

    const hostCheck = validateHostAndOrigin(hostHeader, originHeader);
    if (!hostCheck.allowed) {
      res.status(403).json({
        success: false,
        status: 403,
        code: 'FORBIDDEN_ORIGIN_OR_HOST',
        message: hostCheck.reason || 'Yetkisiz erişim kaynağı.',
      });
      return;
    }

    const { clientId, fileId } = req.params;

    // 2. ClientId ve FileId Doğrulaması (Path Traversal Önleme)
    if (!validateSafeClientId(clientId)) {
      res.status(400).json({
        success: false,
        status: 400,
        code: 'INVALID_CLIENT_ID',
        message: 'Geçersiz danışan kimliği biçimi.',
      });
      return;
    }

    if (!validateSafeFileId(fileId)) {
      res.status(400).json({
        success: false,
        status: 400,
        code: 'INVALID_FILE_ID',
        message: 'Geçersiz dosya kimliği biçimi.',
      });
      return;
    }

    // 3. Dosyayı Danışana Özel Dizinde Ara
    try {
      const fileInfo = await getTattooImageFile(clientId, fileId, 'png');
      if (!fileInfo.exists || !fileInfo.filePath) {
        res.status(404).json({
          success: false,
          status: 404,
          code: 'IMAGE_NOT_FOUND',
          message: 'Talep edilen dövme görseli bulunamadı veya bu danışana ait değil.',
        });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=86400, no-transform');
      if (fileInfo.sizeBytes) {
        res.setHeader('Content-Length', fileInfo.sizeBytes.toString());
      }

      const stream = fs.createReadStream(fileInfo.filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            status: 500,
            code: 'FILE_READ_ERROR',
            message: 'Görsel dosyası okunurken hata oluştu.',
          });
        }
      });
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        status: 500,
        code: 'STORAGE_ACCESS_ERROR',
        message: err?.message || 'Depolama erişim hatası.',
      });
    }
  }
);
