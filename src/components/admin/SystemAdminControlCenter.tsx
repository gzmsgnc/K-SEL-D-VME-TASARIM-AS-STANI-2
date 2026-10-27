import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import {
  getSystemMetrics,
  getSystemStatusReport,
  getSystemIntegrityReport,
  getClientAdminTableList,
  generateFullSystemBackup,
  executeDangerousDeleteClient,
  executeDangerousResetTest,
  executeDangerousDeleteDesign,
  executeDangerousClearAllDesigns,
  ClientAdminRow,
} from '../../modules/admin/systemAdminService';
import { downloadFileInBrowser } from '../../utils/clientDossierGenerator';
import { validateBackupData, BackupValidationResult } from '../../utils/backupValidator';
import {
  ShieldAlert,
  ShieldCheck,
  Server,
  Users,
  UserCheck,
  Sparkles,
  ClipboardList,
  BookOpen,
  Palette,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  RotateCw,
  ArrowRight,
  ExternalLink,
  Layers,
  Database,
  Info,
  Clock,
  X,
  FileCheck,
} from 'lucide-react';

type AdminTab = 'METRICS_STATUS' | 'DATA_MANAGEMENT' | 'BACKUP_EXPORT' | 'DANGEROUS_OPERATIONS';

export const SystemAdminControlCenter: React.FC = () => {
  const { mode, setMode, clients, activeClientId, setActiveClientId, refreshClients, resetAllSystemData } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('METRICS_STATUS');

  // Geri bildirim durumu
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Kopyalama durumu
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Yedek Doğrulama State'i
  const [customBackupJson, setCustomBackupJson] = useState('');
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);

  // Tehlikeli İşlemler Modal Durumları
  const [dangerAction, setDangerAction] = useState<
    | { type: 'DELETE_CLIENT'; client: ClientAdminRow }
    | { type: 'RESET_TEST'; client: ClientAdminRow; testType: 'ENNEAGRAM' | 'ANIMAL_TOTEM' }
    | { type: 'CLEAR_DESIGNS'; client: ClientAdminRow }
    | { type: 'RESET_ALL' }
    | null
  >(null);

  const [resetAllConfirmInput, setResetAllConfirmInput] = useState('');

  // Metrikler, Durum Raporu ve Bütünlük Raporunu dinamik hesapla
  const metrics = useMemo(() => getSystemMetrics(), [clients, activeClientId]);
  const statusReport = useMemo(() => getSystemStatusReport(), [clients, activeClientId]);
  const integrityReport = useMemo(() => getSystemIntegrityReport(), [clients, activeClientId]);
  const clientRows = useMemo(() => getClientAdminTableList(), [clients, activeClientId]);

  // YETKİ KONTROLÜ: Danışan form modundaki kullanıcılar bu ekranı göremez
  if (mode === 'CLIENT_FORM') {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-stone-100">Yetkisiz Erişim Koruması</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Sistem Yönetimi ve Kontrol Merkezi yalnızca yetkili Uygulama Sahibi oturumunda açılabilir.
            Danışan formu görünümünde bu verilere ve yönetim araçlarına erişilemez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode('OWNER_WORKSPACE')}
          className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md shadow-amber-950/40"
        >
          <span>Uygulama Sahibi Olarak Giriş Yap</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Toplu Dışa Aktarma İşleyicisi
  const handleDownloadBackup = () => {
    try {
      const backup = generateFullSystemBackup();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Dovme_Asistani_Sistem_Yedegi_${dateStr}.json`;
      downloadFileInBrowser(filename, JSON.stringify(backup, null, 2), 'application/json');
      setFeedback({
        type: 'success',
        message: `Sistem yedeği (${filename}) başarıyla indirildi. Mevcut verilerde hiçbir değişiklik yapılmadı.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Yedekleme dosyası indirilirken bir hata oluştu.',
      });
    }
  };

  const handleCopyBackup = () => {
    try {
      const backup = generateFullSystemBackup();
      navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setCopiedBackup(true);
      setFeedback({
        type: 'success',
        message: 'Bütünleşik sistem verisi JSON olarak panoya kopyalandı.',
      });
      setTimeout(() => setCopiedBackup(false), 2500);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Kopyalama işlemi gerçekleştirilemedi.',
      });
    }
  };

  // Tehlikeli İşlem Yürütücüleri
  const handleConfirmDangerousAction = () => {
    if (!dangerAction) return;

    if (dangerAction.type === 'DELETE_CLIENT') {
      const ok = executeDangerousDeleteClient(dangerAction.client.id);
      if (ok) {
        refreshClients();
        setFeedback({
          type: 'success',
          message: `${dangerAction.client.fullName} danışanı ve ona ait tüm arşiv kayıtları silindi. Diğer danışanlar korundu.`,
        });
      } else {
        setFeedback({ type: 'error', message: 'Danışan silinirken bir sorun oluştu.' });
      }
    } else if (dangerAction.type === 'RESET_TEST') {
      const testName = dangerAction.testType === 'ENNEAGRAM' ? 'Enneagram' : 'Hayvan Totemi';
      const ok = executeDangerousResetTest(dangerAction.client.id, dangerAction.testType);
      if (ok) {
        refreshClients();
        setFeedback({
          type: 'success',
          message: `${dangerAction.client.fullName} için ${testName} testi sıfırlandı. Analizler ve reçeteler korundu.`,
        });
      } else {
        setFeedback({ type: 'error', message: 'Test sıfırlanamadı.' });
      }
    } else if (dangerAction.type === 'CLEAR_DESIGNS') {
      const ok = executeDangerousClearAllDesigns(dangerAction.client.id);
      if (ok) {
        refreshClients();
        setFeedback({
          type: 'success',
          message: `${dangerAction.client.fullName} için dövme tasarımları temizlendi. Astroloji, numeroloji ve testler korundu.`,
        });
      } else {
        setFeedback({ type: 'error', message: 'Tasarımlar temizlenemedi.' });
      }
    } else if (dangerAction.type === 'RESET_ALL') {
      if (resetAllConfirmInput.trim() !== 'TÜMÜNÜ SİL') {
        setFeedback({
          type: 'error',
          message: 'Lütfen onaylamak için metin kutusuna "TÜMÜNÜ SİL" yazınız.',
        });
        return;
      }
      resetAllSystemData();
      setResetAllConfirmInput('');
      setFeedback({
        type: 'success',
        message: 'Tüm uygulama verisi güvenle sıfırlandı. Sistem temiz başlangıç durumuna getirildi.',
      });
    }

    setDangerAction(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* 1. ÜST BİLGİ VE YÖNETİM BAŞLIĞI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif text-stone-100 flex items-center gap-2">
                <span>Yönetici / Sistem Kontrol Merkezi</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  A32
                </span>
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Uygulama sahibinin depolama, danışan arşivleri, sistem durumları ve güvenli veri işlemlerini yönettiği merkezi alan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMode('OWNER_WORKSPACE')}
            className="px-3.5 py-2 text-xs font-semibold text-stone-200 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Çalışma Alanına Dön</span>
          </button>
        </div>
      </div>

      {/* GERİ BİLDİRİM BİLDİRİMİ */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-md animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
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

      {/* 2. YÖNETİCİ SEKMELERİ */}
      <div className="flex items-center gap-1 p-1 bg-stone-900/60 border border-stone-800 rounded-xl overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('METRICS_STATUS')}
          className={`px-3.5 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'METRICS_STATUS'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Sistem Durumu & Metrikler</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DATA_MANAGEMENT')}
          className={`px-3.5 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DATA_MANAGEMENT'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Veri Yönetimi (Salt Okunur)</span>
          <span className="text-[10px] font-mono opacity-80">({clientRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKUP_EXPORT')}
          className={`px-3.5 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'BACKUP_EXPORT'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Toplu Yedekleme & Dışa Aktarma</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DANGEROUS_OPERATIONS')}
          className={`px-3.5 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DANGEROUS_OPERATIONS'
              ? 'bg-rose-500 text-white font-bold shadow'
              : 'text-rose-400/90 hover:text-rose-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Tehlikeli İşlemler</span>
        </button>
      </div>

      {/* 3. SEKME İÇERİKLERİ */}

      {/* SEKME 1: SİSTEM METRİKLERİ VE DURUM RAPORU */}
      {activeTab === 'METRICS_STATUS' && (
        <div className="space-y-6">
          {/* A. 7 Temel Metrik Kartı */}
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Gerçek Depolama Metrikleri (Sahte Veri İçermez)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* 1. Toplam Danışan */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Toplam Danışan</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalClients}
                </span>
                <span className="text-[10px] text-stone-400 block truncate">
                  {statusReport.clientsStatusLabelTr}
                </span>
              </div>

              {/* 2. Aktif Danışan */}
              <div className="p-3.5 bg-stone-900/60 border border-amber-950/40 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-mono block">Aktif Danışan</span>
                <span className="text-sm font-bold text-stone-100 block truncate">
                  {metrics.activeClientName || 'Seçili Değil'}
                </span>
                <span className="text-[10px] text-stone-500 font-mono block truncate">
                  {metrics.activeClientId || 'Kayıt bulunmuyor'}
                </span>
              </div>

              {/* 3. Kayıtlı Analiz Sayısı */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Analiz Sayısı</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalAnalyses}
                </span>
                <span className="text-[10px] text-teal-400 block truncate">
                  {metrics.totalAnalyses > 0 ? '4 Modül Entegre' : 'Kayıt bulunmuyor'}
                </span>
              </div>

              {/* 4. Enneagram Testleri */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Enneagram</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalEnneagramTests}
                </span>
                <span className="text-[10px] text-indigo-400 block truncate">
                  {metrics.totalEnneagramTests > 0 ? 'Mizaç Tamamlandı' : 'Kayıt bulunmuyor'}
                </span>
              </div>

              {/* 5. Totem Testleri */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Totem Testleri</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalTotemTests}
                </span>
                <span className="text-[10px] text-indigo-400 block truncate">
                  {metrics.totalTotemTests > 0 ? 'Totem Kayıtlı' : 'Kayıt bulunmuyor'}
                </span>
              </div>

              {/* 6. Kayıtlı Reçete Sayısı */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Reçete Sayısı</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalRecipes}
                </span>
                <span className="text-[10px] text-amber-400 block truncate">
                  {metrics.totalRecipes > 0 ? 'A15 Üretimi' : 'Kayıt bulunmuyor'}
                </span>
              </div>

              {/* 7. Tasarım Sürümü Toplamı */}
              <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Tasarım Sürümleri</span>
                <span className="text-xl font-bold font-mono text-stone-100 block">
                  {metrics.totalDesignVersions}
                </span>
                <span className="text-[10px] text-emerald-400 block truncate">
                  {metrics.totalDesignVersions > 0 ? 'Arşivde Korunuyor' : 'Kayıt bulunmuyor'}
                </span>
              </div>
            </div>
          </div>

          {/* B. 7 Uygulama Durumu Özeti (Açık Türkçe Durumlar) */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Uygulama Alt Sistemleri ve Durum Raporu
                </h3>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                Açık ve Doğrulanmış Türkçe Durumlar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* 1. Depolama Durumu */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Depolama Erişimi</span>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{statusReport.storageStatusLabelTr}</span>
                </div>
                <span className="text-[10px] text-stone-500 block">
                  İstemci tarafı kalıcı depolama
                </span>
              </div>

              {/* 2. Aktif Danışan Durumu */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Aktif Danışan Durumu</span>
                <span className={`font-semibold block truncate ${metrics.activeClientId ? 'text-amber-300' : 'text-stone-500'}`}>
                  {statusReport.activeClientStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  {metrics.activeClientId ? 'Çalışma alanına bağlı' : 'Seçili danışan yok'}
                </span>
              </div>

              {/* 3. Kayıtlı Danışan Durumu */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Kayıtlı Danışanlar</span>
                <span className={`font-semibold block ${metrics.totalClients > 0 ? 'text-stone-200' : 'text-stone-500'}`}>
                  {statusReport.clientsStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  İzole arşiv kayıtları
                </span>
              </div>

              {/* 4. Analiz Kayıtları */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Analiz Kayıtları</span>
                <span className={`font-semibold block ${metrics.totalAnalyses > 0 ? 'text-teal-300' : 'text-stone-500'}`}>
                  {statusReport.analysesStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Astroloji, Numeroloji, Çakra, Arketip
                </span>
              </div>

              {/* 5. Test Kayıtları */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Test Kayıtları</span>
                <span className={`font-semibold block truncate ${metrics.totalEnneagramTests + metrics.totalTotemTests > 0 ? 'text-indigo-300' : 'text-stone-500'}`}>
                  {statusReport.testsStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Enneagram & Totem cevapları
                </span>
              </div>

              {/* 6. Reçete Kayıtları */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Reçete Kayıtları</span>
                <span className={`font-semibold block ${metrics.totalRecipes > 0 ? 'text-amber-300' : 'text-stone-500'}`}>
                  {statusReport.recipesStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  A15 Reçete motoru çıktıları
                </span>
              </div>

              {/* 7. Tasarım Arşivi */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Tasarım Arşivi</span>
                <span className={`font-semibold block ${metrics.totalDesignVersions > 0 ? 'text-emerald-300' : 'text-stone-500'}`}>
                  {statusReport.designsStatusLabelTr}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Sürüm kontrollü arşiv
                </span>
              </div>

              {/* 8. Yönetici Oturum Güvenliği */}
              <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono block">Oturum Durumu</span>
                <span className="font-semibold text-emerald-400 block">
                  Uygulama Sahibi (Yetkili)
                </span>
                <span className="text-[10px] text-stone-500 block">
                  İç yönetim kontrolü aktif
                </span>
              </div>
            </div>
          </div>

          {/* C. A35 Veri Bütünlüğü ve Güvenlik Denetimi (Gerçek Kayıtlardan Hesaplanır) */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Veri Bütünlüğü ve Depolama Güvenlik Denetimi (A35)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                Salt-Okunur Doğrulama · Otomatik Geri Yükleme Çalıştırılmaz
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Her alt sistemin gerçek depolama kayıtları taranmış ve bütünlüğü denetlenmiştir. Durumlar yalnızca gerçek verilere dayanarak <strong className="text-stone-300">Hazır</strong>, <strong className="text-stone-300">Kayıt bulunmuyor</strong>, <strong className="text-stone-300">Eksik</strong> veya <strong className="text-stone-300">Veri okunamadı</strong> olarak listelenir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {integrityReport.items.map((item) => {
                const badgeColor =
                  item.status === 'Hazır'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                    : item.status === 'Kayıt bulunmuyor'
                    ? 'bg-stone-950 text-stone-400 border-stone-800'
                    : item.status === 'Eksik'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                    : 'bg-rose-950/60 text-rose-300 border-rose-800/80';

                const dotColor =
                  item.status === 'Hazır'
                    ? 'bg-emerald-400'
                    : item.status === 'Kayıt bulunmuyor'
                    ? 'bg-stone-500'
                    : item.status === 'Eksik'
                    ? 'bg-amber-400'
                    : 'bg-rose-500';

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-stone-400 uppercase font-mono font-semibold">
                          {item.titleTr}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          <span>{item.status}</span>
                        </span>
                      </div>
                      <span className="text-xs font-mono text-stone-200 block">
                        {item.count > 0 ? `${item.count} Kayıt` : 'Kayıt Yok'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-tight">
                      {item.descriptionTr}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: VERİ YÖNETİMİ (SALT OKUNUR DANİŞAN TABLOSU) */}
      {activeTab === 'DATA_MANAGEMENT' && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Kayıtlı Danışanlar Veri Tablosu (Varsayılan Salt Okunur)</span>
              </h3>
              <p className="text-xs text-stone-400">
                Bu ekran danışanların kayıt tarihlerini, ilerleme durumlarını ve arşiv sürüm sayılarını salt okunur inceler; veriyi değiştirmez.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
              {clientRows.length} Kayıtlı Danışan
            </span>
          </div>

          {clientRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-stone-950/40 rounded-xl border border-stone-800 space-y-2">
              <p>Sistemde henüz kayıtlı danışan bulunmuyor.</p>
              <p className="text-[11px] text-stone-600">
                Danışan bilgi formundan kayıt eklendiğinde burada salt okunur özet olarak listelenecektir.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase font-mono border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Danışan</th>
                    <th className="py-2.5 px-3">Doğum & Şehir</th>
                    <th className="py-2.5 px-3">Kayıt Tarihi</th>
                    <th className="py-2.5 px-3">İlerleme</th>
                    <th className="py-2.5 px-3">Analiz</th>
                    <th className="py-2.5 px-3">Testler</th>
                    <th className="py-2.5 px-3">Reçete / Sürüm</th>
                    <th className="py-2.5 px-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {clientRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-stone-800/40 transition-colors ${
                        row.isActive ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Danışan Adı & Kimlik */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-100">{row.fullName}</span>
                          {row.isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-400 text-stone-950 font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-stone-500 block truncate max-w-[140px]">
                          {row.id}
                        </span>
                      </td>

                      {/* Doğum & Şehir */}
                      <td className="py-3 px-3">
                        <div>{row.birthDate}</div>
                        <span className="text-[10px] text-stone-500">{row.city}</span>
                      </td>

                      {/* Kayıt Tarihi */}
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-400">
                        {new Date(row.createdAt).toLocaleDateString('tr-TR')}
                      </td>

                      {/* İlerleme Durumu */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${row.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-amber-300">
                            %{row.progressPercent}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {row.progressLabelTr}
                        </span>
                      </td>

                      {/* Analiz Durumu */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            row.analysesCount > 0
                              ? 'bg-teal-950/60 text-teal-300 border-teal-800/60'
                              : 'bg-stone-950 text-stone-500 border-stone-800'
                          }`}
                        >
                          {row.analysesCount > 0 ? `${row.analysesCount} Kayıt` : 'Yok'}
                        </span>
                      </td>

                      {/* Testler */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <span
                            className={`px-1.5 py-0.2 rounded border ${
                              row.enneagramCompleted
                                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                : 'bg-stone-950 text-stone-600 border-stone-900'
                            }`}
                            title="Enneagram"
                          >
                            E
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border ${
                              row.totemCompleted
                                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                : 'bg-stone-950 text-stone-600 border-stone-900'
                            }`}
                            title="Totem"
                          >
                            T
                          </span>
                        </div>
                      </td>

                      {/* Reçete / Sürüm Sayısı */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            row.designVersionsCount > 0
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              : 'bg-stone-950 text-stone-500 border-stone-800'
                          }`}
                        >
                          {row.designVersionsCount > 0 ? `${row.designVersionsCount} Sürüm` : 'Yok'}
                        </span>
                      </td>

                      {/* İşlem */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClientId(row.id);
                            setMode('OWNER_WORKSPACE');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:text-white bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Çalış</span>
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: YEDEKLEME & TOPLU DIŞA AKTARMA */}
      {activeTab === 'BACKUP_EXPORT' && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="space-y-1 pb-3 border-b border-stone-800">
            <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              <span>Yönetici Seviyesi Bütünleşik Yedekleme ve Dışa Aktarma</span>
            </h3>
            <p className="text-xs text-stone-400">
              Tüm danışan profilleri, astroloji haritaları, numeroloji analizleri, çakra/arketip kayıtları, test sonuçları ve dövme tasarım sürümleri tek bir yapılandırılmış JSON yedeği olarak dışa aktarılır.
            </p>
          </div>

          {/* Yedekleme İpuçları ve Güvenlik Güvencesi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Veri Kaybı Yoktur</span>
              </span>
              <p className="text-[11px] text-stone-400">
                Dışa aktarma işlemi tamamen salt okunurdur. Mevcut hiçbir danışan kaydını veya tasarımı silmez ve değiştirmez.
              </p>
            </div>

            <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>İlişkisel Bütünlük</span>
              </span>
              <p className="text-[11px] text-stone-400">
                Her danışanın arşivi kesinlikle kendi `clientId` anahtarıyla eşleştirilir. Başka danışanın verisiyle karışmaz.
              </p>
            </div>

            <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-lg space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Gizlilik Koruması</span>
              </span>
              <p className="text-[11px] text-stone-400">
                Anne adı yalnızca danışan kimlik kaydında kalır; görsel istemlere veya kamuya açık alanlara asla aktarılmaz.
              </p>
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-stone-200 block">
                Tüm Sistem Veritabanı Yedeği ({clients.length} Danışan)
              </span>
              <span className="text-[11px] text-stone-400 block">
                Standart JSON formatında tam veritabanı yedeğini tarayıcıya indirin.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBackup}
                className="px-3.5 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBackup ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>JSON'u Kopyala</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tüm Yedeği İndir (.json)</span>
              </button>
            </div>
          </div>

          {/* Yedek Doğrulama ve Bütünlük Kontrolü (Salt-Okunur) */}
          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-stone-200">
                  Yedek Dosyası Bütünlük Doğrulama (Salt-Okunur Denetim)
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">
                Mevcut verileri değiştirmez · Geri yükleme yapmaz
              </span>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Mevcut sistem yedeğini veya dışarıdan aldığınız bir yedek JSON metnini test ederek şema geçerliliğini, danışan kimlik izolasyonunu ve veri bütünlüğünü inceleyebilirsiniz.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const backup = generateFullSystemBackup();
                  const result = validateBackupData(backup);
                  setValidationResult(result);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-200 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                Mevcut Sistem Yedeğini Doğrula
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customBackupJson.trim()) {
                    setFeedback({ type: 'error', message: 'Lütfen doğrulanacak JSON metnini yapıştırın.' });
                    return;
                  }
                  const result = validateBackupData(customBackupJson.trim());
                  setValidationResult(result);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors cursor-pointer"
              >
                Yapıştırılan JSON Metnini Doğrula
              </button>
            </div>

            <textarea
              value={customBackupJson}
              onChange={(e) => setCustomBackupJson(e.target.value)}
              placeholder="Harici bir yedek JSON içeriğini buraya yapıştırarak salt-okunur doğrulama yapabilirsiniz..."
              rows={3}
              className="w-full p-2.5 bg-stone-900/80 border border-stone-800 rounded-lg text-xs font-mono text-stone-300 focus:outline-none focus:border-amber-500/50 resize-y"
            />

            {validationResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  validationResult.status === 'READY'
                    ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                    : validationResult.status === 'EMPTY'
                    ? 'bg-stone-900 border-stone-700 text-stone-300'
                    : validationResult.status === 'MISSING'
                    ? 'bg-amber-950/40 border-amber-800/70 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Yedek Doğrulama Durumu: {validationResult.statusLabelTr}</span>
                  <span className="font-mono text-[10px]">
                    {validationResult.totalClientsFound} Danışan · {validationResult.totalAnalysesFound} Analiz
                  </span>
                </div>
                <p className="text-[11px] opacity-90">{validationResult.summaryTr}</p>
                {validationResult.detailsTr.length > 0 && (
                  <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80 pt-1 border-t border-stone-800/60">
                    {validationResult.detailsTr.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                )}
                {validationResult.errorsTr.length > 0 && (
                  <ul className="list-disc list-inside text-[10px] text-rose-400 space-y-0.5 pt-1">
                    {validationResult.errorsTr.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKME 4: TEHLİKELİ İŞLEMLER */}
      {activeTab === 'DANGEROUS_OPERATIONS' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Yönetici Tehlikeli İşlemler Koruması</span>
            </div>
            <p className="leading-relaxed">
              Bu alandaki silme ve sıfırlama işlemleri doğrudan çalıştırılamaz; her işlem için açık onay penceresi açılır.
              İşlemler birbirinden tamamen bağımsızdır; örneğin bir danışanın testini sıfırlamak analizlerini veya reçetesini silmez.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 1. Belirli Bir Danışanı Sil */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-semibold text-stone-200 block">1. Münferit Danışan Silme</span>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Yalnızca seçilen danışanı ve ona ait tüm arşiv kayıtlarını (analiz, test, reçete, tasarım) siler.
                  Diğer hiçbir danışanın verisine dokunmaz.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                {clientRows.length === 0 ? (
                  <span className="text-stone-500 text-[11px]">Silinebilecek danışan kaydı yok.</span>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {clientRows.map((c) => (
                      <div
                        key={c.id}
                        className="p-2 bg-stone-950/70 border border-stone-800 rounded flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-stone-200 truncate block text-[11px]">
                            {c.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">{c.id}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDangerAction({ type: 'DELETE_CLIENT', client: c })}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 rounded transition-colors cursor-pointer shrink-0"
                        >
                          Sil...
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Danışan Test Sonuçlarını Sıfırla */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-semibold text-stone-200 block">2. Münferit Test Sıfırlama</span>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Danışanın yalnızca seçilen Enneagram veya Totem test sonucunu temizler.
                  Astroloji, numeroloji, çakra, arketip analizleri ve dövme reçeteleri kesinlikle korunur.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                {clientRows.filter((c) => c.enneagramCompleted || c.totemCompleted).length === 0 ? (
                  <span className="text-stone-500 text-[11px]">Testi tamamlanmış danışan kaydı yok.</span>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {clientRows
                      .filter((c) => c.enneagramCompleted || c.totemCompleted)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-2 bg-stone-950/70 border border-stone-800 rounded flex items-center justify-between gap-2"
                        >
                          <span className="font-semibold text-stone-200 truncate text-[11px]">
                            {c.fullName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {c.enneagramCompleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDangerAction({
                                    type: 'RESET_TEST',
                                    client: c,
                                    testType: 'ENNEAGRAM',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] text-amber-400 hover:text-amber-200 bg-stone-900 border border-stone-800 rounded cursor-pointer"
                              >
                                Enneagram'ı Sıfırla
                              </button>
                            )}
                            {c.totemCompleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDangerAction({
                                    type: 'RESET_TEST',
                                    client: c,
                                    testType: 'ANIMAL_TOTEM',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] text-amber-400 hover:text-amber-200 bg-stone-900 border border-stone-800 rounded cursor-pointer"
                              >
                                Totem'i Sıfırla
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Danışanın Dövme Tasarımlarını Temizle */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-semibold text-stone-200 block">3. Tasarım Sürümlerini Sıfırlama</span>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Danışanın dövme reçetesi ve görsel istem sürümlerini temizler.
                  Danışanın temel analiz sonuçları (Astroloji, Numeroloji, Çakra, Arketip) ve testleri KORUNUR.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                {clientRows.filter((c) => c.designVersionsCount > 0).length === 0 ? (
                  <span className="text-stone-500 text-[11px]">Tasarım sürümü olan danışan kaydı yok.</span>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {clientRows
                      .filter((c) => c.designVersionsCount > 0)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-2 bg-stone-950/70 border border-stone-800 rounded flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-200 truncate block text-[11px]">
                              {c.fullName}
                            </span>
                            <span className="text-[10px] text-amber-400">{c.designVersionsCount} Sürüm</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDangerAction({ type: 'CLEAR_DESIGNS', client: c })}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 rounded transition-colors cursor-pointer shrink-0"
                          >
                            Tasarımları Sıfırla...
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Tüm Uygulama Verisini Sıfırla (Çift Onay) */}
            <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-semibold text-rose-200 block">4. Tüm Sistem Veritabanını Sıfırla</span>
                <p className="text-rose-300/80 text-[11px] leading-relaxed">
                  Tüm danışanları, haritaları, analizleri, test sonuçlarını, sembolleri ve tasarım arşivini tamamen temizler.
                  Bu işlem geri alınamaz.
                </p>
              </div>

              <div className="pt-2 border-t border-rose-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setResetAllConfirmInput('');
                    setDangerAction({ type: 'RESET_ALL' });
                  }}
                  className="w-full py-2 px-3 text-xs font-bold text-rose-200 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Tüm Uygulama Verisini Sıfırla...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TEHLİKELİ İŞLEM ONAY MODALİ */}
      {dangerAction && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100">
                  {dangerAction.type === 'DELETE_CLIENT' && 'Danışan Silme Onayı'}
                  {dangerAction.type === 'RESET_TEST' && 'Test Sıfırlama Onayı'}
                  {dangerAction.type === 'CLEAR_DESIGNS' && 'Tasarım Arşivi Sıfırlama Onayı'}
                  {dangerAction.type === 'RESET_ALL' && 'TÜM SİSTEMİ SIFIRLAMA ONAYI'}
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  {dangerAction.type === 'DELETE_CLIENT' && (
                    <>
                      <strong className="text-stone-200">{dangerAction.client.fullName}</strong> danışanı ve ona ait tüm arşiv verileri kalıcı olarak silinecektir.
                      Diğer danışanlar bundan etkilenmez.
                    </>
                  )}
                  {dangerAction.type === 'RESET_TEST' && (
                    <>
                      <strong className="text-stone-200">{dangerAction.client.fullName}</strong> için yalnızca{' '}
                      <strong className="text-amber-300">
                        {dangerAction.testType === 'ENNEAGRAM' ? 'Enneagram' : 'Hayvan Totemi'}
                      </strong>{' '}
                      test sonucu temizlenecektir. Analizler ve reçeteler KORUNUR.
                    </>
                  )}
                  {dangerAction.type === 'CLEAR_DESIGNS' && (
                    <>
                      <strong className="text-stone-200">{dangerAction.client.fullName}</strong> için kayıtlı tüm dövme tasarımı ve reçete sürümleri silinecektir.
                      Astroloji, numeroloji, çakra ve arketip analizleri KORUNUR.
                    </>
                  )}
                  {dangerAction.type === 'RESET_ALL' && (
                    <>
                      Bu işlem geri alınamaz! Sistemdeki tüm danışan kayıtları, analizler ve dövme reçeteleri kalıcı olarak temizlenecektir.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* RESET_ALL İÇİN METİN KONTROLÜ */}
            {dangerAction.type === 'RESET_ALL' && (
              <div className="p-3 bg-stone-950/80 border border-rose-900/60 rounded-xl space-y-2 text-xs">
                <label className="text-stone-300 font-medium block">
                  Onaylamak için lütfen aşağıdaki kutuya tam olarak <span className="text-rose-400 font-mono font-bold">TÜMÜNÜ SİL</span> yazınız:
                </label>
                <input
                  type="text"
                  value={resetAllConfirmInput}
                  onChange={(e) => setResetAllConfirmInput(e.target.value)}
                  placeholder="TÜMÜNÜ SİL"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDangerAction(null);
                  setResetAllConfirmInput('');
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  dangerAction.type === 'RESET_ALL' && resetAllConfirmInput.trim() !== 'TÜMÜNÜ SİL'
                }
                onClick={handleConfirmDangerousAction}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-lg shadow-rose-950/40"
              >
                Onaylıyorum, İşlemi Gerçekleştir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
