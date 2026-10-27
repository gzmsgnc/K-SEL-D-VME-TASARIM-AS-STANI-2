import React, { useState } from 'react';
import { Client } from '../../types/client';
import { ClientArchiveRecord } from '../../types/archive';
import {
  Sparkles,
  Compass,
  Hash,
  Flame,
  Crown,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  RotateCw,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import {
  getClientAnalysisChainStatus,
  AnalysisModuleStatus,
  TestModuleStatus,
} from '../../modules/pipeline';
import {
  getAstrologyCardData,
  getNumerologyCardData,
  getChakraCardData,
  getArchetypeCardData,
  getEnneagramCardData,
  getTotemCardData,
} from '../../utils/analysisResultsFormatters';
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
} from '../../utils/clientComprehensiveCopy';

interface ClientAnalysisResultsHubProps {
  client: Client;
  archive: ClientArchiveRecord | null;
  onNavigateToTab: (tab: 'PERSONAL_BIRTH' | 'ANALYSES' | 'TESTS' | 'SYMBOLS' | 'DESIGN' | 'EXPORT') => void;
}

export const ClientAnalysisResultsHub: React.FC<ClientAnalysisResultsHubProps> = ({
  client,
  archive,
  onNavigateToTab,
}) => {
  const [copiedCardKey, setCopiedCardKey] = useState<string | null>(null);
  const [copiedFeedbackMessage, setCopiedFeedbackMessage] = useState<string | null>(null);

  // 6 Ayrı Sonuç Kartı Verisi (Yalnızca aktif danışanın kayıtlarından)
  const astroData = getAstrologyCardData(client, archive);
  const numData = getNumerologyCardData(client, archive);
  const chakraData = getChakraCardData(client, archive);
  const archetypeData = getArchetypeCardData(client, archive);
  const enneagramData = getEnneagramCardData(client, archive);
  const totemData = getTotemCardData(client, archive);

  const totalResultsCount = 6;
  const recordedCount = [
    astroData.hasRecord,
    numData.hasRecord,
    chakraData.hasRecord,
    archetypeData.hasRecord,
    enneagramData.hasRecord,
    totemData.hasRecord,
  ].filter(Boolean).length;

  const handleCopyCard = (key: string, text: string, title: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedCardKey(key);
      setCopiedFeedbackMessage(`${title} sonucu panoya kopyalandı.`);
      setTimeout(() => {
        setCopiedCardKey(null);
        setCopiedFeedbackMessage(null);
      }, 2500);
    } catch {
      setCopiedFeedbackMessage('Kopyalama işlemi gerçekleştirilemedi.');
      setTimeout(() => setCopiedFeedbackMessage(null), 2500);
    }
  };

  const { runAutoAnalysisForClient, lastChainResult } = useApp();
  const [isReRunning, setIsReRunning] = useState(false);
  const [chainActionFeedback, setChainActionFeedback] = useState<string | null>(null);

  const chainReport = getClientAnalysisChainStatus(client, archive, lastChainResult);

  const handleReRunChain = () => {
    setIsReRunning(true);
    setChainActionFeedback(null);
    try {
      const res = runAutoAnalysisForClient(client);
      if (res.errors.length === 0) {
        setChainActionFeedback('Otomatik analiz zinciri başarıyla yenilendi.');
      } else {
        setChainActionFeedback('Zincir tamamlandı; bazı adımlarda eksik veri veya uyarı mevcut.');
      }
      setTimeout(() => setChainActionFeedback(null), 3500);
    } catch {
      setChainActionFeedback('Zincir çalıştırılırken bir aksaklık oluştu.');
      setTimeout(() => setChainActionFeedback(null), 3500);
    } finally {
      setIsReRunning(false);
    }
  };

  const getStatusBadgeClass = (status: AnalysisModuleStatus | TestModuleStatus) => {
    switch (status) {
      case 'Tamamlandı':
      case 'Test tamamlandı':
        return 'bg-emerald-950/70 border-emerald-800 text-emerald-300';
      case 'Hazırlanıyor':
        return 'bg-sky-950/70 border-sky-800 text-sky-300';
      case 'Eksik veri':
      case 'Test hazır':
        return 'bg-amber-950/70 border-amber-800 text-amber-300';
      case 'Hata':
        return 'bg-rose-950/70 border-rose-800 text-rose-300';
      case 'Kayıt bulunmuyor':
      case 'Test eksik':
      default:
        return 'bg-stone-900 border-stone-800 text-stone-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Üst Bilgi Başlığı ve Durum Barı */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-stone-100">
                  Analiz Sonuçları Merkezi
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Aşama 28 & 37 (A37)
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {client.firstName} {client.lastName} ({client.id}) için kayıtlı tüm analiz, test ve arketip sonuçları tek bir alanda.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            <span
              className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
                recordedCount === totalResultsCount
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : recordedCount > 0
                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              {recordedCount} / {totalResultsCount} Modül Kayıtlı
            </span>

            <CopyButton
              textToCopy={() => formatClientPersonalInfoCopyText(client)}
              label="Genel Kopyala (Danışan)"
              variant="subtle"
              size="sm"
              title="Danışanın kimlik ve iletişim bilgilerini panoya kopyalar"
            />

            <CopyButton
              textToCopy={() => formatBirthInfoSectionCopyText(client, archive)}
              label="Genel Kopyala (Doğum & Harita)"
              variant="subtle"
              size="sm"
              title="Danışanın doğum ve astroloji temel parametrelerini panoya kopyalar"
            />

            <CopyButton
              textToCopy={() => formatFullClientAnalysisCopyText(client, archive)}
              label="TÜM DANIŞAN DOSYASINI KOPYALA"
              variant="gold"
              size="sm"
              title="Danışanın tüm kayıtlı analiz, test ve dövme tasarım sonuçlarını tek metin halinde panoya kopyalar"
            />
          </div>
        </div>

        {/* Bilgilendirme Notu & Güvenlik Beyanı */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Veriler yalnızca seçili danışanın kalıcı arşivinden okunmaktadır. Kayıt bulunmayan bölümlerde varsayılan veya sahte veri üretilmez.
            </span>
          </div>
          {copiedFeedbackMessage && (
            <span className="text-emerald-400 font-medium shrink-0 animate-in fade-in duration-200">
              ✓ {copiedFeedbackMessage}
            </span>
          )}
        </div>
      </div>

      {/* A37: OTOMATİK ANALİZ ZİNCİRİ DURUM VE HATA YÖNETİMİ PANELİ */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-stone-100">
                  Otomatik Analiz Zinciri Durum Paneli
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                  A37
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Danışan kaydı sonrasında hesaplanan 4 ana motor ve bekleyen testlerin gerçek kayıt durumları.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <span
              className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${
                chainReport.completedAnalysesCount === 4
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : chainReport.completedAnalysesCount > 0
                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              {chainReport.completedAnalysesCount} / 4 Analiz Hazır
            </span>

            <button
              type="button"
              onClick={handleReRunChain}
              disabled={isReRunning}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Aynı danışan için otomatik analiz motorlarını tekrar çalıştır (Veri çoğalması yapmaz)"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isReRunning ? 'Hesaplanıyor...' : 'Zinciri Yeniden Çalıştır'}</span>
            </button>
          </div>
        </div>

        {/* Aksiyon geri bildirimi */}
        {chainActionFeedback && (
          <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-amber-300 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{chainActionFeedback}</span>
          </div>
        )}

        {/* Gerçek Hata Uyarısı (Teknik stack trace asla gösterilmez, sade Türkçe durum aktarılır) */}
        {chainReport.hasErrors && (
          <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Analiz Zincirinde Hata Tespit Edildi</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-rose-200/90 pl-1 space-y-0.5">
              {chainReport.userFacingErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
            <div className="text-[10px] text-stone-400 pt-1 border-t border-rose-900/40">
              Not: Hata veren modül diğer başarılı analizleri etkilemez ve mevcut arşiv verileri bozulmadan korunur.
            </div>
          </div>
        )}

        {/* 4 Otomatik Analiz Modülü Durum Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Numeroloji */}
          <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-200 truncate">1. Numeroloji</span>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(
                    chainReport.modules.numerology.status
                  )}`}
                >
                  {chainReport.modules.numerology.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug">
                {chainReport.modules.numerology.messageTr}
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 font-mono">Yaşam Yolu & Kader</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('ANALYSES')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detay</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 2. Astroloji */}
          <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-200 truncate">2. Astroloji</span>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(
                    chainReport.modules.astrology.status
                  )}`}
                >
                  {chainReport.modules.astrology.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug">
                {chainReport.modules.astrology.messageTr}
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 font-mono">Tropical Doğum Haritası</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('ANALYSES')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detay</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 3. Çakra */}
          <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-200 truncate">3. Çakra</span>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(
                    chainReport.modules.chakra.status
                  )}`}
                >
                  {chainReport.modules.chakra.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug">
                {chainReport.modules.chakra.messageTr}
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 font-mono">7 Temel Enerji Merkezi</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('ANALYSES')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detay</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 4. Arketip */}
          <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-200 truncate">4. Arketip</span>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(
                    chainReport.modules.archetype.status
                  )}`}
                >
                  {chainReport.modules.archetype.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug">
                {chainReport.modules.archetype.messageTr}
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 font-mono">Birleşik & Gölge</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('ANALYSES')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detay</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enneagram ve Totem Test Durumu (Otomatik doldurulmaz, yanıtları bekler) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-800/80">
          {/* Enneagram */}
          <div className="p-3 rounded-lg bg-stone-950/40 border border-stone-800/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-200">Enneagram Testi</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getStatusBadgeClass(
                    chainReport.tests.enneagram.status
                  )}`}
                >
                  {chainReport.tests.enneagram.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {chainReport.tests.enneagram.messageTr}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('TESTS')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 cursor-pointer"
            >
              Teste Git
            </button>
          </div>

          {/* Totem */}
          <div className="p-3 rounded-lg bg-stone-950/40 border border-stone-800/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-200">Hayvan Totemi Testi</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getStatusBadgeClass(
                    chainReport.tests.totem.status
                  )}`}
                >
                  {chainReport.tests.totem.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {chainReport.tests.totem.messageTr}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('TESTS')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 cursor-pointer"
            >
              Teste Git
            </button>
          </div>
        </div>

        {/* A42: Dövme Reçetesi & Görsel İstem Durumu */}
        {chainReport.design && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-200">Dövme Reçetesi & Görsel İstem (A15 & A16)</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadgeClass(
                    chainReport.design.status === 'Hazır' ? 'Tamamlandı' : chainReport.design.status === 'Hata' ? 'Hata' : 'Eksik veri'
                  )}`}
                >
                  {chainReport.design.status}
                </span>
                {chainReport.design.versionCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {chainReport.design.versionCount} Versiyon
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                {chainReport.design.messageTr}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {chainReport.design.status === 'Hazır' && (
                <>
                  <CopyButton
                    textToCopy={() => formatRecipeSectionCopyText(client, archive)}
                    label="Genel Kopyala (Reçete)"
                    variant="subtle"
                    size="sm"
                    title="Dövme reçetesini panoya kopyala"
                  />
                  <CopyButton
                    textToCopy={() => formatAllVisualPromptsSectionCopyText(client, archive)}
                    label="Genel Kopyala (İstemler)"
                    variant="subtle"
                    size="sm"
                    title="A16 görsel istem, negatif istem ve konsept manifestosunu panoya kopyala"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => onNavigateToTab('DESIGN')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-900 shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>Tasarımı Gör</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Alt Bilgi Koruması */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500 pt-1">
          <span>
            ✨ A42 Tam Otomatik Akış: Danışan kaydıyla birlikte Numeroloji, Astroloji, Çakra, Arketip, A15 Dövme Reçetesi ve A16 Görsel İstemi otomatik hazırlanır.
          </span>
          <span>
            Enneagram ve Totem testleri danışan yanıtlarını bekler; sahte cevap uydurulmaz.
          </span>
        </div>
      </div>

      {/* 2. ALTI AYRI SONUÇ KARTI (GRID DÜZENİ) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KART 1: ASTROLOJİ */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    1. Batı / Tropical Astroloji
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    Güneş, Ay, Yükselen & 10 Gök Cismi
                  </span>
                </div>
              </div>

              {astroData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {astroData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* Güneş, Ay, Yükselen */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Güneş Burcu</span>
                    <span className="font-semibold text-amber-300">{astroData.sunSignTr}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Ay Burcu</span>
                    <span className="font-semibold text-cyan-300">{astroData.moonSignTr}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Yükselen Burç</span>
                    <span className={`font-semibold ${astroData.ascendantSignTr ? 'text-violet-300' : 'text-stone-500'}`}>
                      {astroData.formattedAscendantTr || astroData.ascendantSignTr || (astroData.isBirthTimeKnown ? 'Hesaplanamadı' : 'Hesaplanmadı (12:00 Referansı)')}
                    </span>
                  </div>
                </div>

                {!astroData.isBirthTimeKnown && (
                  <div className="p-2 bg-amber-950/20 border border-amber-900/30 rounded text-[11px] text-amber-300/80">
                    {astroData.risingNoteTr}
                  </div>
                )}

                {/* Gezegenler Dökümü (Kompakt Grid) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-stone-400 block">
                    Gök Cismi Konumları:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {astroData.planetaryPositions?.map((p) => (
                      <div
                        key={p.body}
                        className="p-1.5 bg-stone-950/50 border border-stone-800/60 rounded flex items-center justify-between text-[11px]"
                      >
                        <span className="text-stone-300 font-medium">{p.body}</span>
                        <span className="text-stone-400 font-mono text-[10px]">
                          {p.signTr} {p.degree}° {p.houseNumber ? `(E${p.houseNumber})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-stone-400">
                  Astroloji analizi henüz kayıtlı değil. Kayıt bulunmuyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('ANALYSES')}
                  className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Astrolojiye Git</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Kart Alt Aksiyonları */}
          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {astroData.hasRecord ? 'Tropical Zodyak / Placidus' : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatAstrologySectionCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="Batı / Tropical Astroloji analizini kopyala"
            />
          </div>
        </div>

        {/* KART 2: NUMEROLOJİ */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    2. Pisagor & İbrani Numerolojisi
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    Yaşam Yolu, Kader, Ruh Arzusu & Karmik Dersler
                  </span>
                </div>
              </div>

              {numData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {numData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* 6 Temel Sayı Matrisi */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Yaşam Yolu</span>
                    <span className="font-mono font-bold text-base text-amber-400">{numData.lifePathNumber}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Kader / İsim</span>
                    <span className="font-mono font-bold text-base text-cyan-400">{numData.destinyNumber}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Ruh Güdüsü</span>
                    <span className="font-mono font-bold text-base text-violet-400">{numData.soulUrgeNumber}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Kişilik Sayısı</span>
                    <span className="font-mono font-semibold text-stone-200">{numData.personalityNumber}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Doğum Günü</span>
                    <span className="font-mono font-semibold text-stone-200">{numData.birthdayNumber}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Dünya Görevi</span>
                    <span className="font-mono font-semibold text-stone-200">{numData.worldMissionNumber}</span>
                  </div>
                </div>

                {/* Açıklama ve Karmik Dersler */}
                <div className="p-2.5 bg-stone-950/50 border border-stone-800/70 rounded-lg space-y-1">
                  <div className="text-[11px] text-stone-300 leading-relaxed">
                    {numData.resonanceSummaryTr}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                    <span className="text-stone-500">Karmik Dersler:</span>
                    <span className="text-stone-300 font-mono">
                      {numData.karmicLessons && numData.karmicLessons.length > 0 ? numData.karmicLessons.join(', ') : 'Karmik borç bulunmuyor'}
                    </span>
                    {numData.masterNumbers && numData.masterNumbers.length > 0 && (
                      <span className="text-amber-400 font-mono bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-900/50">
                        Ana Sayı: {numData.masterNumbers.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-stone-400">
                  Numeroloji sonucu henüz kayıtlı değil. Kayıt bulunmuyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('ANALYSES')}
                  className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Numerolojiye Git</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {numData.hasRecord ? 'Pisagor Matrisi' : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatNumerologySectionCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="Numeroloji analizini kopyala"
            />
          </div>
        </div>

        {/* KART 3: ÇAKRA */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    3. Çakra Analizi & Enerji Dengesi
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    7 Enerji Merkezi, Baskın Akış & Blokaj Tespiti
                  </span>
                </div>
              </div>

              {chakraData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {chakraData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* Baskın ve Öncelikli Destek */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 bg-stone-950/80 border border-cyan-900/40 rounded-lg">
                    <span className="text-[10px] text-stone-400 block mb-0.5 font-medium">Baskın Çakra (En Yüksek Akış)</span>
                    <span className="font-semibold text-cyan-300 block">{chakraData.dominantChakraTr || 'Dengeli'}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/80 border border-amber-900/50 rounded-lg">
                    <span className="text-[10px] text-amber-300/80 block mb-0.5 font-medium">
                      {chakraData.deficitChakras && chakraData.deficitChakras.length > 1
                        ? 'Öncelikli Destek / Blokajlar'
                        : 'Öncelikli Destek / Blokaj'}
                    </span>
                    <span className="font-semibold text-amber-400 break-words block">{chakraData.primaryDeficitTr || 'Destek İhtiyacı Yok (Dengeli)'}</span>
                  </div>
                </div>

                {/* 7 Çakranın Puan ve Durum Dağılımı */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-stone-400 block">
                    7 Çakra Puan ve Durumu:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {chakraData.chakras?.map((c) => (
                      <div
                        key={c.chakra}
                        className="p-1.5 bg-stone-950/50 border border-stone-800/60 rounded flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.colorHex }}
                          />
                          <span className="text-stone-300 truncate">{c.nameTr}</span>
                        </div>
                        <span className="font-mono text-stone-400 text-[10px] shrink-0">
                          {c.score}/10 · {c.statusTr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-stone-400">
                  Çakra analizi henüz kayıtlı değil. Kayıt bulunmuyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('ANALYSES')}
                  className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Çakraya Git</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {chakraData.hasRecord ? '7 Çakra Rezonansı' : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatChakraSectionCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="7 Temel Çakra analizini kopyala"
            />
          </div>
        </div>

        {/* KART 4: BİRLEŞİK ARKETİP */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    4. Birleşik & Gölge Arketip
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    Işık Tezahürü, Gölge Dinamikleri & Dönüştürücü Sembol
                  </span>
                </div>
              </div>

              {archetypeData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {archetypeData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* Ana ve İkincil Arketip */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Ana Arketip</span>
                    <span className="font-semibold text-amber-300 text-sm">{archetypeData.primaryArchetype}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">İkincil Arketip</span>
                    <span className="font-semibold text-stone-200">{archetypeData.secondaryArchetype || 'Tamamlayıcı'}</span>
                  </div>
                </div>

                {/* Gölge Arketip & Dönüştürücü Sembol */}
                <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">Gölge Arketip:</span>
                    <span className="font-semibold text-rose-300">{archetypeData.shadowArchetype}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-900/30">
                    <span className="text-stone-400">Dönüştürücü Sembol:</span>
                    <span className="font-semibold text-amber-300">{archetypeData.transformationalSymbol}</span>
                  </div>
                </div>

                {/* Açıklama */}
                <p className="text-[11px] text-stone-300 leading-relaxed italic bg-stone-950/40 p-2.5 rounded-lg border border-stone-800/60">
                  "{archetypeData.archetypeDescriptionTr}"
                </p>
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-stone-400">
                  Arketip analizi henüz kayıtlı değil. Kayıt bulunmuyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('TESTS')}
                  className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Arketiplere Git</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {archetypeData.hasRecord ? 'Jung Arketip Modeli' : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatArchetypeSectionCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="Birleşik ve Gölge Arketip analizini kopyala"
            />
          </div>
        </div>

        {/* KART 5: ENNEAGRAM MİZAÇ */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    5. Enneagram Mizaç Testi
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    9 Kişilik Tipi, Kanat Eğilimi & Puan Dağılımı
                  </span>
                </div>
              </div>

              {enneagramData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {enneagramData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* Baskın Tip ve Kanat */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Baskın Tip</span>
                    <span className="font-semibold text-amber-400 text-sm">{enneagramData.primaryType}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Kanat Eğilimi</span>
                    <span className="font-semibold text-cyan-300">{enneagramData.wingType}</span>
                  </div>
                </div>

                {/* Puan Dağılımı (Kompakt Chips) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-stone-400 block">
                    Tip Puanları:
                  </span>
                  <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto pr-1">
                    {enneagramData.dominantScores &&
                      Object.entries(enneagramData.dominantScores).map(([tip, score]) => (
                        <div
                          key={tip}
                          className="p-1 bg-stone-950/50 border border-stone-800/60 rounded text-center text-[10px]"
                        >
                          <span className="text-stone-400 truncate block">{tip.replace('Tip ', 'T')}</span>
                          <span className="font-mono text-stone-200 font-semibold">{score}p</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Yorumlar */}
                {enneagramData.interpretations && enneagramData.interpretations.length > 0 && (
                  <div className="p-2.5 bg-stone-950/50 border border-stone-800/70 rounded-lg space-y-1">
                    <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider block">Mizaç Yorumu:</span>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {enneagramData.interpretations[0]}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-amber-400/90 font-medium">
                  Bu adım henüz tamamlanmadı: Enneagram testi kullanıcı tarafından cevaplanmayı bekliyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('TESTS')}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Enneagram Testini Cevapla</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {enneagramData.hasRecord ? `Sürüm V${enneagramData.version || 1}` : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatEnneagramDetailedCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="15 soru, danışanın cevapları ve Enneagram sonucunu kopyala"
            />
          </div>
        </div>

        {/* KART 6: HAYVAN TOTEMİ */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    6. Hayvan Totemi Testi
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    Ana Ruh Hayvanı, Elementi & Kişisel Rehberlik
                  </span>
                </div>
              </div>

              {totemData.hasRecord ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Kayıtlı</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-950 border border-stone-800 text-stone-500">
                  Kayıt bulunmuyor
                </span>
              )}
            </div>

            {totemData.hasRecord ? (
              <div className="space-y-3 text-xs">
                {/* Ana ve İkincil Totem */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Ana Ruh Hayvanı</span>
                    <span className="font-semibold text-amber-400 text-sm">{totemData.primaryType}</span>
                  </div>
                  <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg">
                    <span className="text-[10px] text-stone-500 block mb-0.5">Element & Rehber</span>
                    <span className="font-semibold text-emerald-300">{totemData.elementTr}</span>
                  </div>
                </div>

                {/* Ruhani Anlam ve Kural 18 Hatırlatması */}
                <div className="p-2.5 bg-stone-950/50 border border-stone-800/70 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">Tamamlayıcı:</span>
                    <span className="font-medium text-stone-200">{totemData.secondaryType}</span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed pt-1 border-t border-stone-800/60">
                    {totemData.spiritualMeaningTr}
                  </p>
                </div>

                {/* Yorumlar */}
                {totemData.interpretations && totemData.interpretations.length > 0 && (
                  <p className="text-[11px] text-stone-400 italic bg-stone-950/30 p-2 rounded border border-stone-800/50">
                    "{totemData.interpretations[0]}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg text-center space-y-2">
                <p className="text-xs text-amber-400/90 font-medium">
                  Bu adım henüz tamamlanmadı: Hayvan Totemi testi kullanıcı tarafından cevaplanmayı bekliyor.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('TESTS')}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Totem Testini Cevapla</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {totemData.hasRecord ? `Sürüm V${totemData.version || 1}` : 'Veri Yok'}
            </span>
            <CopyButton
              textToCopy={() => formatTotemDetailedCopyText(client, archive)}
              label="Genel Kopyala"
              variant="outline"
              size="sm"
              title="10 soru, danışanın cevapları ve Hayvan Totemi sonucunu kopyala"
            />
          </div>
        </div>
      </div>

      {/* 3. DÖVME TASARIMINA GEÇİŞ VE İŞ AKIŞI KÖPRÜSÜ (A40) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                <span>Dövme Tasarım Alanına Geçiş & İlerleme Rehberi</span>
              </h4>
              <p className="text-xs text-stone-400">
                Analiz sonuçlarından kişiye özel dövme reçetesine (A15) ve görsel isteme (A16) kesintisiz geçiş.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${
                numData.hasRecord && chakraData.hasRecord && archetypeData.hasRecord
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-800 text-amber-300'
              }`}
            >
              {numData.hasRecord && chakraData.hasRecord && archetypeData.hasRecord
                ? 'Tasarım Ön Koşulları Tamamlandı'
                : 'Ön Koşul Analizleri Bekleniyor'}
            </span>
          </div>
        </div>

        {/* Test Durumu Kontrolü & Eksik Uyarısı */}
        {(!enneagramData.hasRecord || !totemData.hasRecord) && (
          <div className="p-3.5 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Bu adım henüz tamamlanmadı: Testler kullanıcı yanıtlarını bekliyor.</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              Enneagram ve Hayvan Totemi testleri otomatik cevaplanmaz. Dövme reçetesinde zengin psikolojik mizaç ve ruh hayvanı sembolizmi için testleri yanıtlayabilirsiniz.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!enneagramData.hasRecord && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('TESTS')}
                  className="px-3 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Enneagram Testini Çöz</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {!totemData.hasRecord && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('TESTS')}
                  className="px-3 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Hayvan Totemi Testini Çöz</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dövme Tasarım Alanına Geçiş Eylemleri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-stone-400">
            Dövme Tasarım Alanında anatomik yerleşim, özel ölçü (cm), renk profili ve ezoterik sembol seçimi adımlarını uygulayabilirsiniz.
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateToTab('EXPORT')}
              className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Danışan Dosyasını Dışa Aktar</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('DESIGN')}
              className="px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950/30 cursor-pointer"
            >
              <span>Dövme Tasarım Alanına Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
