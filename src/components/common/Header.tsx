import React from 'react';
import { useApp } from '../../store/AppContext';
import { AppRoute } from '../../types/navigation';
import {
  Menu,
  User,
  UserPlus,
  FileSpreadsheet,
  LayoutDashboard,
  Users,
  Sparkles,
  Shapes,
  Palette,
  FileText,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenNewClientModal?: () => void;
}

const ROUTE_LABELS: Record<AppRoute, string> = {
  DASHBOARD: 'Ana Sayfa',
  CLIENTS: 'Danışanlar & Çalışma Alanı',
  ANALYSIS_HUB: 'Analizler',
  SYMBOL_LIBRARY: 'Sembol Kütüphanesi',
  DESIGN_STUDIO: 'Tasarım Atölyesi',
  DESIGN_REPORTS: 'Tasarım Raporları',
  SYSTEM_ADMIN: 'Sistem Yönetimi',
  CLIENT_FORM: 'Danışan Bilgi Formu',
};

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenNewClientModal,
}) => {
  const { currentRoute, setCurrentRoute, activeClient, setActiveClientId } = useApp();

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/90 backdrop-blur-md sticky top-0 z-20">
      {/* Zone 1: Mobil Menü Butonu & Breadcrumb / Konum */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden text-stone-400 hover:text-stone-200 p-1.5 -ml-1 rounded-lg hover:bg-stone-900 transition-colors"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCurrentRoute('DASHBOARD')}
            className="text-stone-300 hover:text-amber-400 font-serif font-bold tracking-tight transition-colors whitespace-nowrap cursor-pointer"
          >
            DÖVME TASARIM ASİSTANI
          </button>

          <span className="text-stone-600 hidden sm:inline" aria-hidden="true">/</span>

          <span className="text-amber-400 font-medium whitespace-nowrap hidden sm:inline">
            {ROUTE_LABELS[currentRoute] || 'Ana Sayfa'}
          </span>

          {currentRoute === 'CLIENTS' && activeClient && (
            <>
              <span className="text-stone-600 hidden md:inline" aria-hidden="true">/</span>
              <span className="text-stone-300 font-semibold truncate max-w-[140px] hidden md:inline">
                {activeClient.firstName} {activeClient.lastName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Aktif Danışan Durumu */}
      <div className="hidden lg:flex items-center gap-3">
        {activeClient ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-stone-900/90 border border-stone-800 rounded-full text-xs text-stone-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-stone-400">Aktif:</span>
            <button
              type="button"
              onClick={() => setCurrentRoute('CLIENTS')}
              className="font-medium text-stone-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              {activeClient.firstName} {activeClient.lastName}
            </button>
            <button
              type="button"
              onClick={() => setActiveClientId(null)}
              title="Aktif danışan seçimini kaldır"
              className="text-stone-500 hover:text-stone-300 ml-1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-stone-500">
            Seçili danışan yok
          </span>
        )}
      </div>

      {/* Zone 3: 1-2 Birincil Eylem Butonu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onOpenNewClientModal && currentRoute !== 'CLIENT_FORM' && (
          <button
            type="button"
            onClick={onOpenNewClientModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-900/20 whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yeni Danışan</span>
          </button>
        )}

        {currentRoute === 'CLIENT_FORM' ? (
          <button
            type="button"
            onClick={() => setCurrentRoute('DASHBOARD')}
            className="px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Atölyeye Dön</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentRoute('CLIENT_FORM')}
            className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer hidden sm:flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>Danışan Bilgi Formu</span>
          </button>
        )}
      </div>
    </header>
  );
};
