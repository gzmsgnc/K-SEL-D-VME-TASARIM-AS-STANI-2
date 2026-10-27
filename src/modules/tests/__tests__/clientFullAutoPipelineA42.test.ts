import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAllApplicationData,
  createClientRecord,
  getClientArchive,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  saveClientTestResult,
} from '../../../store/storage';
import {
  runClientAutoAnalysisChain,
  runClientFullPipeline,
  getClientAnalysisChainStatus,
} from '../../pipeline/clientAnalysisPipeline';
import { runAndBuildEnneagramResult, runAndBuildTotemResult, ENNEAGRAM_QUESTIONS } from '../../tests';
import { ClientFormData } from '../../../types/client';

describe('A42 — Yeni Danışan Kaydından Tam Otomatik Analiz ve Tasarım Zinciri Test Paketi', () => {
  beforeEach(() => {
    clearAllApplicationData();
  });

  const validFormA: ClientFormData = {
    firstName: 'Deniz',
    lastName: 'Aksoy',
    email: 'deniz.aksoy@example.com',
    phone: '05334445566',
    birthDate: '1990-05-21',
    birthTime: '15:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İzmir, Türkiye',
      city: 'İzmir',
      country: 'Türkiye',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Gülten',
    notes: 'Kişisel koruyucu geometri dövme tasarımı',
  };

  const validFormB: ClientFormData = {
    firstName: 'Murat',
    lastName: 'Yılmaz',
    email: 'murat.yilmaz@example.com',
    phone: '05445556677',
    birthDate: '1984-11-12',
    birthTime: '09:20',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'Ankara, Türkiye',
      city: 'Ankara',
      country: 'Türkiye',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Nuran',
    notes: 'Minimalist dövme isteği',
  };

  // 1. Senaryo: Yeni danışan kaydı sonrası Numeroloji, Astroloji, Çakra ve Arketip'in otomatik oluşması
  test('1. Yeni danışan kaydı sonrası Numeroloji, Astroloji, Çakra ve Arketip otomatik oluşur', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const result = runClientFullPipeline(client);

    assert.equal(result.numerologyRan, true, 'Numeroloji otomatik çalışmış olmalıdır.');
    assert.equal(result.astrologyRan, true, 'Astroloji otomatik çalışmış olmalıdır.');
    assert.equal(result.chakraRan, true, 'Çakra otomatik çalışmış olmalıdır.');
    assert.equal(result.archetypeRan, true, 'Arketip otomatik çalışmış olmalıdır.');

    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.numerology, 'Arşivde numeroloji analizi mevcut olmalıdır.');
    assert.ok(archive?.analyses[0]?.astrology, 'Arşivde astroloji haritası mevcut olmalıdır.');
    assert.ok(archive?.analyses[0]?.chakra, 'Arşivde çakra dengesi mevcut olmalıdır.');
    assert.ok(archive?.analyses[0]?.archetype, 'Arşivde arketip sentezi mevcut olmalıdır.');
  });

  // 2. Senaryo: Temel veriler tam ise A15 reçetesinin otomatik oluşması
  test('2. Temel veriler tam ise A15 dövme reçetesi otomatik oluşur', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const result = runClientFullPipeline(client);

    assert.equal(result.recipeRan, true, 'A15 Dövme reçetesi otomatik üretilmiş olmalıdır.');
    assert.ok(result.designData, 'Tasarım nesnesi dönmüş olmalıdır.');
    assert.ok(result.designData?.recipe, 'Dövme reçetesi içeriği mevcut olmalıdır.');
    assert.ok(result.designData?.recipe.primarySymbol, 'Birincil sembol belirlenmiş olmalıdır.');
    assert.ok(result.designData?.recipe.style, 'Dövme stili belirlenmiş olmalıdır.');
    assert.ok(result.designData?.recipe.recommendedPlacement, 'Tavsiye edilen yerleşim belirlenmiş olmalıdır.');
  });

  // 3. Senaryo: A15 hazırsa A16 görsel isteminin otomatik oluşması
  test('3. A15 hazırsa A16 görsel istemi (AI Prompt) otomatik oluşur', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const result = runClientFullPipeline(client);

    assert.equal(result.promptRan, true, 'A16 Görsel istemi otomatik hazırlanmış olmalıdır.');
    assert.ok(result.designData?.aiPrompt, 'AI Prompt verisi mevcut olmalıdır.');
    assert.ok(result.designData?.aiPrompt.primaryPromptEn, 'İngilizce birincil prompt oluşturulmuş olmalıdır.');
    assert.ok(result.designData?.aiPrompt.conceptPromptTr, 'Türkçe konsept manifestosu oluşturulmuş olmalıdır.');
    assert.ok(result.designData?.aiPrompt.negativePrompt, 'Negatif prompt oluşturulmuş olmalıdır.');
  });

  // 4. Senaryo: Tasarımın doğru clientId ile arşive kaydedilmesi
  test('4. Tasarım doğru clientId ile arşive kaydedilir', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    runClientFullPipeline(client);

    const archive = getClientArchive(client.id);
    assert.ok(archive, 'Danışan arşivi bulunmalıdır.');
    assert.equal(archive.designs.length, 1, 'Arşivde 1 adet otomatik oluşturulmuş tasarım olmalıdır.');
    assert.equal(archive.designs[0].clientId, client.id, 'Tasarımın clientId si danışanın ID si ile eşleşmelidir.');
    assert.equal(archive.designs[0].versionNumber, 1, 'İlk otomatik tasarım Sürüm 1 (V1) olmalıdır.');
  });

  // 5. Senaryo: Enneagram testinin otomatik cevaplanmaması
  test('5. Enneagram testi danışan yanıt vermeden otomatik cevaplanmaz', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    runClientFullPipeline(client);

    const archive = getClientArchive(client.id);
    const enneagramTest = archive?.testResults.find((t) => t.testType === 'ENNEAGRAM');
    assert.equal(enneagramTest, undefined, 'Enneagram testi için sahte cevap veya sonuç üretilmemelidir.');
  });

  // 6. Senaryo: Totem testinin otomatik cevaplanmaması
  test('6. Totem testi danışan yanıt vermeden otomatik cevaplanmaz', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    runClientFullPipeline(client);

    const archive = getClientArchive(client.id);
    const totemTest = archive?.testResults.find((t) => t.testType === 'ANIMAL_TOTEM');
    assert.equal(totemTest, undefined, 'Totem testi için sahte cevap veya sonuç üretilmemelidir.');
  });

  // 7. Senaryo: Eksik temel veride zincirin güvenle durması ve sahte reçete üretmemesi
  test('7. Eksik doğum verisinde zincir güvenle durur ve sahte reçete üretmez', () => {
    const incompleteForm: ClientFormData = {
      firstName: 'Bilinmeyen',
      lastName: 'Danışan',
      email: 'eksik@example.com',
      phone: '05550001122',
      birthDate: '', // Eksik doğum tarihi
      birthTime: '12:00',
      isBirthTimeUnknown: true,
      birthLocation: {
        placeName: '',
        city: '',
        country: '',
        latitude: null as any,
        longitude: null as any,
        timezone: '',
        utcOffsetMinutes: 0,
      },
      motherName: 'Ayşe',
      notes: '',
    };

    const client = createClientRecord(incompleteForm, 'OWNER_MANUAL');
    const result = runClientFullPipeline(client);

    assert.equal(result.recipeRan, undefined, 'Eksik veride reçete çalışmamalıdır.');
    assert.equal(result.designData, undefined, 'Sahte tasarım nesnesi üretilmemelidir.');
    assert.ok(result.errors.length > 0, 'Eksik veri hata listesinde açıkça belirtilmelidir.');

    const archive = getClientArchive(client.id);
    assert.equal(archive?.designs.length, 0, 'Arşivde tasarım oluşmamalıdır.');
  });

  // 8. Senaryo: Başka bir danışanın verisine dokunulmaması (Veri İzolasyonu)
  test('8. İki farklı danışanın otomatik zincirleri birbirine asla sızmaz', () => {
    const clientA = createClientRecord(validFormA, 'CLIENT_FORM');
    const clientB = createClientRecord(validFormB, 'CLIENT_FORM');

    runClientFullPipeline(clientA);
    runClientFullPipeline(clientB);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.ok(archiveA && archiveB);
    assert.equal(archiveA.designs.length, 1);
    assert.equal(archiveB.designs.length, 1);

    // Tasarım kimlikleri ve danışan ID leri tamamen ayrıdır
    assert.notEqual(archiveA.designs[0].id, archiveB.designs[0].id);
    assert.equal(archiveA.designs[0].clientId, clientA.id);
    assert.equal(archiveB.designs[0].clientId, clientB.id);

    // Danışan A nın promptunda Danışan B nin adı veya sembolü geçmez
    assert.ok(archiveA.designs[0].aiPrompt.conceptPromptTr.includes(clientA.firstName));
    assert.ok(!archiveA.designs[0].aiPrompt.conceptPromptTr.includes(clientB.firstName));
  });

  // 9. Senaryo: Zincirin ikinci kez çağrılmasında veri çoğalmaması (Idempotency)
  test('9. Zincirin ikinci kez çağrılması mükerrer tasarım veya analiz oluşturmaz (Idempotency)', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');

    // 1. çağrı
    runClientFullPipeline(client);
    const archive1 = getClientArchive(client.id);
    const designCount1 = archive1?.designs.length;
    const initialDesignId = archive1?.designs[0]?.id;

    // 2. çağrı (idempotent)
    const result2 = runClientFullPipeline(client);
    const archive2 = getClientArchive(client.id);

    assert.equal(designCount1, 1, 'İlk çağrıda 1 tasarım oluşmalıdır.');
    assert.equal(archive2?.designs.length, 1, 'İkinci çağrıda mükerrer tasarım oluşmamalıdır.');
    assert.equal(archive2?.designs[0]?.id, initialDesignId, 'Aynı tasarım korunmalıdır.');
    assert.equal(result2.designData?.id, initialDesignId, 'Sonuçta mevcut tasarım dönmelidir.');
  });

  // 10. Senaryo: Doğum saati bilinmiyorsa Yükselen üretilmez ama diğer analizler ve reçete çalışır
  test('10. Doğum saati bilinmiyorsa Yükselen üretilmez ama reçete ve prompt başarıyla çalışır', () => {
    const unknownTimeForm: ClientFormData = {
      ...validFormA,
      birthTime: '12:00',
      isBirthTimeUnknown: true,
    };

    const client = createClientRecord(unknownTimeForm, 'CLIENT_FORM');
    const result = runClientFullPipeline(client);

    assert.equal(result.astrologyRan, true, 'Astroloji çalışmalıdır.');
    assert.ok(result.astrologyData?.sunSign, 'Güneş burcu hesaplanmalıdır.');
    assert.ok(result.astrologyData?.moonSign, 'Ay burcu hesaplanmalıdır.');
    assert.equal(result.astrologyData?.ascendantSign, undefined, 'Yükselen burç işareti tanımsız olmalıdır.');

    assert.equal(result.recipeRan, true, 'Yükselen olmadan da reçete başarıyla üretilmelidir.');
    assert.equal(result.promptRan, true, 'Görsel istem başarıyla üretilmelidir.');
  });

  // 11. Senaryo: A15 reçetesinde anne adının sembol olarak geçmemesi
  test('11. Anne adı asla sembol olarak kullanılmaz ve negatif promptta izole edilir', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const result = runClientFullPipeline(client);

    const recipe = result.designData?.recipe;
    const motherName = validFormA.motherName.toLocaleLowerCase('tr-TR');

    assert.ok(recipe, 'Reçete nesnesi mevcut olmalıdır.');
    assert.ok(recipe.primarySymbol, 'Birincil sembol mevcut olmalıdır.');
    assert.ok(!recipe.primarySymbol.toLocaleLowerCase('tr-TR').includes(motherName), 'Anne adı ana sembolde geçemez.');
    assert.ok(
      !recipe.secondarySymbols?.some((s) => s.toLocaleLowerCase('tr-TR').includes(motherName)),
      'Anne adı ikincil sembollerde geçemez.'
    );
    assert.ok(
      result.designData?.aiPrompt.negativePrompt.toLocaleLowerCase('tr-TR').includes(motherName),
      'Anne adı negatif prompta eklenerek AI sızıntısı engellenmelidir.'
    );
  });

  // 12. Senaryo: Kullanıcının sonradan Enneagram veya Totem çözmesi durumunda reçetenin güncellenebilmesi
  test('12. Kullanıcı testi sonradan çözdüğünde yeni sürüm reçete üretilebilir', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    runClientFullPipeline(client);

    const archiveBefore = getClientArchive(client.id);

    // Danışan sonradan Enneagram testini çözer
    const answers: Record<string, string> = {};
    for (const q of ENNEAGRAM_QUESTIONS) {
      answers[q.id] = q.options[0].id;
    }
    const enneagramRes = runAndBuildEnneagramResult(client, archiveBefore, answers);
    saveClientTestResult(client.id, enneagramRes);

    // forceRegenerateDesign ile zinciri yenile
    const reResult = runClientFullPipeline(client, { forceRegenerateDesign: true });

    assert.equal(reResult.recipeRan, true);
    assert.equal(reResult.designData?.versionNumber, 2, 'Yeni sürüm (V2) oluşmalıdır.');

    const archiveAfter = getClientArchive(client.id);
    assert.equal(archiveAfter?.designs.length, 2, 'Arşivde her iki sürüm de saklanmalıdır.');
  });

  // 13. Senaryo: Kullanıcının bilinçli stil/yerleşim seçimi yaptığında bu seçimin korunması
  test('13. Kullanıcının bilinçli stil ve yerleşim tercihleri reçeteye başarıyla yansıtılır', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const result = runClientFullPipeline(client, {
      designOptions: {
        preferredStyle: 'DOTWORK_WHIPSHADING',
        preferredPlacement: 'FOREARM_OUTER',
        customNotes: 'Danışan özel nokta vuruşlu stil talep etti.',
      },
    });

    assert.equal(result.designData?.recipe.style, 'DOTWORK_WHIPSHADING', 'Seçilen stil korunmalıdır.');
    assert.equal(
      result.designData?.recipe.recommendedPlacement,
      'FOREARM_OUTER',
      'Seçilen yerleşim korunmalıdır.'
    );
    assert.equal(result.designData?.notes, 'Danışan özel nokta vuruşlu stil talep etti.');
  });

  // 14. Senaryo: Arşiv ve durum panelinin bu tam otomatik zinciri doğru yansıtması
  test('14. Durum raporu A42 tam otomatik zincirini ve tasarım durumunu doğru raporlar', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    const chainRes = runClientFullPipeline(client);

    const archive = getClientArchive(client.id);
    const statusReport = getClientAnalysisChainStatus(client, archive, chainRes);

    assert.equal(statusReport.completedAnalysesCount, 4, '4 temel analiz tamamlandı raporlanmalıdır.');
    assert.equal(statusReport.design?.status, 'Hazır', 'Dövme reçetesi hazır raporlanmalıdır.');
    assert.equal(statusReport.design?.hasRecipe, true);
    assert.equal(statusReport.design?.hasPrompt, true);
    assert.equal(statusReport.design?.versionCount, 1);
    assert.equal(statusReport.tests.enneagram.status, 'Test hazır', 'Enneagram henüz çözülmediği için Test hazır kalmalıdır.');
    assert.equal(statusReport.tests.totem.status, 'Test hazır', 'Totem henüz çözülmediği için Test hazır kalmalıdır.');
  });

  // 15. Senaryo: UI tarafında manuel buton bağımlılığının kalktığının doğrulanması
  test('15. Danışan kaydı sonrası tek bir buton tıklaması gerekmeden tüm tasarım paketi arşive işlenir', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');
    setStoredActiveClientId(client.id);

    // Yeni danışan kaydedildiği anda full pipeline çalışır
    const fullRes = runClientFullPipeline(client);

    // Aktif danışan kontrolü
    assert.equal(getStoredActiveClientId(), client.id);

    // Danışanın arşivi doğrudan okunur
    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.numerology, 'Numeroloji hesapla butonuna basmaya gerek kalmadan hazırdır.');
    assert.ok(archive?.analyses[0]?.astrology, 'Astroloji hesapla butonuna basmaya gerek kalmadan hazırdır.');
    assert.ok(archive?.analyses[0]?.chakra, 'Çakra hesapla butonuna basmaya gerek kalmadan hazırdır.');
    assert.ok(archive?.analyses[0]?.archetype, 'Arketip hesapla butonuna basmaya gerek kalmadan hazırdır.');
    assert.ok(archive?.designs[0]?.recipe, 'Dövme reçetesi butonuna basmaya gerek kalmadan hazırdır.');
    assert.ok(archive?.designs[0]?.aiPrompt, 'Görsel istem butonuna basmaya gerek kalmadan hazırdır.');
  });

  // 16. Senaryo: Hata durumunda diğer analizlerin silinmemesi (Arıza İzolasyonu)
  test('16. Reçete motorunda hata simüle edildiğinde önceki analizler korunur', () => {
    const client = createClientRecord(validFormA, 'CLIENT_FORM');

    // Reçete adımında kontrollü hata fırlat
    const result = runClientFullPipeline(client, { simulateFaultInModule: 'recipe' });

    assert.equal(result.recipeRan, undefined, 'Reçete başarısız olmalıdır.');
    assert.ok(result.errors.some((e) => e.includes('Dövme Reçetesi')), 'Reçete hatası bildirilmelidir.');

    // Önceki 4 analizin korunduğu arşivden doğrulanır
    const archive = getClientArchive(client.id);
    assert.ok(archive?.analyses[0]?.numerology, 'Numeroloji silinmemelidir.');
    assert.ok(archive?.analyses[0]?.astrology, 'Astroloji silinmemelidir.');
    assert.ok(archive?.analyses[0]?.chakra, 'Çakra silinmemelidir.');
    assert.ok(archive?.analyses[0]?.archetype, 'Arketip silinmemelidir.');
  });
});
