import { TestQuestion, TestEvaluationResult, TestQuestionAnswer } from './types';

export interface EnneagramTypeMeta {
  typeNumber: number;
  nameTr: string;
  coreDesireTr: string;
  coreFearTr: string;
  temperamentTr: string;
  potentialWings: number[];
}

export const ENNEAGRAM_TYPES: Record<number, EnneagramTypeMeta> = {
  1: {
    typeNumber: 1,
    nameTr: 'Tip 1 - Reformcu / İdealist',
    coreDesireTr: 'Doğru, adil ve ilkeli olmak; kusursuzluğa ulaşmak.',
    coreFearTr: 'Hatalı, yozlaşmış veya yetersiz olmak.',
    temperamentTr: 'Yüksek içsel standartlar, sorumluluk ve düzen arayışı.',
    potentialWings: [9, 2],
  },
  2: {
    typeNumber: 2,
    nameTr: 'Tip 2 - Yardımsever / Şefkatli',
    coreDesireTr: 'Sevilmek, değer görmek ve başkalarının hayatına dokunmak.',
    coreFearTr: 'İstenmeyen veya sevilmeye layık görülmemek.',
    temperamentTr: 'Empati, cömertlik ve ilişki odaklı koruyuculuk.',
    potentialWings: [1, 3],
  },
  3: {
    typeNumber: 3,
    nameTr: 'Tip 3 - Başarı Odaklı / Motivatör',
    coreDesireTr: 'Değerli hissetmek, hedeflere ulaşmak ve yetkinliğini göstermek.',
    coreFearTr: 'Başarısız olmak veya değersiz algılanmak.',
    temperamentTr: 'Verimlilik, odaklanma, pragmatizm ve kararlılık.',
    potentialWings: [2, 4],
  },
  4: {
    typeNumber: 4,
    nameTr: 'Tip 4 - Bireyci / Özgün Sanatçı',
    coreDesireTr: 'Özgün kimliğini keşfetmek ve derin anlamlar yaratmak.',
    coreFearTr: 'Kimliksiz, sıradan veya yüzeysel olmak.',
    temperamentTr: 'Sezgisel derinlik, estetik duyarlılık ve içsel arayış.',
    potentialWings: [3, 5],
  },
  5: {
    typeNumber: 5,
    nameTr: 'Tip 5 - Araştırmacı / Gözlemci',
    coreDesireTr: 'Kavramak, yetkin bilgiye sahip olmak ve zihinsel berraklık.',
    coreFearTr: 'Bunalmış, hazırlıksız veya yetersiz hissetmek.',
    temperamentTr: 'Analitik düşünme, nesnel gözlem ve bağımsızlık.',
    potentialWings: [4, 6],
  },
  6: {
    typeNumber: 6,
    nameTr: 'Tip 6 - Sadık / Sorgulayıcı Muhafız',
    coreDesireTr: 'Güvende olmak, güvenilir bağlar kurmak ve netlik sağlamak.',
    coreFearTr: 'Desteksiz, tehlikede veya yönlendirmesiz kalmak.',
    temperamentTr: 'Öngörü, sadakat, tedbirlilik ve toplumsal sorumluluk.',
    potentialWings: [5, 7],
  },
  7: {
    typeNumber: 7,
    nameTr: 'Tip 7 - Maceracı / İyimser Vizyoner',
    coreDesireTr: 'Özgür olmak, yeni olasılıkları keşfetmek ve yaşam sevinci.',
    coreFearTr: 'Sınırlanmak, mahrum kalmak veya acıya hapsolmak.',
    temperamentTr: 'Yaratıcı coşku, hızlı adaptasyon ve çok yönlülük.',
    potentialWings: [6, 8],
  },
  8: {
    typeNumber: 8,
    nameTr: 'Tip 8 - Meydan Okuyan / Güçlü Lider',
    coreDesireTr: 'Kendi kaderini kontrol etmek, adalet sağlamak ve sınırları korumak.',
    coreFearTr: 'Zayıf düşmek, kontrol edilmek veya haksızlığa uğramak.',
    temperamentTr: 'Doğrudanlık, cesaret, koruyucu otorite ve dürüstlük.',
    potentialWings: [7, 9],
  },
  9: {
    typeNumber: 9,
    nameTr: 'Tip 9 - Barışçı / Uyum Sağlayıcı',
    coreDesireTr: 'İçsel dinginlik, huzur ve çatışmasız bütünlük.',
    coreFearTr: 'Bölünmek, dışlanmak veya huzurunu yitirmek.',
    temperamentTr: 'Kapsayıcılık, dingin sabır, uzlaşma ve kabullenme.',
    potentialWings: [8, 1],
  },
};

/**
 * 15 Gerçek Davranışsal Enneagram Sorusu
 */
export const ENNEAGRAM_QUESTIONS: TestQuestion[] = [
  {
    id: 'en_q1',
    order: 1,
    categoryTr: 'Temel Hayat Algısı',
    questionTr: 'Beklenmeyen bir kriz veya karmaşa ile karşılaştığınızda ilk içsel refleksiniz genellikle nedir?',
    options: [
      { id: 'en_q1_o1', textTr: 'Hemen mantıklı bir analiz yapıp verileri ve olasılıkları gözden geçiririm.', associatedType: '5', weight: 3 },
      { id: 'en_q1_o2', textTr: 'Durumu kontrol altına alır, tereddüt etmeden inisiyatif ve liderlik üstlenirim.', associatedType: '8', weight: 3 },
      { id: 'en_q1_o3', textTr: 'Etrafımdakilerin duygusal durumunu gözetir, onlara destek olmaya çalışırım.', associatedType: '2', weight: 3 },
      { id: 'en_q1_o4', textTr: 'Sakinliğimi korur, çatışmayı büyütecek fevri adımlardan kaçınırım.', associatedType: '9', weight: 3 },
    ],
  },
  {
    id: 'en_q2',
    order: 2,
    categoryTr: 'Hedef ve Başarı',
    questionTr: 'Bir projede çalışırken sizin için en yüksek motivasyon kaynağı aşağıdakilerden hangisidir?',
    options: [
      { id: 'en_q2_o1', textTr: 'İşin kusursuz, hatasız ve etik kurallara tam uygun tamamlanması.', associatedType: '1', weight: 3 },
      { id: 'en_q2_o2', textTr: 'Somut başarı elde etmek, verimli olmak ve takdir edilen bir sonuç üretmek.', associatedType: '3', weight: 3 },
      { id: 'en_q2_o3', textTr: 'Projeye benzersiz, özgün ve derin bir estetik/felsefi dokunuş katmak.', associatedType: '4', weight: 3 },
      { id: 'en_q2_o4', textTr: 'Yenilikçi, heyecan verici ve eğlenceli yeni fikirler denemek.', associatedType: '7', weight: 3 },
    ],
  },
  {
    id: 'en_q3',
    order: 3,
    categoryTr: 'Duygusal Tepkiler',
    questionTr: 'İçsel olarak huzursuz veya endişeli hissettiğinizde bu durumu nasıl karşılarsınız?',
    options: [
      { id: 'en_q3_o1', textTr: 'Olası riskleri ve güvence eksikliklerini önceden planlayarak kontrol ararım.', associatedType: '6', weight: 3 },
      { id: 'en_q3_o2', textTr: 'Duygularımın derinliğine iner, bu melankoliyi veya hissiyatı anlamlandırmaya çalışırım.', associatedType: '4', weight: 3 },
      { id: 'en_q3_o3', textTr: 'Kendi kabuğuma çekilip zihinsel enerjimi toparlamak için yalnızlık talep ederim.', associatedType: '5', weight: 3 },
      { id: 'en_q3_o4', textTr: 'Dikkatimi keyifli, ilham verici yeni meşguliyetlere yönlendirerek ferahlarım.', associatedType: '7', weight: 3 },
    ],
  },
  {
    id: 'en_q4',
    order: 4,
    categoryTr: 'İlişkiler ve İletişim',
    questionTr: 'İnsan ilişkilerinde sınırlarınızı ve tarzınızı en iyi hangisi tarif eder?',
    options: [
      { id: 'en_q4_o1', textTr: 'Açık, net ve doğrudan; kimsenin hakkımı gasp etmesine veya yönlendirmesine izin vermem.', associatedType: '8', weight: 3 },
      { id: 'en_q4_o2', textTr: 'Uyumlu ve kabullenici; gereksiz gerginliklerden uzak, barışçıl bir ortam kurarım.', associatedType: '9', weight: 3 },
      { id: 'en_q4_o3', textTr: 'Özverili ve ilgili; sevdiklerimin ihtiyaçlarını önceden sezerek yardımcı olurum.', associatedType: '2', weight: 3 },
      { id: 'en_q4_o4', textTr: 'İlkeli ve dürüst; herkesin adil ve sorumluluk sahibi davranmasını beklerim.', associatedType: '1', weight: 3 },
    ],
  },
  {
    id: 'en_q5',
    order: 5,
    categoryTr: 'Kendini İfade',
    questionTr: 'Topluluk içinde kendinizi ifade ederken en çok hangisine dikkat edersiniz?',
    options: [
      { id: 'en_q5_o1', textTr: 'Konuşmamın yetkin, bilgili ve kanıta dayalı olmasına.', associatedType: '5', weight: 3 },
      { id: 'en_q5_o2', textTr: 'Etkileyici, profesyonel ve hedef odaklı bir intiba bırakmaya.', associatedType: '3', weight: 3 },
      { id: 'en_q5_o3', textTr: 'Kalıplara uymayan, özgün ve içten bir duruş sergilemeye.', associatedType: '4', weight: 3 },
      { id: 'en_q5_o4', textTr: 'Güvenilir, sadık ve grubun emniyetini gözeten bir duruşa.', associatedType: '6', weight: 3 },
    ],
  },
  {
    id: 'en_q6',
    order: 6,
    categoryTr: 'Öfke ve Gerginlik',
    questionTr: 'Haksızlığa veya bir aksaklığa maruz kaldığınızda öfkeniz nasıl dışa vurur?',
    options: [
      { id: 'en_q6_o1', textTr: 'Hızlı ve şiddetli bir tepkiyle karşı koyar, anında yüzleşirim.', associatedType: '8', weight: 3 },
      { id: 'en_q6_o2', textTr: 'Öfkemi içimde disipline eder, serinkanlı ve eleştirel bir tavır alırım.', associatedType: '1', weight: 3 },
      { id: 'en_q6_o3', textTr: 'Gerginlikten kaçınır, içsel sessizliğe bürünerek ortamın yatışmasını beklerim.', associatedType: '9', weight: 3 },
      { id: 'en_q6_o4', textTr: 'Bunun beni kısıtlamasına izin vermez, konuyu hafifletip başka plana geçerim.', associatedType: '7', weight: 3 },
    ],
  },
  {
    id: 'en_q7',
    order: 7,
    categoryTr: 'Karar Alma',
    questionTr: 'Hayatınızda kritik bir karar verirken pusulanız daha çok hangisidir?',
    options: [
      { id: 'en_q7_o1', textTr: 'Kişisel değerlerim, sezgilerim ve ruhumun rezonansı.', associatedType: '4', weight: 3 },
      { id: 'en_q7_o2', textTr: 'Somut veriler, derin araştırma ve mantıksal tutarlılık.', associatedType: '5', weight: 3 },
      { id: 'en_q7_o3', textTr: 'Olası risklerin minimize edilmesi ve güvendiğim kaynakların teyidi.', associatedType: '6', weight: 3 },
      { id: 'en_q7_o4', textTr: 'Hızlı sonuç alma potansiyeli ve başarıya giden en kestirme yol.', associatedType: '3', weight: 3 },
    ],
  },
  {
    id: 'en_q8',
    order: 8,
    categoryTr: 'İçsel İhtiyaç',
    questionTr: 'Günün sonunda kendinizi en çok ne zaman gerçekten doymuş ve tatmin olmuş hissedersiniz?',
    options: [
      { id: 'en_q8_o1', textTr: 'Birine gerçekten faydam dokunduğunda ve sevgiyle karşılık bulduğumda.', associatedType: '2', weight: 3 },
      { id: 'en_q8_o2', textTr: 'Belirlenen hedeflere eksiksiz ulaşıp takdir topladığımda.', associatedType: '3', weight: 3 },
      { id: 'en_q8_o3', textTr: 'Karmaşık bir konuyu derinlemesine çözüp yeni bir kavrayış edindiğimde.', associatedType: '5', weight: 3 },
      { id: 'en_q8_o4', textTr: 'Hak ve adaleti koruyup zayıf birini kolladığımda.', associatedType: '8', weight: 3 },
    ],
  },
  {
    id: 'en_q9',
    order: 9,
    categoryTr: 'Zor Zamanlar',
    questionTr: 'Hayatınızda baskı ve stres arttığında genellikle hangi eğilimi gösterirsiniz?',
    options: [
      { id: 'en_q9_o1', textTr: 'Daha katı, kuralcı ve hata bulmaya meyilli hale gelirim.', associatedType: '1', weight: 3 },
      { id: 'en_q9_o2', textTr: 'Aşırı sorgulayıcı, şüpheci ve en kötü senaryoya hazırlanan bir moda geçerim.', associatedType: '6', weight: 3 },
      { id: 'en_q9_o3', textTr: 'Gündemi dağıtmak için aşırı aktiviteye ve dikkat dağıtıcılara yönelirim.', associatedType: '7', weight: 3 },
      { id: 'en_q9_o4', textTr: 'Pasifleşir, sorunları yok sayarak içsel kabuğuma çekilirim.', associatedType: '9', weight: 3 },
    ],
  },
  {
    id: 'en_q10',
    order: 10,
    categoryTr: 'Özgürlük ve Bağımsızlık',
    questionTr: 'Kişisel alanınız ve bağımsızlığınız sizin için ne ifade eder?',
    options: [
      { id: 'en_q10_o1', textTr: 'Hayatta kalmak için vazgeçilmez; zihinsel sınırlarımı korumak zorundayım.', associatedType: '5', weight: 3 },
      { id: 'en_q10_o2', textTr: 'Baskı ve dayatmalara asla boyun eğmem; kontrol bende olmalıdır.', associatedType: '8', weight: 3 },
      { id: 'en_q10_o3', textTr: 'Yeni maceralara ve deneyimlere kısıtlanmadan atılabilme özgürlüğü.', associatedType: '7', weight: 3 },
      { id: 'en_q10_o4', textTr: 'Kendi benzersiz duygusal dünyamı kimseye benzetmeden yaşayabilmek.', associatedType: '4', weight: 3 },
    ],
  },
  {
    id: 'en_q11',
    order: 11,
    categoryTr: 'Toplumsal Rol',
    questionTr: 'Bir grupta veya organizasyonda kendinizi doğal olarak hangi rolde bulursunuz?',
    options: [
      { id: 'en_q11_o1', textTr: 'Eksikleri tespit edip standartları yükselten düzenleyici.', associatedType: '1', weight: 3 },
      { id: 'en_q11_o2', textTr: 'İnsanları bir araya getiren, ihtiyaçlarını gözeten destekçi.', associatedType: '2', weight: 3 },
      { id: 'en_q11_o3', textTr: 'Ekibi hedefe kilitleyen, vitrini parlatan yürütücü lider.', associatedType: '3', weight: 3 },
      { id: 'en_q11_o4', textTr: 'Ekibin çatışmalarını yumuşatan, herkesi dinleyen arabulucu.', associatedType: '9', weight: 3 },
    ],
  },
  {
    id: 'en_q12',
    order: 12,
    categoryTr: 'Hata ve Eksiklik',
    questionTr: 'İstemeden bir hata yaptığınızda iç sesiniz size en çok ne söyler?',
    options: [
      { id: 'en_q12_o1', textTr: 'Daha dikkatli olmalıydın; kusurlu davranmak kabul edilemez.', associatedType: '1', weight: 3 },
      { id: 'en_q12_o2', textTr: 'Bu durum prestijimi ve başarım algımı zedeleyebilir mi?', associatedType: '3', weight: 3 },
      { id: 'en_q12_o3', textTr: 'Güvenliğimi tehdit eden bir açık mı verdim?', associatedType: '6', weight: 3 },
      { id: 'en_q12_o4', textTr: 'Herkes hata yapar, önemli olan huzuru ve dengeyi bozmamak.', associatedType: '9', weight: 3 },
    ],
  },
  {
    id: 'en_q13',
    order: 13,
    categoryTr: 'Yenilik ve Heyecan',
    questionTr: 'Rutin bir hayata karşı tutumunuz aşağıdakilerden hangisine en yakındır?',
    options: [
      { id: 'en_q13_o1', textTr: 'Monotonluk beni boğar; sürekli yeni fikirler, rotalar ve projeler aramalıyım.', associatedType: '7', weight: 3 },
      { id: 'en_q13_o2', textTr: 'Düzen ve rutin güven verir; belirsizlik yerine sağlam kalıpları tercih ederim.', associatedType: '6', weight: 3 },
      { id: 'en_q13_o3', textTr: 'Rutin ancak yüksek bir amaca ve hedefe hizmet ediyorsa değerlidir.', associatedType: '3', weight: 3 },
      { id: 'en_q13_o4', textTr: 'Ruhumu besleyen derinlik ve yaratıcılık yoksa hiçbir rutin beni tutamaz.', associatedType: '4', weight: 3 },
    ],
  },
  {
    id: 'en_q14',
    order: 14,
    categoryTr: 'İçsel Güç ve Otorite',
    questionTr: 'Güç, irade ve otorite kavramları size ne hissettirir?',
    options: [
      { id: 'en_q14_o1', textTr: 'Güç, haksızlıklara karşı kalkan olmak ve adaleti tesis etmek için şarttır.', associatedType: '8', weight: 3 },
      { id: 'en_q14_o2', textTr: 'Otorite kurallara, adalete ve nesnel liyakate dayanmalıdır.', associatedType: '1', weight: 3 },
      { id: 'en_q14_o3', textTr: 'Gerçek güç bilgi ve kavrayıştır; bilmeyen savunmasız kalır.', associatedType: '5', weight: 3 },
      { id: 'en_q14_o4', textTr: 'Sevgi ve şefkat bağı her türlü zorba güçten daha etkilidir.', associatedType: '2', weight: 3 },
    ],
  },
  {
    id: 'en_q15',
    order: 15,
    categoryTr: 'Öz Şefkat ve Huzur',
    questionTr: 'Yalnız kaldığınızda zihninizde en çok yankılanan temel arayış nedir?',
    options: [
      { id: 'en_q15_o1', textTr: 'Çatışmasız, dingin ve her şeyin akışında olduğu bir iç huzur.', associatedType: '9', weight: 3 },
      { id: 'en_q15_o2', textTr: 'Başkalarıyla kurulan sahici bağların ve sevginin sıcaklığı.', associatedType: '2', weight: 3 },
      { id: 'en_q15_o3', textTr: 'Hayatın gizemli anlamını ve ruhumun derinliğini hissetmek.', associatedType: '4', weight: 3 },
      { id: 'en_q15_o4', textTr: 'Yarınların güvende olduğunu ve her tedbirin alındığını bilmek.', associatedType: '6', weight: 3 },
    ],
  },
];

/**
 * 15 Soruluk Cevap Matrisinden Enneagram Tipini Hesaplar
 * Kural 7: Eksik zorunlu cevap varsa sonuç hesaplanmaz (hata fırlatılır).
 * Kural 17: Kesinlik/garanti iddiası kullanılmaz; eğilim ve mizaç dili korunur.
 */
export function evaluateEnneagramTest(
  answersMap: Record<string, string>
): TestEvaluationResult {
  // 15 sorunun tamamının ve geçerli şıklarla cevaplanıp cevaplanmadığını kontrol et (A23 Kural 4)
  const missingQuestions: string[] = [];
  for (const q of ENNEAGRAM_QUESTIONS) {
    const answerId = answersMap ? answersMap[q.id] : undefined;
    const isValidOption = Boolean(answerId && q.options.some((o) => o.id === answerId));
    if (!isValidOption) {
      missingQuestions.push(q.order.toString());
    }
  }

  if (missingQuestions.length > 0) {
    throw new Error(
      `Enneagram testi tamamlanmadı. Lütfen eksik soruları (${missingQuestions.join(', ')}) cevaplayınız.`
    );
  }

  const scores: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };

  for (const q of ENNEAGRAM_QUESTIONS) {
    const selectedOptionId = answersMap[q.id];
    const option = q.options.find((o) => o.id === selectedOptionId);
    if (option) {
      const typeNum = parseInt(option.associatedType, 10);
      if (!isNaN(typeNum) && scores[typeNum] !== undefined) {
        scores[typeNum] += option.weight;
      }
    }
  }

  // En yüksek puanı alan birincil tipi bul; eşitlik durumunda deterministik tip numarası kuralı (A23 Kural 2 & 6)
  const sortedTypes = Object.entries(scores)
    .map(([t, s]) => ({ typeNum: parseInt(t, 10), score: s }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.typeNum - b.typeNum;
    });

  const primaryTypeNum = sortedTypes[0].typeNum;
  const primaryMeta = ENNEAGRAM_TYPES[primaryTypeNum];

  // Kanat (Wing) tespiti: komşu sayılardan (örn: Tip 4 için 3 ve 5) yüksek puanlı olanı seç; eşitlikte ilk potansiyel kanat kuralı (A23 Kural 3)
  const wings = primaryMeta.potentialWings;
  const wing1Score = scores[wings[0]] || 0;
  const wing2Score = scores[wings[1]] || 0;
  const dominantWingNum = wing1Score >= wing2Score ? wings[0] : wings[1];

  const primaryTypeStr = primaryMeta.nameTr;
  const secondaryTypeStr = `Kanat ${dominantWingNum} (${ENNEAGRAM_TYPES[dominantWingNum].nameTr.split('-')[1]?.trim() || ''})`;

  const scoresFormatted: Record<string, number> = {};
  for (let i = 1; i <= 9; i++) {
    scoresFormatted[`Tip ${i}`] = scores[i];
  }

  const interpretations: string[] = [
    `Baskın Mizaç Eğilimi: ${primaryMeta.nameTr}. Temel motivasyonu ${primaryMeta.coreDesireTr.toLowerCase()}`,
    `Kanat Eğilimi: ${secondaryTypeStr} etkisiyle mizaç daha dinamik ve dengeli bir görünüm sergileyebilir.`,
    `Psikolojik Dinamik: ${primaryMeta.temperamentTr}`,
    `Farkındalık Notu: Bu çözümleme kesin bir etiketleme değil, dövme sembolizminde içsel sınırları ve rezonansı belirlemeye yönelik bir mizaç eğilimi haritasıdır.`,
  ];

  return {
    primaryType: primaryTypeStr,
    secondaryType: secondaryTypeStr,
    dominantScores: scoresFormatted,
    interpretations,
  };
}
