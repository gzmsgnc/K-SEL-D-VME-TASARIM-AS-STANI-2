import React, { useState, useEffect, useMemo } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ClientTattooDesign, TattooStyle, BodyPlacement, TattooRecipe } from '../../types/design';
import { useApp } from '../../store/AppContext';
import {
  prepareRecipeModule,
  generateClientRecipe,
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from '../../modules/recipe';
import {
  getClientRecommendedSymbols,
  generateUnifiedVisualPrompt,
  ALL_MASTER_SYMBOLS,
  SYMBOL_CATEGORIES_METADATA,
  SymbolDefinition,
  GeometryType,
  SymbolRecommendationResult,
} from '../../modules/symbols';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
  formatDesignPreviewSummary,
} from '../../utils/tattooDesignFormatters';
import {
  evaluateTattooDesignStage,
} from '../../utils/tattooDesignStage';
import { ClientTattooDesignResultHub } from './ClientTattooDesignResultHub';
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCw,
  Archive,
  History,
  ArrowRight,
  Trash2,
  Copy,
  Check,
  Wand2,
  Layers,
  Search,
  X,
  ChevronRight,
  Info,
  FileText,
  Plus,
  Compass,
} from 'lucide-react';

interface ClientTattooDesignWorkflowProps {
  client: Client;
  archive: ClientArchiveRecord | null;
  onNavigateToTab?: (tab: 'CLIENT_INFO' | 'ANALYSES' | 'RESULTS' | 'TESTS' | 'SYMBOLS' | 'DESIGN') => void;
}

export type DesignWorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export const ClientTattooDesignWorkflow: React.FC<ClientTattooDesignWorkflowProps> = ({
  client,
  archive,
  onNavigateToTab,
}) => {
  const { saveClientDesign, deleteClientDesign, clearClientDesigns } = useApp();

  // Aktif adım (1..6)
  const [currentStep, setCurrentStep] = useState<DesignWorkflowStep>(1);

  // A30 & A29 Görünüm Modu: Sonuç Ekranı veya Üretim Akışı
  const [viewMode, setViewMode] = useState<'RESULTS_PANEL' | 'PRODUCTION_FLOW'>('RESULTS_PANEL');

  // 1. Tasarım Parametreleri State'i (Danışana özel form durumu)
  const [selectedStyle, setSelectedStyle] = useState<TattooStyle>('SACRED_GEOMETRY');
  const [selectedPlacement, setSelectedPlacement] = useState<BodyPlacement>('FOREARM_INNER');
  const [customWidth, setCustomWidth] = useState<number>(12);
  const [customHeight, setCustomHeight] = useState<number>(18);
  const [hasCustomizedDimensions, setHasCustomizedDimensions] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<TattooRecipe['colorProfile']>('MONOCHROME_BLACK');
  const [excludedSymbolsInput, setExcludedSymbolsInput] = useState<string>('');
  const [includeTotemInVisual, setIncludeTotemInVisual] = useState<boolean>(false);
  const [customNotesInput, setCustomNotesInput] = useState<string>('');

  // 2. Sembol Seçimi State'i
  const [primarySymbolSelection, setPrimarySymbolSelection] = useState<string>('');
  const [selectedSecondarySymbols, setSelectedSecondarySymbols] = useState<string[]>([]);
  const [symbolCatalogSearch, setSymbolCatalogSearch] = useState<string>('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<GeometryType | 'ALL'>('ALL');

  // Versiyon İnceleme State'i
  const [selectedDesignVersionId, setSelectedDesignVersionId] = useState<string | null>(null);
  const [showClearDesignsConfirm, setShowClearDesignsConfirm] = useState<boolean>(false);

  // Geri Bildirim ve Yüklenme Durumları
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState<boolean>(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);

  // Kopyalama bildirim durumları
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Danışan değiştiğinde form ve seçim durumunu sıfırla (Danışan izolasyonu)
  useEffect(() => {
    setSelectedDesignVersionId(null);
    setFeedback(null);
    setCopiedType(null);
    setCurrentStep(1);
    setSelectedStyle('SACRED_GEOMETRY');
    setSelectedPlacement('FOREARM_INNER');
    const defaultDims = BODY_PLACEMENTS.FOREARM_INNER.recommendedDimensions;
    setCustomWidth(defaultDims.width);
    setCustomHeight(defaultDims.height);
    setHasCustomizedDimensions(false);
    setSelectedColor('MONOCHROME_BLACK');
    setExcludedSymbolsInput('');
    setIncludeTotemInVisual(false);
    setCustomNotesInput('');
    setPrimarySymbolSelection('');
    setSelectedSecondarySymbols([]);
    setSymbolCatalogSearch('');

    const hasDesigns = Boolean(archive?.designs?.some((d) => d.clientId === client.id));
    setViewMode(hasDesigns ? 'RESULTS_PANEL' : 'PRODUCTION_FLOW');
  }, [client.id]);

  // Yerleşim değiştiğinde boyut önerisi güncelle (özel ölçü girilmişse koru)
  const handlePlacementChange = (newPlacement: BodyPlacement) => {
    setSelectedPlacement(newPlacement);
    const meta = BODY_PLACEMENTS[newPlacement];
    if (meta?.recommendedDimensions && !hasCustomizedDimensions) {
      setCustomWidth(meta.recommendedDimensions.width);
      setCustomHeight(meta.recommendedDimensions.height);
    }
  };

  // Reçete modülü hazırlık durumu (A15)
  const recipePrep = useMemo(() => {
    return prepareRecipeModule(client, archive);
  }, [client, archive]);

  // Danışana ait kayıtlı tasarımlar (A25 Arşiv kuralı: kesinlikle yalnızca aktif client.id)
  const clientDesigns: ClientTattooDesign[] = useMemo(() => {
    if (!archive || !archive.designs) return [];
    return archive.designs
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [archive, client.id]);

  const latestDesign = clientDesigns[0] || null;

  const activeDesign: ClientTattooDesign | null = useMemo(() => {
    if (!clientDesigns.length) return null;
    if (selectedDesignVersionId) {
      return clientDesigns.find((d) => d.id === selectedDesignVersionId) || latestDesign;
    }
    return latestDesign;
  }, [clientDesigns, selectedDesignVersionId, latestDesign]);

  const isViewingHistoricalVersion = Boolean(
    activeDesign && latestDesign && activeDesign.id !== latestDesign.id
  );

  // A34: 9 Durumlu Tasarım Aşaması Tespiti
  const designStage = useMemo(() => {
    return evaluateTattooDesignStage(client, archive, {
      selectedStyle,
      selectedPlacement,
      customWidth,
      customHeight,
      selectedSymbolsCount: (primarySymbolSelection ? 1 : 0) + selectedSecondarySymbols.length,
      activeDesignId: selectedDesignVersionId,
      currentStep,
    });
  }, [
    client,
    archive,
    selectedStyle,
    selectedPlacement,
    customWidth,
    customHeight,
    primarySymbolSelection,
    selectedSecondarySymbols.length,
    selectedDesignVersionId,
    currentStep,
  ]);

  // Hariç tutulan semboller dizisi
  const cleanExcludedList = useMemo(() => {
    return excludedSymbolsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [excludedSymbolsInput]);

  // Totem bilgisi (arşivden)
  const totemTest = useMemo(() => {
    if (!archive?.testResults) return null;
    return archive.testResults.find((t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM');
  }, [archive, client.id]);

  const totemName = totemTest?.primaryType || undefined;

  // Enneagram bilgisi (arşivden)
  const enneagramTest = useMemo(() => {
    if (!archive?.testResults) return null;
    return archive.testResults.find((t) => t.clientId === client.id && t.testType === 'ENNEAGRAM');
  }, [archive, client.id]);

  // Kayıtlı analiz bilgileri (arşivden)
  const storedAnalysis = useMemo(() => {
    if (!archive?.analyses) return null;
    return archive.analyses.find((a) => a.clientId === client.id) || null;
  }, [archive, client.id]);

  // Akıllı sembol önerileri (A16 motoru üzerinden, hariç tutulanlar elenmiş)
  const recommendedSymbols: SymbolRecommendationResult[] = useMemo(() => {
    if (!archive) return [];
    return getClientRecommendedSymbols(client, archive, {
      excludedSymbols: cleanExcludedList,
      includeTotemInVisual,
      maxRecommendations: 12,
    });
  }, [client, archive, cleanExcludedList, includeTotemInVisual]);

  // Filtrelenmiş sembol kataloğu
  const catalogSymbols = useMemo(() => {
    return ALL_MASTER_SYMBOLS.filter((sym) => {
      if (selectedCatalogCategory !== 'ALL' && sym.geometryType !== selectedCatalogCategory) {
        return false;
      }
      if (symbolCatalogSearch.trim()) {
        const query = symbolCatalogSearch.toLocaleLowerCase('tr-TR');
        const target = `${sym.name} ${sym.originalName || ''} ${sym.keywords.join(' ')} ${sym.meaning} ${sym.originCulture}`.toLocaleLowerCase('tr-TR');
        if (!target.includes(query)) return false;
      }
      // Hariç tutulanlar kontrolü
      if (cleanExcludedList.length > 0) {
        const target = `${sym.name} ${sym.keywords.join(' ')}`.toLocaleLowerCase('tr-TR');
        if (cleanExcludedList.some((exc) => target.includes(exc.toLocaleLowerCase('tr-TR')))) {
          return false;
        }
      }
      // Anne adı kontrolü
      if (client.motherName && client.motherName.trim().length > 1) {
        const mLower = client.motherName.trim().toLocaleLowerCase('tr-TR');
        if (sym.name.toLocaleLowerCase('tr-TR').includes(mLower)) return false;
      }
      return true;
    });
  }, [selectedCatalogCategory, symbolCatalogSearch, cleanExcludedList, client.motherName]);

  // Sembol Seçimi İşleyicileri
  const handleSetPrimarySymbol = (symbolName: string) => {
    setPrimarySymbolSelection(symbolName);
    // İkincil sembollerde varsa oradan çıkar
    setSelectedSecondarySymbols((prev) => prev.filter((s) => s !== symbolName));
  };

  const handleToggleSecondarySymbol = (symbolName: string) => {
    if (primarySymbolSelection === symbolName) {
      setPrimarySymbolSelection('');
    }
    setSelectedSecondarySymbols((prev) =>
      prev.includes(symbolName) ? prev.filter((s) => s !== symbolName) : [...prev, symbolName]
    );
  };

  const handleRemoveSecondarySymbol = (symbolName: string) => {
    setSelectedSecondarySymbols((prev) => prev.filter((s) => s !== symbolName));
  };

  // Reçete Önizleme Özeti
  const previewSummaryText = useMemo(() => {
    return formatDesignPreviewSummary({
      client,
      style: selectedStyle,
      placement: selectedPlacement,
      widthCm: customWidth,
      heightCm: customHeight,
      colorProfile: selectedColor,
      primarySymbol: primarySymbolSelection || undefined,
      secondarySymbols: selectedSecondarySymbols,
      excludedSymbols: cleanExcludedList,
      includeTotemInVisual,
      totemName,
      customNotes: customNotesInput.trim() || undefined,
    });
  }, [
    client,
    selectedStyle,
    selectedPlacement,
    customWidth,
    customHeight,
    selectedColor,
    primarySymbolSelection,
    selectedSecondarySymbols,
    cleanExcludedList,
    includeTotemInVisual,
    totemName,
    customNotesInput,
  ]);

  // 3. REÇETE ÜRETİMİ (A15)
  const handleGenerateRecipe = () => {
    setFeedback(null);

    // Doğrulama: Ön koşul analizleri eksik mi?
    if (recipePrep.status === 'INPUTS_MISSING') {
      setFeedback({
        type: 'error',
        message: `Bu adım henüz tamamlanmadı: Reçete üretilemez. ${recipePrep.warningNotices.join(' ')}`,
      });
      return;
    }

    if (customWidth <= 0 || customHeight <= 0) {
      setFeedback({
        type: 'error',
        message: 'Bu adım henüz tamamlanmadı: Lütfen geçerli genişlik ve yükseklik ölçüleri (cm) girin.',
      });
      return;
    }

    setIsGeneratingRecipe(true);

    try {
      const result = generateClientRecipe(client, archive, {
        preferredStyle: selectedStyle,
        preferredPlacement: selectedPlacement,
        customDimensions: { width: customWidth, height: customHeight },
        colorPreference: selectedColor,
        primarySymbol: primarySymbolSelection || undefined,
        selectedSymbols: selectedSecondarySymbols,
        excludedSymbols: cleanExcludedList,
        includeTotemInVisual,
        customNotes: customNotesInput.trim() || undefined,
      });

      if (!result.success || !result.design) {
        setFeedback({
          type: 'error',
          message: result.errorMessageTr || 'Dövme reçetesi üretilemedi.',
        });
        setIsGeneratingRecipe(false);
        return;
      }

      // Arşive kaydet
      const saveRes = saveClientDesign(client.id, result.design);
      if (!saveRes.success) {
        setFeedback({
          type: 'error',
          message: saveRes.error || 'Reçete arşive kaydedilirken hata oluştu.',
        });
        setIsGeneratingRecipe(false);
        return;
      }

      setSelectedDesignVersionId(result.design.id);
      setFeedback({
        type: 'success',
        message: `Tebrikler! ${result.design.title} (V${result.design.versionNumber}) başarıyla üretildi ve arşive kaydedildi.`,
      });
      setCurrentStep(4); // Reçeteyi İncele adımına ilerle
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Beklenmeyen bir üretim hatası oluştu.',
      });
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // 5. GÖRSEL İSTEM ÜRETİMİ (A16)
  const handleGenerateUnifiedPrompt = () => {
    if (!activeDesign || !activeDesign.recipe) {
      setFeedback({
        type: 'error',
        message: 'Bu adım henüz tamamlanmadı: Görsel istem oluşturmak için önce geçerli bir Dövme Reçetesi gereklidir.',
      });
      return;
    }

    setIsGeneratingPrompt(true);
    setFeedback(null);

    try {
      const selectedSymbolObjs = [
        ...(activeDesign.recipe.primarySymbol
          ? [{ symbolId: 'primary-symbol', symbolName: activeDesign.recipe.primarySymbol, customMeaning: 'Merkezi Odak Sembolü', weight: 'PRIMARY' as const }]
          : []),
        ...(activeDesign.recipe.secondarySymbols || []).map((sec, idx) => ({
          symbolId: `sec-${idx}`,
          symbolName: sec,
          customMeaning: 'İkincil Rezonans ve Denge',
          weight: 'SECONDARY' as const,
        })),
      ];

      const rawExc = [
        ...cleanExcludedList,
        ...(activeDesign.recipe.excludedElements || []),
      ];

      const promptOutput = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`.trim(),
        motherName: client.motherName,
        recipe: activeDesign.recipe,
        selectedSymbols: selectedSymbolObjs,
        recommendedSymbols: recommendedSymbols.map((r) => r.symbol),
        excludedSymbols: rawExc,
        style: activeDesign.recipe.style,
        placement: activeDesign.recipe.recommendedPlacement,
        colorProfile: activeDesign.recipe.colorProfile,
        compositionNarrative: customNotesInput.trim() || undefined,
        includeTotemInVisual,
        totemName,
        conceptStatement: activeDesign.conceptStatement,
      });

      // Tasarımı güncellenmiş AI prompt ile güncelle
      const updatedDesign: ClientTattooDesign = {
        ...activeDesign,
        aiPrompt: {
          ...activeDesign.aiPrompt,
          primaryPromptEn: promptOutput.primaryPromptEn,
          conceptPromptTr: promptOutput.conceptPromptTr,
          negativePrompt: promptOutput.negativePrompt,
        },
        updatedAt: new Date().toISOString(),
      };

      const saveRes = saveClientDesign(client.id, updatedDesign);
      if (saveRes.success) {
        setFeedback({
          type: 'success',
          message: `Görsel İstem (Midjourney / AI Prompt) V${updatedDesign.versionNumber} için başarıyla sentezlendi!`,
        });
        setCurrentStep(6); // Kopyala / Arşivle adımına ilerle
      } else {
        setFeedback({
          type: 'error',
          message: saveRes.error || 'İstem kaydedilemedi.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Görsel istem üretilirken hata oluştu.',
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Kopyalama Yöneticisi
  const handleCopyText = (text: string, typeKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => {
      setCopiedType((prev) => (prev === typeKey ? null : prev));
    }, 2500);
  };

  const stepTitles = [
    { num: 1, label: '1. Parametreler' },
    { num: 2, label: '2. Sembol Seçimi' },
    { num: 3, label: '3. Reçete Oluştur' },
    { num: 4, label: '4. Reçeteyi İncele' },
    { num: 5, label: '5. Görsel İstem' },
    { num: 6, label: '6. Kopyala / Arşivle' },
  ];

  return (
    <div className="space-y-6">
      {/* A30 / A29 ÇALIŞMA ALANI GÖRÜNÜM GEÇİŞ ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('RESULTS_PANEL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'RESULTS_PANEL'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/30 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tasarım Sonucu & Arşiv Paneli (A30)</span>
            {clientDesigns.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-950 text-amber-300">
                {clientDesigns.length} Sürüm
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('PRODUCTION_FLOW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'PRODUCTION_FLOW'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/30 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Tasarım Üretim Akışı (A29)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'RESULTS_PANEL' ? (
            <button
              type="button"
              onClick={() => {
                setViewMode('PRODUCTION_FLOW');
                setCurrentStep(1);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Reçete / Sürüm Üret</span>
            </button>
          ) : (
            clientDesigns.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('RESULTS_PANEL')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Kayıtlı Tasarım Sonucuna Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {viewMode === 'RESULTS_PANEL' ? (
        <ClientTattooDesignResultHub
          client={client}
          archive={archive}
          onNavigateToTab={onNavigateToTab}
          onStartNewDesignVersion={() => {
            setViewMode('PRODUCTION_FLOW');
            setCurrentStep(1);
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* BAŞLIK & MODÜL TANITIMI */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-semibold text-stone-100">
                    Dövme Tasarımı Üretim Akışı (A29)
                  </h3>
                </div>
            <p className="text-xs text-stone-400">
              {client.firstName} {client.lastName} ({client.id}) için kayıtlı analizlerden güvenli, izlenebilir ve deterministik dövme tasarımı üretimi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {recipePrep.status === 'COMPLETED' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reçete Kayıtlı ({clientDesigns.length} Versiyon)</span>
              </span>
            ) : recipePrep.status === 'READY_TO_RUN' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-blue-950/80 text-blue-300 border border-blue-800/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Üretime Hazır</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Ön Koşul Analizleri Eksik</span>
              </span>
            )}
          </div>
        </div>

        {/* A34: 9 Durumlu Tasarım Aşaması Durum Çubuğu */}
        <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${designStage.badgeColorClass}`}>
              Aşama {designStage.stageNumber}: {designStage.stageTitleTr}
            </span>
            <span className="text-stone-300 truncate">
              {designStage.stageDescriptionTr}
            </span>
          </div>
          <div className="text-[11px] text-amber-300/90 font-medium shrink-0 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            Sıradaki: {designStage.nextActionTitleTr}
          </div>
        </div>

        {/* 6 AŞAMALI AKIŞ GÖSTERGESİ (STEPPER) */}
        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {stepTitles.map((st) => {
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;
              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => setCurrentStep(st.num as DesignWorkflowStep)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/40 ring-1 ring-amber-400'
                      : isPast
                      ? 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
                      : 'bg-stone-950 text-stone-500 border border-stone-900 hover:text-stone-400'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-stone-950 text-amber-400'
                        : isPast
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-stone-900 text-stone-500'
                    }`}
                  >
                    {isPast ? '✓' : st.num}
                  </span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ANALİZDEN TASARIMA GEÇİŞ DURUM ÇUBUĞU — ANALİZ KAYNAKLARI (A33 Madde 2) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Analiz Kaynakları (Aktif Danışan: {client.firstName} {client.lastName})</span>
            </span>
            <span className="text-[11px] text-stone-500">
              Reçete motoru bu gerçek analizlerden beslenir
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* Numeroloji */}
            <div className={`p-2.5 rounded-lg border space-y-1 ${
              recipePrep.hasNumerology ? 'bg-stone-950/60 border-stone-800' : 'bg-rose-950/20 border-rose-900/40'
            }`}>
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Numeroloji</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasNumerology ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {recipePrep.hasNumerology ? '✓ Kayıtlı (Zorunlu)' : '✗ Eksik (Zorunlu)'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {storedAnalysis?.numerology
                  ? `Y.Yolu: ${storedAnalysis.numerology.lifePathNumber}, İfade: ${storedAnalysis.numerology.destinyNumber}`
                  : 'Kayıt bulunmuyor'}
              </span>
            </div>

            {/* Çakra */}
            <div className={`p-2.5 rounded-lg border space-y-1 ${
              recipePrep.hasChakra ? 'bg-stone-950/60 border-stone-800' : 'bg-rose-950/20 border-rose-900/40'
            }`}>
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Çakra</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasChakra ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {recipePrep.hasChakra ? '✓ Kayıtlı (Zorunlu)' : '✗ Eksik (Zorunlu)'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {storedAnalysis?.chakra?.dominantChakra
                  ? `Baskın: ${storedAnalysis.chakra.dominantChakra}`
                  : (storedAnalysis?.chakra?.chakras?.length ? `${storedAnalysis.chakra.chakras.length} Çakra Kayıtlı` : 'Kayıt bulunmuyor')}
              </span>
            </div>

            {/* Arketip */}
            <div className={`p-2.5 rounded-lg border space-y-1 ${
              recipePrep.hasArchetype ? 'bg-stone-950/60 border-stone-800' : 'bg-rose-950/20 border-rose-900/40'
            }`}>
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Arketip</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasArchetype ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {recipePrep.hasArchetype ? '✓ Kayıtlı (Zorunlu)' : '✗ Eksik (Zorunlu)'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {storedAnalysis?.archetype?.unifiedArchetype?.primary
                  ? `Ana: ${storedAnalysis.archetype.unifiedArchetype.primary}`
                  : 'Kayıt bulunmuyor'}
              </span>
            </div>

            {/* Astroloji */}
            <div className="p-2.5 rounded-lg border bg-stone-950/60 border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Astroloji</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasAstrology ? 'text-emerald-400' : 'text-stone-400'
              }`}>
                {recipePrep.hasAstrology ? '✓ Harita Dahil' : '○ İsteğe Bağlı'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {storedAnalysis?.astrology?.sunSign
                  ? `Güneş: ${storedAnalysis.astrology.sunSign}`
                  : (storedAnalysis?.astrology ? 'Harita Kayıtlı' : 'Kayıt bulunmuyor')}
              </span>
            </div>

            {/* Enneagram */}
            <div className="p-2.5 rounded-lg border bg-stone-950/60 border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Enneagram</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasEnneagram ? 'text-emerald-400' : 'text-stone-400'
              }`}>
                {recipePrep.hasEnneagram ? '✓ Kayıtlı' : '○ Test Yapılmadı'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {enneagramTest ? `Tip: ${enneagramTest.primaryType}` : 'Kayıt bulunmuyor'}
              </span>
            </div>

            {/* Totem */}
            <div className="p-2.5 rounded-lg border bg-stone-950/60 border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Totem</span>
              <span className={`font-semibold text-[11px] flex items-center gap-1 ${
                recipePrep.hasTotem ? 'text-emerald-400' : 'text-stone-400'
              }`}>
                {recipePrep.hasTotem ? `✓ ${totemName || 'Kayıtlı'}` : '○ Test Yapılmadı'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {totemTest ? `${totemTest.primaryType}` : 'Kayıt bulunmuyor'}
              </span>
            </div>
          </div>

          {recipePrep.status === 'INPUTS_MISSING' && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-amber-300 block">Reçete Üretimi Engellendi: Zorunlu Analizler Eksik</span>
                  <span className="text-[11px] text-amber-300/90 leading-relaxed block">
                    {recipePrep.warningNotices.join(' ')} Dövme reçetesi motoru sahte analiz verisi üretmez; lütfen önce analizleri tamamlayınız.
                  </span>
                </div>
              </div>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('ANALYSES')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  Analizlere Git
                </button>
              )}
            </div>
          )}
        </div>

        {/* GERİ BİLDİRİM BİLDİRİMİ */}
        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start justify-between gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-950/40 border border-rose-900/60 text-rose-300'
                : feedback.type === 'info'
                ? 'bg-blue-950/40 border border-blue-900/60 text-blue-300'
                : 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 1. ADIM: TASARIM PARAMETRELERİ (Section 1) */}
      {currentStep === 1 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="space-y-1 pb-3 border-b border-stone-800">
            <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
              <span>Adım 1: Dövme Tasarımı Başlangıç Parametreleri</span>
            </h4>
            <p className="text-xs text-stone-400">
              Stil, anatomik yerleşim, boyut, renk ve kısıtları belirleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Stil Seçimi */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-300 font-medium">Dövme Stili (7 Stil)</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as TattooStyle)}
                className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-2.5 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-400"
              >
                {Object.values(TATTOO_STYLES).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameTr}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-stone-500 block leading-tight">
                {TATTOO_STYLES[selectedStyle]?.descriptionTr}
              </span>
            </div>

            {/* Anatomik Yerleşim */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-300 font-medium">Anatomik Yerleşim (10 Bölge)</label>
              <select
                value={selectedPlacement}
                onChange={(e) => handlePlacementChange(e.target.value as BodyPlacement)}
                className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-2.5 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-400"
              >
                {Object.values(BODY_PLACEMENTS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameTr}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-stone-500 block leading-tight">
                {BODY_PLACEMENTS[selectedPlacement]?.anatomicalFlowTr}
              </span>
            </div>

            {/* Boyut / Ölçü (cm) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-stone-300 font-medium">Boyut / Ölçü (G x Y cm)</label>
                {hasCustomizedDimensions && (
                  <span className="text-[10px] font-mono text-amber-400">Özel Ebat</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min={3}
                      max={80}
                      value={customWidth}
                      onChange={(e) => {
                        setCustomWidth(Math.max(1, Number(e.target.value)));
                        setHasCustomizedDimensions(true);
                      }}
                      className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-2 py-1.5 text-stone-200 text-xs font-mono pr-6"
                      placeholder="Genişlik"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-stone-500 font-mono">cm</span>
                  </div>
                  <span className="text-[9px] text-stone-500 block mt-0.5">Genişlik</span>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min={3}
                      max={120}
                      value={customHeight}
                      onChange={(e) => {
                        setCustomHeight(Math.max(1, Number(e.target.value)));
                        setHasCustomizedDimensions(true);
                      }}
                      className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-2 py-1.5 text-stone-200 text-xs font-mono pr-6"
                      placeholder="Yükseklik"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-stone-500 font-mono">cm</span>
                  </div>
                  <span className="text-[9px] text-stone-500 block mt-0.5">Yükseklik</span>
                </div>
              </div>
              {hasCustomizedDimensions && (
                <div className="pt-0.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const meta = BODY_PLACEMENTS[selectedPlacement];
                      if (meta?.recommendedDimensions) {
                        setCustomWidth(meta.recommendedDimensions.width);
                        setCustomHeight(meta.recommendedDimensions.height);
                        setHasCustomizedDimensions(false);
                      }
                    }}
                    className="text-[10px] text-stone-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Bölge varsayılanına dön ({BODY_PLACEMENTS[selectedPlacement]?.recommendedDimensions.width}x{BODY_PLACEMENTS[selectedPlacement]?.recommendedDimensions.height} cm)
                  </button>
                </div>
              )}
            </div>

            {/* Renk Profili */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-300 font-medium">Renk ve Ton Profili</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value as TattooRecipe['colorProfile'])}
                className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-2.5 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-400"
              >
                {Object.entries(COLOR_PROFILES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.nameTr}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-stone-500 block leading-tight">
                {COLOR_PROFILES[selectedColor]?.rationaleTr}
              </span>
            </div>
          </div>

          {/* Hariç Tutulan Semboller & Totem Görsel Entegrasyonu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-stone-800">
            <div className="space-y-1">
              <label className="text-[11px] text-stone-300 font-medium">
                Hariç Tutulacak Semboller (Virgülle Ayırın)
              </label>
              <input
                type="text"
                value={excludedSymbolsInput}
                onChange={(e) => setExcludedSymbolsInput(e.target.value)}
                placeholder="örn: yılan, kurukafa, hançer, göz"
                className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-3 py-2 text-stone-200 text-xs focus:outline-none focus:border-rose-400"
              />
              <span className="text-[10px] text-stone-500 block">
                * Buraya yazılan semboller ne önerilerde ne reçetede ne de görsel istemde ASLA yer almaz.
              </span>
            </div>

            <div className="space-y-2 pt-1 bg-stone-950/60 border border-stone-800 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-200">
                <input
                  type="checkbox"
                  checked={includeTotemInVisual}
                  onChange={(e) => setIncludeTotemInVisual(e.target.checked)}
                  className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">
                  Hayvan Totemini Görsel Tasarıma Soyut Olarak Dahil Et
                </span>
              </label>
              <span className="text-[10px] text-stone-400 block leading-tight">
                {includeTotemInVisual
                  ? `✓ Totem (${totemName || 'Ruh hayvanı'}) kompozisyona doğrudan hayvan figürü olarak değil, soyut negatif alan geometrisi olarak dahil edilir.`
                  : '○ İşaretlenmezse hayvan totemi yalnızca içsel mizaç analizi için kullanılır; dövme görseline girmez.'}
              </span>
            </div>
          </div>

          {/* Kompozisyonla İlgili Özel Not */}
          <div className="space-y-1 text-xs pt-1">
            <label className="text-[11px] text-stone-300 font-medium">
              Kompozisyonla İlgili Özel Not / Danışan Talebi (İsteğe Bağlı)
            </label>
            <textarea
              rows={2}
              value={customNotesInput}
              onChange={(e) => setCustomNotesInput(e.target.value)}
              placeholder="örn: Danışan kol içindeki yara izini kamufle eden dikey simetrik bir akış istiyor..."
              className="w-full bg-stone-950 border border-stone-700/80 rounded-lg px-3 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Sembol Seçimine İlerle (Adım 2)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. ADIM: SEMBOL SEÇİMİ (Section 3) */}
      {currentStep === 2 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span>Adım 2: Sembol Seçimi & Kompozisyon Katmanları</span>
              </h4>
              <p className="text-xs text-stone-400">
                Danışanın numeroloji, çakra ve arketip rezonansına göre önerilen sembolleri inceleyin veya katalogdan seçin.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Reçete Oluşturmaya Geç (Adım 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* AKTİF SEÇİLMİŞ SEMBOLLER PANOSU */}
          <div className="p-4 bg-stone-950/80 border border-amber-950/40 rounded-xl space-y-3">
            <span className="text-[11px] uppercase font-mono text-amber-400 font-semibold block tracking-wider">
              Seçilen Sembol Katmanları
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Ana Sembol */}
              <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Ana Sembol (Merkezi Odak)</span>
                {primarySymbolSelection ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">{primarySymbolSelection}</span>
                    <button
                      type="button"
                      onClick={() => setPrimarySymbolSelection('')}
                      className="text-stone-400 hover:text-rose-400 text-[10px] cursor-pointer"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <span className="text-stone-400 italic">
                    Belirtilmedi (Analiz rezonansına göre otomatik belirlenecek)
                  </span>
                )}
              </div>

              {/* İkincil Semboller */}
              <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">
                  İkincil Semboller ({selectedSecondarySymbols.length})
                </span>
                {selectedSecondarySymbols.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSecondarySymbols.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[10px] flex items-center gap-1"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondarySymbol(s)}
                          className="hover:text-rose-400 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">
                    Analiz katmanlarından (astroloji, çakra desteği) otomatik seçilecek
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* DANIŞANA ÖZEL ÖNERİLEN SEMBOLLER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Analiz Çıktılarına Göre Önerilen Semboller ({recommendedSymbols.length})</span>
              </span>
              <span className="text-[10px] text-stone-500">
                Hariç tutulanlar elenmiştir
              </span>
            </div>

            {recommendedSymbols.length === 0 ? (
              <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-lg text-center text-xs text-stone-500">
                Bu kriterlere uygun sembol önerisi bulunamadı veya henüz analizler tamamlanmadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recommendedSymbols.map((rec) => {
                  const isPrimary = primarySymbolSelection === rec.symbol.name;
                  const isSecondary = selectedSecondarySymbols.includes(rec.symbol.name);
                  return (
                    <div
                      key={rec.symbol.id}
                      className={`p-3 rounded-lg border transition-all space-y-2 flex flex-col justify-between ${
                        isPrimary
                          ? 'bg-amber-950/40 border-amber-500/70'
                          : isSecondary
                          ? 'bg-blue-950/30 border-blue-600/60'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-200 text-xs">{rec.symbol.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-900 border border-stone-800 text-stone-400">
                            {rec.sourceModule}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                          {rec.reasonTr}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-stone-800/80">
                        <button
                          type="button"
                          onClick={() => handleSetPrimarySymbol(rec.symbol.name)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer flex-1 ${
                            isPrimary
                              ? 'bg-amber-400 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700'
                          }`}
                        >
                          {isPrimary ? '✓ Ana Sembol' : 'Ana Sembol Yap'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSecondarySymbol(rec.symbol.name)}
                          className={`px-2 py-1 rounded text-[10px] transition-colors cursor-pointer flex-1 ${
                            isSecondary
                              ? 'bg-blue-500 text-stone-950 font-semibold'
                              : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                          }`}
                        >
                          {isSecondary ? '✓ İkincil' : '+ İkincil Ekle'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MASTER_SYMBOLS KÜTÜPHANESİ ARAMA / TARAMA */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Kutsal Geometri & Sembol Kataloğundan Seç ({catalogSymbols.length})</span>
              </span>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Katalogda ara..."
                    value={symbolCatalogSearch}
                    onChange={(e) => setSymbolCatalogSearch(e.target.value)}
                    className="bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Kategori Filtresi */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCatalogCategory('ALL')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedCatalogCategory === 'ALL'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                Tümü
              </button>
              {(Object.keys(SYMBOL_CATEGORIES_METADATA) as GeometryType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCatalogCategory(cat)}
                  className={`px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCatalogCategory === cat
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                  }`}
                >
                  {SYMBOL_CATEGORIES_METADATA[cat]?.nameTr}
                </button>
              ))}
            </div>

            {/* Katalog Izgarası */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1 bg-stone-950/40 rounded-lg border border-stone-900">
              {catalogSymbols.slice(0, 24).map((sym) => {
                const isPrimary = primarySymbolSelection === sym.name;
                const isSecondary = selectedSecondarySymbols.includes(sym.name);
                return (
                  <div
                    key={sym.id}
                    className="p-2 bg-stone-900/50 border border-stone-800 rounded text-xs flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <span className="font-semibold text-stone-200 text-[11px] block truncate">{sym.name}</span>
                      <span className="text-[10px] text-stone-500 block truncate">{sym.meaning}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimarySymbol(sym.name)}
                        className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer flex-1 ${
                          isPrimary ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {isPrimary ? 'Ana' : '+ Ana'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSecondarySymbol(sym.name)}
                        className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer flex-1 ${
                          isSecondary ? 'bg-blue-400 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {isSecondary ? 'İkincil' : '+ İkincil'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ADIM: REÇETE OLUŞTURMA & ÖNİZLEME (Section 4 & 5) */}
      {currentStep === 3 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span>Adım 3: Tasarım Önizlemesi & Reçete Üretimi</span>
              </h4>
              <p className="text-xs text-stone-400">
                Reçete oluşturulmadan önce parametrelerin özetini inceleyin ve A15 motorunu çalıştırın.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Geri
            </button>
          </div>

          {/* TASARIM ÖNİZLEMESİ ÖZET ALANI (Section 4) */}
          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                Tasarım Önizleme Özeti (Aktif Danışan: {client.firstName} {client.lastName})
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                Kimlik: {client.id}
              </span>
            </div>

            <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap leading-relaxed bg-stone-900/60 p-3.5 rounded-lg border border-stone-800/80">
              {previewSummaryText}
            </pre>
          </div>

          {/* REÇETE OLUŞTUR BUTONU (Section 5) */}
          <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-200 block">
                A15 Dövme Reçetesi Motorunu Çağır
              </span>
              <span className="text-[11px] text-stone-400 block">
                Üretilen reçete V{clientDesigns.length + 1} olarak arşivlenecektir. Önceki sürümler silinmez.
              </span>
            </div>

            {recipePrep.status === 'INPUTS_MISSING' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-xs text-rose-300">
                  Önce Numeroloji, Çakra ve Arketip analizlerini tamamlayın.
                </span>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('ANALYSES')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Analizler Sekmesine Git
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={isGeneratingRecipe}
                onClick={handleGenerateRecipe}
                className="px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400"
              >
                {isGeneratingRecipe ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Reçete Üretiliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Reçete Oluştur (V{clientDesigns.length + 1})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. ADIM: REÇETEYİ İNCELE (Section 5 & 8) */}
      {currentStep === 4 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Adım 4: Dövme Reçetesi Detayları</span>
              </h4>
              <p className="text-xs text-stone-400">
                Üretilen reçetenin felsefi temasını, sembollerini ve sanatçı direktiflerini inceleyin.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Görsel İstem Oluşturmaya Geç (Adım 5)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!activeDesign ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-stone-950/40 rounded-xl border border-stone-800">
              Henüz üretilmiş bir dövme reçetesi bulunmuyor. Lütfen önce Adım 3'ten reçete oluşturun.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Geçmiş Sürüm Uyarısı */}
              {isViewingHistoricalVersion && latestDesign && (
                <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-300 font-medium">
                    Geçmiş Sürüm İnceleniyor: V{activeDesign.versionNumber} (Salt Okunur)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDesignVersionId(latestDesign.id)}
                    className="px-2.5 py-1 bg-amber-400 text-stone-950 font-bold rounded text-[11px] cursor-pointer"
                  >
                    Güncel Sürüme Dön (V{latestDesign.versionNumber})
                  </button>
                </div>
              )}

              {/* Reçete Kartı */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-4">
                <div className="space-y-1 pb-3 border-b border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      REÇETE V{activeDesign.versionNumber}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {new Date(activeDesign.createdAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-stone-100">{activeDesign.title}</h3>
                  <p className="text-xs text-stone-300 italic pt-1 leading-relaxed">
                    "{activeDesign.conceptStatement}"
                  </p>
                </div>

                {/* Stil, Yerleşim, Boyut, Renk */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-mono text-stone-500 block">Stil & Yaklaşım</span>
                    <span className="font-semibold text-amber-300 block">
                      {TATTOO_STYLES[activeDesign.recipe.style]?.nameTr || activeDesign.recipe.style}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-mono text-stone-500 block">Yerleşim & Ölçü</span>
                    <span className="font-semibold text-stone-200 block">
                      {BODY_PLACEMENTS[activeDesign.recipe.recommendedPlacement]?.nameTr}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 block">
                      {activeDesign.recipe.recommendedDimensionsCm.width} cm x {activeDesign.recipe.recommendedDimensionsCm.height} cm
                    </span>
                  </div>

                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-mono text-stone-500 block">Renk Profili</span>
                    <span className="font-semibold text-stone-200 block">
                      {COLOR_PROFILES[activeDesign.recipe.colorProfile]?.nameTr}
                    </span>
                    <span className="text-[10px] text-stone-400 block truncate">
                      {activeDesign.recipe.colorRationale}
                    </span>
                  </div>
                </div>

                {/* Semboller & Hiyerarşi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-2">
                    <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                      Ana Sembol (Merkezi Odak)
                    </span>
                    <p className="font-medium text-stone-200 text-xs">
                      {activeDesign.recipe.primarySymbol}
                    </p>
                    <div className="pt-2 border-t border-stone-800/80 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
                        İkincil Semboller
                      </span>
                      <ul className="space-y-0.5">
                        {(activeDesign.recipe.secondarySymbols || []).map((sec, idx) => (
                          <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1">
                            <span className="text-amber-400">•</span>
                            <span>{sec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-2">
                    <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                      Sembol Hiyerarşisi Kuralları
                    </span>
                    <ul className="space-y-1">
                      {(activeDesign.recipe.symbolCombinationRules || []).map((r, idx) => (
                        <li key={idx} className="text-stone-300 text-[11px] p-1.5 bg-stone-950/60 rounded border border-stone-800">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ADIM: GÖRSEL İSTEM ÜRETİMİ (Section 6) */}
      {currentStep === 5 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Adım 5: Görsel İstem (Midjourney / AI Prompt) Üretimi</span>
              </h4>
              <p className="text-xs text-stone-400">
                10 adımlı sentez zinciri: Reçete, semboller, stil, yerleşim ve teknik direktifler nihai prompta dönüştürülür.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Kopyala / Arşivle Alanına İlerle (Adım 6)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!activeDesign?.recipe ? (
            <div className="p-8 text-center text-xs text-rose-300 bg-rose-950/20 rounded-xl border border-rose-900/40 space-y-3">
              <p>Eksik reçete: Görsel prompt oluşturmak için önce geçerli bir Dövme Reçetesi oluşturulmalıdır.</p>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Reçete Oluşturma Adımına Git (Adım 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-200 block">
                    A16 Görsel İstem Motorunu Çağır
                  </span>
                  <span className="text-[11px] text-stone-400 block">
                    Anne adı ve hariç tutulan semboller kesinlikle filtrelenir.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingPrompt}
                  onClick={handleGenerateUnifiedPrompt}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/40 ring-1 ring-amber-400"
                >
                  {isGeneratingPrompt ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>İstem Sentezleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Görsel İstem Oluştur / Güncelle</span>
                    </>
                  )}
                </button>
              </div>

              {/* Üretilmiş AI Prompt Detayı */}
              {activeDesign.aiPrompt && (
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                      Nihai İngilizce Görsel İstem (Midjourney / Stable Diffusion)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeDesign.aiPrompt.primaryPromptEn, 'prompt_only')}
                      className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'prompt_only' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Promptu Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs font-mono text-stone-200 select-all leading-relaxed break-words">
                    {activeDesign.aiPrompt.primaryPromptEn}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-mono text-stone-500 block">Türkçe Konsept Özeti</span>
                      <p className="text-[11px] text-stone-300 leading-relaxed">
                        {activeDesign.aiPrompt.conceptPromptTr}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-mono text-stone-500 block">Negatif Parametreler</span>
                      <p className="text-[11px] font-mono text-rose-300/80 leading-relaxed">
                        {activeDesign.aiPrompt.negativePrompt}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. ADIM: KOPYALA / ARŞİVLE (Section 7 & 8) */}
      {currentStep === 6 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Adım 6: Dövme Tasarım Paketi Kopyalama & Sürüm Arşivi</span>
              </h4>
              <p className="text-xs text-stone-400">
                Her alanı ayrı ayrı kopyalayın veya tüm paketi tek tuşla alın.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Geri
            </button>
          </div>

          {!activeDesign ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-950/40 rounded-xl border border-stone-800 space-y-3">
              <p>Kayıt bulunmuyor. Bu işlem için önce dövme reçetesi oluşturulmalıdır.</p>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Dövme Parametreleri ile Başla (Adım 1)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AYRI AYRI KOPYALAMA BUTONLARI (Section 7) */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200">
                    Ayrı Ayrı Kopyalama Alanları (Türkçe & Okunabilir)
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    Yalnızca {client.firstName} {client.lastName} ({client.id}) verisini içerir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* 1. Dövme Reçetesi */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatTattooRecipeText(client, activeDesign), 'recipe')}
                    className="p-3 bg-stone-900/70 hover:bg-stone-800/80 border border-stone-800 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-semibold text-stone-200 block">Dövme Reçetesi</span>
                      <span className="text-[10px] text-stone-400 block">Stil, yerleşim, ölçü, semboller</span>
                    </div>
                    {copiedType === 'recipe' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>

                  {/* 2. Türkçe Konsept / Manifesto */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatConceptManifestoText(client, activeDesign), 'concept')}
                    className="p-3 bg-stone-900/70 hover:bg-stone-800/80 border border-stone-800 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-semibold text-stone-200 block">Türkçe Konsept / Manifesto</span>
                      <span className="text-[10px] text-stone-400 block">Felsefi ve ruhsal konsept</span>
                    </div>
                    {copiedType === 'concept' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>

                  {/* 3. Sanatçı Teknik Talimatları */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatTechnicalAdviceText(client, activeDesign), 'technical')}
                    className="p-3 bg-stone-900/70 hover:bg-stone-800/80 border border-stone-800 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-semibold text-stone-200 block">Sanatçı Teknik Talimatları</span>
                      <span className="text-[10px] text-stone-400 block">İğne no, eğrilik, çizgi derinliği</span>
                    </div>
                    {copiedType === 'technical' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>

                  {/* 4. Görsel İstem */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatVisualPromptText(client, activeDesign), 'visual')}
                    className="p-3 bg-stone-900/70 hover:bg-stone-800/80 border border-stone-800 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-semibold text-stone-200 block">Görsel İstem (AI Prompt)</span>
                      <span className="text-[10px] text-stone-400 block">Midjourney prompt & negatif</span>
                    </div>
                    {copiedType === 'visual' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>

                  {/* 5. Negatif İstem */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatNegativePromptText(client, activeDesign), 'negative')}
                    className="p-3 bg-stone-900/70 hover:bg-stone-800/80 border border-stone-800 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-semibold text-stone-200 block">Negatif İstem</span>
                      <span className="text-[10px] text-stone-400 block">İstenmeyen unsurlar ve kısıtlar</span>
                    </div>
                    {copiedType === 'negative' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>

                  {/* 6. Tüm Tasarım Paketi */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(formatFullDesignPackageText(client, activeDesign), 'full_package')}
                    className="p-3 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-600/40 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-amber-300 block">Tüm Tasarım Paketini Kopyala</span>
                      <span className="text-[10px] text-stone-400 block">
                        Manifesto, Reçete, Teknik Direktifler ve Görsel İstem birleşik metni
                      </span>
                    </div>
                    {copiedType === 'full_package' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* SÜRÜM YÖNETİMİ & ARŞİV (Section 8) */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-stone-200">
                      Tasarım Sürümleri ({clientDesigns.length} Kayıt)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {clientDesigns.map((d) => {
                      const isLatest = d.id === latestDesign?.id;
                      const isSelected = d.id === activeDesign.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDesignVersionId(d.id)}
                          className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 text-stone-300 border border-stone-800 hover:text-stone-100'
                          }`}
                        >
                          <span>V{d.versionNumber}</span>
                          <span className="text-[10px] opacity-75">
                            {isLatest ? '(Güncel)' : '(Arşiv)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isViewingHistoricalVersion && latestDesign && (
                  <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-300">
                      Geçmiş V{activeDesign.versionNumber} sürümünü görüntülüyorsunuz.
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDesignVersionId(latestDesign.id)}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded text-[11px] cursor-pointer"
                    >
                      Güncel Sürüme Dön (V{latestDesign.versionNumber})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
};
