/**
 * Merkezi Modül Kayıt Sistemi (Module Registry)
 * 
 * Uygulamanın 9 temel analiz, test, sembol ve tasarım modülünün
 * tanımını, girdi bağımlılıklarını ve veri durumlarını merkezi olarak yönetir.
 * Henüz geliştirilmemiş modüllere kesinlikle sahte sonuç üretmez.
 */

import { Client } from '../types/client';

export type ModuleId =
  | 'ASTROLOGY'       // Batı / Tropical Astroloji (Placidus)
  | 'NUMEROLOGY'      // Numeroloji Matrisi
  | 'EBCED'           // Ebced & Esma Rezonansı
  | 'CHAKRA'          // Çakra Dengesi
  | 'ARCHETYPE'       // Birleşik & Gölge Arketip
  | 'TESTS'           // Enneagram & Hayvan Totemi
  | 'SYMBOLS'         // Sembol Kütüphanesi & Sentezi
  | 'TATTOO_DESIGN'   // Dövme Tasarım Tarifi & AI Prompt
  | 'REPORT';         // Kişiselleştirilmiş Danışan Raporu

export type ModuleCategory =
  | 'COSMIC_FOUNDATION'      // Temel Kozmik Analizler (Astroloji, Numeroloji, Ebced)
  | 'ENERGY_PSYCHOLOGY'      // Enerji ve Psikolojik Katmanlar (Çakra, Arketip, Testler)
  | 'SYMBOLIC_COMPOSITION'   // Sembolik Sentez (Semboller)
  | 'TATTOO_MANIFESTATION';  // Dövme Tarifi ve Çıktılar (Dövme Tasarımı, Rapor)

export type ModuleExecutionStatus =
  | 'INPUTS_MISSING'         // Gerekli danışan verileri eksik
  | 'READY_TO_RUN'           // Girdiler hazır, hesaplama motoru çalıştırılabilir
  | 'COMPLETED';             // Hesaplandı ve sonuç arşivde kayıtlı

export interface ModuleDefinition {
  id: ModuleId;
  name: string;              // Türkçe Modül Adı
  category: ModuleCategory;
  description: string;
  requiredFields: (keyof Client)[]; // Danışan kaydında bulunması zorunlu alanlar
  requiresPreviousModule?: ModuleId[]; // Bu modülün çalışabilmesi için önceden tamamlanması gereken modüller
  statusLabelTr: Record<ModuleExecutionStatus, string>;
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  ASTROLOGY: {
    id: 'ASTROLOGY',
    name: 'Batı / Tropical Astroloji',
    category: 'COSMIC_FOUNDATION',
    description: 'Placidus ev sistemi, doğum haritası, gezegen konumları ve element dengesi.',
    requiredFields: ['birthDate', 'birthLocation'],
    statusLabelTr: {
      INPUTS_MISSING: 'Doğum ve Konum Bilgisi Gerekli',
      READY_TO_RUN: 'Hesaplamaya Hazır (Aşama 6)',
      COMPLETED: 'Astrolojik Harita Hesaplanmış',
    },
  },

  NUMEROLOGY: {
    id: 'NUMEROLOGY',
    name: 'Numeroloji Matrisi',
    category: 'COSMIC_FOUNDATION',
    description: 'Yaşam yolu sayısı, kader sayısı, ruh güdüsü ve doğum günü titreşimi.',
    requiredFields: ['firstName', 'lastName', 'birthDate'],
    statusLabelTr: {
      INPUTS_MISSING: 'Ad, Soyad ve Doğum Tarihi Gerekli',
      READY_TO_RUN: 'Hesaplamaya Hazır (Aşama 7)',
      COMPLETED: 'Numeroloji Analizi Tamamlanmış',
    },
  },

  EBCED: {
    id: 'EBCED',
    name: 'Ebced & Esma Rezonansı',
    category: 'COSMIC_FOUNDATION',
    description: 'Danışan ve anne adının kadim Ebced harf değeri ve esma frekansları.',
    requiredFields: ['firstName', 'motherName'],
    statusLabelTr: {
      INPUTS_MISSING: 'Danışan ve Anne Adı Gerekli',
      READY_TO_RUN: 'Hesaplamaya Hazır (Aşama 8)',
      COMPLETED: 'Ebced Değerleri Hesaplanmış',
    },
  },

  CHAKRA: {
    id: 'CHAKRA',
    name: 'Çakra Analizi',
    category: 'ENERGY_PSYCHOLOGY',
    description: '7 temel çakranın enerji akışı, blokajlar ve güçlendirici dövme unsurları.',
    requiredFields: ['birthDate'],
    statusLabelTr: {
      INPUTS_MISSING: 'Danışan Temel Verisi Gerekli',
      READY_TO_RUN: 'Hesaplamaya Hazır (Aşama 9)',
      COMPLETED: 'Çakra Dengesi Belirlenmiş',
    },
  },

  ARCHETYPE: {
    id: 'ARCHETYPE',
    name: 'Birleşik & Gölge Arketip',
    category: 'ENERGY_PSYCHOLOGY',
    description: 'Danışanın ana arketipi ve dövme ile dönüştürülecek gölge arketip dinamikleri.',
    requiredFields: ['firstName', 'birthDate'],
    statusLabelTr: {
      INPUTS_MISSING: 'Danışan Verisi Gerekli',
      READY_TO_RUN: 'Hesaplamaya Hazır (Aşama 10)',
      COMPLETED: 'Arketip Dinamikleri Tanımlanmış',
    },
  },

  TESTS: {
    id: 'TESTS',
    name: 'Enneagram & Hayvan Totemi',
    category: 'ENERGY_PSYCHOLOGY',
    description: 'Kişilik tipi test cevapları ve ruh hayvanı totem eşleşmeleri.',
    requiredFields: ['id'],
    statusLabelTr: {
      INPUTS_MISSING: 'Danışan Seçilmedi',
      READY_TO_RUN: 'Test Uygulanmaya Hazır (Aşama 11)',
      COMPLETED: 'Test Cevapları Kayıtlı',
    },
  },

  SYMBOLS: {
    id: 'SYMBOLS',
    name: 'Sembol Analizi & Kutsal Geometri',
    category: 'SYMBOLIC_COMPOSITION',
    description: 'Ezoterik semboller, astrolojik glifler ve dövme geometrisi seçkisi.',
    requiredFields: ['id'],
    statusLabelTr: {
      INPUTS_MISSING: 'Analiz Verileri Gerekli',
      READY_TO_RUN: 'Sembol Seçimine Hazır (Aşama 12)',
      COMPLETED: 'Semboller Seçildi ve Analiz Edildi',
    },
  },

  TATTOO_DESIGN: {
    id: 'TATTOO_DESIGN',
    name: 'Dövme Tasarım Tarifi & AI Prompt',
    category: 'TATTOO_MANIFESTATION',
    description: 'Stil, anatomik yerleşim, boyut, iğne teknikleri ve yapay zekâ promptları.',
    requiredFields: ['id'],
    statusLabelTr: {
      INPUTS_MISSING: 'Sembol ve Konsept Gerekli',
      READY_TO_RUN: 'Tasarım Oluşturulabilir (Aşama 13)',
      COMPLETED: 'Dövme Tarifi ve Prompt Hazır',
    },
  },

  REPORT: {
    id: 'REPORT',
    name: 'Kişiselleştirilmiş Rapor',
    category: 'TATTOO_MANIFESTATION',
    description: 'Tüm analizlerin, sembollerin ve dövme tarifinin birleştiği nihai rapor.',
    requiredFields: ['id'],
    statusLabelTr: {
      INPUTS_MISSING: 'Tasarım ve Analizler Tamamlanmalı',
      READY_TO_RUN: 'Rapor Oluşturulabilir (Aşama 14)',
      COMPLETED: 'Rapor Hazır',
    },
  },
};

/**
 * Bir danışanın belirli bir modül için gerekli alanlara sahip olup olmadığını doğrular.
 */
export function validateModuleInputs(client: Client, moduleId: ModuleId): { isReady: boolean; missingFields: string[] } {
  const def = MODULE_REGISTRY[moduleId];
  if (!def) return { isReady: false, missingFields: ['Bilinmeyen modül'] };

  const missing: string[] = [];

  for (const field of def.requiredFields) {
    const val = client[field];
    if (val === undefined || val === null || val === '') {
      missing.push(String(field));
    }
  }

  // Astroloji modülü için konumun gerçekten geçerli enlem ve boylam içermesini zorunlu kıl
  if (moduleId === 'ASTROLOGY') {
    const loc = client.birthLocation;
    const isLocInvalid =
      !loc ||
      typeof loc.latitude !== 'number' ||
      typeof loc.longitude !== 'number' ||
      isNaN(loc.latitude) ||
      isNaN(loc.longitude) ||
      (!loc.city && !loc.country && !loc.placeName);

    if (isLocInvalid && !missing.includes('birthLocation')) {
      missing.push('Geçerli Doğum Yeri Koordinatları');
    }
  }

  return {
    isReady: missing.length === 0,
    missingFields: missing,
  };
}
