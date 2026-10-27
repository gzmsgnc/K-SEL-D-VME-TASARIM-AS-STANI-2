import { NumberSymbolicResonance } from './types';

/**
 * Pisagor Numeroloji Tablosu (Pythagorean Chart)
 * 1: A, J, S
 * 2: B, K, T
 * 3: C, L, U
 * 4: D, M, V
 * 5: E, N, W
 * 6: F, O, X
 * 7: G, P, Y
 * 8: H, Q, Z
 * 9: I, R
 */
export const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

/**
 * Türkçe Karakter Eşlemeleri (Pisagor tablosuna standart dönüştürme)
 * Ç -> C (3), Ğ -> G (7), I/İ -> I (9), Ö -> O (6), Ş -> S (1), Ü -> U (3)
 */
export const TURKISH_CHAR_MAP: Record<string, string> = {
  Ç: 'C',
  ç: 'C',
  Ğ: 'G',
  ğ: 'G',
  I: 'I',
  ı: 'I',
  İ: 'I',
  i: 'I',
  Ö: 'O',
  ö: 'O',
  Ş: 'S',
  ş: 'S',
  Ü: 'U',
  ü: 'U',
};

/**
 * Türkçe ve Latin Sesli Harfler Kümesi
 */
export const VOWEL_SET = new Set([
  'A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü',
]);

/**
 * Üstat Sayılar (Master Numbers)
 * Pisagor numerolojisinde indirgenmeden korunan sayılar
 */
export const MASTER_NUMBERS = [11, 22, 33];

/**
 * Sayıların Sembolik, Çakra, Arketip ve Dövme Reçetesi Rezonans Tablosu
 * Sonraki modüllere (Çakra, Arketip, Dövme Tasarımı) tutarlı ve açık köprü veri sağlar.
 */
export const NUMBER_RESONANCE_TABLE: Record<number, NumberSymbolicResonance> = {
  1: {
    number: 1,
    titleTr: 'Öncü & Başlatıcı',
    keywordTr: 'Bağımsızlık, İrade, Liderlik',
    elementTr: 'Ateş',
    associatedChakra: 'SOLAR_PLEXUS',
    associatedArchetype: 'Savaşçı / Öncü',
    tattooSymbolTheme: 'Güneş, ok, dikey eksen, mızrak ucu, yalın geometrik monolit',
  },
  2: {
    number: 2,
    titleTr: 'Uyum & İş Birlikçi',
    keywordTr: 'Denge, Sezgi, Diplomasi',
    elementTr: 'Su',
    associatedChakra: 'SACRAL',
    associatedArchetype: 'Aşık / Rehber',
    tattooSymbolTheme: 'Hilal, ikiz akış dalgaları, çift sarmal, vesica piscis',
  },
  3: {
    number: 3,
    titleTr: 'Yaratıcı & İfadeci',
    keywordTr: 'Kendini İfade, Neşe, Sanat',
    elementTr: 'Hava',
    associatedChakra: 'THROAT',
    associatedArchetype: 'Sanatçı / Yaratıcı',
    tattooSymbolTheme: 'Üçgen, triskele, üç yapraklı yonca, açık meşale',
  },
  4: {
    number: 4,
    titleTr: 'İnşa Edici & İstikrarlı',
    keywordTr: 'Disiplin, Düzen, Güvenilirlik',
    elementTr: 'Toprak',
    associatedChakra: 'ROOT',
    associatedArchetype: 'Hükümdar / Mimar',
    tattooSymbolTheme: 'Kare, küp, dört yön pusulası, köklü kadim meşe',
  },
  5: {
    number: 5,
    titleTr: 'Özgürlükçü & Gezgin',
    keywordTr: 'Dinamizm, Dönüşüm, Macera',
    elementTr: 'Hava / Eter',
    associatedChakra: 'THROAT',
    associatedArchetype: 'Gezgin / İsyankâr',
    tattooSymbolTheme: 'Pentagram, rüzgâr gülü, kanat formu, göçebe yıldız',
  },
  6: {
    number: 6,
    titleTr: 'Şifacı & Koruyucu',
    keywordTr: 'Sevgi, Sorumluluk, Ahenk',
    elementTr: 'Toprak / Su',
    associatedChakra: 'HEART',
    associatedArchetype: 'Bakıcı / Şifacı',
    tattooSymbolTheme: 'Altı köşeli heksagram, kadeh, koruyucu zambak, kalp kalkanı',
  },
  7: {
    number: 7,
    titleTr: 'Mistik & Bilge',
    keywordTr: 'Derin Arayış, Hakikat, İçgörü',
    elementTr: 'Su / Eter',
    associatedChakra: 'THIRD_EYE',
    associatedArchetype: 'Mistik / Bilge',
    tattooSymbolTheme: 'Yedi kollu yıldız (Heptagram), üçüncü göz, spiral labirent, ay döngüsü',
  },
  8: {
    number: 8,
    titleTr: 'Güç & Bolluk Yöneticisi',
    keywordTr: 'Maddi-Manevi Ustalık, İrade, Adalet',
    elementTr: 'Ateş / Toprak',
    associatedChakra: 'SOLAR_PLEXUS',
    associatedArchetype: 'Hükümdar / Büyücü',
    tattooSymbolTheme: 'Sonsuzluk döngüsü (Lemniskat), sekiz köşeli yıldız, tartı, adalet kılıcı',
  },
  9: {
    number: 9,
    titleTr: 'Evrensel İnsancıl & Tamamlayıcı',
    keywordTr: 'Koşulsuz Sevgi, Bilgelik, Tamamlanma',
    elementTr: 'Eter',
    associatedChakra: 'CROWN',
    associatedArchetype: 'Hümanist / Bilge Kurtarıcı',
    tattooSymbolTheme: 'Ouroboros (kendi kuyruğunu ısıran yılan), nilüfer çiçeği, tam daire',
  },
  11: {
    number: 11,
    titleTr: 'Üstat Aydınlatıcı (Master 11)',
    keywordTr: 'Ruhsal Sezgi, Vizyonerlik, İlahi İlham',
    elementTr: 'Işık / Eter',
    associatedChakra: 'THIRD_EYE',
    associatedArchetype: 'Kâhin / Ruhsal Işık Rehberi',
    tattooSymbolTheme: 'Çift sütun (Jachin & Boaz), şimşek, üçüncü göz halesi, prizmatik kırılma',
  },
  22: {
    number: 22,
    titleTr: 'Üstat Mimar (Master 22)',
    keywordTr: 'Evrensel Yapıcı, Somutlaştırma, Büyük Vizyon',
    elementTr: 'Kutsal Toprak',
    associatedChakra: 'ROOT',
    associatedArchetype: 'Büyük Mimar / Evrensel Kurucu',
    tattooSymbolTheme: 'Yaşam Ağacı geometrisi, Metatron küpü, kutsal orantılı temel taşı',
  },
  33: {
    number: 33,
    titleTr: 'Üstat Öğretmen (Master 33)',
    keywordTr: 'Evrensel Şefkat, Ruhsal Hizmet, Özverili Sevgi',
    elementTr: 'Ruhsal Ateş',
    associatedChakra: 'HEART',
    associatedArchetype: 'Evrensel Şifacı / Aydınlanmış Öğretmen',
    tattooSymbolTheme: 'Alevli kalp, altın spiral nilüfer, kanatlı ankh, ilahi sevgi kalkanı',
  },
};
