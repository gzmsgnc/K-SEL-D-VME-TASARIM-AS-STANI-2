import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateUnifiedVisualPrompt } from '../../symbols/visualPromptEngine';
import { TattooRecipe } from '../../../types/design';

function createSampleRecipe(overrides: Partial<TattooRecipe> = {}): TattooRecipe {
  return {
    primarySymbol: 'Yaşam Çiçeği',
    secondarySymbols: ['Metatron Küpü', 'Triskele'],
    style: 'SACRED_GEOMETRY',
    recommendedPlacement: 'FOREARM_INNER',
    colorProfile: 'MONOCHROME_BLACK',
    recommendedDimensionsCm: { width: 14, height: 22 },
    compositionMetrics: {
      primaryFocusWeightPercent: 65,
      secondaryLayerWeightPercent: 35,
      negativeSpaceTargetPercentMin: 45,
      negativeSpaceTargetPercentMax: 50,
      minLineSpacingMm: 1.5,
      idealLineSpacingMm: 2.0,
      idealDimensionsCm: { width: 14, height: 22 },
      minDimensionsCm: { width: 10, height: 16 },
      areaDefinitionTr: 'Pozitif alanda %65 ana odak, %35 ikincil katman, %45-50 negatif alan.',
    },
    placementDescription: 'İç ön kol anatomik dikey akışı',
    keyComponents: ['Yaşam Çiçeği ana form', 'Metatron Küpü çerçevesi'],
    technicalAdviceForArtist: [
      'Merkezi form kol eksenine hizalanmalıdır.',
      'Minimum 1.5 mm çizgi aralığı korunmalıdır.',
    ],
    artistVisualDirection: [
      'Merkezi form kol eksenine hizalanmalıdır.',
      'Minimum 1.5 mm çizgi aralığı korunmalıdır.',
    ],
    excludedElements: [],
    ...overrides,
  };
}

describe('AŞAMA 5.4.0.1 — Totem Sembollerinin Tamamen Soyut Geometrik Karşılığa Dönüştürülmesi Testleri', () => {
  const baseInput = {
    clientId: 'client-totem-abstract-001',
    clientFullName: 'Murat Yılmaz',
    motherName: 'Ayşe',
    recipe: createSampleRecipe(),
    selectedSymbols: [
      {
        symbolId: 'flower-of-life',
        symbolName: 'Yaşam Çiçeği',
        weight: 'PRIMARY' as const,
        customMeaning: 'İçsel denge ve kutsal geometri',
      },
    ],
    recommendedSymbols: [],
    excludedSymbols: ['Kafatası', 'Hançer'],
  };

  const allTotemCases: Array<{
    animalTr: string;
    englishTerms: string[];
    turkishTerms: string[];
    expectedAbstractMotif: string;
  }> = [
    {
      animalTr: 'Kurt',
      englishTerms: ['wolf'],
      turkishTerms: ['kurt'],
      expectedAbstractMotif: 'protective geometric boundary shield lattice with interlocking angle vectors',
    },
    {
      animalTr: 'Şahin',
      englishTerms: ['hawk', 'falcon'],
      turkishTerms: ['şahin', 'sahin'],
      expectedAbstractMotif: 'ascending celestial chevron vectors and sharp radial perspective line geometry',
    },
    {
      animalTr: 'Kartal',
      englishTerms: ['eagle'],
      turkishTerms: ['kartal'],
      expectedAbstractMotif: 'ascending celestial vector rays and expansive solar geometric lattice',
    },
    {
      animalTr: 'Baykuş',
      englishTerms: ['owl'],
      turkishTerms: ['baykuş', 'baykus'],
      expectedAbstractMotif: 'concentric focal perception rings with intersecting aperture geometry',
    },
    {
      animalTr: 'Jaguar',
      englishTerms: ['jaguar'],
      turkishTerms: ['jaguar'],
      expectedAbstractMotif: 'alchemical dynamic triangular energy vectors and interlocking sharp geometric lines',
    },
    {
      animalTr: 'Ayı',
      englishTerms: ['bear'],
      turkishTerms: ['ayı', 'ayi'],
      expectedAbstractMotif: 'rooted vertical foundation pillar lattice and solid grounding geometric matrix',
    },
    {
      animalTr: 'Yılan',
      englishTerms: ['snake', 'serpent'],
      turkishTerms: ['yılan', 'yilan'],
      expectedAbstractMotif: 'concentric interlocking circular renewal loops and infinite cyclical vortex geometry',
    },
    {
      animalTr: 'Geyik',
      englishTerms: ['deer', 'stag'],
      turkishTerms: ['geyik'],
      expectedAbstractMotif: 'delicate harmonious radial curve motifs and balance-centered organic lines',
    },
    {
      animalTr: 'Yunus',
      englishTerms: ['dolphin'],
      turkishTerms: ['yunus'],
      expectedAbstractMotif: 'rhythmic flowing wave curves and fluid sinusoidal sacred line geometry',
    },
  ];

  describe('1. Tüm 9 Totem Hayvanı İçin Sıfır Hayvan Adı ve Saf Soyut Geometrik Karşılık Doğrulaması', () => {
    for (const item of allTotemCases) {
      test(`${item.animalTr} totemi için: Hayvan adı ve silüeti yok, sadece '${item.expectedAbstractMotif.slice(0, 30)}...' soyut motifi var`, () => {
        const output = generateUnifiedVisualPrompt({
          ...baseInput,
          includeTotemInVisual: true,
          totemName: item.animalTr,
        });

        const promptEn = output.primaryPromptEn;
        const positivePromptPart = promptEn.split('--no')[0];
        const positiveLower = positivePromptPart.toLowerCase();
        const entirePromptLower = promptEn.toLowerCase();
        const negPrompt = output.negativePrompt.toLowerCase();

        // 1. Pozitif promptta ve tüm promptta hayvan adı kesinlikle bulunmamalı
        for (const term of [...item.englishTerms, ...item.turkishTerms]) {
          assert.strictEqual(
            entirePromptLower.includes(term.toLowerCase()),
            false,
            `Promptta hayvan adı '${term}' bulunamaz! (Bulunan prompt: ${promptEn})`
          );
        }

        // 2. Pozitif promptta hayvan silüeti, adı veya anatomisi tarif edilmemeli
        assert.strictEqual(
          entirePromptLower.includes('silhouette'),
          false,
          'Promptta silhouette ifadesi bulunamaz.'
        );
        assert.strictEqual(
          positiveLower.includes('animal'),
          false,
          'Pozitif tasarım tarifinde animal sözcüğü bulunamaz.'
        );
        assert.strictEqual(
          /\b(head|wing|wings|tail|tails|body|beak|paw|paws)\b/i.test(positiveLower),
          false,
          'Pozitif promptta hayvan anatomisi (head, wing, tail, body, beak, paw) bulunamaz.'
        );

        // 3. Negatif promptta hayvan adı veya türü bulunmamalı (APIye hiçbir hayvan adı aktarılmaz)
        for (const term of [...item.englishTerms, ...item.turkishTerms]) {
          assert.strictEqual(
            negPrompt.includes(term.toLowerCase()),
            false,
            `Negatif promptta hayvan adı '${term}' bulunamaz!`
          );
        }

        // 4. Soyut geometrik karşılık pozitif promptta eksiksiz yer almalı
        assert.ok(
          promptEn.includes(item.expectedAbstractMotif),
          `${item.animalTr} için beklenen soyut motif ('${item.expectedAbstractMotif}') pozitif promptta bulunmalıdır.`
        );

        // 5. Genel negatif filtreler (realistic animal face, realistic animal head) korunmalıdır
        assert.ok(
          negPrompt.includes('realistic animal face') && negPrompt.includes('realistic animal head'),
          'Genel realist hayvan başı ve yüzü yasağı negatif filtrelerde korunmalıdır.'
        );
      });
    }
  });

  describe('2. Güvenli Karşılık Bulunamayan Totemler İçin Fallback Güvenliği', () => {
    test('Tanımlı olmayan veya bilinmeyen totem verildiğinde hayvan figürü çizilmez, öğe dışarıda bırakılır', () => {
      const output = generateUnifiedVisualPrompt({
        ...baseInput,
        includeTotemInVisual: true,
        totemName: 'Panda',
      });

      const promptEn = output.primaryPromptEn;
      const negPrompt = output.negativePrompt.toLowerCase();

      assert.strictEqual(
        promptEn.toLowerCase().includes('panda'),
        false,
        'Bilinmeyen totem pozitif prompta eklenemez.'
      );
      assert.strictEqual(
        promptEn.toLowerCase().includes('silhouette'),
        false,
        'Silüet ifadesi bulunamaz.'
      );
      assert.strictEqual(
        negPrompt.includes('panda'),
        false,
        'Negatif prompta da eklenemez.'
      );

      // Ana tasarım bozulmadan üretilmelidir
      assert.ok(promptEn.includes('Yaşam Çiçeği'));
      assert.ok(promptEn.includes('pure solid white background'));
    });
  });

  describe('3. Totem Verisi Bulunmadığında Mevcut Üretim Davranışının Korunması', () => {
    test('includeTotemInVisual = false iken prompt hatasız üretilmeli ve hiçbir hayvan bilgisi sızmamalıdır', () => {
      const output = generateUnifiedVisualPrompt({
        ...baseInput,
        includeTotemInVisual: false,
        totemName: 'Kartal',
      });

      assert.strictEqual(
        output.primaryPromptEn.toLowerCase().includes('kartal') ||
          output.primaryPromptEn.toLowerCase().includes('eagle'),
        false,
        'Dahil edilmeyen totem pozitif promptta yer alamaz.'
      );
      assert.strictEqual(
        output.conceptPromptTr.toLowerCase().includes('kartal'),
        false,
        'Dahil edilmeyen totem Türkçe konseptte yer alamaz.'
      );
      assert.strictEqual(
        output.negativePrompt.toLowerCase().includes('kartal') ||
          output.negativePrompt.toLowerCase().includes('eagle'),
        false,
        'Dahil edilmeyen totem negatif promptta da hayvan adı olarak yer alamaz.'
      );
      assert.ok(output.primaryPromptEn.includes('Yaşam Çiçeği'));
    });

    test('totemName hiç tanımlı değilken de prompt üretimi kusursuz çalışmalıdır', () => {
      const output = generateUnifiedVisualPrompt({
        ...baseInput,
        includeTotemInVisual: false,
        totemName: undefined,
      });

      assert.ok(output.primaryPromptEn.includes('Yaşam Çiçeği'));
      assert.ok(output.primaryPromptEn.includes('pure solid white background'));
      assert.strictEqual(output.primaryPromptEn.toLowerCase().includes('silhouette'), false);
    });
  });

  describe('4. Anne Adı, PII ve Dışlanan Sembol Güvenlik Kurallarının Korunması', () => {
    test('Anne adı ve PII pozitif prompta, konsepte veya negatif listeye ASLA sızmamalıdır', () => {
      const output = generateUnifiedVisualPrompt({
        ...baseInput,
        motherName: 'Ayşe',
        includeTotemInVisual: true,
        totemName: 'Kurt',
      });

      assert.strictEqual(output.primaryPromptEn.includes('Ayşe'), false);
      assert.strictEqual(output.conceptPromptTr.includes('Ayşe'), false);
      assert.strictEqual(output.negativePrompt.includes('Ayşe'), false);
    });

    test('Dışlanan semboller pozitif prompta giremez; hayvan adı olan dışlanan semboller de negatif prompta hayvan adı olarak sızmaz', () => {
      const output = generateUnifiedVisualPrompt({
        ...baseInput,
        excludedSymbols: ['Kafatası', 'Yılan'],
        includeTotemInVisual: true,
        totemName: 'Yılan', // Dışlanan bir sembol totem olarak gelse bile
      });

      assert.strictEqual(
        output.primaryPromptEn.toLowerCase().includes('kafatası'),
        false,
        'Dışlanan sembol pozitif promptta yer alamaz.'
      );
      assert.strictEqual(
        output.primaryPromptEn.toLowerCase().includes('yılan') ||
          output.primaryPromptEn.toLowerCase().includes('snake'),
        false,
        'Dışlanan hayvan pozitif promptta yer alamaz.'
      );
      assert.strictEqual(
        output.negativePrompt.toLowerCase().includes('yılan') ||
          output.negativePrompt.toLowerCase().includes('snake'),
        false,
        'Hayvan adı negatif prompta da aktarılamaz.'
      );
    });
  });
});
