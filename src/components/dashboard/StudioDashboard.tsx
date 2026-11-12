import React, { useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import {
  getClientArchive,
  getAllStoredDesigns,
  getAllStoredAnalyses,
  getAllStoredTests,
} from '../../store/storage';
import { ALL_MASTER_SYMBOLS } from '../../modules/symbols';
import {
  Users,
  UserPlus,
  Sparkles,
  Shapes,
  Palette,
  FileText,
  ShieldCheck,
  ArrowRight,
  Globe,
  Calendar,
  Clock,
  Compass,
  CheckCircle2,
  BookOpen,
  Layers,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

interface StudioDashboardProps {
  onOpenNewClientModal: () => void;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({ onOpenNewClientModal }) => {
  const { clients, navigateToClient, setCurrentRoute, setTargetDetailTab, activeClient } = useApp();

  // Gerçek depolama verilerinden metrikleri hesapla (Sahte/örnek veri KESİNLİKLE yok)
  const stats = useMemo(() => {
    const totalClients = clients.length;

    let clientsWithAnalyses = 0;
    let clientsWithDesigns = 0;
    let clientsWithTests = 0;

    for (const c of clients) {
      const arch = getClientArchive(c.id);
      if (arch?.analyses && arch.analyses.length > 0) clientsWithAnalyses++;
      if (arch?.designs && arch.designs.length > 0) clientsWithDesigns++;
      if (arch?.testResults && arch.testResults.length > 0) clientsWithTests++;
    }

    const allDesigns = getAllStoredDesigns();

    return {
      totalClients,
      clientsWithAnalyses,
      clientsWithDesigns,
      clientsWithTests,
      totalDesignsCount: allDesigns.length,
      masterSymbolsCount: ALL_MASTER_SYMBOLS.length,
    };
  }, [clients]);

  // Son danışanlar (en yeniden en eskiye ilk 5)
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [clients]);

  // Son güncellenen tasarımlar (gerçek depolama verilerinden ilk 4)
  const recentDesigns = useMemo(() => {
    const allDesigns = getAllStoredDesigns();
    return [...allDesigns]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 4)
      .map((design) => {
        const client = clients.find((c) => c.id === design.clientId);
        return {
          design,
          clientName: client ? `${client.firstName} ${client.lastName}` : 'Danışan Kaydı Silinmiş',
          clientId: design.clientId,
        };
      });
  }, [clients]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-8">
      {/* 1. Karşılama ve Stüdyo Tanıtım Alanı */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Compass className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Ezoterik & Arketipik Dövme Stüdyosu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-stone-100 tracking-tight">
            DÖVME TASARIM ASİSTANI
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
            Batı / Tropical astroloji, numeroloji matrisi, 7 temel çakra ve 12 evrensel arketip verileriyle, kadim geometrik sembolleri sentezleyen profesyonel tasarım ve analiz çalışma ortamı.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewClientModal}
            className="px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-amber-900/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Danışan Oluştur</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentRoute('CLIENT_FORM')}
            className="px-4 py-2.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Danışan Bilgi Formu</span>
          </button>
        </div>
      </div>

      {/* 2. Gerçek Depolama Metrikleri Göstergesi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Danışan Sayısı */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs text-stone-400">Danışanlar</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-100 font-mono tabular-nums">
            {stats.totalClients}
          </div>
          <p className="text-[10px] text-stone-500">Kayıtlı danışan profili</p>
        </div>

        {/* Tamamlanan Analizler */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs text-stone-400">Analizler</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-100 font-mono tabular-nums">
            {stats.clientsWithAnalyses}
          </div>
          <p className="text-[10px] text-stone-500">Hesaplanan astroloji & çakra</p>
        </div>

        {/* Dövme Reçeteleri */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs text-stone-400">Dövme Reçeteleri</span>
            <Palette className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-100 font-mono tabular-nums">
            {stats.clientsWithDesigns}
          </div>
          <p className="text-[10px] text-stone-500">Üretilen konsept & prompt</p>
        </div>

        {/* Çözülen Testler */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs text-stone-400">Karakter Testleri</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-100 font-mono tabular-nums">
            {stats.clientsWithTests}
          </div>
          <p className="text-[10px] text-stone-500">Enneagram & Hayvan Totemi</p>
        </div>

        {/* Master Sembol Havuzu */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-4 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs text-stone-400">Master Semboller</span>
            <Shapes className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-100 font-mono tabular-nums">
            {stats.masterSymbolsCount}
          </div>
          <p className="text-[10px] text-stone-500">Doğrulanmış kutsal sembol</p>
        </div>
      </div>

      {/* 3. Merkezi Modül Kısayolları (4 Ana İşlem Kartı) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
          <span>Stüdyo Çalışma Alanları & Modül Kısayolları</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Danışanlar Kısayolu */}
          <button
            type="button"
            onClick={() => setCurrentRoute('CLIENTS')}
            className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 text-left hover:border-amber-500/50 hover:bg-stone-900 transition-all space-y-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Danışanlar & Çalışma Alanı</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Kayıtlı danışanların arşivi, doğum bilgileri, koordinatları ve çalışma alanı.
              </p>
            </div>
          </button>

          {/* Analiz Merkezi Kısayolu */}
          <button
            type="button"
            onClick={() => {
              if (activeClient) {
                navigateToClient(activeClient.id, 'ANALYSES');
              } else {
                setTargetDetailTab('ANALYSES');
                setCurrentRoute('CLIENTS');
              }
            }}
            className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 text-left hover:border-amber-500/50 hover:bg-stone-900 transition-all space-y-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-teal-400 group-hover:border-teal-500/40 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-100 group-hover:text-teal-300 transition-colors flex items-center justify-between">
                <span>Analiz Merkezi</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-teal-400 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Astroloji haritası, numeroloji matrisi, çakra blokajları ve 12 evrensel arketip.
              </p>
            </div>
          </button>

          {/* Sembol Kütüphanesi Kısayolu */}
          <button
            type="button"
            onClick={() => setCurrentRoute('SYMBOL_LIBRARY')}
            className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 text-left hover:border-amber-500/50 hover:bg-stone-900 transition-all space-y-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors">
              <Shapes className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Sembol Kütüphanesi</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                26 kadim sembol, geometrik çizim kuralları, felsefi ve dövme uygulama rehberleri.
              </p>
            </div>
          </button>

          {/* Tasarım Atölyesi Kısayolu */}
          <button
            type="button"
            onClick={() => {
              if (activeClient) {
                navigateToClient(activeClient.id, 'RECIPE');
              } else {
                setTargetDetailTab('RECIPE');
                setCurrentRoute('CLIENTS');
              }
            }}
            className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 text-left hover:border-amber-500/50 hover:bg-stone-900 transition-all space-y-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors">
              <Palette className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Tasarım Atölyesi</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Dövme reçetesi formülasyonu, kompozisyon kuralları ve Midjourney prompt motoru.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Alt Bölüm: Son Danışanlar ve Son Tasarım Çalışmaları */}
      {clients.length === 0 ? (
        /* Henüz kayıt yokken rehberlik eden boş durum */
        <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 my-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-500">
            <Compass className="w-6 h-6 text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-stone-200">
              Stüdyonuzda Henüz Kayıtlı Danışan Yok
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed max-w-md mx-auto">
              Dövme Tasarım Asistanı; kişiye özel astroloji, numeroloji, çakra ve sembol senteziyle çalışır. Süreci başlatmak için ilk danışanınızı sisteme ekleyebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenNewClientModal}
              className="px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-amber-900/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>İlk Danışanı Ekle</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentRoute('SYMBOL_LIBRARY')}
              className="px-4 py-2.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Shapes className="w-4 h-4 text-amber-400" />
              <span>Sembol Kütüphanesini İncele</span>
            </button>
          </div>
        </div>
      ) : (
        /* Kayıtlar Varken: 2 Kolon (Son Danışanlar + Son Tasarımlar) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sol: Son Danışanlar (lg: 6 Kolon) */}
          <div className="lg:col-span-6 bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">Son Danışanlar</h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentRoute('CLIENTS')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Tümünü Gör ({clients.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentClients.map((client) => {
                const arch = getClientArchive(client.id);
                const hasAnalyses = Boolean(arch?.analyses && arch.analyses.length > 0);
                const hasRecipe = Boolean(arch?.designs && arch.designs.length > 0);

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => navigateToClient(client.id, 'PERSONAL_BIRTH')}
                    className="w-full text-left p-3 rounded-lg bg-stone-950/40 border border-stone-800/80 hover:bg-stone-800/60 hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 transition-colors truncate">
                          {client.firstName} {client.lastName}
                        </span>
                        {client.isBirthTimeUnknown && (
                          <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/40 px-1 py-0.2 rounded border border-amber-900/30">
                            Saat ?
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-stone-400 truncate">
                        <span className="truncate">{client.birthLocation?.city || 'Şehir'}, {client.birthLocation?.country || 'Ülke'}</span>
                        <span>·</span>
                        <span>{client.birthDate}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        {hasAnalyses && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-950/60 text-teal-300 border border-teal-800/40">
                            Analiz Hazır
                          </span>
                        )}
                        {hasRecipe && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                            Reçete Üretildi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="inline-flex items-center gap-1 text-xs text-stone-400 group-hover:text-amber-300 transition-colors">
                        <span>Çalışmaya Başla</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sağ: Son Çalışmalar / Güncellenen Tasarımlar (lg: 6 Kolon) */}
          <div className="lg:col-span-6 bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800/60">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">Son Dövme Tasarımları</h3>
              </div>
              <span className="text-xs font-mono text-stone-500">
                {recentDesigns.length} Aktif Tasarım
              </span>
            </div>

            {recentDesigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-stone-950/40 rounded-lg border border-stone-800 space-y-2">
                <p>Henüz kayıtlı bir dövme tasarımı veya reçetesi bulunmuyor.</p>
                <p className="text-[11px] text-stone-600">
                  Bir danışan seçip analizlerini tamamladıktan sonra Tasarım Atölyesi üzerinden konsept reçete üretebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentDesigns.map(({ design, clientName, clientId }) => {
                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => navigateToClient(clientId, 'RECIPE')}
                      className="w-full text-left p-3 rounded-lg bg-stone-950/40 border border-stone-800/80 hover:bg-stone-800/60 hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 transition-colors truncate">
                            {design.title || 'Dövme Tasarımı'}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            v{design.versionNumber || 1}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-400 truncate">
                          Danışan: <strong className="text-stone-300">{clientName}</strong>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-stone-500">
                          {design.recipe?.style && <span>{design.recipe.style}</span>}
                          {design.recipe?.recommendedPlacement && (
                            <>
                              <span>·</span>
                              <span>{design.recipe.recommendedPlacement}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(design.updatedAt || design.createdAt || 0).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="inline-flex items-center gap-1 text-xs text-stone-400 group-hover:text-amber-300 transition-colors">
                          <span>Reçeteyi Aç</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
