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
 * 10 Soruluk Cevap Matrisinden Hayvan Totemini Hesaplar
 * Kural 7: Eksik zorunlu cevap varsa sonuç hesaplanmaz.
 * Kural 18: Görsel tasarıma zorla sokulmaz; analiz-yalnızca niteliği korunur.
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

  // Puanlara göre azalan sırala; puan eşitliğinde deterministik alfabetik kural uygula (A22 Kural 5)
  const sortedAnimals = Object.entries(scores).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0], 'tr');
  });

  const primaryTotemName = sortedAnimals[0][0];
  const secondaryTotemName =
    sortedAnimals[1] && sortedAnimals[1][1] > 0 ? sortedAnimals[1][0] : undefined;
  const primaryMeta = TOTEM_ANIMALS[primaryTotemName];

  const interpretations: string[] = [
    `Ana Ruh Hayvanı Totemi: ${primaryTotemName} (${primaryMeta?.elementTr || ''} Elementi). ${primaryMeta?.coreTraitTr || ''}`,
    `İçgüdüsel Rol: ${primaryMeta?.instinctiveRoleTr || ''}`,
    `Sembolik Derinlik: ${primaryMeta?.symbolicMeaningTr || ''}`,
    secondaryTotemName && TOTEM_ANIMALS[secondaryTotemName]
      ? `Tamamlayıcı Rehber Totem: ${secondaryTotemName} (${TOTEM_ANIMALS[secondaryTotemName].coreTraitTr})`
      : 'Tekil odaklı totem rehberliği.',
    `Tasarım Entegrasyon Notu (Kural 18): Totem hayvanı öncelikli olarak danışanın içgüdüsel mizaç analizi içindir. Dövme tasarımında doğrudan figür olarak değil, ancak danışan onay verirse soyut geometrik çizgilerle entegre edilir.`,
  ];

  return {
    primaryType: primaryTotemName,
    secondaryType: secondaryTotemName,
    dominantScores: scores,
    interpretations,
  };
}
