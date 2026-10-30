import React, { useState } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { useApp } from '../../store/AppContext';
import { GlobalLocationPicker } from '../map/GlobalLocationPicker';
import {
  Globe,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  Layers,
  Sparkles,
  ClipboardList,
  Shapes,
  Palette,
  ShieldCheck,
  Trash2,
  Edit3,
  Check,
  X,
  Compass,
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Hash,
  Flame,
  Crown,
  Eye,
  Copy,
  Plus,
  Wand2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Activity,
  History,
  Archive,
  Download,
  FileDown,
} from 'lucide-react';
import {
  generateClientDossierText,
  generateClientDossierJson,
  getClientPersonalInfoText,
  getAnalysesSummaryText,
  getEnneagramSummaryText,
  getTotemSummaryText,
  getRecipeSummaryText,
  getVisualPromptText,
  downloadFileInBrowser,
} from '../../utils/clientDossierGenerator';
import {
  evaluateWorkspaceWorkflow,
  WorkflowStep,
  WorkflowStepId,
  WorkspaceSummary,
} from '../../utils/workspaceWorkflow';
import {
  resolveEffectiveBirthTime,
  resolveAstrologicalCoordinates,
  evaluatePipelineProgress,
  getModuleExecutionStatus,
  MODULE_REGISTRY,
} from '../../core';
import {
  prepareAstrologyModule,
  getStoredTropicalChart,
  calculateClientTropicalChart,
  CELESTIAL_BODIES_TR,
  TROPICAL_ZODIAC_SIGNS,
} from '../../modules/astrology';
import {
  prepareNumerologyModule,
  calculateClientNumerology,
  NUMBER_RESONANCE_TABLE,
} from '../../modules/numerology';
import {
  prepareChakraModule,
  calculateClientChakra,
  getStoredChakraAnalysis,
  CHAKRA_DEFINITIONS,
  CHAKRA_ORDER,
  CHAKRA_STATUS_CONFIG,
} from '../../modules/chakra';
import {
  prepareArchetypeModule,
  calculateClientArchetype,
  getStoredArchetypeAnalysis,
  ARCHETYPE_DEFINITIONS,
  CHAKRA_SHADOW_MAP,
} from '../../modules/archetype';
import {
  prepareRecipeModule,
  generateClientRecipe,
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from '../../modules/recipe';
import { TattooStyle, BodyPlacement, TattooRecipe } from '../../types/design';
import {
  prepareSymbolModule,
  getClientRecommendedSymbols,
  buildClientSymbolAnalysis,
  generateUnifiedVisualPrompt,
  ALL_MASTER_SYMBOLS,
  MASTER_SYMBOLS,
  SYMBOL_CATEGORIES_METADATA,
  SymbolDefinition,
  GeometryType,
  SymbolRecommendationResult,
  VisualPromptOutput,
} from '../../modules/symbols';
import { ClientSymbolAnalysis } from '../../types/symbol';
import {
  prepareTestsModule,
  runAndBuildEnneagramResult,
  runAndBuildTotemResult,
  ENNEAGRAM_QUESTIONS,
  TOTEM_QUESTIONS,
  ENNEAGRAM_TYPES,
  TOTEM_ANIMALS,
} from '../../modules/tests';
import { ClientAnalysisResultsHub } from './ClientAnalysisResultsHub';
import { ClientTattooDesignWorkflow } from './ClientTattooDesignWorkflow';
import { CopyButton } from '../common/CopyButton';
import {
  formatFullClientAnalysisCopyText,
  formatClientPersonalInfoCopyText,
  formatBirthInfoSectionCopyText,
  formatAstrologySectionCopyText,
  formatNumerologySectionCopyText,
  formatChakraSectionCopyText,
  formatArchetypeSectionCopyText,
  formatEnneagramDetailedCopyText,
  formatTotemDetailedCopyText,
  formatRecipeSectionCopyText,
  formatAllVisualPromptsSectionCopyText,
  formatSymbolsSectionCopyText,
} from '../../utils/clientComprehensiveCopy';

interface ClientDetailCardProps {
  client: Client;
  archive: ClientArchiveRecord | null;
}

type DetailTab = 'RESULTS' | 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'DESIGN';

export const ClientDetailCard: React.FC<ClientDetailCardProps> = ({ client, archive }) => {
  const {
    updateClient,
    deleteClient,
    saveClientAstrology,
    clearClientAstrology,
    saveClientNumerology,
    clearClientNumerology,
    saveClientChakra,
    clearClientChakra,
    saveClientArchetype,
    clearClientArchetype,
    saveClientDesign,
    deleteClientDesign,
    clearClientDesigns,
    saveClientSymbolAnalysis,
    deleteClientSymbolAnalysis,
    clearClientSymbolAnalyses,
    saveClientTestResult,
    clearClientTestResult,
  } = useApp();
  const [activeTab, setActiveTab] = useState<DetailTab>('PERSONAL_BIRTH');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // A8: Hesaplama çalıştırma ve geri bildirim durumu
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcFeedback, setCalcFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // A12: Numeroloji hesaplama ve geri bildirim durumu
  const [numCalcLoading, setNumCalcLoading] = useState(false);
  const [numFeedback, setNumFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // A13: Çakra hesaplama ve geri bildirim durumu
  const [chakraCalcLoading, setChakraCalcLoading] = useState(false);
  const [chakraFeedback, setChakraFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // A14: Arketip hesaplama ve geri bildirim durumu
  const [archCalcLoading, setArchCalcLoading] = useState(false);
  const [archFeedback, setArchFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // A15: Dövme Reçetesi Motoru Durumu
  const [recipeCalcLoading, setRecipeCalcLoading] = useState(false);
  const [recipeFeedback, setRecipeFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<TattooStyle>('SACRED_GEOMETRY');
  const [selectedPlacement, setSelectedPlacement] = useState<BodyPlacement>('FOREARM_INNER');
  const [selectedColor, setSelectedColor] = useState<TattooRecipe['colorProfile']>('MONOCHROME_BLACK');
  const [excludedSymbolsInput, setExcludedSymbolsInput] = useState('');
  const [includeTotemInVisual, setIncludeTotemInVisual] = useState(false);
  const [customNotesInput, setCustomNotesInput] = useState('');
  const [selectedDesignVersionId, setSelectedDesignVersionId] = useState<string | null>(null);
  const [showClearDesignsConfirm, setShowClearDesignsConfirm] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // A16: Sembol Kütüphanesi ve Görsel Tasarım Motoru Durumu
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<GeometryType | 'ALL'>('ALL');
  const [selectedSymbolItems, setSelectedSymbolItems] = useState<
    { symbolId: string; symbolName: string; customMeaning: string; weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT' }[]
  >([]);
  const [compositionNarrativeInput, setCompositionNarrativeInput] = useState('');
  const [symbolFeedback, setSymbolFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [showClearSymbolsConfirm, setShowClearSymbolsConfirm] = useState(false);
  const [generatedVisualPrompt, setGeneratedVisualPrompt] = useState<VisualPromptOutput | null>(null);
  const [copiedSymbolPrompt, setCopiedSymbolPrompt] = useState(false);
  const [excludedSymbolsSymbolTab, setExcludedSymbolsSymbolTab] = useState('');

  // A18: Test Sistemi (Enneagram & Totem) Durumu
  const [activeTestSubTab, setActiveTestSubTab] = useState<'ENNEAGRAM' | 'ANIMAL_TOTEM'>('ENNEAGRAM');
  const [enneagramAnswers, setEnneagramAnswers] = useState<Record<string, string>>({});
  const [totemAnswers, setTotemAnswers] = useState<Record<string, string>>({});
  const [enneagramActiveQIndex, setEnneagramActiveQIndex] = useState(0);
  const [totemActiveQIndex, setTotemActiveQIndex] = useState(0);
  const [enneagramFeedback, setEnneagramFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [totemFeedback, setTotemFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [showClearEnneagramConfirm, setShowClearEnneagramConfirm] = useState(false);
  const [showClearTotemConfirm, setShowClearTotemConfirm] = useState(false);
  const [isEnneagramTaking, setIsEnneagramTaking] = useState(false);
  const [isTotemTaking, setIsTotemTaking] = useState(false);

  // A26: Danışan Dosyası ve Dışa Aktarma Durumu
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // A27: Çalışma Alanı İlerleme ve Eksik Adım Rehberi
  const [workflowGuidance, setWorkflowGuidance] = useState<{
    message: string;
    targetTab?: DetailTab;
    targetLabel?: string;
  } | null>(null);

  // Düzenleme durumu
  const [editData, setEditData] = useState<Client>({ ...client });
  const [editError, setEditError] = useState<string | null>(null);

  // Client değiştiğinde formu senkronize et
  React.useEffect(() => {
    setEditData({ ...client });
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setShowExportModal(false);
    setExportFeedback(null);
    setCopiedKey(null);
    setWorkflowGuidance(null);
    setCalcFeedback(null);
    setNumFeedback(null);
    setChakraFeedback(null);
    setArchFeedback(null);
    setRecipeFeedback(null);
    setSelectedDesignVersionId(null);
    setShowClearDesignsConfirm(false);
    setSymbolFeedback(null);
    setSelectedSymbolItems([]);
    setGeneratedVisualPrompt(null);
    setShowClearSymbolsConfirm(false);
    setExcludedSymbolsInput('');
    setCustomNotesInput('');
    setCompositionNarrativeInput('');
    setExcludedSymbolsSymbolTab('');
    setIncludeTotemInVisual(false);
    setActiveTestSubTab('ENNEAGRAM');
    setEnneagramAnswers({});
    setTotemAnswers({});
    setEnneagramActiveQIndex(0);
    setTotemActiveQIndex(0);
    setEnneagramFeedback(null);
    setTotemFeedback(null);
    setShowClearEnneagramConfirm(false);
    setShowClearTotemConfirm(false);
    setIsEnneagramTaking(false);
    setIsTotemTaking(false);
  }, [client.id]);

  const handleCopySection = (key: string, text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      setExportFeedback({
        type: 'success',
        message: `${label} panoya kopyalandı.`,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      setExportFeedback({
        type: 'error',
        message: 'Kopyalama işlemi gerçekleştirilemedi.',
      });
    }
  };

  const handleDownloadDossier = () => {
    try {
      const text = generateClientDossierText(client, archive);
      const safeName = `${client.firstName}_${client.lastName}`.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, '_');
      const filename = `Danisan_Dosyasi_${safeName}_${new Date().toISOString().split('T')[0]}.txt`;
      downloadFileInBrowser(filename, text);
      setExportFeedback({
        type: 'success',
        message: `Danışan dosyası (${filename}) başarıyla indirildi.`,
      });
    } catch {
      setExportFeedback({
        type: 'error',
        message: 'Dosya indirilirken bir hata oluştu.',
      });
    }
  };

  const handleDownloadJson = () => {
    try {
      const json = generateClientDossierJson(client, archive);
      const safeName = `${client.firstName}_${client.lastName}`.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, '_');
      const filename = `Danisan_Verisi_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
      downloadFileInBrowser(filename, JSON.stringify(json, null, 2), 'application/json');
      setExportFeedback({
        type: 'success',
        message: `JSON dosyası (${filename}) başarıyla indirildi.`,
      });
    } catch {
      setExportFeedback({
        type: 'error',
        message: 'JSON dosyası indirilirken bir hata oluştu.',
      });
    }
  };

  const loc = client.birthLocation;
  const effectiveBirthTime = resolveEffectiveBirthTime(
    client.birthTime,
    client.isBirthTimeUnknown,
    loc?.utcOffsetMinutes || 0
  );
  const astrologicalCoords = resolveAstrologicalCoordinates(loc);
  const pipelineReport = evaluatePipelineProgress(client, archive);
  const astroPrep = prepareAstrologyModule(client, archive);
  const storedChart = getStoredTropicalChart(archive, client.id);

  // A12: Numeroloji hazırlık ve kayıtlı sonuç
  const numPrep = prepareNumerologyModule(client, archive);
  const storedNumerology = archive?.analyses.find((a) => a.clientId === client.id)?.numerology || null;

  // A13: Çakra hazırlık ve kayıtlı sonuç
  const chakraPrep = prepareChakraModule(client, archive);
  const storedChakra = getStoredChakraAnalysis(archive, client.id);

  // A14: Arketip hazırlık ve kayıtlı sonuç
  const archPrep = prepareArchetypeModule(client, archive);
  const storedArchetype = getStoredArchetypeAnalysis(archive, client.id);

  // A15 & A25: Dövme Reçetesi hazırlık ve kayıtlı tasarım sürümleri
  const recipePrep = prepareRecipeModule(client, archive);
  const clientDesigns = archive?.designs.filter((d) => d.clientId === client.id) || [];
  const latestDesign = clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null;
  const activeDesign =
    clientDesigns.find((d) => d.id === selectedDesignVersionId) || latestDesign;
  const isViewingHistoricalVersion = Boolean(
    activeDesign && latestDesign && activeDesign.id !== latestDesign.id
  );

  // A16: Sembol hazırlık ve kayıtlı analizler
  const symbolPrep = prepareSymbolModule(client, archive);
  const clientSymbolAnalyses = archive?.symbolAnalyses.filter((s) => s.clientId === client.id) || [];
  const activeSymbolAnalysis =
    clientSymbolAnalyses.length > 0 ? clientSymbolAnalyses[clientSymbolAnalyses.length - 1] : null;

  // A18: Test Sistemi hazırlık ve kayıtlı sonuçlar
  const testsPrep = prepareTestsModule(client, archive);
  const storedEnneagram = testsPrep.enneagramResult;
  const storedTotem = testsPrep.totemResult;

  // Akıllı sembol önerileri
  const recommendedSymbolsList = React.useMemo(() => {
    const rawExc = excludedSymbolsSymbolTab.split(',').map((s) => s.trim()).filter(Boolean);
    return getClientRecommendedSymbols(client, archive, {
      excludedSymbols: rawExc,
      includeTotemInVisual: includeTotemInVisual,
    });
  }, [client.id, archive, excludedSymbolsSymbolTab, includeTotemInVisual]);

  // A27: Çalışma Alanı 8 Aşamalı İş Akışı ve Durum Özeti
  const workflowSummary = React.useMemo(() => {
    return evaluateWorkspaceWorkflow(client, archive);
  }, [client, archive]);

  // A34: Eksik Adımları Tek Yerden Yönetme Listesi (Açık İsimlendirme ve Tek Tık Navigasyon)
  const missingActionSteps = React.useMemo(() => {
    const list: {
      id: string;
      labelTr: string;
      descriptionTr: string;
      actionText: string;
      targetTab: DetailTab;
      onAction?: () => void;
    }[] = [];

    if (!recipePrep.hasNumerology) {
      list.push({
        id: 'num',
        labelTr: 'Numeroloji analizi eksik.',
        descriptionTr: 'Yaşam yolu ve kader sayısı hesaplanmalıdır.',
        actionText: 'Numerolojiye Git',
        targetTab: 'ANALYSES',
      });
    }

    if (!recipePrep.hasChakra) {
      list.push({
        id: 'chakra',
        labelTr: 'Çakra analizi eksik.',
        descriptionTr: '7 enerji merkezi ve baskın çakra tespiti yapılmalıdır.',
        actionText: 'Çakraya Git',
        targetTab: 'ANALYSES',
      });
    }

    if (!recipePrep.hasArchetype) {
      list.push({
        id: 'arch',
        labelTr: 'Arketip analizi eksik.',
        descriptionTr: 'Birleşik ve gölge arketip dinamikleri sentezlenmelidir.',
        actionText: 'Arketiplere Git',
        targetTab: 'ANALYSES',
      });
    }

    if (!storedChart?.planetaryPositions?.length) {
      list.push({
        id: 'astro',
        labelTr: 'Astroloji haritası eksik.',
        descriptionTr: 'Tropical zodyak ve gezegen konumları hesaplanmalıdır.',
        actionText: 'Astrolojiye Git',
        targetTab: 'ANALYSES',
      });
    }

    if (!storedEnneagram?.primaryType) {
      list.push({
        id: 'enneagram',
        labelTr: 'Enneagram testi tamamlanmadı.',
        descriptionTr: '15 soruluk mizaç testi danışan adına çözülmelidir.',
        actionText: 'Enneagram Testine Git',
        targetTab: 'TESTS',
        onAction: () => setActiveTestSubTab('ENNEAGRAM'),
      });
    }

    if (!storedTotem?.primaryType) {
      list.push({
        id: 'totem',
        labelTr: 'Totem testi tamamlanmadı.',
        descriptionTr: '10 soruluk ruh hayvanı totemi belirlenmelidir.',
        actionText: 'Totem Testine Git',
        targetTab: 'TESTS',
        onAction: () => setActiveTestSubTab('ANIMAL_TOTEM'),
      });
    }

    if (clientDesigns.length === 0) {
      list.push({
        id: 'recipe',
        labelTr: 'Dövme reçetesi henüz oluşturulmadı.',
        descriptionTr: 'Ön analizler sonrası teknik dövme reçetesi üretilmelidir.',
        actionText: 'Dövme Tasarımına Git',
        targetTab: 'DESIGN',
      });
    }

    return list;
  }, [
    recipePrep.hasNumerology,
    recipePrep.hasChakra,
    recipePrep.hasArchetype,
    storedChart,
    storedEnneagram,
    storedTotem,
    clientDesigns.length,
  ]);

  const handleStepClick = (step: WorkflowStep) => {
    setWorkflowGuidance(null);
    if (step.id === 'CLIENT_DOSSIER') {
      setShowExportModal(true);
      return;
    }

    if (step.status === 'MISSING' || (step.id === 'TATTOO_RECIPE' && !recipePrep.hasNumerology)) {
      setWorkflowGuidance({
        message: step.guidanceMessageTr || `${step.title} aşaması için gerekli ön analizler tamamlanmalıdır.`,
        targetTab: step.redirectTargetTab || 'ANALYSES',
        targetLabel: step.redirectTargetTab === 'ANALYSES' ? 'Analizlere Git' : 'Önceki Adıma Git',
      });
      if (step.targetTab && step.targetTab !== 'EXPORT_MODAL') {
        setActiveTab(step.targetTab);
      }
      return;
    }

    if (step.targetTab && step.targetTab !== 'EXPORT_MODAL') {
      setActiveTab(step.targetTab);
    }
  };

  const handleGenerateRecipe = () => {
    setRecipeCalcLoading(true);
    setRecipeFeedback(null);
    try {
      const excludedSymbols = excludedSymbolsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = generateClientRecipe(client, archive, {
        preferredStyle: selectedStyle,
        preferredPlacement: selectedPlacement,
        colorPreference: selectedColor,
        excludedSymbols,
        includeTotemInVisual,
        customNotes: customNotesInput.trim() || undefined,
      });

      if (res.success && res.design) {
        saveClientDesign(client.id, res.design);
        setSelectedDesignVersionId(res.design.id);
        setRecipeFeedback({
          type: 'success',
          message: `${res.design.title} başarıyla oluşturuldu ve arşive kaydedildi.`,
        });
      } else {
        const missingForRecipe: string[] = [];
        if (!recipePrep.hasNumerology) missingForRecipe.push('Numeroloji');
        if (!recipePrep.hasChakra) missingForRecipe.push('Çakra');
        if (!recipePrep.hasArchetype) missingForRecipe.push('Arketip');
        if (missingForRecipe.length > 0) {
          setWorkflowGuidance({
            message: `Önce ${missingForRecipe.join(', ')} analizlerini tamamlamanız gerekiyor.`,
            targetTab: 'ANALYSES',
            targetLabel: 'Analizlere Git',
          });
        }
        setRecipeFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Dövme reçetesi oluşturulamadı.',
        });
      }
    } catch (err: any) {
      setRecipeFeedback({
        type: 'error',
        message: err?.message || 'Beklenmeyen hata oluştu.',
      });
    } finally {
      setRecipeCalcLoading(false);
    }
  };

  const handleClearDesigns = () => {
    clearClientDesigns(client.id);
    setSelectedDesignVersionId(null);
    setShowClearDesignsConfirm(false);
    setRecipeFeedback({
      type: 'success',
      message: 'Bu danışana ait dövme reçeteleri sıfırlandı. Analiz verileri korundu.',
    });
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleAddSymbol = (
    symbol: SymbolDefinition,
    defaultWeight: 'PRIMARY' | 'SECONDARY' | 'ACCENT' = 'SECONDARY'
  ) => {
    setSymbolFeedback(null);
    if (client.motherName && client.motherName.trim().length > 1) {
      const mLower = client.motherName.trim().toLocaleLowerCase('tr-TR');
      if (symbol.name.toLocaleLowerCase('tr-TR').includes(mLower)) {
        setSymbolFeedback({
          type: 'error',
          message: 'Anne adı sembol olarak eklenemez.',
        });
        return;
      }
    }

    if (selectedSymbolItems.some((s) => s.symbolId === symbol.id)) {
      setSymbolFeedback({
        type: 'error',
        message: `"${symbol.name}" zaten seçili semboller arasında.`,
      });
      return;
    }

    setSelectedSymbolItems((prev) => [
      ...prev,
      {
        symbolId: symbol.id,
        symbolName: symbol.name,
        customMeaning: symbol.meaning,
        weight: defaultWeight,
      },
    ]);
  };

  const handleRemoveSymbol = (symbolId: string) => {
    setSelectedSymbolItems((prev) => prev.filter((s) => s.symbolId !== symbolId));
  };

  const handleUpdateSymbolWeight = (
    symbolId: string,
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT'
  ) => {
    setSelectedSymbolItems((prev) =>
      prev.map((s) => (s.symbolId === symbolId ? { ...s, weight } : s))
    );
  };

  const handleUpdateSymbolMeaning = (symbolId: string, customMeaning: string) => {
    setSelectedSymbolItems((prev) =>
      prev.map((s) => (s.symbolId === symbolId ? { ...s, customMeaning } : s))
    );
  };

  const handleSaveSymbolAnalysis = () => {
    if (selectedSymbolItems.length === 0) {
      setSymbolFeedback({
        type: 'error',
        message: 'Lütfen kompozisyona kaydetmek için en az bir sembol seçin.',
      });
      return;
    }

    try {
      const analysis = buildClientSymbolAnalysis(
        client,
        archive,
        selectedSymbolItems,
        compositionNarrativeInput.trim() || undefined
      );

      const res = saveClientSymbolAnalysis(client.id, analysis);
      if (res.success) {
        setSymbolFeedback({
          type: 'success',
          message: `Sembol kompozisyonu (V${analysis.version}) başarıyla kaydedildi.`,
        });
      } else {
        setSymbolFeedback({
          type: 'error',
          message: res.error || 'Sembol analizi kaydedilemedi.',
        });
      }
    } catch (err: any) {
      setSymbolFeedback({
        type: 'error',
        message: err?.message || 'Beklenmeyen hata oluştu.',
      });
    }
  };

  const handleGenerateUnifiedPrompt = () => {
    try {
      if (!activeDesign?.recipe) {
        setWorkflowGuidance({
          message: 'Görsel istem üretmek için önce Dövme Reçetesini oluşturmanız gerekiyor.',
          targetTab: 'DESIGN',
          targetLabel: 'Reçeteye Git',
        });
        setSymbolFeedback({
          type: 'error',
          message: 'Eksik reçete: Görsel prompt oluşturmak için önce "Dövme Tasarımı" sekmesinden danışana özel reçete oluşturulmalıdır.',
        });
        return;
      }

      const rawExc = [
        ...excludedSymbolsSymbolTab.split(',').map((s) => s.trim()).filter(Boolean),
        ...(activeDesign?.recipe?.excludedElements || []),
      ];

      const totemTest = archive?.testResults.find(
        (t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM'
      );

      const out = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`.trim(),
        motherName: client.motherName,
        recipe: activeDesign?.recipe,
        selectedSymbols: selectedSymbolItems,
        recommendedSymbols: recommendedSymbolsList.map((r) => r.symbol),
        excludedSymbols: rawExc,
        style: activeDesign?.recipe.style || selectedStyle,
        placement: activeDesign?.recipe.recommendedPlacement || selectedPlacement,
        colorProfile: activeDesign?.recipe.colorProfile || selectedColor,
        compositionNarrative: compositionNarrativeInput.trim() || undefined,
        includeTotemInVisual,
        totemName: totemTest?.primaryType,
        conceptStatement: activeDesign?.conceptStatement,
      });

      setGeneratedVisualPrompt(out);
      setSymbolFeedback({
        type: 'success',
        message: '10 Adımlı Görsel Tasarım İstemi (Midjourney Promptu) başarıyla sentezlendi.',
      });
    } catch (err: any) {
      setSymbolFeedback({
        type: 'error',
        message: err?.message || 'Görsel istem sentezlenirken hata oluştu.',
      });
    }
  };

  const handleClearAllSymbols = () => {
    clearClientSymbolAnalyses(client.id);
    setSelectedSymbolItems([]);
    setGeneratedVisualPrompt(null);
    setShowClearSymbolsConfirm(false);
    setSymbolFeedback({
      type: 'success',
      message: 'Bu danışana ait sembol analizleri sıfırlandı. Diğer analizler korundu.',
    });
  };

  const handleCopySymbolPrompt = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSymbolPrompt(true);
    setTimeout(() => setCopiedSymbolPrompt(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      setEditError('Ad ve soyad boş bırakılamaz.');
      return;
    }
    if (!editData.email.trim()) {
      setEditError('E-posta adresi boş bırakılamaz.');
      return;
    }
    if (!editData.birthDate) {
      setEditError('Doğum tarihi seçilmelidir.');
      return;
    }
    if (!editData.motherName.trim()) {
      setEditError('Ebced analizi için anne adı gereklidir.');
      return;
    }

    const result = updateClient(editData);
    if (result.success) {
      setIsEditing(false);
    } else {
      setEditError(result.error || 'Güncelleme yapılamadı.');
    }
  };

  const handleCancelEdit = () => {
    setEditData({ ...client });
    setIsEditing(false);
    setEditError(null);
  };

  const handleDelete = () => {
    deleteClient(client.id);
    setShowDeleteConfirm(false);
  };

  const handleRunAstrologyCalculation = () => {
    setCalcFeedback(null);
    setCalcLoading(true);

    try {
      const res = calculateClientTropicalChart(client);
      if (!res.success || !res.chart) {
        setCalcFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Hesaplama gerçekleştirilemedi.',
        });
        setCalcLoading(false);
        return;
      }

      const saveRes = saveClientAstrology(client.id, res.chart);
      if (!saveRes.success) {
        setCalcFeedback({
          type: 'error',
          message: saveRes.error || 'Sonuçlar arşive kaydedilemedi.',
        });
      } else {
        setCalcFeedback({
          type: 'success',
          message: '10 gök cisminin Tropical ekliptik boylamları başarıyla hesaplandı ve danışan arşivine kaydedildi.',
        });
      }
    } catch (err: any) {
      setCalcFeedback({
        type: 'error',
        message: `Hesaplama sırasında beklenmeyen hata: ${err?.message || err}`,
      });
    } finally {
      setCalcLoading(false);
    }
  };

  const handleClearAstrologyCalculation = () => {
    clearClientAstrology(client.id);
    setCalcFeedback({
      type: 'success',
      message: 'Danışana ait astroloji hesaplaması sıfırlandı. Modül hesaplamaya hazır durumdadır.',
    });
  };

  const handleRunNumerologyCalculation = () => {
    setNumFeedback(null);
    setNumCalcLoading(true);

    try {
      const res = calculateClientNumerology(client);
      if (!res.success || !res.numerology) {
        setNumFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Numeroloji hesaplaması yapılamadı.',
        });
        setNumCalcLoading(false);
        return;
      }

      const saveRes = saveClientNumerology(client.id, res.numerology);
      if (!saveRes.success) {
        setNumFeedback({
          type: 'error',
          message: saveRes.error || 'Numeroloji sonuçları arşive kaydedilemedi.',
        });
      } else {
        setNumFeedback({
          type: 'success',
          message: 'Numeroloji matrisi (Yaşam Yolu, Kader, Ruh Arzusu, Kişilik, Dünya Misyonu) başarıyla hesaplandı ve danışan arşivine kaydedildi.',
        });
      }
    } catch (err: any) {
      setNumFeedback({
        type: 'error',
        message: `Hesaplama sırasında beklenmeyen hata: ${err?.message || err}`,
      });
    } finally {
      setNumCalcLoading(false);
    }
  };

  const handleClearNumerologyCalculation = () => {
    clearClientNumerology(client.id);
    setNumFeedback({
      type: 'success',
      message: 'Danışana ait numeroloji matrisi sıfırlandı. Modül yeniden hesaplamaya hazır durumdadır.',
    });
  };

  const handleRunChakraCalculation = () => {
    setChakraFeedback(null);
    setChakraCalcLoading(true);

    try {
      const res = calculateClientChakra(client, archive);
      if (!res.success || !res.chakra) {
        setChakraFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Çakra analizi gerçekleştirilemedi.',
        });
        setChakraCalcLoading(false);
        return;
      }

      const saveRes = saveClientChakra(client.id, res.chakra);
      if (!saveRes.success) {
        setChakraFeedback({
          type: 'error',
          message: saveRes.error || 'Çakra analiz sonuçları arşive kaydedilemedi.',
        });
      } else {
        setChakraFeedback({
          type: 'success',
          message: '7 Temel Çakra dengesi (Baskın akış, blokaj tespiti ve dövme güçlendirici sembolizmi) başarıyla hesaplandı ve danışan arşivine kaydedildi.',
        });
      }
    } catch (err: any) {
      setChakraFeedback({
        type: 'error',
        message: `Hesaplama sırasında beklenmeyen hata: ${err?.message || err}`,
      });
    } finally {
      setChakraCalcLoading(false);
    }
  };

  const handleClearChakraCalculation = () => {
    clearClientChakra(client.id);
    setChakraFeedback({
      type: 'success',
      message: 'Danışana ait çakra analiz kaydı sıfırlandı. Modül yeniden hesaplamaya hazır durumdadır.',
    });
  };

  const handleRunArchetypeCalculation = () => {
    setArchFeedback(null);
    setArchCalcLoading(true);

    try {
      const res = calculateClientArchetype(client, archive);
      if (!res.success || !res.archetype) {
        setArchFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Arketip analizi gerçekleştirilemedi.',
        });
        setArchCalcLoading(false);
        return;
      }

      const saveRes = saveClientArchetype(client.id, res.archetype);
      if (!saveRes.success) {
        setArchFeedback({
          type: 'error',
          message: saveRes.error || 'Arketip analiz sonuçları arşive kaydedilemedi.',
        });
      } else {
        setArchFeedback({
          type: 'success',
          message: 'Birleşik Arketip ve Gölge Arketip dinamikleri başarıyla hesaplandı ve danışan arşivine kaydedildi.',
        });
      }
    } catch (err: any) {
      setArchFeedback({
        type: 'error',
        message: `Hesaplama sırasında beklenmeyen hata: ${err?.message || err}`,
      });
    } finally {
      setArchCalcLoading(false);
    }
  };

  const handleClearArchetypeCalculation = () => {
    clearClientArchetype(client.id);
    setArchFeedback({
      type: 'success',
      message: 'Danışana ait arketip analiz kaydı sıfırlandı. Modül yeniden hesaplamaya hazır durumdadır.',
    });
  };

  // A18: Test Sistemi (Enneagram & Totem) Handlers
  const handleStartEnneagram = () => {
    if (storedEnneagram && storedEnneagram.answers) {
      const initialMap: Record<string, string> = {};
      storedEnneagram.answers.forEach((ans) => {
        initialMap[ans.questionId] = ans.selectedOptionId;
      });
      setEnneagramAnswers(initialMap);
    }
    setEnneagramActiveQIndex(0);
    setIsEnneagramTaking(true);
    setEnneagramFeedback(null);
  };

  const handleSelectEnneagramAnswer = (questionId: string, optionId: string) => {
    setEnneagramAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleCompleteEnneagramTest = () => {
    setEnneagramFeedback(null);
    try {
      const result = runAndBuildEnneagramResult(client, archive, enneagramAnswers);
      const res = saveClientTestResult(client.id, result);
      if (res.success) {
        setIsEnneagramTaking(false);
        // Aktif tasarım reçetesi varsa yeni tamamlanan Enneagram sonucunu yansıtmak üzere senkronize et
        if (archive && archive.designs && archive.designs.length > 0) {
          const updatedArchive: ClientArchiveRecord = {
            ...archive,
            testResults: [
              ...(archive.testResults || []).filter((t) => !(t.clientId === client.id && t.testType === 'ENNEAGRAM')),
              result,
            ],
          };
          const recipeRes = generateClientRecipe(client, updatedArchive);
          if (recipeRes.success && recipeRes.design) {
            saveClientDesign(client.id, recipeRes.design);
          }
        }
        setEnneagramFeedback({
          type: 'success',
          message: `Enneagram testi başarıyla tamamlandı: ${result.primaryType} (${result.secondaryType || ''}) danışan arşivine kaydedildi.`,
        });
      } else {
        setEnneagramFeedback({
          type: 'error',
          message: res.error || 'Enneagram sonucu kaydedilemedi.',
        });
      }
    } catch (err: any) {
      setEnneagramFeedback({
        type: 'error',
        message: err?.message || 'Enneagram testi hesaplanırken bir hata oluştu.',
      });
    }
  };

  const handleResetEnneagram = () => {
    clearClientTestResult(client.id, 'ENNEAGRAM');
    setEnneagramAnswers({});
    setEnneagramActiveQIndex(0);
    setIsEnneagramTaking(false);
    setShowClearEnneagramConfirm(false);
    // Aktif tasarım reçetesi varsa Enneagram sıfırlanınca reçeteyi de güncel duruma (eksik Enneagram) senkronize et
    if (archive && archive.designs && archive.designs.length > 0) {
      const updatedArchive: ClientArchiveRecord = {
        ...archive,
        testResults: (archive.testResults || []).filter((t) => !(t.clientId === client.id && t.testType === 'ENNEAGRAM')),
      };
      const recipeRes = generateClientRecipe(client, updatedArchive);
      if (recipeRes.success && recipeRes.design) {
        saveClientDesign(client.id, recipeRes.design);
      }
    }
    setEnneagramFeedback({
      type: 'success',
      message: 'Enneagram test kaydı sıfırlandı. Diğer testler ve analizler korunmuştur.',
    });
  };

  const handleStartTotem = () => {
    if (storedTotem && storedTotem.answers) {
      const initialMap: Record<string, string> = {};
      storedTotem.answers.forEach((ans) => {
        initialMap[ans.questionId] = ans.selectedOptionId;
      });
      setTotemAnswers(initialMap);
    }
    setTotemActiveQIndex(0);
    setIsTotemTaking(true);
    setTotemFeedback(null);
  };

  const handleSelectTotemAnswer = (questionId: string, optionId: string) => {
    setTotemAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleCompleteTotemTest = () => {
    setTotemFeedback(null);
    try {
      const result = runAndBuildTotemResult(client, archive, totemAnswers);
      const res = saveClientTestResult(client.id, result);
      if (res.success) {
        setIsTotemTaking(false);
        // Aktif tasarım reçetesi varsa yeni tamamlanan totem sonucunu yansıtmak üzere senkronize et
        if (archive && archive.designs && archive.designs.length > 0) {
          const updatedArchive: ClientArchiveRecord = {
            ...archive,
            testResults: [
              ...(archive.testResults || []).filter((t) => !(t.clientId === client.id && t.testType === 'ANIMAL_TOTEM')),
              result,
            ],
          };
          const recipeRes = generateClientRecipe(client, updatedArchive);
          if (recipeRes.success && recipeRes.design) {
            saveClientDesign(client.id, recipeRes.design);
          }
        }
        setTotemFeedback({
          type: 'success',
          message: `Hayvan Totemi testi başarıyla tamamlandı: ${result.primaryType} (${TOTEM_ANIMALS[result.primaryType]?.elementTr || ''}) danışan arşivine kaydedildi.`,
        });
      } else {
        setTotemFeedback({
          type: 'error',
          message: res.error || 'Totem sonucu kaydedilemedi.',
        });
      }
    } catch (err: any) {
      setTotemFeedback({
        type: 'error',
        message: err?.message || 'Totem testi hesaplanırken bir hata oluştu.',
      });
    }
  };

  const handleResetTotem = () => {
    clearClientTestResult(client.id, 'ANIMAL_TOTEM');
    setTotemAnswers({});
    setTotemActiveQIndex(0);
    setIsTotemTaking(false);
    setShowClearTotemConfirm(false);
    // Aktif tasarım reçetesi varsa Totem sıfırlanınca reçeteyi de güncel duruma (eksik Totem) senkronize et
    if (archive && archive.designs && archive.designs.length > 0) {
      const updatedArchive: ClientArchiveRecord = {
        ...archive,
        testResults: (archive.testResults || []).filter((t) => !(t.clientId === client.id && t.testType === 'ANIMAL_TOTEM')),
      };
      const recipeRes = generateClientRecipe(client, updatedArchive);
      if (recipeRes.success && recipeRes.design) {
        saveClientDesign(client.id, recipeRes.design);
      }
    }
    setTotemFeedback({
      type: 'success',
      message: 'Hayvan Totemi test kaydı sıfırlandı. Diğer testler ve analizler korunmuştur.',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Danışan Başlık Özeti */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-serif text-stone-100">
              {client.firstName} {client.lastName}
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {client.id}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 mt-2">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-500" />
              {client.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-stone-500" />
              {client.phone}
            </span>
            <span className="text-stone-500">·</span>
            <span className="text-stone-400">
              Kayıt: {new Date(client.createdAt).toLocaleDateString('tr-TR')}
            </span>
          </div>
        </div>

        {/* Eylem Butonları */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <CopyButton
            textToCopy={() => formatFullClientAnalysisCopyText(client, archive)}
            label="Tüm Analizi Kopyala"
            variant="gold"
            size="md"
            title="Mevcut danışanın tüm analiz, test ve tasarım verisini tek metin olarak panoya kopyalar"
          />

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-xs text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Tüm danışan dosyasını metin veya JSON olarak dışa aktar ve kopyala"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Danışan Dosyasını Dışa Aktar</span>
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-xs text-stone-300 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Bilgileri Düzenle</span>
            </button>
          )}

          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/80 rounded-lg p-1">
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
              >
                Silmeyi Onayla
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                İptal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              title="Bu danışanın kaydını ve bağımsız arşivini sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* A27: 1. Çalışma Alanı Durum Özeti Kartı */}
      {workflowSummary && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                  <span>Çalışma Alanı Durum Özeti</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  {workflowSummary.birthInfoTr}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-950 border border-stone-800 text-stone-300">
                {workflowSummary.overallStatusLabelTr}
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                %{workflowSummary.overallProgressPercent}
              </span>
            </div>
          </div>

          {/* Genel İlerleme Çubuğu */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-400">İş Akışı İlerleme Durumu</span>
              <span className="font-mono text-amber-400/90 font-medium">
                {workflowSummary.steps.filter((s) => s.status === 'COMPLETED').length} / 8 Aşama Tamamlandı
              </span>
            </div>
            <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800/60 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${workflowSummary.overallProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Özet Metrikleri (4 Kolon) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {/* Metrik 1: Danışan & Doğum */}
            <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Danışan Kaydı</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                  Aktif
                </span>
              </div>
              <div className="text-xs font-semibold text-stone-200 truncate">
                {client.firstName} {client.lastName}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {client.isBirthTimeUnknown ? 'Doğum saati belirsiz' : `Saat ${client.birthTime}`} · {client.birthLocation?.city || 'Konum Belirtildi'}
              </div>
            </div>

            {/* Metrik 2: Temel Analizler */}
            <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Temel Analizler</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    workflowSummary.completedAnalysesCount === 4
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                      : workflowSummary.completedAnalysesCount > 0
                      ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                      : 'bg-stone-900 text-stone-500 border-stone-800'
                  }`}
                >
                  {workflowSummary.completedAnalysesCount > 0 ? workflowSummary.analysesStatusTr : 'Kayıt bulunmuyor'}
                </span>
              </div>
              <div className="text-xs font-semibold text-stone-200">
                {workflowSummary.completedAnalysesCount === 4
                  ? 'Tüm Analizler Hazır'
                  : workflowSummary.completedAnalysesCount > 0
                  ? `${workflowSummary.completedAnalysesCount} / 4 Analiz`
                  : 'Kayıt bulunmuyor'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                Astroloji, Numeroloji, Çakra, Arketip
              </div>
            </div>

            {/* Metrik 3: Psikoloji & Testler */}
            <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Test Sistemi</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    workflowSummary.completedTestsCount === 2
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                      : workflowSummary.completedTestsCount === 1
                      ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                      : 'bg-stone-900 text-stone-500 border-stone-800'
                  }`}
                >
                  {workflowSummary.completedTestsCount > 0 ? workflowSummary.testsStatusTr : 'Kayıt bulunmuyor'}
                </span>
              </div>
              <div className="text-xs font-semibold text-stone-200">
                {workflowSummary.completedTestsCount === 2
                  ? 'Enneagram & Totem'
                  : workflowSummary.completedTestsCount === 1
                  ? '1 Test Tamamlandı'
                  : 'Kayıt bulunmuyor'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                15 Mizaç + 10 Totem Sorusu
              </div>
            </div>

            {/* Metrik 4: Reçete & Sürümler */}
            <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Reçete & Sürüm</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    workflowSummary.totalDesignsCount > 0
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                      : 'bg-stone-900 text-stone-500 border-stone-800'
                  }`}
                >
                  {workflowSummary.totalDesignsCount > 0 ? workflowSummary.currentRecipeVersionTr : 'Kayıt bulunmuyor'}
                </span>
              </div>
              <div className="text-xs font-semibold text-stone-200">
                {workflowSummary.totalDesignsCount > 0
                  ? `${workflowSummary.totalDesignsCount} Kayıtlı Tasarım`
                  : 'Kayıt bulunmuyor'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                Tasarım Sürüm Arşivi
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A27: 2. Çalışma Alanı İlerleme Akışı (8-Aşamalı Stepper Bar) */}
      {workflowSummary && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                Çalışma Alanı İlerleme Akışı
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">
              Aşamalara tıklayarak doğrudan ilgili adıma geçebilirsiniz
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {workflowSummary.steps.map((step) => {
              const isSelectedTab =
                (step.targetTab === 'PERSONAL_BIRTH' && activeTab === 'PERSONAL_BIRTH') ||
                (step.targetTab === 'ANALYSES' && activeTab === 'ANALYSES') ||
                (step.targetTab === 'TESTS' && activeTab === 'TESTS') ||
                (step.targetTab === 'SYMBOLS' && activeTab === 'SYMBOLS') ||
                (step.targetTab === 'DESIGN' && activeTab === 'DESIGN') ||
                (step.targetTab === 'RESULTS' && activeTab === 'RESULTS');

              const isCompleted = step.status === 'COMPLETED';
              const isMissing = step.status === 'MISSING';
              const isReady = step.status === 'READY';

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative group ${
                    isSelectedTab
                      ? 'ring-1 ring-amber-400/60 border-amber-500/60 bg-stone-900 shadow-sm'
                      : 'border-stone-800 bg-stone-950/70 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                  title={`${step.title} — ${step.statusLabelTr}: ${step.summaryTr}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="w-4 h-4 rounded-full bg-stone-800 text-[10px] font-mono flex items-center justify-center text-stone-300">
                      {step.order}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                          : isReady
                          ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                          : isMissing
                          ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                          : 'bg-stone-900 border-stone-800 text-stone-500'
                      }`}
                    >
                      {step.statusLabelTr}
                    </span>
                  </div>

                  <div>
                    <div className={`text-[11px] font-medium truncate ${isSelectedTab ? 'text-amber-300' : 'text-stone-200'}`}>
                      {step.title}
                    </div>
                    <div className="text-[9px] text-stone-500 line-clamp-1 mt-0.5">
                      {step.summaryTr}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* A34: Eksik Adımları Tek Yerden Yönetme Paneli */}
      {missingActionSteps.length > 0 && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                Eksik Adımları Yönet ({missingActionSteps.length} Eksik İşlem)
              </h4>
            </div>
            <span className="text-[11px] text-stone-400">
              Tek tıkla ilgili analize veya teste geçebilirsiniz
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {missingActionSteps.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 truncate">
                  <div className="font-semibold text-rose-300 truncate">
                    {item.labelTr}
                  </div>
                  <div className="text-[10px] text-stone-400 truncate">
                    {item.descriptionTr}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(item.targetTab);
                    if (item.onAction) item.onAction();
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A27: 3. Eksik Adım Yönlendirme Bildirimi */}
      {workflowGuidance && (
        <div className="bg-amber-950/40 border border-amber-800/80 text-amber-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs font-semibold text-amber-200">Eksik Adım Yönlendirmesi</div>
              <p className="text-xs text-amber-300/90 mt-0.5">{workflowGuidance.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {workflowGuidance.targetTab && (
              <button
                type="button"
                onClick={() => {
                  if (workflowGuidance.targetTab) {
                    setActiveTab(workflowGuidance.targetTab);
                  }
                  setWorkflowGuidance(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{workflowGuidance.targetLabel || 'İlgili Adıma Git'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setWorkflowGuidance(null)}
              className="p-1.5 text-amber-400/80 hover:text-amber-200 rounded-lg transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Bölüm Sekmeleri (Tab Bar) - Kesintisiz Danışan Akış Sırası */}
      <div className="flex items-center gap-1 p-1 bg-stone-900/60 border border-stone-800 rounded-lg overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('PERSONAL_BIRTH')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'PERSONAL_BIRTH'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>1. Danışan Bilgileri</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANALYSES')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'ANALYSES'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>2. Temel Analizler</span>
          <span className="text-[10px] text-stone-500 font-mono">({archive?.analyses.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TESTS')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'TESTS'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>3. Enneagram & Totem</span>
          <span className="text-[10px] text-stone-500 font-mono">({(archive?.testResults.length || 0) + (storedArchetype ? 1 : 0)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RESULTS')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'RESULTS'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>4. Analiz Sonuçları</span>
          <span className="text-[10px] text-stone-500 font-mono">
            ({[
              Boolean(storedChart?.planetaryPositions?.length),
              Boolean(storedNumerology?.lifePathNumber),
              Boolean(storedChakra?.chakras?.length),
              Boolean(storedArchetype?.unifiedArchetype?.primary),
              Boolean(storedEnneagram?.primaryType),
              Boolean(storedTotem?.primaryType),
            ].filter(Boolean).length}/6)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SYMBOLS')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'SYMBOLS'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Shapes className="w-3.5 h-3.5" />
          <span>Semboller</span>
          <span className="text-[10px] text-stone-500 font-mono">({archive?.symbolAnalyses.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DESIGN')}
          className={`px-3.5 py-2 font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DESIGN'
              ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Dövme Tasarımı</span>
          <span className="text-[10px] text-stone-500 font-mono">({archive?.designs.length || 0})</span>
        </button>
      </div>

      {/* 3. SEKME İÇERİKLERİ */}

      {/* SEKME 0: ANALİZ SONUÇLARI MERKEZİ (A28) */}
      {activeTab === 'RESULTS' && (
        <ClientAnalysisResultsHub
          client={client}
          archive={archive}
          onNavigateToTab={(tab) => {
            if (tab === 'EXPORT') {
              setShowExportModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
        />
      )}

      {/* SEKME 1: KİŞİSEL & DOĞUM BİLGİLERİ */}
      {activeTab === 'PERSONAL_BIRTH' && (
        isEditing ? (
          /* Düzenleme Formu */
          <form onSubmit={handleSaveEdit} className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">Danışan Bilgilerini Düzenle</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-white bg-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>

            {editError && (
              <div className="p-3 text-xs bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Ad</label>
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Soyad</label>
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">E-posta</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Doğum Tarihi</label>
                <input
                  type="date"
                  value={editData.birthDate}
                  onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-400">Doğum Saati</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.isBirthTimeUnknown}
                      onChange={(e) => setEditData({ ...editData, isBirthTimeUnknown: e.target.checked })}
                      className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-0 accent-amber-500"
                    />
                    <span>Saat bilinmiyor</span>
                  </label>
                </div>
                <input
                  type="time"
                  value={editData.isBirthTimeUnknown ? '' : editData.birthTime}
                  onChange={(e) => setEditData({ ...editData, birthTime: e.target.value })}
                  disabled={editData.isBirthTimeUnknown}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-stone-400 mb-1">Anne Adı (Ebced)</label>
                <input
                  type="text"
                  value={editData.motherName}
                  onChange={(e) => setEditData({ ...editData, motherName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-stone-400 mb-1">Notlar</label>
                <textarea
                  rows={3}
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-stone-800">
                <label className="block text-stone-400 mb-1.5">Global Doğum Yeri (Harita)</label>
                <GlobalLocationPicker
                  value={editData.birthLocation}
                  onChange={(newLoc) => setEditData({ ...editData, birthLocation: newLoc })}
                />
              </div>
            </div>
          </form>
        ) : (
          /* Görüntüleme Modu */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sol Kolon: Doğum ve Astroloji Konumu */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-stone-200">
                    Doğum & Batı Astroloji Parametreleri
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                    Tropical / Placidus
                  </span>
                  <CopyButton
                    textToCopy={() => formatClientPersonalInfoCopyText(client)}
                    label="Kopyala"
                    variant="outline"
                    size="sm"
                    title="Danışanın kişisel ve doğum bilgilerini panoya kopyalar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                  <span className="text-stone-500 block mb-1">Doğum Tarihi</span>
                  <span className="font-semibold text-stone-200">{client.birthDate}</span>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                  <span className="text-stone-500 block">Doğum Saati Durumu</span>
                  {effectiveBirthTime.isTimeKnown ? (
                    <div>
                      <span className="font-semibold text-stone-200 text-sm">{effectiveBirthTime.rawBirthTime}</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">Kesin Saat Beyanı</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-amber-400 font-medium">Bilinmiyor</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Hesaplama Referansı: <span className="font-mono text-amber-300">12:00 Öğle</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {effectiveBirthTime.isNoonReference && effectiveBirthTime.warningNotice && (
                <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-[11px] text-amber-300/90 leading-relaxed">
                  {effectiveBirthTime.warningNotice}
                </div>
              )}

              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Global Doğum Yeri</span>
                  </span>
                  <span className="text-stone-500 font-mono text-[11px]">{loc?.source || 'HARİTA'}</span>
                </div>

                <div className="text-stone-200 font-medium">
                  {loc?.placeName || (loc?.city ? `${loc.city}, ${loc.country}` : 'Konum Belirtilmedi')}
                </div>

                {!astrologicalCoords.isValid && astrologicalCoords.warningNotice && (
                  <div className="p-2 bg-rose-950/30 border border-rose-900/50 rounded text-[11px] text-rose-300">
                    {astrologicalCoords.warningNotice}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800/60 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">Enlem</span>
                    <span className="font-mono text-stone-300">
                      {astrologicalCoords.isValid && astrologicalCoords.latitude !== null
                        ? `${astrologicalCoords.latitude.toFixed(4)}°`
                        : 'Eksik'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Boylam</span>
                    <span className="font-mono text-stone-300">
                      {astrologicalCoords.isValid && astrologicalCoords.longitude !== null
                        ? `${astrologicalCoords.longitude.toFixed(4)}°`
                        : 'Eksik'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Zaman Dilimi</span>
                    <span className="font-mono text-stone-300 truncate block">{astrologicalCoords.timezone}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">UTC Sapması</span>
                    <span className="font-mono text-amber-400">
                      {astrologicalCoords.isValid
                        ? `UTC${astrologicalCoords.utcOffsetHours >= 0 ? '+' : ''}${astrologicalCoords.utcOffsetHours} saat`
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Genel Kopyala: Doğum ve Harita Parametreleri */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">Doğum & Harita Parametreleri</span>
                  <CopyButton
                    textToCopy={() => formatBirthInfoSectionCopyText(client, archive)}
                    label="Genel Kopyala"
                    variant="outline"
                    size="sm"
                    title="Danışanın doğum bilgilerini ve astroloji temel parametrelerini panoya kopyalar"
                  />
                </div>
              </div>
            </div>

            {/* Sağ Kolon: Ebced ve Danışan Notları */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Ebced & Danışan Notları
                </h3>
              </div>

              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg text-xs">
                <span className="text-stone-500 block mb-1">Anne Adı (Ebced Hesaplama Girdisi)</span>
                <span className="font-semibold text-stone-200 text-sm">{client.motherName}</span>
              </div>

              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg text-xs space-y-1">
                <span className="text-stone-500 block">Danışanın Notları ve Tasarım Beklentisi</span>
                <p className="text-stone-300 leading-relaxed italic">
                  {client.notes ? `"${client.notes}"` : 'Özel bir not belirtilmedi.'}
                </p>
              </div>

              <div className="p-3 bg-stone-950/40 border border-stone-800/60 rounded-lg text-xs text-stone-400 flex items-center justify-between">
                <span>Kayıt Kaynağı:</span>
                <span className="font-mono text-stone-300">
                  {client.source === 'CLIENT_FORM' ? 'Danışan Bilgi Formu' : 'Yönetici Manuel Kaydı'}
                </span>
              </div>

              {/* Genel Kopyala: Danışan Temel Bilgileri */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[10px] text-stone-500">Danışan Temel Bilgileri</span>
                <CopyButton
                  textToCopy={() => formatClientPersonalInfoCopyText(client)}
                  label="Genel Kopyala"
                  variant="outline"
                  size="sm"
                  title="Danışanın kimlik ve iletişim bilgilerini panoya kopyalar"
                />
              </div>
            </div>
          </div>
        )
      )}

      {/* SEKME 2: ANALİZLER (Batı Astroloji Temeli ve Diğer Modüller) */}
      {activeTab === 'ANALYSES' && (
        <div className="space-y-4">
          {/* A28: Sonuçlar Merkezi Hızlı Bağlantısı */}
          <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Tüm analiz ve test sonuçlarını 6 bağımsız kart halinde incelemek için:</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('RESULTS')}
              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-medium transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Sonuçlar Merkezi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* A8: BATI / TROPICAL ASTROLOJİ MODÜL KARTI (10 GÖK CİSMİ GERÇEK HESAPLAMA AKIŞI) */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
            {/* Kart Başlığı ve Durum Rozeti */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">
                    Batı / Tropical Astroloji (10 Gök Cismi Doğum Haritası)
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Tropical zodyak ve VSOP87 analitik gezegen teorisiyle hesaplanan gerçek ekliptik boylamlar.
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border shrink-0 flex items-center gap-1.5 ${
                  astroPrep.status === 'CALCULATED'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : astroPrep.status === 'READY_FOR_CALCULATION'
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {astroPrep.status === 'CALCULATED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Harita Hesaplanmış</span>
                  </>
                ) : astroPrep.status === 'READY_FOR_CALCULATION' ? (
                  <span>Hesaplamaya Hazır</span>
                ) : astroPrep.status === 'MISSING_COORDINATES' ? (
                  <span>Koordinat Eksik (Hesaplanamaz)</span>
                ) : (
                  <span>Doğum Tarihi Eksik</span>
                )}
              </span>
            </div>

            {/* Geri Bildirim Mesajı (Hesaplama Başarı veya Hata) */}
            {calcFeedback && (
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2 border ${
                  calcFeedback.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                }`}
              >
                <span className="shrink-0 font-bold">
                  {calcFeedback.type === 'success' ? '✓' : '⚠️'}
                </span>
                <span>{calcFeedback.message}</span>
              </div>
            )}

            {/* DURUM 1: GERÇEK HESAPLANMIŞ HARİTA VE 10 GÖK CİSMİ TABLOSU */}
            {storedChart && storedChart.planetaryPositions && storedChart.planetaryPositions.length > 0 ? (
              <div className="space-y-4">
                {/* Saat Durumu ve Kapsam Bildirimleri */}
                <div className="space-y-2">
                  {storedChart.isBirthTimeUnknown ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs text-amber-300/90 leading-relaxed flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">⚠️</span>
                      <div>
                        <span className="font-semibold block">Doğum Saati Bilinmiyor (Öğle 12:00 Referansı)</span>
                        <p className="mt-0.5 text-[11px] text-amber-200/80">
                          Gezegen konumları öğle 12:00 varsayımıyla hesaplanmıştır. Doğum saati kesinleşmediği sürece Yükselen burç (ASC), Tepe Noktası (MC) ve evler üretilemez. Ay konumu gün içindeki hızlı hareketinden ötürü saat farkına göre birkaç derece sapma gösterebilir.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-xs text-emerald-300/90 leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <div>
                        <span className="font-semibold block">Kesin Doğum Saatiyle Doğrulandı ({storedChart.birthTime})</span>
                        <p className="mt-0.5 text-[11px] text-emerald-200/80">
                          Gezegen boylamları danışanın beyan ettiği doğum saati ve tarihsel IANA UTC zamanı baz alınarak hesaplanmıştır.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg text-[11px] text-stone-400 leading-relaxed flex items-start gap-2">
                    <span className="text-stone-500 font-bold shrink-0">ℹ</span>
                    <span>
                      <strong className="text-stone-300">Kapsam Sınırı (Mevcut Sürüm):</strong> Yalnızca 10 gök cismi (Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton) boylamları hesaplanmıştır. Kuzey/Güney Ay Düğümleri, ASC, MC ve Placidus evleri bu sürümün kapsamı dışındadır.
                    </span>
                  </div>
                </div>

                {/* Özet Göstergeleri: Güneş ve Ay Burçları */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[10px] uppercase font-mono tracking-wider">Güneş Burcu (☉)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-base">
                        {storedChart.sunSign ? TROPICAL_ZODIAC_SIGNS[storedChart.sunSign]?.symbolGlyph : '☉'}
                      </span>
                      <span className="font-semibold text-stone-100 text-sm">
                        {storedChart.sunSign ? TROPICAL_ZODIAC_SIGNS[storedChart.sunSign]?.nameTr : 'Belirsiz'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 block font-mono">
                      {storedChart.planetaryPositions.find((p) => p.body === 'Sun')?.formattedTextTr || ''}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[10px] uppercase font-mono tracking-wider">Ay Burcu (☽)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-400 text-base">
                        {storedChart.moonSign ? TROPICAL_ZODIAC_SIGNS[storedChart.moonSign]?.symbolGlyph : '☽'}
                      </span>
                      <span className="font-semibold text-stone-100 text-sm">
                        {storedChart.moonSign ? TROPICAL_ZODIAC_SIGNS[storedChart.moonSign]?.nameTr : 'Belirsiz'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 block font-mono">
                      {storedChart.planetaryPositions.find((p) => p.body === 'Moon')?.formattedTextTr || ''}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[10px] uppercase font-mono tracking-wider">Zodyak Sistemi</span>
                    <span className="font-semibold text-stone-200 block">Tropical (Batı)</span>
                    <span className="text-[10px] text-stone-400 block font-mono">True Ecliptic (ECT)</span>
                  </div>

                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[10px] uppercase font-mono tracking-wider">Hesaplama Motoru</span>
                    <span className="font-semibold text-emerald-400 block text-xs">astronomy-engine</span>
                    <span className="text-[10px] text-stone-400 block font-mono">v2.1.19 / VSOP87</span>
                  </div>
                </div>

                {/* 10 Gök Cisminin Detaylı Ekliptik Tablosu */}
                <div className="border border-stone-800 rounded-lg overflow-hidden bg-stone-950/50">
                  <div className="p-3 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>10 Gök Cismi Gerçek Ekliptik Konum Tablosu</span>
                    </h4>
                    <span className="text-[10px] font-mono text-stone-500">
                      Toplam 10 Gök Cismi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-800/70 bg-stone-900/40 text-[11px] text-stone-400 font-mono">
                          <th className="py-2.5 px-3 font-medium">Gök Cismi</th>
                          <th className="py-2.5 px-3 font-medium">Tropical Burç</th>
                          <th className="py-2.5 px-3 font-medium">Burç İçi Konum</th>
                          <th className="py-2.5 px-3 font-medium">Ekliptik Boylamı</th>
                          <th className="py-2.5 px-3 font-medium">Element & Nitelik</th>
                          <th className="py-2.5 px-3 font-medium">Hareket</th>
                          <th className="py-2.5 px-3 font-medium">Saat Durumu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/40">
                        {storedChart.planetaryPositions.map((pos) => {
                          const bodyMeta = CELESTIAL_BODIES_TR[pos.body] || { nameTr: pos.body, glyph: '' };
                          const signMeta = TROPICAL_ZODIAC_SIGNS[pos.sign];

                          return (
                            <tr key={pos.body} className="hover:bg-stone-800/20 transition-colors">
                              {/* Gök Cismi */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-400 font-mono text-base w-4 text-center">
                                    {bodyMeta.glyph}
                                  </span>
                                  <span className="font-semibold text-stone-200">
                                    {bodyMeta.nameTr}
                                  </span>
                                </div>
                              </td>

                              {/* Tropical Burç */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-stone-300 font-mono">
                                    {signMeta?.symbolGlyph}
                                  </span>
                                  <span className="text-stone-200 font-medium">
                                    {signMeta?.nameTr || pos.sign}
                                  </span>
                                </div>
                              </td>

                              {/* Burç İçi Konum */}
                              <td className="py-2.5 px-3 font-mono text-stone-200 font-medium">
                                {pos.degree}° {signMeta?.nameTr} {pos.minute}'{' '}
                                {pos.second !== undefined ? (
                                  <span className="text-stone-500 text-[10px]">{pos.second}"</span>
                                ) : null}
                              </td>

                              {/* Ekliptik Boylamı */}
                              <td className="py-2.5 px-3 font-mono text-stone-400 text-[11px]">
                                {pos.eclipticLongitude !== undefined
                                  ? `${pos.eclipticLongitude.toFixed(4)}°`
                                  : '-'}
                              </td>

                              {/* Element & Nitelik */}
                              <td className="py-2.5 px-3 text-[11px] text-stone-400">
                                {signMeta ? (
                                  <span>
                                    <span
                                      className={
                                        signMeta.element === 'FIRE'
                                          ? 'text-rose-400'
                                          : signMeta.element === 'EARTH'
                                          ? 'text-amber-400'
                                          : signMeta.element === 'AIR'
                                          ? 'text-sky-400'
                                          : 'text-blue-400'
                                      }
                                    >
                                      {signMeta.elementNameTr}
                                    </span>
                                    <span className="text-stone-600 mx-1">/</span>
                                    <span>{signMeta.modalityNameTr}</span>
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>

                              {/* Hareket (Retrograd) */}
                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                {pos.isRetrograde ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-900/50 text-rose-300 text-[10px]">
                                    Geri (Rx)
                                  </span>
                                ) : (
                                  <span className="text-stone-400 text-[10px]">Direkt</span>
                                )}
                              </td>

                              {/* Saat Hassasiyeti */}
                              <td className="py-2.5 px-3 text-[10px]">
                                {storedChart.isBirthTimeUnknown ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/40">
                                    12:00 Öğle Ref
                                    {pos.body === 'Moon' ? ' (±6°)' : ''}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-mono">
                                    {storedChart.birthTime}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Aksiyon Butonları (Yeniden Hesapla / Sıfırla) */}
                <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-stone-400">
                    Hesaplama Zamanı: <span className="font-mono text-stone-300">{client.updatedAt.substring(0, 19).replace('T', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAstrologyCalculation}
                      className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs rounded-lg transition-colors border border-stone-800 cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hesaplamayı Sıfırla</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRunAstrologyCalculation}
                      disabled={calcLoading}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${calcLoading ? 'animate-spin' : ''}`} />
                      <span>{calcLoading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DURUM 2: HENÜZ HESAPLANMAMIŞ — HAZIRLIK KARTI VE HESAPLAMA BUTONU */
              <div className="space-y-4">
                {/* Durum Mesajı ve Uyarılar */}
                <div className="space-y-2">
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg text-xs flex items-start gap-2.5">
                    <span className="text-amber-400 shrink-0 font-bold">ℹ</span>
                    <p className="text-stone-300 leading-relaxed text-[11px]">
                      {astroPrep.statusMessageTr}
                    </p>
                  </div>

                  {astroPrep.warningNotices.map((notice, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-amber-400 shrink-0">⚠️</span>
                      <span>{notice}</span>
                    </div>
                  ))}
                </div>

                {/* Ortak Veriden Çekilen Astrolojik Temel Parametreler */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Zodyak & Ev Sistemi</span>
                    <span className="font-semibold text-stone-200 block">Tropical (Batı)</span>
                    <span className="text-[10px] text-stone-400 block font-mono">Placidus Evleri (Kapsam Dışı)</span>
                  </div>

                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Doğum Tarihi & Saati</span>
                    <span className="font-semibold text-stone-200 block">{astroPrep.birthDate || 'Belirtilmedi'}</span>
                    <span className="text-[10px] text-stone-400 block font-mono">
                      {astroPrep.isBirthTimeKnown
                        ? `Saat: ${astroPrep.calculationTimeString}`
                        : 'Bilinmiyor (Öğle 12:00 Referansı)'}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Koordinat Güvenliği</span>
                    {astroPrep.hasValidCoordinates ? (
                      <>
                        <span className="font-semibold text-stone-200 block font-mono">
                          {astroPrep.latitude?.toFixed(4)}°, {astroPrep.longitude?.toFixed(4)}°
                        </span>
                        <span className="text-[10px] text-emerald-400 block">Doğrulanmış Konum</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-rose-300 block">Koordinat Yok</span>
                        <span className="text-[10px] text-rose-400 block">Hesaplama Engellendi</span>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Yükselen / Evler İzni</span>
                    <span className="font-semibold block text-stone-400">
                      Mevcut Sürümde Yok
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      Yalnızca 10 gezegen boylamı
                    </span>
                  </div>
                </div>

                {/* A7: Gerçek Astronomik Hesaplama Motoru Teknik Temeli Durumu */}
                <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-800/60 pb-2">
                    <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Astronomik Hesaplama Altyapısı (astronomy-engine v2.1.19)</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
                      {astroPrep.astronomyEngineReady ? 'Motor Hazır (MIT)' : 'Doğrulama Bekliyor'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-400">
                    <div>
                      <span className="text-stone-500 block text-[10px]">Gezegen Teorisi & Lisans</span>
                      <span className="text-stone-200 font-mono text-[11px]">
                        VSOP87 / IAU 2006 ({astroPrep.astronomyEngineLicense || 'MIT'})
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-500 block text-[10px]">Tarihsel UTC Dönüşümü</span>
                      <span className="text-stone-200 font-mono text-[11px] truncate block">
                        {astroPrep.historicalUtcIso ? `${astroPrep.historicalUtcIso.replace('T', ' ').substring(0, 19)}Z` : 'Koordinat/Tarih Gerekli'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-500 block text-[10px]">Çevrimdışı Çalışma & Yıldız Zamanı</span>
                      <span className="text-amber-400/90 font-mono text-[11px]">
                        {astroPrep.lastDegrees !== undefined ? `RAMC: ${astroPrep.lastDegrees}° (Yerel)` : '%100 Yerel / Çevrimdışı'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hesaplama Aksiyon Alanı */}
                <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      A8: 10 Gök Cisim Boylamını Hesapla
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün ve Plüton konumları hesaplanıp danışan arşivine kaydedilecektir.
                    </span>
                  </div>

                  {astroPrep.status === 'READY_FOR_CALCULATION' ? (
                    <button
                      type="button"
                      onClick={handleRunAstrologyCalculation}
                      disabled={calcLoading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${calcLoading ? 'animate-spin' : ''}`} />
                      <span>{calcLoading ? 'Hesaplanıyor...' : '10 Gök Cismini Hesapla'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-stone-800/80 text-stone-500 font-semibold text-xs rounded-lg cursor-not-allowed shrink-0 border border-stone-700/50"
                    >
                      Eksik Girdi (Hesaplama Yapılamaz)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* A12: NUMEROLOJİ MATRİSİ MODÜL KARTI (PİSAGOR SİSTEMİ) */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
            {/* Kart Başlığı ve Durum Rozeti */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <Hash className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">
                    Numeroloji Matrisi (Pisagor Sistemi)
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Ad-soyad ve doğum tarihi titreşimlerinden hesaplanan 5 temel sayı, üstat sayılar ve karmik dersler.
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border shrink-0 flex items-center gap-1.5 ${
                  storedNumerology
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : numPrep.status === 'READY_TO_RUN'
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {storedNumerology ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Numeroloji Hesaplanmış</span>
                  </>
                ) : numPrep.status === 'READY_TO_RUN' ? (
                  <span>Hesaplamaya Hazır</span>
                ) : (
                  <span>Girdi Eksik</span>
                )}
              </span>
            </div>

            {/* Geri Bildirim Bildirimi */}
            {numFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                  numFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <span>{numFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setNumFeedback(null)}
                  className="text-stone-400 hover:text-stone-200 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {storedNumerology ? (
              /* DURUM 1: HESAPLANMIŞ SONUÇLARIN GÖSTERİMİ */
              <div className="space-y-4">
                {/* 5 Ana Çıktı Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* 1. Yaşam Yolu */}
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Yaşam Yolu</span>
                      {storedNumerology.masterNumbers.includes(storedNumerology.lifePathNumber) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">Üstat</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold font-mono text-amber-300">
                        {storedNumerology.lifePathNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate">
                        {NUMBER_RESONANCE_TABLE[storedNumerology.lifePathNumber]?.titleTr || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">Doğum tarihinden</span>
                  </div>

                  {/* 2. Kader / İfade */}
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Kader / İfade</span>
                      {storedNumerology.masterNumbers.includes(storedNumerology.destinyNumber) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">Üstat</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold font-mono text-stone-100">
                        {storedNumerology.destinyNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate">
                        {NUMBER_RESONANCE_TABLE[storedNumerology.destinyNumber]?.titleTr || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">Tam addan</span>
                  </div>

                  {/* 3. Ruh Arzusu */}
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Ruh Arzusu</span>
                      {storedNumerology.masterNumbers.includes(storedNumerology.soulUrgeNumber) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">Üstat</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold font-mono text-stone-100">
                        {storedNumerology.soulUrgeNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate">
                        {NUMBER_RESONANCE_TABLE[storedNumerology.soulUrgeNumber]?.titleTr || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">Sesli harflerden</span>
                  </div>

                  {/* 4. Kişilik */}
                  <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Kişilik</span>
                      {storedNumerology.masterNumbers.includes(storedNumerology.personalityNumber) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">Üstat</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold font-mono text-stone-100">
                        {storedNumerology.personalityNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate">
                        {NUMBER_RESONANCE_TABLE[storedNumerology.personalityNumber]?.titleTr || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">Sessiz harflerden</span>
                  </div>

                  {/* 5. Dünya Misyonu */}
                  <div className="p-3 bg-stone-950/70 border border-amber-900/40 rounded-xl space-y-1 relative overflow-hidden bg-amber-950/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Dünya Misyonu</span>
                      {storedNumerology.masterNumbers.includes(storedNumerology.worldMissionNumber) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">Üstat</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold font-mono text-amber-400">
                        {storedNumerology.worldMissionNumber}
                      </span>
                      <span className="text-[10px] text-stone-300 truncate">
                        {NUMBER_RESONANCE_TABLE[storedNumerology.worldMissionNumber]?.titleTr || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">Yaşam Yolu + Kader</span>
                  </div>
                </div>

                {/* Ek Katmanlar: Doğum Günü, Üstat Sayılar, Karmik Dersler ve Dövme Köprüleri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Doğum Günü ve Üstat Sayılar */}
                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-800/60 pb-1.5">
                      <span className="text-stone-400 text-[11px] font-semibold">Doğum Günü Sayısı</span>
                      <span className="font-mono text-amber-300 font-bold">{storedNumerology.birthdayNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 text-[11px] font-semibold">Üstat Sayılar</span>
                      <span className="font-mono text-stone-200">
                        {storedNumerology.masterNumbers.length > 0
                          ? storedNumerology.masterNumbers.join(', ')
                          : 'Tespit Edilmedi'}
                      </span>
                    </div>
                  </div>

                  {/* Karmik Dersler */}
                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1.5">
                    <span className="text-stone-400 text-[11px] font-semibold block">
                      Karmik Dersler (İsimde Eksik Sayılar)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {storedNumerology.karmicLessons.length > 0 ? (
                        storedNumerology.karmicLessons.map((num) => (
                          <span
                            key={num}
                            className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-900/50 text-rose-300 font-mono text-[10px]"
                          >
                            Sayı {num} ({NUMBER_RESONANCE_TABLE[num]?.keywordTr.split(',')[0]})
                          </span>
                        ))
                      ) : (
                        <span className="text-stone-500 text-[11px]">Eksik sayı yok (Tüm titreşimler mevcut)</span>
                      )}
                    </div>
                  </div>

                  {/* Çakra ve Dövme Köprü Verisi */}
                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-400 text-[11px] font-semibold block">
                      Dövme Reçetesi & Çakra Rezonansı
                    </span>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {NUMBER_RESONANCE_TABLE[storedNumerology.lifePathNumber]?.tattooSymbolTheme || 'Geometrik denge motifleri.'}
                    </p>
                  </div>
                </div>

                {/* Alt Aksiyonlar: Yeniden Hesapla ve Sıfırla */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sonuçlar {client.firstName} {client.lastName} ({client.id}) arşivinde kayıtlıdır.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearNumerologyCalculation}
                      className="px-3 py-1.5 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={handleRunNumerologyCalculation}
                      disabled={numCalcLoading}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${numCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{numCalcLoading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DURUM 2: HENÜZ HESAPLANMAMIŞ — HAZIRLIK VE HESAPLA BUTONU */
              <div className="space-y-4">
                <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg text-xs flex items-start gap-2.5">
                  <span className="text-amber-400 shrink-0 font-bold">ℹ</span>
                  <p className="text-stone-300 leading-relaxed text-[11px]">
                    {numPrep.statusMessageTr}
                  </p>
                </div>

                {numPrep.warningNotices.map((notice, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-amber-400 shrink-0">⚠️</span>
                    <span>{notice}</span>
                  </div>
                ))}

                {/* Girdi Önizlemesi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Ad & Soyad (Kader/Ruh/Kişilik Girdisi)</span>
                    <span className="font-semibold text-stone-200 block font-mono">
                      {numPrep.fullName || 'Eksik'}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Türkçe karakterler (Ç, Ğ, I, İ, Ö, Ş, Ü) standart Pisagor tablosuna normalize edilir.
                    </span>
                  </div>

                  <div className="p-3 bg-stone-950/50 border border-stone-800/60 rounded-lg space-y-1">
                    <span className="text-stone-500 block text-[11px]">Doğum Tarihi (Yaşam Yolu Girdisi)</span>
                    <span className="font-semibold text-stone-200 block font-mono">
                      {numPrep.birthDate || 'Eksik'}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Gün, ay ve yıl bağımsız indirgenerek üstat sayılar korunur.
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      A12: Numeroloji Matrisini Hesapla
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      Yaşam Yolu, İfade/Kader, Ruh Arzusu, Kişilik ve Dünya Misyonu sayıları üretilecektir.
                    </span>
                  </div>

                  {numPrep.status === 'READY_TO_RUN' ? (
                    <button
                      type="button"
                      onClick={handleRunNumerologyCalculation}
                      disabled={numCalcLoading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${numCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{numCalcLoading ? 'Hesaplanıyor...' : 'Numeroloji Matrisini Hesapla'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-stone-800/80 text-stone-500 font-semibold text-xs rounded-lg cursor-not-allowed shrink-0 border border-stone-700/50"
                    >
                      Eksik Girdi (Hesaplama Yapılamaz)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Kart Sonu Aksiyonu: Genel Kopyala */}
            <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[10px] text-stone-500">Pisagor Numeroloji Matrisi</span>
              <CopyButton
                textToCopy={() => formatNumerologySectionCopyText(client, archive)}
                label="Genel Kopyala"
                variant="outline"
                size="sm"
                title="Numeroloji analizini panoya kopyalar"
              />
            </div>
          </div>

          {/* A13: ÇAKRA ANALİZİ MODÜLÜ */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">
                      3. Çakra Analizi & Enerji Dengesi
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/80 border border-violet-800/80 text-violet-300">
                      Aşama 9 (A13)
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    7 Temel Çakranın Rezonansı, Blokaj Tespiti ve Dövme Güçlendirici Sembolizmi
                  </p>
                </div>
              </div>

              {/* Durum Rozeti */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {storedChakra ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Çakra Dengesi Belirlenmiş</span>
                  </span>
                ) : chakraPrep.status === 'READY_TO_RUN' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Hesaplamaya Hazır (Aşama 9)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-500" />
                    <span>Numeroloji Matrisi Gerekli</span>
                  </span>
                )}
              </div>
            </div>

            {/* Çakra Geri Bildirim Bildirimi */}
            {chakraFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                  chakraFeedback.type === 'error'
                    ? 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {chakraFeedback.type === 'error' ? (
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{chakraFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChakraFeedback(null)}
                  className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Kayıtlı Çakra Analiz Sonucu */}
            {storedChakra ? (
              <div className="space-y-4">
                {/* Üst Özet: Baskın Çakra ve Öncelikli Destek / Blokaj Çakrası */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Baskın Çakra */}
                  {storedChakra.dominantChakra && (
                    <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                          Baskın Akış Merkezi (Dominant)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950 border border-cyan-800 text-cyan-300">
                          Açık · Skor: {storedChakra.chakras.find((c) => c.chakra === storedChakra.dominantChakra)?.score}/10
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: CHAKRA_DEFINITIONS[storedChakra.dominantChakra].colorHex }}
                        />
                        <span className="text-sm font-semibold text-stone-100">
                          {CHAKRA_DEFINITIONS[storedChakra.dominantChakra].nameTr} ({CHAKRA_DEFINITIONS[storedChakra.dominantChakra].sanskritName})
                        </span>
                        <span className="text-xs text-stone-400 font-mono">
                          · {CHAKRA_DEFINITIONS[storedChakra.dominantChakra].elementTr}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {CHAKRA_DEFINITIONS[storedChakra.dominantChakra].balancedTraitsTr}
                      </p>
                    </div>
                  )}

                  {/* Destek İhtiyacı / Blokaj */}
                  {storedChakra.primaryDeficit ? (
                    <div className="p-3.5 bg-rose-950/30 border border-rose-800/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-rose-400 font-semibold uppercase tracking-wider">
                          Öncelikli Destek / Blokaj (Deficit)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950 border border-rose-800 text-rose-300">
                          {CHAKRA_STATUS_CONFIG[storedChakra.chakras.find((c) => c.chakra === storedChakra.primaryDeficit)?.status || 'UNDERACTIVE'].labelTr} · Skor: {storedChakra.chakras.find((c) => c.chakra === storedChakra.primaryDeficit)?.score}/10
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: CHAKRA_DEFINITIONS[storedChakra.primaryDeficit].colorHex }}
                        />
                        <span className="text-sm font-semibold text-stone-100">
                          {CHAKRA_DEFINITIONS[storedChakra.primaryDeficit].nameTr} ({CHAKRA_DEFINITIONS[storedChakra.primaryDeficit].sanskritName})
                        </span>
                        <span className="text-xs text-stone-400 font-mono">
                          · {CHAKRA_DEFINITIONS[storedChakra.primaryDeficit].elementTr}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {CHAKRA_DEFINITIONS[storedChakra.primaryDeficit].imbalanceTraitsTr}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2 flex flex-col justify-center">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                          Denge Durumu
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 border border-emerald-800 text-emerald-300">
                          Tüm Merkezler Uyumlu
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        Tüm çakra merkezleri dengeli eşik değerlerinde titreşmektedir. Dövme kompozisyonunda simetrik koruyucu motifler önerilir.
                      </p>
                    </div>
                  )}
                </div>

                {/* 7 Temel Çakranın Kartları */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-stone-400 font-medium px-1">
                    <span>7 Temel Çakra Enerji Akış Hiyerarşisi</span>
                    <span className="font-mono text-[10px] text-stone-500">1 (Kök) → 7 (Tepe)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {CHAKRA_ORDER.map((chakraName) => {
                      const def = CHAKRA_DEFINITIONS[chakraName];
                      const state = storedChakra.chakras.find((c) => c.chakra === chakraName);
                      if (!state) return null;
                      const statusConf = CHAKRA_STATUS_CONFIG[state.status];

                      return (
                        <div
                          key={chakraName}
                          className="p-3 bg-stone-950/60 border border-stone-800/70 rounded-lg flex flex-col gap-2 hover:border-stone-700/80 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-stone-950 shrink-0 shadow-sm"
                                style={{ backgroundColor: def.colorHex }}
                              >
                                {def.order}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-stone-100">
                                    {def.nameTr}
                                  </span>
                                  <span className="text-[11px] text-stone-400 font-serif italic">
                                    ({def.sanskritName})
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    · {def.elementTr}
                                  </span>
                                </div>
                                <span className="text-[10px] text-stone-400 block">
                                  Numeroloji Titreşimi: {def.associatedNumbers.join(', ')} · Bölge: {def.bodyRegionTr}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${statusConf.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
                                <span>{statusConf.labelTr}</span>
                              </span>
                              <span className="text-xs font-mono font-semibold text-stone-300 w-10 text-right">
                                {state.score}/10
                              </span>
                            </div>
                          </div>

                          {/* Skor İlerleme Çubuğu */}
                          <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${state.score * 10}%`,
                                backgroundColor: def.colorHex,
                              }}
                            />
                          </div>

                          {/* Dövme Reçetesi & Sembolizm Odakları */}
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono text-stone-500">Dövme Sembolizmi:</span>
                            {state.focusRecommendations.map((rec, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-stone-300"
                              >
                                {rec}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alt Aksiyonlar: Yeniden Hesapla ve Sıfırla */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Çakra sonuçları {client.firstName} {client.lastName} ({client.id}) arşivinde kayıtlıdır.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearChakraCalculation}
                      className="px-3 py-1.5 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={handleRunChakraCalculation}
                      disabled={chakraCalcLoading}
                      className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${chakraCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{chakraCalcLoading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Henüz Hesaplanmamış Durum */
              <div className="space-y-4">
                <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-stone-200">
                      Çakra Analizi Hazırlığı & Numerolojik Rezonans
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {chakraPrep.statusMessageTr}
                  </p>
                  {chakraPrep.warningNotices.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {chakraPrep.warningNotices.map((warn, i) => (
                        <div key={i} className="text-[11px] text-amber-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      A13: Çakra Dengesini Hesapla
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      Numeroloji çıktılarından 7 çakranın enerji seviyeleri, blokajları ve dövme reçetesi üretilecektir.
                    </span>
                  </div>

                  {chakraPrep.status === 'READY_TO_RUN' ? (
                    <button
                      type="button"
                      onClick={handleRunChakraCalculation}
                      disabled={chakraCalcLoading}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${chakraCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{chakraCalcLoading ? 'Hesaplanıyor...' : 'Çakra Dengesini Hesapla'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-stone-800/80 text-stone-500 font-semibold text-xs rounded-lg cursor-not-allowed shrink-0 border border-stone-700/50"
                    >
                      Numeroloji Gerekli (Hesaplama Yapılamaz)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Kart Sonu Aksiyonu: Genel Kopyala */}
            <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[10px] text-stone-500">7 Temel Çakra Enerji Dengesi</span>
              <CopyButton
                textToCopy={() => formatChakraSectionCopyText(client, archive)}
                label="Genel Kopyala"
                variant="outline"
                size="sm"
                title="7 Temel Çakra analizini panoya kopyalar"
              />
            </div>
          </div>

          {/* Diğer Modüller (Dokunulmamış Bekleme Durumu) */}
          <div className="bg-stone-900/30 border border-stone-800/60 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">Diğer Analiz Modülleri</span>
              <span className="text-[10px] font-mono text-stone-500">Sonraki Aşamalar</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[11px]">
              {['Ebced Hesabı'].map((item) => (
                <div key={item} className="p-2.5 bg-stone-950/60 border border-stone-800/60 rounded text-stone-400 flex justify-between items-center">
                  <span>{item}</span>
                  <span className="text-stone-600 font-mono text-[10px]">Beklemede</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: PSİKOLOJİ & ARKETİPLER */}
      {activeTab === 'TESTS' && (
        <div className="space-y-6">
          {/* A28: Sonuçlar Merkezi Hızlı Bağlantısı */}
          <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Arketip, Enneagram ve Totem sonuçlarını tüm modüllerle birlikte görmek için:</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('RESULTS')}
              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-medium transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Sonuçlar Merkezi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* A14: BİRLEŞİK & GÖLGE ARKETİP MODÜLÜ */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">
                      1. Birleşik & Gölge Arketip Çözümlemesi
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300">
                      Aşama 10 (A14)
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Bilinçli Yaşam Rotası, Gölge Dinamikleri ve Dönüştürücü Dövme Sembolizmi
                  </p>
                </div>
              </div>

              {/* Durum Rozeti */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {storedArchetype ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Arketip Dinamikleri Tanımlanmış</span>
                  </span>
                ) : archPrep.status === 'READY_TO_RUN' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Hesaplamaya Hazır (Aşama 10)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-500" />
                    <span>Numeroloji & Çakra Gerekli</span>
                  </span>
                )}
              </div>
            </div>

            {/* Arketip Geri Bildirim Bildirimi */}
            {archFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                  archFeedback.type === 'error'
                    ? 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {archFeedback.type === 'error' ? (
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{archFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setArchFeedback(null)}
                  className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Kayıtlı Arketip Çözümlemesi */}
            {storedArchetype ? (
              <div className="space-y-4">
                {/* Girdi İzlence Çubuğu */}
                <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                  <span className="font-mono text-amber-400/90 font-semibold">Girdi Katmanları:</span>
                  <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                    Yaşam Yolu: {storedNumerology?.lifePathNumber || '-'} ({storedArchetype.unifiedArchetype.primary})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                    Kader / İfade: {storedNumerology?.destinyNumber || '-'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                    Baskın Çakra: {storedChakra?.dominantChakra || 'Dengeli'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                    Destek / Blokaj: {storedChakra?.primaryDeficit || 'Dengeli'}
                  </span>
                  {archPrep.hasEnneagram && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
                      Enneagram Entegre
                    </span>
                  )}
                </div>

                {/* 2 Ana Panel: Birleşik Arketip ve Gölge Arketip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Panel 1: Birleşik Arketip (Unified Archetype) */}
                  <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-900/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                          Birleşik Arketip
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950 border border-amber-800 text-amber-300">
                        Işık Tezahürü
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-base font-serif font-semibold text-stone-100 flex items-center gap-2">
                        <span>{storedArchetype.unifiedArchetype.primary}</span>
                      </div>
                      <div className="text-xs text-amber-400 font-mono">
                        İkincil / Tamamlayıcı: {storedArchetype.unifiedArchetype.secondary}
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/50 p-3 rounded-lg border border-stone-800/60">
                      {storedArchetype.unifiedArchetype.description}
                    </p>

                    {ARCHETYPE_DEFINITIONS[storedArchetype.unifiedArchetype.primary] && (
                      <div className="space-y-1.5 text-[11px] pt-1">
                        <div className="text-stone-400">
                          <span className="text-stone-500 font-semibold">Temel Yaşam Motifi: </span>
                          <span>{ARCHETYPE_DEFINITIONS[storedArchetype.unifiedArchetype.primary].coreMotiveTr}</span>
                        </div>
                        <div className="text-stone-400">
                          <span className="text-stone-500 font-semibold">Dövme Estetik Hatları: </span>
                          <span>{ARCHETYPE_DEFINITIONS[storedArchetype.unifiedArchetype.primary].tattooAestheticTr}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel 2: Gölge Arketip & Dönüşüm (Shadow Archetype) */}
                  <div className="p-4 bg-purple-950/20 border border-purple-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-900/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono">
                          Gölge Arketip & Dönüşüm
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950 border border-purple-800 text-purple-300">
                        Dönüştürülecek Güç
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-base font-serif font-semibold text-stone-100 flex items-center gap-2">
                        <span>{storedArchetype.shadowArchetype.shadowName}</span>
                      </div>
                      <span className="text-[11px] text-stone-400 block">
                        {storedChakra?.primaryDeficit
                          ? `Köken: ${storedChakra.primaryDeficit} çakra rezonansındaki enerji ihtiyacı ve karmik ders.`
                          : 'Köken: Ana arketipin aşırı uçtaki gölge eğilimi.'}
                      </span>
                    </div>

                    {/* Dönüştürücü Dövme Sembolü */}
                    <div className="p-3 bg-stone-950/70 border border-amber-900/50 rounded-lg space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dönüştürücü Dövme Sembolü (Transformational Symbol)</span>
                      </div>
                      <p className="text-xs text-stone-200 leading-relaxed font-medium">
                        {storedArchetype.shadowArchetype.transformationalSymbol}
                      </p>
                      <span className="text-[10px] text-stone-400 block pt-0.5">
                        Dövme kompozisyonunda bu sembol merkezlenerek gölge dinamik yüksek bilgelikle entegre edilir.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alt Aksiyonlar: Yeniden Hesapla ve Sıfırla */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Arketip sonuçları {client.firstName} {client.lastName} ({client.id}) arşivinde kayıtlıdır.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearArchetypeCalculation}
                      className="px-3 py-1.5 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={handleRunArchetypeCalculation}
                      disabled={archCalcLoading}
                      className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${archCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{archCalcLoading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Henüz Hesaplanmamış Durum */
              <div className="space-y-4">
                <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-stone-200">
                      Arketip Çözümlemesi Hazırlığı
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {archPrep.statusMessageTr}
                  </p>
                  {archPrep.warningNotices.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {archPrep.warningNotices.map((warn, i) => (
                        <div key={i} className="text-[11px] text-amber-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      A14: Birleşik ve Gölge Arketip Çözümlemesini Hesapla
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      Numeroloji ve Çakra katmanlarından ana/ikincil arketip ve dönüştürücü dövme sembolü üretilecektir.
                    </span>
                  </div>

                  {archPrep.status === 'READY_TO_RUN' ? (
                    <button
                      type="button"
                      onClick={handleRunArchetypeCalculation}
                      disabled={archCalcLoading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${archCalcLoading ? 'animate-spin' : ''}`} />
                      <span>{archCalcLoading ? 'Hesaplanıyor...' : 'Arketip Çözümlemesini Hesapla'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-stone-800/80 text-stone-500 font-semibold text-xs rounded-lg cursor-not-allowed shrink-0 border border-stone-700/50"
                    >
                      Girdiler Eksik (Hesaplama Yapılamaz)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Kart Sonu Aksiyonu: Genel Kopyala */}
            <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[10px] text-stone-500">Birleşik & Gölge Arketip Dinamiği</span>
              <CopyButton
                textToCopy={() => formatArchetypeSectionCopyText(client, archive)}
                label="Genel Kopyala"
                variant="outline"
                size="sm"
                title="Birleşik ve Gölge Arketip analizini panoya kopyalar"
              />
            </div>
          </div>

          {/* 2. Testler Bölümü (A18: Enneagram & Hayvan Totemi) */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">
                      2. Kişilik & Ruh Hayvanı Totemi Testleri
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/80 text-indigo-300">
                      Aşama 11 (A18)
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Danışanın mizaç dinamikleri (Enneagram) ve sezgisel rehber arketipleri (Ruh Hayvanı)
                  </p>
                </div>
              </div>

              {/* Genel Durum Rozetleri */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {storedEnneagram ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Enneagram V{storedEnneagram.version}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-400 border border-stone-700">
                    Enneagram Beklemede
                  </span>
                )}

                {storedTotem ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Totem V{storedTotem.version}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-400 border border-stone-700">
                    Totem Beklemede
                  </span>
                )}
              </div>
            </div>

            {/* Test Alt Sekmeleri (Sub-tab bar) */}
            <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTestSubTab('ENNEAGRAM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTestSubTab === 'ENNEAGRAM'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Enneagram Mizaç Testi (15 Soru)</span>
                {storedEnneagram && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTestSubTab('ANIMAL_TOTEM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTestSubTab === 'ANIMAL_TOTEM'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Ruh Hayvanı Totemi Testi (10 Soru)</span>
                {storedTotem && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {/* SUBTAB 1: ENNEAGRAM */}
            {activeTestSubTab === 'ENNEAGRAM' && (
              <div className="space-y-4">
                {/* Geri Bildirim */}
                {enneagramFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                      enneagramFeedback.type === 'error'
                        ? 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {enneagramFeedback.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{enneagramFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnneagramFeedback(null)}
                      className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Eğer Test Tamamlanmışsa ve Çözüm modunda değilse: Sonuç Kartı */}
                {storedEnneagram && !isEnneagramTaking ? (
                  <div className="space-y-4">
                    {/* Başlık ve Sonuç Özeti */}
                    <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
                              Birincil Mizaç Tipi
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300">
                              Versiyon {storedEnneagram.version}
                            </span>
                          </div>
                          <h4 className="text-lg font-serif font-semibold text-stone-100 mt-1">
                            {storedEnneagram.primaryType}
                          </h4>
                          {storedEnneagram.secondaryType && (
                            <p className="text-xs text-amber-300 font-mono mt-0.5">
                              {storedEnneagram.secondaryType}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 font-mono block">
                            Tamamlanma Tarihi
                          </span>
                          <span className="text-xs text-stone-300 font-mono">
                            {new Date(storedEnneagram.completedAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Yorumlar Listesi */}
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-stone-300 block">
                          Mizaç ve Psikolojik Çözümleme:
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {storedEnneagram.interpretations.map((text, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-stone-900/60 border border-stone-800 rounded-lg text-xs text-stone-300 leading-relaxed flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span>{text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 9 Tip Skor Dağılımı */}
                      <div className="pt-3 border-t border-stone-800/80 space-y-2">
                        <span className="text-xs font-semibold text-stone-300 block">
                          Mizaç Eğilimi Puan Dağılımı (1-9):
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-center">
                          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                            const score = storedEnneagram.dominantScores[`Tip ${num}`] || 0;
                            const isPrimary = storedEnneagram.primaryType.includes(`Tip ${num}`);
                            const isWing = storedEnneagram.secondaryType?.includes(`Kanat ${num}`);
                            return (
                              <div
                                key={num}
                                className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                  isPrimary
                                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm'
                                    : isWing
                                    ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                                    : 'bg-stone-900/50 border-stone-800/80 text-stone-400'
                                }`}
                              >
                                <span className="text-[10px] font-mono text-stone-400">Tip {num}</span>
                                <span className="text-xs font-bold font-mono mt-0.5">{score}p</span>
                                {isPrimary && (
                                  <span className="text-[9px] text-amber-400 font-semibold mt-0.5">Baskın</span>
                                )}
                                {isWing && (
                                  <span className="text-[9px] text-blue-400 font-semibold mt-0.5">Kanat</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Alt Aksiyonlar: Yeniden Yap ve Sıfırla */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enneagram sonucu {client.firstName} {client.lastName} ({client.id}) arşivinde kayıtlıdır.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {showClearEnneagramConfirm ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/60 p-1 rounded-lg">
                            <span className="text-[10px] text-rose-300">Enneagram sıfırlansın mı?</span>
                            <button
                              type="button"
                              onClick={handleResetEnneagram}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Evet
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowClearEnneagramConfirm(false)}
                              className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] cursor-pointer"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowClearEnneagramConfirm(true)}
                            className="px-3 py-1.5 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Testi Sıfırla
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleStartEnneagram}
                          className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Yeniden Test Yap</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Test Çözme Alanı (Soru Akışı) */
                  <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-4">
                    {/* Soru İlerlemesi ve Hızlı Atlama Çubuğu */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-200">
                          Soru {enneagramActiveQIndex + 1} / 15
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
                          <span>{Object.keys(enneagramAnswers).length} / 15 Cevaplandı</span>
                          <span className="text-amber-400 font-bold">
                            (%{Math.round((Object.keys(enneagramAnswers).length / 15) * 100)})
                          </span>
                        </div>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${(Object.keys(enneagramAnswers).length / 15) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Soru Hızlı Atlama Numaraları */}
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {ENNEAGRAM_QUESTIONS.map((q, idx) => {
                          const isAnswered = Boolean(enneagramAnswers[q.id]);
                          const isCurrent = idx === enneagramActiveQIndex;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setEnneagramActiveQIndex(idx)}
                              className={`w-6 h-6 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                isCurrent
                                  ? 'bg-amber-500 text-stone-950 font-bold ring-2 ring-amber-400/50'
                                  : isAnswered
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Aktif Soru İçeriği */}
                    {(() => {
                      const currentQ = ENNEAGRAM_QUESTIONS[enneagramActiveQIndex];
                      const selectedOptionId = enneagramAnswers[currentQ.id];
                      return (
                        <div className="p-4 bg-stone-900/40 border border-stone-800/80 rounded-xl space-y-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-amber-300 border border-stone-700 inline-block">
                              {currentQ.categoryTr || 'Mizaç Sorusu'}
                            </span>
                            <h4 className="text-sm font-medium text-stone-100 leading-snug pt-1">
                              {currentQ.order}. {currentQ.questionTr}
                            </h4>
                          </div>

                          {/* 4 Şık */}
                          <div className="grid grid-cols-1 gap-2">
                            {currentQ.options.map((opt) => {
                              const isSelected = selectedOptionId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSelectEnneagramAnswer(currentQ.id, opt.id)}
                                  className={`p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-100 shadow-sm'
                                      : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700 text-stone-300'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-amber-400 bg-amber-400'
                                        : 'border-stone-600'
                                    }`}
                                  >
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                                  </div>
                                  <span className="leading-relaxed">{opt.textTr}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Gezinme ve Tamamlama Butonları */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-800">
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setEnneagramActiveQIndex((prev) => Math.max(0, prev - 1))}
                          disabled={enneagramActiveQIndex === 0}
                          className="px-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Önceki Soru</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEnneagramActiveQIndex((prev) => Math.min(14, prev + 1))}
                          disabled={enneagramActiveQIndex === 14}
                          className="px-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Sonraki Soru</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {storedEnneagram && isEnneagramTaking && (
                          <button
                            type="button"
                            onClick={() => setIsEnneagramTaking(false)}
                            className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                          >
                            Vazgeç
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleCompleteEnneagramTest}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Testi Tamamla ve Hesapla</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enneagram Sonu: Genel Kopyala */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">15 Soru, Cevaplar & Mizaç Sonucu</span>
                  <CopyButton
                    textToCopy={() => formatEnneagramDetailedCopyText(client, archive)}
                    label="Genel Kopyala"
                    variant="outline"
                    size="sm"
                    title="15 soru, danışanın cevapları ve Enneagram sonucunu panoya kopyalar"
                  />
                </div>
              </div>
            )}

            {/* SUBTAB 2: HAYVAN TOTEMİ */}
            {activeTestSubTab === 'ANIMAL_TOTEM' && (
              <div className="space-y-4">
                {/* Geri Bildirim */}
                {totemFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                      totemFeedback.type === 'error'
                        ? 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {totemFeedback.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{totemFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTotemFeedback(null)}
                      className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Eğer Test Tamamlanmışsa: Sonuç Kartı */}
                {storedTotem && !isTotemTaking ? (
                  <div className="space-y-4">
                    {/* Başlık ve Sonuç Özeti */}
                    <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
                              Ana Ruh Hayvanı Totemi
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300">
                              Versiyon {storedTotem.version}
                            </span>
                          </div>
                          <h4 className="text-lg font-serif font-semibold text-stone-100 mt-1 flex items-center gap-2">
                            <span>{storedTotem.primaryType}</span>
                            <span className="text-xs font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">
                              {TOTEM_ANIMALS[storedTotem.primaryType]?.elementTr || 'Doğal Element'}
                            </span>
                          </h4>
                          {storedTotem.secondaryType && (
                            <p className="text-xs text-stone-400 font-mono mt-0.5">
                              Tamamlayıcı Rehber: {storedTotem.secondaryType}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 font-mono block">
                            Tamamlanma Tarihi
                          </span>
                          <span className="text-xs text-stone-300 font-mono">
                            {new Date(storedTotem.completedAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Nitelikler ve Yorumlar */}
                      {TOTEM_ANIMALS[storedTotem.primaryType] && (
                        <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1.5 text-xs">
                          <div className="text-stone-300">
                            <span className="font-semibold text-amber-300">Temel Nitelik: </span>
                            <span>{TOTEM_ANIMALS[storedTotem.primaryType].coreTraitTr}</span>
                          </div>
                          <div className="text-stone-300">
                            <span className="font-semibold text-amber-300">İçgüdüsel Rol: </span>
                            <span>{TOTEM_ANIMALS[storedTotem.primaryType].instinctiveRoleTr}</span>
                          </div>
                          <div className="text-stone-300">
                            <span className="font-semibold text-amber-300">Sembolik Anlam: </span>
                            <span>{TOTEM_ANIMALS[storedTotem.primaryType].symbolicMeaningTr}</span>
                          </div>
                        </div>
                      )}

                      {/* Yorumlar Listesi */}
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-stone-300 block">
                          Totem Analiz Raporu:
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {storedTotem.interpretations.map((text, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-stone-900/60 border border-stone-800 rounded-lg text-xs text-stone-300 leading-relaxed flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span>{text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totem Hayvanları Puan Dağılımı */}
                      <div className="pt-3 border-t border-stone-800/80 space-y-2">
                        <span className="text-xs font-semibold text-stone-300 block">
                          Ruh Hayvanı Puan Rezonansı:
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 text-center">
                          {Object.keys(TOTEM_ANIMALS).map((animal) => {
                            const score = storedTotem.dominantScores[animal] || 0;
                            const isPrimary = storedTotem.primaryType === animal;
                            const isSecondary = storedTotem.secondaryType === animal;
                            return (
                              <div
                                key={animal}
                                className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                  isPrimary
                                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm'
                                    : isSecondary
                                    ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                                    : 'bg-stone-900/50 border-stone-800/80 text-stone-400'
                                }`}
                              >
                                <span className="text-[10px] font-medium text-stone-300">{animal}</span>
                                <span className="text-xs font-bold font-mono mt-0.5">{score}p</span>
                                {isPrimary && (
                                  <span className="text-[9px] text-amber-400 font-semibold mt-0.5">Ana Totem</span>
                                )}
                                {isSecondary && (
                                  <span className="text-[9px] text-blue-400 font-semibold mt-0.5">Tamamlayıcı</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Alt Aksiyonlar: Yeniden Yap ve Sıfırla */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Totem sonucu {client.firstName} {client.lastName} ({client.id}) arşivinde kayıtlıdır.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {showClearTotemConfirm ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/60 p-1 rounded-lg">
                            <span className="text-[10px] text-rose-300">Totem sıfırlansın mı?</span>
                            <button
                              type="button"
                              onClick={handleResetTotem}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Evet
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowClearTotemConfirm(false)}
                              className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] cursor-pointer"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowClearTotemConfirm(true)}
                            className="px-3 py-1.5 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Testi Sıfırla
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleStartTotem}
                          className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Yeniden Test Yap</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Totem Test Çözme Alanı (10 Soru Akışı) */
                  <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-4">
                    {/* Soru İlerlemesi ve Hızlı Atlama Çubuğu */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-200">
                          Soru {totemActiveQIndex + 1} / 10
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
                          <span>{Object.keys(totemAnswers).length} / 10 Cevaplandı</span>
                          <span className="text-amber-400 font-bold">
                            (%{Math.round((Object.keys(totemAnswers).length / 10) * 100)})
                          </span>
                        </div>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${(Object.keys(totemAnswers).length / 10) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Soru Hızlı Atlama Numaraları */}
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {TOTEM_QUESTIONS.map((q, idx) => {
                          const isAnswered = Boolean(totemAnswers[q.id]);
                          const isCurrent = idx === totemActiveQIndex;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setTotemActiveQIndex(idx)}
                              className={`w-6 h-6 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                isCurrent
                                  ? 'bg-amber-500 text-stone-950 font-bold ring-2 ring-amber-400/50'
                                  : isAnswered
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Aktif Soru İçeriği */}
                    {(() => {
                      const currentQ = TOTEM_QUESTIONS[totemActiveQIndex];
                      const selectedOptionId = totemAnswers[currentQ.id];
                      return (
                        <div className="p-4 bg-stone-900/40 border border-stone-800/80 rounded-xl space-y-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-amber-300 border border-stone-700 inline-block">
                              {currentQ.categoryTr || 'Ruh Hayvanı Sorusu'}
                            </span>
                            <h4 className="text-sm font-medium text-stone-100 leading-snug pt-1">
                              {currentQ.order}. {currentQ.questionTr}
                            </h4>
                          </div>

                          {/* 4 Şık */}
                          <div className="grid grid-cols-1 gap-2">
                            {currentQ.options.map((opt) => {
                              const isSelected = selectedOptionId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSelectTotemAnswer(currentQ.id, opt.id)}
                                  className={`p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-100 shadow-sm'
                                      : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700 text-stone-300'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-amber-400 bg-amber-400'
                                        : 'border-stone-600'
                                    }`}
                                  >
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                                  </div>
                                  <span className="leading-relaxed">{opt.textTr}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Gezinme ve Tamamlama Butonları */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-800">
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setTotemActiveQIndex((prev) => Math.max(0, prev - 1))}
                          disabled={totemActiveQIndex === 0}
                          className="px-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Önceki Soru</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTotemActiveQIndex((prev) => Math.min(9, prev + 1))}
                          disabled={totemActiveQIndex === 9}
                          className="px-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Sonraki Soru</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {storedTotem && isTotemTaking && (
                          <button
                            type="button"
                            onClick={() => setIsTotemTaking(false)}
                            className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                          >
                            Vazgeç
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleCompleteTotemTest}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Testi Tamamla ve Hesapla</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKME 4: SEMBOLLER & GÖRSEL TASARIM MOTORU (A16) */}
      {activeTab === 'SYMBOLS' && (
        <div className="space-y-6">
          {/* 1. Modül Başlığı ve Durum Alanı */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shapes className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-semibold text-stone-200">
                    A16: Sembol Kütüphanesi & Görsel Tasarım Motoru
                  </h3>
                </div>
                <p className="text-xs text-stone-400">
                  {client.firstName} {client.lastName} için kutsal geometri, kadim glifler ve analiz rezonanslarına dayalı görsel tasarım istemi (AI/Midjourney) sentezi.
                </p>
              </div>

              {/* Durum Rozeti ve Sıfırlama */}
              <div className="flex items-center gap-2">
                {symbolPrep.status === 'COMPLETED' ? (
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Semboller Kayıtlı ({clientSymbolAnalyses.length} Kayıt)</span>
                  </span>
                ) : symbolPrep.status === 'READY_TO_RUN' ? (
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-blue-950/60 text-blue-400 border border-blue-800/80 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Seçime Hazır</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/80 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Analiz Verileri Bekleniyor</span>
                  </span>
                )}

                {clientSymbolAnalyses.length > 0 && (
                  showClearSymbolsConfirm ? (
                    <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/60 p-1 rounded">
                      <span className="text-[10px] text-rose-300">Sıfırlansın mı?</span>
                      <button
                        type="button"
                        onClick={handleClearAllSymbols}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Evet
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearSymbolsConfirm(false)}
                        className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] cursor-pointer"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowClearSymbolsConfirm(true)}
                      className="px-2.5 py-1 rounded text-[11px] text-rose-400 hover:bg-rose-950/30 border border-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Sıfırla</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Geri Bildirim */}
            {symbolFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  symbolFeedback.type === 'error'
                    ? 'bg-rose-950/40 border border-rose-900/60 text-rose-300'
                    : 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-300'
                }`}
              >
                {symbolFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{symbolFeedback.message}</span>
              </div>
            )}

            {/* Ön Koşul Durum Göstergesi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2 bg-stone-950/60 border border-stone-800/60 rounded space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Numeroloji</span>
                <span className={`font-medium ${symbolPrep.hasNumerology ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {symbolPrep.hasNumerology ? '✓ Hazır' : '✗ Eksik'}
                </span>
              </div>
              <div className="p-2 bg-stone-950/60 border border-stone-800/60 rounded space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Çakra Dengesi</span>
                <span className={`font-medium ${symbolPrep.hasChakra ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {symbolPrep.hasChakra ? '✓ Hazır' : '✗ Eksik'}
                </span>
              </div>
              <div className="p-2 bg-stone-950/60 border border-stone-800/60 rounded space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Arketip Modeli</span>
                <span className={`font-medium ${symbolPrep.hasArchetype ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {symbolPrep.hasArchetype ? '✓ Hazır' : '✗ Eksik'}
                </span>
              </div>
              <div className="p-2 bg-stone-950/60 border border-stone-800/60 rounded space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">A15 Dövme Reçetesi</span>
                <span className={`font-medium ${symbolPrep.hasRecipe ? 'text-emerald-400' : 'text-stone-400'}`}>
                  {symbolPrep.hasRecipe ? '✓ Bağlandı' : 'Beklemede'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Danışanın Analizlerine Göre Akıllı Sembol Önerileri */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-stone-200">
                Danışanın Analiz Çıktılarına Göre Önerilen Kutsal Semboller
              </h4>
            </div>
            <p className="text-[11px] text-stone-400">
              Astroloji burçları, Yaşam Yolu titreşimi, blokaj çakrası ve arketip modelinin ortak rezonansından seçilen semboller:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {recommendedSymbolsList.map((rec) => {
                const isAlreadySelected = selectedSymbolItems.some((s) => s.symbolId === rec.symbol.id);
                return (
                  <div
                    key={rec.symbol.id}
                    className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 text-xs">{rec.symbol.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-900 text-stone-400 border border-stone-800">
                          {rec.sourceModule} ({rec.matchingScore} Puan)
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block font-mono">
                        {rec.symbol.originCulture} · {rec.symbol.elementAssociation}
                      </span>
                      <p className="text-[11px] text-stone-300 leading-tight line-clamp-2">
                        {rec.reasonTr}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAlreadySelected}
                      onClick={() => handleAddSymbol(rec.symbol, rec.suggestedWeight)}
                      className={`w-full py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                        isAlreadySelected
                          ? 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
                          : 'bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700'
                      }`}
                    >
                      {isAlreadySelected ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Kompozisyona Eklendi</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Kompozisyona Ekle ({rec.suggestedWeight})</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Seçilen Semboller & Kompozisyon Oluşturucu */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-stone-200">
                  Seçilen Semboller & Kompozisyon Hiyerarşisi ({selectedSymbolItems.length})
                </h4>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">
                * Kullanıcı tercihleri korunur, sistem önerileriyle karıştırılmaz
              </span>
            </div>

            {selectedSymbolItems.length === 0 ? (
              <div className="p-6 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-1.5">
                <span className="text-xs text-stone-400 block font-medium">Henüz sembol seçilmedi</span>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Yukarıdaki önerilerden veya aşağıdaki kütüphaneden sembol ekleyerek danışana özel kompozisyon hiyerarşisi oluşturun.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedSymbolItems.map((item, idx) => (
                    <div
                      key={item.symbolId}
                      className="p-3 bg-stone-950/80 border border-stone-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-200">{item.symbolName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-900 text-amber-400/90 border border-stone-800">
                            #{idx + 1}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={item.customMeaning}
                          onChange={(e) => handleUpdateSymbolMeaning(item.symbolId, e.target.value)}
                          placeholder="Bu danışan için kişisel anlamı..."
                          className="w-full bg-stone-900/80 border border-stone-800 rounded px-2 py-1 text-[11px] text-stone-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={item.weight}
                          onChange={(e) =>
                            handleUpdateSymbolWeight(
                              item.symbolId,
                              e.target.value as 'PRIMARY' | 'SECONDARY' | 'ACCENT'
                            )
                          }
                          className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-[11px] text-stone-200 focus:outline-none"
                        >
                          <option value="PRIMARY">Ana Sembol (Primary)</option>
                          <option value="SECONDARY">İkincil (Secondary)</option>
                          <option value="ACCENT">Aksan (Accent)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveSymbol(item.symbolId)}
                          className="p-1 rounded text-stone-500 hover:text-rose-400 hover:bg-stone-900 transition-colors cursor-pointer"
                          title="Sembolü çıkar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kompozisyon Hikayesi / Anlatı */}
                <div className="space-y-1 text-xs">
                  <label className="text-[11px] text-stone-400 font-medium">
                    Kompozisyon Anlatısı ve Sembolik Entegrasyon Notu (İsteğe Bağlı)
                  </label>
                  <textarea
                    rows={2}
                    value={compositionNarrativeInput}
                    onChange={(e) => setCompositionNarrativeInput(e.target.value)}
                    placeholder="Sembollerin ten üzerinde birbirine nasıl bağlanacağı, akış ve hiyerarşi kuralları..."
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-md px-2.5 py-1.5 text-stone-200 text-xs focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Butonlar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={handleSaveSymbolAnalysis}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sembol Kompozisyonunu Arşive Kaydet</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateUnifiedPrompt}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-950/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nihai Görsel Prompt Sentezle (10 Adımlı Zincir)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Sentezlenen 10 Adımlı Görsel Tasarım İstemi (AI/Midjourney Prompt Çıktısı) */}
          {generatedVisualPrompt && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-stone-100">
                      Sentezlenmiş Görsel Tasarım İstemi (Midjourney / Stable Diffusion)
                    </h4>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Danışan → Analiz → A15 Reçete → Semboller → Stil → Yerleşim → Kompozisyon → Teknik Talimat
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopySymbolPrompt(generatedVisualPrompt.primaryPromptEn)}
                  className="px-3 py-1.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSymbolPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>İngilizce Promptu Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              {/* İngilizce Master Prompt */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
                  İngilizce Görsel Üretim İstemi (Primary Prompt)
                </span>
                <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-lg text-xs font-mono text-stone-200 leading-relaxed break-words select-all">
                  {generatedVisualPrompt.primaryPromptEn}
                </div>
              </div>

              {/* Konsept Özeti ve Negatif Prompt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">Türkçe Konsept Özeti</span>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {generatedVisualPrompt.conceptPromptTr}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">
                    Negatif Parametreler (Hariç Tutulanlar Dahil)
                  </span>
                  <p className="text-[11px] font-mono text-rose-300/80 leading-relaxed">
                    {generatedVisualPrompt.negativePrompt}
                  </p>
                </div>
              </div>

              {/* Kompozisyon ve Teknik Talimatlar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-stone-900/40 border border-stone-800/80 rounded-lg space-y-2">
                  <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                    Kompozisyon Hiyerarşisi
                  </span>
                  <ul className="space-y-1">
                    {generatedVisualPrompt.compositionHierarchy.map((h, hIdx) => (
                      <li key={hIdx} className="text-[11px] text-stone-300 flex items-start gap-1.5">
                        <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 bg-stone-900/40 border border-stone-800/80 rounded-lg space-y-2">
                  <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
                    Sanatçı Teknik Çizim Talimatları (Kural 13 & 14)
                  </span>
                  <ul className="space-y-1">
                    {generatedVisualPrompt.technicalDirectives.map((t, tIdx) => (
                      <li key={tIdx} className="text-[11px] text-stone-300 flex items-start gap-1.5">
                        <span className="text-stone-500 shrink-0 mt-0.5">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 5. MASTER_SYMBOLS Kütüphanesi Tarayıcısı */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-semibold text-stone-200">
                    MASTER_SYMBOLS: Kadim Sembol & Kutsal Geometri Kütüphanesi
                  </h4>
                </div>
                <p className="text-[11px] text-stone-400">
                  Toplam {ALL_MASTER_SYMBOLS.length} doğrulanmış kültürel sembol; iğne uyumu, vücut yerleşimi ve ezoterik anlamlarla listelenmiştir.
                </p>
              </div>

              {/* Arama ve Hariç Tutma Filtreleri */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Sembol veya anahtar kelime ara..."
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="Hariç tutulacaklar (örn: yılan)..."
                  value={excludedSymbolsSymbolTab}
                  onChange={(e) => setExcludedSymbolsSymbolTab(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-400"
                  title="Buraya yazılan semboller listeden filtrelenir"
                />
              </div>
            </div>

            {/* Kategori Filtre Düğmeleri */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                Tümü ({ALL_MASTER_SYMBOLS.length})
              </button>
              {(Object.keys(SYMBOL_CATEGORIES_METADATA) as GeometryType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                  }`}
                >
                  {SYMBOL_CATEGORIES_METADATA[cat]?.nameTr} ({SYMBOL_CATEGORIES_METADATA[cat]?.count})
                </button>
              ))}
            </div>

            {/* Sembol Kartları Izgarası */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {ALL_MASTER_SYMBOLS.filter((sym) => {
                if (selectedCategoryFilter !== 'ALL' && sym.geometryType !== selectedCategoryFilter) {
                  return false;
                }
                if (symbolSearch.trim()) {
                  const query = symbolSearch.toLocaleLowerCase('tr-TR');
                  const target = `${sym.name} ${sym.originalName || ''} ${sym.keywords.join(' ')} ${sym.meaning} ${sym.originCulture}`.toLocaleLowerCase('tr-TR');
                  if (!target.includes(query)) return false;
                }
                const rawExc = excludedSymbolsSymbolTab.split(',').map((s) => s.trim()).filter(Boolean);
                if (rawExc.length > 0) {
                  const target = `${sym.name} ${sym.keywords.join(' ')}`.toLocaleLowerCase('tr-TR');
                  if (rawExc.some((exc) => target.includes(exc.toLocaleLowerCase('tr-TR')))) {
                    return false;
                  }
                }
                if (client.motherName && client.motherName.trim().length > 1) {
                  const mLower = client.motherName.trim().toLocaleLowerCase('tr-TR');
                  if (sym.name.toLocaleLowerCase('tr-TR').includes(mLower)) return false;
                }
                return true;
              }).map((sym) => {
                const isSelected = selectedSymbolItems.some((s) => s.symbolId === sym.id);
                return (
                  <div
                    key={sym.id}
                    className="p-3.5 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-2.5 flex flex-col justify-between hover:border-stone-700 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-stone-100 text-xs block">{sym.name}</span>
                          {sym.originalName && (
                            <span className="text-[10px] text-stone-500 font-mono block italic">
                              {sym.originalName}
                            </span>
                          )}
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-900 text-amber-400/90 border border-stone-800 shrink-0">
                          {sym.originCulture}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-3">
                        {sym.meaning}
                      </p>

                      <div className="pt-1 flex flex-wrap items-center gap-1 text-[9px] font-mono text-stone-500">
                        <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800/60">
                          {sym.tattooSuitability.needleStyle}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800/60">
                          {sym.elementAssociation}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddSymbol(sym, 'SECONDARY')}
                      className={`w-full py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
                          : 'bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Seçildi</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Kompozisyona Ekle</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Kayıtlı Sembol Analizleri Geçmişi */}
          {clientSymbolAnalyses.length > 0 && (
            <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-5 space-y-3">
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider block font-mono">
                Kayıtlı Sembol Kompozisyonları Geçmişi ({clientSymbolAnalyses.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clientSymbolAnalyses.map((ana) => (
                  <div
                    key={ana.id}
                    className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300">
                        Versiyon {ana.version} ({ana.selectedSymbols.length} Sembol)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500 font-mono">
                          {new Date(ana.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteClientSymbolAnalysis(client.id, ana.id)}
                          className="p-1 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Bu analizi sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-400 leading-tight">
                      {ana.compositionNarrative}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {ana.selectedSymbols.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-stone-900 text-stone-300 border border-stone-800"
                        >
                          {s.symbolName} ({s.weight})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sembol Analizi Sonu: Genel Kopyala */}
          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">Sembol ve Geometri Seçimleri</span>
            <CopyButton
              textToCopy={() => formatSymbolsSectionCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="Sembol ve geometri analizini panoya kopyalar"
            />
          </div>
        </div>
      )}

      {/* SEKME 5: DÖVME TASARIMI & REÇETESİ (A15 & A29) */}
      {activeTab === 'DESIGN' && (
        <ClientTattooDesignWorkflow
          client={client}
          archive={archive}
          onNavigateToTab={(tab) => {
            if (tab === 'ANALYSES') setActiveTab('ANALYSES');
            else if (tab === 'RESULTS') setActiveTab('RESULTS');
            else if (tab === 'TESTS') setActiveTab('TESTS');
            else if (tab === 'SYMBOLS') setActiveTab('SYMBOLS');
            else if (tab === 'CLIENT_INFO') setActiveTab('PERSONAL_BIRTH');
          }}
        />
      )}

      {/* 4. AŞAMA 5: ORTAK ALTYAPI VE MODÜL BAĞLANTILARI PANELİ */}
      <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-stone-200">
              Modül Bağlantıları ve Akış Durumu (Ortak Altyapı)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            Danışan Kimliği: <span className="text-amber-400">{client.id}</span>
          </span>
        </div>

        {/* Akış Önerisi */}
        <div className="p-3 bg-stone-950/80 border border-stone-800/80 rounded-lg flex items-start gap-3 text-xs">
          <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-stone-300 font-medium block">Sıradaki Akış Adımı:</span>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              {pipelineReport.nextRecommendedActionTr}
            </p>
          </div>
        </div>

        {/* 9 Modülün Ortak Girdi ve Hazırlık Durumu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
          {Object.values(MODULE_REGISTRY).map((mod) => {
            const execStatus = getModuleExecutionStatus(client, archive, mod.id);
            const statusLabel = mod.statusLabelTr[execStatus];

            return (
              <div
                key={mod.id}
                className="p-3 bg-stone-950/60 border border-stone-800/60 rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-200 truncate">{mod.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-1 ${
                      execStatus === 'COMPLETED'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : execStatus === 'READY_TO_RUN'
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : 'bg-stone-900 border-stone-800 text-stone-500'
                    }`}
                  >
                    {execStatus === 'COMPLETED' ? 'Hesaplandı' : execStatus === 'READY_TO_RUN' ? 'Girdiler Hazır' : 'Girdi Eksik'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-1">{mod.description}</p>
                <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-800/40 flex justify-between items-center">
                  <span>Modül Durumu:</span>
                  <span className="text-amber-400/90 font-mono text-[10px]">{statusLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* A26: Danışan Dosyası ve Dışa Aktarma Modalı */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Başlığı */}
            <div className="p-5 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif text-stone-100 flex items-center gap-2">
                    <span>Danışan Dosyası ve Dışa Aktarma Merkezi</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    {client.firstName} {client.lastName} · <span className="font-mono text-amber-300">{client.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setExportFeedback(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bildirim Alanı */}
            {exportFeedback && (
              <div
                className={`mx-6 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  exportFeedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                }`}
              >
                {exportFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{exportFeedback.message}</span>
              </div>
            )}

            {/* İçerik Alanı */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* 1. Doğrudan Dosya İndirme Butonları */}
              <div>
                <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Dosya Olarak İndir</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadDossier}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-stone-200 group-hover:text-amber-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        Metin Dosyası (.txt)
                      </span>
                      <Download className="w-4 h-4 text-stone-500 group-hover:text-amber-300" />
                    </div>
                    <p className="text-xs text-stone-400">
                      Tüm analizleri, test sonuçlarını, dövme reçetesini ve sürüm geçmişini içeren insan tarafından okunabilir rapor.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-stone-200 group-hover:text-amber-300 flex items-center gap-2">
                        <Archive className="w-4 h-4 text-amber-400" />
                        Yapısal Veri (.json)
                      </span>
                      <Download className="w-4 h-4 text-stone-500 group-hover:text-amber-300" />
                    </div>
                    <p className="text-xs text-stone-400">
                      Yedekleme ve sistemler arası veri aktarımı için ham danışan ve arşiv JSON veri yapısı.
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Bölüm Bölüm Hızlı Kopyalama */}
              <div>
                <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Bölüm Bölüm Hızlı Kopyalama</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      key: 'personal',
                      label: 'Danışan Temel Bilgileri',
                      sub: 'Kimlik, İletişim & Danışman Notları',
                      getText: () => formatClientPersonalInfoCopyText(client),
                    },
                    {
                      key: 'birth',
                      label: 'Doğum & Konum Bilgileri',
                      sub: 'Tarih, Saat, Şehir, Koordinat & Harita',
                      getText: () => formatBirthInfoSectionCopyText(client, archive),
                    },
                    {
                      key: 'numerology',
                      label: 'Numeroloji Analizi',
                      sub: 'Pisagor Sayıları, İfade & Karmik',
                      getText: () => formatNumerologySectionCopyText(client, archive),
                    },
                    {
                      key: 'chakra',
                      label: 'Çakra Analizi',
                      sub: '7 Çakra Puanları, Blokaj & Destek',
                      getText: () => formatChakraSectionCopyText(client, archive),
                    },
                    {
                      key: 'archetype',
                      label: 'Arketip Analizi',
                      sub: 'Baskın/Gölge Arketipler & Yüzdeler',
                      getText: () => formatArchetypeSectionCopyText(client, archive),
                    },
                    {
                      key: 'enneagram',
                      label: 'Enneagram Testi',
                      sub: '15 Soru, Seçilen Cevaplar & Sonuç',
                      getText: () => formatEnneagramDetailedCopyText(client, archive),
                    },
                    {
                      key: 'totem',
                      label: 'Hayvan Totemi',
                      sub: '10 Soru, Seçilen Cevaplar & Sonuç',
                      getText: () => formatTotemDetailedCopyText(client, archive),
                    },
                    {
                      key: 'recipe',
                      label: 'Dövme Reçetesi',
                      sub: 'Stil, Yerleşim, Boyut, Element & Formül',
                      getText: () => formatRecipeSectionCopyText(client, archive),
                    },
                    {
                      key: 'prompt',
                      label: 'Sembol & Görsel İstemler',
                      sub: 'Seçili Semboller & AI Promptları',
                      getText: () => formatAllVisualPromptsSectionCopyText(client, archive),
                    },
                  ].map((item) => {
                    const isCopied = copiedKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleCopySection(item.key, item.getText(), item.label)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isCopied
                            ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                            : 'bg-stone-950 border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-stone-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs truncate">{item.label}</span>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 truncate">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Danışan Dosyası Canlı Önizlemesi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Danışan Dosyası Önizlemesi</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopySection('all_preview', generateClientDossierText(client, archive), 'Tüm danışan dosyası')
                    }
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'all_preview' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Tümünü Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-4 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-stone-300 whitespace-pre-wrap max-h-72 overflow-y-auto select-all leading-relaxed custom-scrollbar">
                    {generateClientDossierText(client, archive)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Alt Eylemler */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-500">
                Veriler salt-okunur olarak dışa aktarılır. Mevcut kayıtlar ve hesaplamalar değiştirilmez.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopySection('all_footer', generateClientDossierText(client, archive), 'Tüm danışan dosyası')
                  }
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'all_footer' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                  )}
                  <span>Tüm Dosyayı Kopyala</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    setExportFeedback(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tamam / Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
