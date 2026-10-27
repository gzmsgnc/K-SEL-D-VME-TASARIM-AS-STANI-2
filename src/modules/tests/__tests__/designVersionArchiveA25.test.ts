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

describe('A25: Danışan Arşivi ve Tasarım Sürüm Yönetimi Doğrulama Testleri', () => {
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
        notes: 'A25 Sürüm Yönetim Testi',
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
      conceptStatement: `Versiyon ${versionNumber} konsept manifestosu.`,
      recipe: {
        style: versionNumber === 1 ? 'FINE_LINE' : 'SACRED_GEOMETRY',
        recommendedPlacement: versionNumber === 1 ? 'FOREARM_INNER' : 'SPINE_CENTER',
        placementDescription: 'Anatomik akış açıklaması.',
        recommendedDimensionsCm: { width: 10 + versionNumber, height: 15 + versionNumber },
        colorProfile: 'MONOCHROME_BLACK',
        colorRationale: 'Siyah mürekkep derinliği.',
        primarySymbol: versionNumber === 1 ? 'Lotus' : 'Metatron Küpü',
        secondarySymbols: ['Ay Fazları', 'Spiral'],
        keyComponents: ['Ana Geometri', 'Hassas Çizgiler'],
        technicalAdviceForArtist: ['3RL iğne grubu', 'Sabit el açısı'],
      },
      aiPrompt: {
        primaryPromptEn: `Tattoo design version ${versionNumber}, minimalist sacred geometry`,
        conceptPromptTr: `Türkçe konsept özeti sürüm ${versionNumber}`,
        negativePrompt: 'blurry, ugly, watermark, text',
        aspectRatio: '3:4',
        artisticModifiers: ['fineline', 'vector art'],
      },
      createdAt: new Date(Date.now() - (10 - versionNumber) * 60000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 1. Yeni Tasarım Sürümlerinin Bağımsız Olarak Saklanması (V1, V2, V3)
  it('1. Her yeni tasarım sürümü önceki sürümleri silmeden V1, V2 olarak arşivlenmelidir', () => {
    const client = createSampleClient('MultiVer');

    try {
      const v1 = createMockDesign(client.id, 1, 'Lotus Çiçeği Kompozisyonu');
      const v2 = createMockDesign(client.id, 2, 'Kutsal Metatron Geometrisi');
      const v3 = createMockDesign(client.id, 3, 'Gölge Şahin ve Fraktal Hatlar');

      saveClientDesign(client.id, v1);
      saveClientDesign(client.id, v2);
      saveClientDesign(client.id, v3);

      const designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 3, 'Tam 3 tasarım sürümü arşivde bulunmalıdır');
      assert.strictEqual(designs[0].versionNumber, 1);
      assert.strictEqual(designs[1].versionNumber, 2);
      assert.strictEqual(designs[2].versionNumber, 3);
      assert.strictEqual(designs[0].recipe.primarySymbol, 'Lotus');
      assert.strictEqual(designs[1].recipe.primarySymbol, 'Metatron Küpü');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 2. Geçmiş Sürümü İnceleme ve Salt Okunurluk Güvencesi
  it('2. Geçmiş sürümü seçmek güncel sürümün veya diğer sürümlerin içeriğini asla değiştirmemelidir', () => {
    const client = createSampleClient('ReadOnly');

    try {
      const v1 = createMockDesign(client.id, 1, 'Sürüm 1 Orijinal');
      const v2 = createMockDesign(client.id, 2, 'Sürüm 2 Güncel');

      saveClientDesign(client.id, v1);
      saveClientDesign(client.id, v2);

      let archive = getClientArchive(client.id);
      assert.ok(archive);
      const latestBefore = archive.designs[archive.designs.length - 1];
      assert.strictEqual(latestBefore.versionNumber, 2);
      assert.strictEqual(latestBefore.title, 'Sürüm 2 Güncel');

      // V1 salt okunur olarak inceleniyor (ID seçimi simülasyonu)
      const selectedV1 = archive.designs.find((d) => d.versionNumber === 1);
      assert.ok(selectedV1);
      assert.strictEqual(selectedV1.title, 'Sürüm 1 Orijinal');

      // Arşiv tekrar çekildiğinde güncel sürüm (V2) bozulmamış ve değişmemiş olmalıdır
      archive = getClientArchive(client.id);
      assert.strictEqual(archive?.designs.length, 2);
      assert.strictEqual(archive?.designs[1].title, 'Sürüm 2 Güncel');
      assert.strictEqual(archive?.designs[0].title, 'Sürüm 1 Orijinal');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 3. Danışan İzolasyonu: Farklı Danışanların Sürümleri Birbirine Asla Karışmamalıdır
  it('3. Danışan A nın tasarım sürümleri Danışan B nin arşivinde görünmemeli ve etkilememelidir', () => {
    const clientA = createSampleClient('IsoA');
    const clientB = createSampleClient('IsoB');

    try {
      const designA1 = createMockDesign(clientA.id, 1, 'Client A Özel Mandala');
      const designA2 = createMockDesign(clientA.id, 2, 'Client A Özel Şahin');
      const designB1 = createMockDesign(clientB.id, 1, 'Client B Özel Ejderha');

      saveClientDesign(clientA.id, designA1);
      saveClientDesign(clientA.id, designA2);
      saveClientDesign(clientB.id, designB1);

      const archiveA = getClientArchive(clientA.id);
      const archiveB = getClientArchive(clientB.id);

      assert.strictEqual(archiveA?.designs.length, 2, 'Danışan A yalnızca 2 tasarıma sahip olmalıdır');
      assert.strictEqual(archiveB?.designs.length, 1, 'Danışan B yalnızca 1 tasarıma sahip olmalıdır');

      // Her tasarımın kendi clientId sine sahip olduğunu doğrula
      archiveA?.designs.forEach((d) => assert.strictEqual(d.clientId, clientA.id));
      archiveB?.designs.forEach((d) => assert.strictEqual(d.clientId, clientB.id));

      // Danışan A dan bir sürüm silindiğinde Danışan B asla etkilenmemelidir
      deleteClientDesign(clientA.id, designA1.id);
      assert.strictEqual(getClientDesigns(clientA.id).length, 1);
      assert.strictEqual(getClientDesigns(clientB.id).length, 1);
      assert.strictEqual(getClientDesigns(clientB.id)[0].title, 'Client B Özel Ejderha');
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 4. Arşiv Boş Durumu ve Sürüm Silme Güvenliği
  it('4. Arşiv boşken veya bir sürüm silindiğinde sistem güvenli davranmalıdır', () => {
    const client = createSampleClient('EmptyCheck');

    try {
      // Başlangıçta 0 tasarım
      let designs = getClientDesigns(client.id);
      assert.strictEqual(designs.length, 0, 'Başlangıçta arşiv boş olmalıdır');

      const v1 = createMockDesign(client.id, 1, 'Geçici Sürüm');
      saveClientDesign(client.id, v1);
      assert.strictEqual(getClientDesigns(client.id).length, 1);

      // Sürümü sil
      const deleted = deleteClientDesign(client.id, v1.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(getClientDesigns(client.id).length, 0);

      // Olmayan sürümü silmeye çalışma
      const fakeDelete = deleteClientDesign(client.id, 'olmayan_id');
      assert.strictEqual(fakeDelete, false);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 5. Geriye Dönük Uyumluluk ve Eksiksiz Veri Modeli
  it('5. Tasarım kayıtları tüm veri modeli alanlarını (reçete, aiPrompt, tarih) eksiksiz muhafaza etmelidir', () => {
    const client = createSampleClient('CompatCheck');

    try {
      const design = createMockDesign(client.id, 1, 'Bütünleşik Test Tasarımı');
      saveClientDesign(client.id, design);

      const loaded = getClientDesigns(client.id)[0];
      assert.ok(loaded.id);
      assert.ok(loaded.createdAt);
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
