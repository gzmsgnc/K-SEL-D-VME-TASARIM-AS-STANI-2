/**
 * Dövme Tasarım ve Tarif Veri Modelleri
 * Bir danışanın birden fazla tasarım versiyonu ve dövme tarifi olabilir.
 */

export type TattooStyle =
  | 'FINE_LINE'             // İnce Çizgi / Minimalist
  | 'MICRO_REALISM'         // Mikro Gerçekçilik
  | 'SACRED_GEOMETRY'       // Kutsal Geometri / Mandallik
  | 'DOTWORK_WHIPSHADING'   // Noktalama ve Whip Shading
  | 'BLACKWORK_OCCULT'      // Blackwork & Okült İllüstrasyon
  | 'ETCHING_ENGRAVING'     // Gravür / Klasik Ahşap Baskı
  | 'WATERCOLOR_ABSTRACT';  // Suluboya / Soyut

export type BodyPlacement =
  | 'FOREARM_INNER'         // İç Ön Kol
  | 'FOREARM_OUTER'         // Dış Ön Kol
  | 'UPPER_ARM_BICEP'       // Üst Kol / Biceps
  | 'SHOULDER_BLADE'        // Kürek Kemiği
  | 'SPINE_CENTER'          // Omurga Hattı
  | 'RIBS_SIDE'             // Kaburga / Yan Gövde
  | 'CHEST_CENTER'          // Göğüs Ortası / Sternum
  | 'WRIST_INNER'           // İç Bilek
  | 'CALF'                  // Baldır
  | 'COLLARBONE';           // Köprücük Kemiği

export interface DetailedSymbolRationale {
  symbolName: string;                     // 1. Sembolün adı
  originSourceTr: string;                 // 2. Hangi analiz sonucu veya tasarım tercihi nedeniyle seçildi
  personalThemeTr: string;                // 3. Temsil ettiği kişisel tema
  compositionRoleTr: string;              // 4. Kompozisyondaki görevi
  relatedSymbolNameTr: string;            // 5. Hangi sembolle ilişkili ve bu ilişki neden kuruldu
  visualExecutionTr: string;              // 6. Görsel olarak nasıl işlenmeli
  layerLossMeaningTr: string;             // 7. Sembol çıkarılırsa tasarımın hangi anlam katmanı kaybolur
  isPrimary: boolean;
  // Uyumluluk ve formatlama alanları
  originAnalysis?: string;
  originValue?: string;
  personalTheme?: string;
  compositionRole?: string;
  relatedSymbol?: string;
  visualExecution?: string;
  meaningRiskIfRemoved?: string;
  weight?: 'PRIMARY' | 'SECONDARY';
}

export interface ComprehensiveDesignReport {
  clientSummary: {
    clientId: string;
    clientFullName: string;
    versionNumber: number;
    title: string;
    styleTr: string;
    placementTr: string;
    dimensionsFormatted: string;
    dimensionWarningTr?: string;
    colorProfileTr: string;
    completedAnalyses: string[];
    missingAnalyses: string[];
  };
  analysisTransitionNarrative: {
    sourceAnalysesUsed: string[];
    transitionPoints: {
      layerNameTr: string;
      themeIntroducedTr: string;
      mappingRuleTr: string;
      isSupportedByData: boolean;
    }[];
  };
  detailedSymbols: DetailedSymbolRationale[];
  chakraIntegration: {
    targetedChakras: string[];
    selectionRationaleTr: string;
    formFunctionsTr: string;
    symbolicContextNoticeTr: string;
  };
  archetypeNarrative: {
    primaryArchetypeTr: string;
    secondaryArchetypeTr?: string;
    shadowArchetypeTr?: string;
    transformationSymbolTr?: string;
    compassionatePerspectiveTr: string;
  };
  totemIntegration: {
    hasCompletedTotem: boolean;
    primaryTotemTr?: string;
    secondaryTotemTr?: string;
    isVisualIncluded: boolean;
    totemStatusExplanationTr: string;
    abstractionGuidelineTr?: string;
  };
  compositionPhilosophy: {
    centralFocusRationaleTr: string;
    secondaryArrangementRationaleTr: string;
    flowAndNegativeSpaceTr: string;
    holisticIntegrationRulesTr: string[];
  };
  anatomicalAndTechnicalDirective: {
    placementAndFlowTr: string;
    dimensionsExplicit: {
      widthCm: number;
      heightCm: number;
      orientationOrderTr: string;
      isBelowMinimum: boolean;
      minimumDimensionsNoticeTr: string;
    };
    lineworkAndNeedleAdviceTr: string[];
    skinAgingAndNegativeSpaceAdviceTr: string;
  };
  conceptManifesto: string;
  technicalPromptDirective: {
    englishPrompt: string;
    negativePrompt: string;
    aspectRatio: string;
    forbiddenElementsAudited: string[];
  };
  // A57: Bölüm Bazlı Erişim Kısayolları (Section Aliases A - J)
  sectionA: {
    clientSummary: string;
    clientId: string;
    recipeVersion: number;
    title: string;
    styleTr: string;
    placementTr: string;
    placementDetailTr?: string;
    recommendedDimensions: string;
    customDimensions?: string;
    dimensionWarningTr?: string;
    colorProfileTr: string;
    colorRationaleTr?: string;
    activeAnalysisModulesSummary?: string[];
    completedModules: string[];
    missingModules: string[];
  };
  sectionB: {
    originAnalysesSummary: string[];
    thematicKeywords: string[];
    mappingRulesUsed: string[];
    dataVerificationNoteTr: string;
  };
  sectionC: {
    symbols: DetailedSymbolRationale[];
  };
  sectionD: {
    selectedChakras: string[];
    rationaleTr: string;
    symbolicFormFunctionTr: string;
    nonMedicalDisclaimerTr: string;
  };
  sectionE: {
    primaryArchetypeTr: string;
    secondaryArchetypeTr?: string;
    shadowArchetypeNameTr: string;
    transformationSymbolTr: string;
    transformationNarrativeTr: string;
  };
  sectionF: {
    hasTotemAnalysis: boolean;
    primaryTotemTr?: string;
    secondaryTotemTr?: string;
    includeTotemInVisual: boolean;
    integrationNoteTr: string;
    symbolicGuidanceTr: string;
  };
  sectionG: {
    centralFocusRationaleTr: string;
    secondaryTransitionsTr: string;
    negativeSpaceRatioTr: string;
    holisticIntegrationRules: string[];
  };
  sectionH: {
    anatomicalPlacementTr: string;
    recommendedDimensionsTr: string;
    needleAndTechniqueGuidance: string[];
    agingAndLineSpacingTr: string;
  };
  sectionI: {
    manifestoTr: string;
  };
  sectionJ: {
    primaryPromptEn: string;
    negativePromptEn: string;
    aspectRatio: string;
    artisticModifiers?: string[];
    technicalCleanlinessNoteTr: string;
  };
}

export interface TattooRecipe {
  style: TattooStyle;
  recommendedPlacement: BodyPlacement;
  placementDescription: string;   // Anatomik akış ve yerleşim açıklaması
  recommendedDimensionsCm: {
    width: number;
    height: number;
  };
  colorProfile: 'MONOCHROME_BLACK' | 'BLACK_AND_GREY' | 'MINIMAL_RED_ACCENT' | 'MUTED_EARTH_TONES';
  colorRationale?: string;        // Renk profili ve sembolik gerekçesi
  primarySymbol?: string;         // Ana sembol
  secondarySymbols?: string[];    // İkincil semboller
  symbolCombinationRules?: string[]; // Sembollerin kompozisyondaki hiyerarşisi
  shadowTransformationTheme?: string; // Gölge arketipin dönüştürücü teması
  chakraSupportReflection?: string;   // Çakra desteğinin tasarıma yansıması
  totemAbstractionNotes?: string;     // Totem entegrasyonu veya analiz-yalnızca notu
  excludedElements?: string[];        // Hariç tutulan öğeler listesi
  artistVisualDirection?: string[];   // Tasarımcıya yönelik görsel yönlendirmeler
  keyComponents: string[];        // Dövmede yer alacak temel unsurlar ve semboller
  technicalAdviceForArtist: string[]; // Dövme sanatçısına yönelik teknik tavsiyeler (iğne no, gölgeleme derinliği vb.)
  detailedSymbols?: DetailedSymbolRationale[]; // A57: Her sembol için ayrıntılı ve gerekçeli açıklama
  comprehensiveReport?: ComprehensiveDesignReport; // A57: 10 Bölümlü Danışana Sunulabilir Kişisel Tasarım Raporu
}

export interface AIPromptData {
  primaryPromptEn: string;        // Görsel üretim motoru için ana İngilizce prompt
  conceptPromptTr: string;        // Türkçe konsept açıklaması
  negativePrompt: string;         // İstenmeyen unsurlar (blur, ugly lines, low contrast, text watermark)
  aspectRatio: '1:1' | '3:4' | '9:16' | '16:9';
  artisticModifiers: string[];    // Sanatçı referansları, ışık ve doku belirteçleri
  seed?: number;
}

/**
 * Danışan Dövme Tasarımı
 */
export interface ClientTattooDesign {
  id: string;                     // Tasarım kimliği
  clientId: string;               // Danışan kimliği
  versionNumber: number;          // Versiyon (1, 2, 3...)
  title: string;                  // Tasarım Başlığı (örn: 'Gölge Şahin ve Kutsal Metatron Kompozisyonu')
  conceptStatement: string;       // Felsefi ve ruhsal konsept manifestosu
  recipe: TattooRecipe;           // Detaylı Dövme Tarifi
  aiPrompt: AIPromptData;         // Yapay Zekâ Görsel Üretim İstemleri
  createdAt: string;              // Oluşturulma tarihi
  updatedAt: string;
  notes?: string;                 // Tasarımcı / Danışman notları
}
