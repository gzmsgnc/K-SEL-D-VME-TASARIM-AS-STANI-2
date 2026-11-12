import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import {
  MASTER_SYMBOLS,
  ALL_MASTER_SYMBOLS,
  SYMBOL_CATEGORIES_METADATA,
  SymbolDefinition,
  GeometryType,
  getClientRecommendedSymbols,
  evaluateSymbolRationale,
  evaluateCrossSymbolHarmony,
  getDesignRoleDescription,
} from '../../modules/symbols';
import {
  Search,
  Shapes,
  Sparkles,
  User,
  ArrowRight,
  Filter,
  Info,
  X,
  Compass,
  CheckCircle2,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

export const SymbolLibraryCatalog: React.FC = () => {
  const { activeClient, activeClientArchive, navigateToClient } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GeometryType | 'ALL'>('ALL');
  const [inspectSymbol, setInspectSymbol] = useState<SymbolDefinition | null>(null);

  // Aşama 5.2.2: Sembol Gerekçeleri ve Kompozisyon Uyum Raporu Açılır/Kapanır Durumları
  const [showHarmonyReport, setShowHarmonyReport] = useState(false);
  const [expandedRationaleIds, setExpandedRationaleIds] = useState<Record<string, boolean>>({});
  const toggleRationale = (id: string) => {
    setExpandedRationaleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Aşama 5.2.1: Aktif danışan varsa analiz çıktılarına göre akıllı sembol önerileri
  const recommendedSymbolsList = useMemo(() => {
    if (!activeClient || !activeClientArchive) return [];
    return getClientRecommendedSymbols(activeClient, activeClientArchive, {
      includeTotemInVisual: false,
    });
  }, [activeClient, activeClientArchive]);

  const recommendedSymbolMap = useMemo(() => {
    const map = new Map<string, (typeof recommendedSymbolsList)[0]>();
    for (const rec of recommendedSymbolsList) {
      map.set(rec.symbol.id, rec);
    }
    return map;
  }, [recommendedSymbolsList]);

  // Aşama 5.2.2: Semboller arası kompozisyonel uyum ve sinerji değerlendirmesi
  const crossSymbolHarmonyReport = useMemo(() => {
    return evaluateCrossSymbolHarmony(recommendedSymbolsList);
  }, [recommendedSymbolsList]);

  // Sembolleri ara ve filtrele
  const filteredSymbols = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return ALL_MASTER_SYMBOLS.filter((sym) => {
      // Kategori filtresi
      if (selectedCategory !== 'ALL' && sym.geometryType !== selectedCategory) {
        return false;
      }

      // Arama filtresi
      if (!term) return true;

      const nameMatch = sym.name.toLowerCase().includes(term);
      const origMatch = (sym.originalName || '').toLowerCase().includes(term);
      const cultureMatch = (sym.originCulture || '').toLowerCase().includes(term);
      const meaningMatch = (sym.meaning || '').toLowerCase().includes(term);
      const tradMatch = (sym.traditionalMeaningTr || '').toLowerCase().includes(term);
      const esoMatch = (sym.esotericMeaningTr || '').toLowerCase().includes(term);
      const elementMatch = (sym.elementAssociation || '').toLowerCase().includes(term);
      const keywordsMatch = (sym.keywords || []).some((k) => k.toLowerCase().includes(term));

      return (
        nameMatch ||
        origMatch ||
        cultureMatch ||
        meaningMatch ||
        tradMatch ||
        esoMatch ||
        elementMatch ||
        keywordsMatch
      );
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* 1. Üst Başlık ve Tanıtım */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400">
            <Shapes className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Kadim & Evrensel Sembol Arşivi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-100">
            Master Sembol Kütüphanesi
          </h1>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            5 geometrik kategoride, derin kültürel kökenlere, elementlere ve dövme uygulama standartlarına sahip 26 kutsal sembol koleksiyonu.
          </p>
        </div>

        {/* Aktif Danışan Varsa Bağlantı Banner'ı */}
        {activeClient && (
          <div className="bg-stone-950/80 border border-emerald-800/40 rounded-xl p-3.5 space-y-2 shrink-0 max-w-xs">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <User className="w-3.5 h-3.5" />
              <span>Aktif Danışan: {activeClient.firstName} {activeClient.lastName}</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {recommendedSymbolsList.length > 0 ? (
                <>
                  Danışanın analizleriyle eşleşen <strong className="text-emerald-300">{recommendedSymbolsList.length} sembol</strong> yeşil çerçeve ve rozet ile vurgulanmıştır.
                </>
              ) : (
                'Danışanın analizlerine göre sembol önerilerini inceleyebilir veya çalışma alanına geçebilirsiniz.'
              )}
            </p>
            <button
              type="button"
              onClick={() => navigateToClient(activeClient.id, 'SYMBOLS')}
              className="w-full py-1.5 px-3 text-xs font-semibold text-stone-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Danışanın Sembol Seçimine Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Aşama 5.2.2: Aktif Danışan Varsa Semboller Arası Kompozisyon ve Uyum Raporu */}
      {activeClient && recommendedSymbolsList.length > 0 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-stone-200">
                Aktif Danışan İçin Kompozisyon ve Tasarım Uyumu ({crossSymbolHarmonyReport.symbolCount} Öneri)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowHarmonyReport(!showHarmonyReport)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showHarmonyReport
                  ? 'bg-amber-400 text-stone-950 border-amber-400 font-semibold shadow-sm'
                  : 'bg-stone-950 text-stone-300 hover:text-white border-stone-800 hover:border-amber-500/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Kompozisyon & Uyum Raporunu {showHarmonyReport ? 'Gizle' : 'İncele'}</span>
              {showHarmonyReport ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showHarmonyReport && (
            <div className="p-4 bg-stone-950/90 border border-stone-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
                <span className="text-xs font-semibold text-stone-200">
                  Önerilen Semboller Arası Kompozisyon ve Tasarım Uyumu
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    crossSymbolHarmonyReport.overallRating === 'EXCELLENT'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                      : crossSymbolHarmonyReport.overallRating === 'BALANCED'
                        ? 'bg-sky-950/90 text-sky-300 border-sky-500/50'
                        : crossSymbolHarmonyReport.overallRating === 'COMPLEX'
                          ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                          : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                  }`}
                >
                  {crossSymbolHarmonyReport.overallRatingLabelTr}
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {crossSymbolHarmonyReport.overallSummaryTr}
              </p>

              {/* 4 Boyutlu Uyum Değerlendirmesi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400/90 font-semibold block">
                    Element Etkileşimi & Dengesi
                  </span>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {crossSymbolHarmonyReport.elementalInterplayTr}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400/90 font-semibold block">
                    Geometrik Biçim & Çizgi Uyumu
                  </span>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {crossSymbolHarmonyReport.geometricInterplayTr}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400/90 font-semibold block">
                    İğne ve Uygulama Tekniği
                  </span>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {crossSymbolHarmonyReport.needleStyleSynergyTr}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400/90 font-semibold block">
                    Görsel Baskınlık & Hiyerarşi
                  </span>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {crossSymbolHarmonyReport.hierarchyEvaluationTr}
                  </p>
                </div>
              </div>

              {/* Uyarılar ve Tasarım Riskleri (Varsa) */}
              {crossSymbolHarmonyReport.warningsAndCautions.length > 0 && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tasarım Uyarısı & Hiyerarşik Denge Notu</span>
                  </div>
                  {crossSymbolHarmonyReport.warningsAndCautions.map((warn, wIdx) => (
                    <p key={wIdx} className="text-[11px] text-rose-200/90 leading-relaxed">
                      • {warn}
                    </p>
                  ))}
                </div>
              )}

              {/* Önerilen Hiyerarşik Katman Dağılımı */}
              <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg space-y-1.5 text-[11px]">
                <span className="text-[10px] font-mono uppercase text-stone-400 font-semibold block">
                  Önerilen Kompozisyon Katman Dağılımı
                </span>
                <div className="flex flex-wrap gap-2 text-stone-300">
                  {crossSymbolHarmonyReport.recommendedHierarchy.primarySymbol && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50">
                      <strong>Ana Odak (%65):</strong> {crossSymbolHarmonyReport.recommendedHierarchy.primarySymbol.name}
                    </span>
                  )}
                  {crossSymbolHarmonyReport.recommendedHierarchy.secondarySymbols.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-800">
                      <strong>İkincil Destek (%35):</strong> {crossSymbolHarmonyReport.recommendedHierarchy.secondarySymbols.map((s) => s.name).join(', ')}
                    </span>
                  )}
                  {crossSymbolHarmonyReport.recommendedHierarchy.accentSymbols.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                      <strong>Vurgu / Aksan:</strong> {crossSymbolHarmonyReport.recommendedHierarchy.accentSymbols.map((s) => s.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Arama Alanı */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sembol adı, kültür, element veya anlam ile ara..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {activeClient && recommendedSymbolsList.length > 0 && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{recommendedSymbolsList.length} Öneri Vurgulandı</span>
              </span>
            )}
            <span className="text-xs font-mono text-stone-400">
              {filteredSymbols.length} / {ALL_MASTER_SYMBOLS.length} Sembol
            </span>
          </div>
        </div>

        {/* Kategori Düğmeleri */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-amber-400 text-stone-950 font-semibold'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            Tüm Kategoriler ({ALL_MASTER_SYMBOLS.length})
          </button>
          {Object.entries(SYMBOL_CATEGORIES_METADATA).map(([key, meta]) => {
            const count = ALL_MASTER_SYMBOLS.filter((s) => s.geometryType === key).length;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key as GeometryType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-stone-950 font-semibold'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {meta.nameTr} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Sembol Kartları Izgarası */}
      {filteredSymbols.length === 0 ? (
        <div className="p-12 text-center text-xs text-stone-500 bg-stone-900/30 rounded-xl border border-stone-800 space-y-2">
          <p>Arama kriterlerinize uygun kutsal sembol bulunamadı.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
            }}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSymbols.map((sym) => {
            const catMeta = SYMBOL_CATEGORIES_METADATA[sym.geometryType];
            const recommendation = recommendedSymbolMap.get(sym.id);
            const isRecommended = Boolean(recommendation);

            return (
              <div
                key={sym.id}
                className={`rounded-xl p-5 transition-all flex flex-col justify-between space-y-4 group ${
                  isRecommended
                    ? 'bg-emerald-950/20 border-2 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:border-emerald-400/80 hover:bg-emerald-950/30'
                    : 'bg-stone-900/60 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-900/90'
                }`}
              >
                <div className="space-y-3">
                  {/* Aşama 5.2.1: Analizle Eşleşen Sembol İçin Rozet */}
                  {isRecommended && (
                    <div className="flex items-center justify-between pb-1 border-b border-emerald-900/30">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Tasarım Önerisi</span>
                      </span>
                      {recommendation?.sourceModule && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-950/90 text-stone-400 border border-stone-800">
                          {recommendation.sourceModule} ({recommendation.matchingScore}p)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Başlık ve Köken */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-base font-semibold transition-colors ${
                        isRecommended ? 'text-emerald-200 group-hover:text-emerald-300' : 'text-stone-100 group-hover:text-amber-300'
                      }`}>
                        {sym.name}
                      </h3>
                      {sym.originalName && (
                        <p className="text-xs text-stone-500 italic">
                          {sym.originalName}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950 text-stone-400 border border-stone-800 shrink-0">
                      {sym.originCulture}
                    </span>
                  </div>

                  {/* Aşama 5.2.1: Analiz Uyum Açıklaması */}
                  {isRecommended && recommendation?.reasonTr && (
                    <p className="text-[11px] text-emerald-300/90 leading-tight bg-emerald-950/40 border border-emerald-900/40 rounded p-2">
                      <strong className="font-semibold text-emerald-200">Analiz Uyumu:</strong> {recommendation.reasonTr}
                    </p>
                  )}

                  {/* Kategori ve Element Bilgisi */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/40">
                      {catMeta?.nameTr || sym.geometryType}
                    </span>
                    {sym.elementAssociation && (
                      <span className="px-2 py-0.5 rounded bg-stone-950 text-stone-400 border border-stone-800">
                        {sym.elementAssociation}
                      </span>
                    )}
                    {sym.compositionRole && (
                      <span className="px-2 py-0.5 rounded bg-stone-950 text-stone-300 border border-stone-800 font-mono text-[10px]">
                        {getDesignRoleDescription(sym.compositionRole).titleTr}
                      </span>
                    )}
                  </div>

                  {/* Anlam Özeti */}
                  <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed">
                    {sym.meaning}
                  </p>

                  {/* Tarihsel ve Ezoterik Anlam Önizlemesi */}
                  <div className="space-y-1 pt-1 text-[11px] border-t border-stone-800/60">
                    {sym.traditionalMeaningTr && (
                      <p className="text-stone-400 line-clamp-2">
                        <strong className="text-stone-300">Geleneksel:</strong> {sym.traditionalMeaningTr}
                      </p>
                    )}
                    {sym.esotericMeaningTr && (
                      <p className="text-stone-400 line-clamp-2">
                        <strong className="text-stone-300">Ezoterik:</strong> {sym.esotericMeaningTr}
                      </p>
                    )}
                  </div>

                  {/* Aşama 5.2.2: Aktif Danışan İçin Tasarım Gerekçesi & Kompozisyon Detayı */}
                  {isRecommended && recommendation && activeClientArchive && (
                    <div className="pt-2 border-t border-emerald-900/40 space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleRationale(sym.id)}
                        className="w-full text-left py-1.5 px-2.5 rounded bg-emerald-950/40 hover:bg-emerald-950/70 text-[11px] text-emerald-300 border border-emerald-900/60 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>Tasarım Gerekçesi & Kompozisyon Detayı</span>
                        </span>
                        {expandedRationaleIds[sym.id] ? (
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      {expandedRationaleIds[sym.id] && (() => {
                        const rationale = evaluateSymbolRationale(recommendation, activeClientArchive);
                        return (
                          <div className="p-3 bg-stone-950/90 border border-emerald-900/50 rounded-lg text-xs space-y-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono text-emerald-400/80 block">Tasarım Rolü</span>
                              <p className="text-emerald-200 font-medium">
                                {rationale.designRoleDescription}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono text-stone-400 block">Neden Önerildi?</span>
                              <p className="text-stone-300 leading-relaxed text-[11px]">
                                {rationale.whyRecommended}
                              </p>
                            </div>
                            {rationale.associatedModules.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-mono text-stone-400 block">İlişkili Analiz Modülleri</span>
                                <div className="space-y-1 bg-stone-900/70 p-2 rounded border border-stone-800">
                                  {rationale.associatedModules.map((m, mIdx) => (
                                    <div key={mIdx} className="text-[11px] leading-tight">
                                      <strong className="text-emerald-300">[{m.module} · {m.target}]:</strong>{' '}
                                      <span className="text-stone-300">{m.rationaleTr}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono text-stone-400 block">Kavramsal & Geometrik Uyum</span>
                              <p className="text-stone-400 leading-relaxed text-[11px]">
                                {rationale.conceptualAndGeometricAlignment}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Alt Detay İncele Butonu */}
                <button
                  type="button"
                  onClick={() => setInspectSymbol(sym)}
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isRecommended
                      ? 'text-emerald-200 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60'
                      : 'text-stone-300 hover:text-white bg-stone-950 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  <Info className={`w-3.5 h-3.5 ${isRecommended ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>Detaylı Çizim & Kültürel Rehberi İncele</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Sembol Detaylı İnceleme Modalı */}
      {inspectSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Başlığı */}
            <div className="flex items-start justify-between pb-3 border-b border-stone-800">
              <div className="space-y-1">
                {recommendedSymbolMap.has(inspectSymbol.id) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Aktif Danışan İçin Tasarım Önerisi</span>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif text-stone-100">
                    {inspectSymbol.name}
                  </h2>
                  <span className="text-xs font-mono text-stone-500 italic">
                    {inspectSymbol.originalName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                  <span>{inspectSymbol.originCulture}</span>
                  <span>·</span>
                  <span>{inspectSymbol.elementAssociation}</span>
                  <span>·</span>
                  <span className="text-amber-400 font-mono">ID: {inspectSymbol.id}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectSymbol(null)}
                className="text-stone-400 hover:text-stone-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Detay İçeriği */}
            <div className="space-y-4 text-xs">
              {/* Kompozisyondaki Tasarım Rolü (Her Zaman Gösterilir) */}
              <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kompozisyondaki Tasarım Rolü</span>
                </h4>
                <p className="text-amber-300 font-medium text-xs">
                  {getDesignRoleDescription(inspectSymbol.compositionRole).titleTr}
                </p>
                <p className="text-stone-400 leading-relaxed text-xs">
                  {getDesignRoleDescription(inspectSymbol.compositionRole).descriptionTr}
                </p>
              </div>

              {/* Aşama 5.2.1 & 5.2.2: Eğer önerilmişse analiz uyum kutusu ve detaylı gerekçe */}
              {recommendedSymbolMap.has(inspectSymbol.id) && activeClientArchive && (() => {
                const rec = recommendedSymbolMap.get(inspectSymbol.id)!;
                const rationale = evaluateSymbolRationale(rec, activeClientArchive);
                return (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg space-y-2">
                    <h4 className="font-semibold text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Aktif Danışan Analiz Uyumu & Tasarım Gerekçesi</span>
                    </h4>
                    <p className="text-emerald-300/90 leading-relaxed text-xs">
                      {rationale.whyRecommended}
                    </p>
                    <div className="text-[11px] text-stone-300 bg-stone-950/60 p-2 rounded border border-emerald-900/40">
                      <strong className="text-emerald-200 font-semibold block mb-0.5">Kavramsal & Geometrik Uyum:</strong>
                      {rationale.conceptualAndGeometricAlignment}
                    </div>
                  </div>
                );
              })()}

              {/* Görsel ve Geometrik Yapı */}
              {inspectSymbol.visualDescriptionTr && (
                <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <Shapes className="w-3.5 h-3.5 text-amber-400" />
                    <span>Görsel Tanım</span>
                  </h4>
                  <p className="text-stone-400 leading-relaxed">
                    {inspectSymbol.visualDescriptionTr}
                  </p>
                </div>
              )}

              {inspectSymbol.geometricStructureTr && (
                <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Geometrik Yapı & Oran</span>
                  </h4>
                  <p className="text-stone-400 leading-relaxed">
                    {inspectSymbol.geometricStructureTr}
                  </p>
                </div>
              )}

              {/* Anlamlar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200">Geleneksel / Tarihsel Anlam</h4>
                  <p className="text-stone-400 leading-relaxed">
                    {inspectSymbol.traditionalMeaningTr || inspectSymbol.meaning}
                  </p>
                </div>
                <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200">Modern Ezoterik Anlam</h4>
                  <p className="text-stone-400 leading-relaxed">
                    {inspectSymbol.esotericMeaningTr || inspectSymbol.meaning}
                  </p>
                </div>
              </div>

              {/* Kültürel Rehber */}
              {inspectSymbol.culturalGuidelinesTr && (
                <div className="space-y-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kültürel Bağlam & Dövme Uygulama Rehberi</span>
                  </h4>
                  <p className="text-stone-400 leading-relaxed">
                    {inspectSymbol.culturalGuidelinesTr}
                  </p>
                </div>
              )}

              {/* Analiz Bağlantıları */}
              {inspectSymbol.analysisAssociations && inspectSymbol.analysisAssociations.length > 0 && (
                <div className="space-y-1.5 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Analiz Modülleriyle Rezonans</span>
                  </h4>
                  <div className="space-y-1">
                    {inspectSymbol.analysisAssociations.map((assoc, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px]">
                        <span className="font-semibold text-amber-400 shrink-0">
                          [{assoc.module} · {assoc.target}]:
                        </span>
                        <span className="text-stone-400">{assoc.rationaleTr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Kapatma */}
            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setInspectSymbol(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
