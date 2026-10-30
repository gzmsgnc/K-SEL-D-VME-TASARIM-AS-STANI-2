import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client, ClientFormData } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientAstrologyChart,
  saveClientTestResult,
} from '../../../store/storage';
import { generateClientRecipe } from '../../recipe';
import { BODY_PLACEMENTS } from '../../recipe/constants';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { calculateClientTropicalChart } from '../../astrology';
import { formatTattooRecipeText, formatTechnicalAdviceText } from '../../../utils/tattooDesignFormatters';
import { formatArchetypeSectionCopyText } from '../../../utils/clientComprehensiveCopy';
import { getArchetypeCardData } from '../../../utils/analysisResultsFormatters';

describe('A55 — Tespit Edilen Uyuşmazlıkların Kök Neden Denetim ve Onarım Testleri', () => {
  const sampleLocation = {
    country: 'Türkiye',
    city: 'İstanbul',
    placeName: 'İstanbul, Fatih',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const clientGizemData: ClientFormData = {
    firstName: 'Gizem Selma',
    lastName: 'Genç',
    email: 'gizem.genc@example.com',
    phone: '5551234567',
    birthDate: '1991-11-24',
    birthTime: '03:15',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Songül',
    notes: 'Kişisel analiz ve dövme reçetesi.',
  };

  function setupFullArchive(client: Client): ClientArchiveRecord {
    const num = calculateClientNumerology(client);
    if (num.numerology) {
      saveClientNumerology(client.id, num.numerology);
    }

    const astroRes = calculateClientTropicalChart(client);
    if (astroRes.success && astroRes.chart) {
      saveClientAstrologyChart(client.id, astroRes.chart);
    }

    const archWithAstro = getClientArchive(client.id)!;
    const chk = calculateClientChakra(client, archWithAstro);
    if (chk.chakra) {
      saveClientChakra(client.id, chk.chakra);
    }

    const archWithChk = getClientArchive(client.id)!;
    const arch = calculateClientArchetype(client, archWithChk);
    if (arch.archetype) {
      saveClientArchetype(client.id, arch.archetype);
    }

    return getClientArchive(client.id)!;
  }

  // HATA 1: Gölge arketip uyuşmazlığı kontrolü
  it('HATA 1 Onarımı: Sakral Çakra desteğinde gölge arketip daima Bastırılmış Tutku / Bağımlı Aşık olmalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const archetype = arch.analyses?.[0]?.archetype;
      assert.ok(archetype, 'Arketip analizi mevcut olmalıdır');

      // 1. Kök arketip motoru kontrolü
      assert.strictEqual(
        archetype.shadowArchetype.shadowName,
        'Bastırılmış Tutku / Bağımlı Aşık',
        'Gölge arketip adı motor düzeyinde Bastırılmış Tutku / Bağımlı Aşık olmalıdır'
      );

      // 2. Kart verisi kontrolü
      const cardData = getArchetypeCardData(client, arch);
      assert.strictEqual(
        cardData.shadowArchetype,
        'Bastırılmış Tutku / Bağımlı Aşık',
        'Sonuç kartı verisinde de aynı gölge adı bulunmalıdır'
      );

      // 3. Genel kopyalama metni kontrolü
      const copyText = formatArchetypeSectionCopyText(client, arch);
      assert.ok(
        copyText.includes('Bastırılmış Tutku / Bağımlı Aşık'),
        'Kopyalama metninde Bastırılmış Tutku / Bağımlı Aşık yer almalıdır'
      );
      assert.ok(
        !copyText.includes('Yetim / Kurban'),
        'Eski mock veya uyuşmaz isim (Yetim / Kurban) kopyalama metninde bulunmamalıdır'
      );

      // 4. Dövme reçetesi kontrolü
      const recipeRes = generateClientRecipe(client, arch);
      assert.ok(recipeRes.success && recipeRes.design);
      assert.ok(
        recipeRes.design.recipe.shadowTransformationTheme?.includes('Bastırılmış Tutku / Bağımlı Aşık'),
        'Dövme reçetesi gölge dönüşüm temasında Bastırılmış Tutku / Bağımlı Aşık bulunmalıdır'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // HATA 2: Totem analizi varken reçetenin doğru tanıması ve soyutlama notu
  it('HATA 2 Onarımı: Totem testi varken reçete totemi tanımalı, includeTotemInVisual false iken inkar etmemelidir', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);

      // Danışanın arşivine Baykuş ve Geyik totem sonucunu ekle
      const totemResult = {
        id: 'totem-test-1',
        clientId: client.id,
        testType: 'ANIMAL_TOTEM' as const,
        version: 1,
        completedAt: new Date().toISOString(),
        primaryType: 'Baykuş',
        secondaryType: 'Geyik',
        dominantScores: { Baykuş: 12, Geyik: 8 },
        interpretations: ['Bilgelik ve sezgisel rehberlik.'],
        answers: [],
      };
      saveClientTestResult(client.id, totemResult);

      const archWithTotem = getClientArchive(client.id)!;

      // Durum A: includeTotemInVisual = false
      const resFalse = generateClientRecipe(client, archWithTotem, {
        includeTotemInVisual: false,
      });
      assert.ok(resFalse.success && resFalse.design);
      const notesFalse = resFalse.design.recipe.totemAbstractionNotes || '';

      assert.ok(
        notesFalse.includes('Baykuş ve Geyik'),
        'Totem notunda Baykuş ve Geyik belirtilmelidir'
      );
      assert.ok(
        notesFalse.includes('görsel tasarıma dahil edilmedi'),
        'Tasarıma dahil edilmediği açıkça belirtilmelidir'
      );
      assert.ok(
        !notesFalse.includes('kayıtlı bir ruh hayvanı totemi bulunmamaktadır'),
        'Totem varken "kayıtlı bir totem bulunmamaktadır" denmemelidir'
      );

      // Durum B: includeTotemInVisual = true
      const resTrue = generateClientRecipe(client, archWithTotem, {
        includeTotemInVisual: true,
      });
      assert.ok(resTrue.success && resTrue.design);
      const notesTrue = resTrue.design.recipe.totemAbstractionNotes || '';

      assert.ok(
        notesTrue.includes('Baykuş ve Geyik'),
        'Totem notunda Baykuş ve Geyik yer almalıdır'
      );
      assert.ok(
        notesTrue.includes('soyut çizgiler ve geometrik silüet'),
        'Soyut çizgiler ve geometrik silüet prensibi vurgulanmalıdır'
      );
      assert.ok(
        (resTrue.design.recipe.secondarySymbols || []).some((s) => s.includes('Baykuş ve Geyik')),
        'İkincil sembollerde soyut silüet yer almalıdır'
      );

      // Durum C: Totem testi henüz çözülmemişse
      const clientNoTotem = createClientRecord(
        { ...clientGizemData, email: 'nototem@example.com' },
        'OWNER_MANUAL'
      );
      try {
        const archNoTotem = setupFullArchive(clientNoTotem);
        const resNone = generateClientRecipe(clientNoTotem, archNoTotem);
        assert.ok(resNone.success && resNone.design);
        const notesNone = resNone.design.recipe.totemAbstractionNotes || '';
        assert.ok(
          notesNone.includes('tamamlanmış bir ruh hayvanı totemi analizi bulunmamaktadır'),
          'Totem yokken tamamlanmış analiz bulunmadığı belirtilmelidir'
        );
      } finally {
        deleteClientRecord(clientNoTotem.id);
      }
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // HATA 3: Kapsam dışı astroloji verilerinin (Yükselen / Placidus) reçeteden arındırılması
  it('HATA 3 Onarımı: Reçetede ve promptta Yükselen (ASC) ve Placidus yer almamalı, Güneş ve Ay korunmalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);

      const recipe = res.design.recipe;
      const recipeText = formatTattooRecipeText(client, res.design);
      const primaryPrompt = res.design.aiPrompt.primaryPromptEn;

      // 1. Güneş ve Ay hizalanması mevcut olmalıdır
      const hasSunMoon = (recipe.secondarySymbols || []).some(
        (s) => s.includes('Güneş') && s.includes('Ay')
      );
      assert.ok(hasSunMoon, 'Güneş ve Ay hizalanması ikincil sembollerde bulunmalıdır');

      // 2. Yükselen (ASC) reçete ikincil sembollerinde OLMAMALIDIR
      const hasAscInSymbols = (recipe.secondarySymbols || []).some(
        (s) => s.includes('Yükselen') || s.includes('Ascendant') || s.includes('Asc')
      );
      assert.strictEqual(hasAscInSymbols, false, 'Reçete sembollerinde Yükselen bulunmamalıdır');

      // 3. Reçete metninde ve promptta Yükselen/Placidus sızmamalıdır
      assert.ok(!recipeText.includes('Yükselen ('), 'Reçete metninde Yükselen glifi sızmamalıdır');
      assert.ok(!recipeText.includes('Placidus'), 'Reçete metninde Placidus bulunmamalıdır');
      assert.ok(!primaryPrompt.includes('Ascendant'), 'AI promptta Ascendant bulunmamalıdır');
      assert.ok(!primaryPrompt.includes('Placidus'), 'AI promptta Placidus bulunmamalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // HATA 4: Dövme ölçüsü gereksinimine uyum ve anatomik varsayılanlar
  it('HATA 4 Onarımı: FOREARM_INNER varsayılanı 14 x 22 cm olmalı, özel ölçüler korunmalıdır', () => {
    // 1. Sabit anatomik tanım kontrolü
    const forearm = BODY_PLACEMENTS.FOREARM_INNER;
    assert.strictEqual(forearm.recommendedDimensions.width, 14, 'İç ön kol genişlik 14 cm olmalıdır');
    assert.strictEqual(forearm.recommendedDimensions.height, 22, 'İç ön kol yükseklik 22 cm olmalıdır');

    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);

      // 2. Varsayılan yerleşimle reçete üretimi
      const resDefault = generateClientRecipe(client, arch, {
        preferredPlacement: 'FOREARM_INNER',
      });
      assert.ok(resDefault.success && resDefault.design);
      const recipeDefault = resDefault.design.recipe;

      assert.strictEqual(recipeDefault.recommendedDimensionsCm.width, 14);
      assert.strictEqual(recipeDefault.recommendedDimensionsCm.height, 22);

      const techAdvice = formatTechnicalAdviceText(client, resDefault.design);
      assert.ok(
        techAdvice.includes('14 x 22 cm') || techAdvice.includes('14cm x 22cm') || techAdvice.includes('14 cm'),
        'Teknik talimat 14 x 22 cm boyutunu içermelidir'
      );
      assert.ok(
        techAdvice.includes('İdeal: 22 × 14 cm, Min: 16 × 10 cm') || techAdvice.includes('İdeal: 22 × 14 cm'),
        'Teknik talimatta ideal ve minimum boyut kılavuzu yer almalıdır'
      );

      // 3. Kullanıcı tarafından girilen özel ölçülerin korunması
      const resCustom = generateClientRecipe(client, arch, {
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 10, height: 18 },
      });
      assert.ok(resCustom.success && resCustom.design);
      assert.strictEqual(resCustom.design.recipe.recommendedDimensionsCm.width, 10);
      assert.strictEqual(resCustom.design.recipe.recommendedDimensionsCm.height, 18);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Güvenlik & İzolasyon: Anne adının promptlara sızmaması
  it('İzolasyon Güvenliği: Anne adı (Songül) promptlara kesinlikle sızmamalıdır', () => {
    const client = createClientRecord(clientGizemData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);

      const pEn = res.design.aiPrompt.primaryPromptEn.toLocaleLowerCase('tr-TR');
      const pTr = res.design.aiPrompt.conceptPromptTr.toLocaleLowerCase('tr-TR');
      const pNeg = res.design.aiPrompt.negativePrompt.toLocaleLowerCase('tr-TR');

      assert.ok(!pEn.includes('songül'), 'İngilizce promptta anne adı yer almamalıdır');
      assert.ok(!pTr.includes('songül'), 'Türkçe konsept promptunda anne adı yer almamalıdır');
      assert.ok(pNeg.includes('songül'), 'Anne adı negatif istemde koruyucu filtre olarak yer almalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
