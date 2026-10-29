import { ChakraAnalysis, ChakraName, ChakraState } from '../../types/analysis';
import { NumerologyAnalysis } from '../../types/analysis';
import { CHAKRA_DEFINITIONS, CHAKRA_ORDER } from './constants';

/**
 * Pisagor Sayı Arketipi & Elementel Çakra Rezonansı Sentezi
 * (Standart Pisagor'un klasik çakra tablosu olarak değil; sayı arketipi ve elementel rezonans sentezidir)
 * 
 * Numeroloji analiz çıktılarından (NumerologyAnalysis) 7 temel çakranın enerji dengesini,
 * skorlarını, baskın ve destek ihtiyacı olan çakralarını hesaplar.
 * 
 * Sorumluluk ilkesi:
 * Numeroloji hesaplamasını asla baştan yapmaz; doğrudan NumerologyAnalysis çıktısını girdi olarak kabul eder.
 */
export function calculateChakraAnalysisFromNumerology(
  numerology: NumerologyAnalysis
): ChakraAnalysis {
  if (!numerology) {
    throw new Error('Çakra analizi için geçerli bir numeroloji matrisi gereklidir.');
  }

  const {
    lifePathNumber,
    destinyNumber,
    soulUrgeNumber,
    personalityNumber,
    birthdayNumber,
    worldMissionNumber,
    karmicLessons = [],
    masterNumbers = [],
  } = numerology;

  const states: ChakraState[] = [];

  for (const chakraName of CHAKRA_ORDER) {
    const def = CHAKRA_DEFINITIONS[chakraName];
    const targetNumbers = def.associatedNumbers;

    // Başlangıç nötr skor: 5.0 (1-10 ölçeğinde tam denge)
    let score = 5.0;

    // 1. Yaşam Yolu Rezonansı (+2.5 puan)
    if (targetNumbers.includes(lifePathNumber)) {
      score += 2.5;
    }

    // 2. Kader / İfade Rezonansı (+2.0 puan)
    if (targetNumbers.includes(destinyNumber)) {
      score += 2.0;
    }

    // 3. Ruh Arzusu Rezonansı (+1.5 puan)
    if (targetNumbers.includes(soulUrgeNumber)) {
      score += 1.5;
    }

    // 4. Kişilik Sayısı Rezonansı (+1.0 puan)
    if (targetNumbers.includes(personalityNumber)) {
      score += 1.0;
    }

    // 5. Doğum Günü Sayısı Rezonansı (+1.0 puan)
    if (targetNumbers.includes(birthdayNumber)) {
      score += 1.0;
    }

    // 6. Dünya Misyonu Rezonansı (+1.0 puan)
    if (targetNumbers.includes(worldMissionNumber)) {
      score += 1.0;
    }

    // 7. Master Sayı (11, 22, 33) Katkısı (+1.5 puan)
    const hasMaster = targetNumbers.some((n) => masterNumbers.includes(n));
    if (hasMaster) {
      score += 1.5;
    }

    // 8. Karmik Dersler (Eksik Sayılar) Tıkanıklığı (-3.5 puan)
    const hasKarmicDeficit = targetNumbers.some((n) => karmicLessons.includes(n));
    if (hasKarmicDeficit) {
      score -= 3.5;
    }

    // Skoru 1 ile 10 arasında tam sayıya yuvarla
    const finalScore = Math.min(10, Math.max(1, Math.round(score)));

    // Durum sınıflandırması:
    // - BLOCKED / UNDERACTIVE -> Destek İhtiyacı / Blokaj
    // - BALANCED -> Dengeli
    // - OVERACTIVE -> Açık
    let status: ChakraState['status'];
    if (hasKarmicDeficit && finalScore <= 4) {
      status = 'BLOCKED';
    } else if (finalScore <= 4) {
      status = 'UNDERACTIVE';
    } else if (finalScore >= 8) {
      status = 'OVERACTIVE';
    } else {
      status = 'BALANCED';
    }

    // Dövme sembolizminde güçlendirici odak önerileri
    const recommendations = generateRecommendations(def, status, hasKarmicDeficit);

    states.push({
      chakra: chakraName,
      status,
      score: finalScore,
      focusRecommendations: recommendations,
    });
  }

  // Baskın Çakrayı (dominantChakra) Belirle: En yüksek skora sahip olan
  let dominantChakra: ChakraName = 'HEART';
  let maxScore = -1;
  for (const s of states) {
    if (s.score > maxScore) {
      maxScore = s.score;
      dominantChakra = s.chakra;
    }
  }

  // Destek Gereken Çakraları (deficitChakras) ve Öncelikli Çakrayı (primaryDeficit) Belirle:
  // Kural: Yalnızca s.score <= 4 olan (BLOCKED veya UNDERACTIVE - Destek İhtiyacı / Blokaj) çakralar.
  // Bu çakralar arasındaki en düşük puana sahip TÜM çakralar (eşit puanlar dahil) tespit edilir.
  // Eğer hiçbir çakra 4 veya altında değilse (tümü dengeli/açık), destek çakrası bulunmaz ([]).
  // KURAL: dominantChakra hiçbir koşulda deficitChakras içine alınamaz.
  let minScore = 11;
  for (const s of states) {
    if (s.chakra !== dominantChakra && s.score <= 4 && s.score < minScore) {
      minScore = s.score;
    }
  }

  let deficitChakras: ChakraName[] = [];
  if (minScore <= 4) {
    deficitChakras = states
      .filter((s) => s.chakra !== dominantChakra && s.score === minScore)
      .map((s) => s.chakra);
  }

  const primaryDeficit = deficitChakras.length > 0 ? deficitChakras[0] : undefined;

  return {
    chakras: states,
    dominantChakra,
    primaryDeficit,
    deficitChakras,
  };
}

/**
 * Çakranın durumuna ve numerolojik yapısına göre dövme tasarımında kullanılacak
 * sembolik odak öğelerini türetir.
 */
function generateRecommendations(
  def: (typeof CHAKRA_DEFINITIONS)[ChakraName],
  status: ChakraState['status'],
  hasKarmicDeficit: boolean
): string[] {
  const list: string[] = [];

  list.push(def.tattooStrengtheningTheme);

  if (status === 'BLOCKED' || hasKarmicDeficit) {
    list.push(`Karmik rezonans eksikliğini (${def.associatedNumbers.join(', ')} titreşimi) dengeleyen koruyucu geometrik öğeler.`);
    list.push(`${def.elementTr} elementini aktive eden doğrudan sembolizm.`);
  } else if (status === 'UNDERACTIVE') {
    list.push(`Akışı güçlendirici açık yönlü hatlar ve ${def.elementTr} odaklı dövme yerleşimi.`);
  } else if (status === 'OVERACTIVE') {
    list.push(`Aşırı enerji birikimini topraklayan ve diğer merkezlere dağıtan çevreleyici hatlar.`);
  } else {
    list.push(`Mevcut dengeli akışı sabitleyen ve koruyan simetrik kompozisyon.`);
  }

  return list;
}
