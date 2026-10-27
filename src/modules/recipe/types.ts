import {
  TattooStyle,
  BodyPlacement,
  ClientTattooDesign,
  TattooRecipe,
} from '../../types/design';

export type RecipeModuleStatus =
  | 'INPUTS_MISSING'
  | 'READY_TO_RUN'
  | 'COMPLETED';

export interface RecipeGenerationOptions {
  preferredStyle?: TattooStyle;
  preferredPlacement?: BodyPlacement;
  customDimensions?: { width: number; height: number };
  colorPreference?: TattooRecipe['colorProfile'];
  primarySymbol?: string;
  selectedSymbols?: string[];
  excludedSymbols?: string[];
  includeTotemInVisual?: boolean; // Varsayılan: false (analiz-yalnızca)
  customNotes?: string;
}

export interface RecipeModulePreparation {
  clientId: string;
  status: RecipeModuleStatus;
  hasAstrology: boolean;
  hasNumerology: boolean;
  hasChakra: boolean;
  hasArchetype: boolean;
  hasEnneagram: boolean;
  hasTotem: boolean;
  statusMessageTr: string;
  warningNotices: string[];
  existingDesignCount: number;
}

export interface GenerateRecipeResult {
  success: boolean;
  design?: ClientTattooDesign;
  errorMessageTr?: string;
  warningNotices: string[];
}
