import React, { useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/navigation/Sidebar';
import { StudioDashboard } from './components/dashboard/StudioDashboard';
import { ClientIntakeForm } from './components/client-form/ClientIntakeForm';
import { OwnerWorkspace } from './components/workspace/OwnerWorkspace';
import { SymbolLibraryCatalog } from './components/symbols/SymbolLibraryCatalog';
import { SystemAdminControlCenter } from './components/admin/SystemAdminControlCenter';
import { NewClientModal } from './components/workspace/NewClientModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppShell: React.FC = () => {
  const { currentRoute } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Danışan Bilgi Formu modu: Danışan ön yüzü
  if (currentRoute === 'CLIENT_FORM') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
        <Header onOpenNewClientModal={() => setIsNewClientModalOpen(true)} />
        <main className="flex-1">
          <ErrorBoundary>
            <ClientIntakeForm />
          </ErrorBoundary>
        </main>
        <footer className="border-t border-stone-800/60 py-6 px-6 text-center text-xs text-stone-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>DÖVME TASARIM ASİSTANI · Danışan Bilgi & Ön Görüşme Formu</span>
            <span>Batı / Tropical Astroloji & Global Koordinat Altyapısı</span>
          </div>
        </footer>
        <NewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex font-sans">
      {/* 1. Sol Sabit Navigasyon Menüsü (Masaüstü ve Mobil Drawer) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
      />

      {/* 2. Sağ Ana İçerik ve Görünüm Alanı */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Üst Çubuk */}
        <Header
          onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
          onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
        />

        {/* Ana İçerik Rotası */}
        <main className="flex-1">
          <ErrorBoundary>
            {currentRoute === 'DASHBOARD' && (
              <StudioDashboard onOpenNewClientModal={() => setIsNewClientModalOpen(true)} />
            )}

            {(currentRoute === 'CLIENTS' ||
              currentRoute === 'ANALYSIS_HUB' ||
              currentRoute === 'DESIGN_STUDIO' ||
              currentRoute === 'DESIGN_REPORTS') && (
              <OwnerWorkspace />
            )}

            {currentRoute === 'SYMBOL_LIBRARY' && (
              <SymbolLibraryCatalog />
            )}

            {currentRoute === 'SYSTEM_ADMIN' && (
              <SystemAdminControlCenter />
            )}
          </ErrorBoundary>
        </main>

        {/* Alt Bilgi */}
        <footer className="border-t border-stone-800/60 py-6 px-6 text-center text-xs text-stone-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>DÖVME TASARIM ASİSTANI · Kişiye Özel Ezoterik & Arketipik Tasarım Stüdyosu</span>
            <span>Batı / Tropical Astroloji & Global Koordinat Altyapısı</span>
          </div>
        </footer>
      </div>

      {/* Global Yeni Danışan Modal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
