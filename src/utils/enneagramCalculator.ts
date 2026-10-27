/**
 * Enneagram Hesaplama Motoru ve Adaptörü (A23 Doğrulama)
 * 
 * Bu dosya, Enneagram hesaplama mantığını dışa aktarır ve
 * src/modules/tests/enneagramData.ts ve testEngineAdapter.ts ile
 * tam deterministik uyum içinde çalışır.
 */

export {
  ENNEAGRAM_TYPES,
  ENNEAGRAM_QUESTIONS,
  evaluateEnneagramTest,
  type EnneagramTypeMeta,
} from '../modules/tests/enneagramData';

export {
  runAndBuildEnneagramResult,
} from '../modules/tests/testEngineAdapter';
