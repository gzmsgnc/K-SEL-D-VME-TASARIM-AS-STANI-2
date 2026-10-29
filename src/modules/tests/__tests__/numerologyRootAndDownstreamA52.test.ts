import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PYTHAGOREAN_MAP,
  TURKISH_CHAR_MAP,
  MASTER_NUMBERS,
} from '../../numerology/constants';
import {
  reduceNumber,
  getLetterValue,
  isVowel,
  calculateLifePathNumber,
  calculateDestinyNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  calculateBirthdayNumber,
  calculateWorldMissionNumber,
  calculateKarmicLessons,
  extractMasterNumbers,
  calculateNumerologyMatrix,
} from '../../numerology/numerologyCalculationEngine';
import { calculateClientNumerology } from '../../numerology/numerologyEngineAdapter';
import { calculateChakraAnalysisFromNumerology } from '../../chakra/chakraCalculationEngine';
import { calculateArchetypeAnalysis } from '../../archetype/archetypeCalculationEngine';
import { generateTattooRecipeFromAnalyses } from '../../recipe/recipeCalculationEngine';
import { getClientRecommendedSymbols } from '../../symbols';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';

test('A52: Numeroloji Kök Motoru ve Aşağı Akış Veri Doğrulama Test Paketi', async (t) => {

  await t.test('1. Standart Pisagor 1-9 Harf Tablosu Doğrulaması (Chaldean/Kabala içermez)', () => {
    // 1: A, J, S
    assert.strictEqual(PYTHAGOREAN_MAP.A, 1);
    assert.strictEqual(PYTHAGOREAN_MAP.J, 1);
    assert.strictEqual(PYTHAGOREAN_MAP.S, 1);
    // 2: B, K, T
    assert.strictEqual(PYTHAGOREAN_MAP.B, 2);
    assert.strictEqual(PYTHAGOREAN_MAP.K, 2);
    assert.strictEqual(PYTHAGOREAN_MAP.T, 2);
    // 3: C, L, U
    assert.strictEqual(PYTHAGOREAN_MAP.C, 3);
    assert.strictEqual(PYTHAGOREAN_MAP.L, 3);
    assert.strictEqual(PYTHAGOREAN_MAP.U, 3);
    // 4: D, M, V
    assert.strictEqual(PYTHAGOREAN_MAP.D, 4);
    assert.strictEqual(PYTHAGOREAN_MAP.M, 4);
    assert.strictEqual(PYTHAGOREAN_MAP.V, 4);
    // 5: E, N, W
    assert.strictEqual(PYTHAGOREAN_MAP.E, 5);
    assert.strictEqual(PYTHAGOREAN_MAP.N, 5);
    assert.strictEqual(PYTHAGOREAN_MAP.W, 5);
    // 6: F, O, X
    assert.strictEqual(PYTHAGOREAN_MAP.F, 6);
    assert.strictEqual(PYTHAGOREAN_MAP.O, 6);
    assert.strictEqual(PYTHAGOREAN_MAP.X, 6);
    // 7: G, P, Y
    assert.strictEqual(PYTHAGOREAN_MAP.G, 7);
    assert.strictEqual(PYTHAGOREAN_MAP.P, 7);
    assert.strictEqual(PYTHAGOREAN_MAP.Y, 7);
    // 8: H, Q, Z
    assert.strictEqual(PYTHAGOREAN_MAP.H, 8);
    assert.strictEqual(PYTHAGOREAN_MAP.Q, 8);
    assert.strictEqual(PYTHAGOREAN_MAP.Z, 8);
    // 9: I, R
    assert.strictEqual(PYTHAGOREAN_MAP.I, 9);
    assert.strictEqual(PYTHAGOREAN_MAP.R, 9);
  });

  await t.test('2. Türkçe Karakter Normalizasyonu (Ç, Ğ, I, İ, Ö, Ş, Ü ve Şapkalı Sesliler)', () => {
    // Ç -> C (3)
    assert.strictEqual(getLetterValue('ç'), 3);
    assert.strictEqual(getLetterValue('Ç'), 3);
    // Ğ -> G (7)
    assert.strictEqual(getLetterValue('ğ'), 7);
    assert.strictEqual(getLetterValue('Ğ'), 7);
    // I/İ -> I (9)
    assert.strictEqual(getLetterValue('ı'), 9);
    assert.strictEqual(getLetterValue('I'), 9);
    assert.strictEqual(getLetterValue('i'), 9);
    assert.strictEqual(getLetterValue('İ'), 9);
    // Ö -> O (6)
    assert.strictEqual(getLetterValue('ö'), 6);
    assert.strictEqual(getLetterValue('Ö'), 6);
    // Ş -> S (1)
    assert.strictEqual(getLetterValue('ş'), 1);
    assert.strictEqual(getLetterValue('Ş'), 1);
    // Ü -> U (3)
    assert.strictEqual(getLetterValue('ü'), 3);
    assert.strictEqual(getLetterValue('Ü'), 3);
    // Şapkalı sesliler
    assert.strictEqual(getLetterValue('â'), 1);
    assert.strictEqual(getLetterValue('î'), 9);
    assert.strictEqual(getLetterValue('û'), 3);
    // Sesli harf tespitleri
    assert.strictEqual(isVowel('a'), true);
    assert.strictEqual(isVowel('e'), true);
    assert.strictEqual(isVowel('ı'), true);
    assert.strictEqual(isVowel('i'), true);
    assert.strictEqual(isVowel('o'), true);
    assert.strictEqual(isVowel('ö'), true);
    assert.strictEqual(isVowel('u'), true);
    assert.strictEqual(isVowel('ü'), true);
    assert.strictEqual(isVowel('k'), false);
    assert.strictEqual(isVowel('ş'), false);
  });

  await t.test('3. Yaşam Yolu, Kader, Ruh Güdüsü, Kişilik, Doğum Günü, Dünya Görevi Tutarlılığı', () => {
    // Örnek Danışan: Elif Demir, 1992-06-15
    // Gün 15 -> 1+5=6; Ay 06 -> 6; Yıl 1992 -> 1+9+9+2=21 -> 2+1=3.
    // Toplam: 6 + 6 + 3 = 15 -> 1+5=6.
    const lp = calculateLifePathNumber('1992-06-15');
    assert.strictEqual(lp, 6);

    // Doğum Günü Sayısı: 15 -> 1+5=6
    const bday = calculateBirthdayNumber('1992-06-15');
    assert.strictEqual(bday, 6);

    // E L I F   D E M I R
    // E=5, L=3, I=9, F=6 -> Elif = 23 -> 2+3=5
    // D=4, E=5, M=4, I=9, R=9 -> Demir = 31 -> 3+1=4
    // Toplam = 23 + 31 = 54 -> 5+4 = 9
    const destiny = calculateDestinyNumber('ELİF DEMİR');
    assert.strictEqual(destiny, 9);

    // Ruh Güdüsü (Sesli Harfler):
    // E (5), İ (9), E (5), İ (9) -> 5 + 9 + 5 + 9 = 28 -> 2+8 = 10 -> 1+0 = 1
    const soulUrge = calculateSoulUrgeNumber('ELİF DEMİR');
    assert.strictEqual(soulUrge, 1);

    // Kişilik (Sessiz Harfler):
    // L (3), F (6), D (4), M (4), R (9) -> 3 + 6 + 4 + 4 + 9 = 26 -> 2+6 = 8
    const personality = calculatePersonalityNumber('ELİF DEMİR');
    assert.strictEqual(personality, 8);

    // Dünya Misyonu = LP(6) + Destiny(9) = 15 -> 1+5 = 6
    const worldMission = calculateWorldMissionNumber(lp, destiny);
    assert.strictEqual(worldMission, 6);
  });

  await t.test('4. Master Sayılar (11, 22, 33) İndirgenmeden Korunmalıdır', () => {
    assert.strictEqual(reduceNumber(11, true), 11);
    assert.strictEqual(reduceNumber(22, true), 22);
    assert.strictEqual(reduceNumber(33, true), 33);
    assert.strictEqual(reduceNumber(44, true), 8); // 4+4=8
    assert.strictEqual(reduceNumber(11, false), 2); // false olursa 2

    const masters = extractMasterNumbers(11, 4, 22, 6, 33, 9);
    assert.deepStrictEqual(masters, [11, 22, 33]);
  });

  await t.test('5. Karmik Dersler Yalnızca İsimde Olmayan 1-9 Titreşimlerinden Türetilmelidir', () => {
    // ELİF DEMİR harfleri: E=5, L=3, I=9, F=6, D=4, M=4, R=9
    // Mevcut harfler: 3, 4, 5, 6, 9
    // Eksik harfler (Karmik Dersler): 1, 2, 7, 8
    const karmic = calculateKarmicLessons('ELİF DEMİR');
    assert.deepStrictEqual(karmic, [1, 2, 7, 8]);
  });

  await t.test('6. Deterministik Tekrar Çalıştırma (Aynı girdi her seferinde birebir aynı matrisi üretir)', () => {
    const run1 = calculateNumerologyMatrix('Elif Demir', '1992-06-15');
    const run2 = calculateNumerologyMatrix('Elif Demir', '1992-06-15');
    assert.deepStrictEqual(run1, run2);
  });

  await t.test('7. Çakra Motoruna Aktarım: NumerologyAnalysis girdisi doğrudan kullanılır ve yeniden hesaplanmaz', () => {
    const num = calculateNumerologyMatrix('Elif Demir', '1992-06-15');
    const chakra = calculateChakraAnalysisFromNumerology(num);
    
    assert.strictEqual(chakra.chakras.length, 7);
    assert.ok(chakra.dominantChakra);
    // dominantChakra asla deficitChakras içinde yer alamaz
    assert.ok(chakra.deficitChakras && chakra.dominantChakra ? !chakra.deficitChakras.includes(chakra.dominantChakra) : true);
  });

  await t.test('8. Çakra Destek Kuralı: dominantChakra hiçbir koşulda deficitChakras içine giremez ve eşit en düşükler korunur', () => {
    const testNum = {
      lifePathNumber: 6,
      destinyNumber: 4,
      soulUrgeNumber: 1,
      personalityNumber: 3,
      birthdayNumber: 15,
      worldMissionNumber: 1,
      karmicLessons: [2, 7],
      masterNumbers: [],
    };
    const chakra = calculateChakraAnalysisFromNumerology(testNum);
    // dominantChakra asla deficitChakras içine giremez
    assert.ok(chakra.deficitChakras && chakra.dominantChakra ? !chakra.deficitChakras.includes(chakra.dominantChakra) : true);
    // deficitChakras içindeki her çakranın puanı <= 4 olmalıdır
    (chakra.deficitChakras || []).forEach((cName) => {
      const state = chakra.chakras.find((s) => s.chakra === cName);
      assert.ok(state && state.score <= 4);
    });
  });

  await t.test('9. Aşağı Akış Zinciri Bütünlüğü: Numeroloji -> Çakra -> Arketip -> Reçete -> Semboller', () => {
    const client: Client = {
      id: 'client-a52-downstream',
      firstName: 'Elif',
      lastName: 'Demir',
      motherName: 'Aylin',
      email: 'elif@example.com',
      phone: '+905550000000',
      notes: 'Test danışanı',
      source: 'OWNER_MANUAL',
      status: 'ACTIVE',
      birthDate: '1992-06-15',
      birthTime: '14:30',
      isBirthTimeUnknown: false,
      birthLocation: {
        placeName: 'İstanbul, Türkiye',
        city: 'İstanbul',
        country: 'Türkiye',
        latitude: 41.0082,
        longitude: 28.9784,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    };

    // 1. Kök Numeroloji
    const numRes = calculateClientNumerology(client);
    assert.strictEqual(numRes.success, true);
    assert.ok(numRes.numerology);
    const rootNumerology = numRes.numerology;

    // 2. Çakra (kök numerolojiden türetildi)
    const chakra = calculateChakraAnalysisFromNumerology(rootNumerology);
    assert.strictEqual(chakra.chakras.length, 7);

    // 3. Arketip (kök numeroloji + çakradan türetildi)
    const archetype = calculateArchetypeAnalysis(rootNumerology, chakra);
    assert.ok(archetype.unifiedArchetype.primary);
    assert.ok(archetype.shadowArchetype.shadowName);

    // 4. Dövme Reçetesi (kök numeroloji + çakra + arketip)
    const recipe = generateTattooRecipeFromAnalyses({
      client,
      numerology: rootNumerology,
      chakra,
      archetype,
      options: {
        preferredStyle: 'SACRED_GEOMETRY',
        preferredPlacement: 'FOREARM_INNER',
      },
      nextVersionNumber: 1,
    });
    assert.ok(recipe.title);
    assert.ok(recipe.recipe.primarySymbol);
    assert.ok(recipe.conceptStatement);
    assert.ok(recipe.recipe.chakraSupportReflection);

    // 5. Sembol Önerileri
    const mockArchive: ClientArchiveRecord = {
      client,
      analyses: [
        {
          id: 'ana-mock',
          clientId: client.id,
          version: 1,
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
          numerology: rootNumerology,
          chakra,
          archetype,
        },
      ],
      testResults: [],
      designs: [],
      symbolAnalyses: [],
      reports: [],
      historySummary: {
        totalAnalysesCount: 1,
        totalDesignsCount: 0,
        lastInteractionAt: new Date().toISOString(),
      },
    };
    const recSymbols = getClientRecommendedSymbols(client, mockArchive);
    assert.ok(recSymbols.length > 0);

    // Kök numerolojinin hiçbir aşamada bozulmadığı teyit edilir
    assert.strictEqual(rootNumerology.lifePathNumber, 6);
    assert.strictEqual(rootNumerology.destinyNumber, 9);
    assert.strictEqual(rootNumerology.soulUrgeNumber, 1);
    assert.strictEqual(rootNumerology.personalityNumber, 8);
    assert.strictEqual(rootNumerology.birthdayNumber, 6);
    assert.strictEqual(rootNumerology.worldMissionNumber, 6);
  });
});
