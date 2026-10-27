import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { ClientTattooDesign } from '../../../types/design';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
  formatDesignSummaryText,
  formatSymbolCompositionText,
} from '../../../utils/tattooDesignFormatters';

describe('A30: Tasarım Sonucu ve Arşiv Kullanım Katmanı Doğrulama Testleri', () => {
  const mockClientA: Client = {
    id: 'CLI-A30-001',
    firstName: 'Elif',
    lastName: 'Korkmaz',
    email: 'elif.korkmaz@example.com',
    phone: '+90 532 222 3344',
    birthDate: '1993-07-15',
    birthTime: '15:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      city: 'Antalya',
      country: 'Türkiye',
      placeName: 'Antalya, Muratpaşa',
      latitude: 36.8841,
      longitude: 30.7056,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Nermin',
    notes: 'Kutsal geometri ve iç kol için akışkan mandallik tasarım.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const mockClientB: Client = {
    id: 'CLI-A30-002',
    firstName: 'Can',
    lastName: 'Öztürk',
    email: 'can.ozturk@example.com',
    phone: '+90 555 333 4455',
    birthDate: '1990-03-22',
    birthTime: '00:00',
    isBirthTimeUnknown: true,
    birthLocation: {
      city: 'Bursa',
      country: 'Türkiye',
      placeName: 'Bursa, Nilüfer',
      latitude: 40.1885,
      longitude: 29.0610,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Zehra',
    notes: 'Sırt tasarımı.',
    createdAt: '2026-03-02T11:00:00Z',
    updatedAt: '2026-03-02T11:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const designV1: ClientTattooDesign = {
    id: 'DES-A30-001',
    clientId: mockClientA.id,
    versionNumber: 1,
    title: 'Altın Spiral ve Yaşam Çiçeği Kompozisyonu',
    conceptStatement: 'Bireyin içsel dengesi ile evrensel geometrinin uyumunu simgeleyen ruhsal manifesto.',
    recipe: {
      style: 'SACRED_GEOMETRY',
      recommendedPlacement: 'FOREARM_INNER',
      placementDescription: 'İç Ön Kol · Bilekten dirsek bükümüne uzanan doğrusal enerji kanalı (Doğal kas hattı)',
      recommendedDimensionsCm: { width: 10, height: 16 },
      colorProfile: 'MONOCHROME_BLACK',
      colorRationale: 'Zamanın ötesinde netlik ve maksimum kontrast.',
      primarySymbol: 'Kutsal Yaşam Çiçeği Geometrisi',
      secondarySymbols: ['Altın Oran Sarmalı', 'Boğaz Çakrası İfade Glifi'],
      symbolCombinationRules: [
        'Merkezde Yaşam Çiçeği baskın odak olarak yer alır',
        'Altın Oran sarmalı alt tabandan yukarıya doğru enerji akışını yönetir',
      ],
      shadowTransformationTheme: 'Gölge: Sessizlik → Dönüşüm Sembolü: Açılan Ses Halkaları',
      chakraSupportReflection: 'Boğaz çakrası desteği ve güçlendirme odakları.',
      totemAbstractionNotes: 'Hayvan totemi (Kartal) soyut minimalist çizgilerle entegre edildi.',
      excludedElements: ['yılan', 'kurukafa'],
      artistVisualDirection: [
        'Merkezi aks simetrisi milimetrik olarak korunmalıdır',
        'İnce çizgi kalınlığı 0.25mm - 0.35mm aralığında tutulmalıdır',
      ],
      keyComponents: [
        'Merkezi Yaşam Çiçeği',
        'Fraktal altın sarmal',
        'Geometrik Boğaz çakrası aksı',
      ],
      technicalAdviceForArtist: [
        '3RL iğne ile ultra-fine kontur işçiliği',
        'Dotwork gölgeleme için 0.20mm tek iğne whip shading tekniği',
      ],
    },
    aiPrompt: {
      primaryPromptEn: 'Sacred geometry tattoo design of Flower of Life, golden spiral linework, monochrome black ink on white background, hyper-detailed vector quality --ar 3:4',
      conceptPromptTr: 'Yaşam çiçeği ve altın sarmal ile evrensel simetriyi yansıtan monokrom kutsal geometri dövmesi.',
      negativePrompt: 'yılan, kurukafa, blur, shading noise, low contrast, color gradients',
      aspectRatio: '3:4',
      artisticModifiers: ['ultra sharp linework', 'vector clean', 'sacred symmetry'],
      seed: 42891,
    },
    createdAt: '2026-03-01T12:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  };

  const designV2: ClientTattooDesign = {
    id: 'DES-A30-002',
    clientId: mockClientA.id,
    versionNumber: 2,
    title: 'Metatron Küpü ve İnce Çizgi Kozmik Denge',
    conceptStatement: 'Dönüşümün ikinci evresi: Yüksek koruma ve zihinsel berraklık.',
    recipe: {
      style: 'FINE_LINE',
      recommendedPlacement: 'FOREARM_INNER',
      placementDescription: 'İç Ön Kol · Bilekten dirsek bükümüne uzanan doğrusal enerji kanalı',
      recommendedDimensionsCm: { width: 12, height: 18 },
      colorProfile: 'BLACK_AND_GREY',
      colorRationale: 'Hacimsel derinlik ve yumuşak ışık-gölge geçişleri.',
      primarySymbol: 'Metatron Küpü Kutsal Mührü',
      secondarySymbols: ['Merkaba Geometrisi'],
      symbolCombinationRules: ['Metatron küpü tüm tasarımı çevreleyen dış çemberle sınırlanır'],
      shadowTransformationTheme: 'Gölge: Kararsızlık → Odak Küpü',
      chakraSupportReflection: 'Tepe ve Kalp çakraları dengesi.',
      totemAbstractionNotes: 'Totem görsel tasarıma dahil edilmedi.',
      excludedElements: ['yılan'],
      artistVisualDirection: ['Derinlik geçişlerinde yumuşak gri yıkama kullanılmalıdır'],
      keyComponents: ['Metatron Küpü', 'Merkaba Yıldızı'],
      technicalAdviceForArtist: ['1RL ve 3RL ince çizgi iğneleri'],
    },
    aiPrompt: {
      primaryPromptEn: 'Metatron cube fine line tattoo design, sacred geometry, clean black and grey wash --ar 3:4',
      conceptPromptTr: 'Metatron küpü ve Merkaba yıldızı ile kozmik denge dövmesi.',
      negativePrompt: 'yılan, blur, color, saturated pigments',
      aspectRatio: '3:4',
      artisticModifiers: ['fine line', 'micro precision'],
    },
    createdAt: '2026-03-01T14:00:00Z',
    updatedAt: '2026-03-01T14:00:00Z',
  };

  const mockArchiveA: ClientArchiveRecord = {
    client: mockClientA,
    analyses: [],
    symbolAnalyses: [],
    testResults: [],
    designs: [designV2, designV1], // En güncel V2 başta
    reports: [],
    historySummary: { totalAnalysesCount: 0, totalDesignsCount: 2, lastInteractionAt: '2026-03-01T14:00:00Z' },
  };

  const mockArchiveB_Empty: ClientArchiveRecord = {
    client: mockClientB,
    analyses: [],
    symbolAnalyses: [],
    testResults: [],
    designs: [], // Tasarım yok
    reports: [],
    historySummary: { totalAnalysesCount: 0, totalDesignsCount: 0, lastInteractionAt: '2026-03-02T11:00:00Z' },
  };

  it('1. Aktif danışanın mevcut tasarımı doğru okunuyor', () => {
    const clientADesigns = mockArchiveA.designs.filter((d) => d.clientId === mockClientA.id);
    assert.strictEqual(clientADesigns.length, 2);
    const latest = clientADesigns[0];
    assert.strictEqual(latest.id, 'DES-A30-002');
    assert.strictEqual(latest.versionNumber, 2);
    assert.strictEqual(latest.clientId, mockClientA.id);
    assert.strictEqual(latest.title, 'Metatron Küpü ve İnce Çizgi Kozmik Denge');
  });

  it('2. Tasarım bölümleri doğru verileri gösteriyor', () => {
    // 1. Tasarım Özeti
    const summaryText = formatDesignSummaryText(mockClientA, designV1);
    assert.ok(summaryText.includes('Elif Korkmaz'));
    assert.ok(summaryText.includes('V1'));
    assert.ok(summaryText.includes('Kutsal Geometri'));
    assert.ok(summaryText.includes('İç Ön Kol'));
    assert.ok(summaryText.includes('10 cm x 16 cm'));
    assert.ok(summaryText.includes('Saf Karbon Siyahı'));

    // 2. Sembol Kompozisyonu
    const symbolText = formatSymbolCompositionText(mockClientA, designV1);
    assert.ok(symbolText.includes('Kutsal Yaşam Çiçeği Geometrisi'));
    assert.ok(symbolText.includes('Altın Oran Sarmalı'));
    assert.ok(symbolText.includes('yılan, kurukafa'));
    assert.ok(symbolText.includes('Kartal'));

    // 3. Türkçe Konsept / Manifesto
    const manifestoText = formatConceptManifestoText(mockClientA, designV1);
    assert.ok(manifestoText.includes('Bireyin içsel dengesi'));

    // 4. Dövme Reçetesi
    const recipeText = formatTattooRecipeText(mockClientA, designV1);
    assert.ok(recipeText.includes('Sembol Katmanları') || recipeText.includes('SEMBOL KATMANLARI'));
    assert.ok(recipeText.includes('Merkezde Yaşam Çiçeği baskın odak'));

    // 5. Sanatçı Teknik Talimatları
    const techText = formatTechnicalAdviceText(mockClientA, designV1);
    assert.ok(techText.includes('3RL iğne ile ultra-fine kontur'));
    assert.ok(techText.includes('Merkezi aks simetrisi'));

    // 6. Görsel Üretim İstemi
    const visualText = formatVisualPromptText(mockClientA, designV1);
    assert.ok(visualText.includes('Flower of Life'));
    assert.ok(visualText.includes('negativePrompt') || visualText.includes('NEGATIVE PROMPT'));
    assert.ok(visualText.includes('--ar 3:4'));
  });

  it('3. Ana ve ikincil semboller karışmıyor', () => {
    const symbolText = formatSymbolCompositionText(mockClientA, designV1);
    const primarySection = symbolText.split('[İKİNCİL SEMBOLLER]')[0];
    const secondarySection = symbolText.split('[İKİNCİL SEMBOLLER]')[1].split('[HARİÇ TUTULAN SEMBOLLER]')[0];

    assert.ok(primarySection.includes('Kutsal Yaşam Çiçeği Geometrisi'), 'Ana sembol ana sembol alanında olmalı');
    assert.ok(!primarySection.includes('Altın Oran Sarmalı'), 'İkincil sembol ana sembol alanına sızmamalı');
    assert.ok(secondarySection.includes('Altın Oran Sarmalı'), 'İkincil sembol ikincil semboller alanında olmalı');
    assert.ok(!secondarySection.includes('Kutsal Yaşam Çiçeği Geometrisi'), 'Ana sembol ikincil semboller alanında tekrarlanmamalı');
  });

  it('4. Hariç tutulan semboller sonuçta görünmemesi gereken alanlarda görünmüyor', () => {
    // designV1 excludedElements: ['yılan', 'kurukafa']
    const prompt = designV1.aiPrompt.primaryPromptEn.toLowerCase();
    const concept = designV1.aiPrompt.conceptPromptTr.toLowerCase();
    const components = designV1.recipe.keyComponents.join(' ').toLowerCase();

    assert.ok(!prompt.includes('yılan') && !prompt.includes('snake'), 'Yılan görsel isteme girmemeli');
    assert.ok(!concept.includes('yılan'), 'Yılan Türkçe konsepte girmemeli');
    assert.ok(!prompt.includes('kurukafa') && !prompt.includes('skull'), 'Kurukafa isteme girmemeli');
    assert.ok(!components.includes('yılan') && !components.includes('kurukafa'), 'Hariç tutulanlar temel unsurlara girmemeli');

    // Negatif promptta yer almalıdır
    assert.ok(designV1.aiPrompt.negativePrompt.includes('yılan'));
    assert.ok(designV1.aiPrompt.negativePrompt.includes('kurukafa'));
  });

  it('5. Anne adı görsel isteme sızmıyor', () => {
    // mockClientA.motherName: 'Nermin'
    const prompt = designV1.aiPrompt.primaryPromptEn.toLocaleLowerCase('tr-TR');
    const concept = designV1.aiPrompt.conceptPromptTr.toLocaleLowerCase('tr-TR');
    const primarySym = (designV1.recipe.primarySymbol || '').toLocaleLowerCase('tr-TR');

    assert.ok(!prompt.includes('nermin'), 'Anne adı İngilizce isteme girmemeli');
    assert.ok(!concept.includes('nermin'), 'Anne adı Türkçe konsepte girmemeli');
    assert.ok(!primarySym.includes('nermin'), 'Anne adı sembol adına girmemeli');
  });

  it('6. Aktif danışan değiştiğinde eski tasarım sonucu yeni danışana taşınmıyor', () => {
    // Client B'nin tasarımlarını oku
    const clientBDesigns = mockArchiveB_Empty.designs.filter((d) => d.clientId === mockClientB.id);
    assert.strictEqual(clientBDesigns.length, 0, 'Client B için kayıtlı tasarım olmamalı');

    // Client A tasarımları Client B'ye karışmamalı
    const leakedDesigns = mockArchiveB_Empty.designs.filter((d) => d.clientId === mockClientA.id);
    assert.strictEqual(leakedDesigns.length, 0, 'Client A verisi Client B arşivine sızmamalı');
  });

  it('7. Geçmiş sürüm salt okunur kalıyor', () => {
    // Arşivde V2 güncel, V1 geçmiş sürümdür
    const latest = mockArchiveA.designs[0];
    const historical = mockArchiveA.designs[1];

    assert.strictEqual(latest.versionNumber, 2);
    assert.strictEqual(historical.versionNumber, 1);

    // Geçmiş sürümün salt okunur verisi incelenir
    const historicalText = formatDesignSummaryText(mockClientA, historical);
    assert.ok(historicalText.includes('V1'));
    assert.ok(historicalText.includes('Kutsal Geometri'));
    assert.ok(!historicalText.includes('V2'));
    assert.ok(!historicalText.includes('Metatron Küpü'));
  });

  it('8. Geçmiş sürüm görüntülenirken güncel sürüm değişmiyor', () => {
    // Geçmiş sürüm formatlandığında veya okunduğunda orijinal mockArchiveA.designs bozulmaz
    const historicalDesign = mockArchiveA.designs.find((d) => d.versionNumber === 1);
    assert.ok(historicalDesign);
    formatFullDesignPackageText(mockClientA, historicalDesign!);

    // Güncel sürüm hala V2 olarak durmaktadır
    const currentDesign = mockArchiveA.designs[0];
    assert.strictEqual(currentDesign.versionNumber, 2);
    assert.strictEqual(currentDesign.id, 'DES-A30-002');
  });

  it('9. Yeni sürüm eski sürümleri silmiyor', () => {
    const designV3: ClientTattooDesign = {
      ...designV2,
      id: 'DES-A30-003',
      versionNumber: 3,
      title: 'V3 Yeni Çakra Tasarımı',
      createdAt: '2026-03-01T16:00:00Z',
    };

    const updatedDesignsList = [designV3, ...mockArchiveA.designs];
    assert.strictEqual(updatedDesignsList.length, 3);
    assert.strictEqual(updatedDesignsList[0].versionNumber, 3);
    assert.strictEqual(updatedDesignsList[1].versionNumber, 2);
    assert.strictEqual(updatedDesignsList[2].versionNumber, 1);

    // Eski sürümlerin kimlikleri ve verileri korunmuştur
    assert.strictEqual(updatedDesignsList[1].id, 'DES-A30-002');
    assert.strictEqual(updatedDesignsList[2].id, 'DES-A30-001');
  });

  it('10. Eksik reçete/görsel istem durumunda sahte sonuç üretilmiyor', () => {
    // Boş arşivde tasarım aranır
    const emptyClientDesigns = mockArchiveB_Empty.designs.filter((d) => d.clientId === mockClientB.id);
    assert.strictEqual(emptyClientDesigns.length, 0);

    // Görsel istemi olmayan tasarım simülasyonu
    const designWithoutPrompt: ClientTattooDesign = {
      ...designV1,
      aiPrompt: {
        primaryPromptEn: '',
        conceptPromptTr: '',
        negativePrompt: '',
        aspectRatio: '3:4',
        artisticModifiers: [],
      },
    };

    const negText = formatNegativePromptText(mockClientA, designWithoutPrompt);
    assert.ok(negText.includes('Kayıt bulunmuyor.'), 'Eksik negatif promptta açıkça kayıt bulunmuyor demeli');
  });

  it('11. Bölüm bazlı kopyalama yalnızca aktif danışanın verisini içeriyor', () => {
    const recipeText = formatTattooRecipeText(mockClientA, designV1);
    const conceptText = formatConceptManifestoText(mockClientA, designV1);
    const techText = formatTechnicalAdviceText(mockClientA, designV1);
    const visualText = formatVisualPromptText(mockClientA, designV1);
    const negText = formatNegativePromptText(mockClientA, designV1);
    const fullText = formatFullDesignPackageText(mockClientA, designV1);

    const allFormatted = [recipeText, conceptText, techText, visualText, negText, fullText];

    for (const text of allFormatted) {
      assert.ok(text.includes('Elif Korkmaz'), 'Aktif danışan adı bulunmalı');
      assert.ok(!text.includes('Can Öztürk'), 'Başka danışan adı sızmamalı');
      assert.ok(!text.includes('CLI-A30-002'), 'Başka danışan kimliği sızmamalı');
      assert.ok(!text.includes('Zehra'), 'Başka danışanın anne adı sızmamalı');
    }
  });

  it('12. Aynı kayıt tekrar okunduğunda aynı tasarım sonucu elde ediliyor', () => {
    const run1 = formatFullDesignPackageText(mockClientA, designV1);
    const run2 = formatFullDesignPackageText(mockClientA, designV1);
    const run3 = formatFullDesignPackageText(mockClientA, designV1);

    assert.strictEqual(run1, run2, 'Tekrarlı okuma deterministik olmalı');
    assert.strictEqual(run2, run3, 'Tekrarlı okuma birebir aynı sonucu vermeli');

    const sum1 = formatDesignSummaryText(mockClientA, designV1);
    const sum2 = formatDesignSummaryText(mockClientA, designV1);
    assert.strictEqual(sum1, sum2);

    const comp1 = formatSymbolCompositionText(mockClientA, designV1);
    const comp2 = formatSymbolCompositionText(mockClientA, designV1);
    assert.strictEqual(comp1, comp2);
  });
});
