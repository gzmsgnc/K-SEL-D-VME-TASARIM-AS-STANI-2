import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { ClientTattooDesign } from '../types/design';
import {
  getAstrologyCardData,
  getNumerologyCardData,
  getChakraCardData,
  getArchetypeCardData,
  formatAstrologyCopyText,
  formatNumerologyCopyText,
  formatChakraCopyText,
  formatArchetypeCopyText,
} from './analysisResultsFormatters';
import {
  formatTattooRecipeText,
  formatConceptManifestoText,
  formatNegativePromptText,
} from './tattooDesignFormatters';
import {
  ENNEAGRAM_QUESTIONS,
  TOTEM_QUESTIONS,
  TOTEM_ANIMALS,
  computeTotemPriorityRankings,
} from '../modules/tests';

/**
 * A44 — Güvenli ve Çapraz Platform Pano Kopyalama Yardımcısı
 * Clipboard API'yi kullanır; desteklenmediği durumlarda textarea fallback uygular.
 * Asla teknik stack trace fırlatmaz, hata durumunu false döner.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
    return false;
  } catch (err) {
    console.error('Pano kopyalama hatası:', err);
    return false;
  }
}

/**
 * 1. DANIŞAN BİLGİLERİ KOPYALAMA METNİ
 * Kapsam: Ad, Soyad, Doğum tarihi, Doğum saati, Doğum yeri, Anne adı,
 * Doğum saati bilinmiyorsa 12:00 referansı bilgisi.
 */
export function formatClientPersonalInfoCopyText(client: Client): string {
  if (!client || !client.id) {
    return `[DANIŞAN BİLGİLERİ]\nDanışan seçilmedi veya kayıt bulunmuyor.`;
  }

  const loc = client.birthLocation;
  const isTimeUnknown = Boolean(client.isBirthTimeUnknown);
  const birthTimeText = isTimeUnknown
    ? 'Bilinmiyor (Öğle 12:00 varsayımı kullanıldı)'
    : (client.birthTime || 'Belirtilmedi');

  const lines: string[] = [
    `=== DANIŞAN BİLGİLERİ ===`,
    `Adı Soyadı       : ${client.firstName} ${client.lastName}`.trim(),
    `Danışan Kimliği  : ${client.id}`,
    `Doğum Tarihi     : ${client.birthDate || 'Belirtilmedi'}`,
    `Doğum Saati      : ${birthTimeText}`,
    `Doğum Yeri       : ${loc?.placeName || (loc?.city ? `${loc.city}, ${loc.country}` : 'Belirtilmedi')}`,
    `Enlem / Boylam   : ${loc?.latitude !== undefined && loc?.latitude !== null ? `${Number(loc.latitude).toFixed(4)}° / ${Number(loc.longitude).toFixed(4)}°` : 'Belirtilmedi'}`,
    `Zaman Dilimi     : ${loc?.timezone || 'Europe/Istanbul'}`,
    `Anne Adı         : ${client.motherName || 'Belirtilmedi'} (Yalnızca Ebced hesaplaması içindir; astroloji, numeroloji, çakra, Enneagram, totem, sembol seçimi ve dövme görseline aktarılmaz)`,
  ];

  if (isTimeUnknown) {
    lines.push(`Doğum Saati Notu : Doğum saati bilinmediği için 12:00 varsayımı kullanılmıştır; bu durumda Yükselen burç sonucu kesin değildir (hesaplanamaz).`);
  }

  if (client.email) lines.push(`E-posta          : ${client.email}`);
  if (client.phone) lines.push(`Telefon          : ${client.phone}`);
  if (client.notes) lines.push(`Danışan Notları  : ${client.notes}`);
  lines.push(`Kayıt Tarihi     : ${client.createdAt ? new Date(client.createdAt).toLocaleDateString('tr-TR') : 'Kayıtlı'}`);

  return lines.join('\n');
}

/**
 * 2. NUMEROLOJİ KOPYALAMA METNİ
 * Kapsam: Yaşam Yolu, Doğum Günü, Kader/İfade, Ruh Güdüsü, Kişilik,
 * Dünya Görevi, Karmik Dersler, Ana/Master Sayılar, Rezonans özeti.
 */
export function formatNumerologySectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[NUMEROLOJİ ANALİZİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const data = getNumerologyCardData(client, archive);
  if (!data.hasRecord) {
    return [
      `=== NUMEROLOJİ ANALİZ SONUCU ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
      `Açıklama: Numeroloji analizi kaydı bulunmuyor.`,
    ].join('\n');
  }
  return formatNumerologyCopyText(client, data);
}

/**
 * 3. ASTROLOJİ KOPYALAMA METNİ
 * Kapsam: Güneş burcu (derece/dakika), Ay burcu (derece/dakika),
 * Yükselen burç (derece/dakika), saat bilinmiyorsa 12:00 referansı bilgisi, gezegen dökümü.
 */
export function formatAstrologySectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[ASTROLOJİ ANALİZİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const data = getAstrologyCardData(client, archive);
  if (!data.hasRecord) {
    return [
      `=== BATI / TROPICAL ASTROLOJİ ANALİZİ ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
      `Açıklama: Batı / Tropical astroloji haritası kaydı bulunmuyor.`,
    ].join('\n');
  }
  return formatAstrologyCopyText(client, data);
}

/**
 * 4. 7 TEMEL ÇAKRA KOPYALAMA METNİ
 * Kapsam: 7 çakranın tamamı, seviyesi/puanı, durumu (dengeli/bloke/vb.),
 * baskın çakra, öncelikli destek/açıklamalar.
 */
export function formatChakraSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[ÇAKRA ANALİZİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const data = getChakraCardData(client, archive);
  if (!data.hasRecord) {
    return [
      `=== ÇAKRA ENERJİ VE DENGE ANALİZİ ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
      `Açıklama: 7 Temel Çakra analizi kaydı bulunmuyor.`,
    ].join('\n');
  }
  return formatChakraCopyText(client, data);
}

/**
 * 5. BİRLEŞİK + GÖLGE ARKETİP KOPYALAMA METNİ
 * Kapsam: Birincil Arketip, İkincil Arketip, Gölge Arketip, Dönüştürücü sembol, açıklamalar.
 */
export function formatArchetypeSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[ARKETİP ANALİZİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const data = getArchetypeCardData(client, archive);
  if (!data.hasRecord) {
    return [
      `=== BİRLEŞİK & GÖLGE ARKETİP ÇÖZÜMLEMESİ ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
      `Açıklama: Birleşik ve Gölge Arketip analizi kaydı bulunmuyor.`,
    ].join('\n');
  }
  return formatArchetypeCopyText(client, data);
}

/**
 * 6. ENNEAGRAM KOPYALAMA METNİ (TÜM TEST VERİSİ + 15 SORU + CEVAPLAR + SONUÇ)
 * Test çözülmediyse sahte veri uydurmaz; "Test hazır / kullanıcı yanıtı bekleniyor" belirtir.
 */
export function formatEnneagramDetailedCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[ENNEAGRAM TESTİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';

  const enneagramTest = archive?.testResults
    ?.filter((t) => t.clientId === client.id && t.testType === 'ENNEAGRAM')
    ?.slice(-1)[0];

  if (!enneagramTest || !enneagramTest.primaryType || !enneagramTest.completedAt) {
    return [
      `=== ENNEAGRAM MİZAÇ TESTİ ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Test hazır / kullanıcı yanıtı bekleniyor.`,
      `Açıklama: Enneagram kişilik testi henüz danışan tarafından cevaplanmamıştır. Sahte cevap veya varsayılan sonuç üretilmez.`,
    ].join('\n');
  }

  const lines: string[] = [
    `=== ENNEAGRAM ANALİZİ ===`,
    `=== ENNEAGRAM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Test Sürümü: V${enneagramTest.version || 1}`,
    `Tamamlanma Tarihi: ${new Date(enneagramTest.completedAt).toLocaleString('tr-TR')}`,
    ``,
  ];

  const answersMap = new Map<string, string>();
  if (Array.isArray(enneagramTest.answers)) {
    for (const ans of enneagramTest.answers) {
      answersMap.set(ans.questionId, ans.selectedOptionId);
    }
  }

  ENNEAGRAM_QUESTIONS.forEach((q) => {
    const selectedOptionId = answersMap.get(q.id);
    const selectedOpt = q.options.find((o) => o.id === selectedOptionId);

    lines.push(`SORU ${q.order}: (Soru ${q.order})`);
    lines.push(q.questionTr);
    lines.push(``);
    lines.push(`DANIŞANIN CEVABI:`);
    lines.push(selectedOpt ? `${selectedOpt.textTr}  <-- [SEÇİLEN CEVAP]` : (selectedOptionId ? `${selectedOptionId}  <-- [SEÇİLEN CEVAP]` : '(Cevaplanmadı)'));
    lines.push(``);
  });

  lines.push(`ENNEAGRAM SONUCU:`);
  lines.push(`Tip: ${enneagramTest.primaryType}`);
  lines.push(`Kanat: ${enneagramTest.secondaryType || 'Nötr / Dengeli'}`);
  lines.push(``);
  lines.push(`[TİP PUAN DAĞILIMI]`);

  if (enneagramTest.dominantScores) {
    Object.entries(enneagramTest.dominantScores).forEach(([tip, score]) => {
      lines.push(`• ${tip}: ${score} puan`);
    });
  }

  if (enneagramTest.interpretations && enneagramTest.interpretations.length > 0) {
    lines.push(``, `[MİZAÇ VE PSİKOLOJİK YORUMLAR]`);
    enneagramTest.interpretations.forEach((i) => lines.push(`• ${i}`));
  }

  return lines.join('\n');
}

/**
 * 7. TOTEM KOPYALAMA METNİ (TÜM TEST VERİSİ + 10 SORU + CEVAPLAR + SONUÇ)
 * Test çözülmediyse sahte veri uydurmaz; "Test hazır / kullanıcı yanıtı bekleniyor" belirtir.
 */
export function formatTotemDetailedCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[HAYVAN TOTEMİ TESTİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';

  const totemTest = archive?.testResults
    ?.filter((t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM')
    ?.slice(-1)[0];

  if (!totemTest || !totemTest.primaryType || !totemTest.completedAt) {
    return [
      `=== TOTEM HAYVANI ANALİZİ ===`,
      `=== TOTEM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===`,
      `=== ŞAMANİK HAYVAN TOTEMİ TESTİ ===`,
      `Danışan adı: ${client.firstName} ${client.lastName}`,
      `Danışan ID: ${client.id}`,
      `Durum: Test hazır / kullanıcı yanıtı bekleniyor.`,
      `Açıklama: Şamanik Hayvan Totemi testi henüz danışan tarafından cevaplanmamıştır. Sahte cevap veya varsayılan sonuç üretilmez.`,
    ].join('\n');
  }

  const primaryMeta = TOTEM_ANIMALS[totemTest.primaryType];
  const hasSecondary = Boolean(
    totemTest.secondaryType &&
    totemTest.secondaryType !== totemTest.primaryType &&
    totemTest.secondaryType !== 'Tekil Ruh Rehberi'
  );
  const secondaryMeta = hasSecondary && totemTest.secondaryType ? TOTEM_ANIMALS[totemTest.secondaryType] : undefined;

  const dominantScores = totemTest.dominantScores || {};
  const primaryScore = dominantScores[totemTest.primaryType];
  const secondaryScore = hasSecondary && totemTest.secondaryType ? dominantScores[totemTest.secondaryType] : undefined;

  const totalScore = Object.values(dominantScores).reduce((sum, s) => sum + s, 0);

  // Sıralama (Puan azalan sırada, eşitlikte Türkçe alfabetik)
  const sortedAnimals = Object.entries(dominantScores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], 'tr');
  });

  const lines: string[] = [
    `=== TOTEM HAYVANI ANALİZİ ===`,
    `=== TOTEM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===`,
    `=== ŞAMANİK HAYVAN TOTEMİ TESTİ VE GERÇEK CEVAPLARI ===`,
    ``,
    `Danışan adı: ${client.firstName} ${client.lastName}`,
    `Danışan ID: ${client.id}`,
    `Test sürümü: V${totemTest.version || 1}`,
    `Tamamlanma tarihi: ${new Date(totemTest.completedAt).toLocaleString('tr-TR')}`,
    ``,
    `TEST SORULARI VE CEVAPLAR:`,
    ``,
  ];

  const answersMap = new Map<string, string>();
  if (Array.isArray(totemTest.answers)) {
    for (const ans of totemTest.answers) {
      answersMap.set(ans.questionId, ans.selectedOptionId);
    }
  }

  TOTEM_QUESTIONS.forEach((q) => {
    const selectedOptionId = answersMap.get(q.id);
    const selectedOpt = q.options.find((o) => o.id === selectedOptionId);

    lines.push(`SORU ${q.order}: (Soru ${q.order})`);
    lines.push(q.questionTr);
    lines.push(``);
    lines.push(`DANIŞANIN CEVABI:`);
    lines.push(
      selectedOpt
        ? `${selectedOpt.textTr}  <-- [SEÇİLEN CEVAP]`
        : selectedOptionId
        ? `${selectedOptionId}  <-- [SEÇİLEN CEVAP]`
        : '(Cevaplanmadı)'
    );
    lines.push(``);
  });

  lines.push(`TOTEM SONUÇLARI:`);
  lines.push(`- Birincil totem hayvanı: ${totemTest.primaryType}${primaryScore !== undefined ? ` (${primaryScore} puan)` : ''}`);
  if (hasSecondary && totemTest.secondaryType) {
    lines.push(`- İkincil totem hayvanı: ${totemTest.secondaryType}${secondaryScore !== undefined ? ` (${secondaryScore} puan)` : ''}`);
  } else {
    lines.push(`- İkincil totem hayvanı: Bulunmuyor (Tekil ruh rehberi)`);
  }
  lines.push(``);
  lines.push(`- Kavramsal Ayrım (Mizaç Analizi vs Dövme Tasarımı Önceliği):`);
  lines.push(`  • Mizaç Analizi: Danışanın psikolojik mizacını ve karakter eğilimlerini ifade eder (Baskın Totem: ${totemTest.primaryType}).`);
  lines.push(`  • Dövme Tasarımı: Danışan onayına sunulacak sembolik rezonans ve kompozisyon öncelik sırasını ifade eder (Kural 18).`);
  lines.push(``);

  // A62 Tasarım Önceliklendirme ve İkincil Eşleştirme Sıralaması
  const answersMapObj: Record<string, string> = {};
  answersMap.forEach((val, key) => {
    answersMapObj[key] = val;
  });

  const priorityRankings =
    totemTest.totemPriorityRankings && totemTest.totemPriorityRankings.length > 0
      ? totemTest.totemPriorityRankings
      : computeTotemPriorityRankings(answersMapObj, dominantScores);

  const positiveCandidates = priorityRankings.filter((item) => item.isDesignCandidate && item.rawScore > 0);
  const zeroCandidates = priorityRankings.filter((item) => !item.isDesignCandidate || item.rawScore === 0);

  lines.push(`- Tüm hayvanların puan dağılımı:`);
  if (priorityRankings.length > 0) {
    if (positiveCandidates.length > 0) {
      lines.push(`  [Pozitif Puanlı Tasarım Adayları - Rezonans Toplamı: %100.0]`);
      positiveCandidates.forEach((item) => {
        lines.push(
          `  • ${item.animal}: ${item.rawScore} puan (${item.percentageFormatted}) | Öncelik Puanı: ${item.priorityScore.toFixed(4)} [${item.roleLabelTr}]`
        );
      });
    }
    if (zeroCandidates.length > 0) {
      lines.push(`  [Tasarım Önerisi Dışı (0 Ham Puan)]`);
      zeroCandidates.forEach((item) => {
        lines.push(
          `  • ${item.animal}: 0 puan (%0.0) | Öncelik Puanı: 0.0000 [Tasarım Önerisi Dışı (0 Puan)]`
        );
      });
    }
  } else if (sortedAnimals.length > 0) {
    sortedAnimals.forEach(([animal, score]) => {
      const pct = totalScore > 0 ? ((score / totalScore) * 100).toFixed(1) : '0.0';
      lines.push(`  • ${animal}: ${score} puan (%${pct})`);
    });
  } else {
    lines.push(`  • Puan kaydı bulunmuyor`);
  }
  lines.push(``);

  lines.push(`- Varsa yüzdelik skorları:`);
  if (priorityRankings.length > 0) {
    positiveCandidates.forEach((item) => {
      lines.push(`  • ${item.animal}: ${item.percentageFormatted}`);
    });
    zeroCandidates.forEach((item) => {
      lines.push(`  • ${item.animal}: %0.0 (Tasarım önerisi dışı)`);
    });
  } else if (sortedAnimals.length > 0) {
    sortedAnimals.forEach(([animal, score]) => {
      const pct = totalScore > 0 ? ((score / totalScore) * 100).toFixed(1) : '0.0';
      lines.push(`  • ${animal}: %${pct}`);
    });
  } else {
    lines.push(`  • Yüzdelik skor bulunmuyor`);
  }
  lines.push(``);

  lines.push(`- Sonuç sıralaması:`);
  if (priorityRankings.length > 0) {
    priorityRankings.forEach((item) => {
      if (item.isDesignCandidate && item.rawScore > 0) {
        lines.push(
          `  ${item.rank}. ${item.animal} (${item.rawScore} puan, ${item.percentageFormatted}) - Rol: ${item.roleLabelTr} [Öncelik Puanı: ${item.priorityScore.toFixed(4)}]`
        );
      } else {
        lines.push(
          `  ${item.rank}. ${item.animal} (0 puan, %0.0) - Rol: Tasarım Önerisi Dışı (0 Puan) [Öncelik Puanı: 0.0000]`
        );
      }
    });
  } else if (sortedAnimals.length > 0) {
    sortedAnimals.forEach(([animal, score], idx) => {
      const pct = totalScore > 0 ? ((score / totalScore) * 100).toFixed(1) : '0.0';
      lines.push(`  ${idx + 1}. ${animal} (${score} puan, %${pct})`);
    });
  } else {
    lines.push(`  Sıralama verisi bulunmuyor`);
  }
  lines.push(``);

  lines.push(`- Dövme Tasarım Öncelik Durumu ve Danışan Onayı (Kural 18):`);
  const topCandidate = positiveCandidates[0]?.animal || totemTest.primaryType;
  const firstAlt = positiveCandidates[1]?.animal || (hasSecondary ? totemTest.secondaryType : 'Bulunmuyor');
  lines.push(`  • Mizaç Analizi Baskın Hayvanı: ${totemTest.primaryType} (Karakter & Eğilim Boyutu)`);
  lines.push(`  • Ana Tasarım Önceliği: ${topCandidate} (Dövme Kompozisyonu Birincil Öneri)`);
  lines.push(`  • İlk Alternatif: ${firstAlt}`);
  lines.push(
    `  • Danışan Onay Durumu: ${
      totemTest.selectedTotemAnimal
        ? `Danışan Tarafından Tasarım İçin Onaylandı ve Seçildi (${totemTest.selectedTotemAnimal})`
        : 'Danışan onayı bekleniyor (Danışan onayı olmadan dövme tasarımına dahil edilmez)'
    }`
  );
  if (totemTest.rejectedTotemAnimals && totemTest.rejectedTotemAnimals.length > 0) {
    lines.push(`  • Reddedilen Hayvanlar: ${totemTest.rejectedTotemAnimals.join(', ')}`);
  }
  lines.push(``);

  lines.push(`MİZAÇ VE SEMBOLİK YORUM:`);
  lines.push(`- Baskın hayvanın anlamı:`);
  lines.push(`  • Hayvan: ${totemTest.primaryType}`);
  lines.push(`  • Element: ${primaryMeta?.elementTr || 'Doğa'}`);
  lines.push(`  • Temel Nitelik: ${primaryMeta?.coreTraitTr || '-'}`);
  lines.push(`  • İçgüdüsel Rol: ${primaryMeta?.instinctiveRoleTr || '-'}`);
  lines.push(`  • Sembolik Anlam: ${primaryMeta?.symbolicMeaningTr || '-'}`);
  lines.push(``);

  if (hasSecondary && totemTest.secondaryType) {
    lines.push(`- İkincil hayvanın anlamı (${totemTest.secondaryType}):`);
    lines.push(`  • Element: ${secondaryMeta?.elementTr || 'Doğa'}`);
    lines.push(`  • Temel Nitelik: ${secondaryMeta?.coreTraitTr || '-'}`);
    lines.push(`  • İçgüdüsel Rol: ${secondaryMeta?.instinctiveRoleTr || '-'}`);
    lines.push(`  • Sembolik Anlam: ${secondaryMeta?.symbolicMeaningTr || '-'}`);
  } else {
    lines.push(`- İkincil hayvanın anlamı: İkincil totem bulunmamaktadır (Tekil rehber hayvan).`);
  }
  lines.push(``);

  lines.push(`- Testin ürettiği mevcut yorumlar:`);
  if (totemTest.interpretations && totemTest.interpretations.length > 0) {
    totemTest.interpretations.forEach((item) => {
      lines.push(`  • ${item}`);
    });
  } else {
    lines.push(`  • Özel yorum kaydı bulunmamaktadır.`);
  }

  return lines.join('\n');
}

/**
 * 7.5. DOĞUM BİLGİLERİ VE ASTROLOJİK HARİTA TEMELİ KOPYALAMA METNİ
 * Kapsam: Doğum tarihi, doğum saati, bilinmeme durumu, doğum yeri, enlem/boylam,
 * zaman dilimi ve Batı/Tropical astroloji temel parametreleri.
 */
export function formatBirthInfoSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[DOĞUM BİLGİLERİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const loc = client.birthLocation;
  const isTimeUnknown = Boolean(client.isBirthTimeUnknown);
  const birthTimeText = isTimeUnknown
    ? 'Bilinmiyor (Öğle 12:00 varsayımı kullanıldı)'
    : (client.birthTime || 'Belirtilmedi');

  const astroData = getAstrologyCardData(client, archive);

  const lines: string[] = [
    `=== DANIŞAN DOĞUM BİLGİLERİ VE HARİTA TEMELİ ===`,
    `Danışan          : ${client.firstName} ${client.lastName} (Kimlik: ${client.id})`,
    `Doğum Tarihi     : ${client.birthDate || 'Belirtilmedi'}`,
    `Doğum Saati      : ${birthTimeText}`,
    `Doğum Yeri       : ${loc?.placeName || (loc?.city ? `${loc.city}, ${loc.country}` : 'Belirtilmedi')}`,
    `Enlem / Boylam   : ${loc?.latitude !== undefined && loc?.latitude !== null ? `${Number(loc.latitude).toFixed(4)}° / ${Number(loc.longitude).toFixed(4)}°` : 'Belirtilmedi'}`,
    `Zaman Dilimi     : ${loc?.timezone || 'Europe/Istanbul'}`,
  ];

  if (isTimeUnknown) {
    lines.push(`Doğum Saati Uyarısı: Doğum saati bilinmediği için 12:00 varsayımı kullanılmıştır; bu durumda Yükselen burç sonucu kesin değildir (hesaplanamaz).`);
  }

  if (astroData.hasRecord) {
    lines.push(
      ``,
      `[TROPİCAL ZODYAK TEMELİ]`,
      `• Güneş Burcu: ${astroData.sunSignTr || '-'}`,
      `• Ay Burcu   : ${astroData.moonSignTr || '-'}`,
      `• Yükselen Burç: ${astroData.formattedAscendantTr || astroData.ascendantSignTr || (isTimeUnknown ? 'Bilinmiyor (12:00 referansı)' : 'Hesaplanamadı')}`
    );
  }

  return lines.join('\n');
}

/**
 * 7.6. SEMBOL VE GEOMETRİ ANALİZİ KOPYALAMA METNİ
 * Kapsam: Kayıtlı semboller, anlamlar, ağırlıklar ve kişiselleştirilmiş seçimler.
 */
export function formatSymbolsSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) return '[SEMBOL ANALİZİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';

  const symbols = archive?.symbolAnalyses?.filter((s) => s.clientId === client.id) || [];
  const latestSymbol = symbols.length > 0 ? symbols[symbols.length - 1] : null;

  const lines: string[] = [
    `=== DÖVME SEMBOL VE GEOMETRİ ANALİZİ ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
  ];

  if (!latestSymbol) {
    lines.push(`Durum: Sembol analizi kaydı bulunmuyor.`);
    return lines.join('\n');
  }

  lines.push(
    `Oluşturulma Tarihi: ${new Date(latestSymbol.createdAt).toLocaleString('tr-TR')}`,
    `Kompozisyon Anlatısı: ${latestSymbol.compositionNarrative || 'Belirtilmedi'}`,
    ``,
    `Seçilen Danışan Sembolleri:`
  );

  if (latestSymbol.selectedSymbols && latestSymbol.selectedSymbols.length > 0) {
    latestSymbol.selectedSymbols.forEach((s) => {
      const weightLabel = s.weight === 'PRIMARY' ? 'Birincil' : s.weight === 'SECONDARY' ? 'İkincil' : 'Vurgu / Aksan';
      lines.push(`- ${s.symbolName} [${weightLabel}]: ${s.customMeaning || 'Özel anlam girilmedi'}`);
    });
  } else {
    lines.push(`- Seçili sembol bulunmuyor.`);
  }

  return lines.join('\n');
}

/**
 * 8. DÖVME REÇETESİ KOPYALAMA METNİ (A15)
 * Kapsam: Reçete sürümü, stil, yerleşim, ölçüler, ana sembol, ikincil semboller,
 * kompozisyon, negatif alan, teknik tavsiyeler.
 */
export function formatRecipeSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null,
  specificDesign?: ClientTattooDesign | null
): string {
  if (!client || !client.id) return '[DÖVME REÇETESİ]\nDanışan seçilmedi veya kayıt bulunmuyor.';
  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const targetDesign = specificDesign !== undefined
    ? specificDesign
    : (clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null);

  if (!targetDesign || !targetDesign.recipe) {
    return [
      `=== DÖVME REÇETESİ ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
      `Açıklama: Bu danışan için kayıtlı dövme reçetesi bulunmuyor.`,
    ].join('\n');
  }

  return formatTattooRecipeText(client, targetDesign);
}

/**
 * 9. A16 GÖRSEL İSTEM: SADECE İNGİLİZCE PROMPT
 */
export function formatVisualPromptEnSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null,
  specificDesign?: ClientTattooDesign | null
): string {
  if (!client || !client.id) return 'Danışan seçilmedi veya kayıt bulunmuyor.';
  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const targetDesign = specificDesign !== undefined
    ? specificDesign
    : (clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null);

  if (!targetDesign || !targetDesign.aiPrompt?.primaryPromptEn) {
    return 'Görsel istem henüz oluşturulmadı.';
  }

  return targetDesign.aiPrompt.primaryPromptEn;
}

/**
 * 9. A16 GÖRSEL İSTEM: SADECE TÜRKÇE KONSEPT / MANİFESTO
 */
export function formatConceptManifestoSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null,
  specificDesign?: ClientTattooDesign | null
): string {
  if (!client || !client.id) return 'Danışan seçilmedi veya kayıt bulunmuyor.';
  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const targetDesign = specificDesign !== undefined
    ? specificDesign
    : (clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null);

  if (!targetDesign) {
    return 'Konsept manifestosu henüz oluşturulmadı.';
  }

  return formatConceptManifestoText(client, targetDesign);
}

/**
 * 9. A16 GÖRSEL İSTEM: SADECE NEGATİF İSTEM
 */
export function formatNegativePromptSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null,
  specificDesign?: ClientTattooDesign | null
): string {
  if (!client || !client.id) return 'Danışan seçilmedi veya kayıt bulunmuyor.';
  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const targetDesign = specificDesign !== undefined
    ? specificDesign
    : (clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null);

  if (!targetDesign || !targetDesign.aiPrompt?.negativePrompt) {
    return 'Negatif istem henüz oluşturulmadı.';
  }

  return formatNegativePromptText(client, targetDesign);
}

/**
 * 9. A16 GÖRSEL İSTEM: TÜM GÖRSEL İSTEMLERİ BİR ARADA KOPYALA
 */
export function formatAllVisualPromptsSectionCopyText(
  client: Client,
  archive: ClientArchiveRecord | null,
  specificDesign?: ClientTattooDesign | null
): string {
  if (!client || !client.id) return 'Danışan seçilmedi veya kayıt bulunmuyor.';
  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const targetDesign = specificDesign !== undefined
    ? specificDesign
    : (clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null);

  if (!targetDesign || !targetDesign.aiPrompt) {
    return [
      `=== YAPAY ZEKA GÖRSEL İSTEMLERİ (A16) ===`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Durum: Henüz oluşturulmadı.`,
    ].join('\n');
  }

  const p = targetDesign.aiPrompt;
  return [
    `=== YAPAY ZEKA GÖRSEL İSTEMLERİ (V${targetDesign.versionNumber}) ===`,
    `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
    `Tasarım Başlığı: ${targetDesign.title}`,
    ``,
    `[1. PRIMARY AI PROMPT (ENGLISH)]`,
    p.primaryPromptEn,
    ``,
    `[2. NEGATIVE PROMPT (İSTENMEYEN UNSURLAR)]`,
    p.negativePrompt,
    ``,
    `[3. TÜRKÇE KONSEPT / MANİFESTO]`,
    p.conceptPromptTr,
    ``,
    `[4. TEKNİK PARAMETRELER]`,
    `• En/Boy Oranı: --ar ${p.aspectRatio}`,
    p.artisticModifiers?.length ? `• Sanat Belirteçleri: ${p.artisticModifiers.join(', ')}` : '',
    p.seed !== undefined ? `• Seed: ${p.seed}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * 10. GENEL — TÜM DANIŞAN ANALİZİNİ KOPYALA
 * Sıralama kuralı:
 * 1. DANIŞAN BİLGİLERİ
 * 2. NUMEROLOJİ
 * 3. ASTROLOJİ
 * 4. 7 TEMEL ÇAKRA
 * 5. BİRLEŞİK + GÖLGE ARKETİP
 * 6. ENNEAGRAM
 * 7. TOTEM
 * 8. DÖVME REÇETESİ
 * 9. A16 GÖRSEL İSTEM (İngilizce Prompt)
 * 10. NEGATİF İSTEM
 * 11. TÜRKÇE KONSEPT / MANİFESTO
 */
export function formatFullClientAnalysisCopyText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  if (!client || !client.id) {
    return 'Danışan seçilmedi veya geçerli bir danışan kaydı bulunmuyor.';
  }

  const clientDesigns = archive?.designs?.filter((d) => d.clientId === client.id) || [];
  const latestDesign = clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null;

  const header = [
    `======================================================================`,
    `BÜTÜNLEŞİK DANIŞAN ANALİZ VE DÖVME TASARIM DOSYASI`,
    `Danışan: ${client.firstName} ${client.lastName} (Kimlik: ${client.id})`,
    `Oluşturulma / Kopyalanma Tarihi: ${new Date().toLocaleString('tr-TR')}`,
    `Gizlilik: Kişiye Özel Analiz Raporu`,
    `======================================================================`,
  ].join('\n');

  // 1. Danışan Bilgileri
  const part1 = formatClientPersonalInfoCopyText(client);

  // 2. Numeroloji
  const part2 = formatNumerologySectionCopyText(client, archive);

  // 3. Astroloji
  const part3 = formatAstrologySectionCopyText(client, archive);

  // 4. 7 Temel Çakra
  const part4 = formatChakraSectionCopyText(client, archive);

  // 5. Birleşik + Gölge Arketip
  const part5 = formatArchetypeSectionCopyText(client, archive);

  // 6. Enneagram
  const part6 = formatEnneagramDetailedCopyText(client, archive);

  // 7. Totem
  const part7 = formatTotemDetailedCopyText(client, archive);

  // 8. Dövme Reçetesi
  const part8 = formatRecipeSectionCopyText(client, archive);

  // 9. A16 Görsel İstem (İngilizce)
  const part9 = latestDesign?.aiPrompt?.primaryPromptEn
    ? [
        `=== A16 GÖRSEL İSTEM (ENGLISH PROMPT) ===`,
        `Danışan: ${client.firstName} ${client.lastName}`,
        `Sürüm: V${latestDesign.versionNumber}`,
        ``,
        latestDesign.aiPrompt.primaryPromptEn,
      ].join('\n')
    : `=== A16 GÖRSEL İSTEM (ENGLISH PROMPT) ===\nHenüz oluşturulmadı.`;

  // 10. Negatif İstem
  const part10 = latestDesign?.aiPrompt?.negativePrompt
    ? [
        `=== NEGATİF İSTEM ===`,
        `Danışan: ${client.firstName} ${client.lastName}`,
        ``,
        latestDesign.aiPrompt.negativePrompt,
      ].join('\n')
    : `=== NEGATİF İSTEM ===\nHenüz oluşturulmadı.`;

  // 11. Türkçe Konsept / Manifesto
  const part11 = latestDesign?.conceptStatement
    ? formatConceptManifestoText(client, latestDesign)
    : `=== TÜRKÇE KONSEPT / MANİFESTO ===\nHenüz oluşturulmadı.`;

  return [
    header,
    '',
    part1,
    '',
    part2,
    '',
    part3,
    '',
    part4,
    '',
    part5,
    '',
    part6,
    '',
    part7,
    '',
    part8,
    '',
    part9,
    '',
    part10,
    '',
    part11,
    '',
    `======================================================================`,
    `DOSYA SONU`,
    `======================================================================`,
  ].join('\n');
}
