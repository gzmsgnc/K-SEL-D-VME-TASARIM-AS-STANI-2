import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  createClientRecord,
  deleteClientRecord,
  saveClientTestResult,
  clearClientTestResult,
  getClientTestResults,
  saveClientTestDraft,
  getClientTestDraft,
  clearClientTestDraft,
  getAllStoredTestDrafts,
  getClientArchive,
  saveClientNumerology,
  setSafeStorage,
  getSafeStorage,
  STORAGE_KEYS,
} from '../../../store/storage';
import { Client } from '../../../types/client';
import { ClientTestResult, ClientTestDraft } from '../../../types/test';
import { ChakraAnalysis, NumerologyAnalysis } from '../../../types/analysis';
import { calculateArchetypeAnalysis } from '../../archetype';
import { generateClientRecipe } from '../../recipe';
import { getClientRecommendedSymbols } from '../../symbols';

describe('A69: Aşama 3.1 — Tamamlanmamış Test Yanıtlarının Korunması ve İzolasyonu Testleri', () => {
  function createSampleClient(suffix: string): Client {
    return createClientRecord(
      {
        firstName: `Danisan_${suffix}`,
        lastName: `Soyad_${suffix}`,
        email: `draft_test_${suffix.toLowerCase()}@example.com`,
        phone: '5551234567',
        birthDate: '1990-05-15',
        birthTime: '14:30',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'İzmir',
          placeName: 'İzmir, Türkiye',
          latitude: 38.4192,
          longitude: 27.1287,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Ayşe',
        notes: `A69 Test Danışanı ${suffix}`,
      },
      'OWNER_MANUAL'
    );
  }

  // Senaryo 1: Enneagram testi yarıda bırakıldığında taslağın kaydedilmesi
  it('1. Enneagram testi yarıda bırakıldığında taslak depolamaya eksiksiz kaydedilmelidir', () => {
    const client = createSampleClient('S1_Ennea');
    try {
      const mockAnswers: Record<string, string> = {
        enn_q1: 'enn_q1_opt2',
        enn_q2: 'enn_q2_opt1',
        enn_q3: 'enn_q3_opt4',
        enn_q4: 'enn_q4_opt3',
      };
      const activeQIndex = 3;

      const savedDraft = saveClientTestDraft(client.id, 'ENNEAGRAM', mockAnswers, activeQIndex);
      assert.strictEqual(savedDraft.clientId, client.id);
      assert.strictEqual(savedDraft.testType, 'ENNEAGRAM');
      assert.strictEqual(savedDraft.activeQuestionIndex, 3);
      assert.deepStrictEqual(savedDraft.answers, mockAnswers);
      assert.ok(savedDraft.updatedAt);

      const retrieved = getClientTestDraft(client.id, 'ENNEAGRAM');
      assert.ok(retrieved, 'Kayıtlı taslak bulunabilmelidir');
      assert.strictEqual(retrieved?.clientId, client.id);
      assert.strictEqual(retrieved?.testType, 'ENNEAGRAM');
      assert.strictEqual(retrieved?.activeQuestionIndex, 3);
      assert.deepStrictEqual(retrieved?.answers, mockAnswers);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 2: Totem testi yarıda bırakıldığında taslağın kaydedilmesi
  it('2. Totem testi yarıda bırakıldığında taslak depolamaya eksiksiz kaydedilmelidir', () => {
    const client = createSampleClient('S2_Totem');
    try {
      const mockAnswers: Record<string, string> = {
        totem_q1: 'totem_q1_opt1',
        totem_q2: 'totem_q2_opt3',
      };
      const activeQIndex = 2;

      const savedDraft = saveClientTestDraft(client.id, 'ANIMAL_TOTEM', mockAnswers, activeQIndex);
      assert.strictEqual(savedDraft.clientId, client.id);
      assert.strictEqual(savedDraft.testType, 'ANIMAL_TOTEM');
      assert.strictEqual(savedDraft.activeQuestionIndex, 2);
      assert.deepStrictEqual(savedDraft.answers, mockAnswers);

      const retrieved = getClientTestDraft(client.id, 'ANIMAL_TOTEM');
      assert.ok(retrieved, 'Totem taslağı bulunabilmelidir');
      assert.strictEqual(retrieved?.clientId, client.id);
      assert.strictEqual(retrieved?.testType, 'ANIMAL_TOTEM');
      assert.strictEqual(retrieved?.activeQuestionIndex, 2);
      assert.deepStrictEqual(retrieved?.answers, mockAnswers);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 3: Danışan A'nın taslağının Danışan B'ye sızmadığının doğrulanması
  it('3. Danışan A taslakları Danışan B arşivine sızmamalı ve tam izolasyon sağlanmalıdır', () => {
    const clientA = createSampleClient('S3_ClientA');
    const clientB = createSampleClient('S3_ClientB');
    try {
      saveClientTestDraft(clientA.id, 'ENNEAGRAM', { enn_q1: 'opt_a' }, 1);
      saveClientTestDraft(clientA.id, 'ANIMAL_TOTEM', { totem_q1: 'opt_ta' }, 2);

      // Danışan B sorgulandığında null dönmeli
      const bEnneaDraft = getClientTestDraft(clientB.id, 'ENNEAGRAM');
      const bTotemDraft = getClientTestDraft(clientB.id, 'ANIMAL_TOTEM');
      assert.strictEqual(bEnneaDraft, null, 'Danışan B için Enneagram taslağı null olmalıdır');
      assert.strictEqual(bTotemDraft, null, 'Danışan B için Totem taslağı null olmalıdır');

      // Danışan B kendi taslağını kaydettiğinde Danışan A etkilenmemeli
      saveClientTestDraft(clientB.id, 'ENNEAGRAM', { enn_q1: 'opt_b', enn_q2: 'opt_b2' }, 4);
      const aEnneaDraft = getClientTestDraft(clientA.id, 'ENNEAGRAM');
      assert.strictEqual(aEnneaDraft?.activeQuestionIndex, 1);
      assert.deepStrictEqual(aEnneaDraft?.answers, { enn_q1: 'opt_a' });
    } finally {
      deleteClientRecord(clientA.id);
      deleteClientRecord(clientB.id);
    }
  });

  // Senaryo 4: Enneagram taslağının Totem taslağıyla karışmadığının doğrulanması
  it('4. Enneagram taslağı ile Totem taslağı aynı danışan içinde birbirine karışmamalıdır', () => {
    const client = createSampleClient('S4_Mixing');
    try {
      const enneaMap = { enn_1: 'ans_e1', enn_2: 'ans_e2' };
      const totemMap = { tot_1: 'ans_t1', tot_2: 'ans_t2', tot_3: 'ans_t3' };

      saveClientTestDraft(client.id, 'ENNEAGRAM', enneaMap, 1);
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', totemMap, 2);

      const retrievedEnnea = getClientTestDraft(client.id, 'ENNEAGRAM');
      const retrievedTotem = getClientTestDraft(client.id, 'ANIMAL_TOTEM');

      assert.deepStrictEqual(retrievedEnnea?.answers, enneaMap);
      assert.deepStrictEqual(retrievedTotem?.answers, totemMap);

      // Yalnızca Enneagram taslağı silindiğinde Totem taslağı korunmalıdır
      clearClientTestDraft(client.id, 'ENNEAGRAM');
      assert.strictEqual(getClientTestDraft(client.id, 'ENNEAGRAM'), null);
      assert.deepStrictEqual(getClientTestDraft(client.id, 'ANIMAL_TOTEM')?.answers, totemMap);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 5: Sayfa yenilendiğinde taslağın geri yüklenmesi (Storage döngüsü)
  it('5. Sayfa yenileme / JSON serileştirme döngüsünde taslak yanıtlar ve soru indeksi korunmalıdır', () => {
    const client = createSampleClient('S5_Reload');
    try {
      const answers = { q1: 'a', q2: 'b', q3: 'c' };
      saveClientTestDraft(client.id, 'ENNEAGRAM', answers, 2);

      // Simüle reload: Storage'dan ham oku ve getClientTestDraft ile geri al
      const rawStorage = getSafeStorage<any[]>(STORAGE_KEYS.TEST_DRAFTS, []);
      assert.ok(Array.isArray(rawStorage));
      assert.ok(rawStorage.some((d) => d.clientId === client.id && d.testType === 'ENNEAGRAM'));

      const restored = getClientTestDraft(client.id, 'ENNEAGRAM');
      assert.ok(restored);
      assert.deepStrictEqual(restored?.answers, answers);
      assert.strictEqual(restored?.activeQuestionIndex, 2);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 6: Menü değiştirilip geri dönüldüğünde taslağın korunması
  it('6. Farklı modül veya menüye geçip geri dönüldüğünde danışanın test taslağı kaybolmamalıdır', () => {
    const client = createSampleClient('S6_MenuNav');
    try {
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', { t_q1: 'kartal', t_q2: 'kurt' }, 1);

      // Kullanıcı başka menülere geçti (örneğin Dashboard, Analizler, Semboller)
      // Test taslağı storage'da korunmaya devam eder
      const draftAfterNav = getClientTestDraft(client.id, 'ANIMAL_TOTEM');
      assert.ok(draftAfterNav);
      assert.strictEqual(draftAfterNav?.answers['t_q1'], 'kartal');
      assert.strictEqual(draftAfterNav?.answers['t_q2'], 'kurt');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 7: Enneagram tamamlandığında taslağın silinmesi ve sonucun kaydedilmesi
  it('7. Enneagram testi başarıyla tamamlandığında taslak otomatik silinmeli, sonuç kaydedilmeli, Totem taslağı korunmalıdır', () => {
    const client = createSampleClient('S7_EnneaDone');
    try {
      // Hem Enneagram hem Totem taslağı var
      saveClientTestDraft(client.id, 'ENNEAGRAM', { eq1: 'v1' }, 0);
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', { tq1: 'tv1' }, 0);

      // Enneagram tamamlandı
      const enneagramResult: ClientTestResult = {
        id: 'test_ennea_done_1',
        clientId: client.id,
        testType: 'ENNEAGRAM',
        version: 1,
        completedAt: new Date().toISOString(),
        answers: [{ questionId: 'eq1', selectedOptionId: 'v1', weight: 1 }],
        primaryType: 'Tip 4 - Bireyci',
        secondaryType: 'Kanat 5',
        dominantScores: { 'Tip 4': 10 },
        interpretations: ['Özgünlük ve derinlik arayışı'],
      };

      saveClientTestResult(client.id, enneagramResult);

      // Enneagram taslağı silinmiş olmalı
      assert.strictEqual(getClientTestDraft(client.id, 'ENNEAGRAM'), null, 'Tamamlanan Enneagram taslağı silinmelidir');
      // Totem taslağı ise KORUNMALIDIR
      assert.ok(getClientTestDraft(client.id, 'ANIMAL_TOTEM'), 'Totem taslağı silinmemeli, korunmalıdır');

      // Test sonuçlarında kayıt mevcut olmalı
      const results = getClientTestResults(client.id);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].primaryType, 'Tip 4 - Bireyci');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 8: Totem tamamlandığında taslağın silinmesi ve sonucun kaydedilmesi
  it('8. Totem testi başarıyla tamamlandığında taslak otomatik silinmeli, Enneagram taslağı korunmalıdır', () => {
    const client = createSampleClient('S8_TotemDone');
    try {
      saveClientTestDraft(client.id, 'ENNEAGRAM', { eq1: 'ev1' }, 1);
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', { tq1: 'tv1' }, 2);

      const totemResult: ClientTestResult = {
        id: 'test_totem_done_1',
        clientId: client.id,
        testType: 'ANIMAL_TOTEM',
        version: 1,
        completedAt: new Date().toISOString(),
        answers: [{ questionId: 'tq1', selectedOptionId: 'tv1', weight: 1 }],
        primaryType: 'Kurt',
        dominantScores: { 'Kurt': 15 },
        interpretations: ['Sadakat ve sezgi gücü'],
      };

      saveClientTestResult(client.id, totemResult);

      // Totem taslağı silinmeli, Enneagram taslağı korunmalı
      assert.strictEqual(getClientTestDraft(client.id, 'ANIMAL_TOTEM'), null, 'Totem taslağı temizlenmelidir');
      assert.ok(getClientTestDraft(client.id, 'ENNEAGRAM'), 'Enneagram taslağı korunmalıdır');
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 9: Test sıfırlandığında taslağın silinmesi
  it('9. Test kullanıcı tarafından açıkça sıfırlandığında taslak da tamamen silinmelidir', () => {
    const client = createSampleClient('S9_Reset');
    try {
      saveClientTestDraft(client.id, 'ENNEAGRAM', { eq1: 'ev1' }, 0);
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', { tq1: 'tv1' }, 0);

      // Enneagram sıfırla
      clearClientTestResult(client.id, 'ENNEAGRAM');

      assert.strictEqual(getClientTestDraft(client.id, 'ENNEAGRAM'), null, 'Sıfırlanan testin taslağı silinmelidir');
      assert.ok(getClientTestDraft(client.id, 'ANIMAL_TOTEM'), 'Diğer testin taslağı korunmalıdır');

      // Totem taslağını da temizle
      clearClientTestDraft(client.id, 'ANIMAL_TOTEM');
      assert.strictEqual(getClientTestDraft(client.id, 'ANIMAL_TOTEM'), null);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Senaryo 10: Bozuk taslak verisinde güvenli toparlanma ve sistemin çökmemesi
  it('10. Depolamadaki bozuk veya geçersiz taslak verileri güvenle toparlanmalı ve sistem çökmemelidir', () => {
    const client = createSampleClient('S10_Corrupt');
    try {
      // Depolamaya bilerek bozuk ve geçersiz taslak verileri yaz
      const corruptedDrafts = [
        null,
        undefined,
        {},
        { clientId: '', testType: 'ENNEAGRAM' },
        { clientId: client.id, testType: 'INVALID_TYPE', answers: {} },
        { clientId: client.id, testType: 'ENNEAGRAM', answers: 'string_instead_of_object' },
        { clientId: client.id, testType: 'ENNEAGRAM', answers: [1, 2, 3] }, // Array instead of record
        { clientId: client.id, testType: 'ANIMAL_TOTEM', answers: null },
      ];
      setSafeStorage(STORAGE_KEYS.TEST_DRAFTS, corruptedDrafts);

      // getClientTestDraft çağrısı hata fırlatmamalı, güvenle null dönmeli
      assert.doesNotThrow(() => {
        const draft = getClientTestDraft(client.id, 'ENNEAGRAM');
        assert.strictEqual(draft, null);
      });

      assert.doesNotThrow(() => {
        const draft = getClientTestDraft(client.id, 'ANIMAL_TOTEM');
        assert.strictEqual(draft, null);
      });

      // Bozuk veriye rağmen yeni geçerli taslak sorunsuz kaydedilebilmeli
      assert.doesNotThrow(() => {
        saveClientTestDraft(client.id, 'ENNEAGRAM', { q1: 'opt1' }, 0);
      });

      const validDraft = getClientTestDraft(client.id, 'ENNEAGRAM');
      assert.ok(validDraft);
      assert.deepStrictEqual(validDraft?.answers, { q1: 'opt1' });
    } finally {
      deleteClientRecord(client.id);
    }
  });

  // Kural 6 Doğrulaması: Analiz ve reçete motorlarının taslaklardan korunması
  it('11. [Kural 6] Taslak yanıtlar tamamlanmış test gibi kabul edilmemeli; arşiv ve türetilmiş modüller yanlış pozitif üretmemelidir', () => {
    const client = createSampleClient('S11_DownstreamGuard');
    try {
      // Yalnızca yarım kalmış taslaklar kaydedildi
      saveClientTestDraft(client.id, 'ENNEAGRAM', { q1: 'opt1', q2: 'opt2' }, 1);
      saveClientTestDraft(client.id, 'ANIMAL_TOTEM', { t1: 'optA' }, 0);

      // getClientArchive kontrolü: testResults boş olmalıdır
      const archive = getClientArchive(client.id);
      assert.ok(archive);
      assert.strictEqual(archive.testResults.length, 0, 'Arşivde tamamlanmamış taslaklar test sonucu olarak görünmemelidir');

      // Arketip çözümlemesi için tamamlanmış Enneagram arandığında undefined bulunmalıdır
      const storedEnneagram = archive.testResults.find((t) => t.clientId === client.id && t.testType === 'ENNEAGRAM');
      assert.strictEqual(storedEnneagram, undefined, 'Tamamlanmamış taslak testResults içinde bulunamaz');

      const mockNumerology: NumerologyAnalysis = {
        fullName: `${client.firstName} ${client.lastName}`,
        birthDate: client.birthDate,
        lifePathNumber: 7,
        destinyNumber: 5,
        soulUrgeNumber: 3,
        personalityNumber: 2,
        birthdayNumber: 15,
        worldMissionNumber: 12,
        karmicLessons: [],
        masterNumbers: [],
      };

      const mockChakra: ChakraAnalysis = {
        dominantChakra: 'ROOT',
        primaryDeficit: 'HEART',
        chakras: [
          { chakra: 'ROOT', score: 8, status: 'BALANCED', focusRecommendations: [] },
          { chakra: 'HEART', score: 4, status: 'UNDERACTIVE', focusRecommendations: [] },
        ],
      };

      // Arketip analizi, tamamlanmış test olmadan da başarıyla çalışmalı ve taslakları test gibi görmemelidir
      const archetypeRes = calculateArchetypeAnalysis(mockNumerology, mockChakra, storedEnneagram);
      assert.ok(archetypeRes);
      assert.ok(archetypeRes.unifiedArchetype);
      // Enneagram mizaç kanadı entegrasyonu undefined olmalıdır
      assert.strictEqual(
        (archetypeRes.unifiedArchetype as any).enneagramIntegration,
        undefined,
        'Taslak Enneagram arketip analizine entegre edilmemelidir'
      );

      // Reçete motoru da taslakları tamamlanmış test sanmamalıdır
      const recipeRes = generateClientRecipe(client, archive);
      assert.ok(recipeRes);

      // Sembol öneri motoru da taslakları tamamlanmış test sanmamalıdır
      const symbolRes = getClientRecommendedSymbols(client, archive);
      assert.ok(symbolRes);
    } finally {
      deleteClientRecord(client.id);
    }
  });
});
