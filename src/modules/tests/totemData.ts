import { TestQuestion, TestEvaluationResult } from './types';

export interface TotemAnimalMeta {
  name: string;
  elementTr: string;
  coreTraitTr: string;
  instinctiveRoleTr: string;
  symbolicMeaningTr: string;
}

export const TOTEM_ANIMALS: Record<string, TotemAnimalMeta> = {
  Kurt: {
    name: 'Kurt',
    elementTr: 'Toprak & Ay',
    coreTraitTr: 'Sadakat, sezgisel rehberlik ve güçlü sürü bağı.',
    instinctiveRoleTr: 'Kendi sınırlarını ve sevdiklerini koruyan, özgür ruhlu muhafız.',
    symbolicMeaningTr: 'Derin içgüdüler, karanlıkta yolunu kaybetmeyen içsel pusula ve sarsılmaz bağlılık.',
  },
  Şahin: {
    name: 'Şahin',
    elementTr: 'Hava & Işık',
    coreTraitTr: 'Yüksek vizyon, keskin odak ve stratejik berraklık.',
    instinctiveRoleTr: 'Olaylara yukarıdan bakarak hakikati ilk fark eden gözlemci.',
    symbolicMeaningTr: 'Küçük detaylara takılmadan büyük resmi gören, zamanlama ustası yüksek bilinç.',
  },
  Ayı: {
    name: 'Ayı',
    elementTr: 'Toprak',
    coreTraitTr: 'İçsel güç, şifa, dayanıklılık ve kış uykusu dinginliği.',
    instinctiveRoleTr: 'Zorluklar karşısında sarsılmayan, kendi içine dönerek güç toplayan şifacı.',
    symbolicMeaningTr: 'Gereksiz kavgaya girmeyen ancak sınırlarına girildiğinde yenilmez olan kadim mukavemet.',
  },
  Baykuş: {
    name: 'Baykuş',
    elementTr: 'Hava & Gece',
    coreTraitTr: 'Gizem, derin bilgelik, görünmeyeni görme ve sezgi.',
    instinctiveRoleTr: 'Karanlığın ve yanılsamaların ötesindeki sırları çözen bilge.',
    symbolicMeaningTr: 'Sessiz gözlem, gece içgörüsü ve aldanışlara kanmayan keskin ruhsal algı.',
  },
  Yılan: {
    name: 'Yılan',
    elementTr: 'Toprak & Su',
    coreTraitTr: 'Dönüşüm, deri değiştirme, simyasal arınma ve yeniden doğuş.',
    instinctiveRoleTr: 'Eski kalıpları ve geçmişi geride bırakarak kendini sürekli yenileyen simyacı.',
    symbolicMeaningTr: 'Korkusuzca kabuk değiştirme, zehri panzehire çevirme ve döngüsel yenilenme.',
  },
  Geyik: {
    name: 'Geyik',
    elementTr: 'Orman & Su',
    coreTraitTr: 'Zarafet, incelik, yüksek duyarlılık ve nazik cesaret.',
    instinctiveRoleTr: 'Kabalaşmadan, asaletini ve hassasiyetini koruyarak engelleri aşan gezgin.',
    symbolicMeaningTr: 'Hassas antenler, saf kalp açıklığı ve sevecen ancak tetikteki duruş.',
  },
  Jaguar: {
    name: 'Jaguar',
    elementTr: 'Ateş & Gölge',
    coreTraitTr: 'Gölge cesareti, sessiz güç, gizlilik ve kararlı atılım.',
    instinctiveRoleTr: 'Kendi gölgesinden korkmayan, karanlıkta iz süren korkusuz avcı.',
    symbolicMeaningTr: 'Gereksiz ses çıkarmayan, tek hamlede hedefini bulan odaklanmış içsel irade.',
  },
  Kartal: {
    name: 'Kartal',
    elementTr: 'Hava & Eter',
    coreTraitTr: 'Ruhsal özgürlük, fırtınaların üstüne yükselme ve ilahi cesaret.',
    instinctiveRoleTr: 'Fırtınadan kaçmak yerine fırtınanın rüzgarını kullanarak yükselen fatih.',
    symbolicMeaningTr: 'Yüksek idealler, göksel bağlantı ve dünya bağlarının ötesine geçebilen ruh kanatları.',
  },
  Yunus: {
    name: 'Yunus',
    elementTr: 'Su & Nefes',
    coreTraitTr: 'Neşe, derin duygusal zeka, akışkanlık ve rehberlik.',
    instinctiveRoleTr: 'Fırtınalı sularda bile neşesini ve sevgisini kaybetmeyen uyum ustası.',
    symbolicMeaningTr: 'Nefesle gelen ferahlık, oyunbaz yaratıcılık ve dalgalarla uyum içinde süzülüş.',
  },
};

/**
 * 10 Gerçek Doğal İçgüdü ve Ruh Hayvanı Totemi Sorusu
 */
export const TOTEM_QUESTIONS: TestQuestion[] = [
  {
    id: 'tot_q1',
    order: 1,
    categoryTr: 'Doğal Yaşam Alanı',
    questionTr: 'Kendinizi doğada en çok hangi atmosferde ve coğrafyada güvende ve evinizde hissedersiniz?',
    options: [
      { id: 'tot_q1_o1', textTr: 'Sık ormanların derinliklerinde, ayaklarımın toprağa bastığı serin bir patikada.', associatedType: 'Kurt', weight: 3 },
      { id: 'tot_q1_o2', textTr: 'Yüksek bir dağın zirvesinde, rüzgarı yüzümde hissettiğim uçsuz bucaksız bir manzarada.', associatedType: 'Şahin', weight: 3 },
      { id: 'tot_q1_o3', textTr: 'Büyük ve korunaklı bir mağaranın, sessiz bir dağ eteğinin dinginliğinde.', associatedType: 'Ayı', weight: 3 },
      { id: 'tot_q1_o4', textTr: 'Sonsuz bir denizin, akışkan ve berrak dalgaların içinde.', associatedType: 'Yunus', weight: 3 },
    ],
  },
  {
    id: 'tot_q2',
    order: 2,
    categoryTr: 'Tehlike ve Tehdit',
    questionTr: 'Beklenmeyen bir tehlike veya saldırı anında en ilkel içgüdünüz neye yönelir?',
    options: [
      { id: 'tot_q2_o1', textTr: 'Sürümle / sevdiklerimle kenetlenip birlikte savunma hattı kurmaya.', associatedType: 'Kurt', weight: 3 },
      { id: 'tot_q2_o2', textTr: 'Hemen geri çekilip sessizce gölgelere sinerek doğru anı beklemeye.', associatedType: 'Jaguar', weight: 3 },
      { id: 'tot_q2_o3', textTr: 'Tüm ağırlığımla dikilip devasa bir mukavemetle saldırıyı püskürtmeye.', associatedType: 'Ayı', weight: 3 },
      { id: 'tot_q2_o4', textTr: 'Hızla yükselip tehdidin kaynağını ve rotasını havadan saptamaya.', associatedType: 'Kartal', weight: 3 },
    ],
  },
  {
    id: 'tot_q3',
    order: 3,
    categoryTr: 'Zaman ve Ritim',
    questionTr: 'Günün hangi vakti sizin zihinsel ve ruhsal algınızı en yüksek seviyeye taşır?',
    options: [
      { id: 'tot_q3_o1', textTr: 'Gecenin zifiri karanlığı ve sessizliği; her şey uyurken ben uyanırım.', associatedType: 'Baykuş', weight: 3 },
      { id: 'tot_q3_o2', textTr: 'Şafak vakti; güneşin ilk ışıklarıyla uyanan taze başlangıçlar.', associatedType: 'Geyik', weight: 3 },
      { id: 'tot_q3_o3', textTr: 'Öğle güneşi; ışığın en dik ve berrak parladığı anlar.', associatedType: 'Şahin', weight: 3 },
      { id: 'tot_q3_o4', textTr: 'Alacakaranlık; iki dünyanın ve formların birbirine karıştığı gizemli saatler.', associatedType: 'Yılan', weight: 3 },
    ],
  },
  {
    id: 'tot_q4',
    order: 4,
    categoryTr: 'Güç ve Yetenek',
    questionTr: 'Kendinizde en çok gurur duyduğunuz veya size bahşedilmiş en güçlü yeti hangisidir?',
    options: [
      { id: 'tot_q4_o1', textTr: 'Büyük zorlukları atlatıp sıfırdan küllerimden yeniden doğabilme kabiliyetim.', associatedType: 'Yılan', weight: 3 },
      { id: 'tot_q4_o2', textTr: 'İnsanların niyetlerini gözlerinden okuyabilen güçlü önsezilerim.', associatedType: 'Baykuş', weight: 3 },
      { id: 'tot_q4_o3', textTr: 'Korku bilmeden engellerin üzerine atılabilen cesur iradem.', associatedType: 'Kartal', weight: 3 },
      { id: 'tot_q4_o4', textTr: 'Zor anlarda bile etrafıma neşe, moral ve akışkanlık getirebilme yetim.', associatedType: 'Yunus', weight: 3 },
    ],
  },
  {
    id: 'tot_q5',
    order: 5,
    categoryTr: 'Yalnızlık ve Topluluk',
    questionTr: 'Yalnızlık ile topluluk arasındaki dengeniz nasıldır?',
    options: [
      { id: 'tot_q5_o1', textTr: 'Tek başıma da güçlüyüm ancak ait olduğum çekirdek grupla yenilmezim.', associatedType: 'Kurt', weight: 3 },
      { id: 'tot_q5_o2', textTr: 'Tamamen bağımsızım; tek başıma göklerde süzülmek bana yetkinlik verir.', associatedType: 'Şahin', weight: 3 },
      { id: 'tot_q5_o3', textTr: 'Uzun süreli yalnızlıklar bana şifa verir; kalabalıklardan periyodik olarak uzaklaşırım.', associatedType: 'Ayı', weight: 3 },
      { id: 'tot_q5_o4', textTr: 'Sosyal bir akış içindeyim; insanlarla oynamayı, paylaşmayı ve yüzmeyi severim.', associatedType: 'Yunus', weight: 3 },
    ],
  },
  {
    id: 'tot_q6',
    order: 6,
    categoryTr: 'Zorluklarla Yüzleşme',
    questionTr: 'Karşınıza devasa bir fırtına veya kriz çıktığında bedeninizin ilk tepkisi nedir?',
    options: [
      { id: 'tot_q6_o1', textTr: 'Fırtınanın rüzgarını kanatlarıma alıp onun da üstüne tırmanırım.', associatedType: 'Kartal', weight: 3 },
      { id: 'tot_q6_o2', textTr: 'Hemen kıvrak bir zarafetle ağaçların arasına süzülür, tehlikeyi atlatırım.', associatedType: 'Geyik', weight: 3 },
      { id: 'tot_q6_o3', textTr: 'Gölgeye çekilir, hiç ses çıkarmadan fırtınanın dağılmasını beklerim.', associatedType: 'Jaguar', weight: 3 },
      { id: 'tot_q6_o4', textTr: 'Eski yöntemleri bırakıp kabuğumu soyar, tamamen yeni bir yaklaşıma geçerim.', associatedType: 'Yılan', weight: 3 },
    ],
  },
  {
    id: 'tot_q7',
    order: 7,
    categoryTr: 'Av ve Hedef',
    questionTr: 'Ulaşmak istediğiniz büyük bir hedef olduğunda taktiğiniz hangisidir?',
    options: [
      { id: 'tot_q7_o1', textTr: 'Sabırla, adım adım iz sürer; doğru an gelene kadar çıt çıkarmam.', associatedType: 'Jaguar', weight: 3 },
      { id: 'tot_q7_o2', textTr: 'Kilometrelerce uzaktan tespit eder, tek bir dikey dalışla yakalarım.', associatedType: 'Şahin', weight: 3 },
      { id: 'tot_q7_o3', textTr: 'Ekiple strateji yapar, çevirme harekatıyla hedefe ulaşırım.', associatedType: 'Kurt', weight: 3 },
      { id: 'tot_q7_o4', textTr: 'Karanlıkta herkes uyurken sessizce hedefe yaklaşır ve alırım.', associatedType: 'Baykuş', weight: 3 },
    ],
  },
  {
    id: 'tot_q8',
    order: 8,
    categoryTr: 'Sezgi ve Görünmeyen',
    questionTr: 'Görünmeyen işaretler, rüyalar veya sezgisel fısıltılar hayatınızda ne kadar yer tutar?',
    options: [
      { id: 'tot_q8_o1', textTr: 'Rüyalarım ve gece hislerim bana geleceği ve görünmeyeni fısıldar.', associatedType: 'Baykuş', weight: 3 },
      { id: 'tot_q8_o2', textTr: 'Havadaki en ufak bir titreşimi, yaprak kımıldamasını bile anında sezerim.', associatedType: 'Geyik', weight: 3 },
      { id: 'tot_q8_o3', textTr: 'Toprağın ve doğanın altındaki kadim şifa enerjisini derinden hissederim.', associatedType: 'Ayı', weight: 3 },
      { id: 'tot_q8_o4', textTr: 'Dönüşüm zamanının geldiğini derimin altındaki sızıdan bilirim.', associatedType: 'Yılan', weight: 3 },
    ],
  },
  {
    id: 'tot_q9',
    order: 9,
    categoryTr: 'Karakter Özü',
    questionTr: 'Sizi tanıyan bir dostunuz sizin hakkınızda tek bir cümle kursa hangisi en doğru olurdu?',
    options: [
      { id: 'tot_q9_o1', textTr: 'Onun asil, zarif ve incitmekten çekinen çok temiz bir kalbi vardır.', associatedType: 'Geyik', weight: 3 },
      { id: 'tot_q9_o2', textTr: 'O hiçbir zaman pes etmez; koca bir dağı bile sırtlayacak gücü vardır.', associatedType: 'Ayı', weight: 3 },
      { id: 'tot_q9_o3', textTr: 'Ona asla zincir vuramazsınız; özgürlüğü için her şeyi feda edebilir.', associatedType: 'Kartal', weight: 3 },
      { id: 'tot_q9_o4', textTr: 'Onun yanında hayat neşeli, hafif ve dalgalarla oynamak kadar eğlencelidir.', associatedType: 'Yunus', weight: 3 },
    ],
  },
  {
    id: 'tot_q10',
    order: 10,
    categoryTr: 'Gölge ve Derinlik',
    questionTr: 'Karanlık, meçhul veya tehlikeli bir durumla yüzleştiğinizde içsel pusulanız:',
    options: [
      { id: 'tot_q10_o1', textTr: 'Karanlık beni ürkütmez; onunla bütünleşir ve onun dilini konuşurum.', associatedType: 'Jaguar', weight: 3 },
      { id: 'tot_q10_o2', textTr: 'Karanlığı yaran keskin gözlerimle hakikati ayrıştırırım.', associatedType: 'Baykuş', weight: 3 },
      { id: 'tot_q10_o3', textTr: 'İçimdeki uluma sesini dinler, sürüme ve ilkelerime güvenirim.', associatedType: 'Kurt', weight: 3 },
      { id: 'tot_q10_o4', textTr: 'Eski korkularımı geride bırakıp yenilenerek içinden geçerim.', associatedType: 'Yılan', weight: 3 },
    ],
  },
];

/**
 * A62: Soru Önem Ağırlıkları (Secondary Question Category Weights)
 * Karakter Özü ve Gölge/Derinlik soruları en yüksek ağırlığa sahiptir.
 */
export const QUESTION_IMPORTANCE_WEIGHTS: Record<string, number> = {
  tot_q9: 1.50, // Karakter Özü (Core Identity & Essence)
  tot_q10: 1.40, // Gölge ve Derinlik (Shadow & Depth)
  tot_q4: 1.25, // Güç ve Yetenek (Core Strength)
  tot_q2: 1.20, // Tehlike ve Tehdit (Crisis Instinct)
  tot_q6: 1.15, // Zorluklarla Yüzleşme (Adversity Navigation)
  tot_q7: 1.10, // Av ve Hedef (Strategy & Focus)
  tot_q8: 1.05, // Sezgi ve Görünmeyen (Intuition)
  tot_q3: 1.00, // Zaman ve Ritim (Temporal Rhythm)
  tot_q1: 0.90, // Doğal Yaşam Alanı (Habitat)
  tot_q5: 0.85, // Yalnızlık ve Topluluk (Social Balance)
};

export interface AnimalCharacteristicProfile {
  canonicalOrder: number; // 0..8: Kurt, Şahin, Ayı, Baykuş, Yılan, Geyik, Jaguar, Kartal, Yunus
  primaryDomains: string[];
}

/**
 * A62: 9 Totem Hayvanının Doğal Element ve Karakteristik Alan Profilleri
 */
export const TOTEM_ANIMAL_CHARACTERISTICS: Record<string, AnimalCharacteristicProfile> = {
  Kurt: {
    canonicalOrder: 0,
    primaryDomains: ['toprak', 'ay', 'suru', 'sadakat', 'orman'],
  },
  Şahin: {
    canonicalOrder: 1,
    primaryDomains: ['hava', 'isik', 'vizyon', 'odak', 'yuksek'],
  },
  Ayı: {
    canonicalOrder: 2,
    primaryDomains: ['toprak', 'mukavemet', 'yalnizlik', 'sifa', 'magara'],
  },
  Baykuş: {
    canonicalOrder: 3,
    primaryDomains: ['hava', 'gece', 'sezgi', 'bilgelik', 'gizem'],
  },
  Yılan: {
    canonicalOrder: 4,
    primaryDomains: ['toprak', 'su', 'donusum', 'simya', 'kabuk'],
  },
  Geyik: {
    canonicalOrder: 5,
    primaryDomains: ['orman', 'su', 'zarafet', 'incelik', 'saf'],
  },
  Jaguar: {
    canonicalOrder: 6,
    primaryDomains: ['ates', 'golge', 'gizlilik', 'avci', 'atilim'],
  },
  Kartal: {
    canonicalOrder: 7,
    primaryDomains: ['hava', 'eter', 'ozgurluk', 'ilahi', 'firtina'],
  },
  Yunus: {
    canonicalOrder: 8,
    primaryDomains: ['su', 'nefes', 'nese', 'akiskalik', 'sosyal'],
  },
};

/**
 * A62: Kesin ve Ayrık (Strictly Distinct) Yüzde Dağıtım Algoritması
 * Her hayvanın yüzdesi birbirinden farklıdır ve toplamı kesinlikle %100.0 eder.
 */
export function computeDistinctPercentages(sortedPriorityScores: number[]): number[] {
  const n = sortedPriorityScores.length;
  if (n === 0) return [];
  const total = sortedPriorityScores.reduce((sum, v) => sum + v, 0);
  const safeTotal = total > 0 ? total : 1;

  // 1. İlk orantısal yüzdeler (1 ondalık basamağa yuvarlanmış)
  let pcts = sortedPriorityScores.map((score) => {
    return Math.round(((score / safeTotal) * 100) * 10) / 10;
  });

  // 2. Taban payı kontrolü: Her sıranın en azından katı azalan olabilmesi için minimum pay
  for (let i = n - 1; i >= 0; i--) {
    const minRequired = Math.round((n - i) * 0.1 * 10) / 10;
    if (pcts[i] < minRequired) {
      pcts[i] = minRequired;
    }
  }

  // Katı azalanlık kuralını sağla: pcts[i] > pcts[i+1]
  for (let i = n - 2; i >= 0; i--) {
    if (pcts[i] <= pcts[i + 1]) {
      pcts[i] = Math.round((pcts[i + 1] + 0.1) * 10) / 10;
    }
  }

  // 3. Toplamı kesinlikle 100.0 yapacak şekilde kalibre et (katı azalanlığı bozmadan)
  let currentSum = Math.round(pcts.reduce((a, b) => a + b, 0) * 10) / 10;
  let diff = Math.round((100.0 - currentSum) * 10) / 10;

  let iterations = 0;
  while (Math.abs(diff) > 0.001 && iterations < 500) {
    iterations++;
    if (diff > 0) {
      // 0.1 ekleme: pcts[i] + 0.1 < pcts[i-1] şartını sağlayan en yüksek öncelikli elemana ekle
      let added = false;
      for (let i = 0; i < n; i++) {
        const canAdd = i === 0 || (Math.round((pcts[i] + 0.1) * 10) / 10 < pcts[i - 1]);
        if (canAdd) {
          pcts[i] = Math.round((pcts[i] + 0.1) * 10) / 10;
          diff = Math.round((diff - 0.1) * 10) / 10;
          added = true;
          break;
        }
      }
      if (!added) {
        pcts[0] = Math.round((pcts[0] + 0.1) * 10) / 10;
        diff = Math.round((diff - 0.1) * 10) / 10;
      }
    } else {
      // diff < 0: 0.1 çıkarma
      let subtracted = false;
      for (let i = n - 1; i >= 0; i--) {
        const canSub =
          i === n - 1
            ? pcts[i] > 0.15
            : Math.round((pcts[i] - 0.1) * 10) / 10 > pcts[i + 1];
        if (canSub) {
          pcts[i] = Math.round((pcts[i] - 0.1) * 10) / 10;
          diff = Math.round((diff + 0.1) * 10) / 10;
          subtracted = true;
          break;
        }
      }
      if (!subtracted) {
        pcts[0] = Math.round((pcts[0] + 0.1) * 10) / 10;
        diff = Math.round((diff - 0.1) * 10) / 10;
      }
    }
  }

  return pcts;
}

/**
 * A62: Deterministik İkincil Eşleştirme ve Önceliklendirme Motoru
 * Ham puanların yanı sıra soru kategori ağırlıklarını, elementer rezonansı
 * ve deterministik canonical imzayı kullanarak 9 hayvanı sıralar.
 */
/**
 * A62: Deterministik İkincil Eşleştirme ve Önceliklendirme Motoru
 * Ham puanların yanı sıra soru kategori ağırlıklarını, elementer rezonansı
 * ve deterministik canonical imzayı kullanarak pozitif puanlı hayvanları sıralar.
 * 
 * Kural 3 & 4:
 * - Ham puanı sıfır olan hayvanlara yapay pozitif öncelik puanı veya yüzde verilmez.
 * - Sıfır puanlı hayvanlar tasarım önerisi sıralamasının dışında tutulur (%0.0, Öncelik: 0).
 * - Pozitif puanlı hayvanların yüzdeleri yalnızca kendi aralarında hesaplanır ve toplamı %100.0 eder.
 */
export function computeTotemPriorityRankings(
  answersMap: Record<string, string>,
  rawScores: Record<string, number>
): import('../../types/test').TotemPriorityItem[] {
  // 1. Hayvanları ham puanlarına ve ikincil kriterlerine göre değerlendir
  const scoredItems = Object.keys(TOTEM_ANIMALS).map((animal) => {
    const rawScore = rawScores[animal] || 0;
    const meta = TOTEM_ANIMALS[animal];
    const charProfile = TOTEM_ANIMAL_CHARACTERISTICS[animal] || {
      canonicalOrder: 9,
      primaryDomains: [],
    };

    // Ham puanı 0 olan hayvanlar: Yapay pozitif puan veya yüzde almaz
    if (rawScore === 0) {
      return {
        animal,
        rawScore: 0,
        priorityScore: 0,
        isDesignCandidate: false,
        meta,
        charProfile,
        tieBreakReasonTr:
          'Ham puan: 0p (Danışan bu hayvana ait hiçbir soru şıkkını seçmemiştir. Yapay pozitif puan verilmez; tasarım önerisi sıralamasının dışındadır.)',
      };
    }

    // A) Doğrudan seçildiği soruların önem ağırlıkları toplamı (S_kategori)
    let categoryWeightSum = 0;
    const chosenQuestions: number[] = [];
    for (const q of TOTEM_QUESTIONS) {
      const selectedOptionId = answersMap ? answersMap[q.id] : undefined;
      const opt = q.options.find((o) => o.id === selectedOptionId);
      if (opt && opt.associatedType === animal) {
        categoryWeightSum += QUESTION_IMPORTANCE_WEIGHTS[q.id] || 1.0;
        chosenQuestions.push(q.order);
      }
    }

    // B) Danışanın tüm cevapları ile hayvanın element/alan rezonansı (S_rezonans)
    let affinityMatches = 0;
    for (const q of TOTEM_QUESTIONS) {
      const selectedOptionId = answersMap ? answersMap[q.id] : undefined;
      const opt = q.options.find((o) => o.id === selectedOptionId);
      if (opt && opt.associatedType !== animal) {
        const otherChar = TOTEM_ANIMAL_CHARACTERISTICS[opt.associatedType];
        if (otherChar) {
          const hasOverlap = otherChar.primaryDomains.some((d) =>
            charProfile.primaryDomains.includes(d)
          );
          if (hasOverlap) affinityMatches++;
        }
      }
    }

    // C) Deterministik canonical imza ofseti (S_sig)
    const signatureOffset = (9 - charProfile.canonicalOrder) * 0.0001;

    // Bileşik Öncelik Puanı:
    // rawScore baskındır (en az 3.0 puanlık ham farkı korur, ikincil katkılar < 0.60 tır)
    const secondaryBonus = (0.10 * categoryWeightSum) + (0.02 * affinityMatches) + signatureOffset;
    const priorityScore = Math.round((rawScore + secondaryBonus) * 10000) / 10000;

    const tieBreakReasonTr = `Ham: ${rawScore}p (Soru #${chosenQuestions.join(', ') || '-'}), Kategori Ağırlığı: +${(0.10 * categoryWeightSum).toFixed(3)}, Element Rezonansı: +${(0.02 * affinityMatches).toFixed(3)}`;

    return {
      animal,
      rawScore,
      priorityScore,
      isDesignCandidate: true,
      meta,
      charProfile,
      tieBreakReasonTr,
    };
  });

  // 2. Pozitif puanlı ve sıfır puanlı hayvanları ayır
  const positiveItems = scoredItems
    .filter((item) => item.isDesignCandidate)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const zeroItems = scoredItems
    .filter((item) => !item.isDesignCandidate)
    .sort((a, b) => a.charProfile.canonicalOrder - b.charProfile.canonicalOrder);

  // 3. Pozitif puanlı hayvanların yüzdelerini YALNIZCA KENDİ ARALARINDA hesapla (toplamı tam %100.0)
  const positivePriorityScores = positiveItems.map((item) => item.priorityScore);
  const distinctPercentages = computeDistinctPercentages(positivePriorityScores);

  // 4. Pozitif puanlı adayların tasarım ve mizaç rollerini oluştur
  const positiveRanked: import('../../types/test').TotemPriorityItem[] = positiveItems.map((item, idx) => {
    const rank = idx + 1;
    let role: 'PRIMARY_DESIGN' | 'FIRST_ALTERNATIVE' | 'ALTERNATIVE';
    let roleLabelTr: string;

    if (rank === 1) {
      role = 'PRIMARY_DESIGN';
      roleLabelTr = 'Ana Tasarım Önceliği';
    } else if (rank === 2) {
      role = 'FIRST_ALTERNATIVE';
      roleLabelTr = 'İlk Alternatif';
    } else {
      role = 'ALTERNATIVE';
      roleLabelTr = 'Alternatif';
    }

    let temperamentRoleTr = 'İkincil Mizaç Eğilimi';
    if (rank === 1) {
      temperamentRoleTr = 'Baskın Mizaç Totemi';
    } else if (rank === 2) {
      temperamentRoleTr = 'Tamamlayıcı Mizaç Totemi';
    }

    const pct = distinctPercentages[idx];
    const percentageFormatted = `%${pct.toFixed(1)}`;

    return {
      rank,
      animal: item.animal,
      rawScore: item.rawScore,
      priorityScore: item.priorityScore,
      percentage: pct,
      percentageFormatted,
      role,
      roleLabelTr,
      temperamentRoleTr,
      isApprovedForDesign: false,
      isDesignCandidate: true,
      elementTr: item.meta.elementTr,
      coreTraitTr: item.meta.coreTraitTr,
      symbolicMeaningTr: item.meta.symbolicMeaningTr,
      tieBreakReasonTr: item.tieBreakReasonTr,
    };
  });

  // 5. Sıfır puanlı hayvanları tasarım önerisi dışı olarak ekle (Yapay puan ve yüzde verilmez)
  const zeroRanked: import('../../types/test').TotemPriorityItem[] = zeroItems.map((item, idx) => {
    const rank = positiveItems.length + idx + 1;
    return {
      rank,
      animal: item.animal,
      rawScore: 0,
      priorityScore: 0,
      percentage: 0,
      percentageFormatted: '%0.0',
      role: 'OUTSIDE_RECOMMENDATION',
      roleLabelTr: 'Tasarım Önerisi Dışı (0 Puan)',
      temperamentRoleTr: 'Mizaçta Belirgin Değil (0 Puan)',
      isApprovedForDesign: false,
      isDesignCandidate: false,
      elementTr: item.meta.elementTr,
      coreTraitTr: item.meta.coreTraitTr,
      symbolicMeaningTr: item.meta.symbolicMeaningTr,
      tieBreakReasonTr: item.tieBreakReasonTr,
    };
  });

  return [...positiveRanked, ...zeroRanked];
}

/**
 * 10 Soruluk Cevap Matrisinden Hayvan Totemini ve Tasarım Öncelik Sıralamasını Hesaplar
 * Kural 1: Tasarım önceliği ile mizaç analizindeki baskın hayvan ayrı kavramlar olarak ele alınır.
 * Kural 2: Ana tasarım önceliği, alternatifler ve mizaç yorumları birbirleriyle çelişmez.
 * Kural 3 & 4: 0 puanlı hayvanlara yapay puan/yüzde verilmez, pozitif puanlıların yüzdeleri toplamı %100 eder.
 * Kural 7: Eksik zorunlu cevap varsa sonuç hesaplanmaz.
 * Kural 18: Görsel tasarıma zorla sokulmaz; danışan onaysız dövmeye eklenmez.
 */
export function evaluateTotemTest(
  answersMap: Record<string, string>
): TestEvaluationResult {
  const missingQuestions: string[] = [];
  for (const q of TOTEM_QUESTIONS) {
    const answerId = answersMap ? answersMap[q.id] : undefined;
    const isValidOption = Boolean(answerId && q.options.some((o) => o.id === answerId));
    if (!isValidOption) {
      missingQuestions.push(q.order.toString());
    }
  }

  if (missingQuestions.length > 0) {
    throw new Error(
      `Totem testi tamamlanmadı. Lütfen eksik soruları (${missingQuestions.join(', ')}) cevaplayınız.`
    );
  }

  const scores: Record<string, number> = {};
  for (const animal of Object.keys(TOTEM_ANIMALS)) {
    scores[animal] = 0;
  }

  for (const q of TOTEM_QUESTIONS) {
    const selectedOptionId = answersMap[q.id];
    const option = q.options.find((o) => o.id === selectedOptionId);
    if (option && scores[option.associatedType] !== undefined) {
      scores[option.associatedType] += option.weight;
    }
  }

  // A62 Deterministik Önceliklendirme ve İkincil Eşleştirme Sıralaması
  const priorityRankings = computeTotemPriorityRankings(answersMap, scores);

  const primaryTotemName = priorityRankings[0].animal;
  const secondaryTotemName =
    priorityRankings[1] && priorityRankings[1].rawScore > 0 ? priorityRankings[1].animal : undefined;
  const primaryMeta = TOTEM_ANIMALS[primaryTotemName];

  const priorityScores: Record<string, number> = {};
  const percentageScores: Record<string, number> = {};
  for (const item of priorityRankings) {
    priorityScores[item.animal] = item.priorityScore;
    percentageScores[item.animal] = item.percentage;
  }

  const interpretations: string[] = [
    `Mizaç Analizi Boyutu: Baskın Mizaç Totemi: ${primaryTotemName} (${primaryMeta?.elementTr || ''} Elementi - Ham Puan: ${scores[primaryTotemName]}p). ${primaryMeta?.coreTraitTr || ''}`,
    `İçgüdüsel Rol & Sembolik Anlam: ${primaryMeta?.instinctiveRoleTr || ''} · ${primaryMeta?.symbolicMeaningTr || ''}`,
    secondaryTotemName && TOTEM_ANIMALS[secondaryTotemName]
      ? `Tamamlayıcı Mizaç Totemi: ${secondaryTotemName} (${TOTEM_ANIMALS[secondaryTotemName].coreTraitTr} - Ham Puan: ${scores[secondaryTotemName]}p).`
      : 'Tamamlayıcı Mizaç Totemi: Bulunmuyor (Tekil odaklı ruh rehberliği).',
    `Dövme Tasarımı Boyutu: Ana Tasarım Önceliği: ${primaryTotemName} (Tasarım Öncelik Puanı: ${priorityRankings[0].priorityScore.toFixed(4)}, Tasarım Rezonansı: ${priorityRankings[0].percentageFormatted}); ${priorityRankings[1] && priorityRankings[1].rawScore > 0 ? `İlk Alternatif: ${priorityRankings[1].animal} (${priorityRankings[1].percentageFormatted})` : 'İlk Alternatif: Bulunmuyor'}.`,
    `Tasarım Entegrasyon Notu (Kural 18): Mizaç analizi ile dövme tasarımı iki ayrı boyuttur. Totem hayvanı öncelikli olarak danışanın içgüdüsel mizaç analizi içindir. Dövme tasarımında doğrudan figür olarak değil, ancak danışan onay verirse soyut geometrik çizgilerle entegre edilir. Sıfır puanlı hayvanlar yapay puan almaz ve tasarım önerisi sıralamasının dışındadır.`,
  ];

  return {
    primaryType: primaryTotemName,
    secondaryType: secondaryTotemName,
    dominantScores: scores,
    interpretations,
    totemPriorityRankings: priorityRankings,
    rawScores: scores,
    priorityScores,
    percentageScores,
  };
}
