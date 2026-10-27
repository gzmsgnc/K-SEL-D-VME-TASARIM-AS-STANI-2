import { ArchetypeAnalysis } from '../../types/analysis';

export type ArchetypeModuleStatus =
  | 'INPUTS_MISSING'
  | 'READY_TO_RUN'
  | 'COMPLETED';

export interface ArchetypeModulePreparation {
  clientId: string;
  status: ArchetypeModuleStatus;
  hasNumerology: boolean;
  hasChakra: boolean;
  hasEnneagram: boolean;
  statusMessageTr: string;
  warningNotices: string[];
}

export interface CalculateArchetypeResult {
  success: boolean;
  archetype?: ArchetypeAnalysis;
  errorMessageTr?: string;
  warningNotices: string[];
}

export interface ArchetypeMetadata {
  name: string;
  titleTr: string;
  familyTr: string;
  coreMotiveTr: string;
  lightExpressionTr: string;
  shadowName: string;
  shadowManifestationTr: string;
  transformationalSymbol: string;
  tattooAestheticTr: string;
}
