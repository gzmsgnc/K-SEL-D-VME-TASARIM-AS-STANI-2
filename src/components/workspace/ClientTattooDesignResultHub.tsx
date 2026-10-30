import React, { useState, useMemo } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ClientTattooDesign } from '../../types/design';
import { useApp } from '../../store/AppContext';
import {
  evaluateTattooDesignStage,
} from '../../utils/tattooDesignStage';
import {
  TATTOO_STYLES,
  BODY_PLACEMENTS,
  COLOR_PROFILES,
} from '../../modules/recipe/constants';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatTechnicalAdviceText,
  formatVisualPromptText,
  formatNegativePromptText,
  formatFullDesignPackageText,
  formatDesignSummaryText,
  formatSymbolCompositionText,
} from '../../utils/tattooDesignFormatters';
import { CopyButton } from '../common/CopyButton';
import {
  formatAllVisualPromptsSectionCopyText,
  formatRecipeSectionCopyText,
} from '../../utils/clientComprehensiveCopy';
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  History,
  ArrowRight,
  Trash2,
  Copy,
  Check,
  FileText,
  Layers,
  Wand2,
  Compass,
  Scissors,
  Eye,
  Plus,
  ShieldCheck,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ClientTattooDesignResultHubProps {
  client: Client;
  archive: ClientArchiveRecord | null;
  onNavigateToTab?: (tab: 'CLIENT_INFO' | 'ANALYSES' | 'RESULTS' | 'TESTS' | 'SYMBOLS' | 'DESIGN') => void;
  onStartNewDesignVersion?: () => void;
}

export const ClientTattooDesignResultHub: React.FC<ClientTattooDesignResultHubProps> = ({
  client,
  archive,
  onNavigateToTab,
  onStartNewDesignVersion,
}) => {
  const { deleteClientDesign } = useApp();

  // Seçili sürüm (null ise en güncel sürüm gösterilir)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [copiedFeedbackMessage, setCopiedFeedbackMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSymbolIndex, setExpandedSymbolIndex] = useState<number | null>(null);

  // Danışana ait tasarımlar (A25 / A30 Danışan İzolasyonu: SADECE aktif clientId)
  const clientDesigns: ClientTattooDesign[] = useMemo(() => {
    if (!archive || !archive.designs) return [];
    return archive.designs
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [archive, client.id]);

  const latestDesign = clientDesigns[0] || null;

  // Görüntülenen aktif tasarım
  const activeDesign: ClientTattooDesign | null = useMemo(() => {
    if (!clientDesigns.length) return null;
    if (selectedVersionId) {
      return clientDesigns.find((d) => d.id === selectedVersionId) || latestDesign;
    }
    return latestDesign;
  }, [clientDesigns, selectedVersionId, latestDesign]);

  // Geçmiş sürüm mü inceleniyor? (Salt okunur kontrolü)
  const isViewingHistoricalVersion = Boolean(
    activeDesign && latestDesign && activeDesign.id !== latestDesign.id
  );

  // A34: 9 Durumlu Tasarım Aşaması Tespiti
  const designStage = useMemo(() => {
    return evaluateTattooDesignStage(client, archive, {
      activeDesignId: activeDesign?.id,
    });
  }, [client, archive, activeDesign?.id]);

  // Kopyalama Yöneticisi (Açık Türkçe Geri Bildirim)
  const handleCopy = (text: string, typeKey: string, label?: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedType(typeKey);
      setCopiedFeedbackMessage(label ? `${label} kopyalandı.` : 'Kopyalandı.');
      setTimeout(() => {
        setCopiedType((prev) => (prev === typeKey ? null : prev));
        setCopiedFeedbackMessage(null);
      }, 2500);
    } catch {
      setCopiedFeedbackMessage('Kopyalama işlemi gerçekleştirilemedi.');
      setTimeout(() => setCopiedFeedbackMessage(null), 2500);
    }
  };

  // DURUM 1: Bu danışan için hiç kayıtlı tasarım/reçete yok
  if (!activeDesign || clientDesigns.length === 0) {
    return (
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 sm:p-8 space-y-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Palette className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-stone-200">
            Tasarım Sonucu Kaydı Bulunmuyor
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed">
            {client.firstName} {client.lastName} ({client.id}) için henüz bir dövme reçetesi veya tasarım sonucu oluşturulmadı.
          </p>
        </div>

        <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-lg max-w-sm mx-auto text-xs text-stone-400">
          Tasarım sonucu ekranı yalnızca aktif danışanın doğrulanmış analizlerinden (A12 Numeroloji, A13 Çakra, A14 Arketip) üretilmiş gerçek kayıtları gösterir; sahte veri üretmez.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onStartNewDesignVersion && (
            <button
              type="button"
              onClick={onStartNewDesignVersion}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Dövme Reçetesi Oluştur (V1)</span>
            </button>
          )}

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('ANALYSES')}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Analiz Durumlarını İncele
            </button>
          )}
        </div>
      </div>
    );
  }

  const recipe = activeDesign.recipe;
  const styleMeta = TATTOO_STYLES[recipe.style] || TATTOO_STYLES.FINE_LINE;
  const placementMeta = BODY_PLACEMENTS[recipe.recommendedPlacement] || BODY_PLACEMENTS.FOREARM_INNER;
  const colorMeta = COLOR_PROFILES[recipe.colorProfile] || COLOR_PROFILES.MONOCHROME_BLACK;

  const hasPrompt = Boolean(activeDesign.aiPrompt && activeDesign.aiPrompt.primaryPromptEn?.trim());

  return (
    <div className="space-y-6">
      {/* 1. ÜST PANEL: BAŞLIK, SÜRÜM SEÇİCİ VE SALT OKUNUR UYARISI */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-stone-100">
                Tasarım Sonucu ve Arşiv Kullanım Paneli (A30)
              </h3>
            </div>
            <p className="text-xs text-stone-400">
              {client.firstName} {client.lastName} ({client.id}) için üretilmiş gerçek dövme tasarımı, sembol hiyerarşisi ve teknik yönergeler.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onStartNewDesignVersion && (
              <button
                type="button"
                onClick={onStartNewDesignVersion}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-950/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Sürüm Üret (V{clientDesigns.length + 1})</span>
              </button>
            )}
          </div>
        </div>

        {/* A34: Tasarım Aşaması Durum Çubuğu (9 Durum) */}
        <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${designStage.badgeColorClass}`}>
              Aşama {designStage.stageNumber}: {designStage.stageTitleTr}
            </span>
            <span className="text-stone-300 truncate">
              {designStage.stageDescriptionTr}
            </span>
          </div>
          <div className="text-[11px] text-amber-300/90 font-medium shrink-0 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            Sıradaki: {designStage.nextActionTitleTr}
          </div>
        </div>

        {/* GEÇMİŞ SÜRÜM ŞERİDİ (SALT OKUNUR) */}
        {isViewingHistoricalVersion && latestDesign && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-600/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-300 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Geçmiş Sürüm — Salt Okunur: V{activeDesign.versionNumber} ({activeDesign.title})</span>
                </span>
                <span className="text-[11px] text-stone-400 block mt-0.5">
                  Kayıt Tarihi: {new Date(activeDesign.createdAt).toLocaleString('tr-TR')} • Bu geçmiş sürümün incelenmesi güncel reçeteyi değiştirmez ve üzerine yazılmaz.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVersionId(latestDesign.id)}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Güncel Sürüme Dön (V{latestDesign.versionNumber})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SÜRÜM SEÇİCİ VE DURUM ÇUBUĞU */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 border border-stone-800 rounded-xl p-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-mono text-stone-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Sürümler ({clientDesigns.length}):</span>
            </span>

            {/* Aktif Sürüm Rozeti: Güncel vs Arşiv — Salt Okunur */}
            {isViewingHistoricalVersion ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" />
                <span>Arşiv — Salt Okunur</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                <span>Güncel</span>
              </span>
            )}

            {clientDesigns.map((d) => {
              const isLatest = d.id === latestDesign?.id;
              const isSelected = d.id === activeDesign.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedVersionId(d.id)}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'bg-stone-900 text-stone-300 border border-stone-800 hover:text-stone-100 hover:border-stone-700'
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

          <div className="flex items-center gap-2">
            {isViewingHistoricalVersion ? (
              <span className="text-[11px] text-stone-500 italic flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Geçmiş sürüm salt okunurdur</span>
              </span>
            ) : showDeleteConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/80 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    deleteClientDesign(client.id, activeDesign.id);
                    setSelectedVersionId(null);
                    setShowDeleteConfirm(false);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
                >
                  Silmeyi Onayla
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-0.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  İptal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1 rounded text-[11px] text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 border border-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Bu güncel sürümü arşivden sil"
              >
                <Trash2 className="w-3 h-3" />
                <span>Bu Sürümü Sil</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. KOPYALAMA AKSİYONLARI ÇUBUĞU (A30 / A34 Kopyalama Merkezi) */}
        <div className="p-3 bg-stone-950/80 border border-amber-950/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Tasarım Sonucunu Kopyala (Bağımsız Alanlar)</span>
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              Yalnızca {client.firstName} {client.lastName} verisi
            </span>
          </div>

          {copiedFeedbackMessage && (
            <div className="text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5" />
              <span>{copiedFeedbackMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* 1. Dövme Reçetesi */}
            <button
              type="button"
              onClick={() => handleCopy(formatTattooRecipeText(client, activeDesign), 'recipe', 'Dövme Reçetesi')}
              className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="text-[11px] text-stone-200 truncate">Dövme Reçetesi</span>
              {copiedType === 'recipe' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>

            {/* 2. Türkçe Konsept / Manifesto */}
            <button
              type="button"
              onClick={() => handleCopy(formatConceptManifestoText(client, activeDesign), 'concept', 'Türkçe Konsept / Manifesto')}
              className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="text-[11px] text-stone-200 truncate">Türkçe Konsept / Manifesto</span>
              {copiedType === 'concept' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>

            {/* 3. Sanatçı Teknik Talimatları */}
            <button
              type="button"
              onClick={() => handleCopy(formatTechnicalAdviceText(client, activeDesign), 'technical', 'Sanatçı Teknik Talimatları')}
              className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="text-[11px] text-stone-200 truncate">Sanatçı Teknik Talimatları</span>
              {copiedType === 'technical' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>

            {/* 4. Görsel İstem */}
            <button
              type="button"
              disabled={!hasPrompt}
              onClick={() => hasPrompt && handleCopy(formatVisualPromptText(client, activeDesign), 'visual', 'Görsel İstem')}
              className={`p-2 border rounded-lg text-left transition-colors flex items-center justify-between ${
                hasPrompt
                  ? 'bg-stone-900 hover:bg-stone-800 border-stone-800 cursor-pointer text-stone-200'
                  : 'bg-stone-950 border-stone-900 opacity-50 cursor-not-allowed text-stone-500'
              }`}
            >
              <span className="text-[11px] truncate">Görsel İstem</span>
              {copiedType === 'visual' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>

            {/* 5. Negatif İstem */}
            <button
              type="button"
              disabled={!hasPrompt}
              onClick={() => hasPrompt && handleCopy(formatNegativePromptText(client, activeDesign), 'negative', 'Negatif İstem')}
              className={`p-2 border rounded-lg text-left transition-colors flex items-center justify-between ${
                hasPrompt
                  ? 'bg-stone-900 hover:bg-stone-800 border-stone-800 cursor-pointer text-stone-200'
                  : 'bg-stone-950 border-stone-900 opacity-50 cursor-not-allowed text-stone-500'
              }`}
            >
              <span className="text-[11px] truncate">Negatif İstem</span>
              {copiedType === 'negative' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>

            {/* 6. Tüm Tasarım Paketi */}
            <button
              type="button"
              onClick={() => handleCopy(formatFullDesignPackageText(client, activeDesign), 'full', 'Tüm Tasarım Paketi')}
              className="p-2 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-600/40 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="text-[11px] font-bold text-amber-300 truncate">Tüm Tasarım Paketi</span>
              {copiedType === 'full' ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                  Kopyalandı
                </span>
              ) : (
                <Copy className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6 AYRI VE OKUNABİLİR TASARIM SONUCU KARTI (A30 Madde 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KART 1: TASARIM ÖZETİ */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">1. Tasarım Özeti</h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-950 border border-stone-800 text-amber-400">
              V{activeDesign.versionNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Danışan Adı</span>
              <span className="font-semibold text-stone-200 block truncate">
                {client.firstName} {client.lastName}
              </span>
            </div>

            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Tasarım Sürümü</span>
              <span className="font-mono font-bold text-amber-400 block">
                V{activeDesign.versionNumber} {isViewingHistoricalVersion ? '(Arşiv)' : '(Güncel)'}
              </span>
            </div>

            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Dövme Stili</span>
              <span className="font-semibold text-amber-300 block truncate">
                {styleMeta.nameTr}
              </span>
            </div>

            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Anatomik Yerleşim</span>
              <span className="font-semibold text-stone-200 block truncate">
                {placementMeta.nameTr}
              </span>
            </div>

            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Ölçüler (G x Y)</span>
              <span className="font-mono text-stone-200 block">
                {recipe.recommendedDimensionsCm.width} cm x {recipe.recommendedDimensionsCm.height} cm
              </span>
            </div>

            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-500 block">Renk Profili</span>
              <span className="font-semibold text-stone-200 block truncate">
                {colorMeta.nameTr}
              </span>
            </div>

            {recipe.comprehensiveReport?.sectionA?.dimensionWarningTr && (
              <div className="col-span-2 p-2.5 bg-amber-950/40 border border-amber-600/60 rounded-lg flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{recipe.comprehensiveReport.sectionA.dimensionWarningTr}</span>
              </div>
            )}

            {recipe.comprehensiveReport?.sectionA && (
              <div className="col-span-2 p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
                  Analiz Modülleri Durumu
                </span>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {recipe.comprehensiveReport.sectionA.completedModules.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300">
                      ✓ {m}
                    </span>
                  ))}
                  {recipe.comprehensiveReport.sectionA.missingModules.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
                      ○ {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KART 2: SEMBOL KOMPOZİSYONU */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">2. Sembol Kompozisyonu</h4>
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Hiyerarşi & Filtreler
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Ana Sembol */}
            <div className="p-3 bg-stone-950/70 border border-amber-950/40 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                Ana Sembol (Merkezi Odak)
              </span>
              <span className="font-semibold text-stone-100 text-xs block">
                {recipe.primarySymbol || 'Kayıt bulunmuyor.'}
              </span>
            </div>

            {/* İkincil Semboller */}
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block">
                İkincil Semboller ({recipe.secondarySymbols?.length || 0})
              </span>
              {recipe.secondarySymbols && recipe.secondarySymbols.length > 0 ? (
                <ul className="space-y-1">
                  {recipe.secondarySymbols.map((s, idx) => (
                    <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-stone-500 italic block">Kayıt bulunmuyor.</span>
              )}
            </div>

            {/* Hariç Tutulan Semboller & Totem Durumu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-mono text-rose-400 font-semibold block">
                  Hariç Tutulanlar
                </span>
                <span className="text-[11px] text-rose-300/90 block">
                  {recipe.excludedElements && recipe.excludedElements.length > 0
                    ? recipe.excludedElements.join(', ')
                    : 'Hariç tutulan sembol bulunmuyor.'}
                </span>
              </div>

              <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                  Totem Görsel Durumu
                </span>
                <span className="text-[11px] text-stone-300 block leading-tight">
                  {recipe.totemAbstractionNotes || 'Totem görsel olarak dahil edilmedi.'}
                </span>
              </div>
            </div>

            {/* A57: Her Sembol İçin 7 Kriterli Gerekçe Listesi */}
            {recipe.comprehensiveReport?.sectionC?.symbols && recipe.comprehensiveReport.sectionC.symbols.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Sembol Gerekçeleri & Katman Analizi (7 Kriter)
                </span>
                <div className="space-y-2">
                  {recipe.comprehensiveReport.sectionC.symbols.map((sym, idx) => {
                    const isExpanded = expandedSymbolIndex === idx;
                    return (
                      <div key={idx} className="p-2.5 bg-stone-950/90 border border-stone-800 rounded-lg space-y-2">
                        <button
                          type="button"
                          onClick={() => setExpandedSymbolIndex(isExpanded ? null : idx)}
                          className="w-full flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-amber-300">
                              {sym.symbolName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-900 border border-stone-800 text-stone-400">
                              {sym.weight === 'PRIMARY' ? 'Merkezi Odak' : 'İkincil / Akış'}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-stone-800/80 text-[11px]">
                            <div>
                              <span className="text-[10px] text-stone-500 block">Kaynak:</span>
                              <span className="text-stone-300">{sym.originAnalysis} ({sym.originValue})</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Kişisel Tema:</span>
                              <span className="text-stone-300">{sym.personalTheme}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Kompozisyondaki Rol:</span>
                              <span className="text-stone-300">{sym.compositionRole}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">İlişkili Sembol:</span>
                              <span className="text-stone-300">{sym.relatedSymbol}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[10px] text-stone-500 block">Görsel İşleniş:</span>
                              <span className="text-stone-300">{sym.visualExecution}</span>
                            </div>
                            <div className="sm:col-span-2 text-rose-300/90 bg-rose-950/20 p-1.5 rounded border border-rose-900/30">
                              <span className="text-[10px] text-rose-400 block font-semibold">Katman Kaybı Riski:</span>
                              <span>{sym.meaningRiskIfRemoved}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kart 2 Sonu: Genel Kopyala */}
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[10px] text-stone-500">Sembol ve Katman Gerekçeleri</span>
              <button
                type="button"
                onClick={() => handleCopy(formatSymbolCompositionText(client, activeDesign), 'symbols', 'Sembol Kompozisyonu')}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Sembol kompozisyonu ve tüm gerekçeleri tek seferde panoya kopyala"
              >
                {copiedType === 'symbols' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedType === 'symbols' ? 'Kopyalandı' : 'Genel Kopyala'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* KART 3: TÜRKÇE KONSEPT / MANİFESTO */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">
                3. Türkçe Konsept / Manifesto
              </h4>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(formatConceptManifestoText(client, activeDesign), 'concept', 'Türkçe Konsept / Manifesto')}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedType === 'concept' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'concept' ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>

          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
              Felsefi ve Ruhsal Konsept Manifestosu
            </span>
            <p className="text-xs text-stone-200 leading-relaxed italic">
              "{activeDesign.conceptStatement || 'Kayıt bulunmuyor.'}"
            </p>
          </div>
        </div>

        {/* KART 4: DÖVME REÇETESİ & KAPSAMLI TASARIM RAPORU */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">
                4. Dövme Reçetesi & Tasarım Raporu
              </h4>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(formatTattooRecipeText(client, activeDesign), 'recipe', 'Dövme Reçetesi')}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedType === 'recipe' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'recipe' ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* B. Kişisel Analizden Tasarıma Geçiş */}
            {recipe.comprehensiveReport?.sectionB && (
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Bölüm B: Analizden Tasarıma Geçiş & Doğrulama
                </span>
                <p className="text-[11px] text-stone-300">
                  {recipe.comprehensiveReport.sectionB.dataVerificationNoteTr}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {recipe.comprehensiveReport.sectionB.thematicKeywords.map((kw, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-amber-300/90 font-mono">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* D. Çakra & Destek Temaları */}
            {recipe.comprehensiveReport?.sectionD && (
              <div className="p-3 bg-stone-950/70 border border-emerald-950/40 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                  Bölüm D: Çakra Destek Temaları
                </span>
                <div className="text-[11px] text-stone-200">
                  <span className="font-semibold text-emerald-300">Destek Çakraları: </span>
                  {recipe.comprehensiveReport.sectionD.selectedChakras.join(', ')}
                </div>
                <p className="text-[11px] text-stone-300">
                  {recipe.comprehensiveReport.sectionD.rationaleTr}
                </p>
                <p className="text-[11px] text-stone-400 italic">
                  {recipe.comprehensiveReport.sectionD.symbolicFormFunctionTr}
                </p>
                <div className="p-2 bg-stone-900/80 border border-stone-800 rounded text-[10px] text-stone-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                  <span>{recipe.comprehensiveReport.sectionD.nonMedicalDisclaimerTr}</span>
                </div>
              </div>
            )}

            {/* E. Arketip ve Gölge Dönüşüm Anlatısı */}
            {recipe.comprehensiveReport?.sectionE && (
              <div className="p-3 bg-stone-950/70 border border-purple-950/40 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-purple-400 font-bold block">
                  Bölüm E: Arketip & Gölge Dönüşüm Anlatısı
                </span>
                <div className="text-[11px] text-stone-200">
                  <span className="font-semibold text-purple-300">Gölge Arketip: </span>
                  {recipe.comprehensiveReport.sectionE.shadowArchetypeNameTr}
                  <span className="mx-1.5 text-stone-600">|</span>
                  <span className="font-semibold text-purple-300">Dönüşüm Sembolü: </span>
                  {recipe.comprehensiveReport.sectionE.transformationSymbolTr}
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed italic bg-purple-950/20 p-2 rounded border border-purple-900/30">
                  "{recipe.comprehensiveReport.sectionE.transformationNarrativeTr}"
                </p>
              </div>
            )}

            {/* F. Totem Entegrasyonu */}
            {recipe.comprehensiveReport?.sectionF && (
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                  Bölüm F: Totem Entegrasyonu
                </span>
                <p className="text-[11px] text-stone-300">
                  {recipe.comprehensiveReport.sectionF.integrationNoteTr}
                </p>
                <p className="text-[10px] text-stone-400">
                  {recipe.comprehensiveReport.sectionF.symbolicGuidanceTr}
                </p>
              </div>
            )}

            {/* G. Bütünsel Kompozisyon & Negatif Alan */}
            {recipe.comprehensiveReport?.sectionG && (
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                    Bölüm G: Bütünsel Kompozisyon & Hiyerarşi
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-900 border border-stone-800 text-stone-300">
                    {recipe.comprehensiveReport.sectionG.negativeSpaceRatioTr}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {recipe.comprehensiveReport.sectionG.centralFocusRationaleTr}
                </p>
                <ul className="space-y-1 pt-1">
                  {recipe.comprehensiveReport.sectionG.holisticIntegrationRules.map((rule, idx) => (
                    <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-stone-500">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* H. Anatomik & Teknik Dövme Talimatları */}
            {recipe.comprehensiveReport?.sectionH && (
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block">
                  Bölüm H: Anatomik & Teknik Uygulama
                </span>
                <p className="text-[11px] text-stone-200 font-medium">
                  {recipe.comprehensiveReport.sectionH.recommendedDimensionsTr}
                </p>
                <p className="text-[10px] text-stone-400">
                  {recipe.comprehensiveReport.sectionH.agingAndLineSpacingTr}
                </p>
              </div>
            )}

            {/* Geriye dönük kurallar (Fallback if no comprehensive report) */}
            {!recipe.comprehensiveReport && recipe.symbolCombinationRules && recipe.symbolCombinationRules.length > 0 && (
              <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Sembol Kombinasyon & Hiyerarşi Kuralları
                </span>
                <ul className="space-y-1">
                  {recipe.symbolCombinationRules.map((r, idx) => (
                    <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-stone-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reçete Sonu: Genel Kopyala */}
            <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[10px] text-stone-500">Tüm 10 Bölümlü Kapsamlı Tasarım Raporu</span>
              <button
                type="button"
                onClick={() => handleCopy(formatTattooRecipeText(client, activeDesign), 'recipe', 'Kapsamlı Tasarım Raporu')}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Dövme reçetesi ve 10 bölümlü kapsamlı tasarım raporunu tek seferde panoya kopyala"
              >
                {copiedType === 'recipe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedType === 'recipe' ? 'Kopyalandı' : 'Genel Kopyala'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* KART 5: SANATÇI TEKNİK TALİMATLARI */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">
                5. Sanatçı Teknik Talimatları
              </h4>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(formatTechnicalAdviceText(client, activeDesign), 'technical', 'Sanatçı Teknik Talimatları')}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedType === 'technical' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'technical' ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* İğne ve Uygulama Tavsiyeleri */}
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                İğne & Teknik Tavsiyeler
              </span>
              {recipe.technicalAdviceForArtist && recipe.technicalAdviceForArtist.length > 0 ? (
                <ul className="space-y-1">
                  {recipe.technicalAdviceForArtist.map((t, idx) => (
                    <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0 font-bold">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-stone-500 italic block">Kayıt bulunmuyor.</span>
              )}
            </div>

            {/* Görsel Yönlendirmeler */}
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block">
                Tasarımcı Görsel Yönlendirmeleri
              </span>
              {recipe.artistVisualDirection && recipe.artistVisualDirection.length > 0 ? (
                <ul className="space-y-1">
                  {recipe.artistVisualDirection.map((v, idx) => (
                    <li key={idx} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-stone-500 shrink-0">•</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-stone-500 italic block">Kayıt bulunmuyor.</span>
              )}
            </div>

            {/* Anatomik Eğrilik */}
            <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold block">
                Anatomik Eğrilik Uyarısı
              </span>
              <p className="text-[11px] text-stone-300">
                {placementMeta.curvatureAdviceTr || 'Kayıt bulunmuyor.'}
              </p>
            </div>
          </div>
        </div>

        {/* KART 6: GÖRSEL ÜRETİM İSTEMİ (AI PROMPT) */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-stone-200">
                6. Görsel Üretim İstemi (Midjourney / Stable Diffusion)
              </h4>
            </div>

            {hasPrompt && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(formatVisualPromptText(client, activeDesign), 'visual', 'Görsel İstem')}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="İngilizce görsel üretim istemini panoya kopyala"
                >
                  {copiedType === 'visual' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'visual' ? 'Kopyalandı' : 'İstemi Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(formatNegativePromptText(client, activeDesign), 'negative', 'Negatif İstem')}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-rose-300 flex items-center gap-1 cursor-pointer"
                  title="Negatif istemi panoya kopyala"
                >
                  {copiedType === 'negative' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'negative' ? 'Kopyalandı' : 'Negatif İstemi Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(formatConceptManifestoText(client, activeDesign), 'concept', 'Türkçe Konsept / Manifesto')}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-[11px] text-cyan-300 flex items-center gap-1 cursor-pointer"
                  title="Türkçe konsept manifestosunu panoya kopyala"
                >
                  {copiedType === 'concept' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'concept' ? 'Kopyalandı' : 'Konsepti Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(formatAllVisualPromptsSectionCopyText(client, archive, activeDesign), 'all-prompts', 'Tüm Görsel İstemler')}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded text-[11px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="İngilizce istem, negatif istem ve Türkçe konsept manifestosunu tek seferde kopyala"
                >
                  {copiedType === 'all-prompts' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  <span>{copiedType === 'all-prompts' ? 'Kopyalandı' : 'Tüm Görsel İstemleri Kopyala'}</span>
                </button>
              </div>
            )}
          </div>

          {!hasPrompt ? (
            <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-lg text-center text-xs text-stone-500">
              Görsel üretim istemi henüz kayıtlı değil. Dövme Tasarımı akışından görsel istem sentezleyebilirsiniz.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {/* Ana İngilizce İstem */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Ana İstem (English Prompt)
                </span>
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg font-mono text-stone-200 text-xs leading-relaxed select-all break-words">
                  {activeDesign.aiPrompt.primaryPromptEn}
                </div>
              </div>

              {/* Negatif İstem */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-rose-400 font-bold block">
                  Negatif İstem (Negative Prompt)
                </span>
                <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-lg font-mono text-rose-300/80 text-[11px] leading-relaxed select-all break-words">
                  {activeDesign.aiPrompt.negativePrompt || 'Kayıt bulunmuyor.'}
                </div>
              </div>

              {/* Teknik Görsel Gereksinimler */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">Aspect Ratio</span>
                  <span className="font-mono text-stone-200 block">
                    --ar {activeDesign.aiPrompt.aspectRatio || '3:4'}
                  </span>
                </div>

                <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">Artistic Modifiers</span>
                  <span className="text-[11px] text-stone-300 block truncate">
                    {activeDesign.aiPrompt.artisticModifiers && activeDesign.aiPrompt.artisticModifiers.length > 0
                      ? activeDesign.aiPrompt.artisticModifiers.join(', ')
                      : 'Standart stil modifiye edicileri'}
                  </span>
                </div>

                <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">Seed / Çekirdek</span>
                  <span className="font-mono text-stone-200 block">
                    {activeDesign.aiPrompt.seed !== undefined ? activeDesign.aiPrompt.seed : 'Deterministik'}
                  </span>
                </div>
              </div>

              {/* Görsel İstemler Sonu: Genel Kopyala */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[10px] text-stone-500">Tüm Görsel İstemler (Prompt & Negatif & Konsept)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatAllVisualPromptsSectionCopyText(client, archive, activeDesign), 'all-prompts', 'Tüm Görsel İstemler')}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="İngilizce istem, negatif istem ve Türkçe konsept manifestosunu tek seferde kopyala"
                >
                  {copiedType === 'all-prompts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedType === 'all-prompts' ? 'Kopyalandı' : 'Genel Kopyala'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
