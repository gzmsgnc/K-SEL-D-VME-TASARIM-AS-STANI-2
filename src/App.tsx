import React from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './components/common/Header';
import { ClientIntakeForm } from './components/client-form/ClientIntakeForm';
import { OwnerWorkspace } from './components/workspace/OwnerWorkspace';
import { SystemAdminControlCenter } from './components/admin/SystemAdminControlCenter';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainContent: React.FC = () => {
  const { mode } = useApp();

  return (
    <main className="min-h-[calc(100vh-65px)]">
      <ErrorBoundary>
        {mode === 'CLIENT_FORM' ? (
          <ClientIntakeForm />
        ) : mode === 'SYSTEM_ADMIN' ? (
          <SystemAdminControlCenter />
        ) : (
          <OwnerWorkspace />
        )}
      </ErrorBoundary>
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
        <Header />
        <MainContent />
        <footer className="border-t border-stone-800/60 py-6 px-6 text-center text-xs text-stone-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>DÖVME TASARIM ASİSTANI · Kişiye Özel Analiz & Konsept Altyapısı</span>
            <span>Batı / Tropical Astroloji & Global Koordinat Sistemi</span>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
