import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateChakraAnalysisFromNumerology } from '../chakraCalculationEngine';
import { NumerologyAnalysis } from '../../../types/analysis';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { getChakraCardData, formatChakraCopyText } from '../../../utils/analysisResultsFormatters';

describe('A49: Numeroloji -> Çakra Aktarım Zinciri ve 7 Senaryolu Test Matrisi', () => {
  // A) TEK DÜŞÜK ÇAKRA SENARYOSU
  it('Senaryo A: Tek düşük çakra olduğunda deficitChakras tam 1 elemanlı olmalıdır', () => {
    const num: NumerologyAnalysis = {
      lifePathNumber: 7,
      destinyNumber: 1,
      soulUrgeNumber: 9,
      personalityNumber: 3,
      birthdayNumber: 6,
      worldMissionNumber: 8,
      karmicLessons: [4], // Sadece 4 eksik (ROOT)
      masterNumbers: [],
    };

    const res = calculateChakraAnalysisFromNumerology(num);
    const root = res.chakras.find((c) => c.chakra === 'ROOT');

    assert.ok(root);
    assert.strictEqual(root.score, 2);
    assert.strictEqual(root.status, 'BLOCKED');

    assert.ok(Array.isArray(res.deficitChakras));
    assert.strictEqual(res.deficitChakras.length, 1);
    assert.deepStrictEqual(res.deficitChakras, ['ROOT']);
    assert.strictEqual(res.primaryDeficit, 'ROOT');
  });

  // B) İKİ EŞİT DÜŞÜK ÇAKRA SENARYOSU
  it('Senaryo B: İki eşit en düşük çakra olduğunda her ikisi de deficitChakras içinde yer almalıdır', () => {
    const num: NumerologyAnalysis = {
      lifePathNumber: 6,
      destinyNumber: 9,
      soulUrgeNumber: 1,
      personalityNumber: 8,
      birthdayNumber: 6,
      worldMissionNumber: 6,
      karmicLessons: [2, 7], // 2 (SACRAL) ve 7 (THIRD_EYE) eksik
      masterNumbers: [],
    };

    const res = calculateChakraAnalysisFromNumerology(num);
    const sacral = res.chakras.find((c) => c.chakra === 'SACRAL');
    const thirdEye = res.chakras.find((c) => c.chakra === 'THIRD_EYE');

    assert.ok(sacral);
    assert.ok(thirdEye);
    assert.strictEqual(sacral.score, 2);
    assert.strictEqual(thirdEye.score, 2);
    assert.strictEqual(sacral.status, 'BLOCKED');
    assert.strictEqual(thirdEye.status, 'BLOCKED');

    assert.strictEqual(res.deficitChakras?.length, 2);
    assert.deepStrictEqual(res.deficitChakras, ['SACRAL', 'THIRD_EYE']);
    assert.strictEqual(res.primaryDeficit, 'SACRAL');
  });

  // C) ÜÇ EŞİT DÜŞÜK ÇAKRA SENARYOSU
  it('Senaryo C: Üç eşit en düşük çakra olduğunda üçü de deficitChakras içinde bulunmalıdır', () => {
    const num: NumerologyAnalysis = {
      lifePathNumber: 9,
      destinyNumber: 9,
      soulUrgeNumber: 9,
      personalityNumber: 9,
      birthdayNumber: 9,
      worldMissionNumber: 9,
      karmicLessons: [2, 4, 7], // 2 (SACRAL), 4 (ROOT), 7 (THIRD_EYE) eksik
      masterNumbers: [],
    };

    const res = calculateChakraAnalysisFromNumerology(num);
    const root = res.chakras.find((c) => c.chakra === 'ROOT');
    const sacral = res.chakras.find((c) => c.chakra === 'SACRAL');
    const thirdEye = res.chakras.find((c) => c.chakra === 'THIRD_EYE');

    assert.strictEqual(root?.score, 2);
    assert.strictEqual(sacral?.score, 2);
    assert.strictEqual(thirdEye?.score, 2);

    assert.strictEqual(res.deficitChakras?.length, 3);
    assert.deepStrictEqual(res.deficitChakras, ['ROOT', 'SACRAL', 'THIRD_EYE']);
    assert.strictEqual(res.primaryDeficit, 'ROOT');
  });

  // D) EN YÜKSEK VE EN DÜŞÜK ÇAKRANIN AYNI DANIŞANDA KESİN AYRIŞMASI
  it('Senaryo D: Baskın çakra en yüksek olmalı ve deficitChakras listesine ASLA sızmamalıdır', () => {
    const num: NumerologyAnalysis = {
      lifePathNumber: 6,       // HEART +2.5
      destinyNumber: 6,        // HEART +2.0
      soulUrgeNumber: 6,       // HEART +1.5
      personalityNumber: 6,    // HEART +1.0
      birthdayNumber: 6,       // HEART +1.0
      worldMissionNumber: 6,   // HEART +1.0
      karmicLessons: [2, 7],   // SACRAL -3.5, THIRD_EYE -3.5
      masterNumbers: [33],     // HEART +1.5
    };

    const res = calculateChakraAnalysisFromNumerology(num);

    assert.strictEqual(res.dominantChakra, 'HEART');
    const heart = res.chakras.find((c) => c.chakra === 'HEART');
    assert.strictEqual(heart?.score, 10);
    assert.strictEqual(heart?.status, 'OVERACTIVE');

    assert.ok(Array.isArray(res.deficitChakras));
    assert.ok(!res.deficitChakras.includes('HEART'), 'Baskın çakra (HEART) deficitChakras içinde ASLA yer alamaz');
    assert.deepStrictEqual(res.deficitChakras, ['SACRAL', 'THIRD_EYE']);
  });

  // E) KARMİK DERSİN ÇAKRA SKORUNU DÜŞÜRMESİ VE BLOCKED YAPMASI
  it('Senaryo E: Karmik ders (-3.5 ceza) skoru 4 altına indirip BLOCKED yapmalıdır', () => {
    const numWithoutKarmic: NumerologyAnalysis = {
      lifePathNumber: 9,
      destinyNumber: 9,
      soulUrgeNumber: 9,
      personalityNumber: 9,
      birthdayNumber: 9,
      worldMissionNumber: 9,
      karmicLessons: [],
      masterNumbers: [],
    };
    const resWithout = calculateChakraAnalysisFromNumerology(numWithoutKarmic);
    const sacralBefore = resWithout.chakras.find((c) => c.chakra === 'SACRAL');
    assert.strictEqual(sacralBefore?.score, 5); // Nötr taban puan
    assert.strictEqual(sacralBefore?.status, 'BALANCED');

    const numWithKarmic: NumerologyAnalysis = {
      ...numWithoutKarmic,
      karmicLessons: [2], // 2 eksik
    };
    const resWith = calculateChakraAnalysisFromNumerology(numWithKarmic);
    const sacralAfter = resWith.chakras.find((c) => c.chakra === 'SACRAL');
    assert.strictEqual(sacralAfter?.score, 2); // 5 - 3.5 = 1.5 -> yuvarlama 2
    assert.strictEqual(sacralAfter?.status, 'BLOCKED');
  });

  // F) MASTER SAYININ (+1.5) SKOR ARTIŞI SAĞLAMASI
  it('Senaryo F: Master sayı katkısı (+1.5) ilgili çakranın skorunu artırmalıdır', () => {
    const numBase: NumerologyAnalysis = {
      lifePathNumber: 5,
      destinyNumber: 5,
      soulUrgeNumber: 5,
      personalityNumber: 5,
      birthdayNumber: 5,
      worldMissionNumber: 5,
      karmicLessons: [],
      masterNumbers: [],
    };
    const resBase = calculateChakraAnalysisFromNumerology(numBase);
    const thirdEyeBase = resBase.chakras.find((c) => c.chakra === 'THIRD_EYE');
    assert.strictEqual(thirdEyeBase?.score, 5);

    const numWithMaster11: NumerologyAnalysis = {
      ...numBase,
      masterNumbers: [11], // THIRD_EYE targetNumbers [7, 11]
    };
    const resMaster = calculateChakraAnalysisFromNumerology(numWithMaster11);
    const thirdEyeMaster = resMaster.chakras.find((c) => c.chakra === 'THIRD_EYE');
    assert.strictEqual(thirdEyeMaster?.score, 7); // 5.0 + 1.5 = 6.5 -> yuvarlama 7
  });

  // G) HİÇBİR ÇAKRANIN BLOCKED OLMAMASI SENARYOSU
  it('Senaryo G: Hiçbir karmik ders yoksa hiçbir çakra BLOCKED olmamalıdır', () => {
    const balancedNum: NumerologyAnalysis = {
      lifePathNumber: 1, // SOLAR_PLEXUS +2.5
      destinyNumber: 2,  // SACRAL +2.0
      soulUrgeNumber: 3, // THROAT +1.5
      personalityNumber: 4, // ROOT +1.0
      birthdayNumber: 6, // HEART +1.0
      worldMissionNumber: 7, // THIRD_EYE +1.0
      karmicLessons: [], // Hiçbir eksik sayı yok
      masterNumbers: [11], // THIRD_EYE +1.5
    };

    const res = calculateChakraAnalysisFromNumerology(balancedNum);

    for (const state of res.chakras) {
      assert.notStrictEqual(state.status, 'BLOCKED', `${state.chakra} BLOCKED olmamalıdır`);
      assert.ok(state.score >= 5, `${state.chakra} skoru en az 5 olmalıdır: ${state.score}`);
    }

    // Hiçbir çakra <= 4 olmadığı için deficitChakras boş olmalıdır
    assert.deepStrictEqual(res.deficitChakras, []);
    assert.strictEqual(res.primaryDeficit, undefined);
  });
});
