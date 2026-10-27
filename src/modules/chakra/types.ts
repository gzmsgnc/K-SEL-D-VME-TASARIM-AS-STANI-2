import { ChakraAnalysis, ChakraName, ChakraState } from '../../types/analysis';

export type ChakraStatusClassification = 'OPEN' | 'BALANCED' | 'DEFICIT_OR_BLOCKED';

export type ChakraModuleStatus =
  | 'INPUTS_MISSING'
  | 'READY_TO_RUN'
  | 'COMPLETED';

export interface ChakraModulePreparation {
  clientId: string;
  status: ChakraModuleStatus;
  hasNumerology: boolean;
  statusMessageTr: string;
  warningNotices: string[];
}

export interface CalculateChakraResult {
  success: boolean;
  chakra?: ChakraAnalysis;
  errorMessageTr?: string;
  warningNotices: string[];
}

export interface ChakraDefinition {
  chakra: ChakraName;
  order: number;                    // 1: ROOT -> 7: CROWN
  nameTr: string;
  sanskritName: string;
  elementTr: string;
  bodyRegionTr: string;
  colorHex: string;
  associatedNumbers: number[];      // Numeroloji rezonans sayıları
  symbolicKeywordsTr: string[];
  balancedTraitsTr: string;
  imbalanceTraitsTr: string;
  tattooStrengtheningTheme: string;
}
