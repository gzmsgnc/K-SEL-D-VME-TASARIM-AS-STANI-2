import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { ClientDetailCard } from './ClientDetailCard';
import { NewClientModal } from './NewClientModal';
import { getClientArchive } from '../../store/storage';
import {
  Search,
  Users,
  Globe,
  ChevronRight,
  FileText,
  UserPlus,
  Filter,
  ArrowUpDown,
  Sparkles,
  BookOpen,
  Compass,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
} from 'lucide-react';

type FilterType = 'ALL' | 'WITH_ANALYSIS' | 'WITH_RECIPE' | 'WITH_TESTS' | 'UNKNOWN_TIME';
type SortType = 'NEWEST' | 'NAME_ASC' | 'NAME_DESC' | 'BIRTH_DATE';

export const OwnerWorkspace: React.FC = () => {
  const { clients, activeClient, activeClientId, setActiveClientId, activeClientArchive, setMode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortType>('NEWEST');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'LIST' | 'DETAIL'>('LIST');

  // Danışanların arşiv özetini önceden indeksleyelim (hızlı rozet ve filtreleme için)
  const clientArchivesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getClientArchive>>();
    for (const c of clients) {
      map.set(c.id, getClientArchive(c.id));
    }
    return map;
  }, [clients]);

  // Arama, filtreleme ve sıralama zinciri
  const filteredAndSortedClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return clients
      .filter((c) => {
        // 1. Arama filtresi (Ad, Soyad, E-posta, Telefon, Şehir, Notlar)
        if (term) {
          const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
          const email = (c.email || '').toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          const city = (c.birthLocation?.city || '').toLowerCase();
          const notes = (c.notes || '').toLowerCase();

          const matches =
            fullName.includes(term) ||
            c.firstName.toLowerCase().includes(term) ||
            c.lastName.toLowerCase().includes(term) ||
            email.includes(term) ||
            phone.includes(term) ||
            city.includes(term) ||
            notes.includes(term);

          if (!matches) return false;
        }

        // 2. Kategori / Durum Filtresi
        const archive = clientArchivesMap.get(c.id);
        const hasAnalyses = Boolean(archive && archive.analyses && archive.analyses.length > 0);
        const hasRecipes = Boolean(archive && archive.designs && archive.designs.length > 0);
        const hasTests = Boolean(archive && archive.testResults && archive.testResults.length > 0);

        if (filterType === 'WITH_ANALYSIS') return hasAnalyses;
        if (filterType === 'WITH_RECIPE') return hasRecipes;
        if (filterType === 'WITH_TESTS') return hasTests;
        if (filterType === 'UNKNOWN_TIME') return c.isBirthTimeUnknown;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') {
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr');
        }
        if (sortBy === 'NAME_DESC') {
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`, 'tr');
        }
        if (sortBy === 'BIRTH_DATE') {
          return (b.birthDate || '').localeCompare(a.birthDate || '');
        }
        // 'NEWEST' (Varsayılan: Son oluşturulan veya güncellenen)
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
  }, [clients, searchTerm, filterType, sortBy, clientArchivesMap]);

  const handleSelectClient = (clientId: string) => {
    setActiveClientId(clientId);
    setMobileTab('DETAIL'); // Mobil ekranda seçim yapılınca doğrudan detaya geç
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setSortBy('NEWEST');
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Üst Bilgilendirme ve Danışan Yönetim Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-100 flex items-center gap-2.5">
            <span>Uygulama Sahibi Çalışma Alanı</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Kayıtlı danışanların bağımsız arşivi, Batı / Tropical astroloji verileri ve detaylı dövme konsept yönetimi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-900/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Danışan Ekle</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('CLIENT_FORM')}
            className="px-3.5 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Danışan Formunu Önizle</span>
          </button>
        </div>
      </div>

      {/* Kayıt Bulunmadığında Görüntülenecek Temiz Boş Durum */}
      {clients.length === 0 ? (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 my-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-500">
            <Users className="w-6 h-6 text-stone-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-stone-200">
              Henüz Kayıtlı Danışan Bulunmuyor
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed max-w-md mx-auto">
              Sistemde hiçbir sahte veya demo kayıt tutulmamaktadır. Danışan bilgi formunu doldurduğunda ya da buradan yeni bir kayıt oluşturulduğunda her danışan bağımsız bir kayıt ve arşiv olarak burada listelenecektir.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(true)}
              className="px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-amber-900/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>İlk Danışanı Ekle</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('CLIENT_FORM')}
              className="px-4 py-2.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Danışan Bilgi Formunu Aç</span>
            </button>
          </div>
        </div>
      ) : (
        /* Danışanlar Varken: Masaüstü 2 Kolon, Dar Ekranlarda Akıllı Sekmeli Geçiş */
        <div>
          {/* Dar Ekran (Mobil/Tablet) Görünüm Değiştirici */}
          <div className="lg:hidden flex items-center justify-between bg-stone-900/80 border border-stone-800 rounded-xl p-1.5 mb-4">
            <button
              type="button"
              onClick={() => setMobileTab('LIST')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mobileTab === 'LIST'
                  ? 'bg-amber-400 text-stone-950 font-semibold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danışan Listesi ({filteredAndSortedClients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('DETAIL')}
              disabled={!activeClient}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mobileTab === 'DETAIL'
                  ? 'bg-amber-400 text-stone-950 font-semibold shadow'
                  : 'text-stone-400 hover:text-stone-200 disabled:opacity-40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">
                {activeClient ? `${activeClient.firstName} ${activeClient.lastName}` : 'Çalışma Alanı'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sol Kolon: Danışan Listesi, Arama ve Filtreleme (lg: 4 Kolon) */}
            <div
              className={`lg:col-span-4 bg-stone-900/60 border border-stone-800 rounded-xl overflow-hidden space-y-3 p-4 ${
                mobileTab === 'DETAIL' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-stone-200">Kayıtlı Danışanlar</h2>
                </div>
                <span className="text-xs font-mono text-stone-400 bg-stone-950/60 px-2 py-0.5 rounded border border-stone-800">
                  {filteredAndSortedClients.length} / {clients.length}
                </span>
              </div>

              {/* Arama Kutusu */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ad, soyad, şehir veya e-posta ile ara..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtre ve Sıralama Çubuğu */}
              <div className="space-y-2 pt-1 border-t border-stone-800/60 text-xs">
                {/* Hızlı Kategori Filtre Butonları */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      filterType === 'ALL'
                        ? 'bg-amber-400 text-stone-950 font-semibold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('WITH_ANALYSIS')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      filterType === 'WITH_ANALYSIS'
                        ? 'bg-amber-400 text-stone-950 font-semibold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    Analizli
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('WITH_RECIPE')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      filterType === 'WITH_RECIPE'
                        ? 'bg-amber-400 text-stone-950 font-semibold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    Reçeteli
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('WITH_TESTS')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      filterType === 'WITH_TESTS'
                        ? 'bg-amber-400 text-stone-950 font-semibold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    Testleri Olan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('UNKNOWN_TIME')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      filterType === 'UNKNOWN_TIME'
                        ? 'bg-amber-400 text-stone-950 font-semibold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    Saat ?
                  </button>
                </div>

                {/* Sıralama Seçimi */}
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <div className="flex items-center gap-1 text-stone-500">
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Sırala:</span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-stone-300 focus:outline-none focus:border-amber-500 text-[11px]"
                  >
                    <option value="NEWEST">Son Eklenen</option>
                    <option value="NAME_ASC">İsim (A-Z)</option>
                    <option value="NAME_DESC">İsim (Z-A)</option>
                    <option value="BIRTH_DATE">Doğum Tarihi</option>
                  </select>
                </div>
              </div>

              {/* Danışan Listesi Öğeleri */}
              <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredAndSortedClients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 space-y-2 bg-stone-950/40 rounded-lg border border-stone-800/60">
                    <p>Arama veya filtre kriterlerinize uyan danışan kaydı bulunamadı.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-amber-400 hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                ) : (
                  filteredAndSortedClients.map((c) => {
                    const isSelected = c.id === activeClientId;
                    const archive = clientArchivesMap.get(c.id);
                    const hasAnalysis = Boolean(archive && archive.analyses && archive.analyses.length > 0);
                    const hasRecipe = Boolean(archive && archive.designs && archive.designs.length > 0);
                    const hasTests = Boolean(archive && archive.testResults && archive.testResults.length > 0);

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-stone-800 border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
                            : 'bg-stone-950/40 border-stone-800/80 hover:bg-stone-800/50 hover:border-stone-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-stone-200 truncate group-hover:text-amber-300 transition-colors">
                              {c.firstName} {c.lastName}
                            </span>
                            {c.isBirthTimeUnknown && (
                              <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/40 px-1 py-0.2 rounded border border-amber-900/30">
                                Saat ?
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 truncate">
                            <Globe className="w-3 h-3 text-stone-500 shrink-0" />
                            <span className="truncate">{c.birthLocation?.city || 'Şehir'}, {c.birthLocation?.country || 'Ülke'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-stone-500">
                            <span>Doğum: {c.birthDate}</span>
                            <span>•</span>
                            <span>{c.birthTime || '12:00'}</span>
                          </div>

                          {/* İlerleme ve Durum Rozetleri */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {hasAnalysis && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 bg-teal-950/60 text-teal-300 rounded border border-teal-800/50">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Analiz</span>
                              </span>
                            )}
                            {hasTests && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 bg-indigo-950/60 text-indigo-300 rounded border border-indigo-800/50">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Testler</span>
                              </span>
                            )}
                            {hasRecipe && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 bg-amber-950/60 text-amber-300 rounded border border-amber-800/50">
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>Reçete</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? 'text-amber-400 translate-x-0.5' : 'text-stone-600 group-hover:text-stone-400'
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sağ Kolon: Aktif Danışan Detay & Çalışma Alanı (lg: 8 Kolon) */}
            <div
              className={`lg:col-span-8 ${
                mobileTab === 'LIST' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Mobil Ekranda Listeye Geri Dönme Çubuğu */}
              {activeClient && (
                <div className="lg:hidden mb-3">
                  <button
                    type="button"
                    onClick={() => setMobileTab('LIST')}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Danışan Listesine Dön</span>
                  </button>
                </div>
              )}

              {activeClient ? (
                <ClientDetailCard client={activeClient} archive={activeClientArchive} />
              ) : (
                <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-12 text-center text-stone-500 text-sm space-y-3">
                  <Compass className="w-8 h-8 text-stone-600 mx-auto" />
                  <p>Lütfen sol listeden incelemek ve üzerinde çalışmak istediğiniz bir danışan kaydını seçiniz.</p>
                  <p className="text-xs text-stone-600">Her danışanın analizleri, test sonuçları ve dövme reçeteleri tamamen izole olarak açılacaktır.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yeni Danışan Ekleme Modal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
      />
    </div>
  );
};
