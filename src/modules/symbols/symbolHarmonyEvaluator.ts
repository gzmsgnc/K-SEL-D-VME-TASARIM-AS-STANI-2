import {
  SymbolDefinition,
  SymbolRecommendationResult,
  SymbolCompositionRole,
} from './types';
import { ClientArchiveRecord } from '../../types/archive';

export interface SymbolDetailedRationale {
  symbolId: string;
  symbolName: string;
  whyRecommended: string;
  associatedModules: {
    module: string;
    target: string;
    rationaleTr: string;
  }[];
  conceptualAndGeometricAlignment: string;
  designRoleDescription: string;
  roleCategory: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  tattooDirectives: {
    recommendedScales: string[];
    needleStyle: string;
    placementSuggestions: string[];
  };
}

export interface CrossSymbolHarmonyReport {
  symbolCount: number;
  overallRating: 'EXCELLENT' | 'BALANCED' | 'COMPLEX' | 'TENSION_DETECTED';
  overallRatingLabelTr: string;
  overallSummaryTr: string;
  elementalInterplayTr: string;
  geometricInterplayTr: string;
  needleStyleSynergyTr: string;
  hierarchyEvaluationTr: string;
  focalConflictDetected: boolean;
  recommendedHierarchy: {
    primarySymbol?: { id: string; name: string; role: string };
    secondarySymbols: { id: string; name: string; role: string }[];
    accentSymbols: { id: string; name: string; role: string }[];
  };
  warningsAndCautions: string[];
}

/**
 * Mevcut compositionRole alanına göre tasarım rolünü açıklar.
 * Yeni ağırlık algoritması oluşturmaz; mevcut veriyle tam uyumlu çalışır.
 */
export function getDesignRoleDescription(role: SymbolCompositionRole | string): {
  roleCategory: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  titleTr: string;
  descriptionTr: string;
} {
  switch (role) {
    case 'PRIMARY_CORE':
      return {
        roleCategory: 'PRIMARY',
        titleTr: 'Birincil Odak (%65 Pozitif Alan)',
        descriptionTr: 'Tasarımın görsel omurgasını ve ana merkezini oluşturur. Dövmenin ilk bakışta algılanan temel taşıyıcı formudur.',
      };
    case 'SECONDARY_LAYER':
      return {
        roleCategory: 'SECONDARY',
        titleTr: 'İkincil Destek (%35 Çevre Katmanı)',
        descriptionTr: 'Ana sembolü çevreleyerek denge ve kompozisyon derinliği katar; odak figürün etkisini destekler.',
      };
    case 'CONNECTIVE_FLOW':
      return {
        roleCategory: 'SECONDARY',
        titleTr: 'İkincil Destek (Akış Hattı)',
        descriptionTr: 'Anatomik hatlar ve kas yönelimleriyle uyumlu dinamik akış oluşturarak semboller arası geçiş köprüsü kurar.',
      };
    case 'BACKGROUND_FRAME':
      return {
        roleCategory: 'SECONDARY',
        titleTr: 'İkincil Destek (Arka Plan Çerçevesi)',
        descriptionTr: 'Negatif alan ile pozitif alan arasında estetik bir sınır oluşturur ve kompozisyonu dıştan çerçeveler.',
      };
    case 'ACCENT_DETAIL':
    default:
      return {
        roleCategory: 'ACCENT',
        titleTr: 'Vurgu / Tamamlayıcı Unsur',
        descriptionTr: 'Mikro detay, bitiş noktası veya geçiş zarafeti katar; ana görsel yapıyı boğmadan anlamı zenginleştirir.',
      };
  }
}

/**
 * Önerilen her sembol için mevcut analiz verilerine ve sembolün gerçek özelliklerine
 * dayalı zengin, tutarlı ve veri odaklı gerekçe katmanı üretir.
 */
export function evaluateSymbolRationale(
  rec: SymbolRecommendationResult,
  archive?: ClientArchiveRecord | null
): SymbolDetailedRationale {
  const sym = rec.symbol;
  const roleInfo = getDesignRoleDescription(sym.compositionRole);

  // 1. İlgili modüller ve gerekçeleri
  const associatedModules: SymbolDetailedRationale['associatedModules'] = [];

  // Doğrudan öneri motorunun gerekçesi
  associatedModules.push({
    module: rec.sourceModule,
    target: `${rec.matchingScore} Rezonans Puanı`,
    rationaleTr: rec.reasonTr,
  });

  // Sembolün kendi metadata associations listesinden gerçek analiz bağlantılarını al
  if (sym.analysisAssociations && sym.analysisAssociations.length > 0) {
    for (const assoc of sym.analysisAssociations) {
      if (assoc.module !== rec.sourceModule) {
        associatedModules.push({
          module: assoc.module,
          target: assoc.target,
          rationaleTr: assoc.rationaleTr,
        });
      }
    }
  }

  // 2. Neden Önerildi açıklaması (genel şablon değil, sembolün gerçek verisine dayalı)
  const whyRecommended = `Bu sembol, danışanın ${rec.sourceModule} analiz çıktısıyla (${rec.reasonTr}) güçlü bir kavramsal rezonans kurduğu için önerilmiştir. Kökeni (${sym.originCulture}) ve temsil ettiği element (${sym.elementAssociation}) danışanın içsel dengesini destekleyecek niteliktedir.`;

  // 3. Kavramsal ve Geometrik Uyum
  const conceptualAndGeometricAlignment = `${sym.name}, ${sym.geometricStructureTr || sym.visualDescriptionTr} Geometrik yapısı ve ${sym.esotericMeaningTr || sym.meaning} derin anlamı, danışanın tasarım hedefleriyle birebir örtüşmektedir.`;

  return {
    symbolId: sym.id,
    symbolName: sym.name,
    whyRecommended,
    associatedModules,
    conceptualAndGeometricAlignment,
    designRoleDescription: `${roleInfo.titleTr} — ${roleInfo.descriptionTr}`,
    roleCategory: roleInfo.roleCategory,
    tattooDirectives: {
      recommendedScales: sym.tattooSuitability?.recommendedScales || ['MEDIUM'],
      needleStyle: sym.tattooSuitability?.needleStyle || 'FINE_LINE',
      placementSuggestions: sym.tattooSuitability?.placementSuggestions || [],
    },
  };
}

/**
 * Birden fazla sembol önerildiğinde veya seçildiğinde aralarındaki kompozisyonel uyumu,
 * baskınlık çatışmasını ve tasarım hiyerarşisini değerlendirir.
 * Yapay olumlu yorum üretmez; uyumsuzluk varsa açıkça uyarır.
 */
export function evaluateCrossSymbolHarmony(
  recommendations: SymbolRecommendationResult[]
): CrossSymbolHarmonyReport {
  const symbolCount = recommendations.length;

  if (symbolCount === 0) {
    return {
      symbolCount: 0,
      overallRating: 'BALANCED',
      overallRatingLabelTr: 'Sembol Yok',
      overallSummaryTr: 'Henüz değerlendirilecek sembol önerisi bulunmamaktadır.',
      elementalInterplayTr: 'Belirtilmedi.',
      geometricInterplayTr: 'Belirtilmedi.',
      needleStyleSynergyTr: 'Belirtilmedi.',
      hierarchyEvaluationTr: 'Belirtilmedi.',
      focalConflictDetected: false,
      recommendedHierarchy: {
        secondarySymbols: [],
        accentSymbols: [],
      },
      warningsAndCautions: [],
    };
  }

  if (symbolCount === 1) {
    const single = recommendations[0];
    const roleInfo = getDesignRoleDescription(single.symbol.compositionRole);
    return {
      symbolCount: 1,
      overallRating: 'EXCELLENT',
      overallRatingLabelTr: 'Mükemmel Tekil Odak',
      overallSummaryTr: `${single.symbol.name} tekil olarak seçilmiş olup, kompozisyonda ${roleInfo.titleTr} olarak konumlandırılmaya tam uygundur. Herhangi bir görsel rekabet bulunmamaktadır.`,
      elementalInterplayTr: `${single.symbol.name} sembolü ${single.symbol.elementAssociation} elementini temsil etmektedir.`,
      geometricInterplayTr: `${single.symbol.name} kendi geometrisi içinde tutarlı ve yalındır.`,
      needleStyleSynergyTr: `Önerilen teknik: ${single.symbol.tattooSuitability?.needleStyle || 'FINE_LINE'}.`,
      hierarchyEvaluationTr: `${single.symbol.name} ana odak olarak tek başına kompozisyonu taşır.`,
      focalConflictDetected: false,
      recommendedHierarchy: {
        primarySymbol: { id: single.symbol.id, name: single.symbol.name, role: roleInfo.titleTr },
        secondarySymbols: [],
        accentSymbols: [],
      },
      warningsAndCautions: [],
    };
  }

  const warningsAndCautions: string[] = [];

  // 1. Odak Çatışması Değerlendirmesi
  // Eğer birden fazla PRIMARY_CORE sembol varsa, ikisi de %65 odak olamaz; görsel rekabet doğar!
  const primaryCores = recommendations.filter((r) => r.symbol.compositionRole === 'PRIMARY_CORE');
  let focalConflictDetected = false;

  if (primaryCores.length > 1) {
    focalConflictDetected = true;
    const names = primaryCores.map((p) => p.symbol.name).join(' ve ');
    warningsAndCautions.push(
      `Görsel Odak Rekabeti Uyarısı: ${names} sembollerinin her ikisi de "Birincil Odak" (PRIMARY_CORE) niteliğindedir. Aynı dövmede iki ayrı odak görsel karmaşa oluşturur. Biri %65 ana merkez olarak tutulmalı, diğeri %35 ikincil katmana veya küçültülmüş çevre desteğine dönüştürülmelidir.`
    );
  }

  // 2. Element Etkileşimi Değerlendirmesi
  const elements = Array.from(new Set(recommendations.map((r) => r.symbol.elementAssociation.toLowerCase())));
  let elementalInterplayTr = '';

  const hasFire = elements.some((e) => e.includes('ateş') || e.includes('isik'));
  const hasWater = elements.some((e) => e.includes('su'));
  const hasEarth = elements.some((e) => e.includes('toprak'));
  const hasAir = elements.some((e) => e.includes('hava') || e.includes('eter'));

  if (hasFire && hasWater) {
    elementalInterplayTr = 'Ateş ve Su elementleri zıt kutup dinamizmi taşır. Kompozisyonda birbirlerini baskılamamaları veya enerjiyi söndürmemeleri için aralarında belirgin bir negatif alan (boşluk tamponu) bırakılmalıdır.';
  } else if (hasEarth && hasWater) {
    elementalInterplayTr = 'Toprak ve Su elementleri yüksek organik besleyiciliğe sahiptir. Köklenme ve akış bir arada estetik ve yumuşak bir kompozisyon dengesi sunar.';
  } else if (hasAir && (hasEarth || hasWater)) {
    elementalInterplayTr = 'Hava elementi, daha yoğun formları (Toprak/Su) hafifleterek kompozisyona ferahlık ve nefes alanı katar.';
  } else if (elements.length === 1) {
    elementalInterplayTr = `Tüm semboller ${elements[0]} elementinde buluşmaktadır; bu durum kompozisyonda tematik ve estetik bir bütünlük sağlar.`;
  } else {
    elementalInterplayTr = `Semboller ${elements.join(', ')} elementlerini barındırmaktadır; katmanlar arasında element dengesi korunmalıdır.`;
  }

  // 3. Geometrik Biçim Uyumu
  const geometries = Array.from(new Set(recommendations.map((r) => r.symbol.geometryType)));
  let geometricInterplayTr = '';

  const hasSacred = geometries.includes('SACRED_GEOMETRY');
  const hasMinimal = geometries.includes('ABSTRACT_MINIMAL');
  const hasOrganic = geometries.includes('ORGANIC_NATURAL');
  const hasGlyphic = geometries.includes('ANCIENT_GLYPHIC');

  const sacredCount = recommendations.filter((r) => r.symbol.geometryType === 'SACRED_GEOMETRY').length;
  if (sacredCount > 1) {
    warningsAndCautions.push(
      'Çoklu Kutsal Geometri Uyarısı: Birden fazla karmaşık kutsal geometri (örn. Metatron ve Sri Yantra gibi) aynı düzlemde yer aldığında gözü yorabilir. Biri ana çizim olarak korunmalı, diğeri sadeleştirilmelidir.'
    );
  }

  if (hasSacred && hasMinimal) {
    geometricInterplayTr = 'Kutsal geometrinin karmaşık fraktal hatları ile soyut minimal çizgiler yüksek estetik kontrast ve denge oluşturur; gözü yormaz.';
  } else if (hasSacred && hasOrganic) {
    geometricInterplayTr = 'Kutsal geometrinin kusursuz matematiksel simetrisi, organik dalga veya çiçek formlarıyla yumuşatılarak bedenin anatomik kıvrımlarına kusursuz oturur.';
  } else if (hasGlyphic && hasMinimal) {
    geometricInterplayTr = 'Kadim gliflerin mühür karakteri, minimalist tek iğne çizgileriyle çağdaş ve asil bir görünüm kazanır.';
  } else if (geometries.length === 1) {
    geometricInterplayTr = `Tüm semboller ${geometries[0]} sınıfındadır; stilistik dil birliği yüksektir.`;
  } else {
    geometricInterplayTr = 'Semboller farklı geometrik sınıflardadır; tasarımda birbirine karışmadan belirgin kademelerle ayrıştırılmaları tavsiye edilir.';
  }

  // 4. İğne ve Uygulama Tekniği Uyumu
  const needleStyles = Array.from(new Set(recommendations.map((r) => r.symbol.tattooSuitability?.needleStyle).filter(Boolean)));
  let needleStyleSynergyTr = '';

  if (needleStyles.length === 1) {
    needleStyleSynergyTr = `Tüm semboller ${needleStyles[0]} tekniğiyle uygulanabilir; tek tip iğne konfigürasyonu işleme sürecinde yüksek tutarlılık sağlar.`;
  } else if (needleStyles.includes('FINE_LINE') && needleStyles.includes('DOTWORK')) {
    needleStyleSynergyTr = 'İnce çizgi (Fine Line) konturları ile noktalı gölgelendirme (Dotwork) tekniklerinin birleşimi, kompozisyona derinlikli ve ışık-gölge dengeli 3 boyutlu bir his kazandırır.';
  } else {
    needleStyleSynergyTr = `Farklı teknikler (${needleStyles.join(' + ')}) gerekmektedir; sanatçının iğne geçişlerini ve tonlama kademelerini özenle planlaması gerekir.`;
  }

  // 5. Önerilen Hiyerarşik Sıralama
  // En yüksek puanlı ve PRIMARY_CORE olan sembol ana odak yapılır; diğerleri ikincil ve aksan olur
  const sortedByScore = [...recommendations].sort((a, b) => b.matchingScore - a.matchingScore);
  const primaryCandidate = sortedByScore.find((r) => r.symbol.compositionRole === 'PRIMARY_CORE') || sortedByScore[0];

  const secondaryCandidates: { id: string; name: string; role: string }[] = [];
  const accentCandidates: { id: string; name: string; role: string }[] = [];

  for (const rec of sortedByScore) {
    if (rec.symbol.id === primaryCandidate.symbol.id) continue;
    const roleInfo = getDesignRoleDescription(rec.symbol.compositionRole);
    if (roleInfo.roleCategory === 'ACCENT') {
      accentCandidates.push({ id: rec.symbol.id, name: rec.symbol.name, role: roleInfo.titleTr });
    } else {
      secondaryCandidates.push({ id: rec.symbol.id, name: rec.symbol.name, role: roleInfo.titleTr });
    }
  }

  const hierarchyEvaluationTr = `Önerilen tasarım hiyerarşisi: Ana odak (${primaryCandidate.symbol.name}), ${secondaryCandidates.length > 0 ? `ikincil destek (${secondaryCandidates.map((s) => s.name).join(', ')})` : 'doğrudan aksanlar'} ve ${accentCandidates.length > 0 ? `mikro vurgular (${accentCandidates.map((s) => s.name).join(', ')})` : 'yalın bitiş'} şeklinde katmanlandırılmalıdır.`;

  // 6. Genel Değerlendirme Derecesi
  let overallRating: CrossSymbolHarmonyReport['overallRating'] = 'BALANCED';
  let overallRatingLabelTr = 'Dengeli Kompozisyon';
  let overallSummaryTr = '';

  if (focalConflictDetected) {
    overallRating = 'TENSION_DETECTED';
    overallRatingLabelTr = 'Odak Çatışması Uyarısı';
    overallSummaryTr = 'Önerilen semboller arasında çoklu birincil odak tespiti yapılmıştır. Sanatçının hiyerarşik ağırlıkları netleştirmesi gereklidir.';
  } else if (sacredCount > 1) {
    overallRating = 'COMPLEX';
    overallRatingLabelTr = 'Karmaşık Çok Katmanlı';
    overallSummaryTr = 'Semboller yüksek detay yoğunluğuna sahiptir; kompozisyonun nefes alabilmesi için geniş anatomik alan (sırt, göğüs veya uyluk) seçilmelidir.';
  } else if (needleStyles.length <= 2 && !focalConflictDetected) {
    overallRating = 'EXCELLENT';
    overallRatingLabelTr = 'Yüksek Sinerji ve Uyum';
    overallSummaryTr = 'Önerilen semboller geometrik hiyerarşi, element dengesi ve dövme uygulama standartları açısından mükemmel bir kompozisyon sinerjisine sahiptir.';
  } else {
    overallRating = 'BALANCED';
    overallRatingLabelTr = 'Dengeli Standart Uyum';
    overallSummaryTr = 'Semboller birbirini tamamlayacak niteliktedir; tasarım hiyerarşisi kurallarına uyularak işlenmelidir.';
  }

  return {
    symbolCount,
    overallRating,
    overallRatingLabelTr,
    overallSummaryTr,
    elementalInterplayTr,
    geometricInterplayTr,
    needleStyleSynergyTr,
    hierarchyEvaluationTr,
    focalConflictDetected,
    recommendedHierarchy: {
      primarySymbol: {
        id: primaryCandidate.symbol.id,
        name: primaryCandidate.symbol.name,
        role: getDesignRoleDescription(primaryCandidate.symbol.compositionRole).titleTr,
      },
      secondarySymbols: secondaryCandidates,
      accentSymbols: accentCandidates,
    },
    warningsAndCautions,
  };
}
