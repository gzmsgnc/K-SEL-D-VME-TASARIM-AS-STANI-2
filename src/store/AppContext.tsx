import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, ClientFormData } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { TropicalNatalChart } from '../types/astrology';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis } from '../types/analysis';
import { ClientTattooDesign } from '../types/design';
import { ClientSymbolAnalysis } from '../types/symbol';
import { ClientTestResult, TestType } from '../types/test';
import {
  getStoredClients,
  createClientRecord,
  getClientArchive,
  deleteClientRecord,
  updateClientRecord,
  saveClientAstrologyChart,
  clearClientAstrologyChart,
  saveClientNumerology as saveClientNumerologyStorage,
  clearClientNumerology as clearClientNumerologyStorage,
  saveClientChakra as saveClientChakraStorage,
  clearClientChakra as clearClientChakraStorage,
  saveClientArchetype as saveClientArchetypeStorage,
  clearClientArchetype as clearClientArchetypeStorage,
  saveClientDesign as saveClientDesignStorage,
  deleteClientDesign as deleteClientDesignStorage,
  clearClientDesigns as clearClientDesignsStorage,
  saveClientSymbolAnalysis as saveClientSymbolAnalysisStorage,
  deleteClientSymbolAnalysis as deleteClientSymbolAnalysisStorage,
  clearClientSymbolAnalyses as clearClientSymbolAnalysesStorage,
  saveClientTestResult as saveClientTestResultStorage,
  clearClientTestResult as clearClientTestResultStorage,
  getStoredActiveClientId,
  setStoredActiveClientId,
  clearAllApplicationData as clearAllApplicationDataStorage,
} from './storage';
import { validateClientFormData } from '../validation/clientValidation';
import { runClientAutoAnalysisChain, AutoAnalysisChainResult, AutoAnalysisChainOptions } from '../modules/pipeline';

export type AppMode = 'CLIENT_FORM' | 'OWNER_WORKSPACE' | 'SYSTEM_ADMIN';

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  clients: Client[];
  activeClient: Client | null;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  activeClientArchive: ClientArchiveRecord | null;
  submitClientForm: (data: ClientFormData) => Promise<{ success: boolean; errors?: Record<string, string>; client?: Client }>;
  createClientManual: (data: ClientFormData) => Promise<{ success: boolean; errors?: Record<string, string>; client?: Client }>;
  updateClient: (client: Client) => { success: boolean; error?: string };
  deleteClient: (clientId: string) => void;
  refreshClients: () => void;
  resetAllSystemData: () => void;
  saveClientAstrology: (clientId: string, chart: TropicalNatalChart) => { success: boolean; error?: string };
  clearClientAstrology: (clientId: string) => void;
  saveClientNumerology: (clientId: string, numerology: NumerologyAnalysis) => { success: boolean; error?: string };
  clearClientNumerology: (clientId: string) => void;
  saveClientChakra: (clientId: string, chakra: ChakraAnalysis) => { success: boolean; error?: string };
  clearClientChakra: (clientId: string) => void;
  saveClientArchetype: (clientId: string, archetype: ArchetypeAnalysis) => { success: boolean; error?: string };
  clearClientArchetype: (clientId: string) => void;
  saveClientDesign: (clientId: string, design: ClientTattooDesign) => { success: boolean; error?: string };
  deleteClientDesign: (clientId: string, designId: string) => void;
  clearClientDesigns: (clientId: string) => void;
  saveClientSymbolAnalysis: (clientId: string, analysis: ClientSymbolAnalysis) => { success: boolean; error?: string };
  deleteClientSymbolAnalysis: (clientId: string, analysisId: string) => void;
  clearClientSymbolAnalyses: (clientId: string) => void;
  saveClientTestResult: (clientId: string, testResult: ClientTestResult) => { success: boolean; error?: string };
  clearClientTestResult: (clientId: string, testType?: TestType) => void;
  runAutoAnalysisForClient: (client: Client, options?: AutoAnalysisChainOptions) => AutoAnalysisChainResult;
  lastChainResult: AutoAnalysisChainResult | null;
  clearLastChainResult: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('OWNER_WORKSPACE');
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(() => getStoredActiveClientId());
  const [lastChainResult, setLastChainResult] = useState<AutoAnalysisChainResult | null>(null);

  const [archiveVersion, setArchiveVersion] = useState(0);

  const changeActiveClientId = (id: string | null) => {
    setActiveClientId(id);
    setStoredActiveClientId(id);
    setLastChainResult(null);
  };

  const refreshClients = () => {
    const list = getStoredClients();
    setClients(list);
    setArchiveVersion((v) => v + 1);
    setActiveClientId((prevId) => {
      const storedId = getStoredActiveClientId();
      const candidateId = prevId || storedId;
      if (candidateId && list.some((c) => c.id === candidateId)) {
        setStoredActiveClientId(candidateId);
        return candidateId;
      }
      const fallbackId = list.length > 0 ? list[0].id : null;
      setStoredActiveClientId(fallbackId);
      return fallbackId;
    });
  };

  useEffect(() => {
    refreshClients();
  }, []);

  const activeClient = clients.find((c) => c.id === activeClientId) || null;
  const activeClientArchive = React.useMemo(
    () => (activeClientId ? getClientArchive(activeClientId) : null),
    [activeClientId, archiveVersion]
  );

  const submitClientForm = async (formData: ClientFormData) => {
    const validation = validateClientFormData(formData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const created = createClientRecord(formData, 'CLIENT_FORM');
      changeActiveClientId(created.id);
      const chainRes = runClientAutoAnalysisChain(created, { autoGenerateDesign: true });
      setLastChainResult(chainRes);
      refreshClients();
      return { success: true, client: created };
    } catch {
      return {
        success: false,
        errors: { form: 'Kayıt sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.' },
      };
    }
  };

  const createClientManual = async (formData: ClientFormData) => {
    const validation = validateClientFormData(formData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const created = createClientRecord(formData, 'OWNER_MANUAL');
      changeActiveClientId(created.id);
      const chainRes = runClientAutoAnalysisChain(created, { autoGenerateDesign: true });
      setLastChainResult(chainRes);
      refreshClients();
      return { success: true, client: created };
    } catch {
      return {
        success: false,
        errors: { form: 'Kayıt oluşturulurken bir hata oluştu.' },
      };
    }
  };

  const updateClient = (updatedClient: Client) => {
    try {
      updateClientRecord(updatedClient);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Güncelleme başarısız oldu.' };
    }
  };

  const deleteClient = (clientId: string) => {
    deleteClientRecord(clientId);
    refreshClients();
  };

  const resetAllSystemData = () => {
    clearAllApplicationDataStorage();
    refreshClients();
  };

  const saveClientAstrology = (clientId: string, chart: TropicalNatalChart) => {
    try {
      saveClientAstrologyChart(clientId, chart);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Astroloji kaydı kaydedilemedi.' };
    }
  };

  const clearClientAstrology = (clientId: string) => {
    clearClientAstrologyChart(clientId);
    refreshClients();
  };

  const saveClientNumerology = (clientId: string, numerology: NumerologyAnalysis) => {
    try {
      saveClientNumerologyStorage(clientId, numerology);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Numeroloji kaydı kaydedilemedi.' };
    }
  };

  const clearClientNumerology = (clientId: string) => {
    clearClientNumerologyStorage(clientId);
    refreshClients();
  };

  const saveClientChakra = (clientId: string, chakra: ChakraAnalysis) => {
    try {
      saveClientChakraStorage(clientId, chakra);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Çakra kaydı kaydedilemedi.' };
    }
  };

  const clearClientChakra = (clientId: string) => {
    clearClientChakraStorage(clientId);
    refreshClients();
  };

  const saveClientArchetype = (clientId: string, archetype: ArchetypeAnalysis) => {
    try {
      saveClientArchetypeStorage(clientId, archetype);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Arketip kaydı kaydedilemedi.' };
    }
  };

  const clearClientArchetype = (clientId: string) => {
    clearClientArchetypeStorage(clientId);
    refreshClients();
  };

  const saveClientDesign = (clientId: string, design: ClientTattooDesign) => {
    try {
      saveClientDesignStorage(clientId, design);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Dövme reçetesi kaydedilemedi.' };
    }
  };

  const deleteClientDesign = (clientId: string, designId: string) => {
    deleteClientDesignStorage(clientId, designId);
    refreshClients();
  };

  const clearClientDesigns = (clientId: string) => {
    clearClientDesignsStorage(clientId);
    refreshClients();
  };

  const saveClientSymbolAnalysis = (clientId: string, analysis: ClientSymbolAnalysis) => {
    try {
      saveClientSymbolAnalysisStorage(clientId, analysis);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Sembol analizi kaydedilemedi.' };
    }
  };

  const deleteClientSymbolAnalysis = (clientId: string, analysisId: string) => {
    deleteClientSymbolAnalysisStorage(clientId, analysisId);
    refreshClients();
  };

  const clearClientSymbolAnalyses = (clientId: string) => {
    clearClientSymbolAnalysesStorage(clientId);
    refreshClients();
  };

  const saveClientTestResult = (clientId: string, testResult: ClientTestResult) => {
    try {
      saveClientTestResultStorage(clientId, testResult);
      refreshClients();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Test sonucu kaydedilemedi.' };
    }
  };

  const clearClientTestResult = (clientId: string, testType?: TestType) => {
    clearClientTestResultStorage(clientId, testType);
    refreshClients();
  };

  const runAutoAnalysisForClient = (
    client: Client,
    options?: AutoAnalysisChainOptions
  ): AutoAnalysisChainResult => {
    const res = runClientAutoAnalysisChain(client, { autoGenerateDesign: true, ...options });
    setLastChainResult(res);
    refreshClients();
    return res;
  };

  const clearLastChainResult = () => {
    setLastChainResult(null);
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        clients,
        activeClient,
        activeClientId,
        setActiveClientId: changeActiveClientId,
        activeClientArchive,
        submitClientForm,
        createClientManual,
        updateClient,
        deleteClient,
        refreshClients,
        resetAllSystemData,
        saveClientAstrology,
        clearClientAstrology,
        saveClientNumerology,
        clearClientNumerology,
        saveClientChakra,
        clearClientChakra,
        saveClientArchetype,
        clearClientArchetype,
        saveClientDesign,
        deleteClientDesign,
        clearClientDesigns,
        saveClientSymbolAnalysis,
        deleteClientSymbolAnalysis,
        clearClientSymbolAnalyses,
        saveClientTestResult,
        clearClientTestResult,
        runAutoAnalysisForClient,
        lastChainResult,
        clearLastChainResult,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
