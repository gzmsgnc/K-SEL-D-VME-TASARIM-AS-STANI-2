/**
 * Dövme Görseli Dosya İsimlendirme, Boyut ve Baskı Ölçeği Yardımcı Fonksiyonları (Aşama 5.4.2)
 *
 * Güvenlik ve Gizlilik Standartları:
 * 1. İndirilen dosya adında KESİNLİKLE danışanın adı, soyadı veya anne adı yer almaz (Sıfır PII).
 * 2. Dosya adı yalnızca güvenli danışan kimliği (safeClientId), temizlenmiş sembol/konsept etiketi
 *    ve oluşturulma tarihi (YYYYMMDD) ile üretilir.
 * 3. 300 DPI baskı ölçüsü teorik varsayımdır; dosyada gömülü gerçek DPI iddiası taşınmaz.
 */

/**
 * Türkçe karakterleri ASCII eşdeğerlerine dönüştürür ve slug oluşturur.
 */
export function slugifyText(input: string, maxLength = 30): string {
  if (!input || typeof input !== 'string') return '';

  const trMap: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  };

  const replaced = input
    .split('')
    .map((char) => trMap[char] || char)
    .join('');

  const clean = replaced
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);

  return clean || 'sablon';
}

/**
 * Güvenli dosya adı üretir.
 * Sıfır PII ilkesi: İsim, soyisim ve anne adı KESİNLİKLE dahil edilmez.
 *
 * Örnek: 'dovme-sablonu_client-001_kutsal-geometri_20261112.png'
 */
export function generateSafeTattooDownloadFileName(options: {
  clientId: string;
  conceptOrSymbol?: string;
  date?: Date | string;
  extension?: 'png' | 'svg';
}): string {
  const { clientId, conceptOrSymbol, date, extension = 'png' } = options;

  // 1. Güvenli Client ID (yalnızca alfanümerik, tire ve altçizgi)
  const safeClientId = (clientId || 'client')
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40) || 'client';

  // 2. Temiz Konsept / Sembol Etiketi
  const cleanTag = conceptOrSymbol ? slugifyText(conceptOrSymbol, 24) : 'stencil';

  // 3. Tarih Biçimi (YYYYMMDD)
  let dateStr = '';
  try {
    const d = date ? new Date(date) : new Date();
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStr = `${year}${month}${day}`;
    } else {
      dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
  } catch {
    dateStr = '2026';
  }

  // 4. Güvenli Uzantı
  const safeExt = extension === 'svg' ? 'svg' : 'png';

  return `dovme-sablonu_${safeClientId}_${cleanTag}_${dateStr}.${safeExt}`;
}

/**
 * Bayt cinsinden dosya boyutunu okunabilir biçime dönüştürür (KB / MB).
 */
export function formatByteSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '—';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Yönelim kodunu Türkçe açık etiketine çevirir.
 */
export function getOrientationLabelTr(orientation?: 'vertical' | 'square' | 'horizontal' | string): string {
  switch (orientation) {
    case 'vertical':
      return 'Dikey (Portrait)';
    case 'square':
      return 'Kare (Square)';
    case 'horizontal':
      return 'Yatay (Landscape)';
    default:
      return 'Belirtilmedi';
  }
}

/**
 * Varsayımsal termal şablon / flaş baskı boyutunu hesaplar.
 *
 * KRİTİK NOT (Aşama 5.4.2 Kural 4):
 * Dosyada gömülü gerçek DPI bilgisi yoksa sahte DPI iddia edilmez.
 * 300 DPI değeri yalnızca dövme sanatçısı için yaklaşık teorik hesaplama referansıdır.
 */
export function calculateHypotheticalPrintSize(
  widthPx: number,
  heightPx: number,
  assumedDpi = 300
): {
  widthCm: number;
  heightCm: number;
  formatted: string;
  assumedDpi: number;
  isTheoretical: true;
  disclaimerTr: string;
} {
  const safeDpi = assumedDpi > 0 ? assumedDpi : 300;
  // 1 inç = 2.54 cm
  const widthCm = Number(((widthPx / safeDpi) * 2.54).toFixed(1));
  const heightCm = Number(((heightPx / safeDpi) * 2.54).toFixed(1));

  return {
    widthCm,
    heightCm,
    formatted: `~${widthCm} × ${heightCm} cm`,
    assumedDpi: safeDpi,
    isTheoretical: true,
    disclaimerTr: `Bu ölçü, dosya piksel çözünürlüğünün (${widthPx}×${heightPx} px) standart 300 DPI flaş/termal şablon baskı varsayımıyla hesaplanmış teorik referansıdır. PNG dosyasında gömülü fiziksel DPI etiketi bulunmamaktadır. Dövme sanatçısı nihai şablon baskı ölçeğini danışanın gerçek anatomik ölçülerine göre ayrıca ayarlamalıdır.`,
  };
}
