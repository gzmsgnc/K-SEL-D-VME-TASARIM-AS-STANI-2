import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '../../../types/client';
import { ClientArchiveRecord } from '../../../types/archive';
import {
  createClientRecord,
  deleteClientRecord,
  getClientArchive,
  saveClientNumerology,
  saveClientAstrologyChart,
  saveClientChakra,
  saveClientArchetype,
  saveClientTestResult,
} from '../../../store/storage';
import { calculateClientNumerology } from '../../numerology';
import { calculateClientTropicalChart } from '../../astrology';
import { calculateClientChakra } from '../../chakra';
import { calculateClientArchetype } from '../../archetype';
import {
  evaluateTotemTest,
  computeTotemPriorityRankings,
  computeDistinctPercentages,
  QUESTION_IMPORTANCE_WEIGHTS,
  TOTEM_ANIMALS,
  TOTEM_QUESTIONS,
} from '../totemData';
import { runAndBuildTotemResult } from '../testEngineAdapter';
import { generateClientRecipe } from '../../recipe';
import { formatTotemDetailedCopyText } from '../../../utils/clientComprehensiveCopy';

describe('A62: Totem Hayvanı Önceliklendirme ve İkincil Eşleştirme Sistemi Doğrulama Testleri', () => {
  const clientMehmetData = {
    firstName: 'Mehmet',
    lastName: 'Kaya',
    email: 'mehmet@example.com',
    phone: '05551112233',
    birthDate: '1988-06-15',
    birthTime: '10:45',
    isBirthTimeUnknown: false,
    birthLocation: {
      country: 'Türkiye',
      city: 'İzmir',
      placeName: 'Konak, İzmir',
      latitude: 38.4192,
      longitude: 27.1287,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'A62 Totem Önceliklendirme Doğrulama Testi',
  };

  function setupFullArchive(client: Client): ClientArchiveRecord {
    const num = calculateClientNumerology(client);
    if (num.numerology) saveClientNumerology(client.id, num.numerology);

    const astro = calculateClientTropicalChart(client);
    if (astro.chart) saveClientAstrologyChart(client.id, astro.chart);

    const archWithAstro = getClientArchive(client.id)!;
    const chk = calculateClientChakra(client, archWithAstro);
    if (chk.chakra) saveClientChakra(client.id, chk.chakra);

    const archWithChk = getClientArchive(client.id)!;
    const arch = calculateClientArchetype(client, archWithChk);
    if (arch.archetype) saveClientArchetype(client.id, arch.archetype);

    return getClientArchive(client.id)!;
  }

  // Eşit puan senaryosu: Kurt (6p) ve Şahin (6p) eşit
  // q1: Kurt (+3)
  // q2: Kurt (+3) -> Kurt toplam 6
  // q3: Şahin (+3)
  // q7: Şahin (+3) -> Şahin toplam 6
  // q4: Yılan (+3)
  // q5: Yunus (+3)
  // q6: Geyik (+3)
  // q8: Baykuş (+3)
  // q9: Ayı (+3)
  // q10: Jaguar (+3)
  // Kartal: 0p
  const tiedAnswers: Record<string, string> = {
    tot_q1: 'tot_q1_o1', // Kurt (+3)
    tot_q2: 'tot_q2_o1', // Kurt (+3)
    tot_q3: 'tot_q3_o3', // Şahin (+3)
    tot_q4: 'tot_q4_o1', // Yılan (+3)
    tot_q5: 'tot_q5_o4', // Yunus (+3)
    tot_q6: 'tot_q6_o2', // Geyik (+3)
    tot_q7: 'tot_q7_o2', // Şahin (+3)
    tot_q8: 'tot_q8_o1', // Baykuş (+3)
    tot_q9: 'tot_q9_o2', // Ayı (+3)
    tot_q10: 'tot_q10_o1', // Jaguar (+3)
  };

  it('1. Eşit ham puan alan 2 hayvan (Kurt 6p ve Şahin 6p) ikincil deterministik eşleştirme ile çözülmeli ve sıralanmalıdır', () => {
    const result = evaluateTotemTest(tiedAnswers);

    // Ham puanlar eşit
    assert.strictEqual(result.dominantScores['Kurt'], 6, 'Kurt ham puanı 6 olmalıdır');
    assert.strictEqual(result.dominantScores['Şahin'], 6, 'Şahin ham puanı 6 olmalıdır');

    // Önceliklendirme listesi mevcut olmalı
    const rankings = result.totemPriorityRankings;
    assert.ok(rankings && rankings.length === 9, 'Tüm 9 hayvan öncelik sıralamasında yer almalıdır');

    const kurtItem = rankings.find((r) => r.animal === 'Kurt')!;
    const sahinItem = rankings.find((r) => r.animal === 'Şahin')!;

    assert.ok(kurtItem, 'Kurt sıralamada bulunmalıdır');
    assert.ok(sahinItem, 'Şahin sıralamada bulunmalıdır');

    // Kurt ve Şahin öncelik puanları birbirinden FARKLI olmalıdır
    assert.notStrictEqual(
      kurtItem.priorityScore,
      sahinItem.priorityScore,
      'Eşit ham puanlı Kurt ve Şahin kesinlikle farklı tasarım öncelik puanı almalıdır'
    );

    // Kurt ve Şahin yüzdeleri birbirinden FARKLI olmalıdır
    assert.notStrictEqual(
      kurtItem.percentage,
      sahinItem.percentage,
      'Eşit ham puanlı Kurt ve Şahin kesinlikle farklı yüzdelik almalıdır'
    );

    // Kurt Toprak/Kriz rezonansı ve soru ağırlıklarıyla 1. sıraya, Şahin 2. sıraya yerleşmelidir
    assert.strictEqual(rankings[0].animal, 'Kurt', 'Kurt 1. sıra (Ana Tasarım Önceliği) olmalıdır');
    assert.strictEqual(rankings[0].role, 'PRIMARY_DESIGN');
    assert.strictEqual(rankings[0].roleLabelTr, 'Ana Tasarım Önceliği');

    assert.strictEqual(rankings[1].animal, 'Şahin', 'Şahin 2. sıra (İlk Alternatif) olmalıdır');
    assert.strictEqual(rankings[1].role, 'FIRST_ALTERNATIVE');
    assert.strictEqual(rankings[1].roleLabelTr, 'İlk Alternatif');
  });

  it('2. Tüm 9 hayvanın nihai yüzdeleri birbirinden KESİNLİKLE FARKLI olmalı ve toplamı TAM %100.0 etmelidir', () => {
    const result = evaluateTotemTest(tiedAnswers);
    const rankings = result.totemPriorityRankings!;

    // 1. Sıralı 9 hayvanın yüzdelerini kontrol et
    const percentages = rankings.map((r) => r.percentage);
    const uniquePercentages = new Set(percentages);

    assert.strictEqual(
      uniquePercentages.size,
      9,
      'Tüm 9 hayvanın yüzdesi birbirinden kesinlikle farklı (strictly unique) olmalıdır'
    );

    // 2. Katı azalanlık kuralı (rank 1 > rank 2 > ... > rank 9)
    for (let i = 0; i < rankings.length - 1; i++) {
      assert.ok(
        rankings[i].percentage > rankings[i + 1].percentage,
        `${rankings[i].animal} (%${rankings[i].percentage}) sıradaki ${rankings[i + 1].animal} (%${rankings[i + 1].percentage}) değerinden kesinlikle büyük olmalıdır`
      );
      assert.ok(
        rankings[i].priorityScore > rankings[i + 1].priorityScore,
        `${rankings[i].animal} öncelik puanı (${rankings[i].priorityScore}) sıradakinden (${rankings[i + 1].priorityScore}) kesinlikle büyük olmalıdır`
      );
    }

    // 3. Toplam tam %100.0 olmalı
    const totalPercentage = Math.round(percentages.reduce((a, b) => a + b, 0) * 10) / 10;
    assert.strictEqual(
      totalPercentage,
      100.0,
      `Yüzdelerin toplamı tam olarak 100.0 olmalıdır (Bulunan: ${totalPercentage})`
    );
  });

  it('3. Determinizm ve Tekrarlanabilirlik: Aynı cevaplar 50 çalıştırmada BİREBİR AYNI sonucu ve sıralamayı vermelidir (Sıfır Rastgelelik)', () => {
    const firstRun = evaluateTotemTest(tiedAnswers);
    const firstRankings = firstRun.totemPriorityRankings!;

    for (let i = 0; i < 50; i++) {
      const run = evaluateTotemTest(tiedAnswers);
      const rankings = run.totemPriorityRankings!;

      assert.strictEqual(run.primaryType, firstRun.primaryType);
      assert.strictEqual(run.secondaryType, firstRun.secondaryType);

      for (let j = 0; j < 9; j++) {
        assert.strictEqual(rankings[j].animal, firstRankings[j].animal);
        assert.strictEqual(rankings[j].priorityScore, firstRankings[j].priorityScore);
        assert.strictEqual(rankings[j].percentage, firstRankings[j].percentage);
        assert.strictEqual(rankings[j].role, firstRankings[j].role);
      }
    }
  });

  it('4. Birinci hayvan (Kurt) reddedildiğinde, sistem sıradaki ilk alternatifi (Şahin) tasarım için devreye almalıdır', () => {
    const client = createClientRecord(clientMehmetData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const totemTestResult = runAndBuildTotemResult(client, arch, tiedAnswers);
      assert.strictEqual(totemTestResult.primaryType, 'Kurt');

      // Başlangıçta danışan henüz onay vermedi
      assert.strictEqual(totemTestResult.selectedTotemAnimal, undefined);

      // Danışan Kurt'u reddettiğinde (rejectedTotemAnimals: ['Kurt'])
      totemTestResult.rejectedTotemAnimals = ['Kurt'];
      totemTestResult.selectedTotemAnimal = 'Şahin'; // Sıradaki ilk alternatif devreye alındı

      saveClientTestResult(client.id, totemTestResult);
      const updatedArch = getClientArchive(client.id)!;

      // Danışan görsel tasarımı onayladı (includeTotemInVisual: true)
      const recipeResult = generateClientRecipe(client, updatedArch, {
        includeTotemInVisual: true,
      });

      assert.ok(recipeResult.success, 'Reçete başarıyla üretilmelidir');
      const recipe = recipeResult.design?.recipe;
      assert.ok(recipe, 'Reçete nesnesi mevcut olmalıdır');

      // Kurt reddedildiği için görsel istem ve soyut sembol Şahin olmalıdır
      const promptLower = (
        (recipeResult.design?.aiPrompt?.primaryPromptEn || '') +
        ' ' +
        (recipe.totemAbstractionNotes || '') +
        ' ' +
        (recipe.secondarySymbols || []).join(' ')
      ).toLowerCase();
      assert.ok(
        promptLower.includes('şahin') || promptLower.includes('sahin'),
        'Reddedilen Kurt yerine ilk alternatif olan Şahin dövme istemine eklenmelidir'
      );
      assert.ok(
        !promptLower.includes('kurt'),
        'Reddedilen Kurt kesinlikle dövme isteminde yer almamalıdır'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('5. Danışan onayı olmadan hiçbir hayvan dövme tasarımına dahil edilmemelidir (Kural 18 & Opt-in)', () => {
    const client = createClientRecord(clientMehmetData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const totemTestResult = runAndBuildTotemResult(client, arch, tiedAnswers);
      saveClientTestResult(client.id, totemTestResult);
      const updatedArch = getClientArchive(client.id)!;

      // includeTotemInVisual: false (varsayılan danışan onaysız durum)
      const recipeResult = generateClientRecipe(client, updatedArch, {
        includeTotemInVisual: false,
      });

      assert.ok(recipeResult.success);
      const recipe = recipeResult.design?.recipe;
      const visualPrompt = (recipeResult.design?.aiPrompt?.primaryPromptEn || '').toLowerCase();
      const secondarySyms = (recipe?.secondarySymbols || []).map((s) => s.toLowerCase());

      // Hiçbir hayvan figürü görsel isteme veya sembol listesine sızmamalıdır
      assert.ok(!visualPrompt.includes('kurt'), 'Onaysız Kurt görsel prompta eklenmemelidir');
      assert.ok(!visualPrompt.includes('şahin'), 'Onaysız Şahin görsel prompta eklenmemelidir');
      assert.ok(
        !secondarySyms.some((s) => s.includes('kurt') || s.includes('şahin')),
        'Onaysız hayvanlar ikincil sembol listesine eklenmemelidir'
      );
      assert.ok(
        recipe?.totemAbstractionNotes?.includes('görsel tasarıma dahil edilmedi'),
        'Analiz notlarında onaysız olduğu açıkça belirtilmelidir'
      );
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('6. Testin ham puanları ile tasarım öncelik puanları ayrı ayrı saklanmalı ve kopyalama metninde gösterilmelidir', () => {
    const client = createClientRecord(clientMehmetData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const totemTestResult = runAndBuildTotemResult(client, arch, tiedAnswers);
      saveClientTestResult(client.id, totemTestResult);
      const updatedArch = getClientArchive(client.id)!;

      assert.ok(totemTestResult.rawScores, 'rawScores ayrı saklanmalıdır');
      assert.ok(totemTestResult.priorityScores, 'priorityScores ayrı saklanmalıdır');
      assert.ok(totemTestResult.percentageScores, 'percentageScores ayrı saklanmalıdır');

      // Ham puanlar eşit:
      assert.strictEqual(totemTestResult.rawScores['Kurt'], 6);
      assert.strictEqual(totemTestResult.rawScores['Şahin'], 6);

      // Öncelik puanları farklı:
      assert.notStrictEqual(
        totemTestResult.priorityScores['Kurt'],
        totemTestResult.priorityScores['Şahin']
      );

      const copyText = formatTotemDetailedCopyText(client, updatedArch);

      // Kopyalama çıktısında ham puan, öncelik puanı ve ayrık yüzde bulunmalı
      assert.match(copyText, /Kurt: 6 puan/);
      assert.match(copyText, /Şahin: 6 puan/);
      assert.match(copyText, /Öncelik Puanı:/);
      assert.match(copyText, /Ana Tasarım Önceliği/);
      assert.match(copyText, /İlk Alternatif/);
      assert.match(copyText, /Danışan onayı bekleniyor/);
    } finally {
      deleteClientRecord(client.id);
    }
  });

  it('7. Ham puanı 0 olan hayvanlar (Kartal) tasarım önerisi dışı kalmalı; 0 öncelik puanı ve %0.0 almalıdır, pozitifler tam %100 etmelidir', () => {
    const result = evaluateTotemTest(tiedAnswers);
    const rankings = result.totemPriorityRankings!;

    // Kartal 0 ham puan almıştır
    const kartal = rankings.find((r) => r.animal === 'Kartal')!;
    assert.ok(kartal, 'Kartal sıralamada bulunmalıdır');
    assert.strictEqual(kartal.rawScore, 0, 'Kartal ham puanı 0 olmalıdır');
    assert.strictEqual(kartal.priorityScore, 0, 'Kartal öncelik puanı yapay olarak artırılmamalı, 0 olmalıdır');
    assert.strictEqual(kartal.percentage, 0.0, 'Kartal yüzdesi 0.0 olmalıdır');
    assert.strictEqual(kartal.percentageFormatted, '%0.0', 'Kartal formatlı yüzdesi %0.0 olmalıdır');
    assert.strictEqual(kartal.isDesignCandidate, false, 'Kartal tasarım adayı olmamalıdır');
    assert.strictEqual(kartal.role, 'OUTSIDE_RECOMMENDATION', 'Kartal rolü OUTSIDE_RECOMMENDATION olmalıdır');
    assert.strictEqual(kartal.roleLabelTr, 'Tasarım Önerisi Dışı (0 Puan)');

    // Pozitif puan alan 8 hayvanın yüzdeleri toplamı tam %100.0 olmalıdır
    const positiveItems = rankings.filter((r) => r.isDesignCandidate && r.rawScore > 0);
    assert.strictEqual(positiveItems.length, 8, '8 hayvan pozitif puan almıştır');
    const positiveSum = Math.round(positiveItems.reduce((sum, item) => sum + item.percentage, 0) * 10) / 10;
    assert.strictEqual(positiveSum, 100.0, 'Pozitif puanlı hayvanların yüzdeleri toplamı tam %100.0 olmalıdır');

    // Pozitif puan alan tüm hayvanların yüzdeleri birbirinden farklı olmalıdır
    const posPercentages = positiveItems.map((r) => r.percentage);
    assert.strictEqual(new Set(posPercentages).size, 8, 'Pozitif hayvanların her birinin yüzdesi benzersiz olmalıdır');
  });

  it('8. Mizaç analizi ile dövme tasarımı önceliği kavramsal olarak ayrılmalı, kopyalama metni ve yorumlarda çelişki olmamalıdır', () => {
    const client = createClientRecord(clientMehmetData, 'OWNER_MANUAL');
    try {
      const arch = setupFullArchive(client);
      const totemTestResult = runAndBuildTotemResult(client, arch, tiedAnswers);
      saveClientTestResult(client.id, totemTestResult);
      const updatedArch = getClientArchive(client.id)!;

      const copyText = formatTotemDetailedCopyText(client, updatedArch);

      // 1. Mizaç Analizi ve Dövme Tasarımı kavramsal ayrımı kopyalama çıktısında net yer almalıdır
      assert.match(copyText, /Kavramsal Ayrım \(Mizaç Analizi vs Dövme Tasarımı Önceliği\):/);
      assert.match(copyText, /Mizaç Analizi: Danışanın psikolojik mizacını ve karakter eğilimlerini ifade eder/);
      assert.match(copyText, /Dövme Tasarımı: Danışan onayına sunulacak sembolik rezonans ve kompozisyon öncelik sırasını ifade eder/);

      // 2. Pozitif tasarım adayları ve 0 puanlı dışlananlar ayrı başlıklarda gösterilmelidir
      assert.match(copyText, /\[Pozitif Puanlı Tasarım Adayları - Rezonans Toplamı: %100\.0\]/);
      assert.match(copyText, /\[Tasarım Önerisi Dışı \(0 Ham Puan\)\]/);
      assert.match(copyText, /Kartal: 0 puan \(%0\.0\)/);

      // 3. Yorumlarda hem Mizaç hem Tasarım boyutları çelişkisiz yer almalıdır
      assert.ok(totemTestResult.interpretations.some((i) => i.includes('Mizaç Analizi Boyutu')));
      assert.ok(totemTestResult.interpretations.some((i) => i.includes('Dövme Tasarımı Boyutu')));
      assert.ok(totemTestResult.interpretations.some((i) => i.includes('Baskın Mizaç Totemi: Kurt')));
      assert.ok(totemTestResult.interpretations.some((i) => i.includes('Ana Tasarım Önceliği: Kurt')));
    } finally {
      deleteClientRecord(client.id);
    }
  });
});

