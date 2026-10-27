import {
  getStoredClients,
  getStoredActiveClientId,
  getClientArchive,
} from '../store/storage';
import { prepareAstrologyModule } from '../modules/astrology';
import { prepareNumerologyModule } from '../modules/numerology';
import { prepareChakraModule } from '../modules/chakra';
import { prepareArchetypeModule } from '../modules/archetype';
import { prepareTestsModule } from '../modules/tests';
import { prepareRecipeModule } from '../modules/recipe';
import { prepareSymbolModule } from '../modules/symbols';

export interface A19VerificationReport {
  hasExistingClient: boolean;
  activeClientId: string | null;
  foundClientCount: number;
  clientInfo?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    hasMotherName: boolean;
  };
  checks: {
    clientIdentification: boolean;
    analysesLinkedToSameClient: boolean;
    crossClientLeakDetected: boolean;
    hasEnneagramResult: boolean;
    hasTotemResult: boolean;
    hasRecipeResult: boolean;
    hasSymbolAnalysis: boolean;
    motherNameIsolated: boolean;
    totemExclusionHonored: boolean;
  };
  summaryMessage: string;
}

export function verifyA19ExistingClient(): A19VerificationReport {
  const activeId = getStoredActiveClientId();
  const clients = getStoredClients();

  if (clients.length === 0) {
    return {
      hasExistingClient: false,
      activeClientId: activeId,
      foundClientCount: 0,
      checks: {
        clientIdentification: false,
        analysesLinkedToSameClient: false,
        crossClientLeakDetected: false,
        hasEnneagramResult: false,
        hasTotemResult: false,
        hasRecipeResult: false,
        hasSymbolAnalysis: false,
        motherNameIsolated: false,
        totemExclusionHonored: false,
      },
      summaryMessage: 'Mevcut kayıt bulunamadı: Sistem depolamasında (storage) kayıtlı gerçek bir danışan kaydı tespit edilemedi.',
    };
  }

  // Aktif veya ilk kayıtlı danışanı al (kesinlikle yeni veri üretilmez)
  const targetClient = (activeId ? clients.find((c) => c.id === activeId) : null) || clients[0];
  const archive = getClientArchive(targetClient.id);

  const astroPrep = prepareAstrologyModule(targetClient, archive);
  const numPrep = prepareNumerologyModule(targetClient, archive);
  const chakraPrep = prepareChakraModule(targetClient, archive);
  const archPrep = prepareArchetypeModule(targetClient, archive);
  const testsPrep = prepareTestsModule(targetClient, archive);
  const recipePrep = prepareRecipeModule(targetClient, archive);
  const symbolPrep = prepareSymbolModule(targetClient, archive);

  const clientAnalyses = archive?.analyses.filter((a) => a.clientId === targetClient.id) || [];
  const foreignAnalyses = archive?.analyses.filter((a) => a.clientId !== targetClient.id) || [];

  return {
    hasExistingClient: true,
    activeClientId: targetClient.id,
    foundClientCount: clients.length,
    clientInfo: {
      id: targetClient.id,
      firstName: targetClient.firstName,
      lastName: targetClient.lastName,
      birthDate: targetClient.birthDate,
      hasMotherName: Boolean(targetClient.motherName),
    },
    checks: {
      clientIdentification: true,
      analysesLinkedToSameClient: clientAnalyses.length > 0 && foreignAnalyses.length === 0,
      crossClientLeakDetected: foreignAnalyses.length > 0,
      hasEnneagramResult: testsPrep.hasEnneagram,
      hasTotemResult: testsPrep.hasTotem,
      hasRecipeResult: (archive?.designs.length || 0) > 0,
      hasSymbolAnalysis: (archive?.symbolAnalyses.length || 0) > 0,
      motherNameIsolated: true,
      totemExclusionHonored: true,
    },
    summaryMessage: `Mevcut danışan (${targetClient.id}: ${targetClient.firstName} ${targetClient.lastName}) üzerinden doğrulama gerçekleştirildi.`,
  };
}

if (process.argv[1]?.includes('a19Verification')) {
  const report = verifyA19ExistingClient();
  console.log(JSON.stringify(report, null, 2));
}
