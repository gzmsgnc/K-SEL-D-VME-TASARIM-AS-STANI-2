/**
 * Analiz ve Tasarım Akışının Temeli (Pipeline Flow)
 * 
 * Danışan bilgilerinden analizlere, analizlerden sembol seçimine,
 * dövme tarifine ve nihai rapora adım adım ilerleyebilecek
 * aşamalı bağlantı mimarisi.
 * 
 * Hiçbir modülün henüz mevcut olmayan sonucunu varmış gibi göstermez.
 */

import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { ModuleId, MODULE_REGISTRY } from './moduleRegistry';
import { hasActualModuleResults, getModuleExecutionStatus } from './clientDataAdapter';

export type PipelineStageId =
  | 'STAGE_1_INTAKE'       // Danışan ve Doğum Bilgileri
  | 'STAGE_2_ANALYSIS'     // Temel Analizler (Astroloji, Numeroloji, Ebced, Çakra)
  | 'STAGE_3_TESTS'        // Derin Katmanlar (Arketip, Enneagram, Hayvan Totemi)
  | 'STAGE_4_SYMBOLS'      // Sembol Analizi ve Sentezi
  | 'STAGE_5_DESIGN'       // Dövme Tarifi ve AI Promptları
  | 'STAGE_6_REPORT';      // Nihai Raporlama

export interface PipelineStageInfo {
  id: PipelineStageId;
  order: number;
  nameTr: string;
  descriptionTr: string;
  moduleIds: ModuleId[];
  isCompleted: boolean;
  isUnlocked: boolean; // Önceki aşama tamamlandığında veya gerekli girdiler mevcut olduğunda açılır
}

export interface PipelineProgressReport {
  clientId: string;
  clientFullName: string;
  currentStageId: PipelineStageId;
  stages: PipelineStageInfo[];
  completedModulesCount: number;
  totalModulesCount: number;
  overallProgressPercent: number;
  nextRecommendedActionTr: string;
}

/**
 * Danışanın tasarım ve analiz yolculuğundaki mevcut durumunu inceler.
 * Mevcut olmayan sonuçları asla tamamlandı saymaz.
 */
export function evaluatePipelineProgress(
  client: Client,
  archive: ClientArchiveRecord | null
): PipelineProgressReport {
  // Aşama 1: Danışan Girişi
  const loc = client.birthLocation;
  const isLocationValid = Boolean(
    loc &&
    typeof loc.latitude === 'number' &&
    !isNaN(loc.latitude) &&
    typeof loc.longitude === 'number' &&
    !isNaN(loc.longitude) &&
    (loc.city || loc.country || loc.placeName)
  );

  const isIntakeComplete = Boolean(
    client.id &&
    client.firstName &&
    client.lastName &&
    client.birthDate &&
    isLocationValid &&
    client.motherName
  );

  // Aşama 2: Temel Analizler
  const astrologyDone = hasActualModuleResults(archive, 'ASTROLOGY');
  const numerologyDone = hasActualModuleResults(archive, 'NUMEROLOGY');
  const ebcedDone = hasActualModuleResults(archive, 'EBCED');
  const chakraDone = hasActualModuleResults(archive, 'CHAKRA');
  const isAnalysisStageComplete = astrologyDone && numerologyDone && ebcedDone && chakraDone;

  // Aşama 3: Testler & Arketipler
  const archetypeDone = hasActualModuleResults(archive, 'ARCHETYPE');
  const testsDone = hasActualModuleResults(archive, 'TESTS');
  const isTestsStageComplete = archetypeDone && testsDone;

  // Aşama 4: Semboller
  const symbolsDone = hasActualModuleResults(archive, 'SYMBOLS');

  // Aşama 5: Dövme Tasarımı
  const designDone = hasActualModuleResults(archive, 'TATTOO_DESIGN');

  // Aşama 6: Rapor
  const reportDone = hasActualModuleResults(archive, 'REPORT');

  const stages: PipelineStageInfo[] = [
    {
      id: 'STAGE_1_INTAKE',
      order: 1,
      nameTr: '1. Danışan ve Doğum Bilgileri',
      descriptionTr: 'Kişisel veriler, Batı / Tropical astroloji doğum saati ve küresel harita koordinatları.',
      moduleIds: [],
      isCompleted: isIntakeComplete,
      isUnlocked: true,
    },
    {
      id: 'STAGE_2_ANALYSIS',
      order: 2,
      nameTr: '2. Temel Kozmik ve Ezoterik Analizler',
      descriptionTr: 'Tropical astroloji haritası, numeroloji matrisi, ebced hesabı ve çakra dengesi.',
      moduleIds: ['ASTROLOGY', 'NUMEROLOGY', 'EBCED', 'CHAKRA'],
      isCompleted: isAnalysisStageComplete,
      isUnlocked: isIntakeComplete,
    },
    {
      id: 'STAGE_3_TESTS',
      order: 3,
      nameTr: '3. Derin Psikoloji ve Ruhsal Arketipler',
      descriptionTr: 'Birleşik/Gölge arketip dinamikleri, Enneagram ve hayvan totemi testleri.',
      moduleIds: ['ARCHETYPE', 'TESTS'],
      isCompleted: isTestsStageComplete,
      isUnlocked: isIntakeComplete,
    },
    {
      id: 'STAGE_4_SYMBOLS',
      order: 4,
      nameTr: '4. Sembol Analizi ve Kutsal Geometri',
      descriptionTr: 'Analiz sonuçlarına uygun ezoterik ve astrolojik sembollerin kompozisyonu.',
      moduleIds: ['SYMBOLS'],
      isCompleted: symbolsDone,
      isUnlocked: isIntakeComplete,
    },
    {
      id: 'STAGE_5_DESIGN',
      order: 5,
      nameTr: '5. Dövme Tasarım Tarifi ve AI Promptları',
      descriptionTr: 'Stil, anatomik akış, ölçü ve görsel üretim istemlerinin formüle edilmesi.',
      moduleIds: ['TATTOO_DESIGN'],
      isCompleted: designDone,
      isUnlocked: isIntakeComplete,
    },
    {
      id: 'STAGE_6_REPORT',
      order: 6,
      nameTr: '6. Kişiselleştirilmiş Danışan Raporu',
      descriptionTr: 'Tüm aşamaların derlenerek danışana sunulacak nihai tasarım dosyasına dönüştürülmesi.',
      moduleIds: ['REPORT'],
      isCompleted: reportDone,
      isUnlocked: isIntakeComplete,
    },
  ];

  // Tamamlanan gerçek modül sayısı
  const allModuleIds: ModuleId[] = [
    'ASTROLOGY',
    'NUMEROLOGY',
    'EBCED',
    'CHAKRA',
    'ARCHETYPE',
    'TESTS',
    'SYMBOLS',
    'TATTOO_DESIGN',
    'REPORT',
  ];

  const completedModules = allModuleIds.filter((m) => hasActualModuleResults(archive, m));
  const completedCount = completedModules.length;
  const totalCount = allModuleIds.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Aktif aşamayı belirle
  let currentStage: PipelineStageId = 'STAGE_2_ANALYSIS';
  let nextAction = 'Danışan bilgileri hazır. Sıradaki aşama: Batı / Tropical Astroloji hesaplamaları.';

  if (!isIntakeComplete) {
    currentStage = 'STAGE_1_INTAKE';
    nextAction = 'Eksik danışan ve doğum yeri bilgilerinin tamamlanması gerekiyor.';
  } else if (!isAnalysisStageComplete) {
    currentStage = 'STAGE_2_ANALYSIS';
    nextAction = 'Kozmik analiz motorlarının (Astroloji, Numeroloji, Ebced, Çakra) çalıştırılması bekleniyor.';
  } else if (!isTestsStageComplete) {
    currentStage = 'STAGE_3_TESTS';
    nextAction = 'Kişilik testleri ve arketip çözümlemeleri bekleniyor.';
  } else if (!symbolsDone) {
    currentStage = 'STAGE_4_SYMBOLS';
    nextAction = 'Analiz verilerine uygun sembol seçimleri ve kutsal geometri sentezi bekleniyor.';
  } else if (!designDone) {
    currentStage = 'STAGE_5_DESIGN';
    nextAction = 'Dövme tasarım tarifi ve yapay zekâ promptlarının formüle edilmesi bekleniyor.';
  } else if (!reportDone) {
    currentStage = 'STAGE_6_REPORT';
    nextAction = 'Nihai danışan raporunun oluşturulması bekleniyor.';
  } else {
    currentStage = 'STAGE_6_REPORT';
    nextAction = 'Tüm tasarım ve analiz süreçleri eksiksiz tamamlanmıştır.';
  }

  return {
    clientId: client.id,
    clientFullName: `${client.firstName} ${client.lastName}`.trim(),
    currentStageId: currentStage,
    stages,
    completedModulesCount: completedCount,
    totalModulesCount: totalCount,
    overallProgressPercent: progressPercent,
    nextRecommendedActionTr: nextAction,
  };
}
