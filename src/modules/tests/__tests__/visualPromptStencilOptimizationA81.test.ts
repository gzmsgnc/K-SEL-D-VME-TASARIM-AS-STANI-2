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

describe('AŞAMA 5.4.0 — Dövme Şablonu Prompt ve Stil Filtresi Optimizasyonu Testleri', () => {
  const sampleInput = {
    clientId: 'client-test-stencil-001',
    clientFullName: 'Murat Yılmaz',
    motherName: 'Ayşe',
    recipe: createSampleRecipe(),
    selectedSymbols: [
      {
        symbolId: 'flower-of-life',
        symbolName: 'Yaşam Çiçeği',
        customMeaning: 'Evrensel yaşam döngüsü',
        weight: 'PRIMARY' as const,
      },
      {
        symbolId: 'sri-yantra',
        symbolName: 'Sri Yantra',
        customMeaning: 'Kozmik denge ve bolluk',
        weight: 'SECONDARY' as const,
      },
    ],
    excludedSymbols: ['Kafatası', 'Hançer'],
  };

  describe('1. Pozitif Prompt: Bağımsız Stencil ve Beyaz Zemin Direktifleri', () => {
    test('Pozitif promptta bağımsız stencil/flash sheet sunumu ve saf beyaz zemin direktifleri bulunmalıdır', () => {
      const output = generateUnifiedVisualPrompt(sampleInput);
      const promptEn = output.primaryPromptEn.toLowerCase();

      // Bağımsız dövme şablonu (stencil flash sheet) direktifleri
      assert.ok(
        promptEn.includes('standalone independent 2d vector tattoo stencil flash sheet design') ||
          promptEn.includes('tattoo stencil flash sheet'),
        'Pozitif promptta bağımsız stencil flash sheet direktifi bulunmalıdır.'
      );

      // Saf beyaz homojen zemin direktifleri
      assert.ok(
        promptEn.includes('pure solid white background') || promptEn.includes('flat clean white backdrop'),
        'Pozitif promptta saf beyaz, düz ve homojen arka plan direktifi bulunmalıdır.'
      );

      // Merkezlenmiş ve kenarlardan kesilmeyen tam kompozisyon
      assert.ok(
        promptEn.includes('centered standalone composition') ||
          promptEn.includes('no edge clipping') ||
          promptEn.includes('generous padding margins'),
        'Pozitif promptta merkezlenmiş, kenardan kesilmeyen kompozisyon direktifi bulunmalıdır.'
      );

      // Yüksek kontrastlı siyah çizgiler ve temiz vektörel linework
      assert.ok(
        promptEn.includes('high contrast solid black ink lines') ||
          promptEn.includes('clean vector linework'),
        'Pozitif promptta yüksek kontrastlı siyah çizgiler ve temiz vektörel linework bulunmalıdır.'
      );

      // Cilt üzerine uygulanmış gibi değil bağımsız grafik tasarım
      assert.ok(
        promptEn.includes('not applied on skin') ||
          promptEn.includes('independent graphic design artwork') ||
          promptEn.includes('standalone graphic design'),
        'Pozitif promptta cilt üzerinde değil bağımsız grafik tasarım olarak gösterilme direktifi bulunmalıdır.'
      );
    });
  });

  describe('2. Negatif Prompt: Kol, Cilt, Mockup ve Fotoğraf Yasakları', () => {
    test('Negatif promptta zorunlu kol, cilt, mockup, fotoğraf, çerçeve ve tipografi yasakları eksiksiz bulunmalıdır', () => {
      const output = generateUnifiedVisualPrompt(sampleInput);
      const negPrompt = output.negativePrompt.toLowerCase();
      const primaryNoClause = output.primaryPromptEn.toLowerCase();

      const mandatoryNegatives = [
        'photorealistic human arm',
        'tattooed skin',
        'human body',
        'skin texture',
        'arm mockup',
        'hand mockup',
        'body photography',
        'lifestyle photography',
        'product photography',
        'table mockup',
        'paper texture',
        'folded paper',
        'frame',
        'border',
        'drop shadow',
        'environmental background',
        'colored background',
        'watermark',
        'text',
        'letters',
        'numbers',
        'typography',
      ];

      for (const forbidden of mandatoryNegatives) {
        assert.ok(
          negPrompt.includes(forbidden),
          `Negatif prompt '${forbidden}' yasağını içermelidir.`
        );
        assert.ok(
          primaryNoClause.includes(forbidden),
          `Pozitif promptun --no bölümü '${forbidden}' yasağını içermelidir.`
        );
      }
    });
  });

  describe('3. Anne Adı ve Kişisel Bilgi İzolasyonu', () => {
    test('Anne adı pozitif prompta, Türkçe konsepte veya negatif listeye ASLA sızmamalıdır', () => {
      const output = generateUnifiedVisualPrompt(sampleInput);
      const motherLower = sampleInput.motherName.toLocaleLowerCase('tr-TR');

      assert.strictEqual(
        output.primaryPromptEn.toLocaleLowerCase('tr-TR').includes(motherLower),
        false,
        'Anne adı İngilizce isteme kesinlikle sızmamalıdır.'
      );
      assert.strictEqual(
        output.conceptPromptTr.toLocaleLowerCase('tr-TR').includes(motherLower),
        false,
        'Anne adı Türkçe konsept manifestosuna kesinlikle sızmamalıdır.'
      );
      assert.strictEqual(
        output.negativePrompt.toLocaleLowerCase('tr-TR').includes(motherLower),
        false,
        'Anne adı negatif prompta dahi yazılmamalıdır.'
      );
    });
  });

  describe('4. Dışlanan Sembollerin Korunması', () => {
    test('Dışlanan semboller pozitif prompta giremez, negatif prompt listesinde yer alır', () => {
      const output = generateUnifiedVisualPrompt(sampleInput);
      const promptEnLower = output.primaryPromptEn.toLocaleLowerCase('tr-TR');
      const negPromptLower = output.negativePrompt.toLocaleLowerCase('tr-TR');

      assert.strictEqual(
        promptEnLower.includes('kafatası'),
        false,
        'Dışlanan Kafatası sembolü pozitif promptta yer alamaz.'
      );
      assert.strictEqual(
        promptEnLower.includes('hançer'),
        false,
        'Dışlanan Hançer sembolü pozitif promptta yer alamaz.'
      );

      assert.ok(
        negPromptLower.includes('kafatası'),
        'Dışlanan Kafatası sembolü negatif promptta yer almalıdır.'
      );
      assert.ok(
        negPromptLower.includes('hançer'),
        'Dışlanan Hançer sembolü negatif promptta yer almalıdır.'
      );
    });
  });

  describe('5. Mevcut Kompozisyon, Ölçü ve Çizgi Aralığı Kurallarının Korunması', () => {
    test('%65 ana odak, %35 ikincil katman, %45-50 negatif alan ve 1.5-2mm çizgi aralığı hedefleri korunmalıdır', () => {
      const output = generateUnifiedVisualPrompt(sampleInput);
      const promptEn = output.primaryPromptEn.toLowerCase();
      const technicalDirectivesJoined = output.technicalDirectives.join(' ');

      // %65 ana odak / %35 ikincil katman
      assert.ok(
        promptEn.includes('nominal 65% primary visual focus') &&
          promptEn.includes('35% secondary geometric layer'),
        'Promptta %65 ana odak ve %35 ikincil katman direktifleri korunmalıdır.'
      );

      // %45-50 negatif alan
      assert.ok(
        promptEn.includes('target 45-50% clean negative space'),
        'Promptta %45-50 temiz negatif alan hedefi korunmalıdır.'
      );
      assert.ok(
        technicalDirectivesJoined.includes('%45–50'),
        'Teknik direktiflerde %45–50 negatif alan standardı yer almalıdır.'
      );

      // 1.5-2 mm çizgi aralığı
      assert.ok(
        promptEn.includes('1.5mm to 2mm line spacing'),
        'Promptta 1.5mm to 2mm line spacing korunmalıdır.'
      );
      assert.ok(
        technicalDirectivesJoined.includes('1.5 mm') && technicalDirectivesJoined.includes('2.0 mm'),
        'Teknik direktiflerde 1.5-2.0 mm çizgi aralığı tavsiyesi korunmalıdır.'
      );

      // 16x10 cm minimum, 22x14 cm ideal ölçüleri
      assert.ok(
        technicalDirectivesJoined.includes('16x10 cm') && technicalDirectivesJoined.includes('22x14 cm'),
        'Teknik direktiflerde min 16x10 cm ve ideal 22x14 cm ölçüleri korunmalıdır.'
      );
    });
  });

  describe('6. Totem Hayvanlarının Tamamen Soyut Geometrik Karşılığa Dönüştürülmesi (AŞAMA 5.4.0.1)', () => {
    test('Totem dahil edildiğinde hayvan adı/silüeti/anatomisi değil bağımsız soyut geometrik motif eklenmeli ve negatif filtrelerle korunmalıdır', () => {
      const outputWithTotem = generateUnifiedVisualPrompt({
        ...sampleInput,
        includeTotemInVisual: true,
        totemName: 'Kurt',
      });

      const promptEn = outputWithTotem.primaryPromptEn;
      const negPrompt = outputWithTotem.negativePrompt.toLowerCase();

      // 1. Pozitif promptta hayvan adı kesinlikle bulunmamalı
      assert.strictEqual(
        promptEn.includes('Kurt') || promptEn.toLowerCase().includes('wolf'),
        false,
        'Pozitif promptta hayvan adı (Kurt/wolf) kesinlikle bulunamaz.'
      );

      // 2. Pozitif promptta hayvan silüeti veya anatomisi tarif edilmemeli
      const positivePart = promptEn.split('--no')[0].toLowerCase();
      assert.strictEqual(
        positivePart.includes('silhouette'),
        false,
        'Pozitif promptta silhouette ifadesi bulunamaz.'
      );
      assert.strictEqual(
        positivePart.includes('animal'),
        false,
        'Pozitif promptta animal sözcüğü bulunamaz.'
      );
      assert.strictEqual(
        promptEn.toLowerCase().includes('silhouette'),
        false,
        'Promptta silhouette ifadesi bulunamaz.'
      );

      // 3. Negatif promptta hayvan adı bulunmamalı (APIye hiçbir hayvan adı aktarılmaz)
      assert.strictEqual(
        negPrompt.includes('kurt') || negPrompt.includes('wolf'),
        false,
        'Negatif promptta hayvan adı (kurt/wolf) bulunamaz.'
      );

      // 4. Kurt için bağımsız soyut geometrik kalkan motifi korunmalı
      assert.ok(
        promptEn.includes('protective geometric boundary shield lattice with interlocking angle vectors'),
        'Kurt totemi için bağımsız koruyucu geometrik kalkan motifi pozitif promptta yer almalıdır.'
      );

      // 5. Negatif filtrelerde genel realist hayvan yüzü ve başı yasakları bulunmalı
      assert.ok(
        negPrompt.includes('realistic animal face') && negPrompt.includes('realistic animal head'),
        'Negatif filtrelerde realist hayvan yüzü ve başı yasaklanmalıdır.'
      );
      assert.ok(
        negPrompt.includes('cartoonish sticker look'),
        'Negatif filtrelerde çıkartma görünümü yasaklanmalıdır.'
      );
    });

    test('Totem dahil edilmediğinde promptta hayvan adı kesinlikle bulunmamalıdır', () => {
      const outputWithoutTotem = generateUnifiedVisualPrompt({
        ...sampleInput,
        includeTotemInVisual: false,
        totemName: 'Kartal',
      });

      assert.strictEqual(
        outputWithoutTotem.primaryPromptEn.includes('Kartal'),
        false,
        'Totem görsel olarak dahil edilmediğinde pozitif promptta yer alamaz.'
      );
      assert.strictEqual(
        outputWithoutTotem.conceptPromptTr.includes('Kartal'),
        false,
        'Totem görsel olarak dahil edilmediğinde Türkçe konseptte yer alamaz.'
      );
      assert.strictEqual(
        outputWithoutTotem.negativePrompt.toLowerCase().includes('kartal') ||
          outputWithoutTotem.negativePrompt.toLowerCase().includes('eagle'),
        false,
        'Totem dahil edilmediğinde negatif promptta da hayvan adı yer alamaz.'
      );
    });
  });
});
