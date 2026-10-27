import React from 'react';
import { useApp } from '../../store/AppContext';

export const Header: React.FC = () => {
  const { mode, setMode } = useApp();

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-stone-800 bg-stone-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMode('OWNER_WORKSPACE')}
          className="text-lg font-serif tracking-tight text-stone-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          DÖVME TASARIM ASİSTANI
        </button>
      </div>

      {/* Zone 2: Temiz Tek Satır Navigasyon Bağlantıları */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-stone-400">
        <button
          type="button"
          onClick={() => setMode('CLIENT_FORM')}
          className={`hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            mode === 'CLIENT_FORM' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Danışan Bilgi Formu
        </button>
        {mode !== 'CLIENT_FORM' && (
          <>
            <button
              type="button"
              onClick={() => setMode('OWNER_WORKSPACE')}
              className={`hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'OWNER_WORKSPACE' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Çalışma Alanı & Arşiv
            </button>
            <button
              type="button"
              onClick={() => setMode('SYSTEM_ADMIN')}
              className={`hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                mode === 'SYSTEM_ADMIN' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <span>Sistem Yönetimi</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                A32
              </span>
            </button>
          </>
        )}
      </nav>

      {/* Zone 3: 1 Birincil Eylem Butonu */}
      <div className="flex items-center gap-3 shrink-0">
        {mode === 'CLIENT_FORM' ? (
          <button
            type="button"
            onClick={() => setMode('OWNER_WORKSPACE')}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-amber-900/30"
          >
            Uygulama Sahibi Girişi
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {mode === 'SYSTEM_ADMIN' ? (
              <button
                type="button"
                onClick={() => setMode('OWNER_WORKSPACE')}
                className="px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Çalışma Alanına Dön
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('SYSTEM_ADMIN')}
                className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sistem Kontrol Merkezi
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('CLIENT_FORM')}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Danışan Form Görünümü
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
