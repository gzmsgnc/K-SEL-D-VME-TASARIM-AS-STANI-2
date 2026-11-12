import React, { useState, useMemo } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { TattooStyle, BodyPlacement, TattooRecipe, ClientTattooDesign } from '../../types/design';
import { useApp } from '../../store/AppContext';
import {
  prepareRecipeModule,
  generateClientRecipe,
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from '../../modules/recipe';
import { CopyButton } from '../common/CopyButton';
import { formatRecipeSectionCopyText } from '../../utils/clientComprehensiveCopy';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  RotateCw,
  Compass,
  Info,
  Maximize2,
  Palette,
  Layers,
  Sliders,
} from 'lucide-react';

interface ClientTattooRecipeSectionProps {
  client: Client;
  archive: ClientArchiveRecord | null;
  onNavigateToTab: (tab: 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'RECIPE' | 'DESIGN') => void;
  selectedSymbolItems?: {
    symbolId: string;
    symbolName: string;
    customMeaning: string;
    weight: 'PRIMARY' | 'SECONDARY' | 'ACCENT';
  }[];
}

export const ClientTattooRecipeSection: React.FC<ClientTattooRecipeSectionProps> = ({
  client,
  archive,
  onNavigateToTab,
  selectedSymbolItems = [],
}) => {
  const { saveClientDesign, clearClientDesigns } = useApp();

  // Reçete hazırlık durumu
  const recipePrep = useMemo(() => {
    return prepareRecipeModule(client, archive);
  }, [client, archive]);

  // Danışana ait güncel tasarım
  const clientDesigns = useMemo(() => {
    if (!archive?.designs) return [];
    return archive.designs
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [archive, client.id]);

  const activeDesign: ClientTattooDesign | null = clientDesigns[0] || null;

  // Form parametreleri
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

  const [calcLoading, setCalcLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null);

  // Yerleşim değiştiğinde otomatik boyut öner
  const handlePlacementChange = (newPlacement: BodyPlacement) => {
    setSelectedPlacement(newPlacement);
    const meta = BODY_PLACEMENTS[newPlacement];
    if (meta?.recommendedDimensions && !hasCustomizedDimensions) {
      setCustomWidth(meta.recommendedDimensions.width);
      setCustomHeight(meta.recommendedDimensions.height);
    }
  };

  // Reçete Üretimi
  const handleGenerateRecipe = () => {
    setCalcLoading(true);
    setFeedback(null);

    try {
      const excludedSymbols = excludedSymbolsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Anne adı koruması
      if (client.motherName && client.motherName.trim().length > 1) {
        const mLower = client.motherName.trim().toLocaleLowerCase('tr-TR');
        const hasMother = excludedSymbols.some((s) => s.toLocaleLowerCase('tr-TR').includes(mLower));
        if (hasMother) {
          // Anne adı zaten hariç tutulmuş, güvenli
        }
      }

      // Sembol Kütüphanesinden seçilen sembolleri reçeteye aktar (ADIM 2B: BİRİNCİL, İKİNCİL, VURGU)
      const primarySym = selectedSymbolItems.find((s) => s.weight === 'PRIMARY')?.symbolName;
      const secondarySyms = selectedSymbolItems
        .filter((s) => s.weight === 'SECONDARY')
        .map((s) => s.symbolName);
      const accentSyms = selectedSymbolItems
        .filter((s) => s.weight === 'ACCENT')
        .map((s) => s.symbolName);

      const res = generateClientRecipe(client, archive, {
        preferredStyle: selectedStyle,
        preferredPlacement: selectedPlacement,
        colorPreference: selectedColor,
        excludedSymbols,
        includeTotemInVisual,
        primarySymbol: primarySym,
        selectedSymbols: secondarySyms.length > 0 ? secondarySyms : undefined,
        accentSymbols: accentSyms.length > 0 ? accentSyms : undefined,
        selectedSymbolObjects: selectedSymbolItems.length > 0 ? selectedSymbolItems : undefined,
        customNotes: customNotesInput.trim() || undefined,
        customDimensions: {
          width: customWidth,
          height: customHeight,
        },
      });

      if (res.success && res.design) {
        const saveRes = saveClientDesign(client.id, res.design);
        if (saveRes.storageStatus === 'memory_only' || saveRes.storageStatus === 'partial_failure') {
          setFeedback({
            type: 'warning',
            message: `${res.design.title} oluşturuldu ancak veriler yalnızca oturum belleğinde saklandı (sayfa yenilenirse kaybolabilir).`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `${res.design.title} başarıyla oluşturuldu ve arşive kaydedildi.`,
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.errorMessageTr || 'Dövme reçetesi oluşturulamadı.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Beklenmeyen hata oluştu.',
      });
    } finally {
      setCalcLoading(false);
    }
  };

  const missingPrerequisites: string[] = [];
  if (!recipePrep.hasAstrology) missingPrerequisites.push('Astroloji');
  if (!recipePrep.hasNumerology) missingPrerequisites.push('Numeroloji');
  if (!recipePrep.hasChakra) missingPrerequisites.push('Çakra');
  if (!recipePrep.hasArchetype) missingPrerequisites.push('Arketip');

  return (
    <div className="space-y-6">
      {/* 1. Başlık ve Açıklama */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                Dövme Reçetesi (Teknik Formülasyon ve Standartlar)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Danışanın analitik verilerine göre hesaplanan stil, yerleşim, %65 ana odak toleransı ve teknik uygulama reçetesi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDesign?.recipe && (
              <CopyButton
                textToCopy={() => formatRecipeSectionCopyText(client, archive)}
                label="Reçeteyi Kopyala"
                variant="gold"
                size="sm"
                title="Teknik dövme reçetesini panoya kopyalar"
              />
            )}
          </div>
        </div>

        {/* 2. Matematiksel & Teknik Standartlar Gösterge Kartı */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
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
      </div>

      {/* Eksik Analiz Bildirimi (Kilit değil, nazik yönlendirme) */}
      {missingPrerequisites.length > 0 && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Dövme reçetesi oluşturulurken en yüksek doğruluk için Temel Analizlerin tamamlanması tavsiye edilir. Eksik analizler:{' '}
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

      {/* Geri Bildirim */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : feedback.type === 'warning'
              ? 'bg-amber-950/40 border-amber-800 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : feedback.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3. Reçete Parametreleri Formu */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-5">
        <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Reçete Parametreleri & Danışan Tercihleri</span>
        </h4>

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
                🔒 Danışanın anne adı ({client.motherName}) görsel tasarımdan ve prompttan güvenlik kalkanı gereği otomatik olarak hariç tutulacaktır.
              </p>
            )}
          </div>

          {/* Totem Tercihi */}
          <div className="flex items-center gap-3 p-3 bg-stone-950/60 border border-stone-800 rounded-lg">
            <input
              type="checkbox"
              id="includeTotemInVisualRecipe"
              checked={includeTotemInVisual}
              onChange={(e) => setIncludeTotemInVisual(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-stone-900 border-stone-700 focus:ring-amber-400"
            />
            <label htmlFor="includeTotemInVisualRecipe" className="text-xs text-stone-300 cursor-pointer">
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

        {/* Reçete Üretme Butonu */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
          <div className="text-xs text-stone-400">
            {selectedSymbolItems.length > 0
              ? `${selectedSymbolItems.length} sembol Sembol Kütüphanesinden otomatik aktarılacak.`
              : 'Sembol kütüphanesinden seçilen semboller varsa reçeteye dahil edilir.'}
          </div>

          <button
            type="button"
            disabled={calcLoading}
            onClick={handleGenerateRecipe}
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-md shadow-amber-950/20 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {calcLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Reçete Hesaplanıyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Dövme Reçetesi Oluştur</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Kayıtlı Reçete Detay Kartı (Varsa) */}
      {activeDesign?.recipe && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-semibold text-stone-100">
                  {activeDesign.title || 'Güncel Dövme Reçetesi'}
                </h4>
                <p className="text-[11px] text-stone-400">
                  {new Date(activeDesign.updatedAt).toLocaleDateString('tr-TR')} tarihinde kaydedildi.
                </p>
              </div>
            </div>

            <CopyButton
              textToCopy={() => formatRecipeSectionCopyText(client, archive)}
              label="Reçeteyi Kopyala"
              variant="subtle"
              size="sm"
            />
          </div>

          {/* Reçete İçerik Izgarası */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
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

          {/* Sembol ve Bileşenler (ADIM 2B: BİRİNCİL, İKİNCİL, VURGU) */}
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
      )}

      {/* 5. Alt Navigasyon Barı: Geri ve Devam Et */}
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
          onClick={() => onNavigateToTab('DESIGN')}
          className="px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-amber-900/20"
        >
          <span>Devam Et: Tasarım</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
