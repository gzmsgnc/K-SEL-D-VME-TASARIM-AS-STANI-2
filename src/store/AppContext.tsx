import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, ClientFormData } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { TropicalNatalChart } from '../types/astrology';
import { NumerologyAnalysis, ChakraAnalysis, ArchetypeAnalysis, EbcedAnalysis } from '../types/analysis';
import { ClientTattooDesign } from '../types/design';
import { ClientSymbolAnalysis } from '../types/symbol';
import { ClientTestResult, TestType, ClientTestDraft } from '../types/test';
import { ClientTattooReport } from '../types/report';
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
  saveClientEbced as saveClientEbcedStorage,
  clearClientEbced as clearClientEbcedStorage,
  saveClientChakra as saveClientChakraStorage,
  clearClientChakra as clearClientChakraStorage,
  saveClientArchetype as saveClientArchetypeStorage,
  clearClientArchetype as clearClientArchetypeStorage,
  saveClientDesign as saveClientDesignStorage,
  deleteClientDesign as deleteClientDesignStorage,
  clearClientDesigns as clearClientDesignsStorage,
  saveClientReport as saveClientReportStorage,
  clearClientReports as clearClientReportsStorage,
  saveClientSymbolAnalysis as saveClientSymbolAnalysisStorage,
  deleteClientSymbolAnalysis as deleteClientSymbolAnalysisStorage,
  clearClientSymbolAnalyses as clearClientSymbolAnalysesStorage,
  saveClientTestResult as saveClientTestResultStorage,
  clearClientTestResult as clearClientTestResultStorage,
  saveClientTestDraft as saveClientTestDraftStorage,
  getClientTestDraft as getClientTestDraftStorage,
  clearClientTestDraft as clearClientTestDraftStorage,
  getStoredActiveClientId,
  setStoredActiveClientId,
  clearAllApplicationData as clearAllApplicationDataStorage,
  StorageWriteStatus,
  MultiStorageWriteStatus,
  getLastStorageWriteResult,
} from './storage';
import { validateClientFormData } from '../validation/clientValidation';
import { runClientAutoAnalysisChain, AutoAnalysisChainResult, AutoAnalysisChainOptions } from '../modules/pipeline';

import { AppRoute, WorkspaceDetailTab } from '../types/navigation';

export type AppMode = 'CLIENT_FORM' | 'OWNER_WORKSPACE' | 'SYSTEM_ADMIN';

export interface AppStorageResult {
  success: boolean;
  storageStatus?: StorageWriteStatus | MultiStorageWriteStatus;
  warning?: string;
  error?: string;
}

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
  targetDetailTab: WorkspaceDetailTab | null;
  setTargetDetailTab: (tab: WorkspaceDetailTab | null) => void;
  navigateToClient: (clientId: string, tab?: WorkspaceDetailTab) => void;
  clients: Client[];
  activeClient: Client | null;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  activeClientArchive: ClientArchiveRecord | null;
  submitClientForm: (data: ClientFormData) => Promise<{ success: boolean; storageStatus?: StorageWriteStatus | MultiStorageWriteStatus; warning?: string; errors?: Record<string, string>; client?: Client }>;
  createClientManual: (data: ClientFormData) => Promise<{ success: boolean; storageStatus?: StorageWriteStatus | MultiStorageWriteStatus; warning?: string; errors?: Record<string, string>; client?: Client }>;
  updateClient: (client: Client) => AppStorageResult;
  deleteClient: (clientId: string) => AppStorageResult;
  refreshClients: () => void;
  resetAllSystemData: () => AppStorageResult;
  saveClientAstrology: (clientId: string, chart: TropicalNatalChart) => AppStorageResult;
  clearClientAstrology: (clientId: string) => AppStorageResult;
  saveClientNumerology: (clientId: string, numerology: NumerologyAnalysis) => AppStorageResult;
  clearClientNumerology: (clientId: string) => AppStorageResult;
  saveClientEbced: (clientId: string, ebced: EbcedAnalysis) => AppStorageResult;
  clearClientEbced: (clientId: string) => AppStorageResult;
  saveClientChakra: (clientId: string, chakra: ChakraAnalysis) => AppStorageResult;
  clearClientChakra: (clientId: string) => AppStorageResult;
  saveClientArchetype: (clientId: string, archetype: ArchetypeAnalysis) => AppStorageResult;
  clearClientArchetype: (clientId: string) => AppStorageResult;
  saveClientDesign: (clientId: string, design: ClientTattooDesign) => AppStorageResult;
  deleteClientDesign: (clientId: string, designId: string) => AppStorageResult;
  clearClientDesigns: (clientId: string) => AppStorageResult;
  saveClientReport: (clientId: string, report: ClientTattooReport) => AppStorageResult;
  clearClientReports: (clientId: string) => AppStorageResult;
  saveClientSymbolAnalysis: (clientId: string, analysis: ClientSymbolAnalysis) => AppStorageResult;
  deleteClientSymbolAnalysis: (clientId: string, analysisId: string) => AppStorageResult;
  clearClientSymbolAnalyses: (clientId: string) => AppStorageResult;
  saveClientTestResult: (clientId: string, testResult: ClientTestResult) => AppStorageResult;
  clearClientTestResult: (clientId: string, testType?: TestType) => AppStorageResult;
  saveClientTestDraft: (clientId: string, testType: TestType, answers: Record<string, string>, activeQuestionIndex?: number) => AppStorageResult;
  getClientTestDraft: (clientId: string, testType: TestType) => ClientTestDraft | null;
  clearClientTestDraft: (clientId: string, testType?: TestType) => AppStorageResult;
  runAutoAnalysisForClient: (client: Client, options?: AutoAnalysisChainOptions) => AutoAnalysisChainResult;
  lastChainResult: AutoAnalysisChainResult | null;
  clearLastChainResult: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRouteState] = useState<AppRoute>('DASHBOARD');
  const [targetDetailTab, setTargetDetailTab] = useState<WorkspaceDetailTab | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(() => getStoredActiveClientId());
  const [lastChainResult, setLastChainResult] = useState<AutoAnalysisChainResult | null>(null);

  const [archiveVersion, setArchiveVersion] = useState(0);

  // Geriye dönük AppMode senkronizasyonu
  const mode: AppMode =
    currentRoute === 'CLIENT_FORM'
      ? 'CLIENT_FORM'
      : currentRoute === 'SYSTEM_ADMIN'
      ? 'SYSTEM_ADMIN'
      : 'OWNER_WORKSPACE';

  // Rota yönlendirme ve eski ClientModulePicker rotalarını doğrudan CLIENTS altına bağlama
  const setCurrentRoute = (route: AppRoute) => {
    if (route === 'ANALYSIS_HUB') {
      setTargetDetailTab('ANALYSES');
      setCurrentRouteState('CLIENTS');
    } else if (route === 'DESIGN_STUDIO') {
      setTargetDetailTab('RECIPE');
      setCurrentRouteState('CLIENTS');
    } else if (route === 'DESIGN_REPORTS') {
      setTargetDetailTab('RESULTS');
      setCurrentRouteState('CLIENTS');
    } else {
      setCurrentRouteState(route);
    }
  };

  const setMode = (newMode: AppMode) => {
    if (newMode === 'CLIENT_FORM') setCurrentRoute('CLIENT_FORM');
    else if (newMode === 'SYSTEM_ADMIN') setCurrentRoute('SYSTEM_ADMIN');
    else setCurrentRoute('CLIENTS');
  };

  const changeActiveClientId = (id: string | null) => {
    setActiveClientId(id);
    setStoredActiveClientId(id);
    setLastChainResult(null);
  };

  const navigateToClient = (clientId: string, tab?: WorkspaceDetailTab) => {
    changeActiveClientId(clientId);
    if (tab) {
      setTargetDetailTab(tab);
    }
    setCurrentRoute('CLIENTS');
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
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
        client: created,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        errors: { form: err?.message || 'Kayıt sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.' },
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
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
        client: created,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        errors: { form: err?.message || 'Kayıt oluşturulurken bir hata oluştu.' },
      };
    }
  };

  const updateClient = (updatedClient: Client) => {
    try {
      updateClientRecord(updatedClient);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Güncelleme başarısız oldu.',
      };
    }
  };

  const deleteClient = (clientId: string) => {
    try {
      const success = deleteClientRecord(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || (success ? 'persisted' : 'failed');
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Danışan silinemedi.',
      };
    }
  };

  const resetAllSystemData = (): AppStorageResult => {
    try {
      const success = clearAllApplicationDataStorage();
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || (success ? 'persisted' : 'failed');
      return {
        success: storageStatus === 'persisted',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Veriler sıfırlanamadı.',
      };
    }
  };

  const saveClientAstrology = (clientId: string, chart: TropicalNatalChart) => {
    try {
      saveClientAstrologyChart(clientId, chart);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Astroloji kaydı kaydedilemedi.',
      };
    }
  };

  const clearClientAstrology = (clientId: string): AppStorageResult => {
    try {
      clearClientAstrologyChart(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Astroloji kaydı sıfırlanamadı.',
      };
    }
  };

  const saveClientNumerology = (clientId: string, numerology: NumerologyAnalysis) => {
    try {
      saveClientNumerologyStorage(clientId, numerology);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Numeroloji kaydı kaydedilemedi.',
      };
    }
  };

  const clearClientNumerology = (clientId: string): AppStorageResult => {
    try {
      clearClientNumerologyStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Numeroloji kaydı sıfırlanamadı.',
      };
    }
  };

  const saveClientEbced = (clientId: string, ebced: EbcedAnalysis) => {
    try {
      saveClientEbcedStorage(clientId, ebced);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Ebced kaydı kaydedilemedi.',
      };
    }
  };

  const clearClientEbced = (clientId: string): AppStorageResult => {
    try {
      clearClientEbcedStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Ebced kaydı sıfırlanamadı.',
      };
    }
  };

  const saveClientChakra = (clientId: string, chakra: ChakraAnalysis) => {
    try {
      saveClientChakraStorage(clientId, chakra);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Çakra kaydı kaydedilemedi.',
      };
    }
  };

  const clearClientChakra = (clientId: string): AppStorageResult => {
    try {
      clearClientChakraStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Çakra kaydı sıfırlanamadı.',
      };
    }
  };

  const saveClientArchetype = (clientId: string, archetype: ArchetypeAnalysis) => {
    try {
      saveClientArchetypeStorage(clientId, archetype);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Arketip kaydı kaydedilemedi.',
      };
    }
  };

  const clearClientArchetype = (clientId: string): AppStorageResult => {
    try {
      clearClientArchetypeStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Arketip kaydı sıfırlanamadı.',
      };
    }
  };

  const saveClientDesign = (clientId: string, design: ClientTattooDesign) => {
    try {
      saveClientDesignStorage(clientId, design);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Dövme reçetesi kaydedilemedi.',
      };
    }
  };

  const deleteClientDesign = (clientId: string, designId: string): AppStorageResult => {
    try {
      deleteClientDesignStorage(clientId, designId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Tasarım silinemedi.',
      };
    }
  };

  const clearClientDesigns = (clientId: string): AppStorageResult => {
    try {
      clearClientDesignsStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Tasarımlar sıfırlanamadı.',
      };
    }
  };

  const saveClientReport = (clientId: string, report: ClientTattooReport) => {
    try {
      saveClientReportStorage(clientId, report);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Tasarım tamamlama raporu kaydedilemedi.',
      };
    }
  };

  const clearClientReports = (clientId: string): AppStorageResult => {
    try {
      clearClientReportsStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Raporlar sıfırlanamadı.',
      };
    }
  };

  const saveClientSymbolAnalysis = (clientId: string, analysis: ClientSymbolAnalysis) => {
    try {
      saveClientSymbolAnalysisStorage(clientId, analysis);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Sembol analizi kaydedilemedi.',
      };
    }
  };

  const deleteClientSymbolAnalysis = (clientId: string, analysisId: string): AppStorageResult => {
    try {
      deleteClientSymbolAnalysisStorage(clientId, analysisId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Sembol analizi silinemedi.',
      };
    }
  };

  const clearClientSymbolAnalyses = (clientId: string): AppStorageResult => {
    try {
      clearClientSymbolAnalysesStorage(clientId);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Sembol analizleri sıfırlanamadı.',
      };
    }
  };

  const saveClientTestResult = (clientId: string, testResult: ClientTestResult) => {
    try {
      saveClientTestResultStorage(clientId, testResult);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Test sonucu kaydedilemedi.',
      };
    }
  };

  const clearClientTestResult = (clientId: string, testType?: TestType): AppStorageResult => {
    try {
      clearClientTestResultStorage(clientId, testType);
      refreshClients();
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Test sonucu sıfırlanamadı.',
      };
    }
  };

  const saveClientTestDraft = (
    clientId: string,
    testType: TestType,
    answers: Record<string, string>,
    activeQuestionIndex?: number
  ) => {
    try {
      saveClientTestDraftStorage(clientId, testType, answers, activeQuestionIndex);
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Test taslağı kaydedilemedi.',
      };
    }
  };

  const getClientTestDraft = (clientId: string, testType: TestType): ClientTestDraft | null => {
    return getClientTestDraftStorage(clientId, testType);
  };

  const clearClientTestDraft = (clientId: string, testType?: TestType): AppStorageResult => {
    try {
      clearClientTestDraftStorage(clientId, testType);
      const lastRes = getLastStorageWriteResult();
      const storageStatus = (lastRes as any)?.status || 'persisted';
      return {
        success: storageStatus !== 'failed',
        storageStatus,
        warning: (lastRes as any)?.warning,
      };
    } catch (err: any) {
      const lastRes = getLastStorageWriteResult();
      return {
        success: false,
        storageStatus: (lastRes as any)?.status || 'failed',
        error: err?.message || 'Test taslağı silinemedi.',
      };
    }
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
        currentRoute,
        setCurrentRoute,
        targetDetailTab,
        setTargetDetailTab,
        navigateToClient,
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
        saveClientEbced,
        clearClientEbced,
        saveClientChakra,
        clearClientChakra,
        saveClientArchetype,
        clearClientArchetype,
        saveClientDesign,
        deleteClientDesign,
        clearClientDesigns,
        saveClientReport,
        clearClientReports,
        saveClientSymbolAnalysis,
        deleteClientSymbolAnalysis,
        clearClientSymbolAnalyses,
        saveClientTestResult,
        clearClientTestResult,
        saveClientTestDraft,
        getClientTestDraft,
        clearClientTestDraft,
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
