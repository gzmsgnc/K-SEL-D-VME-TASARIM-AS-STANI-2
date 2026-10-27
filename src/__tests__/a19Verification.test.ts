import { describe, it } from 'node:test';
import assert from 'node:assert';
import { verifyA19ExistingClient } from './a19Verification';
import {
  createClientRecord,
  saveClientNumerology,
  saveClientChakra,
  saveClientArchetype,
  saveClientTestResult,
  saveClientDesign,
  saveClientSymbolAnalysis,
  getStoredClients,
  getStoredActiveClientId,
  setStoredActiveClientId,
  getClientArchive,
} from '../store/storage';
import { calculateArchetypeAnalysis } from '../modules/archetype/archetypeCalculationEngine';
import { generateTattooRecipeFromAnalyses } from '../modules/recipe/recipeCalculationEngine';
import { runAndBuildEnneagramResult, runAndBuildTotemResult } from '../modules/tests';
import { buildClientSymbolAnalysis, generateVisualPromptForClient } from '../modules/symbols';

describe('A19: Kayıtlı Gerçek Danışan Üzerinden Sistem Bütünlüğü Doğrulaması', () => {
  it('1. Kayıtlı danışan yokken sistem sahte kayıt uydurmamalı, açıkça "mevcut kayıt bulunamadı" bildirmelidir', () => {
    // Depolamada danışan bulunmadığı durum
    const initialClients = getStoredClients();
    if (initialClients.length === 0) {
      const report = verifyA19ExistingClient();
      assert.strictEqual(report.hasExistingClient, false, 'Sahte danışan türetilmemelidir');
      assert.strictEqual(report.foundClientCount, 0, 'Bulunan danışan sayısı 0 olmalıdır');
      assert.ok(
        report.summaryMessage.includes('Mevcut kayıt bulunamadı'),
        'Açık Türkçe "mevcut kayıt bulunamadı" uyarısı verilmelidir'
      );
    }
  });

  it('2. Gerçek danışan kaydı mevcut olduğunda tüm analiz zinciri aynı clientId üzerinden hatasız doğrulanmalıdır', () => {
    // Mevcut kayıt simülasyonu (danışanın daha önceden var olan gerçek kaydını temsil eder)
    const existingClient = createClientRecord(
      {
        firstName: 'Zeynep',
        lastName: 'Aydın',
        email: 'zeynep.aydin@example.com',
        phone: '5551112233',
        birthDate: '1995-04-12',
        birthTime: '08:45',
        isBirthTimeUnknown: false,
        birthLocation: {
          country: 'Türkiye',
          city: 'İstanbul',
          placeName: 'İstanbul, Türkiye',
          latitude: 41.0082,
          longitude: 28.9784,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Ayşe',
        notes: 'A19 Gerçek Danışan Kaydı',
      },
      'OWNER_MANUAL'
    );

    setStoredActiveClientId(existingClient.id);

    // Analiz zincirini kaydet
    const num = {
      lifePathNumber: 4,
      destinyNumber: 1,
      soulUrgeNumber: 8,
      personalityNumber: 2,
      birthdayNumber: 3,
      worldMissionNumber: 5,
      karmicLessons: [],
      masterNumbers: [],
    };
    saveClientNumerology(existingClient.id, num);

    const chakra = {
      chakras: [
        { chakra: 'ROOT' as const, status: 'BLOCKED' as const, score: 3, focusRecommendations: ['Küp'] },
        { chakra: 'THIRD_EYE' as const, status: 'OVERACTIVE' as const, score: 9, focusRecommendations: ['Üçüncü Göz'] },
      ],
      dominantChakra: 'THIRD_EYE' as const,
      primaryDeficit: 'ROOT' as const,
    };
    saveClientChakra(existingClient.id, chakra);

    // Enneagram ve Totem testleri
    const ennResult = runAndBuildEnneagramResult(existingClient, null, {
      en_q1: 'en_q1_o1', en_q2: 'en_q2_o1', en_q3: 'en_q3_o1', en_q4: 'en_q4_o1', en_q5: 'en_q5_o1',
      en_q6: 'en_q6_o1', en_q7: 'en_q7_o1', en_q8: 'en_q8_o1', en_q9: 'en_q9_o1', en_q10: 'en_q10_o1',
      en_q11: 'en_q11_o1', en_q12: 'en_q12_o1', en_q13: 'en_q13_o1', en_q14: 'en_q14_o1', en_q15: 'en_q15_o1',
    });
    saveClientTestResult(existingClient.id, ennResult);

    const totResult = runAndBuildTotemResult(existingClient, null, {
      tot_q1: 'tot_q1_o1', tot_q2: 'tot_q2_o1', tot_q3: 'tot_q3_o1', tot_q4: 'tot_q4_o1', tot_q5: 'tot_q5_o1',
      tot_q6: 'tot_q6_o1', tot_q7: 'tot_q7_o1', tot_q8: 'tot_q8_o1', tot_q9: 'tot_q9_o1', tot_q10: 'tot_q10_o1',
    });
    saveClientTestResult(existingClient.id, totResult);

    const arch = calculateArchetypeAnalysis(num, chakra, ennResult);
    saveClientArchetype(existingClient.id, arch);

    // Dövme Reçetesi
    const design = generateTattooRecipeFromAnalyses({
      client: existingClient,
      astrology: null,
      numerology: num,
      chakra,
      archetype: arch,
      testResults: [ennResult, totResult],
      nextVersionNumber: 1,
    });
    saveClientDesign(existingClient.id, design);

    // Sembol Analizi
    const symbolAnalysis = buildClientSymbolAnalysis(
      existingClient,
      getClientArchive(existingClient.id),
      [
        { symbolId: 'metatron-cube', symbolName: 'Metatron Küpü', customMeaning: 'Koruma', weight: 'PRIMARY' },
      ],
      'Merkezi kutsal geometri ve mizaç dengesi'
    );
    saveClientSymbolAnalysis(existingClient.id, symbolAnalysis);

    // A19 Doğrulaması çalıştır
    const report = verifyA19ExistingClient();
    assert.strictEqual(report.hasExistingClient, true, 'Kayıtlı danışan tespit edilmelidir');
    assert.strictEqual(report.activeClientId, existingClient.id, 'Aktif clientId danışana ait olmalıdır');
    assert.strictEqual(report.clientInfo?.id, existingClient.id);
    assert.strictEqual(report.checks.hasEnneagramResult, true, 'Enneagram sonucu arşivde bulunmalıdır');
    assert.strictEqual(report.checks.hasTotemResult, true, 'Totem sonucu arşivde bulunmalıdır');
    assert.strictEqual(report.checks.hasRecipeResult, true, 'Dövme reçetesi arşivde bulunmalıdır');
    assert.strictEqual(report.checks.hasSymbolAnalysis, true, 'Sembol analizi arşivde bulunmalıdır');
    assert.strictEqual(report.checks.crossClientLeakDetected, false, 'Çapraz veri sızıntısı olmamalıdır');

    // Görsel istemde anne adının sızmadığını doğrula
    const promptOutput = generateVisualPromptForClient(existingClient, getClientArchive(existingClient.id), {
      excludedSymbols: [],
    });
    assert.ok(
      !promptOutput.primaryPromptEn.toLowerCase().includes(existingClient.motherName.toLowerCase()),
      'Anne adı görsel isteme ASLA sızmamalıdır'
    );
    assert.ok(
      !promptOutput.conceptPromptTr.toLowerCase().includes(existingClient.motherName.toLowerCase()),
      'Anne adı Türkçe konsept açıklamasına ASLA sızmamalıdır'
    );

    // Sayfa yenileme simülasyonu
    assert.strictEqual(getStoredActiveClientId(), existingClient.id, 'Aktif danışan kimliği depolamada korunmalıdır');
  });
});
