import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { tattooImageRouter } from './src/server/tattooImageRouter';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // İstek gövdesi boyutu sınırı (64kb ile sınırlı)
  app.use(express.json({ limit: '64kb' }));

  // Güvenlik Başlıkları
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // 1. API Rotaları
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Tattoo Studio Local Backend',
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    });
  });

  // Görsel üretim ve güvenlik API rotası
  app.use('/api', tattooImageRouter);

  // 2. Vite Middleware / SPA Entegrasyonu
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // 3. Port ve Host Yapılandırması (Yalnızca 127.0.0.1 üzerinde dinleme)
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '127.0.0.1'; // Kesin olarak yalnızca yerel loopback (0.0.0.0 dış ağ kapalı)

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Yerel Stüdyo Sunucusu] Dinliyor: http://${HOST}:${PORT}`);
    console.log(`[Yerel Güvenlik] Dış ağ erişimi (0.0.0.0) kapalıdır. Yalnızca ${HOST} adresi etkindir.`);
  });

  const shutdown = () => {
    server.close(() => {
      console.log('[Yerel Stüdyo Sunucusu] Kapatıldı.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[Yerel Stüdyo Sunucusu] Başlatma Hatası:', err);
  process.exit(1);
});
