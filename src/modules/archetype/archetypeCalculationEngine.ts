import { ArchetypeAnalysis, ChakraAnalysis, NumerologyAnalysis } from '../../types/analysis';
import { ClientTestResult } from '../../types/test';
import { NUMBER_RESONANCE_TABLE } from '../numerology/constants';
import { CHAKRA_DEFINITIONS } from '../chakra/constants';
import { ARCHETYPE_DEFINITIONS, CHAKRA_SHADOW_MAP } from './constants';

/**
 * Numeroloji matrisi ve Çakra analizi çıktılarından (ve varsa Enneagram test sonucundan)
 * Birleşik Arketip ve Gölge Arketip çözümlemesini üretir.
 * 
 * Sorumluluk İlkesi:
 * Numeroloji veya Çakra hesaplarını tekrar yapmaz. A12 ve A13'te hesaplanan
 * doğrulanmış çıktıları girdi olarak alır.
 */
export function calculateArchetypeAnalysis(
  numerology: NumerologyAnalysis,
  chakra: ChakraAnalysis,
  enneagramResult?: ClientTestResult
): ArchetypeAnalysis {
  if (!numerology || typeof numerology.lifePathNumber !== 'number') {
    throw new Error('Arketip çözümlemesi için geçerli bir Numeroloji matrisi gereklidir.');
  }

  if (!chakra || !Array.isArray(chakra.chakras) || chakra.chakras.length === 0) {
    throw new Error('Arketip çözümlemesi için geçerli bir Çakra analizi gereklidir.');
  }

  // 1. Birincil Arketip (Primary Archetype)
  // Yaşam Yolu sayısının arketip rezonansı temel alınır.
  const primaryResonance = NUMBER_RESONANCE_TABLE[numerology.lifePathNumber];
  const primaryName = primaryResonance?.associatedArchetype || 'Mistik / Bilge';
  const primaryMeta = ARCHETYPE_DEFINITIONS[primaryName] || ARCHETYPE_DEFINITIONS['Mistik / Bilge'];

  // 2. İkincil Arketip (Secondary Archetype)
  // Kader / İfade sayısı, Yaşam Yolu ile aynıysa Ruh Arzusu sayısı kullanılır.
  let secondaryNumber = numerology.destinyNumber;
  if (secondaryNumber === numerology.lifePathNumber) {
    secondaryNumber = numerology.soulUrgeNumber || numerology.worldMissionNumber || 1;
  }
  const secondaryResonance = NUMBER_RESONANCE_TABLE[secondaryNumber];
  let secondaryName = secondaryResonance?.associatedArchetype || 'Aşık / Rehber';

  // Eğer Enneagram testi varsa ikincil arketip unvanına derin psikolojik katkı eklenir
  if (enneagramResult && enneagramResult.primaryType) {
    secondaryName = `${secondaryName} · ${enneagramResult.primaryType}`;
  }

  // 3. Birleşik Arketip Açıklaması (Unified Description)
  const dominantChakraName = chakra.dominantChakra;
  const dominantChakraDef = dominantChakraName ? CHAKRA_DEFINITIONS[dominantChakraName] : null;

  const descriptionParts: string[] = [];
  descriptionParts.push(
    `Danışanın temel varoluşsal rotası "${primaryName}" arketipinin ışığıyla (${primaryMeta.coreMotiveTr}) şekillenmektedir.`
  );
  descriptionParts.push(
    `Dış dünyadaki eylem ve ifade biçimi ise "${secondaryName}" arketipi üzerinden somutlaşır.`
  );

  if (dominantChakraDef) {
    descriptionParts.push(
      `En yüksek enerji akışına sahip olan ${dominantChakraDef.nameTr} (${dominantChakraDef.sanskritName}), bu arketipin ${dominantChakraDef.elementTr} odaklı yaratıcı gücünü beslemektedir.`
    );
  }

  const description = descriptionParts.join(' ');

  // 4. Gölge Arketip (Shadow Archetype)
  // Çakra analizindeki öncelikli destek/blokaj merkezinden veya birincil arketipin gölge potansiyelinden türer.
  let shadowName: string;
  let transformationalSymbol: string;

  if (chakra.primaryDeficit && CHAKRA_SHADOW_MAP[chakra.primaryDeficit]) {
    const shadowMapping = CHAKRA_SHADOW_MAP[chakra.primaryDeficit];
    shadowName = shadowMapping.shadowName;
    transformationalSymbol = shadowMapping.transformationalSymbol;
  } else {
    shadowName = primaryMeta.shadowName;
    transformationalSymbol = primaryMeta.transformationalSymbol;
  }

  return {
    unifiedArchetype: {
      primary: primaryName,
      secondary: secondaryName,
      description,
    },
    shadowArchetype: {
      shadowName,
      transformationalSymbol,
    },
  };
}
