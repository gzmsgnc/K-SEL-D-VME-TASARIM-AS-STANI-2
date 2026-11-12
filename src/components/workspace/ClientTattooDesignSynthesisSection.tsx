import React, { useState, useMemo } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import { ClientTattooDesign } from '../../types/design';
import { useApp } from '../../store/AppContext';
import { generateUnifiedVisualPrompt, VisualPromptOutput } from '../../modules/symbols';
import { ClientTattooDesignResultHub } from './ClientTattooDesignResultHub';
import { CopyButton } from '../common/CopyButton';
import {
  formatAllVisualPromptsSectionCopyText,
  formatRecipeSectionCopyText,
} from '../../utils/clientComprehensiveCopy';
import {
  Palette,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  RotateCw,
  FileText,
  Info,
  Wand2,
} from 'lucide-react';

interface ClientTattooDesignSynthesisSectionProps {
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

export const ClientTattooDesignSynthesisSection: React.FC<ClientTattooDesignSynthesisSectionProps> = ({
  client,
  archive,
  onNavigateToTab,
  selectedSymbolItems = [],
}) => {
  const { saveClientDesign } = useApp();

  // Danışana ait güncel tasarım
  const clientDesigns = useMemo(() => {
    if (!archive?.designs) return [];
    return archive.designs
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [archive, client.id]);

  const activeDesign: ClientTattooDesign | null = clientDesigns[0] || null;

  const [promptLoading, setPromptLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null);

  // 10 Adımlı Görsel Tasarım İstemi Sentezleme
  const handleSynthesizePrompt = () => {
    if (!activeDesign?.recipe) {
      setFeedback({
        type: 'error',
        message: 'Görsel istem sentezlemek için önce Dövme Reçetesi oluşturulmalıdır.',
      });
      return;
    }

    setPromptLoading(true);
    setFeedback(null);

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

      // Tasarımı güncelle ve kaydet (Tekil güncel tasarım ilkesi)
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
        setFeedback({
          type: 'warning',
          message: 'Görsel Tasarım İstemi sentezlendi ancak veriler yalnızca oturum belleğinde saklandı (sayfa yenilenirse kaybolabilir).',
        });
      } else {
        setFeedback({
          type: 'success',
          message: '10 Adımlı Görsel Tasarım İstemi ve Negatif Kalkan başarıyla sentezlendi.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'İstem sentezlenirken hata oluştu.',
      });
    } finally {
      setPromptLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Reçete Henüz Oluşturulmamışsa
  if (!activeDesign?.recipe) {
    return (
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-8 sm:p-12 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Palette className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-stone-200">
            Dövme Reçetesi Henüz Oluşturulmadı
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed">
            Görsel tasarım istemi (Midjourney AI promptu) sentezlemek ve 10 bölümlü nihai dövme raporunu üretmek için lütfen önce Dövme Reçetesi bölümünden stil ve yerleşim reçetesini oluşturunuz.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('RECIPE')}
            className="px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-amber-900/20"
          >
            <FileText className="w-4 h-4" />
            <span>Dövme Reçetesine Git</span>
          </button>
        </div>
      </div>
    );
  }

  const promptData = activeDesign.aiPrompt;

  return (
    <div className="space-y-6">
      {/* 1. Görsel Tasarım İstemi Sentezleme Kartı */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                Görsel Tasarım & AI İstemi (Midjourney / Stable Diffusion)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Reçetedeki stil, anatomik yerleşim, %65 odak ve sembol hiyerarşisine dayalı 10 adımlı görsel üretim istemi.
              </p>
            </div>
          </div>

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
        </div>

        {/* Geri Bildirim */}
        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
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

        {/* Sentezlenen İstem Gösterimi */}
        {promptData?.primaryPromptEn ? (
          <div className="space-y-4 pt-1">
            {/* İngilizce Master Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-stone-400 font-semibold">
                  İngilizce Görsel Üretim İstemi (Primary Prompt)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(promptData.primaryPromptEn)}
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

      {/* 2. 10 Bölümlü Kapsamlı Rapor Hub'ı */}
      <ClientTattooDesignResultHub
        client={client}
        archive={archive}
        onNavigateToTab={(tab) => {
          if (tab === 'CLIENT_INFO') onNavigateToTab('PERSONAL_BIRTH');
          else onNavigateToTab(tab as any);
        }}
      />

      {/* 3. Alt Navigasyon Barı: Geri ve Başa Dön */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={() => onNavigateToTab('RECIPE')}
          className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri: Dövme Reçetesi</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('PERSONAL_BIRTH')}
          className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          <span>Başa Dön: Danışanlar</span>
        </button>
      </div>
    </div>
  );
};
