import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { ClientTattooDesign } from '../types/design';
import { hasActualModuleResults } from '../core/clientDataAdapter';

export type WorkspaceDetailTab =
  | 'PERSONAL_BIRTH'
  | 'ANALYSES'
  | 'TESTS'
  | 'RESULTS'
  | 'SYMBOLS'
  | 'RECIPE'
  | 'DESIGN'
  | 'CLIENTS';

/**
 * Geçerli Dövme Tasarım İstemi Anahtar Kelimeleri
 */
export const TATTOO_PROMPT_KEYWORDS = [
  'tattoo',
  'flash',
  'stencil',
  'ink',
  'line',
  'blackwork',
  'linework',
  'dotwork',
  'geometric',
  'geometry',
  'sacred',
  'minimalist',
  'minimalism',
  'watercolor',
  'realism',
  'vector',
  'silhouette',
  'white background',
  'fine line',
  'composition',
  'symbol',
  'lotus',
  'wolf',
  'hawk',
  'owl',
  'flower of life',
  'metatron',
  'tree of life',
  'mandala',
  'celtic',
  'triskele',
  'ouroboros',
  'sharp',
  'edges',
  'crisp',
  'monochrome',
  'design',
  'style',
  'aesthetic',
];

/**
 * Görsel Tasarım İstemi (primaryPromptEn) Doğrulayıcısı
 * Yalnızca boş olmama durumunu değil; uzunluk, kelime sayısı, karakter tekrarı
 * ve dövme terminolojisi varlığını doğrular.
 */
export function isValidTattooPrompt(prompt: string | undefined | null): {
  isValid: boolean;
  reasonTr?: string;
} {
  if (!prompt || typeof prompt !== 'string') {
    return { isValid: false, reasonTr: 'Görsel tasarım istemi (AI Prompt) üretilmemiş.' };
  }

  const trimmed = prompt.trim();
  if (trimmed.length < 25) {
    return {
      isValid: false,
      reasonTr: 'Görsel tasarım istemi çok kısa (geçerli bir istem en az 25 karakter olmalıdır).',
    };
  }

  // Anlamsız karakter tekrarları (örn. aaaaaaaaaaaa)
  if (/(.)\1{5,}/.test(trimmed)) {
    return {
      isValid: false,
      reasonTr: 'Görsel tasarım istemi anlamsız tekrarlayan karakter dizileri içeriyor.',
    };
  }

  const words = trimmed.split(/\s+/);
  if (words.length < 3) {
    return {
      isValid: false,
      reasonTr: 'Görsel tasarım istemi en az 3 kelimeden oluşmalıdır.',
    };
  }

  // Dövme/tasarım anahtar kelime varlığı
  const lower = trimmed.toLowerCase();
  const hasKeyword = TATTOO_PROMPT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasKeyword) {
    return {
      isValid: false,
      reasonTr: 'Görsel tasarım istemi dövme tasarımı, stil veya sembol anahtar kelimeleri içermemektedir.',
    };
  }

  return { isValid: true };
}

/**
 * Aşama 1: Danışan ve Doğum Bilgileri Doğrulaması
 */
export function validatePersonalBirthStage(client: Client | null): {
  isValid: boolean;
  missingFields: string[];
} {
  if (!client) {
    return { isValid: false, missingFields: ['Danışan Kaydı'] };
  }

  const missing: string[] = [];
  if (!client.firstName?.trim()) missing.push('Ad');
  if (!client.lastName?.trim()) missing.push('Soyad');
  if (!client.birthDate?.trim()) missing.push('Doğum Tarihi');

  const loc = client.birthLocation;
  const hasValidCoords = Boolean(
    loc &&
    typeof loc.latitude === 'number' &&
    !isNaN(loc.latitude) &&
    typeof loc.longitude === 'number' &&
    !isNaN(loc.longitude)
  );

  if (!hasValidCoords) {
    missing.push('Global Harita Koordinatları (Enlem / Boylam)');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Aşama 2: 4 Temel Analiz Doğrulaması (Astroloji, Numeroloji, Çakra, Arketip)
 */
export function validateAnalysesStage(
  archive: ClientArchiveRecord | null,
  clientId: string
): {
  isComplete: boolean;
  missingAnalyses: string[];
  completedCount: number;
} {
  if (!archive || !archive.client || archive.client.id !== clientId) {
    return {
      isComplete: false,
      missingAnalyses: ['Astroloji', 'Numeroloji', 'Çakra', 'Arketip'],
      completedCount: 0,
    };
  }

  const hasAstro = hasActualModuleResults(archive, 'ASTROLOGY');
  const hasNum = hasActualModuleResults(archive, 'NUMEROLOGY');
  const hasChakra = hasActualModuleResults(archive, 'CHAKRA');
  const hasArch = hasActualModuleResults(archive, 'ARCHETYPE');

  const missing: string[] = [];
  if (!hasAstro) missing.push('Astroloji (10 Gök Cismi)');
  if (!hasNum) missing.push('Pisagor Numerolojisi');
  if (!hasChakra) missing.push('7 Temel Çakra');
  if (!hasArch) missing.push('Birleşik ve Gölge Arketip');

  const completedCount = 4 - missing.length;

  return {
    isComplete: missing.length === 0,
    missingAnalyses: missing,
    completedCount,
  };
}

/**
 * Aşama 4: Sonuçlar Merkezi Hazırlık Denetimi
 * Semboller aşamasına geçiş için Sonuçlar Merkezi'nin hazır olduğunu (4 temel analizin varlığını) doğrular.
 */
export function validateResultsStage(
  archive: ClientArchiveRecord | null,
  clientId: string
): {
  isReady: boolean;
  missingAnalyses: string[];
} {
  const check = validateAnalysesStage(archive, clientId);
  return {
    isReady: check.isComplete,
    missingAnalyses: check.missingAnalyses,
  };
}

/**
 * Aşama 6: Dövme Tasarım Süreci Tamamlama Hazırlık Denetimi
 * Eksik veya geçersiz tasarımda tamamlama kilidini yönetir.
 */
export function evaluateDesignCompletionReadiness(
  client: Client | null,
  archive: ClientArchiveRecord | null,
  activeDesign: ClientTattooDesign | null
): {
  isReady: boolean;
  missingOutputsTr: string[];
} {
  if (!client) {
    return { isReady: false, missingOutputsTr: ['Geçerli bir danışan kaydı seçilmedi.'] };
  }

  const missing: string[] = [];

  // 1. Temel analizler kontrolü
  const analysesValidation = validateAnalysesStage(archive, client.id);
  if (!analysesValidation.isComplete) {
    missing.push(`Ön Koşul Temel Analizleri (${analysesValidation.missingAnalyses.join(', ')}) tamamlanmamış`);
  }

  // 2. Dövme reçetesi kontrolü
  if (!activeDesign || !activeDesign.recipe) {
    missing.push('Dövme reçetesi (stil, anatomik yerleşim ve teknik tavsiyeler) oluşturulmamış');
  } else {
    const recipe = activeDesign.recipe;
    if (!recipe.style || !recipe.recommendedPlacement) {
      missing.push('Dövme reçetesinde stil veya anatomik yerleşim seçilmemiş');
    }
  }

  // 3. Sembol kompozisyonu kontrolü
  const hasSymbols = Boolean(
    (activeDesign?.recipe?.primarySymbol && activeDesign.recipe.primarySymbol.trim()) ||
    (activeDesign?.recipe?.secondarySymbols && activeDesign.recipe.secondarySymbols.length > 0) ||
    (activeDesign?.recipe?.detailedSymbols && activeDesign.recipe.detailedSymbols.length > 0) ||
    (archive?.symbolAnalyses && archive.symbolAnalyses.filter((s) => s.clientId === client.id).length > 0)
  );

  if (!hasSymbols) {
    missing.push('Tasarım kompozisyonu için sembol seçimi yapılmamış');
  }

  // 4. Görsel tasarım istemi (AI Prompt) kontrolü: Semantik ve biçimsel doğrulama
  const promptValidation = isValidTattooPrompt(activeDesign?.aiPrompt?.primaryPromptEn);
  if (!promptValidation.isValid) {
    missing.push(promptValidation.reasonTr || 'Geçerli bir görsel tasarım istemi (AI Prompt) üretilmemiş');
  }

  return {
    isReady: missing.length === 0,
    missingOutputsTr: missing,
  };
}

/**
 * Merkezi Navigasyon Geçiş Guard'ı
 * Hem üst sekme butonlarında hem de Devam Et / Geri butonlarında ve yönlendirmelerde aynı kuralları uygular.
 */
export function canNavigateToWorkspaceTab(
  targetTab: WorkspaceDetailTab,
  client: Client | null,
  archive: ClientArchiveRecord | null,
  currentTab?: WorkspaceDetailTab,
  testState?: { isEnneagramTaking?: boolean; isTotemTaking?: boolean }
): {
  allowed: boolean;
  reasonTr?: string;
} {
  if (!client) {
    return { allowed: false, reasonTr: 'Lütfen önce bir danışan seçiniz.' };
  }

  // Kural: Test çözülüyorken başka bir sekmeye atlama kesinlikle engellenir
  if (
    currentTab === 'TESTS' &&
    targetTab !== 'TESTS' &&
    (testState?.isEnneagramTaking || testState?.isTotemTaking)
  ) {
    return {
      allowed: false,
      reasonTr: 'Şu anda bir test çözmektesiniz. Devam etmeden veya sekme değiştirmeden önce lütfen testi tamamlayınız ya da "Vazgeç" butonuna tıklayınız.',
    };
  }

  // 1. Danışan Bilgileri: Her zaman serbestçe dönülebilir (Geri dönüşler serbest ve veri kaybı yok)
  if (targetTab === 'PERSONAL_BIRTH' || targetTab === 'CLIENTS') {
    return { allowed: true };
  }

  // Aşama 1 doğrulaması: Kişisel ve doğum bilgileri eksikse sonraki hiçbir aşamaya geçilemez
  const personalCheck = validatePersonalBirthStage(client);
  if (!personalCheck.isValid) {
    return {
      allowed: false,
      reasonTr: `Danışan Bilgileri aşamasında zorunlu alanlar (${personalCheck.missingFields.join(', ')}) eksik olduğu için sonraki aşamalara geçilemez.`,
    };
  }

  // 2. Temel Analizler: Aşama 1 geçerliyse serbestçe erişilebilir
  if (targetTab === 'ANALYSES') {
    return { allowed: true };
  }

  // Aşama 2 doğrulaması: 4 Temel Analiz tamamlanmamışsa ileri aşamalara geçişler engellenir
  const analysesCheck = validateAnalysesStage(archive, client.id);
  if (!analysesCheck.isComplete) {
    if (targetTab === 'TESTS') {
      return {
        allowed: false,
        reasonTr: `Temel Analizler (Eksik: ${analysesCheck.missingAnalyses.join(', ')}) tamamlanmadan Testler aşamasına geçilemez.`,
      };
    }
    if (targetTab === 'RESULTS') {
      return {
        allowed: false,
        reasonTr: `Temel Analizler (Eksik: ${analysesCheck.missingAnalyses.join(', ')}) tamamlanmadan Sonuçlar Merkezi hazır olamaz ve bu aşamaya geçilemez.`,
      };
    }
    if (targetTab === 'SYMBOLS') {
      return {
        allowed: false,
        reasonTr: `Sonuçlar Merkezi hazır olmadan (Eksik analizler: ${analysesCheck.missingAnalyses.join(', ')}) Semboller aşamasına geçilemez.`,
      };
    }
    if (targetTab === 'RECIPE') {
      return {
        allowed: false,
        reasonTr: `Temel Analizler (Eksik: ${analysesCheck.missingAnalyses.join(', ')}) tamamlanmadan Dövme Reçetesi aşamasına geçilemez.`,
      };
    }
    if (targetTab === 'DESIGN') {
      return {
        allowed: false,
        reasonTr: `Temel Analizler (Eksik: ${analysesCheck.missingAnalyses.join(', ')}) tamamlanmadan Dövme Tasarımı aşamasına geçilemez.`,
      };
    }
  }

  // 3. Testler (Enneagram & Totem): Opsiyonel kullanım kararı korunur; temel analizler hazırsa serbesttir
  if (targetTab === 'TESTS') {
    return { allowed: true };
  }

  // 4. Sonuçlar Merkezi: Temel analizler hazır olduğunda görüntülenebilir
  if (targetTab === 'RESULTS') {
    return { allowed: true };
  }

  // 5. Semboller: Sonuçlar Merkezi hazır olduğunda (4 temel analiz tamamlandığında) geçişe izin verilir
  if (targetTab === 'SYMBOLS') {
    const resultsCheck = validateResultsStage(archive, client.id);
    if (!resultsCheck.isReady) {
      return {
        allowed: false,
        reasonTr: `Sonuçlar Merkezi hazır olmadan (Eksik: ${resultsCheck.missingAnalyses.join(', ')}) Semboller aşamasına geçilemez.`,
      };
    }
    return { allowed: true };
  }

  // 6. Dövme Reçetesi
  if (targetTab === 'RECIPE') {
    return { allowed: true };
  }

  // 7. Dövme Tasarımı: Serbest seçim modu korunur; tasarım çalışma alanına girilebilir
  // (Nihai tamamlama aşamasında evaluateDesignCompletionReadiness sembol ve prompt şartını arar)
  if (targetTab === 'DESIGN') {
    return { allowed: true };
  }

  return { allowed: true };
}
