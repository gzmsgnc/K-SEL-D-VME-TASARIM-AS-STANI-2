import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  generateClientDossierText,
  generateClientDossierJson,
  getClientPersonalInfoText,
  getAnalysesSummaryText,
  getEnneagramSummaryText,
  getTotemSummaryText,
  getRecipeSummaryText,
  getVisualPromptText,
} from '../../../utils/clientDossierGenerator';

describe('A26: Danışan Dosyası ve Dışa Aktarma Doğrulama Testleri', () => {
  const mockClientA: Client = {
    id: 'CLI-A26-001',
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz.kaya@example.com',
    phone: '+90 532 111 2233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      city: 'İzmir',
      country: 'Türkiye',
      placeName: 'İzmir, Konak',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülseren',
    notes: 'Geometrik ve minimal çizgileri tercih ediyor.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    source: 'CLIENT_FORM',
    status: 'ACTIVE',
  };

  const mockClientB: Client = {
    id: 'CLI-A26-002',
    firstName: 'Barış',
    lastName: 'Yılmaz',
    email: 'baris.yilmaz@example.com',
    phone: '+90 555 444 5566',
    birthDate: '1988-11-04',
    birthTime: '00:00',
    isBirthTimeUnknown: true,
    birthLocation: {
      city: 'Ankara',
      country: 'Türkiye',
      placeName: 'Ankara, Çankaya',
      latitude: 39.9208,
      longitude: 32.8541,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: '',
    createdAt: '2026-03-02T12:00:00Z',
    updatedAt: '2026-03-02T12:00:00Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  const mockArchive: ClientArchiveRecord = {
    client: mockClientA,
    reports: [],
    historySummary: {
      totalAnalysesCount: 1,
      totalDesignsCount: 2,
      lastInteractionAt: '2026-03-01T14:30:00Z',
    },
    analyses: [
      {
        id: 'ANA-001',
        clientId: 'CLI-A26-001',
        version: 1,
        createdAt: '2026-03-01T11:00:00Z',
        updatedAt: '2026-03-01T11:00:00Z',
        astrology: {
          zodiacSystem: 'TROPICAL',
          houseSystem: 'PLACIDUS',
          isBirthTimeUnknown: false,
          birthDate: '1992-05-18',
          birthTime: '14:30',
          latitude: 38.4192,
          longitude: 27.1287,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
          sunSign: 'Taurus',
          moonSign: 'Scorpio',
          ascendantSign: 'Virgo',
          planetaryPositions: [
            { body: 'Sun', sign: 'Taurus', degree: 27, minute: 30, houseNumber: 9 },
            { body: 'Moon', sign: 'Scorpio', degree: 14, minute: 12, houseNumber: 3 },
          ],
        },
        numerology: {
          lifePathNumber: 8,
          destinyNumber: 4,
          soulUrgeNumber: 11,
          personalityNumber: 2,
          birthdayNumber: 18,
          worldMissionNumber: 3,
          karmicLessons: [7],
          masterNumbers: [11],
        },
        chakra: {
          chakras: [
            { chakra: 'ROOT', score: 8, status: 'BALANCED', focusRecommendations: [] },
            { chakra: 'HEART', score: 4, status: 'UNDERACTIVE', focusRecommendations: [] },
          ],
          dominantChakra: 'ROOT',
          primaryDeficit: 'HEART',
        },
        archetype: {
          unifiedArchetype: {
            primary: 'Bilge & Mimar',
            secondary: 'Yalnız Gezgin',
            description: 'Stratejik netlik ve derin içgörü',
          },
          shadowArchetype: {
            shadowName: 'Aşırı İzolasyoncu',
            transformationalSymbol: 'Kutsal geometri pusulası',
          },
        },
      },
    ],
    testResults: [
      {
        id: 'TEST-ENNEA-001',
        clientId: 'CLI-A26-001',
        testType: 'ENNEAGRAM',
        primaryType: 'Tip 5 — Araştırmacı / Gözlemci',
        secondaryType: 'Kanat 4 (5w4 Bireyci Kanat)',
        dominantScores: {
          'Tip 5': 14,
          'Tip 4': 9,
          'Tip 1': 6,
        },
        interpretations: [
          'Bilgiye derin merak duyan, bağımsız ve odaklanmış zihinsel yapı.',
        ],
        completedAt: '2026-03-01T11:30:00Z',
        version: 1,
        answers: [],
      },
      {
        id: 'TEST-TOTEM-001',
        clientId: 'CLI-A26-001',
        testType: 'ANIMAL_TOTEM',
        primaryType: 'Baykuş (Owl) — Gece Bilgeliği ve Sezgi',
        secondaryType: 'Kurt (Wolf) — Sadakat ve Bağımsız Yolculuk',
        dominantScores: {
          'Baykuş': 13,
          'Kurt': 10,
          'Kartal': 7,
        },
        interpretations: [
          'Görünmeyeni görme yeteneği ve sessiz tefekkür gücü.',
        ],
        completedAt: '2026-03-01T11:45:00Z',
        version: 1,
        answers: [],
      },
    ],
    symbolAnalyses: [],
    designs: [
      {
        id: 'DES-001',
        clientId: 'CLI-A26-001',
        versionNumber: 1,
        title: 'Kozmik Bilge — Geometrik Baykuş Konsepti',
        conceptStatement: 'Zihnin berraklığı ile kalbin bilgeliğini birleştiren kutsal geometri.',
        createdAt: '2026-03-01T12:00:00Z',
        updatedAt: '2026-03-01T12:00:00Z',
        recipe: {
          style: 'SACRED_GEOMETRY',
          recommendedPlacement: 'FOREARM_INNER',
          placementDescription: 'Sağ ön kol iç yüzey, dikey eksenli akış',
          recommendedDimensionsCm: { width: 10, height: 18 },
          colorProfile: 'BLACK_AND_GREY',
          colorRationale: 'Gölgelendirme ve çizgi netliği için siyah-gri mikro detaylar',
          primarySymbol: 'Stilize Baykuş ve Metatron Küpü',
          secondarySymbols: ['Hilal', 'Altın Oran Spirali'],
          excludedElements: ['Kafatası', 'Gotik yazılar'],
          totemAbstractionNotes: 'Baykuş anatomisi geometrik çizgilerle soyutlanmıştır.',
          keyComponents: ['Merkezi baykuş başı', 'Kutsal geometri ızgarası', 'Karmik döngü halkaları'],
          technicalAdviceForArtist: ['3RL iğne ile ince çizgi çalışması önerilir.', 'Kontrast dengesini koruyun.'],
        },
        aiPrompt: {
          primaryPromptEn: 'Sacred geometry tattoo design of an abstract owl with Metatron cube, fine lines, black and grey ink on white background',
          conceptPromptTr: 'Metatron küpü ile entegre edilmiş soyut baykuş dövme tasarımı',
          negativePrompt: 'color, shading blur, skull, gothic text, messy background',
          artisticModifiers: ['fine line', 'vector sharp', '8k resolution'],
          aspectRatio: '3:4',
        },
      },
      {
        id: 'DES-002',
        clientId: 'CLI-A26-001',
        versionNumber: 2,
        title: 'Kozmik Bilge V2 — Minimalist Varyasyon',
        conceptStatement: 'Daha kompakt ve minimal boyutlandırılmış ikinci versiyon.',
        createdAt: '2026-03-01T14:30:00Z',
        updatedAt: '2026-03-01T14:30:00Z',
        recipe: {
          style: 'FINE_LINE',
          recommendedPlacement: 'UPPER_ARM_BICEP',
          placementDescription: 'Üst kol dış yüzey',
          recommendedDimensionsCm: { width: 8, height: 12 },
          colorProfile: 'MONOCHROME_BLACK',
          colorRationale: 'Sade monokrom siyah mürekkep',
          primarySymbol: 'Lineer Baykuş Silüeti',
          secondarySymbols: ['Minimalist Hilal'],
          excludedElements: ['Karmaşık ızgaralar'],
          totemAbstractionNotes: 'Totem minimal kontur ile aktarılmıştır.',
          keyComponents: ['Tek çizgi baykuş silüeti', 'Minimalist ay döngüsü'],
          technicalAdviceForArtist: ['1RL veya 3RL tek geçişli temiz çizgiler.'],
        },
        aiPrompt: {
          primaryPromptEn: 'Minimalist linear owl tattoo design, single line art, pure black on white background',
          conceptPromptTr: 'Tek çizgi sanatıyla çizilmiş minimal baykuş dövmesi',
          negativePrompt: 'colors, gradients, 3d, realistic textures',
          artisticModifiers: ['minimal line art', 'clean edges'],
          aspectRatio: '1:1',
        },
      },
    ],
  };

  it('1. Tüm 11 bölümü içeren eksiksiz metin dosyası (generateClientDossierText) üretmelidir', () => {
    const text = generateClientDossierText(mockClientA, mockArchive);

    assert.ok(text.includes('DÖVME TASARIM ASİSTANI — BÜTÜNLEŞİK DANIŞAN DOSYASI'));
    assert.ok(text.includes('Danışan: Deniz Kaya (ID: CLI-A26-001)'));

    // 1. Temel danışan bilgileri
    assert.ok(text.includes('1. TEMEL DANIŞAN VE İLETİŞİM BİLGİLERİ'));
    assert.ok(text.includes('deniz.kaya@example.com'));
    assert.ok(text.includes('+90 532 111 2233'));

    // 2. Doğum ve konum bilgileri
    assert.ok(text.includes('2. DOĞUM VE COĞRAFİ KONUM PARAMETRELERİ'));
    assert.ok(text.includes('1992-05-18'));
    assert.ok(text.includes('14:30'));
    assert.ok(text.includes('İzmir, Konak'));
    assert.ok(text.includes('Ebced Anne Adı    : Gülseren'));

    // 3. Astroloji sonucu
    assert.ok(text.includes('3. BATI / TROPICAL ASTROLOJİ ANALİZİ'));
    assert.ok(text.includes('Boğa'));
    assert.ok(text.includes('Akrep'));
    assert.ok(text.includes('Başak'));

    // 4. Numeroloji sonucu
    assert.ok(text.includes('4. PİSAGOR VE İBRANİ NUMEROLOJİ ANALİZİ'));
    assert.ok(text.includes('Yaşam Yolu Sayısı : 8'));
    assert.ok(text.includes('Kader / İsim Sayısı: 4'));

    // 5. Çakra analizi
    assert.ok(text.includes('5. ÇAKRA ENERJİ VE DENGE ANALİZİ'));
    assert.ok(text.includes('Kök Çakra'));
    assert.ok(text.includes('Kalp Çakrası'));

    // 6. Arketip analizi
    assert.ok(text.includes('6. BİRLEŞİK ARKETİP ÇÖZÜMLEMESİ'));
    assert.ok(text.includes('Bilge & Mimar'));

    // 7. Enneagram sonucu
    assert.ok(text.includes('7. ENNEAGRAM MİZAÇ TESTİ SONUCU'));
    assert.ok(text.includes('Tip 5'));

    // 8. Totem sonucu
    assert.ok(text.includes('8. HAYVAN TOTEMİ TESTİ SONUCU'));
    assert.ok(text.includes('Baykuş'));

    // 9. Dövme reçetesi
    assert.ok(text.includes('9. GÜNCEL DÖVME REÇETESİ'));
    assert.ok(text.includes('Lineer Baykuş Silüeti')); // son sürüm V2
    assert.ok(text.includes('Üst Kol'));

    // 10. Görsel üretim istemi
    assert.ok(text.includes('10. GÖRSEL ÜRETİM İSTEMİ (AI PROMPT BİLGİLERİ)'));
    assert.ok(text.includes('Minimalist linear owl tattoo design'));

    // 11. Tasarım sürüm geçmişi
    assert.ok(text.includes('11. TASARIM SÜRÜM GEÇMİŞİ (2 Kayıtlı Sürüm)'));
    assert.ok(text.includes('V1'));
    assert.ok(text.includes('V2'));
  });

  it('2. Anne adı görsel üretim istemine (Bölüm 10) KESİNLİKLE sızmamalıdır', () => {
    const text = generateClientDossierText(mockClientA, mockArchive);

    const section10 = text.split('10. GÖRSEL ÜRETİM İSTEMİ (AI PROMPT BİLGİLERİ)')[1]?.split('11. TASARIM SÜRÜM GEÇMİŞİ')[0];
    assert.ok(section10);
    assert.strictEqual(section10.includes('Gülseren'), false);
    assert.ok(section10.includes('Güvenlik Denetimi : Anne adı bu görsel isteme KESİNLİKLE dahil edilmemiştir.'));
  });

  it('3. Eksik verilerde uydurma veri üretmemeli, açıkça "Kayıt bulunmuyor" göstermelidir', () => {
    const textB = generateClientDossierText(mockClientB, mockArchive);

    assert.ok(textB.includes('Danışan: Barış Yılmaz (ID: CLI-A26-002)'));
    assert.ok(textB.includes('3. BATI / TROPICAL ASTROLOJİ ANALİZİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('4. PİSAGOR VE İBRANİ NUMEROLOJİ ANALİZİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('5. ÇAKRA ENERJİ VE DENGE ANALİZİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('6. BİRLEŞİK ARKETİP ÇÖZÜMLEMESİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('7. ENNEAGRAM MİZAÇ TESTİ SONUCU\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('8. HAYVAN TOTEMİ TESTİ SONUCU\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('9. GÜNCEL DÖVME REÇETESİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('10. GÖRSEL ÜRETİM İSTEMİ (AI PROMPT BİLGİLERİ)\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
    assert.ok(textB.includes('11. TASARIM SÜRÜM GEÇMİŞİ\n----------------------------------------------------------------------\nKayıt bulunmuyor.'));
  });

  it('4. Danışan A verisi Danışan B dosyasına sızmamalıdır (Danışan İzolasyonu)', () => {
    const textB = generateClientDossierText(mockClientB, mockArchive);

    assert.strictEqual(textB.includes('Deniz'), false);
    assert.strictEqual(textB.includes('Kaya'), false);
    assert.strictEqual(textB.includes('CLI-A26-001'), false);
    assert.strictEqual(textB.includes('deniz.kaya@example.com'), false);
    assert.strictEqual(textB.includes('Gülseren'), false);
    assert.strictEqual(textB.includes('Baykuş'), false);
    assert.strictEqual(textB.includes('Kozmik Bilge'), false);
  });

  it('5. JSON dışa aktarma (generateClientDossierJson) doğru şema ve danışan izolasyonu sağlamalıdır', () => {
    const jsonA: any = generateClientDossierJson(mockClientA, mockArchive);

    assert.strictEqual(jsonA.client.id, 'CLI-A26-001');
    assert.strictEqual(jsonA.client.firstName, 'Deniz');
    assert.notStrictEqual(jsonA.analyses, null);
    assert.strictEqual(jsonA.analyses.astrology.sunSign, 'Taurus');
    assert.strictEqual(jsonA.testResults.length, 2);
    assert.strictEqual(jsonA.designs.length, 2);

    const jsonB: any = generateClientDossierJson(mockClientB, mockArchive);
    assert.strictEqual(jsonB.client.id, 'CLI-A26-002');
    assert.strictEqual(jsonB.client.firstName, 'Barış');
    assert.strictEqual(jsonB.analyses, null);
    assert.strictEqual(jsonB.testResults.length, 0);
    assert.strictEqual(jsonB.designs.length, 0);
  });

  it('6. Bölüm bölüm kopyalama metinleri doğru formatta üretilmelidir', () => {
    const pInfo = getClientPersonalInfoText(mockClientA);
    assert.ok(pInfo.includes('Deniz Kaya'));
    assert.ok(pInfo.includes('+90 532 111 2233'));

    const anSummary = getAnalysesSummaryText(mockClientA, mockArchive);
    assert.ok(anSummary.includes('Astroloji: Güneş Boğa'));
    assert.ok(anSummary.includes('Numeroloji: Yaşam Yolu 8'));

    const enSummary = getEnneagramSummaryText(mockClientA, mockArchive);
    assert.ok(enSummary.includes('Tip 5'));

    const totSummary = getTotemSummaryText(mockClientA, mockArchive);
    assert.ok(totSummary.includes('Baykuş'));

    const recSummary = getRecipeSummaryText(mockClientA, mockArchive);
    assert.ok(recSummary.includes('Lineer Baykuş Silüeti'));

    const promptSummary = getVisualPromptText(mockClientA, mockArchive);
    assert.ok(promptSummary.includes('Minimalist linear owl tattoo design'));
    assert.strictEqual(promptSummary.includes('Gülseren'), false);
  });

  it('7. Dışa aktarma fonksiyonları danışan veya arşiv verilerini mutasyona uğratmamalıdır (Salt-okunur)', () => {
    const archiveCopy = JSON.parse(JSON.stringify(mockArchive));
    const clientCopy = JSON.parse(JSON.stringify(mockClientA));

    generateClientDossierText(mockClientA, mockArchive);
    generateClientDossierJson(mockClientA, mockArchive);
    getClientPersonalInfoText(mockClientA);
    getAnalysesSummaryText(mockClientA, mockArchive);
    getEnneagramSummaryText(mockClientA, mockArchive);
    getTotemSummaryText(mockClientA, mockArchive);
    getRecipeSummaryText(mockClientA, mockArchive);
    getVisualPromptText(mockClientA, mockArchive);

    assert.deepStrictEqual(mockArchive, archiveCopy);
    assert.deepStrictEqual(mockClientA, clientCopy);
  });
});
