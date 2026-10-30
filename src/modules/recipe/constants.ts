import { TattooStyle, BodyPlacement, TattooRecipe } from '../../types/design';

export interface TattooStyleInfo {
  id: TattooStyle;
  nameTr: string;
  descriptionTr: string;
  needleRecommendationsTr: string[];
  lineSpacingAdviceTr: string;
  antiBlowoutWarningTr: string;
  aestheticPromptKeywords: string[];
}

export const TATTOO_STYLES: Record<TattooStyle, TattooStyleInfo> = {
  FINE_LINE: {
    id: 'FINE_LINE',
    nameTr: 'İnce Çizgi / Minimalist (Fine Line)',
    descriptionTr: 'Yüksek hassasiyetli, yalın ve zarif tek/ince iğne hatları.',
    needleRecommendationsTr: ['1RL veya 3RL (0.25mm - 0.30mm bugpin kartuş)', 'Gölgeleme yerine hafif nokta dokusu (stippling)'],
    lineSpacingAdviceTr: 'Hücresel yayılma riskine karşı minimum 1.5mm - 2mm net negatif çizgi aralığı bırakılmalıdır.',
    antiBlowoutWarningTr: 'Dermisin sığ üst tabakasında sabit el hızıyla çalışılmalı, aşırı derin batıştan kaçınılmalıdır.',
    aestheticPromptKeywords: ['fine line tattoo design', 'delicate single needle lines', 'minimalist elegance', 'crisp clean vector contours', 'high negative space', 'isolated on pure white background'],
  },
  MICRO_REALISM: {
    id: 'MICRO_REALISM',
    nameTr: 'Mikro Gerçekçilik (Micro Realism)',
    descriptionTr: 'Kompakt alanda yoğun fotografik detay ve mikro ton geçişleri.',
    needleRecommendationsTr: ['3RL ve 5RM (curved magnum mikro gölgeleme)', 'Düşük viskoziteli seyreltilmiş gri yıkama mürekkepleri'],
    lineSpacingAdviceTr: 'Aşırı yoğunlaştırılmış detaylar zamanla kaynaşabileceğinden açık ton boşlukları muhafaza edilmelidir.',
    antiBlowoutWarningTr: 'Cilt elastikiyetine göre düşük voltaj ve çoklu hafif geçişlerle ton derinliği verilmelidir.',
    aestheticPromptKeywords: ['micro realism tattoo', 'photorealistic miniature details', 'smooth black and grey gradient wash', 'soft volumetric shading', 'subtle cinematic contrast'],
  },
  SACRED_GEOMETRY: {
    id: 'SACRED_GEOMETRY',
    nameTr: 'Kutsal Geometri & Mandala (Sacred Geometry)',
    descriptionTr: 'Matematiksel altın oran, kutsal sembolik mandalalar ve kusursuz simetri.',
    needleRecommendationsTr: ['3RL kontur, 5RL / 7RL geometrik aksanlar, 5RS dolgu'],
    lineSpacingAdviceTr: 'Simetrik köşegenler ve grid aralıklarında en az 2mm nefes alanı garanti edilmelidir.',
    antiBlowoutWarningTr: 'Düzgün gerdirme ile iğne penetrasyon açısı 90 derece korunmalı, köşe birleşimlerinde duraklama yapılmamalıdır.',
    aestheticPromptKeywords: ['sacred geometry tattoo', 'metatron cube lines', 'sacred proportion mandala', 'concentric vector circles', 'perfect mathematical symmetry', 'astronomical alignment grid'],
  },
  DOTWORK_WHIPSHADING: {
    id: 'DOTWORK_WHIPSHADING',
    nameTr: 'Noktalama & Whip Shading (Dotwork)',
    descriptionTr: 'Noktasal frekans derinliği, kademeli ton geçişleri ve eskitme doku hissi.',
    needleRecommendationsTr: ['3RL veya 5RL stipple noktacıklar, 7RL whip shading savurma hatları'],
    lineSpacingAdviceTr: 'Noktaların yoğunluğu merkezden dışa doğru seyrekleşmeli, cilt dokusunun parlamasına izin verilmelidir.',
    antiBlowoutWarningTr: 'Nokta vuruşları yüzeyel tutulmalı, deri altına tek noktada mürekkep göllenmesi engellenmelidir.',
    aestheticPromptKeywords: ['dotwork whip shading tattoo', 'stippled gradient texture', 'organic pointillism density', 'hand-drawn ceremonial engraving style', 'spiritual stipple shading'],
  },
  BLACKWORK_OCCULT: {
    id: 'BLACKWORK_OCCULT',
    nameTr: 'Blackwork & Ezoterik Okült (Blackwork Occult)',
    descriptionTr: 'Doygun siyah alanlar, gizemli sembolik mühürler ve dramatik kontrast.',
    needleRecommendationsTr: ['7RL / 9RL kalın dış konturlar, 9M1 veya 11RM yoğun siyah dolgu'],
    lineSpacingAdviceTr: 'Koyu bloklar arasında negatif alan boşlukları nefes kanalları olarak korunmalıdır.',
    antiBlowoutWarningTr: 'Yoğun siyah alanlarda cilt travmasını önlemek için dairesel homojen doldurma yapılmalıdır.',
    aestheticPromptKeywords: ['esoteric blackwork tattoo', 'dark occult symbolism', 'saturated solid black contrasts', 'ancient sigil engraving', 'high graphic impact'],
  },
  ETCHING_ENGRAVING: {
    id: 'ETCHING_ENGRAVING',
    nameTr: 'Gravür & Ahşap Baskı (Etching / Woodcut)',
    descriptionTr: 'Tarihi el yazması illüstrasyonları, çapraz tarama (cross-hatching) ve klasik estetik.',
    needleRecommendationsTr: ['3RL ve 5RL tek yönde taranmış çizgisel gölgeler'],
    lineSpacingAdviceTr: 'Tarama çizgileri birbirine çok yakın (1mm altı) olmamalı, gravür çizgisel ritmi belirgin kalmalıdır.',
    antiBlowoutWarningTr: 'Her çizgi keskin ve kararlı çekilmeli, iğne derinliği titizlikle kontrol edilmelidir.',
    aestheticPromptKeywords: ['woodcut etching style tattoo', 'vintage renaissance engraving lines', 'medieval alchemy manuscript art', 'cross hatching shading', 'timeless antique lithograph'],
  },
  WATERCOLOR_ABSTRACT: {
    id: 'WATERCOLOR_ABSTRACT',
    nameTr: 'Suluboya & Soyut Akış (Watercolor Abstract)',
    descriptionTr: 'Serbest akışkan fırça darbeleri, lekesel sıçramalar ve organik enerji hatları.',
    needleRecommendationsTr: ['5RS / 7RS lekesel dolgu, 3RL yarı görünür kılavuz çizgiler'],
    lineSpacingAdviceTr: 'Cilt tonunun doğal nefes aldığı şeffaf gradyan açıklıklar bırakılmalıdır.',
    antiBlowoutWarningTr: 'Pigment geçişlerinde yumuşak sulandırma gradyanları kullanılmalı, ani cilt hasarından kaçınılmalıdır.',
    aestheticPromptKeywords: ['abstract watercolor splash tattoo', 'fluid ink wash dynamics', 'ethereal brush stroke flows', 'organic energy aura', 'delicate wash gradients'],
  },
};

export interface BodyPlacementInfo {
  id: BodyPlacement;
  nameTr: string;
  recommendedDimensions: { width: number; height: number }; // cm
  anatomicalFlowTr: string;
  curvatureAdviceTr: string;
}

export const BODY_PLACEMENTS: Record<BodyPlacement, BodyPlacementInfo> = {
  FOREARM_INNER: {
    id: 'FOREARM_INNER',
    nameTr: 'İç Ön Kol',
    recommendedDimensions: { width: 14, height: 22 },
    anatomicalFlowTr: 'Bilekten dirsek çukuruna uzanan dikey eksen; tasarımın yukarı veya içeri yönelimi dengeli olmalıdır.',
    curvatureAdviceTr: 'Bilek rotasyonu sırasında tasarımın bükülmesini önlemek için orta hatta dikey simetri önerilir (İdeal: 22 × 14 cm, en az: 16 × 10 cm).',
  },
  FOREARM_OUTER: {
    id: 'FOREARM_OUTER',
    nameTr: 'Dış Ön Kol',
    recommendedDimensions: { width: 9, height: 18 },
    anatomicalFlowTr: 'Dirsek kemiğinden el üstüne inen dış yüzey; güçlü ve görünür bir duruş sağlar.',
    curvatureAdviceTr: 'Kol kaslarının dış kavisini takip eden hafif konik yerleşim idealdir.',
  },
  UPPER_ARM_BICEP: {
    id: 'UPPER_ARM_BICEP',
    nameTr: 'Üst Kol / Biceps',
    recommendedDimensions: { width: 10, height: 15 },
    anatomicalFlowTr: 'Pazu kası kubbesi üzerinde merkezlenen dinamik kompozisyon.',
    curvatureAdviceTr: 'Kol kasıldığında deformasyonu en aza indirmek için dairesel veya oval motifler önerilir.',
  },
  SHOULDER_BLADE: {
    id: 'SHOULDER_BLADE',
    nameTr: 'Kürek Kemiği (Scapula)',
    recommendedDimensions: { width: 14, height: 18 },
    anatomicalFlowTr: 'Sırtın üst kanat bölgesi; geniş, detaylı ve koruyucu semboller için mükemmel düzlem.',
    curvatureAdviceTr: 'Omuz hareketleriyle esneyen düzgün deri düzlemi yüksek detay işçiliğine olanak tanır.',
  },
  SPINE_CENTER: {
    id: 'SPINE_CENTER',
    nameTr: 'Omurga Hattı (Dikey Eksen)',
    recommendedDimensions: { width: 6, height: 28 },
    anatomicalFlowTr: 'Ense kökünden kuyruk sokumuna inen merkezi yaşam ekseni; 7 çakranın dikey hizalanması için doğal kanaldır.',
    curvatureAdviceTr: 'Omurga kemiklerinin çıkıntılarına saygı duyan doğrusal ve fraktal uzantılar tercih edilmelidir.',
  },
  RIBS_SIDE: {
    id: 'RIBS_SIDE',
    nameTr: 'Kaburga / Yan Gövde',
    recommendedDimensions: { width: 12, height: 20 },
    anatomicalFlowTr: 'Koltuk altından kalça kemiğine inen kavisli hat; gizli, derin ve kişisel kompozisyonlar.',
    curvatureAdviceTr: 'Nefes alıp vermeyle hareket eden kaburga yaylarına paralel uzanan akışkan hatlar kullanılmalıdır.',
  },
  CHEST_CENTER: {
    id: 'CHEST_CENTER',
    nameTr: 'Göğüs Ortası / Sternum',
    recommendedDimensions: { width: 12, height: 12 },
    anatomicalFlowTr: 'Kalp çakrası merkezi; göğüs kafesinin tam ortasında yer alan kutsal ve simetrik merkez.',
    curvatureAdviceTr: 'Tam çift taraflı simetriye sahip geometrik ve mandallik formlar en yüksek estetiği sunar.',
  },
  WRIST_INNER: {
    id: 'WRIST_INNER',
    nameTr: 'İç Bilek',
    recommendedDimensions: { width: 4, height: 5 },
    anatomicalFlowTr: 'Nabız noktası; samimi, kişisel ve yalın mikro semboller.',
    curvatureAdviceTr: 'Bilek kırışıklığından en az 2cm yukarıda konumlandırılmalı, ince çizgi aralıkları açık tutulmalıdır.',
  },
  CALF: {
    id: 'CALF',
    nameTr: 'Baldır (Arka / Yan Bacak)',
    recommendedDimensions: { width: 11, height: 22 },
    anatomicalFlowTr: 'Diz arkasından aşil tendonuna inen güçlü topraklanma alanı; Kök Çakra rezonansı ile uyumludur.',
    curvatureAdviceTr: 'Gastroknemius kasının iki lobu arasına oturan dikey ve sağlam kompozisyonlar önerilir.',
  },
  COLLARBONE: {
    id: 'COLLARBONE',
    nameTr: 'Köprücük Kemiği (Klavikula Hattı)',
    recommendedDimensions: { width: 14, height: 4 },
    anatomicalFlowTr: 'Boyun kökünden omuza uzanan zarif yatay hat; Boğaz çakrası ve ifade ile bağlantılıdır.',
    curvatureAdviceTr: 'Kemiğin doğal yayını takip eden yatay, akıcı ve narin çizgiler tercih edilmelidir.',
  },
};

export const COLOR_PROFILES: Record<
  TattooRecipe['colorProfile'],
  { nameTr: string; rationaleTr: string; promptModifier: string }
> = {
  MONOCHROME_BLACK: {
    nameTr: 'Saf Karbon Siyahı (Monochrome Black)',
    rationaleTr: 'Zamanın ötesinde netlik, simyanın ilk maddesi (prima materia) ve maksimum kontrast.',
    promptModifier: 'pure black ink on skin, monochrome linework, deep black pigment, stark contrast, no color tints',
  },
  BLACK_AND_GREY: {
    nameTr: 'Siyah & Kademeli Gri (Black and Grey Wash)',
    rationaleTr: 'Hacimsel derinlik, ışık-gölge draması ve yumuşatılmış ruhsal geçişler.',
    promptModifier: 'black and grey wash realism, smooth gradients, subtle tonal shading, soft graphite aesthetic',
  },
  MINIMAL_RED_ACCENT: {
    nameTr: 'Minimal Kırmızı Vurgulu (Single Red Focal Accent)',
    rationaleTr: 'Yaşam gücü, kalp atışı ve odaklanmış irade merkezini tek bir kırmızı geometrik öğeyle vurgulama.',
    promptModifier: 'predominantly black ink with single selective crimson red focal point accent, deliberate dual tone contrast',
  },
  MUTED_EARTH_TONES: {
    nameTr: 'Mat Toprak Tonları (Muted Earth Tones)',
    rationaleTr: 'Topraklanma, kadim taş mühürleri ve antik parşömen uyumu.',
    promptModifier: 'muted organic earth tones, antique ochre and sepia accents, warm mineral pigment undertones',
  },
};
