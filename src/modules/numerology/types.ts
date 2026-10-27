import { NumerologyAnalysis } from '../../types/analysis';

export type NumerologyStatus =
  | 'INPUTS_MISSING'
  | 'READY_TO_RUN'
  | 'COMPLETED';

export interface NumerologyModulePreparation {
  clientId: string;
  status: NumerologyStatus;
  fullName: string;
  birthDate: string;
  hasValidFullName: boolean;
  hasValidBirthDate: boolean;
  statusMessageTr: string;
  warningNotices: string[];
}

export interface CalculateNumerologyResult {
  success: boolean;
  numerology?: NumerologyAnalysis;
  errorMessageTr?: string;
  warningNotices: string[];
}

export interface NumberSymbolicResonance {
  number: number;
  titleTr: string;
  keywordTr: string;
  elementTr: string;
  associatedChakra: string;
  associatedArchetype: string;
  tattooSymbolTheme: string;
}
