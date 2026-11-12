import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  saveClientDesign,
  getClientDesigns,
  deleteClientDesign,
  getClientArchive,
  deleteClientRecord,
} from '../../../store/storage';
import { ClientTattooDesign } from '../../../types/design';
import { Client } from '../../../types/client';

describe('A25: Danışan Dövme Tasarımı Tekil Güncel Kayıt Doğrulama Testleri', () => {
  function createSampleClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `Tasarim_${suffix}`,
        lastName: `Danisan_${suffix}`,
        email: `tasarim_${suffix.toLowerCase()}@example.com`,
        phone: '5554443322',
        birthDate: '1995-03-25',
        birthTime: '15:45',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'Antalya',
          placeName: 'Antalya, Türkiye',
          latitude: 36.8969,
          longitude: 30.7133,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Sevgi',
        notes: 'A25 Tekil Güncel Kayıt Testi',
      },
      'OWNER_MANUAL'
    );
  }

  function createMockDesign(clientId: string, versionNumber: number, title: string): ClientTattooDesign {
    return {
      id: `design_${clientId}_v${versionNumber}`,
      clientId,
      versionNumber,
      title,
      conceptStatement: `Tasarım ${title} konsept manifestosu.`,
      recipe: {
        style: versionNumber === 1 ? 'FINE_LINE' : 'SACRED_GEOMETRY',
        recommendedPlacement: versionNumber === 1 ? 'FOREARM_INNER' : 'SPINE_CENTER',
        placementDescription: 'Anatomik akış açıklaması.',
        recommendedDimensionsCm: { width: 10 + versionNumber, height: 15 + versionNumber },
        colorProfile: 'MONOCHROME_BLACK',
        colorRationale: 'Siyah mürekkep derinliği.',
        primarySymbol: versionNumber === 1 ? 'Lotus' : (versionNumber === 2 ? 'Metatron Küpü' : 'Gölge Şahin'),
        secondarySymbols: ['Ay Fazları', 'Spiral'],
        keyComponents: ['Ana Geometri', 'Hassas Çizgiler'],
        technicalAdviceForArtist: ['3RL iğne grubu', 'Sabit el açısı'],
      },
      aiPrompt: {
        primaryPromptEn: `Tattoo design ${title}, minimalist sacred geometry`,
        conceptPromptTr: `Türkçe konsept özeti: ${title}`,
        negativePrompt: 'blurry, ugly, watermark, text',
        aspectRatio: '3:4',
        artisticModifiers: ['fineline', 'vector art'],
      },
      createdAt: new Date(Date.now() - (10 - versionNumber) * 60000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 1. Aynı danışan için ilk tasarım kaydedildiğinde bir kayıt oluşur
  it('1. Aynı danışan için ilk tasarım kaydedildiğinde tam bir güncel kayıt oluşmalıdır', () => {
    const client = createSampleClient('Single1');

    try {
      const v1 = createMockDesign(client.id, 1, 'Lotus Çiçeği Kompozisyonu');
      saveClientDesign(client.id, v1);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1, 'İlk tasarım kaydedildiğinde tam 1 kayıt bulunmalıdır');
      assert.strictEqual(designs[0].clientId, client.id);
      assert.strictEqual(designs[0].title, 'Lotus Çiçeği Kompozisyonu');
      assert.strictEqual(designs[0].recipe.primarySymbol, 'Lotus');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 2. & 3. Aynı danışana ikinci tasarım kaydedildiğinde ilk kayıt tamamen silinir, toplam kayıt sayısı yine birdir
  it('2. ve 3. Aynı danışana ikinci tasarım kaydedildiğinde ilk kayıt tamamen silinmeli ve toplam kayıt sayısı yine 1 olmalıdır', () => {
    const client = createSampleClient('Single2');

    try {
      const v1 = createMockDesign(client.id, 1, 'Sürüm 1 Orijinal');
      saveClientDesign(client.id, v1);
      assert.strictEqual(getClientDesigns(client.id).length, 1);

      // İkinci tasarımı kaydet
      const v2 = createMockDesign(client.id, 2, 'Sürüm 2 Güncellenmiş');
      saveClientDesign(client.id, v2);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1, 'İkinci kayıttan sonra da toplam kayıt sayısı kesinlikle 1 olmalıdır');
      assert.strictEqual(designs[0].id, v2.id);
      assert.strictEqual(designs[0].title, 'Sürüm 2 Güncellenmiş');
      assert.strictEqual(designs[0].recipe.primarySymbol, 'Metatron Küpü');

      // İlk kaydın (v1) kalmadığını doğrula
      const foundV1 = designs.find((d) => d.id === v1.id);
      assert.strictEqual(foundV1, undefined, 'Önceki tasarım kaydı tamamen silinmiş olmalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 4. Üçüncü tasarımda da aynı kural korunur
  it('4. Üçüncü tasarım kaydedildiğinde de aynı kural korunmalı ve yalnızca üçüncü tasarım kalmalıdır', () => {
    const client = createSampleClient('Single3');

    try {
      const v1 = createMockDesign(client.id, 1, 'Tasarım 1');
      const v2 = createMockDesign(client.id, 2, 'Tasarım 2');
      const v3 = createMockDesign(client.id, 3, 'Tasarım 3 En Güncel');

      saveClientDesign(client.id, v1);
      saveClientDesign(client.id, v2);
      saveClientDesign(client.id, v3);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 1, 'Üçüncü kayıttan sonra da arşivde yalnızca 1 kayıt kalmalıdır');
      assert.strictEqual(designs[0].id, v3.id);
      assert.strictEqual(designs[0].title, 'Tasarım 3 En Güncel');
      assert.strictEqual(designs[0].recipe.primarySymbol, 'Gölge Şahin');

      // v1 ve v2 kayıtlarının kesinlikle olmadığını doğrula
      assert.strictEqual(designs.some((d) => d.id === v1.id), false);
      assert.strictEqual(designs.some((d) => d.id === v2.id), false);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 5. Danışan A nın tasarımı güncellenirken danışan B nin tasarımı korunur
  it('5. Danışan A nın tasarımı güncellenirken Danışan B nin tasarımı kesinlikle korunmalıdır', () => {
    const clientA = createSampleClient('IsoA');
    const clientB = createSampleClient('IsoB');

    try {
      const designA1 = createMockDesign(clientA.id, 1, 'Client A İlk Tasarım');
      const designB = createMockDesign(clientB.id, 1, 'Client B Özel Tasarım');

      saveClientDesign(clientA.id, designA1);
      saveClientDesign(clientB.id, designB);

      assert.strictEqual(getClientDesigns(clientA.id).length, 1);
      assert.strictEqual(getClientDesigns(clientB.id).length, 1);

      // Danışan A nın tasarımını güncelle
      const designA2 = createMockDesign(clientA.id, 2, 'Client A Güncel Tasarım');
      saveClientDesign(clientA.id, designA2);

      const designsA = getClientDesigns(clientA.id);
      const designsB = getClientDesigns(clientB.id);

      assert.strictEqual(designsA.length, 1, 'Danışan A yalnızca 1 güncel tasarıma sahip olmalıdır');
      assert.strictEqual(designsA[0].title, 'Client A Güncel Tasarım');

      assert.strictEqual(designsB.length, 1, 'Danışan B nin tasarımı kesinlikle korunmalıdır');
      assert.strictEqual(designsB[0].title, 'Client B Özel Tasarım');
      assert.strictEqual(designsB[0].clientId, clientB.id);
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 6. Sayfa yenileme veya storage dan yeniden yükleme sonrasında eski kayıt geri gelmez
  it('6. Storage dan yeniden yükleme (getClientArchive / getClientDesigns) sonrasında eski kayıt asla geri gelmemelidir', () => {
    const client = createSampleClient('ReloadTest');

    try {
      const v1 = createMockDesign(client.id, 1, 'Eski İlk Tasarım');
      saveClientDesign(client.id, v1);

      const v2 = createMockDesign(client.id, 2, 'Kalıcı Yeni Tasarım');
      saveClientDesign(client.id, v2);

      // Simüle edilen depolama yeniden okuma
      const archive = getClientArchive(client.id);
      assert.ok(archive);
      assert.strictEqual(archive.designs.length, 1, 'Arşivde de kesinlikle tek 1 tasarım bulunmalıdır');
      assert.strictEqual(archive.designs[0].id, v2.id);
      assert.strictEqual(archive.designs[0].title, 'Kalıcı Yeni Tasarım');

      const reloadedDesigns = getClientDesigns(client.id);
      assert.strictEqual(reloadedDesigns.length, 1);
      assert.strictEqual(reloadedDesigns[0].id, v2.id);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 7. Danışan silindiğinde yalnızca o danışanın tasarımı silinir
  it('7. Danışan silindiğinde yalnızca o danışanın tasarımı silinmeli, diğer danışanlar korunmalıdır', () => {
    const clientA = createSampleClient('DeleteA');
    const clientB = createSampleClient('DeleteB');

    try {
      const designA = createMockDesign(clientA.id, 1, 'Tasarım A');
      const designB = createMockDesign(clientB.id, 1, 'Tasarım B');

      saveClientDesign(clientA.id, designA);
      saveClientDesign(clientB.id, designB);

      assert.strictEqual(getClientDesigns(clientA.id).length, 1);
      assert.strictEqual(getClientDesigns(clientB.id).length, 1);

      // Danışan A yı sil
      deleteClientRecord(clientA.id);

      assert.strictEqual(getClientDesigns(clientA.id).length, 0, 'Silinen danışanın tasarımı silinmelidir');
      assert.strictEqual(getClientDesigns(clientB.id).length, 1, 'Danışan B nin tasarımı korunmalıdır');
      assert.strictEqual(getClientDesigns(clientB.id)[0].title, 'Tasarım B');
    } finally {
      deleteClientRecord(clientB.id);
    }
  });

  // 8. Bütünleşik Veri Modeli Uyumluluğu
  it('8. Tekil güncel tasarım kaydı tüm reçete ve aiPrompt alanlarını eksiksiz muhafaza etmelidir', () => {
    const client = createSampleClient('ModelCheck');

    try {
      const design = createMockDesign(client.id, 1, 'Bütünleşik Test Tasarımı');
      saveClientDesign(client.id, design);

      const loaded = getClientDesigns(client.id)[0];
      assert.ok(loaded.id);
      assert.strictEqual(loaded.clientId, client.id);
      assert.ok(loaded.createdAt);
      assert.ok(loaded.updatedAt);
      assert.ok(loaded.recipe.style);
      assert.ok(loaded.recipe.recommendedPlacement);
      assert.ok(loaded.recipe.recommendedDimensionsCm);
      assert.ok(loaded.aiPrompt.primaryPromptEn);
      assert.ok(loaded.aiPrompt.conceptPromptTr);
      assert.ok(loaded.aiPrompt.negativePrompt);
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
