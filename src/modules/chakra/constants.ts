import { ChakraName } from '../../types/analysis';
import { ChakraDefinition } from './types';

/**
 * 7 Temel Çakra Tanımları ve Numerolojik Rezonans Sözlüğü
 * Numeroloji modülünden gelen titreşimleri 7 ana çakra merkezine eşler.
 */
export const CHAKRA_DEFINITIONS: Record<ChakraName, ChakraDefinition> = {
  ROOT: {
    chakra: 'ROOT',
    order: 1,
    nameTr: 'Kök Çakra',
    sanskritName: 'Muladhara',
    elementTr: 'Toprak',
    bodyRegionTr: 'Omurga tabanı, kuyruk sokumu, bacaklar',
    colorHex: '#ef4444',
    associatedNumbers: [4, 22],
    symbolicKeywordsTr: ['Köklenme', 'Güvenlik', 'Yaşam Gücü', 'İstikrar', 'Maddi Temel'],
    balancedTraitsTr: 'Güçlü topraklanma, bedensel güven, yaşamda sarsılmaz duruş ve sağlam sınırlar.',
    imbalanceTraitsTr: 'Gelecek kaygısı, güvensizlik hissi, köksüzlük veya aşırı katılık/maddecilik.',
    tattooStrengtheningTheme: 'Kare ve küp formlar, derin kadim meşe kökleri, dört yön pusulası, Metatron küpü, monolit taban çizgileri.',
  },
  SACRAL: {
    chakra: 'SACRAL',
    order: 2,
    nameTr: 'Sakral Çakra',
    sanskritName: 'Svadhisthana',
    elementTr: 'Su',
    bodyRegionTr: 'Alt karın, göbek deliği altı, üreme organları',
    colorHex: '#f97316',
    associatedNumbers: [2],
    symbolicKeywordsTr: ['Akış', 'Duygusal Denge', 'Yaratıcılık', 'Tutku', 'İlişkiler'],
    balancedTraitsTr: 'Duygusal esneklik, sağlıklı yaratıcı üretim, haz alma yetisi ve empati.',
    imbalanceTraitsTr: 'Duygusal dalgalanmalar, suçluluk duygusu, yaratıcı tıkanıklık veya bağımlılık eğilimi.',
    tattooStrengtheningTheme: 'Hilal formları, ikiz akış dalgaları, vesica piscis geometrisi, akışkan spiral su motifleri.',
  },
  SOLAR_PLEXUS: {
    chakra: 'SOLAR_PLEXUS',
    order: 3,
    nameTr: 'Solar Pleksus Çakrası',
    sanskritName: 'Manipura',
    elementTr: 'Ateş',
    bodyRegionTr: 'Mide boşluğu, diyafram, karaciğer',
    colorHex: '#eab308',
    associatedNumbers: [1, 8],
    symbolicKeywordsTr: ['İrade', 'Özgüven', 'Kişisel Güç', 'Dönüştürme', 'Eylem'],
    balancedTraitsTr: 'Kararlı irade, berrak özsaygı, hedeflere odaklanma ve dengeli güç kullanımı.',
    imbalanceTraitsTr: 'Öfke, kontrol ihtiyacı, güçsüzlük hissi veya aşırı rekabetçilik/tükenmişlik.',
    tattooStrengtheningTheme: 'Güneş amblemi, odaklanmış ışın demetleri, sekiz köşeli yıldız, irade mızrağı, dikey eksenli ok.',
  },
  HEART: {
    chakra: 'HEART',
    order: 4,
    nameTr: 'Kalp Çakrası',
    sanskritName: 'Anahata',
    elementTr: 'Hava / Eter',
    bodyRegionTr: 'Göğüs kafesi merkezi, kalp ve akciğerler',
    colorHex: '#10b981',
    associatedNumbers: [6, 33],
    symbolicKeywordsTr: ['Koşulsuz Sevgi', 'Şefkat', 'Bağışlama', 'Ahenk', 'Şifa'],
    balancedTraitsTr: 'Açık yürekli sevgi, derin şefkat, affetme yetisi ve evrensel denge hissi.',
    imbalanceTraitsTr: 'Kırılganlık, kalbi kapatma, aşırı fedakarlık, kıskançlık veya yalnızlaşma korkusu.',
    tattooStrengtheningTheme: 'Altı köşeli heksagram, koruyucu zambak, açık kadeh, alevli kutsal kalp, çiçek açan spiral lotus.',
  },
  THROAT: {
    chakra: 'THROAT',
    order: 5,
    nameTr: 'Boğaz Çakrası',
    sanskritName: 'Vishuddha',
    elementTr: 'Eter / Ses',
    bodyRegionTr: 'Boğaz, boyun, ses telleri ve tiroid',
    colorHex: '#06b6d4',
    associatedNumbers: [3, 5],
    symbolicKeywordsTr: ['Hakikat', 'Kendini İfade', 'Ses', 'İletişim', 'Özgür İfade'],
    balancedTraitsTr: 'Öz hakikati dürüstçe dile getirme, güçlü ifade yeteneği, etkin dinleme ve berrak iletişim.',
    imbalanceTraitsTr: 'Boğaz düğümlenmesi, düşüncelerini saklama, dedikodu veya yalan söyleme eğilimi.',
    tattooStrengtheningTheme: 'Triskele geometrisi, rüzgâr gülü, açık meşale, rezonans dalgaları, kanat formu.',
  },
  THIRD_EYE: {
    chakra: 'THIRD_EYE',
    order: 6,
    nameTr: 'Üçüncü Göz Çakrası',
    sanskritName: 'Ajna',
    elementTr: 'Işık',
    bodyRegionTr: 'İki kaşın ortası, alın merkezi, epifiz bezi',
    colorHex: '#6366f1',
    associatedNumbers: [7, 11],
    symbolicKeywordsTr: ['Sezgi', 'İçgörü', 'Farkındalık', 'Hakikat Arayışı', 'Vizyon'],
    balancedTraitsTr: 'Güçlü sezgi, zihinsel berraklık, olayların ardındaki derin manayı görme yetisi.',
    imbalanceTraitsTr: 'Zihinsel karmaşa, gerçeklerden kaçış, aşırı şüphecilik veya sezgileri yok sayma.',
    tattooStrengtheningTheme: 'Üçüncü göz motifi, heptagram (yedi köşeli mistik yıldız), spiral labirent, çift sütun (Jachin & Boaz).',
  },
  CROWN: {
    chakra: 'CROWN',
    order: 7,
    nameTr: 'Tepe (Taç) Çakra',
    sanskritName: 'Sahasrara',
    elementTr: 'Kozmik Bilinç / Birlik',
    bodyRegionTr: 'Başın tepesi, bıngıldak, beyin korteksi',
    colorHex: '#a855f7',
    associatedNumbers: [9],
    symbolicKeywordsTr: ['Birlik Bilinci', 'Aydınlanma', 'Ruhsal Uyanış', 'Tamamlanma', 'Kozmik Bağ'],
    balancedTraitsTr: 'Evrensel bütünlük hissi, aşkın bilgelik, derin huzur ve manevi rehberlik bağı.',
    imbalanceTraitsTr: 'Varoluşsal anlamsızlık, dünyadan kopukluk veya manevi katılık.',
    tattooStrengtheningTheme: 'Bin yapraklı nilüfer çiçeği, Ouroboros (kendi kuyruğunu ısıran sonsuzluk yılanı), kutsal mandala, haleli ışık halkası.',
  },
};

export const CHAKRA_ORDER: ChakraName[] = [
  'ROOT',
  'SACRAL',
  'SOLAR_PLEXUS',
  'HEART',
  'THROAT',
  'THIRD_EYE',
  'CROWN',
];

/**
 * Kullanıcı Arayüzü Durum Sınıfları Eşlemesi
 * - Açık (OVERACTIVE)
 * - Dengeli (BALANCED)
 * - Destek İhtiyacı / Blokaj (UNDERACTIVE / BLOCKED)
 */
export const CHAKRA_STATUS_CONFIG = {
  OVERACTIVE: {
    labelTr: 'Açık (Yüksek Akış)',
    categoryTr: 'Açık',
    badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80',
    dotClass: 'bg-cyan-400',
    descriptionTr: 'Enerji akışı güçlü ve açık. Aşırıya kaçmadan odaklanarak yönlendirilmelidir.',
  },
  BALANCED: {
    labelTr: 'Dengeli',
    categoryTr: 'Dengeli',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    dotClass: 'bg-emerald-400',
    descriptionTr: 'Doğal akış ve uyum halindedir. Stabiliteyi koruyan semboller önerilir.',
  },
  UNDERACTIVE: {
    labelTr: 'Destek İhtiyacı',
    categoryTr: 'Destek İhtiyacı / Blokaj',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    dotClass: 'bg-amber-400',
    descriptionTr: 'Akış düşük seviyede. Dövme kompozisyonunda güçlendirici sembolizmle desteklenmelidir.',
  },
  BLOCKED: {
    labelTr: 'Blokaj (Karmik Ders)',
    categoryTr: 'Destek İhtiyacı / Blokaj',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
    dotClass: 'bg-rose-400',
    descriptionTr: 'Karmik eksiklik veya enerji tıkanıklığı mevcuttur. Dövme reçetesinde öncelikli hedeftir.',
  },
} as const;
