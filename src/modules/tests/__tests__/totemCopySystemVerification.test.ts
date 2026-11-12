import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import { TOTEM_QUESTIONS } from '../totemData';
import { formatTotemDetailedCopyText } from '../../../utils/clientComprehensiveCopy';

describe('A61: Totem Hayvanı Testi Kopyalama Sistemi Doğrulama Testleri', () => {
  const clientGizem: Client = {
    id: 'client_gizem_totem_copy',
    firstName: 'Gizem Selma',
    lastName: 'Genç',
    email: 'gizem@example.com',
    phone: '05551234567',
    birthDate: '1991-11-24',
    birthTime: '03:15',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      city: 'İstanbul',
      placeName: 'Fatih, İstanbul',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 120,
    },
    motherName: 'Songül',
    notes: 'Totem kopyalama doğrulama testi',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
    createdAt: '2026-10-31T07:00:00.000Z',
    updatedAt: '2026-10-31T07:00:00.000Z',
  };

  const clientElif: Client = {
    id: 'client_elif_totem_copy',
    firstName: 'Elif',
    lastName: 'Demir',
    email: 'elif@example.com',
    phone: '05559876543',
    birthDate: '1995-04-12',
    birthTime: '14:20',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      city: 'Ankara',
      placeName: 'Çankaya, Ankara',
      latitude: 39.9334,
      longitude: 32.8597,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: '',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
    createdAt: '2026-10-31T07:00:00.000Z',
    updatedAt: '2026-10-31T07:00:00.000Z',
  };

  const createEmptyArchive = (client: Client): ClientArchiveRecord => ({
    client,
    analyses: [],
    testResults: [],
    symbolAnalyses: [],
    designs: [],
    reports: [],
    historySummary: {
      totalAnalysesCount: 0,
      totalDesignsCount: 0,
      lastInteractionAt: '2026-10-31T07:00:00.000Z',
    },
  });

  it('1. Test tamamlanmadığında sahte cevap veya sonuç uydurmamalı, açık bilgilendirme metni üretmelidir', () => {
    const emptyArchive = createEmptyArchive(clientGizem);

    const text = formatTotemDetailedCopyText(clientGizem, emptyArchive);
    assert.match(text, /=== TOTEM HAYVANI ANALİZİ ===/);
    assert.match(text, /=== TOTEM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===/);
    assert.match(text, /Danışan adı: Gizem Selma Genç/);
    assert.match(text, /Danışan ID: client_gizem_totem_copy/);
    assert.match(text, /Test hazır \/ kullanıcı yanıtı bekleniyor/);
    assert.doesNotMatch(text, /<-- \[SEÇİLEN CEVAP\]/);
  });

  it('2. Tamamlanan testte 10 sorunun tamamı, soru metinleri, seçenek metinleri ve işaretli cevaplar eksiksiz yer almalıdır', () => {
    const realAnswers = TOTEM_QUESTIONS.map((q, idx) => ({
      questionId: q.id,
      selectedOptionId: q.options[idx % q.options.length].id,
      weight: 3,
    }));

    const archiveWithTotem: ClientArchiveRecord = {
      ...createEmptyArchive(clientGizem),
      testResults: [
        {
          id: 'test_totem_gizem_1',
          clientId: clientGizem.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-10-31T07:15:00.000Z',
          primaryType: 'Baykuş',
          secondaryType: 'Kurt',
          dominantScores: {
            Baykuş: 15,
            Kurt: 12,
            Şahin: 9,
            Ayı: 6,
            Yılan: 3,
          },
          answers: realAnswers,
          interpretations: [
            'Baykuş totemi: Derin sezgi, karanlıkta yol gösteren bilgelik ve yanılsamaları aşma.',
            'Kurt totemi: Sadakat, sürü bağı ve içsel rehberlik.',
          ],
        },
      ],
    };

    const copyText = formatTotemDetailedCopyText(clientGizem, archiveWithTotem);

    // Başlıklar ve Danışan Bilgileri
    assert.match(copyText, /=== TOTEM HAYVANI ANALİZİ ===/);
    assert.match(copyText, /=== TOTEM MİZAÇ TESTİ VE GERÇEK CEVAPLARI ===/);
    assert.match(copyText, /Danışan adı: Gizem Selma Genç/);
    assert.match(copyText, /Danışan ID: client_gizem_totem_copy/);
    assert.match(copyText, /Test sürümü: V1/);
    assert.match(copyText, /Tamamlanma tarihi:/);

    // 10 Sorunun tamamının bulunması
    for (let i = 1; i <= 10; i++) {
      assert.match(copyText, new RegExp(`SORU ${i}:`));
    }

    // Gerçek soru metinleri
    TOTEM_QUESTIONS.forEach((q) => {
      assert.ok(copyText.includes(q.questionTr), `Soru metni bulunmalıdır: ${q.questionTr}`);
    });

    // Danışanın seçtiği şıkların <-- [SEÇİLEN CEVAP] ile işaretlenmesi
    const selectedMatches = copyText.match(/<-- \[SEÇİLEN CEVAP\]/g);
    assert.strictEqual(selectedMatches?.length, 10, 'Tam olarak 10 soru için seçilen cevap işaretlenmelidir');

    // Totem Sonuçları
    assert.match(copyText, /TOTEM SONUÇLARI:/);
    assert.match(copyText, /Birincil totem hayvanı: Baykuş \(15 puan\)/);
    assert.match(copyText, /İkincil totem hayvanı: Kurt \(12 puan\)/);

    // Puan Dağılımı ve Yüzdelikler
    assert.match(copyText, /Tüm hayvanların puan dağılımı:/);
    assert.match(copyText, /Baykuş: 15 puan/);
    assert.match(copyText, /Kurt: 12 puan/);
    assert.match(copyText, /Varsa yüzdelik skorları:/);

    // Sonuç Sıralaması (Baykuş 1. sırada olmalı)
    assert.match(copyText, /Sonuç sıralaması:/);
    assert.match(copyText, /1\. Baykuş \(15 puan/);
    assert.match(copyText, /2\. Kurt \(12 puan/);

    // Mizaç ve Sembolik Yorum
    assert.match(copyText, /MİZAÇ VE SEMBOLİK YORUM:/);
    assert.match(copyText, /Baskın hayvanın anlamı:/);
    assert.match(copyText, /Hayvan: Baykuş/);
    assert.match(copyText, /Gizem, derin bilgelik/);
    assert.match(copyText, /İkincil hayvanın anlamı \(Kurt\):/);
    assert.match(copyText, /Sadakat, sezgisel rehberlik/);
  });

  it('3. İkincil totem yoksa uydurulmamalı, açıkça tekil rehber olduğu belirtilmelidir', () => {
    const singleTotemArchive: ClientArchiveRecord = {
      ...createEmptyArchive(clientGizem),
      testResults: [
        {
          id: 'test_totem_single',
          clientId: clientGizem.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-10-31T07:15:00.000Z',
          primaryType: 'Kartal',
          secondaryType: undefined,
          dominantScores: {
            Kartal: 30,
          },
          answers: TOTEM_QUESTIONS.map((q) => ({
            questionId: q.id,
            selectedOptionId: q.options[0].id,
            weight: 3,
          })),
          interpretations: ['Kartal totemi: Yüksek vizyon.'],
        },
      ],
    };

    const text = formatTotemDetailedCopyText(clientGizem, singleTotemArchive);
    assert.match(text, /Birincil totem hayvanı: Kartal/);
    assert.match(text, /İkincil totem hayvanı: Bulunmuyor \(Tekil ruh rehberi\)/);
    assert.match(text, /İkincil hayvanın anlamı: İkincil totem bulunmamaktadır/);
  });

  it('4. Danışanlar arası izolasyon: Danışan A nın kopyalama metninde Danışan B nin verileri asla bulunmamalıdır', () => {
    const archiveBoth: ClientArchiveRecord = {
      ...createEmptyArchive(clientGizem),
      testResults: [
        {
          id: 'test_gizem',
          clientId: clientGizem.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-10-31T07:00:00.000Z',
          primaryType: 'Kurt',
          dominantScores: { Kurt: 15 },
          answers: TOTEM_QUESTIONS.map((q) => ({
            questionId: q.id,
            selectedOptionId: q.options[0].id,
            weight: 3,
          })),
          interpretations: ['Kurt totemi.'],
        },
        {
          id: 'test_elif',
          clientId: clientElif.id,
          testType: 'ANIMAL_TOTEM',
          version: 2,
          completedAt: '2026-10-31T07:10:00.000Z',
          primaryType: 'Şahin',
          dominantScores: { Şahin: 18 },
          answers: TOTEM_QUESTIONS.map((q) => ({
            questionId: q.id,
            selectedOptionId: q.options[1].id,
            weight: 3,
          })),
          interpretations: ['Şahin totemi.'],
        },
      ],
    };

    const copyGizem = formatTotemDetailedCopyText(clientGizem, archiveBoth);
    const copyElif = formatTotemDetailedCopyText(clientElif, archiveBoth);

    // Gizem metni kontrolü
    assert.match(copyGizem, /Danışan adı: Gizem Selma Genç/);
    assert.match(copyGizem, /Danışan ID: client_gizem_totem_copy/);
    assert.match(copyGizem, /Birincil totem hayvanı: Kurt/);
    assert.doesNotMatch(copyGizem, /client_elif_totem_copy/);
    assert.doesNotMatch(copyGizem, /Elif Demir/);
    assert.doesNotMatch(copyGizem, /Birincil totem hayvanı: Şahin/);

    // Elif metni kontrolü
    assert.match(copyElif, /Danışan adı: Elif Demir/);
    assert.match(copyElif, /Danışan ID: client_elif_totem_copy/);
    assert.match(copyElif, /Birincil totem hayvanı: Şahin/);
    assert.doesNotMatch(copyElif, /client_gizem_totem_copy/);
    assert.doesNotMatch(copyElif, /Gizem Selma Genç/);
    assert.doesNotMatch(copyElif, /Birincil totem hayvanı: Kurt/);
  });

  it('5. Kopyalama işlemi arşiv nesnesini ve test cevaplarını asla değiştirmemelidir (salt-okunur / mutasyonsuz)', () => {
    const rawArchive: ClientArchiveRecord = {
      ...createEmptyArchive(clientGizem),
      testResults: [
        {
          id: 'test_immutability',
          clientId: clientGizem.id,
          testType: 'ANIMAL_TOTEM',
          version: 1,
          completedAt: '2026-10-31T07:00:00.000Z',
          primaryType: 'Ayı',
          dominantScores: { Ayı: 10 },
          answers: [{ questionId: 'tot_q1', selectedOptionId: 'tot_q1_o1', weight: 3 }],
          interpretations: ['Ayı yorumu'],
        },
      ],
    };

    const snapshot = JSON.stringify(rawArchive);
    formatTotemDetailedCopyText(clientGizem, rawArchive);
    const afterSnapshot = JSON.stringify(rawArchive);

    assert.strictEqual(snapshot, afterSnapshot, 'Kopyalama işlemi arşivi hiçbir şekilde mutasyona uğratmamalıdır');
  });
});
