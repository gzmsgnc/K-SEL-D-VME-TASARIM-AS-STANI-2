import React, { useState, useMemo } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import {
  TattooStyle,
  BodyPlacement,
  TattooRecipe,
  ClientTattooDesign,
  TattooImageDimensions,
} from '../../types/design';
import {
  generateSafeTattooDownloadFileName,
  formatByteSize,
  getOrientationLabelTr,
  calculateHypotheticalPrintSize,
} from '../../utils/tattooImageFileName';
import { useApp } from '../../store/AppContext';
import {
  prepareRecipeModule,
  generateClientRecipe,
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from '../../modules/recipe';
import {
  generateUnifiedVisualPrompt,
  VisualPromptOutput,
  buildTattooCompositionPlan,
  formatCompositionPlanText,
  TattooCompositionPlan,
} from '../../modules/symbols';
import { ClientTattooDesignResultHub } from './ClientTattooDesignResultHub';
import { CopyButton } from '../common/CopyButton';
import { formatRecipeSectionCopyText } from '../../utils/clientComprehensiveCopy';
import {
  Palette,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  ShieldCheck,
  Wand2,
  Sliders,
  Copy,
  Check,
  Info,
  Maximize2,
  Layers,
  Lock,
  Compass,
  Download,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

interface ClientTattooPresentationReportSectionProps {
  client: Client;
  archive: ClientArchiveRecord | null;
  onNavigateToTab: (tab: 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'RECIPE' | 'DESIGN') => void;
  selectedSymbolItems?: {
    symbolId: string;
    symbolName: string;
    customMeaning: string;
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  }[];
  onOpenExportModal?: () => void;
}

export const ClientTattooPresentationReportSection: React.FC<ClientTattooPresentationReportSectionProps> = ({
  client,
  archive,
  onNavigateToTab,
  selectedSymbolItems = [],
  onOpenExportModal,
}) => {
  const { saveClientDesign } = useApp();

  // Reçete hazırlık durumu ve eksik ön koşullar
  const recipePrep = useMemo(() => {
    return prepareRecipeModule(client, archive);
  }, [client, archive]);

  const missingPrerequisites = recipePrep.warningNotices;

  // Danışana ait en güncel tasarım (sürümler sıralı)
  const clientDesigns = useMemo(() => {
    if (!archive?.designs) return [];
    return archive.designs
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [archive, client.id]);

  const activeDesign: ClientTattooDesign | null = clientDesigns[0] || null;

  // 1. Reçete Tercihleri Form Durumu
  const [selectedStyle, setSelectedStyle] = useState<TattooStyle>(
    activeDesign?.recipe?.style || 'SACRED_GEOMETRY'
  );
  const [selectedPlacement, setSelectedPlacement] = useState<BodyPlacement>(
    activeDesign?.recipe?.recommendedPlacement || 'FOREARM_INNER'
  );

  const defaultDims = BODY_PLACEMENTS[selectedPlacement]?.recommendedDimensions || { width: 16, height: 22 };
  const [customWidth, setCustomWidth] = useState<number>(
    activeDesign?.recipe?.recommendedDimensionsCm?.width || defaultDims.width
  );
  const [customHeight, setCustomHeight] = useState<number>(
    activeDesign?.recipe?.recommendedDimensionsCm?.height || defaultDims.height
  );
  const [hasCustomizedDimensions, setHasCustomizedDimensions] = useState(false);

  const [selectedColor, setSelectedColor] = useState<TattooRecipe['colorProfile']>(
    activeDesign?.recipe?.colorProfile || 'MONOCHROME_BLACK'
  );
  const [excludedSymbolsInput, setExcludedSymbolsInput] = useState<string>(
    activeDesign?.recipe?.excludedElements?.join(', ') || ''
  );
  const [includeTotemInVisual, setIncludeTotemInVisual] = useState<boolean>(false);
  const [customNotesInput, setCustomNotesInput] = useState<string>(
    activeDesign?.notes || ''
  );

  // Geri bildirimler ve yüklenme durumları
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeFeedback, setRecipeFeedback] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
  } | null>(null);

  const [promptLoading, setPromptLoading] = useState(false);
  const [promptFeedback, setPromptFeedback] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
  } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Aşama 5.3.2: Gerçek Görsel Üretim ve Depolama Durumları
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenerationFeedback, setImageGenerationFeedback] = useState<{
    type: 'error' | 'success' | 'warning';
    code?: string;
    message: string;
    retryable?: boolean;
  } | null>(null);
  const [localGeneratedImageUrl, setLocalGeneratedImageUrl] = useState<string | null>(
    activeDesign?.imageUrl || null
  );
  const [imageMeta, setImageMeta] = useState<{
    fileId?: string;
    modelUsed?: string;
    createdAt?: string;
    size?: string;
    dimensions?: TattooImageDimensions;
  } | null>(
    activeDesign?.imageFileId
      ? {
          fileId: activeDesign.imageFileId,
          modelUsed: activeDesign.imageModelUsed,
          createdAt: activeDesign.imageGeneratedAt,
          dimensions: activeDesign.imageDimensions,
        }
      : null
  );

  // Aşama 5.2.3: Aktif danışanın analizlerine göre reaktif Nihai Dövme Kompozisyon Planı
  const compositionPlan: TattooCompositionPlan = useMemo(() => {
    const rawExcluded = excludedSymbolsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return buildTattooCompositionPlan(client, archive, {
      preferredPlacement: selectedPlacement,
      preferredStyle: selectedStyle,
      customDimensions: { width: customWidth, height: customHeight },
      excludedSymbols: rawExcluded,
      selectedSymbols: selectedSymbolItems,
      includeTotemInVisual,
      customNotes: customNotesInput,
    });
  }, [
    client,
    archive,
    selectedPlacement,
    selectedStyle,
    customWidth,
    customHeight,
    excludedSymbolsInput,
    selectedSymbolItems,
    includeTotemInVisual,
    customNotesInput,
  ]);

  const [copiedPlan, setCopiedPlan] = useState(false);
  const handleCopyCompositionPlan = () => {
    const text = formatCompositionPlanText(compositionPlan);
    navigator.clipboard?.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  // Yerleşim değiştiğinde boyut önerisini güncelle
  const handlePlacementChange = (newPlacement: BodyPlacement) => {
    setSelectedPlacement(newPlacement);
    const meta = BODY_PLACEMENTS[newPlacement];
    if (meta?.recommendedDimensions && !hasCustomizedDimensions) {
      setCustomWidth(meta.recommendedDimensions.width);
      setCustomHeight(meta.recommendedDimensions.height);
    }
  };

  // 2. DÖVME REÇETESİ OLUŞTURMA
  const handleGenerateRecipe = () => {
    setRecipeLoading(true);
    setRecipeFeedback(null);

    try {
      const excludedSymbols = excludedSymbolsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Güvenlik kalkanı: Anne adı daima hariç tutulanlara dahil edilir
      if (client.motherName && client.motherName.trim()) {
        const motherLower = client.motherName.trim().toLowerCase();
        if (!excludedSymbols.some((s) => s.toLowerCase() === motherLower)) {
          excludedSymbols.push(client.motherName.trim());
        }
      }

      const recipeRes = generateClientRecipe(client, archive, {
        preferredStyle: selectedStyle,
        preferredPlacement: selectedPlacement,
        customDimensions: { width: customWidth, height: customHeight },
        colorPreference: selectedColor,
        excludedSymbols,
        includeTotemInVisual,
        customNotes: customNotesInput,
        selectedSymbolObjects: selectedSymbolItems,
      });

      if (!recipeRes.success || !recipeRes.design) {
        setRecipeFeedback({
          type: 'error',
          message: recipeRes.errorMessageTr || 'Dövme reçetesi oluşturulamadı.',
        });
        setRecipeLoading(false);
        return;
      }

      const generatedDesign = recipeRes.design;
      const res = saveClientDesign(client.id, generatedDesign);
      if (res.storageStatus === 'memory_only' || res.storageStatus === 'partial_failure') {
        setRecipeFeedback({
          type: 'warning',
          message: 'Dövme reçetesi oluşturuldu ancak veriler yalnızca oturum belleğine yazıldı (sayfa yenilenirse kaybolabilir).',
        });
      } else if (res.storageStatus === 'failed') {
        setRecipeFeedback({
          type: 'error',
          message: res.error || 'Dövme reçetesi kaydedilemedi.',
        });
      } else {
        setRecipeFeedback({
          type: 'success',
          message: 'Dövme Reçetesi başarıyla formüle edildi ve kalıcı olarak arşivlendi.',
        });
      }
    } catch (err: any) {
      setRecipeFeedback({
        type: 'error',
        message: err?.message || 'Dövme reçetesi oluşturulurken beklenmeyen bir hata oluştu.',
      });
    } finally {
      setRecipeLoading(false);
    }
  };

  // 4. GÖRSEL TASARIM İSTEMİ (AI PROMPT) SENTEZLEME
  const handleSynthesizePrompt = () => {
    if (!activeDesign?.recipe) {
      setPromptFeedback({
        type: 'error',
        message: 'Görsel istem sentezlemek için önce yukarıdaki Dövme Reçetesini oluşturmalısınız.',
      });
      return;
    }

    setPromptLoading(true);
    setPromptFeedback(null);

    try {
      const rawExc = [...(activeDesign.recipe.excludedElements || [])];
      const totemTest = archive?.testResults.find(
        (t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM'
      );

      const promptOut: VisualPromptOutput = generateUnifiedVisualPrompt({
        clientId: client.id,
        clientFullName: `${client.firstName} ${client.lastName}`.trim(),
        motherName: client.motherName,
        recipe: activeDesign.recipe,
        selectedSymbols: selectedSymbolItems,
        excludedSymbols: rawExc,
        style: activeDesign.recipe.style,
        placement: activeDesign.recipe.recommendedPlacement,
        colorProfile: activeDesign.recipe.colorProfile,
        compositionNarrative: activeDesign.notes || activeDesign.conceptStatement,
        includeTotemInVisual: activeDesign.recipe.comprehensiveReport?.sectionF?.includeTotemInVisual || false,
        totemName: totemTest?.primaryType,
        conceptStatement: activeDesign.conceptStatement,
      });

      const updatedDesign: ClientTattooDesign = {
        ...activeDesign,
        aiPrompt: {
          primaryPromptEn: promptOut.primaryPromptEn,
          conceptPromptTr: promptOut.conceptPromptTr,
          negativePrompt: promptOut.negativePrompt,
          aspectRatio: activeDesign.aiPrompt?.aspectRatio || '3:4',
          artisticModifiers: activeDesign.aiPrompt?.artisticModifiers || [
            'fine line work',
            'precise ink needle',
            'high contrast blackwork',
          ],
        },
        updatedAt: new Date().toISOString(),
      };

      const saveRes = saveClientDesign(client.id, updatedDesign);
      if (saveRes.storageStatus === 'memory_only' || saveRes.storageStatus === 'partial_failure') {
        setPromptFeedback({
          type: 'warning',
          message: 'Görsel Tasarım İstemi sentezlendi ancak veriler yalnızca oturum belleğinde saklandı.',
        });
      } else if (saveRes.storageStatus === 'failed') {
        setPromptFeedback({
          type: 'error',
          message: saveRes.error || 'İstem kaydedilemedi.',
        });
      } else {
        setPromptFeedback({
          type: 'success',
          message: '10 Adımlı Görsel Tasarım İstemi ve Negatif Kalkan başarıyla sentezlendi ve kaydedildi.',
        });
      }
    } catch (err: any) {
      setPromptFeedback({
        type: 'error',
        message: err?.message || 'İstem sentezlenirken hata oluştu.',
      });
    } finally {
      setPromptLoading(false);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const promptData = activeDesign?.aiPrompt;

  // Aktif tasarım değiştiğinde yerel görsel URL'sini senkronize et
  React.useEffect(() => {
    if (activeDesign?.imageUrl) {
      setLocalGeneratedImageUrl(activeDesign.imageUrl);
      if (activeDesign.imageFileId) {
        setImageMeta({
          fileId: activeDesign.imageFileId,
          modelUsed: activeDesign.imageModelUsed,
          createdAt: activeDesign.imageGeneratedAt,
          dimensions: activeDesign.imageDimensions,
        });
      }
    } else {
      setLocalGeneratedImageUrl(null);
      setImageMeta(null);
    }
  }, [
    activeDesign?.id,
    activeDesign?.imageUrl,
    activeDesign?.imageFileId,
    activeDesign?.imageModelUsed,
    activeDesign?.imageGeneratedAt,
    activeDesign?.imageDimensions,
  ]);

  const handleGenerateTattooImage = async () => {
    if (!promptData?.primaryPromptEn) {
      setImageGenerationFeedback({
        type: 'warning',
        message: 'Lütfen önce "Görsel İstemi Sentezle" butonuna tıklayarak istemi oluşturun.',
      });
      return;
    }

    setGeneratingImage(true);
    setImageGenerationFeedback(null);

    try {
      const rawExcluded = excludedSymbolsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch('/api/generate-tattoo-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          prompt: promptData.primaryPromptEn,
          recipe: {
            style: selectedStyle,
            placementArea: selectedPlacement,
            primarySymbol: activeDesign?.recipe?.primarySymbol,
          },
          excludedSymbols: rawExcluded,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setImageGenerationFeedback({
          type: 'error',
          code: result.code,
          message: result.message || 'Dövme görseli üretimi başarısız oldu.',
          retryable: result.retryable !== false,
        });
        return;
      }

      const { imageUrl, fileId, modelUsed, createdAt, size, dimensions } = result.data;
      setLocalGeneratedImageUrl(imageUrl);
      setImageMeta({ fileId, modelUsed, createdAt, size, dimensions });
      setImageGenerationFeedback({
        type: 'success',
        message: 'Dövme şablonu görseli başarıyla üretildi ve güvenli yerel depolama alanına kaydedildi.',
      });

      // Tasarım kaydına yalnızca yerel göreli URL'yi ve kompakt meta verileri kaydet (LocalStorage kotasını koru)
      if (activeDesign) {
        saveClientDesign(client.id, {
          ...activeDesign,
          imageUrl,
          imageFileId: fileId,
          imageModelUsed: modelUsed,
          imageGeneratedAt: createdAt,
          imageDimensions: dimensions,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setImageGenerationFeedback({
        type: 'error',
        message: `Yerel sunucuya bağlanılamadı: ${err.message || 'Bilinmeyen ağ hatası.'}`,
        retryable: true,
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. ÜST BİLGİ VE MODÜL TANITIM KARTI */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400">
            <Palette className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Bütünleşik Tasarım & Rapor Merkezi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif text-stone-100">
            Dövme Sunumu & Rapor
          </h2>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            Danışanın analiz rezonansına göre hesaplanan dövme reçetesi, Midjourney AI görsel istemleri ve 10 bölümlü kapsamlı seans raporunun tek akışta sunulduğu çalışma ortamı.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {activeDesign?.recipe && (
            <CopyButton
              textToCopy={() => formatRecipeSectionCopyText(client, archive)}
              label="Teknik Reçeteyi Kopyala"
              variant="subtle"
              size="sm"
            />
          )}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3.5 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Danışan Dosyasını Dışa Aktar</span>
            </button>
          )}
        </div>
      </div>

      {/* Eksik Analiz Bildirimi (Kilit değil, rehberlik) */}
      {missingPrerequisites.length > 0 && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              En yüksek doğruluk ve kişiselleştirme için Temel Analizlerin tamamlanması tavsiye edilir. Eksik modüller:{' '}
              <strong className="text-amber-300">{missingPrerequisites.join(', ')}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('ANALYSES')}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Analiz Bölümüne Git</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. BÖLÜM 1: DÖVME TASARIM TERCİHLERİ VE TEKNİK PARAMETRELER */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-stone-200">
              1. Dövme Tasarım Tercihleri & Teknik Bilgiler
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {selectedSymbolItems.length > 0
              ? `${selectedSymbolItems.length} Sembol Aktif`
              : 'Sembol Kütüphanesi Entegre'}
          </span>
        </div>

        {/* Reçete Geri Bildirimi */}
        {recipeFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
              recipeFeedback.type === 'error'
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : recipeFeedback.type === 'warning'
                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            }`}
          >
            {recipeFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : recipeFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{recipeFeedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stil Seçimi */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block">Dövme Stili</label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as TattooStyle)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
            >
              {Object.entries(TATTOO_STYLES).map(([key, style]) => (
                <option key={key} value={key}>
                  {style.nameTr} — {style.descriptionTr}
                </option>
              ))}
            </select>
          </div>

          {/* Anatomik Yerleşim */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block">Anatomik Yerleşim</label>
            <select
              value={selectedPlacement}
              onChange={(e) => handlePlacementChange(e.target.value as BodyPlacement)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
            >
              {Object.entries(BODY_PLACEMENTS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.nameTr} ({meta.recommendedDimensions.width}×{meta.recommendedDimensions.height} cm)
                </option>
              ))}
            </select>
          </div>

          {/* Boyutlar (Genişlik x Yükseklik cm) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block flex items-center justify-between">
              <span>Tasarım Boyutları (cm)</span>
              <span className="text-[10px] text-stone-500 font-mono">Min 16×10, İdeal 22×14</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500">En:</span>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customWidth}
                  onChange={(e) => {
                    setCustomWidth(Number(e.target.value));
                    setHasCustomizedDimensions(true);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500">Boy:</span>
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={customHeight}
                  onChange={(e) => {
                    setCustomHeight(Number(e.target.value));
                    setHasCustomizedDimensions(true);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Renk Profili */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block">Renk Profili</label>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value as TattooRecipe['colorProfile'])}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
            >
              {Object.entries(COLOR_PROFILES).map(([key, col]) => (
                <option key={key} value={key}>
                  {col.nameTr} — {col.rationaleTr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hariç Tutulacak Semboller & Tercihler */}
        <div className="space-y-3 pt-2 border-t border-stone-800/80">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block">
              Hariç Tutulacak Sembol ve Öğeler (Virgülle ayırın)
            </label>
            <input
              type="text"
              value={excludedSymbolsInput}
              onChange={(e) => setExcludedSymbolsInput(e.target.value)}
              placeholder="örn: yılan, kafatası, kuru kafa, hançer, göz"
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
            />
            {client.motherName && (
              <p className="text-[10px] text-stone-500">
                🔒 Danışanın anne adı ({client.motherName}) güvenlik kalkanı gereği tasarımdan ve prompttan otomatik olarak hariç tutulacaktır.
              </p>
            )}
          </div>

          {/* Totem Tercihi */}
          <div className="flex items-center gap-3 p-3 bg-stone-950/60 border border-stone-800 rounded-lg">
            <input
              type="checkbox"
              id="includeTotemInUnifiedPresentation"
              checked={includeTotemInVisual}
              onChange={(e) => setIncludeTotemInVisual(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-stone-900 border-stone-700 focus:ring-amber-400"
            />
            <label htmlFor="includeTotemInUnifiedPresentation" className="text-xs text-stone-300 cursor-pointer">
              <span className="font-medium text-stone-200 block">Şamanik Hayvan Totemini Görsel Tasarıma Dahil Et</span>
              <span className="text-[10px] text-stone-500">
                Varsayılan kural: Totem hayvanı tasarıma dahil edilmez; yalnızca kutsal geometri ve semboller kullanılır. Bu seçeneği işaretlerseniz totem hayvanı sembolik olarak entegre edilir.
              </span>
            </label>
          </div>

          {/* Özel Notlar */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 block">Özel Danışan / Dövme Notları</label>
            <textarea
              rows={2}
              value={customNotesInput}
              onChange={(e) => setCustomNotesInput(e.target.value)}
              placeholder="Danışanın özel anatomik hassasiyetleri, yara izi kapatma veya kompozisyon tercihleri..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
        </div>

        {/* 2. REÇETE OLUŞTURMA BUTONU */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
          <div className="text-xs text-stone-400">
            {selectedSymbolItems.length > 0
              ? `${selectedSymbolItems.length} sembol Sembol Kütüphanesinden otomatik aktarılacak.`
              : 'Sembol kütüphanesinden seçilen semboller varsa reçeteye dahil edilir.'}
          </div>

          <button
            type="button"
            disabled={recipeLoading}
            onClick={handleGenerateRecipe}
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-md shadow-amber-950/20 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {recipeLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Reçete Hesaplanıyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{activeDesign?.recipe ? 'Dövme Reçetesini Güncelle' : 'Dövme Reçetesi Oluştur'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. BÖLÜM 2: TEKNİK DÖVME REÇETESİ VE MATEMATİKSEL STANDARTLAR */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-stone-200">
              2. Teknik Dövme Reçetesi & Standartlar
            </h3>
          </div>
          {activeDesign?.recipe && (
            <CopyButton
              textToCopy={() => formatRecipeSectionCopyText(client, archive)}
              label="Reçeteyi Kopyala"
              variant="gold"
              size="sm"
            />
          )}
        </div>

        {/* Matematiksel & Teknik Standartlar Gösterge Kartı */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">Ana Odak Standardı</span>
            <div className="text-sm font-bold text-amber-300">Nominal %65</div>
            <p className="text-[10px] text-stone-400">±%5 tolerans (%60–%70 aralığı)</p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">İkincil Katman</span>
            <div className="text-sm font-bold text-stone-200">%35</div>
            <p className="text-[10px] text-stone-400">Tamamlayıcı geometri ve akış</p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">Negatif Alan</span>
            <div className="text-sm font-bold text-emerald-400">%45 – %50</div>
            <p className="text-[10px] text-stone-400">Ten solunumu & yaşlanma payı</p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">Çizgi & İğne Aralığı</span>
            <div className="text-sm font-bold text-stone-200">1.5 – 2.0 mm</div>
            <p className="text-[10px] text-stone-400">Mürekkep dağılmasını önleme standardı</p>
          </div>
        </div>

        {/* Kayıtlı Reçete Detayı */}
        {activeDesign?.recipe ? (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono">Uygulama Stili</span>
                <div className="font-semibold text-stone-200">
                  {TATTOO_STYLES[activeDesign.recipe.style]?.nameTr || activeDesign.recipe.style}
                </div>
              </div>

              <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono">Anatomik Bölge</span>
                <div className="font-semibold text-stone-200">
                  {BODY_PLACEMENTS[activeDesign.recipe.recommendedPlacement]?.nameTr || activeDesign.recipe.recommendedPlacement}
                </div>
              </div>

              <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono">Önerilen Boyut</span>
                <div className="font-semibold text-stone-200 font-mono">
                  {activeDesign.recipe.recommendedDimensionsCm?.width} × {activeDesign.recipe.recommendedDimensionsCm?.height} cm
                </div>
              </div>
            </div>

            {/* Sembol Hiyerarşisi */}
            <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg space-y-2 text-xs">
              <span className="text-[10px] text-stone-500 uppercase font-mono font-semibold block">
                Kompozisyon Bileşenleri & Sembol Hiyerarşisi
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeDesign.recipe.primarySymbol && (
                  <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/40 text-[11px] font-medium flex items-center gap-1">
                    <span className="font-bold">★ BİRİNCİL:</span> {activeDesign.recipe.primarySymbol}
                  </span>
                )}
                {activeDesign.recipe.secondarySymbols?.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 text-[11px] flex items-center gap-1"
                  >
                    <span className="text-indigo-400 font-semibold">• İKİNCİL:</span> {s}
                  </span>
                ))}
                {activeDesign.recipe.accentSymbols?.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[11px] flex items-center gap-1"
                  >
                    <span className="text-emerald-400 font-semibold">✦ VURGU:</span> {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Dövme Sanatçısına Teknik Tavsiyeler */}
            {activeDesign.recipe.technicalAdviceForArtist && activeDesign.recipe.technicalAdviceForArtist.length > 0 && (
              <div className="p-3.5 bg-stone-950/80 border border-stone-800 rounded-lg space-y-1.5 text-xs">
                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                  Dövme Sanatçısına Teknik İğne ve Uygulama Tavsiyeleri
                </span>
                <ul className="list-disc list-inside space-y-1 text-stone-300 text-[11px]">
                  {activeDesign.recipe.technicalAdviceForArtist.map((adv, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-stone-500 bg-stone-950/40 rounded-lg border border-stone-800/60">
            Reçete henüz oluşturulmadı. Yukarıdaki parametreleri belirleyip <strong>&quot;Dövme Reçetesi Oluştur&quot;</strong> butonuna tıklayınız.
          </div>
        )}
      </div>

      {/* 4. BÖLÜM 3: NİHAİ DÖVME KOMPOZİSYON PLANI (Aşama 5.2.3) */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-stone-200">
                3. Nihai Dövme Kompozisyon Planı
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Önerilen ve seçilen sembollerin iç ön kol anatomik akışına, %65 odak kuralına ve ten solunumu standartlarına göre yerleşim planı.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCompositionPlan}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-amber-500/50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {copiedPlan ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Plan Kopyalandı ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Kompozisyon Planını Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* 1. Genel Konsept */}
        <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
          <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
            Tasarımın Genel Konsepti
          </span>
          <p className="text-xs text-stone-300 leading-relaxed">
            {compositionPlan.generalConceptTr}
          </p>
        </div>

        {/* 2 & 3. Sembol Hiyerarşisi Kartları */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">
            Kompozisyon Hiyerarşisi & Sembol Rolleri
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Birincil Odak Kartı */}
            <div className="p-3.5 bg-amber-950/20 border-2 border-amber-500/60 rounded-xl space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-stone-950">
                    BİRİNCİL ODAK
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-semibold">
                    {compositionPlan.primaryFocus.positiveSpaceRatioTr}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-stone-100 pt-1">
                  {compositionPlan.primaryFocus.symbolName}
                </h4>
                {compositionPlan.primaryFocus.originalName && (
                  <p className="text-[10px] text-stone-500 italic font-mono">
                    {compositionPlan.primaryFocus.originalName}
                  </p>
                )}
                <p className="text-[11px] text-stone-300 leading-relaxed pt-1">
                  {compositionPlan.primaryFocus.reasonOrTaskTr}
                </p>
              </div>

              <div className="pt-2 border-t border-amber-900/30 flex flex-wrap gap-1 text-[9px] font-mono text-stone-400">
                <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                  {compositionPlan.primaryFocus.element}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                  {compositionPlan.primaryFocus.needleStyle}
                </span>
              </div>
            </div>

            {/* İkincil Destek Sembolleri */}
            {compositionPlan.secondaryElements.length > 0 ? (
              compositionPlan.secondaryElements.map((sec, idx) => (
                <div
                  key={sec.symbolId || idx}
                  className="p-3.5 bg-indigo-950/20 border border-indigo-700/50 rounded-xl space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                        İKİNCİL DESTEK
                      </span>
                      <span className="text-[10px] font-mono text-indigo-300">
                        {sec.positiveSpaceRatioTr}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-200 pt-1">
                      {sec.symbolName}
                    </h4>
                    <p className="text-[11px] text-stone-300 leading-relaxed pt-1">
                      {sec.reasonOrTaskTr}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-indigo-900/40 flex flex-wrap gap-1 text-[9px] font-mono text-stone-400">
                    <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                      {sec.element}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                      {sec.needleStyle}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3.5 bg-stone-950/40 border border-stone-800/60 rounded-xl flex items-center justify-center text-center text-xs text-stone-500">
                İkincil sembol bulunmuyor; kompozisyon yalın tekil odak yapısındadır.
              </div>
            )}

            {/* Vurgu / Aksan Sembolleri */}
            {compositionPlan.accentElements.map((acc, idx) => (
              <div
                key={acc.symbolId || idx}
                className="p-3.5 bg-emerald-950/20 border border-emerald-700/40 rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                      VURGU / AKSAN
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {acc.positiveSpaceRatioTr}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-stone-200 pt-1">
                    {acc.symbolName}
                  </h4>
                  <p className="text-[11px] text-stone-300 leading-relaxed pt-1">
                    {acc.reasonOrTaskTr}
                  </p>
                </div>

                <div className="pt-2 border-t border-emerald-900/40 flex flex-wrap gap-1 text-[9px] font-mono text-stone-400">
                  <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                    {acc.element}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                    {acc.needleStyle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 & 5. Dikey Bölüm Dağılımı ve Eksenel Konumlar */}
        <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-800">
            <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold">
              Anatomik Dikey Bölüm Dağılımı (Üst · Orta · Alt)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-400/90 font-semibold block">
                Üst Bölüm (Dirsek / Giriş)
              </span>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                {compositionPlan.verticalDistribution.upperSectionTr}
              </p>
            </div>

            <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                Orta Bölüm (Merkez Odak)
              </span>
              <p className="text-[11px] text-stone-200 leading-relaxed font-medium">
                {compositionPlan.verticalDistribution.middleSectionTr}
              </p>
            </div>

            <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-400/90 font-semibold block">
                Alt Bölüm (Bilek / Bitiş)
              </span>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                {compositionPlan.verticalDistribution.lowerSectionTr}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 pt-1">
            <strong>Eksenel Konum İlişkisi:</strong> {compositionPlan.relativePositionsTr}
          </p>
        </div>

        {/* 6, 7 & 8. Negatif Alan, Çizgi ve Anatomik Akış */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-lg space-y-2">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold block">
              Negatif Alan Stratejisi (%45–%50)
            </span>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {compositionPlan.negativeSpaceStrategyTr}
            </p>
          </div>

          <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-lg space-y-2">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
              Çizgi, Dolgu & Gölgelendirme Yaklaşımı
            </span>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {compositionPlan.lineAndShadingApproachTr}
            </p>
          </div>
        </div>

        {/* 9. Dövme Sanatçısına Uygulama Notları */}
        <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-lg space-y-2 text-xs">
          <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
            Dövme Sanatçısına Özel Kompozisyon Uygulama Notları
          </span>
          <ul className="space-y-1.5 text-stone-300 text-[11px]">
            {compositionPlan.tattooArtistNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 10. Kalite Kontrol ve Görsel Bütünlük Denetim Kutusu */}
        <div className="p-4 bg-stone-950/90 border border-stone-800 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-stone-200">
                Görsel Bütünlük ve Kalite Kontrol Raporu
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/50">
              Skor: {compositionPlan.qualityCheck.overallScore} / 100
            </span>
          </div>

          {/* Onaylanan Standartlar */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {compositionPlan.qualityCheck.passedChecks.map((chk, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{chk}</span>
              </span>
            ))}
          </div>

          {/* Otomatik Düzeltmeler */}
          {compositionPlan.qualityCheck.autoCorrectionsApplied.length > 0 && (
            <div className="p-3 bg-sky-950/30 border border-sky-800/50 rounded-lg space-y-1 text-xs">
              <span className="text-[10px] font-mono text-sky-400 uppercase font-semibold block">
                Uygulanan Otomatik Hiyerarşi Düzeltmeleri
              </span>
              {compositionPlan.qualityCheck.autoCorrectionsApplied.map((corr, idx) => (
                <p key={idx} className="text-[11px] text-sky-200/90 leading-relaxed">
                  → {corr}
                </p>
              ))}
            </div>
          )}

          {/* Tespit Edilen Riskler */}
          {compositionPlan.qualityCheck.detectedRisks.length > 0 && (
            <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg space-y-1 text-xs">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold block">
                Tespit Edilen Tasarım Riskleri
              </span>
              {compositionPlan.qualityCheck.detectedRisks.map((risk, idx) => (
                <p key={idx} className="text-[11px] text-amber-200/90 leading-relaxed">
                  ! {risk}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* 11. Tasarıma Alınmayan Semboller ve Gerekçeleri (Varsa) */}
        {compositionPlan.excludedSymbolsWithReasons.length > 0 && (
          <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-lg space-y-2 text-xs">
            <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
              Tasarıma Dahil Edilmeyen Semboller ve Gerekçeleri ({compositionPlan.excludedSymbolsWithReasons.length})
            </span>
            <div className="space-y-1">
              {compositionPlan.excludedSymbolsWithReasons.map((exc, idx) => (
                <div key={idx} className="text-[11px] flex items-start gap-1.5 text-stone-400">
                  <span className="text-stone-500 font-bold">•</span>
                  <span>
                    <strong className="text-stone-300">{exc.symbolName}:</strong> {exc.reasonTr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yasal & Teknik Feragat */}
        <p className="text-[10px] text-stone-500 font-mono italic">
          * {compositionPlan.targets.dimensionsDisclaimerTr}
        </p>
      </div>

      {/* 5. BÖLÜM 4: GÖRSEL ÜRETİM İSTEMİ (AI PROMPT SENTEZİ) */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-stone-200">
                4. Görsel Tasarım & AI İstemi (Midjourney / Stable Diffusion)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Reçetedeki stil, anatomik yerleşim, %65 odak ve sembol hiyerarşisine dayalı 10 adımlı görsel üretim istemi.
              </p>
            </div>
          </div>

          {activeDesign?.recipe && (
            <button
              type="button"
              disabled={promptLoading}
              onClick={handleSynthesizePrompt}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-md shadow-amber-950/20 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {promptLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>İstem Sentezleniyor...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>{promptData?.primaryPromptEn ? 'İstemi Yeniden Sentezle' : 'Görsel İstemi Sentezle'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Prompt Geri Bildirimi */}
        {promptFeedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              promptFeedback.type === 'error'
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : promptFeedback.type === 'warning'
                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            }`}
          >
            {promptFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : promptFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{promptFeedback.message}</span>
          </div>
        )}

        {!activeDesign?.recipe ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-stone-950/40 rounded-lg border border-stone-800/60 space-y-2">
            <div className="w-9 h-9 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500">
              <Lock className="w-4 h-4" />
            </div>
            <p className="font-medium text-stone-400">Reçete Henüz Oluşturulmadı</p>
            <p className="text-[11px] text-stone-600 max-w-md mx-auto">
              Görsel tasarım istemi (Midjourney AI promptu) sentezlemek için önce yukarıdaki Dövme Reçetesi bölümünden stil ve yerleşim reçetesini oluşturunuz.
            </p>
          </div>
        ) : promptData?.primaryPromptEn ? (
          <div className="space-y-4 pt-1">
            {/* İngilizce Master Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold">
                  İngilizce Görsel Üretim İstemi (Primary Prompt)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(promptData.primaryPromptEn)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>İstemi Kopyala</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-stone-200 leading-relaxed break-words select-all">
                {promptData.primaryPromptEn}
              </div>
            </div>

            {/* Konsept Açıklaması ve Negatif Prompt Kalkanı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold block">
                  Türkçe Konsept Özeti
                </span>
                <p className="text-stone-300 text-[11px] leading-relaxed">
                  {promptData.conceptPromptTr || 'Konsept özeti oluşturuldu.'}
                </p>
              </div>

              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Negatif Prompt Kalkanı</span>
                </span>
                <p className="text-[11px] font-mono text-stone-400 break-words leading-relaxed">
                  {promptData.negativePrompt || 'blurry, distorted, realistic human faces, realistic animals, text, letters, dates'}
                </p>
              </div>
            </div>

            {/* Aşama 5.3.2: Gerçek Görsel Üretim Paneli (OpenAI GPT Image API) */}
            <div className="pt-4 border-t border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-950/80 border border-amber-900/30 rounded-xl">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-semibold text-stone-200">
                      Yapay Zeka ile Dövme Şablonu Üret (GPT Image API)
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Sentezlenen 10 adımlı istemi OpenAI görsel üretim motoruna ileterek yüksek kontrastlı dövme şablonu (1024x1536 dikey portre) üretir ve güvenli yerel depolama alanına kaydeder.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={generatingImage}
                  onClick={handleGenerateTattooImage}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 shadow-lg shadow-amber-950/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {generatingImage ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-stone-950" />
                      <span>Şablon Üretiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{localGeneratedImageUrl ? 'Yeni Varyasyon Üret' : 'Dövme Görselini Üret'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Yükleme Durumu Göstergesi */}
              {generatingImage && (
                <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2.5 text-xs text-amber-300 font-medium">
                    <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Yapay zeka dövme şablonunu çiziyor...</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    İnce çizgi geometrisi, ten solunumu (%45–%50 negatif alan) ve yüksek kontrastlı şablon detayları işlenmektedir. Bu işlem model karmaşıklığına bağlı olarak 10–25 saniye sürebilir.
                  </p>
                  <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-1.5 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* Hata ve Geri Bildirim Bildirimi */}
              {imageGenerationFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs border space-y-2 ${
                    imageGenerationFeedback.type === 'error'
                      ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      : imageGenerationFeedback.type === 'warning'
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                      : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {imageGenerationFeedback.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : imageGenerationFeedback.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">{imageGenerationFeedback.message}</div>
                        {imageGenerationFeedback.code === 'OPENAI_API_KEY_NOT_CONFIGURED' && (
                          <div className="mt-1.5 p-2 bg-stone-950/80 rounded border border-rose-900/40 text-[11px] text-stone-300 font-mono">
                            💡 Çözüm: Proje kökündeki <strong>.env</strong> dosyasını açıp <code>OPENAI_API_KEY=sk-...</code> anahtarınızı ekleyin ve sunucuyu yeniden başlatın.
                          </div>
                        )}
                      </div>
                    </div>

                    {imageGenerationFeedback.retryable && (
                      <button
                        type="button"
                        onClick={handleGenerateTattooImage}
                        disabled={generatingImage}
                        className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Yeniden Dene</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Üretilen Görsel Önizleme, Teknik Metadata ve İndirme Kartı (Aşama 5.4.2) */}
              {localGeneratedImageUrl && (() => {
                const safeDownloadFileName = generateSafeTattooDownloadFileName({
                  clientId: client.id,
                  conceptOrSymbol: activeDesign?.recipe?.primarySymbol || activeDesign?.recipe?.style,
                  date: imageMeta?.createdAt,
                  extension: 'png',
                });

                const dims = imageMeta?.dimensions;
                const hypotheticalPrint = dims
                  ? calculateHypotheticalPrintSize(dims.width, dims.height, 300)
                  : null;

                return (
                  <div className="p-4 sm:p-5 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
                    {/* 1. Üst Bar: Başlık, Doğrulama Rozetleri ve Güvenli İndirme */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-stone-200">
                            Üretilen Dövme Şablonu (Kavramsal Stencil)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-800">
                            Format: PNG
                          </span>
                          {dims?.verified ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Doğrulandı: IHDR & Çözünürlük Onaylı</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                              Metadata: Doğrulanmamış
                            </span>
                          )}
                          {dims && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300/90 border border-stone-800 font-semibold">
                                {dims.width} × {dims.height} px
                              </span>
                              {dims.fileSizeBytes && (
                                <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                                  {formatByteSize(dims.fileSizeBytes)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Güvenli İndirme Butonu: Orijinal sunucu PNG dosyasını korur, PII içermeyen güvenli ad kullanır */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={localGeneratedImageUrl}
                          download={safeDownloadFileName}
                          title={`Dosya Adı: ${safeDownloadFileName}`}
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                        >
                          <Download className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Şablonu İndir (PNG
                            {dims ? ` • ${dims.width}×${dims.height}` : ''}
                            {dims?.fileSizeBytes ? ` • ${formatByteSize(dims.fileSizeBytes)}` : ''})
                          </span>
                        </a>
                      </div>
                    </div>

                    {/* 2. Görsel Çerçevesi (Yüksek Kontrastlı Beyaz Arka Plan Stencil) */}
                    <div className="relative rounded-lg overflow-hidden bg-white/95 p-3 flex items-center justify-center border border-stone-700 shadow-xl max-h-[520px]">
                      <img
                        src={localGeneratedImageUrl}
                        alt="Dövme Tasarım Şablonu"
                        className="max-h-[480px] w-auto object-contain mx-auto transition-transform hover:scale-105 duration-300"
                      />
                    </div>

                    {/* 3. Görsel Teknik Bilgi Kartı */}
                    <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-xs">
                        <div className="flex items-center gap-2 text-stone-200 font-medium">
                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                          <span>Görsel Teknik Bilgi Kartı (IHDR Doğrulaması)</span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">
                          {dims?.verified ? '✓ Sunucu Tarafı Doğrulandı' : '! Doğrulama Verisi Yok'}
                        </span>
                      </div>

                      {dims ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {/* Çözünürlük */}
                          <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                            <span className="text-[10px] uppercase font-mono text-stone-400 block">
                              Piksel Çözünürlüğü
                            </span>
                            <p className="font-mono font-semibold text-amber-300 text-xs">
                              {dims.width} × {dims.height} px
                            </p>
                          </div>

                          {/* En-Boy Oranı & Yönelim */}
                          <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                            <span className="text-[10px] uppercase font-mono text-stone-400 block">
                              En-Boy Oranı & Yönelim
                            </span>
                            <p className="font-mono text-stone-200 text-xs">
                              {dims.aspectRatio} • {getOrientationLabelTr(dims.orientation)}
                            </p>
                          </div>

                          {/* Renk Tipi & Bit Derinliği */}
                          <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                            <span className="text-[10px] uppercase font-mono text-stone-400 block">
                              Renk Tipi / Bit Derinliği
                            </span>
                            <p className="font-mono text-stone-200 text-xs truncate" title={dims.colorType}>
                              {dims.colorType} ({dims.bitDepth}-bit)
                            </p>
                          </div>

                          {/* Dosya Boyutu & Format */}
                          <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                            <span className="text-[10px] uppercase font-mono text-stone-400 block">
                              Dosya Boyutu & Format
                            </span>
                            <p className="font-mono text-emerald-300 text-xs font-semibold">
                              {formatByteSize(dims.fileSizeBytes)} ({dims.format || 'PNG'})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-lg text-xs text-stone-400 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-stone-300 font-medium">
                              Teknik metadata bilgisi bu kayıt için bulunamadı.
                            </p>
                            <p className="text-[11px] text-stone-500 leading-relaxed">
                              Bu dövme görseli önceki bir sistem sürümünde üretilmiş veya sunucu IHDR doğrulaması kayıt altına alınmamış olabilir. Güvenlik ilkemiz gereği sahte veya tahmini teknik değer gösterilmemektedir.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. DPI ve Varsayımsal Baskı Ölçeği Kartı (Aşama 5.4.2 Kural 4) */}
                    {dims && hypotheticalPrint && (
                      <div className="p-4 bg-stone-900/40 border border-stone-800/90 rounded-xl space-y-2.5 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-stone-800/60">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-semibold text-stone-200">
                              Fiziksel Baskı Ölçeği (300 DPI Teorik Referans)
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">
                            Yaklaşık: {hypotheticalPrint.formatted}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-300 leading-relaxed">
                          {hypotheticalPrint.disclaimerTr}
                        </p>

                        <div className="p-2.5 bg-stone-950/80 border border-amber-900/30 rounded-lg flex items-start gap-2 text-[11px] text-stone-400">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-300/90">Sanatçı Stencil Ayarı: </span>
                            Danışanın tercih ettiği yerleşim bölgesi ({BODY_PLACEMENTS[selectedPlacement]?.nameTr || selectedPlacement}) için hesaplanan reçete ölçüsü <strong>{customWidth} × {customHeight} cm</strong> olarak belirlenmiştir. Dövme sanatçısı termal transfer veya stencil yazıcı çıktısını bu anatomik alana göre ölçeklemelidir.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. Alt Bilgi & Depolama İzolasyonu Notu */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-400 pt-1">
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span>Model: {imageMeta?.modelUsed || 'gpt-image-2.6-sunburst'}</span>
                        <span>•</span>
                        <span>Dosya Adı: <code className="text-stone-300">{safeDownloadFileName}</code></span>
                        {imageMeta?.createdAt && (
                          <>
                            <span>•</span>
                            <span>Tarih: {new Date(imageMeta.createdAt).toLocaleTimeString('tr-TR')}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 italic">
                        * Görsel, sunucu tarafında doğrulanarak izole <code>storage/tattoos/{client.id}/</code> dizininde saklanmaktadır.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-stone-500 bg-stone-950/40 rounded-lg border border-stone-800/60 space-y-2">
            <p>Bu danışanın reçetesi için henüz yapay zeka görsel promptu üretilmemiş.</p>
            <p className="text-[11px] text-stone-600">
              Yukarıdaki <strong>&quot;Görsel İstemi Sentezle&quot;</strong> butonuna tıklayarak Midjourney ve Stable Diffusion uyumlu 10 adımlı promptu üretebilirsiniz.
            </p>
          </div>
        )}
      </div>

      {/* 5 & 6. BÖLÜM 5: NİHAİ DÖVME TASARIM RAPORU & RAPOR KOPYALAMA/İNDİRME İŞLEMLERİ */}
      <div className="space-y-4">
        {!activeDesign?.recipe ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-8 text-center text-xs text-stone-500 space-y-2">
            <div className="w-9 h-9 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500">
              <Lock className="w-4 h-4" />
            </div>
            <p className="font-medium text-stone-400">Nihai Tasarım Raporu Kilitli</p>
            <p className="text-[11px] text-stone-600 max-w-md mx-auto">
              10 bölümlü danışan tasarım raporu, seans manifestosu ve teknik dosya, yukarıdaki dövme reçetesi tamamlandığında burada hazır olarak açılacaktır.
            </p>
          </div>
        ) : (
          <ClientTattooDesignResultHub
            client={client}
            archive={archive}
            onNavigateToTab={(tab) => {
              if (tab === 'CLIENT_INFO') onNavigateToTab('PERSONAL_BIRTH');
              else if (tab === 'DESIGN') onNavigateToTab('RECIPE');
              else onNavigateToTab(tab as any);
            }}
          />
        )}
      </div>

      {/* 7. ALT NAVİGASYON BARI */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={() => onNavigateToTab('SYMBOLS')}
          className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri: Sembol Kütüphanesi</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('PERSONAL_BIRTH')}
          className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          <span>Başa Dön: Danışan Bilgileri</span>
        </button>
      </div>
    </div>
  );
};
