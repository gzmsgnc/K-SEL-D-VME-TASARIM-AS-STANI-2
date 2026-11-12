import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientAstrologyChart,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientDesign,
  deleteClientDesign,
  getClientDesigns,
  saveClientReport,
  getClientReports,
  clearClientReports,
  isClientDesignCompleted,
  clearAllApplicationData,
} from '../../../store/storage';
import { Client, ClientFormData } from '../../../types/client';
import { ClientTattooDesign } from '../../../types/design';
import { ClientTattooReport } from '../../../types/report';
import { calculateClientTropicalChart } from '../../astrology';
import {
  canNavigateToWorkspaceTab,
  evaluateDesignCompletionReadiness,
  validatePersonalBirthStage,
  validateAnalysesStage,
  validateResultsStage,
  isValidTattooPrompt,
} from '../../../utils/navigationGuard';

describe('A63 — Navigasyon Güvenliği, Tasarım Tamamlama Kilidi ve Kalıcı Arşiv Doğrulama Test Paketi', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  const clientDataA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Aksoy',
    email: 'deniz.aksoy.a63@test.com',
    phone: '05321110001',
    birthDate: '1992-05-15',
    birthTime: '08:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İzmir, Konak',
      city: 'İzmir',
      country: 'Türkiye',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Nuran',
    notes: 'A63 Test Profili A',
  };

  const clientDataB: ClientFormData = {
    firstName: 'Barış',
    lastName: 'Demir',
    email: 'baris.demir.a63@test.com',
    phone: '05321110002',
    birthDate: '1988-10-03',
    birthTime: '16:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Ankara, Çankaya',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.9208,
      longitude: 32.8541,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Sevgi',
    notes: 'A63 Test Profili B',
  };

  const setupFullAnalyses = (client: Client) => {
    const astro = calculateClientTropicalChart(client);
    if (astro.chart) {
      saveClientAstrologyChart(client.id, astro.chart);
    }

    saveClientNumerology(client.id, {
      lifePathNumber: 5,
      destinyNumber: 3,
      soulUrgeNumber: 1,
      personalityNumber: 2,
      birthdayNumber: 6,
      worldMissionNumber: 8,
      karmicLessons: [7],
      masterNumbers: [],
      calculatedAt: new Date().toISOString(),
    } as any);

    saveClientChakra(client.id, {
      dominantChakra: 'HEART',
      primaryDeficit: 'ROOT',
      deficitChakras: ['ROOT'],
      chakras: [
        { chakra: 'ROOT', score: 3, status: 'BLOCKED', focusRecommendations: [] },
        { chakra: 'HEART', score: 9, status: 'OVERACTIVE', focusRecommendations: [] },
      ],
      calculatedAt: new Date().toISOString(),
    } as any);

    saveClientArchetype(client.id, {
      unifiedArchetype: { primary: 'Kâşif', secondary: 'Âşık', description: 'Özgürlük' },
      shadowArchetype: { shadowName: 'Bağımlı Kaçış', transformationalSymbol: 'Köklenme Çıpası' },
      calculatedAt: new Date().toISOString(),
    } as any);

    return getClientArchive(client.id);
  };

  it('1. Tasarım tamamlandıktan sonra (F5 / sayfa yenileme) kalıcı arşiv durumu korunmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    setupFullAnalyses(client);

    const fullDesign: ClientTattooDesign = {
      id: 'des_full_1',
      clientId: client.id,
      versionNumber: 1,
      title: 'Kutsal Şahin & Metatron Kompozisyonu',
      conceptStatement: 'Dönüşüm ve ışık tezahürü',
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'İç ön kol hattı',
        recommendedDimensionsCm: { width: 12, height: 18 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Metatron Küpü',
        secondarySymbols: ['Şahin Kanadı'],
        keyComponents: ['Metatron Küpü', 'Şahin Kanadı'],
        technicalAdviceForArtist: ['3RL ince çizgi'],
      },
      aiPrompt: {
        primaryPromptEn: 'Sacred geometry tattoo of metatron cube and hawk wings, blackwork fine line, 8k',
        conceptPromptTr: 'Metatron küpü ve şahin kanadı',
        negativePrompt: 'blurry, ugly, color',
        aspectRatio: '3:4',
        artisticModifiers: ['sharp lines'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveClientDesign(client.id, fullDesign);
    const archiveBefore = getClientArchive(client.id);

    // Kilit denetimi: Tüm zorunlu çıktılar eksiksiz olduğu için isReady === true olmalı
    const readiness = evaluateDesignCompletionReadiness(client, archiveBefore, fullDesign);
    assert.strictEqual(readiness.isReady, true, 'Eksiksiz tasarımda tamamlama kilidi açılmalıdır');
    assert.strictEqual(readiness.missingOutputsTr.length, 0);

    // Tamamlama işlemi simülasyonu: isCompleted bayrağı ve nihai rapor
    const completedDesign: ClientTattooDesign = {
      ...fullDesign,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };
    saveClientDesign(client.id, completedDesign);

    const report: ClientTattooReport = {
      id: `report_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      title: 'Kutsal Şahin & Metatron Raporu',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Kişiye özel',
      sections: [],
    };
    saveClientReport(client.id, report);

    // F5 / Yeniden Yükleme: Doğrudan arşivden oku
    const reloadedArchive = getClientArchive(client.id);
    assert.ok(reloadedArchive, 'Arşiv mevcut olmalıdır');
    assert.strictEqual(reloadedArchive.reports.length, 1, 'Rapor kalıcı olarak arşivde bulunmalıdır');
    assert.strictEqual(reloadedArchive.reports[0].version, 1);

    const isDone = isClientDesignCompleted(client.id, fullDesign.id);
    assert.strictEqual(isDone, true, 'Tasarım kalıcı olarak tamamlanmış görünmelidir');
  });

  it('2. Uygulama yeniden açıldığında (tam depolama simülasyonu) durum korunmalıdır', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    setupFullAnalyses(client);

    const completedDesign: ClientTattooDesign = {
      id: 'des_full_2',
      clientId: client.id,
      versionNumber: 1,
      title: 'Lotus Çiçeği',
      conceptStatement: 'Lotus dönüşüm konsepti',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'WRIST_INNER',
        placementDescription: 'Bilek',
        recommendedDimensionsCm: { width: 5, height: 5 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Lotus',
        keyComponents: ['Lotus'],
        technicalAdviceForArtist: ['Tek iğne'],
      },
      aiPrompt: {
        primaryPromptEn: 'Minimalist fine line lotus flower tattoo, elegant',
        conceptPromptTr: 'Lotus',
        negativePrompt: '',
        aspectRatio: '1:1',
        artisticModifiers: [],
      },
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClientDesign(client.id, completedDesign);

    const report: ClientTattooReport = {
      id: `report_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      title: 'Lotus Raporu',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Gizli',
      sections: [],
    };
    saveClientReport(client.id, report);

    // Doğrudan storage okuma fonksiyonlarıyla simüle et
    const reportsInStorage = getClientReports(client.id);
    assert.strictEqual(reportsInStorage.length, 1);
    assert.strictEqual(reportsInStorage[0].id, `report_${client.id}_v1`);

    const isCompleted = isClientDesignCompleted(client.id, completedDesign.id);
    assert.strictEqual(isCompleted, true);
  });

  it('3. Başka danışana geçildiğinde tamamlanma durumu ASLA diğer danışana karışmamalıdır (İzolasyon)', () => {
    const clientA = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const clientB = createClientRecord(clientDataB, 'OWNER_MANUAL');

    setupFullAnalyses(clientA);
    setupFullAnalyses(clientB);

    // Danışan A için tasarımı tamamla
    const designA: ClientTattooDesign = {
      id: 'des_A_1',
      clientId: clientA.id,
      versionNumber: 1,
      title: 'A Tasarımı',
      conceptStatement: 'A konsepti',
      recipe: {
        style: 'SACRED_GEOMETRY',
        recommendedPlacement: 'SPINE_CENTER',
        placementDescription: 'Sırt',
        recommendedDimensionsCm: { width: 20, height: 30 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Yaşam Çiçeği',
        keyComponents: ['Yaşam Çiçeği'],
        technicalAdviceForArtist: [],
      },
      aiPrompt: {
        primaryPromptEn: 'Flower of life sacred geometry tattoo design',
        conceptPromptTr: 'Yaşam çiçeği',
        negativePrompt: '',
        aspectRatio: '1:1',
        artisticModifiers: [],
      },
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClientDesign(clientA.id, designA);

    const reportA: ClientTattooReport = {
      id: `report_${clientA.id}_v1`,
      clientId: clientA.id,
      version: 1,
      title: 'Rapor A',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Gizli A',
      sections: [],
    };
    saveClientReport(clientA.id, reportA);

    // Danışan A'nın durumu: TAMAMLANDI
    assert.strictEqual(isClientDesignCompleted(clientA.id, designA.id), true);

    // Danışan B'nin durumu: KESİNLİKLE TAMAMLANMAMIŞ OLMALIDIR
    assert.strictEqual(isClientDesignCompleted(clientB.id), false);
    const archiveB = getClientArchive(clientB.id);
    assert.ok(archiveB);
    assert.strictEqual(archiveB.reports.length, 0, 'Danışan B nin arşivinde hiçbir rapor bulunmamalıdır');
  });

  it('4. Sonuçlar Merkezi hazır değilken Semboller aşamasına geçiş engellenmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = getClientArchive(client.id); // Analizler eksik

    const resultsCheck = validateResultsStage(archive, client.id);
    assert.strictEqual(resultsCheck.isReady, false, 'Analizler eksikken Sonuçlar Merkezi hazır olamaz');

    const navAttempt = canNavigateToWorkspaceTab('SYMBOLS', client, archive, 'PERSONAL_BIRTH');
    assert.strictEqual(navAttempt.allowed, false, 'Sonuçlar Merkezi hazır değilken Semboller sekmesine geçilemez');
    assert.ok(
      navAttempt.reasonTr?.includes('Sonuçlar Merkezi hazır olmadan'),
      'Anlaşılır Türkçe bilgilendirme mesajı verilmelidir'
    );
  });

  it('5. Aktif test sırasında (isEnneagramTaking / isTotemTaking) sekmeden çıkış engellenmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = setupFullAnalyses(client);

    // Enneagram testi devam ediyorken çıkış denemesi
    const navEnneagram = canNavigateToWorkspaceTab('RESULTS', client, archive, 'TESTS', {
      isEnneagramTaking: true,
    });
    assert.strictEqual(navEnneagram.allowed, false, 'Enneagram testi çözülüyorken çıkış engellenmelidir');

    // Totem testi devam ediyorken çıkış denemesi
    const navTotem = canNavigateToWorkspaceTab('ANALYSES', client, archive, 'TESTS', {
      isTotemTaking: true,
    });
    assert.strictEqual(navTotem.allowed, false, 'Totem testi çözülüyorken çıkış engellenmelidir');
    assert.ok(navTotem.reasonTr?.includes('test çözmektesiniz'));
  });

  it('6. Çözülmemiş opsiyonel testler doğru gösterilmeli ve sahte tamamlanma üretilmemelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = setupFullAnalyses(client);

    // Test çözülmemiştir
    assert.strictEqual(archive?.testResults.length, 0, 'Test sonuçları boş olmalıdır');

    // Opsiyonel karar: Testler çözülmemiş olsa da Sonuçlar Merkezi ve Tasarıma geçişe izin verilir
    const navResults = canNavigateToWorkspaceTab('RESULTS', client, archive, 'TESTS');
    assert.strictEqual(navResults.allowed, true, 'Opsiyonel testler çözülmeden de Sonuçlar Merkezi görüntülenebilir');

    const navDesign = canNavigateToWorkspaceTab('DESIGN', client, archive, 'RESULTS');
    assert.strictEqual(navDesign.allowed, true, 'Opsiyonel testler çözülmeden de Tasarıma geçilebilir');
  });

  it('7. Silinen tasarım eski tamamlanma raporunu arkasında bırakmamalıdır (Senkronize Temizleme)', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    setupFullAnalyses(client);

    const design: ClientTattooDesign = {
      id: 'des_to_delete',
      clientId: client.id,
      versionNumber: 1,
      title: 'Silinecek Tasarım',
      conceptStatement: 'Silinecek tasarım konsepti',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'Kol',
        recommendedDimensionsCm: { width: 10, height: 10 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Kurt',
        keyComponents: ['Kurt'],
        technicalAdviceForArtist: [],
      },
      aiPrompt: {
        primaryPromptEn: 'Minimalist line art wolf tattoo stencil design',
        conceptPromptTr: 'Kurt',
        negativePrompt: '',
        aspectRatio: '1:1',
        artisticModifiers: [],
      },
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClientDesign(client.id, design);

    const report: ClientTattooReport = {
      id: `report_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      title: 'Silinecek Rapor',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Gizli',
      sections: [],
    };
    saveClientReport(client.id, report);

    assert.strictEqual(isClientDesignCompleted(client.id, design.id), true);

    // Tasarımı sil
    const deleted = deleteClientDesign(client.id, design.id);
    assert.strictEqual(deleted, true);

    // Veri Tutarlılığı Doğrulaması:
    // 1. Tasarım silinmiş olmalı
    const remainingDesigns = getClientDesigns(client.id);
    assert.strictEqual(remainingDesigns.length, 0);

    // 2. Silinen tasarıma ait rapor da arkasında kalmamış (temizlenmiş) olmalı
    const remainingReports = getClientReports(client.id);
    assert.strictEqual(remainingReports.length, 0, 'Silinen tasarımın eski raporu bırakılmamalıdır');

    // 3. Tamamlanma durumu false dönmeli
    assert.strictEqual(isClientDesignCompleted(client.id, design.id), false);
  });

  it('8. Silinen rapor tasarımda sahte/yanlış tamamlanma durumu göstermemelidir (Senkronize Sıfırlama)', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    setupFullAnalyses(client);

    const design: ClientTattooDesign = {
      id: 'des_sync_test',
      clientId: client.id,
      versionNumber: 1,
      title: 'Senkron Tasarım',
      conceptStatement: 'Senkron konsept',
      recipe: {
        style: 'DOTWORK_WHIPSHADING',
        recommendedPlacement: 'SHOULDER_BLADE',
        placementDescription: 'Omuz',
        recommendedDimensionsCm: { width: 15, height: 15 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Mandala',
        keyComponents: ['Mandala'],
        technicalAdviceForArtist: [],
      },
      aiPrompt: {
        primaryPromptEn: 'Sacred geometry mandala dotwork tattoo design on white background',
        conceptPromptTr: 'Mandala',
        negativePrompt: '',
        aspectRatio: '1:1',
        artisticModifiers: [],
      },
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClientDesign(client.id, design);

    const report: ClientTattooReport = {
      id: `report_${client.id}_v1`,
      clientId: client.id,
      version: 1,
      title: 'Mandala Raporu',
      generatedAt: new Date().toISOString(),
      confidentialityNote: 'Gizli',
      sections: [],
    };
    saveClientReport(client.id, report);
    assert.strictEqual(isClientDesignCompleted(client.id, design.id), true);

    // Raporları temizle (ör. yönetici arşiv temizliği)
    clearClientReports(client.id);

    // Veri Tutarlılığı Doğrulaması:
    // 1. Raporlar sıfırlanmış olmalı
    assert.strictEqual(getClientReports(client.id).length, 0);

    // 2. Tasarımdaki isCompleted bayrağı da false'a çekilmiş olmalı
    const updatedDesigns = getClientDesigns(client.id);
    assert.strictEqual(updatedDesigns[0].isCompleted, false);

    // 3. Genel tamamlanma sorgusu da false dönmelidir
    assert.strictEqual(isClientDesignCompleted(client.id, design.id), false);
  });

  it('9. Geçersiz, anlamsız veya sahte promptlarla tamamlanma kesinlikle engellenmelidir', () => {
    const client = createClientRecord(clientDataA, 'OWNER_MANUAL');
    const archive = setupFullAnalyses(client);

    // Test 1: Çok kısa prompt (< 25 karakter)
    const shortPrompt = isValidTattooPrompt('small prompt');
    assert.strictEqual(shortPrompt.isValid, false);
    assert.ok(shortPrompt.reasonTr?.includes('çok kısa'));

    // Test 2: Anlamsız karakter tekrarı (gibberish)
    const repetitivePrompt = isValidTattooPrompt('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.strictEqual(repetitivePrompt.isValid, false);
    assert.ok(repetitivePrompt.reasonTr?.includes('anlamsız tekrarlayan'));

    // Test 3: Dövme/tasarım ile ilgisiz rastgele cümle
    const offTopicPrompt = isValidTattooPrompt('The quick brown fox jumps over the lazy sleeping brown dog.');
    assert.strictEqual(offTopicPrompt.isValid, false);
    assert.ok(offTopicPrompt.reasonTr?.includes('anahtar kelimeleri içermemektedir'));

    // Test 4: evaluateDesignCompletionReadiness kilit testi
    const designWithFakePrompt: ClientTattooDesign = {
      id: 'des_fake_prompt',
      clientId: client.id,
      versionNumber: 1,
      title: 'Sahte Prompt Tasarımı',
      conceptStatement: 'Sahte prompt konsepti',
      recipe: {
        style: 'FINE_LINE',
        recommendedPlacement: 'FOREARM_INNER',
        placementDescription: 'Kol',
        recommendedDimensionsCm: { width: 10, height: 10 },
        colorProfile: 'MONOCHROME_BLACK',
        primarySymbol: 'Kurt',
        keyComponents: ['Kurt'],
        technicalAdviceForArtist: [],
      },
      aiPrompt: {
        primaryPromptEn: 'asdfghjklqwertyuiopzxcvbnm123456789',
        conceptPromptTr: 'Geçersiz',
        negativePrompt: '',
        aspectRatio: '1:1',
        artisticModifiers: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const readiness = evaluateDesignCompletionReadiness(client, archive, designWithFakePrompt);
    assert.strictEqual(readiness.isReady, false, 'Sahte prompt ile tamamlama engellenmelidir');

    // Test 5: Gerçek ve geçerli bir prompt geçer
    const validPromptRes = isValidTattooPrompt(
      'Sacred geometry tattoo of metatron cube and hawk wings, blackwork fine line, 8k'
    );
    assert.strictEqual(validPromptRes.isValid, true);
  });

  it('10. Doğrudan sekme değiştirme girişimleri merkezi doğrulamayı aşamamalıdır', () => {
    // Danışan bilgileri eksik (koordinat yok)
    const incompleteClient = createClientRecord({
      ...clientDataA,
      birthLocation: {
        placeName: '',
        city: '',
        country: '',
        latitude: NaN,
        longitude: NaN,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
    }, 'OWNER_MANUAL');

    const emptyArchive = getClientArchive(incompleteClient.id);

    // Kişisel bilgiler geçersizken diğer hiçbir sekmeye geçilemez
    assert.strictEqual(canNavigateToWorkspaceTab('ANALYSES', incompleteClient, emptyArchive).allowed, false);
    assert.strictEqual(canNavigateToWorkspaceTab('TESTS', incompleteClient, emptyArchive).allowed, false);
    assert.strictEqual(canNavigateToWorkspaceTab('RESULTS', incompleteClient, emptyArchive).allowed, false);
    assert.strictEqual(canNavigateToWorkspaceTab('SYMBOLS', incompleteClient, emptyArchive).allowed, false);
    assert.strictEqual(canNavigateToWorkspaceTab('DESIGN', incompleteClient, emptyArchive).allowed, false);

    // Kişisel bilgilere geri dönüş ise daima serbesttir
    assert.strictEqual(canNavigateToWorkspaceTab('PERSONAL_BIRTH', incompleteClient, emptyArchive).allowed, true);
  });
});
