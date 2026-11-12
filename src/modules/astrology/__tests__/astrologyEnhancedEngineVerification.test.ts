import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateClientTropicalChart,
  prepareAstrologyModule,
  getStoredTropicalChart,
} from '../astrologyEngineAdapter';
import {
  isAstrologyChartStale,
  calculateRawBodyEcliptic,
  resolveHistoricalUtcDateTime,
  AstrologicalBodyId,
} from '../astrologyCalculationEngine';
import { Client } from '../../../types/client';
import {
  clearAllApplicationData,
  createClientRecord,
  saveClientAstrologyChart,
  getClientArchive,
  updateClientRecord,
} from '../../../store/storage';
import { hasActualModuleResults } from '../../../core/clientDataAdapter';
import { getAstrologyCardData } from '../../../utils/analysisResultsFormatters';

describe('A64: Astroloji Modülü Geliştirme ve Doğruluk Test Paketi', () => {
  const baseClient: Client = {
    id: 'client_astro_test_a64',
    firstName: 'Can',
    lastName: 'Yılmaz',
    email: 'can.yilmaz@example.com',
    phone: '05321112233',
    birthDate: '1995-04-12',
    birthTime: '10:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      source: 'MAP_CLICK',
      utcOffsetMinutes: 180,
    },
    motherName: 'Ayşe',
    notes: 'Astroloji test danışanı',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  // -------------------------------------------------------------------------
  // 1. Kapsam ve 10 Gök Cisminin Tam ve Doğru Hesaplanması
  // -------------------------------------------------------------------------
  describe('1. Batı / Tropical Zodyak ve 10 Gök Cismi Kapsamı', () => {
    it('1.1. Tam olarak 10 gök cismi (Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton) hesaplanmalıdır', () => {
      const res = calculateClientTropicalChart(baseClient);
      assert.equal(res.success, true);
      assert.ok(res.chart);

      const positions = res.chart.planetaryPositions || [];
      assert.equal(positions.length, 10, 'Toplam 10 gök cismi bulunmalıdır');

      const expectedBodies: AstrologicalBodyId[] = [
        'Sun',
        'Moon',
        'Mercury',
        'Venus',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune',
        'Pluto',
      ];

      const extractedBodies = positions.map((p) => p.body);
      assert.deepEqual(extractedBodies, expectedBodies, '10 gök cismi kanonik sıraya uymalıdır');

      // Her cismin burç, derece ve dakikası geçerli aralıkta olmalı
      for (const pos of positions) {
        assert.ok(pos.degree >= 0 && pos.degree < 30, `${pos.body} derecesi 0-29 arasında olmalıdır`);
        assert.ok(pos.minute >= 0 && pos.minute < 60, `${pos.body} dakikası 0-59 arasında olmalıdır`);
        assert.ok(pos.formattedTextTr && pos.formattedTextTr.length > 0, `${pos.body} formatlı metni olmalıdır`);
        assert.ok(
          pos.eclipticLongitude !== undefined && pos.eclipticLongitude >= 0 && pos.eclipticLongitude < 360,
          `${pos.body} ekliptik boylamı [0, 360) aralığında olmalıdır`
        );
      }
    });

    it('1.2. Kapsam dışı unsurlar (ev sistemleri, Ay düğümleri) sahte olarak üretilmemelidir', () => {
      const res = calculateClientTropicalChart(baseClient);
      assert.equal(res.success, true);
      assert.ok(res.chart);

      // Ev cuspları bu sürümde üretilmez
      assert.equal(res.chart.houseCusps, undefined, 'Astrolojik evler kapsam dışıdır');
      // Ay düğümleri planetaryPositions içinde bulunmamalıdır
      const hasNodes = res.chart.planetaryPositions?.some(
        (p) => (p.body as string) === 'NorthNode' || (p.body as string) === 'SouthNode'
      );
      assert.equal(hasNodes, false, 'Ay düğümleri bu sürümde hesaplanmamalıdır');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Doğum Koordinatları, Saat Dilimi ve Yaz Saati (DST) Çözümlemesi
  // -------------------------------------------------------------------------
  describe('2. Doğum Koordinatları ve Tarihsel Saat Dilimi / DST', () => {
    it('2.1. Türkiye standart kış saati (UTC+2) ve yaz saati (UTC+3) doğru çözümlenmelidir', () => {
      // Kış Saati (Kasım 1995)
      const winterRes = resolveHistoricalUtcDateTime('1995-11-15', '10:30', 'Europe/Istanbul', 28.9784);
      assert.equal(winterRes.exactUtcOffsetHours, 2, 'Kasım 1995 Türkiye UTC+2 kış saatindedir');
      assert.equal(winterRes.isDaylightSavingTime, false);
      assert.equal(winterRes.utcIsoString, '1995-11-15T08:30:00.000Z');

      // Yaz Saati (Haziran 1995)
      const summerRes = resolveHistoricalUtcDateTime('1995-06-15', '10:30', 'Europe/Istanbul', 28.9784);
      assert.equal(summerRes.exactUtcOffsetHours, 3, 'Haziran 1995 Türkiye UTC+3 yaz saatindedir');
      assert.equal(summerRes.isDaylightSavingTime, true);
      assert.equal(summerRes.utcIsoString, '1995-06-15T07:30:00.000Z');
    });

    it('2.2. Eksik veya geçersiz koordinat durumunda hesaplama reddedilmeli, sahte koordinat uydurulmamalıdır', () => {
      const clientNoCoords: Client = {
        ...baseClient,
        id: 'no_coords_client',
        birthLocation: {
          ...baseClient.birthLocation,
          latitude: null as any,
          longitude: null as any,
        },
      };

      const res = calculateClientTropicalChart(clientNoCoords);
      assert.equal(res.success, false);
      assert.equal(res.chart, undefined);
      assert.ok(res.errorMessageTr?.includes('koordinat'));
    });
  });

  // -------------------------------------------------------------------------
  // 3. Bilinmeyen Doğum Saati ve 12:00 Varsayımı
  // -------------------------------------------------------------------------
  describe('3. Bilinmeyen Doğum Saati ve Belirsizlik Uyarısı', () => {
    it('3.1. Doğum saati bilinmediğinde (isBirthTimeUnknown: true) 12:00 varsayımı kullanılmalı ve açık Türkçe uyarı verilmelidir', () => {
      const unknownTimeClient: Client = {
        ...baseClient,
        id: 'unknown_time_client_a64',
        birthTime: '',
        isBirthTimeUnknown: true,
      };

      const res = calculateClientTropicalChart(unknownTimeClient);
      assert.equal(res.success, true);
      assert.ok(res.chart);

      // Veri modelinde bilinmeyen saat işaretlenmeli
      assert.equal(res.chart.isBirthTimeUnknown, true);
      assert.equal(res.chart.isNoonReference, true);
      assert.ok(
        res.chart.timeUncertaintyNoticeTr &&
        res.chart.timeUncertaintyNoticeTr.includes('12:00 varsayımıyla') &&
        res.chart.timeUncertaintyNoticeTr.includes('sapma payı'),
        'Doğum saati belirsizlik notu açıkça bildirilmelidir'
      );

      // Uyarı listesinde Türkçe açıklama yer almalı
      assert.ok(
        res.warningNotices.some((w) => w.includes('12:00')),
        'Uyarı bildirimlerinde 12:00 referansı yer almalıdır'
      );

      // Yükselen burç kesin kabul edilmemeli
      assert.equal(res.chart.isAscendantDefinitive, false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Danışan Veri İzolasyonu (Cross-Client Isolation)
  // -------------------------------------------------------------------------
  describe('4. Danışan Veri İzolasyonu', () => {
    it('4.1. Danışan A nın astroloji haritası Danışan B ye asla sızmamalıdır', () => {
      clearAllApplicationData();

      const clientA = createClientRecord({
        firstName: 'Ahmet',
        lastName: 'Kaya',
        email: 'ahmet@example.com',
        phone: '05321110011',
        birthDate: '1988-03-21',
        birthTime: '08:00',
        isBirthTimeUnknown: false,
        birthLocation: {
          placeName: 'İzmir, Türkiye',
          city: 'İzmir',
          country: 'Türkiye',
          latitude: 38.4192,
          longitude: 27.1287,
          timezone: 'Europe/Istanbul',
          source: 'MAP_CLICK',
          utcOffsetMinutes: 180,
        },
        motherName: 'Zehra',
        notes: '',
      }, 'OWNER_MANUAL');

      const clientB = createClientRecord({
        firstName: 'Burcu',
        lastName: 'Eren',
        email: 'burcu@example.com',
        phone: '05322220022',
        birthDate: '1995-10-10',
        birthTime: '21:15',
        isBirthTimeUnknown: false,
        birthLocation: {
          placeName: 'Ankara, Türkiye',
          city: 'Ankara',
          country: 'Türkiye',
          latitude: 39.9334,
          longitude: 32.8597,
          timezone: 'Europe/Istanbul',
          source: 'MAP_CLICK',
          utcOffsetMinutes: 180,
        },
        motherName: 'Merve',
        notes: '',
      }, 'OWNER_MANUAL');

      const chartA = calculateClientTropicalChart(clientA).chart!;
      saveClientAstrologyChart(clientA.id, chartA);

      // Client B henüz hesaplanmadı
      const archiveB = getClientArchive(clientB.id);
      const storedForB = getStoredTropicalChart(archiveB, clientB.id);
      assert.equal(storedForB, null, 'Client B için henüz harita kayıtlı olmamalıdır');

      // Client A nın arşivi Client B nin kimliğiyle istendiğinde reddedilmelidir
      const archiveA = getClientArchive(clientA.id);
      const crossFetch = getStoredTropicalChart(archiveA, clientB.id);
      assert.equal(crossFetch, null, 'Client A verisi Client B için istendiğinde null dönmelidir');

      // Client B hesaplandığında A dan farklı olmalıdır
      const chartB = calculateClientTropicalChart(clientB).chart!;
      saveClientAstrologyChart(clientB.id, chartB);

      const reArchiveA = getClientArchive(clientA.id);
      const reArchiveB = getClientArchive(clientB.id);

      const finalA = getStoredTropicalChart(reArchiveA, clientA.id);
      const finalB = getStoredTropicalChart(reArchiveB, clientB.id);

      assert.notEqual(finalA?.birthDate, finalB?.birthDate);
      assert.notEqual(finalA?.sunSign, finalB?.sunSign);
      assert.equal(finalA?.sunSign, 'Aries'); // 21 Mart Koç
      assert.equal(finalB?.sunSign, 'Libra'); // 10 Ekim Terazi
    });
  });

  // -------------------------------------------------------------------------
  // 5. Doğum Bilgileri Değiştiğinde Eski Hesaplamanın Geçersiz Kılınması (Stale Invalidation)
  // -------------------------------------------------------------------------
  describe('5. Doğum Verileri Değiştiğinde Stale / Invalidation Mekanizması', () => {
    it('5.1. Doğum tarihi değiştiğinde isAstrologyChartStale true dönmelidir', () => {
      const chart = calculateClientTropicalChart(baseClient).chart!;
      const changedClient: Client = {
        ...baseClient,
        birthDate: '1998-08-25', // Değiştirilen doğum tarihi
      };

      assert.equal(isAstrologyChartStale(chart, baseClient), false, 'Aynı verilerde bayat olmamalıdır');
      assert.equal(isAstrologyChartStale(chart, changedClient), true, 'Doğum tarihi değişince bayat olmalıdır');
    });

    it('5.2. Doğum saati değiştiğinde isAstrologyChartStale true dönmelidir', () => {
      const chart = calculateClientTropicalChart(baseClient).chart!;
      const changedClient: Client = {
        ...baseClient,
        birthTime: '17:45', // Değiştirilen doğum saati
      };

      assert.equal(isAstrologyChartStale(chart, changedClient), true, 'Doğum saati değişince bayat olmalıdır');
    });

    it('5.3. Doğum saati bilinirliği (isBirthTimeUnknown) değiştiğinde isAstrologyChartStale true dönmelidir', () => {
      const chart = calculateClientTropicalChart(baseClient).chart!;
      const changedClient: Client = {
        ...baseClient,
        isBirthTimeUnknown: true,
      };

      assert.equal(isAstrologyChartStale(chart, changedClient), true, 'Bilinirlik durumu değişince bayat olmalıdır');
    });

    it('5.4. Doğum koordinatları değiştiğinde isAstrologyChartStale true dönmelidir', () => {
      const chart = calculateClientTropicalChart(baseClient).chart!;
      const changedClient: Client = {
        ...baseClient,
        birthLocation: {
          ...baseClient.birthLocation,
          latitude: 36.8969, // Antalya koordinatları
          longitude: 30.7133,
        },
      };

      assert.equal(isAstrologyChartStale(chart, changedClient), true, 'Koordinat değişince bayat olmalıdır');
    });

    it('5.5. updateClientRecord çağrıldığında doğum bilgileri değişmişse eski analiz depolamadan otomatik temizlenmelidir', () => {
      clearAllApplicationData();

      const created = createClientRecord({
        firstName: baseClient.firstName,
        lastName: baseClient.lastName,
        email: baseClient.email,
        phone: baseClient.phone,
        birthDate: baseClient.birthDate,
        birthTime: baseClient.birthTime,
        isBirthTimeUnknown: false,
        birthLocation: baseClient.birthLocation,
        motherName: baseClient.motherName,
        notes: '',
      }, 'OWNER_MANUAL');

      // Harita hesapla ve kaydet
      const chart = calculateClientTropicalChart(created).chart!;
      saveClientAstrologyChart(created.id, chart);

      let archive = getClientArchive(created.id);
      assert.equal(hasActualModuleResults(archive, 'ASTROLOGY'), true);

      // Danışanın doğum tarihini güncelle
      const updated = updateClientRecord({
        ...created,
        birthDate: '1999-12-31',
      });

      // Arşivde eski astroloji kaydı otomatik olarak geçersiz kılınmış ve temizlenmiş olmalıdır
      archive = getClientArchive(updated.id);
      assert.equal(
        hasActualModuleResults(archive, 'ASTROLOGY'),
        false,
        'Doğum tarihi güncellendiğinde eski astroloji sonucu geçersiz olmalı ve hasActualModuleResults false dönmelidir'
      );

      const prep = prepareAstrologyModule(updated, archive);
      assert.equal(
        prep.status,
        'READY_FOR_CALCULATION',
        'Durum CALCULATED yerine READY_FOR_CALCULATION olmalıdır'
      );

      const cardData = getAstrologyCardData(updated, archive);
      assert.equal(
        cardData.hasRecord,
        false,
        'Sonuç kartında bayat kayıt gösterilmemelidir'
      );
    });
  });

  // -------------------------------------------------------------------------
  // 6. Depolama Kalıcılığı ve Yeniden Yükleme
  // -------------------------------------------------------------------------
  describe('6. Depolama Kalıcılığı ve Yeniden Yükleme', () => {
    it('6.1. Kaydedilen astroloji analizi arşive doğru yazılmalı ve yeniden okunduğunda tam veri dönmelidir', () => {
      clearAllApplicationData();

      const created = createClientRecord({
        firstName: 'Selin',
        lastName: 'Acar',
        email: 'selin@example.com',
        phone: '05330009988',
        birthDate: '1993-09-20',
        birthTime: '14:20',
        isBirthTimeUnknown: false,
        birthLocation: baseClient.birthLocation,
        motherName: 'Hatice',
        notes: '',
      }, 'OWNER_MANUAL');

      const chart = calculateClientTropicalChart(created).chart!;
      saveClientAstrologyChart(created.id, chart);

      const loadedArchive = getClientArchive(created.id);
      const stored = getStoredTropicalChart(loadedArchive, created.id);

      assert.ok(stored);
      assert.equal(stored.birthDate, '1993-09-20');
      assert.equal(stored.planetaryPositions?.length, 10);
      assert.equal(stored.sunSign, 'Virgo'); // 20 Eylül Başak
    });
  });
});
