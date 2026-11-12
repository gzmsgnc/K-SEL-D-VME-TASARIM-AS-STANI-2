import React from 'react';
import { useApp } from '../../store/AppContext';
import { AppRoute } from '../../types/navigation';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Shapes,
  Palette,
  FileText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewClientModal: () => void;
}

interface NavItemConfig {
  id: AppRoute;
  labelTr: string;
  shortLabelTr: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionTr: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'DASHBOARD',
    labelTr: 'Ana Sayfa',
    shortLabelTr: 'Ana Sayfa',
    icon: LayoutDashboard,
    descriptionTr: 'Stüdyo genel bakış ve metrikler',
  },
  {
    id: 'CLIENTS',
    labelTr: 'Danışanlar & Çalışma Alanı',
    shortLabelTr: 'Danışanlar',
    icon: Users,
    descriptionTr: 'Kayıtlı danışan arşivi, analiz ve tasarım atölyesi',
  },
  {
    id: 'SYMBOL_LIBRARY',
    labelTr: 'Sembol Kütüphanesi',
    shortLabelTr: 'Semboller',
    icon: Shapes,
    descriptionTr: '26 Master kutsal sembol koleksiyonu',
  },
  {
    id: 'SYSTEM_ADMIN',
    labelTr: 'Sistem Yönetimi',
    shortLabelTr: 'Yönetim',
    icon: ShieldCheck,
    descriptionTr: 'Yedekleme, denetim ve sistem araçları',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenNewClientModal,
}) => {
  const { currentRoute, setCurrentRoute, activeClient, setActiveClientId, setTargetDetailTab } = useApp();

  const handleNavClick = (route: AppRoute) => {
    if (route === 'ANALYSIS_HUB') {
      setTargetDetailTab('ANALYSES');
      setCurrentRoute('CLIENTS');
    } else if (route === 'DESIGN_STUDIO') {
      setTargetDetailTab('RECIPE');
      setCurrentRoute('CLIENTS');
    } else if (route === 'DESIGN_REPORTS') {
      setTargetDetailTab('RESULTS');
      setCurrentRoute('CLIENTS');
    } else {
      setCurrentRoute(route);
    }
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* 1. Logo ve Stüdyo Başlığı */}
      <div className="p-4 border-b border-stone-800 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('DASHBOARD')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:border-amber-400 transition-colors">
            <span className="font-serif text-sm font-bold">DT</span>
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0">
              <span className="block text-xs font-serif font-bold text-stone-100 tracking-wider truncate group-hover:text-amber-300 transition-colors">
                DÖVME TASARIM ASİSTANI
              </span>
              <span className="block text-[10px] text-stone-500 truncate">
                Ezoterik & Arketipik Stüdyo
              </span>
            </div>
          )}
        </button>

        {/* Mobil Kapatma Butonu */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-stone-400 hover:text-stone-200 p-1 rounded-lg"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Hızlı Danışan Ekle Butonu */}
      {(!isCollapsed || isMobileOpen) && (
        <div className="p-3 border-b border-stone-800/60">
          <button
            type="button"
            onClick={() => {
              onOpenNewClientModal();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-amber-900/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Danışan Ekle</span>
          </button>
        </div>
      )}

      {/* 3. Ana Menü Listesi (7 Madde) */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed && !isMobileOpen ? item.labelTr : undefined}
              className={`w-full text-left rounded-lg transition-all flex items-center gap-3 cursor-pointer group ${
                isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50 shadow-sm'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-amber-400' : 'text-stone-500 group-hover:text-stone-300'
                }`}
              />

              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-medium truncate ${
                      isActive ? 'text-stone-100 font-semibold' : 'text-stone-300'
                    }`}
                  >
                    {item.labelTr}
                  </span>
                  <span className="block text-[10px] text-stone-500 truncate">
                    {item.descriptionTr}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Alt Bilgi: Aktif Danışan ve Danışan Formu */}
      <div className="p-3 border-t border-stone-800 space-y-2 shrink-0">
        {/* Aktif Danışan Rozeti / Kartı */}
        {activeClient && (!isCollapsed || isMobileOpen) && (
          <div className="bg-stone-900/90 border border-stone-800/80 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Aktif Danışan</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveClientId(null)}
                title="Danışan seçimini kaldır"
                className="text-stone-500 hover:text-stone-300 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleNavClick('CLIENTS')}
              className="text-left w-full group cursor-pointer"
            >
              <div className="text-xs font-semibold text-stone-200 truncate group-hover:text-amber-300 transition-colors">
                {activeClient.firstName} {activeClient.lastName}
              </div>
              <div className="text-[10px] text-stone-500 truncate">
                {activeClient.birthLocation?.city || 'Şehir'} · {activeClient.birthDate}
              </div>
            </button>
          </div>
        )}

        {/* Danışan Bilgi Formu Bağlantısı */}
        <button
          type="button"
          onClick={() => {
            setCurrentRoute('CLIENT_FORM');
            onCloseMobile();
          }}
          className={`w-full text-left rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'
          } ${
            currentRoute === 'CLIENT_FORM'
              ? 'bg-stone-900 text-amber-300 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
          }`}
          title={isCollapsed && !isMobileOpen ? 'Danışan Bilgi Formu' : undefined}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400/80 shrink-0" />
          {(!isCollapsed || isMobileOpen) && (
            <span className="truncate">Danışan Bilgi Formu</span>
          )}
        </button>

        {/* Masaüstü Daralt / Genişlet Butonu */}
        <div className="hidden md:flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full py-1.5 px-2 text-[11px] text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Menüyü Daralt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Masaüstü Sabit Sidebar */}
      <aside
        className={`hidden md:block shrink-0 border-r border-stone-800 bg-stone-950 transition-all duration-200 sticky top-0 h-screen z-30 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobil Off-Canvas Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Karanlık Arka Plan Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Menü Paneli */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-stone-950 shadow-2xl z-10 border-r border-stone-800">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
