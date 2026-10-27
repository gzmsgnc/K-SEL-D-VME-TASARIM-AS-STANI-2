import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ClientTestResult, TestType, TestQuestionAnswer } from '../../types/test';
import { generateId } from '../../utils/id';
import {
  ENNEAGRAM_QUESTIONS,
  evaluateEnneagramTest,
} from './enneagramData';
import {
  TOTEM_QUESTIONS,
  evaluateTotemTest,
} from './totemData';

export interface TestsModulePreparation {
  clientId: string;
  hasEnneagram: boolean;
  hasTotem: boolean;
  enneagramResult: ClientTestResult | null;
  totemResult: ClientTestResult | null;
  statusMessageTr: string;
  warningNotices: string[];
}

/**
 * Danışan test modülü hazırlık durumunu değerlendirir.
 */
export function prepareTestsModule(
  client: Client,
  archive: ClientArchiveRecord | null
): TestsModulePreparation {
  if (!client || !client.id) {
    return {
      clientId: '',
      hasEnneagram: false,
      hasTotem: false,
      enneagramResult: null,
      totemResult: null,
      statusMessageTr: 'Danışan seçilmedi veya kimlik geçersiz.',
      warningNotices: ['Lütfen önce geçerli bir danışan seçin.'],
    };
  }

  const clientId = client.id;
  const clientTests = archive?.testResults.filter((t) => t.clientId === clientId) || [];

  const enneagramResult = [...clientTests].reverse().find((t) => t.testType === 'ENNEAGRAM') || null;
  const totemResult = [...clientTests].reverse().find((t) => t.testType === 'ANIMAL_TOTEM') || null;

  const hasEnneagram = Boolean(enneagramResult && enneagramResult.primaryType);
  const hasTotem = Boolean(totemResult && totemResult.primaryType);

  const warningNotices: string[] = [];
  if (!hasEnneagram) {
    warningNotices.push('Enneagram mizaç testi henüz tamamlanmadı.');
  }
  if (!hasTotem) {
    warningNotices.push('Ruh hayvanı / totem testi henüz tamamlanmadı.');
  }

  let statusMessageTr: string;
  if (hasEnneagram && hasTotem) {
    statusMessageTr = 'Enneagram ve Hayvan Totemi testleri tamamlanmış ve arşivlenmiştir.';
  } else if (hasEnneagram || hasTotem) {
    statusMessageTr = 'Testlerden biri tamamlandı. Diğer test tamamlanabilir.';
  } else {
    statusMessageTr = 'Danışan için kayıtlı psikolojik test bulunmuyor. Testler uygulanabilir.';
  }

  return {
    clientId,
    hasEnneagram,
    hasTotem,
    enneagramResult,
    totemResult,
    statusMessageTr,
    warningNotices,
  };
}

/**
 * Enneagram testini değerlendirip danışana özel ClientTestResult nesnesi üretir.
 */
export function runAndBuildEnneagramResult(
  client: Client,
  archive: ClientArchiveRecord | null,
  answersMap: Record<string, string>
): ClientTestResult {
  if (!client || !client.id) {
    throw new Error('Geçerli bir danışan kaydı gereklidir.');
  }

  const evaluation = evaluateEnneagramTest(answersMap);

  const answers: TestQuestionAnswer[] = Object.entries(answersMap).map(([qId, oId]) => {
    const q = ENNEAGRAM_QUESTIONS.find((item) => item.id === qId);
    const opt = q?.options.find((o) => o.id === oId);
    return {
      questionId: qId,
      selectedOptionId: oId,
      weight: opt?.weight || 3,
    };
  });

  const clientTests = archive?.testResults.filter(
    (t) => t.clientId === client.id && t.testType === 'ENNEAGRAM'
  ) || [];
  const version = clientTests.length + 1;

  return {
    id: generateId('test_enn'),
    clientId: client.id,
    testType: 'ENNEAGRAM',
    version,
    completedAt: new Date().toISOString(),
    answers,
    primaryType: evaluation.primaryType,
    secondaryType: evaluation.secondaryType,
    dominantScores: evaluation.dominantScores,
    interpretations: evaluation.interpretations,
  };
}

/**
 * Hayvan Totemi testini değerlendirip danışana özel ClientTestResult nesnesi üretir.
 */
export function runAndBuildTotemResult(
  client: Client,
  archive: ClientArchiveRecord | null,
  answersMap: Record<string, string>
): ClientTestResult {
  if (!client || !client.id) {
    throw new Error('Geçerli bir danışan kaydı gereklidir.');
  }

  const evaluation = evaluateTotemTest(answersMap);

  const answers: TestQuestionAnswer[] = Object.entries(answersMap).map(([qId, oId]) => {
    const q = TOTEM_QUESTIONS.find((item) => item.id === qId);
    const opt = q?.options.find((o) => o.id === oId);
    return {
      questionId: qId,
      selectedOptionId: oId,
      weight: opt?.weight || 3,
    };
  });

  const clientTests = archive?.testResults.filter(
    (t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM'
  ) || [];
  const version = clientTests.length + 1;

  return {
    id: generateId('test_tot'),
    clientId: client.id,
    testType: 'ANIMAL_TOTEM',
    version,
    completedAt: new Date().toISOString(),
    answers,
    primaryType: evaluation.primaryType,
    secondaryType: evaluation.secondaryType,
    dominantScores: evaluation.dominantScores,
    interpretations: evaluation.interpretations,
  };
}
