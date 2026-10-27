/**
 * Totem Hesaplama Motoru ve Adaptörü (A22 Doğrulama)
 * 
 * Bu dosya, Totem Quiz hesaplama mantığını dışa aktarır ve
 * src/modules/tests/totemData.ts ve testEngineAdapter.ts ile
 * tam deterministik uyum içinde çalışır.
 */

export {
  TOTEM_ANIMALS,
  TOTEM_QUESTIONS,
  evaluateTotemTest,
  type TotemAnimalMeta,
} from '../modules/tests/totemData';

export {
  runAndBuildTotemResult,
} from '../modules/tests/testEngineAdapter';
