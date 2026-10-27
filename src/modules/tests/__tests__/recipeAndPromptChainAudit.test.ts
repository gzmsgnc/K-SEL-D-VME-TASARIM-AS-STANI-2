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
  saveClientDesign,
  clearClientDesigns,
  saveClientTestResult,
} from '../../../store/storage';
import { generateClientRecipe, prepareRecipeModule } from '../../recipe';
import { generateUnifiedVisualPrompt } from '../../symbols';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
} from '../../../utils/tattooDesignFormatters';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import { runAndBuildTotemResult } from '../../tests';

describe('A15-A16 Son Kontrol: Reçete ve Görsel İstem Zinciri Denetim Testleri', () => {
  const sampleLocation = {
    country: 'Türkiye',
    city: 'İzmir',
    placeName: 'İzmir, Konak',
    latitude: 38.4192,
    longitude: 27.1287,
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
  };

  const clientDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Kaya',
    email: 'deniz.kaya@example.com',
    phone: '5321112233',
    birthDate: '1992-05-18',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Gülseren',
    notes: 'Kişisel dövme konsepti.',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Cem',
    lastName: 'Demir',
    email: 'cem.demir@example.com',
    phone: '5559998877',
    birthDate: '1989-10-12',
    birthTime: '09:15',
    isBirthTimeUnknown: false,
    birthLocation: sampleLocation,
    motherName: 'Zehra',
    notes: 'Ayrı danışan.',
  };

  function setupFullAnalyses(client: Client): ClientArchiveRecord {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const archWithNum = getClientArchive(client.id);
    const ch = calculateClientChakra(client, archWithNum);
    if (ch.chakra) saveClientChakra(client.id, ch.chakra);

    const archWithCh = getClientArchive(client.id);
    const arch = calculateClientArchetype(client, archWithCh);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);

    return getClientArchive(client.id)!;
  }

  // 1. Eksik analiz → reçete engeli
  it('1. Eksik analiz → reçete engeli', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const emptyArch = getClientArchive(client.id);
      const prep = prepareRecipeModule(client, emptyArch);
      assert.strictEqual(prep.status, 'INPUTS_MISSING');

      const res = generateClientRecipe(client, emptyArch);
      assert.strictEqual(res.success, false, 'Eksik analizlerde reçete üretilemez');
      assert.ok(res.errorMessageTr?.includes('Reçete üretimi engellendi'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 2. Reçetesiz → A16 engeli
  it('2. Reçetesiz → A16 engeli', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      assert.throws(() => {
        generateUnifiedVisualPrompt({
          clientId: client.id,
          clientFullName: `${client.firstName} ${client.lastName}`,
          motherName: client.motherName,
          recipe: null as any,
          selectedSymbols: [],
          recommendedSymbols: [],
          excludedSymbols: [],
          style: 'SACRED_GEOMETRY',
          placement: 'FOREARM_INNER',
          colorProfile: 'MONOCHROME_BLACK',
        });
      }, /Eksik reçete/);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 3. clientId izolasyonu
  it('3. clientId izolasyonu', () => {
    const clientA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(clientDataB, 'OWNER_MANUAL');
    try {
      const archA = setupFullAnalyses(clientA);
      const resA = generateClientRecipe(clientA, archA);
      assert.ok(resA.success && resA.design);
      saveClientDesign(clientA.id, resA.design);

      const archB = getClientArchive(clientB.id);
      assert.strictEqual(archB?.designs.length, 0, 'Client B ye Client A nın tasarımı geçmemelidir');

      const fullArchA = getClientArchive(clientA.id);
      assert.strictEqual(fullArchA?.designs[0].clientId, clientA.id);
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // 4. Ana sembol aktarımı
  it('4. Ana sembol aktarımı', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const res = generateClientRecipe(client, arch, {
        primarySymbol: 'Yaşam Ağacı Geometrisi',
      });
      assert.ok(res.success && res.design);
      assert.strictEqual(res.design.recipe.primarySymbol, 'Yaşam Ağacı Geometrisi');

      // A16'ya aktar
      const a16 = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe: res.design.recipe,
        selectedSymbols: [{ symbolId: '1', symbolName: 'Yaşam Ağacı Geometrisi', customMeaning: '', weight: 'PRIMARY' }],
        recommendedSymbols: [],
        excludedSymbols: [],
      });

      assert.ok(a16.primaryPromptEn.includes('Yaşam Ağacı Geometrisi'));
      assert.ok(a16.conceptPromptTr.includes('Yaşam Ağacı Geometrisi'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 5. Hariç sembol güvenliği
  it('5. Hariç sembol güvenliği', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const res = generateClientRecipe(client, arch, {
        primarySymbol: 'Yılan Sembolü',
        excludedSymbols: ['yılan', 'kurukafa'],
      });
      assert.ok(res.success && res.design);

      // Hariç tutulan sembol ana sembol olamaz, güvenli alternatife geçer
      assert.ok(!res.design.recipe.primarySymbol?.toLocaleLowerCase('tr-TR').includes('yılan'));
      assert.ok(res.design.aiPrompt.negativePrompt.includes('yılan'));
      assert.ok(res.design.aiPrompt.negativePrompt.includes('kurukafa'));

      // A16 çağrısında da ana isteme giremez, negatifte kalır
      const a16 = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe: res.design.recipe,
        selectedSymbols: [],
        excludedSymbols: ['yılan', 'kurukafa'],
      });

      assert.ok(!a16.primaryPromptEn.toLocaleLowerCase('tr-TR').includes('yılan'));
      assert.ok(!a16.conceptPromptTr.toLocaleLowerCase('tr-TR').includes('yılan'));
      assert.ok(a16.negativePrompt.includes('yılan'));
      assert.ok(a16.negativePrompt.includes('kurukafa'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 6. Anne adı izolasyonu
  it('6. Anne adı izolasyonu', () => {
    // clientDataA.motherName: 'Gülseren'
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const res = generateClientRecipe(client, arch);
      assert.ok(res.success && res.design);

      const pEn = res.design.aiPrompt.primaryPromptEn.toLocaleLowerCase('tr-TR');
      const pTr = res.design.aiPrompt.conceptPromptTr.toLocaleLowerCase('tr-TR');
      const pNeg = res.design.aiPrompt.negativePrompt.toLocaleLowerCase('tr-TR');
      const primSym = (res.design.recipe.primarySymbol || '').toLocaleLowerCase('tr-TR');

      assert.ok(!pEn.includes('gülseren'), 'Anne adı İngilizce isteme sızmamalı');
      assert.ok(!pTr.includes('gülseren'), 'Anne adı Türkçe konsepte sızmamalı');
      assert.ok(pNeg.includes('gülseren'), 'Anne adı koruyucu filtre olarak negatif istemde bulunabilir');
      assert.ok(!primSym.includes('gülseren'), 'Anne adı ana sembole sızmamalı');

      // A16 çıktısı kontrolü
      const a16 = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe: res.design.recipe,
        selectedSymbols: [],
      });

      assert.ok(!a16.primaryPromptEn.toLocaleLowerCase('tr-TR').includes('gülseren'));
      assert.ok(!a16.conceptPromptTr.toLocaleLowerCase('tr-TR').includes('gülseren'));
      assert.ok(!a16.negativePrompt.toLocaleLowerCase('tr-TR').includes('gülseren'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 7. Totem dahil/hariç güvenliği
  it('7. Totem dahil/hariç güvenliği', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const totemAnswers: Record<string, string> = {};
      for (let i = 1; i <= 10; i++) totemAnswers[`tot_q${i}`] = `tot_q${i}_o1`;
      const totemResult = runAndBuildTotemResult(client, arch, totemAnswers);
      saveClientTestResult(client.id, totemResult);

      const archWithTotem = getClientArchive(client.id)!;

      // Durum A: includeTotemInVisual = false
      const resFalse = generateClientRecipe(client, archWithTotem, {
        includeTotemInVisual: false,
      });
      assert.ok(resFalse.success && resFalse.design);
      assert.ok(!resFalse.design.aiPrompt.primaryPromptEn.includes('silhouette of'));
      assert.ok(resFalse.design.recipe.totemAbstractionNotes?.includes('görsel tasarıma dahil edilmedi'));

      // Durum B: includeTotemInVisual = true (soyut silüet olarak eklenir, doğrudan sticker figür olarak değil)
      const resTrue = generateClientRecipe(client, archWithTotem, {
        includeTotemInVisual: true,
      });
      assert.ok(resTrue.success && resTrue.design);
      assert.ok(resTrue.design.aiPrompt.primaryPromptEn.includes('abstract geometric silhouette'));
      assert.ok(resTrue.design.recipe.totemAbstractionNotes?.includes('soyut çizgiler ve geometrik silüet'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 8. Özel ölçü aktarımı
  it('8. Özel ölçü aktarımı', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const res = generateClientRecipe(client, arch, {
        customDimensions: { width: 9, height: 14 },
      });
      assert.ok(res.success && res.design);

      // Reçeteye tam aktarılmalı
      assert.strictEqual(res.design.recipe.recommendedDimensionsCm.width, 9);
      assert.strictEqual(res.design.recipe.recommendedDimensionsCm.height, 14);

      // Sanatçı tavsiyelerine aktarılmalı
      const advice = res.design.recipe.technicalAdviceForArtist || [];
      const dimAdvice = advice.find((a) => a.includes('9cm x 14cm'));
      assert.ok(dimAdvice, 'Sanatçı tavsiyesinde özel ebat yer almalıdır');

      // A16 çıktısına aktarılmalı
      const a16 = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`,
        motherName: client.motherName,
        recipe: res.design.recipe,
        selectedSymbols: [],
      });
      assert.ok(a16.conceptPromptTr.includes('9x14 cm'));
      assert.ok(a16.technicalDirectives.some((t) => t.includes('9 cm x 14 cm')));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 9. Sürüm koruması
  it('9. Sürüm koruması', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      let arch = setupFullAnalyses(client);
      const d1 = generateClientRecipe(client, arch, { preferredStyle: 'SACRED_GEOMETRY' }).design!;
      saveClientDesign(client.id, d1);

      arch = getClientArchive(client.id)!;
      const d2 = generateClientRecipe(client, arch, { preferredStyle: 'FINE_LINE' }).design!;
      saveClientDesign(client.id, d2);

      const finalArch = getClientArchive(client.id);
      assert.strictEqual(finalArch?.designs.length, 2, 'İki sürüm de korunmalıdır');
      assert.strictEqual(finalArch?.designs[0].versionNumber, 1);
      assert.strictEqual(finalArch?.designs[1].versionNumber, 2);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 10. Geçmiş sürüm salt okunurluğu
  it('10. Geçmiş sürüm salt okunurluğu', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      let arch = setupFullAnalyses(client);
      const d1 = generateClientRecipe(client, arch, { preferredStyle: 'SACRED_GEOMETRY' }).design!;
      saveClientDesign(client.id, d1);

      arch = getClientArchive(client.id)!;
      const d2 = generateClientRecipe(client, arch, { preferredStyle: 'FINE_LINE' }).design!;
      saveClientDesign(client.id, d2);

      const latestArch = getClientArchive(client.id)!;
      const v1 = latestArch.designs.find((d) => d.versionNumber === 1);
      const v2 = latestArch.designs.find((d) => d.versionNumber === 2);

      assert.notStrictEqual(v1?.id, v2?.id);
      assert.strictEqual(v1?.recipe.style, 'SACRED_GEOMETRY');
      assert.strictEqual(v2?.recipe.style, 'FINE_LINE');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 11. Kopyalama izolasyonu
  it('11. Kopyalama izolasyonu', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const res = generateClientRecipe(client, arch, {
        excludedSymbols: ['ejderha'],
      });
      assert.ok(res.success && res.design);

      const recipeText = formatTattooRecipeText(client, res.design);
      const promptText = formatVisualPromptText(client, res.design);
      const negPromptText = formatNegativePromptText(client, res.design);
      const allPackageText = formatFullDesignPackageText(client, res.design);

      assert.ok(recipeText.includes(client.firstName) && recipeText.includes(client.id));
      assert.ok(promptText.includes(client.firstName));
      assert.ok(negPromptText.includes('ejderha'));
      // Asla anne adı görsel istemde (primaryPromptEn, conceptPromptTr) veya reçete sembollerinde bulunmamalıdır
      assert.ok(!res.design.aiPrompt.primaryPromptEn.toLocaleLowerCase('tr-TR').includes('gülseren'));
      assert.ok(!res.design.aiPrompt.conceptPromptTr.toLocaleLowerCase('tr-TR').includes('gülseren'));
      assert.ok(!recipeText.toLocaleLowerCase('tr-TR').includes('gülseren'));
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // 12. Deterministik çıktı
  it('12. Deterministik çıktı', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    try {
      const arch = setupFullAnalyses(client);
      const run1 = generateClientRecipe(client, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 11, height: 16 },
        colorPreference: 'MONOCHROME_BLACK',
      });
      const run2 = generateClientRecipe(client, arch, {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
        customDimensions: { width: 11, height: 16 },
        colorPreference: 'MONOCHROME_BLACK',
      });

      assert.strictEqual(run1.design?.recipe.primarySymbol, run2.design?.recipe.primarySymbol);
      assert.deepStrictEqual(run1.design?.recipe.secondarySymbols, run2.design?.recipe.secondarySymbols);
      assert.strictEqual(run1.design?.aiPrompt?.primaryPromptEn, run2.design?.aiPrompt?.primaryPromptEn);
      assert.strictEqual(run1.design?.aiPrompt?.negativePrompt, run2.design?.aiPrompt?.negativePrompt);
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
