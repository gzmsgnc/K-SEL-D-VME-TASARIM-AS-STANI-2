import { Client } from '../types/client';
import { ClientArchiveRecord } from '../types/archive';
import { TATTOO_STYLES, BODY_PLACEMENTS, COLOR_PROFILES } from '../modules/recipe';
import { CHAKRA_DEFINITIONS } from '../modules/chakra';
import { TROPICAL_ZODIAC_SIGNS } from '../modules/astrology';

/**
 * Danışan Dosyası ve Dışa Aktarma Motoru (A26)
 * Seçili danışanın tüm analiz, test, reçete ve tasarım sürümlerini
 * tek bir düzenli, insan tarafından okunabilir Türkçe dosyada birleştirir.
 */

export function generateClientDossierText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const lineSeparator = '='.repeat(70);
  const subSeparator = '-'.repeat(70);
  const nowStr = new Date().toLocaleString('tr-TR');

  const clientId = client.id;
  const analysisRecord = archive?.analyses.find((a) => a.clientId === clientId);
  const clientTests = archive?.testResults.filter((t) => t.clientId === clientId) || [];
  const clientDesigns = archive?.designs.filter((d) => d.clientId === clientId) || [];
  const latestDesign = clientDesigns.length > 0 ? clientDesigns[clientDesigns.length - 1] : null;

  const enneagramTest = [...clientTests].reverse().find((t) => t.testType === 'ENNEAGRAM');
  const totemTest = [...clientTests].reverse().find((t) => t.testType === 'ANIMAL_TOTEM');

  const astro = analysisRecord?.astrology;
  const num = analysisRecord?.numerology;
  const chakra = analysisRecord?.chakra;
  const archetype = analysisRecord?.archetype;

  const sections: string[] = [];

  // Başlık
  sections.push(
    [
      lineSeparator,
      `DÖVME TASARIM ASİSTANI — BÜTÜNLEŞİK DANIŞAN DOSYASI`,
      `Danışan: ${client.firstName} ${client.lastName} (ID: ${client.id})`,
      `Dosya Üretim Tarihi: ${nowStr}`,
      `Gizlilik: Kişiye Özel Analiz ve Dövme Konsept Dosyası`,
      lineSeparator,
    ].join('\n')
  );

  // 1. Temel Danışan & İletişim Bilgileri
  sections.push(
    [
      `1. TEMEL DANIŞAN VE İLETİŞİM BİLGİLERİ`,
      subSeparator,
      `Adı Soyadı        : ${client.firstName} ${client.lastName}`,
      `Danışan Kimliği   : ${client.id}`,
      `E-posta Adresi    : ${client.email}`,
      `Telefon Numarası  : ${client.phone}`,
      `Kayıt Tarihi      : ${new Date(client.createdAt).toLocaleString('tr-TR')}`,
      `Kayıt Kaynağı     : ${client.source === 'CLIENT_FORM' ? 'Danışan Bilgi Formu' : 'Stüdyo / Manuel'}`,
      `Özel Notlar       : ${client.notes ? client.notes : 'Özel not girilmemiş.'}`,
    ].join('\n')
  );

  // 2. Doğum ve Coğrafi Konum Bilgileri
  const loc = client.birthLocation;
  sections.push(
    [
      `2. DOĞUM VE COĞRAFİ KONUM PARAMETRELERİ`,
      subSeparator,
      `Doğum Tarihi      : ${client.birthDate}`,
      `Doğum Saati       : ${client.isBirthTimeUnknown ? 'Bilinmiyor (Öğle 12:00 varsayıldı)' : client.birthTime}`,
      `Doğum Yeri        : ${loc?.placeName || `${loc?.city}, ${loc?.country}`}`,
      `Enlem / Boylam    : ${loc?.latitude?.toFixed(4) || '-'}° / ${loc?.longitude?.toFixed(4) || '-'}°`,
      `Zaman Dilimi      : ${loc?.timezone || 'Europe/Istanbul'} (UTC ${loc?.utcOffsetMinutes ? (loc.utcOffsetMinutes >= 0 ? `+${loc.utcOffsetMinutes / 60}` : `${loc.utcOffsetMinutes / 60}`) : '+3'})`,
      `Ebced Anne Adı    : ${client.motherName} (Yalnızca Ebced/Numeroloji altyapısı içindir, tasarıma sızmaz)`,
    ].join('\n')
  );

  // 3. Batı / Tropical Astroloji Analizi
  if (astro) {
    const sunSignTr = astro.sunSign ? (TROPICAL_ZODIAC_SIGNS[astro.sunSign]?.nameTr || astro.sunSign) : 'Belirtilmedi';
    const moonSignTr = astro.moonSign ? (TROPICAL_ZODIAC_SIGNS[astro.moonSign]?.nameTr || astro.moonSign) : 'Belirtilmedi';
    const risingSignTr = astro.ascendantSign
      ? (astro.formattedAscendantTr || (TROPICAL_ZODIAC_SIGNS[astro.ascendantSign]?.nameTr || astro.ascendantSign))
      : 'Doğum saati bilinmediğinden hesaplanmadı (12:00 öğle referansı varsayımı)';
    const planetsList = (astro.planetaryPositions || [])
      .map((p) => `  - ${p.body}: ${TROPICAL_ZODIAC_SIGNS[p.sign]?.nameTr || p.sign} (${p.degree.toFixed(1)}°) [Ev ${p.houseNumber || '-'}]`)
      .join('\n');

    sections.push(
      [
        `3. BATI / TROPICAL ASTROLOJİ ANALİZİ`,
        subSeparator,
        `Sistem / Evler    : Tropical (Batı) / Placidus Ev Sistemi`,
        `Güneş Burcu       : ${sunSignTr} (${astro.sunSign || '-'})`,
        `Ay Burcu          : ${moonSignTr} (${astro.moonSign || '-'})`,
        `Yükselen Burç     : ${risingSignTr}`,
        `Gezegen Yerleşimleri:`,
        planetsList || '  - Detaylı gezegen listesi bulunmuyor.',
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `3. BATI / TROPICAL ASTROLOJİ ANALİZİ`,
        subSeparator,
        `Kayıt bulunmuyor. (Astroloji analizi henüz çalıştırılmadı)`,
      ].join('\n')
    );
  }

  // 4. Pisagor ve İbrani Numerolojisi
  if (num) {
    sections.push(
      [
        `4. PİSAGOR VE İBRANİ NUMEROLOJİ ANALİZİ`,
        subSeparator,
        `Yaşam Yolu Sayısı : ${num.lifePathNumber}`,
        `Kader / İsim Sayısı: ${num.destinyNumber}`,
        `Ruh Güdüsü Sayısı : ${num.soulUrgeNumber}`,
        `Kişilik Sayısı    : ${num.personalityNumber}`,
        `Doğum Günü Sayısı : ${num.birthdayNumber}`,
        `Dünya Görevi      : ${num.worldMissionNumber}`,
        `Karmik Dersler    : ${num.karmicLessons?.length > 0 ? num.karmicLessons.join(', ') : 'Karmik borç/ders bulunmuyor'}`,
        `Ana Sayılar       : ${num.masterNumbers?.length > 0 ? num.masterNumbers.join(', ') : 'Ana sayı bulunmuyor'}`,
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `4. PİSAGOR VE İBRANİ NUMEROLOJİ ANALİZİ`,
        subSeparator,
        `Kayıt bulunmuyor. (Numeroloji analizi henüz çalıştırılmadı)`,
      ].join('\n')
    );
  }

  // 5. Çakra Enerji ve Denge Analizi
  if (chakra) {
    const dominantName = chakra.dominantChakra ? (CHAKRA_DEFINITIONS[chakra.dominantChakra]?.nameTr || chakra.dominantChakra) : 'Belirtilmedi';
    const deficitName = chakra.primaryDeficit ? (CHAKRA_DEFINITIONS[chakra.primaryDeficit]?.nameTr || chakra.primaryDeficit) : 'Belirtilmedi';
    const chakraLines = (chakra.chakras || [])
      .map((c) => {
        const def = CHAKRA_DEFINITIONS[c.chakra];
        const name = def?.nameTr || c.chakra;
        const statusText = c.status === 'BALANCED' ? 'Dengeli' : c.status === 'UNDERACTIVE' ? 'Düşük / Bloke' : c.status === 'OVERACTIVE' ? 'Aşırı Aktif' : 'Bloke';
        return `  - ${name}: Puan ${c.score}/10 [Durum: ${statusText}]`;
      })
      .join('\n');

    sections.push(
      [
        `5. ÇAKRA ENERJİ VE DENGE ANALİZİ`,
        subSeparator,
        `Baskın Çakra      : ${dominantName}`,
        `Öncelikli Destek  : ${deficitName} (Dövme tasarımında güçlendirilecek merkez)`,
        `Çakra Düzeyleri:`,
        chakraLines || '  - Detaylı çakra dökümü bulunmuyor.',
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `5. ÇAKRA ENERJİ VE DENGE ANALİZİ`,
        subSeparator,
        `Kayıt bulunmuyor. (Çakra analizi henüz çalıştırılmadı)`,
      ].join('\n')
    );
  }

  // 6. Birleşik Arketip Çözümlemesi
  if (archetype) {
    sections.push(
      [
        `6. BİRLEŞİK ARKETİP ÇÖZÜMLEMESİ`,
        subSeparator,
        `Ana Arketip       : ${archetype.unifiedArchetype.primary}`,
        `İkincil Arketip   : ${archetype.unifiedArchetype.secondary}`,
        `Arketip Açıklaması: ${archetype.unifiedArchetype.description}`,
        `Gölge Arketip     : ${archetype.shadowArchetype.shadowName}`,
        `Dönüştürücü Sembol: ${archetype.shadowArchetype.transformationalSymbol}`,
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `6. BİRLEŞİK ARKETİP ÇÖZÜMLEMESİ`,
        subSeparator,
        `Kayıt bulunmuyor. (Arketip analizi henüz çalıştırılmadı)`,
      ].join('\n')
    );
  }

  // 7. Enneagram Mizaç Testi
  if (enneagramTest) {
    const scoreLines = Object.entries(enneagramTest.dominantScores || {})
      .map(([tip, score]) => `  - ${tip}: ${score} puan`)
      .join('\n');

    sections.push(
      [
        `7. ENNEAGRAM MİZAÇ TESTİ SONUCU (Sürüm ${enneagramTest.version})`,
        subSeparator,
        `Baskın Tip        : ${enneagramTest.primaryType}`,
        `Kanat Eğilimi     : ${enneagramTest.secondaryType || 'Nötr / Dengeli'}`,
        `Tamamlanma Tarihi : ${new Date(enneagramTest.completedAt).toLocaleString('tr-TR')}`,
        `Tip Puan Dağılımı :`,
        scoreLines || '  - Puan verisi yok.',
        `Psikolojik Yorumlar:`,
        (enneagramTest.interpretations || []).map((i) => `  * ${i}`).join('\n') || '  - Yorum yok.',
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `7. ENNEAGRAM MİZAÇ TESTİ SONUCU`,
        subSeparator,
        `Kayıt bulunmuyor. (Enneagram testi henüz tamamlanmadı)`,
      ].join('\n')
    );
  }

  // 8. Hayvan Totemi Testi
  if (totemTest) {
    const scoreLines = Object.entries(totemTest.dominantScores || {})
      .map(([hayvan, score]) => `  - ${hayvan}: ${score} puan`)
      .join('\n');

    sections.push(
      [
        `8. HAYVAN TOTEMİ TESTİ SONUCU (Sürüm ${totemTest.version})`,
        subSeparator,
        `Ana Ruh Hayvanı   : ${totemTest.primaryType}`,
        `Tamamlayıcı Rehber: ${totemTest.secondaryType || 'Tekil odaklı'}`,
        `Tamamlanma Tarihi : ${new Date(totemTest.completedAt).toLocaleString('tr-TR')}`,
        `Totem Puanları    :`,
        scoreLines || '  - Puan verisi yok.',
        `Totem Yorumları   :`,
        (totemTest.interpretations || []).map((i) => `  * ${i}`).join('\n') || '  - Yorum yok.',
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `8. HAYVAN TOTEMİ TESTİ SONUCU`,
        subSeparator,
        `Kayıt bulunmuyor. (Hayvan totemi testi henüz tamamlanmadı)`,
      ].join('\n')
    );
  }

  // 9. Dövme Reçetesi (En Son Sürüm)
  if (latestDesign) {
    const r = latestDesign.recipe;
    sections.push(
      [
        `9. GÜNCEL DÖVME REÇETESİ (Sürüm V${latestDesign.versionNumber})`,
        subSeparator,
        `Reçete Başlığı    : ${latestDesign.title}`,
        `Kayıt Tarihi      : ${new Date(latestDesign.createdAt).toLocaleString('tr-TR')}`,
        `Kişisel Manifesto : "${latestDesign.conceptStatement}"`,
        `Tasarım Stili     : ${TATTOO_STYLES[r.style]?.nameTr || r.style}`,
        `Vücut Yerleşimi   : ${BODY_PLACEMENTS[r.recommendedPlacement]?.nameTr || r.recommendedPlacement}`,
        `Yerleşim Detayı   : ${r.placementDescription}`,
        `Önerilen Ebat     : ${r.recommendedDimensionsCm.width} cm x ${r.recommendedDimensionsCm.height} cm`,
        `Renk / Ton Profili: ${COLOR_PROFILES[r.colorProfile]?.nameTr || r.colorProfile}`,
        `Renk Gerekçesi    : ${r.colorRationale || '-'}`,
        `Ana Sembol        : ${r.primarySymbol || 'Belirtilmedi'}`,
        `İkincil Semboller : ${r.secondarySymbols?.join(', ') || 'Yok'}`,
        `Hariç Tutulanlar  : ${r.excludedElements?.length ? r.excludedElements.join(', ') : 'Hariç tutulan sembol yok'}`,
        `Totem Entegrasyonu: ${r.totemAbstractionNotes || 'Totem analizi görselden hariç tutuldu'}`,
        `Temel Bileşenler  :`,
        (r.keyComponents || []).map((k) => `  - ${k}`).join('\n') || '  - Belirtilmedi.',
        `Sanatçıya Teknik Tavsiyeler:`,
        (r.technicalAdviceForArtist || []).map((t) => `  - ${t}`).join('\n') || '  - Belirtilmedi.',
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `9. GÜNCEL DÖVME REÇETESİ`,
        subSeparator,
        `Kayıt bulunmuyor. (Dövme reçetesi henüz oluşturulmadı)`,
      ].join('\n')
    );
  }

  // 10. Görsel Üretim İstemi (AI Prompt)
  if (latestDesign?.aiPrompt) {
    const p = latestDesign.aiPrompt;
    sections.push(
      [
        `10. GÖRSEL ÜRETİM İSTEMİ (AI PROMPT BİLGİLERİ)`,
        subSeparator,
        `İngilizce Ana Prompt:`,
        `"${p.primaryPromptEn}"`,
        ``,
        `Türkçe Konsept Özeti:`,
        `"${p.conceptPromptTr}"`,
        ``,
        `Negatif Filtre Listesi (İstenmeyenler):`,
        `"${p.negativePrompt}"`,
        ``,
        `En / Boy Oranı    : ${p.aspectRatio}`,
        `Sanatsal Belirteç : ${p.artisticModifiers?.join(', ') || 'Standart'}`,
        `Güvenlik Denetimi : Anne adı bu görsel isteme KESİNLİKLE dahil edilmemiştir.`,
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `10. GÖRSEL ÜRETİM İSTEMİ (AI PROMPT BİLGİLERİ)`,
        subSeparator,
        `Kayıt bulunmuyor. (Görsel istem henüz üretilmedi)`,
      ].join('\n')
    );
  }

  // 11. Tasarım Sürüm Geçmişi
  if (clientDesigns.length > 0) {
    const versionLines = clientDesigns.map(
      (d) =>
        `  * V${d.versionNumber} [${new Date(d.createdAt).toLocaleString('tr-TR')}]: ${d.title} | ${TATTOO_STYLES[d.recipe.style]?.nameTr.split('(')[0].trim()} | ${BODY_PLACEMENTS[d.recipe.recommendedPlacement]?.nameTr}`
    );
    sections.push(
      [
        `11. TASARIM SÜRÜM GEÇMİŞİ (${clientDesigns.length} Kayıtlı Sürüm)`,
        subSeparator,
        versionLines.join('\n'),
      ].join('\n')
    );
  } else {
    sections.push(
      [
        `11. TASARIM SÜRÜM GEÇMİŞİ`,
        subSeparator,
        `Kayıt bulunmuyor.`,
      ].join('\n')
    );
  }

  sections.push(
    [
      lineSeparator,
      `Bu dosya Dövme Tasarım Asistanı tarafından seçili danışana özel olarak üretilmiştir.`,
      `© ${new Date().getFullYear()} Dövme Tasarım Asistanı. Tüm hakları saklıdır.`,
      lineSeparator,
    ].join('\n')
  );

  return sections.join('\n\n');
}

/**
 * Danışan Dosyasını JSON Formatında Dışa Aktarır
 */
export function generateClientDossierJson(
  client: Client,
  archive: ClientArchiveRecord | null
): object {
  const clientId = client.id;
  const analysisRecord = archive?.analyses.find((a) => a.clientId === clientId);
  const clientTests = archive?.testResults.filter((t) => t.clientId === clientId) || [];
  const clientDesigns = archive?.designs.filter((d) => d.clientId === clientId) || [];
  const clientSymbols = archive?.symbolAnalyses.filter((s) => s.clientId === clientId) || [];

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      system: 'Dövme Tasarım Asistanı',
    },
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      birthDate: client.birthDate,
      birthTime: client.isBirthTimeUnknown ? null : client.birthTime,
      isBirthTimeUnknown: client.isBirthTimeUnknown,
      birthLocation: client.birthLocation,
      motherName: client.motherName,
      notes: client.notes,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      source: client.source,
      status: client.status,
    },
    analyses: analysisRecord
      ? {
          astrology: analysisRecord.astrology || null,
          numerology: analysisRecord.numerology || null,
          chakra: analysisRecord.chakra || null,
          archetype: analysisRecord.archetype || null,
        }
      : null,
    testResults: clientTests,
    symbolAnalyses: clientSymbols,
    designs: clientDesigns,
  };
}

/**
 * Bölüm Bazlı Kopyalama Metinleri (A26 Kural 3)
 */

export function getClientPersonalInfoText(client: Client): string {
  const loc = client.birthLocation;
  return [
    `--- DANIŞAN KİŞİSEL BİLGİLERİ ---`,
    `Adı Soyadı: ${client.firstName} ${client.lastName}`,
    `Danışan No: ${client.id}`,
    `E-posta   : ${client.email}`,
    `Telefon   : ${client.phone}`,
    `Doğum     : ${client.birthDate} ${client.isBirthTimeUnknown ? '(Saat bilinmiyor)' : client.birthTime}`,
    `Doğum Yeri: ${loc?.placeName || `${loc?.city}, ${loc?.country}`}`,
    `Anne Adı  : ${client.motherName}`,
    `Notlar    : ${client.notes || 'Yok'}`,
  ].join('\n');
}

export function getAnalysesSummaryText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const analysis = archive?.analyses.find((a) => a.clientId === client.id);
  if (!analysis) return 'Bu danışana ait kayıtlı analiz bulunmuyor.';

  const astro = analysis.astrology;
  const num = analysis.numerology;
  const chakra = analysis.chakra;
  const arch = analysis.archetype;

  const sunSignTr = astro?.sunSign ? (TROPICAL_ZODIAC_SIGNS[astro.sunSign]?.nameTr || astro.sunSign) : 'Belirtilmedi';
  const moonSignTr = astro?.moonSign ? (TROPICAL_ZODIAC_SIGNS[astro.moonSign]?.nameTr || astro.moonSign) : 'Belirtilmedi';
  const risingSignTr = astro?.ascendantSign ? (TROPICAL_ZODIAC_SIGNS[astro.ascendantSign]?.nameTr || astro.ascendantSign) : 'Belirsiz';

  const dominantChakraName = chakra?.dominantChakra ? (CHAKRA_DEFINITIONS[chakra.dominantChakra]?.nameTr || chakra.dominantChakra) : 'Belirtilmedi';
  const deficitChakraName = chakra?.primaryDeficit ? (CHAKRA_DEFINITIONS[chakra.primaryDeficit]?.nameTr || chakra.primaryDeficit) : 'Belirtilmedi';

  return [
    `--- ANALİZ ÖZETİ (${client.firstName} ${client.lastName}) ---`,
    astro
      ? `Astroloji: Güneş ${sunSignTr}, Ay ${moonSignTr}, Yükselen ${risingSignTr}`
      : `Astroloji: Henüz hesaplanmadı`,
    num
      ? `Numeroloji: Yaşam Yolu ${num.lifePathNumber}, Kader ${num.destinyNumber}, Ruh Güdüsü ${num.soulUrgeNumber}`
      : `Numeroloji: Henüz hesaplanmadı`,
    chakra
      ? `Çakra: Baskın ${dominantChakraName}, Öncelikli Destek ${deficitChakraName}`
      : `Çakra: Henüz hesaplanmadı`,
    arch
      ? `Arketip: ${arch.unifiedArchetype.primary} (${arch.unifiedArchetype.secondary})`
      : `Arketip: Henüz hesaplanmadı`,
  ].join('\n');
}

export function getEnneagramSummaryText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const tests = archive?.testResults.filter((t) => t.clientId === client.id && t.testType === 'ENNEAGRAM') || [];
  const latest = tests[tests.length - 1];
  if (!latest) return 'Bu danışana ait kayıtlı Enneagram testi bulunmuyor.';

  return [
    `--- ENNEAGRAM MİZAÇ TESTİ SONUCU ---`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Baskın Tip: ${latest.primaryType}`,
    `Kanat: ${latest.secondaryType || 'Nötr'}`,
    `Tarih: ${new Date(latest.completedAt).toLocaleString('tr-TR')}`,
    `Yorumlar:`,
    (latest.interpretations || []).map((i) => `* ${i}`).join('\n'),
  ].join('\n');
}

export function getTotemSummaryText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const tests = archive?.testResults.filter((t) => t.clientId === client.id && t.testType === 'ANIMAL_TOTEM') || [];
  const latest = tests[tests.length - 1];
  if (!latest) return 'Bu danışana ait kayıtlı Hayvan Totemi testi bulunmuyor.';

  return [
    `--- HAYVAN TOTEMİ TESTİ SONUCU ---`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Ana Ruh Hayvanı: ${latest.primaryType}`,
    `Tamamlayıcı: ${latest.secondaryType || 'Tekil'}`,
    `Tarih: ${new Date(latest.completedAt).toLocaleString('tr-TR')}`,
    `Yorumlar:`,
    (latest.interpretations || []).map((i) => `* ${i}`).join('\n'),
  ].join('\n');
}

export function getRecipeSummaryText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const designs = archive?.designs.filter((d) => d.clientId === client.id) || [];
  const latest = designs[designs.length - 1];
  if (!latest) return 'Bu danışana ait kayıtlı dövme reçetesi bulunmuyor.';

  const r = latest.recipe;
  return [
    `--- DÖVME REÇETESİ (Sürüm V${latest.versionNumber}) ---`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Başlık : ${latest.title}`,
    `Manifesto: "${latest.conceptStatement}"`,
    `Stil   : ${TATTOO_STYLES[r.style]?.nameTr || r.style}`,
    `Yerleşim: ${BODY_PLACEMENTS[r.recommendedPlacement]?.nameTr || r.recommendedPlacement}`,
    `Ebatlar: ${r.recommendedDimensionsCm.width} cm x ${r.recommendedDimensionsCm.height} cm`,
    `Renk   : ${COLOR_PROFILES[r.colorProfile]?.nameTr || r.colorProfile}`,
    `Ana Sembol: ${r.primarySymbol || 'Belirtilmedi'}`,
    `İkincil Semboller: ${r.secondarySymbols?.join(', ') || 'Yok'}`,
    `Sanatçıya Tavsiyeler:`,
    (r.technicalAdviceForArtist || []).map((t) => `* ${t}`).join('\n'),
  ].join('\n');
}

export function getVisualPromptText(
  client: Client,
  archive: ClientArchiveRecord | null
): string {
  const designs = archive?.designs.filter((d) => d.clientId === client.id) || [];
  const latest = designs[designs.length - 1];
  if (!latest || !latest.aiPrompt) return 'Bu danışana ait kayıtlı görsel istem bulunmuyor.';

  const p = latest.aiPrompt;
  return [
    `--- GÖRSEL ÜRETİM İSTEMİ (AI PROMPT) ---`,
    `Danışan: ${client.firstName} ${client.lastName}`,
    `Sürüm  : V${latest.versionNumber}`,
    ``,
    `[Ana İngilizce Prompt]`,
    p.primaryPromptEn,
    ``,
    `[Türkçe Konsept]`,
    p.conceptPromptTr,
    ``,
    `[Negatif Filtre]`,
    p.negativePrompt,
  ].join('\n');
}

/**
 * Tarayıcıda Dosya İndirme Yardımcısı
 */
export function downloadFileInBrowser(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
