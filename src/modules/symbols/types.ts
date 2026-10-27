import {
  GeometryType,
  SymbolDefinition,
  ClientSymbolAnalysis,
} from '../../types/symbol';
import {
  ClientTattooDesign,
  TattooStyle,
  BodyPlacement,
  TattooRecipe,
} from '../../types/design';

export * from '../../types/symbol';

export type SymbolModuleStatus =
  | 'INPUTS_MISSING'
  | 'READY_TO_RUN'
  | 'COMPLETED';

export interface SymbolRecommendationOptions {
  excludedSymbols?: string[];
  preferredCategories?: GeometryType[];
  includeTotemInVisual?: boolean;
  maxRecommendations?: number;
}

export interface SymbolRecommendationResult {
  symbol: SymbolDefinition;
  matchingScore: number;
  reasonTr: string;
  sourceModule: 'ASTROLOGY' | 'NUMEROLOGY' | 'CHAKRA' | 'ARCHETYPE' | 'TOTEM' | 'ENNEAGRAM' | 'SACRED_BALANCE';
  suggestedWeight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
}

export interface SymbolModulePreparation {
  clientId: string;
  status: SymbolModuleStatus;
  hasAstrology: boolean;
  hasNumerology: boolean;
  hasChakra: boolean;
  hasArchetype: boolean;
  hasRecipe: boolean;
  statusMessageTr: string;
  warningNotices: string[];
  existingAnalysesCount: number;
}

export interface VisualPromptGenerationInput {
  clientId: string;
  clientFullName: string;
  motherName?: string;
  recipe?: TattooRecipe;
  selectedSymbols: {
    symbolId: string;
    symbolName: string;
    customMeaning: string;
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  }[];
  recommendedSymbols?: SymbolDefinition[];
  excludedSymbols?: string[];
  style?: TattooStyle;
  placement?: BodyPlacement;
  colorProfile?: TattooRecipe['colorProfile'];
  compositionNarrative?: string;
  includeTotemInVisual?: boolean;
  totemName?: string;
  conceptStatement?: string;
}

export interface VisualPromptOutput {
  primaryPromptEn: string;
  conceptPromptTr: string;
  negativePrompt: string;
  compositionHierarchy: string[];
  technicalDirectives: string[];
  excludedSanitized: string[];
}
