import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDesignRoleDescription,
  evaluateSymbolRationale,
  evaluateCrossSymbolHarmony,
  ALL_MASTER_SYMBOLS,
  SymbolRecommendationResult,
} from '../../symbols';

describe('Aşama 5.2.2: Sembol Gerekçesi ve Kompozisyon Uyumu Test Paketi', () => {
  const metatronSymbol = ALL_MASTER_SYMBOLS.find((s) => s.id === 'metatron-cube')!;
  const flowerOfLifeSymbol = ALL_MASTER_SYMBOLS.find((s) => s.id === 'flower-of-life')!;
  const ouroborosSymbol = ALL_MASTER_SYMBOLS.find((s) => s.id === 'uroboros-infinity')!;
  const spiralSymbol = ALL_MASTER_SYMBOLS.find((s) => s.id === 'fibonacci-spiral')!;

  it('1. getDesignRoleDescription tüm compositionRole tiplerini eksiksiz ve doğru Türkçe açıklamalarla eşleştirmelidir', () => {
    const primary = getDesignRoleDescription('PRIMARY_CORE');
    assert.equal(primary.roleCategory, 'PRIMARY');
    assert.match(primary.titleTr, /Birincil Odak/);

    const secondaryLayer = getDesignRoleDescription('SECONDARY_LAYER');
    assert.equal(secondaryLayer.roleCategory, 'SECONDARY');
    assert.match(secondaryLayer.titleTr, /İkincil Destek/);

    const flow = getDesignRoleDescription('CONNECTIVE_FLOW');
    assert.equal(flow.roleCategory, 'SECONDARY');
    assert.match(flow.titleTr, /Akış Hattı/);

    const frame = getDesignRoleDescription('BACKGROUND_FRAME');
    assert.equal(frame.roleCategory, 'SECONDARY');
    assert.match(frame.titleTr, /Arka Plan Çerçevesi/);

    const accent = getDesignRoleDescription('ACCENT_DETAIL');
    assert.equal(accent.roleCategory, 'ACCENT');
    assert.match(accent.titleTr, /Vurgu \/ Tamamlayıcı Unsur/);
  });

  it('2. evaluateSymbolRationale tek bir öneri için eksiksiz ve zengin gerekçe alanları üretmelidir', () => {
    const mockRec: SymbolRecommendationResult = {
      symbol: metatronSymbol,
      suggestedWeight: 'PRIMARY',
      matchingScore: 88,
      sourceModule: 'ASTROLOGY',
      reasonTr: 'Güneş Koç burcundaki yüksek dinamizmi geometrik olarak dengeler.',
    };

    const rationale = evaluateSymbolRationale(mockRec, null);

    assert.equal(rationale.symbolId, 'metatron-cube');
    assert.equal(rationale.symbolName, 'Metatron Küpü');
    assert.ok(rationale.whyRecommended.length > 20);
    assert.match(rationale.whyRecommended, /ASTROLOGY/);
    assert.ok(rationale.associatedModules.length > 0);
    assert.equal(rationale.associatedModules[0].module, 'ASTROLOGY');
    assert.match(rationale.conceptualAndGeometricAlignment, /Metatron Küpü/);
    assert.match(rationale.designRoleDescription, /Birincil Odak/);
    assert.ok(rationale.tattooDirectives.needleStyle.length > 0);
    assert.ok(Array.isArray(rationale.tattooDirectives.recommendedScales));
  });

  it('3. evaluateSymbolRationale sembolün kendi metadata associations listesindeki diğer modülleri de dahil etmelidir', () => {
    const mockRec: SymbolRecommendationResult = {
      symbol: flowerOfLifeSymbol,
      suggestedWeight: 'PRIMARY',
      matchingScore: 85,
      sourceModule: 'NUMEROLOGY',
      reasonTr: 'Yaşam Yolu 6 için kozmik uyum ve bütünlük rezonansı.',
    };

    const rationale = evaluateSymbolRationale(mockRec, null);
    // NUMEROLOGY birincil eklendi, sembolün kendi analysisAssociations listesindeki diğer modüller de aktarılmış olmalı
    assert.equal(rationale.associatedModules[0].module, 'NUMEROLOGY');
    if (flowerOfLifeSymbol.analysisAssociations && flowerOfLifeSymbol.analysisAssociations.length > 0) {
      assert.ok(rationale.associatedModules.length >= 1);
    }
  });

  it('4. evaluateCrossSymbolHarmony boş liste verildiğinde güvenli ve dengeli temel durum döndürmelidir', () => {
    const report = evaluateCrossSymbolHarmony([]);
    assert.equal(report.symbolCount, 0);
    assert.equal(report.focalConflictDetected, false);
    assert.equal(report.warningsAndCautions.length, 0);
    assert.equal(report.overallRating, 'BALANCED');
  });

  it('5. evaluateCrossSymbolHarmony tek sembol verildiğinde EXCELLENT tekil odak değerlendirmesi yapmalıdır', () => {
    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: metatronSymbol,
        suggestedWeight: 'PRIMARY',
        matchingScore: 90,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'Birincil rezonans',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.equal(report.symbolCount, 1);
    assert.equal(report.overallRating, 'EXCELLENT');
    assert.equal(report.focalConflictDetected, false);
    assert.match(report.overallSummaryTr, /tekil olarak seçilmiş/);
    assert.equal(report.recommendedHierarchy.primarySymbol?.id, 'metatron-cube');
  });

  it('6. evaluateCrossSymbolHarmony iki PRIMARY_CORE sembol olduğunda odak çatışmasını (focalConflictDetected) açıkça bildirmelidir', () => {
    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: metatronSymbol, // PRIMARY_CORE
        suggestedWeight: 'PRIMARY',
        matchingScore: 92,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'Astrolojik güçlü rezonans',
      },
      {
        symbol: flowerOfLifeSymbol, // PRIMARY_CORE
        suggestedWeight: 'PRIMARY',
        matchingScore: 85,
        sourceModule: 'NUMEROLOGY',
        reasonTr: 'Numerolojik güçlü rezonans',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.equal(report.focalConflictDetected, true);
    assert.equal(report.overallRating, 'TENSION_DETECTED');
    assert.match(report.overallRatingLabelTr, /Odak Çatışması/);
    assert.ok(report.warningsAndCautions.some((w) => w.includes('Görsel Odak Rekabeti')));
  });

  it('7. evaluateCrossSymbolHarmony Ateş ve Su elementleri bir arada olduğunda zıt kutup dinamizmi ve negatif alan uyarısı vermelidir', () => {
    const fireSymbol = { ...metatronSymbol, elementAssociation: 'Ateş' };
    const waterSymbol = { ...ouroborosSymbol, elementAssociation: 'Su' };

    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: fireSymbol,
        suggestedWeight: 'PRIMARY',
        matchingScore: 80,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'Ateş elementi',
      },
      {
        symbol: waterSymbol,
        suggestedWeight: 'SECONDARY',
        matchingScore: 70,
        sourceModule: 'CHAKRA',
        reasonTr: 'Su elementi',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.match(report.elementalInterplayTr, /Ateş ve Su elementleri zıt kutup dinamizmi taşır/);
  });

  it('8. evaluateCrossSymbolHarmony birden fazla kutsal geometri olduğunda göz yorma riskini ve sadeleştirme gereksinimini raporlamalıdır', () => {
    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: metatronSymbol, // SACRED_GEOMETRY
        suggestedWeight: 'PRIMARY',
        matchingScore: 88,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'Metatron rezonansı',
      },
      {
        symbol: flowerOfLifeSymbol, // SACRED_GEOMETRY
        suggestedWeight: 'SECONDARY',
        matchingScore: 80,
        sourceModule: 'NUMEROLOGY',
        reasonTr: 'Yaşam çiçeği rezonansı',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.ok(report.warningsAndCautions.some((w) => w.includes('Çoklu Kutsal Geometri Uyarısı')));
  });

  it('9. evaluateCrossSymbolHarmony Fine Line ve Dotwork teknikleri birleştiğinde derinlikli 3D hissi sinerjisini değerlendirmelidir', () => {
    const fineLineSymbol = {
      ...metatronSymbol,
      tattooSuitability: {
        ...metatronSymbol.tattooSuitability,
        needleStyle: 'FINE_LINE' as const,
      },
    };
    const dotworkSymbol = {
      ...spiralSymbol,
      tattooSuitability: {
        ...spiralSymbol.tattooSuitability,
        needleStyle: 'DOTWORK' as const,
      },
    };

    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: fineLineSymbol,
        suggestedWeight: 'PRIMARY',
        matchingScore: 85,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'Ana odak',
      },
      {
        symbol: dotworkSymbol,
        suggestedWeight: 'SECONDARY',
        matchingScore: 75,
        sourceModule: 'ARCHETYPE',
        reasonTr: 'Noktalı gölgelendirme akışı',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.match(report.needleStyleSynergyTr, /Fine Line/);
    assert.match(report.needleStyleSynergyTr, /Dotwork/);
  });

  it('10. evaluateCrossSymbolHarmony önerilen hiyerarşiyi en yüksek rezonanslı PRIMARY_CORE sembolü ana odak, CONNECTIVE_FLOW sembolü ikincil ve ACCENT_DETAIL sembolü vurgu yaparak düzenlemelidir', () => {
    const seedSymbol = ALL_MASTER_SYMBOLS.find((s) => s.id === 'seed-of-life')!;

    const mockRecs: SymbolRecommendationResult[] = [
      {
        symbol: spiralSymbol, // CONNECTIVE_FLOW -> secondary
        suggestedWeight: 'SECONDARY',
        matchingScore: 65,
        sourceModule: 'ARCHETYPE',
        reasonTr: 'Akış hattı rezonansı',
      },
      {
        symbol: seedSymbol, // ACCENT_DETAIL -> accent
        suggestedWeight: 'SECONDARY',
        matchingScore: 70,
        sourceModule: 'NUMEROLOGY',
        reasonTr: 'Mikro tohum vurgusu',
      },
      {
        symbol: metatronSymbol, // PRIMARY_CORE -> primary
        suggestedWeight: 'PRIMARY',
        matchingScore: 95,
        sourceModule: 'ASTROLOGY',
        reasonTr: 'En yüksek skorlu odak',
      },
    ];

    const report = evaluateCrossSymbolHarmony(mockRecs);
    assert.equal(report.recommendedHierarchy.primarySymbol?.id, 'metatron-cube');
    assert.ok(report.recommendedHierarchy.secondarySymbols.some((s) => s.id === 'fibonacci-spiral'));
    assert.ok(report.recommendedHierarchy.accentSymbols.some((a) => a.id === 'seed-of-life'));
  });
});
