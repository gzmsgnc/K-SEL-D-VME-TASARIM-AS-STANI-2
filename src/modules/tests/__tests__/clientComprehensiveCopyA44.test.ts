import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  clearAllApplicationData,
  createClientRecord,
  getClientArchive,
} from '../../../store/storage';
import { runClientFullPipeline } from '../../pipeline';
import {
  formatClientPersonalInfoCopyText,
  formatNumerologySectionCopyText,
  formatAstrologySectionCopyText,
  formatChakraSectionCopyText,
  formatArchetypeSectionCopyText,
  formatEnneagramDetailedCopyText,
  formatTotemDetailedCopyText,
  formatRecipeSectionCopyText,
  formatVisualPromptEnSectionCopyText,
  formatNegativePromptSectionCopyText,
  formatConceptManifestoSectionCopyText,
  formatAllVisualPromptsSectionCopyText,
  formatFullClientAnalysisCopyText,
} from '../../../utils/clientComprehensiveCopy';
import { ENNEAGRAM_QUESTIONS, TOTEM_QUESTIONS } from '../index';

test('A44 Kapsamlı Kopyalama Sistemi: Test Paketi', async (t) => {
  clearAllApplicationData();

  // Test danışanı (Elif Demir)
  const clientElif = createClientRecord({
    firstName: 'Elif',
    lastName: 'Demir',
    birthDate: '1992-06-15',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
      source: 'MAP_CLICK',
    },
    motherName: 'Aylin',
    email: 'elif.demir@example.com',
    phone: '+90 532 111 2233',
    notes: 'Kişisel gelişim ve dönüşüm temalı zarif dövme isteği',
  });

  // Otomatik zinciri çalıştır (A42 / A43 tam otomatik analiz ve tasarım)
  const autoResult = runClientFullPipeline(clientElif, {
    designOptions: {
      preferredStyle: 'FINE_LINE',
      preferredPlacement: 'FOREARM_INNER',
    },
  });

  assert.strictEqual(autoResult.errors.length, 0, `Analiz zincirinde hata olmamalı: ${autoResult.errors.join(', ')}`);

  const archiveElif = getClientArchive(clientElif.id);
  assert.ok(archiveElif, 'Danışan arşivi başarıyla oluşturulmalıdır');

  await t.test('1. Danışan Bilgileri Kopyalama Metni Doğrulaması', () => {
    const text = formatClientPersonalInfoCopyText(clientElif);
    assert.match(text, /=== DANIŞAN BİLGİLERİ ===/);
    assert.match(text, /Elif Demir/);
    assert.match(text, /1992-06-15/);
    assert.match(text, /14:30/);
    assert.match(text, /İstanbul/);
    assert.match(text, /Aylin/);
    assert.match(text, new RegExp(clientElif.id));

    // Saat bilinmeyen durum kontrolü
    const clientNoTime: Client = {
      ...clientElif,
      id: 'client-no-time',
      birthTime: '',
      isBirthTimeUnknown: true,
    };
    const textNoTime = formatClientPersonalInfoCopyText(clientNoTime);
    assert.match(textNoTime, /12:00/);
    assert.match(textNoTime, /Bilinmiyor/);
  });

  await t.test('2. Numeroloji Kopyalama Metni Doğrulaması', () => {
    const text = formatNumerologySectionCopyText(clientElif, archiveElif);
    assert.match(text, /=== NUMEROLOJİ ANALİZ SONUCU ===/);
    assert.match(text, /Yaşam Yolu/);
    assert.match(text, /Kader \/ İsim/);
    assert.match(text, /Ruh Güdüsü/);
    assert.match(text, /Kişilik Sayısı/);
    assert.match(text, /Doğum Günü Sayısı/);
    assert.match(text, /Dünya Görevi Sayısı/);
    assert.match(text, /Karmik Dersler/);
  });

  await t.test('3. Astroloji Kopyalama Metni Doğrulaması (Güneş, Ay, Yükselen, 10 Gök Cismi)', () => {
    const text = formatAstrologySectionCopyText(clientElif, archiveElif);
    assert.match(text, /=== BATI \/ TROPICAL ASTROLOJİ ANALİZİ ===/);
    assert.match(text, /Güneş Burcu:/);
    assert.match(text, /Ay Burcu:/);
    assert.match(text, /Yükselen Burç:/);
    assert.match(text, /Merkür/);
    assert.match(text, /Venüs/);
    assert.match(text, /Mars/);

    // Doğum saati bilinmiyorsa ASC üretilmemeli, 12:00 referansı açıkça belirtilmeli
    const clientUnknownTime = createClientRecord({
      firstName: 'Can',
      lastName: 'Öz',
      birthDate: '1990-03-21',
      birthTime: '',
      isBirthTimeUnknown: true,
      birthLocation: clientElif.birthLocation,
      motherName: 'Emine',
      email: 'can@example.com',
      phone: '05551234567',
      notes: '',
    });
    runClientFullPipeline(clientUnknownTime);
    const archiveCan = getClientArchive(clientUnknownTime.id);
    const textUnknown = formatAstrologySectionCopyText(clientUnknownTime, archiveCan);
    assert.match(textUnknown, /hesaplanamaz/i);
  });

  await t.test('4. 7 Temel Çakra Kopyalama Metni Doğrulaması', () => {
    const text = formatChakraSectionCopyText(clientElif, archiveElif);
    assert.match(text, /=== ÇAKRA ENERJİ VE DENGE ANALİZİ ===/);
    assert.match(text, /Kök Çakra/);
    assert.match(text, /Sakral Çakra/);
    assert.match(text, /Solar Pleksus/);
    assert.match(text, /Kalp Çakrası/);
    assert.match(text, /Boğaz Çakrası/);
    assert.match(text, /Üçüncü Göz/);
    assert.match(text, /Tepe \(Taç\) Çakra/);
    assert.match(text, /Baskın Çakra/);
  });

  await t.test('5. Birleşik + Gölge Arketip Kopyalama Metni Doğrulaması', () => {
    const text = formatArchetypeSectionCopyText(clientElif, archiveElif);
    assert.match(text, /=== BİRLEŞİK & GÖLGE ARKETİP ÇÖZÜMLEMESİ ===/);
    assert.match(text, /Ana Arketip/);
    assert.match(text, /Gölge Arketip/);
    assert.match(text, /Dönüştürücü Sembol/);
  });

  await t.test('6. Enneagram: Çözülmediğinde Sahte Cevap Uydurmama ve Çözüldüğünde 15 Soruyu Dökme', () => {
    // 6a: Test henüz çözülmedi
    const textUnanswered = formatEnneagramDetailedCopyText(clientElif, archiveElif);
    assert.match(textUnanswered, /Test hazır \/ kullanıcı yanıtı bekleniyor/);
    assert.doesNotMatch(textUnanswered, /<-- \[SEÇİLEN CEVAP\]/);

    // 6b: Danışan testi çözerse
    const sampleAnswers = ENNEAGRAM_QUESTIONS.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      weight: 1,
    }));

    const archiveWithEnneagram: ClientArchiveRecord = {
      ...archiveElif,
      testResults: [
        {
          id: 'test-enneagram-elif-1',
          clientId: clientElif.id,
          testType: 'ENNEAGRAM',
          version: 1,
          completedAt: '2026-03-30T11:00:00.000Z',
          primaryType: 'Tip 4',
          secondaryType: '4w3',
          dominantScores: { 'Tip 4': 9, 'Tip 3': 6 },
          answers: sampleAnswers,
          interpretations: ['Bireyci ve yaratıcı mizaç.'],
        },
      ],
    };

    const textAnswered = formatEnneagramDetailedCopyText(clientElif, archiveWithEnneagram);
    assert.match(textAnswered, /=== ENNEAGRAM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===/);
    assert.match(textAnswered, /Tip 4/);
    assert.match(textAnswered, /4w3/);
    assert.match(textAnswered, /<-- \[SEÇİLEN CEVAP\]/);
    assert.match(textAnswered, /Soru 15/); // Tüm 15 soruyu içerir
  });

  await t.test('7. Totem: Çözülmediğinde Sahte Cevap Uydurmama ve Çözüldüğünde 10 Soruyu Dökme', () => {
    // 7a: Test henüz çözülmedi
    const textUnanswered = formatTotemDetailedCopyText(clientElif, archiveElif);
    assert.match(textUnanswered, /Test hazır \/ kullanıcı yanıtı bekleniyor/);
    assert.doesNotMatch(textUnanswered, /<-- \[SEÇİLEN CEVAP\]/);

    // 7b: Danışan testi çözerse
    const sampleAnswers = TOTEM_QUESTIONS.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      weight: 1,
    }));

    const archiveWithTotem: ClientArchiveRecord = {
      ...archiveElif,
      testResults: [
        ...(archiveElif.testResults || []),
        {
          id: 'test-totem-elif-1',
          clientId: clientElif.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-03-30T11:30:00.000Z',
          primaryType: 'Kurt',
          secondaryType: 'Kartal',
          dominantScores: { Kurt: 12, Kartal: 8 },
          answers: sampleAnswers,
          interpretations: ['Kurt totemi: Sadakat, içsel sezgi ve rehberlik.'],
        },
      ],
    };

    const textAnswered = formatTotemDetailedCopyText(clientElif, archiveWithTotem);
    assert.match(textAnswered, /=== ŞAMANİK HAYVAN TOTEMİ TESTİ VE GERÇEK CEVAPLARI ===/);
    assert.match(textAnswered, /Kurt/);
    assert.match(textAnswered, /<-- \[SEÇİLEN CEVAP\]/);
    assert.match(textAnswered, /Soru 10/); // Tüm 10 soruyu içerir
  });

  await t.test('8. Dövme Reçetesi Kopyalama Metni Doğrulaması (A15)', () => {
    const text = formatRecipeSectionCopyText(clientElif, archiveElif);
    assert.match(text, /=== DÖVME REÇETESİ/);
    assert.match(text, /Danışan: Elif Demir/);
    assert.match(text, /Stil:/);
    assert.match(text, /Yerleşim:/);
    assert.match(text, /Ana Sembol/);
    assert.match(text, /İkincil Semboller/);
  });

  await t.test('9. A16 Görsel İstemler Kopyalama Doğrulaması (İngilizce, Negatif, Konsept, Tüm İstemler)', () => {
    const enPrompt = formatVisualPromptEnSectionCopyText(clientElif, archiveElif);
    assert.ok(enPrompt.length > 20, 'İngilizce görsel istem boş olmamalı');
    assert.match(enPrompt, /tattoo design/i);

    const negPrompt = formatNegativePromptSectionCopyText(clientElif, archiveElif);
    assert.ok(negPrompt.length > 10, 'Negatif istem boş olmamalı');
    assert.match(negPrompt, /blurry|deformed|ugly/i);

    const concept = formatConceptManifestoSectionCopyText(clientElif, archiveElif);
    assert.match(concept, /DÖVME KONSEPT MANİFESTOSU/);
    assert.match(concept, /Elif Demir/);

    const allPrompts = formatAllVisualPromptsSectionCopyText(clientElif, archiveElif);
    assert.match(allPrompts, /=== YAPAY ZEKA GÖRSEL İSTEMLERİ/);
    assert.match(allPrompts, /\[1\. PRIMARY AI PROMPT \(ENGLISH\)\]/);
    assert.match(allPrompts, /\[2\. NEGATIVE PROMPT/);
    assert.match(allPrompts, /\[3\. TÜRKÇE KONSEPT \/ MANİFESTO\]/);
  });

  await t.test('10. Genel Kopyalama: "TÜM DANIŞAN ANALİZİNİ KOPYALA" 11 Bölüm Doğrulaması', () => {
    const fullText = formatFullClientAnalysisCopyText(clientElif, archiveElif);
    assert.match(fullText, /BÜTÜNLEŞİK DANIŞAN ANALİZ VE DÖVME TASARIM DOSYASI/);
    assert.match(fullText, /=== DANIŞAN BİLGİLERİ ===/); // 1
    assert.match(fullText, /=== NUMEROLOJİ ANALİZ SONUCU ===/); // 2
    assert.match(fullText, /=== BATI \/ TROPICAL ASTROLOJİ ANALİZİ ===/); // 3
    assert.match(fullText, /=== ÇAKRA ENERJİ VE DENGE ANALİZİ ===/); // 4
    assert.match(fullText, /=== BİRLEŞİK & GÖLGE ARKETİP ÇÖZÜMLEMESİ ===/); // 5
    assert.match(fullText, /=== ENNEAGRAM MİZAÇ TESTİ/); // 6
    assert.match(fullText, /=== ŞAMANİK HAYVAN TOTEMİ TESTİ/); // 7
    assert.match(fullText, /=== DÖVME REÇETESİ/); // 8
    assert.match(fullText, /=== A16 GÖRSEL İSTEM \(ENGLISH PROMPT\) ===/); // 9
    assert.match(fullText, /=== NEGATİF İSTEM ===/); // 10
    assert.match(fullText, /=== DÖVME KONSEPT MANİFESTOSU/); // 11
    assert.match(fullText, /DOSYA SONU/);
  });

  await t.test('11. Anne Adı İzolasyon Kontrolü (Görsel İstem ve Sembol Çıktısına Sızmama)', () => {
    const enPrompt = formatVisualPromptEnSectionCopyText(clientElif, archiveElif);
    assert.strictEqual(
      enPrompt.toLowerCase().includes('aylin'),
      false,
      'Anne adı Aylin İngilizce görsel isteme asla sızmamalıdır'
    );

    const recipeText = formatRecipeSectionCopyText(clientElif, archiveElif);
    const symbolMatches = recipeText.match(/Ana Sembol:.*Aylin/i);
    assert.strictEqual(symbolMatches, null, 'Anne adı dövme sembolü olarak geçmemelidir');
  });

  await t.test('12. Başka Danışanın Verisiyle Karışmama (Veri İzolasyonu)', () => {
    const clientB = createClientRecord({
      firstName: 'Burak',
      lastName: 'Yılmaz',
      birthDate: '1988-11-20',
      birthTime: '08:15',
      isBirthTimeUnknown: false,
      birthLocation: {
        placeName: 'İzmir, Türkiye',
        city: 'İzmir',
        country: 'Türkiye',
        countryCode: 'TR',
        latitude: 38.4192,
        longitude: 27.1287,
        timezone: 'Europe/Istanbul',
        utcOffsetMinutes: 180,
      },
      motherName: 'Fatma',
      email: 'burak@example.com',
      phone: '+90 533 999 8877',
      notes: '',
    });

    const textElif = formatFullClientAnalysisCopyText(clientElif, archiveElif);
    const textBurak = formatFullClientAnalysisCopyText(clientB, null);

    assert.strictEqual(textElif.includes('Burak'), false);
    assert.strictEqual(textBurak.includes('Elif'), false);
  });
});
